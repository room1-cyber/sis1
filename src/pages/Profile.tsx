import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { calculateAcademicStanding } from '../lib/academicUtils';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Camera, 
  Save, 
  Shield, 
  Clock, 
  Book, 
  Award,
  CheckCircle2,
  AlertCircle,
  Settings,
  BarChart3,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Profile() {
  const { uid } = useParams();
  const { t, isRTL, ramadanMode, setRamadanMode, lowBandwidth, setLowBandwidth } = useTranslation();
  const { user, profile: myProfile, refreshProfile } = useAuth();
  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [studentRecord, setStudentRecord] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    phoneNumber: '',
    address: '',
    bio: '',
    officeHours: '',
    emergencyContact: ''
  });

  const isSuperAdmin = myProfile?.role === 'super_admin';
  const isRegistrar = myProfile?.role === 'registrar';
  const effectiveUid = uid || user?.uid;
  const isOwnProfile = !uid || uid === user?.uid;
  const canEditName = isSuperAdmin || isRegistrar;

  useEffect(() => {
    const fetchTargetProfile = async () => {
      if (!effectiveUid) return;
      
      setFetching(true);
      try {
        // Fetch user profile
        let profileData;
        if (isOwnProfile) {
          profileData = myProfile;
        } else {
          const userRef = doc(db, 'users', effectiveUid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            profileData = userSnap.data();
          }
        }
        setTargetProfile(profileData);

        // Fetch student record if applicable
        if (profileData?.role === 'student') {
          const studentRef = doc(db, 'students', effectiveUid);
          const studentSnap = await getDoc(studentRef);
          if (studentSnap.exists()) {
            setStudentRecord(studentSnap.data());
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setFetching(false);
      }
    };

    fetchTargetProfile();
  }, [effectiveUid, isOwnProfile, myProfile]);

  useEffect(() => {
    if (targetProfile) {
      setFormData({
        displayName: targetProfile.displayName || '',
        phoneNumber: targetProfile.phoneNumber || '',
        address: targetProfile.address || '',
        bio: targetProfile.bio || '',
        officeHours: targetProfile.officeHours || '',
        emergencyContact: targetProfile.emergencyContact || ''
      });
    }
  }, [targetProfile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !effectiveUid) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const userRef = doc(db, 'users', effectiveUid);
        await updateDoc(userRef, {
          photoURL: base64String,
          updatedAt: new Date().toISOString()
        });
        
        if (isOwnProfile) {
          await refreshProfile();
        } else {
          setTargetProfile((prev: any) => ({ ...prev, photoURL: base64String }));
        }
        
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${effectiveUid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!effectiveUid) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', effectiveUid);
      const updateData = {
        ...formData,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(userRef, updateData);
      
      if (isOwnProfile) {
        await refreshProfile();
      } else {
        setTargetProfile((prev: any) => ({ ...prev, ...formData }));
      }
      
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${effectiveUid}`);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Clock className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!targetProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500 font-medium">Profile not found or access denied.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 relative">
      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-bold"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Profile updated successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Profile Header */}
      <div className="relative">
        <div className="h-48 w-full bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl shadow-lg" />
        <div className="absolute -bottom-12 left-8 flex items-end gap-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-3xl bg-white p-1 shadow-xl">
              <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                {targetProfile.photoURL ? (
                  <img src={targetProfile.photoURL} alt={targetProfile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-12 h-12" />
                )}
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              className="hidden" 
              accept="image/*" 
            />
            {(isOwnProfile || isSuperAdmin) && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-white drop-shadow-sm">{targetProfile.displayName}</h1>
            <div className="flex items-center gap-2 text-blue-100 mt-1">
              <Shield className="w-4 h-4" />
              <span className="font-medium capitalize">{targetProfile.role}</span>
              <span className="opacity-50">•</span>
              <span>{targetProfile.email}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-16">
        {/* Left Column: Info & Stats */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 text-lg">{t('personalInfo')}</h3>
              {(isOwnProfile || isSuperAdmin) && (
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-blue-600 text-sm font-bold hover:underline"
                >
                  {isEditing ? t('cancel') : t('edit')}
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('fullName')}</label>
                {isEditing && canEditName ? (
                  <input 
                    type="text" 
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                ) : (
                  <p className="text-slate-900 font-medium">{targetProfile.displayName}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('email')}</label>
                <p className="text-slate-900 font-medium">{targetProfile.email}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('phoneNumber')}</label>
                {isEditing ? (
                  <input 
                    type="tel" 
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                ) : (
                  <p className="text-slate-900 font-medium">{targetProfile.phoneNumber || t('notSet')}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('address')}</label>
                {isEditing ? (
                  <textarea 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                    rows={2}
                  />
                ) : (
                  <p className="text-slate-900 font-medium">{targetProfile.address || t('notSet')}</p>
                )}
              </div>

              {isEditing && (
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Clock className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  <span>{t('saveChanges')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Academic/Professional Stats */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg">
            <h3 className="font-bold text-lg mb-6">Status Overview</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Account Status</p>
                  <p className="font-bold">{targetProfile.status || 'Active'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Member Since</p>
                  <p className="font-bold">{targetProfile.createdAt ? new Date(targetProfile.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Role Specific Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Bio / About */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 text-xl mb-4">About</h3>
            {isEditing ? (
              <textarea 
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Write a short bio..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                rows={4}
              />
            ) : (
              <p className="text-slate-600 leading-relaxed">
                {targetProfile.bio || "No bio information provided yet."}
              </p>
            )}
          </div>

          {/* Role Specific Sections */}
          {targetProfile.role === 'student' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <Book className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-slate-900">Program Info</h4>
                </div>
                <p className="text-2xl font-bold text-slate-900">{targetProfile.programName || studentRecord?.program || 'Enrolled Student'}</p>
                <p className="text-sm text-slate-500 mt-1">Student ID: {targetProfile.nationalId || studentRecord?.nationalId || targetProfile.uid.slice(-8).toUpperCase()}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-bold text-slate-900">Academic Standing</h4>
                </div>
                {(() => {
                  const latestGpa = studentRecord?.academicHistory?.length > 0 
                    ? studentRecord.academicHistory[studentRecord.academicHistory.length - 1].gpa 
                    : 0;
                  const standing = calculateAcademicStanding(latestGpa);
                  return (
                    <>
                      <p className="text-2xl font-bold text-slate-900">{studentRecord?.status || 'Active'}</p>
                      <p className={cn(
                        "text-sm font-bold mt-1",
                        standing === "Dean's List" ? "text-emerald-600" :
                        standing === "Good Standing" ? "text-blue-600" :
                        standing === "Academic Probation" ? "text-amber-600" :
                        "text-red-600"
                      )}>{standing}</p>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* System Settings - Only show for own profile */}
          {isOwnProfile && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-600" />
                {t('settings')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{t('ramadanMode')}</p>
                      <p className="text-xs text-slate-500">Adjust hours for Ramadan</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setRamadanMode(!ramadanMode)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      ramadanMode ? "bg-amber-500" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      isRTL 
                        ? (ramadanMode ? "left-1" : "right-1")
                        : (ramadanMode ? "right-1" : "left-1")
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{t('lowBandwidth')}</p>
                      <p className="text-xs text-slate-500">Reduce data usage</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setLowBandwidth(!lowBandwidth)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      lowBandwidth ? "bg-blue-500" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      isRTL 
                        ? (lowBandwidth ? "left-1" : "right-1")
                        : (lowBandwidth ? "right-1" : "left-1")
                    )} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {targetProfile.role === 'lecturer' && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-xl">Office Hours</h3>
                </div>
              </div>
              {isEditing ? (
                <textarea 
                  value={formData.officeHours}
                  onChange={(e) => setFormData({...formData, officeHours: e.target.value})}
                  placeholder="e.g. Mon/Wed 10:00 AM - 12:00 PM"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                  rows={3}
                />
              ) : (
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                  <p className="text-blue-900 font-bold text-lg">
                    {targetProfile.officeHours || "No office hours set yet."}
                  </p>
                  <p className="text-blue-600 text-sm mt-2">Students can see this availability in the directory.</p>
                </div>
              )}
            </div>
          )}

          {/* Emergency Contact */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 text-xl mb-6">Emergency Contact</h3>
            {isEditing ? (
              <input 
                type="text" 
                value={formData.emergencyContact}
                onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                placeholder="Name and Phone Number"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-slate-900 font-bold">{targetProfile.emergencyContact || "Not specified"}</p>
                  <p className="text-slate-500 text-sm">Primary Emergency Contact</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
