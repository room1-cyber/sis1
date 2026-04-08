import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { 
  BookOpen, 
  Search, 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Building2,
  GraduationCap,
  Clock,
  Award,
  Printer,
  Settings,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import Modal from '../components/Modal';

export default function AcademicPrograms() {
  const { t, isRTL } = useTranslation();
  const { profile } = useAuth();
  const [faculties, setFaculties] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFaculty, setActiveFaculty] = useState<string | null>(null);
  const [activeDepartmentId, setActiveDepartmentId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCurriculumModalOpen, setIsCurriculumModalOpen] = useState(false);
  const [isEditCurriculumMode, setIsEditCurriculumMode] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newProgram, setNewProgram] = useState({
    name: '',
    code: '',
    level: 'bachelor',
    credits: 120,
    duration: 4,
    description: ''
  });

  const [newCourse, setNewCourse] = useState({
    code: '',
    title: '',
    credits: 3,
    semester: 1
  });

  const handleAddCourseToCurriculum = async () => {
    if (!selectedProgram || !newCourse.code || !newCourse.title) return;
    
    const updatedCurriculum = [...(selectedProgram.curriculum || []), newCourse];
    try {
      await updateDoc(doc(db, 'programs', selectedProgram.id), {
        curriculum: updatedCurriculum,
        updatedAt: serverTimestamp()
      });
      setSelectedProgram({ ...selectedProgram, curriculum: updatedCurriculum });
      setNewCourse({ code: '', title: '', credits: 3, semester: 1 });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'programs');
    }
  };

  const handleRemoveCourseFromCurriculum = async (courseCode: string) => {
    if (!selectedProgram) return;
    
    const updatedCurriculum = (selectedProgram.curriculum || []).filter((c: any) => c.code !== courseCode);
    try {
      await updateDoc(doc(db, 'programs', selectedProgram.id), {
        curriculum: updatedCurriculum,
        updatedAt: serverTimestamp()
      });
      setSelectedProgram({ ...selectedProgram, curriculum: updatedCurriculum });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'programs');
    }
  };

  useEffect(() => {
    setLoading(true);
    
    const unsubFaculties = onSnapshot(collection(db, 'faculties'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFaculties(data);
      if (data.length > 0 && !activeFaculty) {
        setActiveFaculty(data[0].id);
      }
    });

    const unsubDepartments = onSnapshot(collection(db, 'departments'), (snap) => {
      setDepartments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubPrograms = onSnapshot(collection(db, 'programs'), (snap) => {
      setPrograms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubFaculties();
      unsubDepartments();
      unsubPrograms();
    };
  }, []);

  const handleAddProgram = async () => {
    if (!activeDepartmentId) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'programs'), {
        ...newProgram,
        departmentId: activeDepartmentId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsAddModalOpen(false);
      setNewProgram({ name: '', code: '', level: 'bachelor', credits: 120, duration: 4, description: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'programs');
    } finally {
      setSubmitting(false);
    }
  };

  const currentFaculty = faculties.find(f => f.id === activeFaculty);
  const facultyDepartments = departments.filter(d => d.facultyId === activeFaculty);
  
  const assembledDepartments = facultyDepartments.map(dept => ({
    ...dept,
    programs: programs.filter(p => p.departmentId === dept.id)
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('programs')}</h1>
          <p className="text-slate-500 mt-1">Academic structure and curriculum management</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all print-btn"
          >
            <Printer className="w-5 h-5" />
            <span>Print Catalog</span>
          </button>
          {profile?.role === 'super_admin' && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200"
            >
              <Plus className="w-5 h-5" />
              <span>Add Program</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Faculty Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">{t('faculty')}</h3>
          <div className="space-y-1">
            {faculties.map((faculty) => (
              <button
                key={faculty.id}
                onClick={() => setActiveFaculty(faculty.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
                  activeFaculty === faculty.id 
                    ? "bg-white text-blue-600 shadow-sm border border-slate-100 font-bold" 
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Building2 className={cn("w-5 h-5", activeFaculty === faculty.id ? "text-blue-600" : "text-slate-400")} />
                <span className="flex-1 truncate">{faculty.name}</span>
                {activeFaculty === faculty.id && (isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
              </button>
            ))}
          </div>
        </div>

        {/* Departments and Programs */}
        <div className="lg:col-span-3 space-y-8">
          {assembledDepartments.map((dept: any) => (
            <div key={dept.id} className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <div className="w-2 h-8 bg-blue-600 rounded-full" />
                <h2 className="text-xl font-bold text-slate-900">{dept.name}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dept.programs.map((program: any) => (
                  <motion.div
                    key={program.id}
                    whileHover={{ y: -4 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                        {program.credits} {t('credits')}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{program.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-slate-400" />
                        <span className="capitalize">{t(program.level)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>4 Years</span>
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                      <button 
                        onClick={() => {
                          setSelectedProgram(program);
                          setIsCurriculumModalOpen(true);
                        }}
                        className="text-blue-600 text-sm font-bold hover:underline"
                      >
                        View Curriculum
                      </button>
                      {profile?.role === 'super_admin' && (
                        <button 
                          onClick={async () => {
                            if (window.confirm('Delete this program?')) {
                              try {
                                await deleteDoc(doc(db, 'programs', program.id));
                              } catch (error) {
                                handleFirestoreError(error, OperationType.DELETE, 'programs');
                              }
                            }
                          }}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
                {profile?.role === 'super_admin' && (
                  <button 
                    onClick={() => {
                      setActiveDepartmentId(dept.id);
                      setIsAddModalOpen(true);
                    }}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all group"
                  >
                    <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    <span className="font-bold">Add Program</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          {assembledDepartments.length === 0 && !loading && (
            <div className="py-20 text-center text-slate-400">
              <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No departments or programs found for this faculty.</p>
              {profile?.role === 'super_admin' && (
                <p className="text-sm mt-2">Use the admin panel to add departments to this faculty.</p>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Add Program Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Program"
        footer={
          <>
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleAddProgram}
              disabled={submitting || !newProgram.name || !newProgram.code}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {submitting && <Clock className="w-4 h-4 animate-spin" />}
              Create Program
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Program Name</label>
            <input 
              type="text"
              value={newProgram.name}
              onChange={(e) => setNewProgram({...newProgram, name: e.target.value})}
              placeholder="e.g., B.Sc. in Computer Science"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Program Code</label>
              <input 
                type="text"
                value={newProgram.code}
                onChange={(e) => setNewProgram({...newProgram, code: e.target.value})}
                placeholder="e.g., CS-BS"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duration (Years)</label>
              <input 
                type="number"
                value={newProgram.duration}
                onChange={(e) => setNewProgram({...newProgram, duration: parseInt(e.target.value)})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Credits</label>
              <input 
                type="number"
                value={newProgram.credits}
                onChange={(e) => setNewProgram({...newProgram, credits: parseInt(e.target.value)})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Degree Level</label>
              <select 
                value={newProgram.level}
                onChange={(e) => setNewProgram({...newProgram, level: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="bachelor">Bachelor</option>
                <option value="master">Master</option>
                <option value="diploma">Diploma</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
            <textarea 
              value={newProgram.description}
              onChange={(e) => setNewProgram({...newProgram, description: e.target.value})}
              placeholder="Brief overview of the program..."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none h-24 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Curriculum Modal */}
      <Modal
        isOpen={isCurriculumModalOpen}
        onClose={() => {
          setIsCurriculumModalOpen(false);
          setIsEditCurriculumMode(false);
        }}
        title={`${isEditCurriculumMode ? 'Edit' : 'View'} Curriculum: ${selectedProgram?.name || ''}`}
        maxWidth="max-w-2xl"
        footer={
          <div className="flex justify-between w-full">
            {profile?.role === 'super_admin' && (
              <button 
                onClick={() => setIsEditCurriculumMode(!isEditCurriculumMode)}
                className="text-blue-600 font-bold hover:underline"
              >
                {isEditCurriculumMode ? 'Switch to View Mode' : 'Switch to Edit Mode'}
              </button>
            )}
            <button 
              onClick={() => {
                setIsCurriculumModalOpen(false);
                setIsEditCurriculumMode(false);
              }}
              className="bg-slate-900 text-white px-8 py-2 rounded-xl font-bold hover:bg-slate-800 transition-all"
            >
              Close
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Total Credits Required</p>
              <p className="text-2xl font-bold text-blue-900">{selectedProgram?.credits}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Level</p>
              <p className="text-lg font-bold text-blue-900 capitalize">{selectedProgram?.level}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900">Study Plan & Curriculum</h4>
              {isEditCurriculumMode && (
                <button 
                  onClick={() => setNewCourse({ code: '', title: '', credits: 3, semester: 1 })}
                  className="text-xs font-bold text-blue-600 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Clear Form
                </button>
              )}
            </div>
            
            {isEditCurriculumMode && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add Course to Study Plan</p>
                <div className="grid grid-cols-4 gap-2">
                  <input 
                    type="text" 
                    placeholder="Code" 
                    className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({...newCourse, code: e.target.value})}
                  />
                  <input 
                    type="text" 
                    placeholder="Title" 
                    className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none"
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                  />
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="Cr" 
                      className="w-16 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none"
                      value={newCourse.credits}
                      onChange={(e) => setNewCourse({...newCourse, credits: parseInt(e.target.value)})}
                    />
                    <select
                      className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none"
                      value={newCourse.semester}
                      onChange={(e) => setNewCourse({...newCourse, semester: parseInt(e.target.value)})}
                    >
                      {[1,2,3,4,5,6,7,8].map(s => (
                        <option key={s} value={s}>Sem {s}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={handleAddCourseToCurriculum}
                    className="bg-blue-600 text-white p-2 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(semester => {
                const semesterCourses = (selectedProgram?.curriculum || []).filter((c: any) => c.semester === semester);
                if (semesterCourses.length === 0 && !isEditCurriculumMode) return null;
                
                return (
                  <div key={semester} className="space-y-2">
                    <h5 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">Semester {semester}</h5>
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
                      {semesterCourses.map((course: any) => (
                        <div key={course.code} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            {isEditCurriculumMode && (
                              <button 
                                onClick={() => handleRemoveCourseFromCurriculum(course.code)}
                                className="text-slate-300 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <div>
                              <p className="font-bold text-slate-900">{course.title}</p>
                              <p className="text-xs text-blue-600 font-bold">{course.code}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-slate-400">{course.credits} Credits</span>
                            {isEditCurriculumMode && (
                              <button className="text-slate-300 hover:text-blue-600">
                                <Settings className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {semesterCourses.length === 0 && isEditCurriculumMode && (
                        <div className="p-4 text-center text-slate-300 text-xs italic">
                          No courses added for this semester
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
