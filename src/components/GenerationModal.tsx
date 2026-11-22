import React from 'react';
import { 
  Download, 
  Files, 
  CheckCircle2, 
  AlertCircle, 
  FileCheck
} from 'lucide-react';
import { BulkGenerationProgress, BulkGenerationResult, downloadZipFile } from '../utils/zipGenerator';
import { EmployeeRecord, CompanySettings, PayslipTemplate } from '../types';
import { downloadIndividualPayslipPdf } from '../utils/pdfGenerator';

interface GenerationModalProps {
  isOpen: boolean;
  progress: BulkGenerationProgress | null;
  result: BulkGenerationResult | null;
  employees: EmployeeRecord[];
  settings: CompanySettings;
  template?: PayslipTemplate;
  payPeriod: string;
  onClose: () => void;
  onViewGeneratedBatches: () => void;
}

export const GenerationModal: React.FC<GenerationModalProps> = ({
  isOpen,
  progress,
  result,
  employees,
  settings,
  template,
  payPeriod,
  onClose,
  onViewGeneratedBatches,
}) => {
  if (!isOpen) return null;

  const isFinished = progress?.isFinished || !!result;
  const percentage = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  const handleDownloadZip = () => {
    if (result?.zipBlob) {
      downloadZipFile(result.zipBlob, payPeriod);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5">
        {!isFinished ? (
          /* Ongoing Generation Progress */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Generating Payslips
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rendering vector PDFs using template: <span className="font-semibold text-slate-700">{template?.name || 'Default'}</span>
                </p>
              </div>
              <div className="text-lg font-mono font-bold text-emerald-700">
                {progress?.completed || 0} / {progress?.total || 0}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-150 ease-out"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Total</span>
                <span className="font-bold text-slate-800">{progress?.total || 0}</span>
              </div>
              <div className="bg-emerald-50/60 p-2 rounded border border-emerald-100">
                <span className="text-[10px] text-emerald-700 block">Generated</span>
                <span className="font-bold text-emerald-800">{progress?.successful || 0}</span>
              </div>
              <div className="bg-red-50/60 p-2 rounded border border-red-100">
                <span className="text-[10px] text-red-600 block">Failed</span>
                <span className="font-bold text-red-700">{progress?.failed || 0}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Remaining</span>
                <span className="font-bold text-slate-800">{progress?.remaining || 0}</span>
              </div>
            </div>

            {/* Current Item Label */}
            {progress?.currentEmployee && (
              <div className="text-[11px] text-slate-400 font-mono truncate">
                Processing: <span className="text-slate-600">{progress.currentEmployee}</span>
              </div>
            )}
          </div>
        ) : (
          /* Finished Screen */
          <div className="space-y-5">
            <div className="text-center py-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {result?.successfulCount || progress?.successful || 0} Payslips Generated Successfully
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Individual A4 vector PDF documents prepared using template <strong>{template?.name || 'Default'}</strong>.
              </p>
            </div>

            {/* Two Primary Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadZip}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download All as ZIP</span>
              </button>
              <button
                type="button"
                onClick={onViewGeneratedBatches}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
              >
                <Files className="w-4 h-4" />
                <span>View Generated Payslips</span>
              </button>
            </div>

            {/* Individual PDFs List / Preview */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600 border-b border-slate-200 flex justify-between items-center">
                <span>Individual Employee Payslips</span>
                <span className="text-slate-400">{employees.length} files</span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-mono text-[11px] text-slate-700 font-medium">
                        {emp.id}
                      </span>
                      <span className="text-slate-800 truncate">{emp.name}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => downloadIndividualPayslipPdf(emp, settings, template)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-0.5 rounded transition-colors shrink-0"
                      title="Download PDF"
                    >
                      <Download className="w-3 h-3" />
                      PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Failed Reports if any */}
            {progress?.errors && progress.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  {progress.errors.length} failed record(s)
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  {progress.errors.map((err, i) => (
                    <li key={i}>
                      {err.employeeId} ({err.name}): {err.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
