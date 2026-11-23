import React from 'react';
import { PIONEER_DEFAULT_LOGO_URL, PIONEER_SEAL_STAMP_DATA_URL } from './pioneerAssets';

export { PIONEER_DEFAULT_LOGO_URL, PIONEER_SEAL_STAMP_DATA_URL };

/**
 * Renders the authentic Pioneer Corporation Coimbatore official round rubber seal stamp with signature.
 */
export const PioneerSealStamp: React.FC<{ size?: number; className?: string }> = ({
  size = 140,
  className = '',
}) => {
  return (
    <div className={`inline-block select-none pointer-events-none ${className}`}>
      <img
        src={PIONEER_SEAL_STAMP_DATA_URL}
        alt="Official Pioneer Corporation Seal and Signature"
        style={{ width: size, height: 'auto' }}
        className="object-contain block"
      />
    </div>
  );
};

/**
 * Draws the authentic Pioneer seal and signature on a jsPDF document.
 */
export function drawPioneerSealOnPdf(doc: any, xMm: number, yMm: number, widthMm: number = 42.2) {
  try {
    const heightMm = widthMm * (400 / 510); // Exact 510x400 aspect ratio: 33.1mm
    doc.addImage(PIONEER_SEAL_STAMP_DATA_URL, 'PNG', xMm, yMm, widthMm, heightMm);
  } catch (err) {
    console.error('Failed to embed seal image in PDF:', err);
  }
}
