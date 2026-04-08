export type UserRole = 
  | 'student' 
  | 'advisor' 
  | 'lecturer' 
  | 'dept_admin' 
  | 'faculty_admin' 
  | 'registrar' 
  | 'admissions' 
  | 'finance' 
  | 'library' 
  | 'timetable' 
  | 'facilities' 
  | 'invigilator' 
  | 'it_support' 
  | 'super_admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  facultyId?: string;
  departmentId?: string;
  department?: string;
  status: 'active' | 'suspended' | 'deactivated';
  createdAt: any;
  phoneNumber?: string;
  address?: string;
  bio?: string;
  officeHours?: string;
  emergencyContact?: string;
  photoURL?: string;
  programName?: string;
  tuition?: number;
  nationalId?: string;
}

export interface StudentRecord {
  uid: string;
  nationalId: string;
  nationality: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  currentProgramId: string;
  department?: string;
  status: 'active' | 'suspended' | 'graduated' | 'withdrawn' | 'dismissed' | 'transferred';
  academicStanding?: 'Good Standing' | 'Academic Probation' | 'Academic Suspension' | 'Dean\'s List';
  dueDate?: string;
  academicHistory?: {
    semester: string;
    gpa: number;
  }[];
}

export interface Faculty {
  id: string;
  name: string;
  code: string;
  deanId?: string;
}

export interface Department {
  id: string;
  facultyId: string;
  name: string;
  code: string;
  headId?: string;
}

export interface Program {
  id: string;
  departmentId: string;
  name: string;
  code: string;
  degreeLevel: 'bachelor' | 'master' | 'diploma';
  durationSemesters: number;
  totalCredits: number;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
  description: string;
  prerequisites: string[];
  department?: string;
  learningOutcomes?: string[];
  textbooks?: string[];
  syllabusUrl?: string;
  syllabusFileName?: string;
  status?: 'active' | 'inactive' | 'archived';
  capacity?: number;
  enrollmentCount?: number;
  termId?: string;
}

export interface Exam {
  id: string;
  courseId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  roomId: string;
  seatNumber?: string;
  studentId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface CourseOffering {
  id: string;
  courseId: string;
  termId: string;
  section: string;
  instructorId: string;
  roomId: string;
  schedule: any[];
  capacity: number;
  enrolledCount: number;
}

export interface Enrollment {
  id: string;
  studentId: string;
  offeringId: string;
  status: 'enrolled' | 'dropped' | 'withdrawn' | 'completed';
  grade?: string;
  gpaPoints?: number;
}

export interface AttendanceSession {
  id: string;
  offeringId: string;
  date: string;
  startTime: string;
  endTime: string;
  lecturerId: string;
  status: 'scheduled' | 'in_progress' | 'completed';
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  timestamp: any;
}

export interface GradeAppeal {
  id: string;
  enrollmentId: string;
  studentId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
}

export interface Transaction {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  type: 'tuition' | 'fee' | 'refund' | 'scholarship' | 'surcharge' | 'service';
  method: 'bank_transfer' | 'cash' | 'online';
  status: 'pending' | 'completed' | 'failed';
  description: string;
  date: any;
  createdAt: any;
}

export interface Subscription {
  id: string;
  studentId: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'semester' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  nextBillingDate: string;
  description: string;
}

export interface Surcharge {
  id: string;
  studentId: string;
  studentName?: string;
  amount: number;
  reason: string;
  status: 'unpaid' | 'paid' | 'waived';
  dueDate: string;
  createdAt: any;
}

export interface PaidService {
  id: string;
  name: string;
  description: string;
  amount: number;
  category: 'academic' | 'facility' | 'administrative';
}

export interface FinancialRequest {
  id: string;
  studentId: string;
  studentName: string;
  type: 'refund' | 'scholarship_app' | 'installment_plan' | 'waiver';
  amount?: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  attachments?: string[];
  createdAt: any;
  updatedAt: any;
  response?: string;
}

export interface Scholarship {
  id: string;
  studentId: string;
  name: string;
  amount: number;
  status: 'active' | 'expired' | 'revoked';
  expiryDate: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantDetails: {
    [uid: string]: {
      displayName: string;
      photoURL?: string;
      role: string;
    }
  };
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: any;
  };
  updatedAt: any;
  unreadCount?: {
    [uid: string]: number;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: any;
  readBy?: string[];
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'exam' | 'deadline' | 'finance' | 'system';
  read: boolean;
  createdAt: any;
  link?: string;
}

export interface SystemSettings {
  institutionName: string;
  websiteUrl: string;
  currentAcademicYear: string;
  activeSemester: string;
  availableTerms: string[];
  gradeScale: string;
  maintenanceMode: boolean;
  multilingualSupport: boolean;
  autoBackup: boolean;
  emailNotifications: boolean;
  smsAlerts: boolean;
  updatedAt?: any;
}
