import { jsPDF } from 'jspdf';
import { CompanySettings, EmployeeRecord, PayslipTemplate } from '../types';
import { numberToIndianWords, formatIndianCurrency } from './numberToWords';
import { drawPioneerSealOnPdf } from './pioneerLogo';
import { formatFullAddress } from './templateStorage';
import { PIONEER_DEFAULT_LOGO_URL } from './pioneerAssets';

export function getPayslipPdfFilename(emp: EmployeeRecord, template?: PayslipTemplate): string {
  const safeId = emp.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = emp.name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').toUpperCase();
  const period = emp.payPeriod || template?.payPeriod || 'October_2026';
  const safePeriod = period.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
  return `Payslip_${safeId}_${safeName}_${safePeriod}.pdf`;
}

interface RupeeGlyphCache {
  dataUrl: string;
  aspectRatio: number;
}

const rupeeGlyphCache = new Map<string, RupeeGlyphCache>();

function getRupeeGlyph(isBold: boolean, color: [number, number, number]): RupeeGlyphCache {
  const key = `${isBold ? 'b' : 'n'}_${color.join('_')}`;
  if (rupeeGlyphCache.has(key)) {
    return rupeeGlyphCache.get(key)!;
  }

  if (typeof document === 'undefined') {
    return { dataUrl: '', aspectRatio: 0.72 };
  }

  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = 240;
  rawCanvas.height = 280;
  const rawCtx = rawCanvas.getContext('2d');
  if (!rawCtx) {
    return { dataUrl: '', aspectRatio: 0.72 };
  }

  rawCtx.clearRect(0, 0, 240, 280);
  rawCtx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  rawCtx.font = `${isBold ? 'bold' : 'normal'} 180px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`;
  rawCtx.textBaseline = 'alphabetic';
  rawCtx.textAlign = 'left';

  rawCtx.fillText('₹', 20, 210);

  const imgData = rawCtx.getImageData(0, 0, 240, 280);
  const data = imgData.data;
  let minX = 240, maxX = 0, minY = 280, maxY = 0;
  for (let y = 0; y < 280; y++) {
    for (let x = 0; x < 240; x++) {
      const alpha = data[(y * 240 + x) * 4 + 3];
      if (alpha > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    const fallback: RupeeGlyphCache = {
      dataUrl: rawCanvas.toDataURL('image/png'),
      aspectRatio: 0.72,
    };
    rupeeGlyphCache.set(key, fallback);
    return fallback;
  }

  const pad = 2;
  const cropW = (maxX - minX + 1) + pad * 2;
  const cropH = (maxY - minY + 1) + pad * 2;
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const cropCtx = cropCanvas.getContext('2d');

  if (cropCtx) {
    cropCtx.drawImage(
      rawCanvas,
      minX - pad,
      minY - pad,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH
    );
  }

  const cached: RupeeGlyphCache = {
    dataUrl: cropCanvas.toDataURL('image/png'),
    aspectRatio: cropW / cropH,
  };
  rupeeGlyphCache.set(key, cached);
  return cached;
}

function drawRupeeSymbol(
  doc: any,
  x: number,
  baselineY: number,
  fontSizePt: number,
  isBold: boolean = false,
  color: [number, number, number] = [15, 23, 42]
): number {
  const glyph = getRupeeGlyph(isBold, color);
  const capHeightMm = fontSizePt * 0.352778 * 0.70;
  const glyphH = capHeightMm * 1.05;
  const glyphW = glyphH * (glyph.aspectRatio || 0.72);
  const topY = baselineY - capHeightMm * 0.96;

  if (glyph.dataUrl) {
    try {
      doc.addImage(glyph.dataUrl, 'PNG', x, topY, glyphW, glyphH);
      return glyphW;
    } catch {
      // Fallback
    }
  }
  doc.setFont('helvetica', isBold ? 'bold' : 'normal');
  doc.text('Rs.', x, baselineY);
  return 4.2;
}

/**
 * Loads an image URL into a base64 PNG data URL so jsPDF can embed it reliably.
 */
async function loadImageDataUrl(url: string): Promise<string | null> {
  if (url.startsWith('data:image')) {
    return url;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Draws single-line fitted text that gracefully downscales or truncates with ellipsis.
 * GUARANTEES zero line wrapping, eliminating vertical collisions between rows.
 */
function drawFittedText(
  doc: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  baseFontSize: number = 7,
  minFontSize: number = 5.5
): void {
  let size = baseFontSize;
  doc.setFontSize(size);
  while (doc.getTextWidth(text) > maxWidth && size > minFontSize) {
    size -= 0.25;
    doc.setFontSize(size);
  }
  let str = text;
  if (doc.getTextWidth(str) > maxWidth) {
    while (str.length > 0 && doc.getTextWidth(str + '...') > maxWidth) {
      str = str.slice(0, -1);
    }
    str = str + '...';
  }
  doc.text(str, x, y);
  doc.setFontSize(baseFontSize);
}

/**
 * Generates the official Form T - Wages Slip vector PDF.
 */
export async function generatePayslipPdf(
  emp: EmployeeRecord,
  settings: CompanySettings,
  template?: PayslipTemplate
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 12;
  const contentWidth = 186;
  const rightMargin = margin + contentWidth; // 198mm

  const companyName = template?.companyName || settings.companyName || 'PIONEER CORPORATION';
  const companyAddress = formatFullAddress(
    template?.companyAddress || settings.companyAddress,
    template?.cityPincode || 'Coimbatore - 641043',
    template?.country || 'India'
  );
  const payPeriod = emp.payPeriod || template?.payPeriod || 'October 2026';
  const payDate = emp.payDate || template?.payDate || '01/11/2026';
  const logoUrl = template?.logoUrl || settings.logoUrl || PIONEER_DEFAULT_LOGO_URL;

  // 1. TOP HEADER: LOGO & COMPANY INFO
  let logoData = await loadImageDataUrl(logoUrl);
  if (!logoData) {
    logoData = await loadImageDataUrl(PIONEER_DEFAULT_LOGO_URL);
  }
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', margin, 11, 24, 14);
    } catch {
      // Fallback
    }
  }

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(companyName.toUpperCase(), margin + 27, 16);

  // Company Address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(companyAddress, margin + 27, 21);

  // Top Right: Payslip For
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PAYSLIP FOR', rightMargin, 15, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(payPeriod, rightMargin, 20.5, { align: 'right' });

  // Underline for month
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(rightMargin - 35, 22, rightMargin, 22);

  // Top Dark Divider
  doc.setDrawColor(30, 41, 59); // slate-800
  doc.setLineWidth(0.4);
  doc.line(margin, 26, rightMargin, 26);

  // 2. FORM T STATUTORY TITLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('FORM T - WAGES SLIP', margin, 31);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('(See Sub-Rule (6) of Rule 1 of the Tamil Nadu Shops and Establishments Rules, 1948)', margin, 34.5);

  // 3. EMPLOYEE SUMMARY CONTAINER
  const summaryBoxY = 37;
  const summaryBoxH = 56; // 37mm to 93mm - clean enclosure with ample clearance

  // Box border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(margin, summaryBoxY, contentWidth, summaryBoxH);

  // Header Banner with left orange accent bar
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, summaryBoxY, contentWidth, 5.5, 'F');
  doc.setFillColor(217, 119, 6); // amber-600
  doc.rect(margin, summaryBoxY, 1.2, 5.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('EMPLOYEE SUMMARY', margin + 3.5, summaryBoxY + 4);

  // 2-Column Summary Content
  // Col 1: Label at margin + 3 (15mm), Value at margin + 31 (43mm). Available width = 59mm
  // Col 2: Label at margin + 96 (108mm), Value at margin + 130 (142mm). Available width = 55mm
  const col1LabelX = margin + 3;
  const col1ValX = margin + 31;
  const col1MaxValW = 59;

  const col2LabelX = margin + 96;
  const col2ValX = margin + 130;
  const col2MaxValW = 55;

  const leftSummaryRows = [
    { label: 'Employee Name', val: emp.name || '-' },
    { label: 'Employee ID', val: emp.id || '-' },
    { label: 'Date of Joining', val: emp.doj || '-' },
    { label: 'Date of Birth', val: emp.dob || '-' },
    { label: 'Department', val: emp.department || '-' },
    { label: 'Designation', val: emp.designation || '-' },
    { label: 'Position', val: emp.position || '-' },
    { label: 'Branch', val: emp.branch || '-' },
  ];

  const rightSummaryRows = [
    { label: 'Mobile Number', val: emp.mobile || '-' },
    { label: 'Paid Days', val: emp.paidDays !== null && emp.paidDays !== undefined ? String(emp.paidDays) : '-' },
    { label: 'LOP Days', val: emp.lopDays !== null && emp.lopDays !== undefined ? String(emp.lopDays) : '-' },
    { label: 'Pay Date', val: payDate || '-' },
    { label: 'Pay Period', val: payPeriod || '-' },
    { label: 'Tax Regime', val: emp.taxRegime || '-' },
    { label: 'Professional Tax State', val: emp.ptState || '-' },
    { label: 'Location', val: emp.location || '-' },
  ];

  let rowY = summaryBoxY + 8.8;
  for (let i = 0; i < leftSummaryRows.length; i++) {
    // Left item
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(leftSummaryRows[i].label, col1LabelX, rowY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    drawFittedText(doc, leftSummaryRows[i].val, col1ValX, rowY, col1MaxValW, 7, 5.5);

    // Right item
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(rightSummaryRows[i].label, col2LabelX, rowY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    drawFittedText(doc, rightSummaryRows[i].val, col2ValX, rowY, col2MaxValW, 7, 5.5);

    rowY += 3.8;
  }

  // Divider inside summary box for Statutory details
  const statDividerY = summaryBoxY + 39.5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(margin, statDividerY, rightMargin, statDividerY);

  // Statutory Details
  const leftStatRows = [
    { label: 'UAN Number', val: emp.uanNumber || '-' },
    { label: 'ESI Number', val: emp.esiNumber || '-' },
    { label: 'PF Account Number', val: emp.pfAccountNumber || '-' },
  ];

  const rightStatRows = [
    { label: 'PAN Number', val: emp.panNumber || '-' },
    { label: 'Bank Name', val: emp.bankName || '-' },
    { label: 'Bank Account Number', val: emp.bankAccountNumber || '-' },
  ];

  let statY = statDividerY + 4.2;
  for (let i = 0; i < leftStatRows.length; i++) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(leftStatRows[i].label, col1LabelX, statY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    drawFittedText(doc, leftStatRows[i].val, col1ValX, statY, col1MaxValW, 7, 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(rightStatRows[i].label, col2LabelX, statY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    drawFittedText(doc, rightStatRows[i].val, col2ValX, statY, col2MaxValW, 7, 5.5);

    statY += 3.8;
  }

  // 4. SIDE-BY-SIDE TABLES: EARNINGS & DEDUCTIONS
  const tableStartY = 96.5;
  const earnTableX = margin; // 12.0 mm (34 pt)
  const earnTableW = 111.1;  // 315 pt = 111.1 mm (matches original template ratio!)
  const dedTableX = margin + earnTableW + 3.5; // 126.6 mm (359 pt)
  const dedTableW = 71.3;    // 202 pt = 71.3 mm (matches original template ratio!)

  // Earnings Rows
  const earnItems = [
    { label: 'Basic', tier: emp.basic },
    { label: 'HRA', tier: emp.hra },
    { label: 'Washing Allowance', tier: emp.washingAllowance },
    { label: 'Incentive', tier: emp.incentive },
    { label: 'Other Allowance', tier: emp.otherAllowance },
    { label: 'Previous Month', tier: emp.previousMonth },
  ];
  if (emp.additionalEarnings && emp.additionalEarnings.length > 0) {
    emp.additionalEarnings.forEach((item) => {
      earnItems.push({
        label: item.name,
        tier: { fixed: item.fixed ?? 0, earned: item.earned, arrears: item.arrears ?? 0, total: item.total ?? item.earned },
      });
    });
  }

  // Deductions Rows
  const dedItems = [
    { label: 'Provident Fund', amount: emp.providentFund },
    { label: 'ESI', amount: emp.esi },
    { label: 'TDS', amount: emp.tds },
    { label: 'Professional Tax', amount: emp.professionalTax },
    { label: 'Salary Advance', amount: emp.salaryAdvance ?? emp.advance ?? null },
    { label: 'Other Deduction', amount: emp.otherDeduction },
  ];
  if (emp.additionalDeductions && emp.additionalDeductions.length > 0) {
    emp.additionalDeductions.forEach((item) => {
      dedItems.push({ label: item.name, amount: item.amount });
    });
  }

  const numRows = Math.max(earnItems.length, dedItems.length, 6);
  const rowHeight = 5.2;
  const tableHeight = 6.5 + numRows * rowHeight + 6.5;

  // Left Table: EARNINGS
  // Outer border
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(earnTableX, tableStartY, earnTableW, tableHeight);

  // Dark Navy Header Row
  doc.setFillColor(15, 39, 68); // #0f2744
  doc.rect(earnTableX, tableStartY, earnTableW, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('EARNINGS', earnTableX + 2.5, tableStartY + 4.3);
  doc.text('FIXED', earnTableX + 50, tableStartY + 4.3, { align: 'right' });
  doc.text('EARNED', earnTableX + 68, tableStartY + 4.3, { align: 'right' });
  doc.text('ARREARS', earnTableX + 86, tableStartY + 4.3, { align: 'right' });
  doc.text('TOTAL', earnTableX + earnTableW - 2.5, tableStartY + 4.3, { align: 'right' });

  // Earnings Rows
  let curEarnY = tableStartY + 6.5;
  for (let r = 0; r < numRows; r++) {
    const item = earnItems[r];
    const textY = curEarnY + 3.8;

    if (item) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);
      doc.text(item.label, earnTableX + 2.5, textY, { maxWidth: 32 });

      doc.setFont('courier', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(formatIndianCurrency(item.tier.fixed, false), earnTableX + 50, textY, { align: 'right' });
      doc.text(formatIndianCurrency(item.tier.earned, false), earnTableX + 68, textY, { align: 'right' });
      doc.text(formatIndianCurrency(item.tier.arrears, false), earnTableX + 86, textY, { align: 'right' });

      doc.setFont('courier', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(formatIndianCurrency(item.tier.total, false), earnTableX + earnTableW - 2.5, textY, { align: 'right' });
    }

    curEarnY += rowHeight;
    // Row underline
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(earnTableX, curEarnY, earnTableX + earnTableW, curEarnY);
  }

  // Earnings Total Footer
  const earnFootY = tableStartY + tableHeight - 6.5;
  doc.setFillColor(248, 250, 252);
  doc.rect(earnTableX, earnFootY, earnTableW, 6.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(earnTableX, earnFootY, earnTableX + earnTableW, earnFootY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('GROSS EARNINGS', earnTableX + 2.5, earnFootY + 4.3);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.text(formatIndianCurrency(emp.grossEarnings, false), earnTableX + earnTableW - 2.5, earnFootY + 4.3, { align: 'right' });

  // Right Table: DEDUCTIONS
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(dedTableX, tableStartY, dedTableW, tableHeight);

  // Dark Navy Header Row
  doc.setFillColor(15, 39, 68);
  doc.rect(dedTableX, tableStartY, dedTableW, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DEDUCTIONS', dedTableX + 2.5, tableStartY + 4.3);
  doc.text('AMOUNT', dedTableX + dedTableW - 2.5, tableStartY + 4.3, { align: 'right' });

  // Deductions Rows
  let curDedY = tableStartY + 6.5;
  for (let r = 0; r < numRows; r++) {
    const item = dedItems[r];
    const textY = curDedY + 3.8;

    if (item) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);
      doc.text(item.label, dedTableX + 2.5, textY, { maxWidth: 44 });

      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(formatIndianCurrency(item.amount, false), dedTableX + dedTableW - 2.5, textY, { align: 'right' });
    }

    curDedY += rowHeight;
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(dedTableX, curDedY, dedTableX + dedTableW, curDedY);
  }

  // Deductions Total Footer
  const dedFootY = tableStartY + tableHeight - 6.5;
  doc.setFillColor(248, 250, 252);
  doc.rect(dedTableX, dedFootY, dedTableW, 6.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(dedTableX, dedFootY, dedTableX + dedTableW, dedFootY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL DEDUCTIONS', dedTableX + 2.5, dedFootY + 4.3);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.text(formatIndianCurrency(emp.totalDeductions, false), dedTableX + dedTableW - 2.5, dedFootY + 4.3, { align: 'right' });

  // 5. TOTAL NET PAYABLE CARD
  const netCardY = tableStartY + tableHeight + 4;
  const netCardH = 11;

  doc.setFillColor(240, 245, 250); // #f0f5fa
  doc.setDrawColor(208, 224, 240); // #d0e0f0
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, netCardY, contentWidth, netCardH, 1.2, 1.2, 'FD');

  // Orange accent bar
  doc.setFillColor(217, 119, 6);
  doc.rect(margin + 2.5, netCardY + 2.2, 1.2, 6.6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL NET PAYABLE', margin + 6.5, netCardY + 6.8);

  // Big Bold Net Amount with authentic Rupee glyph - dynamically right-aligned with perfect padding
  const netStr = formatIndianCurrency(emp.calculatedNetPayable, false);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  const netTextW = doc.getTextWidth(netStr);
  const estimatedRupeeW = 13 * 0.352778 * 0.70 * 1.05 * 0.72; // ~2.45mm
  const totalNetW = estimatedRupeeW + 1.2 + netTextW;
  const netStartX = rightMargin - 4.5 - totalNetW;
  const netSymW = drawRupeeSymbol(doc, netStartX, netCardY + 7.5, 13, true, [15, 23, 42]);
  doc.text(netStr, netStartX + netSymW + 1.2, netCardY + 7.5);

  // 6. AMOUNT IN WORDS
  const wordsY = netCardY + netCardH + 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('AMOUNT IN WORDS', margin, wordsY);

  const amountInWords = numberToIndianWords(emp.calculatedNetPayable);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(amountInWords, margin, wordsY + 4.8);

  // Underline
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(margin, wordsY + 6.2, margin + 120, wordsY + 6.2);

  // Subtitle footer note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    template?.footerText || '-- This is a computer-generated payslip under Tamil Nadu Shops & Establishments Rules, 1948 --',
    margin,
    wordsY + 14.5
  );

  // 7. OFFICIAL PIONEER SEAL & SIGNATURE
  const sealW = 42.2;
  const sealX = rightMargin - sealW - 2.5;
  const sealY = wordsY + 3.5;
  drawPioneerSealOnPdf(doc, sealX, sealY, sealW);

  return doc;
}

export async function downloadIndividualPayslipPdf(
  emp: EmployeeRecord,
  settings: CompanySettings,
  template?: PayslipTemplate
) {
  const doc = await generatePayslipPdf(emp, settings, template);
  const filename = getPayslipPdfFilename(emp, template);
  doc.save(filename);
}
