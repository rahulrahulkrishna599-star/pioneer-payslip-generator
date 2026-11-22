import React from 'react';
import { CompanySettings, EmployeeRecord, PayslipTemplate } from '../types';
import { formatIndianCurrency, numberToIndianWords } from '../utils/numberToWords';
import { PioneerLogoSvg } from '../utils/pioneerLogo';
import { formatFullAddress } from '../utils/templateStorage';

interface PayslipPreviewProps {
  employee: EmployeeRecord;
  settings: CompanySettings;
  template?: PayslipTemplate;
}

export const PayslipPreview: React.FC<PayslipPreviewProps> = ({
  employee,
  settings,
  template,
}) => {
  const amountInWords = numberToIndianWords(employee.calculatedNetPayable);

  // Determine dynamic earnings from template or defaults
  // Dynamic earnings list (base + template + individual custom earnings)
  const earningsList: { label: string; amount: number }[] = [
    { label: 'Basic', amount: employee.basic },
    { label: 'House Rent Allowance', amount: employee.hra },
    { label: 'Water allowance', amount: employee.waterAllowance },
    { label: 'Incentive', amount: employee.incentive },
    { label: 'Other Allowance', amount: employee.otherAllowance },
  ];
  if (employee.da && employee.da > 0) {
    earningsList.push({ label: 'DA', amount: employee.da });
  }
  if (employee.additionalEarnings && employee.additionalEarnings.length > 0) {
    employee.additionalEarnings.forEach((item) => {
      if (!earningsList.some((e) => e.label.toLowerCase() === item.name.toLowerCase())) {
        earningsList.push({ label: item.name, amount: item.amount });
      }
    });
  }

  // Dynamic deductions list (base + template + individual custom deductions)
  const deductionsList: { label: string; amount: number }[] = [
    { label: 'Income Tax', amount: employee.incomeTax },
    { label: 'Provident Fund', amount: employee.providentFund },
    { label: 'ESI', amount: employee.esi },
    { label: 'Previous Month', amount: employee.previousMonth },
    { label: 'Other deduction', amount: employee.otherDeduction },
  ];
  if (employee.advance && employee.advance > 0) {
    deductionsList.push({ label: 'Advance', amount: employee.advance });
  }
  if (employee.lateFine && employee.lateFine > 0) {
    deductionsList.push({ label: 'Late Fine', amount: employee.lateFine });
  }
  if (employee.additionalDeductions && employee.additionalDeductions.length > 0) {
    employee.additionalDeductions.forEach((item) => {
      if (!deductionsList.some((d) => d.label.toLowerCase() === item.name.toLowerCase())) {
        deductionsList.push({ label: item.name, amount: item.amount });
      }
    });
  }

  const maxRows = Math.max(earningsList.length, deductionsList.length);

  // Theme styling
  const isNavy = template?.themeColor === 'navy';
  const isBlue = template?.themeColor === 'blue';
  const netBoxBg = isNavy ? 'bg-slate-100 border-slate-300' : isBlue ? 'bg-blue-50/80 border-blue-200' : 'bg-[#eefbf3] border-emerald-100';
  const netAccentBar = isNavy ? 'bg-slate-800' : isBlue ? 'bg-blue-600' : 'bg-emerald-500';
  const netSubtext = isNavy ? 'text-slate-700' : isBlue ? 'text-blue-700' : 'text-emerald-700';

  const companyTitle = template?.companyName || settings.companyName;

  // Dynamically assemble company address including street, city/pincode and country
  const companyAddr = formatFullAddress(
    template?.companyAddress ?? settings.companyAddress,
    template?.cityPincode,
    template?.country
  );

  const payPeriodText = template?.payPeriod || employee.payPeriod || 'October 2026';
  const payDateText = template?.payDate || employee.payDate || '01/11/2026';
  const footerNote = template?.footerText || settings.footerText;
  const hasCustomLogo = Boolean(
    template?.logoUrl && 
    template.logoUrl !== 'default-pioneer' && 
    template.logoUrl.trim().length > 0
  );

  return (
    <div className="bg-white text-slate-800 shadow-xl border border-slate-200 rounded-xs mx-auto max-w-[820px] w-full px-8 py-8 sm:px-12 sm:py-10 font-sans print:shadow-none print:border-none print:p-0">
      {/* 1. Header with Logo & Address */}
      <div className="flex justify-between items-start pb-5 border-b border-slate-200">
        <div className="flex items-start gap-3 sm:gap-4">
          {hasCustomLogo ? (
            <img
              src={template!.logoUrl}
              alt="Company Logo"
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
            />
          ) : (
            <PioneerLogoSvg />
          )}
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 uppercase">
              {companyTitle}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 sm:mt-1 max-w-md">
              {companyAddr}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xs text-slate-600 font-normal">
            Payslip For the Month
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
            {payPeriodText}
          </div>
          {payDateText && (
            <div className="text-[11px] text-slate-500 mt-0.5">
              Pay Date: <span className="font-medium text-slate-700">{payDateText}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Employee Summary with Flex Layout (Prevents Green Box Overflow) */}
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-start gap-5">
        {/* Left: Summary Details */}
        <div className="flex-1 min-w-[220px]">
          <div className="text-[11px] font-bold tracking-wider uppercase text-slate-600 mb-3">
            EMPLOYEE SUMMARY
          </div>

          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-12">
              <span className="col-span-5 text-slate-600">Employee Name</span>
              <span className="col-span-1 text-slate-500 font-semibold">:</span>
              <span className="col-span-6 font-bold text-slate-900 truncate">
                {employee.name}
              </span>
            </div>

            <div className="grid grid-cols-12">
              <span className="col-span-5 text-slate-600">Employee ID</span>
              <span className="col-span-1 text-slate-500 font-semibold">:</span>
              <span className="col-span-6 font-bold text-slate-900">
                {employee.id}
              </span>
            </div>

            <div className="grid grid-cols-12">
              <span className="col-span-5 text-slate-600">Pay Period</span>
              <span className="col-span-1 text-slate-500 font-semibold">:</span>
              <span className="col-span-6 text-slate-800">
                {payPeriodText}
              </span>
            </div>

            <div className="grid grid-cols-12">
              <span className="col-span-5 text-slate-600">Pay Date</span>
              <span className="col-span-1 text-slate-500 font-semibold">:</span>
              <span className="col-span-6 text-slate-800">
                {payDateText}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Net Pay Box with bright vertical accent and attendance */}
        <div className={`${netBoxBg} border rounded-xl p-3.5 sm:p-4 shrink-0 min-w-[220px] sm:w-[260px]`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-1 h-8 sm:h-9 ${netAccentBar} rounded-full shrink-0`}></div>
            <div className="min-w-0 flex-1">
              <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                {formatIndianCurrency(employee.calculatedNetPayable)}
              </div>
              <div className={`text-[10px] sm:text-[11px] ${netSubtext} font-medium`}>
                Total Net Pay
              </div>
            </div>
          </div>

          {/* Dotted line inside net pay box */}
          <div className="my-2.5 border-t border-dotted border-slate-300"></div>

          {/* Paid / LOP Days */}
          <div className="space-y-1 text-xs">
            <div className="grid grid-cols-12">
              <span className="col-span-6 text-slate-600">Paid Days</span>
              <span className="col-span-1 text-slate-500 font-semibold">:</span>
              <span className="col-span-5 font-bold text-slate-900">
                {employee.paidDays}
              </span>
            </div>

            <div className="grid grid-cols-12">
              <span className="col-span-6 text-slate-600">LOP Days</span>
              <span className="col-span-1 text-slate-500 font-semibold">:</span>
              <span className="col-span-5 font-bold text-slate-900">
                {employee.lopDays}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dotted Full Width Divider */}
      <div className="my-6 border-t border-dotted border-slate-300"></div>

      {/* 3. Employee Information (Two Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 sm:gap-x-12 gap-y-2 text-xs">
        {/* Left Column */}
        <div className="space-y-2">
          <div className="grid grid-cols-12">
            <span className="col-span-5 text-slate-600">UAN Number</span>
            <span className="col-span-1 text-slate-500 font-semibold">:</span>
            <span className="col-span-6 font-medium text-slate-900 truncate">
              {employee.uanNumber || '-'}
            </span>
          </div>

          <div className="grid grid-cols-12">
            <span className="col-span-5 text-slate-600">DOJ</span>
            <span className="col-span-1 text-slate-500 font-semibold">:</span>
            <span className="col-span-6 font-medium text-slate-900">
              {employee.doj || '-'}
            </span>
          </div>

          <div className="grid grid-cols-12">
            <span className="col-span-5 text-slate-600">Department</span>
            <span className="col-span-1 text-slate-500 font-semibold">:</span>
            <span className="col-span-6 font-medium text-slate-900 truncate">
              {employee.department || '-'}
            </span>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-2">
          <div className="grid grid-cols-12">
            <span className="col-span-5 text-slate-600">ESI Number</span>
            <span className="col-span-1 text-slate-500 font-semibold">:</span>
            <span className="col-span-6 font-medium text-slate-900">
              {employee.esiNumber || '-'}
            </span>
          </div>

          <div className="grid grid-cols-12">
            <span className="col-span-5 text-slate-600">Designation</span>
            <span className="col-span-1 text-slate-500 font-semibold">:</span>
            <span className="col-span-6 font-medium text-slate-900 truncate">
              {employee.designation || '-'}
            </span>
          </div>

          <div className="grid grid-cols-12">
            <span className="col-span-5 text-slate-600">PF&ESI applicable</span>
            <span className="col-span-1 text-slate-500 font-semibold">:</span>
            <span className="col-span-6 font-medium text-slate-900">
              {employee.pfEsiApplicable || 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Earnings & Deductions Table */}
      <div className="mt-8 text-xs">
        {/* Table Header */}
        <div className="grid grid-cols-2 pb-2 border-b border-dotted border-slate-300 font-bold text-slate-900 text-[11px]">
          <div className="flex justify-between pr-4 sm:pr-8">
            <span>EARNINGS</span>
            <span>AMOUNT</span>
          </div>
          <div className="flex justify-between pl-4 sm:pl-8">
            <span>DEDUCTIONS</span>
            <span>AMOUNT</span>
          </div>
        </div>

        {/* Table Body (Clean white space, no row borders) */}
        <div className="py-2 space-y-2.5">
          {Array.from({ length: maxRows }).map((_, idx) => {
            const earn = earningsList[idx];
            const ded = deductionsList[idx];
            return (
              <div key={idx} className="grid grid-cols-2 text-slate-800">
                <div className="flex justify-between pr-4 sm:pr-8">
                  {earn ? (
                    <>
                      <span className="truncate pr-2">{earn.label}</span>
                      <span className="font-bold text-slate-900 shrink-0">
                        {formatIndianCurrency(earn.amount)}
                      </span>
                    </>
                  ) : (
                    <span>&nbsp;</span>
                  )}
                </div>
                <div className="flex justify-between pl-4 sm:pl-8">
                  {ded ? (
                    <>
                      <span className="truncate pr-2">{ded.label}</span>
                      <span className="font-bold text-slate-900 shrink-0">
                        {formatIndianCurrency(ded.amount)}
                      </span>
                    </>
                  ) : (
                    <span>&nbsp;</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals Row with light gray/slate shading */}
        <div className="grid grid-cols-2 bg-[#f8fafc] p-3 rounded font-bold text-slate-900 mt-2">
          <div className="flex justify-between pr-4 sm:pr-8">
            <span>Gross Earnings</span>
            <span className="font-bold text-slate-900">
              {formatIndianCurrency(employee.grossEarnings)}
            </span>
          </div>
          <div className="flex justify-between pl-4 sm:pl-8">
            <span>Total Deductions</span>
            <span className="font-bold text-slate-900">
              {formatIndianCurrency(employee.totalDeductions)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. TOTAL NET PAYABLE Card */}
      <div className="mt-5 border border-slate-200 rounded-lg p-2.5 flex justify-between items-center bg-white">
        <div className="pl-3">
          <div className="text-xs font-bold text-slate-900 uppercase tracking-tight">
            TOTAL NET PAYABLE
          </div>
          <div className="text-[10px] text-slate-500">
            Gross Earnings - Total Deductions
          </div>
        </div>

        {/* Amount pill on right */}
        <div className={`${netBoxBg} text-slate-900 font-bold text-sm px-6 py-2 rounded-md`}>
          {formatIndianCurrency(employee.calculatedNetPayable)}
        </div>
      </div>

      {/* 6. Amount in Words (Aligned Right) */}
      {template?.showAmountInWords !== false && (
        <div className="mt-4 text-right text-xs text-slate-600">
          <span>Amount In Words : </span>
          <span className="font-medium text-slate-900">{amountInWords}</span>
        </div>
      )}

      {/* Thin line under Amount in Words */}
      <div className="mt-4 border-t border-slate-200"></div>

      {/* 7. System Generated Document Note */}
      <div className="mt-6 text-center text-[10px] text-slate-500">
        {footerNote}
      </div>
    </div>
  );
};
