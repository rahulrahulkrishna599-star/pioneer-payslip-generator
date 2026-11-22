import { jsPDF } from 'jspdf';
import { CompanySettings, EmployeeRecord, PayslipTemplate } from '../types';
import { numberToIndianWords, formatIndianCurrency } from './numberToWords';
import { drawPioneerLogoOnPdf } from './pioneerLogo';
import { formatFullAddress } from './templateStorage';

export function getPayslipPdfFilename(emp: EmployeeRecord, template?: PayslipTemplate): string {
  const safeId = emp.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = emp.name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').toUpperCase();
  const period = template?.payPeriod || emp.payPeriod;
  const safePeriod = period.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
  return `Payslip_${safeId}_${safeName}_${safePeriod}.pdf`;
}

/**
 * High-resolution glyph cache for the authentic Indian Rupee symbol (₹).
 * Renders the exact browser typography glyph on a high-DPI canvas (1500+ DPI equivalent),
 * ensuring the PDF matches the preview font 100% with smooth curved bowl, proper bars,
 * and balanced spacing.
 */
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

  // 1. Render ₹ at 240x280 on a temporary canvas for ultra-sharp 1500+ DPI output
  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = 240;
  rawCanvas.height = 280;
  const rawCtx = rawCanvas.getContext('2d');
  if (!rawCtx) {
    return { dataUrl: '', aspectRatio: 0.72 };
  }

  rawCtx.clearRect(0, 0, 240, 280);
  rawCtx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  rawCtx.font = `${isBold ? 'bold' : 'normal'} 180px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  rawCtx.textBaseline = 'alphabetic';
  rawCtx.textAlign = 'left';

  // Draw at baseline
  const startX = 20;
  const baselineY = 210;
  rawCtx.fillText('₹', startX, baselineY);

  // 2. Scan exact non-transparent pixel bounding box
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

  // Fallback if measurement failed
  if (maxX <= minX || maxY <= minY) {
    const fallback: RupeeGlyphCache = {
      dataUrl: rawCanvas.toDataURL('image/png'),
      aspectRatio: 0.72,
    };
    rupeeGlyphCache.set(key, fallback);
    return fallback;
  }

  // 3. Create tightly cropped canvas with 2px padding for clean subpixel antialiasing
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

  const glyphInfo: RupeeGlyphCache = {
    dataUrl: cropCanvas.toDataURL('image/png'),
    aspectRatio: cropW / cropH,
  };

  rupeeGlyphCache.set(key, glyphInfo);
  return glyphInfo;
}

/**
 * Draws the Indian Rupee symbol (₹) matching the preview font 100%.
 * Aligns precisely with the baseline and cap-height of adjacent text.
 * Returns the width of the drawn symbol in mm.
 */
function drawRupeeSymbol(
  doc: jsPDF,
  x: number,
  baselineY: number,
  fontSize: number = 8.5,
  isBold: boolean = true,
  color: [number, number, number] = [15, 23, 42]
): number {
  const glyph = getRupeeGlyph(isBold, color);

  // Convert font pt to mm (1 pt = 0.3528 mm)
  const fontMm = fontSize * 0.3528;
  const capHeightMm = fontMm * 0.70;
  const symWidthMm = capHeightMm * glyph.aspectRatio;

  // The symbol aligns with the cap height: top is baselineY - capHeightMm, bottom is baselineY
  const symY = baselineY - capHeightMm;

  if (glyph.dataUrl) {
    doc.addImage(glyph.dataUrl, 'PNG', x, symY, symWidthMm, capHeightMm);
    return symWidthMm;
  }

  // Fallback vector drawing if outside browser environment (e.g. tests)
  doc.saveGraphicsState();
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(fontMm * 0.10);
  const w = fontMm * 0.45;
  const midY = symY + capHeightMm * 0.38;
  doc.line(x, symY, x + w, symY);
  doc.line(x, midY, x + w * 0.85, midY);
  doc.line(x + fontMm * 0.08, symY, x + fontMm * 0.08, midY + capHeightMm * 0.15);
  doc.restoreGraphicsState();
  return symWidthMm;
}

/**
 * Renders an amount with right alignment and authentic Rupee symbol preceding it.
 * Provides comfortable typographic spacing between the symbol and the amount.
 */
function renderAmountRightAligned(
  doc: jsPDF,
  amount: number,
  rightX: number,
  y: number,
  fontSize: number = 8.5,
  isBold: boolean = true,
  color: [number, number, number] = [15, 23, 42]
) {
  const numStr = formatIndianCurrency(amount, false); // format number only without symbol
  doc.setFont('helvetica', isBold ? 'bold' : 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(color[0], color[1], color[2]);

  const numWidth = doc.getTextWidth(numStr);
  const glyph = getRupeeGlyph(isBold, color);
  const fontMm = fontSize * 0.3528;
  const capHeightMm = fontMm * 0.70;
  const symWidthMm = capHeightMm * glyph.aspectRatio;
  const gapMm = 0.8; // clean, comfortable spacing between ₹ and number

  const symX = rightX - numWidth - symWidthMm - gapMm;

  drawRupeeSymbol(doc, symX, y, fontSize, isBold, color);
  doc.text(numStr, rightX, y, { align: 'right' });
}

/**
 * Generates an individual payslip PDF matching the selected template layout with 100% precision.
 * Strict A4 portrait (210mm x 297mm), vector typography, exact spacing and layout.
 */
export function generatePayslipPdf(
  emp: EmployeeRecord,
  settings: CompanySettings,
  template?: PayslipTemplate
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 15;
  const contentWidth = 180;
  const rightMargin = margin + contentWidth; // 195mm

  const companyName = template?.companyName || settings.companyName;
  const companyAddress = formatFullAddress(
    template?.companyAddress || settings.companyAddress,
    template?.cityPincode,
    template?.country
  );
  const payPeriod = template?.payPeriod || emp.payPeriod;
  const payDate = template?.payDate || emp.payDate;
  const footerText = template?.footerText || settings.footerText;

  // Theme colors
  const isNavy = template?.themeColor === 'navy';
  const isBlue = template?.themeColor === 'blue';

  const boxBgColor: [number, number, number] = isNavy
    ? [241, 245, 249]
    : isBlue
    ? [239, 246, 255]
    : [238, 251, 243]; // #eefbf3

  const boxBorderColor: [number, number, number] = isNavy
    ? [203, 213, 225]
    : isBlue
    ? [191, 219, 254]
    : [209, 250, 229];

  const accentColor: [number, number, number] = isNavy
    ? [15, 23, 42]
    : isBlue
    ? [37, 99, 235]
    : [16, 185, 129]; // emerald-500

  const subtextColor: [number, number, number] = isNavy
    ? [71, 85, 105]
    : isBlue
    ? [29, 78, 216]
    : [5, 150, 105];

  // 1. COMPANY HEADER & LOGO
  const customLogoUrl = template?.logoUrl;
  if (customLogoUrl && customLogoUrl.startsWith('data:image')) {
    try {
      const format = customLogoUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(customLogoUrl, format, margin, 15, 14, 12);
    } catch {
      drawPioneerLogoOnPdf(doc, margin, 15, 13, 11);
    }
  } else {
    drawPioneerLogoOnPdf(doc, margin, 15, 13, 11);
  }

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(companyName.toUpperCase(), margin + 18, 19.5);

  // Company Address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(companyAddress, margin + 18, 24.5);

  // Payslip For the Month (Top Right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Payslip For the Month', rightMargin, 18, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(payPeriod, rightMargin, 24, { align: 'right' });

  // Thin horizontal divider below header
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.35);
  doc.line(margin, 29, rightMargin, 29);

  // 2. EMPLOYEE SUMMARY
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('EMPLOYEE SUMMARY', margin, 36);

  // Left Details: Employee Name, ID, Pay Period, Pay Date
  const colonX = margin + 35;
  const valX = colonX + 3;

  const summaryLeft = [
    { label: 'Employee Name', val: emp.name, isBold: true },
    { label: 'Employee ID', val: emp.id, isBold: true },
    { label: 'Pay Period', val: payPeriod, isBold: false },
    { label: 'Pay Date', val: payDate, isBold: false },
  ];

  let leftY = 42;
  for (const item of summaryLeft) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(item.label, margin, leftY);
    doc.text(':', colonX, leftY);

    doc.setFont('helvetica', item.isBold ? 'bold' : 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(item.val, valX, leftY);

    leftY += 5.2;
  }

  // Right Details: Highlighted Net Pay Box
  const boxW = 68;
  const boxH = 27;
  const boxX = rightMargin - boxW;
  const boxY = 34;

  // Box Background
  doc.setFillColor(boxBgColor[0], boxBgColor[1], boxBgColor[2]);
  doc.setDrawColor(boxBorderColor[0], boxBorderColor[1], boxBorderColor[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2.5, 2.5, 'FD');

  // Left accent line inside box
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(boxX + 3.5, boxY + 3.5, 1.2, 8, 0.5, 0.5, 'F');

  // Net Pay Amount (Rendered with authentic Rupee symbol matching preview 100%)
  const netNumStr = formatIndianCurrency(emp.calculatedNetPayable, false);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  const netSymW = drawRupeeSymbol(doc, boxX + 7, boxY + 8, 14, true, [15, 23, 42]);
  doc.text(netNumStr, boxX + 7 + netSymW + 1.2, boxY + 8);

  // Total Net Pay subtext
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(subtextColor[0], subtextColor[1], subtextColor[2]);
  doc.text('Total Net Pay', boxX + 7, boxY + 11.5);

  // Dotted divider inside box
  doc.saveGraphicsState();
  doc.setDrawColor(boxBorderColor[0], boxBorderColor[1], boxBorderColor[2]);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([0.8, 0.8], 0);
  doc.line(boxX, boxY + 14, boxX + boxW, boxY + 14);
  doc.restoreGraphicsState();

  // Paid Days & LOP Days inside box
  const boxColonX = boxX + 30;
  const boxValX = boxColonX + 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Paid Days', boxX + 6, boxY + 19);
  doc.text(':', boxColonX, boxY + 19);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(String(emp.paidDays), boxValX, boxY + 19);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('LOP Days', boxX + 6, boxY + 24);
  doc.text(':', boxColonX, boxY + 24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(String(emp.lopDays), boxValX, boxY + 24);

  // 3. FULL WIDTH DOTTED DIVIDER
  doc.saveGraphicsState();
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(margin, 66, rightMargin, 66);
  doc.restoreGraphicsState();

  // 4. EMPLOYEE INFORMATION (Two Columns)
  const col1ColonX = margin + 35;
  const col1ValX = col1ColonX + 3;

  const col2X = margin + 98;
  const col2ColonX = col2X + 38;
  const col2ValX = col2ColonX + 3;

  const empDetailsLeft = [
    { label: 'UAN Number', val: emp.uanNumber || '-' },
    { label: 'DOJ', val: emp.doj || '-' },
    { label: 'Department', val: emp.department || '-' },
  ];

  const empDetailsRight = [
    { label: 'ESI Number', val: emp.esiNumber || '-' },
    { label: 'Designation', val: emp.designation || '-' },
    { label: 'PF&ESI applicable', val: emp.pfEsiApplicable || 'No' },
  ];

  let detailsY = 73;
  for (let i = 0; i < 3; i++) {
    // Left
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(empDetailsLeft[i].label, margin, detailsY);
    doc.text(':', col1ColonX, detailsY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(empDetailsLeft[i].val, col1ValX, detailsY);

    // Right
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(empDetailsRight[i].label, col2X, detailsY);
    doc.text(':', col2ColonX, detailsY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(empDetailsRight[i].val, col2ValX, detailsY);

    detailsY += 5.5;
  }

  // 5. EARNINGS & DEDUCTIONS TABLE
  let tableY = 94;

  // Header Row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  doc.text('EARNINGS', margin, tableY);
  doc.text('AMOUNT', margin + 78, tableY, { align: 'right' });

  doc.text('DEDUCTIONS', margin + 98, tableY);
  doc.text('AMOUNT', rightMargin, tableY, { align: 'right' });

  // Dotted underline under table headers
  doc.saveGraphicsState();
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(margin, tableY + 2.5, rightMargin, tableY + 2.5);
  doc.restoreGraphicsState();

  // Dynamic rows from template or defaults + individual employee custom components
  const earningsList: { label: string; amt: number }[] = [];
  if (template?.earningsList && template.earningsList.length > 0) {
    template.earningsList.forEach((item) => {
      let amt = 0;
      const key = item.fieldKey;
      if (key === 'basic') amt = emp.basic;
      else if (key === 'hra') amt = emp.hra;
      else if (key === 'waterAllowance') amt = emp.waterAllowance;
      else if (key === 'incentive') amt = emp.incentive;
      else if (key === 'otherAllowance') amt = emp.otherAllowance;
      else if (key === 'da') amt = emp.da;
      else {
        const found = emp.additionalEarnings?.find((a) => a.name.toLowerCase() === item.label.toLowerCase());
        amt = found ? found.amount : 0;
      }
      earningsList.push({ label: item.label, amt });
    });
  } else {
    earningsList.push(
      { label: 'Basic', amt: emp.basic },
      { label: 'House Rent Allowance', amt: emp.hra },
      { label: 'Water allowance', amt: emp.waterAllowance },
      { label: 'Incentive', amt: emp.incentive },
      { label: 'Other Allowance', amt: emp.otherAllowance }
    );
    if (emp.da && emp.da > 0) {
      earningsList.push({ label: 'DA', amt: emp.da });
    }
  }

  // Auto-append any additional individual custom earnings
  if (emp.additionalEarnings && emp.additionalEarnings.length > 0) {
    emp.additionalEarnings.forEach((item) => {
      if (!earningsList.some((e) => e.label.toLowerCase() === item.name.toLowerCase())) {
        earningsList.push({ label: item.name, amt: item.amount });
      }
    });
  }

  const deductionsList: { label: string; amt: number }[] = [];
  if (template?.deductionsList && template.deductionsList.length > 0) {
    template.deductionsList.forEach((item) => {
      let amt = 0;
      const key = item.fieldKey;
      if (key === 'incomeTax') amt = emp.incomeTax;
      else if (key === 'providentFund') amt = emp.providentFund;
      else if (key === 'esi') amt = emp.esi;
      else if (key === 'previousMonth') amt = emp.previousMonth;
      else if (key === 'otherDeduction') amt = emp.otherDeduction;
      else if (key === 'advance') amt = emp.advance;
      else if (key === 'lateFine') amt = emp.lateFine;
      else {
        const found = emp.additionalDeductions?.find((d) => d.name.toLowerCase() === item.label.toLowerCase());
        amt = found ? found.amount : 0;
      }
      deductionsList.push({ label: item.label, amt });
    });
  } else {
    deductionsList.push(
      { label: 'Income Tax', amt: emp.incomeTax },
      { label: 'Provident Fund', amt: emp.providentFund },
      { label: 'ESI', amt: emp.esi },
      { label: 'Previous Month', amt: emp.previousMonth },
      { label: 'Other deduction', amt: emp.otherDeduction }
    );
    if (emp.advance && emp.advance > 0) {
      deductionsList.push({ label: 'Advance', amt: emp.advance });
    }
    if (emp.lateFine && emp.lateFine > 0) {
      deductionsList.push({ label: 'Late Fine', amt: emp.lateFine });
    }
  }

  // Auto-append any additional individual custom deductions
  if (emp.additionalDeductions && emp.additionalDeductions.length > 0) {
    emp.additionalDeductions.forEach((item) => {
      if (!deductionsList.some((d) => d.label.toLowerCase() === item.name.toLowerCase())) {
        deductionsList.push({ label: item.name, amt: item.amount });
      }
    });
  }

  const rowCount = Math.max(earningsList.length, deductionsList.length);

  let rowY = tableY + 8;
  for (let i = 0; i < rowCount; i++) {
    // Earnings
    const earn = earningsList[i];
    if (earn) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(earn.label, margin, rowY);

      renderAmountRightAligned(doc, earn.amt, margin + 78, rowY, 8.5, true, [15, 23, 42]);
    }

    // Deductions
    const ded = deductionsList[i];
    if (ded) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(ded.label, margin + 98, rowY);

      renderAmountRightAligned(doc, ded.amt, rightMargin, rowY, 8.5, true, [15, 23, 42]);
    }

    rowY += 6.2;
  }

  // 6. TOTALS ROW (Shaded bar)
  const totalsY = rowY + 1.5;
  const totalsH = 7.5;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, totalsY, contentWidth, totalsH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  doc.text('Gross Earnings', margin + 3, totalsY + 5);
  renderAmountRightAligned(doc, emp.grossEarnings, margin + 78, totalsY + 5, 8.5, true, [15, 23, 42]);

  doc.text('Total Deductions', margin + 98, totalsY + 5);
  renderAmountRightAligned(doc, emp.totalDeductions, rightMargin, totalsY + 5, 8.5, true, [15, 23, 42]);

  // 7. TOTAL NET PAYABLE CARD
  const netCardY = totalsY + totalsH + 5;
  const netCardH = 13;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, netCardY, contentWidth, netCardH, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL NET PAYABLE', margin + 4, netCardY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Gross Earnings - Total Deductions', margin + 4, netCardY + 10);

  // Mint pill on right of card
  const netBadgeW = 40;
  const netBadgeH = 9.5;
  const netBadgeX = rightMargin - netBadgeW - 2;
  const netBadgeY = netCardY + 1.75;

  doc.setFillColor(boxBgColor[0], boxBgColor[1], boxBgColor[2]);
  doc.roundedRect(netBadgeX, netBadgeY, netBadgeW, netBadgeH, 1.5, 1.5, 'F');

  // Center vector Rupee and amount inside badge
  const cardNumStr = formatIndianCurrency(emp.calculatedNetPayable, false);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);

  const cardGlyph = getRupeeGlyph(true, [15, 23, 42]);
  const cardFontMm = 10.5 * 0.3528;
  const cardCapHeightMm = cardFontMm * 0.70;
  const cardSymW = cardCapHeightMm * cardGlyph.aspectRatio;
  const cardTextW = doc.getTextWidth(cardNumStr);
  const cardGap = 1.0;
  const cardTotalW = cardSymW + cardGap + cardTextW;
  const cardStartX = netBadgeX + (netBadgeW - cardTotalW) / 2;

  drawRupeeSymbol(doc, cardStartX, netBadgeY + 6.7, 10.5, true, [15, 23, 42]);
  doc.text(cardNumStr, cardStartX + cardSymW + cardGap, netBadgeY + 6.7);

  // 8. AMOUNT IN WORDS
  const wordsY = netCardY + netCardH + 7;
  const words = numberToIndianWords(emp.calculatedNetPayable);

  if (template?.showAmountInWords !== false) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Amount In Words : ', rightMargin - doc.getTextWidth(words) - 1, wordsY, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(words, rightMargin, wordsY, { align: 'right' });
  }

  // Thin line below Amount in Words
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, wordsY + 4, rightMargin, wordsY + 4);

  // 9. SYSTEM-GENERATED DOCUMENT NOTE (Confidential / System note)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(footerText, 105, wordsY + 14, { align: 'center' });

  return doc;
}

/**
 * Downloads single employee payslip
 */
export function downloadIndividualPayslipPdf(
  emp: EmployeeRecord,
  settings: CompanySettings,
  template?: PayslipTemplate
) {
  const doc = generatePayslipPdf(emp, settings, template);
  const fileName = getPayslipPdfFilename(emp, template);
  doc.save(fileName);
}
