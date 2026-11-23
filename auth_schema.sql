-- ==============================================================================
-- PIONEER PAYSLIP GENERATOR - AUTH & ROLE-BASED ACCESS CONTROL (RBAC) SCHEMA
-- Model: Centralized Admin-Controlled User Management
-- Run this in your Supabase SQL Editor to activate user management & RLS
-- ==============================================================================

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator', -- 'admin' | 'operator'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- 2. AUTH AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.auth_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_email TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_created ON public.auth_audit_logs(created_at DESC);

-- 3. SEED INITIAL SUPER ADMIN PROFILE
-- Links to the created admin@pioneercorp.in auth account (ID: 52247591-4d8d-42cc-8f88-036f0047d853)
INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', 'Pioneer HR Administrator'),
    'admin',
    true
FROM auth.users
WHERE email = 'admin@pioneercorp.in'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', is_active = true, updated_at = now();


-- 4. SECURE RPC: CREATE TEAM USER (Admin Only)
CREATE OR REPLACE FUNCTION public.create_team_user(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_caller_role TEXT;
    v_new_user_id UUID;
    v_result JSONB;
BEGIN
    -- 1. Check if caller is active admin
    SELECT role INTO v_caller_role
    FROM public.user_profiles
    WHERE id = auth.uid() AND is_active = true;

    IF v_caller_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only active HR Admins can create user accounts';
    END IF;

    -- 2. Validate email format (requires an @ character)
    IF position('@' in p_email) < 2 THEN
        RAISE EXCEPTION 'Invalid email format. Must contain @ (e.g. name@pioneer)';
    END IF;

    -- 3. Check for duplicate email
    IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email)) THEN
        RAISE EXCEPTION 'User with this email already exists: %', p_email;
    END IF;

    -- 4. Generate new user ID
    v_new_user_id := gen_random_uuid();

    -- 5. Insert into auth.users (Instant active account with no confirmation delay)
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_new_user_id,
        'authenticated',
        'authenticated',
        lower(p_email),
        crypt(p_password, gen_salt('bf', 10)),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', p_full_name, 'role', p_role),
        now(),
        now(),
        '',
        '',
        '',
        ''
    );

    -- 6. Insert profile into public.user_profiles
    INSERT INTO public.user_profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        v_new_user_id,
        lower(p_email),
        p_full_name,
        p_role,
        true,
        now(),
        now()
    );

    -- 7. Audit log entry
    INSERT INTO public.auth_audit_logs (
        performed_by,
        action,
        target_email,
        details
    ) VALUES (
        auth.uid(),
        'USER_CREATED',
        lower(p_email),
        jsonb_build_object('role', p_role, 'full_name', p_full_name)
    );

    -- 8. Return created profile summary
    SELECT jsonb_build_object(
        'id', id,
        'email', email,
        'full_name', full_name,
        'role', role,
        'is_active', is_active,
        'created_at', created_at
    ) INTO v_result
    FROM public.user_profiles
    WHERE id = v_new_user_id;

    RETURN v_result;
END;
$$;


-- 5. SECURE RPC: ADMIN RESET USER PASSWORD (Admin Only)
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    p_user_id UUID,
    p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_caller_role TEXT;
    v_target_email TEXT;
BEGIN
    -- Check caller is active admin
    SELECT role INTO v_caller_role
    FROM public.user_profiles
    WHERE id = auth.uid() AND is_active = true;

    IF v_caller_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only active HR Admins can reset user passwords';
    END IF;

    -- Update auth.users password
    UPDATE auth.users
    SET 
        encrypted_password = crypt(p_new_password, gen_salt('bf', 10)),
        updated_at = now()
    WHERE id = p_user_id
    RETURNING email INTO v_target_email;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Audit log
    INSERT INTO public.auth_audit_logs (
        performed_by,
        action,
        target_email,
        details
    ) VALUES (
        auth.uid(),
        'PASSWORD_RESET_BY_ADMIN',
        v_target_email,
        jsonb_build_object('reset_at', now())
    );

    RETURN true;
END;
$$;


-- 6. SECURE RPC: ADMIN TOGGLE USER STATUS (Admin Only)
CREATE OR REPLACE FUNCTION public.admin_toggle_user_status(
    p_user_id UUID,
    p_is_active BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_role TEXT;
    v_target_email TEXT;
    v_target_role TEXT;
BEGIN
    -- Check caller is active admin
    SELECT role INTO v_caller_role
    FROM public.user_profiles
    WHERE id = auth.uid() AND is_active = true;

    IF v_caller_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only active HR Admins can toggle user status';
    END IF;

    -- Prevent self-lockout
    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot disable your own Admin account';
    END IF;

    SELECT email, role INTO v_target_email, v_target_role
    FROM public.user_profiles
    WHERE id = p_user_id;

    -- Update user profile status
    UPDATE public.user_profiles
    SET is_active = p_is_active, updated_at = now()
    WHERE id = p_user_id;

    -- If disabling, invalidate auth session
    IF p_is_active = false THEN
        UPDATE auth.users
        SET banned_until = '3000-01-01 00:00:00+00'
        WHERE id = p_user_id;
    ELSE
        UPDATE auth.users
        SET banned_until = NULL
        WHERE id = p_user_id;
    END IF;

    -- Audit log
    INSERT INTO public.auth_audit_logs (
        performed_by,
        action,
        target_email,
        details
    ) VALUES (
        auth.uid(),
        'USER_STATUS_TOGGLED',
        v_target_email,
        jsonb_build_object('is_active', p_is_active)
    );

    RETURN true;
END;
$$;


-- 7. SECURE RPC: ADMIN DELETE USER (Admin Only)
CREATE OR REPLACE FUNCTION public.admin_delete_user(
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_role TEXT;
    v_target_email TEXT;
BEGIN
    -- Check caller is active admin
    SELECT role INTO v_caller_role
    FROM public.user_profiles
    WHERE id = auth.uid() AND is_active = true;

    IF v_caller_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only active HR Admins can delete users';
    END IF;

    -- Prevent self-deletion
    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot delete your own Admin account';
    END IF;

    SELECT email INTO v_target_email
    FROM public.user_profiles
    WHERE id = p_user_id;

    -- Delete from auth.users (cascades to user_profiles)
    DELETE FROM auth.users WHERE id = p_user_id;

    -- Audit log
    INSERT INTO public.auth_audit_logs (
        performed_by,
        action,
        target_email,
        details
    ) VALUES (
        auth.uid(),
        'USER_DELETED',
        v_target_email,
        jsonb_build_object('deleted_at', now())
    );

    RETURN true;
END;
$$;


-- 8. ROW LEVEL SECURITY (RLS) FOR USER PROFILES
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile name" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;

-- All authenticated users can read profiles to see names and team member avatars
CREATE POLICY "Authenticated users can read all profiles"
ON public.user_profiles FOR SELECT
TO authenticated
USING (true);

-- Users can update their own name
CREATE POLICY "Users can update own profile name"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admins can update any profile
CREATE POLICY "Admins can manage all profiles"
ON public.user_profiles FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ==============================================================================
-- SCHEMA READY: You can run this entire script safely in Supabase SQL Editor.
-- ==============================================================================
