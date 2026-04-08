import React from 'react';
import { 
  UserPlus, 
  Users, 
  BookOpen, 
  Award, 
  ArrowLeftRight, 
  Folder,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useTranslation } from '../hooks/useTranslation';

export default function Registrar() {
  const { t } = useTranslation();

  const units = [
    {
      title: t('admissions'),
      description: "Manage new student applications, entrance exams, and initial registration.",
      icon: UserPlus,
      to: "/admissions",
      color: "bg-blue-600",
      stats: "145 New Apps",
      status: "Active Cycle"
    },
    {
      title: "Student Records",
      description: "Maintain official student files, personal data, and academic history.",
      icon: Users,
      to: "/students",
      color: "bg-emerald-600",
      stats: "2,450 Students",
      status: "Verified"
    },
    {
      title: "Enrollment & Registration",
      description: "Handle course registrations, add/drop requests, and semester enrollments.",
      icon: BookOpen,
      to: "/enrollment",
      color: "bg-amber-600",
      stats: "1,200 Enrolled",
      status: "Open"
    },
    {
      title: "Transfers & Equivalence",
      description: "Process internal and external student transfers and credit evaluations.",
      icon: ArrowLeftRight,
      to: "/transfers",
      color: "bg-purple-600",
      stats: "12 Pending",
      status: "Reviewing"
    },
    {
      title: "Graduation & Alumni",
      description: "Verify graduation requirements, issue degrees, and manage alumni records.",
      icon: Award,
      to: "/graduation",
      color: "bg-rose-600",
      stats: "85 Candidates",
      status: "Final Audit"
    },
    {
      title: "Document Services",
      description: "Issue official transcripts, enrollment certificates, and ID cards.",
      icon: Folder,
      to: "/documents",
      color: "bg-slate-600",
      stats: "45 Requests",
      status: "Processing"
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('registrar')}</h1>
          <p className="text-slate-500 mt-1">Central management for all academic administrative units</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-bold uppercase tracking-wider">System Operational</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {units.map((unit, index) => (
          <motion.div
            key={unit.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link 
              to={unit.to}
              className="group block bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-200 transition-all h-full"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn("p-3 rounded-xl text-white shadow-lg", unit.color)}>
                  <unit.icon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</span>
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-full">{unit.status}</span>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">{unit.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">{unit.description}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-bold text-slate-600">{unit.stats}</span>
                </div>
                <div className="flex items-center gap-1 text-blue-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                  <span>Manage</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 text-lg mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Recent Registrar Activity
          </h3>
          <div className="space-y-4">
            {[
              { action: "New Application Approved", user: "Ahmed Ali", time: "2 hours ago", unit: "Admissions" },
              { action: "Transcript Issued", user: "Sara Mohamed", time: "3 hours ago", unit: "Documents" },
              { action: "Course Registration Finalized", user: "Omar Khalid", time: "5 hours ago", unit: "Enrollment" },
              { action: "Transfer Credits Evaluated", user: "Laila Hassan", time: "Yesterday", unit: "Transfers" },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{activity.action}</p>
                    <p className="text-xs text-slate-500">{activity.user} • {activity.unit}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 text-lg mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Pending Tasks
          </h3>
          <div className="space-y-4">
            {[
              { task: "Review 12 Transfer Applications", priority: "High", deadline: "Today" },
              { task: "Audit Graduation Candidates", priority: "Medium", deadline: "Friday" },
              { task: "Verify 45 New Student IDs", priority: "Low", deadline: "Next Week" },
            ].map((task, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-1 h-10 rounded-full",
                    task.priority === 'High' ? "bg-red-500" : task.priority === 'Medium' ? "bg-amber-500" : "bg-blue-500"
                  )} />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{task.task}</p>
                    <p className="text-xs text-slate-500">Priority: {task.priority}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Deadline</p>
                  <p className="text-xs font-bold text-slate-900">{task.deadline}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
