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

export const DEMO_RBAC_PERSONAS: Record<UserRole, {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  title: string;
  subtitle: string;
  defaultPin: string;
}> = {
  admin: {
    uid: 'admin-workspace-user',
    email: 'admin.rohit@apexaccounting.com',
    displayName: 'Rohit Sharma',
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces',
    role: 'admin',
    title: 'Administrator',
    subtitle: 'Full System & Security Management',
    defaultPin: '9999',
  },
  accountant: {
    uid: 'accountant-ca-kuldeep',
    email: 'ca.kuldeep@apexaccounting.com',
    displayName: 'CA Kuldeep Nawar',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    role: 'accountant',
    title: 'Senior Accountant',
    subtitle: 'Ledgers, Vouchers & Tax Filings',
    defaultPin: '2222',
  },
  billing_operator: {
    uid: 'billing-operator-vikram',
    email: 'billing.vikram@apexaccounting.com',
    displayName: 'Vikram Patel',
    photoURL: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop&crop=faces',
    role: 'billing_operator',
    title: 'Billing Operator',
    subtitle: 'Point-of-Sale, Counter Invoices & Stock Check',
    defaultPin: '1111',
  },
  auditor: {
    uid: 'auditor-neha',
    email: 'auditor.neha@apexaccounting.com',
    displayName: 'CA Neha Gupta',
    photoURL: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces',
    role: 'auditor',
    title: 'Statutory Auditor',
    subtitle: 'Read-Only Ledger & GSTR-2B Inspection',
    defaultPin: '3333',
  },
};

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

  const fetchProfile = async (idToken: string, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch('/api/user/me', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setUser((prev: any) =>
            prev ? { ...prev, role: data.role, displayName: data.displayName || prev.displayName } : prev
          );
          const savedDevUser = localStorage.getItem(DEV_USER_KEY);
          if (savedDevUser) {
            try {
              const parsed = JSON.parse(savedDevUser);
              parsed.role = data.role;
              if (data.displayName) parsed.displayName = data.displayName;
              localStorage.setItem(DEV_USER_KEY, JSON.stringify(parsed));
              const devTokenString = `dev-token-${btoa(unescape(encodeURIComponent(JSON.stringify(parsed))))}`;
              localStorage.setItem(DEV_TOKEN_KEY, devTokenString);
              setToken(devTokenString);
            } catch (e) {
              // ignore
            }
          }
          return;
        }
      } catch (err) {
        if (i === retries - 1) {
          console.error('Failed to load user profile:', err);
        } else {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
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
      const persona = DEMO_RBAC_PERSONAS[role] || DEMO_RBAC_PERSONAS.accountant;
      const demoUser = {
        uid: persona.uid,
        email: persona.email,
        displayName: persona.displayName,
        photoURL: persona.photoURL,
        role: persona.role,
      };
      const devTokenString = `dev-token-${btoa(unescape(encodeURIComponent(JSON.stringify(demoUser))))}`;
      localStorage.setItem(DEV_TOKEN_KEY, devTokenString);
      localStorage.setItem(DEV_USER_KEY, JSON.stringify(demoUser));

      setUser(demoUser);
      setToken(devTokenString);
      await fetchProfile(devTokenString);
    } catch (err: any) {
      console.error('Role sign in failed:', err);
      setError(`Failed to initialize ${role} demo workspace.`);
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
