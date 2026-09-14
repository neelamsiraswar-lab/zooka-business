import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { UserProfile } from '../types';
import { UserRole } from '../lib/permissions';
import { getOrCreateUser, updateUserProfile, updateUserRole } from '../db/users';

interface AuthContextType {
  user: User | { uid: string; email: string | null; displayName: string | null; photoURL: string | null; role?: UserRole } | null;
  profile: UserProfile | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signInDemoAccountant: () => Promise<void>;
  signInDemoRole: (role: UserRole) => Promise<void>;
  signInAsUser: (targetUser: { uid: string; email: string; displayName?: string | null; avatarUrl?: string | null; role?: UserRole }) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEV_TOKEN_KEY = 'apex_gst_dev_token';
const DEV_USER_KEY = 'apex_gst_dev_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticatingRef = useRef(false);

  const fetchProfile = async (idToken?: string) => {
    try {
      let uid = '';
      let email = '';
      let displayName: string | null = null;
      let photoURL: string | null = null;
      let initialRole: UserRole | undefined = undefined;

      if (idToken && idToken.startsWith('dev-token-')) {
        try {
          const raw = decodeURIComponent(escape(atob(idToken.replace('dev-token-', ''))));
          const parsed = JSON.parse(raw);
          uid = parsed.uid || '';
          email = parsed.email || '';
          displayName = parsed.displayName || null;
          photoURL = parsed.photoURL || null;
          initialRole = parsed.role;
        } catch (e) {
          // ignore
        }
      } else if (auth.currentUser) {
        uid = auth.currentUser.uid;
        email = auth.currentUser.email || `${uid}@gstuser.local`;
        displayName = auth.currentUser.displayName || null;
        photoURL = auth.currentUser.photoURL || null;
      } else if (user) {
        uid = user.uid || '';
        email = user.email || '';
        displayName = user.displayName || null;
        photoURL = user.photoURL || null;
        initialRole = (user as any)?.role;
      }

      if (!uid || !email) {
        return;
      }

      const dbUser = await getOrCreateUser(uid, email, displayName, photoURL, initialRole);
      setProfile(dbUser);
      setUser((prev: any) =>
        prev ? { ...prev, id: dbUser.id, role: dbUser.role, displayName: dbUser.displayName || prev.displayName } : dbUser
      );
    } catch (err) {
      console.error('Failed to load user profile directly from Cloud Firestore:', err);
    }
  };

  useEffect(() => {
    // Check local fallback first
    const savedDevToken = localStorage.getItem(DEV_TOKEN_KEY);
    const savedDevUser = localStorage.getItem(DEV_USER_KEY);

    if (savedDevToken && savedDevUser) {
      try {
        const parsedUser = JSON.parse(savedDevUser);
        setUser(parsedUser);
        setToken(savedDevToken);
        fetchProfile(savedDevToken).finally(() => setLoading(false));
      } catch (e) {
        console.error('Failed to parse dev user:', e);
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reasonMsg = event?.reason?.message || String(event?.reason || '');
      const reasonCode = event?.reason?.code || '';
      if (
        reasonMsg.includes('Pending promise was never set') ||
        reasonMsg.includes('INTERNAL ASSERTION FAILED') ||
        reasonCode === 'auth/popup-closed-by-user' ||
        reasonMsg.includes('popup-closed-by-user')
      ) {
        // Intercept browser popup dismissal assertion within sandboxed iframes
        event.preventDefault();
        console.info('Intercepted Firebase Auth popup dismissal/assertion in iframe preview.');
        setError('Sign-in popup was closed or restricted by the browser preview. Please retry or click Instant Workspace Access below.');
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        localStorage.removeItem(DEV_TOKEN_KEY);
        localStorage.removeItem(DEV_USER_KEY);
        try {
          const idToken = await currentUser.getIdToken();
          setToken(idToken);
          await fetchProfile(idToken);
        } catch (err) {
          console.error('Failed to get token:', err);
        }
      } else if (!localStorage.getItem(DEV_TOKEN_KEY)) {
        setUser(null);
        setToken(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const signInWithGoogle = async () => {
    if (isAuthenticatingRef.current) return;
    isAuthenticatingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      setUser(result.user);
      setToken(idToken);
      localStorage.removeItem(DEV_TOKEN_KEY);
      localStorage.removeItem(DEV_USER_KEY);
      await fetchProfile(idToken);
    } catch (err: any) {
      console.warn('Firebase popup sign in info:', err);
      // If user closed popup or pending promise error occurred in iframe sandbox
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.message?.includes('popup-closed-by-user')
      ) {
        setError('Google Sign-In popup was closed before completion. You can retry or use Instant Workspace Access.');
      } else if (err?.message?.includes('INTERNAL ASSERTION FAILED')) {
        setError('Browser popup restriction detected in container preview. Use Instant Workspace Access below.');
      } else {
        setError(err?.message || 'Authentication error. You can use Instant Workspace Access.');
      }
    } finally {
      setLoading(false);
      isAuthenticatingRef.current = false;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      if (result.user) {
        await updateProfile(result.user, { displayName: name });
        const idToken = await result.user.getIdToken();
        setUser(result.user);
        setToken(idToken);
        localStorage.removeItem(DEV_TOKEN_KEY);
        localStorage.removeItem(DEV_USER_KEY);
        await fetchProfile(idToken);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err?.message || 'Failed to register account.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      const idToken = await result.user.getIdToken();
      setUser(result.user);
      setToken(idToken);
      localStorage.removeItem(DEV_TOKEN_KEY);
      localStorage.removeItem(DEV_USER_KEY);
      await fetchProfile(idToken);
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err?.message || 'Failed to sign in. Please check your credentials.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInDemoRole = async (role: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      const workspaceUser = {
        uid: `workspace-${role}-user`,
        email: `team.${role}@workspace.local`,
        displayName: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
        photoURL: null,
        role: role,
      };
      const devTokenString = `dev-token-${btoa(unescape(encodeURIComponent(JSON.stringify(workspaceUser))))}`;
      localStorage.setItem(DEV_TOKEN_KEY, devTokenString);
      localStorage.setItem(DEV_USER_KEY, JSON.stringify(workspaceUser));

      setUser(workspaceUser);
      setToken(devTokenString);
      await fetchProfile(devTokenString);
    } catch (err: any) {
      console.error('Role sign in failed:', err);
      setError(`Failed to authenticate as ${role}.`);
    } finally {
      setLoading(false);
    }
  };

  const signInDemoAccountant = async () => {
    await signInDemoRole('accountant');
  };

  const signInAsUser = async (targetUser: { uid: string; email: string; displayName?: string | null; avatarUrl?: string | null; role?: UserRole }) => {
    setLoading(true);
    setError(null);
    try {
      const userPayload = {
        uid: targetUser.uid,
        email: targetUser.email,
        displayName: targetUser.displayName || targetUser.email.split('@')[0],
        photoURL: targetUser.avatarUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
        role: targetUser.role || 'accountant',
      };
      const devTokenString = `dev-token-${btoa(unescape(encodeURIComponent(JSON.stringify(userPayload))))}`;
      localStorage.setItem(DEV_TOKEN_KEY, devTokenString);
      localStorage.setItem(DEV_USER_KEY, JSON.stringify(userPayload));

      setUser(userPayload);
      setToken(devTokenString);
      await fetchProfile(devTokenString);
    } catch (err: any) {
      console.error('Sign in as user failed:', err);
      setError(`Failed to log in as ${targetUser.displayName || targetUser.email}.`);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem(DEV_TOKEN_KEY);
    localStorage.removeItem(DEV_USER_KEY);
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setUser(null);
    setToken(null);
    setProfile(null);
  };

  const getToken = async (): Promise<string | null> => {
    if (token) return token;
    if (user && typeof user.getIdToken === 'function') {
      const freshToken = await user.getIdToken();
      setToken(freshToken);
      return freshToken;
    }
    const savedDevToken = localStorage.getItem(DEV_TOKEN_KEY);
    if (savedDevToken) {
      setToken(savedDevToken);
      return savedDevToken;
    }
    return null;
  };

  const refreshProfile = async () => {
    const t = await getToken();
    if (t) {
      await fetchProfile(t);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        loading,
        error,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        signInDemoAccountant,
        signInDemoRole,
        signInAsUser,
        logout,
        getToken,
        refreshProfile,
        clearError: () => setError(null),
      }}
    >
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
