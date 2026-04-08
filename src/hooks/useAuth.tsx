import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, getDoc, collection } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { Permission, ROLE_PERMISSIONS } from '../constants/permissions';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  rolePermissions: Record<string, Permission[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<string, Permission[]>>(ROLE_PERMISSIONS);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setRolePermissions(ROLE_PERMISSIONS);
      return;
    }

    // Fetch granular permissions from Firestore
    const unsubscribePermissions = onSnapshot(
      collection(db, 'rolePermissions'),
      (snapshot) => {
        const permissions: Record<string, Permission[]> = { ...ROLE_PERMISSIONS };
        snapshot.docs.forEach(doc => {
          permissions[doc.id] = doc.data().permissions as Permission[];
        });
        setRolePermissions(permissions);
      },
      (err) => {
        console.error('Error fetching role permissions:', err);
      }
    );

    return () => unsubscribePermissions();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribeProfile = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserProfile);
        } else {
          // Fallback for super admin email
          if (user.email === 'room1@academy.edu.ly') {
            setProfile({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || 'Super Admin',
              role: 'super_admin',
              status: 'active',
              createdAt: new Date().toISOString()
            } as any);
          } else {
            setProfile(null);
          }
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching profile:', err);
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }
    );

    return () => unsubscribeProfile();
  }, [user]);

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const snapshot = await getDoc(doc(db, 'users', user.uid));
      if (snapshot.exists()) {
        setProfile(snapshot.data() as UserProfile);
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!profile) return false;
    if (profile.role === 'super_admin') return true; // Super admin has all permissions
    const permissions = rolePermissions[profile.role] || [];
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, refreshProfile, hasPermission, rolePermissions }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
