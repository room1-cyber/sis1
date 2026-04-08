import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { 
  UserPlus, 
  Search, 
  Filter, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  FileText,
  Download,
  Award,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  X,
  Save,
  ShieldCheck,
  UserCheck,
  FileSearch,
  ClipboardList,
  Printer,
  TrendingUp,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

import Modal from '../components/Modal';

export default function Admissions() {
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'applications' | 'exams' | 'verification' | 'stats'>('applications');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [note, setNote] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [newApp, setNewApp] = useState({
    name: '',
    program: '',
    email: '',
    phone: '',
    highSchoolScore: '',
    gender: 'male',
    nationalId: '',
    admissionType: 'freshman',
    previousSchool: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'applications'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setApplications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'applications'));
    return () => unsubscribe();
  }, []);

  const handleAddApp = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'applications'), {
        ...newApp,
        highSchoolScore: parseFloat(newApp.highSchoolScore),
        status: 'pending',
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        verificationStatus: {
          transcript: 'pending',
          nationalId: 'pending',
          healthCertificate: 'pending',
          photo: 'pending'
        },
        examScore: null,
        interviewScore: null,
        notes: []
      });
      setIsAddModalOpen(false);
      setNewApp({ 
        name: '', 
        program: '', 
        email: '', 
        phone: '', 
        highSchoolScore: '',
        gender: 'male',
        nationalId: '',
        admissionType: 'freshman',
        previousSchool: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'applications');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (status: 'approved' | 'rejected' | 'under_review' | 'exam_scheduled' | 'interview_scheduled') => {
    if (!selectedApp) return;
    setLoading(true);
    try {
      const appRef = doc(db, 'applications', selectedApp.id);
      const updateData: any = {
        status,
        reviewedAt: serverTimestamp(),
        reviewedBy: profile?.uid
      };

      if (status === 'interview_scheduled') {
        updateData.interviewDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Default to 1 week later
      }

      await updateDoc(appRef, updateData);

      if (status === 'approved') {
        // Create Student Record
        const studentRef = await addDoc(collection(db, 'students'), {
          displayName: selectedApp.name,
          email: selectedApp.email,
          phone: selectedApp.phone,
          nationalId: selectedApp.nationalId || '',
          gender: selectedApp.gender || 'male',
          program: selectedApp.program,
          department: 'General', // Default, should be mapped from program
          status: 'active',
          admissionDate: new Date().toISOString(),
          createdAt: serverTimestamp(),
          applicationId: selectedApp.id,
          gpa: 0,
          credits: 0,
          level: 1,
          semester: 1
        });

        // Create User Account
        await addDoc(collection(db, 'users'), {
          uid: studentRef.id, // Using student doc ID as UID for simplicity in this demo
          displayName: selectedApp.name,
          email: selectedApp.email,
          role: 'student',
          status: 'active',
          createdAt: serverTimestamp(),
          studentId: studentRef.id
        });
      }

      setIsReviewModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `applications/${selectedApp.id}`);
    } finally {
      setLoading(false);
    }
  };

  const updateVerification = async (appId: string, docType: string, status: string) => {
    try {
      const app = applications.find(a => a.id === appId);
      const newVerification = { ...app.verificationStatus, [docType]: status };
      await updateDoc(doc(db, 'applications', appId), {
        verificationStatus: newVerification,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `applications/${appId}`);
    }
  };

  const saveNote = async () => {
    if (!selectedApp || !note.trim()) return;
    setLoading(true);
    try {
      const appRef = doc(db, 'applications', selectedApp.id);
      const newNotes = [...(selectedApp.notes || []), {
        text: note,
        author: profile?.displayName || 'Staff',
        date: new Date().toISOString()
      }];
      await updateDoc(appRef, { notes: newNotes });
      setNote('');
      setSelectedApp({ ...selectedApp, notes: newNotes });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `applications/${selectedApp.id}`);
    } finally {
      setLoading(false);
    }
  };

  const simulateEmail = async (type: string) => {
    setSendingEmail(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSendingEmail(false);
    alert(`Notification email (${type}) sent to ${selectedApp?.email}`);
  };

  const exportApplications = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Name,Email,Phone,Program,Score,Status,Date\n" + 
      applications.map(app => `${app.name},${app.email},${app.phone},${app.program},${app.highSchoolScore},${app.status},${app.date}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "applications_export.csv");
    document.body.appendChild(link);
    link.click();
  };

  const filteredApps = applications.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         app.program.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: applications.length,
    approved: applications.filter(a => a.status === 'approved').length,
    pending: applications.filter(a => a.status === 'pending').length,
    rate: applications.length > 0 ? Math.round((applications.filter(a => a.status === 'approved').length / applications.length) * 100) : 0
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-slate-400 mb-2">
        <Link to="/registrar" className="hover:text-blue-600 transition-colors">{t('registrar')}</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-medium">{t('admissions')}</span>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('admissions')}</h1>
          <p className="text-slate-500 mt-1">Manage new student applications, entrance exams, and document verification</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all print-btn"
          >
            <Printer className="w-5 h-5" />
            <span>Print Summary</span>
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            <span>New Application</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-600 rounded-xl text-white">
              <ClipboardList className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Apps</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
            <p className="text-slate-400 text-sm mt-1">Current cycle</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-600 rounded-xl text-white">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approved</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{stats.approved}</h3>
            <p className="text-emerald-600 text-sm font-bold mt-1 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> {stats.rate}% Acceptance rate
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-600 rounded-xl text-white">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{stats.pending}</h3>
            <p className="text-slate-400 text-sm mt-1">Awaiting review</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-purple-600 rounded-xl text-white">
              <Award className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scholarships</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">45</h3>
            <p className="text-slate-400 text-sm mt-1">Awarded this cycle</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-full max-w-lg">
        {[
          { id: 'applications', label: 'Applications', icon: ClipboardList },
          { id: 'exams', label: 'Entrance Exams', icon: BookOpen },
          { id: 'verification', label: 'Verification', icon: ShieldCheck },
          { id: 'stats', label: 'Analytics', icon: TrendingUp },
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all",
              activeTab === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'applications' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or program..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={exportApplications}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="exam_scheduled">Exam Scheduled</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <button className="p-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Program</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">HS Score</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{app.name}</span>
                        <span className="text-xs text-slate-400">ID: {app.id.toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{app.program}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-bold",
                          app.highSchoolScore >= 80 ? "text-emerald-600" : app.highSchoolScore >= 70 ? "text-amber-600" : "text-red-600"
                        )}>{app.highSchoolScore}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                        app.status === 'approved' ? "bg-emerald-50 text-emerald-600" : 
                        app.status === 'pending' ? "bg-amber-50 text-amber-600" : 
                        app.status === 'under_review' ? "bg-blue-50 text-blue-600" :
                        app.status === 'exam_scheduled' ? "bg-purple-50 text-purple-600" : "bg-red-50 text-red-600"
                      )}>
                        {app.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(app.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setSelectedApp(app);
                          setIsReviewModalOpen(true);
                        }}
                        className="text-blue-600 hover:underline text-sm font-bold"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'exams' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg mb-4">Entrance Exam Schedule</h3>
              <div className="space-y-4">
                {[
                  { title: 'Computer Science Aptitude', date: 'April 15, 2026', time: '10:00 AM', room: 'Lab 101', candidates: 45 },
                  { title: 'Medical Sciences Entrance', date: 'April 16, 2026', time: '09:00 AM', room: 'Auditorium A', candidates: 120 },
                  { title: 'Engineering Mathematics', date: 'April 17, 2026', time: '11:00 AM', room: 'Hall B', candidates: 85 },
                ].map((exam, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-lg text-blue-600 shadow-sm">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{exam.title}</p>
                        <p className="text-xs text-slate-500">{exam.date} at {exam.time} • {exam.room}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">{exam.candidates} Candidates</p>
                      <button className="text-xs text-slate-400 hover:text-blue-600 font-bold mt-1">Manage List</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg mb-4">Recent Exam Results</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Candidate</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Exam</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Score</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {applications.filter(a => a.examScore !== null).slice(0, 5).map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-bold text-slate-900">{app.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{app.program}</td>
                        <td className="px-4 py-3 text-sm font-bold text-blue-600">{app.examScore}%</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                            app.examScore >= 70 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                          )}>
                            {app.examScore >= 70 ? 'Passed' : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg shadow-blue-200">
              <h3 className="font-bold text-lg mb-2">Exam Management</h3>
              <p className="text-blue-100 text-sm mb-6 leading-relaxed">
                Schedule entrance exams, generate candidate lists, and record scores. Automatic notifications will be sent to candidates.
              </p>
              <button className="w-full py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                Schedule New Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'verification' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Document Verification Queue</h3>
                <p className="text-slate-500 text-sm mt-1">Verify original documents for pending applicants</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                  <AlertCircle className="w-3 h-3" />
                  {applications.filter(a => Object.values(a.verificationStatus || {}).some(v => v === 'pending')).length} Pending
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Transcript</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">National ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Health Cert</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {applications.filter(a => a.status !== 'approved' && a.status !== 'rejected').map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{app.name}</span>
                        <span className="text-xs text-slate-400">{app.program}</span>
                      </div>
                    </td>
                    {['transcript', 'nationalId', 'healthCertificate'].map((docType) => (
                      <td key={docType} className="px-6 py-4">
                        <button 
                          onClick={() => updateVerification(app.id, docType, app.verificationStatus?.[docType] === 'verified' ? 'pending' : 'verified')}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                            app.verificationStatus?.[docType] === 'verified' 
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                              : "bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100"
                          )}
                        >
                          {app.verificationStatus?.[docType] === 'verified' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {app.verificationStatus?.[docType] === 'verified' ? 'Verified' : 'Pending'}
                        </button>
                      </td>
                    ))}
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => {
                          setSelectedApp(app);
                          setIsReviewModalOpen(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

      {activeTab === 'stats' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg mb-6">Applications by Program</h3>
              <div className="space-y-4">
                {[
                  { label: 'Computer Science', count: applications.filter(a => a.program === 'Computer Science').length, color: 'bg-blue-600' },
                  { label: 'Medicine', count: applications.filter(a => a.program === 'Medicine').length, color: 'bg-emerald-600' },
                  { label: 'Engineering', count: applications.filter(a => a.program === 'Engineering').length, color: 'bg-amber-600' },
                  { label: 'Business Administration', count: applications.filter(a => a.program === 'Business Administration').length, color: 'bg-purple-600' },
                ].map((prog, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-slate-600">{prog.label}</span>
                      <span className="text-slate-900">{prog.count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.total > 0 ? (prog.count / stats.total) * 100 : 0}%` }}
                        className={cn("h-full rounded-full", prog.color)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg mb-6">Score Distribution</h3>
              <div className="flex items-end gap-2 h-48">
                {[20, 35, 65, 85, 45, 30].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${val}%` }}
                      className="w-full bg-blue-100 rounded-t-lg relative group"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {val}
                      </div>
                    </motion.div>
                    <span className="text-[10px] font-bold text-slate-400">{40 + i * 10}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg mb-6">Recent Activity</h3>
              <div className="space-y-6">
                {applications.slice(0, 5).map((app, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      app.status === 'approved' ? "bg-emerald-50 text-emerald-600" :
                      app.status === 'rejected' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {app.status === 'approved' ? <UserCheck className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">
                        {app.name}'s application {app.status.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {app.program} • {new Date(app.date).toLocaleString()}
                      </p>
                    </div>
                    <button className="text-xs font-bold text-blue-600 hover:underline">View</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg mb-6">Admission Funnel</h3>
              <div className="space-y-6">
                {[
                  { label: 'Total Applications', count: stats.total, color: 'bg-slate-900' },
                  { label: 'Under Review', count: applications.filter(a => a.status === 'under_review').length, color: 'bg-blue-600' },
                  { label: 'Exam Scheduled', count: applications.filter(a => a.status === 'exam_scheduled').length, color: 'bg-purple-600' },
                  { label: 'Approved', count: stats.approved, color: 'bg-emerald-600' },
                ].map((item, i) => (
                  <div key={i} className="relative">
                    <div className="flex justify-between text-sm font-bold mb-2">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="text-slate-900">{item.count}</span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.total > 0 ? (item.count / stats.total) * 100 : 0}%` }}
                        className={cn("h-full", item.color)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
        <div className="p-3 bg-blue-600 rounded-xl text-white">
          <FileSearch className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-blue-900 text-lg">Document Verification</h3>
          <p className="text-blue-700/80 mt-1 leading-relaxed">
            All applicants must provide original copies of their high school transcripts and national ID for verification. 
            The system will cross-reference these with the Ministry of Higher Education database.
          </p>
        </div>
      </div>

      {/* New Application Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="New Student Application"
        footer={
          <>
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleAddApp}
              disabled={loading || !newApp.name || !newApp.program}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Submit Application
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
            <input 
              type="text"
              value={newApp.name}
              onChange={(e) => setNewApp({...newApp, name: e.target.value})}
              placeholder="Enter applicant's full name"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Desired Program</label>
            <select 
              value={newApp.program}
              onChange={(e) => setNewApp({...newApp, program: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="">Select a program</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Medicine">Medicine</option>
              <option value="Engineering">Engineering</option>
              <option value="Business Administration">Business Administration</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label>
              <input 
                type="email"
                value={newApp.email}
                onChange={(e) => setNewApp({...newApp, email: e.target.value})}
                placeholder="email@example.com"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</label>
              <input 
                type="tel"
                value={newApp.phone}
                onChange={(e) => setNewApp({...newApp, phone: e.target.value})}
                placeholder="+218..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">National ID</label>
              <input 
                type="text"
                value={newApp.nationalId}
                onChange={(e) => setNewApp({...newApp, nationalId: e.target.value})}
                placeholder="National ID Number"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gender</label>
              <select 
                value={newApp.gender}
                onChange={(e) => setNewApp({...newApp, gender: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">High School Score (%)</label>
              <input 
                type="number"
                value={newApp.highSchoolScore}
                onChange={(e) => setNewApp({...newApp, highSchoolScore: e.target.value})}
                placeholder="e.g. 95"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admission Type</label>
              <select 
                value={newApp.admissionType}
                onChange={(e) => setNewApp({...newApp, admissionType: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="freshman">Freshman</option>
                <option value="transfer">Transfer</option>
                <option value="postgraduate">Postgraduate</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Previous School / University</label>
            <input 
              type="text"
              value={newApp.previousSchool}
              onChange={(e) => setNewApp({...newApp, previousSchool: e.target.value})}
              placeholder="Name of institution"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
        </div>
      </Modal>

      {/* Review Application Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Review Application"
        footer={
          <div className="flex items-center justify-between w-full">
            <button 
              onClick={() => setIsReviewModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Close
            </button>
            <div className="flex gap-3">
              <button 
                onClick={() => handleReview('rejected')}
                disabled={loading}
                className="px-6 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all"
              >
                Reject
              </button>
              <button 
                onClick={() => handleReview('under_review')}
                disabled={loading}
                className="px-6 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-all"
              >
                Under Review
              </button>
              <button 
                onClick={() => handleReview('exam_scheduled')}
                disabled={loading}
                className="px-6 py-2 bg-purple-50 text-purple-600 font-bold rounded-xl hover:bg-purple-100 transition-all"
              >
                Schedule Exam
              </button>
              <button 
                onClick={() => handleReview('approved')}
                disabled={loading}
                className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-all active:scale-95"
              >
                {loading && <Clock className="w-4 h-4 animate-spin" />}
                Approve & Create Student
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Progress Tracker */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Application Progress</h4>
              <span className="text-xs font-bold text-blue-600">
                {selectedApp?.status === 'approved' ? '100%' : selectedApp?.status === 'exam_scheduled' ? '60%' : selectedApp?.status === 'under_review' ? '40%' : '20%'}
              </span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: selectedApp?.status === 'approved' ? '100%' : selectedApp?.status === 'exam_scheduled' ? '60%' : selectedApp?.status === 'under_review' ? '40%' : '20%' }}
                className="h-full bg-blue-600 rounded-full"
              />
            </div>
            <div className="flex justify-between mt-4">
              {['Applied', 'Review', 'Exam', 'Approved'].map((step, i) => (
                <div key={step} className="flex flex-col items-center gap-1">
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2",
                    (i === 0 || (i === 1 && selectedApp?.status !== 'pending') || (i === 2 && ['exam_scheduled', 'approved'].includes(selectedApp?.status)) || (i === 3 && selectedApp?.status === 'approved'))
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white border-slate-300"
                  )} />
                  <span className="text-[10px] font-bold text-slate-400">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold">
              {selectedApp?.name?.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{selectedApp?.name}</h3>
              <p className="text-slate-500 font-medium">{selectedApp?.program}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <span className="text-slate-400">Full Name</span>
                  <span className="font-bold text-slate-900">{selectedApp?.name}</span>
                  <span className="text-slate-400">Email</span>
                  <span className="font-bold text-slate-900">{selectedApp?.email}</span>
                  <span className="text-slate-400">Phone</span>
                  <span className="font-bold text-slate-900">{selectedApp?.phone}</span>
                  <span className="text-slate-400">National ID</span>
                  <span className="font-bold text-slate-900">{selectedApp?.nationalId || 'N/A'}</span>
                  <span className="text-slate-400">Gender</span>
                  <span className="font-bold text-slate-900 capitalize">{selectedApp?.gender || 'N/A'}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-600" />
                  Academic Background
                </h4>
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <span className="text-slate-400">Program</span>
                  <span className="font-bold text-slate-900">{selectedApp?.program}</span>
                  <span className="text-slate-400">HS Score</span>
                  <span className="font-bold text-emerald-600">{selectedApp?.highSchoolScore}%</span>
                  <span className="text-slate-400">Admission Type</span>
                  <span className="font-bold text-slate-900 capitalize">{selectedApp?.admissionType || 'Freshman'}</span>
                  <span className="text-slate-400">Prev. Institution</span>
                  <span className="font-bold text-slate-900">{selectedApp?.previousSchool || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Verification Status
                </h4>
                <div className="space-y-3">
                  {Object.entries(selectedApp?.verificationStatus || {}).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                      <span className="text-sm font-medium text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                        val === 'verified' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {val as string}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-600" />
                  Internal Notes
                </h4>
                <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
                  {selectedApp?.notes?.map((n: any, i: number) => (
                    <div key={i} className="p-3 bg-white rounded-xl border border-slate-100 text-xs">
                      <p className="text-slate-600 mb-1">{n.text}</p>
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>{n.author}</span>
                        <span>{new Date(n.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note about this applicant..."
                    className="flex-1 h-20 p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                  />
                  <button 
                    onClick={saveNote}
                    disabled={loading || !note.trim()}
                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all self-end disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Communications
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => simulateEmail('Application Received')}
                    disabled={sendingEmail}
                    className="flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    {sendingEmail ? <Clock className="w-3 h-3 animate-spin" /> : <ClipboardList className="w-3 h-3" />}
                    Confirm Receipt
                  </button>
                  <button 
                    onClick={() => simulateEmail('Exam Invitation')}
                    disabled={sendingEmail}
                    className="flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    {sendingEmail ? <Clock className="w-3 h-3 animate-spin" /> : <BookOpen className="w-3 h-3" />}
                    Invite to Exam
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
