/**
 * Pioneer Corporation stylized emblem & vector rendering
 */

export function drawPioneerLogoOnPdf(doc: any, x: number, y: number, width: number = 14, height: number = 12) {
  doc.saveGraphicsState();
  
  // Outer stylized 'P' loop in dark navy
  doc.setDrawColor(15, 23, 42); // slate-900 / dark navy
  doc.setFillColor(15, 23, 42);
  doc.setLineWidth(1.1);
  
  // Vertical stem
  doc.line(x + 2, y + 1, x + 2, y + 9.5);
  
  // Upper loop
  doc.line(x + 2, y + 1, x + 7, y + 1);
  doc.line(x + 7, y + 1, x + 8.5, y + 3.5);
  doc.line(x + 8.5, y + 3.5, x + 7, y + 5.5);
  doc.line(x + 7, y + 5.5, x + 2, y + 5.5);

  // Subtle interior accent arc in dark crimson/slate
  doc.setDrawColor(185, 28, 28); // red-700
  doc.setLineWidth(0.8);
  doc.line(x + 3.5, y + 2.5, x + 6.2, y + 2.5);
  doc.line(x + 6.2, y + 2.5, x + 6.8, y + 3.8);
  doc.line(x + 6.8, y + 3.8, x + 4.5, y + 4.2);

  // Subtitle 'PIONEER CORPORATION' underneath emblem
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.8);
  doc.setTextColor(15, 23, 42);
  doc.text('PIONEER CORPORATION', x, y + 11.5);

  doc.restoreGraphicsState();
}

export const PioneerLogoSvg = () => (
  <div className="flex flex-col items-center justify-center">
    <svg width="34" height="28" viewBox="0 0 34 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Stylized P loop */}
      <path
        d="M6 3V22M6 3H18C21.3137 3 24 5.68629 24 9C24 12.3137 21.3137 15 18 15H6"
        stroke="#0f172a"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Accent inner curve */}
      <path
        d="M10 8H16C17.6569 8 19 9.34315 19 11C19 12.6569 17.6569 14 16 14H10"
        stroke="#b91c1c"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
    <span className="text-[6px] font-bold text-slate-900 tracking-wider uppercase mt-0.5">
      Pioneer Corporation
    </span>
  </div>
);

