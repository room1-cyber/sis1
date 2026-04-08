import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, where, getCountFromServer, addDoc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { seedTrialData } from '../lib/seedData';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Plus, 
  UserPlus, 
  Key, 
  Activity, 
  Settings,
  Users,
  Lock,
  Eye,
  Edit2,
  Trash2,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Database,
  Globe,
  Bell,
  Save,
  Shield,
  Clock,
  Mail,
  User,
  Building2,
  Folder,
  Calendar,
  BarChart3,
  LayoutGrid,
  FileText,
  PlusCircle,
  List,
  CreditCard,
  Phone,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Modal from '../components/Modal';
import { SystemSettings } from '../types';

import { ROLE_PERMISSIONS } from '../constants/permissions';

export default function Admin() {
  const navigate = useNavigate();
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();

  if (!profile || !['super_admin', 'it_support', 'registrar'].includes(profile.role)) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Lock className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
          <p className="text-slate-500 mt-2">You do not have permission to access the administration panel.</p>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'users' | 'instructors' | 'roles' | 'org' | 'calendar' | 'reports' | 'fields' | 'logs' | 'settings' | 'notifications'>('users');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'thumbnails'>('grid');
  const [orgType, setOrgType] = useState<'faculty' | 'department'>('faculty');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [instructorSearch, setInstructorSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    institutionName: 'University of Libya',
    websiteUrl: 'https://university.edu.ly',
    currentAcademicYear: '2024/2025',
    activeSemester: 'Fall Semester',
    availableTerms: ['Fall 2024', 'Spring 2025', 'Summer 2025'],
    gradeScale: 'Percentage (0-100)',
    maintenanceMode: false,
    multilingualSupport: true,
    autoBackup: true,
    emailNotifications: true,
    smsAlerts: false
  });

  const [testNotif, setTestNotif] = useState({
    userId: '',
    title: '',
    message: '',
    type: 'system' as 'exam' | 'deadline' | 'finance' | 'system',
    link: ''
  });

  useEffect(() => {
    const fetchTotalUsers = async () => {
      const snapshot = await getCountFromServer(collection(db, 'users'));
      setTotalUsers(snapshot.data().count);
    };
    fetchTotalUsers();

    const unsubFaculties = onSnapshot(collection(db, 'faculties'), (snap) => {
      setFaculties(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubDepartments = onSnapshot(collection(db, 'departments'), (snap) => {
      setDepartments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'system'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SystemSettings);
      }
    });

    return () => {
      unsubFaculties();
      unsubDepartments();
      unsubSettings();
    };
  }, []);

  const [newOrg, setNewOrg] = useState({
    name: '',
    code: '',
    parent: '' // Faculty ID for departments
  });

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'Lecturer',
    department: '',
    specialization: '',
    phone: ''
  });

  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'instructors') {
      const q = query(collection(db, 'users'));
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const userData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setUsers(userData);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'users');
        }
      );
      return () => unsubscribe();
    } else if (activeTab === 'org') {
      const qFaculties = query(collection(db, 'faculties'));
      const unsubscribeFaculties = onSnapshot(qFaculties, 
        (snapshot) => {
          const facultyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setFaculties(facultyData);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'faculties');
        }
      );

      const qDepartments = query(collection(db, 'departments'));
      const unsubscribeDepartments = onSnapshot(qDepartments, 
        (snapshot) => {
          const deptData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setDepartments(deptData);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'departments');
        }
      );

      return () => {
        unsubscribeFaculties();
        unsubscribeDepartments();
      };
    }
  }, [activeTab]);

  const roles = Object.entries(ROLE_PERMISSIONS).map(([role, perms], index) => ({
    id: `r${index + 1}`,
    name: role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    users: users.filter(u => u.role === role).length,
    permissions: perms
  }));

  const handleSendNotification = async () => {
    if (!testNotif.userId || !testNotif.title || !testNotif.message) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: testNotif.userId,
        title: testNotif.title,
        message: testNotif.message,
        type: testNotif.type,
        link: testNotif.link || '',
        read: false,
        createdAt: serverTimestamp()
      });
      setIsNotifModalOpen(false);
      setTestNotif({ userId: '', title: '', message: '', type: 'system', link: '' });
      alert('Notification sent successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'system'), {
        ...settings,
        updatedAt: serverTimestamp()
      });
      alert('Settings saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings');
    } finally {
      setLoading(false);
    }
  };

  const logs = [
    { id: 'l1', user: 'Ahmed Ali', action: 'Modified Grade', target: 'CS101 - Student #202401', time: '10:45 AM', severity: 'medium' },
    { id: 'l2', user: 'Sarah Mansour', action: 'Issued Transcript', target: 'Student #202405', time: '09:30 AM', severity: 'low' },
    { id: 'l3', user: 'System', action: 'Database Backup', target: 'Daily Backup', time: '03:00 AM', severity: 'low' },
  ];

  const academicCalendar = [
    { id: 'c1', event: 'Fall Semester Start', date: '2024-09-15', type: 'academic', status: 'upcoming' },
    { id: 'c2', event: 'Midterm Exams', date: '2024-11-10', type: 'exam', status: 'upcoming' },
    { id: 'c3', event: 'Independence Day', date: '2024-12-24', type: 'holiday', status: 'upcoming' },
    { id: 'c4', event: 'Fall Semester End', date: '2025-01-15', type: 'academic', status: 'upcoming' },
  ];

  const permissions = [
    'all_access', 'manage_users', 'system_config', 'manage_students', 
    'manage_grades', 'issue_transcripts', 'view_courses', 'mark_attendance', 
    'submit_grades', 'view_grades', 'register_courses', 'view_timetable'
  ];

  const [newRole, setNewRole] = useState({
    name: '',
    permissions: [] as string[]
  });

  const [newEvent, setNewEvent] = useState({
    event: '',
    date: '',
    type: 'academic' as 'academic' | 'exam' | 'holiday'
  });

  const [newField, setNewField] = useState({
    name: '',
    type: 'text',
    entity: 'student',
    required: false
  });

  const customFields = [
    { id: 'cf1', name: 'National ID', type: 'text', entity: 'student', required: true },
    { id: 'cf2', name: 'Emergency Contact', type: 'text', entity: 'student', required: false },
    { id: 'cf3', name: 'Office Hours', type: 'text', entity: 'lecturer', required: false },
  ];

  const handleInvite = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'users'), {
        displayName: newUser.name,
        email: newUser.email,
        role: newUser.role.toLowerCase(),
        department: newUser.department,
        specialization: newUser.specialization,
        phone: newUser.phone,
        status: 'active',
        createdAt: serverTimestamp()
      });
      setIsInviteModalOpen(false);
      setNewUser({ name: '', email: '', role: 'Lecturer', department: '', specialization: '', phone: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrg = async () => {
    setLoading(true);
    try {
      const coll = orgType === 'faculty' ? 'faculties' : 'departments';
      await addDoc(collection(db, coll), {
        name: newOrg.name,
        code: newOrg.code,
        ...(orgType === 'department' && { facultyId: newOrg.parent }),
        createdAt: serverTimestamp()
      });
      setIsOrgModalOpen(false);
      setNewOrg({ name: '', code: '', parent: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, orgType === 'faculty' ? 'faculties' : 'departments');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        role: selectedUser.role,
        status: selectedUser.status,
        department: selectedUser.department || '',
        specialization: selectedUser.specialization || '',
        phone: selectedUser.phone || '',
        updatedAt: serverTimestamp()
      });
      setIsEditModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('admin')}</h1>
          <p className="text-slate-500 mt-1">System administration, user management, and security logs</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={async () => {
              if (confirm('This will populate the database with sample data. Continue?')) {
                setLoading(true);
                try {
                  const res = await seedTrialData(profile?.uid);
                  alert(res.message);
                  window.location.reload();
                } catch (err) {
                  console.error(err);
                  alert('Failed to seed data');
                } finally {
                  setLoading(false);
                }
              }
            }}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-200 disabled:opacity-50"
          >
            <Database className="w-5 h-5" />
            <span>{loading ? 'Seeding...' : 'Seed Trial Data'}</span>
          </button>
          <button className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-slate-200">
            <Activity className="w-5 h-5" />
            <span>System Status</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-600 rounded-xl text-white">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Users</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{totalUsers.toLocaleString()}</h3>
            <p className="text-slate-400 text-sm mt-1">Active accounts</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-600 rounded-xl text-white">
              <Lock className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Security Alerts</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">0</h3>
            <p className="text-emerald-600 text-sm font-bold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> System secure
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-600 rounded-xl text-white">
              <Database className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">DB Storage</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">1.2 GB</h3>
            <p className="text-slate-400 text-sm mt-1">15% of quota used</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-purple-600 rounded-xl text-white">
              <Globe className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">API Health</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">99.9%</h3>
            <p className="text-slate-400 text-sm mt-1">Uptime last 30 days</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap p-1 bg-slate-100 rounded-2xl w-full">
        {[
          { id: 'users', label: 'Users', roles: ['super_admin', 'it_support', 'registrar'] },
          { id: 'instructors', label: 'Instructors', roles: ['super_admin', 'it_support', 'registrar'] },
          { id: 'roles', label: 'Roles', roles: ['super_admin'] },
          { id: 'org', label: 'Organization', roles: ['super_admin'] },
          { id: 'calendar', label: 'Calendar', roles: ['super_admin'] },
          { id: 'reports', label: 'Reports', roles: ['super_admin', 'registrar'] },
          { id: 'fields', label: 'Custom Fields', roles: ['super_admin'] },
          { id: 'logs', label: 'Audit Logs', roles: ['super_admin', 'it_support'] },
          { id: 'notifications', label: 'Notifications', roles: ['super_admin', 'it_support'] },
          { id: 'settings', label: 'System Variables', roles: ['super_admin'] },
        ].filter(tab => tab.roles.includes(profile.role)).map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 min-w-[100px] py-2.5 text-sm font-bold rounded-xl transition-all",
              activeTab === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search users by name or email..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl mr-1">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === 'grid' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                  title="List View"
                >
                  <List className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setViewMode('thumbnails')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === 'thumbnails' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                  title="Thumbnail View"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
              </div>
              <button className="p-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
                <Filter className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95"
              >
                <UserPlus className="w-5 h-5" />
                <span>Invite User</span>
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Last Login</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                            {(user.displayName || user.name || 'U').charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{user.displayName || user.name}</span>
                            <span className="text-xs text-slate-400">{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-600">{user.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                          user.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"
                        )}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{user.lastLogin}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => navigate(`/profile/${user.id}`)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="View Profile"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedUser(user);
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((user) => (
                <motion.div 
                  key={user.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:shadow-md transition-all group flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-blue-600 font-bold text-lg shadow-sm">
                    {(user.displayName || user.name || 'U').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{user.displayName || user.name}</h3>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <div className="relative group/menu">
                    <button className="p-2 text-slate-400 hover:bg-white rounded-lg shadow-sm">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 hidden group-hover/menu:block z-10">
                      <button 
                        onClick={() => navigate(`/profile/${user.id}`)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 font-medium"
                      >
                        View Profile
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedUser({
                            id: user.id,
                            name: user.displayName || user.name,
                            email: user.email,
                            role: user.role,
                            status: user.status,
                            department: user.department || '',
                            specialization: user.specialization || '',
                            phone: user.phone || ''
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 font-medium"
                      >
                        Edit User
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                      >
                        Delete User
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'instructors' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text"
                value={instructorSearch}
                onChange={(e) => setInstructorSearch(e.target.value)}
                placeholder="Search instructors by name, department, or specialization..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setNewUser({ ...newUser, role: 'Lecturer' });
                  setIsInviteModalOpen(true);
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span>Add Instructor</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Instructor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Specialization</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users
                  .filter(u => u.role === 'lecturer')
                  .filter(u => {
                    const search = instructorSearch.toLowerCase();
                    return (u.displayName || u.name || '').toLowerCase().includes(search) ||
                           (u.department || '').toLowerCase().includes(search) ||
                           (u.specialization || '').toLowerCase().includes(search) ||
                           (u.email || '').toLowerCase().includes(search);
                  })
                  .map((instructor) => (
                  <tr key={instructor.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                          {(instructor.displayName || instructor.name || 'I').charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{instructor.displayName || instructor.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{instructor.status}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{instructor.department || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500">{instructor.specialization || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Mail className="w-3 h-3" />
                          {instructor.email}
                        </div>
                        {instructor.phone && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Phone className="w-3 h-3" />
                            {instructor.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setSelectedUser({
                              id: instructor.id,
                              name: instructor.displayName || instructor.name,
                              email: instructor.email,
                              role: instructor.role,
                              status: instructor.status,
                              department: instructor.department || '',
                              specialization: instructor.specialization || '',
                              phone: instructor.phone || ''
                            });
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit Profile"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(instructor.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => (
            <div key={role.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{role.name}</h3>
                    <p className="text-sm text-slate-500">{role.users} Users assigned</p>
                  </div>
                </div>
                <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Permissions</p>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.map((perm, i) => (
                    <span key={i} className="text-[10px] font-bold bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-100">
                      {perm.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                <button className="text-blue-600 text-sm font-bold hover:underline">Edit Permissions</button>
                <button className="text-slate-400 hover:text-slate-600 text-sm font-bold">View Users</button>
              </div>
            </div>
          ))}
          <button 
            onClick={() => setIsRoleModalOpen(true)}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all group"
          >
            <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
            <span className="font-bold">Create New Role</span>
          </button>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <BarChart3 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Power BI Analytics</h3>
              <p className="text-slate-500 max-w-md mx-auto mt-2">
                Connect your Power BI workspace to embed interactive reports and dashboards directly into the system.
              </p>
            </div>
            <div className="flex gap-4 pt-4">
              <button className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2">
                <PlusCircle className="w-5 h-5" />
                Create New Report
              </button>
              <button className="bg-white border border-slate-200 text-slate-600 px-8 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all">
                Configure Integration
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Enrollment Trends', type: 'Dashboard', lastUpdated: '2 hours ago' },
              { title: 'Academic Performance', type: 'Report', lastUpdated: '1 day ago' },
              { title: 'Financial Overview', type: 'Report', lastUpdated: '3 days ago' },
            ].map((report, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{report.type}</span>
                </div>
                <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{report.title}</h4>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Updated {report.lastUpdated}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'fields' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Custom Fields Management</h3>
                <p className="text-sm text-slate-500">Add extra data fields to system entities</p>
              </div>
              <button 
                onClick={() => setIsFieldModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span>Add Custom Field</span>
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {customFields.map((field) => (
                <div key={field.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{field.name}</p>
                      <p className="text-sm text-slate-500">
                        Entity: <span className="capitalize font-medium text-slate-700">{field.entity}</span> • 
                        Type: <span className="capitalize font-medium text-slate-700">{field.type}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {field.required && (
                      <span className="text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-1 rounded-full uppercase tracking-wider">
                        Required
                      </span>
                    )}
                    <button className="p-2 text-slate-400 hover:text-blue-600 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-red-600 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Academic Calendar 2024/2025</h3>
                <p className="text-sm text-slate-500">Manage semesters, exams, and holidays</p>
              </div>
              <button 
                onClick={() => setIsCalendarModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span>Add Event</span>
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {academicCalendar.map((item) => (
                <div key={item.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      item.type === 'academic' ? "bg-blue-50 text-blue-600" :
                      item.type === 'exam' ? "bg-amber-50 text-amber-600" :
                      "bg-rose-50 text-rose-600"
                    )}>
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{item.event}</p>
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {new Date(item.date).toLocaleDateString('en-LY', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                      item.type === 'academic' ? "bg-blue-50 text-blue-600" :
                      item.type === 'exam' ? "bg-amber-50 text-amber-600" :
                      "bg-rose-50 text-rose-600"
                    )}>
                      {item.type}
                    </span>
                    <button className="p-2 text-slate-400 hover:text-blue-600 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'org' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Faculties */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Faculties
                </h3>
                <button 
                  onClick={() => {
                    setOrgType('faculty');
                    setIsOrgModalOpen(true);
                  }}
                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {faculties.map((f) => (
                  <div key={f.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-bold text-slate-900">{f.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{f.code}</span>
                        <span className="text-xs text-slate-400">{departments.filter(d => d.facultyId === f.id).length} Departments</span>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        if (window.confirm('Delete this faculty?')) {
                          try {
                            await deleteDoc(doc(db, 'faculties', f.id));
                          } catch (error) {
                            handleFirestoreError(error, OperationType.DELETE, 'faculties');
                          }
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Departments */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Folder className="w-5 h-5 text-indigo-600" />
                  Departments
                </h3>
                <button 
                  onClick={() => {
                    setOrgType('department');
                    setIsOrgModalOpen(true);
                  }}
                  className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {departments.map((d) => (
                  <div key={d.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-bold text-slate-900">{d.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{d.code}</span>
                        <span className="text-xs text-slate-400">Faculty: {faculties.find(f => f.id === d.facultyId)?.name || 'Unknown'}</span>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        if (window.confirm('Delete this department?')) {
                          try {
                            await deleteDoc(doc(db, 'departments', d.id));
                          } catch (error) {
                            handleFirestoreError(error, OperationType.DELETE, 'departments');
                          }
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg">System Audit Logs</h3>
            <button className="text-blue-600 text-sm font-bold hover:underline">Download Archive</button>
          </div>
          <div className="divide-y divide-slate-50">
            {logs.map((log) => (
              <div key={log.id} className="p-6 flex items-start justify-between hover:bg-slate-50 transition-colors">
                <div className="flex gap-4">
                  <div className={cn(
                    "p-2 rounded-lg mt-1",
                    log.severity === 'medium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                  )}>
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{log.action}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      By <span className="font-bold text-slate-700">{log.user}</span> on {log.target}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-400">{log.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Push Notifications</h3>
              <p className="text-slate-500">Manage system-wide alerts and critical notifications.</p>
            </div>
            <button 
              onClick={() => setIsNotifModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              <Bell className="w-5 h-5" />
              Send Notification
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-rose-500" />
              </div>
              <h4 className="font-bold text-slate-900">Exam Alerts</h4>
              <p className="text-sm text-slate-500 mt-1">Notify students about upcoming exams and schedule changes.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <h4 className="font-bold text-slate-900">Deadlines</h4>
              <p className="text-sm text-slate-500 mt-1">Send reminders for registration and document submissions.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6 text-emerald-500" />
              </div>
              <h4 className="font-bold text-slate-900">Financial</h4>
              <p className="text-sm text-slate-500 mt-1">Alert users about tuition fees and scholarship updates.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* University Info */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                University Information
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Institution Name</label>
                  <input 
                    type="text"
                    value={settings.institutionName}
                    onChange={(e) => setSettings({...settings, institutionName: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Website URL</label>
                  <input 
                    type="url"
                    value={settings.websiteUrl}
                    onChange={(e) => setSettings({...settings, websiteUrl: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Logo</label>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                    <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-300">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-600">Upload Logo</p>
                      <p className="text-[10px] text-slate-400">PNG, JPG up to 2MB</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Config */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Academic Configuration
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Academic Year</label>
                  <select 
                    value={settings.currentAcademicYear}
                    onChange={(e) => setSettings({...settings, currentAcademicYear: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  >
                    <option>2023/2024</option>
                    <option>2024/2025</option>
                    <option>2025/2026</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Semester</label>
                  <select 
                    value={settings.activeSemester}
                    onChange={(e) => setSettings({...settings, activeSemester: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  >
                    <option>Fall Semester</option>
                    <option>Spring Semester</option>
                    <option>Summer Session</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grade Scale</label>
                  <select 
                    value={settings.gradeScale}
                    onChange={(e) => setSettings({...settings, gradeScale: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  >
                    <option>Percentage (0-100)</option>
                    <option>GPA (4.0 Scale)</option>
                    <option>GPA (5.0 Scale)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Terms (Comma Separated)</label>
                  <input 
                    type="text"
                    value={settings.availableTerms?.join(', ') || ''}
                    onChange={(e) => setSettings({...settings, availableTerms: e.target.value.split(',').map(t => t.trim()).filter(t => t !== '')})}
                    placeholder="e.g. Fall 2024, Spring 2025"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                System Parameters
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-bold text-slate-900">Maintenance Mode</p>
                    <p className="text-xs text-slate-500">Disable public access to the system</p>
                  </div>
                  <div 
                    onClick={() => setSettings({...settings, maintenanceMode: !settings.maintenanceMode})}
                    className={cn(
                      "w-12 h-6 rounded-full relative cursor-pointer transition-all",
                      settings.maintenanceMode ? "bg-blue-600" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      settings.maintenanceMode ? "right-1" : "left-1"
                    )}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-bold text-slate-900">Multilingual Support</p>
                    <p className="text-xs text-slate-500">Enable Arabic/English switching</p>
                  </div>
                  <div 
                    onClick={() => setSettings({...settings, multilingualSupport: !settings.multilingualSupport})}
                    className={cn(
                      "w-12 h-6 rounded-full relative cursor-pointer transition-all",
                      settings.multilingualSupport ? "bg-blue-600" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      settings.multilingualSupport ? "right-1" : "left-1"
                    )}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-bold text-slate-900">Auto-Backup</p>
                    <p className="text-xs text-slate-500">Daily database snapshots</p>
                  </div>
                  <div 
                    onClick={() => setSettings({...settings, autoBackup: !settings.autoBackup})}
                    className={cn(
                      "w-12 h-6 rounded-full relative cursor-pointer transition-all",
                      settings.autoBackup ? "bg-blue-600" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      settings.autoBackup ? "right-1" : "left-1"
                    )}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Notification Config
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-bold text-slate-900">Email Notifications</p>
                    <p className="text-xs text-slate-500">Send system alerts via email</p>
                  </div>
                  <div 
                    onClick={() => setSettings({...settings, emailNotifications: !settings.emailNotifications})}
                    className={cn(
                      "w-12 h-6 rounded-full relative cursor-pointer transition-all",
                      settings.emailNotifications ? "bg-blue-600" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      settings.emailNotifications ? "right-1" : "left-1"
                    )}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-bold text-slate-900">SMS Alerts</p>
                    <p className="text-xs text-slate-500">Emergency notifications via SMS</p>
                  </div>
                  <div 
                    onClick={() => setSettings({...settings, smsAlerts: !settings.smsAlerts})}
                    className={cn(
                      "w-12 h-6 rounded-full relative cursor-pointer transition-all",
                      settings.smsAlerts ? "bg-blue-600" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      settings.smsAlerts ? "right-1" : "left-1"
                    )}></div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Some settings require system restart to take effect. Changes are logged in the audit trail.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={handleSaveSettings}
              disabled={loading}
              className="bg-blue-600 text-white px-12 py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save All Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite New User"
        footer={
          <>
            <button 
              onClick={() => setIsInviteModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleInvite}
              disabled={loading || !newUser.email || !newUser.name}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Send Invitation
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                placeholder="Enter user's full name"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder="user@university.edu.ly"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Role</label>
            <select 
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              {roles.map(role => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </select>
          </div>

          {(newUser.role === 'Lecturer' || newUser.role === 'lecturer') && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department</label>
                  <select 
                    value={newUser.department}
                    onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                  <input 
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                    placeholder="+218..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Specialization</label>
                <input 
                  type="text"
                  value={newUser.specialization}
                  onChange={(e) => setNewUser({...newUser, specialization: e.target.value})}
                  placeholder="e.g. Artificial Intelligence"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Organization Modal */}
      <Modal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
        title={orgType === 'faculty' ? "Add New Faculty" : "Add New Department"}
        footer={
          <>
            <button 
              onClick={() => setIsOrgModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleAddOrg}
              disabled={loading || !newOrg.name || !newOrg.code || (orgType === 'department' && !newOrg.parent)}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Create {orgType === 'faculty' ? 'Faculty' : 'Department'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Name</label>
            <input 
              type="text"
              value={newOrg.name}
              onChange={(e) => setNewOrg({...newOrg, name: e.target.value})}
              placeholder={`Enter ${orgType} name`}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Code</label>
            <input 
              type="text"
              value={newOrg.code}
              onChange={(e) => setNewOrg({...newOrg, code: e.target.value})}
              placeholder="e.g. ENG, CS, BUS"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          {orgType === 'department' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parent Faculty</label>
              <select 
                value={newOrg.parent}
                onChange={(e) => setNewOrg({...newOrg, parent: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="">Select Faculty</option>
                {faculties.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User Account"
        footer={
          <>
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpdateUser}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </>
        }
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                {selectedUser.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-lg">{selectedUser.name}</h4>
                <p className="text-sm text-slate-500">{selectedUser.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Role</label>
                <select 
                  value={selectedUser.role}
                  onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.name}>{role.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Status</label>
                <select 
                  value={selectedUser.status}
                  onChange={(e) => setSelectedUser({...selectedUser, status: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {(selectedUser.role.toLowerCase() === 'lecturer') && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department</label>
                      <select 
                        value={selectedUser.department || ''}
                        onChange={(e) => setSelectedUser({...selectedUser, department: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                      >
                        <option value="">Select Department</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                      <input 
                        type="tel"
                        value={selectedUser.phone || ''}
                        onChange={(e) => setSelectedUser({...selectedUser, phone: e.target.value})}
                        placeholder="+218..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Specialization</label>
                    <input 
                      type="text"
                      value={selectedUser.specialization || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, specialization: e.target.value})}
                      placeholder="e.g. Artificial Intelligence"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button className="text-red-600 text-sm font-bold hover:underline flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Reset User Password
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Role Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Create Custom Role"
        footer={
          <>
            <button 
              onClick={() => setIsRoleModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={() => setIsRoleModalOpen(false)}
              className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95"
            >
              Create Role
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Role Name</label>
            <input 
              type="text"
              value={newRole.name}
              onChange={(e) => setNewRole({...newRole, name: e.target.value})}
              placeholder="e.g. Department Coordinator"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Permissions</label>
            <div className="grid grid-cols-2 gap-3">
              {permissions.map((perm) => (
                <label key={perm} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all">
                  <input 
                    type="checkbox"
                    checked={newRole.permissions.includes(perm)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewRole({...newRole, permissions: [...newRole.permissions, perm]});
                      } else {
                        setNewRole({...newRole, permissions: newRole.permissions.filter(p => p !== perm)});
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-700">{perm.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        title="Add Calendar Event"
        footer={
          <>
            <button 
              onClick={() => setIsCalendarModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={() => setIsCalendarModalOpen(false)}
              className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95"
            >
              Add Event
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Event Name</label>
            <input 
              type="text"
              value={newEvent.event}
              onChange={(e) => setNewEvent({...newEvent, event: e.target.value})}
              placeholder="e.g. Final Exams Period"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</label>
            <input 
              type="date"
              value={newEvent.date}
              onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Event Type</label>
            <select 
              value={newEvent.type}
              onChange={(e) => setNewEvent({...newEvent, type: e.target.value as any})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="academic">Academic</option>
              <option value="exam">Exam</option>
              <option value="holiday">Holiday</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Custom Field Modal */}
      <Modal
        isOpen={isFieldModalOpen}
        onClose={() => setIsFieldModalOpen(false)}
        title="Add Custom Field"
        footer={
          <>
            <button 
              onClick={() => setIsFieldModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={() => setIsFieldModalOpen(false)}
              className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95"
            >
              Add Field
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Field Name</label>
            <input 
              type="text"
              value={newField.name}
              onChange={(e) => setNewField({...newField, name: e.target.value})}
              placeholder="e.g. Passport Number"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entity</label>
              <select 
                value={newField.entity}
                onChange={(e) => setNewField({...newField, entity: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="student">Student</option>
                <option value="lecturer">Lecturer</option>
                <option value="course">Course</option>
                <option value="program">Program</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data Type</label>
              <select 
                value={newField.type}
                onChange={(e) => setNewField({...newField, type: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="text">Short Text</option>
                <option value="longtext">Long Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="boolean">Yes/No</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <input 
              type="checkbox"
              checked={newField.required}
              onChange={(e) => setNewField({...newField, required: e.target.checked})}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-bold text-slate-700">Mark as Required Field</span>
          </label>
        </div>
      </Modal>
      {/* Notification Modal */}
      <Modal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        title="Send Push Notification"
        footer={
          <>
            <button 
              onClick={() => setIsNotifModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSendNotification}
              disabled={loading}
              className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Notification'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target User ID</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              placeholder="Enter User UID"
              value={testNotif.userId}
              onChange={e => setTestNotif({...testNotif, userId: e.target.value})}
            />
            <p className="text-[10px] text-slate-400 mt-1">Tip: Copy UID from the Users tab</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Title</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              placeholder="Notification Title"
              value={testNotif.title}
              onChange={e => setTestNotif({...testNotif, title: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message</label>
            <textarea 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none h-24 resize-none"
              placeholder="Notification Message"
              value={testNotif.message}
              onChange={e => setTestNotif({...testNotif, message: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type</label>
              <select 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                value={testNotif.type}
                onChange={e => setTestNotif({...testNotif, type: e.target.value as any})}
              >
                <option value="system">System</option>
                <option value="exam">Exam</option>
                <option value="deadline">Deadline</option>
                <option value="finance">Finance</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Link (Optional)</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                placeholder="/grades, /finance, etc."
                value={testNotif.link}
                onChange={e => setTestNotif({...testNotif, link: e.target.value})}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
