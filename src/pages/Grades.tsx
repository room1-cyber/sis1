import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { 
  FileText, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  TrendingUp,
  Download,
  Award,
  Printer,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Save,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

import Modal from '../components/Modal';

import { updateStudentAcademicStanding } from '../lib/academicUtils';

export default function Grades() {
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'entry' | 'transcripts' | 'appeals' | 'my-grades'>('entry');
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [appealData, setAppealData] = useState({ enrollmentId: '', course: '', reason: '' });
  const [entryStudents, setEntryStudents] = useState<any[]>([]);

  useEffect(() => {
    if (isEntryModalOpen && selectedEntry) {
      const q = query(collection(db, 'enrollments'), where('offeringId', '==', selectedEntry.id));
      const unsub = onSnapshot(q, (snap) => {
        setEntryStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsub();
    }
  }, [isEntryModalOpen, selectedEntry]);
  
  const [offerings, setOfferings] = useState<any[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<any[]>([]);
  const [myAppeals, setMyAppeals] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.role === 'student') {
      setActiveTab('my-grades');
    }
  }, [profile]);

  useEffect(() => {
    // Fetch courses for titles
    const qCourses = query(collection(db, 'courses'));
    const unsubCourses = onSnapshot(qCourses, (snap) => {
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    if (profile?.role === 'lecturer' || profile?.role === 'dept_admin') {
      const qOfferings = query(collection(db, 'offerings'), where('instructorId', '==', profile.uid));
      const unsubOfferings = onSnapshot(qOfferings, (snap) => {
        setOfferings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => { unsubCourses(); unsubOfferings(); };
    }

    if (profile?.role === 'student') {
      const qEnrollments = query(collection(db, 'enrollments'), where('studentId', '==', profile.uid));
      const unsubEnrollments = onSnapshot(qEnrollments, (snap) => {
        setMyEnrollments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const qAppeals = query(collection(db, 'appeals'), where('studentId', '==', profile.uid));
      const unsubAppeals = onSnapshot(qAppeals, (snap) => {
        setMyAppeals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => { unsubCourses(); unsubEnrollments(); unsubAppeals(); };
    }

    return () => unsubCourses();
  }, [profile]);
  const handleGradeEntry = async (studentId: string, grade: string) => {
    if (!selectedEntry) return;
    setLoading(true);
    try {
      // Find the enrollment for this student and offering
      const q = query(
        collection(db, 'enrollments'), 
        where('studentId', '==', studentId),
        where('offeringId', '==', selectedEntry.id)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const enrollmentId = snapshot.docs[0].id;
        await updateDoc(doc(db, 'enrollments', enrollmentId), {
          grade,
          updatedAt: serverTimestamp()
        });
        
        // Recalculate student's overall standing
        await updateStudentAcademicStanding(studentId);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'enrollments');
    } finally {
      setLoading(false);
    }
  };

  const handlePostGrades = async () => {
    if (!selectedEntry) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'offerings', selectedEntry.id), {
        status: 'posted',
        updatedAt: serverTimestamp()
      });

      // Update all students in this offering
      const q = query(collection(db, 'enrollments'), where('offeringId', '==', selectedEntry.id));
      const snapshot = await getDocs(q);
      const updatePromises = snapshot.docs.map(doc => updateStudentAcademicStanding(doc.data().studentId));
      await Promise.all(updatePromises);

      setIsEntryModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'offerings');
    } finally {
      setLoading(false);
    }
  };

  const handleAppeal = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'appeals'), {
        studentId: profile.uid,
        enrollmentId: appealData.enrollmentId,
        reason: appealData.reason,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
      setIsAppealModalOpen(false);
      setAppealData({ enrollmentId: '', course: '', reason: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'appeals');
    } finally {
      setLoading(false);
    }
  };

  const getCourseTitle = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.title || courseId;
  };

  // Calculate Stats
  const avgGpa = profile?.role === 'student' 
    ? (myEnrollments.filter(e => e.grade).length > 0 
        ? (myEnrollments.reduce((acc, e) => acc + (e.grade === 'A' ? 4 : e.grade === 'B' ? 3 : e.grade === 'C' ? 2 : e.grade === 'D' ? 1 : 0), 0) / myEnrollments.filter(e => e.grade).length).toFixed(2)
        : '0.00')
    : '3.42'; // Fallback for admin for now

  const gradesPostedPercent = offerings.length > 0
    ? Math.round((offerings.filter(o => o.status === 'posted').length / offerings.length) * 100)
    : 0;

  const pendingAppealsCount = myAppeals.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assessment & Grades</h1>
          <p className="text-slate-500 mt-1">Manage course assessments, grade entry, and transcripts</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all print-btn"
          >
            <Printer className="w-5 h-5" />
            <span>Print Report</span>
          </button>
          <button className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200">
            <Download className="w-5 h-5" />
            <span>Official Transcript</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-600 rounded-xl text-white">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average GPA</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{avgGpa}</h3>
            <p className="text-emerald-600 text-sm font-bold mt-1 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> Current Term
            </p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-600 rounded-xl text-white">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grades Posted</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{gradesPostedPercent}%</h3>
            <p className="text-slate-400 text-sm mt-1">Of assigned courses</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-600 rounded-xl text-white">
              <AlertCircle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Appeals</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{pendingAppealsCount}</h3>
            <p className="text-slate-400 text-sm mt-1">Awaiting review</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-purple-600 rounded-xl text-white">
              <Award className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Honors List</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{Number(avgGpa) >= 3.5 ? '1' : '0'}</h3>
            <p className="text-slate-400 text-sm mt-1">Eligible for Dean's List</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-full max-w-2xl overflow-x-auto">
        {profile?.role !== 'student' && (
          <button 
            onClick={() => setActiveTab('entry')}
            className={cn(
              "flex-1 py-2.5 px-4 text-sm font-bold rounded-xl transition-all whitespace-nowrap",
              activeTab === 'entry' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Grade Entry
          </button>
        )}
        {profile?.role === 'student' && (
          <button 
            onClick={() => setActiveTab('my-grades')}
            className={cn(
              "flex-1 py-2.5 px-4 text-sm font-bold rounded-xl transition-all whitespace-nowrap",
              activeTab === 'my-grades' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            My Grades
          </button>
        )}
        <button 
          onClick={() => setActiveTab('transcripts')}
          className={cn(
            "flex-1 py-2.5 px-4 text-sm font-bold rounded-xl transition-all whitespace-nowrap",
            activeTab === 'transcripts' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Transcripts
        </button>
        <button 
          onClick={() => setActiveTab('appeals')}
          className={cn(
            "flex-1 py-2.5 px-4 text-sm font-bold rounded-xl transition-all whitespace-nowrap",
            activeTab === 'appeals' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Appeals
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'entry' && (
            <motion.div 
              key="entry"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 relative max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search by course or instructor..."
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
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Instructor</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Students</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Deadline</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {offerings.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{getCourseTitle(entry.courseId)}</span>
                            <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">Section {entry.section}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">{profile?.displayName}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <BookOpen className="w-4 h-4 text-slate-400" />
                            <span>{entry.enrolledCount || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                            entry.status === 'posted' ? "bg-emerald-50 text-emerald-600" : 
                            entry.status === 'draft' ? "bg-slate-50 text-slate-500" : "bg-amber-50 text-amber-600"
                          )}>
                            {entry.status?.replace('_', ' ') || 'draft'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>{entry.deadline || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              setSelectedEntry(entry);
                              setIsEntryModalOpen(true);
                            }}
                            className="bg-white border border-slate-200 hover:border-blue-600 hover:text-blue-600 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm"
                          >
                            Enter Grades
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'my-grades' && (
            <motion.div 
              key="my-grades"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <div className="grid grid-cols-1 gap-6">
                {myEnrollments.map((enrollment) => (
                  <div key={enrollment.id} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                        {enrollment.courseCode || 'CRS'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{getCourseTitle(enrollment.courseId)}</h4>
                        <p className="text-sm text-slate-500">Fall 2026 • Section {enrollment.section || 'A'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Midterm</p>
                        <p className="font-bold text-slate-900">{enrollment.midterm || '-'}/30</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assignments</p>
                        <p className="font-bold text-slate-900">{enrollment.assignments || '-'}/20</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Final</p>
                        <p className="font-bold text-slate-900">{enrollment.final || '-'}/50</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Grade</p>
                        <p className={cn(
                          "font-bold text-xl",
                          enrollment.grade === 'A' ? "text-emerald-600" : "text-blue-600"
                        )}>{enrollment.grade || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          setAppealData({ ...appealData, enrollmentId: enrollment.id, course: enrollment.courseCode || 'CRS' });
                          setIsAppealModalOpen(true);
                        }}
                        className="text-blue-600 text-sm font-bold hover:underline"
                      >
                        Appeal
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'transcripts' && (
            <motion.div 
              key="transcripts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-12 text-center"
            >
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Academic Transcript</h3>
                <p className="text-slate-500 mt-2">
                  View your complete academic history or request an official sealed transcript for external use.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                  <button className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                    View Unofficial
                  </button>
                  <button className="w-full sm:w-auto px-8 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all">
                    Request Official
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'appeals' && (
            <motion.div 
              key="appeals"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900 text-lg">My Grade Appeals</h3>
                <button 
                  onClick={() => setIsAppealModalOpen(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  New Appeal
                </button>
              </div>
              
              <div className="space-y-4">
                {myAppeals.map((appeal) => (
                  <div key={appeal.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">{appeal.course || 'Course'}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">{appeal.date}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{appeal.reason}</p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider",
                      appeal.status === 'approved' ? "bg-emerald-50 text-emerald-600" : 
                      appeal.status === 'rejected' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {appeal.status}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
        <div className="p-3 bg-blue-600 rounded-xl text-white">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-blue-900 text-lg">Grade Posting Policy</h3>
          <p className="text-blue-700/80 mt-1 leading-relaxed">
            All grades must be entered by the instructor and approved by the department head before they are visible to students. 
            Once posted, grade changes require a formal appeal and committee approval.
          </p>
        </div>
      </div>

      {/* Grade Entry Modal */}
      <Modal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        title={`Enter Grades: ${selectedEntry?.course || ''}`}
        footer={
          <>
            <button 
              onClick={() => setIsEntryModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handlePostGrades}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Save & Post
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Section</p>
              <p className="font-bold text-slate-900">{selectedEntry?.section}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Students</p>
              <p className="font-bold text-slate-900">{selectedEntry?.students}</p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              You are entering grades for the current term. Please ensure all marks are accurate before posting.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-900">Student List</p>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {entryStudents.map((enrollment) => (
                <div key={enrollment.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                  <div>
                    <p className="font-bold text-slate-900">{enrollment.studentId}</p>
                    <p className="text-xs text-slate-400">Student ID</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      placeholder="Grade"
                      defaultValue={enrollment.grade}
                      className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-center font-bold"
                      onBlur={(e) => handleGradeEntry(enrollment.studentId, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-900">Bulk Actions</p>
            <div className="flex gap-3">
              <button className="flex-1 bg-white border border-slate-200 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
                Import CSV
              </button>
              <button className="flex-1 bg-white border border-slate-200 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
                Export Template
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Appeal Modal */}
      <Modal
        isOpen={isAppealModalOpen}
        onClose={() => setIsAppealModalOpen(false)}
        title="File Grade Appeal"
        footer={
          <>
            <button 
              onClick={() => setIsAppealModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleAppeal}
              disabled={loading || !appealData.course || !appealData.reason}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Submit Appeal
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course</label>
            <input 
              type="text"
              value={appealData.course}
              onChange={(e) => setAppealData({...appealData, course: e.target.value})}
              placeholder="e.g., CS101"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reason for Appeal</label>
            <textarea 
              value={appealData.reason}
              onChange={(e) => setAppealData({...appealData, reason: e.target.value})}
              placeholder="Explain why you are appealing this grade..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
              rows={4}
            />
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Appeals must be filed within 14 days of grade posting. A fee of LYD 25 may apply for each appeal.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
