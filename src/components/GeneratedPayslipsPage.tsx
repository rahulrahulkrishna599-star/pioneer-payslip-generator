import React, { useState, useMemo, useEffect } from 'react';
import { 
  Download, 
  Trash2, 
  Eye, 
  Clock, 
  FileSpreadsheet, 
  Search, 
  Filter, 
  CheckCircle2, 
  Users, 
  MapPin, 
  X, 
  Archive,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckSquare,
  Square,
  MinusSquare,
  FileDown,
  Briefcase,
  Layers,
  Sparkles
} from 'lucide-react';
import JSZip from 'jszip';
import { BatchHistoryItem, CompanySettings, EmployeeRecord, PayslipTemplate } from '../types';
import { downloadZipFile } from '../utils/zipGenerator';
import { downloadIndividualPayslipPdf, generatePayslipPdf, getPayslipPdfFilename } from '../utils/pdfGenerator';
import { formatIndianCurrency } from '../utils/numberToWords';
import { PayslipPreview } from './PayslipPreview';
import { downloadStoredZip } from '../services/batchService';

interface GeneratedPayslipsPageProps {
  batches: BatchHistoryItem[];
  settings: CompanySettings;
  template?: PayslipTemplate;
  onClearBatches: () => void;
  onNewBatch: () => void;
}

export const GeneratedPayslipsPage: React.FC<GeneratedPayslipsPageProps> = ({
  batches,
  settings,
  template,
  onClearBatches,
  onNewBatch,
}) => {
  // Currently active batch ID (defaults to latest batch)
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(batches[0]?.id || null);
  
  // Filtering states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedDesignation, setSelectedDesignation] = useState<string>('all');

  // Sorting states
  const [sortField, setSortField] = useState<'name' | 'id' | 'netPay' | 'gross' | 'paidDays' | 'location' | 'designation'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination states (Scalable for 100+ to 500+ employees)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Bulk selection states
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [isDownloadingSelectedZip, setIsDownloadingSelectedZip] = useState<boolean>(false);

  // Inspection modal state
  const [inspectEmployee, setInspectEmployee] = useState<EmployeeRecord | null>(null);

  // Ensure selectedBatchId is valid when batches change
  useEffect(() => {
    if (batches.length > 0 && (!selectedBatchId || !batches.some(b => b.id === selectedBatchId))) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches, selectedBatchId]);

  // Reset pagination & bulk selection when batch or filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedEmployeeIds(new Set());
  }, [selectedBatchId, selectedLocation, selectedDesignation, searchQuery, pageSize]);

  // Active batch object
  const activeBatch = useMemo(() => {
    if (batches.length === 0) return null;
    return batches.find((b) => b.id === selectedBatchId) || batches[0];
  }, [batches, selectedBatchId]);

  // Distinct locations available in the active batch
  const batchLocations = useMemo(() => {
    if (!activeBatch) return [];
    const set = new Set<string>();
    activeBatch.employees.forEach((emp) => {
      const loc = (emp.location || emp.branch || '').trim();
      if (loc) set.add(loc);
    });
    return Array.from(set).sort();
  }, [activeBatch]);

  // Distinct designations available in the active batch
  const batchDesignations = useMemo(() => {
    if (!activeBatch) return [];
    const set = new Set<string>();
    activeBatch.employees.forEach((emp) => {
      const desig = (emp.designation || '').trim();
      if (desig) set.add(desig);
    });
    return Array.from(set).sort();
  }, [activeBatch]);

  // Batch Financial Totals
  const activeBatchTotals = useMemo(() => {
    if (!activeBatch) return { totalGross: 0, totalNet: 0, totalDeductions: 0, avgNet: 0 };
    const totalGross = activeBatch.employees.reduce((acc, e) => acc + e.grossEarnings, 0);
    const totalNet = activeBatch.employees.reduce((acc, e) => acc + e.calculatedNetPayable, 0);
    const totalDeductions = activeBatch.employees.reduce((acc, e) => acc + e.totalDeductions, 0);
    const avgNet = activeBatch.employees.length > 0 ? Math.round(totalNet / activeBatch.employees.length) : 0;
    return { totalGross, totalNet, totalDeductions, avgNet };
  }, [activeBatch]);

  // Filter employees inside the active batch
  const filteredEmployees = useMemo(() => {
    if (!activeBatch) return [];

    let list = activeBatch.employees;

    // Filter by location
    if (selectedLocation !== 'all') {
      list = list.filter((emp) => {
        const loc = (emp.location || emp.branch || 'Unspecified').trim();
        return loc === selectedLocation;
      });
    }

    // Filter by designation
    if (selectedDesignation !== 'all') {
      list = list.filter((emp) => {
        const desig = (emp.designation || 'Unspecified').trim();
        return desig === selectedDesignation;
      });
    }

    // Filter by search query (Name, ID, Phone, PAN, UAN, Branch, Role)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (emp) =>
          emp.name.toLowerCase().includes(q) ||
          emp.id.toLowerCase().includes(q) ||
          emp.designation.toLowerCase().includes(q) ||
          emp.department.toLowerCase().includes(q) ||
          emp.location.toLowerCase().includes(q) ||
          emp.branch.toLowerCase().includes(q) ||
          (emp.panNumber && emp.panNumber.toLowerCase().includes(q)) ||
          (emp.uanNumber && emp.uanNumber.toLowerCase().includes(q))
      );
    }

    return list;
  }, [activeBatch, selectedLocation, selectedDesignation, searchQuery]);

  // Sorted employees
  const sortedEmployees = useMemo(() => {
    const list = [...filteredEmployees];

    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortField === 'id') {
        valA = a.id.toLowerCase();
        valB = b.id.toLowerCase();
      } else if (sortField === 'designation') {
        valA = (a.designation || '').toLowerCase();
        valB = (b.designation || '').toLowerCase();
      } else if (sortField === 'location') {
        valA = (a.location || a.branch || '').toLowerCase();
        valB = (b.location || b.branch || '').toLowerCase();
      } else if (sortField === 'paidDays') {
        valA = a.paidDays ?? 0;
        valB = b.paidDays ?? 0;
      } else if (sortField === 'gross') {
        valA = a.grossEarnings;
        valB = b.grossEarnings;
      } else if (sortField === 'netPay') {
        valA = a.calculatedNetPayable;
        valB = b.calculatedNetPayable;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [filteredEmployees, sortField, sortOrder]);

  // Paginated employees for current page
  const totalEmployees = sortedEmployees.length;
  const isAllPages = pageSize === -1;
  const totalPages = isAllPages ? 1 : Math.max(1, Math.ceil(totalEmployees / pageSize));
  const startIndex = isAllPages ? 0 : (currentPage - 1) * pageSize;
  const paginatedEmployees = isAllPages 
    ? sortedEmployees 
    : sortedEmployees.slice(startIndex, startIndex + pageSize);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Bulk Selection Mechanics
  const isAllPageSelected = useMemo(() => {
    if (paginatedEmployees.length === 0) return false;
    return paginatedEmployees.every((emp) => selectedEmployeeIds.has(emp.id));
  }, [paginatedEmployees, selectedEmployeeIds]);

  const isSomePageSelected = useMemo(() => {
    if (paginatedEmployees.length === 0) return false;
    const count = paginatedEmployees.filter((emp) => selectedEmployeeIds.has(emp.id)).length;
    return count > 0 && count < paginatedEmployees.length;
  }, [paginatedEmployees, selectedEmployeeIds]);

  const toggleSelectAllPage = () => {
    const next = new Set(selectedEmployeeIds);
    if (isAllPageSelected) {
      paginatedEmployees.forEach((emp) => next.delete(emp.id));
    } else {
      paginatedEmployees.forEach((emp) => next.add(emp.id));
    }
    setSelectedEmployeeIds(next);
  };

  const toggleSelectEmployee = (id: string) => {
    const next = new Set(selectedEmployeeIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedEmployeeIds(next);
  };

  const selectAllFiltered = () => {
    const next = new Set<string>();
    filteredEmployees.forEach((emp) => next.add(emp.id));
    setSelectedEmployeeIds(next);
  };

  const clearSelection = () => {
    setSelectedEmployeeIds(new Set());
  };

  // Download entire batch ZIP
  const handleDownloadBatchZip = async () => {
    if (!activeBatch) return;
    setIsDownloadingZip(true);
    try {
      const zipBlob = (activeBatch as any)._zipBlob;
      if (zipBlob) {
        downloadZipFile(zipBlob, `Pioneer_Corporation_Payslips_${activeBatch.payPeriod.replace(/\s+/g, '_')}.zip`);
      } else if ((activeBatch as any).zipStoragePath) {
        await downloadStoredZip(
          (activeBatch as any).zipStoragePath,
          `Pioneer_Corporation_Payslips_${activeBatch.payPeriod.replace(/\s+/g, '_')}.zip`
        );
      } else {
        // Generate on-the-fly if not cached
        const zip = new JSZip();
        for (const emp of activeBatch.employees) {
          const doc = await generatePayslipPdf(emp, settings, template);
          const pdfBlob = doc.output('blob');
          const filename = getPayslipPdfFilename(emp, template);
          zip.file(filename, await pdfBlob.arrayBuffer());
        }
        const generatedBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        downloadZipFile(generatedBlob, `Pioneer_Corporation_Payslips_${activeBatch.payPeriod.replace(/\s+/g, '_')}.zip`);
      }
    } catch (err) {
      console.error('Error downloading batch zip:', err);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Download only selected employees as mini-ZIP
  const handleDownloadSelectedZip = async () => {
    if (!activeBatch || selectedEmployeeIds.size === 0) return;
    setIsDownloadingSelectedZip(true);
    try {
      const selectedList = activeBatch.employees.filter((emp) => selectedEmployeeIds.has(emp.id));
      const zip = new JSZip();
      for (const emp of selectedList) {
        const doc = await generatePayslipPdf(emp, settings, template);
        const pdfBlob = doc.output('blob');
        const filename = getPayslipPdfFilename(emp, template);
        zip.file(filename, await pdfBlob.arrayBuffer());
      }
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      downloadZipFile(
        zipBlob,
        `Pioneer_Corporation_Selected_${selectedList.length}_Payslips_${activeBatch.payPeriod.replace(/\s+/g, '_')}.zip`
      );
    } catch (err) {
      console.error('Error downloading selected zip:', err);
    } finally {
      setIsDownloadingSelectedZip(false);
    }
  };

  // Export payroll summary CSV for active batch or filtered employees
  const handleExportSummaryCsv = () => {
    if (!activeBatch) return;
    const targetList = selectedEmployeeIds.size > 0 
      ? activeBatch.employees.filter((e) => selectedEmployeeIds.has(e.id))
      : filteredEmployees;

    const headers = [
      'Employee ID',
      'Employee Name',
      'Designation',
      'Department',
      'Location',
      'Paid Days',
      'LOP Days',
      'Gross Earnings (INR)',
      'Total Deductions (INR)',
      'Net Payable (INR)',
      'Pay Period'
    ];

    const rows = targetList.map((e) => [
      `"${e.id}"`,
      `"${e.name}"`,
      `"${e.designation || ''}"`,
      `"${e.department || ''}"`,
      `"${e.location || e.branch || ''}"`,
      e.paidDays ?? '',
      e.lopDays ?? '',
      e.grossEarnings.toFixed(2),
      e.totalDeductions.toFixed(2),
      e.calculatedNetPayable.toFixed(2),
      `"${e.payPeriod || activeBatch.payPeriod}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pioneer_Payroll_Summary_${activeBatch.payPeriod.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Title & Operational Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Generated Payslip Directory
              </h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                {batches.length} Batch{batches.length === 1 ? '' : 'es'} Stored
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              High-volume archive. Search, filter, select, and export vector PDF payslips individually or in bulk.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onNewBatch}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>New Payroll Upload</span>
            </button>

            {batches.length > 0 && (
              <button
                type="button"
                onClick={onClearBatches}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                title="Clear local session cache"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Session</span>
              </button>
            )}
          </div>
        </div>

        {/* Cloud Sync Status Strip */}
        <div className="mt-4 p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-lg text-xs text-emerald-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px]">
              <strong>Supabase Cloud Persistence Active:</strong> All generated batches and individual employee payslips are synchronized with zero count inflation.
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 uppercase tracking-wider bg-emerald-100/70 px-2 py-0.5 rounded font-semibold shrink-0">
            Encrypted
          </span>
        </div>
      </div>

      {/* 2. Main Content Area */}
      {batches.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-xs">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Archive className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            No Generated Payslips in Archive
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
            Upload an Excel payroll spreadsheet to generate individual employee vector payslips and browse archives here.
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={onNewBatch}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Start Payroll Generation</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Scalable Batch Switcher Bar (Accommodates 12 to 50+ batches) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1 shrink-0">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Payroll Batch:</span>
              </div>

              {/* High-Capacity Dropdown */}
              <select
                value={activeBatch?.id || ''}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  setSelectedLocation('all');
                  setSelectedDesignation('all');
                  setSearchQuery('');
                }}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900 hover:bg-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs max-w-xs truncate"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.payPeriod} • {b.employees.length} slips • {b.fileName}
                  </option>
                ))}
              </select>

              {/* Quick Pills for Top 3 Most Recent Batches */}
              {batches.length > 1 && (
                <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-slate-200">
                  <span className="text-[11px] text-slate-400 font-medium">Quick switch:</span>
                  {batches.slice(0, 3).map((b) => {
                    const isSelected = b.id === activeBatch?.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBatchId(b.id)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0f2744] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {b.payPeriod}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 self-end md:self-auto">
              <span>Accumulated History:</span>
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                {batches.length} Monthly Runs
              </span>
            </div>
          </div>

          {/* Active Batch Executive Command Card */}
          {activeBatch && (
            <div className="bg-[#0f2744] text-white rounded-xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5 border border-slate-800">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xl font-bold text-white tracking-tight">
                    {activeBatch.payPeriod} Payroll Batch
                  </span>
                  <span className="text-[11px] font-mono bg-white/10 text-emerald-300 px-2.5 py-0.5 rounded border border-white/15">
                    {activeBatch.fileName}
                  </span>
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-400/30">
                    Ready for Export
                  </span>
                </div>

                {/* Financial Summary Badges in compact executive strip */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs text-slate-300 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Run Date: {activeBatch.date}</span>
                  </span>
                  <span className="hidden sm:inline text-slate-500">•</span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-white">{activeBatch.employees.length} Payslips</span>
                  </span>
                  <span className="hidden sm:inline text-slate-500">•</span>
                  <span>
                    Gross: <strong className="text-slate-100 font-mono">{formatIndianCurrency(activeBatchTotals.totalGross)}</strong>
                  </span>
                  <span className="hidden sm:inline text-slate-500">•</span>
                  <span>
                    Net Disbursal: <strong className="text-emerald-400 font-mono font-bold text-sm">{formatIndianCurrency(activeBatchTotals.totalNet)}</strong>
                  </span>
                </div>
              </div>

              {/* Batch Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleExportSummaryCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/15 rounded-lg border border-white/20 transition-colors cursor-pointer"
                  title="Export complete payroll summary to CSV spreadsheet"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                {selectedEmployeeIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadSelectedZip}
                    disabled={isDownloadingSelectedZip}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-950 bg-emerald-300 hover:bg-emerald-200 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 animate-pulse"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {isDownloadingSelectedZip
                        ? 'Packaging...'
                        : `Download Selected (${selectedEmployeeIds.size})`}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDownloadBatchZip}
                  disabled={isDownloadingZip}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isDownloadingZip
                      ? 'Packaging ZIP...'
                      : `Download All (${activeBatch.employees.length} PDFs)`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 3. High-Volume Search & Multi-Filter Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 lg:max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, ID, role, location, UAN, PAN..."
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Multi-Filter Dropdowns & Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Location Filter */}
                {batchLocations.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-800 hover:bg-slate-50 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                    >
                      <option value="all">All Locations ({activeBatch?.employees.length})</option>
                      {batchLocations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Designation Filter */}
                {batchDesignations.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={selectedDesignation}
                      onChange={(e) => setSelectedDesignation(e.target.value)}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-800 hover:bg-slate-50 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs max-w-[180px] truncate"
                    >
                      <option value="all">All Roles ({batchDesignations.length})</option>
                      {batchDesignations.map((desig) => (
                        <option key={desig} value={desig}>
                          {desig}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Rows per page selector */}
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="text-[11px] hidden sm:inline">Page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs"
                  >
                    <option value={10}>10 rows</option>
                    <option value={25}>25 rows</option>
                    <option value={50}>50 rows</option>
                    <option value={100}>100 rows</option>
                    <option value={-1}>All ({filteredEmployees.length})</option>
                  </select>
                </div>

                {/* Active Filter Clear Button */}
                {(selectedLocation !== 'all' || selectedDesignation !== 'all' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLocation('all');
                      setSelectedDesignation('all');
                      setSearchQuery('');
                    }}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Selection Banner (Sticky feedback when items are selected) */}
            {selectedEmployeeIds.size > 0 && (
              <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-950 font-medium">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-700" />
                  <span>
                    <strong>{selectedEmployeeIds.size}</strong> of {filteredEmployees.length} employees selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer"
                  >
                    Select All {filteredEmployees.length} Filtered
                  </button>
                  <span className="text-emerald-300">•</span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            )}

            {/* 4. Enterprise Rich Employee Table */}
            {paginatedEmployees.length === 0 ? (
              <div className="text-center py-14 px-4 text-slate-400 text-xs">
                <Users className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-sm">No matching employee records</p>
                <p className="text-slate-400 text-xs mt-1">
                  Try adjusting your search criteria, role selection, or location filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLocation('all');
                    setSelectedDesignation('all');
                    setSearchQuery('');
                  }}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold select-none">
                    <tr>
                      {/* Master Checkbox */}
                      <th className="py-3 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAllPage}
                          className="p-1 hover:text-slate-800 text-slate-400 cursor-pointer"
                          title={isAllPageSelected ? 'Deselect Page' : 'Select Page'}
                        >
                          {isAllPageSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : isSomePageSelected ? (
                            <MinusSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </th>

                      {/* Employee Name & ID */}
                      <th 
                        className="py-3 px-3 cursor-pointer hover:text-slate-900"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Employee</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>

                      {/* Designation */}
                      <th 
                        className="py-3 px-3 cursor-pointer hover:text-slate-900"
                        onClick={() => handleSort('designation')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Designation & Dept</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>

                      {/* Location */}
                      <th 
                        className="py-3 px-3 cursor-pointer hover:text-slate-900"
                        onClick={() => handleSort('location')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Location</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>

                      {/* Paid Days */}
                      <th 
                        className="py-3 px-3 cursor-pointer hover:text-slate-900"
                        onClick={() => handleSort('paidDays')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Paid Days</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>

                      {/* Gross Earnings */}
                      <th 
                        className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"
                        onClick={() => handleSort('gross')}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Gross Earnings</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>

                      {/* Net Payable */}
                      <th 
                        className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"
                        onClick={() => handleSort('netPay')}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Net Payable</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>

                      {/* Actions */}
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {paginatedEmployees.map((emp, idx) => {
                      const rowKey = emp.recordKey || `${emp.id}_${emp.payPeriod}_${idx}`;
                      const isSelected = selectedEmployeeIds.has(emp.id);
                      const initials = emp.name
                        .split(' ')
                        .map((n) => n[0])
                        .filter(Boolean)
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || 'PC';

                      const locationText = emp.location || emp.branch || '—';
                      const designationText = emp.designation || '—';

                      return (
                        <tr 
                          key={rowKey} 
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? 'bg-emerald-50/40' : ''
                          }`}
                        >
                          {/* Row Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelectEmployee(emp.id)}
                              className="p-1 hover:text-slate-800 text-slate-400 cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                          </td>

                          {/* Employee Info */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#0f2744] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                {initials}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 leading-tight">
                                  {emp.name}
                                </div>
                                <div className="font-mono text-[10.5px] text-slate-500 mt-0.5 font-medium">
                                  {emp.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Designation & Department */}
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-800 text-[11px]">
                              {designationText}
                            </div>
                            {emp.department && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                {emp.department}
                              </span>
                            )}
                          </td>

                          {/* Location */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 text-slate-700 text-[11px]">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{locationText}</span>
                            </div>
                          </td>

                          {/* Paid Days */}
                          <td className="py-3 px-3">
                            <span className="font-mono font-medium text-slate-700">
                              {emp.paidDays !== null && emp.paidDays !== undefined ? `${emp.paidDays} Days` : '—'}
                            </span>
                          </td>

                          {/* Gross Earnings */}
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono text-slate-600 text-xs">
                              {formatIndianCurrency(emp.grossEarnings)}
                            </span>
                          </td>

                          {/* Net Payable */}
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono font-bold text-emerald-700 text-xs">
                              {formatIndianCurrency(emp.calculatedNetPayable)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setInspectEmployee(emp)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 rounded-md border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                                title="View Payslip Preview"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>Preview</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await downloadIndividualPayslipPdf(emp, settings, template);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                                title="Download PDF Payslip"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. Scalable Enterprise Pagination Footer */}
            {totalEmployees > 0 && (
              <div className="p-3.5 sm:p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div>
                  Showing <strong className="text-slate-900 font-mono">{startIndex + 1}</strong> to{' '}
                  <strong className="text-slate-900 font-mono">
                    {isAllPages ? totalEmployees : Math.min(startIndex + pageSize, totalEmployees)}
                  </strong> of{' '}
                  <strong className="text-slate-900 font-mono">{totalEmployees}</strong> employees
                  {filteredEmployees.length !== activeBatch?.employees.length && (
                    <span className="text-slate-400 ml-1">
                      (filtered from {activeBatch?.employees.length})
                    </span>
                  )}
                </div>

                {!isAllPages && totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="First Page"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                    </button>

                    <div className="px-3 py-1 font-mono text-xs font-semibold text-slate-800 bg-white rounded border border-slate-200">
                      {currentPage} / {totalPages}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Next Page"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Last Page"
                    >
                      <ChevronsRight className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. High-Resolution Payslip Preview Modal */}
      {inspectEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-100 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 bg-white border-b border-slate-200 rounded-t-xl flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Payslip Preview: {inspectEmployee.id} - {inspectEmployee.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectEmployee.payPeriod} • Form T Statutory Wages Slip
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await downloadIndividualPayslipPdf(inspectEmployee, settings, template);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectEmployee(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              <PayslipPreview employee={inspectEmployee} settings={settings} template={template} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
