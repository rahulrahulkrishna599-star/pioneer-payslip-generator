import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  Copy, 
  Check, 
  LayoutTemplate,
  Eye,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { PayslipTemplate, TemplateFieldConfig, TemplateItemConfig, EmployeeRecord } from '../types';
import { PIONEER_OFFICIAL_TEMPLATE } from '../utils/templateStorage';
import { PayslipPreview } from './PayslipPreview';
import { generateSample50Employees, PIONEER_DEFAULT_SETTINGS } from '../utils/sampleDataGenerator';

interface TemplateEditorViewProps {
  templates: PayslipTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (id: string) => void;
  onSaveTemplate: (template: PayslipTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onDuplicateTemplate: (template: PayslipTemplate) => void;
}

export const TemplateEditorView: React.FC<TemplateEditorViewProps> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  onDuplicateTemplate,
}) => {
  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0] || PIONEER_OFFICIAL_TEMPLATE;
  const [formData, setFormData] = useState<PayslipTemplate>(currentTemplate);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [viewMode, setViewMode] = useState<'split' | 'full-preview'>('split');
  const [zoomMode, setZoomMode] = useState<'fit' | '100'>('fit');
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Auto-fit preview container measurements with immediate frame-0 estimate to prevent layout shift & blur
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [previewContainerWidth, setPreviewContainerWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const mainArea = Math.max(700, window.innerWidth - 240);
      return Math.round(mainArea * 0.48);
    }
    return 520;
  });
  const [sheetMeasuredHeight, setSheetMeasuredHeight] = useState<number>(880);

  useEffect(() => {
    setFormData(currentTemplate);
  }, [currentTemplate.id]);

  useEffect(() => {
    if (!showLivePreview) return;
    const updateDims = () => {
      if (previewContainerRef.current) {
        const w = previewContainerRef.current.clientWidth;
        if (w > 0) setPreviewContainerWidth(w);
      }
      if (sheetRef.current) {
        const h = sheetRef.current.scrollHeight;
        if (h > 0) setSheetMeasuredHeight(h);
      }
    };

    updateDims();
    const timer = setTimeout(updateDims, 50);

    const ro = new ResizeObserver(() => {
      updateDims();
    });

    if (previewContainerRef.current) ro.observe(previewContainerRef.current);
    if (sheetRef.current) ro.observe(sheetRef.current);

    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [showLivePreview, viewMode, formData]);

  // Handle Logo Upload (converts to base64)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 1.5 * 1024 * 1024) {
        alert('Logo image should be under 1.5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData((prev) => ({
            ...prev,
            logoUrl: event.target!.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetToDefaultPioneer = () => {
    setFormData({
      ...PIONEER_OFFICIAL_TEMPLATE,
      id: formData.id,
      name: formData.name,
      isDefault: formData.isDefault,
    });
  };

  const handleAddSummaryField = () => {
    const newField: TemplateFieldConfig = {
      id: `field_${Date.now()}`,
      label: 'New Field',
      fieldKey: 'custom',
      customDefault: 'N/A',
    };
    setFormData((prev) => ({
      ...prev,
      summaryFields: [...prev.summaryFields, newField],
    }));
  };

  const handleRemoveSummaryField = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      summaryFields: prev.summaryFields.filter((f) => f.id !== id),
    }));
  };

  const handleAddEarning = () => {
    const newItem: TemplateItemConfig = {
      id: `earn_${Date.now()}`,
      label: 'Special Allowance',
      fieldKey: 'otherAllowance',
    };
    setFormData((prev) => ({
      ...prev,
      earningsList: [...prev.earningsList, newItem],
    }));
  };

  const handleRemoveEarning = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      earningsList: prev.earningsList.filter((e) => e.id !== id),
    }));
  };

  const handleAddDeduction = () => {
    const newItem: TemplateItemConfig = {
      id: `ded_${Date.now()}`,
      label: 'Staff Deduction',
      fieldKey: 'otherDeduction',
    };
    setFormData((prev) => ({
      ...prev,
      deductionsList: [...prev.deductionsList, newItem],
    }));
  };

  const handleRemoveDeduction = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      deductionsList: prev.deductionsList.filter((d) => d.id !== id),
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTemplate(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const BLANK_TEMPLATE_EMPLOYEE: EmployeeRecord = {
    id: '[EMP-XXXX]',
    name: '[Employee Name]',
    designation: '[Designation / Role]',
    department: '[Department]',
    doj: '[DD-MM-YYYY]',
    uanNumber: '[UAN Number]',
    esiNumber: '[ESI Number]',
    paidDays: 0,
    lopDays: 0,
    payPeriod: formData.payPeriod || 'October 2026',
    payDate: formData.payDate || '01/11/2026',
    basic: 0,
    hra: 0,
    waterAllowance: 0,
    incentive: 0,
    otherAllowance: 0,
    da: 0,
    additionalEarnings: [],
    grossEarnings: 0,
    incomeTax: 0,
    providentFund: 0,
    esi: 0,
    previousMonth: 0,
    advance: 0,
    lateFine: 0,
    otherDeduction: 0,
    additionalDeductions: [],
    totalDeductions: 0,
    calculatedNetPayable: 0,
    netMismatch: false,
    validationStatus: 'ready',
    validationErrors: [],
    validationWarnings: [],
    rawRow: {},
    pfEsiApplicable: 'Yes',
  };

  const displayEmployee: EmployeeRecord = {
    ...BLANK_TEMPLATE_EMPLOYEE,
    payPeriod: formData.payPeriod || 'October 2026',
    payDate: formData.payDate || '01/11/2026',
  };

  const SHEET_WIDTH = 780;
  let previewScale = 1.0;
  if (zoomMode === 'fit') {
    // 36px cushion (18px padding on each side) for clean margin around the paper sheet
    const availableWidth = Math.max(260, previewContainerWidth - 36);
    // Snap to 2 decimal places to avoid fractional subpixel font blurring
    previewScale = Math.min(1.0, Math.round((availableWidth / SHEET_WIDTH) * 100) / 100);
  } else {
    previewScale = 1.0;
  }
  const scaledWidth = Math.round(SHEET_WIDTH * previewScale);
  const scaledHeight = Math.round(sheetMeasuredHeight * previewScale);
  const isZoomSupported = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('zoom', '1');

  return (
    <div className="space-y-6">
      {/* Top Template Management Bar */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">
                Payslip Template Editor
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize company details, logo, colors, pay components, and fields for each template.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Template Selector Dropdown */}
            <select
              value={selectedTemplateId}
              onChange={(e) => onSelectTemplate(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} {tpl.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>

            {/* Create New Template */}
            <button
              type="button"
              onClick={() => {
                const newId = `template_${Date.now()}`;
                const newTpl: PayslipTemplate = {
                  ...formData,
                  id: newId,
                  name: `Custom Template ${templates.length + 1}`,
                  isDefault: false,
                };
                onSaveTemplate(newTpl);
                onSelectTemplate(newId);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Template
            </button>

            {/* Duplicate */}
            <button
              type="button"
              onClick={() => onDuplicateTemplate(formData)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors"
              title="Duplicate this template"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              Duplicate
            </button>

            {/* Delete */}
            {templates.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete template "${formData.name}"?`)) {
                    onDeleteTemplate(formData.id);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md border border-red-200 transition-colors"
                title="Delete template"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}

            {/* Live Preview Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !showLivePreview;
                setShowLivePreview(next);
                if (next) setViewMode('split');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                showLivePreview
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {showLivePreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Visual Editor Form & Live Preview */}
      <div className={`grid grid-cols-1 ${showLivePreview && viewMode === 'split' ? 'lg:grid-cols-12' : ''} gap-6 items-start`}>
        {/* Left Form: Visual Template Form (Matches user's screenshot layout) */}
        <div className={`${showLivePreview ? (viewMode === 'full-preview' ? 'hidden' : 'lg:col-span-6 2xl:col-span-6') : 'w-full'} bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 text-xs`}>
          {/* Template Meta Settings */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:bg-white focus:outline-none rounded text-xs font-bold text-slate-900 transition-all"
              />
            </div>

            <div className="flex items-center gap-4 pt-4">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Set as Default</span>
              </label>

              {/* Theme Color */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">Accent:</span>
                {(['emerald', 'navy', 'blue', 'slate'] as const).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, themeColor: color })}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                      color === 'emerald'
                        ? 'bg-emerald-600'
                        : color === 'navy'
                        ? 'bg-slate-900'
                        : color === 'blue'
                        ? 'bg-blue-600'
                        : 'bg-slate-600'
                    } ${
                      formData.themeColor === color ? 'scale-125 border-slate-900 shadow-xs' : 'border-white'
                    }`}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 1. Header & Logo Upload Box */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-100">
            {/* Logo Uploader */}
            <div className="flex items-start gap-3">
              <div
                onClick={() => logoInputRef.current?.click()}
                className="w-28 h-20 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 rounded-md flex flex-col items-center justify-center p-2 cursor-pointer transition-all bg-white text-center"
              >
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                {formData.logoUrl && formData.logoUrl !== 'default-pioneer' ? (
                  <img
                    src={formData.logoUrl}
                    alt="Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-blue-500 mb-1" />
                    <span className="text-[11px] font-semibold text-blue-600">Upload</span>
                  </>
                )}
              </div>

              <div className="space-y-0.5">
                <div className="font-semibold text-slate-800 text-xs">Upload Logo</div>
                <div className="text-[10px] text-slate-400 max-w-[160px] leading-tight">
                  240 x 240 pixels @ 72 DPI, Maximum size of 1.5MB.
                </div>
                {formData.logoUrl && formData.logoUrl !== 'default-pioneer' && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logoUrl: 'default-pioneer' })}
                    className="text-[10px] text-red-600 hover:underline pt-1 block"
                  >
                    Reset to Pioneer Logo
                  </button>
                )}
              </div>
            </div>

            {/* Top Right: Payslip For the Month & Pay Date */}
            <div className="text-right space-y-1.5 w-full sm:w-auto">
              <span className="text-slate-500 text-[11px] block">Payslip For the Month</span>
              <input
                type="text"
                value={formData.payPeriod}
                onChange={(e) => setFormData({ ...formData, payPeriod: e.target.value })}
                className="block text-right font-bold text-sm text-slate-900 px-2.5 py-1 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:bg-white focus:outline-none rounded transition-all w-full sm:w-44 ml-auto"
                placeholder="e.g. October 2026"
              />
              <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1 pt-0.5">
                <span>Pay Date:</span>
                <input
                  type="text"
                  value={formData.payDate}
                  onChange={(e) => setFormData({ ...formData, payDate: e.target.value })}
                  className="text-right text-slate-800 font-medium px-2 py-0.5 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:bg-white focus:outline-none rounded transition-all w-28"
                  placeholder="01/11/2026"
                />
              </div>
            </div>
          </div>

          {/* 2. Company Details Inputs */}
          <div className="space-y-2.5 max-w-md">
            <div>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Company Name*"
                className="w-full px-3 py-2 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:bg-white focus:outline-none rounded text-xs font-bold text-slate-900 transition-all"
              />
            </div>
            <div>
              <input
                type="text"
                value={formData.companyAddress}
                onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                placeholder="Company Address"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:bg-white focus:outline-none rounded text-xs text-slate-700 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.cityPincode || ''}
                onChange={(e) => setFormData({ ...formData, cityPincode: e.target.value })}
                placeholder="City, Pincode"
                className="w-1/2 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:bg-white focus:outline-none rounded text-xs text-slate-700 transition-all"
              />
              <input
                type="text"
                value={formData.country || 'India'}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Country"
                className="w-1/2 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:bg-white focus:outline-none rounded text-xs text-slate-700 transition-all"
              />
            </div>
          </div>

          {/* 3. Layout & Visual Display Options */}
          <div className="pt-2 space-y-4">
            <div className="font-bold text-slate-900 text-xs">
              Template Display Preferences
            </div>

            <div className="space-y-3 bg-slate-50/70 p-4 rounded-lg border border-slate-200">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={formData.showAmountInWords !== false}
                  onChange={(e) => setFormData({ ...formData, showAmountInWords: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Print Total Net Payable in Indian Words (e.g., <em>Indian Rupee Sixty-One Thousand Only</em>)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={formData.showAttendanceSummary !== false}
                  onChange={(e) => setFormData({ ...formData, showAttendanceSummary: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Include Attendance Breakdown (Paid Days & LOP Days) in Net Pay Summary Box</span>
              </label>
            </div>

            {/* Explanatory Callout regarding Column Mapping vs Template */}
            <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-lg text-[11px] text-emerald-950 flex items-start gap-2.5 leading-relaxed">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                i
              </div>
              <div>
                <strong>Automatic Payroll Column Mapping:</strong> Specific salary components (Basic, HRA, WA, Incentive, TDS, PF, ESI, etc.) are dynamically extracted from your uploaded Excel/CSV file during <strong>Step 2 (Column Mapping)</strong>.
                <div className="mt-1 text-emerald-800">
                  To adjust specific figures or add one-off bonuses/deductions for individual employees, use the <strong>Edit / Adjust</strong> tool in <strong>Step 3 (Employee Data Review)</strong>.
                </div>
              </div>
            </div>
          </div>

          {/* Footer note editor */}
          <div className="pt-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Footer Note
            </label>
            <input
              type="text"
              value={formData.footerText}
              onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:bg-white focus:outline-none rounded text-xs text-slate-700 transition-all"
            />
          </div>

          {/* Bottom Action Buttons */}
          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetToDefaultPioneer}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Template Saved!
                </span>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Template
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Live Payslip Preview with Proportional Auto-Fit Container */}
        {showLivePreview && (
          <div className={`${viewMode === 'full-preview' ? 'col-span-12 max-w-4xl mx-auto w-full' : 'lg:col-span-6 2xl:col-span-6'} space-y-3 sticky top-4`}>
            <div className="flex flex-wrap items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-t-lg gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">
                  Live Output Preview
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  ({formData.name})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Zoom Mode Selector */}
                <div className="flex items-center bg-slate-800 rounded p-0.5 border border-slate-700 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setZoomMode('fit')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors ${
                      zoomMode === 'fit' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Auto-Fit
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomMode('100')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors ${
                      zoomMode === '100' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    100%
                  </button>
                </div>

                {/* View Mode Toggle (Full Preview vs Split) */}
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'split' ? 'full-preview' : 'split')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                  title={viewMode === 'split' ? 'Expand to Full Preview' : 'Back to Split View'}
                >
                  {viewMode === 'split' ? (
                    <>
                      <Maximize2 className="w-3 h-3 text-slate-300" />
                      <span className="hidden sm:inline">Full View</span>
                    </>
                  ) : (
                    <>
                      <Minimize2 className="w-3 h-3 text-slate-300" />
                      <span className="hidden sm:inline">Split View</span>
                    </>
                  )}
                </button>

                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono hidden md:inline">
                  100% Vector Synced
                </span>
              </div>
            </div>

            {/* Crystal-sharp preview wrapper (uses native CSS zoom for DirectWrite/subpixel ClearType sharpness, with 0 blur) */}
            <div
              ref={previewContainerRef}
              className="bg-slate-200/80 p-4 sm:p-6 rounded-b-lg border border-slate-200 overflow-x-auto min-h-[520px] shadow-inner"
            >
              {isZoomSupported ? (
                <div
                  style={{
                    zoom: previewScale,
                    width: `${SHEET_WIDTH}px`,
                    textRendering: 'geometricPrecision',
                    WebkitFontSmoothing: 'subpixel-antialiased',
                  }}
                  className="mx-auto"
                >
                  <PayslipPreview
                    employee={displayEmployee}
                    settings={{
                      ...PIONEER_DEFAULT_SETTINGS,
                      companyName: formData.companyName,
                      companyAddress: formData.companyAddress,
                      defaultPayPeriod: formData.payPeriod,
                      defaultPayDate: formData.payDate,
                      footerText: formData.footerText,
                    }}
                    template={formData}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: `${scaledWidth}px`,
                    height: sheetMeasuredHeight ? `${scaledHeight}px` : 'auto',
                    minWidth: `${scaledWidth}px`,
                  }}
                  className="mx-auto relative shrink-0"
                >
                  <div
                    ref={sheetRef}
                    style={{
                      width: `${SHEET_WIDTH}px`,
                      transform: `scale(${previewScale})`,
                      transformOrigin: 'top left',
                      textRendering: 'geometricPrecision',
                      WebkitFontSmoothing: 'subpixel-antialiased',
                    }}
                    className="origin-top-left"
                  >
                    <PayslipPreview
                      employee={displayEmployee}
                      settings={{
                        ...PIONEER_DEFAULT_SETTINGS,
                        companyName: formData.companyName,
                        companyAddress: formData.companyAddress,
                        defaultPayPeriod: formData.payPeriod,
                        defaultPayDate: formData.payDate,
                        footerText: formData.footerText,
                      }}
                      template={formData}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
