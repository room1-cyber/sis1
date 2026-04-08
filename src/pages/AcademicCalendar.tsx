import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { SystemSettings } from '../types';
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Clock, 
  AlertCircle,
  Moon,
  Sun,
  MapPin,
  Flag
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import Modal from '../components/Modal';

export default function AcademicCalendar() {
  const { t, isRTL, language, ramadanMode } = useTranslation();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'events' | 'holidays'>('events');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    type: 'academic'
  });

  useEffect(() => {
    const q = query(collection(db, 'calendarEvents'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setCalendarEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'calendarEvents'));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'system'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SystemSettings);
      }
    });

    return () => {
      unsubscribe();
      unsubSettings();
    };
  }, []);

  const handleAddEvent = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'calendarEvents'), {
        ...newEvent,
        status: 'upcoming',
        createdAt: serverTimestamp()
      });
      setIsAddModalOpen(false);
      setNewEvent({ title: '', date: '', type: 'academic' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'calendarEvents');
    } finally {
      setLoading(false);
    }
  };

  const events = calendarEvents.filter(e => ['academic', 'deadline', 'exam'].includes(e.type));
  const holidays = calendarEvents.filter(e => ['national', 'religious'].includes(e.type));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Academic Calendar</h1>
          <p className="text-slate-500 mt-1">Manage semesters, terms, and university events</p>
        </div>
        <div className="flex items-center gap-3">
          {ramadanMode && (
            <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-100 text-sm font-bold flex items-center gap-2">
              <Moon className="w-4 h-4" />
              <span>Ramadan Schedule Active</span>
            </div>
          )}
          {profile?.role === 'super_admin' && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200"
            >
              <Plus className="w-5 h-5" />
              <span>Add Event</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar View (Simplified) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-900">September 2026</h3>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 30 }).map((_, i) => {
                const day = i + 1;
                const isEvent = [1, 5, 15, 20].includes(day);
                return (
                  <div 
                    key={i} 
                    className={cn(
                      "aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all cursor-pointer",
                      day === 4 ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "hover:bg-slate-50 text-slate-600",
                      isEvent && "border-2 border-blue-100"
                    )}
                  >
                    <span className="text-sm font-bold">{day}</span>
                    {isEvent && (
                      <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-blue-400" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex border-b border-slate-100">
              <button 
                onClick={() => setActiveTab('events')}
                className={cn(
                  "flex-1 px-6 py-4 text-sm font-bold transition-all",
                  activeTab === 'events' ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/30" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Upcoming Events
              </button>
              <button 
                onClick={() => setActiveTab('holidays')}
                className={cn(
                  "flex-1 px-6 py-4 text-sm font-bold transition-all",
                  activeTab === 'holidays' ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/30" : "text-slate-400 hover:text-slate-600"
                )}
              >
                National Holidays
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {(activeTab === 'events' ? events : holidays).map((item) => (
                <div key={item.id} className="p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                  <div className={cn(
                    "p-3 rounded-xl",
                    activeTab === 'holidays' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                  )}>
                    {activeTab === 'holidays' ? <Flag className="w-5 h-5" /> : <CalendarIcon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900">{item.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <Clock className="w-4 h-4" />
                      <span>{item.date}</span>
                    </div>
                  </div>
                  {profile?.role === 'super_admin' && (
                    <button className="text-slate-400 hover:text-slate-600">
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Term Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-2xl shadow-lg shadow-blue-200 text-white">
            <h3 className="font-bold text-lg mb-4">Current Term Info</h3>
            <div className="space-y-4">
              <div className="bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                <p className="text-xs text-white/60 uppercase tracking-wider font-bold">Active Semester</p>
                <p className="text-lg font-bold mt-1">{settings?.activeSemester || 'Fall Semester'} {settings?.currentAcademicYear || '2024/2025'}</p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                <p className="text-xs text-white/60 uppercase tracking-wider font-bold">Term Progress</p>
                <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-[15%] rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                </div>
                <p className="text-xs mt-2 text-white/80">Week 2 of 16</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">Quick Links</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setActiveTab('events')}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all group"
              >
                <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600">Exam Schedules</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              {profile?.role === 'super_admin' && (
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all group"
                >
                  <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600">Add New Event</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}
              <button 
                onClick={() => setActiveTab('holidays')}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all group"
              >
                <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600">Holiday Policy</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold">Deadlines</h3>
            </div>
            <p className="text-sm text-red-600/80 leading-relaxed">
              Fall 2026 registration closes in <strong>12 days</strong>. Please ensure all student holds are cleared.
            </p>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Event"
        footer={
          <>
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleAddEvent}
              disabled={loading || !newEvent.title || !newEvent.date}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Save Event
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Event Title</label>
            <input 
              type="text"
              value={newEvent.title}
              onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
              placeholder="e.g., Midterm Exams"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date / Range</label>
            <input 
              type="text"
              value={newEvent.date}
              onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
              placeholder="e.g., Oct 25 - Nov 5, 2026"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Event Type</label>
            <select 
              value={newEvent.type}
              onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="academic">Academic</option>
              <option value="deadline">Deadline</option>
              <option value="exam">Exam</option>
              <option value="holiday">Holiday</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
