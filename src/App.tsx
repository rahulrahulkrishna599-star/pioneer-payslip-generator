import React, { useState, useEffect } from 'react';
import { 
  AppTab, 
  WizardStep, 
  CompanySettings, 
  EmployeeRecord, 
  ColumnMapping, 
  BatchHistoryItem,
  PayslipTemplate
} from './types';
import { PIONEER_DEFAULT_SETTINGS } from './utils/sampleDataGenerator';
import { ParsedSheetData, parseSpreadsheetBuffer, transformRowsToEmployees } from './utils/excelParser';
import { autoDetectColumnMappings } from './utils/columnDetector';
import { generateBulkPayslipsAndZip, BulkGenerationProgress, BulkGenerationResult } from './utils/zipGenerator';
import { 
  getSavedTemplates, 
  saveTemplateToStorage, 
  PIONEER_FORM_T_TEMPLATE 
} from './utils/templateStorage';
import { fetchCompanySettingsFromSupabase, saveCompanySettingsToSupabase } from './services/templateService';
import { loadActiveDraft, saveActiveDraft, clearActiveDraft, PayrollDraft } from './services/draftService';
import { fetchBatchesFromSupabase, saveBatchToSupabase, clearAllBatchesFromSupabase } from './services/batchService';
import { useAuth } from './contexts/AuthContext';

// Components
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { UploadStep } from './components/UploadStep';
import { ReviewStep } from './components/ReviewStep';
import { PreviewStep } from './components/PreviewStep';
import { TemplateEditorView } from './components/TemplateEditorView';
import { GenerationModal } from './components/GenerationModal';
import { GeneratedPayslipsPage } from './components/GeneratedPayslipsPage';
import { LoginPortal } from './components/auth/LoginPortal';
import { UserAvatarPill } from './components/auth/UserAvatarPill';
import { UserManagementView } from './components/UserManagementView';

export function App() {
  const { isAuthenticated, isLoading, isAdmin, user } = useAuth();
  const [currentTab, setCurrentTab] = useState<AppTab>('generate');
  const [wizardStep, setWizardStep] = useState<WizardStep>('upload');

  // Single Authoritative Form T Template State
  const [template, setTemplate] = useState<PayslipTemplate>(() => {
    const list = getSavedTemplates();
    return list[0] || PIONEER_FORM_T_TEMPLATE;
  });

  const [settings, setSettings] = useState<CompanySettings>(() => ({
    ...PIONEER_DEFAULT_SETTINGS,
    companyName: template.companyName,
    companyAddress: template.companyAddress,
    defaultPayPeriod: template.payPeriod,
    defaultPayDate: template.payDate,
    logoUrl: template.logoUrl,
  }));

  // Data & Workflow State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedSheetData, setParsedSheetData] = useState<ParsedSheetData | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewEmpId, setPreviewEmpId] = useState<string | undefined>(undefined);

  // History & Batches
  const [batches, setBatches] = useState<BatchHistoryItem[]>([]);

  // Generation Modal & Progress
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<BulkGenerationProgress | null>(null);
  const [generationResult, setGenerationResult] = useState<BulkGenerationResult | null>(null);
  const [targetGenerationEmployees, setTargetGenerationEmployees] = useState<EmployeeRecord[]>([]);

  // Draft & Cloud Session State
  const [pendingDraft, setPendingDraft] = useState<PayrollDraft | null>(null);

  // 1. Initial Load: Sync from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    async function initSupabaseData() {
      try {
        // Fetch official settings
        const tpl = await fetchCompanySettingsFromSupabase();
        if (isMounted) {
          setTemplate(tpl);
          setSettings((prev) => ({
            ...prev,
            companyName: tpl.companyName,
            companyAddress: tpl.companyAddress,
            defaultPayPeriod: tpl.payPeriod,
            defaultPayDate: tpl.payDate,
            logoUrl: tpl.logoUrl,
          }));
        }

        // Fetch historical generated batches
        const cloudBatches = await fetchBatchesFromSupabase();
        if (isMounted && cloudBatches.length > 0) {
          setBatches(cloudBatches);
        }

        // Check for in-progress draft from previous session / refresh
        const draft = await loadActiveDraft();
        if (isMounted && draft && Array.isArray(draft.employees) && draft.employees.length > 0) {
          setPendingDraft(draft);
        }
      } catch (err) {
        console.warn('Initial Supabase sync error:', err);
      }
    }

    initSupabaseData();
    return () => { isMounted = false; };
  }, []);

  // 2. Draft Auto-Save: Persist active employee adjustments seamlessly
  useEffect(() => {
    if (employees.length > 0 && !pendingDraft) {
      saveActiveDraft({
        fileName: uploadedFile?.name || 'Pioneer_Payroll_Batch.xlsx',
        payPeriod: template.payPeriod || employees[0]?.payPeriod || settings.defaultPayPeriod,
        parsedSheetData,
        employees,
        selectedIds: Array.from(selectedIds),
        columnMappings,
        currentStep: wizardStep,
      });
    }
  }, [employees, selectedIds, columnMappings, parsedSheetData, wizardStep, uploadedFile, template.payPeriod, settings.defaultPayPeriod, pendingDraft]);

  // Draft Actions
  const handleResumeDraft = (draft: PayrollDraft) => {
    setEmployees(draft.employees);
    setSelectedIds(new Set(draft.selectedIds));
    setColumnMappings(draft.columnMappings);
    setParsedSheetData(draft.parsedSheetData);
    setWizardStep(draft.currentStep || 'review');
    setCurrentTab('generate');
    setPendingDraft(null);
  };

  const handleDiscardDraft = async () => {
    await clearActiveDraft();
    setPendingDraft(null);
    handleClearUpload();
  };

  // Template & Logo Management Handlers
  const handleSaveTemplate = async (updated: PayslipTemplate) => {
    setTemplate(updated);
    setSettings((prev) => ({
      ...prev,
      companyName: updated.companyName,
      companyAddress: updated.companyAddress,
      defaultPayPeriod: updated.payPeriod,
      defaultPayDate: updated.payDate,
      logoUrl: updated.logoUrl,
    }));
    await saveCompanySettingsToSupabase(updated);
  };

  const handleUpdateLogo = (newLogoUrl: string) => {
    const updated = { ...template, logoUrl: newLogoUrl };
    handleSaveTemplate(updated);
  };

  // 1. Data Parsed from Upload
  const handleDataParsed = (data: ParsedSheetData, file: File | null) => {
    setParsedSheetData(data);
    setUploadedFile(file);

    // Auto-detect columns
    const sampleRow = data.rawRows[0];
    const mappings = autoDetectColumnMappings(data.headers, sampleRow);
    setColumnMappings(mappings);

    // Automatically transform rows
    const transformed = transformRowsToEmployees(data.rawRows, mappings, {
      ...settings,
      defaultPayPeriod: template.payPeriod,
      defaultPayDate: template.payDate,
    });
    setEmployees(transformed);

    // Default select all valid employees
    const validIds = new Set(transformed.filter((e) => e.validationStatus !== 'error').map((e) => e.id));
    setSelectedIds(validIds);

    // Directly advance to Employee Data Review (auto-mapped in code)
    setWizardStep('review');
  };

  // Worksheet change (if multi-sheet file)
  const handleSheetChange = async (sheetName: string) => {
    if (!uploadedFile) return;
    try {
      const buffer = await uploadedFile.arrayBuffer();
      const result = parseSpreadsheetBuffer(buffer, sheetName);
      handleDataParsed(result, uploadedFile);
    } catch (err) {
      console.error('Error switching worksheet', err);
    }
  };

  // Clear current upload
  const handleClearUpload = async () => {
    await clearActiveDraft();
    setUploadedFile(null);
    setParsedSheetData(null);
    setColumnMappings([]);
    setEmployees([]);
    setSelectedIds(new Set());
    setWizardStep('upload');
  };

  // Selection toggle
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === employees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employees.filter((e) => e.validationStatus !== 'error').map((e) => e.id)));
    }
  };

  // Individual preview action from review table
  const handlePreviewIndividual = (emp: EmployeeRecord) => {
    setPreviewEmpId(emp.id);
    setWizardStep('preview');
  };

  // Start Bulk Generation using Form T template
  const handleStartBulkGeneration = async (targetEmployees: EmployeeRecord[], templateToUse?: PayslipTemplate) => {
    const tpl = templateToUse || template;
    setTargetGenerationEmployees(targetEmployees);
    setIsGenerating(true);
    setGenerationProgress({
      total: targetEmployees.length,
      completed: 0,
      successful: 0,
      failed: 0,
      remaining: targetEmployees.length,
      isFinished: false,
      errors: [],
    });
    setGenerationResult(null);

    try {
      const res = await generateBulkPayslipsAndZip(
        targetEmployees,
        settings,
        (p) => setGenerationProgress({ ...p }),
        tpl
      );

      setGenerationResult(res);

      const newBatch: BatchHistoryItem = {
        id: `batch_${Date.now()}`,
        date: new Date().toLocaleString('en-GB'),
        fileName: uploadedFile?.name || 'Pioneer_Payroll_Batch.xlsx',
        payPeriod: tpl.payPeriod || targetEmployees[0]?.payPeriod || settings.defaultPayPeriod,
        templateName: tpl.name,
        totalCount: targetEmployees.length,
        successCount: res.successfulCount,
        failedCount: res.failedCount,
        employees: targetEmployees,
        generatedBlobs: new Map(Array.from(res.pdfBlobs.entries()).map(([k, v]) => [k, v.blob])),
      };

      (newBatch as any)._zipBlob = res.zipBlob;

      setBatches((prev) => [newBatch, ...prev]);

      // Persist completed batch to Supabase and upload ZIP archive to cloud storage
      await saveBatchToSupabase(newBatch, res.zipBlob);
      // Clean up in-progress draft since batch is finalized
      await clearActiveDraft();
    } catch (err) {
      console.error('Bulk generation failed:', err);
    }
  };

  // Dynamic statistics
  const totalEmployees = employees.length;
  const readyCount = employees.filter((e) => e.validationStatus === 'ready').length;
  const validationIssues = employees.filter((e) => e.validationStatus !== 'ready').length;
  const generatedTotalCount = batches.reduce((acc, b) => acc + b.successCount, 0);

  // Wizard steps metadata
  const steps: { id: WizardStep; label: string; number: string }[] = [
    { id: 'upload', label: 'Upload Spreadsheet', number: '01' },
    { id: 'review', label: 'Employee Data Review', number: '02' },
    { id: 'preview', label: 'Preview & Generate', number: '03' },
  ];

  // Auth Guard
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
        <div className="w-9 h-9 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin mb-3"></div>
        <p className="text-xs text-slate-400 font-medium tracking-wide">
          Securing Pioneer HR Payroll Session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPortal />;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        activeBatchCount={batches.length}
        templateCount={1}
        isAdmin={isAdmin}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Page Title & Subtitle */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Pioneer Payslip Generator
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Upload payroll data, customize payslip templates, and generate individual employee vector PDFs in seconds.
              </p>
            </div>

            {/* Right Header: Active Template Badge & User Initials Avatar */}
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <div className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Active Template: <strong className="text-slate-900">{template.name}</strong></span>
              </div>
              <UserAvatarPill />
            </div>
          </div>

          {/* Active In-Progress Draft Banner (Refresh & Crash Resilience) - Only shown on Generate tab */}
          {pendingDraft && currentTab === 'generate' && (
            <div className="mb-6 p-4 bg-amber-50/90 border border-amber-300 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-base font-bold shadow-xs">
                  ✎
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Unsaved Payroll Draft Restored
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    You have an unfinalized session for <strong>{pendingDraft.payPeriod || pendingDraft.fileName}</strong> with <strong>{pendingDraft.employees.length} employees</strong> (including any manual adjustments made).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => handleResumeDraft(pendingDraft)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                >
                  Resume Draft
                </button>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="px-3 py-1.5 text-xs font-medium text-amber-900 hover:text-red-700 hover:bg-amber-100 rounded-lg border border-amber-300 transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* Tab 1: Dashboard */}
          {currentTab === 'dashboard' && (
            <DashboardView
              onStartUpload={() => {
                setCurrentTab('generate');
                setWizardStep('upload');
              }}
              onGoToHistory={() => setCurrentTab('history')}
              onGoToTemplates={() => setCurrentTab('templates')}
              recentBatches={batches}
              settings={settings}
              activeTemplateName={template.name}
            />
          )}

          {/* Tab 2: Generate Payslips (Wizard) */}
          {currentTab === 'generate' && (
            <div className="space-y-6">
              {/* Wizard Step Progress Tracker */}
              <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {steps.map((st) => {
                    const isActive = wizardStep === st.id;
                    const isPast =
                      (st.id === 'upload' && wizardStep !== 'upload') ||
                      (st.id === 'review' && wizardStep === 'preview');

                    return (
                      <button
                        key={st.id}
                        type="button"
                        disabled={
                          (st.id !== 'upload' && employees.length === 0 && !parsedSheetData)
                        }
                        onClick={() => setWizardStep(st.id)}
                        className={`flex items-center gap-2.5 p-2 rounded-md text-left transition-colors ${
                          isActive
                            ? 'bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold'
                            : isPast
                            ? 'text-slate-700 hover:bg-slate-50 font-medium'
                            : 'text-slate-400 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-600 text-white'
                              : isPast
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {st.number}
                        </span>
                        <span className="text-xs truncate">{st.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 1: Upload */}
              {wizardStep === 'upload' && (
                <UploadStep
                  onDataParsed={handleDataParsed}
                  settings={settings}
                  currentFile={uploadedFile}
                  parsedData={parsedSheetData}
                  onClear={handleClearUpload}
                  onSheetChange={handleSheetChange}
                />
              )}

              {/* Step 2: Review */}
              {wizardStep === 'review' && (
                <ReviewStep
                  employees={employees}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onToggleSelectAll={handleToggleSelectAll}
                  onPreviewEmployee={handlePreviewIndividual}
                  onProceedToPreview={() => setWizardStep('preview')}
                  onBackToUpload={() => setWizardStep('upload')}
                  onUpdateEmployee={(updated) => {
                    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
                  }}
                />
              )}

              {/* Step 3: Preview with Form T */}
              {wizardStep === 'preview' && (
                <PreviewStep
                  employees={employees}
                  selectedIds={selectedIds}
                  settings={settings}
                  template={template}
                  onUpdateLogo={handleUpdateLogo}
                  initialEmployeeId={previewEmpId}
                  onBackToReview={() => setWizardStep('review')}
                  onStartBulkGeneration={(targets, tpl) => handleStartBulkGeneration(targets, tpl)}
                />
              )}
            </div>
          )}

          {/* Tab 3: Template & Logo Settings (Admin Only) */}
          {currentTab === 'templates' && isAdmin && (
            <TemplateEditorView
              template={template}
              onSaveTemplate={handleSaveTemplate}
            />
          )}

          {/* Tab 4: Generated Batches History */}
          {currentTab === 'history' && (
            <GeneratedPayslipsPage
              batches={batches}
              settings={settings}
              template={template}
              onClearBatches={async () => {
                setBatches([]);
                await clearAllBatchesFromSupabase();
              }}
              onNewBatch={() => {
                setCurrentTab('generate');
                setWizardStep('upload');
              }}
            />
          )}

          {/* Tab 5: Team & Access Management (Admin Only) */}
          {currentTab === 'team' && isAdmin && (
            <UserManagementView />
          )}
        </main>
      </div>

      {/* Bulk Generation Progress & Success Modal */}
      <GenerationModal
        isOpen={isGenerating}
        progress={generationProgress}
        result={generationResult}
        employees={targetGenerationEmployees}
        settings={settings}
        template={template}
        payPeriod={template.payPeriod || targetGenerationEmployees[0]?.payPeriod || settings.defaultPayPeriod}
        onClose={() => setIsGenerating(false)}
        onViewGeneratedBatches={() => {
          setIsGenerating(false);
          setCurrentTab('history');
        }}
      />
    </div>
  );
}

export default App;
