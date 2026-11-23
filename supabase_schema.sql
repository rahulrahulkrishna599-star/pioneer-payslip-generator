-- ==============================================================================
-- PIONEER PAYSLIP GENERATOR - SUPABASE DATABASE SCHEMA
-- Purpose: In-house HR Team (~5 users)
-- System: Pioneer Corporation Form T statutory payslips, draft auto-recovery, and archives
-- ==============================================================================

-- 1. COMPANY SETTINGS (Single Source of Truth)
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL DEFAULT 'PIONEER CORPORATION',
    company_address TEXT NOT NULL DEFAULT '358, Mettupalayam Road, Tatabad',
    city_pincode TEXT NOT NULL DEFAULT 'Coimbatore - 641043',
    country TEXT NOT NULL DEFAULT 'India',
    logo_url TEXT DEFAULT 'https://hzdcxfpohrcilvqkbobt.supabase.co/storage/v1/object/public/company-assets/pioneer_logo.png',
    seal_url TEXT DEFAULT 'https://hzdcxfpohrcilvqkbobt.supabase.co/storage/v1/object/public/company-assets/pioneer_seal_stamp.png',
    show_seal BOOLEAN NOT NULL DEFAULT true,
    default_pay_period TEXT NOT NULL DEFAULT 'October 2026',
    default_pay_date TEXT NOT NULL DEFAULT '01/11/2026',
    form_title TEXT NOT NULL DEFAULT 'FORM T - WAGES SLIP',
    form_subtitle TEXT NOT NULL DEFAULT '(See Sub-Rule (6) of Rule 1 of the Tamil Nadu Shops and Establishments Rules, 1948)',
    footer_text TEXT NOT NULL DEFAULT '-- This is a computer-generated payslip under Tamil Nadu Shops & Establishments Rules, 1948 --',
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by TEXT DEFAULT 'HR Admin'
);

-- Seed initial Pioneer Corporation settings if table is empty
INSERT INTO public.company_settings (
    company_name,
    company_address,
    city_pincode,
    country,
    logo_url,
    seal_url,
    show_seal,
    default_pay_period,
    default_pay_date,
    form_title,
    form_subtitle,
    footer_text
)
SELECT 
    'PIONEER CORPORATION',
    '358, Mettupalayam Road, Tatabad',
    'Coimbatore - 641043',
    'India',
    'https://hzdcxfpohrcilvqkbobt.supabase.co/storage/v1/object/public/company-assets/pioneer_logo.png',
    'https://hzdcxfpohrcilvqkbobt.supabase.co/storage/v1/object/public/company-assets/pioneer_seal_stamp.png',
    true,
    'October 2026',
    '01/11/2026',
    'FORM T - WAGES SLIP',
    '(See Sub-Rule (6) of Rule 1 of the Tamil Nadu Shops and Establishments Rules, 1948)',
    '-- This is a computer-generated payslip under Tamil Nadu Shops & Establishments Rules, 1948 --'
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);


-- 2. PAYROLL BATCHES (Generated Payroll History & Archives)
CREATE TABLE IF NOT EXISTS public.payroll_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_name TEXT NOT NULL,
    pay_period TEXT NOT NULL,
    pay_date TEXT NOT NULL,
    file_name TEXT NOT NULL,
    total_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    gross_payout NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_payout NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    zip_storage_path TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by TEXT DEFAULT 'HR Team'
);

CREATE INDEX IF NOT EXISTS idx_batches_created_at ON public.payroll_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batches_pay_period ON public.payroll_batches(pay_period);


-- 3. PAYROLL EMPLOYEES (Detailed Employee Line Items for each Batch)
CREATE TABLE IF NOT EXISTS public.payroll_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.payroll_batches(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL,
    name TEXT NOT NULL,
    department TEXT,
    designation TEXT,
    position TEXT,
    branch TEXT,
    location TEXT,
    mobile TEXT,
    doj TEXT,
    dob TEXT,
    paid_days NUMERIC(5, 2) DEFAULT 0,
    lop_days NUMERIC(5, 2) DEFAULT 0,
    pay_period TEXT,
    pay_date TEXT,
    tax_regime TEXT,
    pt_state TEXT,
    uan_number TEXT,
    esi_number TEXT,
    pf_account_number TEXT,
    pan_number TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    earnings_breakdown JSONB NOT NULL,
    deductions_breakdown JSONB NOT NULL,
    calculated_net_payable NUMERIC(12, 2) NOT NULL,
    source_net_payable NUMERIC(12, 2),
    net_mismatch BOOLEAN DEFAULT false,
    validation_status TEXT NOT NULL DEFAULT 'ready',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_emp_batch_id ON public.payroll_employees(batch_id);
CREATE INDEX IF NOT EXISTS idx_payroll_emp_employee_id ON public.payroll_employees(employee_id);


-- 4. PAYROLL DRAFTS (Refresh Resilience & Work-In-Progress Auto-Save)
CREATE TABLE IF NOT EXISTS public.payroll_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE DEFAULT 'default_hr_session',
    file_name TEXT,
    pay_period TEXT,
    raw_sheet_data JSONB,
    employees_data JSONB NOT NULL,
    selected_ids JSONB NOT NULL,
    column_mappings JSONB,
    current_step TEXT NOT NULL DEFAULT 'review',
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_drafts_session_id ON public.payroll_drafts(session_id);


-- 5. ENABLE ROW LEVEL SECURITY (RLS) & OPEN ACCESS FOR IN-HOUSE HR TEAM
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_drafts ENABLE ROW LEVEL SECURITY;

-- Allow read & write access for anon & authenticated users (In-House Pioneer HR Team)
CREATE POLICY "Allow all access to company_settings" ON public.company_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to payroll_batches" ON public.payroll_batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to payroll_employees" ON public.payroll_employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to payroll_drafts" ON public.payroll_drafts FOR ALL USING (true) WITH CHECK (true);
