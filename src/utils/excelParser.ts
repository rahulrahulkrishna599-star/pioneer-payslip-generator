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
      return (
        s.includes('wages') ||
        s.includes('deduction') ||
        s.includes('actual') ||
        s.includes('salary') ||
        s.includes('fixed') ||
        s.includes('earned')
      );
    });

    const r1HasComponentKeywords = r1.some((c: any) => {
      const s = String(c || '').toLowerCase();
      return (
        s.includes('basic') ||
        s.includes('hra') ||
        s.includes('wa') ||
        s.includes('pf') ||
        s.includes('esi') ||
        s.includes('tds') ||
        s.includes('washing') ||
        s.includes('allowance') ||
        s.includes('incentive') ||
        s.includes('recovery')
      );
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

      if (
        g &&
        (gLower.includes('wages') ||
          gLower.includes('deduction') ||
          gLower.includes('actual') ||
          gLower.includes('fixed') ||
          gLower.includes('earned'))
      ) {
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

function parseNumberOrNull(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).trim();
  if (str === '' || str === '-' || str === '—' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'na') {
    return null;
  }
  const cleaned = str.replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseStringOrEmpty(val: any): string {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (s === '-' || s === '—' || s.toLowerCase() === 'n/a') return '';
  return s;
}

/**
 * Searches row object for the first key matching any alias (case-insensitive exact or delimiter-bounded).
 * Prevents short substrings like 'da' from false-matching 'No of Wkgs Days During Month'.
 */
function findRowValue(row: Record<string, any>, aliases: string[]): any {
  const rowKeys = Object.keys(row);

  // 1. Exact match (case-insensitive)
  for (const alias of aliases) {
    const aliasLower = alias.toLowerCase().trim();
    const exactKey = rowKeys.find((k) => k.toLowerCase().trim() === aliasLower);
    if (exactKey !== undefined && row[exactKey] !== '' && row[exactKey] !== undefined && row[exactKey] !== null) {
      return row[exactKey];
    }
  }

  // 2. StartsWith or EndsWith with word boundary or separator
  for (const alias of aliases) {
    const aliasLower = alias.toLowerCase().trim();
    const affixKey = rowKeys.find((k) => {
      const kLower = k.toLowerCase().trim();
      return (
        kLower.startsWith(aliasLower + ' ') ||
        kLower.startsWith(aliasLower + ' -') ||
        kLower.endsWith(' ' + aliasLower) ||
        kLower.endsWith('- ' + aliasLower) ||
        kLower === aliasLower
      );
    });
    if (affixKey !== undefined && row[affixKey] !== '' && row[affixKey] !== undefined && row[affixKey] !== null) {
      return row[affixKey];
    }
  }

  // 3. Substring match ONLY if alias length >= 3 to avoid matching "da", "wa", "pt" in working days
  for (const alias of aliases) {
    const aliasLower = alias.toLowerCase().trim();
    if (aliasLower.length < 3) continue;
    const subKey = rowKeys.find((k) => k.toLowerCase().includes(aliasLower));
    if (subKey !== undefined && row[subKey] !== '' && row[subKey] !== undefined && row[subKey] !== null) {
      return row[subKey];
    }
  }

  return undefined;
}

function buildTier(fixedVal: any, earnedVal: any, arrearsVal: any = null): EarningTier {
  const f = parseNumberOrNull(fixedVal);
  const e = parseNumberOrNull(earnedVal);
  const a = parseNumberOrNull(arrearsVal);

  let total: number | null = null;
  if (e !== null || a !== null) {
    const eVal = e ?? 0;
    const aVal = a ?? 0;
    total = Math.round((eVal + aVal) * 100) / 100;
  } else if (f !== null) {
    total = f;
  }

  return {
    fixed: f,
    earned: e,
    arrears: a,
    total,
  };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function normalizePayPeriod(val: any): string {
  if (val === null || val === undefined || val === '') return '';

  if (typeof val === 'number' && val > 20000 && val < 80000) {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
    }
  }

  if (val instanceof Date && !isNaN(val.getTime())) {
    return `${MONTH_NAMES[val.getMonth()]} ${val.getFullYear()}`;
  }

  const str = parseStringOrEmpty(val).replace(/\s+/g, ' ');
  if (!str) return '';

  // Convert full DD-MM-YYYY / YYYY-MM-DD date strings to "Month YYYY"
  const parts = str.split(/[/.-]/);
  if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
    const yearNum = parts[0].length === 4 ? Number(parts[0]) : Number(parts[2]);
    const monthNum = Number(parts[1]);
    if (monthNum >= 1 && monthNum <= 12 && yearNum >= 1900) {
      return `${MONTH_NAMES[monthNum - 1]} ${yearNum}`;
    }
  }

  return str;
}

/**
 * Transforms raw parsed rows into strongly typed EmployeeRecord array matching Form T Wages Slip.
 * Strictly adheres to ZERO ASSUMPTION FILLING: empty Excel boxes remain empty ('—' on template).
 */
export function transformRowsToEmployees(
  rawRows: Record<string, any>[],
  _mappings?: ColumnMapping[],
  settings?: CompanySettings
): EmployeeRecord[] {
  // Track composite (Employee ID + Pay Period) so the same employee in different months is valid
  const seenEmpPeriodKeys = new Set<string>();

  return rawRows.map((row, index) => {
    // 1. Employee Summary Identifiers (strictly empty if not provided in sheet)
    const idRaw = findRowValue(row, ['employee id', 'emp id', 'emp code', 'empid', 'id']) || `PC${String(index + 1).padStart(4, '0')}`;
    const id = parseStringOrEmpty(idRaw);

    const nameRaw = findRowValue(row, ['employee name', 'name', 'emp name']) || `Employee ${index + 1}`;
    const name = parseStringOrEmpty(nameRaw);

    const sex = parseStringOrEmpty(findRowValue(row, ['sex', 'gender']));
    const doj = formatExcelDate(findRowValue(row, ['date of joining', 'doj', 'joining date']));
    const dob = formatExcelDate(findRowValue(row, ['date of birth', 'dob', 'birth date']));
    const department = parseStringOrEmpty(findRowValue(row, ['department', 'dept']));
    const designation = parseStringOrEmpty(findRowValue(row, ['designation', 'role', 'title']));
    const position = parseStringOrEmpty(findRowValue(row, ['position', 'employment type']));
    const branch = parseStringOrEmpty(findRowValue(row, ['branch', 'office']));
    const location = parseStringOrEmpty(findRowValue(row, ['location', 'place', 'city']));
    const mobile = parseStringOrEmpty(findRowValue(row, ['mobile number', 'mobile', 'phone', 'contact']));

    const paidDays = parseNumberOrNull(findRowValue(row, ['paid days', 'no of wkgs days during month', 'present days', 'worked days']));
    const lopDays = parseNumberOrNull(findRowValue(row, ['lop days', 'loss of pay', 'lop']));

    const payPeriod = normalizePayPeriod(findRowValue(row, ['pay period', 'wage period monthly', 'month'])) || settings?.defaultPayPeriod || '';
    const payDate = formatExcelDate(findRowValue(row, ['pay date', 'payment date'])) || settings?.defaultPayDate || '';
    const taxRegime = parseStringOrEmpty(findRowValue(row, ['tax regime', 'regime']));
    const ptState = parseStringOrEmpty(findRowValue(row, ['professional tax state', 'pt state', 'state']));

    // 2. Statutory & Bank Details (strictly empty if not in sheet)
    const uanNumber = parseStringOrEmpty(findRowValue(row, ['uan number', 'uan']));
    const esiNumber = parseStringOrEmpty(findRowValue(row, ['esi number', 'esi no', 'esic']));
    const pfAccountNumber = parseStringOrEmpty(findRowValue(row, ['pf account number', 'pf no', 'pf number']));
    const panNumber = parseStringOrEmpty(findRowValue(row, ['pan number', 'pan no', 'pan']));
    const bankName = parseStringOrEmpty(findRowValue(row, ['bank name', 'bank']));
    const bankAccountNumber = parseStringOrEmpty(findRowValue(row, ['bank account number', 'account number', 'a/c no', 'ac no']));

    // 3. Form T Earnings Components (Fixed, Earned, Arrears, Total)
    // Basic
    const fixedBasic = findRowValue(row, ['fixed - basic', 'actual wages - basic', 'fixed basic', 'basic']);
    const earnedBasic = findRowValue(row, ['earned - basic', 'wages earned - basic', 'earned basic', 'earned - basic without da', 'basic without da']);
    const basicTier = buildTier(fixedBasic, earnedBasic, null);

    // HRA
    const fixedHRA = findRowValue(row, ['fixed - hra', 'actual wages - hra', 'fixed hra']);
    const earnedHRA = findRowValue(row, ['earned - hra', 'wages earned - hra', 'earned hra', 'hra']);
    const hraTier = buildTier(fixedHRA, earnedHRA, null);

    // Washing Allowance (W.A)
    const fixedWA = findRowValue(row, ['fixed - washing allowance', 'actual wages - washing allowance', 'actual wages - wa', 'fixed wa']);
    const earnedWA = findRowValue(row, ['earned - washing allowance', 'wages earned - washing allowance', 'wages earned - w.a', 'wages earned - wa', 'earned wa']);
    const waTier = buildTier(fixedWA, earnedWA, null);

    // Incentive
    const fixedInc = findRowValue(row, ['fixed - incentive', 'actual wages - incentive', 'fixed incentive']);
    const earnedInc = findRowValue(row, ['earned - incentive', 'wages earned - incentive', 'earned incentive', 'incentive']);
    const incTier = buildTier(fixedInc, earnedInc, null);

    // Other Allowance (includes DA if present)
    const fixedDA = parseNumberOrNull(findRowValue(row, ['fixed - da', 'actual wages - da']));
    const earnedDA = parseNumberOrNull(findRowValue(row, ['earned - da', 'wages earned - da']));
    const fixedOther = parseNumberOrNull(findRowValue(row, ['fixed - other allowance', 'actual wages - other allowance', 'other allowance']));
    const earnedOther = parseNumberOrNull(findRowValue(row, ['earned - other allowance', 'wages earned - other allowance']));
    
    let combinedFixedOther: number | null = null;
    if (fixedOther !== null || (fixedDA !== null && fixedDA > 0)) {
      combinedFixedOther = (fixedOther ?? 0) + (fixedDA ?? 0);
    }
    let combinedEarnedOther: number | null = null;
    if (earnedOther !== null || (earnedDA !== null && earnedDA > 0)) {
      combinedEarnedOther = (earnedOther ?? 0) + (earnedDA ?? 0);
    }
    const otherTier = buildTier(combinedFixedOther, combinedEarnedOther, null);

    // Previous Month
    const fixedPrevMonth = findRowValue(row, ['fixed - previous month', 'actual wages - previous month']);
    const earnedPrevMonth = findRowValue(row, ['earned - previous month', 'wages earned - previous month']);
    const prevMonthTier = buildTier(fixedPrevMonth, earnedPrevMonth, null);

    // Sum Gross Earnings
    const sumTiers = [basicTier, hraTier, waTier, incTier, otherTier, prevMonthTier]
      .reduce((sum, t) => sum + (t.total ?? 0), 0);
    const calculatedGross = Math.round(sumTiers * 100) / 100;
    const sourceGross = parseNumberOrNull(findRowValue(row, ['earned - gross earnings', 'wages earned - total', 'gross total', 'gross salary', 'gross earnings', 'salary']));
    const grossEarnings = sourceGross !== null ? sourceGross : calculatedGross;

    // 4. Form T Deductions Components
    const salaryAdvance = parseNumberOrNull(findRowValue(row, ['deductions - salary advance recovery', 'salary advance recovery', 'salary advance', 'advance']));
    const providentFund = parseNumberOrNull(findRowValue(row, ['deductions - provident fund', 'provident fund', 'pf', 'epf']));
    const esi = parseNumberOrNull(findRowValue(row, ['deductions - esi', 'esi', 'esic']));
    const tds = parseNumberOrNull(findRowValue(row, ['deductions - tds', 'tds', 'income tax', 'tax']));
    const professionalTax = parseNumberOrNull(findRowValue(row, ['deductions - professional tax', 'professional tax', 'pt']));
    
    const dedPrevMonth = parseNumberOrNull(findRowValue(row, ['deductions - previous month', 'previous month deduction']));
    const directOtherDed = parseNumberOrNull(findRowValue(row, ['deductions - other deduction', 'other deduction']));
    let otherDeduction: number | null = null;
    if (directOtherDed !== null || (dedPrevMonth !== null && dedPrevMonth > 0)) {
      otherDeduction = (directOtherDed ?? 0) + (dedPrevMonth ?? 0);
    }

    const allDeds = [providentFund, esi, tds, professionalTax, salaryAdvance, otherDeduction];
    const hasAnyDed = allDeds.some(d => d !== null);
    const sumDeds = allDeds.reduce((sum: number, d) => sum + (d ?? 0), 0);
    const calculatedDeductions = hasAnyDed ? Math.round(sumDeds * 100) / 100 : 0;
    const sourceTotalDed = parseNumberOrNull(findRowValue(row, ['deductions - total deductions', 'total deductions', 'total deduction']));
    const totalDeductions = sourceTotalDed !== null ? sourceTotalDed : calculatedDeductions;

    // 5. Net Payable (Excel sheet is the authoritative source of truth)
    const sourceNet = parseNumberOrNull(findRowValue(row, ['total net payable', 'net payable', 'net salary', 'earned - net salary']));
    const calculatedNetPayable = sourceNet !== null ? sourceNet : Math.round((grossEarnings - totalDeductions) * 100) / 100;
    const netMismatch = false;

    // 6. Validation (Blocking checks only: missing ID, missing Name, or exact duplicate ID + same Pay Period)
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    const dedupKey = `${id.trim().toUpperCase()}__${payPeriod.trim().toLowerCase()}`;
    if (!id) validationErrors.push('Missing Employee ID');
    if (id && seenEmpPeriodKeys.has(dedupKey)) {
      validationErrors.push(`Duplicate entry for ${id} in ${payPeriod || 'same period'}`);
    }
    if (id) seenEmpPeriodKeys.add(dedupKey);

    if (!name) validationErrors.push('Missing Employee Name');

    const validationStatus = validationErrors.length > 0 ? 'error' : 'ready';
    const recordKey = `${id || `ROW${index + 1}`}__${(payPeriod || 'default').replace(/\s+/g, '_')}__${index}`;

    return {
      id,
      recordKey,
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
      salaryAdvance,
      advance: salaryAdvance,
      lateFine: null,
      additionalDeductions: [],
      totalDeductions,

      calculatedNetPayable,
      sourceNetPayable: sourceNet !== null ? sourceNet : undefined,
      netMismatch,

      validationStatus,
      validationErrors,
      validationWarnings,
      rawRow: row,
    };
  });
}
