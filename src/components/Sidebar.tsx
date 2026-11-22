import React from 'react';
import { 
  FileSpreadsheet, 
  Files, 
  LayoutDashboard,
  Building2,
  LayoutTemplate
} from 'lucide-react';
import { AppTab } from '../types';

interface SidebarProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  activeBatchCount: number;
  templateCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeBatchCount,
  templateCount,
}) => {
  const navItems: { id: AppTab; label: string; icon: React.ReactNode; badge?: number }[] = [
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
      id: 'templates',
      label: 'Templates',
      icon: <LayoutTemplate className="w-4 h-4" />,
      badge: templateCount > 0 ? templateCount : undefined,
    },
    {
      id: 'history',
      label: 'Generated Payslips',
      icon: <Files className="w-4 h-4" />,
      badge: activeBatchCount > 0 ? activeBatchCount : undefined,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col min-h-screen border-r border-slate-800 select-none">
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
      <nav className="p-3 space-y-1 flex-1">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
          Operations
        </div>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-all ${
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
          v1.2.0 • Multi-Template Engine
        </p>
      </div>
    </aside>
  );
};
