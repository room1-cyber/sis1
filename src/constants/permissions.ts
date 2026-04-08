export type Permission = 
  // Student specific
  | 'read_profile'
  | 'update_profile_contact'
  | 'read_own_master_data'
  | 'read_course_catalog'
  | 'create_registration'
  | 'update_registration'
  | 'read_own_timetable'
  | 'export_own_timetable'
  | 'read_own_exam_schedule'
  | 'read_own_grades'
  | 'read_unofficial_transcript'
  | 'export_unofficial_transcript'
  | 'request_official_transcript'
  | 'read_degree_audit'
  | 'read_what_if_analysis'
  | 'read_own_attendance'
  | 'read_fees_payments'
  | 'create_payment'
  | 'create_scholarship_app'
  | 'read_scholarship_app'
  | 'read_own_holds'
  | 'create_graduation_app'
  | 'create_grade_appeal'
  | 'read_messages'
  | 'create_messages'
  | 'export_kiosk_printing'
  
  // Registrar specific
  | 'manage_academic_calendar'
  | 'manage_students_full'
  | 'manage_programs_curriculum'
  | 'manage_courses_full'
  | 'manage_registration_full'
  | 'approve_grade_posting'
  | 'approve_grade_change'
  | 'manage_official_transcripts'
  | 'manage_graduation_full'
  | 'execute_year_rollover'
  | 'update_term_freeze'
  | 'approve_transfer_credit'
  | 'manage_holds_full'
  | 'read_audit_logs'
  | 'export_audit_logs'
  | 'manage_reports_full'
  | 'export_reports'
  | 'export_ministry_data'
  | 'manage_diplomas'
  | 'read_financial_data'
  
  // Existing/General
  | 'view_dashboard'
  | 'manage_users'
  | 'manage_students'
  | 'manage_lecturers'
  | 'manage_courses'
  | 'manage_enrollments'
  | 'manage_timetable'
  | 'manage_exams'
  | 'manage_facilities'
  | 'manage_finance'
  | 'manage_library'
  | 'view_own_grades'
  | 'view_own_timetable'
  | 'request_enrollment'
  | 'submit_grades'
  | 'view_department_data'
  | 'manage_department_timetable'
  | 'manage_department_enrollments'
  | 'manage_department_facilities'
  | 'access_it_support'
  | 'view_reports';

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: [
    'view_dashboard', 'manage_users', 'manage_students', 'manage_lecturers', 
    'manage_courses', 'manage_enrollments', 'manage_timetable', 'manage_exams', 
    'manage_facilities', 'manage_finance', 'manage_library', 'view_reports', 'access_it_support',
    'manage_academic_calendar', 'manage_students_full', 'manage_programs_curriculum', 
    'manage_courses_full', 'manage_registration_full', 'approve_grade_posting', 
    'approve_grade_change', 'manage_official_transcripts', 'manage_graduation_full', 
    'execute_year_rollover', 'update_term_freeze', 'approve_transfer_credit', 
    'manage_holds_full', 'read_audit_logs', 'export_audit_logs', 'manage_reports_full', 
    'export_reports', 'export_ministry_data', 'manage_diplomas', 'read_financial_data'
  ],
  it_support: ['view_dashboard', 'access_it_support', 'manage_users', 'read_audit_logs'],
  registrar: [
    'view_dashboard', 'manage_students', 'manage_courses', 'manage_enrollments', 
    'manage_timetable', 'manage_exams', 'view_reports',
    'manage_students_full', 'manage_registration_full', 'approve_grade_posting', 
    'approve_grade_change', 'manage_official_transcripts', 'manage_graduation_full', 
    'approve_transfer_credit', 'manage_holds_full', 'export_reports', 
    'export_ministry_data', 'manage_diplomas', 'read_financial_data'
  ],
  admissions: [
    'view_dashboard', 'manage_students', 'manage_enrollments', 'view_reports',
    'manage_registration_full'
  ],
  dept_admin: [
    'view_dashboard', 'view_department_data', 'manage_department_timetable', 
    'manage_department_enrollments', 'manage_department_facilities', 'manage_students', 
    'manage_lecturers', 'view_reports'
  ],
  faculty_admin: [
    'view_dashboard', 'view_department_data', 'manage_department_timetable', 
    'manage_department_enrollments', 'manage_department_facilities', 'manage_students', 
    'manage_lecturers', 'view_reports'
  ],
  lecturer: [
    'view_dashboard', 'view_own_timetable', 'submit_grades', 'view_department_data'
  ],
  advisor: [
    'view_dashboard', 'view_own_timetable', 'read_profile', 'read_own_master_data'
  ],
  student: [
    'view_dashboard', 'view_own_timetable', 'view_own_grades', 'request_enrollment',
    'read_profile', 'update_profile_contact', 'read_own_master_data', 'read_course_catalog', 
    'create_registration', 'update_registration', 'read_own_timetable', 'export_own_timetable', 
    'read_own_exam_schedule', 'read_own_grades', 'read_unofficial_transcript', 
    'export_unofficial_transcript', 'request_official_transcript', 'read_degree_audit', 
    'read_what_if_analysis', 'read_own_attendance', 'read_fees_payments', 'create_payment', 
    'create_scholarship_app', 'read_scholarship_app', 'read_own_holds', 'create_graduation_app', 
    'create_grade_appeal', 'read_messages', 'create_messages', 'export_kiosk_printing'
  ],
  finance: ['view_dashboard', 'manage_finance', 'view_reports', 'read_financial_data'],
  library: ['view_dashboard', 'manage_library'],
  facilities: ['view_dashboard', 'manage_facilities'],
  timetable: ['view_dashboard', 'manage_timetable', 'manage_exams'],
  invigilator: ['view_dashboard', 'manage_exams'],
};
