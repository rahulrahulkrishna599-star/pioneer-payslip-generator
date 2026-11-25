import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { UserProfile, AppRole } from '../types';
import { 
  signIn, 
  signOut, 
  getCurrentUserProfile, 
  getLocalSessionId, 
  clearLocalSessionId,
  isSignInInProgress
} from '../services/authService';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: UserProfile | null;
  role: AppRole;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isSessionSuperseded: boolean;
  supersededAt: string | null;
  dismissSessionSuperseded: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSessionSuperseded, setIsSessionSuperseded] = useState<boolean>(false);
  const [supersededAt, setSupersededAt] = useState<string | null>(null);
  const lastLoginCompletedAtRef = useRef<number>(0);

  // 1. Concurrency Check: Verify active_session_id on server matches this browser's local session
  const checkSessionConcurrency = useCallback(async () => {
    try {
      // Skip checks while a fresh sign-in is in flight or within 5s grace window
      if (isSignInInProgress() || Date.now() - lastLoginCompletedAtRef.current < 5000) {
        return;
      }

      const localId = getLocalSessionId();
      if (!localId) return;

      const { data: { user: currentAuthUser } } = await supabase.auth.getUser();
      if (!currentAuthUser) return;

      // Re-verify localId did not change while getUser() was in flight
      if (isSignInInProgress() || getLocalSessionId() !== localId) {
        return;
      }

      const remoteSessionId = currentAuthUser.user_metadata?.active_session_id;
      if (remoteSessionId && remoteSessionId !== localId) {
        console.warn('⚠️ [Pioneer Auth] Concurrent session detected on another device/browser. Closing local session only.');
        clearLocalSessionId();
        // IMPORTANT: Use scope: 'local' so an evicted tab never globally revokes the newly active session!
        await supabase.auth.signOut({ scope: 'local' });
        setUser(null);
        setIsSessionSuperseded(true);
        setSupersededAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch {
      // Ignore transient network errors to avoid false disconnects
    }
  }, []);

  // 2. Load active session on initial mount
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const profile = await getCurrentUserProfile();
        if (isMounted) {
          setUser(profile);
        }
      } catch (err) {
        console.warn('Auth session initialization:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initSession();

    // Listen for cross-tab auth state changes (login, logout, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        if (isMounted) setUser(null);
        return;
      }
      if (!session) {
        if (event !== 'INITIAL_SESSION' && isMounted) {
          setUser(null);
        }
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // While signIn() is committing active_session_id, let login() set the final profile state
        if (isSignInInProgress()) return;
        const profile = await getCurrentUserProfile();
        if (isMounted) setUser(profile);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // 3. Concurrency Listeners: Periodic heartbeat + on-focus + storage sync
  useEffect(() => {
    if (!user) return;

    // Heartbeat check every 10 seconds while logged in
    const interval = setInterval(checkSessionConcurrency, 10000);

    // Immediate check when browser tab regains focus or user returns
    const handleFocus = () => {
      checkSessionConcurrency();
    };
    window.addEventListener('focus', handleFocus);

    // Cross-tab detection in same browser
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pioneer_active_session_id' && e.newValue && e.newValue !== getLocalSessionId()) {
        checkSessionConcurrency();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [user, checkSessionConcurrency]);

  const login = async (identifier: string, password: string) => {
    setIsSessionSuperseded(false);
    setSupersededAt(null);
    const { profile } = await signIn(identifier, password);
    lastLoginCompletedAtRef.current = Date.now();
    setUser(profile);
  };

  const logout = async () => {
    setIsLoading(true);
    setIsSessionSuperseded(false);
    setSupersededAt(null);
    try {
      await signOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    const profile = await getCurrentUserProfile();
    setUser(profile);
  };

  const dismissSessionSuperseded = () => {
    setIsSessionSuperseded(false);
    setSupersededAt(null);
  };

  const role: AppRole = user?.role || 'operator';
  const isAdmin = role === 'admin';
  const isAuthenticated = Boolean(user && user.isActive);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshProfile,
        isSessionSuperseded,
        supersededAt,
        dismissSessionSuperseded,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
