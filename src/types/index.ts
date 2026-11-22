export interface CompanySettings {
  companyName: string;
  companyAddress: string;
  companyLogoText?: string;
  logoUrl?: string;
  footerText: string;
  currencySymbol: string;
  currencyCode: string;
  defaultPayPeriod: string;
  defaultPayDate: string;
}

export type PayslipFieldKey =
  | 'employeeId'
  | 'employeeName'
  | 'designation'
  | 'department'
  | 'doj'
  | 'uanNumber'
  | 'esiNumber'
  | 'pfEsiApplicable'
  | 'paidDays'
  | 'lopDays'
  | 'basic'
  | 'hra'
  | 'waterAllowance'
  | 'incentive'
  | 'da'
  | 'otherAllowance'
  | 'grossEarnings'
  | 'incomeTax'
  | 'providentFund'
  | 'esi'
  | 'previousMonth'
  | 'advance'
  | 'lateFine'
  | 'otherDeduction'
  | 'totalDeductions'
  | 'netPayable';

export type MappingAction =
  | { type: 'field'; targetField: PayslipFieldKey }
  | { type: 'ignore' }
  | { type: 'additional_earning'; label: string }
  | { type: 'additional_deduction'; label: string };

export interface ColumnMapping {
  sourceColumn: string;
  action: MappingAction;
  confidence?: number;
  sampleValue?: any;
}

export interface EmployeeRecord {
  id: string;
  name: string;
  designation: string;
  department: string;
  doj: string;
  uanNumber: string;
  esiNumber: string;
  pfEsiApplicable: string;
  paidDays: number;
  lopDays: number;
  payPeriod: string;
  payDate: string;

  // Earnings
  basic: number;
  hra: number;
  waterAllowance: number;
  incentive: number;
  da: number;
  otherAllowance: number;
  additionalEarnings: { name: string; amount: number }[];
  grossEarnings: number;

  // Deductions
  incomeTax: number;
  providentFund: number;
  esi: number;
  previousMonth: number;
  advance: number;
  lateFine: number;
  otherDeduction: number;
  additionalDeductions: { name: string; amount: number }[];
  totalDeductions: number;

  // Net
  calculatedNetPayable: number;
  sourceNetPayable?: number;
  netMismatch: boolean;

  // Validation
  validationStatus: 'ready' | 'warning' | 'error';
  validationErrors: string[];
  validationWarnings: string[];
  rawRow: Record<string, any>;
}

export interface TemplateFieldConfig {
  id: string;
  label: string;
  fieldKey: string;
  customDefault?: string;
}

export interface TemplateItemConfig {
  id: string;
  label: string;
  fieldKey: string;
}

export interface PayslipTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  
  // Header & Brand
  companyName: string;
  companyAddress: string;
  cityPincode?: string;
  country?: string;
  logoUrl?: string; // base64 image or 'default-pioneer'
  
  // Timing
  payPeriod: string;
  payDate: string;
  
  // Theme Color
  themeColor: 'emerald' | 'navy' | 'blue' | 'slate';
  
  // Configurable Sections
  summaryFields: TemplateFieldConfig[];
  statutoryFields: TemplateFieldConfig[];
  earningsList: TemplateItemConfig[];
  deductionsList: TemplateItemConfig[];
  
  // Notes & Footer
  footerText: string;
  showAmountInWords: boolean;
  showAttendanceSummary?: boolean;
  createdAt?: string;
}

export interface BatchHistoryItem {
  id: string;
  date: string;
  fileName: string;
  payPeriod: string;
  templateName?: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  employees: EmployeeRecord[];
  generatedBlobs?: Map<string, Blob>;
}

export type AppTab = 'dashboard' | 'generate' | 'templates' | 'history';
export type WizardStep = 'upload' | 'mapping' | 'review' | 'preview';
