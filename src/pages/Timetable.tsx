import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Download, 
  Printer, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Search,
  BookOpen,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  List,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const TIMES = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

import Modal from '../components/Modal';

export default function Timetable() {
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();
  const [view, setView] = useState<'weekly' | 'daily' | 'exams'>('weekly');
  const [selectedDay, setSelectedDay] = useState('Sunday');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examViewMode, setExamViewMode] = useState<'grid' | 'table'>('grid');
  const [examSearchTerm, setExamSearchTerm] = useState('');
  const [examDateFilter, setExamDateFilter] = useState('');
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [newClassData, setNewClassData] = useState({
    courseId: '',
    instructorId: '',
    instructorName: '',
    day: 'Sunday',
    startTime: '08:00',
    endTime: '10:00',
    room: '',
    section: 'A'
  });
  const [newExamData, setNewExamData] = useState({
    courseId: '',
    title: 'Final Exam',
    date: '',
    startTime: '09:00',
    endTime: '12:00',
    roomId: '',
    seatNumber: ''
  });
  const [requestData, setRequestData] = useState({ reason: '', preferredTime: '' });
  
  const [offerings, setOfferings] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;

    // Fetch courses for titles
    const qCourses = query(collection(db, 'courses'));
    const unsubCourses = onSnapshot(qCourses, (snap) => {
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const fetchOfferings = async () => {
      if (profile.role === 'lecturer') {
        const q = query(collection(db, 'offerings'), where('instructorId', '==', profile.uid));
        onSnapshot(q, (snap) => {
          setOfferings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
      } else if (profile.role === 'dept_admin') {
        // HoD sees all offerings in their department
        const q = query(collection(db, 'offerings'));
        onSnapshot(q, (snap) => {
          const allOfferings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Filter by department in memory since offerings don't have department field directly
          // but we can link via courseId
          setOfferings(allOfferings);
        });
      } else if (profile.role === 'student') {
        // First get enrollments
        const qEnroll = query(collection(db, 'enrollments'), where('studentId', '==', profile.uid));
        onSnapshot(qEnroll, async (snap) => {
          const offeringIds = snap.docs.map(doc => doc.data().offeringId);
          if (offeringIds.length > 0) {
            // Fetch offerings in batches of 10 (Firestore limit for 'in' query)
            const batches = [];
            for (let i = 0; i < offeringIds.length; i += 10) {
              const batch = offeringIds.slice(i, i + 10);
              const qOff = query(collection(db, 'offerings'), where('__name__', 'in', batch));
              batches.push(getDocs(qOff));
            }
            const results = await Promise.all(batches);
            const allOfferings = results.flatMap(res => res.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setOfferings(allOfferings);
          }
        });
      }
    };

    fetchOfferings();

    // Fetch rooms and buildings
    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snap) => {
      setRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubBuildings = onSnapshot(collection(db, 'buildings'), (snap) => {
      setBuildings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch exams
    let unsubExams = () => {};
    if (profile.role === 'student') {
      // For students, we wait for offerings to be loaded then fetch exams for those courses
      const courseIds = [...new Set(offerings.map(o => o.courseId))];
      if (courseIds.length > 0) {
        const qExams = query(collection(db, 'examSchedules'), where('courseId', 'in', courseIds));
        unsubExams = onSnapshot(qExams, (snap) => {
          setExams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => handleFirestoreError(error, OperationType.LIST, 'examSchedules'));
      }
    } else {
      const qExams = query(collection(db, 'examSchedules'));
      unsubExams = onSnapshot(qExams, (snap) => {
        setExams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'examSchedules'));
    }

    return () => {
      unsubCourses();
      unsubExams();
      unsubRooms();
      unsubBuildings();
    };
  }, [profile, offerings]);

  const handleAddClass = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const instructor = lecturers.find(l => l.id === newClassData.instructorId);
      await addDoc(collection(db, 'offerings'), {
        ...newClassData,
        instructorName: instructor?.displayName || '',
        status: 'open',
        enrolledCount: 0,
        maxSeats: 50,
        createdAt: serverTimestamp()
      });
      setIsAddModalOpen(false);
      setNewClassData({
        courseId: '',
        instructorId: '',
        instructorName: '',
        day: 'Sunday',
        startTime: '08:00',
        endTime: '10:00',
        room: '',
        section: 'A'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'offerings');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleExam = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      if (editingExamId) {
        const examRef = doc(db, 'examSchedules', editingExamId);
        await updateDoc(examRef, {
          ...newExamData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'examSchedules'), {
          ...newExamData,
          createdAt: serverTimestamp()
        });
      }
      setIsExamModalOpen(false);
      setEditingExamId(null);
      setNewExamData({
        courseId: '',
        title: 'Final Exam',
        date: '',
        startTime: '09:00',
        endTime: '12:00',
        roomId: '',
        seatNumber: ''
      });
    } catch (error) {
      handleFirestoreError(error, editingExamId ? OperationType.UPDATE : OperationType.CREATE, 'examSchedules');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam schedule?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'examSchedules', examId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'examSchedules');
    } finally {
      setLoading(false);
    }
  };

  const handleEditExam = (exam: any) => {
    setEditingExamId(exam.id);
    setNewExamData({
      courseId: exam.courseId,
      title: exam.title,
      date: exam.date,
      startTime: exam.startTime,
      endTime: exam.endTime,
      roomId: exam.roomId,
      seatNumber: exam.seatNumber || ''
    });
    setIsExamModalOpen(true);
  };

  const [lecturers, setLecturers] = useState<any[]>([]);
  useEffect(() => {
    if (profile?.role === 'dept_admin' && profile.department) {
      const q = query(collection(db, 'users'), where('role', '==', 'lecturer'), where('department', '==', profile.department));
      const unsub = onSnapshot(q, (snap) => {
        setLecturers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsub();
    }
  }, [profile]);

  const handleRequestChange = async () => {
    if (!profile || !selectedClass) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'scheduleChangeRequests'), {
        userId: profile.uid,
        offeringId: selectedClass.id,
        reason: requestData.reason,
        preferredTime: requestData.preferredTime,
        status: 'pending',
        date: new Date().toISOString()
      });
      setIsRequestModalOpen(false);
      setRequestData({ reason: '', preferredTime: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'scheduleChangeRequests');
    } finally {
      setLoading(false);
    }
  };

  const getCourseTitle = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.title || courseId;
  };

  const getCourseCode = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.code || '';
  };

  const filteredOfferings = offerings.filter(o => {
    if (profile?.role === 'dept_admin') {
      const course = courses.find(c => c.id === o.courseId);
      return course?.department === profile.department;
    }
    return true;
  });

  const getDaySchedule = (day: string) => filteredOfferings.filter(item => item.day === day);

  const getFilteredExams = () => {
    return exams.filter(e => {
      const course = courses.find(c => c.id === e.courseId);
      const matchesSearch = 
        e.title.toLowerCase().includes(examSearchTerm.toLowerCase()) ||
        (course?.title || '').toLowerCase().includes(examSearchTerm.toLowerCase()) ||
        (course?.code || '').toLowerCase().includes(examSearchTerm.toLowerCase());
      
      const matchesDate = !examDateFilter || e.date === examDateFilter;

      if (profile?.role === 'dept_admin') {
        return matchesSearch && matchesDate && course?.department === profile.department;
      }
      return matchesSearch && matchesDate;
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('timetable')}</h1>
          <p className="text-slate-500 mt-1">Academic schedule and exam dates</p>
        </div>
        <div className="flex items-center gap-3">
          {profile?.role === 'dept_admin' && view !== 'exams' && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200"
            >
              <Plus className="w-5 h-5" />
              <span>Add Class</span>
            </button>
          )}
          {(profile?.role === 'dept_admin' || profile?.role === 'registrar') && view === 'exams' && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setExamViewMode(examViewMode === 'grid' ? 'table' : 'grid')}
                className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                title={examViewMode === 'grid' ? "Table View" : "Grid View"}
              >
                {examViewMode === 'grid' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
              </button>
              <button 
                onClick={() => {
                  setEditingExamId(null);
                  setNewExamData({
                    courseId: '',
                    title: 'Final Exam',
                    date: '',
                    startTime: '09:00',
                    endTime: '12:00',
                    roomId: '',
                    seatNumber: ''
                  });
                  setIsExamModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200"
              >
                <Plus className="w-5 h-5" />
                <span>Schedule Exam</span>
              </button>
            </div>
          )}
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm print-btn"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
        <button 
          onClick={() => setView('weekly')}
          className={cn(
            "px-6 py-2 rounded-xl font-bold transition-all",
            view === 'weekly' ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          Weekly View
        </button>
        <button 
          onClick={() => setView('daily')}
          className={cn(
            "px-6 py-2 rounded-xl font-bold transition-all",
            view === 'daily' ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          Daily View
        </button>
        <button 
          onClick={() => setView('exams')}
          className={cn(
            "px-6 py-2 rounded-xl font-bold transition-all",
            view === 'exams' ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          Exam Schedule
        </button>
      </div>

      <AnimatePresence mode="wait">
        {view === 'weekly' && (
          <motion.div 
            key="weekly"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-4 border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider w-20">Time</th>
                    {DAYS.map(day => (
                      <th key={day} className="p-4 border-b border-slate-100 text-slate-900 font-bold text-sm border-l border-slate-100">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIMES.map(time => (
                    <tr key={time}>
                      <td className="p-4 border-b border-slate-100 text-slate-500 text-xs font-bold text-center">
                        {time}
                      </td>
                      {DAYS.map(day => {
                        const items = filteredOfferings.filter(i => i.day === day && i.startTime === time);
                        return (
                          <td key={day} className="p-2 border-b border-slate-100 border-l border-slate-100 min-h-[80px] align-top">
                            {items.map(item => (
                              <div 
                                key={item.id} 
                                onClick={() => {
                                  setSelectedClass(item);
                                  setIsDetailsModalOpen(true);
                                }}
                                className={cn(
                                  "p-3 rounded-xl text-white shadow-sm mb-2 cursor-pointer hover:scale-[1.02] transition-all",
                                  item.color || 'bg-blue-500'
                                )}
                              >
                                <p className="text-xs font-bold opacity-80">{item.courseCode || 'CRS'}</p>
                                <p className="text-sm font-bold leading-tight mt-1">{getCourseTitle(item.courseId)}</p>
                                <div className="flex items-center gap-1 text-[10px] mt-2 opacity-90">
                                  <MapPin className="w-3 h-3" />
                                  <span>{item.room || 'TBA'}</span>
                                </div>
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {view === 'daily' && (
          <motion.div 
            key="daily"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4 overflow-x-auto pb-2">
              {DAYS.map(day => (
                <button 
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all border",
                    selectedDay === day 
                      ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200" 
                      : "bg-white text-slate-500 border-slate-100 hover:bg-slate-50"
                  )}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getDaySchedule(selectedDay).length > 0 ? (
                getDaySchedule(selectedDay).map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => {
                      setSelectedClass(item);
                      setIsDetailsModalOpen(true);
                    }}
                    className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn("px-3 py-1 rounded-lg text-white text-xs font-bold", item.color || 'bg-blue-500')}>
                        {item.courseCode || 'CRS'}
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-xs font-bold">
                        <Clock className="w-3 h-3" />
                        <span>{item.startTime} - {item.endTime}</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">{getCourseTitle(item.courseId)}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>{item.instructorName || 'Instructor'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{item.room || 'TBA'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                  <CalendarIcon className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium">No classes scheduled for this day</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {view === 'exams' && (
          <motion.div 
            key="exams"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-amber-900">Final Exam Season</h4>
                <p className="text-amber-700 text-sm mt-1">
                  Please ensure you have your university ID card and arrived at least 30 minutes before the exam starts.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search exams by course or title..."
                  value={examSearchTerm}
                  onChange={(e) => setExamSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="date"
                    value={examDateFilter}
                    onChange={(e) => setExamDateFilter(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-600 font-medium"
                  />
                </div>
                {(examSearchTerm || examDateFilter) && (
                  <button 
                    onClick={() => {
                      setExamSearchTerm('');
                      setExamDateFilter('');
                    }}
                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Filter className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {examViewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getFilteredExams().length > 0 ? (
                  getFilteredExams().map((exam) => (
                    <div key={exam.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-110" />
                      <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Course</span>
                            <div className="bg-blue-50 text-blue-600 px-4 py-1 rounded-xl text-sm font-bold border border-blue-100">
                              {getCourseCode(exam.courseId)}: {getCourseTitle(exam.courseId)}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-slate-400 text-sm font-bold">{exam.date}</div>
                            {(profile?.role === 'dept_admin' || profile?.role === 'registrar') && (
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleEditExam(exam)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Edit Exam"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteExam(exam.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete Exam"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-6">{exam.title}</h3>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Time</p>
                            <p className="font-bold text-slate-700">{exam.startTime} - {exam.endTime}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Room</p>
                            <p className="font-bold text-slate-700">{exam.roomId || 'TBA'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Seat Number</p>
                            <p className="font-bold text-blue-600 text-xl">{exam.seatNumber || 'TBA'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                    <AlertCircle className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No exams scheduled yet</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Course</th>
                        <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Exam Title</th>
                        <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                        <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Time</th>
                        <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Room</th>
                        <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Seat</th>
                        {(profile?.role === 'dept_admin' || profile?.role === 'registrar') && (
                          <th className="p-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getFilteredExams().map((exam) => (
                        <tr key={exam.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{getCourseTitle(exam.courseId)}</div>
                            <div className="text-xs text-slate-500">{getCourseCode(exam.courseId)}</div>
                          </td>
                          <td className="p-4 font-medium text-slate-700">{exam.title}</td>
                          <td className="p-4 text-slate-600">{exam.date}</td>
                          <td className="p-4 text-slate-600">{exam.startTime} - {exam.endTime}</td>
                          <td className="p-4 text-slate-600">{exam.roomId || 'TBA'}</td>
                          <td className="p-4">
                            <span className="font-bold text-blue-600">{exam.seatNumber || '-'}</span>
                          </td>
                          {(profile?.role === 'dept_admin' || profile?.role === 'registrar') && (
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleEditExam(exam)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteExam(exam.id)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Class Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Class Information"
        footer={
          <div className="flex gap-3 w-full">
            <button 
              onClick={() => {
                setIsDetailsModalOpen(false);
                setIsRequestModalOpen(true);
              }}
              className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all"
            >
              Request Change
            </button>
            <button 
              onClick={() => setIsDetailsModalOpen(false)}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
            >
              Close
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white", selectedClass?.color)}>
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{getCourseTitle(selectedClass?.courseId)}</h3>
              <p className="text-blue-600 font-bold text-sm">{selectedClass?.courseCode || 'CRS'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Instructor</p>
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <User className="w-4 h-4 text-slate-400" />
                <span>{selectedClass?.instructorName || 'Instructor'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Location</p>
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{selectedClass?.room || 'TBA'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Day</p>
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                <span>{selectedClass?.day}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Time</p>
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{selectedClass?.startTime} - {selectedClass?.endTime}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-500 leading-relaxed">
              Attendance for this class is mandatory. Please ensure you arrive on time. 
              Any changes to the schedule will be notified via the student portal.
            </p>
          </div>
        </div>
      </Modal>

      {/* Request Change Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request Schedule Change"
        footer={
          <>
            <button 
              onClick={() => setIsRequestModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleRequestChange}
              disabled={loading || !requestData.reason}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Submit Request
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-4">
            <p className="text-sm text-blue-700 font-bold">
              Requesting change for: {getCourseTitle(selectedClass?.courseId)} ({selectedClass?.courseCode || 'CRS'})
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reason for Request</label>
            <textarea 
              value={requestData.reason}
              onChange={(e) => setRequestData({...requestData, reason: e.target.value})}
              placeholder="Explain why you need a schedule change..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
              rows={4}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preferred Time Slot (Optional)</label>
            <input 
              type="text"
              value={requestData.preferredTime}
              onChange={(e) => setRequestData({...requestData, preferredTime: e.target.value})}
              placeholder="e.g., Monday 10:00 - 12:00"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Schedule change requests are subject to approval by the department head and room availability. 
              You will be notified of the decision within 3-5 working days.
            </p>
          </div>
        </div>
      </Modal>
      {/* Add Class Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Class Schedule"
        footer={
          <>
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleAddClass}
              disabled={loading || !newClassData.courseId || !newClassData.instructorId}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Create Schedule
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course</label>
            <select 
              value={newClassData.courseId}
              onChange={(e) => setNewClassData({...newClassData, courseId: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="">Select Course</option>
              {courses.filter(c => c.department === profile?.department).map(course => (
                <option key={course.id} value={course.id}>{course.code}: {course.title}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Instructor</label>
            <select 
              value={newClassData.instructorId}
              onChange={(e) => setNewClassData({...newClassData, instructorId: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="">Select Instructor</option>
              {lecturers.map(lecturer => (
                <option key={lecturer.id} value={lecturer.id}>{lecturer.displayName}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Day</label>
              <select 
                value={newClassData.day}
                onChange={(e) => setNewClassData({...newClassData, day: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Section</label>
              <input 
                type="text"
                value={newClassData.section}
                onChange={(e) => setNewClassData({...newClassData, section: e.target.value})}
                placeholder="e.g. A"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Start Time</label>
              <input 
                type="time"
                value={newClassData.startTime}
                onChange={(e) => setNewClassData({...newClassData, startTime: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">End Time</label>
              <input 
                type="time"
                value={newClassData.endTime}
                onChange={(e) => setNewClassData({...newClassData, endTime: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Room</label>
            <input 
              type="text"
              value={newClassData.room}
              onChange={(e) => setNewClassData({...newClassData, room: e.target.value})}
              placeholder="e.g. Room 101"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
        </div>
      </Modal>

      {/* Schedule Exam Modal */}
      <Modal
        isOpen={isExamModalOpen}
        onClose={() => {
          setIsExamModalOpen(false);
          setEditingExamId(null);
        }}
        title={editingExamId ? "Edit Exam Schedule" : "Schedule Final Exam"}
        footer={
          <>
            <button 
              onClick={() => {
                setIsExamModalOpen(false);
                setEditingExamId(null);
              }}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleScheduleExam}
              disabled={loading || !newExamData.courseId || !newExamData.date}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              {editingExamId ? "Update Exam" : "Schedule Exam"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course</label>
            <select 
              value={newExamData.courseId}
              onChange={(e) => setNewExamData({...newExamData, courseId: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="">Select Course</option>
              {courses.filter(c => profile?.role === 'registrar' || c.department === profile?.department).map(course => (
                <option key={course.id} value={course.id}>{course.code}: {course.title}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exam Title</label>
            <input 
              type="text"
              value={newExamData.title}
              onChange={(e) => setNewExamData({...newExamData, title: e.target.value})}
              placeholder="e.g. Final Exam"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</label>
            <input 
              type="date"
              value={newExamData.date}
              onChange={(e) => setNewExamData({...newExamData, date: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Start Time</label>
              <input 
                type="time"
                value={newExamData.startTime}
                onChange={(e) => setNewExamData({...newExamData, startTime: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">End Time</label>
              <input 
                type="time"
                value={newExamData.endTime}
                onChange={(e) => setNewExamData({...newExamData, endTime: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Room</label>
              <select 
                value={newExamData.roomId}
                onChange={(e) => setNewExamData({...newExamData, roomId: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="">Select Room</option>
                {buildings.map(bld => (
                  <optgroup key={bld.id} label={bld.name}>
                    {rooms.filter(r => r.buildingId === bld.id).map(room => (
                      <option key={room.id} value={room.code}>Room {room.code} ({room.type})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seat Number (Optional)</label>
              <input 
                type="text"
                value={newExamData.seatNumber}
                onChange={(e) => setNewExamData({...newExamData, seatNumber: e.target.value})}
                placeholder="e.g. 12"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
