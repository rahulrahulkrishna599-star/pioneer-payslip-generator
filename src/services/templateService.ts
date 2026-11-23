import { supabase } from '../lib/supabase';
import { PayslipTemplate } from '../types';
import { PIONEER_FORM_T_TEMPLATE, getSavedTemplates, saveTemplateToStorage } from '../utils/templateStorage';

export async function fetchCompanySettingsFromSupabase(): Promise<PayslipTemplate> {
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Could not fetch settings from Supabase, falling back to local:', error.message);
      const local = getSavedTemplates();
      return local[0] || PIONEER_FORM_T_TEMPLATE;
    }

    if (!data) {
      return PIONEER_FORM_T_TEMPLATE;
    }

    const template: PayslipTemplate = {
      id: PIONEER_FORM_T_TEMPLATE.id,
      name: PIONEER_FORM_T_TEMPLATE.name,
      companyName: data.company_name || PIONEER_FORM_T_TEMPLATE.companyName,
      companyAddress: data.company_address || PIONEER_FORM_T_TEMPLATE.companyAddress,
      cityPincode: data.city_pincode || PIONEER_FORM_T_TEMPLATE.cityPincode,
      country: data.country || PIONEER_FORM_T_TEMPLATE.country,
      logoUrl: data.logo_url || PIONEER_FORM_T_TEMPLATE.logoUrl,
      payPeriod: data.default_pay_period || PIONEER_FORM_T_TEMPLATE.payPeriod,
      payDate: data.default_pay_date || PIONEER_FORM_T_TEMPLATE.payDate,
      formTitle: data.form_title || PIONEER_FORM_T_TEMPLATE.formTitle,
      formSubtitle: data.form_subtitle || PIONEER_FORM_T_TEMPLATE.formSubtitle,
      footerText: data.footer_text || PIONEER_FORM_T_TEMPLATE.footerText,
      showSeal: data.show_seal !== false,
      themeColor: 'navy',
      isDefault: true,
    };

    // Cache locally as fallback
    saveTemplateToStorage(template);
    return template;
  } catch (err) {
    console.warn('Network error fetching Supabase settings:', err);
    const local = getSavedTemplates();
    return local[0] || PIONEER_FORM_T_TEMPLATE;
  }
}

export async function saveCompanySettingsToSupabase(template: PayslipTemplate): Promise<void> {
  // Always update local storage first for instant optimistic response
  saveTemplateToStorage(template);

  try {
    const { data: existing } = await supabase
      .from('company_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    const payload = {
      company_name: template.companyName,
      company_address: template.companyAddress,
      city_pincode: template.cityPincode,
      country: template.country,
      logo_url: template.logoUrl,
      default_pay_period: template.payPeriod,
      default_pay_date: template.payDate,
      form_title: template.formTitle,
      form_subtitle: template.formSubtitle,
      footer_text: template.footerText,
      show_seal: template.showSeal,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await supabase.from('company_settings').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('company_settings').insert([payload]);
    }
  } catch (err) {
    console.error('Failed to sync settings to Supabase:', err);
  }
}
