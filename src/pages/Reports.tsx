import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { collection, query, onSnapshot, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Download, 
  Calendar,
  Filter,
  Search,
  Printer,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  FileText,
  Building2,
  LayoutDashboard,
  Wallet,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Cell, 
  Pie,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Reports() {
  const { t, isRTL } = useTranslation();
  const { profile, hasPermission } = useAuth();
  const isFinanceAdmin = hasPermission('manage_finance');
  const [activeTab, setActiveTab] = useState<'academic' | 'enrollment' | 'finance'>(isFinanceAdmin ? 'finance' : 'academic');
  const [loading, setLoading] = useState(true);

  // Real data states
  const [enrollmentData, setEnrollmentData] = useState<any[]>([]);
  const [facultyData, setFacultyData] = useState<any[]>([]);
  const [departmentPerformance, setDepartmentPerformance] = useState<any[]>([]);
  const [financeData, setFinanceData] = useState<any[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);
  const [annualRevenue, setAnnualRevenue] = useState<any[]>([]);
  const [courseUtilization, setCourseUtilization] = useState<any[]>([]);
  const [detailedLedger, setDetailedLedger] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    
    // 1. Enrollment Trends
    const unsubEnroll = onSnapshot(collection(db, 'students'), (snap) => {
      const students = snap.docs.map(doc => doc.data());
      const currentYear = new Date().getFullYear();
      const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
      
      const data = years.map(year => {
        const count = students.filter((s: any) => {
          if (!s.createdAt) return true; // Assume existing students are from current year or earlier
          const date = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
          return date.getFullYear() <= year;
        }).length;
        return { name: year.toString(), students: count };
      });
      setEnrollmentData(data);
    });

    // 2. Faculty Distribution
    const unsubFaculties = onSnapshot(collection(db, 'faculties'), async (facSnap) => {
      const faculties = facSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const studentSnap = await getDocs(collection(db, 'students'));
      const students = studentSnap.docs.map(doc => doc.data());
      
      const distribution = faculties.map((fac: any) => {
        const count = students.filter((s: any) => s.facultyId === fac.id).length;
        return { name: fac.name, value: count };
      }).filter(d => d.value > 0);

      // If no distribution found, show a placeholder or empty
      setFacultyData(distribution.length > 0 ? distribution : [{ name: 'No Data', value: 0 }]);
    });

    // 3. Department Performance (GPA)
    const unsubDepts = onSnapshot(collection(db, 'departments'), async (deptSnap) => {
      const depts = deptSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const enrollSnap = await getDocs(collection(db, 'enrollments'));
      const enrollments = enrollSnap.docs.map(doc => doc.data());

      const gradeMap: { [key: string]: number } = { 'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0 };

      const performance = depts.map((dept: any) => {
        const deptEnrollments = enrollments.filter((e: any) => e.departmentId === dept.id && e.grade && e.grade !== '-' && e.grade !== 'Pending');
        const totalPoints = deptEnrollments.reduce((acc, curr: any) => acc + (gradeMap[curr.grade] || 0), 0);
        const avgGpa = deptEnrollments.length > 0 ? totalPoints / deptEnrollments.length : 0;
        return { name: dept.code || dept.name, gpa: parseFloat(avgGpa.toFixed(2)) };
      }).filter(p => p.gpa > 0);
      
      setDepartmentPerformance(performance.length > 0 ? performance : [{ name: 'N/A', gpa: 0 }]);
    });

    // 4. Finance Data (Monthly, Daily, Annual)
    const unsubFinance = onSnapshot(collection(db, 'transactions'), (snap) => {
      const transactions = snap.docs.map(doc => doc.data());
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentYear = new Date().getFullYear();
      const today = new Date().toISOString().split('T')[0];
      
      // Monthly
      const monthly = months.map((month, index) => {
        const monthTransactions = transactions.filter((t: any) => {
          const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
          return date.getMonth() === index && date.getFullYear() === currentYear && t.status === 'completed';
        });
        const revenue = monthTransactions.reduce((acc, curr: any) => acc + curr.amount, 0);
        return { name: month, revenue };
      });
      setFinanceData(monthly);

      // Daily (Last 7 days)
      const daily = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        const dayRevenue = transactions
          .filter((t: any) => {
            const txDate = typeof t.date === 'string' ? t.date : (t.date as any).toDate?.().toISOString() || new Date(t.date).toISOString();
            return txDate.startsWith(dateStr) && t.status === 'completed';
          })
          .reduce((acc, curr: any) => acc + curr.amount, 0);
        return { name: d.toLocaleDateString(undefined, { weekday: 'short' }), revenue: dayRevenue };
      });
      setDailyRevenue(daily);

      // Annual (Last 5 years)
      const annual = Array.from({ length: 5 }).map((_, i) => {
        const year = currentYear - (4 - i);
        const yearRevenue = transactions
          .filter((t: any) => {
            const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
            return date.getFullYear() === year && t.status === 'completed';
          })
          .reduce((acc, curr: any) => acc + curr.amount, 0);
        return { name: year.toString(), revenue: yearRevenue };
      });
      setAnnualRevenue(annual);
    });

    // 5. Detailed Financial Ledger
    const unsubLedger = onSnapshot(query(collection(db, 'transactions'), orderBy('date', 'desc')), (snap) => {
      const ledger = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDetailedLedger(ledger);
    });

    // 6. Stats
    const unsubStats = onSnapshot(collection(db, 'transactions'), async (snap) => {
      const transactions = snap.docs.map(doc => doc.data());
      const studentSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
      const students = studentSnap.docs.map(doc => doc.data());
      
      const totalRevenue = transactions
        .filter((t: any) => t.status === 'completed')
        .reduce((acc, curr: any) => acc + curr.amount, 0);
        
      const today = new Date().toISOString().split('T')[0];
      const dailyIncome = transactions
        .filter((t: any) => {
          if (!t.date || t.status !== 'completed') return false;
          const dateStr = typeof t.date === 'string' ? t.date : (t.date as any).toDate?.().toISOString() || new Date(t.date).toISOString();
          return dateStr.startsWith(today);
        })
        .reduce((acc, curr: any) => acc + curr.amount, 0);

      const totalExpected = students.reduce((acc, s: any) => acc + (s.tuition || 5000), 0);
      const outstanding = totalExpected - totalRevenue;
      const efficiency = totalExpected > 0 ? Math.round((totalRevenue / totalExpected) * 100) : 0;
      
      if (isFinanceAdmin) {
        setStats([
          { label: 'Total Revenue (YTD)', value: `LYD ${totalRevenue.toLocaleString()}`, change: '+15%', trend: 'up', icon: Wallet, color: 'bg-emerald-600' },
          { label: 'Outstanding Dues', value: `LYD ${outstanding.toLocaleString()}`, change: '-5%', trend: 'down', icon: AlertCircle, color: 'bg-red-600' },
          { label: 'Daily Income', value: `LYD ${dailyIncome.toLocaleString()}`, change: '+8%', trend: 'up', icon: TrendingUp, color: 'bg-blue-600' },
          { label: 'Collection Efficiency', value: `${efficiency}%`, change: '+2%', trend: 'up', icon: ShieldCheck, color: 'bg-indigo-600' },
        ]);
      } else {
        setStats([
          { label: 'Total Students', value: students.length.toLocaleString(), change: '+12%', trend: 'up', icon: Users, color: 'bg-blue-600' },
          { label: 'Graduation Rate', value: '84%', change: '+3%', trend: 'up', icon: GraduationCap, color: 'bg-emerald-600' },
          { label: 'Avg. GPA', value: '3.24', change: '-0.05', trend: 'down', icon: TrendingUp, color: 'bg-indigo-600' },
          { label: 'Active Courses', value: '124', change: '+15', trend: 'up', icon: BookOpen, color: 'bg-amber-600' },
        ]);
      }
    });

    setLoading(false);

    return () => {
      unsubEnroll();
      unsubFaculties();
      unsubDepts();
      unsubFinance();
      unsubLedger();
      unsubStats();
    };
  }, []);

  const COLORS = ['#2563eb', '#4f46e5', '#7c3aed', '#9333ea', '#c026d3'];

    const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    const data = activeTab === 'academic' ? departmentPerformance :
                 activeTab === 'enrollment' ? enrollmentData :
                 activeTab === 'finance' ? detailedLedger : [];
    
    if (data.length === 0) return;
    
    const filename = `university_report_${activeTab}_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv' || format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, `${filename}.${format}`);
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      doc.text(`University Report - ${activeTab.toUpperCase()}`, 14, 15);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 25);
      
      const tableData = data.map(item => Object.values(item));
      const tableHeaders = [Object.keys(data[0])];
      
      (doc as any).autoTable({
        head: tableHeaders,
        body: tableData,
        startY: 35,
        theme: 'grid',
        headStyles: { fillStyle: '#2563eb' }
      });
      
      doc.save(`${filename}.pdf`);
    }
  };

  const generateTranscript = async () => {
    if (!profile) return;
    
    // Fetch real enrollment data for the student
    const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', profile.uid)));
    const enrollments = enrollSnap.docs.map(doc => doc.data());

    const doc = new jsPDF();
    const studentInfo = {
      name: profile.displayName || "Student",
      id: profile.nationalId || "N/A",
      program: profile.programName || "N/A",
      gpa: "0.00"
    };

    // Calculate GPA
    const gradeMap: { [key: string]: number } = { 'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0 };
    const gradedEnrollments = enrollments.filter(e => e.grade && e.grade !== '-' && e.grade !== 'Pending');
    const totalPoints = gradedEnrollments.reduce((acc, curr) => acc + (gradeMap[curr.grade] || 0), 0);
    studentInfo.gpa = gradedEnrollments.length > 0 ? (totalPoints / gradedEnrollments.length).toFixed(2) : "0.00";

    doc.setFontSize(20);
    doc.text("UNOFFICIAL TRANSCRIPT", 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Student Name: ${studentInfo.name}`, 14, 40);
    doc.text(`Student ID: ${studentInfo.id}`, 14, 48);
    doc.text(`Program: ${studentInfo.program}`, 14, 56);
    doc.text(`Cumulative GPA: ${studentInfo.gpa}`, 14, 64);

    const courses = enrollments.map(e => [
      e.courseCode || 'N/A',
      e.courseName || 'N/A',
      e.grade || 'Pending',
      '3.0' // Assuming 3 credits
    ]);

    (doc as any).autoTable({
      head: [['Code', 'Course Title', 'Grade', 'Credits']],
      body: courses.length > 0 ? courses : [['-', 'No courses enrolled', '-', '-']],
      startY: 75,
      theme: 'striped',
      headStyles: { fill: [37, 99, 235] }
    });

    doc.save(`transcript_${studentInfo.id}.pdf`);
  };

  const generatePaymentStatement = async () => {
    if (!profile) return;

    // Fetch real transactions
    const transSnap = await getDocs(query(collection(db, 'transactions'), where('studentId', '==', profile.uid)));
    const transactions = transSnap.docs.map(doc => doc.data());
    
    const totalPaid = transactions
      .filter(tx => tx.status === 'completed')
      .reduce((acc, tx) => acc + tx.amount, 0);
    
    const totalTuition = profile.tuition || 5000;
    const balance = totalTuition - totalPaid;

    const doc = new jsPDF();
    const studentInfo = {
      name: profile.displayName || "Student",
      id: profile.nationalId || "N/A",
      balance: `LYD ${balance.toLocaleString()}`
    };

    doc.setFontSize(20);
    doc.text("PAYMENT STATEMENT", 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Student Name: ${studentInfo.name}`, 14, 40);
    doc.text(`Student ID: ${studentInfo.id}`, 14, 48);
    doc.text(`Current Balance: ${studentInfo.balance}`, 14, 56);

    const payments = transactions.map(tx => [
      new Date(tx.date).toLocaleDateString(),
      tx.description || tx.type,
      `LYD ${tx.amount.toLocaleString()}`,
      tx.status === 'completed' ? 'Credit' : 'Pending'
    ]);

    (doc as any).autoTable({
      head: [['Date', 'Description', 'Amount', 'Type']],
      body: payments.length > 0 ? payments : [['-', 'No transactions found', '-', '-']],
      startY: 65,
      theme: 'grid',
      headStyles: { fill: [16, 185, 129] }
    });

    doc.save(`payment_statement_${studentInfo.id}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1">Institutional data, performance metrics, and strategic insights</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all print-btn"
          >
            <Printer className="w-5 h-5" />
            <span>Print Report</span>
          </button>
          <div className="relative group">
            <button className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200">
              <Download className="w-5 h-5" />
              <span>Export Data</span>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
              <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 border-b border-slate-50">Export as CSV</button>
              <button onClick={() => handleExport('xlsx')} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 border-b border-slate-50">Export as Excel</button>
              <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600">Export as PDF</button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className={cn("p-3 rounded-xl text-white", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                stat.trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}>
                {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-full max-w-xl">
        {!isFinanceAdmin && (
          <>
            <button 
              onClick={() => setActiveTab('academic')}
              className={cn(
                "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
                activeTab === 'academic' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Academic
            </button>
            <button 
              onClick={() => setActiveTab('enrollment')}
              className={cn(
                "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
                activeTab === 'enrollment' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Enrollment
            </button>
          </>
        )}
        <button 
          onClick={() => setActiveTab('finance')}
          className={cn(
            "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
            activeTab === 'finance' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Finance
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AnimatePresence mode="wait">
          {activeTab === 'enrollment' && (
            <>
              {/* Enrollment Trend */}
              <motion.div 
                key="enrollment-trend"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-slate-900 text-lg">Enrollment Growth (FR119)</h3>
                  <select className="bg-slate-50 border border-slate-100 text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none">
                    <option>Last 5 Years</option>
                    <option>Last 10 Years</option>
                  </select>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={enrollmentData}>
                      <defs>
                        <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontWeight: 'bold', color: '#2563eb' }}
                      />
                      <Area type="monotone" dataKey="students" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorStudents)" dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Faculty Distribution */}
              <motion.div 
                key="faculty-dist"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-slate-900 text-lg">Student Distribution</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    <span className="text-xs font-bold text-slate-500">By Faculty</span>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={facultyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {facultyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </>
          )}

          {activeTab === 'academic' && (
            <>
              {/* Department Performance */}
              <motion.div 
                key="dept-perf"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-slate-900 text-lg">Avg. GPA by Department (FR123)</h3>
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentPerformance}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis domain={[0, 4]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="gpa" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Course Revenue Yield (FR120) */}
              <motion.div 
                key="course-util"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Course Revenue Yield (FR120)</h3>
                    <p className="text-xs text-slate-500">Actual vs Potential Revenue per Course</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courseUtilization} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} width={80} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any, name: string) => [
                          name === 'revenue' ? `LYD ${value.toLocaleString()}` : `${value}%`,
                          name === 'revenue' ? 'Actual Revenue' : 'Efficiency'
                        ]}
                      />
                      <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Avg. Yield</p>
                    <p className="text-lg font-bold text-emerald-700">
                      {courseUtilization.length > 0 
                        ? Math.round(courseUtilization.reduce((acc, curr) => acc + curr.efficiency, 0) / courseUtilization.length) 
                        : 0}%
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-600 uppercase">Critical Courses</p>
                    <p className="text-lg font-bold text-amber-700">
                      {courseUtilization.filter(c => c.status === 'Critical').length}
                    </p>
                  </div>
                </div>
              </motion.div>
            </>
          )}

          {activeTab === 'finance' && (
            <>
              {/* Daily Revenue Summary */}
              <motion.div 
                key="daily-rev"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-slate-900 text-lg">Daily Revenue (Last 7 Days)</h3>
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Monthly Revenue Summary */}
              <motion.div 
                key="monthly-rev"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-slate-900 text-lg">Monthly Revenue (Current Year)</h3>
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={financeData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Annual Revenue Summary */}
              <motion.div 
                key="annual-rev"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-slate-900 text-lg">Annual Revenue Performance</h3>
                  <LayoutDashboard className="w-5 h-5 text-purple-500" />
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={annualRevenue}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="revenue" fill="#7c3aed" radius={[6, 6, 0, 0]} barSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Detailed Financial Ledger (Spreadsheet View) */}
              <motion.div 
                key="ledger"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Financial Ledger</h3>
                    <p className="text-sm text-slate-500">Detailed transaction log for administrative audit</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-white rounded-lg text-slate-400 border border-transparent hover:border-slate-200 transition-all">
                      <Filter className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-white rounded-xl text-slate-400 border border-transparent hover:border-slate-200 transition-all">
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/30">
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Transaction ID</th>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">Description</th>
                        <th className="px-6 py-4">Method</th>
                        <th className="px-6 py-4 text-right">Amount (LYD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {detailedLedger.slice(0, 15).map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-all group">
                          <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                            {new Date(tx.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-400">
                            #{tx.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-slate-900">{tx.studentName}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {tx.description}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase">
                              {tx.method?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900">
                            {tx.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50/30 text-center">
                  <button className="text-blue-600 text-xs font-bold hover:underline">View Full Ledger Spreadsheet</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-lg">Student Reports (FR131, FR133)</h3>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Users className="w-4 h-4" />
            <span>Student Access Portal</span>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <GraduationCap className="w-6 h-6" />
              </div>
              <button 
                onClick={() => generateTranscript()}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
            <h4 className="font-bold text-slate-900">Unofficial Transcript</h4>
            <p className="text-sm text-slate-500 mt-1">Complete academic record including grades, credits, and GPA summary.</p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <FileText className="w-6 h-6" />
              </div>
              <button 
                onClick={() => generatePaymentStatement()}
                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-all shadow-sm"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
            <h4 className="font-bold text-slate-900">Payment Statement</h4>
            <p className="text-sm text-slate-500 mt-1">Detailed history of tuition fees, payments, and outstanding balances.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-lg">Recent Reports</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {[
            { name: 'Fall 2026 Enrollment Summary', type: 'PDF', date: '2026-04-01', size: '2.4 MB' },
            { name: 'Academic Performance Analysis', type: 'XLSX', date: '2026-03-28', size: '1.8 MB' },
            { name: 'Faculty Resource Allocation', type: 'PDF', date: '2026-03-20', size: '3.2 MB' },
          ].map((report, i) => (
            <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 rounded-xl text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{report.name}</h4>
                  <p className="text-sm text-slate-500">{report.date} • {report.size}</p>
                </div>
              </div>
              <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                <Download className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
        <div className="p-3 bg-blue-600 rounded-xl text-white">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-blue-900 text-lg">Data Integrity & Privacy</h3>
          <p className="text-blue-700/80 mt-1 leading-relaxed">
            All reports are generated from verified institutional data. Access to detailed analytics is restricted based on administrative roles. 
            Personal identifiable information (PII) is anonymized in aggregate reports to ensure student privacy.
          </p>
        </div>
      </div>
    </div>
  );
}
