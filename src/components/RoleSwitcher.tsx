import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { UserRole } from '../types';
import { Settings, ChevronRight, Shield, User, GraduationCap, BookOpen, CreditCard, Calendar, Library, Wrench, Search, Info, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { seedTrialData } from '../lib/seedData';

const roles: { role: UserRole; label: string; icon: any; color: string }[] = [
  { role: 'super_admin', label: 'Super Admin', icon: Shield, color: 'text-purple-600 bg-purple-50' },
  { role: 'registrar', label: 'Registrar', icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
  { role: 'dept_admin', label: 'Dept Admin', icon: Settings, color: 'text-indigo-600 bg-indigo-50' },
  { role: 'lecturer', label: 'Lecturer', icon: User, color: 'text-emerald-600 bg-emerald-50' },
  { role: 'student', label: 'Student', icon: GraduationCap, color: 'text-orange-600 bg-orange-50' },
  { role: 'finance', label: 'Finance', icon: CreditCard, color: 'text-rose-600 bg-rose-50' },
  { role: 'timetable', label: 'Timetable', icon: Calendar, color: 'text-cyan-600 bg-cyan-50' },
  { role: 'library', label: 'Library', icon: Library, color: 'text-amber-600 bg-amber-50' },
  { role: 'it_support', label: 'IT Support', icon: Wrench, color: 'text-slate-600 bg-slate-50' },
  { role: 'admissions', label: 'Admissions', icon: Search, color: 'text-teal-600 bg-teal-50' },
];

export default function RoleSwitcher() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seedStatus, setSeedStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  if (!user || !profile) return null;

  const switchRole = async (newRole: UserRole) => {
    if (newRole === profile.role) return;
    
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: newRole
      });
      setIsOpen(false);
      // The onSnapshot in useAuth will automatically update the profile state
    } catch (error) {
      console.error('Error switching role:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    setSeedStatus('loading');
    try {
      await seedTrialData();
      setSeedStatus('success');
      setTimeout(() => setSeedStatus('idle'), 3000);
    } catch (error) {
      console.error('Error seeding data:', error);
      setSeedStatus('error');
      setTimeout(() => setSeedStatus('idle'), 3000);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-16 right-0 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden mb-2"
          >
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Shield className="w-5 h-5 text-blue-600" />
                <span>Test Mode Tools</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Switch roles or seed sample data</p>
            </div>
            
            <div className="max-h-[350px] overflow-y-auto p-2">
              {roles.map((item) => {
                const Icon = item.icon;
                const isActive = profile.role === item.role;
                
                return (
                  <button
                    key={item.role}
                    onClick={() => switchRole(item.role)}
                    disabled={loading}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${
                      isActive 
                        ? 'bg-blue-50 border border-blue-100' 
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                        {item.label}
                      </span>
                    </div>
                    {isActive ? (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="p-3 border-t border-slate-100">
              <button
                onClick={handleSeedData}
                disabled={seedStatus === 'loading'}
                className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl font-semibold text-sm transition-all ${
                  seedStatus === 'success' 
                    ? 'bg-emerald-500 text-white' 
                    : seedStatus === 'error'
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {seedStatus === 'loading' ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : seedStatus === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : seedStatus === 'error' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                <span>
                  {seedStatus === 'loading' ? 'Seeding...' : 
                   seedStatus === 'success' ? 'Data Seeded!' : 
                   seedStatus === 'error' ? 'Error Seeding' : 
                   'Seed Trial Data'}
                </span>
              </button>
            </div>
            
            <div className="p-3 bg-blue-50 border-t border-blue-100 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-700 leading-tight">
                Seeding will populate faculties, courses, and demo profiles.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all active:scale-95 ${
          isOpen 
            ? 'bg-slate-900 text-white' 
            : 'bg-white text-slate-900 border border-slate-200 hover:border-blue-300 hover:bg-blue-50'
        }`}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Settings className={`w-5 h-5 ${isOpen ? 'animate-spin-slow' : ''}`} />
        )}
        <span className="font-semibold text-sm">Switch Role</span>
        <div className="ml-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold uppercase">
          {profile.role.replace('_', ' ')}
        </div>
      </button>
    </div>
  );
}
