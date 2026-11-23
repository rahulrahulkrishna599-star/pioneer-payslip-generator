import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, AppRole } from '../types';
import { signIn, signOut, getCurrentUserProfile, DEFAULT_SUPER_ADMIN } from '../services/authService';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load active session on initial mount
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
      if (event === 'SIGNED_OUT' || !session) {
        if (isMounted) setUser(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const profile = await getCurrentUserProfile();
        if (isMounted) setUser(profile);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (identifier: string, password: string) => {
    // Note: Do not toggle global isLoading to true during login.
    // LoginPortal manages its own local button loading state.
    // Setting global isLoading would cause App.tsx to unmount LoginPortal, destroying its error state and popups.
    const { profile } = await signIn(identifier, password);
    setUser(profile);
  };

  const logout = async () => {
    setIsLoading(true);
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
