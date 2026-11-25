import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { CompanySettings, EmployeeRecord, PayslipTemplate, getEmployeeRecordKey } from '../types';
import { generatePayslipPdf, getPayslipPdfFilename } from './pdfGenerator';

export interface BulkGenerationProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  remaining: number;
  currentEmployee?: string;
  isFinished: boolean;
  errors: { employeeId: string; name: string; reason: string }[];
}

export interface BulkGenerationResult {
  zipBlob: Blob;
  pdfBlobs: Map<string, { filename: string; blob: Blob }>;
  successfulCount: number;
  failedCount: number;
  errors: { employeeId: string; name: string; reason: string }[];
}

/**
 * Generates individual PDFs for each employee using the chosen template
 * and packages them into a single ZIP file.
 */
export async function generateBulkPayslipsAndZip(
  employees: EmployeeRecord[],
  settings: CompanySettings,
  onProgress: (progress: BulkGenerationProgress) => void,
  template?: PayslipTemplate
): Promise<BulkGenerationResult> {
  const zip = new JSZip();
  const pdfBlobs = new Map<string, { filename: string; blob: Blob }>();
  const errors: { employeeId: string; name: string; reason: string }[] = [];

  const total = employees.length;
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < total; i++) {
    const emp = employees[i];
    let fileName = getPayslipPdfFilename(emp, template);
    if (zip.file(fileName)) {
      fileName = fileName.replace(/\.pdf$/i, `_${i + 1}.pdf`);
    }
    const blobKey = getEmployeeRecordKey(emp);

    onProgress({
      total,
      completed: i,
      successful,
      failed,
      remaining: total - i,
      currentEmployee: `${emp.id} - ${emp.name}${emp.payPeriod ? ` (${emp.payPeriod})` : ''}`,
      isFinished: false,
      errors,
    });

    // Yield execution to the browser to ensure smooth UI re-renders and animation
    await new Promise((resolve) => setTimeout(resolve, 8));

    try {
      const doc = await generatePayslipPdf(emp, settings, template);
      const pdfBlob = doc.output('blob');
      const arrayBuffer = await pdfBlob.arrayBuffer();

      zip.file(fileName, arrayBuffer);
      pdfBlobs.set(blobKey, { filename: fileName, blob: pdfBlob });
      successful++;
    } catch (err: any) {
      console.error(`Failed generating PDF for ${emp.id}:`, err);
      failed++;
      errors.push({
        employeeId: emp.id,
        name: emp.name,
        reason: err?.message || 'Unknown PDF generation error',
      });
    }
  }

  // Final progress update before zip compression
  onProgress({
    total,
    completed: total,
    successful,
    failed,
    remaining: 0,
    currentEmployee: 'Packaging ZIP file...',
    isFinished: false,
    errors,
  });

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    }
  );

  onProgress({
    total,
    completed: total,
    successful,
    failed,
    remaining: 0,
    currentEmployee: undefined,
    isFinished: true,
    errors,
  });

  return {
    zipBlob,
    pdfBlobs,
    successfulCount: successful,
    failedCount: failed,
    errors,
  };
}

export function downloadZipFile(zipBlob: Blob, payPeriod: string = 'October_2026') {
  const safePeriod = payPeriod.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Pioneer_Corporation_Payslips_${safePeriod}.zip`;
  saveAs(zipBlob, fileName);
}
