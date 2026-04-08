import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { Permission, ROLE_PERMISSIONS } from '../constants/permissions';
import { Shield, Save, Check, X, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const ALL_PERMISSIONS: Permission[] = [
  'view_dashboard', 'manage_users', 'manage_students', 'manage_lecturers',
  'manage_courses', 'manage_enrollments', 'manage_timetable', 'manage_exams',
  'manage_facilities', 'manage_finance', 'manage_library', 'view_own_grades',
  'view_own_timetable', 'request_enrollment', 'submit_grades', 'view_department_data',
  'manage_department_timetable', 'manage_department_enrollments', 'manage_department_facilities',
  'access_it_support', 'view_reports',
  
  // Student specific
  'read_profile', 'update_profile_contact', 'read_own_master_data', 'read_course_catalog', 
  'create_registration', 'update_registration', 'read_own_timetable', 'export_own_timetable', 
  'read_own_exam_schedule', 'read_own_grades', 'read_unofficial_transcript', 
  'export_unofficial_transcript', 'request_official_transcript', 'read_degree_audit', 
  'read_what_if_analysis', 'read_own_attendance', 'read_fees_payments', 'create_payment', 
  'create_scholarship_app', 'read_scholarship_app', 'read_own_holds', 'create_graduation_app', 
  'create_grade_appeal', 'read_messages', 'create_messages', 'export_kiosk_printing',
  
  // Registrar specific
  'manage_academic_calendar', 'manage_students_full', 'manage_programs_curriculum', 
  'manage_courses_full', 'manage_registration_full', 'approve_grade_posting', 
  'approve_grade_change', 'manage_official_transcripts', 'manage_graduation_full', 
  'execute_year_rollover', 'update_term_freeze', 'approve_transfer_credit', 
  'manage_holds_full', 'read_audit_logs', 'export_audit_logs', 'manage_reports_full', 
  'export_reports', 'export_ministry_data', 'manage_diplomas', 'read_financial_data'
];

const ROLES = [
  'super_admin', 'dept_admin', 'registrar', 'lecturer', 'student',
  'advisor', 'faculty_admin', 'admissions', 'finance', 'library',
  'timetable', 'facilities', 'invigilator', 'it_support'
];

export default function Permissions() {
  const { rolePermissions, profile } = useAuth();
  const [localPermissions, setLocalPermissions] = useState<Record<string, Permission[]>>(rolePermissions);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (profile?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Shield className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm">Only super administrators can manage permissions.</p>
      </div>
    );
  }

  const togglePermission = (role: string, permission: Permission) => {
    const current = localPermissions[role] || [];
    const updated = current.includes(permission)
      ? current.filter(p => p !== permission)
      : [...current, permission];
    
    setLocalPermissions({
      ...localPermissions,
      [role]: updated
    });
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save each role's permissions to Firestore
      const promises = Object.entries(localPermissions).map(([role, perms]) => 
        setDoc(doc(db, 'rolePermissions', role), { permissions: perms })
      );
      await Promise.all(promises);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'rolePermissions');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all permissions to system defaults?')) {
      setLocalPermissions(ROLE_PERMISSIONS);
      setSuccess(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Role Permissions</h1>
          <p className="text-slate-500 mt-1">Define granular access control for each user role</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={resetToDefaults}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
          >
            Reset to Defaults
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all shadow-lg",
              success ? "bg-green-600 text-white shadow-green-200" : "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700"
            )}
          >
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (success ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />)}
            <span>{saving ? 'Saving...' : (success ? 'Saved!' : 'Save Changes')}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-4 border-b border-slate-100 text-left text-slate-900 font-bold text-sm w-48">Permission</th>
                {ROLES.map(role => (
                  <th key={role} className="p-4 border-b border-slate-100 text-center text-slate-400 font-bold text-[10px] uppercase tracking-wider border-l border-slate-100 min-w-[100px]">
                    {role.replace('_', ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map(permission => (
                <tr key={permission} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4 border-b border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{permission.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{permission}</span>
                    </div>
                  </td>
                  {ROLES.map(role => {
                    const hasPerm = (localPermissions[role] || []).includes(permission);
                    const isSuperAdmin = role === 'super_admin';
                    
                    return (
                      <td key={role} className="p-4 border-b border-slate-100 border-l border-slate-100 text-center">
                        <button
                          onClick={() => !isSuperAdmin && togglePermission(role, permission)}
                          disabled={isSuperAdmin}
                          className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center transition-all mx-auto",
                            hasPerm 
                              ? "bg-blue-600 text-white shadow-sm" 
                              : "bg-slate-100 text-slate-300 hover:bg-slate-200",
                            isSuperAdmin && "opacity-50 cursor-not-allowed bg-blue-400"
                          )}
                        >
                          {hasPerm ? <Check className="w-4 h-4" /> : <X className="w-3 h-3" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
        <div>
          <h4 className="font-bold text-blue-900">Security Note</h4>
          <p className="text-blue-700 text-sm mt-1 leading-relaxed">
            Changes to role permissions take effect immediately for all users. 
            Super Admin permissions are locked and cannot be modified to prevent accidental lockout.
            Always verify that critical roles have the necessary permissions to perform their duties.
          </p>
        </div>
      </div>
    </div>
  );
}
