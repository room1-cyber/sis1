import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  GraduationCap, 
  CreditCard, 
  Building2, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Globe,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  ShieldCheck,
  Briefcase,
  UserCheck,
  FileText,
  UserPlus,
  ArrowLeftRight,
  Award,
  Folder,
  BarChart3,
  User,
  Library,
  MessageSquare,
  Bell,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label, active, onClick }) => {
  const { isRTL } = useTranslation();
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
        active 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <Icon className={cn("w-5 h-5", active ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
      <span className="font-medium flex-1">{label}</span>
      {active && (isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
    </Link>
  );
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, isRTL, language, setLanguage, ramadanMode, setRamadanMode, lowBandwidth, setLowBandwidth } = useTranslation();
  const { profile, user, hasPermission } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, requestPermission, permission } = useNotifications();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const getNavItems = () => {
    const items = [
      { to: '/', icon: LayoutDashboard, label: t('dashboard'), permission: 'view_dashboard' as const },
      { to: '/profile', icon: User, label: t('profile') },
      { to: '/calendar', icon: Calendar, label: 'Calendar' },
      { to: '/timetable', icon: Clock, label: t('timetable'), permission: 'view_own_timetable' as const },
      { to: '/registrar', icon: ShieldCheck, label: t('registrar'), permission: 'manage_users' as const },
      { to: '/admissions', icon: UserPlus, label: t('admissions'), permission: 'manage_users' as const },
      { to: '/students', icon: Users, label: t('students'), permission: 'manage_students' as const },
      { to: '/lecturers', icon: Briefcase, label: 'Lecturers', permission: 'manage_lecturers' as const },
      { to: '/programs', icon: GraduationCap, label: t('programs'), permission: 'manage_courses' as const },
      { to: '/courses', icon: BookOpen, label: t('courses'), permission: 'manage_courses' as const },
      { to: '/enrollment', icon: BookOpen, label: t('enrollment'), permission: 'request_enrollment' as const },
      { to: '/finance', icon: CreditCard, label: t('finance'), permission: 'manage_finance' as const },
      { to: '/library', icon: Library, label: 'Library', permission: 'manage_library' as const },
      { to: '/grades', icon: FileText, label: 'Grades', permission: 'view_own_grades' as const },
      { to: '/attendance', icon: UserCheck, label: 'Attendance', permission: 'submit_grades' as const },
      { to: '/documents', icon: Folder, label: 'Documents', permission: 'manage_users' as const },
      { to: '/reports', icon: BarChart3, label: 'Reports', permission: 'view_reports' as const },
      { to: '/transfers', icon: ArrowLeftRight, label: 'Transfers', permission: 'request_enrollment' as const },
      { to: '/graduation', icon: Award, label: 'Graduation', permission: 'view_own_grades' as const },
      { to: '/admin', icon: ShieldCheck, label: t('admin'), permission: 'manage_users' as const },
      { to: '/permissions', icon: ShieldCheck, label: 'Permissions', permission: 'manage_users' as const },
      { to: '/messages', icon: MessageSquare, label: 'Messages' },
    ];

    return items.filter(item => !item.permission || hasPermission(item.permission));
  };

  const navItems = getNavItems();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'exam': return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'deadline': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'finance': return <CreditCard className="w-4 h-4 text-emerald-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 truncate max-w-[120px]">{t('title')}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg relative"
          >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 shadow-xl md:shadow-none",
        isRTL ? (isSidebarOpen ? "translate-x-0" : "translate-x-full") : (isSidebarOpen ? "translate-x-0" : "-translate-x-full")
      )}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 leading-tight">{t('title')}</span>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{profile?.role || 'User'}</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              {...item}
              active={location.pathname === item.to}
              onClick={() => setIsSidebarOpen(false)}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <Globe className="w-5 h-5 text-slate-400" />
            <span className="font-medium">{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          <button
            onClick={() => setRamadanMode(!ramadanMode)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              ramadanMode ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Clock className={cn("w-5 h-5", ramadanMode ? "text-amber-500" : "text-slate-400")} />
            <span className="font-medium">{t('ramadanMode')}</span>
          </button>

          <button
            onClick={() => setLowBandwidth(!lowBandwidth)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              lowBandwidth ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <BarChart3 className={cn("w-5 h-5", lowBandwidth ? "text-blue-500" : "text-slate-400")} />
            <span className="font-medium">{t('lowBandwidth')}</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5 text-red-400" />
            <span className="font-medium">{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden md:flex bg-white border-b border-slate-200 px-8 py-4 items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4 text-slate-400">
            <h2 className="text-lg font-semibold text-slate-900">
              {navItems.find(item => item.to === location.pathname)?.label || t('dashboard')}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
              <Calendar className="w-4 h-4" />
              <span>{new Date().toLocaleDateString(language === 'ar' ? 'ar-LY' : 'en-GB')}</span>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all relative"
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={cn(
                      "absolute top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50",
                      isRTL ? "left-0" : "right-0"
                    )}
                  >
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-bold text-slate-900">Notifications</h3>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-wider"
                          >
                            Mark all read
                          </button>
                        )}
                        {permission === 'default' && (
                          <button 
                            onClick={requestPermission}
                            className="p-1 text-slate-400 hover:text-blue-600"
                            title="Enable Browser Notifications"
                          >
                            <Globe className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id}
                            className={cn(
                              "p-4 hover:bg-slate-50 transition-colors group relative",
                              !notif.read && "bg-blue-50/30"
                            )}
                          >
                            <div className="flex gap-3">
                              <div className="mt-1">
                                {getNotificationIcon(notif.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-sm text-slate-900", !notif.read ? "font-bold" : "font-medium")}>
                                  {notif.title}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                </p>
                              </div>
                              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notif.read && (
                                  <button 
                                    onClick={() => markAsRead(notif.id)}
                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                    title="Mark as read"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => deleteNotification(notif.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {notif.link && (
                              <Link 
                                to={notif.link}
                                onClick={() => {
                                  markAsRead(notif.id);
                                  setIsNotificationsOpen(false);
                                }}
                                className="absolute inset-0 z-0"
                              />
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                            <Bell className="w-6 h-6" />
                          </div>
                          <p className="text-sm text-slate-400">No notifications yet</p>
                        </div>
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-slate-100 text-center bg-slate-50/50">
                        <button className="text-xs font-bold text-slate-500 hover:text-slate-700">
                          View All Notifications
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900 leading-none">{profile?.displayName || user?.displayName}</p>
                <p className="text-xs text-slate-400 mt-1">{profile?.email}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
                <img 
                  src={user?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}&background=random`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

