import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { 
  Calendar, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  BookOpen,
  UserCheck,
  Filter,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import Modal from '../components/Modal';

export default function Enrollment() {
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'register' | 'my-courses' | 'requests' | 'manage'>('register');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [availableOfferings, setAvailableOfferings] = useState<any[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<any[]>([]);
  const [allEnrollments, setAllEnrollments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [instructorFilter, setInstructorFilter] = useState('all');
  const [scheduleFilter, setScheduleFilter] = useState('all');
  const [availableSeatsOnly, setAvailableSeatsOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Fetch courses for titles
    const qCourses = query(collection(db, 'courses'));
    const unsubCourses = onSnapshot(qCourses, (snap) => {
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch available offerings
    const qOfferings = query(collection(db, 'offerings'), where('status', '==', 'open'));
    const unsubOfferings = onSnapshot(qOfferings, (snap) => {
      setAvailableOfferings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    if (profile?.uid) {
      if (profile.role === 'student') {
        const qMyEnroll = query(collection(db, 'enrollments'), where('studentId', '==', profile.uid));
        const unsubMyEnroll = onSnapshot(qMyEnroll, (snap) => {
          setMyEnrollments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => { unsubCourses(); unsubOfferings(); unsubMyEnroll(); };
      } else if (profile.role === 'dept_admin') {
        const qAllEnroll = query(collection(db, 'enrollments'));
        const unsubAllEnroll = onSnapshot(qAllEnroll, (snap) => {
          setAllEnrollments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qStudents = profile.department 
          ? query(collection(db, 'students'), where('department', '==', profile.department))
          : query(collection(db, 'students'));
        const unsubStudents = onSnapshot(qStudents, (snap) => {
          setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        setActiveTab('manage');
        return () => { unsubCourses(); unsubOfferings(); unsubAllEnroll(); unsubStudents(); };
      }
    }

    return () => { unsubCourses(); unsubOfferings(); };
  }, [profile]);

  const toggleCourse = (offeringId: string) => {
    setSelectedCourses(prev => 
      prev.includes(offeringId) 
        ? prev.filter(id => id !== offeringId) 
        : [...prev, offeringId]
    );
  };

  const getCourseByOffering = (offeringId: string) => {
    const offering = availableOfferings.find(o => o.id === offeringId);
    return courses.find(c => c.id === offering?.courseId);
  };

  const totalCredits = selectedCourses.reduce((sum, id) => {
    const course = getCourseByOffering(id);
    return sum + (course?.credits || 0);
  }, 0);

  const handleRegister = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      selectedCourses.forEach(offeringId => {
        const offering = availableOfferings.find(o => o.id === offeringId);
        const course = courses.find(c => c.id === offering?.courseId);
        const newEnrollRef = doc(collection(db, 'enrollments'));
        batch.set(newEnrollRef, {
          studentId: profile.uid,
          offeringId,
          courseId: offering?.courseId,
          courseCode: course?.code,
          section: offering?.section,
          status: 'pending_approval',
          grade: '-',
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
      setIsConfirmModalOpen(false);
      setIsSuccessModalOpen(true);
      setSelectedCourses([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'enrollments');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (enrollmentId: string, status: 'enrolled' | 'rejected') => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'enrollments', enrollmentId), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'enrollments');
    } finally {
      setLoading(false);
    }
  };

  const getCourseTitle = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.title || courseId;
  };

  const instructors = Array.from(new Set(availableOfferings.map(o => o.instructorName).filter(Boolean)));
  const schedules = Array.from(new Set(availableOfferings.map(o => o.day).filter(Boolean)));

  const filteredOfferings = availableOfferings.filter(offering => {
    const course = courses.find(c => c.id === offering.courseId);
    
    // Only show offerings for active courses
    if (course && (course.status || 'active') !== 'active') return false;

    const matchesSearch = 
      course?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course?.code?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesInstructor = instructorFilter === 'all' || offering.instructorName === instructorFilter;
    const matchesSchedule = scheduleFilter === 'all' || offering.day === scheduleFilter;
    const matchesSeats = !availableSeatsOnly || (offering.enrolledCount || 0) < (offering.maxSeats || 50);

    return matchesSearch && matchesInstructor && matchesSchedule && matchesSeats;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('enrollment')}</h1>
          <p className="text-slate-500 mt-1">Course registration and academic progress</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 text-sm font-bold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Registration Period: Open</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-full max-w-lg">
        {profile?.role === 'student' && (
          <>
            <button 
              onClick={() => setActiveTab('register')}
              className={cn(
                "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
                activeTab === 'register' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Register Courses
            </button>
            <button 
              onClick={() => setActiveTab('my-courses')}
              className={cn(
                "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
                activeTab === 'my-courses' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              My Courses
            </button>
            <button 
              onClick={() => setActiveTab('requests')}
              className={cn(
                "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
                activeTab === 'requests' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Requests
            </button>
          </>
        )}
        {profile?.role === 'dept_admin' && (
          <button 
            onClick={() => setActiveTab('manage')}
            className={cn(
              "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
              activeTab === 'manage' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Manage Enrollments
          </button>
        )}
      </div>

      {activeTab === 'manage' && profile?.role === 'dept_admin' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allEnrollments.filter(e => {
                  const student = students.find(s => s.id === e.studentId);
                  return student?.department === profile.department;
                }).map((enrollment) => {
                  const student = students.find(s => s.id === enrollment.studentId);
                  return (
                    <tr key={enrollment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{student?.fullName || 'Student'}</span>
                          <span className="text-xs text-slate-400">{student?.studentId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{getCourseTitle(enrollment.courseId)}</span>
                          <span className="text-xs text-blue-600 font-bold">{enrollment.courseCode}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                          enrollment.status === 'enrolled' ? "bg-emerald-50 text-emerald-600" : 
                          enrollment.status === 'pending_approval' ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                        )}>
                          {enrollment.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {enrollment.createdAt?.toDate ? enrollment.createdAt.toDate().toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {enrollment.status === 'pending_approval' && (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleUpdateStatus(enrollment.id, 'rejected')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Reject"
                            >
                              <X className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(enrollment.id, 'enrolled')}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Approve"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'register' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search courses by name or code..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "p-3 border rounded-xl transition-all flex items-center gap-2 font-bold text-sm",
                    showFilters ? "bg-blue-600 border-blue-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Filter className="w-5 h-5" />
                  <span className="hidden sm:inline">Filters</span>
                </button>
              </div>

              {showFilters && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Instructor</label>
                    <select 
                      value={instructorFilter}
                      onChange={(e) => setInstructorFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="all">All Instructors</option>
                      {instructors.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Schedule</label>
                    <select 
                      value={scheduleFilter}
                      onChange={(e) => setScheduleFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="all">All Days</option>
                      {schedules.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input 
                          type="checkbox"
                          checked={availableSeatsOnly}
                          onChange={(e) => setAvailableSeatsOnly(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={cn(
                          "w-10 h-6 rounded-full transition-colors",
                          availableSeatsOnly ? "bg-blue-600" : "bg-slate-200"
                        )} />
                        <div className={cn(
                          "absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform",
                          availableSeatsOnly ? "translate-x-4" : ""
                        )} />
                      </div>
                      <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600 transition-colors">Available Seats Only</span>
                    </label>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredOfferings.length > 0 ? filteredOfferings.map((offering) => {
                const course = courses.find(c => c.id === offering.courseId);
                return (
                  <motion.div 
                    key={offering.id}
                    whileHover={{ scale: 1.01 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{course?.code || 'CRS'}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="text-xs font-medium text-slate-400">{offering.instructorName || 'Instructor'}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mt-1">{course?.title || 'Course Title'}</h3>
                        <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                          <Clock className="w-4 h-4" />
                          <span>{offering.day} {offering.startTime}-{offering.endTime}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Availability</p>
                        <p className="text-sm font-bold text-slate-900 mt-1">
                          {offering.enrolledCount || 0} / {offering.maxSeats || 50} <span className="text-slate-400 font-medium">Seats</span>
                        </p>
                        <div className="mt-1.5 h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all",
                              ((offering.enrolledCount || 0) / (offering.maxSeats || 50)) > 0.9 ? "bg-red-500" : "bg-blue-500"
                            )} 
                            style={{ width: `${((offering.enrolledCount || 0) / (offering.maxSeats || 50)) * 100}%` }} 
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleCourse(offering.id)}
                        className={cn(
                          "px-6 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200",
                          selectedCourses.includes(offering.id) 
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-none" 
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        )}
                      >
                        {selectedCourses.includes(offering.id) ? 'Remove' : 'Add'}
                      </button>
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">No courses found</h3>
                  <p className="text-slate-500 mt-1">Try adjusting your filters or search query</p>
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setInstructorFilter('all');
                      setScheduleFilter('all');
                      setAvailableSeatsOnly(false);
                    }}
                    className="mt-6 text-blue-600 font-bold hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg mb-6">Registration Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Selected Courses</span>
                  <span className="font-bold text-slate-900">{selectedCourses.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Total Credits</span>
                  <span className="font-bold text-slate-900">{totalCredits} / 18</span>
                </div>
                <div className="pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-xl text-xs font-bold border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>No timetable conflicts detected</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsConfirmModalOpen(true)}
                  disabled={selectedCourses.length === 0}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold transition-all active:scale-95 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Registration
                </button>
              </div>
            </div>

            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
              <div className="flex items-center gap-3 text-amber-700 mb-3">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-bold">Advisor Approval</h3>
              </div>
              <p className="text-sm text-amber-700/80 leading-relaxed">
                Your registration requires approval from your academic advisor (Dr. Ahmed) before it becomes official.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'my-courses' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Course</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Instructor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Grade</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {myEnrollments.map((enrollment) => (
                <tr key={enrollment.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{getCourseTitle(enrollment.courseId)}</span>
                      <span className="text-xs text-blue-600 font-bold">{enrollment.courseCode}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{enrollment.instructorName || 'Instructor'}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                      enrollment.status === 'enrolled' ? "bg-blue-50 text-blue-600" : 
                      enrollment.status === 'pending_approval' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {enrollment.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">{enrollment.grade}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-600 hover:underline text-sm font-bold">Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Registration"
        footer={
          <>
            <button 
              onClick={() => setIsConfirmModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleRegister}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Confirm & Submit
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-slate-600">You are about to register for the following courses:</p>
          <div className="space-y-2">
            {selectedCourses.map(offeringId => {
              const offering = availableOfferings.find(o => o.id === offeringId);
              const course = courses.find(c => c.id === offering?.courseId);
              return (
                <div key={offeringId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-900">{course?.title || 'Course'}</p>
                    <p className="text-xs text-blue-600 font-bold">{course?.code || 'CRS'} • {course?.credits || 0} Credits</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
              );
            })}
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="font-bold text-slate-900">Total Credits</span>
            <span className="text-xl font-bold text-blue-600">{totalCredits}</span>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Registration Submitted"
      >
        <div className="text-center py-6">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Success!</h3>
          <p className="text-slate-500 mt-2">
            Your registration request has been submitted successfully. It is now pending approval from your academic advisor.
          </p>
          <button 
            onClick={() => setIsSuccessModalOpen(false)}
            className="mt-8 w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}
