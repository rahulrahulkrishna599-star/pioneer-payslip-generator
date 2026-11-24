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
  | 'dob'
  | 'position'
  | 'branch'
  | 'mobile'
  | 'paidDays'
  | 'lopDays'
  | 'payDate'
  | 'payPeriod'
  | 'taxRegime'
  | 'ptState'
  | 'location'
  | 'uanNumber'
  | 'esiNumber'
  | 'pfEsiApplicable'
  | 'pfAccountNumber'
  | 'panNumber'
  | 'bankName'
  | 'bankAccountNumber'
  | 'basic'
  | 'hra'
  | 'washingAllowance'
  | 'waterAllowance'
  | 'incentive'
  | 'da'
  | 'otherAllowance'
  | 'previousMonth'
  | 'grossEarnings'
  | 'providentFund'
  | 'esi'
  | 'tds'
  | 'incomeTax'
  | 'advance'
  | 'lateFine'
  | 'professionalTax'
  | 'otherDeduction'
  | 'totalDeductions'
  | 'netPayable';

export interface ColumnMapping {
  sourceColumn: string;
  action:
    | { type: 'field'; targetField: PayslipFieldKey }
    | { type: 'additional_earning'; label: string }
    | { type: 'additional_deduction'; label: string }
    | { type: 'ignore' };
  confidence?: number;
  sampleValue?: any;
}

export interface EarningTier {
  fixed: number | null;
  earned: number | null;
  arrears: number | null;
  total: number | null;
}

export interface AdditionalEarning {
  name: string;
  fixed?: number | null;
  earned: number;
  arrears?: number | null;
  total: number;
  amount?: number;
  confirmed?: boolean;
}

export interface AdditionalDeduction {
  name: string;
  amount: number;
  confirmed?: boolean;
}

export interface EmployeeRecord {
  id: string;
  name: string;
  sex?: string;
  doj: string;
  dob: string;
  department: string;
  designation: string;
  position: string;
  branch: string;
  mobile: string;
  paidDays: number | null;
  lopDays: number | null;
  payPeriod: string;
  payDate: string;
  taxRegime: string;
  ptState: string;
  location: string;

  // Statutory & Bank Details
  uanNumber: string;
  esiNumber: string;
  pfAccountNumber: string;
  panNumber: string;
  bankName: string;
  bankAccountNumber: string;

  // Form T Earnings Breakdown (Fixed, Earned, Arrears, Total)
  basic: EarningTier;
  hra: EarningTier;
  washingAllowance: EarningTier;
  incentive: EarningTier;
  otherAllowance: EarningTier;
  previousMonth: EarningTier;
  additionalEarnings: AdditionalEarning[];
  grossEarnings: number;

  // Form T Deductions Breakdown
  providentFund: number | null;
  esi: number | null;
  tds: number | null;
  professionalTax: number | null;
  otherDeduction: number | null;
  salaryAdvance?: number | null;
  advance?: number | null;
  lateFine?: number | null;
  additionalDeductions: { name: string; amount: number }[];
  totalDeductions: number;

  // Net Payable
  calculatedNetPayable: number;
  sourceNetPayable?: number;
  netMismatch: boolean;

  // Validation
  validationStatus: 'ready' | 'warning' | 'error';
  validationErrors: string[];
  validationWarnings: string[];
  rawRow: Record<string, any>;
}

export interface PayslipTemplate {
  id: string;
  name: string;
  companyName: string;
  companyAddress: string;
  cityPincode?: string;
  country?: string;
  logoUrl?: string; // base64 or '/pioneer_logo.png'
  payPeriod: string;
  payDate: string;
  formTitle: string; // "FORM T - WAGES SLIP"
  formSubtitle: string; // "(See Sub-Rule (6) of Rule 1 of the Tamil Nadu Shops and Establishments Rules, 1948)"
  footerText: string;
  showSeal: boolean;
  themeColor?: 'navy' | 'emerald' | 'blue';
  isDefault?: boolean;
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

export type AppRole = 'admin' | 'operator';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  isActive: boolean;
  createdAt?: string;
}

export type AppTab = 'dashboard' | 'generate' | 'templates' | 'history' | 'team';
export type WizardStep = 'upload' | 'review' | 'preview';
