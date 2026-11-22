import React, { useState } from 'react';
import { Building2, Save, RotateCcw, Check } from 'lucide-react';
import { CompanySettings } from '../types';
import { PIONEER_DEFAULT_SETTINGS } from '../utils/sampleDataGenerator';

interface SettingsPageProps {
  settings: CompanySettings;
  onSaveSettings: (settings: CompanySettings) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleResetToDefaults = () => {
    setFormData(PIONEER_DEFAULT_SETTINGS);
    onSaveSettings(PIONEER_DEFAULT_SETTINGS);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Company & Payslip Configuration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure company details and default parameters printed on generated payslips.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetToDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Pioneer Defaults
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Company Name */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Company Legal Name
            </label>
            <input
              type="text"
              required
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium"
            />
          </div>

          {/* Company Address */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Company Registered Address
            </label>
            <textarea
              rows={2}
              required
              value={formData.companyAddress}
              onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Payroll Period & Pay Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Default Payroll Period / Month
              </label>
              <input
                type="text"
                placeholder="e.g. October 2026"
                value={formData.defaultPayPeriod}
                onChange={(e) => setFormData({ ...formData, defaultPayPeriod: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Default Pay Date
              </label>
              <input
                type="text"
                placeholder="e.g. 31/10/2026"
                value={formData.defaultPayDate}
                onChange={(e) => setFormData({ ...formData, defaultPayDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Currency Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Currency Code
              </label>
              <input
                type="text"
                value={formData.currencyCode}
                onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Text */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Payslip System Footer Note
            </label>
            <input
              type="text"
              value={formData.footerText}
              onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono text-[11px]"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Printed along the bottom margin of each generated PDF.
            </span>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            {isSaved ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Settings updated successfully
              </span>
            ) : (
              <span className="text-slate-400">
                Configurations are stored locally in browser settings.
              </span>
            )}

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

