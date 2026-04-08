import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where, getDocs, orderBy, limit, startAt, endAt } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { calculateAcademicStanding } from '../lib/academicUtils';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  Printer,
  LayoutGrid,
  List,
  Download,
  FileSpreadsheet,
  FileDown,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  UserX,
  ShieldAlert,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { StudentRecord } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import Modal from '../components/Modal';

export default function Students() {
  const navigate = useNavigate();
  const { t, isRTL, language } = useTranslation();
  const { profile, hasPermission } = useAuth();
  const canEditSensitiveData = hasPermission('manage_students_full');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [dueDateFilter, setDueDateFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDueDateModalOpen, setIsDueDateModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [submitting, setSubmitting] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    displayName: '',
    nationalId: '',
    email: '',
    gender: 'male',
    status: 'active',
    program: 'Computer Science',
    department: 'Computer Engineering',
    dueDate: ''
  });

  useEffect(() => {
    if (!profile || profile.role === 'student') {
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    let q;
    
    if (searchTerm.length >= 2) {
      // Search mode: Query by displayName prefix
      q = query(
        collection(db, 'students'),
        orderBy('displayName'),
        startAt(searchTerm),
        endAt(searchTerm + '\uf8ff'),
        limit(50)
      );
    } else {
      // Default mode: Recent students
      if (profile?.role === 'dept_admin' && profile.department) {
        q = query(collection(db, 'students'), where('department', '==', profile.department), orderBy('createdAt', 'desc'), limit(50));
      } else {
        q = query(collection(db, 'students'), orderBy('createdAt', 'desc'), limit(50));
      }
    }
      
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        setStudents(studentData);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 50);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        // If index is missing, fallback to simple query
        if (error.message.includes('index')) {
          const fallbackQ = query(collection(db, 'students'), limit(50));
          onSnapshot(fallbackQ, (snap) => {
            setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
          });
        } else {
          handleFirestoreError(error, OperationType.LIST, 'students');
          setLoading(false);
        }
      }
    );
    return () => unsubscribe();
  }, [profile, searchTerm]);

  const loadMore = async () => {
    if (!lastDoc || !hasMore) return;
    
    let q;
    if (searchTerm.length >= 2) {
      q = query(
        collection(db, 'students'),
        orderBy('displayName'),
        startAt(lastDoc),
        limit(50)
      );
    } else {
      if (profile?.role === 'dept_admin' && profile.department) {
        q = query(collection(db, 'students'), where('department', '==', profile.department), orderBy('createdAt', 'desc'), startAt(lastDoc), limit(50));
      } else {
        q = query(collection(db, 'students'), orderBy('createdAt', 'desc'), startAt(lastDoc), limit(50));
      }
    }

    const snapshot = await getDocs(q);
    const newStudents = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    setStudents(prev => [...prev, ...newStudents]);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
    setHasMore(snapshot.docs.length === 50);
  };

  const handleAddStudent = async () => {
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'students'), {
        ...newStudent,
        department: profile?.role === 'dept_admin' ? profile.department : newStudent.department,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsAddModalOpen(false);
      setNewStudent({
        displayName: '',
        nationalId: '',
        email: '',
        gender: 'male',
        status: 'active',
        program: 'Computer Science',
        department: profile?.department || 'Computer Engineering',
        dueDate: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'students');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStudent = async () => {
    if (!selectedStudent) return;
    setSubmitting(true);
    try {
      const studentRef = doc(db, 'students', selectedStudent.id);
      await updateDoc(studentRef, {
        ...newStudent,
        updatedAt: serverTimestamp()
      });
      setIsEditModalOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'students');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTranscript = async () => {
    if (!selectedStudent) return;
    
    setLoading(true);
    try {
      // Fetch enrollments
      const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', selectedStudent.id)));
      const enrollments = enrollSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch offerings and courses to get titles
      const offeringsSnap = await getDocs(collection(db, 'offerings'));
      const offerings = offeringsSnap.docs.reduce((acc: any, doc) => {
        acc[doc.id] = doc.data();
        return acc;
      }, {});

      const coursesSnap = await getDocs(collection(db, 'courses'));
      const courses = coursesSnap.docs.reduce((acc: any, doc) => {
        acc[doc.id] = doc.data();
        return acc;
      }, {});

      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text("UNOFFICIAL TRANSCRIPT", 105, 20, { align: 'center' });
      
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 25, 196, 25);

      // Student Info
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Student Information", 14, 35);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Name: ${selectedStudent.displayName}`, 14, 42);
      doc.text(`Student ID: ${selectedStudent.nationalId}`, 14, 47);
      doc.text(`Program: ${selectedStudent.program || 'N/A'}`, 14, 52);
      doc.text(`Department: ${selectedStudent.department || 'N/A'}`, 14, 57);
      doc.text(`Status: ${selectedStudent.status || 'Active'}`, 14, 62);
      doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, 67);

      // GPA Summary
      const academicHistory = selectedStudent.academicHistory || [];
      const latestGpa = academicHistory.length > 0 ? academicHistory[academicHistory.length - 1].gpa : 'N/A';
      
      doc.setFont("helvetica", "bold");
      doc.text("Academic Summary", 140, 35);
      doc.setFont("helvetica", "normal");
      doc.text(`Cumulative GPA: ${latestGpa}`, 140, 42);
      doc.text(`Total Semesters: ${academicHistory.length}`, 140, 47);

      // Course Details Table
      const tableData = enrollments.map((e: any) => {
        const offering = offerings[e.offeringId];
        const course = offering ? courses[offering.courseId] : null;
        return [
          course?.code || 'N/A',
          course?.title || 'N/A',
          offering?.termId?.replace('term_', '').replace('_', ' ') || 'N/A',
          e.grade || 'Pending',
          course?.credits || '3',
          e.gpaPoints?.toFixed(2) || '0.00'
        ];
      });

      (doc as any).autoTable({
        head: [['Code', 'Course Title', 'Term', 'Grade', 'Credits', 'Points']],
        body: tableData,
        startY: 75,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 9, cellPadding: 3 }
      });

      // GPA Trend Table
      if (academicHistory.length > 0) {
        const trendData = academicHistory.map((h: any) => [h.semester, h.gpa.toFixed(2)]);
        (doc as any).autoTable({
          head: [['Semester', 'Semester GPA']],
          body: trendData,
          startY: (doc as any).lastAutoTable.finalY + 15,
          margin: { left: 140 },
          tableWidth: 56,
          theme: 'plain',
          headStyles: { fontStyle: 'bold', textColor: [30, 41, 59] },
          styles: { fontSize: 9 }
        });
      }

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${pageCount} - This is an unofficial document and not for official use.`, 105, 285, { align: 'center' });
      }

      doc.save(`Transcript_${selectedStudent.displayName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'enrollments');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Student Records', 14, 15);
    
    const tableData = filteredStudents.map(s => [
      s.displayName,
      s.nationalId,
      s.email,
      s.department || 'N/A',
      s.status || 'active'
    ]);

    (doc as any).autoTable({
      head: [['Name', 'National ID', 'Email', 'Department', 'Status']],
      body: tableData,
      startY: 20,
    });

    doc.save('student-records.pdf');
    setIsExportMenuOpen(false);
  };

  const handleExportExcel = () => {
    const data = filteredStudents.map(s => ({
      Name: s.displayName,
      'National ID': s.nationalId,
      Email: s.email,
      Department: s.department,
      Program: s.program,
      Gender: s.gender,
      Status: s.status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'student-records.xlsx');
    setIsExportMenuOpen(false);
  };

  const handleDeleteStudent = (id: string) => {
    setStudentToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    setSubmitting(true);
    try {
      await deleteDoc(doc(db, 'students', studentToDelete));
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'students');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickSetDueDate = async (date: string) => {
    if (!selectedStudent) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'students', selectedStudent.id), {
        dueDate: date,
        updatedAt: serverTimestamp()
      });
      setIsDueDateModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'students');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter(s => {
    // If we have a search term, we've already filtered by displayName in Firestore
    // But we still want to filter by other criteria on the client side
    const matchesDepartment = selectedDepartment === 'all' || s.department === selectedDepartment;
    const matchesStatus = statusFilter === 'all' || (s.status || 'active') === statusFilter;
    const matchesGender = genderFilter === 'all' || s.gender === genderFilter;
    
    let matchesDueDate = true;
    if (dueDateFilter === 'has_due') matchesDueDate = !!s.dueDate;
    else if (dueDateFilter === 'overdue') matchesDueDate = !!s.dueDate && new Date(s.dueDate) < new Date();
    else if (dueDateFilter === 'none') matchesDueDate = !s.dueDate;
    
    return matchesDepartment && matchesStatus && matchesGender && matchesDueDate;
  });

  const departments = [
    'Computer Engineering',
    'Civil Engineering',
    'General Medicine',
    'Software Engineering',
    'Artificial Intelligence',
    'Structural Engineering'
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('students')}</h1>
          <p className="text-slate-500 mt-1">Manage and view student records</p>
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
                  <button 
                    onClick={() => window.print()}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    <Printer className="w-4 h-4 text-blue-500" />
                    Print List
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200"
          >
            <UserPlus className="w-5 h-5" />
            <span>{t('add')}</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Students</p>
            <p className="text-xl font-bold text-slate-900">{students.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active</p>
            <p className="text-xl font-bold text-slate-900">{students.filter(s => (s.status || 'active') === 'active').length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suspended</p>
            <p className="text-xl font-bold text-slate-900">{students.filter(s => s.status === 'suspended').length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Graduated</p>
            <p className="text-xl font-bold text-slate-900">{students.filter(s => s.status === 'graduated').length}</p>
          </div>
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
          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200/50">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
                viewMode === 'grid' 
                  ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Grid</span>
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
                viewMode === 'table' 
                  ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              <List className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Table</span>
            </button>
          </div>

          <div className="h-8 w-px bg-slate-100 mx-1 hidden sm:block" />

          <select 
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-600 font-medium text-sm"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-600 font-medium text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="graduated">Graduated</option>
          </select>

          <select 
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-600 font-medium text-sm"
          >
            <option value="all">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>

          <select 
            value={dueDateFilter}
            onChange={(e) => setDueDateFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-600 font-medium text-sm"
          >
            <option value="all">All Deadlines</option>
            <option value="has_due">Has Due Date</option>
            <option value="overdue">Overdue</option>
            <option value="none">No Due Date</option>
          </select>

          {(searchTerm || selectedDepartment !== 'all' || statusFilter !== 'all' || genderFilter !== 'all' || dueDateFilter !== 'all') && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedDepartment('all');
                setStatusFilter('all');
                setGenderFilter('all');
                setDueDateFilter('all');
              }}
              className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Clear Filters"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Students List */}
      <AnimatePresence mode="wait">
        {loading && students.length === 0 ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 space-y-4"
          >
            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-slate-500 font-medium animate-pulse">Loading students...</p>
          </motion.div>
        ) : filteredStudents.length === 0 ? (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl border border-slate-100 p-12 text-center"
          >
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No students found</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">
              Try adjusting your search or filters to find what you're looking for.
            </p>
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedDepartment('all');
                setStatusFilter('all');
                setGenderFilter('all');
              }}
              className="mt-6 text-blue-600 font-bold hover:underline"
            >
              Clear all filters
            </button>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {filteredStudents.map((student) => (
              <motion.div 
                key={student.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => {
                  setSelectedStudent(student);
                  setIsDetailsModalOpen(true);
                }}
                className="group bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-100 transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-slate-400 group-hover:from-blue-50 group-hover:to-blue-100 group-hover:text-blue-500 transition-all overflow-hidden">
                      {student.photoURL ? (
                        <img src={student.photoURL} alt={student.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Users className="w-7 h-7" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{student.displayName}</h3>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-0.5">{student.nationalId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      (student.status || 'active') === 'active' ? "bg-emerald-50 text-emerald-600" :
                      student.status === 'suspended' ? "bg-amber-50 text-amber-600" :
                      student.status === 'graduated' ? "bg-blue-50 text-blue-600" :
                      "bg-slate-50 text-slate-600"
                    )}>
                      {student.status || 'active'}
                    </span>
                    <div className="relative group/menu">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 hidden group-hover/menu:block z-10">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudent(student);
                            setNewStudent({
                              displayName: student.displayName || '',
                              nationalId: student.nationalId || '',
                              email: student.email || '',
                              gender: student.gender || 'male',
                              status: student.status || 'active',
                              program: student.program || 'Computer Science',
                              department: student.department || 'Computer Engineering',
                              dueDate: student.dueDate || ''
                            });
                            setIsEditModalOpen(true);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 font-medium"
                        >
                          Edit Student
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudent(student);
                            setNewStudent({
                              displayName: student.displayName || '',
                              nationalId: student.nationalId || '',
                              email: student.email || '',
                              gender: student.gender || 'male',
                              status: student.status || 'active',
                              program: student.program || 'Computer Science',
                              department: student.department || 'Computer Engineering',
                              dueDate: student.dueDate || ''
                            });
                            setIsDueDateModalOpen(true);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 font-medium"
                        >
                          Set Due Date
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStudent(student.id);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                        >
                          Delete Record
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{student.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{student.department || 'No Department'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{student.program || 'No Program'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                    {(() => {
                      const latestGpa = student.academicHistory?.length > 0 
                        ? student.academicHistory[student.academicHistory.length - 1].gpa 
                        : 0;
                      const standing = calculateAcademicStanding(latestGpa);
                      return (
                        <span className={cn(
                          "font-bold",
                          standing === "Dean's List" ? "text-emerald-600" :
                          standing === "Good Standing" ? "text-blue-600" :
                          standing === "Academic Probation" ? "text-amber-600" :
                          "text-red-600"
                        )}>
                          {standing}
                        </span>
                      );
                    })()}
                  </div>
                  {student.dueDate && (
                    <div className="flex items-center gap-3 text-sm text-amber-600 font-medium">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>Due: {student.dueDate}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      student.gender === 'male' ? "bg-blue-400" : "bg-pink-400"
                    )} />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{student.gender}</span>
                  </div>
                  <button className="text-blue-600 text-sm font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                    View Profile
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">National ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Program</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Standing</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredStudents.map((student) => (
                    <tr 
                      key={student.id} 
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                      onClick={() => {
                        setSelectedStudent(student);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                            {student.photoURL ? (
                              <img src={student.photoURL} alt={student.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Users className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{student.displayName}</p>
                            <p className="text-xs text-slate-500">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">{student.nationalId}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{student.department}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{student.program}</td>
                      <td className="px-6 py-4">
                        {(() => {
                          const latestGpa = student.academicHistory?.length > 0 
                            ? student.academicHistory[student.academicHistory.length - 1].gpa 
                            : 0;
                          const standing = calculateAcademicStanding(latestGpa);
                          return (
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              standing === "Dean's List" ? "bg-emerald-50 text-emerald-600" :
                              standing === "Good Standing" ? "bg-blue-50 text-blue-600" :
                              standing === "Academic Probation" ? "bg-amber-50 text-amber-600" :
                              "bg-red-50 text-red-600"
                            )}>
                              {standing}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-amber-600 font-medium">{student.dueDate || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          (student.status || 'active') === 'active' ? "bg-emerald-50 text-emerald-600" :
                          student.status === 'suspended' ? "bg-amber-50 text-amber-600" :
                          student.status === 'graduated' ? "bg-blue-50 text-blue-600" :
                          "bg-slate-50 text-slate-600"
                        )}>
                          {student.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="relative group/menu">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 hidden group-hover/menu:block z-10">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedStudent(student);
                                  setNewStudent({
                                    displayName: student.displayName || '',
                                    nationalId: student.nationalId || '',
                                    email: student.email || '',
                                    gender: student.gender || 'male',
                                    status: student.status || 'active',
                                    program: student.program || 'Computer Science',
                                    department: student.department || 'Computer Engineering',
                                    dueDate: student.dueDate || ''
                                  });
                                  setIsEditModalOpen(true);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 font-medium"
                              >
                                Edit Student
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedStudent(student);
                                  setNewStudent({
                                    displayName: student.displayName || '',
                                    nationalId: student.nationalId || '',
                                    email: student.email || '',
                                    gender: student.gender || 'male',
                                    status: student.status || 'active',
                                    program: student.program || 'Computer Science',
                                    department: student.department || 'Computer Engineering',
                                    dueDate: student.dueDate || ''
                                  });
                                  setIsDueDateModalOpen(true);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 font-medium"
                              >
                                Set Due Date
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteStudent(student.id);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                              >
                                Delete Record
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hasMore && (
        <div className="flex justify-center pt-8">
          <button 
            onClick={loadMore}
            className="px-8 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            Load More Students
          </button>
        </div>
      )}

      {/* Add/Edit Student Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedStudent(null);
        }}
        title={isAddModalOpen ? "Add New Student" : "Edit Student Record"}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button 
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
              }}
              className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={isAddModalOpen ? handleAddStudent : handleUpdateStudent}
              disabled={submitting || !newStudent.displayName || !newStudent.nationalId}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-200"
            >
              {submitting && <Clock className="w-4 h-4 animate-spin" />}
              {isAddModalOpen ? "Register Student" : "Save Changes"}
            </button>
          </div>
        }
      >
        <div className="space-y-6 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
              <input 
                type="text"
                value={newStudent.displayName}
                onChange={(e) => setNewStudent({...newStudent, displayName: e.target.value})}
                disabled={isEditModalOpen && !canEditSensitiveData}
                placeholder="e.g., Ahmed Ali"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">National ID</label>
              <input 
                type="text"
                value={newStudent.nationalId}
                onChange={(e) => setNewStudent({...newStudent, nationalId: e.target.value})}
                disabled={isEditModalOpen && !canEditSensitiveData}
                placeholder="e.g., 123456789"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
            <input 
              type="email"
              value={newStudent.email}
              onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
              placeholder="e.g., ahmed@university.edu"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Department</label>
              <select 
                value={newStudent.department}
                onChange={(e) => setNewStudent({...newStudent, department: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Program</label>
              <input 
                type="text"
                value={newStudent.program}
                onChange={(e) => setNewStudent({...newStudent, program: e.target.value})}
                placeholder="e.g., B.Sc. Computer Science"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Gender</label>
              <select 
                value={newStudent.gender}
                onChange={(e) => setNewStudent({...newStudent, gender: e.target.value as any})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Status</label>
              <select 
                value={newStudent.status}
                onChange={(e) => setNewStudent({...newStudent, status: e.target.value as any})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="graduated">Graduated</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Due Date</label>
              <input 
                type="date"
                value={newStudent.dueDate}
                onChange={(e) => setNewStudent({...newStudent, dueDate: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Student Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedStudent(null);
        }}
        title="Student Profile"
        footer={
          <div className="flex items-center justify-between w-full">
            <button 
              onClick={() => {
                handleDeleteStudent(selectedStudent.id);
                setIsDetailsModalOpen(false);
              }}
              className="flex items-center gap-2 text-red-600 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
            >
              <UserX className="w-5 h-5" />
              Delete Record
            </button>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  setNewStudent({
                    displayName: selectedStudent.displayName || '',
                    nationalId: selectedStudent.nationalId || '',
                    email: selectedStudent.email || '',
                    gender: selectedStudent.gender || 'male',
                    status: selectedStudent.status || 'active',
                    program: selectedStudent.program || 'Computer Science',
                    department: selectedStudent.department || 'Computer Engineering',
                    dueDate: selectedStudent.dueDate || ''
                  });
                  setIsDetailsModalOpen(false);
                  setIsEditModalOpen(true);
                }}
                className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                Edit Profile
              </button>
            </div>
          </div>
        }
      >
        {selectedStudent && (
          <div className="space-y-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 text-3xl font-bold border-2 border-blue-100 mb-4 overflow-hidden shadow-inner">
                {selectedStudent.photoURL ? (
                  <img src={selectedStudent.photoURL} alt={selectedStudent.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  selectedStudent.displayName?.charAt(0)
                )}
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{selectedStudent.displayName}</h2>
              <p className="text-slate-500 font-medium">{selectedStudent.email}</p>
              <div className="mt-4 flex items-center gap-2">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  (selectedStudent.status || 'active') === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                )}>
                  {selectedStudent.status || 'active'}
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  ID: {selectedStudent.nationalId}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Academic Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Building2 className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</p>
                      <p className="font-medium">{selectedStudent.department || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <GraduationCap className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Program</p>
                      <p className="font-medium">{selectedStudent.program || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <ShieldCheck className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Standing</p>
                      {(() => {
                        const latestGpa = selectedStudent.academicHistory?.length > 0 
                          ? selectedStudent.academicHistory[selectedStudent.academicHistory.length - 1].gpa 
                          : 0;
                        const standing = calculateAcademicStanding(latestGpa);
                        return (
                          <p className={cn(
                            "font-bold",
                            standing === "Dean's List" ? "text-emerald-600" :
                            standing === "Good Standing" ? "text-blue-600" :
                            standing === "Academic Probation" ? "text-amber-600" :
                            "text-red-600"
                          )}>{standing}</p>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Personal Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Users className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender</p>
                      <p className="font-medium capitalize">{selectedStudent.gender || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enrollment Date</p>
                      <p className="font-medium">{selectedStudent.createdAt?.toDate ? selectedStudent.createdAt.toDate().toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due Date</p>
                      <div className="flex items-center justify-between">
                        <p className={cn(
                          "font-medium",
                          selectedStudent.dueDate && new Date(selectedStudent.dueDate) < new Date() ? "text-red-500" : "text-slate-900"
                        )}>
                          {selectedStudent.dueDate || 'N/A'}
                        </p>
                        <button 
                          onClick={() => {
                            setNewStudent({
                              ...newStudent,
                              dueDate: selectedStudent.dueDate || ''
                            });
                            setIsDueDateModalOpen(true);
                          }}
                          className="text-[10px] font-bold text-blue-600 uppercase tracking-wider hover:underline"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">GPA Trend</h3>
                  <p className="text-xs text-slate-500">Academic performance over semesters</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-xs font-bold text-slate-600">GPA</span>
                </div>
              </div>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={selectedStudent.academicHistory || [
                      { semester: 'S1', gpa: 3.2 },
                      { semester: 'S2', gpa: 3.5 },
                      { semester: 'S3', gpa: 3.4 },
                      { semester: 'S4', gpa: 3.8 },
                      { semester: 'S5', gpa: 3.7 },
                      { semester: 'S6', gpa: 3.9 },
                    ]}
                    margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="semester" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                      dy={10}
                    />
                    <YAxis 
                      domain={[0, 4]} 
                      ticks={[0, 1, 2, 3, 4]}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                      formatter={(value: number) => [`${value.toFixed(2)} GPA`, 'GPA']}
                      labelFormatter={(label) => `Semester: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="gpa" 
                      stroke="#2563eb" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm">
                  <ExternalLink className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Full Academic Record</p>
                  <p className="text-xs text-slate-500">View grades, attendance, and finances</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleDownloadTranscript}
                  className="bg-white text-blue-600 px-4 py-2 rounded-xl text-sm font-bold border border-blue-100 hover:bg-blue-50 transition-all flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  Transcript
                </button>
                <button 
                  onClick={() => navigate(`/profile/${selectedStudent.id}`)}
                  className="bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  Open Profile
                </button>
              </div>
            </div>
            {profile?.role === 'dept_admin' && (
              <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                Contact Student
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* Due Date Modal */}
      <Modal
        isOpen={isDueDateModalOpen}
        onClose={() => setIsDueDateModalOpen(false)}
        title="Set Due Date"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button 
              onClick={() => setIsDueDateModalOpen(false)}
              className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={() => handleQuickSetDueDate(newStudent.dueDate)}
              disabled={submitting}
              className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-200"
            >
              {submitting ? "Saving..." : "Update Due Date"}
            </button>
          </div>
        }
      >
        <div className="py-4 space-y-4">
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Set deadline for {selectedStudent?.displayName}</p>
              <p className="text-xs text-slate-500">This date will be used for tracking requirements or payments.</p>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Select Date</label>
            <input 
              type="date"
              value={newStudent.dueDate}
              onChange={(e) => setNewStudent({...newStudent, dueDate: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
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
          <div className="flex items-center justify-end gap-3">
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={confirmDelete}
              disabled={submitting}
              className="bg-red-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-red-200"
            >
              {submitting ? "Deleting..." : "Delete Permanently"}
            </button>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Are you absolutely sure?</h3>
          <p className="text-slate-500 mt-2 max-w-xs">
            This action cannot be undone. This will permanently delete the student record and all associated data.
          </p>
        </div>
      </Modal>
    </div>
  );
}
