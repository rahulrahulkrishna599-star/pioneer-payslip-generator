import React from 'react';
import { 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { ColumnMapping, PayslipFieldKey } from '../types';
import { PAYSLIP_FIELD_DEFINITIONS, saveMappings } from '../utils/columnDetector';

interface MappingStepProps {
  mappings: ColumnMapping[];
  onUpdateMapping: (index: number, updated: ColumnMapping) => void;
  onResetMappings: () => void;
  onProceedToReview: () => void;
  sampleRow?: Record<string, any>;
}

export const MappingStep: React.FC<MappingStepProps> = ({
  mappings,
  onUpdateMapping,
  onResetMappings,
  onProceedToReview,
}) => {
  // Check for duplicate mappings to the same field
  const fieldUsageCount: Record<string, number> = {};
  for (const m of mappings) {
    if (m.action.type === 'field') {
      fieldUsageCount[m.action.targetField] = (fieldUsageCount[m.action.targetField] || 0) + 1;
    }
  }

  const duplicates = Object.entries(fieldUsageCount).filter(([_, count]) => count > 1);

  // Check required core fields
  const hasEmpId = mappings.some((m) => m.action.type === 'field' && m.action.targetField === 'employeeId');
  const hasEmpName = mappings.some((m) => m.action.type === 'field' && m.action.targetField === 'employeeName');
  const hasBasic = mappings.some((m) => m.action.type === 'field' && m.action.targetField === 'basic');

  const handleDropdownChange = (index: number, val: string) => {
    const cur = mappings[index];
    if (val === 'ignore') {
      onUpdateMapping(index, {
        ...cur,
        action: { type: 'ignore' },
        confidence: 1.0,
      });
    } else if (val === 'additional_earning') {
      onUpdateMapping(index, {
        ...cur,
        action: { type: 'additional_earning', label: cur.sourceColumn },
        confidence: 1.0,
      });
    } else if (val === 'additional_deduction') {
      onUpdateMapping(index, {
        ...cur,
        action: { type: 'additional_deduction', label: cur.sourceColumn },
        confidence: 1.0,
      });
    } else {
      onUpdateMapping(index, {
        ...cur,
        action: { type: 'field', targetField: val as PayslipFieldKey },
        confidence: 1.0,
      });
    }
  };

  const handleSaveAndContinue = () => {
    saveMappings(mappings);
    onProceedToReview();
  };

  // Group definitions for clean select options
  const personalFields = PAYSLIP_FIELD_DEFINITIONS.filter((f) => f.category === 'personal');
  const attendanceFields = PAYSLIP_FIELD_DEFINITIONS.filter((f) => f.category === 'attendance');
  const earningsFields = PAYSLIP_FIELD_DEFINITIONS.filter((f) => f.category === 'earnings');
  const deductionFields = PAYSLIP_FIELD_DEFINITIONS.filter((f) => f.category === 'deductions');
  const summaryFields = PAYSLIP_FIELD_DEFINITIONS.filter((f) => f.category === 'summary');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Column Mapping Configuration
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <Sparkles className="w-3 h-3 text-emerald-600" /> Auto-Detected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Verify how your spreadsheet headers align with Pioneer Corporation payslip fields.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetMappings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Mappings
            </button>
            <button
              type="button"
              onClick={handleSaveAndContinue}
              disabled={duplicates.length > 0 || !hasEmpId || !hasEmpName}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md shadow-xs transition-colors ${
                duplicates.length > 0 || !hasEmpId || !hasEmpName
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <span>Continue to Data Review</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Duplicate Warning */}
        {duplicates.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <div>
              Multiple source columns are mapped to the same destination field:
              {' '}
              <strong>
                {duplicates.map(([field]) => {
                  const def = PAYSLIP_FIELD_DEFINITIONS.find((d) => d.key === field);
                  return def?.label || field;
                }).join(', ')}
              </strong>.
              Please ensure each field is uniquely mapped or choose "Ignore" or "Additional Earning/Deduction".
            </div>
          </div>
        )}

        {/* Missing Core Fields Warning */}
        {(!hasEmpId || !hasEmpName) && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <div>
              Required fields missing:
              {!hasEmpId && <span className="font-bold"> [Employee ID] </span>}
              {!hasEmpName && <span className="font-bold"> [Employee Name] </span>}
              {!hasBasic && <span className="font-bold"> [Basic Salary] </span>}
              Please map these columns to continue.
            </div>
          </div>
        )}
      </div>

      {/* Transparent Calculation Rules Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
        <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1">
          <HelpCircle className="w-4 h-4 text-slate-500" />
          Transparent Payroll Aggregation Rules
        </div>
        <p className="text-[11px] text-slate-500">
          • <strong>Basic, HRA, Water Allowance, Incentive:</strong> mapped directly to individual earnings rows.
          <br />
          • <strong>Dearness Allowance (DA) & Custom Allowances:</strong> aggregated cleanly into <em>Other Allowance</em> so no earnings are lost.
          <br />
          • <strong>Gross Earnings:</strong> calculated dynamically as the verified sum of earnings (intermediate duplicate columns like "Basic + DA" are ignored to prevent double-counting).
          <br />
          • <strong>Net Payable:</strong> calculated as <em>Gross Earnings − Total Deductions</em> and cross-verified against any spreadsheet Net column.
        </p>
      </div>

      {/* Mappings Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs font-semibold text-slate-700">
          <span>{mappings.length} Spreadsheet Columns Detected</span>
          <span className="text-slate-400">
            {mappings.filter((m) => m.action.type !== 'ignore').length} Mapped •{' '}
            {mappings.filter((m) => m.action.type === 'ignore').length} Ignored
          </span>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 w-1/4">Source Spreadsheet Header</th>
                <th className="py-2.5 px-4 w-1/4">Sample Value (Row 1)</th>
                <th className="py-2.5 px-4 w-1/3">Mapped Destination Field</th>
                <th className="py-2.5 px-4 text-right">Detection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mappings.map((mapping, idx) => {
                let selectedVal = 'ignore';
                if (mapping.action.type === 'field') {
                  selectedVal = mapping.action.targetField;
                } else if (mapping.action.type === 'additional_earning') {
                  selectedVal = 'additional_earning';
                } else if (mapping.action.type === 'additional_deduction') {
                  selectedVal = 'additional_deduction';
                }

                const isIgnored = mapping.action.type === 'ignore';
                const isDuplicated = mapping.action.type === 'field' && (fieldUsageCount[mapping.action.targetField] || 0) > 1;

                return (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isDuplicated ? 'bg-red-50/40' : ''
                    }`}
                  >
                    {/* Source Column */}
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          {mapping.sourceColumn}
                        </span>
                      </div>
                    </td>

                    {/* Sample Value */}
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] truncate max-w-[180px]">
                      {mapping.sampleValue !== undefined && mapping.sampleValue !== null && mapping.sampleValue !== ''
                        ? String(mapping.sampleValue)
                        : <span className="text-slate-300 italic">Empty</span>}
                    </td>

                    {/* Destination Field Select */}
                    <td className="py-3 px-4">
                      <select
                        value={selectedVal}
                        onChange={(e) => handleDropdownChange(idx, e.target.value)}
                        className={`w-full text-xs font-medium py-1.5 px-2.5 rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                          isIgnored
                            ? 'bg-slate-50 text-slate-400 border-slate-200'
                            : isDuplicated
                            ? 'bg-red-50 text-red-800 border-red-300 font-semibold'
                            : 'bg-white text-slate-800 border-slate-300 font-semibold'
                        }`}
                      >
                        <option value="ignore">— Ignore Column (Do Not Map) —</option>

                        <optgroup label="Employee Statutory & Personal">
                          {personalFields.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </optgroup>

                        <optgroup label="Attendance">
                          {attendanceFields.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </optgroup>

                        <optgroup label="Earnings Components">
                          {earningsFields.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </optgroup>

                        <optgroup label="Deductions Components">
                          {deductionFields.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </optgroup>

                        <optgroup label="Verification Totals">
                          {summaryFields.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </optgroup>

                        <optgroup label="Custom Aggregation">
                          <option value="additional_earning">+ Add to Other Allowance (Earnings)</option>
                          <option value="additional_deduction">+ Add to Other Deduction</option>
                        </optgroup>
                      </select>
                    </td>

                    {/* Match Indicator */}
                    <td className="py-3 px-4 text-right">
                      {isIgnored ? (
                        <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded">
                          Ignored
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Matched
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

