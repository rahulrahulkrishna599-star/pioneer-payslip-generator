import { ColumnMapping, PayslipFieldKey } from '../types';

export interface FieldDefinition {
  key: PayslipFieldKey;
  label: string;
  category: 'personal' | 'attendance' | 'earnings' | 'deductions' | 'summary';
  aliases: string[];
  description: string;
  isCalculatedOrDuplicate?: boolean;
}

export const PAYSLIP_FIELD_DEFINITIONS: FieldDefinition[] = [
  // Personal & Statutory
  {
    key: 'employeeId',
    label: 'Employee ID',
    category: 'personal',
    aliases: ['employee id', 'empid', 'emp id', 'emp_id', 'code', 'emp code', 'id', 'staff id'],
    description: 'Unique identifier for employee (e.g. PC0067)',
  },
  {
    key: 'employeeName',
    label: 'Employee Name',
    category: 'personal',
    aliases: ['name', 'employee name', 'emp name', 'emp_name', 'staff name', 'employee'],
    description: 'Full name of the employee',
  },
  {
    key: 'designation',
    label: 'Designation',
    category: 'personal',
    aliases: ['designation', 'desig', 'role', 'title', 'position', 'job title'],
    description: 'Job role or designation (e.g. HRBP MANAGER)',
  },
  {
    key: 'department',
    label: 'Department',
    category: 'personal',
    aliases: ['department', 'dept', 'division', 'section', 'unit'],
    description: 'Employee department (e.g. HR & ADMIN)',
  },
  {
    key: 'doj',
    label: 'Date of Joining (DOJ)',
    category: 'personal',
    aliases: ['doj', 'd.o.j', 'date of joining', 'date_of_joining', 'joining date', 'join date'],
    description: 'Date joined Pioneer Corporation',
  },
  {
    key: 'uanNumber',
    label: 'UAN Number',
    category: 'personal',
    aliases: ['uan number', 'uan no', 'uan_no', 'uannumber', 'uan', 'epfo uan'],
    description: 'Universal Account Number (PF)',
  },
  {
    key: 'esiNumber',
    label: 'ESI Number',
    category: 'personal',
    aliases: ['esi number', 'esi no', 'esi_no', 'esinumber', 'esic no', 'insurance no'],
    description: 'Employee State Insurance Number',
  },
  {
    key: 'pfEsiApplicable',
    label: 'PF & ESI Applicable',
    category: 'personal',
    aliases: ['pf&esi applicable', 'pf & esi applicable', 'pf esi', 'pf/esi', 'pf_esi', 'applicable'],
    description: 'Eligibility status (Yes / No)',
  },

  // Attendance
  {
    key: 'paidDays',
    label: 'Paid Days',
    category: 'attendance',
    aliases: [
      'no of wkgs days during month',
      'no of wkgs',
      'working days',
      'paid days',
      'paiddays',
      'present days',
      'payable days',
      'present',
    ],
    description: 'Number of paid days in pay period (e.g. 26)',
  },
  {
    key: 'lopDays',
    label: 'LOP Days',
    category: 'attendance',
    aliases: ['lop days', 'lop', 'lopdays', 'loss of pay', 'absent days', 'unpaid days'],
    description: 'Loss of pay (unpaid absence) days',
  },

  // Earnings
  {
    key: 'basic',
    label: 'Basic',
    category: 'earnings',
    aliases: [
      'wages earned - basic',
      'basic',
      'basic pay',
      'basic_salary',
      'basic wage',
      'earned basic',
    ],
    description: 'Basic salary component (e.g. ₹36,600.00)',
  },
  {
    key: 'hra',
    label: 'House Rent Allowance (HRA)',
    category: 'earnings',
    aliases: [
      'wages earned - hra',
      'hra',
      'h.r.a',
      'house rent allowance',
      'house rent',
    ],
    description: 'House rent allowance (e.g. ₹12,200.00)',
  },
  {
    key: 'waterAllowance',
    label: 'Water allowance (W.A)',
    category: 'earnings',
    aliases: [
      'wages earned - w.a',
      'wages earned - wa',
      'w.a',
      'wa',
      'water allowance',
      'water',
    ],
    description: 'Water allowance component (e.g. ₹3,050.00)',
  },
  {
    key: 'incentive',
    label: 'Incentive',
    category: 'earnings',
    aliases: [
      'wages earned - incentive',
      'incentive',
      'incentives',
      'performance incentive',
      'bonus',
    ],
    description: 'Incentive component (e.g. ₹9,150.00)',
  },
  {
    key: 'da',
    label: 'Dearness Allowance (DA)',
    category: 'earnings',
    aliases: ['wages earned - da', 'da', 'd.a', 'dearness allowance'],
    description: 'Dearness allowance (aggregated into Other Allowance)',
  },
  {
    key: 'otherAllowance',
    label: 'Other Allowance',
    category: 'earnings',
    aliases: ['other allowance', 'other allowances', 'special allowance', 'others'],
    description: 'Additional non-statutory allowances',
  },
  {
    key: 'grossEarnings',
    label: 'Gross Earnings (Reference)',
    category: 'earnings',
    aliases: [
      'wages earned - total',
      'gross total',
      'gross earnings',
      'total earnings',
      'gross salary',
      'gross',
    ],
    description: 'Total Gross Earnings in sheet (e.g. ₹61,000.00)',
    isCalculatedOrDuplicate: true,
  },

  // Deductions
  {
    key: 'incomeTax',
    label: 'Income Tax (TDS)',
    category: 'deductions',
    aliases: [
      'deductions - tds',
      'tds',
      'income tax',
      'it',
      'tax deduction',
      'tax',
    ],
    description: 'Tax Deducted at Source (TDS)',
  },
  {
    key: 'providentFund',
    label: 'Provident Fund (PF)',
    category: 'deductions',
    aliases: [
      'deductions - pf',
      'pf',
      'p.f',
      'provident fund',
      'epf',
    ],
    description: 'Employee Provident Fund contribution',
  },
  {
    key: 'esi',
    label: 'ESI Deduction',
    category: 'deductions',
    aliases: [
      'deductions - esi',
      'esi',
      'e.s.i',
      'esi deduction',
      'esic deduction',
    ],
    description: 'Employee State Insurance deduction',
  },
  {
    key: 'previousMonth',
    label: 'Previous Month Adjustment',
    category: 'deductions',
    aliases: [
      'deductions - previous month',
      'wages earned - previous month',
      'previous month',
      'prev month',
    ],
    description: 'Previous month recovery/adjustments',
  },
  {
    key: 'advance',
    label: 'Salary Advance',
    category: 'deductions',
    aliases: ['deductions - advance', 'advance', 'salary advance'],
    description: 'Advance recovery (aggregated into Other Deduction)',
  },
  {
    key: 'lateFine',
    label: 'Late Fine / Penalties',
    category: 'deductions',
    aliases: ['deductions - late fine', 'late fine', 'fine', 'penalty'],
    description: 'Late fine (aggregated into Other Deduction)',
  },
  {
    key: 'otherDeduction',
    label: 'Other deduction',
    category: 'deductions',
    aliases: ['other deduction', 'other deductions', 'misc deduction'],
    description: 'Other deductions (Advance, Late Fine, etc.)',
  },
  {
    key: 'totalDeductions',
    label: 'Total Deductions (Reference)',
    category: 'deductions',
    aliases: ['total deductions', 'total deduction', 'tot deductions'],
    description: 'Total deductions in sheet',
    isCalculatedOrDuplicate: true,
  },

  // Net Payable
  {
    key: 'netPayable',
    label: 'Net Payable (Reference)',
    category: 'summary',
    aliases: [
      'net payable',
      'net   payable',
      'net salary',
      'net pay',
      'take home',
      'total net payable',
    ],
    description: 'Net payable in sheet (e.g. ₹61,000.00)',
    isCalculatedOrDuplicate: true,
  },
];

// Columns to automatically ignore so they don't collide or double count
export const DUPLICATE_CALCULATION_ALIASES = [
  'wages earned - (basic + da)',
  'wages earned - net salary',
  '(basic + da)',
  'basic + da',
  'basic+da',
  'net salary',
  'actual wages - basic',
  'actual wages - da',
  'actual wages - hra',
  'actual wages - wa',
  'actual wages - incentive',
  'actual wages - gross total',
  'salary',
  'monthly rated',
  'wage period monthly',
  'sex',
  's.no.',
  's.no',
  's no',
  'col_18',
  'col_28',
];

const LOCAL_STORAGE_MAPPING_KEY = 'pioneer_saved_column_mappings_v2';

export function getSavedMappings(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MAPPING_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveMappings(mappings: ColumnMapping[]) {
  try {
    const saved: Record<string, string> = {};
    for (const m of mappings) {
      if (m.action.type === 'field') {
        saved[m.sourceColumn.toLowerCase().trim()] = m.action.targetField;
      } else if (m.action.type === 'ignore') {
        saved[m.sourceColumn.toLowerCase().trim()] = 'ignore';
      }
    }
    localStorage.setItem(LOCAL_STORAGE_MAPPING_KEY, JSON.stringify(saved));
  } catch (err) {
    console.warn('Failed to save mappings to localStorage', err);
  }
}

/**
 * Automatically detects column mapping based on header names and sample data.
 */
export function autoDetectColumnMappings(
  headers: string[],
  sampleRow?: Record<string, any>
): ColumnMapping[] {
  const saved = getSavedMappings();
  const mappings: ColumnMapping[] = [];
  const assignedFields = new Set<PayslipFieldKey>();

  for (const rawHeader of headers) {
    const cleaned = rawHeader.toLowerCase().trim().replace(/[\r\n\t_]+/g, ' ');
    const sampleVal = sampleRow ? sampleRow[rawHeader] : undefined;

    // 1. Check saved preferences
    if (saved[cleaned]) {
      const savedTarget = saved[cleaned];
      if (savedTarget === 'ignore') {
        mappings.push({
          sourceColumn: rawHeader,
          action: { type: 'ignore' },
          confidence: 0.99,
          sampleValue: sampleVal,
        });
        continue;
      } else {
        const fieldKey = savedTarget as PayslipFieldKey;
        if (!assignedFields.has(fieldKey)) {
          assignedFields.add(fieldKey);
          mappings.push({
            sourceColumn: rawHeader,
            action: { type: 'field', targetField: fieldKey },
            confidence: 0.95,
            sampleValue: sampleVal,
          });
          continue;
        }
      }
    }

    // 2. Check known duplicate calculations or non-payslip columns
    if (DUPLICATE_CALCULATION_ALIASES.some((d) => cleaned === d || cleaned.startsWith(d))) {
      mappings.push({
        sourceColumn: rawHeader,
        action: { type: 'ignore' },
        confidence: 0.99,
        sampleValue: sampleVal,
      });
      continue;
    }

    // 3. Exact alias match against PAYSLIP_FIELD_DEFINITIONS
    let bestMatch: { field: FieldDefinition; confidence: number } | null = null;

    for (const def of PAYSLIP_FIELD_DEFINITIONS) {
      if (assignedFields.has(def.key)) continue;

      for (const alias of def.aliases) {
        if (cleaned === alias) {
          bestMatch = { field: def, confidence: 1.0 };
          break;
        } else if (cleaned.includes(alias) && alias.length > 3) {
          const conf = alias.length / Math.max(cleaned.length, 1);
          if (!bestMatch || conf > bestMatch.confidence) {
            bestMatch = { field: def, confidence: Math.max(0.75, conf) };
          }
        }
      }
      if (bestMatch && bestMatch.confidence === 1.0) break;
    }

    if (bestMatch && bestMatch.confidence >= 0.75) {
      assignedFields.add(bestMatch.field.key);
      mappings.push({
        sourceColumn: rawHeader,
        action: { type: 'field', targetField: bestMatch.field.key },
        confidence: bestMatch.confidence,
        sampleValue: sampleVal,
      });
    } else {
      // Unmapped / ignored by default
      mappings.push({
        sourceColumn: rawHeader,
        action: { type: 'ignore' },
        confidence: 0.1,
        sampleValue: sampleVal,
      });
    }
  }

  return mappings;
}
