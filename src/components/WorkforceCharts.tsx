import React, { useState, useMemo, useEffect } from 'react';
import { 
  MapPin, 
  Briefcase, 
  Users, 
  Filter, 
  PieChart, 
  Search, 
  X, 
  Eye, 
  Download, 
  Building2,
  Calendar,
  CreditCard,
  ChevronRight,
  ArrowUpDown,
  ChevronLeft,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet,
  FileDown,
  Sparkles,
  Layers
} from 'lucide-react';
import { BatchHistoryItem, CompanySettings, EmployeeRecord, PayslipTemplate } from '../types';
import { formatIndianCurrency } from '../utils/numberToWords';
import { downloadIndividualPayslipPdf } from '../utils/pdfGenerator';
import { PIONEER_DEFAULT_SETTINGS } from '../utils/sampleDataGenerator';
import { PayslipPreview } from './PayslipPreview';

interface WorkforceChartsProps {
  batches: BatchHistoryItem[];
  settings?: CompanySettings;
  template?: PayslipTemplate;
  onStartUpload?: () => void;
  isAdmin?: boolean;
}

const PALETTE = [
  '#0f2744', // Pioneer Deep Navy
  '#059669', // Emerald
  '#0284c7', // Sky Blue
  '#d97706', // Amber
  '#7c3aed', // Violet
  '#db2777', // Rose Pink
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
  '#65a30d', // Lime
  '#64748b', // Slate Gray
];

interface SliceData {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface SvgDonutProps {
  data: SliceData[];
  total: number;
  centerTitle?: string;
  centerSubtitle?: string;
  onHoverSlice?: (item: SliceData | null) => void;
  hoveredLabel?: string | null;
  onSelectSlice?: (item: SliceData) => void;
  selectedLabel?: string | null;
}

const SvgDonut: React.FC<SvgDonutProps> = ({
  data,
  total,
  centerTitle,
  centerSubtitle,
  onHoverSlice,
  hoveredLabel,
  onSelectSlice,
  selectedLabel,
}) => {
  const size = 190;
  const center = size / 2;
  const radius = 76;
  const innerRadius = 48;

  if (total === 0 || data.length === 0) {
    return (
      <div className="w-44 h-44 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400 mx-auto">
        No Data
      </div>
    );
  }

  // Calculate arc paths
  let cumulativeAngle = -Math.PI / 2; // start from top (12 o'clock)

  const slices = data.map((item) => {
    const fraction = item.count / total;
    const sliceAngle = fraction * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    cumulativeAngle += sliceAngle;

    // Outer arc points
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    // Inner arc points
    const x3 = center + innerRadius * Math.cos(endAngle);
    const y3 = center + innerRadius * Math.sin(endAngle);
    const x4 = center + innerRadius * Math.cos(startAngle);
    const y4 = center + innerRadius * Math.sin(startAngle);

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

    // Special case: Single item takes full 360 donut
    if (fraction >= 0.999) {
      return {
        path: `M ${center - radius} ${center} A ${radius} ${radius} 0 1 0 ${center + radius} ${center} A ${radius} ${radius} 0 1 0 ${center - radius} ${center} M ${center - innerRadius} ${center} A ${innerRadius} ${innerRadius} 0 1 1 ${center + innerRadius} ${center} A ${innerRadius} ${innerRadius} 0 1 1 ${center - innerRadius} ${center} Z`,
        item,
      };
    }

    const path = `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
      Z
    `;

    return { path, item };
  });

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform transition-transform duration-300"
      >
        {slices.map(({ path, item }, idx) => {
          const isSelected = selectedLabel === item.label;
          const isHovered = hoveredLabel === item.label;
          const isHighlighted = isSelected || isHovered;

          return (
            <path
              key={`slice_${idx}`}
              d={path}
              fill={item.color}
              stroke="#ffffff"
              strokeWidth={isSelected ? '3' : '2'}
              className="cursor-pointer transition-all duration-200"
              style={{
                transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
                transformOrigin: `${center}px ${center}px`,
                filter: isHighlighted ? 'drop-shadow(0 6px 8px rgba(0,0,0,0.2))' : 'none',
                opacity: selectedLabel && !isSelected ? 0.45 : 1,
              }}
              onMouseEnter={() => onHoverSlice?.(item)}
              onMouseLeave={() => onHoverSlice?.(null)}
              onClick={() => onSelectSlice?.(item)}
            />
          );
        })}
      </svg>

      {/* Center Circle Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
        <span className="text-xl font-bold font-mono text-slate-900 leading-tight">
          {centerTitle ?? total}
        </span>
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5 max-w-[80px] truncate">
          {centerSubtitle ?? 'Employees'}
        </span>
      </div>
    </div>
  );
};

export const WorkforceCharts: React.FC<WorkforceChartsProps> = ({ 
  batches,
  settings,
  template,
  onStartUpload,
  isAdmin = false,
}) => {
  const activeSettings = settings || PIONEER_DEFAULT_SETTINGS;

  // Available pay periods from batches (ordered chronologically)
  const availablePeriods = useMemo(() => {
    const list: string[] = [];
    batches.forEach((b) => {
      if (b.payPeriod && !list.includes(b.payPeriod)) {
        list.push(b.payPeriod);
      }
    });
    return list;
  }, [batches]);

  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<{ type: 'location' | 'designation'; value: string } | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<SliceData | null>(null);
  const [hoveredDesignation, setHoveredDesignation] = useState<SliceData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectEmployee, setInspectEmployee] = useState<EmployeeRecord | null>(null);

  // Scalable Table Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortField, setSortField] = useState<'name' | 'id' | 'netPay' | 'paidDays' | 'location'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Legend Search Filters for High-Density Role / Location Lists (e.g. 20+ roles)
  const [roleLegendSearch, setRoleLegendSearch] = useState<string>('');
  const [locationLegendSearch, setLocationLegendSearch] = useState<string>('');
  const [showAllRoles, setShowAllRoles] = useState<boolean>(false);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPeriod, activeFilter, searchQuery, pageSize]);

  // Filter employees according to selected period
  const activeEmployees = useMemo(() => {
    if (batches.length === 0) return [];

    let rawList: EmployeeRecord[] = [];
    if (selectedPeriod === 'all') {
      const empMap = new Map<string, EmployeeRecord>();
      batches.forEach((b) => {
        b.employees.forEach((emp) => {
          if (!empMap.has(emp.id)) {
            empMap.set(emp.id, emp);
          }
        });
      });
      rawList = Array.from(empMap.values());
    } else {
      const matchBatch = batches.find((b) => b.payPeriod === selectedPeriod);
      rawList = matchBatch ? matchBatch.employees : [];
    }

    return rawList;
  }, [batches, selectedPeriod]);

  // Executive Workforce KPI Metrics
  const workforceStats = useMemo(() => {
    const totalEmployees = activeEmployees.length;
    const totalNet = activeEmployees.reduce((sum, e) => sum + e.calculatedNetPayable, 0);
    const totalGross = activeEmployees.reduce((sum, e) => sum + e.grossEarnings, 0);
    const avgNet = totalEmployees > 0 ? Math.round(totalNet / totalEmployees) : 0;
    
    const locationSet = new Set<string>();
    const desigSet = new Set<string>();
    activeEmployees.forEach((e) => {
      const loc = (e.location || e.branch || '').trim();
      if (loc) locationSet.add(loc);
      const des = (e.designation || '').trim();
      if (des) desigSet.add(des);
    });

    return {
      totalEmployees,
      totalNet,
      totalGross,
      avgNet,
      locationCount: locationSet.size,
      designationCount: desigSet.size,
    };
  }, [activeEmployees]);

  // Aggregate by Location (Pareto Scalability: top 5 + "Other Locations" if > 6)
  const locationData: SliceData[] = useMemo(() => {
    if (activeEmployees.length === 0) return [];
    const countMap: Record<string, number> = {};

    activeEmployees.forEach((emp) => {
      const loc = (emp.location || emp.branch || 'Unspecified').trim();
      const normalized = loc ? loc : 'Unspecified';
      countMap[normalized] = (countMap[normalized] || 0) + 1;
    });

    const entries = Object.entries(countMap).sort((a, b) => b[1] - a[1]);
    const total = activeEmployees.length;

    if (entries.length > 6) {
      const top5 = entries.slice(0, 5);
      const remainingCount = entries.slice(5).reduce((sum, e) => sum + e[1], 0);

      const items = top5.map(([label, count], idx) => ({
        label,
        count,
        percentage: Math.round((count / total) * 1000) / 10,
        color: PALETTE[idx % PALETTE.length],
      }));

      items.push({
        label: 'Other Locations',
        count: remainingCount,
        percentage: Math.round((remainingCount / total) * 1000) / 10,
        color: '#64748b',
      });

      return items;
    }

    return entries.map(([label, count], index) => ({
      label,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
      color: PALETTE[index % PALETTE.length],
    }));
  }, [activeEmployees]);

  // Aggregate by Designation (Pareto Scalability: top 5 + "Other Roles" if > 6)
  const allDesignationEntries = useMemo(() => {
    if (activeEmployees.length === 0) return [];
    const countMap: Record<string, number> = {};

    activeEmployees.forEach((emp) => {
      const desig = (emp.designation || 'Unspecified').trim();
      const normalized = desig ? desig : 'Unspecified';
      countMap[normalized] = (countMap[normalized] || 0) + 1;
    });

    const entries = Object.entries(countMap).sort((a, b) => b[1] - a[1]);
    const total = activeEmployees.length;

    return entries.map(([label, count], index) => ({
      label,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
      color: PALETTE[index % PALETTE.length],
    }));
  }, [activeEmployees]);

  const designationData: SliceData[] = useMemo(() => {
    if (allDesignationEntries.length === 0) return [];
    const total = activeEmployees.length;

    if (allDesignationEntries.length > 6) {
      const top5 = allDesignationEntries.slice(0, 5);
      const remainingCount = allDesignationEntries.slice(5).reduce((sum, e) => sum + e.count, 0);

      const items = [...top5];
      items.push({
        label: 'Other Roles',
        count: remainingCount,
        percentage: Math.round((remainingCount / total) * 1000) / 10,
        color: '#64748b',
      });

      return items;
    }

    return allDesignationEntries;
  }, [activeEmployees, allDesignationEntries]);

  // Filtered employees for the Drill-Down Table
  const filteredEmployees = useMemo(() => {
    let list = activeEmployees;

    if (activeFilter) {
      if (activeFilter.type === 'location') {
        if (activeFilter.value === 'Other Locations') {
          const top5 = locationData.slice(0, 5).map((d) => d.label);
          list = list.filter((e) => {
            const loc = (e.location || e.branch || 'Unspecified').trim();
            return !top5.includes(loc);
          });
        } else {
          list = list.filter((e) => {
            const loc = (e.location || e.branch || 'Unspecified').trim();
            return loc === activeFilter.value;
          });
        }
      } else if (activeFilter.type === 'designation') {
        if (activeFilter.value === 'Other Roles') {
          const top5 = designationData.slice(0, 5).map((d) => d.label);
          list = list.filter((e) => {
            const desig = (e.designation || 'Unspecified').trim();
            return !top5.includes(desig);
          });
        } else {
          list = list.filter((e) => {
            const desig = (e.designation || 'Unspecified').trim();
            return desig === activeFilter.value;
          });
        }
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          e.designation.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.branch.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeEmployees, activeFilter, searchQuery, locationData, designationData]);

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
      } else if (sortField === 'netPay') {
        valA = a.calculatedNetPayable;
        valB = b.calculatedNetPayable;
      } else if (sortField === 'paidDays') {
        valA = a.paidDays ?? 0;
        valB = b.paidDays ?? 0;
      } else if (sortField === 'location') {
        valA = (a.location || a.branch || '').toLowerCase();
        valB = (b.location || b.branch || '').toLowerCase();
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

  const handleToggleFilter = (type: 'location' | 'designation', value: string) => {
    if (activeFilter?.type === type && activeFilter.value === value) {
      setActiveFilter(null);
    } else {
      setActiveFilter({ type, value });
    }
  };

  const handleSort = (field: 'name' | 'id' | 'netPay' | 'paidDays' | 'location') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Export filtered directory list to CSV
  const handleExportDirectoryCsv = () => {
    const headers = ['Employee ID', 'Name', 'Designation', 'Department', 'Location', 'Paid Days', 'Net Payable'];
    const rows = filteredEmployees.map((e) => [
      `"${e.id}"`,
      `"${e.name}"`,
      `"${e.designation || ''}"`,
      `"${e.department || ''}"`,
      `"${e.location || e.branch || ''}"`,
      e.paidDays ?? '',
      e.calculatedNetPayable.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pioneer_Workforce_Directory_${selectedPeriod.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (batches.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <Users className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">
          No Payroll Records Yet
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
          Upload an Excel payroll spreadsheet to unlock live workforce demographics, location breakdowns, and role distributions.
        </p>
        {onStartUpload && (
          <button
            type="button"
            onClick={onStartUpload}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Upload Payroll Sheet
          </button>
        )}
      </div>
    );
  }

  // Display list for designations (either Top 5 + Other, or All Roles)
  const displayedDesignations = (showAllRoles ? allDesignationEntries : designationData).filter((d) =>
    roleLegendSearch ? d.label.toLowerCase().includes(roleLegendSearch.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      {/* 1. Scalable Batch & Period Toolbar with Executive KPI Ribbon */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        {/* Header with Period Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0f2744] text-white flex items-center justify-center shrink-0">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Workforce Analytics & Demographic Distribution
              </h3>
              <p className="text-xs text-slate-500">
                {isAdmin
                  ? 'Live demographic breakdown. Tap any donut slice or role pill below to filter the employee directory.'
                  : 'Live demographic breakdown and aggregate workforce statistics.'}
              </p>
            </div>
          </div>

          {/* Period Selector (Scalable for 12 to 50+ batches) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold shrink-0">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Scope:</span>
            </div>

            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setActiveFilter(null);
              }}
              className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900 hover:bg-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs max-w-xs truncate"
            >
              <option value="all">All Accumulated Runs ({workforceStats.totalEmployees} unique staff)</option>
              {availablePeriods.map((period) => {
                const matchCount = batches.find((b) => b.payPeriod === period)?.employees.length || 0;
                return (
                  <option key={period} value={period}>
                    Batch: {period} ({matchCount} staff)
                  </option>
                );
              })}
            </select>

            {/* Quick Pills for 2 most recent runs */}
            {availablePeriods.length > 1 && (
              <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <button
                  type="button"
                  onClick={() => { setSelectedPeriod('all'); setActiveFilter(null); }}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                    selectedPeriod === 'all'
                      ? 'bg-[#0f2744] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Time
                </button>
                {availablePeriods.slice(0, 2).map((period) => {
                  const isSelected = selectedPeriod === period;
                  return (
                    <button
                      key={period}
                      type="button"
                      onClick={() => { setSelectedPeriod(period); setActiveFilter(null); }}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#0f2744] text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {period}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Executive KPI Summary Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/70">
            <div className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
              Active Workforce
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
              {workforceStats.totalEmployees} <span className="text-xs font-sans text-slate-400 font-normal">Staff</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/70">
            <div className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
              Locations & Branches
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
              {workforceStats.locationCount} <span className="text-xs font-sans text-slate-400 font-normal">Active</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/70">
            <div className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
              Distinct Roles
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
              {workforceStats.designationCount} <span className="text-xs font-sans text-slate-400 font-normal">Designations</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200/80">
            <div className="text-[10.5px] font-semibold text-emerald-800 uppercase tracking-wider">
              Net Disbursal
            </div>
            <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5 truncate">
              {formatIndianCurrency(workforceStats.totalNet)}
            </div>
          </div>
        </div>

        {/* 2. Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Chart 1: Location Distribution */}
          <div className="bg-slate-50/60 rounded-xl border border-slate-200/80 p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Employees by Location
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
                {locationData.length} Locations
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
              <div className="shrink-0">
                <SvgDonut
                  data={locationData}
                  total={activeEmployees.length}
                  centerTitle={
                    hoveredLocation
                      ? String(hoveredLocation.count)
                      : activeFilter?.type === 'location'
                      ? String(activeEmployees.filter((e) => (e.location || e.branch || 'Unspecified').trim() === activeFilter.value).length)
                      : String(activeEmployees.length)
                  }
                  centerSubtitle={
                    hoveredLocation
                      ? hoveredLocation.label
                      : activeFilter?.type === 'location'
                      ? activeFilter.value
                      : 'Staff'
                  }
                  onHoverSlice={setHoveredLocation}
                  hoveredLabel={hoveredLocation?.label}
                  onSelectSlice={(item) => handleToggleFilter('location', item.label)}
                  selectedLabel={activeFilter?.type === 'location' ? activeFilter.value : null}
                />
              </div>

              {/* Legend & Clickable Location Pills */}
              <div className="flex-1 w-full space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {locationData.map((item) => {
                  const isSelected = activeFilter?.type === 'location' && activeFilter.value === item.label;
                  const isHovered = hoveredLocation?.label === item.label;

                  return (
                    <div
                      key={item.label}
                      onClick={() => handleToggleFilter('location', item.label)}
                      onMouseEnter={() => setHoveredLocation(item)}
                      onMouseLeave={() => setHoveredLocation(null)}
                      className={`flex flex-col p-2 rounded-lg transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-400 shadow-xs ring-1 ring-emerald-400'
                          : isHovered
                          ? 'bg-white border-slate-300 shadow-xs'
                          : 'bg-white/70 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          ></span>
                          <span className={`truncate text-[11px] ${isSelected ? 'font-bold text-emerald-950' : 'font-medium text-slate-800'}`}>
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                          <span className={`font-bold ${isSelected ? 'text-emerald-700' : 'text-slate-900'}`}>{item.count}</span>
                          <span className="text-slate-400 font-sans text-[10px]">({item.percentage}%)</span>
                          {isAdmin && (
                            <ChevronRight className={`w-3 h-3 transition-transform ${isSelected ? 'rotate-90 text-emerald-600' : 'text-slate-300'}`} />
                          )}
                        </div>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="w-full h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, item.percentage)}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Chart 2: Designation Distribution (Scalable for 30+ roles) */}
          <div className="bg-slate-50/60 rounded-xl border border-slate-200/80 p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-700" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Employees by Designation
                </span>
              </div>
              <div className="flex items-center gap-2">
                {allDesignationEntries.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllRoles(!showAllRoles)}
                    className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                  >
                    {showAllRoles ? 'Show Top 5' : `View All (${allDesignationEntries.length})`}
                  </button>
                )}
                <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
                  {allDesignationEntries.length} Roles
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
              <div className="shrink-0">
                <SvgDonut
                  data={designationData}
                  total={activeEmployees.length}
                  centerTitle={
                    hoveredDesignation
                      ? String(hoveredDesignation.count)
                      : activeFilter?.type === 'designation'
                      ? String(
                          activeFilter.value === 'Other Roles'
                            ? activeEmployees.length - designationData.slice(0, 5).reduce((s, d) => s + d.count, 0)
                            : activeEmployees.filter((e) => (e.designation || 'Unspecified').trim() === activeFilter.value).length
                        )
                      : String(activeEmployees.length)
                  }
                  centerSubtitle={
                    hoveredDesignation
                      ? hoveredDesignation.label
                      : activeFilter?.type === 'designation'
                      ? activeFilter.value
                      : 'Roles'
                  }
                  onHoverSlice={setHoveredDesignation}
                  hoveredLabel={hoveredDesignation?.label}
                  onSelectSlice={(item) => handleToggleFilter('designation', item.label)}
                  selectedLabel={activeFilter?.type === 'designation' ? activeFilter.value : null}
                />
              </div>

              {/* Legend & Clickable Role Pills */}
              <div className="flex-1 w-full space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {/* Mini Search for when there are many roles */}
                {allDesignationEntries.length > 6 && showAllRoles && (
                  <div className="relative mb-2">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={roleLegendSearch}
                      onChange={(e) => setRoleLegendSearch(e.target.value)}
                      placeholder="Filter roles..."
                      className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                )}

                {displayedDesignations.map((item) => {
                  const isSelected = activeFilter?.type === 'designation' && activeFilter.value === item.label;
                  const isHovered = hoveredDesignation?.label === item.label;

                  return (
                    <div
                      key={item.label}
                      onClick={() => handleToggleFilter('designation', item.label)}
                      onMouseEnter={() => setHoveredDesignation(item)}
                      onMouseLeave={() => setHoveredDesignation(null)}
                      className={`flex flex-col p-2 rounded-lg transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-50 border-blue-400 shadow-xs ring-1 ring-blue-400'
                          : isHovered
                          ? 'bg-white border-slate-300 shadow-xs'
                          : 'bg-white/70 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          ></span>
                          <span className={`truncate text-[11px] ${isSelected ? 'font-bold text-blue-950' : 'font-medium text-slate-800'}`} title={item.label}>
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                          <span className={`font-bold ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>{item.count}</span>
                          <span className="text-slate-400 font-sans text-[10px]">({item.percentage}%)</span>
                          {isAdmin && (
                            <ChevronRight className={`w-3 h-3 transition-transform ${isSelected ? 'rotate-90 text-blue-600' : 'text-slate-300'}`} />
                          )}
                        </div>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="w-full h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, item.percentage)}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Scalable Drill-Down Employee Directory Table (Admin Only) */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Controls Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">
                Workforce Directory
              </h4>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                {totalEmployees} Employee{totalEmployees === 1 ? '' : 's'}
              </span>

              {/* Active Filter Pill */}
              {activeFilter && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  <span>
                    {activeFilter.type === 'location' ? '📍 Location:' : '💼 Role:'} {activeFilter.value}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveFilter(null)}
                    className="hover:text-emerald-950 p-0.5 rounded-full hover:bg-emerald-100 cursor-pointer"
                    title="Clear filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {activeFilter
                ? `Filtered by ${activeFilter.type}: ${activeFilter.value}`
                : 'Click any location or designation in the charts above to filter, or search below.'}
            </p>
          </div>

          {/* Search Bar, Export & Page Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, ID, role..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Page Size Dropdown */}
            <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
              <span className="text-[11px] hidden sm:inline">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-semibold cursor-pointer shadow-2xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>All</option>
              </select>
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportDirectoryCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shrink-0 shadow-2xs cursor-pointer"
              title="Export filtered directory to CSV"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {activeFilter && (
              <button
                type="button"
                onClick={() => setActiveFilter(null)}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shrink-0 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Employee Table */}
        {paginatedEmployees.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-400 text-xs">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No matching employees found</p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              {searchQuery ? `No results for "${searchQuery}"` : 'Try selecting another category or resetting the filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Employee</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Designation & Department</th>
                  <th 
                    className="py-3 px-3 cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => handleSort('location')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Location</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-3 cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => handleSort('paidDays')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Paid Days</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => handleSort('netPay')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Net Payable</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {paginatedEmployees.map((emp, idx) => {
                  const rowKey = emp.recordKey || `${emp.id}_${emp.payPeriod}_${idx}`;
                  const locationText = emp.location || emp.branch || '—';
                  const designationText = emp.designation || '—';
                  const initials = emp.name
                    .split(' ')
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'PC';

                  return (
                    <tr key={rowKey} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & ID */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#0f2744] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 leading-tight">
                              {emp.name}
                            </div>
                            <div className="font-mono text-[10.5px] text-slate-500 mt-0.5">
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
                        <span className="font-mono font-semibold text-slate-700">
                          {emp.paidDays !== null && emp.paidDays !== undefined ? `${emp.paidDays} Days` : '—'}
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 rounded border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                            title="Preview Payslip"
                          >
                            <Eye className="w-3 h-3 text-slate-500" />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await downloadIndividualPayslipPdf(emp, activeSettings, template);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                            title="Download Vector PDF"
                          >
                            <Download className="w-3 h-3" />
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

        {/* Scalable Pagination Footer */}
        {totalEmployees > 0 && (
          <div className="p-3.5 sm:p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing <strong className="text-slate-900 font-mono">{startIndex + 1}</strong> to{' '}
              <strong className="text-slate-900 font-mono">
                {isAllPages ? totalEmployees : Math.min(startIndex + pageSize, totalEmployees)}
              </strong> of{' '}
              <strong className="text-slate-900 font-mono">{totalEmployees}</strong> employees
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
      )}

      {/* 4. Individual Inspect Modal (Admin Only) */}
      {isAdmin && inspectEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-100 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 bg-white border-b border-slate-200 rounded-t-xl flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Payslip: {inspectEmployee.id} - {inspectEmployee.name}
                </h3>
                <p className="text-xs text-slate-500">{inspectEmployee.payPeriod}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await downloadIndividualPayslipPdf(inspectEmployee, activeSettings, template);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setInspectEmployee(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
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
