import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where, orderBy, updateDoc, doc, getDocs, limit, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { Transaction, Scholarship, Subscription, Surcharge, PaidService, FinancialRequest } from '../types';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Download,
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  ShieldCheck,
  History,
  Printer,
  Award,
  RefreshCw,
  Zap,
  FileText,
  MoreVertical,
  Check,
  X,
  CreditCard as CardIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

import Modal from '../components/Modal';
import StudentSearch from '../components/StudentSearch';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function Finance() {
  const { t, isRTL } = useTranslation();
  const { profile, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'status' | 'payments' | 'services' | 'surcharges' | 'requests' | 'scholarships' | 'reports'>('status');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet' | 'bank'>('card');
  const [paymentType, setPaymentType] = useState<Transaction['type']>('tuition');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [students, setStudents] = useState<{uid: string, displayName: string, tuition?: number}[]>([]);

  const [requestType, setRequestType] = useState<FinancialRequest['type']>('refund');
  const [requestReason, setRequestReason] = useState('');
  const [requestAmount, setRequestAmount] = useState<number>(0);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [services, setServices] = useState<PaidService[]>([]);
  const [requests, setRequests] = useState<FinancialRequest[]>([]);
  const [adminStats, setAdminStats] = useState({
    dailyIncome: 0,
    totalCommitments: 0,
    collectionRate: 0,
    surchargeIncome: 0,
    totalExpected: 0,
    totalCollected: 0
  });

  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [chargeStudentId, setChargeStudentId] = useState('');
  const [chargeAmount, setChargeAmount] = useState<number>(0);
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeType, setChargeType] = useState<'fee' | 'surcharge' | 'tuition'>('fee');

  const isFinanceAdmin = hasPermission('manage_finance');

  useEffect(() => {
    if (!profile) return;

    // Base queries
    const qTransactions = isFinanceAdmin 
      ? query(collection(db, 'transactions'), orderBy('date', 'desc'))
      : query(collection(db, 'transactions'), where('studentId', '==', profile.uid), orderBy('date', 'desc'));

    const qScholarships = isFinanceAdmin
      ? query(collection(db, 'scholarships'))
      : query(collection(db, 'scholarships'), where('studentId', '==', profile.uid));

    const qSubscriptions = isFinanceAdmin
      ? query(collection(db, 'subscriptions'))
      : query(collection(db, 'subscriptions'), where('studentId', '==', profile.uid));

    const qSurcharges = isFinanceAdmin
      ? query(collection(db, 'surcharges'))
      : query(collection(db, 'surcharges'), where('studentId', '==', profile.uid));

    const qRequests = isFinanceAdmin
      ? query(collection(db, 'financialRequests'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'financialRequests'), where('studentId', '==', profile.uid), orderBy('createdAt', 'desc'));

    const unsubTransactions = onSnapshot(qTransactions, (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });

    const unsubScholarships = onSnapshot(qScholarships, (snap) => {
      setScholarships(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scholarship)));
    });

    const unsubSubscriptions = onSnapshot(qSubscriptions, (snap) => {
      setSubscriptions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription)));
    });

    const unsubSurcharges = onSnapshot(qSurcharges, (snap) => {
      setSurcharges(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Surcharge)));
    });

    const unsubRequests = onSnapshot(qRequests, (snap) => {
      setRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialRequest)));
    });

    // Fetch static services
    const fetchServices = async () => {
      const snap = await getDocs(collection(db, 'paidServices'));
      if (snap.empty) {
        // Seed some services if none exist
        const initialServices: Omit<PaidService, 'id'>[] = [
          { name: 'Official Transcript', description: 'Certified academic record', amount: 50, category: 'academic' },
          { name: 'ID Replacement', description: 'Replacement for lost student ID', amount: 25, category: 'administrative' },
          { name: 'Gym Membership', description: 'Monthly access to campus gym', amount: 30, category: 'facility' },
          { name: 'Library Late Fee', description: 'Standard penalty for late returns', amount: 10, category: 'academic' },
        ];
        for (const s of initialServices) {
          await addDoc(collection(db, 'paidServices'), s);
        }
      } else {
        setServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaidService)));
      }
    };
    fetchServices();

    if (isFinanceAdmin) {
      const fetchStudents = async () => {
        // Limit the initial list for the aging table to top 10 to avoid performance issues
        const q = query(collection(db, 'users'), where('role', '==', 'student'), limit(10));
        const snap = await getDocs(q);
        const studentList = snap.docs.map(doc => ({ uid: doc.id, displayName: doc.data().displayName, tuition: doc.data().tuition || 5000 }));
        setStudents(studentList);
        return studentList;
      };
      
      const calculateAdminStats = async () => {
        // For stats, we still need counts, but we can use getCountFromServer for some
        const studentSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
        const studentList = studentSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any));
        
        const transSnap = await getDocs(collection(db, 'transactions'));
        const allTransactions = transSnap.docs.map(doc => doc.data() as Transaction);
        
        const today = new Date().toISOString().split('T')[0];
        const dailyIncome = allTransactions
          .filter(tx => {
            if (!tx.date || tx.status !== 'completed') return false;
            const dateStr = typeof tx.date === 'string' ? tx.date : (tx.date as any).toDate?.().toISOString() || new Date(tx.date).toISOString();
            return dateStr.startsWith(today);
          })
          .reduce((acc, tx) => acc + tx.amount, 0);
          
        const totalCollected = allTransactions
          .filter(tx => tx.status === 'completed' && (tx.type === 'tuition' || tx.type === 'fee'))
          .reduce((acc, tx) => acc + tx.amount, 0);
          
        const totalExpected = studentList.reduce((acc, s) => acc + (s.tuition || 5000), 0);
        const totalCommitments = totalExpected - totalCollected;
        const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
        
        const surchargeIncome = allTransactions
          .filter(tx => tx.status === 'completed' && tx.type === 'surcharge')
          .reduce((acc, tx) => acc + tx.amount, 0);
          
        setAdminStats({
          dailyIncome,
          totalCommitments,
          collectionRate,
          surchargeIncome,
          totalExpected,
          totalCollected
        });
      };

      fetchStudents();
      calculateAdminStats();
    }

    return () => {
      unsubTransactions();
      unsubScholarships();
      unsubSubscriptions();
      unsubSurcharges();
      unsubRequests();
    };
  }, [profile, isFinanceAdmin]);

  const reportsData = React.useMemo(() => {
    if (!transactions.length) return { monthly: [], daily: [], collection: [] };

    const monthlyMap: Record<string, number> = {};
    const dailyMap: Record<string, number> = {};
    
    transactions.forEach(tx => {
      if (tx.status !== 'completed') return;
      const date = new Date(typeof tx.date === 'string' ? tx.date : (tx.date as any).toDate?.() || tx.date);
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      const dayKey = date.toISOString().split('T')[0];
      
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + tx.amount;
      dailyMap[dayKey] = (dailyMap[dayKey] || 0) + tx.amount;
    });

    const monthly = Object.entries(monthlyMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const dateA = new Date(a.name);
        const dateB = new Date(b.name);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(-6);

    const daily = Object.entries(dailyMap)
      .map(([name, value]) => ({ name, value }))
      .sort()
      .slice(-7);
    
    const collection = [
      { name: 'Collected', value: adminStats.totalCollected },
      { name: 'Outstanding', value: adminStats.totalCommitments }
    ];

    return { monthly, daily, collection };
  }, [transactions, adminStats]);

  const handlePayment = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const studentId = isFinanceAdmin ? selectedStudentId : profile.uid;
      const studentName = isFinanceAdmin ? selectedStudentName : profile.displayName;

      if (!studentId) throw new Error('Please select a student');

      await addDoc(collection(db, 'transactions'), {
        studentId,
        studentName,
        amount: paymentAmount,
        type: paymentType,
        method: isFinanceAdmin ? paymentMethod : 'online',
        status: 'completed',
        description: paymentDescription || `${paymentType.charAt(0).toUpperCase() + paymentType.slice(1)} Payment`,
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
      setIsPaymentModalOpen(false);
      setIsSuccessModalOpen(true);
      setSelectedStudentId('');
      setSelectedStudentName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'financialRequests'), {
        studentId: profile.uid,
        studentName: profile.displayName,
        type: requestType,
        amount: requestAmount,
        reason: requestReason,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsRequestModalOpen(false);
      setRequestReason('');
      setRequestAmount(0);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'financialRequests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeStudentId || chargeAmount <= 0 || !chargeDescription) return;
    setLoading(true);
    try {
      const student = students.find(s => s.uid === chargeStudentId);
      await addDoc(collection(db, 'surcharges'), {
        studentId: chargeStudentId,
        studentName: student?.displayName || 'Unknown',
        amount: chargeAmount,
        reason: `${chargeType.toUpperCase()}: ${chargeDescription}`,
        date: new Date().toISOString(),
        status: 'unpaid',
        createdAt: serverTimestamp()
      });
      setIsChargeModalOpen(false);
      setChargeAmount(0);
      setChargeDescription('');
      setChargeStudentId('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'surcharges');
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: FinancialRequest['status']) => {
    try {
      await updateDoc(doc(db, 'financialRequests', requestId), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'financialRequests');
    }
  };

  const totalPaid = transactions
    .filter(tx => tx.status === 'completed' && tx.type === 'tuition')
    .reduce((acc, tx) => acc + tx.amount, 0);
  
  const totalTuition = profile?.tuition || 5000;
  const pendingDues = totalTuition - totalPaid;

  const unpaidSurcharges = surcharges
    .filter(s => s.status === 'unpaid')
    .reduce((acc, s) => acc + s.amount, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finance & Payments</h1>
          <p className="text-slate-500 mt-1">Manage all financial aspects of your academic journey</p>
        </div>
        <div className="flex items-center gap-3">
          {isFinanceAdmin && (
            <button 
              onClick={() => setIsChargeModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all"
            >
              <Zap className="w-5 h-5" />
              <span>Charge Student</span>
            </button>
          )}
          <button 
            onClick={() => setIsRequestModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all"
          >
            <FileText className="w-5 h-5" />
            <span>New Request</span>
          </button>
          <button 
            onClick={() => {
              setPaymentType('tuition');
              setPaymentAmount(isFinanceAdmin ? 0 : Math.max(0, pendingDues));
              setIsPaymentModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            <span>{isFinanceAdmin ? 'Record Payment' : 'Make Payment'}</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isFinanceAdmin ? (
          <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-emerald-600 rounded-xl text-white">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daily Income</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">LYD {adminStats.dailyIncome.toLocaleString()}</h3>
                <p className="text-emerald-600 text-sm font-bold mt-1">Today's Collections</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-red-600 rounded-xl text-white">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Commitments</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">LYD {adminStats.totalCommitments.toLocaleString()}</h3>
                <p className="text-red-600 text-sm font-bold mt-1">Outstanding Student Dues</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-blue-600 rounded-xl text-white">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Collection Rate</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{adminStats.collectionRate}%</h3>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-600 h-full transition-all" style={{ width: `${adminStats.collectionRate}%` }} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-amber-600 rounded-xl text-white">
                  <Wallet className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Surcharge Revenue</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">LYD {adminStats.surchargeIncome.toLocaleString()}</h3>
                <p className="text-amber-600 text-sm font-bold mt-1">Collected Penalties</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-blue-600 rounded-xl text-white">
                  <Wallet className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tuition Paid</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">LYD {totalPaid.toLocaleString()}</h3>
                <p className="text-emerald-600 text-sm font-bold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {Math.round((totalPaid / totalTuition) * 100)}% Complete
                </p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-amber-600 rounded-xl text-white">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Dues</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">LYD {Math.max(0, pendingDues).toLocaleString()}</h3>
                <p className="text-slate-400 text-sm mt-1">Next installment: Oct 15</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-red-600 rounded-xl text-white">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Surcharges</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">LYD {unpaidSurcharges.toLocaleString()}</h3>
                <p className="text-red-600 text-sm font-bold mt-1">
                  {surcharges.filter(s => s.status === 'unpaid').length} Unpaid items
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-purple-600 rounded-xl text-white">
                  <Award className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scholarship</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {scholarships.length > 0 ? `${scholarships[0].amount.toLocaleString()} LYD` : 'None'}
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  {scholarships.length > 0 ? scholarships[0].name : 'Apply for aid'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {isFinanceAdmin && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Financial Commitment Aging</h3>
              <p className="text-sm text-slate-500">Breakdown of outstanding fees by student</p>
            </div>
            <History className="w-5 h-5 text-blue-500" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-3">Student Name</th>
                  <th className="pb-3">Total Expected</th>
                  <th className="pb-3">Total Paid</th>
                  <th className="pb-3">Outstanding</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.slice(0, 10).map((student, i) => {
                  const studentPaid = transactions
                    .filter(tx => tx.studentId === student.uid && tx.status === 'completed')
                    .reduce((acc, tx) => acc + tx.amount, 0);
                  const outstanding = (student.tuition || 5000) - studentPaid;
                  return (
                    <tr key={i} className="group hover:bg-slate-50/50 transition-all">
                      <td className="py-4 font-bold text-slate-900">{student.displayName}</td>
                      <td className="py-4 text-slate-600">LYD {student.tuition?.toLocaleString()}</td>
                      <td className="py-4 text-emerald-600 font-bold">LYD {studentPaid.toLocaleString()}</td>
                      <td className="py-4 text-red-600 font-bold">LYD {outstanding.toLocaleString()}</td>
                      <td className="py-4 text-right">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-full uppercase",
                          outstanding <= 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {outstanding <= 0 ? 'Settled' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-full overflow-x-auto no-scrollbar">
        {[
          { id: 'status', label: 'Financial Status', icon: History },
          { id: 'payments', label: 'Payment History', icon: CreditCard },
          { id: 'services', label: 'Service Charges', icon: Zap },
          { id: 'surcharges', label: 'Penalties', icon: AlertCircle },
          { id: 'requests', label: 'Financial Requests', icon: FileText },
          { id: 'scholarships', label: 'Scholarships', icon: Award },
          ...(isFinanceAdmin ? [{ id: 'reports', label: 'Financial Reports', icon: TrendingUp }] : []),
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap",
              activeTab === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'status' && (
            <motion.div 
              key="status"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900 text-lg">Accountant Daily Log</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Today: {new Date().toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                {transactions.filter(tx => {
                  const today = new Date().toISOString().split('T')[0];
                  const txDate = typeof tx.date === 'string' ? tx.date : (tx.date as any).toDate?.().toISOString() || new Date(tx.date).toISOString();
                  return txDate.startsWith(today) && tx.status === 'completed';
                }).length > 0 ? (
                  transactions.filter(tx => {
                    const today = new Date().toISOString().split('T')[0];
                    const txDate = typeof tx.date === 'string' ? tx.date : (tx.date as any).toDate?.().toISOString() || new Date(tx.date).toISOString();
                    return txDate.startsWith(today) && tx.status === 'completed';
                  }).map((tx) => (
                    <div key={tx.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                          <Receipt className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900">{tx.description}</h4>
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">
                              {tx.studentName}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">{tx.method?.replace('_', ' ')} • Received by Accountant</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-emerald-600">
                          + LYD {tx.amount.toFixed(2)}
                        </p>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 uppercase tracking-wider">
                          Verified
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20">
                    <History className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium text-lg">No collections recorded today</p>
                    <p className="text-slate-400 text-sm">Daily revenue will appear here as it is received</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'surcharges' && (
            <motion.div 
              key="surcharges"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <h3 className="font-bold text-slate-900 text-lg mb-6">Penalties & Surcharges</h3>
              <div className="space-y-4">
                {surcharges.length > 0 ? (
                  surcharges.map((s) => (
                    <div key={s.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-3 rounded-xl",
                          s.status === 'unpaid' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{s.reason}</h4>
                          <p className="text-sm text-slate-500">Due Date: {new Date(s.dueDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-bold text-slate-900 text-lg">LYD {s.amount}</p>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                            s.status === 'unpaid' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {s.status}
                          </span>
                        </div>
                        {s.status === 'unpaid' && (
                          <button 
                            onClick={() => {
                              setPaymentType('surcharge');
                              setPaymentAmount(s.amount);
                              setPaymentDescription(`Surcharge: ${s.reason}`);
                              if (isFinanceAdmin) {
                                setSelectedStudentId(s.studentId);
                                setSelectedStudentName(s.studentName);
                              }
                              setIsPaymentModalOpen(true);
                            }}
                            className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-all"
                          >
                            {isFinanceAdmin ? 'Record Payment' : 'Pay Now'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20">
                    <CheckCircle2 className="w-16 h-16 text-emerald-100 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No outstanding surcharges</p>
                    <p className="text-slate-400 text-sm">Your account is in good standing</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'services' && (
            <motion.div 
              key="services"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                  <div key={service.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Zap className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{service.category}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{service.name}</h4>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{service.description}</p>
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                      <p className="font-bold text-slate-900">LYD {service.amount}</p>
                      <button 
                        onClick={() => {
                          setPaymentType('service');
                          setPaymentAmount(service.amount);
                          setPaymentDescription(`Service: ${service.name}`);
                          setIsPaymentModalOpen(true);
                        }}
                        className="text-blue-600 text-sm font-bold hover:underline"
                      >
                        Order Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'requests' && (
            <motion.div 
              key="requests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900 text-lg">Financial Requests</h3>
                <button 
                  onClick={() => setIsRequestModalOpen(true)}
                  className="flex items-center gap-2 text-blue-600 text-sm font-bold hover:underline"
                >
                  <Plus className="w-4 h-4" /> New Request
                </button>
              </div>
              <div className="space-y-4">
                {requests.length > 0 ? (
                  requests.map((req) => (
                    <div key={req.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-3 rounded-xl",
                          req.status === 'pending' ? "bg-amber-50 text-amber-600" :
                          req.status === 'approved' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                        )}>
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900">{req.type.replace('_', ' ').toUpperCase()}</h4>
                            {isFinanceAdmin && (
                              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">
                                {req.studentName}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mt-0.5">{req.reason}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Submitted on {new Date(req.createdAt?.seconds * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          {req.amount && <p className="font-bold text-slate-900">LYD {req.amount}</p>}
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                            req.status === 'pending' ? "bg-amber-50 text-amber-600" :
                            req.status === 'approved' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                          )}>
                            {req.status}
                          </span>
                        </div>
                        {isFinanceAdmin && req.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => updateRequestStatus(req.id, 'approved')}
                              className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all"
                              title="Approve"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => updateRequestStatus(req.id, 'rejected')}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                              title="Reject"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20">
                    <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No requests found</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-lg">Financial Analytics</h3>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-500">
                    <Download className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-500">
                    <Printer className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Monthly Revenue Chart */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Monthly Revenue (Last 6 Months)
                  </h4>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportsData.monthly}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          tickFormatter={(value) => `LYD ${value}`}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f1f5f9' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Daily Income Chart */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <History className="w-5 h-5 text-emerald-600" />
                    Daily Income (Last 7 Days)
                  </h4>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={reportsData.daily}>
                        <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          tickFormatter={(value) => value.split('-').slice(1).join('/')}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12 }}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorIncome)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Collection Rate Chart */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-600" />
                    Overall Collection Rate
                  </h4>
                  <div className="h-[300px] w-full flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportsData.collection}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#e2e8f0" />
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-bold text-slate-900">{adminStats.collectionRate}%</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Collected</span>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Summary */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-600" />
                    Key Financial Metrics
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase">Total Expected</p>
                      <p className="text-lg font-bold text-slate-900 mt-1">LYD {adminStats.totalExpected.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase">Total Collected</p>
                      <p className="text-lg font-bold text-emerald-600 mt-1">LYD {adminStats.totalCollected.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase">Outstanding</p>
                      <p className="text-lg font-bold text-red-600 mt-1">LYD {adminStats.totalCommitments.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase">Surcharges</p>
                      <p className="text-lg font-bold text-amber-600 mt-1">LYD {adminStats.surchargeIncome.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'scholarships' && (
            <motion.div 
              key="scholarships"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {scholarships.length > 0 ? (
                  scholarships.map((scholarship) => (
                    <div key={scholarship.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="p-3 bg-purple-600 rounded-xl text-white">
                          <Award className="w-6 h-6" />
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                          scholarship.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {scholarship.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg">{scholarship.name}</h4>
                        <p className="text-purple-600 font-bold mt-1">LYD {scholarship.amount.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        <span className="text-xs text-slate-500">Expires: {scholarship.expiryDate}</span>
                        <button className="text-blue-600 text-xs font-bold hover:underline">Renewal Info</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-20">
                    <Award className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No scholarships found</p>
                    <button className="text-blue-600 text-sm font-bold mt-2 hover:underline">View Opportunities</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Security Banner */}
      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
        <div className="p-3 bg-blue-600 rounded-xl text-white">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-blue-900 text-lg">Financial Security & Transparency</h3>
          <p className="text-blue-700/80 mt-1 leading-relaxed">
            All transactions are encrypted and audited. Subscriptions and surcharges are automatically calculated based on university policy. 
            For any discrepancies, please submit a "Financial Inquiry" request through the Requests tab.
          </p>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={isFinanceAdmin ? 'Record Student Payment' : `Complete ${paymentType.charAt(0).toUpperCase() + paymentType.slice(1)} Payment`}
        footer={
          <>
            <button 
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handlePayment}
              disabled={loading || paymentAmount <= 0 || (isFinanceAdmin && !selectedStudentId)}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              {isFinanceAdmin ? 'Record Payment' : `Pay LYD ${paymentAmount.toLocaleString()}`}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          {isFinanceAdmin && (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">Select Student</label>
              <StudentSearch 
                selectedId={selectedStudentId}
                onSelect={(student) => {
                  setSelectedStudentId(student.uid);
                  setSelectedStudentName(student.displayName);
                }}
                placeholder="Type student name to search..."
              />
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Amount (LYD)</label>
            <input 
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              className="w-full text-3xl font-bold text-slate-900 mt-1 bg-transparent border-none focus:ring-0 p-0"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-bold text-slate-900">Payment Method</p>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'card', label: 'Bank Card', icon: CardIcon, hide: isFinanceAdmin },
                { id: 'wallet', label: 'Mobile Wallet (Sadad/Mada)', icon: Wallet, hide: isFinanceAdmin },
                { id: 'bank', label: 'Direct Bank Transfer', icon: ArrowUpRight },
                { id: 'cash', label: 'Cash Payment', icon: Wallet, show: isFinanceAdmin },
                { id: 'bank_transfer', label: 'Manual Bank Transfer', icon: ArrowUpRight, show: isFinanceAdmin },
              ].filter(m => isFinanceAdmin ? m.show !== false : m.hide !== true).map((method) => (
                <button 
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as any)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-all",
                    paymentMethod === method.id ? "bg-blue-50 border-blue-200 ring-2 ring-blue-500/10" : "bg-white border-slate-100 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <method.icon className={cn("w-5 h-5", paymentMethod === method.id ? "text-blue-600" : "text-slate-400")} />
                    <span className={cn("font-bold", paymentMethod === method.id ? "text-blue-900" : "text-slate-600")}>{method.label}</span>
                  </div>
                  {paymentMethod === method.id && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>

          {isFinanceAdmin && (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">Description / Note</label>
              <input 
                type="text"
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                placeholder="e.g., Cash payment for Q1 tuition"
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Charge Modal */}
      <Modal
        isOpen={isChargeModalOpen}
        onClose={() => setIsChargeModalOpen(false)}
        title="Charge Student Account"
        footer={
          <>
            <button 
              onClick={() => setIsChargeModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreateCharge}
              disabled={loading || !chargeStudentId || chargeAmount <= 0 || !chargeDescription}
              className="flex items-center gap-2 bg-slate-900 text-white px-8 py-2 rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Apply Charge
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Select Student</label>
            <StudentSearch 
              selectedId={chargeStudentId}
              onSelect={(student) => setChargeStudentId(student.uid)}
              placeholder="Search student to charge..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Charge Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['fee', 'surcharge', 'tuition'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setChargeType(type)}
                  className={cn(
                    "py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border",
                    chargeType === type ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Amount (LYD)</label>
            <input 
              type="number"
              required
              min="1"
              value={chargeAmount}
              onChange={(e) => setChargeAmount(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Description / Reason</label>
            <textarea 
              required
              value={chargeDescription}
              onChange={(e) => setChargeDescription(e.target.value)}
              placeholder="e.g. Library Fine, ID Replacement, Lab Fee..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all min-h-[100px]"
            />
          </div>
        </div>
      </Modal>

      {/* Request Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Submit Financial Request"
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
              disabled={loading || !requestReason}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Submit Request
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Request Type</label>
            <select 
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            >
              <option value="refund">Refund Request</option>
              <option value="scholarship_app">Scholarship Application</option>
              <option value="installment_plan">Installment Plan Request</option>
              <option value="waiver">Fee Waiver Request</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Amount (Optional)</label>
            <input 
              type="number"
              value={requestAmount}
              onChange={(e) => setRequestAmount(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Reason / Description</label>
            <textarea 
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
              placeholder="Explain your request in detail..."
            />
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Transaction Successful"
      >
        <div className="text-center py-6">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Payment Confirmed</h3>
          <p className="text-slate-500 mt-2">
            Your payment has been processed successfully. Your balance and transaction history have been updated.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <button 
              onClick={() => setIsSuccessModalOpen(false)}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
            >
              Close
            </button>
            <button className="w-full flex items-center justify-center gap-2 text-blue-600 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all">
              <Printer className="w-5 h-5" />
              Print Receipt
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
