import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  UserCheck, 
  KeyRound, 
  Trash2, 
  Check, 
  Copy, 
  AlertCircle, 
  X,
  Search,
  RefreshCw,
  Power,
  Sparkles
} from 'lucide-react';
import { UserProfile, AppRole } from '../types';
import { 
  listTeamMembers, 
  createTeamMember, 
  adminResetPassword, 
  adminToggleUserStatus, 
  adminDeleteUser 
} from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let pwd = 'Pioneer@';
  for (let i = 0; i < 6; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

function getInitials(name: string): string {
  if (!name) return 'HR';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

export const UserManagementView: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create User Modal State & Scoped Modal Error
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalError, setCreateModalError] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createRole, setCreateRole] = useState<AppRole>('operator');
  const [createPassword, setCreatePassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);

  // Account Created Success Modal (Displays credentials to hand over)
  const [createdSuccessData, setCreatedSuccessData] = useState<{
    fullName: string;
    email: string;
    role: AppRole;
    password: string;
  } | null>(null);
  const [copiedSuccessCredentials, setCopiedSuccessCredentials] = useState(false);

  // Reset Password Modal State & Scoped Modal Error
  const [resetTargetUser, setResetTargetUser] = useState<UserProfile | null>(null);
  const [resetModalError, setResetModalError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [copiedResetPwd, setCopiedResetPwd] = useState(false);

  // Delete Confirm Modal State
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserProfile | null>(null);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const list = await listTeamMembers();
      setMembers(list);
    } catch (err: any) {
      console.warn('Load members error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleCopy = (text: string, isReset = false) => {
    navigator.clipboard.writeText(text);
    if (isReset) {
      setCopiedResetPwd(true);
      setTimeout(() => setCopiedResetPwd(false), 2000);
    } else {
      setCopiedPwd(true);
      setTimeout(() => setCopiedPwd(false), 2000);
    }
  };

  const handleCopyAllCredentials = () => {
    if (!createdSuccessData) return;
    const text = `PIONEER CORPORATION - HR PORTAL ACCESS CREDENTIALS\nName: ${createdSuccessData.fullName}\nOfficial Login ID: ${createdSuccessData.email}\nInitial Password: ${createdSuccessData.password}\nRole: ${createdSuccessData.role === 'admin' ? 'HR Administrator' : 'Payroll Operator'}\nPortal URL: http://127.0.0.1:5173/`;
    navigator.clipboard.writeText(text);
    setCopiedSuccessCredentials(true);
    setTimeout(() => setCopiedSuccessCredentials(false), 2500);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateModalError(null);

    if (!createName.trim()) {
      setCreateModalError('Please enter the employee full name.');
      return;
    }
    if (!createEmail.includes('@')) {
      setCreateModalError('Email must contain an @ character (e.g. name@pioneer or rahul@gmail.com).');
      return;
    }
    if (!createPassword.trim()) {
      setCreateModalError('Please enter an initial password or click "Generate Secure Password".');
      return;
    }
    if (createPassword.length < 8) {
      setCreateModalError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      const newMember = await createTeamMember(
        createEmail,
        createPassword,
        createName,
        createRole
      );

      // Record credentials for handover popup
      setCreatedSuccessData({
        fullName: newMember.fullName,
        email: newMember.email,
        role: newMember.role,
        password: createPassword,
      });

      setShowCreateModal(false);
      setCreateModalError(null);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      await loadMembers();
    } catch (err: any) {
      setCreateModalError(err?.message || 'Failed to create user account. Please check your network or server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetModalError(null);

    if (!resetTargetUser) return;
    if (!newPassword.trim()) {
      setResetModalError('Please enter a new password or click "Generate Secure Password".');
      return;
    }
    if (newPassword.length < 8) {
      setResetModalError('Password must be at least 8 characters long.');
      return;
    }

    setIsResetting(true);

    try {
      await adminResetPassword(resetTargetUser.id, newPassword);
      setSuccessMsg(`Password for ${resetTargetUser.fullName} updated successfully!`);
      setResetTargetUser(null);
      setResetModalError(null);
      setNewPassword('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setResetModalError(err?.message || 'Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleStatus = async (member: UserProfile) => {
    if (member.id === currentAdmin?.id) {
      setErrorMsg('You cannot deactivate your own Super Admin account.');
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    const nextStatus = !member.isActive;
    try {
      await adminToggleUserStatus(member.id, nextStatus);
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, isActive: nextStatus } : m))
      );
      setSuccessMsg(`Status for ${member.fullName} updated to ${nextStatus ? 'Active' : 'Disabled'}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg('Failed to update user status.');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    if (deleteTargetUser.id === currentAdmin?.id) {
      setErrorMsg('You cannot delete your own Super Admin account.');
      setDeleteTargetUser(null);
      return;
    }

    try {
      await adminDeleteUser(deleteTargetUser.id);
      setMembers((prev) => prev.filter((m) => m.id !== deleteTargetUser.id));
      setSuccessMsg(`User ${deleteTargetUser.fullName} has been removed.`);
      setDeleteTargetUser(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg('Failed to delete user.');
    }
  };

  const filtered = members.filter((m) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.fullName.toLowerCase().includes(term) ||
      m.email.toLowerCase().includes(term) ||
      m.role.toLowerCase().includes(term)
    );
  });

  const totalMembers = members.length;
  const adminCount = members.filter((m) => m.role === 'admin').length;
  const operatorCount = members.filter((m) => m.role === 'operator').length;

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-7 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold border border-emerald-500/30 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Admin-Controlled Access Control</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Team & Access Management
          </h2>
          <p className="text-slate-300 text-xs mt-1 max-w-xl">
            Create employee login accounts, assign roles, and manage 1-click password resets for authorized Pioneer HR staff.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setCreateName('');
              setCreateEmail('');
              setCreatePassword('');
              setErrorMsg(null);
              setCreateModalError(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center justify-between animate-in fade-in">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium flex items-center justify-between animate-in fade-in">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center text-xs font-medium text-slate-500">
            <span>Total Team Members</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">{totalMembers}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Authorized HR accounts</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center text-xs font-medium text-slate-500">
            <span>HR Administrators</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2 font-mono">{adminCount}</div>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">Full administrative privileges</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center text-xs font-medium text-slate-500">
            <span>Payroll Operators</span>
            <UserCheck className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2 font-mono">{operatorCount}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Form T generation & archive access</span>
        </div>
      </div>

      {/* 3. Team Roster Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, email or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button
            type="button"
            onClick={loadMembers}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 rounded border border-slate-200 transition-colors"
            title="Refresh User List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Roster</span>
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Team Member</th>
                <th className="py-3 px-4">Official Email / Login ID</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No team members found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((member) => {
                  const isCurrent = member.id === currentAdmin?.id;
                  const initials = getInitials(member.fullName);

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Member Name + Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30 shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{member.fullName}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">Pioneer HR Staff</span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {member.email}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        {member.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            HR Administrator
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                            <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                            Payroll Operator
                          </span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(member)}
                          disabled={isCurrent}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                            member.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                          } ${isCurrent ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                          title={isCurrent ? 'Super Admin account is permanently active' : 'Click to Toggle Status'}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${member.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          <span>{member.isActive ? 'Active' : 'Disabled'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setResetTargetUser(member);
                              setNewPassword('');
                              setResetModalError(null);
                              setErrorMsg(null);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                            title="Reset Employee Password"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Reset Password</span>
                          </button>

                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => setDeleteTargetUser(member)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* 4. CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Create New Team Account</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateModalError(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              {/* Modal-Scoped Error Banner */}
              {createModalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block">Cannot Create Account</span>
                    <span className="leading-relaxed text-[11px]">{createModalError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateModalError(null)}
                    className="text-red-400 hover:text-red-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Employee Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={createName}
                  onChange={(e) => {
                    setCreateName(e.target.value);
                    if (createModalError) setCreateModalError(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Official Email or Username (Relaxed: just needs @)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. rahul@gmail.com or rahul@pioneer"
                  value={createEmail}
                  onChange={(e) => {
                    setCreateEmail(e.target.value);
                    if (createModalError) setCreateModalError(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <span className="text-[11px] text-slate-400">
                  Instant activation: no email confirmation link required.
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">System Role</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as AppRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="operator">Payroll Operator (Standard Payroll Access)</option>
                  <option value="admin">HR Administrator (Full Admin & Account Access)</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-slate-700 block">Initial Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatePassword(generateRandomPassword());
                      if (createModalError) setCreateModalError(null);
                    }}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{createPassword ? 'Regenerate' : 'Generate Secure Password'}</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    required
                    placeholder="Enter custom password or click 'Generate Secure Password'"
                    value={createPassword}
                    onChange={(e) => {
                      setCreatePassword(e.target.value);
                      if (createModalError) setCreateModalError(null);
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md font-mono text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                  />
                  {createPassword && (
                    <button
                      type="button"
                      onClick={() => handleCopy(createPassword)}
                      className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Copy Password"
                    >
                      {copiedPwd ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPwd ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateModalError(null);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create & Activate Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4B. ACCOUNT CREATED SUCCESS / CREDENTIALS HANDOVER POPUP MODAL */}
      {createdSuccessData && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-emerald-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-200" />
                <h3 className="text-sm font-bold">Account Created & Ready to Use</h3>
              </div>
              <button
                type="button"
                onClick={() => setCreatedSuccessData(null)}
                className="text-emerald-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                The account for <strong className="text-slate-900">{createdSuccessData.fullName}</strong> is now active. You can hand over these login credentials directly to the employee:
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                  <span className="text-slate-500">Employee Name:</span>
                  <span className="font-bold text-slate-900">{createdSuccessData.fullName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                  <span className="text-slate-500">Login ID / Email:</span>
                  <span className="font-mono font-bold text-slate-900">{createdSuccessData.email}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                  <span className="text-slate-500">Initial Password:</span>
                  <span className="font-mono font-bold text-emerald-700">{createdSuccessData.password}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Role & Access:</span>
                  <span className="font-semibold text-slate-800">
                    {createdSuccessData.role === 'admin' ? 'HR Administrator' : 'Payroll Operator'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleCopyAllCredentials}
                  className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedSuccessCredentials ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Copied Credentials!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-emerald-700" />
                      <span>Copy Full Credentials</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCreatedSuccessData(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. RESET PASSWORD MODAL */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Reset Password: {resetTargetUser.fullName}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetTargetUser(null);
                  setResetModalError(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4 text-xs">
              {/* Modal-Scoped Error Banner */}
              {resetModalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block">Password Reset Failed</span>
                    <span className="leading-relaxed text-[11px]">{resetModalError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetModalError(null)}
                    className="text-red-400 hover:text-red-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <p className="text-slate-600">
                Set a new password for <strong className="text-slate-900">{resetTargetUser.email}</strong>. Once saved, they can immediately sign in using this new password.
              </p>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-slate-700 block">New Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewPassword(generateRandomPassword());
                      if (resetModalError) setResetModalError(null);
                    }}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{newPassword ? 'Regenerate' : 'Generate Secure Password'}</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    required
                    placeholder="Enter new password or click 'Generate Secure Password'"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (resetModalError) setResetModalError(null);
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md font-mono text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                  />
                  {newPassword && (
                    <button
                      type="button"
                      onClick={() => handleCopy(newPassword, true)}
                      className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Copy Password"
                    >
                      {copiedResetPwd ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedResetPwd ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetTargetUser(null);
                    setResetModalError(null);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isResetting ? 'Saving...' : 'Set & Issue New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE USER CONFIRM MODAL */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900">Delete User Account?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete the account for{' '}
              <strong className="text-slate-900">{deleteTargetUser.fullName}</strong> ({deleteTargetUser.email})? They will immediately lose access to the Pioneer Payroll portal.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
