import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { SystemSettings } from '../types';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  FileText,
  Clock,
  Layers,
  X,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
  Download,
  FileSpreadsheet,
  FileDown,
  ExternalLink,
  Target,
  Book,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Course, Department } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

import Modal from '../components/Modal';

export default function Courses() {
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [creditFilter, setCreditFilter] = useState<number | 'all'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [termFilter, setTermFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [prerequisiteFilter, setPrerequisiteFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isPrereqsOpen, setIsPrereqsOpen] = useState(false);
  const [isOutcomesOpen, setIsOutcomesOpen] = useState(false);
  const [newCourse, setNewCourse] = useState<{
    code: string;
    title: string;
    credits: number;
    description: string;
    prerequisites: string;
    department: string;
    learningOutcomes: string;
    textbooks: string;
    syllabusUrl: string;
    syllabusFileName?: string;
    status: 'active' | 'inactive' | 'archived';
    capacity: number;
    enrollmentCount: number;
    termId: string;
  }>({
    code: '',
    title: '',
    credits: 3,
    description: '',
    prerequisites: '',
    department: 'Computer Science',
    learningOutcomes: '',
    textbooks: '',
    syllabusUrl: '',
    syllabusFileName: '',
    status: 'active',
    capacity: 50,
    enrollmentCount: 0,
    termId: settings?.availableTerms?.[0] || 'Fall 2024'
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF or DOCX file.');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setNewCourse(prev => ({
        ...prev,
        syllabusUrl: base64String,
        syllabusFileName: file.name
      }));
      setUploading(false);
    };
    reader.onerror = () => {
      setUploading(false);
      alert('Failed to read file.');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const q = query(collection(db, 'courses'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const courseData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        setCourses(courseData);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'courses');
        setLoading(false);
      }
    );

    const qDepts = query(collection(db, 'departments'));
    const unsubDepts = onSnapshot(qDepts, (snap) => {
      setDepartments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department)));
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'system'), (snap) => {
      if (snap.exists()) {
        const s = snap.data() as SystemSettings;
        setSettings(s);
        if (s.availableTerms?.length) {
          setNewCourse(prev => ({ ...prev, termId: s.availableTerms[0] }));
        }
      }
    });

    return () => {
      unsubscribe();
      unsubDepts();
      unsubSettings();
    };
  }, []);

  const handleAddCourse = async () => {
    setSubmitting(true);
    try {
      const prereqs = newCourse.prerequisites.split(',').map(p => p.trim()).filter(p => p !== '');
      const outcomes = newCourse.learningOutcomes.split(',').map(p => p.trim()).filter(p => p !== '');
      const books = newCourse.textbooks.split(',').map(p => p.trim()).filter(p => p !== '');
      
      await addDoc(collection(db, 'courses'), {
        ...newCourse,
        prerequisites: prereqs,
        learningOutcomes: outcomes,
        textbooks: books,
        capacity: Number(newCourse.capacity),
        enrollmentCount: Number(newCourse.enrollmentCount),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsAddModalOpen(false);
      setNewCourse({
        code: '',
        title: '',
        credits: 3,
        description: '',
        prerequisites: '',
        department: 'Computer Science',
        learningOutcomes: '',
        textbooks: '',
        syllabusUrl: '',
        syllabusFileName: '',
        status: 'active',
        capacity: 50,
        enrollmentCount: 0,
        termId: 'Fall 2024'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'courses');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!selectedCourse) return;
    setSubmitting(true);
    try {
      const prereqs = newCourse.prerequisites.split(',').map(p => p.trim()).filter(p => p !== '');
      const outcomes = newCourse.learningOutcomes.split(',').map(p => p.trim()).filter(p => p !== '');
      const books = newCourse.textbooks.split(',').map(p => p.trim()).filter(p => p !== '');

      const courseRef = doc(db, 'courses', selectedCourse.id);
      await updateDoc(courseRef, {
        ...newCourse,
        prerequisites: prereqs,
        learningOutcomes: outcomes,
        textbooks: books,
        capacity: Number(newCourse.capacity),
        enrollmentCount: Number(newCourse.enrollmentCount),
        updatedAt: serverTimestamp()
      });
      setIsEditModalOpen(false);
      setSelectedCourse(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'courses');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (courseId: string, newStatus: 'active' | 'inactive' | 'archived') => {
    try {
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'courses');
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('University Course Catalog', 14, 15);
    
    const tableData = filteredCourses.map(c => [
      c.code,
      c.title,
      c.credits.toString(),
      c.department || 'N/A',
      c.status || 'active',
      `${c.enrollmentCount || 0}/${c.capacity || 0}`
    ]);

    (doc as any).autoTable({
      head: [['Code', 'Title', 'Credits', 'Department', 'Status', 'Utilization']],
      body: tableData,
      startY: 20,
    });

    doc.save('course-catalog.pdf');
    setIsExportMenuOpen(false);
  };

  const handleExportExcel = () => {
    const data = filteredCourses.map(c => ({
      Code: c.code,
      Title: c.title,
      Credits: c.credits,
      Department: c.department,
      Description: c.description,
      Prerequisites: c.prerequisites?.join(', '),
      Status: c.status,
      Capacity: c.capacity || 0,
      Enrollment: c.enrollmentCount || 0,
      Utilization: `${Math.round(((c.enrollmentCount || 0) / (c.capacity || 1)) * 100)}%`
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Courses');
    XLSX.writeFile(wb, 'course-catalog.xlsx');
    setIsExportMenuOpen(false);
  };

  const handleDeleteCourse = (id: string) => {
    setCourseToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!courseToDelete) return;
    setSubmitting(true);
    try {
      await deleteDoc(doc(db, 'courses', courseToDelete));
      setIsDeleteModalOpen(false);
      setCourseToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'courses');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCourses = courses.filter(c => {
    const matchesSearch = (
      c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.learningOutcomes?.some(lo => lo.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    const matchesCredits = creditFilter === 'all' || c.credits === creditFilter;
    const matchesDept = deptFilter === 'all' || c.department === deptFilter;
    const matchesTerm = termFilter === 'all' || (c.termId || 'Fall 2024') === termFilter;
    const matchesStatus = profile?.role === 'student' 
      ? (c.status || 'active') === 'active' 
      : (statusFilter === 'all' || (c.status || 'active') === statusFilter);
    const matchesPrerequisite = prerequisiteFilter === 'all' || c.prerequisites?.includes(prerequisiteFilter);
    const matchesOutcomeFilter = outcomeFilter === '' || c.learningOutcomes?.some(lo => lo.toLowerCase().includes(outcomeFilter.toLowerCase()));
    
    return matchesSearch && matchesCredits && matchesDept && matchesTerm && matchesStatus && matchesPrerequisite && matchesOutcomeFilter;
  });

  const uniqueTerms = settings?.availableTerms?.length 
    ? settings.availableTerms 
    : Array.from(new Set(courses.map(c => c.termId || 'Fall 2024'))).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('courses')}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500">University course catalog and descriptions</p>
            {settings && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                {settings.activeSemester} {settings.currentAcademicYear}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
              <Download className="w-5 h-5" />
              <span>Export</span>
            </button>
            <AnimatePresence>
              {isExportMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-20"
                >
                  <button 
                    onClick={handleExportPDF}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    <FileDown className="w-4 h-4 text-red-500" />
                    Download PDF
                  </button>
                  <button 
                    onClick={handleExportExcel}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-500" />
                    Export Excel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {profile?.role !== 'student' && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200"
            >
              <Plus className="w-5 h-5" />
              <span>Add Course</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
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
              onClick={() => setViewMode('table')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'table' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
              title="Table View"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          
          <div className="h-8 w-px bg-slate-100 mx-1 hidden sm:block" />

          <select 
            value={creditFilter}
            onChange={(e) => setCreditFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-600 font-medium text-sm"
          >
            <option value="all">All Credits</option>
            <option value="1">1 Credit</option>
            <option value="2">2 Credits</option>
            <option value="3">3 Credits</option>
            <option value="4">4 Credits</option>
            <option value="5">5+ Credits</option>
          </select>
          <select 
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-600 font-medium text-sm"
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
          <select 
            value={termFilter}
            onChange={(e) => setTermFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-600 font-medium text-sm"
          >
            <option value="all">All Terms</option>
            {uniqueTerms.map(term => (
              <option key={term} value={term}>{term}</option>
            ))}
          </select>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-600 font-medium text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>

          <select 
            value={prerequisiteFilter}
            onChange={(e) => setPrerequisiteFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-600 font-medium text-sm"
          >
            <option value="all">Any Prerequisite</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.code}</option>
            ))}
          </select>

          <div className="relative">
            <input 
              type="text"
              placeholder="Filter by Outcome..."
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-600 font-medium text-sm w-40"
            />
          </div>

          {(searchTerm || creditFilter !== 'all' || deptFilter !== 'all' || termFilter !== 'all' || statusFilter !== 'all' || prerequisiteFilter !== 'all' || outcomeFilter !== '') && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setCreditFilter('all');
                setDeptFilter('all');
                setTermFilter('all');
                setStatusFilter('all');
                setPrerequisiteFilter('all');
                setOutcomeFilter('');
              }}
              className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Clear Filters"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Course List */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">{isRTL ? 'الكود' : 'Code'}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">{isRTL ? 'اسم المقرر' : 'Course Title'}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">{isRTL ? 'الساعات' : 'Credits'}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">{isRTL ? 'الاستيعاب' : 'Utilization'}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">{isRTL ? 'المتطلبات' : 'Prerequisites'}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">{isRTL ? 'الفصل الدراسي' : 'Term'}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">{isRTL ? 'الحالة' : 'Status'}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-48" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-8" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  ))
                ) : filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => {
                    const utilization = course.capacity ? (course.enrollmentCount || 0) / course.capacity : 0;
                    const isUnderutilized = utilization < 0.4 && (course.status || 'active') === 'active';
                    
                    return (
                    <tr 
                      key={course.id} 
                      onClick={() => {
                        setSelectedCourse(course);
                        setIsDetailsModalOpen(true);
                      }}
                      className={cn(
                        "hover:bg-blue-50/30 transition-colors group cursor-pointer",
                        isUnderutilized ? "bg-amber-50/20" : ""
                      )}
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg text-sm">
                          {course.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{course.title}</span>
                          <span className="text-xs text-slate-400 truncate max-w-xs">{course.description}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{course.credits}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 w-24">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                            <span>{course.enrollmentCount || 0}/{course.capacity || 0}</span>
                            <span className={cn(
                              utilization > 0.9 ? "text-red-500" : 
                              utilization < 0.4 ? "text-amber-500" : "text-emerald-500"
                            )}>
                              {Math.round(utilization * 100)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all",
                                utilization > 0.9 ? "bg-red-500" : 
                                utilization < 0.4 ? "bg-amber-500" : "bg-emerald-500"
                              )}
                              style={{ width: `${Math.min(utilization * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {course.prerequisites?.length > 0 ? (
                            course.prerequisites.map((pre, idx) => (
                              <span key={idx} className="text-[10px] font-bold bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase shadow-sm">
                                {pre}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-300">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">{course.termId || 'Fall 2024'}</td>
                      <td className="px-6 py-4">
                        {profile?.role !== 'student' ? (
                          <select
                            value={course.status || 'active'}
                            onChange={(e) => handleStatusChange(course.id, e.target.value as any)}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border-none focus:ring-0 cursor-pointer",
                              (course.status || 'active') === 'active' ? "bg-green-50 text-green-600" :
                              (course.status === 'inactive') ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                            )}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="archived">Archived</option>
                          </select>
                        ) : (
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                            (course.status || 'active') === 'active' ? "bg-green-50 text-green-600" :
                            (course.status === 'inactive') ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                          )}>
                            {course.status || 'active'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative group/menu">
                          <button className="p-2 text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded-lg transition-all">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 hidden group-hover/menu:block z-10">
                            <button 
                              onClick={() => {
                                setSelectedCourse(course);
                                setIsDetailsModalOpen(true);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 font-medium"
                            >
                              View Details
                            </button>
                            {profile?.role !== 'student' && (
                              <>
                                <button 
                                  onClick={() => {
                                    setSelectedCourse(course);
                                    setNewCourse({
                                      code: course.code,
                                      title: course.title,
                                      credits: course.credits,
                                      description: course.description || '',
                                      prerequisites: Array.isArray(course.prerequisites) ? course.prerequisites.join(', ') : (course.prerequisites || ''),
                                      department: course.department || 'Computer Science',
                                      learningOutcomes: Array.isArray(course.learningOutcomes) ? course.learningOutcomes.join(', ') : (course.learningOutcomes || ''),
                                      textbooks: Array.isArray(course.textbooks) ? course.textbooks.join(', ') : (course.textbooks || ''),
                                      syllabusUrl: course.syllabusUrl || '',
                                      syllabusFileName: course.syllabusFileName || (course.syllabusUrl ? 'Syllabus File' : ''),
                                      status: course.status || 'active',
                                      capacity: course.capacity || 50,
                                      enrollmentCount: course.enrollmentCount || 0,
                                      termId: course.termId || 'Fall 2024'
                                    });
                                    setIsEditModalOpen(true);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 font-medium"
                                >
                                  Edit Course
                                </button>
                                <button 
                                  onClick={() => handleDeleteCourse(course.id)}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                                >
                                  Delete Course
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Layers className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">{t('noData')}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <motion.div 
              key={course.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              onClick={() => {
                setSelectedCourse(course);
                setIsDetailsModalOpen(true);
              }}
              className="bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all group cursor-pointer relative flex flex-col h-full overflow-hidden"
            >
              {course.capacity && (course.enrollmentCount || 0) / course.capacity < 0.4 && (course.status || 'active') === 'active' && (
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-400" />
              )}
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-wider">
                        {course.code}
                      </span>
                      {profile?.role !== 'student' ? (
                        <select
                          value={course.status || 'active'}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleStatusChange(course.id, e.target.value as any);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider border-none focus:ring-0 cursor-pointer",
                            (course.status || 'active') === 'active' ? "bg-green-50 text-green-600" :
                            (course.status === 'inactive') ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                          )}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="archived">Archived</option>
                        </select>
                      ) : (
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider",
                          (course.status || 'active') === 'active' ? "bg-green-50 text-green-600" :
                          (course.status === 'inactive') ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                        )}>
                          {course.status || 'active'}
                        </span>
                      )}
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-lg uppercase tracking-wider">
                        {course.termId || 'Fall 2024'}
                      </span>
                      {(course.capacity && (course.enrollmentCount || 0) / course.capacity < 0.4) && (course.status || 'active') === 'active' && (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Underutilized
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-lg leading-tight">{course.title}</h3>
                  </div>
                  <div className="relative group/menu" onClick={(e) => e.stopPropagation()}>
                    <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 hidden group-hover/menu:block z-10">
                      <button 
                        onClick={() => {
                          setSelectedCourse(course);
                          setIsDetailsModalOpen(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 font-medium"
                      >
                        View Details
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedCourse(course);
                          setNewCourse({
                            code: course.code,
                            title: course.title,
                            credits: course.credits,
                            description: course.description || '',
                            prerequisites: Array.isArray(course.prerequisites) ? course.prerequisites.join(', ') : (course.prerequisites || ''),
                            department: course.department || 'Computer Science',
                            learningOutcomes: Array.isArray(course.learningOutcomes) ? course.learningOutcomes.join(', ') : (course.learningOutcomes || ''),
                            textbooks: Array.isArray(course.textbooks) ? course.textbooks.join(', ') : (course.textbooks || ''),
                            syllabusUrl: course.syllabusUrl || '',
                            syllabusFileName: course.syllabusFileName || (course.syllabusUrl ? 'Syllabus File' : ''),
                            status: course.status || 'active',
                            capacity: course.capacity || 50,
                            enrollmentCount: course.enrollmentCount || 0,
                            termId: course.termId || 'Fall 2024'
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 font-medium"
                      >
                        Edit Course
                      </button>
                      <button 
                        onClick={() => handleDeleteCourse(course.id)}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                      >
                        Delete Course
                      </button>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-slate-500 line-clamp-3 mb-6 leading-relaxed">{course.description}</p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex flex-wrap gap-2">
                    {course.prerequisites?.slice(0, 2).map((pre, idx) => (
                      <span key={idx} className="text-[10px] font-bold bg-slate-50 text-slate-400 px-2 py-1 rounded-lg border border-slate-100 uppercase">
                        {pre}
                      </span>
                    ))}
                    {course.prerequisites?.length > 2 && (
                      <span className="text-[10px] font-bold text-slate-300 px-2 py-1">
                        +{course.prerequisites.length - 2} more
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Utilization</span>
                      <span className={cn(
                        ((course.enrollmentCount || 0) / (course.capacity || 1)) > 0.9 ? "text-red-500" : 
                        ((course.enrollmentCount || 0) / (course.capacity || 1)) < 0.4 ? "text-amber-500" : "text-emerald-500"
                      )}>
                        {course.enrollmentCount || 0} / {course.capacity || 0} ({Math.round(((course.enrollmentCount || 0) / (course.capacity || 1)) * 100)}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          ((course.enrollmentCount || 0) / (course.capacity || 1)) > 0.9 ? "bg-red-500" : 
                          ((course.enrollmentCount || 0) / (course.capacity || 1)) < 0.4 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(((course.enrollmentCount || 0) / (course.capacity || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between mt-auto">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {course.credits} Credits
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <Layers className="w-4 h-4 text-slate-400" />
                    {course.department}
                  </div>
                </div>
                <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Course Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Course"
        maxWidth="max-w-2xl"
        footer={
          <>
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              {t('cancel')}
            </button>
            <button 
              onClick={handleAddCourse}
              disabled={submitting || !newCourse.code || !newCourse.title}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {submitting && <Clock className="w-4 h-4 animate-spin" />}
              {t('save')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Academic Term</label>
            <select 
              value={newCourse.termId}
              onChange={(e) => setNewCourse({...newCourse, termId: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              {settings?.availableTerms?.map(term => (
                <option key={term} value={term}>{term}</option>
              ))}
              {!settings?.availableTerms?.length && <option value="Fall 2024">Fall 2024</option>}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course Code</label>
              <input 
                type="text"
                value={newCourse.code}
                onChange={(e) => setNewCourse({...newCourse, code: e.target.value})}
                placeholder="e.g., CS101"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Credit Hours</label>
              <input 
                type="number"
                value={newCourse.credits}
                onChange={(e) => setNewCourse({...newCourse, credits: parseInt(e.target.value)})}
                placeholder="3"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course Title</label>
            <input 
              type="text"
              value={newCourse.title}
              onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
              placeholder="Introduction to Computer Science"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department</label>
              <select 
                value={newCourse.department}
                onChange={(e) => setNewCourse({...newCourse, department: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</label>
              <select 
                value={newCourse.status}
                onChange={(e) => setNewCourse({...newCourse, status: e.target.value as any})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capacity</label>
              <input 
                type="number"
                value={newCourse.capacity}
                onChange={(e) => setNewCourse({...newCourse, capacity: parseInt(e.target.value)})}
                placeholder="50"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Enrollment</label>
              <input 
                type="number"
                value={newCourse.enrollmentCount}
                onChange={(e) => setNewCourse({...newCourse, enrollmentCount: parseInt(e.target.value)})}
                placeholder="0"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
            <textarea 
              rows={3}
              value={newCourse.description}
              onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prerequisites (Comma separated)</label>
              <input 
                type="text"
                value={newCourse.prerequisites}
                onChange={(e) => setNewCourse({...newCourse, prerequisites: e.target.value})}
                placeholder="MATH101, CS100"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Syllabus (PDF or DOCX)</label>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 border-dashed rounded-xl hover:bg-slate-100 transition-all cursor-pointer group">
                  <input 
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <FileDown className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                  <span className="text-sm text-slate-500 truncate">
                    {uploading ? 'Uploading...' : newCourse.syllabusFileName || 'Upload Syllabus'}
                  </span>
                </label>
                {newCourse.syllabusUrl && (
                  <button 
                    onClick={() => setNewCourse({...newCourse, syllabusUrl: '', syllabusFileName: ''})}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Remove Syllabus"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Learning Outcomes (Comma separated)</label>
            <textarea 
              rows={2}
              value={newCourse.learningOutcomes}
              onChange={(e) => setNewCourse({...newCourse, learningOutcomes: e.target.value})}
              placeholder="Outcome 1, Outcome 2, ..."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Textbooks (Comma separated)</label>
            <input 
              type="text"
              value={newCourse.textbooks}
              onChange={(e) => setNewCourse({...newCourse, textbooks: e.target.value})}
              placeholder="Book Title 1, Book Title 2, ..."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
        </div>
      </Modal>

      {/* Edit Course Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Course: ${selectedCourse?.code}`}
        maxWidth="max-w-2xl"
        footer={
          <>
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              {t('cancel')}
            </button>
            <button 
              onClick={handleUpdateCourse}
              disabled={submitting || !newCourse.code || !newCourse.title}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {submitting && <Clock className="w-4 h-4 animate-spin" />}
              {t('save')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Academic Term</label>
            <select 
              value={newCourse.termId}
              onChange={(e) => setNewCourse({...newCourse, termId: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              {settings?.availableTerms?.map(term => (
                <option key={term} value={term}>{term}</option>
              ))}
              {!settings?.availableTerms?.length && <option value="Fall 2024">Fall 2024</option>}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course Code</label>
              <input 
                type="text"
                value={newCourse.code}
                onChange={(e) => setNewCourse({...newCourse, code: e.target.value})}
                placeholder="e.g., CS101"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Credit Hours</label>
              <input 
                type="number"
                value={newCourse.credits}
                onChange={(e) => setNewCourse({...newCourse, credits: parseInt(e.target.value)})}
                placeholder="3"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course Title</label>
            <input 
              type="text"
              value={newCourse.title}
              onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
              placeholder="Introduction to Computer Science"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department</label>
              <select 
                value={newCourse.department}
                onChange={(e) => setNewCourse({...newCourse, department: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</label>
              <select 
                value={newCourse.status}
                onChange={(e) => setNewCourse({...newCourse, status: e.target.value as any})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capacity</label>
              <input 
                type="number"
                value={newCourse.capacity}
                onChange={(e) => setNewCourse({...newCourse, capacity: parseInt(e.target.value)})}
                placeholder="50"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Enrollment</label>
              <input 
                type="number"
                value={newCourse.enrollmentCount}
                onChange={(e) => setNewCourse({...newCourse, enrollmentCount: parseInt(e.target.value)})}
                placeholder="0"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
            <textarea 
              rows={3}
              value={newCourse.description}
              onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prerequisites (Comma separated)</label>
              <input 
                type="text"
                value={newCourse.prerequisites}
                onChange={(e) => setNewCourse({...newCourse, prerequisites: e.target.value})}
                placeholder="MATH101, CS100"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Syllabus (PDF or DOCX)</label>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 border-dashed rounded-xl hover:bg-slate-100 transition-all cursor-pointer group">
                  <input 
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <FileDown className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                  <span className="text-sm text-slate-500 truncate">
                    {uploading ? 'Uploading...' : newCourse.syllabusFileName || 'Upload Syllabus'}
                  </span>
                </label>
                {newCourse.syllabusUrl && (
                  <button 
                    onClick={() => setNewCourse({...newCourse, syllabusUrl: '', syllabusFileName: ''})}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Remove Syllabus"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Learning Outcomes (Comma separated)</label>
            <textarea 
              rows={2}
              value={newCourse.learningOutcomes}
              onChange={(e) => setNewCourse({...newCourse, learningOutcomes: e.target.value})}
              placeholder="Outcome 1, Outcome 2, ..."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Textbooks (Comma separated)</label>
            <input 
              type="text"
              value={newCourse.textbooks}
              onChange={(e) => setNewCourse({...newCourse, textbooks: e.target.value})}
              placeholder="Book Title 1, Book Title 2, ..."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
        footer={
          <>
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              {t('cancel')}
            </button>
            <button 
              onClick={confirmDelete}
              disabled={submitting}
              className="flex items-center gap-2 bg-red-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {submitting && <Clock className="w-4 h-4 animate-spin" />}
              Delete
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Are you sure you want to delete this course?</h3>
          <p className="text-slate-500">This action cannot be undone. All data associated with this course will be permanently removed.</p>
        </div>
      </Modal>

      {/* Course Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Course Information"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
                  {selectedCourse?.code}
                </span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                  (selectedCourse?.status || 'active') === 'active' ? "bg-green-50 text-green-600" :
                  (selectedCourse?.status === 'inactive') ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                )}>
                  {selectedCourse?.status || 'active'}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{selectedCourse?.title}</h3>
              <p className="text-slate-500 font-medium flex items-center gap-2 mt-1">
                <Layers className="w-4 h-4" />
                {selectedCourse?.department}
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 shrink-0 self-start">
              <Clock className="w-5 h-5 text-slate-400" />
              <span className="font-bold text-slate-700">{selectedCourse?.credits} Credits</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Term</p>
                  <p className="text-sm font-bold text-slate-900">{selectedCourse?.termId || 'Fall 2024'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Capacity</p>
                  <p className="text-xl font-bold text-slate-900">{selectedCourse?.capacity || 0}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Enrollment</p>
                  <p className="text-xl font-bold text-slate-900">{selectedCourse?.enrollmentCount || 0}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Utilization</p>
                  <span className={cn(
                    "text-xs font-bold",
                    ((selectedCourse?.enrollmentCount || 0) / (selectedCourse?.capacity || 1)) > 0.9 ? "text-red-500" : 
                    ((selectedCourse?.enrollmentCount || 0) / (selectedCourse?.capacity || 1)) < 0.4 ? "text-amber-500" : "text-emerald-500"
                  )}>
                    {Math.round(((selectedCourse?.enrollmentCount || 0) / (selectedCourse?.capacity || 1)) * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      ((selectedCourse?.enrollmentCount || 0) / (selectedCourse?.capacity || 1)) > 0.9 ? "bg-red-500" : 
                      ((selectedCourse?.enrollmentCount || 0) / (selectedCourse?.capacity || 1)) < 0.4 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(((selectedCourse?.enrollmentCount || 0) / (selectedCourse?.capacity || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Description
                </p>
                <p className="text-slate-600 leading-relaxed">{selectedCourse?.description || 'No description available for this course.'}</p>
              </div>

              <div className="space-y-2 border border-slate-100 rounded-2xl overflow-hidden">
                <button 
                  onClick={() => setIsOutcomesOpen(!isOutcomesOpen)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-all"
                >
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Learning Outcomes
                  </p>
                  {isOutcomesOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                <AnimatePresence>
                  {isOutcomesOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <ul className="p-4 pt-0 space-y-2">
                        {Array.isArray(selectedCourse?.learningOutcomes) && selectedCourse.learningOutcomes.length > 0 ? (
                          selectedCourse.learningOutcomes.map((outcome, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm text-slate-600">
                              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                              {outcome}
                            </li>
                          ))
                        ) : typeof selectedCourse?.learningOutcomes === 'string' && selectedCourse.learningOutcomes ? (
                          <li className="flex items-start gap-3 text-sm text-slate-600">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            {selectedCourse.learningOutcomes}
                          </li>
                        ) : (
                          <li className="text-slate-400 text-sm italic">No learning outcomes defined.</li>
                        )}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2 border border-slate-100 rounded-2xl overflow-hidden">
                <button 
                  onClick={() => setIsPrereqsOpen(!isPrereqsOpen)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-all"
                >
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Prerequisites
                  </p>
                  {isPrereqsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                <AnimatePresence>
                  {isPrereqsOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 text-sm font-medium text-slate-700">
                        {Array.isArray(selectedCourse?.prerequisites) && selectedCourse.prerequisites.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedCourse.prerequisites.map((pre, idx) => (
                              <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100">
                                {pre}
                              </span>
                            ))}
                          </div>
                        ) : typeof selectedCourse?.prerequisites === 'string' && selectedCourse.prerequisites ? (
                          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100">
                            {selectedCourse.prerequisites}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Book className="w-4 h-4" />
                  Required Textbooks
                </p>
                <div className="space-y-2">
                  {Array.isArray(selectedCourse?.textbooks) && selectedCourse.textbooks.length > 0 ? (
                    selectedCourse.textbooks.map((book, idx) => (
                      <div key={idx} className="bg-slate-50 p-2 rounded-lg text-xs text-slate-600 border border-slate-100">
                        {book}
                      </div>
                    ))
                  ) : typeof selectedCourse?.textbooks === 'string' && selectedCourse.textbooks ? (
                    <div className="bg-slate-50 p-2 rounded-lg text-xs text-slate-600 border border-slate-100">
                      {selectedCourse.textbooks}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-sm italic">No textbooks listed.</span>
                  )}
                </div>
              </div>

              {selectedCourse?.syllabusUrl && (
                <div className="pt-4 border-t border-slate-100">
                  <a 
                    href={selectedCourse.syllabusUrl}
                    download={selectedCourse.syllabusFileName || 'syllabus'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-bold hover:bg-blue-100 transition-all text-sm"
                  >
                    <FileDown className="w-4 h-4" />
                    Download Syllabus {selectedCourse.syllabusFileName ? `(${selectedCourse.syllabusFileName})` : ''}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            {profile?.role !== 'student' && (
              <button 
                onClick={() => {
                  setNewCourse({
                    code: selectedCourse?.code || '',
                    title: selectedCourse?.title || '',
                    credits: selectedCourse?.credits || 3,
                    description: selectedCourse?.description || '',
                    prerequisites: Array.isArray(selectedCourse?.prerequisites) ? selectedCourse.prerequisites.join(', ') : (selectedCourse?.prerequisites || ''),
                    department: selectedCourse?.department || 'Computer Science',
                    learningOutcomes: Array.isArray(selectedCourse?.learningOutcomes) ? selectedCourse.learningOutcomes.join(', ') : (selectedCourse?.learningOutcomes || ''),
                    textbooks: Array.isArray(selectedCourse?.textbooks) ? selectedCourse.textbooks.join(', ') : (selectedCourse?.textbooks || ''),
                    syllabusUrl: selectedCourse?.syllabusUrl || '',
                    syllabusFileName: selectedCourse?.syllabusFileName || (selectedCourse?.syllabusUrl ? 'Syllabus File' : ''),
                    status: selectedCourse?.status || 'active',
                    capacity: selectedCourse?.capacity || 50,
                    enrollmentCount: selectedCourse?.enrollmentCount || 0,
                    termId: selectedCourse?.termId || 'Fall 2024'
                  });
                  setIsDetailsModalOpen(false);
                  setIsEditModalOpen(true);
                }}
                className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                Edit Course
              </button>
            )}
            <button className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
              <ExternalLink className="w-4 h-4" />
              View Full Catalog
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
