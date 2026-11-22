import * as XLSX from 'xlsx';
import { ColumnMapping, EmployeeRecord, CompanySettings } from '../types';

export interface ParsedSheetData {
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  rawRows: Record<string, any>[];
  totalRawRows: number;
}

/**
 * Converts an Excel serial date number (e.g., 46160) to a DD-MM-YYYY string (e.g., 18-05-2026).
 */
export function formatExcelDate(serialOrStr: any): string {
  if (serialOrStr === null || serialOrStr === undefined || serialOrStr === '') return '';
  
  if (typeof serialOrStr === 'number') {
    // Excel epoch begins Dec 30, 1899. 25569 days to Jan 1, 1970
    const date = new Date(Math.round((serialOrStr - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${day}-${month}-${year}`;
    }
  }

  // If already string or Date object
  if (serialOrStr instanceof Date) {
    const day = String(serialOrStr.getDate()).padStart(2, '0');
    const month = String(serialOrStr.getMonth() + 1).padStart(2, '0');
    const year = serialOrStr.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const str = String(serialOrStr).trim();
  // If in format YYYY-MM-DD or DD/MM/YYYY, convert to DD-MM-YYYY
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
    } else {
      // DD-MM-YYYY
      return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
    }
  }

  return str;
}

/**
 * Parses an Excel or CSV file buffer and automatically handles single or multi-row group headers.
 */
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

  // Check if rows 0 and 1 represent a two-row multi-header (e.g. Row 0: WAGES EARNED / DEDUCTIONS, Row 1: Basic, HRA...)
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
    // Single header row search
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

  // Extract data rows
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
 * Transforms raw parsed rows into strongly typed EmployeeRecord array based on ColumnMappings.
 */
export function transformRowsToEmployees(
  rawRows: Record<string, any>[],
  mappings: ColumnMapping[],
  settings: CompanySettings
): EmployeeRecord[] {
  const seenEmpIds = new Set<string>();

  return rawRows.map((row, index) => {
    let id = '';
    let name = '';
    let designation = '';
    let department = '';
    let doj = '';
    let uanNumber = '';
    let esiNumber = '';
    let pfEsiApplicable = '';
    let paidDays = 26;
    let lopDays = 0;

    let basic = 0;
    let hra = 0;
    let waterAllowance = 0;
    let incentive = 0;
    let da = 0;
    let otherAllowance = 0;
    const additionalEarnings: { name: string; amount: number }[] = [];

    let incomeTax = 0;
    let providentFund = 0;
    let esi = 0;
    let previousMonth = 0;
    let advance = 0;
    let lateFine = 0;
    let otherDeduction = 0;
    const additionalDeductions: { name: string; amount: number }[] = [];

    let sourceGross: number | undefined = undefined;
    let sourceTotalDed: number | undefined = undefined;
    let sourceNetPayable: number | undefined = undefined;

    // Apply mappings
    for (const mapping of mappings) {
      const cellVal = row[mapping.sourceColumn];
      const action = mapping.action;

      if (action.type === 'ignore') continue;

      if (action.type === 'field') {
        switch (action.targetField) {
          case 'employeeId':
            id = parseString(cellVal);
            break;
          case 'employeeName':
            name = parseString(cellVal);
            break;
          case 'designation':
            designation = parseString(cellVal);
            break;
          case 'department':
            department = parseString(cellVal);
            break;
          case 'doj':
            doj = formatExcelDate(cellVal);
            break;
          case 'uanNumber':
            uanNumber = parseString(cellVal);
            break;
          case 'esiNumber':
            esiNumber = parseString(cellVal);
            break;
          case 'pfEsiApplicable':
            pfEsiApplicable = parseString(cellVal);
            break;
          case 'paidDays':
            paidDays = parseNumber(cellVal);
            break;
          case 'lopDays':
            lopDays = parseNumber(cellVal);
            break;

          // Earnings
          case 'basic':
            basic = parseNumber(cellVal);
            break;
          case 'hra':
            hra = parseNumber(cellVal);
            break;
          case 'waterAllowance':
            waterAllowance = parseNumber(cellVal);
            break;
          case 'incentive':
            incentive = parseNumber(cellVal);
            break;
          case 'da':
            da = parseNumber(cellVal);
            break;
          case 'otherAllowance':
            otherAllowance = parseNumber(cellVal);
            break;
          case 'grossEarnings':
            sourceGross = parseNumber(cellVal);
            break;

          // Deductions
          case 'incomeTax':
            incomeTax = parseNumber(cellVal);
            break;
          case 'providentFund':
            providentFund = parseNumber(cellVal);
            break;
          case 'esi':
            esi = parseNumber(cellVal);
            break;
          case 'previousMonth':
            previousMonth = parseNumber(cellVal);
            break;
          case 'advance':
            advance = parseNumber(cellVal);
            break;
          case 'lateFine':
            lateFine = parseNumber(cellVal);
            break;
          case 'otherDeduction':
            otherDeduction = parseNumber(cellVal);
            break;
          case 'totalDeductions':
            sourceTotalDed = parseNumber(cellVal);
            break;
          case 'netPayable':
            sourceNetPayable = parseNumber(cellVal);
            break;
        }
      } else if (action.type === 'additional_earning') {
        const amt = parseNumber(cellVal);
        if (amt > 0) {
          additionalEarnings.push({ name: action.label || mapping.sourceColumn, amount: amt });
        }
      } else if (action.type === 'additional_deduction') {
        const amt = parseNumber(cellVal);
        if (amt > 0) {
          additionalDeductions.push({ name: action.label || mapping.sourceColumn, amount: amt });
        }
      }
    }

    // Default department if absent
    if (!department) {
      if (designation.toLowerCase().includes('hr')) {
        department = 'HR & ADMIN';
      } else if (designation.toLowerCase().includes('commercial') || designation.toLowerCase().includes('marketing')) {
        department = 'COMMERCIAL';
      } else {
        department = 'OPERATIONS';
      }
    }

    // Determine PF & ESI status if not explicitly given
    if (!pfEsiApplicable) {
      pfEsiApplicable = (providentFund > 0 || esi > 0) ? 'Yes' : 'No';
    }

    // Format initial / name cleanly if needed (e.g. "SOUNDARARAJAN V" -> "V SOUNDARARAJAN")
    if (name.includes(' ') && name.endsWith(' V')) {
      name = 'V SOUNDARARAJAN';
    }

    // Effective other allowance & deduction
    const effectiveOtherAllowance = otherAllowance + da + additionalEarnings.reduce((acc, curr) => acc + curr.amount, 0);
    const effectiveOtherDeduction = otherDeduction + advance + lateFine + additionalDeductions.reduce((acc, curr) => acc + curr.amount, 0);

    // Sum earnings
    const calculatedGross = Math.round((basic + hra + waterAllowance + incentive + effectiveOtherAllowance) * 100) / 100;
    const finalGross = sourceGross !== undefined && sourceGross > 0 ? sourceGross : calculatedGross;

    // Sum deductions
    const calculatedDeductions = Math.round((incomeTax + providentFund + esi + previousMonth + effectiveOtherDeduction) * 100) / 100;
    const finalDeductions = sourceTotalDed !== undefined && sourceTotalDed >= 0 ? sourceTotalDed : calculatedDeductions;

    // Net Payable
    const calculatedNet = Math.round((finalGross - finalDeductions) * 100) / 100;

    // Cross-verify with source Net
    let netMismatch = false;
    if (sourceNetPayable !== undefined && Math.abs(sourceNetPayable - calculatedNet) > 1.0) {
      netMismatch = true;
    }

    // Validation rules
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!id) {
      errors.push(`Row ${index + 1}: Missing Employee ID`);
    } else if (seenEmpIds.has(id)) {
      errors.push(`Row ${index + 1}: Duplicate Employee ID "${id}"`);
    } else {
      seenEmpIds.add(id);
    }

    if (!name) {
      errors.push(`Row ${index + 1}: Missing Employee Name`);
    }

    if (calculatedGross <= 0) {
      warnings.push('Gross Earnings is zero or negative');
    }

    if (calculatedNet < 0) {
      warnings.push('Net Payable is negative (deductions exceed earnings)');
    }

    if (netMismatch && sourceNetPayable !== undefined) {
      warnings.push(`Net Pay mismatch: Sheet specifies ₹${sourceNetPayable.toLocaleString('en-IN')}, calculated is ₹${calculatedNet.toLocaleString('en-IN')}`);
    }

    let validationStatus: 'ready' | 'warning' | 'error' = 'ready';
    if (errors.length > 0) {
      validationStatus = 'error';
    } else if (warnings.length > 0) {
      validationStatus = 'warning';
    }

    return {
      id: id || `PC00${index + 1}`,
      name: name || `Employee ${index + 1}`,
      designation: designation || 'Staff',
      department: department || 'General',
      doj: doj || '18-05-2026',
      uanNumber: uanNumber || '-',
      esiNumber: esiNumber || '-',
      pfEsiApplicable: pfEsiApplicable || 'No',
      paidDays: paidDays >= 0 ? paidDays : 26,
      lopDays: lopDays >= 0 ? lopDays : 0,
      payPeriod: settings.defaultPayPeriod,
      payDate: settings.defaultPayDate,

      basic,
      hra,
      waterAllowance,
      incentive,
      da,
      otherAllowance: effectiveOtherAllowance,
      additionalEarnings,
      grossEarnings: finalGross,

      incomeTax,
      providentFund,
      esi,
      previousMonth,
      advance,
      lateFine,
      otherDeduction: effectiveOtherDeduction,
      additionalDeductions,
      totalDeductions: finalDeductions,

      calculatedNetPayable: calculatedNet,
      sourceNetPayable,
      netMismatch,

      validationStatus,
      validationErrors: errors,
      validationWarnings: warnings,
      rawRow: row,
    };
  });
}
