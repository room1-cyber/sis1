import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Award,
  FileText,
  ShieldCheck,
  Search,
  Filter,
  ChevronRight,
  BookOpen,
  TrendingUp,
  Download,
  Printer,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Graduation() {
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'audit' | 'application' | 'alumni'>('audit');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [auditData, setAuditData] = useState<any[]>([]);
  const [graduationSteps, setGraduationSteps] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;

    // Fetch degree audit data
    const qAudit = query(collection(db, 'degreeAudits'), where('studentId', '==', profile.uid));
    const unsubAudit = onSnapshot(qAudit, (snap) => {
      if (snap.empty) {
        // Default audit data if none exists
        setAuditData([
          { id: 'a1', category: 'Core Courses', required: 60, completed: 0, status: 'not_started' },
          { id: 'a2', category: 'Elective Courses', required: 30, completed: 0, status: 'not_started' },
          { id: 'a3', category: 'General Education', required: 20, completed: 0, status: 'not_started' },
          { id: 'a4', category: 'Final Project', required: 10, completed: 0, status: 'not_started' },
        ]);
      } else {
        setAuditData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    });

    // Fetch graduation steps/clearance
    const qSteps = query(collection(db, 'graduationClearance'), where('studentId', '==', profile.uid));
    const unsubSteps = onSnapshot(qSteps, (snap) => {
      if (snap.empty) {
        setGraduationSteps([
          { id: 's1', name: 'Degree Audit', status: 'pending', date: null },
          { id: 's2', name: 'Financial Clearance', status: 'pending', date: null },
          { id: 's3', name: 'Library Clearance', status: 'pending', date: null },
          { id: 's4', name: 'Graduation Application', status: 'not_started', date: null },
        ]);
      } else {
        setGraduationSteps(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    });

    return () => {
      unsubAudit();
      unsubSteps();
    };
  }, [profile]);

  const handleApply = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'graduationApplications'), {
        studentId: profile.uid,
        status: 'pending',
        appliedAt: serverTimestamp(),
        term: 'Fall 2026'
      });
      setIsApplyModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'graduationApplications');
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
          <h1 className="text-2xl font-bold text-slate-900">Graduation & Alumni</h1>
          <p className="text-slate-500 mt-1">Track degree progress, apply for graduation, and join the alumni network</p>
        </div>
        <button 
          onClick={() => setIsApplyModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200"
        >
          <GraduationCap className="w-5 h-5" />
          <span>Apply for Graduation</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-600 rounded-xl text-white">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Degree Progress</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">86%</h3>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: '86%' }}></div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-600 rounded-xl text-white">
              <Award className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Credits Earned</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">104 / 120</h3>
            <p className="text-slate-400 text-sm mt-1">16 credits remaining</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-600 rounded-xl text-white">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Est. Graduation</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">June 2027</h3>
            <p className="text-slate-400 text-sm mt-1">Spring Semester</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-full max-w-md">
        <button 
          onClick={() => setActiveTab('audit')}
          className={cn(
            "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
            activeTab === 'audit' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Degree Audit
        </button>
        <button 
          onClick={() => setActiveTab('application')}
          className={cn(
            "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
            activeTab === 'application' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Application
        </button>
        <button 
          onClick={() => setActiveTab('alumni')}
          className={cn(
            "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
            activeTab === 'alumni' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Alumni
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'audit' && (
            <motion.div 
              key="audit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900 text-lg">Degree Requirements</h3>
                <button className="text-blue-600 text-sm font-bold hover:underline flex items-center gap-2">
                  <Printer className="w-4 h-4" />
                  Print Audit
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {auditData.map((item) => (
                  <div key={item.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-slate-900">{item.category}</h4>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                          item.status === 'completed' ? "bg-emerald-50 text-emerald-600" : 
                          item.status === 'in_progress' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"
                        )}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-slate-100">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            item.status === 'completed' ? "bg-emerald-500" : "bg-blue-500"
                          )} 
                          style={{ width: `${(item.completed / item.required) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{item.completed} / {item.required}</p>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Credits</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'application' && (
            <motion.div 
              key="application"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-slate-900 text-lg">Graduation Checklist</h3>
                <span className="text-sm text-slate-500">2 of 4 steps completed</span>
              </div>
              
              <div className="space-y-6 relative">
                <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-100"></div>
                {graduationSteps.map((step, index) => (
                  <div key={step.id} className="flex items-start gap-6 relative z-10">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-sm",
                      step.status === 'completed' ? "bg-emerald-500 text-white" : 
                      step.status === 'pending' ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-400"
                    )}>
                      {step.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : 
                       step.status === 'pending' ? <Clock className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900">{step.name}</h4>
                        {step.date && <span className="text-xs text-slate-500">{step.date}</span>}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        {step.status === 'completed' ? 'Requirement satisfied and verified.' : 
                         step.status === 'pending' ? 'Verification in progress.' : 'Action required to proceed.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'alumni' && (
            <motion.div 
              key="alumni"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-12 text-center"
            >
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <GraduationCap className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Alumni Network</h3>
                <p className="text-slate-500 mt-2">
                  Join thousands of graduates in our global alumni network. Stay connected, access career resources, and mentor current students.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                  <button className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                    Register as Alumni
                  </button>
                  <button className="w-full sm:w-auto px-8 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all">
                    Career Portal
                  </button>
                </div>
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
          <h3 className="font-bold text-blue-900 text-lg">Degree Verification</h3>
          <p className="text-blue-700/80 mt-1 leading-relaxed">
            Final degree verification is performed by the Registrar's Office. Ensure all financial and library dues are cleared before applying for graduation. 
            Official certificates are issued in both Arabic and English.
          </p>
        </div>
      </div>

      {/* Graduation Application Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Graduation Application"
        footer={
          <>
            <button 
              onClick={() => setIsApplyModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleApply}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Submit Application
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Please verify your degree details before submitting. Once submitted, your application will be reviewed by the Registrar's office.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
              <p className="font-bold text-slate-900">{profile?.displayName || 'John Doe'}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student ID</label>
              <p className="font-bold text-slate-900">{profile?.uid || '2023001'}</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Degree Program</label>
            <p className="font-bold text-slate-900">Bachelor of Science in Computer Science</p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expected Graduation Term</label>
              <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none">
                <option>Spring 2026</option>
                <option>Summer 2026</option>
                <option>Fall 2026</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diploma Name (How it should appear)</label>
              <input 
                type="text"
                placeholder="e.g. John Michael Doe"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all">
              <input type="checkbox" className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-slate-600">I confirm that I have reviewed my degree audit and believe I have met all requirements.</span>
            </label>
            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all">
              <input type="checkbox" className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-slate-600">I intend to participate in the commencement ceremony.</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Detailed Audit Modal */}
      <Modal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        title="Detailed Degree Audit"
        footer={
          <button 
            onClick={() => setIsAuditModalOpen(false)}
            className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
          >
            Close
          </button>
        }
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between p-6 bg-slate-900 text-white rounded-3xl shadow-xl">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Overall Progress</p>
              <h4 className="text-3xl font-bold">92%</h4>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Credits Earned</p>
              <h4 className="text-xl font-bold">110 / 120</h4>
            </div>
          </div>

          <div className="space-y-6">
            {auditData.map((section) => (
              <div key={section.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-900">{section.category}</h5>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                    section.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                  )}>
                    {section.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-slate-700">CS{100 + i * 10} - Introduction to Programming</span>
                      </div>
                      <span className="text-xs font-bold text-slate-400">3.0 Cr</span>
                    </div>
                  ))}
                  {section.status === 'in_progress' && (
                    <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100 border-dashed">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-blue-700">CS401 - Advanced Algorithms</span>
                      </div>
                      <span className="text-xs font-bold text-blue-400">3.0 Cr</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
