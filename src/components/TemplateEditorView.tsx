import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Save, 
  RotateCcw, 
  Check, 
  Eye,
  Building2,
  Calendar,
  Image as ImageIcon
} from 'lucide-react';
import { PayslipTemplate } from '../types';
import { PIONEER_FORM_T_TEMPLATE } from '../utils/templateStorage';
import { PayslipPreview } from './PayslipPreview';
import { PIONEER_DEFAULT_LOGO_URL } from '../utils/pioneerLogo';

interface TemplateEditorViewProps {
  template: PayslipTemplate;
  onSaveTemplate: (template: PayslipTemplate) => void;
}

export const TemplateEditorView: React.FC<TemplateEditorViewProps> = ({
  template,
  onSaveTemplate,
}) => {
  const [formData, setFormData] = useState<PayslipTemplate>(template || PIONEER_FORM_T_TEMPLATE);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo image should be under 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData({ ...formData, logoUrl: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLogo = () => {
    setFormData({ ...formData, logoUrl: PIONEER_DEFAULT_LOGO_URL });
  };

  const handleSave = () => {
    onSaveTemplate(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            Pioneer Form T Template & Logo Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Customize company header details, address, and upload/change the official logo for payslips.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition-colors self-start sm:self-auto"
        >
          {saveSuccess ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Saved Successfully!</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-4 space-y-5">
          {/* 1. Logo Management Box (Isolated Feature) */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                Company Logo
              </span>
              <button
                type="button"
                onClick={handleResetLogo}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
                title="Reset to default Pioneer logo"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Pioneer</span>
              </button>
            </div>

            {/* Logo Preview & Upload Area */}
            <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-md">
              <div className="w-20 h-16 bg-white border border-slate-200 rounded flex items-center justify-center p-1 overflow-hidden shrink-0">
                <img
                  src={formData.logoUrl || PIONEER_DEFAULT_LOGO_URL}
                  alt="Company Logo Preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors w-full justify-center shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  <span>Upload Logo</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center">
                  PNG or JPEG recommended (transparent background)
                </p>
              </div>
            </div>
          </div>

          {/* 2. Company Details */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3.5 shadow-xs text-xs">
            <span className="text-xs font-bold text-slate-800 block">
              Company Header Information
            </span>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 font-semibold focus:bg-white focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={formData.companyAddress}
                onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  City, Pincode
                </label>
                <input
                  type="text"
                  value={formData.cityPincode || ''}
                  onChange={(e) => setFormData({ ...formData, cityPincode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country || ''}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Payroll Period Defaults */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 shadow-xs text-xs">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Default Pay Period & Dates
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Pay Period
                </label>
                <input
                  type="text"
                  value={formData.payPeriod}
                  onChange={(e) => setFormData({ ...formData, payPeriod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Pay Date
                </label>
                <input
                  type="text"
                  value={formData.payDate}
                  onChange={(e) => setFormData({ ...formData, payDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Footer Note
              </label>
              <input
                type="text"
                value={formData.footerText}
                onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Form T Preview */}
        <div className="lg:col-span-8 bg-slate-100 rounded-lg border border-slate-200 p-4 overflow-x-auto shadow-inner">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-600" />
              Live Form T Payslip Output Preview
            </span>
            <span className="text-[11px] text-slate-500 font-medium bg-white px-2.5 py-0.5 rounded border border-slate-200">
              Vector & Print Synced
            </span>
          </div>

          <PayslipPreview
            template={formData}
            isBlank={true}
          />
        </div>
      </div>
    </div>
  );
};
