import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  ExternalLink,
  Building2,
  GraduationCap,
  FileText,
  ShieldCheck,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Transfers() {
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'equivalency'>('requests');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transferRequests, setTransferRequests] = useState<any[]>([]);
  const [newRequest, setNewRequest] = useState({ type: 'Internal', from: '', to: '' });

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'transferRequests'), where('studentId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTransferRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transferRequests'));
    return () => unsubscribe();
  }, [profile]);

  const equivalencyRules = [
    { id: 'e1', sourceCourse: 'MATH101 (UoT)', targetCourse: 'MATH101 (UoB)', credits: 3, status: 'verified' },
    { id: 'e2', sourceCourse: 'CS110 (UoT)', targetCourse: 'CS101 (UoB)', credits: 4, status: 'verified' },
    { id: 'e3', sourceCourse: 'PHYS101 (UoT)', targetCourse: 'PHYS101 (UoB)', credits: 3, status: 'pending_review' },
  ];

  const handleRequest = async () => {
    if (!profile || !newRequest.from || !newRequest.to) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'transferRequests'), {
        studentId: profile.uid,
        type: newRequest.type,
        from: newRequest.from,
        to: newRequest.to,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
      setIsRequestModalOpen(false);
      setNewRequest({ type: 'Internal', from: '', to: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transferRequests');
    } finally {
      setLoading(false);
    }
  };

  const Modal = ({ isOpen, onClose, title, children, footer }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) => (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="text-xl font-bold text-slate-900">{title}</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <Clock className="w-5 h-5 text-slate-400 rotate-90" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {children}
            </div>
            {footer && (
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 sticky bottom-0 z-10">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transfers & Equivalency</h1>
          <p className="text-slate-500 mt-1">Manage faculty transfers and course credit equivalency</p>
        </div>
        <button 
          onClick={() => setIsRequestModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          <span>New Transfer Request</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Requests</p>
            <h3 className="text-xl font-bold text-slate-900">{transferRequests.length}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Credits Transferred</p>
            <h3 className="text-xl font-bold text-slate-900">12</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Partner Institutions</p>
            <h3 className="text-xl font-bold text-slate-900">8</h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-full max-w-md">
        <button 
          onClick={() => setActiveTab('requests')}
          className={cn(
            "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
            activeTab === 'requests' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Transfer Requests
        </button>
        <button 
          onClick={() => setActiveTab('equivalency')}
          className={cn(
            "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
            activeTab === 'equivalency' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Equivalency
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'requests' && (
            <motion.div 
              key="requests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 relative max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search requests..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button className="p-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
                    <Filter className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">From</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">To</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {transferRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                            req.type === 'Internal' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                          )}>
                            {req.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">{req.from}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">{req.to}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{req.date}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                            req.status === 'approved' ? "bg-emerald-50 text-emerald-600" : 
                            req.status === 'rejected' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                          )}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setIsEvaluationModalOpen(true)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'equivalency' && (
            <motion.div 
              key="equivalency"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <div className="grid grid-cols-1 gap-4">
                {equivalencyRules.map((rule) => (
                  <div key={rule.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-8 flex-1">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Source Course</p>
                        <p className="font-bold text-slate-900">{rule.sourceCourse}</p>
                      </div>
                      <div className="text-slate-300">
                        <ArrowLeftRight className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Course</p>
                        <p className="font-bold text-slate-900">{rule.targetCourse}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Credits</p>
                        <p className="font-bold text-slate-900">{rule.credits}</p>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider",
                        rule.status === 'verified' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {rule.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
        <div className="p-3 bg-blue-600 rounded-xl text-white">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-blue-900 text-lg">Transfer Regulations</h3>
          <p className="text-blue-700/80 mt-1 leading-relaxed">
            Faculty transfers are subject to minimum GPA requirements and seat availability. External transfers require an official transcript from the source institution. 
            Credit equivalency is determined by the academic committee based on course content and learning outcomes.
          </p>
        </div>
      </div>

      {/* New Transfer Request Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="New Transfer Request"
        footer={
          <>
            <button 
              onClick={() => setIsRequestModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleRequest}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Submit Request
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setNewRequest(prev => ({ ...prev, type: 'Internal' }))}
              className={cn(
                "p-4 rounded-2xl text-left transition-all",
                newRequest.type === 'Internal' ? "bg-blue-50 border-2 border-blue-600" : "bg-white border border-slate-200 hover:border-blue-200"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center mb-3",
                newRequest.type === 'Internal' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
              )}>
                <Building2 className="w-4 h-4" />
              </div>
              <p className={cn("font-bold", newRequest.type === 'Internal' ? "text-blue-900" : "text-slate-900")}>Internal Transfer</p>
              <p className={cn("text-xs", newRequest.type === 'Internal' ? "text-blue-600" : "text-slate-500")}>Between faculties or programs</p>
            </button>
            <button 
              onClick={() => setNewRequest(prev => ({ ...prev, type: 'External' }))}
              className={cn(
                "p-4 rounded-2xl text-left transition-all",
                newRequest.type === 'External' ? "bg-blue-50 border-2 border-blue-600" : "bg-white border border-slate-200 hover:border-blue-200"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center mb-3",
                newRequest.type === 'External' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
              )}>
                <GraduationCap className="w-4 h-4" />
              </div>
              <p className={cn("font-bold", newRequest.type === 'External' ? "text-blue-900" : "text-slate-900")}>External Transfer</p>
              <p className={cn("text-xs", newRequest.type === 'External' ? "text-blue-600" : "text-slate-500")}>From another university</p>
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Source Institution/Faculty</label>
              <input 
                type="text"
                value={newRequest.from}
                onChange={(e) => setNewRequest(prev => ({ ...prev, from: e.target.value }))}
                placeholder="Where are you transferring from?"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Faculty/Program</label>
              <input 
                type="text"
                value={newRequest.to}
                onChange={(e) => setNewRequest(prev => ({ ...prev, to: e.target.value }))}
                placeholder="Where do you want to transfer to?"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Supporting Documents</label>
            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer">
              <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400">
                <Plus className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-600">Upload Transcript / Syllabus</p>
                <p className="text-xs text-slate-400 mt-1">PDF, JPG up to 10MB</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Evaluation Modal */}
      <Modal
        isOpen={isEvaluationModalOpen}
        onClose={() => setIsEvaluationModalOpen(false)}
        title="Transfer Evaluation"
        footer={
          <button 
            onClick={() => setIsEvaluationModalOpen(false)}
            className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
          >
            Close
          </button>
        }
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between p-6 bg-slate-900 text-white rounded-3xl shadow-xl">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Status</p>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h4 className="text-xl font-bold">Approved</h4>
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Credits Transferred</p>
              <h4 className="text-xl font-bold">15.0 Credits</h4>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <h5 className="font-bold text-slate-900">Course Equivalency Results</h5>
              <div className="space-y-3">
                {[
                  { from: 'MATH101 (State U)', to: 'MATH101 (UoB)', status: 'equivalent', credits: 3 },
                  { from: 'CS110 (State U)', to: 'CS101 (UoB)', status: 'equivalent', credits: 4 },
                  { from: 'ENG101 (State U)', to: 'ENG101 (UoB)', status: 'equivalent', credits: 3 },
                ].map((item, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Equivalent</span>
                      <span className="text-xs font-bold text-slate-400">{item.credits} Cr</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-500">{item.from}</span>
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                      <span className="text-sm font-bold text-slate-900">{item.to}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                The transferred credits have been added to your academic record and will reflect in your degree audit within 24 hours.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
