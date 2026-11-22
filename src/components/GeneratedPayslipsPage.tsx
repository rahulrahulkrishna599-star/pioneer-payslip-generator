import React, { useState } from 'react';
import { 
  Download, 
  Files, 
  Trash2, 
  Eye, 
  Clock, 
  Info,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import { BatchHistoryItem, CompanySettings, EmployeeRecord } from '../types';
import { downloadZipFile } from '../utils/zipGenerator';
import { downloadIndividualPayslipPdf } from '../utils/pdfGenerator';
import { formatIndianCurrency } from '../utils/numberToWords';
import { PayslipPreview } from './PayslipPreview';

interface GeneratedPayslipsPageProps {
  batches: BatchHistoryItem[];
  settings: CompanySettings;
  onClearBatches: () => void;
  onNewBatch: () => void;
}

export const GeneratedPayslipsPage: React.FC<GeneratedPayslipsPageProps> = ({
  batches,
  settings,
  onClearBatches,
  onNewBatch,
}) => {
  const [selectedBatch, setSelectedBatch] = useState<BatchHistoryItem | null>(null);
  const [inspectEmployee, setInspectEmployee] = useState<EmployeeRecord | null>(null);

  // Compute session-wide generated statistics
  const totalSlips = batches.reduce((acc, b) => acc + b.successCount, 0);
  const totalNetPayout = batches.reduce(
    (acc, b) => acc + b.employees.reduce((s, e) => s + e.calculatedNetPayable, 0),
    0
  );
  const totalGross = batches.reduce(
    (acc, b) => acc + b.employees.reduce((s, e) => s + e.grossEarnings, 0),
    0
  );
  const totalDeductions = batches.reduce(
    (acc, b) => acc + b.employees.reduce((s, e) => s + e.totalDeductions, 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Generated Payslips Archive
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Access, inspect, and re-download generated PDF payslips and ZIP packages from your current session.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNewBatch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              New Payroll Upload
            </button>
            {batches.length > 0 && (
              <button
                type="button"
                onClick={onClearBatches}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded border border-slate-200 transition-colors"
                title="Clear current session history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Session
              </button>
            )}
          </div>
        </div>

        {/* Temporary Storage Notice */}
        <div className="mt-4 p-3 bg-blue-50/60 border border-blue-200 rounded text-xs text-blue-900 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong>Session Retention:</strong> Generated PDF files and ZIP archives are retained in client-side memory for the duration of this browser session. Refreshing or closing this tab will clear temporary memory. Please download your ZIP archive before closing.
          </div>
        </div>
      </div>

      {/* Generated Statistics Cards */}
      {batches.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500 block">Total Slips Generated</span>
            <span className="text-2xl font-bold text-slate-900 block mt-1 font-mono">{totalSlips}</span>
            <span className="text-[11px] text-emerald-600 mt-1 block">Across {batches.length} batch(es)</span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500 block">Total Net Disbursal</span>
            <span className="text-2xl font-bold text-emerald-700 block mt-1 font-mono">{formatIndianCurrency(totalNetPayout)}</span>
            <span className="text-[11px] text-slate-400 mt-1 block">Ready for disbursement</span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500 block">Total Gross Earnings</span>
            <span className="text-2xl font-bold text-slate-900 block mt-1 font-mono">{formatIndianCurrency(totalGross)}</span>
            <span className="text-[11px] text-slate-400 mt-1 block">Basic + Allowances</span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500 block">Total Deductions</span>
            <span className="text-2xl font-bold text-slate-900 block mt-1 font-mono">{formatIndianCurrency(totalDeductions)}</span>
            <span className="text-[11px] text-slate-400 mt-1 block">TDS + PF + ESI + Other</span>
          </div>
        </div>
      )}

      {/* Batches List */}
      {batches.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Files className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            No Generated Batches Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Upload your payroll spreadsheet and generate payslips to view and download batch archives here.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={onNewBatch}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition-colors"
            >
              Start Payslip Generation
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs font-semibold text-slate-700">
              <span>{batches.length} Batch(es) in Memory</span>
            </div>

            <div className="divide-y divide-slate-100">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">
                        {batch.payPeriod}
                      </span>
                      <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {batch.fileName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {batch.date}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-emerald-700">
                        {batch.successCount} of {batch.totalCount} Generated
                      </span>
                      {batch.failedCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-red-600 font-semibold">
                            {batch.failedCount} Failed
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Individual Files */}
                    <button
                      type="button"
                      onClick={() => setSelectedBatch(selectedBatch?.id === batch.id ? null : batch)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded border border-slate-200 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      {selectedBatch?.id === batch.id ? 'Hide Files' : 'View Files'}
                    </button>

                    {/* Download ZIP */}
                    {batch.generatedBlobs && (
                      <button
                        type="button"
                        onClick={() => {
                          const zipBlob = (batch as any)._zipBlob;
                          if (zipBlob) {
                            downloadZipFile(zipBlob, batch.payPeriod);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-300 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download ZIP
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expanded Batch Files Viewer */}
          {selectedBatch && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Batch Files: {selectedBatch.payPeriod}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedBatch.employees.length} individual employee payslip PDFs
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto p-1">
                {selectedBatch.employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="p-2.5 rounded border border-slate-200 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-mono font-bold text-[11px] text-slate-800">
                        {emp.id}
                      </div>
                      <div className="text-slate-600 font-medium truncate">
                        {emp.name}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setInspectEmployee(emp)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadIndividualPayslipPdf(emp, settings)}
                        className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individual Inspect Modal */}
          {inspectEmployee && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-slate-100 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
                <div className="p-4 bg-white border-b border-slate-200 rounded-t-xl flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Payslip: {inspectEmployee.id} - {inspectEmployee.name}
                    </h3>
                    <p className="text-xs text-slate-500">{inspectEmployee.payPeriod}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadIndividualPayslipPdf(inspectEmployee, settings)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectEmployee(null)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto">
                  <PayslipPreview employee={inspectEmployee} settings={settings} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

