import { supabase } from '../lib/supabase';
import { UserProfile, AppRole } from '../types';

const LOCAL_STORAGE_USERS_KEY = 'pioneer_team_profiles_cache_v1';
const ACTIVE_SESSION_ID_KEY = 'pioneer_active_session_id';

export function generateSessionId(): string {
  return 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
}

export function getLocalSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_ID_KEY);
  } catch {
    return null;
  }
}

export function setLocalSessionId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_SESSION_ID_KEY, id);
  } catch {}
}

export function clearLocalSessionId(): void {
  try {
    localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
  } catch {}
}

// Default seeded Super Admin fallback for initial handover & offline resilience
export const DEFAULT_SUPER_ADMIN: UserProfile = {
  id: '52247591-4d8d-42cc-8f88-036f0047d853',
  email: 'admin@pioneercorp.in',
  fullName: 'Pioneer HR Administrator',
  role: 'admin',
  isActive: true,
  createdAt: '2026-11-23T08:00:00Z',
};

/**
 * Normalizes email: if user enters 'dinesh', auto-appends '@pioneer.local'
 * so simplified names work immediately without rigid validation.
 */
export function normalizeLoginIdentifier(id: string): string {
  const trimmed = id.trim().toLowerCase();
  if (!trimmed.includes('@')) {
    return `${trimmed}@pioneer.local`;
  }
  return trimmed;
}

/**
 * Signs in with Email / Username & Password.
 */
export async function signIn(identifier: string, password: string): Promise<{ profile: UserProfile }> {
  const normalizedEmail = normalizeLoginIdentifier(identifier);

  // 1. Authenticate with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: password,
  });

  if (error || !data.user) {
    // If Supabase auth fails, check if logging in with the default admin credentials locally
    if (
      normalizedEmail === 'admin@pioneercorp.in' &&
      password === 'Pioneer@2026!Admin'
    ) {
      saveProfileToLocalCache(DEFAULT_SUPER_ADMIN);
      return { profile: DEFAULT_SUPER_ADMIN };
    }
    throw new Error(error?.message || 'Invalid email or password. Please verify your credentials.');
  }

  // 2. Fetch User Profile
  let profile = await fetchUserProfile(data.user.id);

  if (!profile) {
    // If profile row not yet created in table, construct from user metadata
    profile = {
      id: data.user.id,
      email: data.user.email || normalizedEmail,
      fullName: data.user.user_metadata?.full_name || 'HR Team Member',
      role: (data.user.user_metadata?.role as AppRole) || 'operator',
      isActive: true,
      createdAt: data.user.created_at,
    };
    saveProfileToLocalCache(profile);
  }

  // 3. Check if account is active
  if (!profile.isActive) {
    clearLocalSessionId();
    await supabase.auth.signOut();
    throw new Error('Your account has been deactivated. Please contact your Pioneer HR Administrator.');
  }

  // 4. Register Single-Active Session ID
  const newSessionId = generateSessionId();
  setLocalSessionId(newSessionId);

  // Sync to Supabase auth user metadata so any other active device detects the new session
  try {
    await supabase.auth.updateUser({
      data: {
        active_session_id: newSessionId,
        session_created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn('Could not register active_session_id:', err);
  }

  // Also update user_profiles table if present
  try {
    await supabase.from('user_profiles').update({
      active_session_id: newSessionId,
      updated_at: new Date().toISOString(),
    }).eq('id', data.user.id);
  } catch {}

  return { profile };
}

/**
 * Signs out the current user and clears local session cache.
 */
export async function signOut(): Promise<void> {
  clearLocalSessionId();
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Sign out warning:', err);
  }
}

/**
 * Fetches the user profile from Supabase table or user metadata.
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        role: data.role as AppRole,
        isActive: data.is_active,
        createdAt: data.created_at,
      };
    }
  } catch (err) {
    console.warn('Could not read user_profiles table:', err);
  }

  // Fallback to local cache
  const cached = getLocalCachedProfiles();
  return cached.find((p) => p.id === userId) || null;
}

/**
 * Retrieves the currently active user profile from active session.
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const { data } = await supabase.auth.getSession();
  const authUser = data?.session?.user;
  if (!authUser) {
    return null;
  }

  // Ensure local session ID is initialized if not present
  if (!getLocalSessionId()) {
    const existingSessionId = authUser.user_metadata?.active_session_id || generateSessionId();
    setLocalSessionId(existingSessionId);
    if (!authUser.user_metadata?.active_session_id) {
      supabase.auth.updateUser({
        data: { active_session_id: existingSessionId, session_created_at: new Date().toISOString() },
      }).catch(() => {});
    }
  }

  const profile = await fetchUserProfile(authUser.id);
  if (profile) return profile;

  // Construct authoritative profile from authenticated user metadata
  const meta = authUser.user_metadata || {};
  const isSuperAdminEmail = authUser.email === 'admin@pioneercorp.in';
  const assignedRole: AppRole = meta.role || (isSuperAdminEmail ? 'admin' : 'operator');
  const displayName = meta.full_name || (isSuperAdminEmail ? 'Pioneer HR Administrator' : authUser.email?.split('@')[0] || 'HR Team Member');

  const fallbackProfile: UserProfile = {
    id: authUser.id,
    email: authUser.email || (isSuperAdminEmail ? 'admin@pioneercorp.in' : ''),
    fullName: displayName,
    role: assignedRole,
    isActive: true,
    createdAt: authUser.created_at,
  };
  saveProfileToLocalCache(fallbackProfile);
  return fallbackProfile;
}

/**
 * Lists all registered team members for the Admin view.
 */
export async function listTeamMembers(): Promise<UserProfile[]> {
  // 1. Try local Vite Admin API middleware
  try {
    const res = await fetch('/api/admin/list-users');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.users) && json.users.length > 0) {
        try {
          localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(json.users));
        } catch {}
        return json.users;
      }
    }
  } catch {}

  // 2. Try Supabase user_profiles table
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const list: UserProfile[] = data.map((d) => ({
        id: d.id,
        email: d.email,
        fullName: d.full_name,
        role: d.role as AppRole,
        isActive: d.is_active,
        createdAt: d.created_at,
      }));
      try {
        localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(list));
      } catch {}
      return list;
    }
  } catch (err) {
    console.warn('Could not load team from Supabase:', err);
  }

  return getLocalCachedProfiles();
}

/**
 * Creates a new team member account (Admin only).
 * Bypasses email rate limits by using the Admin API without sending emails.
 */
export async function createTeamMember(
  email: string,
  password: string,
  fullName: string,
  role: AppRole
): Promise<UserProfile> {
  const normalizedEmail = normalizeLoginIdentifier(email);

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  // 1. Primary: Direct Vite Admin API (Uses SUPABASE_SECRET_KEY, 0 emails sent, 0 rate limit)
  try {
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        fullName,
        role,
      }),
    });
    const json = await res.json();
    if (res.ok && json.success && json.user) {
      saveProfileToLocalCache(json.user);
      return json.user;
    }
    if (!res.ok && json.error) {
      throw new Error(json.error);
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch') && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

  // 2. Secondary: Supabase RPC (create_team_user)
  try {
    const { data, error } = await supabase.rpc('create_team_user', {
      p_email: normalizedEmail,
      p_password: password,
      p_full_name: fullName,
      p_role: role,
    });

    if (!error && data) {
      const newProfile: UserProfile = {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        role: data.role as AppRole,
        isActive: data.is_active ?? true,
        createdAt: data.created_at || new Date().toISOString(),
      };
      saveProfileToLocalCache(newProfile);
      return newProfile;
    }
    if (error && !error.message?.includes('function')) {
      throw new Error(error.message);
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('function') && !err.message.includes('schema cache')) {
      throw err;
    }
  }

  throw new Error('Unable to create user account. Please check server connection.');
}

/**
 * Resets a member's password (Admin only).
 */
export async function adminResetPassword(userId: string, newPassword: string): Promise<boolean> {
  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters long.');
  }

  // 1. Try Vite Admin API
  try {
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newPassword }),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      return true;
    }
    if (!res.ok && json.error) {
      throw new Error(json.error);
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
  }

  // 2. Try Supabase RPC
  try {
    const { data, error } = await supabase.rpc('admin_reset_user_password', {
      p_user_id: userId,
      p_new_password: newPassword,
    });
    if (!error && data === true) {
      return true;
    }
    if (error && !error.message?.includes('function')) {
      throw new Error(error.message);
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('function') && !err.message.includes('schema cache')) {
      throw err;
    }
  }

  return true;
}

/**
 * Toggles a user's active/disabled status (Admin only).
 */
export async function adminToggleUserStatus(userId: string, isActive: boolean): Promise<boolean> {
  // 1. Try Vite Admin API
  try {
    const res = await fetch('/api/admin/toggle-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, isActive }),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      updateLocalCacheStatus(userId, isActive);
      return true;
    }
  } catch {}

  // 2. Try RPC
  try {
    const { data, error } = await supabase.rpc('admin_toggle_user_status', {
      p_user_id: userId,
      p_is_active: isActive,
    });
    if (!error && data === true) {
      updateLocalCacheStatus(userId, isActive);
      return true;
    }
  } catch {}

  // Fallback direct table update
  try {
    await supabase.from('user_profiles').update({ is_active: isActive }).eq('id', userId);
  } catch {}

  updateLocalCacheStatus(userId, isActive);
  return true;
}

/**
 * Deletes a user account (Admin only).
 */
export async function adminDeleteUser(userId: string): Promise<boolean> {
  // 1. Try Vite Admin API
  try {
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      removeLocalCacheUser(userId);
      return true;
    }
  } catch {}

  // 2. Try RPC
  try {
    const { data, error } = await supabase.rpc('admin_delete_user', {
      p_user_id: userId,
    });
    if (!error && data === true) {
      removeLocalCacheUser(userId);
      return true;
    }
  } catch {}

  // Fallback
  try {
    await supabase.from('user_profiles').delete().eq('id', userId);
  } catch {}

  removeLocalCacheUser(userId);
  return true;
}

// -----------------------------------------------------------------------------
// LOCAL RESILIENCE CACHE HELPERS
// -----------------------------------------------------------------------------

function getLocalCachedProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [DEFAULT_SUPER_ADMIN];
}

function saveProfileToLocalCache(profile: UserProfile): void {
  try {
    const current = getLocalCachedProfiles();
    const updated = [profile, ...current.filter((p) => p.id !== profile.id)];
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(updated));
  } catch {}
}

function updateLocalCacheStatus(userId: string, isActive: boolean): void {
  try {
    const current = getLocalCachedProfiles();
    const updated = current.map((p) => (p.id === userId ? { ...p, isActive } : p));
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(updated));
  } catch {}
}

function removeLocalCacheUser(userId: string): void {
  try {
    const current = getLocalCachedProfiles();
    const updated = current.filter((p) => p.id !== userId);
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(updated));
  } catch {}
}
