import { supabase } from '../lib/supabase';
import { ColumnMapping, EmployeeRecord, WizardStep } from '../types';
import { ParsedSheetData } from '../utils/excelParser';

const LOCAL_DRAFT_KEY = 'pioneer_payroll_draft_session_v1';
const DEFAULT_SESSION_ID = 'default_hr_session';

export interface PayrollDraft {
  id?: string;
  sessionId: string;
  fileName: string;
  payPeriod: string;
  parsedSheetData: ParsedSheetData | null;
  employees: EmployeeRecord[];
  selectedIds: string[];
  columnMappings: ColumnMapping[];
  currentStep: WizardStep;
  updatedAt: string;
}

/**
 * Loads an in-progress draft, checking Supabase first and falling back to localStorage.
 */
export async function loadActiveDraft(): Promise<PayrollDraft | null> {
  try {
    const { data, error } = await supabase
      .from('payroll_drafts')
      .select('*')
      .eq('session_id', DEFAULT_SESSION_ID)
      .maybeSingle();

    if (!error && data && Array.isArray(data.employees_data) && data.employees_data.length > 0) {
      return {
        id: data.id,
        sessionId: data.session_id,
        fileName: data.file_name || 'Payroll_Draft.xlsx',
        payPeriod: data.pay_period || '',
        parsedSheetData: data.raw_sheet_data || null,
        employees: data.employees_data,
        selectedIds: Array.isArray(data.selected_ids) ? data.selected_ids : [],
        columnMappings: data.column_mappings || [],
        currentStep: (data.current_step as WizardStep) || 'review',
        updatedAt: data.updated_at || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('Could not read draft from Supabase, checking local cache:', err);
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.employees) && parsed.employees.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed parsing local draft cache:', err);
  }

  return null;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Saves in-progress draft with automatic debouncing to prevent excessive network requests.
 */
export function saveActiveDraft(draft: Omit<PayrollDraft, 'sessionId' | 'updatedAt'>): void {
  const fullDraft: PayrollDraft = {
    ...draft,
    sessionId: DEFAULT_SESSION_ID,
    updatedAt: new Date().toISOString(),
  };

  // Immediate save to localStorage for rock-solid zero-data-loss immunity
  try {
    localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(fullDraft));
  } catch (err) {
    console.warn('Failed local draft storage:', err);
  }

  // Debounced push to Supabase (500ms)
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      const payload = {
        session_id: DEFAULT_SESSION_ID,
        file_name: fullDraft.fileName,
        pay_period: fullDraft.payPeriod,
        raw_sheet_data: fullDraft.parsedSheetData,
        employees_data: fullDraft.employees,
        selected_ids: fullDraft.selectedIds,
        column_mappings: fullDraft.columnMappings,
        current_step: fullDraft.currentStep,
        updated_at: fullDraft.updatedAt,
      };

      const { data: existing } = await supabase
        .from('payroll_drafts')
        .select('id')
        .eq('session_id', DEFAULT_SESSION_ID)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from('payroll_drafts').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('payroll_drafts').insert([payload]);
      }
    } catch (err) {
      console.warn('Could not persist draft to Supabase:', err);
    }
  }, 500);
}

/**
 * Clears active draft from both Supabase and localStorage.
 */
export async function clearActiveDraft(): Promise<void> {
  if (saveTimeout) clearTimeout(saveTimeout);
  try {
    localStorage.removeItem(LOCAL_DRAFT_KEY);
  } catch (err) {
    console.warn('Error clearing local draft:', err);
  }

  try {
    await supabase.from('payroll_drafts').delete().eq('session_id', DEFAULT_SESSION_ID);
  } catch (err) {
    console.warn('Error clearing Supabase draft:', err);
  }
}
