import React from 'react';
import { 
  FileSpreadsheet, 
  Files, 
  LayoutDashboard,
  Building2,
  Users
} from 'lucide-react';
import { AppTab } from '../types';

interface SidebarProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  activeBatchCount: number;
  templateCount: number;
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeBatchCount,
  templateCount,
  isAdmin = false,
}) => {
  const operationsNav: { id: AppTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'generate',
      label: 'Generate Payslips',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'history',
      label: 'Generated Payslips',
      icon: <Files className="w-4 h-4" />,
      badge: activeBatchCount > 0 ? activeBatchCount : undefined,
    },
  ];

  const adminNav: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'team',
      label: 'Team & Access',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'templates',
      label: 'Template & Logo',
      icon: <Building2 className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen shrink-0 border-r border-slate-800 select-none sticky top-0 z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-sm">
            P
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide leading-tight">
              PIONEER
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
              Payslip Generator
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-4 flex-1">
        {/* Operations Section */}
        <div className="space-y-1">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1.5">
            Operations
          </div>
          {operationsNav.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="bg-slate-800 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Administration Section (Admin Exclusive) */}
        {isAdmin && (
          <div className="space-y-1 pt-2 border-t border-slate-800/80">
            <div className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider px-3 py-1.5">
              Administration
            </div>
            {adminNav.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-2 text-slate-300 font-medium mb-1">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Pioneer Corporation</span>
        </div>
        <p className="text-[10px] text-slate-400">
          Coimbatore, TN, India
        </p>
        <p className="text-[9px] text-slate-400 mt-2 font-mono">
          v1.2.0 • In-House HR System
        </p>
      </div>
    </aside>
  );
};

