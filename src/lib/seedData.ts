import { db } from '../firebase';
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp,
  getDocs,
  query,
  limit
} from 'firebase/firestore';
import { calculateAcademicStanding } from './academicUtils';

export const seedTrialData = async (adminUid?: string) => {
  const batch = writeBatch(db);

  // 1. Faculties
  const faculties = [
    { id: 'fac_eng', name: 'Faculty of Engineering', code: 'ENG' },
    { id: 'fac_bus', name: 'Faculty of Business', code: 'BUS' },
    { id: 'fac_sci', name: 'Faculty of Science', code: 'SCI' },
    { id: 'fac_med', name: 'Faculty of Medicine', code: 'MED' },
    { id: 'fac_art', name: 'Faculty of Arts & Humanities', code: 'ART' },
  ];

  faculties.forEach(f => {
    batch.set(doc(db, 'faculties', f.id), { ...f, createdAt: serverTimestamp() });
  });

  // 2. Departments
  const departments = [
    { id: 'dept_cs', facultyId: 'fac_eng', name: 'Computer Science', code: 'CS' },
    { id: 'dept_me', facultyId: 'fac_eng', name: 'Mechanical Engineering', code: 'ME' },
    { id: 'dept_ee', facultyId: 'fac_eng', name: 'Electrical Engineering', code: 'EE' },
    { id: 'dept_acc', facultyId: 'fac_bus', name: 'Accounting', code: 'ACC' },
    { id: 'dept_mkt', facultyId: 'fac_bus', name: 'Marketing', code: 'MKT' },
    { id: 'dept_fin', facultyId: 'fac_bus', name: 'Finance', code: 'FIN' },
    { id: 'dept_bio', facultyId: 'fac_sci', name: 'Biology', code: 'BIO' },
    { id: 'dept_phy', facultyId: 'fac_sci', name: 'Physics', code: 'PHY' },
    { id: 'dept_gen', facultyId: 'fac_med', name: 'General Medicine', code: 'GEN' },
    { id: 'dept_his', facultyId: 'fac_art', name: 'History', code: 'HIS' },
  ];

  departments.forEach(d => {
    batch.set(doc(db, 'departments', d.id), { ...d, createdAt: serverTimestamp() });
  });

  // 3. Programs
  const programs = [
    { id: 'prog_bcs', departmentId: 'dept_cs', name: 'B.Sc. in Computer Science', code: 'BCS', degreeLevel: 'bachelor', durationSemesters: 8, totalCredits: 120 },
    { id: 'prog_bme', departmentId: 'dept_me', name: 'B.Eng. in Mechanical Engineering', code: 'BME', degreeLevel: 'bachelor', durationSemesters: 8, totalCredits: 130 },
    { id: 'prog_bacc', departmentId: 'dept_acc', name: 'Bachelor of Accounting', code: 'BACC', degreeLevel: 'bachelor', durationSemesters: 6, totalCredits: 90 },
    { id: 'prog_mfin', departmentId: 'dept_fin', name: 'Master of Finance', code: 'MFIN', degreeLevel: 'master', durationSemesters: 4, totalCredits: 48 },
    { id: 'prog_mbbs', departmentId: 'dept_gen', name: 'Bachelor of Medicine & Surgery', code: 'MBBS', degreeLevel: 'bachelor', durationSemesters: 12, totalCredits: 250 },
  ];

  programs.forEach(p => {
    batch.set(doc(db, 'programs', p.id), { ...p, createdAt: serverTimestamp() });
  });

  // 4. Courses
  const courses = [
    { id: 'crs_cs101', code: 'CS101', title: 'Introduction to Programming', credits: 3, department: 'dept_cs', description: 'Basics of programming using Python.', prerequisites: [] },
    { id: 'crs_cs102', code: 'CS102', title: 'Data Structures', credits: 4, department: 'dept_cs', description: 'Fundamental data structures and algorithms.', prerequisites: ['crs_cs101'] },
    { id: 'crs_cs201', code: 'CS201', title: 'Database Systems', credits: 3, department: 'dept_cs', description: 'Relational databases and SQL.', prerequisites: ['crs_cs102'] },
    { id: 'crs_math101', code: 'MATH101', title: 'Calculus I', credits: 3, department: 'dept_phy', description: 'Differential and integral calculus.', prerequisites: [] },
    { id: 'crs_math102', code: 'MATH102', title: 'Linear Algebra', credits: 3, department: 'dept_phy', description: 'Vectors, matrices, and linear transformations.', prerequisites: [] },
    { id: 'crs_acc101', code: 'ACC101', title: 'Financial Accounting', credits: 3, department: 'dept_acc', description: 'Principles of financial accounting.', prerequisites: [] },
    { id: 'crs_acc201', code: 'ACC201', title: 'Managerial Accounting', credits: 3, department: 'dept_acc', description: 'Accounting for decision making.', prerequisites: ['crs_acc101'] },
    { id: 'crs_bio101', code: 'BIO101', title: 'General Biology', credits: 4, department: 'dept_bio', description: 'Introduction to biological sciences.', prerequisites: [] },
    { id: 'crs_med101', code: 'MED101', title: 'Human Anatomy', credits: 5, department: 'dept_gen', description: 'Study of human body structure.', prerequisites: [] },
    { id: 'crs_his101', code: 'HIS101', title: 'World History', credits: 3, department: 'dept_his', description: 'Major events in world history.', prerequisites: [] },
  ];

  courses.forEach(c => {
    batch.set(doc(db, 'courses', c.id), { ...c, createdAt: serverTimestamp(), status: 'active' });
  });

  // 5. Buildings & Rooms
  const buildings = [
    { id: 'bld_eng', name: 'Engineering Block', code: 'ENG-01', floors: 4, roomsCount: 45, status: 'operational' },
    { id: 'bld_bus', name: 'Business School', code: 'BUS-01', floors: 3, roomsCount: 30, status: 'operational' },
    { id: 'bld_sci', name: 'Science Labs', code: 'SCI-01', floors: 5, roomsCount: 60, status: 'operational' },
    { id: 'bld_med', name: 'Medical Center', code: 'MED-01', floors: 6, roomsCount: 120, status: 'operational' },
    { id: 'bld_lib', name: 'Main Library', code: 'LIB-01', floors: 3, roomsCount: 12, status: 'operational' },
  ];

  buildings.forEach(b => {
    batch.set(doc(db, 'buildings', b.id), { ...b, createdAt: serverTimestamp() });
  });

  const rooms = [
    { id: 'rm_eng_101', buildingId: 'bld_eng', code: '101', type: 'Lecture Hall', capacity: 120, equipment: ['Projector', 'AC'], status: 'available' },
    { id: 'rm_eng_102', buildingId: 'bld_eng', code: '102', type: 'Computer Lab', capacity: 40, equipment: ['PCs', 'Projector', 'AC'], status: 'available' },
    { id: 'rm_bus_201', buildingId: 'bld_bus', code: '201', type: 'Seminar Room', capacity: 30, equipment: ['Smart Board', 'AC'], status: 'available' },
    { id: 'rm_sci_301', buildingId: 'bld_sci', code: '301', type: 'Lab', capacity: 25, equipment: ['Microscopes', 'AC'], status: 'available' },
    { id: 'rm_med_401', buildingId: 'bld_med', code: '401', type: 'Lecture Hall', capacity: 200, equipment: ['Projector', 'Sound System', 'AC'], status: 'available' },
  ];

  rooms.forEach(r => {
    batch.set(doc(db, 'rooms', r.id), { ...r, createdAt: serverTimestamp() });
  });

  // 6. Lecturers
  const lecturers = [
    { uid: 'lec_1', email: 'turing@university.edu', displayName: 'Dr. Alan Turing', role: 'lecturer', status: 'active', facultyId: 'fac_eng', departmentId: 'dept_cs' },
    { uid: 'lec_2', email: 'pacioli@university.edu', displayName: 'Prof. Luca Pacioli', role: 'lecturer', status: 'active', facultyId: 'fac_bus', departmentId: 'dept_acc' },
    { uid: 'lec_3', email: 'curie@university.edu', displayName: 'Dr. Marie Curie', role: 'lecturer', status: 'active', facultyId: 'fac_sci', departmentId: 'dept_phy' },
    { uid: 'lec_4', email: 'da-vinci@university.edu', displayName: 'Prof. Leonardo da Vinci', role: 'lecturer', status: 'active', facultyId: 'fac_art', departmentId: 'dept_his' },
    { uid: 'lec_5', email: 'nightingale@university.edu', displayName: 'Dr. Florence Nightingale', role: 'lecturer', status: 'active', facultyId: 'fac_med', departmentId: 'dept_gen' },
  ];

  lecturers.forEach(l => {
    batch.set(doc(db, 'users', l.uid), { ...l, createdAt: serverTimestamp() });
  });

  // 7. Offerings
  const offerings = [
    { id: 'off_cs101_s1', courseId: 'crs_cs101', termId: 'term_2024_spring', section: 'A', instructorId: 'lec_1', roomId: 'rm_eng_102', capacity: 40, enrolledCount: 5, schedule: [{ day: 'Monday', startTime: '09:00', endTime: '11:00' }] },
    { id: 'off_cs102_s1', courseId: 'crs_cs102', termId: 'term_2024_spring', section: 'A', instructorId: 'lec_1', roomId: 'rm_eng_102', capacity: 40, enrolledCount: 3, schedule: [{ day: 'Wednesday', startTime: '09:00', endTime: '11:00' }] },
    { id: 'off_acc101_s1', courseId: 'crs_acc101', termId: 'term_2024_spring', section: 'A', instructorId: 'lec_2', roomId: 'rm_bus_201', capacity: 30, enrolledCount: 4, schedule: [{ day: 'Tuesday', startTime: '10:00', endTime: '12:00' }] },
    { id: 'off_math101_s1', courseId: 'crs_math101', termId: 'term_2024_spring', section: 'A', instructorId: 'lec_3', roomId: 'rm_eng_101', capacity: 120, enrolledCount: 10, schedule: [{ day: 'Thursday', startTime: '13:00', endTime: '15:00' }] },
    { id: 'off_med101_s1', courseId: 'crs_med101', termId: 'term_2024_spring', section: 'A', instructorId: 'lec_5', roomId: 'rm_med_401', capacity: 200, enrolledCount: 8, schedule: [{ day: 'Monday', startTime: '14:00', endTime: '17:00' }] },
  ];

  offerings.forEach(o => {
    batch.set(doc(db, 'offerings', o.id), { ...o, createdAt: serverTimestamp() });
  });

  // 8. Students
  const studentNames = [
    'Ahmed Mansour', 'Fatima Al-Zahra', 'Mohammed Ali', 'Sarah Idris', 'Omar Mukhtar',
    'Laila Khalid', 'Youssef Hassan', 'Nora Salem', 'Ibrahim Bashir', 'Zainab Ahmed',
    'Mustafa Kamal', 'Hala Mahmoud', 'Tarek Aziz', 'Rania Fawzi', 'Khaled Walid',
    'Amira Saeed', 'Sami Yusuf', 'Dina Mourad', 'Adel Imam', 'Salma Hayek'
  ];

  const students = studentNames.map((name, i) => {
    const gpa = (2.5 + (i * 0.07));
    return {
      uid: `std_${i + 1}`,
      email: `student${i + 1}@university.edu`,
      displayName: name,
      nationalId: `NID-${1000 + i}`,
      nationality: i % 4 === 0 ? 'International' : 'Local',
      dateOfBirth: `200${2 + (i % 4)}-0${1 + (i % 9)}-${10 + i}`,
      gender: i % 2 === 0 ? 'male' : 'female',
      currentProgramId: i % 3 === 0 ? 'prog_bcs' : (i % 3 === 1 ? 'prog_bacc' : 'prog_mbbs'),
      status: 'active',
      academicStanding: calculateAcademicStanding(gpa),
      academicHistory: [
        { semester: 'Fall 2023', gpa: gpa.toFixed(2) }
      ]
    };
  });

  students.forEach(s => {
    batch.set(doc(db, 'students', s.uid), { ...s, createdAt: serverTimestamp() });
    batch.set(doc(db, 'users', s.uid), {
      uid: s.uid,
      email: s.email,
      displayName: s.displayName,
      role: 'student',
      status: 'active',
      createdAt: serverTimestamp()
    });
  });

  // 9. Enrollments
  const enrollments = [];
  students.forEach((s, i) => {
    // Each student enrolled in 3-4 courses
    const allOffIds = ['off_cs101_s1', 'off_cs102_s1', 'off_acc101_s1', 'off_math101_s1', 'off_med101_s1'];
    const count = 3 + (i % 2);
    const offIds = allOffIds.slice(0, count);
    
    offIds.forEach((oid, j) => {
      enrollments.push({
        id: `enr_${s.uid}_${j}`,
        studentId: s.uid,
        offeringId: oid,
        status: 'enrolled',
        grade: i > 10 ? (j === 0 ? 'A' : 'B+') : 'Pending',
        gpaPoints: i > 10 ? (j === 0 ? 4.0 : 3.5) : 0
      });
    });
  });

  enrollments.forEach(e => {
    batch.set(doc(db, 'enrollments', e.id), { ...e, createdAt: serverTimestamp() });
  });

  // 10. Finance Transactions
  const transactions = [];
  students.forEach((s, i) => {
    // Tuition
    transactions.push({
      id: `trx_${s.uid}_tuition`,
      studentId: s.uid,
      amount: 5000,
      type: 'tuition',
      method: i % 2 === 0 ? 'bank_transfer' : 'online',
      status: i % 5 === 0 ? 'pending' : 'completed',
      description: 'Spring 2024 Tuition',
      date: serverTimestamp()
    });
    // Fees
    if (i % 3 === 0) {
      transactions.push({
        id: `trx_${s.uid}_fee`,
        studentId: s.uid,
        amount: 150,
        type: 'fee',
        method: 'cash',
        status: 'completed',
        description: 'Lab Usage Fee',
        date: serverTimestamp()
      });
    }
  });

  transactions.forEach(t => {
    batch.set(doc(db, 'transactions', t.id), { ...t });
  });

  // 11. Scholarships
  const scholarships = [
    { id: 'sch_1', studentId: 'std_1', name: 'Merit Scholarship', amount: 2500, status: 'active', expiryDate: '2025-06-30' },
    { id: 'sch_2', studentId: 'std_3', name: 'Financial Aid', amount: 1500, status: 'active', expiryDate: '2024-12-31' },
    { id: 'sch_3', studentId: 'std_7', name: 'Sports Excellence', amount: 1000, status: 'active', expiryDate: '2025-06-30' },
  ];

  scholarships.forEach(s => {
    batch.set(doc(db, 'scholarships', s.id), { ...s, createdAt: serverTimestamp() });
  });

  // 12. Calendar Events
  const calendarEvents = [
    { id: 'cal_1', title: 'Spring Registration Starts', date: '2024-01-15', type: 'academic', status: 'past' },
    { id: 'cal_2', title: 'Classes Begin', date: '2024-02-01', type: 'academic', status: 'past' },
    { id: 'cal_3', title: 'Midterm Exams Week', date: '2024-04-10', type: 'exam', status: 'upcoming' },
    { id: 'cal_4', title: 'Eid Al-Fitr Holiday', date: '2024-04-10', type: 'national', status: 'upcoming' },
    { id: 'cal_5', title: 'Final Project Deadline', date: '2024-05-20', type: 'deadline', status: 'upcoming' },
    { id: 'cal_6', title: 'Final Exams Start', date: '2024-06-01', type: 'exam', status: 'upcoming' },
  ];

  calendarEvents.forEach(e => {
    batch.set(doc(db, 'calendarEvents', e.id), { ...e, createdAt: serverTimestamp() });
  });

  // 13. Library Books
  const libraryBooks = [
    { id: 'bk_1', title: 'Clean Code', author: 'Robert C. Martin', category: 'CS', available: true, isbn: '978-0132350884' },
    { id: 'bk_2', title: 'The Pragmatic Programmer', author: 'Andrew Hunt', category: 'CS', available: true, isbn: '978-0201616224' },
    { id: 'bk_3', title: 'Principles of Economics', author: 'N. Gregory Mankiw', category: 'Business', available: false, isbn: '978-1305155916' },
    { id: 'bk_4', title: 'Gray\'s Anatomy', author: 'Henry Gray', category: 'Medicine', available: true, isbn: '978-0443066672' },
    { id: 'bk_5', title: 'A Brief History of Time', author: 'Stephen Hawking', category: 'Science', available: true, isbn: '978-0553380163' },
    { id: 'bk_6', title: 'Design Patterns', author: 'Erich Gamma', category: 'CS', available: true, isbn: '978-0201633610' },
    { id: 'bk_7', title: 'The Wealth of Nations', author: 'Adam Smith', category: 'Business', available: true, isbn: '978-0553585971' },
    { id: 'bk_8', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', category: 'Psychology', available: true, isbn: '978-0374275631' },
    { id: 'bk_9', title: 'The Art of Computer Programming', author: 'Donald Knuth', category: 'CS', available: true, isbn: '978-0201896831' },
    { id: 'bk_10', title: 'Harrison\'s Principles of Internal Medicine', author: 'Dennis Kasper', category: 'Medicine', available: true, isbn: '978-0071802154' },
  ];

  libraryBooks.forEach(b => {
    batch.set(doc(db, 'libraryBooks', b.id), { ...b, createdAt: serverTimestamp() });
  });

  // 14. Admissions Applications
  const applications = [
    { id: 'app_1', name: 'Khalid Ibrahim', program: 'Computer Science', email: 'khalid@test.com', phone: '091-1234567', highSchoolScore: 95.5, status: 'pending', date: serverTimestamp() },
    { id: 'app_2', name: 'Mona Salem', program: 'Medicine', email: 'mona@test.com', phone: '092-7654321', highSchoolScore: 98.2, status: 'approved', date: serverTimestamp() },
    { id: 'app_3', name: 'Ali Hassan', program: 'Accounting', email: 'ali@test.com', phone: '091-5554433', highSchoolScore: 88.0, status: 'rejected', date: serverTimestamp() },
  ];

  applications.forEach(a => {
    batch.set(doc(db, 'applications', a.id), { ...a });
  });

  // 15. Exams
  const exams = [
    { id: 'ex_1', courseId: 'crs_cs101', title: 'Midterm', date: '2024-04-12', startTime: '10:00', endTime: '12:00', roomId: 'rm_eng_101' },
    { id: 'ex_2', courseId: 'crs_math101', title: 'Midterm', date: '2024-04-13', startTime: '09:00', endTime: '11:00', roomId: 'rm_eng_101' },
    { id: 'ex_3', courseId: 'crs_acc101', title: 'Midterm', date: '2024-04-14', startTime: '14:00', endTime: '16:00', roomId: 'rm_bus_201' },
  ];

  exams.forEach(e => {
    batch.set(doc(db, 'examSchedules', e.id), { ...e, createdAt: serverTimestamp() });
  });

  // 16. Super Admin
  const superAdminEmail = 'room1@academy.edu.ly';
  if (adminUid) {
    batch.set(doc(db, 'users', adminUid), {
      uid: adminUid,
      email: superAdminEmail,
      displayName: 'Super Administrator',
      role: 'super_admin',
      status: 'active',
      createdAt: serverTimestamp()
    });
  }

  // 17. Notifications
  const notifications = [];
  students.forEach(s => {
    notifications.push({
      id: `not_${s.uid}_1`,
      userId: s.uid,
      title: 'Welcome to University',
      message: `Hello ${s.displayName}, welcome to the new academic portal.`,
      type: 'system',
      read: true,
      createdAt: serverTimestamp()
    });
    if (s.uid === 'std_1' || s.uid === 'std_2') {
      notifications.push({
        id: `not_${s.uid}_2`,
        userId: s.uid,
        title: 'Tuition Due',
        message: 'Please settle your Spring 2024 tuition fees.',
        type: 'finance',
        read: false,
        createdAt: serverTimestamp()
      });
    }
  });

  notifications.forEach(n => {
    batch.set(doc(db, 'notifications', n.id), { ...n });
  });

  await batch.commit();
  return { success: true, message: 'Comprehensive trial data seeded successfully' };
};
