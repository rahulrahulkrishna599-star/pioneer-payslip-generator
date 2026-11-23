import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { CompanySettings, EmployeeRecord, EarningTier } from '../types';

export const PIONEER_DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'PIONEER CORPORATION',
  companyAddress: '358, Mettupalayam Road, Tatabad, Coimbatore - 641043, India',
  companyLogoText: 'PIONEER CORPORATION',
  logoUrl: '/pioneer_logo.png',
  footerText: '-- This is a computer-generated payslip under Tamil Nadu Shops & Establishments Rules, 1948 --',
  currencySymbol: '₹',
  currencyCode: 'INR',
  defaultPayPeriod: 'October 2026',
  defaultPayDate: '01/11/2026',
};

export function downloadSamplePayrollTemplate() {
  const headersRow0 = [
    'S.No.', 'Employee ID', 'Name', 'Sex', 'DOJ', 'Designation', 'UAN Number', 'Esi Number',
    'Monthly Rated', 'Wage Period  Monthly', 'No of Wkgs Days During Month', 'SALARY',
    'ACTUAL WAGES', '', '', '', '', '',
    'WAGES EARNED', '', '', '', '', '', '', '', '', '',
    'DEDUCTIONS', '', '', '', '', '',
    'Net Payable'
  ];
  const headersRow1 = [
    '', '', '', '', '', '', '', '', '', '', '', '',
    'Basic', 'DA', 'HRA', 'WA', 'INCENTIVE', 'Gross Total',
    'Basic', 'DA', '(Basic + DA)', 'HRA', 'W.A', 'Net Salary', 'INCENTIVE', 'Previous Month', 'Total', '',
    'Advance', 'PF', 'ESI', 'Previous Month', 'Late Fine', 'TDS',
    ''
  ];
  const sampleRow = [
    10, 'PC0012', 'B DHINESH', 'M', '03-02-2025', 'ASSISTANT MANAGER – COMMERCIAL OPERATIONS',
    '100723323788', '-', 'Month', 'October 2026', 26, 41800,
    25080, 0, 8360, 2090, 6270, 41800,
    25080, 0, 25080, 8360, 2090, 35530, 6270, 0, 41800, '',
    0, 3000, 0, 0, 0, 0,
    38800
  ];

  const ws = XLSX.utils.aoa_to_sheet([headersRow0, headersRow1, sampleRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'October 2026 Payroll');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'Pioneer_Payroll_Template.xlsx');
}

function tier(amount: number, arrears: number = 0): EarningTier {
  return {
    fixed: amount,
    earned: amount,
    arrears,
    total: amount + arrears,
  };
}

const additionalPioneerStaff = [
  { id: 'PC0015', name: 'R. KAVITHA', role: 'SENIOR QUALITY ENGINEER', dept: 'OPERATIONS', basic: 28000, hra: 9333, wa: 2333, inc: 7000, pf: 1800, uan: '100882194812' },
  { id: 'PC0022', name: 'M. SENTHIL KUMAR', role: 'PRODUCTION SUPERVISOR', dept: 'OPERATIONS', basic: 32000, hra: 10667, wa: 2667, inc: 8000, pf: 1800, uan: '100492817263' },
  { id: 'PC0034', name: 'S. PRIYADHARSHINI', role: 'FINANCE SPECIALIST', dept: 'FINANCE', basic: 34000, hra: 11333, wa: 2833, inc: 8500, pf: 1800, uan: '100783921049' },
  { id: 'PC0041', name: 'K. MANIKANDAN', role: 'LOGISTICS COORDINATOR', dept: 'COMMERCIAL', basic: 24000, hra: 8000, wa: 2000, inc: 6000, pf: 1800, uan: '100684920183' },
  { id: 'PC0053', name: 'A. ANAND', role: 'TOOLING SPECIALIST', dept: 'OPERATIONS', basic: 30000, hra: 10000, wa: 2500, inc: 7500, pf: 1800, uan: '100918274625' },
  { id: 'PC0061', name: 'P. SARAVANAN', role: 'MAINTENANCE LEAD', dept: 'OPERATIONS', basic: 33000, hra: 11000, wa: 2750, inc: 8250, pf: 1800, uan: '100582910482' },
  { id: 'PC0072', name: 'D. MEENAKSHI', role: 'HR EXECUTIVE', dept: 'HR & ADMIN', basic: 26000, hra: 8667, wa: 2167, inc: 6500, pf: 0, uan: '100472910384' },
  { id: 'PC0088', name: 'G. VIJAYALAKSHMI', role: 'SUPPLY CHAIN ANALYST', dept: 'COMMERCIAL', basic: 35000, hra: 11667, wa: 2917, inc: 8750, pf: 1800, uan: '100849201948' },
  { id: 'PC0095', name: 'N. KARTHIKEYAN', role: 'SAFETY & COMPLIANCE OFFICER', dept: 'OPERATIONS', basic: 31000, hra: 10333, wa: 2583, inc: 7750, pf: 1800, uan: '100673920194' },
  { id: 'PC0102', name: 'T. SURESH', role: 'OPERATIONS MANAGER', dept: 'OPERATIONS', basic: 42000, hra: 14000, wa: 3500, inc: 10500, pf: 1800, uan: '100382910482' },
];

export function generateSample50Employees(settings: CompanySettings = PIONEER_DEFAULT_SETTINGS): EmployeeRecord[] {
  const employees: EmployeeRecord[] = [];

  // 1. EXACT REFERENCE RECORD: PC0012 B DHINESH (from uploaded sheet)
  employees.push({
    id: 'PC0012',
    name: 'B DHINESH',
    sex: 'M',
    doj: '03-02-2025',
    dob: '14-08-1995',
    department: 'COMMERCIAL',
    designation: 'ASSISTANT MANAGER – COMMERCIAL OPERATIONS',
    position: 'Full Time',
    branch: 'Coimbatore',
    mobile: '9842104820',
    paidDays: 26,
    lopDays: 0,
    payPeriod: settings.defaultPayPeriod,
    payDate: settings.defaultPayDate,
    taxRegime: 'Regular',
    ptState: 'Tamil Nadu',
    location: 'Coimbatore',

    uanNumber: '100723323788',
    esiNumber: '-',
    pfAccountNumber: 'CB/CBE/1007233',
    panNumber: 'ABCDE1234F',
    bankName: 'HDFC Bank',
    bankAccountNumber: '50100482910482',

    basic: tier(25080),
    hra: tier(8360),
    washingAllowance: tier(2090),
    incentive: tier(6270),
    otherAllowance: tier(0),
    previousMonth: tier(0),
    additionalEarnings: [],
    grossEarnings: 41800,

    providentFund: 3000,
    esi: 0,
    tds: 0,
    professionalTax: 0,
    otherDeduction: 0,
    advance: 0,
    lateFine: 0,
    additionalDeductions: [],
    totalDeductions: 3000,

    calculatedNetPayable: 38800,
    sourceNetPayable: 38800,
    netMismatch: false,

    validationStatus: 'ready',
    validationErrors: [],
    validationWarnings: [],
    rawRow: {},
  });

  // 2. REFERENCE RECORD: PC0067 V SOUNDARARAJAN
  employees.push({
    id: 'PC0067',
    name: 'V SOUNDARARAJAN',
    sex: 'M',
    doj: '18-05-2026',
    dob: '12-04-1992',
    department: 'HR & ADMIN',
    designation: 'HRBP MANAGER',
    position: 'Full Time',
    branch: 'Coimbatore',
    mobile: '9790518290',
    paidDays: 26,
    lopDays: 0,
    payPeriod: settings.defaultPayPeriod,
    payDate: settings.defaultPayDate,
    taxRegime: 'Regular',
    ptState: 'Tamil Nadu',
    location: 'Coimbatore',

    uanNumber: '100957258197',
    esiNumber: '-',
    pfAccountNumber: 'CB/CBE/1009572',
    panNumber: 'BCDEF2345G',
    bankName: 'ICICI Bank',
    bankAccountNumber: '001205829104',

    basic: tier(36600),
    hra: tier(12200),
    washingAllowance: tier(3050),
    incentive: tier(9150),
    otherAllowance: tier(0),
    previousMonth: tier(0),
    additionalEarnings: [],
    grossEarnings: 61000,

    providentFund: 0,
    esi: 0,
    tds: 0,
    professionalTax: 0,
    otherDeduction: 0,
    advance: 0,
    lateFine: 0,
    additionalDeductions: [],
    totalDeductions: 0,

    calculatedNetPayable: 61000,
    sourceNetPayable: 61000,
    netMismatch: false,

    validationStatus: 'ready',
    validationErrors: [],
    validationWarnings: [],
    rawRow: {},
  });

  // 3. REFERENCE RECORD: PC0081 S SHEIK ABDULLA
  employees.push({
    id: 'PC0081',
    name: 'S SHEIK ABDULLA',
    sex: 'M',
    doj: '06-07-2026',
    dob: '23-11-1990',
    department: 'COMMERCIAL',
    designation: 'MARKETING MANAGER',
    position: 'Full Time',
    branch: 'Coimbatore',
    mobile: '9944182940',
    paidDays: 26,
    lopDays: 0,
    payPeriod: settings.defaultPayPeriod,
    payDate: settings.defaultPayDate,
    taxRegime: 'Regular',
    ptState: 'Tamil Nadu',
    location: 'Coimbatore',

    uanNumber: '100849201948',
    esiNumber: '-',
    pfAccountNumber: 'CB/CBE/1008492',
    panNumber: 'CDEFG3456H',
    bankName: 'State Bank of India',
    bankAccountNumber: '30491829401',

    basic: tier(49860),
    hra: tier(16620),
    washingAllowance: tier(4155),
    incentive: tier(12465),
    otherAllowance: tier(0),
    previousMonth: tier(0),
    additionalEarnings: [],
    grossEarnings: 83100,

    providentFund: 0,
    esi: 0,
    tds: 0,
    professionalTax: 0,
    otherDeduction: 0,
    advance: 0,
    lateFine: 0,
    additionalDeductions: [],
    totalDeductions: 0,

    calculatedNetPayable: 83100,
    sourceNetPayable: 83100,
    netMismatch: false,

    validationStatus: 'ready',
    validationErrors: [],
    validationWarnings: [],
    rawRow: {},
  });

  // 4..50 Synthetic Staff
  for (let i = 4; i <= 50; i++) {
    const staff = additionalPioneerStaff[(i - 4) % additionalPioneerStaff.length];
    const empId = `PC${String(i).padStart(4, '0')}`;
    const basicVal = Math.round(staff.basic * (1 + (i % 7) * 0.05));
    const hraVal = Math.round(basicVal * 0.3333);
    const waVal = Math.round(basicVal * 0.0833);
    const incVal = Math.round(basicVal * 0.25);
    const gross = basicVal + hraVal + waVal + incVal;
    const pfVal = staff.pf;
    const net = gross - pfVal;

    employees.push({
      id: empId,
      name: `${staff.name} ${i}`,
      sex: i % 3 === 0 ? 'F' : 'M',
      doj: '15-01-2025',
      dob: '20-05-1993',
      department: staff.dept,
      designation: staff.role,
      position: 'Full Time',
      branch: 'Coimbatore',
      mobile: `98420${String(i).padStart(5, '0')}`,
      paidDays: 26,
      lopDays: i % 12 === 0 ? 1 : 0,
      payPeriod: settings.defaultPayPeriod,
      payDate: settings.defaultPayDate,
      taxRegime: 'Regular',
      ptState: 'Tamil Nadu',
      location: 'Coimbatore',

      uanNumber: staff.uan,
      esiNumber: '-',
      pfAccountNumber: `CB/CBE/${staff.uan.slice(-7)}`,
      panNumber: `PIONE${String(i).padStart(4, '0')}X`,
      bankName: 'HDFC Bank',
      bankAccountNumber: `5010048200${String(i).padStart(4, '0')}`,

      basic: tier(basicVal),
      hra: tier(hraVal),
      washingAllowance: tier(waVal),
      incentive: tier(incVal),
      otherAllowance: tier(0),
      previousMonth: tier(0),
      additionalEarnings: [],
      grossEarnings: gross,

      providentFund: pfVal,
      esi: 0,
      tds: 0,
      professionalTax: 0,
      otherDeduction: 0,
      advance: 0,
      lateFine: 0,
      additionalDeductions: [],
      totalDeductions: pfVal,

      calculatedNetPayable: net,
      sourceNetPayable: net,
      netMismatch: false,

      validationStatus: 'ready',
      validationErrors: [],
      validationWarnings: [],
      rawRow: {},
    });
  }

  return employees;
}
