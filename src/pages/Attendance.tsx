import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { 
  UserCheck, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Calendar,
  Users,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Save,
  ShieldCheck,
  UserMinus,
  MessageSquare,
  Printer,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

import Modal from '../components/Modal';

export default function Attendance() {
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'daily' | 'reports' | 'alerts'>('daily');
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [newSession, setNewSession] = useState({ offeringId: '', time: '' });

  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    // Fetch courses for titles
    const qCourses = query(collection(db, 'courses'));
    const unsubCourses = onSnapshot(qCourses, (snap) => {
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    let q;
    if (profile?.role === 'student') {
      setActiveTab('reports'); // Default to reports for students
      // Students see sessions for their enrolled offerings
      const qEnroll = query(collection(db, 'enrollments'), where('studentId', '==', profile.uid), where('status', '==', 'enrolled'));
      const unsubEnroll = onSnapshot(qEnroll, async (snap) => {
        const offeringIds = snap.docs.map(doc => doc.data().offeringId);
        if (offeringIds.length > 0) {
          const qSessions = query(collection(db, 'attendanceSessions'), where('offeringId', 'in', offeringIds.slice(0, 10)));
          onSnapshot(qSessions, (sessionSnap) => {
            setSessions(sessionSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          });
        }
      });

      // Fetch student's own attendance records
      const qRecords = query(collection(db, 'attendanceRecords'), where('studentId', '==', profile.uid));
      const unsubRecords = onSnapshot(qRecords, (snap) => {
        setAttendanceRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => { unsubCourses(); unsubEnroll(); unsubRecords(); };
    } else if (profile?.role === 'lecturer') {
      q = query(collection(db, 'attendanceSessions'), where('lecturerId', '==', profile.uid));
    } else if (profile?.role === 'dept_admin') {
      // Dept admin sees all sessions for now, ideally filtered by department
      q = query(collection(db, 'attendanceSessions'));
    } else {
      q = query(collection(db, 'attendanceSessions'));
    }

    if (q) {
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'attendanceSessions')
      );
      return () => { unsubCourses(); unsubscribe(); };
    }

    return () => unsubCourses();
  }, [profile]);

  useEffect(() => {
    if (profile?.role === 'lecturer' || profile?.role === 'dept_admin') {
      const q = query(collection(db, 'offerings'), where('instructorId', '==', profile.uid));
      const unsubscribe = onSnapshot(q, (snap) => {
        setOfferings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [profile]);

  const getCourseTitle = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.title || courseId;
  };

  const fetchStudentsForSession = async (offeringId: string) => {
    setLoading(true);
    try {
      // Fetch enrollments for this offering
      const qEnroll = query(collection(db, 'enrollments'), where('offeringId', '==', offeringId), where('status', '==', 'enrolled'));
      const enrollSnap = await getDocs(qEnroll);
      const studentIds = enrollSnap.docs.map(doc => doc.data().studentId);

      if (studentIds.length === 0) {
        setStudents([]);
        return;
      }

      // Fetch student profiles
      // Note: Firestore 'in' query is limited to 10-30 items depending on version, 
      // but for this applet we'll assume it's small or handle it simply.
      const qStudents = query(collection(db, 'users'), where('uid', 'in', studentIds.slice(0, 30)));
      const studentSnap = await getDocs(qStudents);
      const studentList = studentSnap.docs.map(doc => ({ 
        id: doc.id, 
        name: doc.data().displayName, 
        status: 'present' 
      }));
      setStudents(studentList);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'students');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedSession) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      students.forEach(student => {
        const recordRef = doc(collection(db, 'attendanceRecords'));
        batch.set(recordRef, {
          sessionId: selectedSession.id,
          studentId: student.id,
          status: student.status,
          timestamp: serverTimestamp()
        });
      });

      // Update session status
      const sessionRef = doc(db, 'attendanceSessions', selectedSession.id);
      batch.update(sessionRef, { 
        status: 'completed',
        presentCount: students.filter(s => s.status === 'present').length,
        totalCount: students.length
      });

      await batch.commit();
      setIsAttendanceModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendanceRecords');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!newSession.offeringId) return;
    setLoading(true);
    try {
      const selectedOffering = offerings.find(o => o.id === newSession.offeringId);
      await addDoc(collection(db, 'attendanceSessions'), {
        offeringId: newSession.offeringId,
        course: selectedOffering?.courseId || 'Unknown', // Ideally fetch course title
        section: selectedOffering?.section || 'A',
        time: newSession.time,
        lecturerId: profile?.uid,
        date: new Date().toISOString().split('T')[0],
        status: 'in_progress',
        createdAt: serverTimestamp()
      });
      setIsSessionModalOpen(false);
      setNewSession({ offeringId: '', time: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'attendanceSessions');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentStatus = (id: string) => {
    setStudents(prev => prev.map(s => 
      s.id === id ? { ...s, status: s.status === 'present' ? 'absent' : 'present' } : s
    ));
  };

  // Calculate Stats
  const totalSessions = sessions.length;
  const avgAttendance = sessions.length > 0
    ? (sessions.reduce((acc, s) => acc + ((s.presentCount || 0) / (s.totalCount || 1)), 0) / sessions.length * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Tracking</h1>
          <p className="text-slate-500 mt-1">Monitor daily attendance and manage absence records</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all print-btn"
          >
            <Printer className="w-5 h-5" />
            <span>Print Report</span>
          </button>
          {profile?.role !== 'student' && (
            <button 
              onClick={() => setIsSessionModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200"
            >
              <Plus className="w-5 h-5" />
              <span>New Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-600 rounded-xl text-white">
              <UserCheck className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {profile?.role === 'student' ? 'My Attendance' : 'Avg. Attendance'}
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">
              {profile?.role === 'student' 
                ? (sessions.length > 0 
                    ? (attendanceRecords.filter(r => r.status === 'present').length / sessions.length * 100).toFixed(1) 
                    : '0.0')
                : avgAttendance}%</h3>
            <p className="text-emerald-600 text-sm font-bold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Within target range
            </p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-red-600 rounded-xl text-white">
              <UserMinus className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {profile?.role === 'student' ? 'Absences' : 'Chronic Absence'}
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">
              {profile?.role === 'student' 
                ? attendanceRecords.filter(r => r.status === 'absent').length 
                : '0'}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {profile?.role === 'student' ? 'Total missed sessions' : 'Students with >20% absence'}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-600 rounded-xl text-white">
              <Bell className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alerts Sent</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">0</h3>
            <p className="text-slate-400 text-sm mt-1">Automated SMS notifications</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-purple-600 rounded-xl text-white">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sessions</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{totalSessions}</h3>
            <p className="text-slate-400 text-sm mt-1">Current semester total</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-full max-w-md">
        {profile?.role !== 'student' && (
          <button 
            onClick={() => setActiveTab('daily')}
            className={cn(
              "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
              activeTab === 'daily' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Daily View
          </button>
        )}
        <button 
          onClick={() => setActiveTab('reports')}
          className={cn(
            "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
            activeTab === 'reports' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          {profile?.role === 'student' ? 'My Attendance' : 'Reports'}
        </button>
        {profile?.role !== 'student' && (
          <button 
            onClick={() => setActiveTab('alerts')}
            className={cn(
              "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
              activeTab === 'alerts' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Alerts
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'daily' && profile?.role !== 'student' && (
            <motion.div
              key="daily"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 relative max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search by course or section..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button className="p-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
                    <Filter className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Course</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sessions.map((session) => (
                      <tr key={session.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{getCourseTitle(session.courseId || session.course)}</span>
                            <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">Section {session.section}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>{session.time}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                              <span>{session.presentCount || 0} / {session.totalCount || 0}</span>
                              <span>{Math.round(((session.presentCount || 0) / (session.totalCount || 1)) * 100)}%</span>
                            </div>
                            <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  ((session.presentCount || 0) / (session.totalCount || 1)) < 0.75 ? "bg-red-500" : "bg-emerald-500"
                                )} 
                                style={{ width: `${((session.presentCount || 0) / (session.totalCount || 1)) * 100}%` }} 
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                            session.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                          )}>
                            {session.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              setSelectedSession(session);
                              fetchStudentsForSession(session.offeringId);
                              setIsAttendanceModalOpen(true);
                            }}
                            className="bg-white border border-slate-200 hover:border-blue-600 hover:text-blue-600 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm"
                          >
                            Take Attendance
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'reports' && profile?.role === 'student' && (
            <motion.div
              key="reports-student"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <div className="grid grid-cols-1 gap-4">
                {sessions.map((session) => {
                  const record = attendanceRecords.find(r => r.sessionId === session.id);
                  return (
                    <div key={session.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold",
                          record?.status === 'present' ? "bg-emerald-500" : "bg-red-500"
                        )}>
                          {record?.status === 'present' ? <CheckCircle2 className="w-6 h-6" /> : <X className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{getCourseTitle(session.courseId || session.course)}</h4>
                          <p className="text-sm text-slate-500">{session.date} • {session.time}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider",
                          record?.status === 'present' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                        )}>
                          {record?.status || 'No Record'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex items-start gap-4">
        <div className="p-3 bg-amber-600 rounded-xl text-white">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-amber-900 text-lg">Absence Alert Threshold</h3>
          <p className="text-amber-700/80 mt-1 leading-relaxed">
            Students with more than 15% absence in any course will receive an automated warning. 
            Exceeding 25% absence may lead to disqualification from the final exam per university regulations.
          </p>
        </div>
      </div>

      {/* New Session Modal */}
      <Modal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        title="Start New Attendance Session"
        footer={
          <>
            <button 
              onClick={() => setIsSessionModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreateSession}
              disabled={loading || !newSession.offeringId}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Start Session
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Course Offering</label>
            <select 
              value={newSession.offeringId}
              onChange={(e) => setNewSession({...newSession, offeringId: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="">Select an offering...</option>
              {offerings.map(o => (
                <option key={o.id} value={o.id}>{o.courseId} - Section {o.section}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time Slot</label>
              <input 
                type="text"
                value={newSession.time}
                onChange={(e) => setNewSession({...newSession, time: e.target.value})}
                placeholder="e.g., 10:00 - 12:00"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Starting a session will notify students that attendance is being taken. 
              You can mark students manually or use QR code scanning.
            </p>
          </div>
        </div>
      </Modal>

      {/* Take Attendance Modal */}
      <Modal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        title={`Take Attendance: ${selectedSession?.course || ''} - Section ${selectedSession?.section || ''}`}
        maxWidth="max-w-2xl"
        footer={
          <>
            <button 
              onClick={() => setIsAttendanceModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveAttendance}
              disabled={loading}
              className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Save Attendance
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900">{students.filter(s => s.status === 'present').length}</span>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Present</span>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900">{students.filter(s => s.status === 'absent').length}</span>
                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Absent</span>
              </div>
            </div>
            <button 
              onClick={() => setStudents(students.map(s => ({ ...s, status: 'present' })))}
              className="text-blue-600 text-sm font-bold hover:underline"
            >
              Mark All Present
            </button>
          </div>

          <div className="divide-y divide-slate-50 border border-slate-100 rounded-2xl overflow-hidden">
            {students.map((student) => (
              <div key={student.id} className="p-4 bg-white flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">
                    {student.name.charAt(0)}
                  </div>
                  <span className="font-bold text-slate-900">{student.name}</span>
                </div>
                <div className="flex p-1 bg-slate-100 rounded-xl">
                  <button 
                    onClick={() => toggleStudentStatus(student.id)}
                    className={cn(
                      "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                      student.status === 'present' ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500"
                    )}
                  >
                    Present
                  </button>
                  <button 
                    onClick={() => toggleStudentStatus(student.id)}
                    className={cn(
                      "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                      student.status === 'absent' ? "bg-red-500 text-white shadow-sm" : "text-slate-500"
                    )}
                  >
                    Absent
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-slate-400 mt-0.5" />
            <textarea 
              placeholder="Add session notes (optional)..."
              className="w-full bg-transparent border-none outline-none text-sm text-slate-600 resize-none"
              rows={2}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
