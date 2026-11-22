import React from 'react';
import { Users, CheckCircle2, AlertTriangle, FileCheck } from 'lucide-react';

interface HeaderStatsProps {
  totalEmployees: number;
  readyToGenerate: number;
  validationIssues: number;
  generatedPayslips: number;
}

export const HeaderStats: React.FC<HeaderStatsProps> = ({
  totalEmployees,
  readyToGenerate,
  validationIssues,
  generatedPayslips,
}) => {
  const cards = [
    {
      label: 'Total Employees',
      value: totalEmployees,
      icon: <Users className="w-4 h-4 text-slate-500" />,
      sub: totalEmployees > 0 ? 'From uploaded payroll' : 'No data loaded',
      color: 'border-slate-200',
    },
    {
      label: 'Ready to Generate',
      value: readyToGenerate,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      sub: readyToGenerate > 0 ? 'Passed all checks' : 'Pending validation',
      color: 'border-slate-200',
      valueColor: readyToGenerate > 0 ? 'text-emerald-700' : 'text-slate-900',
    },
    {
      label: 'Validation Issues',
      value: validationIssues,
      icon: (
        <AlertTriangle
          className={`w-4 h-4 ${
            validationIssues > 0 ? 'text-amber-500' : 'text-slate-400'
          }`}
        />
      ),
      sub: validationIssues > 0 ? 'Review recommended' : 'Zero errors detected',
      color: validationIssues > 0 ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200',
      valueColor: validationIssues > 0 ? 'text-amber-700' : 'text-slate-900',
    },
    {
      label: 'Generated Payslips',
      value: generatedPayslips,
      icon: <FileCheck className="w-4 h-4 text-blue-600" />,
      sub: generatedPayslips > 0 ? 'In current session' : 'None generated yet',
      color: 'border-slate-200',
      valueColor: generatedPayslips > 0 ? 'text-blue-700' : 'text-slate-900',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`bg-white rounded-lg p-4 border shadow-xs transition-all ${card.color}`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{card.label}</span>
            {card.icon}
          </div>
          <div className={`text-2xl font-bold mt-2 ${card.valueColor || 'text-slate-900'}`}>
            {card.value}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {card.sub}
          </div>
        </div>
      ))}
    </div>
  );
};

