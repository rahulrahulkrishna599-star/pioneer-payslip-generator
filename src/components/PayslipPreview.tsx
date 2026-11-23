import React from 'react';
import { CompanySettings, EmployeeRecord, PayslipTemplate } from '../types';
import { formatIndianCurrency, numberToIndianWords } from '../utils/numberToWords';
import { PioneerSealStamp } from '../utils/pioneerLogo';
import { formatFullAddress } from '../utils/templateStorage';
import { PIONEER_DEFAULT_LOGO_URL } from '../utils/pioneerAssets';

interface PayslipPreviewProps {
  employee?: EmployeeRecord;
  settings?: CompanySettings;
  template?: PayslipTemplate;
  isBlank?: boolean;
}

const BLANK_TIER = { fixed: 0, earned: 0, arrears: 0, total: 0 };

const EMPTY_RECORD: EmployeeRecord = {
  id: '',
  name: '',
  sex: '',
  doj: '',
  dob: '',
  department: '',
  designation: '',
  position: '',
  branch: '',
  mobile: '',
  paidDays: 0,
  lopDays: 0,
  payPeriod: '',
  payDate: '',
  taxRegime: '',
  ptState: '',
  location: '',
  uanNumber: '',
  esiNumber: '',
  pfAccountNumber: '',
  panNumber: '',
  bankName: '',
  bankAccountNumber: '',
  basic: BLANK_TIER,
  hra: BLANK_TIER,
  washingAllowance: BLANK_TIER,
  incentive: BLANK_TIER,
  otherAllowance: BLANK_TIER,
  previousMonth: BLANK_TIER,
  additionalEarnings: [],
  grossEarnings: 0,
  providentFund: 0,
  esi: 0,
  tds: 0,
  professionalTax: 0,
  otherDeduction: 0,
  advance: 0,
  lateFine: 0,
  additionalDeductions: [],
  totalDeductions: 0,
  calculatedNetPayable: 0,
  netMismatch: false,
  validationStatus: 'ready',
  validationErrors: [],
  validationWarnings: [],
  rawRow: {},
};

export const PayslipPreview: React.FC<PayslipPreviewProps> = ({
  employee,
  settings,
  template,
  isBlank = false,
}) => {
  const emp = (!isBlank && employee) ? employee : EMPTY_RECORD;
  const amountInWords = isBlank ? '—' : numberToIndianWords(emp.calculatedNetPayable);

  const companyTitle = template?.companyName || settings?.companyName || 'PIONEER CORPORATION';
  const companyAddr = formatFullAddress(
    template?.companyAddress ?? settings?.companyAddress ?? '358, Mettupalayam Road, Tatabad',
    template?.cityPincode ?? 'Coimbatore - 641043',
    template?.country ?? 'India'
  );

  const payPeriodText = template?.payPeriod || (isBlank ? '—' : emp.payPeriod) || '—';
  const payDateText = template?.payDate || (isBlank ? '—' : emp.payDate) || '—';
  const logoSrc = template?.logoUrl || settings?.logoUrl || PIONEER_DEFAULT_LOGO_URL;

  // Earnings Rows
  const earningsRows = [
    { label: 'Basic', tier: emp.basic },
    { label: 'HRA', tier: emp.hra },
    { label: 'Washing Allowance', tier: emp.washingAllowance },
    { label: 'Incentive', tier: emp.incentive },
    { label: 'Other Allowance', tier: emp.otherAllowance },
    { label: 'Previous Month', tier: emp.previousMonth },
  ];

  if (!isBlank && emp.additionalEarnings && emp.additionalEarnings.length > 0) {
    emp.additionalEarnings.forEach((item) => {
      earningsRows.push({
        label: item.name,
        tier: { fixed: item.fixed ?? 0, earned: item.earned, arrears: item.arrears ?? 0, total: item.total ?? item.earned },
      });
    });
  }

  // Deductions Rows
  const deductionsRows = [
    { label: 'Provident Fund', amount: emp.providentFund },
    { label: 'ESI', amount: emp.esi },
    { label: 'TDS', amount: emp.tds },
    { label: 'Professional Tax', amount: emp.professionalTax },
    { label: 'Other Deduction', amount: emp.otherDeduction },
  ];

  if (!isBlank && emp.additionalDeductions && emp.additionalDeductions.length > 0) {
    emp.additionalDeductions.forEach((item) => {
      deductionsRows.push({ label: item.name, amount: item.amount });
    });
  }

  // Equalize row heights for perfect dual table alignment
  const maxRows = Math.max(earningsRows.length, deductionsRows.length, 6);

  return (
    <div className="bg-white text-slate-800 shadow-xl border border-slate-200 rounded-sm mx-auto max-w-[820px] w-full px-8 py-8 sm:px-10 sm:py-10 font-sans print:shadow-none print:border-none print:p-0">
      {/* 1. TOP HEADER */}
      <div className="flex justify-between items-start pb-4">
        {/* Left: Logo & Company Name/Address */}
        <div className="flex items-center gap-4">
          <img
            src={logoSrc}
            alt="Pioneer Logo"
            className="h-14 max-w-[150px] object-contain"
            onError={(e) => {
              // If image source fails, gracefully fallback to embedded high-resolution Pioneer logo
              if (e.currentTarget.src !== PIONEER_DEFAULT_LOGO_URL) {
                e.currentTarget.src = PIONEER_DEFAULT_LOGO_URL;
              }
            }}
          />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-snug">
              {companyTitle}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 max-w-md leading-relaxed">
              {companyAddr}
            </p>
          </div>
        </div>

        {/* Right: Payslip For Month */}
        <div className="text-right shrink-0">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Payslip For
          </div>
          <div className="text-sm font-bold text-slate-900 mt-0.5 pb-1 border-b border-slate-300 inline-block min-w-[130px] text-right">
            {payPeriodText}
          </div>
        </div>
      </div>

      {/* Top Divider */}
      <div className="w-full h-px bg-slate-800 my-2"></div>

      {/* 2. STATUTORY FORM T HEADER */}
      <div className="mt-2 mb-3">
        <h2 className="text-sm font-bold tracking-wide text-slate-900 uppercase">
          {template?.formTitle || 'FORM T - WAGES SLIP'}
        </h2>
        <p className="text-[11px] italic text-slate-600 mt-0.5">
          {template?.formSubtitle || '(See Sub-Rule (6) of Rule 1 of the Tamil Nadu Shops and Establishments Rules, 1948)'}
        </p>
      </div>

      {/* 3. EMPLOYEE SUMMARY BOX */}
      <div className="border border-slate-300 rounded-xs overflow-hidden mb-3">
        <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-200 flex items-center gap-2">
          <div className="w-1 h-3.5 bg-amber-600 rounded-xs"></div>
          <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
            Employee Summary
          </span>
        </div>

        {/* 2-Column Summary Grid */}
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-slate-700">
          {/* Left Column */}
          <div className="space-y-1.5">
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">Employee Name</span>
              <span className="font-semibold text-slate-900 text-[11px]">{isBlank ? '—' : (emp.name || '—')}</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">Employee ID</span>
              <span className="font-mono font-semibold text-slate-900 text-[11px]">{isBlank ? '—' : (emp.id || '—')}</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">Date of Joining</span>
              <span className="font-semibold text-slate-900 text-[11px]">{isBlank ? '—' : (emp.doj || '—')}</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">Date of Birth</span>
              <span className="font-semibold text-slate-900 text-[11px]">{isBlank ? '—' : (emp.dob || '—')}</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">Department</span>
              <span className="font-semibold text-slate-900 text-[11px]">{isBlank ? '—' : (emp.department || '—')}</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">Designation</span>
              <span className="font-semibold text-slate-900 text-[11px] truncate max-w-[200px]" title={emp.designation}>
                {isBlank ? '—' : (emp.designation || '—')}
              </span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">Position</span>
              <span className="font-semibold text-slate-900 text-[11px]">{isBlank ? '—' : (emp.position || '—')}</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">Branch</span>
              <span className="font-semibold text-slate-900 text-[11px]">{isBlank ? '—' : (emp.branch || '—')}</span>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-1.5">
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">Mobile Number</span>
              <span className="font-semibold text-slate-900 text-[11px]">{isBlank ? '—' : (emp.mobile || '—')}</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">Paid Days</span>
              <span className="font-mono font-bold text-slate-900 text-[11px]">{isBlank ? '—' : emp.paidDays}</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">LOP Days</span>
              <span className="font-mono font-bold text-slate-900 text-[11px]">{isBlank ? '—' : emp.lopDays}</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">Pay Date</span>
              <span className="font-semibold text-slate-900 text-[11px]">{payDateText}</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">Pay Period</span>
              <span className="font-semibold text-slate-900 text-[11px]">{payPeriodText}</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">Tax Regime</span>
              <span className="font-semibold text-slate-900 text-[11px]">{isBlank ? '—' : (emp.taxRegime || '—')}</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">Professional Tax State</span>
              <span className="font-semibold text-slate-900 text-[11px]">{isBlank ? '—' : (emp.ptState || '—')}</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">Location</span>
              <span className="font-semibold text-slate-900 text-[11px]">{isBlank ? '—' : (emp.location || '—')}</span>
            </div>
          </div>
        </div>

        {/* 4. STATUTORY & BANK INFORMATION */}
        <div className="border-t border-slate-200 bg-slate-50/50 p-3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-slate-700">
          <div className="space-y-1.5">
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">UAN Number</span>
              <span className="font-mono font-semibold text-slate-900 text-[11px]">{isBlank ? '—' : (emp.uanNumber || '—')}</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">ESI Number</span>
              <span className="font-mono font-semibold text-slate-900 text-[11px]">{isBlank ? '—' : (emp.esiNumber || '—')}</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">PF Account Number</span>
              <span className="font-mono font-semibold text-slate-900 text-[11px]">{isBlank ? '—' : (emp.pfAccountNumber || '—')}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">PAN Number</span>
              <span className="font-mono font-semibold text-slate-900 text-[11px]">{isBlank ? '—' : (emp.panNumber || '—')}</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">Bank Name</span>
              <span className="font-semibold text-slate-900 text-[11px]">{isBlank ? '—' : (emp.bankName || '—')}</span>
            </div>
            <div className="flex justify-between border-b border-dotted border-slate-200 pb-0.5">
              <span className="text-slate-500 text-[11px]">Bank Account Number</span>
              <span className="font-mono font-semibold text-slate-900 text-[11px]">{isBlank ? '—' : (emp.bankAccountNumber || '—')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. SIDE-BY-SIDE TABLES: EARNINGS & DEDUCTIONS */}
      <div className="flex flex-col md:flex-row gap-3 mb-4 items-stretch">
        {/* Left: Earnings Table (Proportional 315pt width ~ 60.9% for clean multi-column fit) */}
        <div className="border border-slate-300 rounded-xs overflow-hidden flex flex-col justify-between" style={{ flex: '315 1 0%' }}>
          <table className="w-full text-xs table-fixed">
            <thead>
              <tr className="bg-[#0f2744] text-white">
                <th className="w-[32%] py-1.5 px-2.5 text-left font-bold text-[10.5px] uppercase tracking-wider">Earnings</th>
                <th className="w-[17%] py-1.5 px-1.5 text-right font-bold text-[10.5px] uppercase tracking-wider">Fixed</th>
                <th className="w-[17%] py-1.5 px-1.5 text-right font-bold text-[10.5px] uppercase tracking-wider">Earned</th>
                <th className="w-[17%] py-1.5 px-1.5 text-right font-bold text-[10.5px] uppercase tracking-wider">Arrears</th>
                <th className="w-[17%] py-1.5 px-2 text-right font-bold text-[10.5px] uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {Array.from({ length: maxRows }).map((_, idx) => {
                const item = earningsRows[idx];
                if (!item) {
                  return (
                    <tr key={`empty_earn_${idx}`} className="h-6">
                      <td className="px-2.5 py-1 text-slate-400">-</td>
                      <td className="px-1.5 py-1 text-right text-slate-400"></td>
                      <td className="px-1.5 py-1 text-right text-slate-400"></td>
                      <td className="px-1.5 py-1 text-right text-slate-400"></td>
                      <td className="px-2 py-1 text-right text-slate-400"></td>
                    </tr>
                  );
                }
                return (
                  <tr key={`earn_${idx}`} className="hover:bg-slate-50/50">
                    <td className="px-2.5 py-1.5 font-medium text-slate-800 text-[11px] truncate" title={item.label}>
                      {item.label}
                    </td>
                    <td className="px-1.5 py-1.5 text-right font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      {isBlank ? '—' : formatIndianCurrency(item.tier.fixed, false)}
                    </td>
                    <td className="px-1.5 py-1.5 text-right font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      {isBlank ? '—' : formatIndianCurrency(item.tier.earned, false)}
                    </td>
                    <td className="px-1.5 py-1.5 text-right font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      {isBlank ? '—' : formatIndianCurrency(item.tier.arrears, false)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-semibold text-[11px] text-slate-900 whitespace-nowrap">
                      {isBlank ? '—' : formatIndianCurrency(item.tier.total, false)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Gross Earnings Subtotal Footer */}
          <div className="border-t-2 border-slate-300 bg-slate-50/80 px-2.5 py-2 flex justify-between items-center text-xs">
            <span className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">Gross Earnings</span>
            <span className="font-bold font-mono text-slate-900 text-[12px]">
              {isBlank ? '₹0.00' : formatIndianCurrency(emp.grossEarnings)}
            </span>
          </div>
        </div>

        {/* Right: Deductions Table (Proportional 202pt width ~ 39.1%) */}
        <div className="border border-slate-300 rounded-xs overflow-hidden flex flex-col justify-between" style={{ flex: '202 1 0%' }}>
          <table className="w-full text-xs table-fixed">
            <thead>
              <tr className="bg-[#0f2744] text-white">
                <th className="w-[62%] py-1.5 px-3 text-left font-bold text-[10.5px] uppercase tracking-wider">Deductions</th>
                <th className="w-[38%] py-1.5 px-3 text-right font-bold text-[10.5px] uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {Array.from({ length: maxRows }).map((_, idx) => {
                const item = deductionsRows[idx];
                if (!item) {
                  return (
                    <tr key={`empty_ded_${idx}`} className="h-6">
                      <td className="px-3 py-1 text-slate-400">-</td>
                      <td className="px-3 py-1 text-right text-slate-400"></td>
                    </tr>
                  );
                }
                return (
                  <tr key={`ded_${idx}`} className="hover:bg-slate-50/50">
                    <td className="px-3 py-1.5 font-medium text-slate-800 text-[11px] truncate" title={item.label}>
                      {item.label}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono font-semibold text-[11px] text-slate-900 whitespace-nowrap">
                      {isBlank ? '—' : formatIndianCurrency(item.amount, false)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Total Deductions Subtotal Footer */}
          <div className="border-t-2 border-slate-300 bg-slate-50/80 px-3 py-2 flex justify-between items-center text-xs">
            <span className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">Total Deductions</span>
            <span className="font-bold font-mono text-slate-900 text-[12px]">
              {isBlank ? '₹0.00' : formatIndianCurrency(emp.totalDeductions)}
            </span>
          </div>
        </div>
      </div>

      {/* 6. TOTAL NET PAYABLE CARD */}
      <div className="bg-[#f0f5fa] border border-[#d0e0f0] rounded-xs p-3.5 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-6 bg-amber-600 rounded-xs"></div>
          <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Total Net Payable
          </span>
        </div>
        <div className="text-right">
          <span className="font-mono font-bold text-slate-900 text-lg tracking-tight">
            {isBlank ? '₹0.00' : formatIndianCurrency(emp.calculatedNetPayable)}
          </span>
        </div>
      </div>

      {/* 7. AMOUNT IN WORDS & OFFICIAL SEAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
        <div className="flex-1 space-y-1">
          <div className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider">
            Amount In Words
          </div>
          <div className="text-xs text-slate-800 font-medium pb-1 border-b border-slate-300">
            {amountInWords}
          </div>
          <div className="text-[10px] text-slate-400 italic pt-6">
            {template?.footerText || '-- This is a computer-generated payslip under Tamil Nadu Shops & Establishments Rules, 1948 --'}
          </div>
        </div>

        {/* Bottom Right Stamp - Positioned nicely with plenty of breathing room */}
        <div className="shrink-0 flex flex-col items-end justify-center pr-2 pt-3">
          <PioneerSealStamp size={140} />
        </div>
      </div>
    </div>
  );
};
