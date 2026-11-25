import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
  RotateCcw,
  Search,
  X,
  CheckCircle2,
  Check,
  Users,
  Calendar,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { CompanySettings, EmployeeRecord, PayslipTemplate, getEmployeeRecordKey } from '../types';
import { PayslipPreview } from './PayslipPreview';
import { downloadIndividualPayslipPdf } from '../utils/pdfGenerator';
import { PIONEER_DEFAULT_LOGO_URL } from '../utils/pioneerLogo';
import { formatIndianCurrency } from '../utils/numberToWords';

interface PreviewStepProps {
  employees: EmployeeRecord[];
  selectedIds: Set<string>;
  settings: CompanySettings;
  template: PayslipTemplate;
  onUpdateLogo?: (newLogoUrl: string) => void;
  initialEmployeeId?: string;
  onBackToReview: () => void;
  onStartBulkGeneration: (targetEmployees: EmployeeRecord[], template: PayslipTemplate) => void;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({
  employees,
  selectedIds,
  settings,
  template,
  onUpdateLogo,
  initialEmployeeId,
  onBackToReview,
  onStartBulkGeneration,
}) => {
  const validEmployees = useMemo(
    () => employees.filter((e) => e.validationStatus !== 'error'),
    [employees]
  );

  const selectedValidEmployees = useMemo(
    () => validEmployees.filter((e) => selectedIds.has(getEmployeeRecordKey(e))),
    [validEmployees, selectedIds]
  );

  // Default queue scope: "selected" if user selected a subset or all, else "all"
  const [queueScope, setQueueScope] = useState<'selected' | 'all'>(() =>
    selectedValidEmployees.length > 0 ? 'selected' : 'all'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(true);

  const baseQueue = queueScope === 'selected' && selectedValidEmployees.length > 0
    ? selectedValidEmployees
    : validEmployees;

  const filteredQueue = useMemo(() => {
    if (!searchQuery.trim()) return baseQueue;
    const q = searchQuery.toLowerCase().trim();
    return baseQueue.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        (e.designation || '').toLowerCase().includes(q) ||
        (e.payPeriod || '').toLowerCase().includes(q)
    );
  }, [baseQueue, searchQuery]);

  // Active record key being previewed
  const [activeKey, setActiveKey] = useState<string>(() => {
    if (initialEmployeeId) {
      const match = validEmployees.find(
        (e) => getEmployeeRecordKey(e) === initialEmployeeId || e.id === initialEmployeeId
      );
      if (match) return getEmployeeRecordKey(match);
    }
    const first = baseQueue[0] || validEmployees[0];
    return first ? getEmployeeRecordKey(first) : '';
  });

  // Track which payslips HR has inspected/viewed during this preview pass
  const [viewedKeys, setViewedKeys] = useState<Set<string>>(() =>
    activeKey ? new Set([activeKey]) : new Set()
  );

  // Sync activeKey if initialEmployeeId or filteredQueue changes and current item is missing
  useEffect(() => {
    if (filteredQueue.length === 0) return;
    const stillVisible = filteredQueue.some((e) => getEmployeeRecordKey(e) === activeKey);
    if (!stillVisible) {
      const firstKey = getEmployeeRecordKey(filteredQueue[0]);
      setActiveKey(firstKey);
      setViewedKeys((prev) => new Set(prev).add(firstKey));
    }
  }, [filteredQueue, activeKey]);

  const currentIndex = useMemo(() => {
    const idx = filteredQueue.findIndex((e) => getEmployeeRecordKey(e) === activeKey);
    return idx >= 0 ? idx : 0;
  }, [filteredQueue, activeKey]);

  const currentEmployee = filteredQueue[currentIndex] || baseQueue[0] || validEmployees[0];

  const selectQueueItem = (emp: EmployeeRecord) => {
    const key = getEmployeeRecordKey(emp);
    setActiveKey(key);
    setViewedKeys((prev) => new Set(prev).add(key));
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      selectQueueItem(filteredQueue[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredQueue.length - 1) {
      selectQueueItem(filteredQueue[currentIndex + 1]);
    }
  };

  // Keyboard navigation (ArrowLeft / ArrowRight / ArrowUp / ArrowDown) when not typing in inputs
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (currentIndex > 0) {
          e.preventDefault();
          selectQueueItem(filteredQueue[currentIndex - 1]);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (currentIndex < filteredQueue.length - 1) {
          e.preventDefault();
          selectQueueItem(filteredQueue[currentIndex + 1]);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentIndex, filteredQueue]);

  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && onUpdateLogo) {
          onUpdateLogo(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLogo = () => {
    if (onUpdateLogo) {
      onUpdateLogo(PIONEER_DEFAULT_LOGO_URL);
    }
  };

  const generationTargets = selectedValidEmployees.length > 0 ? selectedValidEmployees : validEmployees;
  const inspectedInScopeCount = useMemo(
    () => baseQueue.filter((e) => viewedKeys.has(getEmployeeRecordKey(e))).length,
    [baseQueue, viewedKeys]
  );

  return (
    <div className="space-y-4">
      {/* Top Compact Command & Generation Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToReview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Table</span>
          </button>

          {baseQueue.length > 1 && (
            <button
              type="button"
              onClick={() => setIsQueueOpen(!isQueueOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              title={isQueueOpen ? 'Collapse queue panel' : 'Expand queue panel'}
            >
              {isQueueOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isQueueOpen ? 'Hide Queue' : `Show Queue (${baseQueue.length})`}</span>
            </button>
          )}

          {/* Logo Quick Tool */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="hidden sm:inline">Form T Template</span>
            </span>
            <div className="h-3.5 w-px bg-slate-200 hidden sm:block"></div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png, image/jpeg, image/svg+xml"
              className="hidden"
              onChange={handleLogoFileChange}
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded transition-colors cursor-pointer"
              title="Change or upload a custom logo"
            >
              <ImageIcon className="w-3 h-3 text-slate-600" />
              <span>Logo</span>
            </button>
            <button
              type="button"
              onClick={handleResetLogo}
              className="p-0.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded transition-colors cursor-pointer"
              title="Reset to official Pioneer logo"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right Primary Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {currentEmployee && (
            <button
              type="button"
              onClick={async () => {
                await downloadIndividualPayslipPdf(currentEmployee, settings, template);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              title="Download only this currently previewed payslip PDF"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Download This PDF</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onStartBulkGeneration(generationTargets, template)}
            disabled={generationTargets.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              Generate {selectedValidEmployees.length > 0 && selectedValidEmployees.length < validEmployees.length ? 'Selected' : 'All'} Payslips ({generationTargets.length})
            </span>
          </button>
        </div>
      </div>

      {/* Master-Detail Split Workspace */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* LEFT PANEL: High-Volume Scalable Queue Navigator */}
        {isQueueOpen && baseQueue.length > 0 && (
          <aside className="w-full lg:w-80 xl:w-[340px] shrink-0 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden lg:sticky lg:top-6">
            {/* Queue Header & Stats */}
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Users className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Preview Queue</span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Viewed {inspectedInScopeCount}/{baseQueue.length}
                </span>
              </div>

              {/* Scope Toggle (Selected vs All Valid) */}
              {selectedValidEmployees.length > 0 && selectedValidEmployees.length < validEmployees.length && (
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200/70 rounded-lg text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setQueueScope('selected')}
                    className={`py-1 rounded-md transition-all cursor-pointer ${
                      queueScope === 'selected'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Selected ({selectedValidEmployees.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueueScope('all')}
                    className={`py-1 rounded-md transition-all cursor-pointer ${
                      queueScope === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Valid ({validEmployees.length})
                  </button>
                </div>
              )}

              {/* Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ID, name, or month..."
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Queue Cards */}
            <div className="max-h-[420px] lg:max-h-[calc(100vh-280px)] overflow-y-auto divide-y divide-slate-100">
              {filteredQueue.length === 0 ? (
                <div className="py-10 px-4 text-center text-xs text-slate-400">
                  No payslips match "{searchQuery}".
                </div>
              ) : (
                filteredQueue.map((emp, idx) => {
                  const key = getEmployeeRecordKey(emp);
                  const isActive = currentEmployee && getEmployeeRecordKey(currentEmployee) === key;
                  const isViewed = viewedKeys.has(key);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectQueueItem(emp)}
                      className={`w-full text-left p-3 transition-colors flex items-start justify-between gap-2 cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50/90 border-l-4 border-l-emerald-600'
                          : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-slate-400 font-semibold">
                            #{idx + 1}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-slate-800">
                            {emp.id}
                          </span>
                          {emp.payPeriod && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-[110px]">
                              <Calendar className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span className="truncate">{emp.payPeriod}</span>
                            </span>
                          )}
                        </div>
                        <div className={`text-xs truncate ${isActive ? 'font-bold text-slate-950' : 'font-semibold text-slate-800'}`}>
                          {emp.name}
                        </div>
                        {emp.designation && (
                          <div className="text-[10.5px] text-slate-500 truncate">
                            {emp.designation}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <div className="font-mono text-xs font-bold text-emerald-700">
                          {formatIndianCurrency(emp.calculatedNetPayable)}
                        </div>
                        {isViewed && (
                          <div className="flex items-center justify-end">
                            <span
                              className={`inline-flex items-center text-[10px] font-medium ${
                                isActive ? 'text-emerald-700' : 'text-slate-400'
                              }`}
                              title="Inspected"
                            >
                              <Check className="w-3 h-3" />
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Keyboard Tip Footer */}
            <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 text-[10.5px] text-slate-400 flex items-center justify-between">
              <span>Tip: Use ↑ / ↓ or ← / → keys to flip</span>
              <span className="font-mono font-semibold text-slate-600">{filteredQueue.length} shown</span>
            </div>
          </aside>
        )}

        {/* RIGHT PANEL: Sticky Navigator Bar + Live Form T A4 Canvas */}
        <div className="flex-1 min-w-0 w-full space-y-3">
          {currentEmployee ? (
            <>
              {/* Active Record Context Strip */}
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2 py-0.5 rounded-md bg-[#0f2744] text-white font-mono text-[11px] font-bold shrink-0">
                    {currentIndex + 1} / {filteredQueue.length || 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {currentEmployee.id} — {currentEmployee.name}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Period: <strong className="text-slate-700">{currentEmployee.payPeriod || template.payPeriod}</strong></span>
                      <span>•</span>
                      <span>Net: <strong className="text-emerald-700 font-mono">{formatIndianCurrency(currentEmployee.calculatedNetPayable)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Quick Prev / Next Controls */}
                {filteredQueue.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrev}
                      disabled={currentIndex === 0}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-35 disabled:cursor-not-allowed rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={currentIndex >= filteredQueue.length - 1}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-35 disabled:cursor-not-allowed rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Actual Form T A4 Payslip Preview */}
              <div className="pb-4">
                <PayslipPreview
                  employee={currentEmployee}
                  settings={settings}
                  template={template}
                />
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 text-center py-14 text-slate-400 text-sm">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">No payslip records match your filter</p>
              <p className="text-xs text-slate-400 mt-1">Adjust the search or queue scope on the left.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
