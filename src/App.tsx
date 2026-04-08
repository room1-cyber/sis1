import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LanguageProvider, useTranslation } from './hooks/useTranslation';
import { UserRole } from './types';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import AcademicPrograms from './pages/AcademicPrograms';
import Courses from './pages/Courses';
import Lecturers from './pages/Lecturers';
import AcademicCalendar from './pages/AcademicCalendar';
import Enrollment from './pages/Enrollment';
import Finance from './pages/Finance';
import Facilities from './pages/Facilities';
import Grades from './pages/Grades';
import Attendance from './pages/Attendance';
import Admin from './pages/Admin';
import Admissions from './pages/Admissions';
import Registrar from './pages/Registrar';
import Graduation from './pages/Graduation';
import Documents from './pages/Documents';
import Reports from './pages/Reports';
import Transfers from './pages/Transfers';
import Profile from './pages/Profile';
import Timetable from './pages/Timetable';
import Library from './pages/Library';
import Permissions from './pages/Permissions';
import Messages from './pages/Messages';
import RoleSwitcher from './components/RoleSwitcher';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: import('./constants/permissions').Permission;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, requiredPermission }) => {
  const { user, profile, loading, hasPermission } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <RoleSwitcher />
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route 
                        path="/students" 
                        element={
                          <ProtectedRoute requiredPermission="manage_students">
                            <Students />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/programs" 
                        element={
                          <ProtectedRoute requiredPermission="manage_courses">
                            <AcademicPrograms />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/courses" 
                        element={
                          <ProtectedRoute requiredPermission="read_course_catalog">
                            <Courses />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/lecturers" 
                        element={
                          <ProtectedRoute requiredPermission="manage_lecturers">
                            <Lecturers />
                          </ProtectedRoute>
                        } 
                      />
                      <Route path="/calendar" element={<AcademicCalendar />} />
                      <Route 
                        path="/enrollment" 
                        element={
                          <ProtectedRoute requiredPermission="request_enrollment">
                            <Enrollment />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/finance" 
                        element={
                          <ProtectedRoute requiredPermission="manage_finance">
                            <Finance />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/facilities" 
                        element={
                          <ProtectedRoute requiredPermission="manage_facilities">
                            <Facilities />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/grades" 
                        element={
                          <ProtectedRoute requiredPermission="view_own_grades">
                            <Grades />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/attendance" 
                        element={
                          <ProtectedRoute requiredPermission="submit_grades">
                            <Attendance />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/admin" 
                        element={
                          <ProtectedRoute allowedRoles={['super_admin', 'it_support', 'registrar']}>
                            <Admin />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/admissions" 
                        element={
                          <ProtectedRoute requiredPermission="manage_registration_full">
                            <Admissions />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/registrar" 
                        element={
                          <ProtectedRoute allowedRoles={['super_admin', 'registrar']}>
                            <Registrar />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/graduation" 
                        element={
                          <ProtectedRoute requiredPermission="create_graduation_app">
                            <Graduation />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/documents" 
                        element={
                          <ProtectedRoute requiredPermission="manage_users">
                            <Documents />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/reports" 
                        element={
                          <ProtectedRoute requiredPermission="view_reports">
                            <Reports />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/transfers" 
                        element={
                          <ProtectedRoute requiredPermission="request_enrollment">
                            <Transfers />
                          </ProtectedRoute>
                        } 
                      />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/profile/:uid" element={<ProtectedRoute allowedRoles={['super_admin']}><Profile /></ProtectedRoute>} />
                      <Route 
                        path="/timetable" 
                        element={
                          <ProtectedRoute requiredPermission="view_own_timetable">
                            <Timetable />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/library" 
                        element={
                          <ProtectedRoute requiredPermission="manage_library">
                            <Library />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/permissions" 
                        element={
                          <ProtectedRoute allowedRoles={['super_admin']}>
                            <Permissions />
                          </ProtectedRoute>
                        } 
                      />
                      <Route path="/messages" element={<Messages />} />
                      {/* Add more routes as needed */}
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}
