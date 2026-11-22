import * as XLSX from 'xlsx';
import { CompanySettings, EmployeeRecord } from '../types';

export const PIONEER_DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'PIONEER CORPORATION',
  companyAddress: '358, Mettupalayam Road, Tatabad Coimbatore-641043 India',
  companyLogoText: 'PIONEER CORPORATION',
  footerText: '-- This is a system-generated document. --',
  currencySymbol: '₹',
  currencyCode: 'INR',
  defaultPayPeriod: 'October 2026',
  defaultPayDate: '01/11/2026',
};

const additionalPioneerStaff = [
  { id: 'PC0015', name: 'R. KAVITHA', role: 'SENIOR QUALITY ENGINEER', dept: 'OPERATIONS', basic: 28000, hra: 9333, wa: 2333, inc: 7000, pf: 1800 },
  { id: 'PC0022', name: 'M. SENTHIL KUMAR', role: 'PRODUCTION SUPERVISOR', dept: 'OPERATIONS', basic: 32000, hra: 10667, wa: 2667, inc: 8000, pf: 1800 },
  { id: 'PC0034', name: 'S. PRIYADHARSHINI', role: 'FINANCE SPECIALIST', dept: 'FINANCE', basic: 34000, hra: 11333, wa: 2833, inc: 8500, pf: 1800 },
  { id: 'PC0041', name: 'K. MANIKANDAN', role: 'LOGISTICS COORDINATOR', dept: 'COMMERCIAL', basic: 24000, hra: 8000, wa: 2000, inc: 6000, pf: 1800 },
  { id: 'PC0053', name: 'A. ANAND', role: 'TOOLING SPECIALIST', dept: 'OPERATIONS', basic: 30000, hra: 10000, wa: 2500, inc: 7500, pf: 1800 },
  { id: 'PC0061', name: 'P. SARAVANAN', role: 'MAINTENANCE LEAD', dept: 'OPERATIONS', basic: 33000, hra: 11000, wa: 2750, inc: 8250, pf: 1800 },
  { id: 'PC0072', name: 'D. MEENAKSHI', role: 'HR EXECUTIVE', dept: 'HR & ADMIN', basic: 26000, hra: 8667, wa: 2167, inc: 6500, pf: 0 },
  { id: 'PC0088', name: 'G. VIJAYALAKSHMI', role: 'SUPPLY CHAIN ANALYST', dept: 'COMMERCIAL', basic: 35000, hra: 11667, wa: 2917, inc: 8750, pf: 1800 },
  { id: 'PC0095', name: 'N. KARTHIKEYAN', role: 'SAFETY & COMPLIANCE OFFICER', dept: 'OPERATIONS', basic: 31000, hra: 10333, wa: 2583, inc: 7750, pf: 1800 },
  { id: 'PC0102', name: 'T. SURESH', role: 'OPERATIONS MANAGER', dept: 'OPERATIONS', basic: 42000, hra: 14000, wa: 3500, inc: 10500, pf: 1800 },
];

/**
 * Generates 50 realistic Pioneer Corporation employee records matching reference payslip PC0067
 */
export function generateSample50Employees(settings: CompanySettings = PIONEER_DEFAULT_SETTINGS): EmployeeRecord[] {
  const employees: EmployeeRecord[] = [];

  // 1. EXACT REFERENCE RECORD: PC0067 V SOUNDARARAJAN
  employees.push({
    id: 'PC0067',
    name: 'V SOUNDARARAJAN',
    designation: 'HRBP MANAGER',
    department: 'HR & ADMIN',
    doj: '18-05-2026',
    uanNumber: '100957258197',
    esiNumber: '-',
    pfEsiApplicable: 'No',
    paidDays: 26,
    lopDays: 0,
    payPeriod: settings.defaultPayPeriod,
    payDate: settings.defaultPayDate,

    basic: 36600,
    hra: 12200,
    waterAllowance: 3050,
    incentive: 9150,
    da: 0,
    otherAllowance: 0,
    additionalEarnings: [],
    grossEarnings: 61000,

    incomeTax: 0,
    providentFund: 0,
    esi: 0,
    previousMonth: 0,
    advance: 0,
    lateFine: 0,
    otherDeduction: 0,
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

  // 2. EXACT RECORD: PC0012 B DHINESH
  employees.push({
    id: 'PC0012',
    name: 'B DHINESH',
    designation: 'ASSISTANT MANAGER – COMMERCIAL OPERATIONS',
    department: 'COMMERCIAL',
    doj: '03-02-2025',
    uanNumber: '100723323788',
    esiNumber: '-',
    pfEsiApplicable: 'Yes',
    paidDays: 26,
    lopDays: 0,
    payPeriod: settings.defaultPayPeriod,
    payDate: settings.defaultPayDate,

    basic: 25080,
    hra: 8360,
    waterAllowance: 2090,
    incentive: 6270,
    da: 0,
    otherAllowance: 0,
    additionalEarnings: [],
    grossEarnings: 41800,

    incomeTax: 0,
    providentFund: 3000,
    esi: 0,
    previousMonth: 0,
    advance: 0,
    lateFine: 0,
    otherDeduction: 0,
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

  // 3. EXACT RECORD: PC0081 S SHEIK ABDULLA
  employees.push({
    id: 'PC0081',
    name: 'S SHEIK ABDULLA',
    designation: 'MARKETING MANAGER',
    department: 'COMMERCIAL',
    doj: '06-07-2026',
    uanNumber: '-',
    esiNumber: '-',
    pfEsiApplicable: 'No',
    paidDays: 26,
    lopDays: 0,
    payPeriod: settings.defaultPayPeriod,
    payDate: settings.defaultPayDate,

    basic: 49860,
    hra: 16620,
    waterAllowance: 4155,
    incentive: 12465,
    da: 0,
    otherAllowance: 0,
    additionalEarnings: [],
    grossEarnings: 83100,

    incomeTax: 0,
    providentFund: 0,
    esi: 0,
    previousMonth: 0,
    advance: 0,
    lateFine: 0,
    otherDeduction: 0,
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

  // Generate remaining employees to make exactly 50
  for (let i = 3; i < 50; i++) {
    const template = additionalPioneerStaff[(i - 3) % additionalPioneerStaff.length];
    const seq = i + 1;
    const empId = `PC00${seq < 10 ? '0' + seq : seq}`.replace('000', '00');
    const name = template.name;
    const role = template.role;
    const dept = template.dept;

    const base = template.basic + (i % 4) * 1200;
    const hra = Math.round(base * 0.3333);
    const wa = Math.round(base * 0.0833);
    const inc = Math.round(base * 0.25);
    const gross = base + hra + wa + inc;
    const pf = template.pf;
    const net = gross - pf;

    const dojD = String((i * 4) % 28 + 1).padStart(2, '0');
    const dojM = String((i % 12) + 1).padStart(2, '0');
    const doj = `${dojD}-${dojM}-202${(i % 4) + 3}`;

    employees.push({
      id: empId,
      name,
      designation: role,
      department: dept,
      doj,
      uanNumber: `10098472${9100 + i}`,
      esiNumber: '-',
      pfEsiApplicable: pf > 0 ? 'Yes' : 'No',
      paidDays: 26,
      lopDays: 0,
      payPeriod: settings.defaultPayPeriod,
      payDate: settings.defaultPayDate,

      basic: base,
      hra,
      waterAllowance: wa,
      incentive: inc,
      da: 0,
      otherAllowance: 0,
      additionalEarnings: [],
      grossEarnings: gross,

      incomeTax: 0,
      providentFund: pf,
      esi: 0,
      previousMonth: 0,
      advance: 0,
      lateFine: 0,
      otherDeduction: 0,
      additionalDeductions: [],
      totalDeductions: pf,

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

/**
 * Creates and downloads the Excel template structured exactly like the user's Pioneer payroll sheet
 */
export function downloadSamplePayrollTemplate() {
  const employees = generateSample50Employees();

  // Create 2-row multi-header structure matching sample_uploaded_payslip.xlsx
  const row0: any[] = [
    'S.No.', 'Employee ID', 'Name', 'Sex', 'DOJ', 'Designation', 'UAN Number', 'Esi Number',
    'Monthly Rated', 'Wage Period Monthly', 'No of Wkgs Days During Month', 'SALARY',
    'ACTUAL WAGES', '', '', '', '', '', '',
    'WAGES EARNED', '', '', '', '', '', '', '', '',
    'DEDUCTIONS', '', '', '', '', '',
    'Net Payable'
  ];

  const row1: any[] = [
    '', '', '', '', '', '', '', '',
    '', '', '', '',
    'Basic', 'DA', 'HRA', 'WA', 'INCENTIVE', 'Gross Total', '',
    'Basic', 'DA', '(Basic + DA)', 'HRA', 'W.A', 'Net Salary', 'INCENTIVE', 'Previous Month', 'Total', '',
    'Advance', 'PF', 'ESI', 'Previous Month', 'Late Fine', 'TDS',
    ''
  ];

  const dataRows: any[][] = [row0, row1];

  employees.forEach((emp, idx) => {
    const basic = emp.basic;
    const hra = emp.hra;
    const wa = emp.waterAllowance;
    const inc = emp.incentive;
    const gross = emp.grossEarnings;
    const pf = emp.providentFund;
    const net = emp.calculatedNetPayable;

    dataRows.push([
      idx + 1,
      emp.id,
      emp.name,
      'M',
      emp.doj,
      emp.designation,
      emp.uanNumber === '-' ? '' : emp.uanNumber,
      emp.esiNumber === '-' ? '' : emp.esiNumber,
      'Month',
      '26th to 25th',
      emp.paidDays,
      gross,
      // ACTUAL WAGES
      basic, 0, hra, wa, inc, gross, '',
      // WAGES EARNED
      basic, 0, basic, hra, wa, (basic + hra + wa), inc, 0, gross, '',
      // DEDUCTIONS
      0, pf, 0, 0, 0, 0,
      // Net
      net
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  XLSX.writeFile(workbook, 'Pioneer_Corporation_Payroll_October_2026.xlsx');
}
