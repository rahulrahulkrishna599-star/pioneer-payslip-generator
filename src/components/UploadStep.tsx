import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Trash2, 
  Download, 
  Layers
} from 'lucide-react';
import { parseSpreadsheetBuffer, ParsedSheetData } from '../utils/excelParser';
import { downloadSamplePayrollTemplate } from '../utils/sampleDataGenerator';
import { EmployeeRecord, CompanySettings } from '../types';

interface UploadStepProps {
  onDataParsed: (data: ParsedSheetData, file: File | null) => void;
  onLoadSample?: (sampleEmployees: EmployeeRecord[]) => void;
  settings: CompanySettings;
  currentFile: File | null;
  parsedData: ParsedSheetData | null;
  onClear: () => void;
  onSheetChange: (sheetName: string) => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  onDataParsed,
  onLoadSample,
  settings,
  currentFile,
  parsedData,
  onClear,
  onSheetChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const nameLower = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => nameLower.endsWith(ext));

    if (!isValid) {
      setErrorMessage('Unsupported format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseSpreadsheetBuffer(buffer);

      if (result.rawRows.length === 0) {
        setErrorMessage('The uploaded spreadsheet contains no readable employee records.');
        setIsLoading(false);
        return;
      }

      onDataParsed(result, file);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to parse spreadsheet file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Upload Box */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Upload Payroll Spreadsheet
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload your Excel or CSV file containing employee payroll information.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadSamplePayrollTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors"
              title="Download standard Pioneer Excel template"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Download Excel Template
            </button>
          </div>
        </div>

        {/* Drag Drop Area */}
        {!currentFile && !parsedData ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/40'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-600 mb-3">
              <UploadCloud className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="text-sm font-medium text-slate-900">
              Drag & drop your payroll file here, or{' '}
              <span className="text-emerald-700 underline font-semibold">browse files</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) files
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              All files are processed strictly in your local browser — zero cloud uploads.
            </p>
          </div>
        ) : (
          /* File Loaded Card */
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    {currentFile ? currentFile.name : 'Pioneer_Sample_50_Employees.xlsx'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                    {currentFile && <span>{formatFileSize(currentFile.size)}</span>}
                    <span>•</span>
                    <span className="font-medium text-emerald-700">
                      {parsedData?.rawRows.length || 50} employee rows detected
                    </span>
                    <span>•</span>
                    <span>{parsedData?.headers.length || 20} columns</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded border border-slate-200 transition-colors"
                >
                  Replace File
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sheet Selector if multi-sheet workbook */}
            {parsedData && parsedData.sheetNames.length > 1 && (
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs text-slate-600">Active Worksheet:</span>
                <select
                  value={parsedData.activeSheet}
                  onChange={(e) => onSheetChange(e.target.value)}
                  className="text-xs font-medium bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {parsedData.sheetNames.map((sheet) => (
                    <option key={sheet} value={sheet}>
                      {sheet}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 ml-2">
                  (Choose the sheet containing employee payroll data)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="mt-4 p-4 text-center text-xs text-slate-500">
            Parsing spreadsheet structure and detecting columns...
          </div>
        )}
      </div>

      {/* Guidelines & Privacy Notice */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="font-semibold text-slate-900 mb-1">
            Bulk Capacity
          </div>
          <p className="text-slate-500 text-[11px]">
            Designed to process batches of 50, 100, 500 or more employees with instant vector PDF generation and ZIP packaging.
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="font-semibold text-slate-900 mb-1">
            Data Privacy
          </div>
          <p className="text-slate-500 text-[11px]">
            Zero employee or payroll data leaves your machine. All calculations and PDF exports occur in your browser memory.
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="font-semibold text-slate-900 mb-1">
            Pioneer Reference Standard
          </div>
          <p className="text-slate-500 text-[11px]">
            Generates pixel-perfect PDFs strictly matching the Pioneer Corporation reference layout and Indian statutory compliance.
          </p>
        </div>
      </div>
    </div>
  );
};

