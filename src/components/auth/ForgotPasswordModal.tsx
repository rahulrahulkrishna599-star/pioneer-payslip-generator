import React from 'react';
import { ShieldAlert, X, Mail, Phone, Building2 } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">Pioneer Access Recovery</h3>
              <p className="text-[11px] text-slate-300">Centralized HR Security Policy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-950">
            <p className="font-semibold text-emerald-900 mb-1">
              Account Credentials are Admin-Controlled
            </p>
            <p className="text-[11px] text-emerald-800 leading-normal">
              To guarantee zero-breach security for Pioneer Corporation payroll & Form T financial records, password resets are issued directly by the <strong>HR Super Administrator</strong>.
            </p>
          </div>

          <p>
            If you have forgotten your password or need your login credentials reset:
          </p>

          <div className="space-y-2 border-t border-b border-slate-100 py-3">
            <div className="flex items-center gap-2.5 text-slate-800 font-medium">
              <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Contact HR Admin:</span>
              <a
                href="mailto:admin@pioneercorp.in"
                className="text-emerald-700 hover:underline font-mono font-semibold"
              >
                admin@pioneercorp.in
              </a>
            </div>
            <div className="flex items-center gap-2.5 text-slate-800 font-medium">
              <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Office:</span>
              <span className="text-slate-600">358, Mettupalayam Road, Tatabad, CBE</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            Your Administrator can generate and issue a new password in seconds from the internal Team & Access console.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
