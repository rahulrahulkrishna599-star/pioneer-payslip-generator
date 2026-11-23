import { PayslipTemplate } from '../types';
import { PIONEER_DEFAULT_LOGO_URL } from './pioneerLogo';

export function formatFullAddress(
  address?: string,
  cityPincode?: string,
  country?: string
): string {
  const parts: string[] = [];
  const cleanAddr = (address || '').trim();
  const cleanCity = (cityPincode || '').trim();
  const cleanCountry = (country || '').trim();

  if (cleanAddr) parts.push(cleanAddr);
  if (cleanCity && !cleanAddr.toLowerCase().includes(cleanCity.toLowerCase())) {
    parts.push(cleanCity);
  }
  if (cleanCountry && !cleanAddr.toLowerCase().includes(cleanCountry.toLowerCase())) {
    parts.push(cleanCountry);
  }
  return parts.filter(Boolean).join(', ');
}

export const PIONEER_FORM_T_TEMPLATE: PayslipTemplate = {
  id: 'template-pioneer-form-t',
  name: 'Pioneer Form T - Wages Slip',
  companyName: 'PIONEER CORPORATION',
  companyAddress: '358, Mettupalayam Road, Tatabad',
  cityPincode: 'Coimbatore - 641043',
  country: 'India',
  logoUrl: PIONEER_DEFAULT_LOGO_URL,
  payPeriod: 'October 2026',
  payDate: '01/11/2026',
  formTitle: 'FORM T - WAGES SLIP',
  formSubtitle: '(See Sub-Rule (6) of Rule 1 of the Tamil Nadu Shops and Establishments Rules, 1948)',
  footerText: '-- This is a computer-generated payslip under Tamil Nadu Shops & Establishments Rules, 1948 --',
  showSeal: true,
  themeColor: 'navy',
  isDefault: true,
};

// Aliased export for backward compatibility
export const PIONEER_OFFICIAL_TEMPLATE = PIONEER_FORM_T_TEMPLATE;

const TEMPLATE_STORAGE_KEY = 'pioneer_saved_form_t_template_v6';

export function getSavedTemplates(): PayslipTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify([PIONEER_FORM_T_TEMPLATE]));
      return [PIONEER_FORM_T_TEMPLATE];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge with default to guarantee new Form T fields are present
      return [{
        ...PIONEER_FORM_T_TEMPLATE,
        ...parsed[0],
        id: PIONEER_FORM_T_TEMPLATE.id,
        name: PIONEER_FORM_T_TEMPLATE.name,
      }];
    }
    return [PIONEER_FORM_T_TEMPLATE];
  } catch (err) {
    console.warn('Failed to load template from localStorage', err);
    return [PIONEER_FORM_T_TEMPLATE];
  }
}

export function saveTemplateToStorage(template: PayslipTemplate): PayslipTemplate[] {
  const updated = [{ ...PIONEER_FORM_T_TEMPLATE, ...template, id: PIONEER_FORM_T_TEMPLATE.id }];
  try {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save template to localStorage', err);
  }
  return updated;
}

export function deleteTemplateFromStorage(templateId: string): PayslipTemplate[] {
  // Only 1 authoritative template exists; resets to default
  const reset = [PIONEER_FORM_T_TEMPLATE];
  try {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(reset));
  } catch (err) {
    console.error('Failed to reset template', err);
  }
  return reset;
}

export function setDefaultTemplateInStorage(templateId: string): PayslipTemplate[] {
  return [PIONEER_FORM_T_TEMPLATE];
}
