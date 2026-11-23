import React, { useState, useRef, useEffect } from 'react';
import { LogOut, ShieldCheck, UserCheck, ChevronDown, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

function getInitials(name: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'HR';
}

export const UserAvatarPill: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = getInitials(user.fullName, user.email);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Pill Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 pr-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-full shadow-2xs transition-all cursor-pointer group"
      >
        {/* Circular Initials Avatar */}
        <div className="w-8 h-8 rounded-full bg-slate-900 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/40 group-hover:scale-105 transition-transform">
          {initials}
        </div>

        {/* Name & Role */}
        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold text-slate-900 leading-tight">
            {user.fullName}
          </div>
          <div className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
            {isAdmin ? (
              <span className="text-emerald-700">HR Administrator</span>
            ) : (
              <span className="text-slate-500">Payroll Operator</span>
            )}
          </div>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in duration-150">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-900">{user.fullName}</p>
            <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">{user.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {isAdmin ? <ShieldCheck className="w-3 h-3 text-emerald-600" /> : <UserCheck className="w-3 h-3 text-emerald-600" />}
              <span>{isAdmin ? 'Full Super Admin Access' : 'Payroll Operator Access'}</span>
            </div>
          </div>

          <div className="px-4 py-2 text-[11px] text-slate-500 border-b border-slate-100">
            <span className="font-semibold text-slate-700 block">Organization:</span>
            <span>Pioneer Corporation • Coimbatore</span>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
