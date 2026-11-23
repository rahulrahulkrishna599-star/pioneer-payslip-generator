import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowRight, 
  ArrowLeft,
  Eye, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle,
  FileCheck,
  Edit3,
  X,
  Save,
  Plus,
  Trash2,
  Check
} from 'lucide-react';
import { EmployeeRecord } from '../types';
import { formatIndianCurrency } from '../utils/numberToWords';

interface ReviewStepProps {
  employees: EmployeeRecord[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onPreviewEmployee: (emp: EmployeeRecord) => void;
  onProceedToPreview: () => void;
  onBackToMapping?: () => void;
  onBackToUpload?: () => void;
  onUpdateEmployee?: (emp: EmployeeRecord) => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  employees,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onPreviewEmployee,
  onProceedToPreview,
  onBackToMapping,
  onBackToUpload,
  onUpdateEmployee,
}) => {
  const handleBackToUpload = onBackToUpload || onBackToMapping;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'warning' | 'error'>('all');
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'net'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activeIssueModal, setActiveIssueModal] = useState<EmployeeRecord | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState<boolean>(false);

  const handleCancelClick = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      setEditingEmployee(null);
      setIsDirty(false);
      setShowDiscardConfirm(false);
      setShowSaveConfirm(false);
    }
  };

  const handleSaveClick = () => {
    setShowSaveConfirm(true);
  };

  const filteredEmployees = useMemo(() => {
    return employees
      .filter((emp) => {
        // Search filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchId = emp.id.toLowerCase().includes(term);
          const matchName = emp.name.toLowerCase().includes(term);
          const matchDesig = emp.designation.toLowerCase().includes(term);
          if (!matchId && !matchName && !matchDesig) return false;
        }

        // Status filter
        if (statusFilter !== 'all' && emp.validationStatus !== statusFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'id') {
          cmp = a.id.localeCompare(b.id, undefined, { numeric: true });
        } else if (sortBy === 'name') {
          cmp = a.name.localeCompare(b.name);
        } else if (sortBy === 'net') {
          cmp = a.calculatedNetPayable - b.calculatedNetPayable;
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [employees, searchTerm, statusFilter, sortBy, sortOrder]);

  const readyCount = employees.filter((e) => e.validationStatus === 'ready').length;
  const warningCount = employees.filter((e) => e.validationStatus === 'warning').length;
  const errorCount = employees.filter((e) => e.validationStatus === 'error').length;

  const validSelectedCount = employees.filter(
    (e) => selectedIds.has(e.id) && e.validationStatus !== 'error'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Employee Data Review & Validation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review parsed records, resolve any flags, and select employees for payslip generation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBackToUpload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 rounded border border-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Upload Another File
            </button>
            <button
              type="button"
              onClick={onProceedToPreview}
              disabled={validSelectedCount === 0}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md shadow-xs transition-colors ${
                validSelectedCount === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <span>Preview & Generate ({validSelectedCount})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ID, name or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({employees.length})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-white border border-slate-200 rounded px-2 py-1 font-medium text-slate-800 focus:outline-none"
            >
              <option value="id">Employee ID</option>
              <option value="name">Name</option>
              <option value="net">Net Payable</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-mono text-xs"
              title="Toggle Ascending / Descending"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="select-all"
              checked={selectedIds.size === employees.length && employees.length > 0}
              onChange={onToggleSelectAll}
              className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="select-all" className="font-semibold text-slate-700 cursor-pointer">
              Select All ({selectedIds.size} / {employees.length} selected)
            </label>
          </div>
          <div className="text-slate-400">
            Showing {filteredEmployees.length} of {employees.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-8"></th>
                <th className="py-2.5 px-3">Emp ID</th>
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3">Designation</th>
                <th className="py-2.5 px-3 text-right">Gross Earnings</th>
                <th className="py-2.5 px-3 text-right">Total Deductions</th>
                <th className="py-2.5 px-3 text-right">Net Payable</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No employee records match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedIds.has(emp.id);
                  const isError = emp.validationStatus === 'error';
                  const isWarning = emp.validationStatus === 'warning';

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-emerald-50/20' : ''
                      } ${isError ? 'bg-red-50/30' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isError}
                          onChange={() => onToggleSelect(emp.id)}
                          className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-30"
                        />
                      </td>

                      {/* ID */}
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                        {emp.id}
                      </td>

                      {/* Name */}
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {emp.name}
                      </td>

                      {/* Designation */}
                      <td className="py-2.5 px-3 text-slate-500">
                        {emp.designation}
                      </td>

                      {/* Gross */}
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        {formatIndianCurrency(emp.grossEarnings)}
                      </td>

                      {/* Deductions */}
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        {formatIndianCurrency(emp.totalDeductions)}
                      </td>

                      {/* Net Payable */}
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatIndianCurrency(emp.calculatedNetPayable)}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onPreviewEmployee(emp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors"
                            title="Preview Payslip"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Preview</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation Issue Modal */}
      {activeIssueModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Validation Details: {activeIssueModal.id}
                </h3>
                <p className="text-xs text-slate-500">{activeIssueModal.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveIssueModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {activeIssueModal.validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800 space-y-1">
                <div className="font-bold flex items-center gap-1 text-red-700">
                  <AlertCircle className="w-4 h-4" /> Errors (Blocking generation):
                </div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {activeIssueModal.validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {activeIssueModal.validationWarnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1 text-amber-700">
                  <AlertTriangle className="w-4 h-4" /> Warnings (Review recommended):
                </div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {activeIssueModal.validationWarnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveIssueModal(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Adjust Payslip Modal */}
      {editingEmployee && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={handleCancelClick}
        >
          <div
            className="relative bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-600" />
                  Adjust Payslip: {editingEmployee.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: {editingEmployee.id} • Pay Period: {editingEmployee.payPeriod}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelClick}
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Attendance & Roles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Paid Days
                </label>
                <input
                  type="number"
                  value={editingEmployee.paidDays}
                  onChange={(e) => {
                    setIsDirty(true);
                    setEditingEmployee({ ...editingEmployee, paidDays: Number(e.target.value) || 0 });
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  LOP Days
                </label>
                <input
                  type="number"
                  value={editingEmployee.lopDays}
                  onChange={(e) => {
                    setIsDirty(true);
                    setEditingEmployee({ ...editingEmployee, lopDays: Number(e.target.value) || 0 });
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  value={editingEmployee.designation}
                  onChange={(e) => {
                    setIsDirty(true);
                    setEditingEmployee({ ...editingEmployee, designation: e.target.value });
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={editingEmployee.department || ''}
                  onChange={(e) => {
                    setIsDirty(true);
                    setEditingEmployee({ ...editingEmployee, department: e.target.value });
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900"
                />
              </div>
            </div>

            {/* Earnings & Deductions Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Earnings */}
              <div className="border border-slate-200 rounded-lg p-3.5 space-y-2.5 bg-white flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex justify-between text-[11px] uppercase tracking-wide">
                    <span>Earnings Component</span>
                    <span>Amount (₹)</span>
                  </div>

                  {/* Form T Standard Earnings */}
                  {[
                    { label: 'Basic', key: 'basic' as const },
                    { label: 'House Rent Allowance (HRA)', key: 'hra' as const },
                    { label: 'Washing Allowance', key: 'washingAllowance' as const },
                    { label: 'Incentive', key: 'incentive' as const },
                    { label: 'Other Allowance', key: 'otherAllowance' as const },
                    { label: 'Previous Month', key: 'previousMonth' as const },
                  ].map(({ label, key }) => {
                    const tier = editingEmployee[key];
                    return (
                      <div key={key} className="flex items-center justify-between gap-2 py-0.5">
                        <span className="text-slate-700 text-xs font-medium">{label}</span>
                        <input
                          type="number"
                          value={tier?.earned ?? 0}
                          onChange={(e) => {
                            setIsDirty(true);
                            const val = Number(e.target.value) || 0;
                            const updatedTier = {
                              fixed: tier?.fixed ?? val,
                              earned: val,
                              arrears: tier?.arrears ?? 0,
                              total: Math.round((val + (tier?.arrears ?? 0)) * 100) / 100,
                            };
                            const next = { ...editingEmployee, [key]: updatedTier };
                            const addGross = (next.additionalEarnings || []).reduce(
                              (s, item) => s + (Number(item.total || item.earned) || 0),
                              0
                            );
                            const gross =
                              (next.basic?.total ?? 0) +
                              (next.hra?.total ?? 0) +
                              (next.washingAllowance?.total ?? 0) +
                              (next.incentive?.total ?? 0) +
                              (next.otherAllowance?.total ?? 0) +
                              (next.previousMonth?.total ?? 0) +
                              addGross;
                            next.grossEarnings = Math.round(gross * 100) / 100;
                            next.calculatedNetPayable = Math.round((next.grossEarnings - next.totalDeductions) * 100) / 100;
                            setEditingEmployee(next);
                          }}
                          className="w-28 text-right font-mono px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:border-emerald-500"
                        />
                      </div>
                    );
                  })}

                  {/* Custom Additional Earnings */}
                  {(editingEmployee.additionalEarnings || []).map((item, idx) => {
                    const isConfirmed = Boolean((item as any).confirmed);
                    return (
                      <div
                        key={`custom_earn_${idx}`}
                        className={`flex items-center justify-between gap-2 p-1.5 rounded border transition-all ${
                          isConfirmed
                            ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/30'
                            : 'bg-emerald-50/40 border-emerald-100'
                        }`}
                      >
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            setIsDirty(true);
                            const updated = [...(editingEmployee.additionalEarnings || [])];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setEditingEmployee({ ...editingEmployee, additionalEarnings: updated });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              setIsDirty(true);
                              const updated = [...(editingEmployee.additionalEarnings || [])];
                              (updated[idx] as any).confirmed = true;
                              setEditingEmployee({ ...editingEmployee, additionalEarnings: updated });
                            }
                          }}
                          placeholder="Earning Name"
                          className="flex-1 min-w-0 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
                        />
                        <input
                          type="number"
                          value={item.total ?? item.earned ?? item.amount ?? 0}
                          onChange={(e) => {
                            setIsDirty(true);
                            const val = Number(e.target.value) || 0;
                            const updated = [...(editingEmployee.additionalEarnings || [])];
                            updated[idx] = { ...updated[idx], fixed: val, earned: val, arrears: 0, total: val, amount: val };
                            const next = { ...editingEmployee, additionalEarnings: updated };
                            const addGross = updated.reduce((s, it) => s + (Number(it.total ?? it.earned ?? it.amount) || 0), 0);
                            const gross =
                              (next.basic?.total ?? 0) +
                              (next.hra?.total ?? 0) +
                              (next.washingAllowance?.total ?? 0) +
                              (next.incentive?.total ?? 0) +
                              (next.otherAllowance?.total ?? 0) +
                              (next.previousMonth?.total ?? 0) +
                              addGross;
                            next.grossEarnings = Math.round(gross * 100) / 100;
                            next.calculatedNetPayable = Math.round((next.grossEarnings - next.totalDeductions) * 100) / 100;
                            setEditingEmployee(next);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              setIsDirty(true);
                              const updated = [...(editingEmployee.additionalEarnings || [])];
                              (updated[idx] as any).confirmed = true;
                              setEditingEmployee({ ...editingEmployee, additionalEarnings: updated });
                            }
                          }}
                          placeholder="Amount"
                          className="w-24 text-right font-mono px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:border-emerald-500"
                        />
                        {/* Tick mark confirmation button */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsDirty(true);
                            const updated = [...(editingEmployee.additionalEarnings || [])];
                            (updated[idx] as any).confirmed = !isConfirmed;
                            setEditingEmployee({ ...editingEmployee, additionalEarnings: updated });
                          }}
                          className={`p-1.5 rounded border transition-all flex items-center justify-center shrink-0 ${
                            isConfirmed
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-emerald-600 hover:bg-emerald-50 border-emerald-300'
                          }`}
                          title={isConfirmed ? 'Field confirmed ✓ (Click to edit)' : 'Click to confirm this field'}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsDirty(true);
                            const updated = (editingEmployee.additionalEarnings || []).filter((_, i) => i !== idx);
                            const next = { ...editingEmployee, additionalEarnings: updated };
                            const addGross = updated.reduce((s, it) => s + (Number(it.total ?? it.earned ?? it.amount) || 0), 0);
                            const gross =
                              (next.basic?.total ?? 0) +
                              (next.hra?.total ?? 0) +
                              (next.washingAllowance?.total ?? 0) +
                              (next.incentive?.total ?? 0) +
                              (next.otherAllowance?.total ?? 0) +
                              (next.previousMonth?.total ?? 0) +
                              addGross;
                            next.grossEarnings = Math.round(gross * 100) / 100;
                            next.calculatedNetPayable = Math.round((next.grossEarnings - next.totalDeductions) * 100) / 100;
                            setEditingEmployee(next);
                          }}
                          className="text-slate-400 hover:text-red-500 p-1 shrink-0"
                          title="Remove earning field"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* + Add Earning Field Button */}
                <div className="pt-2 border-t border-slate-100 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDirty(true);
                      const current = editingEmployee.additionalEarnings || [];
                      const updated = [...current, { name: `Custom Earning ${current.length + 1}`, fixed: 0, earned: 0, arrears: 0, total: 0, amount: 0 }];
                      setEditingEmployee({ ...editingEmployee, additionalEarnings: updated });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors w-full justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Earning Field</span>
                  </button>
                </div>
              </div>

              {/* Deductions */}
              <div className="border border-slate-200 rounded-lg p-3.5 space-y-2.5 bg-white flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex justify-between text-[11px] uppercase tracking-wide">
                    <span>Deduction Component</span>
                    <span>Amount (₹)</span>
                  </div>

                  {/* Form T Standard Deductions */}
                  {[
                    { label: 'Provident Fund (PF)', key: 'providentFund' as const },
                    { label: 'ESI', key: 'esi' as const },
                    { label: 'Income Tax (TDS)', key: 'tds' as const },
                    { label: 'Professional Tax', key: 'professionalTax' as const },
                    { label: 'Other Deduction', key: 'otherDeduction' as const },
                  ].map(({ label, key }) => (
                    <div key={key} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="text-slate-700 text-xs font-medium">{label}</span>
                      <input
                        type="number"
                        value={editingEmployee[key] || 0}
                        onChange={(e) => {
                          setIsDirty(true);
                          const val = Number(e.target.value) || 0;
                          const next = { ...editingEmployee, [key]: val };
                          const addDed = (next.additionalDeductions || []).reduce(
                            (s, item) => s + (Number(item.amount) || 0),
                            0
                          );
                          const ded =
                            (Number(next.providentFund) || 0) +
                            (Number(next.esi) || 0) +
                            (Number(next.tds) || 0) +
                            (Number(next.professionalTax) || 0) +
                            (Number(next.otherDeduction) || 0) +
                            addDed;
                          next.totalDeductions = Math.round(ded * 100) / 100;
                          next.calculatedNetPayable = Math.round((next.grossEarnings - next.totalDeductions) * 100) / 100;
                          setEditingEmployee(next);
                        }}
                        className="w-28 text-right font-mono px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:border-emerald-500"
                      />
                    </div>
                  ))}

                  {/* Custom Additional Deductions */}
                  {(editingEmployee.additionalDeductions || []).map((item, idx) => {
                    const isConfirmed = Boolean((item as any).confirmed);
                    return (
                      <div
                        key={`custom_ded_${idx}`}
                        className={`flex items-center justify-between gap-2 p-1.5 rounded border transition-all ${
                          isConfirmed
                            ? 'bg-red-50/70 border-red-300 ring-1 ring-red-400/30'
                            : 'bg-red-50/40 border-red-100'
                        }`}
                      >
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            setIsDirty(true);
                            const updated = [...(editingEmployee.additionalDeductions || [])];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setEditingEmployee({ ...editingEmployee, additionalDeductions: updated });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              setIsDirty(true);
                              const updated = [...(editingEmployee.additionalDeductions || [])];
                              (updated[idx] as any).confirmed = true;
                              setEditingEmployee({ ...editingEmployee, additionalDeductions: updated });
                            }
                          }}
                          placeholder="Deduction Name"
                          className="flex-1 min-w-0 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
                        />
                        <input
                          type="number"
                          value={item.amount || 0}
                          onChange={(e) => {
                            setIsDirty(true);
                            const val = Number(e.target.value) || 0;
                            const updated = [...(editingEmployee.additionalDeductions || [])];
                            updated[idx] = { ...updated[idx], amount: val };
                            const next = { ...editingEmployee, additionalDeductions: updated };
                            const addDed = updated.reduce((s, it) => s + (Number(it.amount) || 0), 0);
                            const ded =
                              (Number(next.providentFund) || 0) +
                              (Number(next.esi) || 0) +
                              (Number(next.tds) || 0) +
                              (Number(next.professionalTax) || 0) +
                              (Number(next.otherDeduction) || 0) +
                              (Number(next.advance) || 0) +
                              (Number(next.lateFine) || 0) +
                              addDed;
                            next.totalDeductions = Math.round(ded * 100) / 100;
                            next.calculatedNetPayable = Math.round((next.grossEarnings - next.totalDeductions) * 100) / 100;
                            setEditingEmployee(next);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              setIsDirty(true);
                              const updated = [...(editingEmployee.additionalDeductions || [])];
                              (updated[idx] as any).confirmed = true;
                              setEditingEmployee({ ...editingEmployee, additionalDeductions: updated });
                            }
                          }}
                          placeholder="Amount"
                          className="w-24 text-right font-mono px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:border-emerald-500"
                        />
                        {/* Tick mark confirmation button */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsDirty(true);
                            const updated = [...(editingEmployee.additionalDeductions || [])];
                            (updated[idx] as any).confirmed = !isConfirmed;
                            setEditingEmployee({ ...editingEmployee, additionalDeductions: updated });
                          }}
                          className={`p-1.5 rounded border transition-all flex items-center justify-center shrink-0 ${
                            isConfirmed
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-emerald-600 hover:bg-emerald-50 border-emerald-300'
                          }`}
                          title={isConfirmed ? 'Field confirmed ✓ (Click to edit)' : 'Click to confirm this field'}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsDirty(true);
                            const updated = (editingEmployee.additionalDeductions || []).filter((_, i) => i !== idx);
                            const next = { ...editingEmployee, additionalDeductions: updated };
                            const addDed = updated.reduce((s, it) => s + (Number(it.amount) || 0), 0);
                            const ded =
                              (Number(next.providentFund) || 0) +
                              (Number(next.esi) || 0) +
                              (Number(next.tds) || 0) +
                              (Number(next.professionalTax) || 0) +
                              (Number(next.otherDeduction) || 0) +
                              (Number(next.advance) || 0) +
                              (Number(next.lateFine) || 0) +
                              addDed;
                            next.totalDeductions = Math.round(ded * 100) / 100;
                            next.calculatedNetPayable = Math.round((next.grossEarnings - next.totalDeductions) * 100) / 100;
                            setEditingEmployee(next);
                          }}
                          className="text-slate-400 hover:text-red-500 p-1 shrink-0"
                          title="Remove deduction field"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* + Add Deduction Field Button */}
                <div className="pt-2 border-t border-slate-100 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDirty(true);
                      const current = editingEmployee.additionalDeductions || [];
                      const updated = [...current, { name: `Custom Deduction ${current.length + 1}`, amount: 0 }];
                      setEditingEmployee({ ...editingEmployee, additionalDeductions: updated });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors w-full justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Deduction Field</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Recalculated Summary Banner */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Gross Earnings:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatIndianCurrency(editingEmployee.grossEarnings)}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Total Deductions:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatIndianCurrency(editingEmployee.totalDeductions)}
                </span>
              </div>

              <div className="bg-white px-3 py-1.5 rounded-md border border-emerald-300">
                <span className="text-emerald-700 block text-[10px] uppercase font-bold tracking-wider">
                  Recalculated Net Pay:
                </span>
                <span className="font-bold text-emerald-800 text-sm font-mono">
                  {formatIndianCurrency(editingEmployee.calculatedNetPayable)}
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancelClick}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save Adjustments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top-Level: Discard Changes Confirmation Pop-up */}
      {showDiscardConfirm && editingEmployee && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          {/* Full Screen Viewport Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity" 
            onClick={() => setShowDiscardConfirm(false)} 
          />
          
          {/* Centered Confirmation Dialog */}
          <div 
            className="relative z-[101] bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Discard Unsaved Changes?</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  You have unsaved adjustments for <strong>{editingEmployee.name}</strong>. If you cancel, your changes will be discarded.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  setIsDirty(false);
                  setEditingEmployee(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top-Level: Confirm Save Adjustments Pop-up */}
      {showSaveConfirm && editingEmployee && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          {/* Full Screen Viewport Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity" 
            onClick={() => setShowSaveConfirm(false)} 
          />

          {/* Centered Confirmation Dialog */}
          <div 
            className="relative z-[101] bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-slate-900">Confirm Payslip Adjustments</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Are you sure you want to save the updated payslip details for <strong>{editingEmployee.name}</strong> (ID: <span className="font-mono">{editingEmployee.id}</span>)?
                </p>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Gross Earnings:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatIndianCurrency(editingEmployee.grossEarnings)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Deductions:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatIndianCurrency(editingEmployee.totalDeductions)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                <span className="text-emerald-700">Recalculated Net Pay:</span>
                <span className="text-emerald-700 font-mono text-sm">
                  {formatIndianCurrency(editingEmployee.calculatedNetPayable)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSaveConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
              >
                Cancel / Review
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onUpdateEmployee && editingEmployee) {
                    const cleanAddEarn = (editingEmployee.additionalEarnings || []).filter(
                      (item) => item.name.trim().length > 0 || (Number(item.total ?? item.earned ?? item.amount) || 0) > 0
                    );
                    const cleanAddDed = (editingEmployee.additionalDeductions || []).filter(
                      (item) => item.name.trim().length > 0 || (Number(item.amount) || 0) > 0
                    );
                    onUpdateEmployee({
                      ...editingEmployee,
                      additionalEarnings: cleanAddEarn,
                      additionalDeductions: cleanAddDed,
                    });
                  }
                  setShowSaveConfirm(false);
                  setIsDirty(false);
                  setEditingEmployee(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

