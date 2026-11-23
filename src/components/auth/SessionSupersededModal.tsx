import React from 'react';
import { ShieldAlert, ArrowRight, Laptop, LogIn } from 'lucide-react';

interface SessionSupersededModalProps {
  supersededAt: string | null;
  onDismiss: () => void;
}

export const SessionSupersededModal: React.FC<SessionSupersededModalProps> = ({
  supersededAt,
  onDismiss,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-md w-full shadow-2xl relative overflow-hidden text-white font-sans">
        {/* Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

        <div className="p-6 sm:p-8">
          {/* Header Icon & Status */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 mb-1">
                <Laptop className="w-3 h-3" />
                Concurrent Sign-In Detected
              </span>
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                Session Closed on This Device
              </h2>
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed mb-6">
            <p>
              Your Pioneer HR account was signed into from another browser or device{' '}
              <span className="font-semibold text-amber-300">
                {supersededAt ? `at ${supersededAt}` : 'just now'}
              </span>
              .
            </p>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1.5">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                Why was this session closed?
              </div>
              <p>
                To prevent conflicting attendance uploads, draft overrides, and protect statutory Form T records, only one active device is allowed per account.
              </p>
            </div>
            <p className="text-xs text-slate-400">
              If this was you, you can continue on your other device, or sign in here again to make this browser the active one.
            </p>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={onDismiss}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In on This Device</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-950/40 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500">
            Pioneer Corporation • Statutory Payroll Compliance & Access Control
          </p>
        </div>
      </div>
    </div>
  );
};
