import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Mail,
  Phone,
  GraduationCap,
  Award,
  Building2,
  X,
  CheckCircle2,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  Clock,
  BookOpen,
  LayoutGrid,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

import Modal from '../components/Modal';

export default function Lecturers() {
  const navigate = useNavigate();
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'thumbnails'>('grid');
  const [submitting, setSubmitting] = useState(false);
  const [newLecturer, setNewLecturer] = useState({
    displayName: '',
    email: '',
    role: 'Lecturer',
    department: profile?.department || 'Computer Science',
    specialization: ''
  });

  useEffect(() => {
    const q = (profile?.role === 'dept_admin' && profile.department)
      ? query(collection(db, 'users'), where('role', '==', 'lecturer'), where('department', '==', profile.department))
      : query(collection(db, 'users'), where('role', '==', 'lecturer'));
      
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const lecturerData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLecturers(lecturerData);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleAddLecturer = async () => {
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'users'), {
        ...newLecturer,
        role: 'lecturer',
        status: 'active',
        departmentId: profile?.departmentId || '', // Assuming we might want to store ID too
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsAddModalOpen(false);
      setNewLecturer({
        displayName: '',
        email: '',
        role: 'Lecturer',
        department: profile?.department || 'Computer Science',
        specialization: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLecturers = lecturers.filter(l => 
    l.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [lecturerCourses, setLecturerCourses] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedLecturer || !isDetailsModalOpen) return;

    const q = query(collection(db, 'offerings'), where('instructorId', '==', selectedLecturer.id));
    const unsubscribe = onSnapshot(q, (snap) => {
      setLecturerCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [selectedLecturer, isDetailsModalOpen]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lecturers & Staff</h1>
          <p className="text-slate-500 mt-1">Manage university faculty and academic staff</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          <span>Add Lecturer</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder={t('search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl mr-2">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'grid' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('thumbnails')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'thumbnails' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
              title="Thumbnail View"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          <button className="flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-all">
            <Filter className="w-5 h-5" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Lecturer Grid */}
      <div className={cn(
        "grid gap-6",
        viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
      )}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-slate-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-3 bg-slate-200 rounded w-full" />
                <div className="h-3 bg-slate-200 rounded w-full" />
              </div>
            </div>
          ))
        ) : filteredLecturers.length > 0 ? (
          filteredLecturers.map((lecturer) => (
            <motion.div 
              key={lecturer.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group",
                viewMode === 'grid' ? "p-6" : "p-4 flex items-center gap-6"
              )}
            >
              <div className={cn(
                "flex items-start justify-between",
                viewMode === 'grid' ? "mb-4" : "flex-1"
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100",
                    viewMode === 'grid' ? "w-14 h-14 text-xl" : "w-12 h-12 text-lg"
                  )}>
                    {lecturer.displayName?.charAt(0) || 'L'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{lecturer.displayName}</h3>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{lecturer.role}</p>
                  </div>
                </div>
                {viewMode === 'thumbnails' && (
                  <div className="hidden md:flex items-center gap-8 flex-1 px-8">
                    <div className="flex items-center gap-3 text-sm text-slate-500 min-w-[200px]">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{lecturer.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500 min-w-[150px]">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span>{lecturer.department}</span>
                    </div>
                  </div>
                )}
                <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              {viewMode === 'grid' ? (
                <>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{lecturer.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span>{lecturer.department}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <Award className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{lecturer.specialization}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available</span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedLecturer(lecturer);
                        setIsDetailsModalOpen(true);
                      }}
                      className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:underline"
                    >
                      View Profile
                      {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Available</span>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedLecturer(lecturer);
                      setIsDetailsModalOpen(true);
                    }}
                    className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:underline"
                  >
                    View Profile
                  </button>
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
            <Users className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">{t('noData')}</p>
          </div>
        )}
      </div>

      {/* Add Lecturer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Lecturer"
        footer={
          <>
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleAddLecturer}
              disabled={submitting || !newLecturer.displayName || !newLecturer.email}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {submitting && <Clock className="w-4 h-4 animate-spin" />}
              Save Lecturer
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
              <input 
                type="text"
                value={newLecturer.displayName}
                onChange={(e) => setNewLecturer({...newLecturer, displayName: e.target.value})}
                placeholder="e.g., Dr. Ahmed Ali"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
              <input 
                type="email"
                value={newLecturer.email}
                onChange={(e) => setNewLecturer({...newLecturer, email: e.target.value})}
                placeholder="e.g., ahmed@university.ly"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Academic Rank</label>
              <select 
                value={newLecturer.role}
                onChange={(e) => setNewLecturer({...newLecturer, role: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option>Professor</option>
                <option>Associate Professor</option>
                <option>Assistant Professor</option>
                <option>Lecturer</option>
                <option>Teaching Assistant</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department</label>
              <select 
                value={newLecturer.department}
                onChange={(e) => setNewLecturer({...newLecturer, department: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option>Computer Science</option>
                <option>Medicine</option>
                <option>Engineering</option>
                <option>English</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Specialization</label>
            <input 
              type="text"
              value={newLecturer.specialization}
              onChange={(e) => setNewLecturer({...newLecturer, specialization: e.target.value})}
              placeholder="e.g., AI & Machine Learning"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
        </div>
      </Modal>

      {/* Lecturer Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Lecturer Profile"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-3xl border border-indigo-100">
              {selectedLecturer?.displayName?.charAt(4) || 'L'}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{selectedLecturer?.displayName}</h3>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-sm">{selectedLecturer?.role}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-600">
                  {selectedLecturer?.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-600">
                <Mail className="w-5 h-5 text-slate-400" />
                <span>{selectedLecturer?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Building2 className="w-5 h-5 text-slate-400" />
                <span>{selectedLecturer?.department}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Award className="w-5 h-5 text-slate-400" />
                <span>{selectedLecturer?.specialization}</span>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Academic Load</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">Courses</span>
                <span className="text-lg font-bold text-indigo-600">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">Total Students</span>
                <span className="text-lg font-bold text-indigo-600">120</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Current Course Assignments
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {lecturerCourses.length > 0 ? (
                lecturerCourses.map((course, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{course.courseCode}: {course.courseName}</p>
                      <p className="text-xs text-slate-500">{course.enrolledCount || 0} Students Enrolled</p>
                    </div>
                    <button className="text-blue-600 text-xs font-bold hover:underline">View List</button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-slate-500 text-sm">No active course assignments</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {(profile?.role === 'super_admin' || profile?.role === 'dept_admin') && (
              <button 
                onClick={() => navigate(`/profile/${selectedLecturer?.id}`)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                View & Edit Profile
              </button>
            )}
            <button className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all">
              View Schedule
            </button>
          </div>
          {profile?.role === 'dept_admin' && (
            <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              Contact Lecturer
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}


