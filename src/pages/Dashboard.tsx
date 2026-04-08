import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getCountFromServer, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  AlertCircle,
  Clock,
  CheckCircle2,
  FileText,
  Settings,
  Award,
  CreditCard,
  UserCheck,
  UserPlus,
  BarChart3,
  Database
} from 'lucide-react';
import { motion } from 'motion/react';

const StatCard = ({ icon: Icon, label, value, trend, color }: any) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4"
  >
    <div className="flex items-center justify-between">
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-emerald-600 text-sm font-bold bg-emerald-50 px-2 py-1 rounded-lg">
          <TrendingUp className="w-4 h-4" />
          <span>{trend}</span>
        </div>
      )}
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{label}</p>
      <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
    </div>
  </motion.div>
);

import { cn } from '../lib/utils';

export default function Dashboard() {
  const { t, isRTL, ramadanMode } = useTranslation();
  const { profile, hasPermission } = useAuth();
  const [counts, setCounts] = useState({
    students: 0,
    courses: 0,
    programs: 0,
    lecturers: 0,
    enrollments: 0
  });
  const [financeStats, setFinanceStats] = useState({
    dailyIncome: 0,
    totalCommitments: 0,
    collectionRate: 0,
    surchargeIncome: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!profile) return;
      
      if (hasPermission('manage_finance')) {
        const today = new Date().toISOString().split('T')[0];
        const txSnap = await getDocs(collection(db, 'transactions'));
        const transactions = txSnap.docs.map(doc => doc.data());
        
        const dailyIncome = transactions
          .filter((t: any) => {
            if (!t.date || t.status !== 'completed') return false;
            const dateStr = typeof t.date === 'string' ? t.date : (t.date as any).toDate?.().toISOString() || new Date(t.date).toISOString();
            return dateStr.startsWith(today);
          })
          .reduce((acc, curr: any) => acc + curr.amount, 0);

        const studentSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
        const students = studentSnap.docs.map(doc => doc.data());
        const totalCommitments = students.reduce((acc, s: any) => acc + (s.tuition || 5000), 0);
        
        const totalRevenue = transactions
          .filter((t: any) => t.status === 'completed')
          .reduce((acc, curr: any) => acc + curr.amount, 0);

        const surchargeSnap = await getDocs(collection(db, 'surcharges'));
        const surchargeIncome = surchargeSnap.docs
          .map(doc => doc.data())
          .filter(s => s.status === 'paid')
          .reduce((acc, curr: any) => acc + curr.amount, 0);

        setFinanceStats({
          dailyIncome,
          totalCommitments,
          collectionRate: totalCommitments > 0 ? Math.round((totalRevenue / totalCommitments) * 100) : 0,
          surchargeIncome
        });
      }

      if (hasPermission('view_reports') && !hasPermission('manage_finance')) {
        try {
          const studentsQuery = query(collection(db, 'students'));
          const studentsSnapshot = await getCountFromServer(studentsQuery);
          
          const coursesQuery = query(collection(db, 'courses'));
          const coursesSnapshot = await getCountFromServer(coursesQuery);

          const lecturersQuery = query(collection(db, 'users'), where('role', '==', 'lecturer'));
          const lecturersSnapshot = await getCountFromServer(lecturersQuery);

          const enrollmentsQuery = query(collection(db, 'enrollments'));
          const enrollmentsSnapshot = await getCountFromServer(enrollmentsQuery);

          const programsQuery = query(collection(db, 'programs'));
          const programsSnapshot = await getCountFromServer(programsQuery);

          setCounts({
            students: studentsSnapshot.data().count,
            courses: coursesSnapshot.data().count,
            programs: programsSnapshot.data().count,
            lecturers: lecturersSnapshot.data().count,
            enrollments: enrollmentsSnapshot.data().count
          });
        } catch (error) {
          console.error("Error fetching counts:", error);
        }
      }
    };

    const fetchRecentActivity = () => {
      if (!profile) return () => {};

      if (hasPermission('manage_finance')) {
        const q = query(
          collection(db, 'transactions'),
          orderBy('date', 'desc'),
          limit(5)
        );
        return onSnapshot(q, (snapshot) => {
          const txs = snapshot.docs.map(doc => ({
            id: doc.id,
            user: (doc.data() as any).studentName || 'Student',
            action: `${(doc.data() as any).description} - LYD ${(doc.data() as any).amount?.toLocaleString()}`,
            time: (doc.data() as any).date?.toDate?.().toLocaleDateString() || 'Recently',
            icon: CreditCard,
            color: 'text-emerald-600 bg-emerald-50'
          }));
          setActivities(txs);
        }, (error) => {
          console.error("Error in recent transactions listener:", error);
        });
      }

      if (hasPermission('manage_students') && profile.role !== 'student') {
        const q = query(
          collection(db, 'students'), 
          orderBy('createdAt', 'desc'),
          limit(5)
        );

        return onSnapshot(q, (snapshot) => {
          const students = snapshot.docs.map(doc => ({
            id: doc.id,
            user: doc.data().displayName || doc.data().name || 'New Student',
            action: `New student enrolled in ${doc.data().programName || 'University'}`,
            time: doc.data().createdAt ? new Date(doc.data().createdAt.seconds * 1000).toLocaleDateString() : 'Recently',
            icon: Users,
            color: 'text-blue-600 bg-blue-50'
          }));
          setActivities(students);
        }, (error) => {
          console.error("Error in recent students listener:", error);
        });
      }

      if (profile.role === 'student') {
        const q = query(
          collection(db, 'enrollments'),
          where('studentId', '==', profile.uid),
          orderBy('createdAt', 'desc'),
          limit(5)
        );

        return onSnapshot(q, (snapshot) => {
          const myActivities = snapshot.docs.map(doc => ({
            id: doc.id,
            user: 'You',
            action: `Successfully enrolled in ${doc.data().courseCode || 'Course'}`,
            time: doc.data().createdAt ? new Date(doc.data().createdAt.seconds * 1000).toLocaleDateString() : 'Recently',
            icon: BookOpen,
            color: 'text-emerald-600 bg-emerald-50'
          }));
          setActivities(myActivities);
        }, (error) => {
          console.error("Error in student activity listener:", error);
        });
      }

      return () => {};
    };

    if (profile) {
      fetchCounts();
      const unsubscribe = fetchRecentActivity();
      return () => unsubscribe();
    }
  }, [profile, hasPermission]);

  const [studentStats, setStudentStats] = useState({
    gpa: '0.00',
    credits: '0 / 120',
    creditsPercent: '0%',
    nextClass: 'TBA',
    nextClassCode: 'CRS',
    pendingFees: 'LYD 0'
  });

  const [lecturerStats, setLecturerStats] = useState({
    totalStudents: 0,
    activeCourses: 0,
    gradesEntered: '0%',
    officeHours: 'TBA'
  });

  useEffect(() => {
    if (!profile) return;

    if (hasPermission('view_own_grades')) {
      // Fetch student enrollments for GPA and credits
      const qEnroll = query(collection(db, 'enrollments'), where('studentId', '==', profile.uid));
      const unsubEnroll = onSnapshot(qEnroll, (snap) => {
        const enrollments = snap.docs.map(doc => doc.data());
        const gradedEnrollments = enrollments.filter(e => e.grade && e.grade !== '-' && e.grade !== 'Pending');
        
        // Simple GPA calculation
        const gradeMap: { [key: string]: number } = { 'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0 };
        const totalPoints = gradedEnrollments.reduce((acc, curr) => acc + (gradeMap[curr.grade] || 0), 0);
        const avgGpa = gradedEnrollments.length > 0 ? (totalPoints / gradedEnrollments.length).toFixed(2) : '0.00';
        
        const earnedCredits = enrollments.filter(e => e.status === 'completed' || (e.grade && e.grade !== 'F' && e.grade !== '-')).length * 3; // Assuming 3 credits per course
        
        setStudentStats(prev => ({
          ...prev,
          gpa: avgGpa,
          credits: `${earnedCredits} / 120`,
          creditsPercent: `${Math.round((earnedCredits / 120) * 100)}%`
        }));
      });

      // Fetch next class from timetable/offerings
      const qMyEnroll = query(collection(db, 'enrollments'), where('studentId', '==', profile.uid));
      const unsubNextClass = onSnapshot(qMyEnroll, async (snap) => {
        const offeringIds = snap.docs.map(doc => doc.data().offeringId);
        if (offeringIds.length > 0) {
          const qOff = query(collection(db, 'offerings'), where('__name__', 'in', offeringIds.slice(0, 10)));
          const offSnap = await getDocs(qOff);
          const offerings = offSnap.docs.map(doc => doc.data());
          // Find next class based on current day/time (simplified: just take the first one)
          if (offerings.length > 0) {
            setStudentStats(prev => ({
              ...prev,
              nextClass: offerings[0].startTime || 'TBA',
              nextClassCode: offerings[0].courseCode || 'CRS'
            }));
          }
        }
      });

      return () => { unsubEnroll(); unsubNextClass(); };
    }

    if (hasPermission('submit_grades')) {
      // Fetch lecturer offerings
      const qOff = query(collection(db, 'offerings'), where('instructorId', '==', profile.uid));
      const unsubOff = onSnapshot(qOff, async (snap) => {
        const offerings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const activeCourses = offerings.length;
        const totalStudents = offerings.reduce((acc, curr: any) => acc + (curr.enrolledCount || 0), 0);
        
        // Fetch enrollments for these offerings to check grades
        let gradesEntered = '0%';
        if (offerings.length > 0) {
          const offIds = offerings.map(o => o.id);
          const qEnroll = query(collection(db, 'enrollments'), where('offeringId', 'in', offIds.slice(0, 10)));
          const enrollSnap = await getDocs(qEnroll);
          const enrollments = enrollSnap.docs.map(doc => doc.data());
          const graded = enrollments.filter(e => e.grade && e.grade !== '-' && e.grade !== 'Pending').length;
          gradesEntered = enrollments.length > 0 ? `${Math.round((graded / enrollments.length) * 100)}%` : '0%';
        }

        setLecturerStats({
          totalStudents,
          activeCourses,
          gradesEntered,
          officeHours: profile.officeHours || 'TBA'
        });
      });

      return () => unsubOff();
    }
  }, [profile, hasPermission]);

  const getStats = () => {
    if (hasPermission('view_own_grades')) {
      return [
        { icon: TrendingUp, label: 'Current GPA', value: studentStats.gpa, trend: '+0.00', color: 'bg-emerald-600' },
        { icon: Award, label: 'Credits Earned', value: studentStats.credits, trend: studentStats.creditsPercent, color: 'bg-blue-600' },
        { icon: Clock, label: 'Next Class', value: studentStats.nextClass, trend: studentStats.nextClassCode, color: 'bg-amber-600' },
        { icon: CreditCard, label: 'Pending Fees', value: studentStats.pendingFees, trend: 'Due Oct 15', color: 'bg-red-600' },
      ];
    }
    if (hasPermission('submit_grades')) {
      return [
        { icon: Users, label: 'Total Students', value: lecturerStats.totalStudents.toString(), trend: `${lecturerStats.activeCourses} Courses`, color: 'bg-blue-600' },
        { icon: BookOpen, label: 'Active Courses', value: lecturerStats.activeCourses.toString(), trend: 'Fall 2026', color: 'bg-indigo-600' },
        { icon: CheckCircle2, label: 'Grades Entered', value: lecturerStats.gradesEntered, trend: 'In Progress', color: 'bg-emerald-600' },
        { icon: Clock, label: 'Office Hours', value: lecturerStats.officeHours, trend: 'Today', color: 'bg-violet-600' },
      ];
    }
    if (hasPermission('manage_finance')) {
      return [
        { icon: CreditCard, label: 'Daily Income', value: `LYD ${financeStats.dailyIncome.toLocaleString()}`, trend: 'Today', color: 'bg-emerald-600' },
        { icon: TrendingUp, label: 'Total Commitments', value: `LYD ${financeStats.totalCommitments.toLocaleString()}`, trend: 'Current Term', color: 'bg-blue-600' },
        { icon: BarChart3, label: 'Collection Rate', value: `${financeStats.collectionRate}%`, trend: '+2%', color: 'bg-indigo-600' },
        { icon: CreditCard, label: 'Surcharge Revenue', value: `LYD ${financeStats.surchargeIncome.toLocaleString()}`, trend: 'YTD', color: 'bg-violet-600' },
      ];
    }
    if (hasPermission('view_reports')) {
      return [
        { icon: Users, label: t('students'), value: counts.students.toLocaleString(), trend: '+12%', color: 'bg-blue-600' },
        { icon: GraduationCap, label: t('programs'), value: counts.programs.toString(), trend: '+2', color: 'bg-indigo-600' },
        { icon: BookOpen, label: t('courses'), value: counts.courses.toString(), trend: '+15', color: 'bg-violet-600' },
        { icon: Calendar, label: t('enrollment'), value: counts.enrollments.toLocaleString(), trend: '+8%', color: 'bg-purple-600' },
      ];
    }
    return [];
  };

  const getQuickActions = () => {
    const actions = [
      { to: '/students', icon: Users, label: 'Students', permission: 'manage_students' as const },
      { to: '/admissions', icon: UserPlus, label: 'Add Student', permission: 'manage_students' as const },
      { to: '/finance', icon: CreditCard, label: 'Finance', permission: 'manage_finance' as const },
      { to: '/reports', icon: BarChart3, label: 'Reports', permission: 'view_reports' as const },
      { to: '/enrollment', icon: BookOpen, label: 'Registration', permission: 'request_enrollment' as const },
      { to: '/grades', icon: Award, label: 'My Grades', permission: 'view_own_grades' as const },
      { to: '/timetable', icon: Clock, label: 'Timetable', permission: 'view_own_timetable' as const },
      { to: '/attendance', icon: UserCheck, label: 'Attendance', permission: 'submit_grades' as const },
      { to: '/calendar', icon: Calendar, label: 'Academic Cal' },
      { to: '/profile', icon: Settings, label: 'My Profile' },
    ];

    return actions.filter(action => !action.permission || hasPermission(action.permission));
  };

  const stats = getStats();
  const quickActions = getQuickActions();

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('welcome')}, {profile?.displayName}</h1>
          <p className="text-slate-500 mt-1">{t('title')} - {profile?.role?.replace('_', ' ')}</p>
        </div>
        <div className="flex items-center gap-3">
          {profile?.role === 'super_admin' && (
            <button 
              onClick={async () => {
                if (confirm('This will populate the database with sample data for all modules. Continue?')) {
                  try {
                    const { seedTrialData } = await import('../lib/seedData');
                    const res = await seedTrialData(profile?.uid);
                    alert(res.message);
                    window.location.reload();
                  } catch (err) {
                    console.error(err);
                    alert('Failed to seed data');
                  }
                }
              }}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95"
            >
              <Database className="w-4 h-4" />
              <span>Seed Trial Data</span>
            </button>
          )}
          <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-100 text-sm font-bold">
            <Clock className="w-4 h-4" />
            <span>{t('ramadanMode')}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg">Recent Activity</h3>
            <Link 
              to={hasPermission('manage_finance') ? '/finance' : profile?.role === 'student' ? '/enrollment' : '/students'}
              className="text-blue-600 text-sm font-bold hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {activities.map((activity) => (
              <div key={activity.id} className="p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                <div className={cn("p-2 rounded-lg", activity.color)}>
                  <activity.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{activity.user}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{activity.action}</p>
                </div>
                <span className="text-xs text-slate-400 font-medium">{activity.time}</span>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="p-12 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No recent activity found</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions / Alerts */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg shadow-blue-200 text-white">
            <h3 className="font-bold text-lg mb-4">Quick Links</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
              {quickActions.map((action, i) => (
                <Link 
                  key={i}
                  to={action.to} 
                  className="bg-white/10 hover:bg-white/20 p-3 rounded-xl flex flex-col items-center gap-2 transition-all border border-white/10 backdrop-blur-sm group"
                >
                  <action.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {hasPermission('access_it_support') && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-4">System Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Database</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Operational
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">API Gateway</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Operational
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">SMS Gateway</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Operational
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
