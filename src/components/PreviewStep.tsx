import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  FileText, 
  ArrowLeft,
  Sparkles,
  LayoutTemplate,
  Edit3
} from 'lucide-react';
import { CompanySettings, EmployeeRecord, PayslipTemplate } from '../types';
import { PayslipPreview } from './PayslipPreview';
import { downloadIndividualPayslipPdf } from '../utils/pdfGenerator';

interface PreviewStepProps {
  employees: EmployeeRecord[];
  selectedIds: Set<string>;
  settings: CompanySettings;
  templates: PayslipTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  onGoToTemplateEditor: () => void;
  initialEmployeeId?: string;
  onBackToReview: () => void;
  onStartBulkGeneration: (targetEmployees: EmployeeRecord[], template: PayslipTemplate) => void;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({
  employees,
  selectedIds,
  settings,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onGoToTemplateEditor,
  initialEmployeeId,
  onBackToReview,
  onStartBulkGeneration,
}) => {
  const validEmployees = employees.filter((e) => e.validationStatus !== 'error');

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialEmployeeId) {
      const idx = validEmployees.findIndex((e) => e.id === initialEmployeeId);
      if (idx !== -1) return idx;
    }
    return 0;
  });

  const currentEmployee = validEmployees[currentIndex] || validEmployees[0];
  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < validEmployees.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const selectedValidEmployees = validEmployees.filter((e) => selectedIds.has(e.id));

  return (
    <div className="space-y-6">
      {/* Navigation & Action Bar */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 space-y-4">
        {/* Row 1: Back, Employee Paging, and Template Selector */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              type="button"
              onClick={onBackToReview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded border border-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Table
            </button>

            {/* Employee Paging controls */}
            {validEmployees.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-md border border-slate-200">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-600 rounded hover:bg-slate-200/60"
                  title="Previous Employee"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <select
                  value={currentEmployee?.id}
                  onChange={(e) => {
                    const idx = validEmployees.findIndex((emp) => emp.id === e.target.value);
                    if (idx !== -1) setCurrentIndex(idx);
                  }}
                  className="text-xs font-semibold bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-none"
                >
                  {validEmployees.map((emp, i) => (
                    <option key={emp.id} value={emp.id}>
                      {i + 1}. {emp.id} — {emp.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentIndex === validEmployees.length - 1}
                  className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-600 rounded hover:bg-slate-200/60"
                  title="Next Employee"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Template Selector Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md p-1.5 px-3 text-xs w-full lg:w-auto">
            <LayoutTemplate className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-slate-700">Template:</span>
            <select
              value={selectedTemplateId}
              onChange={(e) => onSelectTemplate(e.target.value)}
              className="text-xs font-bold bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} {tpl.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onGoToTemplateEditor}
              className="text-slate-500 hover:text-emerald-700 p-1 hover:bg-white rounded transition-colors"
              title="Edit this template in Template Editor"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Action Buttons */}
        <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 gap-3">
          <div className="text-xs text-slate-500">
            Previewing with template: <strong className="text-slate-800">{activeTemplate.name}</strong>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download Single PDF button */}
            {currentEmployee && (
              <button
                type="button"
                onClick={() => downloadIndividualPayslipPdf(currentEmployee, settings, activeTemplate)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors"
                title="Download this employee's payslip PDF"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                Download This PDF
              </button>
            )}

            {/* Generate Selected button (if subset selected) */}
            {selectedValidEmployees.length > 0 && selectedValidEmployees.length < validEmployees.length && (
              <button
                type="button"
                onClick={() => onStartBulkGeneration(selectedValidEmployees, activeTemplate)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-300 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Generate Selected ({selectedValidEmployees.length})
              </button>
            )}

            {/* Generate All Payslips Button */}
            <button
              type="button"
              onClick={() => onStartBulkGeneration(validEmployees, activeTemplate)}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate All Payslips ({validEmployees.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Actual A4 Payslip Preview using Active Template */}
      {currentEmployee ? (
        <div className="py-2">
          <PayslipPreview
            employee={currentEmployee}
            settings={settings}
            template={activeTemplate}
          />
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 text-sm">
          No valid employee records to preview.
        </div>
      )}
    </div>
  );
};
