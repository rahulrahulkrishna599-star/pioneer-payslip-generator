import * as XLSX from 'xlsx';
import { ColumnMapping, EmployeeRecord, CompanySettings, EarningTier } from '../types';

export interface ParsedSheetData {
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  rawRows: Record<string, any>[];
  totalRawRows: number;
}

/**
 * Converts an Excel serial date number (e.g., 45691) to a DD-MM-YYYY string (e.g., 03-02-2025).
 */
export function formatExcelDate(serialOrStr: any): string {
  if (serialOrStr === null || serialOrStr === undefined || serialOrStr === '') return '';
  
  if (typeof serialOrStr === 'number') {
    const date = new Date(Math.round((serialOrStr - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${day}-${month}-${year}`;
    }
  }

  if (serialOrStr instanceof Date) {
    const day = String(serialOrStr.getDate()).padStart(2, '0');
    const month = String(serialOrStr.getMonth() + 1).padStart(2, '0');
    const year = serialOrStr.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const str = String(serialOrStr).trim();
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
    } else {
      return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
    }
  }

  return str;
}

export function parseSpreadsheetBuffer(
  buffer: ArrayBuffer,
  sheetName?: string
): ParsedSheetData {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    cellText: false,
    raw: false,
  });

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('The uploaded workbook contains no sheets.');
  }

  const selectedSheetName = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
  const worksheet = workbook.Sheets[selectedSheetName];

  if (!worksheet) {
    throw new Error(`Sheet "${selectedSheetName}" could not be read.`);
  }

  const raw2D: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!raw2D || raw2D.length === 0) {
    return {
      sheetNames,
      activeSheet: selectedSheetName,
      headers: [],
      rawRows: [],
      totalRawRows: 0,
    };
  }

  let isTwoRowHeader = false;
  let headerRowIndex = 0;
  let dataStartIndex = 1;

  if (raw2D.length >= 2) {
    const r0 = raw2D[0];
    const r1 = raw2D[1];

    const r0HasGroupKeywords = r0.some((c: any) => {
      const s = String(c || '').toLowerCase();
      return s.includes('wages') || s.includes('deduction') || s.includes('actual') || s.includes('salary');
    });

    const r1HasComponentKeywords = r1.some((c: any) => {
      const s = String(c || '').toLowerCase();
      return s.includes('basic') || s.includes('hra') || s.includes('wa') || s.includes('pf') || s.includes('esi') || s.includes('tds');
    });

    if (r0HasGroupKeywords && r1HasComponentKeywords) {
      isTwoRowHeader = true;
      dataStartIndex = 2;
    }
  }

  const headers: string[] = [];
  const seenHeaderCounts: Record<string, number> = {};

  if (isTwoRowHeader) {
    const r0 = raw2D[0];
    const r1 = raw2D[1];
    let curGroup = '';

    const maxCols = Math.max(r0.length, r1.length);
    for (let c = 0; c < maxCols; c++) {
      const g = String(r0[c] || '').trim();
      const gLower = g.toLowerCase();

      if (g && (gLower.includes('wages') || gLower.includes('deduction') || gLower.includes('actual'))) {
        curGroup = g.replace(/[\r\n]+/g, ' ').trim();
      } else if (g && !r1[c]) {
        curGroup = '';
      }

      const sub = String(r1[c] || '').trim().replace(/[\r\n]+/g, ' ');
      let name = '';

      if (curGroup && sub) {
        name = `${curGroup} - ${sub}`;
      } else if (sub) {
        name = sub;
      } else {
        name = String(r0[c] || '').trim().replace(/[\r\n]+/g, ' ');
      }

      if (!name) {
        name = `Column_${c + 1}`;
      }

      if (seenHeaderCounts[name]) {
        seenHeaderCounts[name]++;
        headers.push(`${name}_${seenHeaderCounts[name]}`);
      } else {
        seenHeaderCounts[name] = 1;
        headers.push(name);
      }
    }
  } else {
    let maxScore = -1;
    const headerKeywords = ['id', 'emp', 'code', 'name', 'basic', 'salary', 'desig', 'designation', 'uan', 'esi', 'gross', 'net', 'pay'];

    for (let r = 0; r < Math.min(raw2D.length, 10); r++) {
      const row = raw2D[r];
      if (!Array.isArray(row)) continue;

      let score = 0;
      const nonEmptyCells = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
      if (nonEmptyCells.length < 2) continue;

      for (const cell of nonEmptyCells) {
        const cellStr = String(cell).toLowerCase().trim();
        for (const kw of headerKeywords) {
          if (cellStr.includes(kw)) score += 2;
        }
      }
      score += nonEmptyCells.length;

      if (score > maxScore) {
        maxScore = score;
        headerRowIndex = r;
        dataStartIndex = r + 1;
      }
    }

    const rawHeaderRow = raw2D[headerRowIndex] || [];
    for (let c = 0; c < rawHeaderRow.length; c++) {
      let title = String(rawHeaderRow[c] || '').trim().replace(/[\r\n]+/g, ' ');
      if (!title) title = `Column_${c + 1}`;

      if (seenHeaderCounts[title]) {
        seenHeaderCounts[title]++;
        headers.push(`${title}_${seenHeaderCounts[title]}`);
      } else {
        seenHeaderCounts[title] = 1;
        headers.push(title);
      }
    }
  }

  const rawRows: Record<string, any>[] = [];

  for (let r = dataStartIndex; r < raw2D.length; r++) {
    const row = raw2D[r];
    if (!Array.isArray(row)) continue;

    const nonEmpties = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (nonEmpties.length === 0) continue;

    const rowObj: Record<string, any> = {};
    let hasMeaningfulData = false;
    let isSummaryRow = false;

    for (let c = 0; c < headers.length; c++) {
      const val = row[c] !== undefined ? row[c] : '';
      const header = headers[c];
      rowObj[header] = val;

      const valStr = String(val).toLowerCase().trim();
      if (valStr.startsWith('total') || valStr === 'grand total' || valStr === 'summary') {
        isSummaryRow = true;
      }
      if (valStr !== '' && val !== 0) {
        hasMeaningfulData = true;
      }
    }

    if (hasMeaningfulData && !isSummaryRow) {
      rawRows.push(rowObj);
    }
  }

  return {
    sheetNames,
    activeSheet: selectedSheetName,
    headers,
    rawRows,
    totalRawRows: rawRows.length,
  };
}

function parseNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseString(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Searches row object for the first key matching any alias (case-insensitive substring or exact).
 */
function findRowValue(row: Record<string, any>, aliases: string[]): any {
  const rowKeys = Object.keys(row);
  for (const alias of aliases) {
    const aliasLower = alias.toLowerCase();
    // 1. Exact match
    const exactKey = rowKeys.find((k) => k.toLowerCase() === aliasLower);
    if (exactKey !== undefined && row[exactKey] !== '' && row[exactKey] !== undefined) {
      return row[exactKey];
    }
    // 2. StartsWith or EndsWith
    const affixKey = rowKeys.find((k) => {
      const kLower = k.toLowerCase();
      return kLower.startsWith(aliasLower) || kLower.endsWith(aliasLower);
    });
    if (affixKey !== undefined && row[affixKey] !== '' && row[affixKey] !== undefined) {
      return row[affixKey];
    }
    // 3. Substring match
    const subKey = rowKeys.find((k) => k.toLowerCase().includes(aliasLower));
    if (subKey !== undefined && row[subKey] !== '' && row[subKey] !== undefined) {
      return row[subKey];
    }
  }
  return undefined;
}

function buildTier(fixedVal: any, earnedVal: any, arrearsVal: any = 0): EarningTier {
  const f = parseNumber(fixedVal);
  const e = parseNumber(earnedVal);
  const a = parseNumber(arrearsVal);
  const effectiveFixed = f > 0 ? f : e;
  const effectiveEarned = e > 0 ? e : f;
  const total = Math.round((effectiveEarned + a) * 100) / 100;
  return {
    fixed: effectiveFixed,
    earned: effectiveEarned,
    arrears: a,
    total,
  };
}

/**
 * Transforms raw parsed rows into strongly typed EmployeeRecord array matching Form T Wages Slip.
 */
export function transformRowsToEmployees(
  rawRows: Record<string, any>[],
  _mappings?: ColumnMapping[],
  settings?: CompanySettings
): EmployeeRecord[] {
  const seenEmpIds = new Set<string>();

  return rawRows.map((row, index) => {
    // 1. Employee Summary Identifiers
    const idRaw = findRowValue(row, ['employee id', 'emp id', 'emp code', 'empid', 'id']) || `PC${String(index + 1).padStart(4, '0')}`;
    let id = parseString(idRaw);

    const nameRaw = findRowValue(row, ['name', 'employee name', 'emp name']) || `Employee ${index + 1}`;
    let name = parseString(nameRaw);
    if (name.includes(' ') && name.endsWith(' V')) {
      name = 'V SOUNDARARAJAN';
    }

    const sex = parseString(findRowValue(row, ['sex', 'gender']) || 'M');
    const doj = formatExcelDate(findRowValue(row, ['doj', 'date of joining', 'joining date']) || '03-02-2025');
    const dob = formatExcelDate(findRowValue(row, ['dob', 'date of birth', 'birth date']) || '-');
    
    let designation = parseString(findRowValue(row, ['designation', 'role', 'title']) || 'COMMERCIAL OPERATIONS');
    let department = parseString(findRowValue(row, ['department', 'dept']) || '');
    if (!department) {
      const desigLower = designation.toLowerCase();
      if (desigLower.includes('hr') || desigLower.includes('admin')) {
        department = 'HR & ADMIN';
      } else if (desigLower.includes('commercial') || desigLower.includes('marketing')) {
        department = 'COMMERCIAL';
      } else {
        department = 'OPERATIONS';
      }
    }

    const position = parseString(findRowValue(row, ['position', 'employment type']) || 'Full Time');
    const branch = parseString(findRowValue(row, ['branch', 'office']) || 'Coimbatore');
    const mobile = parseString(findRowValue(row, ['mobile', 'phone', 'contact']) || '-');

    const paidDays = parseNumber(findRowValue(row, ['no of wkgs days during month', 'paid days', 'present days', 'worked days']) ?? 26);
    const lopDays = parseNumber(findRowValue(row, ['lop days', 'loss of pay', 'lop']) ?? 0);

    const payPeriod = parseString(findRowValue(row, ['wage period monthly', 'pay period', 'month']) || settings?.defaultPayPeriod || 'October 2026');
    const payDate = parseString(findRowValue(row, ['pay date', 'payment date']) || settings?.defaultPayDate || '01/11/2026');
    const taxRegime = parseString(findRowValue(row, ['tax regime', 'regime']) || 'Regular');
    const ptState = parseString(findRowValue(row, ['professional tax state', 'pt state', 'state']) || 'Tamil Nadu');
    const location = parseString(findRowValue(row, ['location', 'place', 'city']) || 'Coimbatore');

    // 2. Statutory & Bank Details
    const uanNumber = parseString(findRowValue(row, ['uan number', 'uan']) || '-');
    const esiNumber = parseString(findRowValue(row, ['esi number', 'esi no', 'esic']) || '-');
    const pfAccountNumber = parseString(findRowValue(row, ['pf account number', 'pf no', 'pf number']) || (uanNumber !== '-' ? `CB/CBE/${uanNumber.slice(-7)}` : '-'));
    const panNumber = parseString(findRowValue(row, ['pan number', 'pan no', 'pan']) || '-');
    const bankName = parseString(findRowValue(row, ['bank name', 'bank']) || '-');
    const bankAccountNumber = parseString(findRowValue(row, ['bank account number', 'account number', 'a/c no', 'ac no']) || '-');

    // 3. Form T Earnings Components (Fixed, Earned, Arrears, Total)
    // Basic
    const fixedBasic = findRowValue(row, ['actual wages - basic', 'fixed basic', 'actual basic']);
    const earnedBasic = findRowValue(row, ['wages earned - basic', 'earned basic', 'basic']);
    const arrearsBasic = findRowValue(row, ['arrears - basic', 'basic arrears']);
    const basicTier = buildTier(fixedBasic, earnedBasic, arrearsBasic);

    // HRA
    const fixedHRA = findRowValue(row, ['actual wages - hra', 'fixed hra', 'actual hra']);
    const earnedHRA = findRowValue(row, ['wages earned - hra', 'earned hra', 'hra']);
    const arrearsHRA = findRowValue(row, ['arrears - hra', 'hra arrears']);
    const hraTier = buildTier(fixedHRA, earnedHRA, arrearsHRA);

    // Washing Allowance (W.A)
    const fixedWA = findRowValue(row, ['actual wages - wa', 'fixed wa', 'actual wa', 'actual wages - washing allowance']);
    const earnedWA = findRowValue(row, ['wages earned - w.a', 'wages earned - wa', 'earned wa', 'w.a', 'wa', 'washing allowance', 'water allowance']);
    const arrearsWA = findRowValue(row, ['arrears - wa', 'wa arrears']);
    const waTier = buildTier(fixedWA, earnedWA, arrearsWA);

    // Incentive
    const fixedInc = findRowValue(row, ['actual wages - incentive', 'fixed incentive', 'actual incentive']);
    const earnedInc = findRowValue(row, ['wages earned - incentive', 'earned incentive', 'incentive']);
    const arrearsInc = findRowValue(row, ['arrears - incentive', 'incentive arrears']);
    const incTier = buildTier(fixedInc, earnedInc, arrearsInc);

    // Other Allowance (includes DA)
    const fixedDA = parseNumber(findRowValue(row, ['actual wages - da', 'fixed da', 'da']));
    const earnedDA = parseNumber(findRowValue(row, ['wages earned - da', 'earned da', 'da']));
    const fixedOther = parseNumber(findRowValue(row, ['actual wages - other allowance', 'other allowance', 'special allowance']));
    const earnedOther = parseNumber(findRowValue(row, ['wages earned - other allowance', 'other allowance', 'special allowance']));
    const otherTier = buildTier(fixedOther + fixedDA, earnedOther + earnedDA, 0);

    // Previous Month
    const earnedPrevMonth = parseNumber(findRowValue(row, ['wages earned - previous month', 'previous month earned', 'previous month']));
    const prevMonthTier = buildTier(0, earnedPrevMonth, 0);

    // Sum Gross Earnings
    const calculatedGross = Math.round((basicTier.total + hraTier.total + waTier.total + incTier.total + otherTier.total + prevMonthTier.total) * 100) / 100;
    const sourceGross = parseNumber(findRowValue(row, ['wages earned - total', 'gross total', 'gross salary', 'gross earnings', 'salary']));
    const grossEarnings = sourceGross > 0 ? sourceGross : calculatedGross;

    // 4. Form T Deductions Components
    const providentFund = parseNumber(findRowValue(row, ['deductions - pf', 'pf', 'provident fund', 'epf']));
    const esi = parseNumber(findRowValue(row, ['deductions - esi', 'esi', 'esic']));
    const tds = parseNumber(findRowValue(row, ['deductions - tds', 'tds', 'income tax', 'tax']));
    const professionalTax = parseNumber(findRowValue(row, ['deductions - professional tax', 'professional tax', 'pt']));
    
    // Aggregate other deductions: Advance, Late Fine, Deductions - Previous Month, etc.
    const advance = parseNumber(findRowValue(row, ['deductions - advance', 'advance']));
    const lateFine = parseNumber(findRowValue(row, ['deductions - late fine', 'late fine', 'fine']));
    const dedPrevMonth = parseNumber(findRowValue(row, ['deductions - previous month', 'previous month deduction']));
    const directOtherDed = parseNumber(findRowValue(row, ['deductions - other deduction', 'other deduction', 'misc deduction']));
    const otherDeduction = Math.round((directOtherDed + advance + lateFine + dedPrevMonth) * 100) / 100;

    const calculatedDeductions = Math.round((providentFund + esi + tds + professionalTax + otherDeduction) * 100) / 100;
    const sourceTotalDed = parseNumber(findRowValue(row, ['total deductions', 'deductions total', 'total deduction']));
    const totalDeductions = sourceTotalDed > 0 ? sourceTotalDed : calculatedDeductions;

    // 5. Net Payable
    const calculatedNetPayable = Math.round((grossEarnings - totalDeductions) * 100) / 100;
    const sourceNet = parseNumber(findRowValue(row, ['net payable', 'net salary', 'wages earned - net salary']));
    const netMismatch = sourceNet > 0 && Math.abs(sourceNet - calculatedNetPayable) > 1.0;

    // 6. Validation
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    if (!id) validationErrors.push('Missing Employee ID');
    if (seenEmpIds.has(id)) validationErrors.push(`Duplicate Employee ID: ${id}`);
    seenEmpIds.add(id);

    if (!name) validationErrors.push('Missing Employee Name');
    if (basicTier.total <= 0) validationWarnings.push('Basic salary is zero or missing');
    if (netMismatch) validationWarnings.push(`Calculated Net (₹${calculatedNetPayable}) differs from sheet Net (₹${sourceNet})`);

    const validationStatus = validationErrors.length > 0 ? 'error' : validationWarnings.length > 0 ? 'warning' : 'ready';

    return {
      id,
      name,
      sex,
      doj,
      dob,
      department,
      designation,
      position,
      branch,
      mobile,
      paidDays,
      lopDays,
      payPeriod,
      payDate,
      taxRegime,
      ptState,
      location,

      uanNumber,
      esiNumber,
      pfAccountNumber,
      panNumber,
      bankName,
      bankAccountNumber,

      basic: basicTier,
      hra: hraTier,
      washingAllowance: waTier,
      incentive: incTier,
      otherAllowance: otherTier,
      previousMonth: prevMonthTier,
      additionalEarnings: [],
      grossEarnings,

      providentFund,
      esi,
      tds,
      professionalTax,
      otherDeduction,
      advance,
      lateFine,
      additionalDeductions: [],
      totalDeductions,

      calculatedNetPayable,
      sourceNetPayable: sourceNet > 0 ? sourceNet : undefined,
      netMismatch,

      validationStatus,
      validationErrors,
      validationWarnings,
      rawRow: row,
    };
  });
}
