import React from 'react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  Download, 
  Files, 
  ShieldCheck, 
  CheckCircle,
  ArrowRight,
  Clock,
  LayoutTemplate,
  Layers
} from 'lucide-react';
import { BatchHistoryItem, CompanySettings } from '../types';
import { downloadSamplePayrollTemplate } from '../utils/sampleDataGenerator';
import { downloadZipFile } from '../utils/zipGenerator';
import { formatIndianCurrency } from '../utils/numberToWords';

interface DashboardViewProps {
  onStartUpload: () => void;
  onLoadSample: () => void;
  onGoToHistory: () => void;
  onGoToTemplates?: () => void;
  recentBatches: BatchHistoryItem[];
  settings: CompanySettings;
  activeTemplateName?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onStartUpload,
  onLoadSample,
  onGoToHistory,
  onGoToTemplates,
  recentBatches,
  settings,
  activeTemplateName = 'Pioneer Official Reference',
}) => {
  const latestBatch = recentBatches[0];

  return (
    <div className="space-y-6">
      {/* 1. Operational Hub Header */}
      <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-7 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold border border-emerald-500/30 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Operational Hub
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Pioneer Payroll Operations
          </h2>
          <p className="text-slate-300 text-xs mt-1 max-w-xl">
            Upload payroll sheets, validate employee records, and export vector A4 payslips in bulk.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onStartUpload}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Generate New Run</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Three High-Utility Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Direct File Upload */}
        <div 
          onClick={onStartUpload}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm mb-3 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
            Upload Payroll Sheet
          </h3>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Upload XLSX, XLS, or CSV. The intelligent engine auto-detects columns and formats numbers.
          </p>
          <div className="mt-4 text-xs font-semibold text-emerald-700 flex items-center gap-1">
            <span>Upload File</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Download Official Template */}
        <div 
          onClick={downloadSamplePayrollTemplate}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm mb-3 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Download className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
            Download Excel Template
          </h3>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Get the official pre-formatted spreadsheet configured specifically for Pioneer Corporation.
          </p>
          <div className="mt-4 text-xs font-semibold text-blue-700 flex items-center gap-1">
            <span>Download .XLSX</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Test with 50 Sample Employees */}
        <div 
          onClick={onLoadSample}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-purple-500 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm mb-3 border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
            Load 50 Sample Employees
          </h3>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Instant 1-click test with verified payroll data to test templates and ZIP generation immediately.
          </p>
          <div className="mt-4 text-xs font-semibold text-purple-700 flex items-center gap-1">
            <span>Load Sample Data</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* 3. Operational Grid: Recent Generation History & Active Template Config */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Generation Batches & Instant Re-Download */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Recent Generation Runs
              </h3>
            </div>
            {recentBatches.length > 0 && (
              <button
                type="button"
                onClick={onGoToHistory}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                View All History ({recentBatches.length}) →
              </button>
            )}
          </div>

          {recentBatches.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <Files className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-600">No generation runs in current session.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Upload a payroll file or load sample records to generate your first batch.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentBatches.slice(0, 3).map((b) => {
                const totalPayout = b.employees.reduce((sum, e) => sum + e.calculatedNetPayable, 0);

                return (
                  <div key={b.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{b.fileName}</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                          {b.payPeriod}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-3">
                        <span>{b.successCount} Payslips Generated</span>
                        <span>•</span>
                        <span className="font-medium text-slate-700 font-mono">
                          Net Payout: {formatIndianCurrency(totalPayout)}
                        </span>
                        <span>•</span>
                        <span>{b.date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const zipBlob = (b as any)._zipBlob;
                          if (zipBlob) {
                            downloadZipFile(zipBlob, `Pioneer_Corporation_Payslips_${b.payPeriod}.zip`);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download ZIP</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Active Template & System Configuration */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Active Template
              </h3>
            </div>
            {onGoToTemplates && (
              <button
                type="button"
                onClick={onGoToTemplates}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                Customize →
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Template Name:</span>
              <span className="font-bold text-slate-900">{activeTemplateName}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Company:</span>
              <span className="font-semibold text-slate-800">{settings.companyName}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Registered Address:</span>
              <span className="text-slate-600 leading-snug block text-[11px] mt-0.5">
                {settings.companyAddress}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[11px]">
              <span className="text-slate-500">PDF Output Engine:</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                1500+ DPI Vector
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

