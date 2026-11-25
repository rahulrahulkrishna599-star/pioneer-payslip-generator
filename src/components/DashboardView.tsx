import React from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { BatchHistoryItem, CompanySettings, PayslipTemplate } from '../types';
import { downloadSamplePayrollTemplate } from '../utils/sampleDataGenerator';
import { WorkforceCharts } from './WorkforceCharts';

interface DashboardViewProps {
  onStartUpload: () => void;
  onLoadSample?: () => void;
  onGoToHistory: () => void;
  onGoToTemplates?: () => void;
  recentBatches: BatchHistoryItem[];
  settings: CompanySettings;
  activeTemplateName?: string;
  template?: PayslipTemplate;
  isAdmin?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onStartUpload,
  recentBatches,
  settings,
  template,
  isAdmin = false,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Operational Hub Header */}
      <div className="bg-[#0f2744] text-white rounded-xl p-6 sm:p-7 shadow-xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold border border-emerald-500/30 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Executive Workforce Hub
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Pioneer Payroll Operations
          </h2>
          <p className="text-slate-300 text-xs mt-1 max-w-xl leading-relaxed">
            Live workforce analytics, location mapping, role distributions, and batch generator.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={downloadSamplePayrollTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/15 rounded-lg border border-white/20 transition-colors cursor-pointer"
            title="Download Pioneer Payroll Spreadsheet Template"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Template</span>
          </button>

          <button
            type="button"
            onClick={onStartUpload}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Generate New Run</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Workforce Demographics & Drill-Down Directory */}
      <WorkforceCharts 
        batches={recentBatches} 
        settings={settings}
        template={template}
        onStartUpload={onStartUpload}
        isAdmin={isAdmin}
      />
    </div>
  );
};
