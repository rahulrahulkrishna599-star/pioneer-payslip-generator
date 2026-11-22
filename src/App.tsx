import React, { useState } from 'react';
import { 
  AppTab, 
  WizardStep, 
  CompanySettings, 
  EmployeeRecord, 
  ColumnMapping, 
  BatchHistoryItem,
  PayslipTemplate
} from './types';
import { PIONEER_DEFAULT_SETTINGS, generateSample50Employees } from './utils/sampleDataGenerator';
import { ParsedSheetData, parseSpreadsheetBuffer, transformRowsToEmployees } from './utils/excelParser';
import { autoDetectColumnMappings } from './utils/columnDetector';
import { generateBulkPayslipsAndZip, BulkGenerationProgress, BulkGenerationResult } from './utils/zipGenerator';
import { 
  getSavedTemplates, 
  saveTemplateToStorage, 
  deleteTemplateFromStorage, 
  PIONEER_OFFICIAL_TEMPLATE 
} from './utils/templateStorage';

// Components
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { UploadStep } from './components/UploadStep';
import { ReviewStep } from './components/ReviewStep';
import { PreviewStep } from './components/PreviewStep';
import { TemplateEditorView } from './components/TemplateEditorView';
import { GenerationModal } from './components/GenerationModal';
import { GeneratedPayslipsPage } from './components/GeneratedPayslipsPage';

export function App() {
  const [currentTab, setCurrentTab] = useState<AppTab>('generate');
  const [wizardStep, setWizardStep] = useState<WizardStep>('upload');

  // Templates State
  const [templates, setTemplates] = useState<PayslipTemplate[]>(() => getSavedTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    const list = getSavedTemplates();
    const def = list.find((t) => t.isDefault) || list[0];
    return def ? def.id : PIONEER_OFFICIAL_TEMPLATE.id;
  });

  // Base Settings (derived from active template or default)
  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0] || PIONEER_OFFICIAL_TEMPLATE;

  const [settings, setSettings] = useState<CompanySettings>(() => PIONEER_DEFAULT_SETTINGS);

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

  // Template Management Handlers
  const handleSaveTemplate = (template: PayslipTemplate) => {
    const updated = saveTemplateToStorage(template);
    setTemplates(updated);
    if (template.id === selectedTemplateId) {
      setSettings((prev) => ({
        ...prev,
        companyName: template.companyName,
        companyAddress: template.companyAddress,
        defaultPayPeriod: template.payPeriod,
        defaultPayDate: template.payDate,
        footerText: template.footerText,
      }));
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    const updated = deleteTemplateFromStorage(templateId);
    setTemplates(updated);
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(updated[0].id);
    }
  };

  const handleDuplicateTemplate = (template: PayslipTemplate) => {
    const copy: PayslipTemplate = {
      ...template,
      id: `template_${Date.now()}`,
      name: `${template.name} (Copy)`,
      isDefault: false,
    };
    const updated = saveTemplateToStorage(copy);
    setTemplates(updated);
    setSelectedTemplateId(copy.id);
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
      defaultPayPeriod: activeTemplate.payPeriod,
      defaultPayDate: activeTemplate.payDate,
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

  // Load 50 Sample Employees directly
  const handleLoadSample = (sampleEmployees?: EmployeeRecord[]) => {
    const list = sampleEmployees || generateSample50Employees({
      ...settings,
      defaultPayPeriod: activeTemplate.payPeriod,
      defaultPayDate: activeTemplate.payDate,
    });
    setEmployees(list);
    setUploadedFile(null);
    setParsedSheetData({
      sheetNames: ['October 2026 Payroll'],
      activeSheet: 'October 2026 Payroll',
      headers: [
        'Employee ID', 'Name', 'Designation', 'Department', 'DOJ', 'UAN Number', 'ESI Number',
        'Paid Days', 'LOP Days', 'Basic', 'HRA', 'WA', 'INCENTIVE', 'Other Allowance', 'Gross Total',
        'TDS', 'PF', 'ESI', 'Previous Month', 'Other Deduction', 'Total Deductions', 'Net Salary'
      ],
      rawRows: [],
      totalRawRows: list.length,
    });

    const sampleMappings = autoDetectColumnMappings([
      'Employee ID', 'Name', 'Designation', 'Department', 'DOJ', 'UAN Number', 'ESI Number',
      'Paid Days', 'LOP Days', 'Basic', 'HRA', 'WA', 'INCENTIVE', 'Other Allowance', 'Gross Total',
      'TDS', 'PF', 'ESI', 'Previous Month', 'Other Deduction', 'Total Deductions', 'Net Salary'
    ]);
    setColumnMappings(sampleMappings);

    setSelectedIds(new Set(list.map((e) => e.id)));
    setCurrentTab('generate');
    setWizardStep('review');
  };

  // Clear current upload
  const handleClearUpload = () => {
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

  // Start Bulk Generation using chosen template
  const handleStartBulkGeneration = async (targetEmployees: EmployeeRecord[], templateToUse?: PayslipTemplate) => {
    const tpl = templateToUse || activeTemplate;
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

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        activeBatchCount={batches.length}
        templateCount={templates.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Page Title & Subtitle */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Pioneer Payslip Generator
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Upload payroll data, customize payslip templates, and generate individual employee vector PDFs in seconds.
              </p>
            </div>

            {/* Active Template Badge */}
            <div className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-2 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Active Template: <strong className="text-slate-900">{activeTemplate.name}</strong></span>
            </div>
          </div>

          {/* Tab 1: Dashboard */}
          {currentTab === 'dashboard' && (
            <DashboardView
              onStartUpload={() => {
                setCurrentTab('generate');
                setWizardStep('upload');
              }}
              onLoadSample={() => handleLoadSample()}
              onGoToHistory={() => setCurrentTab('history')}
              onGoToTemplates={() => setCurrentTab('templates')}
              recentBatches={batches}
              settings={settings}
              activeTemplateName={activeTemplate.name}
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
                  onLoadSample={handleLoadSample}
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

              {/* Step 3: Preview with Template Chooser */}
              {wizardStep === 'preview' && (
                <PreviewStep
                  employees={employees}
                  selectedIds={selectedIds}
                  settings={settings}
                  templates={templates}
                  selectedTemplateId={selectedTemplateId}
                  onSelectTemplate={(id) => setSelectedTemplateId(id)}
                  onGoToTemplateEditor={() => setCurrentTab('templates')}
                  initialEmployeeId={previewEmpId}
                  onBackToReview={() => setWizardStep('review')}
                  onStartBulkGeneration={(targets, tpl) => handleStartBulkGeneration(targets, tpl)}
                />
              )}
            </div>
          )}

          {/* Tab 3: Template Editor */}
          {currentTab === 'templates' && (
            <TemplateEditorView
              templates={templates}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={(id) => setSelectedTemplateId(id)}
              onSaveTemplate={handleSaveTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              onDuplicateTemplate={handleDuplicateTemplate}
            />
          )}

          {/* Tab 4: Generated Batches History */}
          {currentTab === 'history' && (
            <GeneratedPayslipsPage
              batches={batches}
              settings={settings}
              onClearBatches={() => setBatches([])}
              onNewBatch={() => {
                setCurrentTab('generate');
                setWizardStep('upload');
              }}
            />
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
        template={activeTemplate}
        payPeriod={activeTemplate.payPeriod || targetGenerationEmployees[0]?.payPeriod || settings.defaultPayPeriod}
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
