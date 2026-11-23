import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  KeyRound,
  ShieldAlert,
  AlertTriangle,
  X,
  Copy,
  Check,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface DeniedModalState {
  isOpen: boolean;
  type: 'unregistered' | 'disabled' | 'lockout' | 'general';
  title: string;
  message: string;
  identifierAttempted?: string;
  attemptsRemaining?: number;
}

export const LoginPortal: React.FC = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [copiedAdminEmail, setCopiedAdminEmail] = useState(false);

  // Dedicated Access Denied / Edge Case Pop-up Modal State
  const [deniedModal, setDeniedModal] = useState<DeniedModalState | null>(null);

  // Anti-brute force throttling: 5 failed attempts locks for 60s
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);

  const identifierInputRef = useRef<HTMLInputElement>(null);

  // Ensure fields are completely blank on initial mount and prevent browser autofill
  useEffect(() => {
    setIdentifier('');
    setPassword('');
    const timer = setTimeout(() => {
      setIdentifier('');
      setPassword('');
      if (identifierInputRef.current) {
        identifierInputRef.current.value = '';
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let timer: any;
    if (lockoutTime > 0) {
      timer = setInterval(() => {
        setLockoutTime((prev) => {
          if (prev <= 1) {
            if (deniedModal?.type === 'lockout') {
              setDeniedModal(null);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutTime, deniedModal]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleCopyAdminEmail = () => {
    navigator.clipboard.writeText('admin@pioneercorp.in');
    setCopiedAdminEmail(true);
    setTimeout(() => setCopiedAdminEmail(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter both your email/username and password.');
      triggerShake();
      return;
    }

    if (lockoutTime > 0) {
      setDeniedModal({
        isOpen: true,
        type: 'lockout',
        title: 'Security Lockout Enforced',
        message: `Too many unsuccessful authentication attempts. As a protective measure against unauthorized access, this workstation is temporarily locked.`,
        attemptsRemaining: 0,
      });
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await login(identifier, password);
      // Login successful, state transitions via AuthContext
    } catch (err: any) {
      const nextFail = failedAttempts + 1;
      setFailedAttempts(nextFail);
      triggerShake();

      const rawMsg = err?.message || 'Invalid credentials.';
      const isDeactivated = rawMsg.toLowerCase().includes('deactivated') || rawMsg.toLowerCase().includes('suspended');

      if (nextFail >= 5) {
        setLockoutTime(60);
        setErrorMsg('Security lockout: 5 failed attempts. Please wait 60 seconds.');
        setDeniedModal({
          isOpen: true,
          type: 'lockout',
          title: 'Workstation Locked: 5 Failed Attempts',
          message: 'Five consecutive incorrect credentials were entered. Access has been temporarily suspended for 60 seconds to safeguard company data.',
          attemptsRemaining: 0,
        });
      } else if (isDeactivated) {
        setErrorMsg('Your account has been deactivated by the Pioneer HR Administrator.');
        setDeniedModal({
          isOpen: true,
          type: 'disabled',
          title: 'Account Access Deactivated',
          message: 'This HR staff profile has been marked inactive by the Pioneer System Administrator. You cannot sign in at this time.',
          identifierAttempted: identifier.trim(),
        });
      } else {
        const remaining = Math.max(0, 5 - nextFail);
        const userFacingError = 'Invalid email/username or password. Access denied.';
        setErrorMsg(userFacingError);

        // Pop up the dedicated Access Denied modal for unregistered/incorrect account
        setDeniedModal({
          isOpen: true,
          type: 'unregistered',
          title: 'Authentication Failed: Access Denied',
          message: `The credentials entered for "${identifier.trim()}" do not match any authorized Pioneer HR staff account.`,
          identifierAttempted: identifier.trim(),
          attemptsRemaining: remaining,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismissModal = () => {
    setDeniedModal(null);
    setTimeout(() => {
      identifierInputRef.current?.focus();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 font-sans relative">
      <div className={`w-full max-w-md transition-transform duration-150 ${isShaking ? 'animate-bounce' : ''}`}>
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-7 bg-slate-900 text-white text-center relative border-b border-slate-800">
            <h1 className="text-xl font-bold tracking-tight text-white">
              PIONEER CORPORATION
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              HR Payroll & Statutory Form T Management Portal
            </p>

            <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Restricted HR Personnel Only</span>
            </div>
          </div>

          {/* Form Area */}
          <div className="p-6 sm:p-8 space-y-5">
            {/* Error Message Inline Notification */}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="leading-relaxed font-medium block">{errorMsg}</span>
                  {failedAttempts > 0 && failedAttempts < 5 && (
                    <span className="text-[11px] text-red-500 mt-0.5 block">
                      {5 - failedAttempts} attempt(s) remaining before security lockout.
                    </span>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              {/* Invisible decoy inputs to absorb browser password manager autofill */}
              <input
                type="text"
                name="decoy_username"
                tabIndex={-1}
                aria-hidden="true"
                autoComplete="off"
                className="hidden"
              />
              <input
                type="password"
                name="decoy_password"
                tabIndex={-1}
                aria-hidden="true"
                autoComplete="new-password"
                className="hidden"
              />

              {/* Identifier Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Official Email or Username
                </label>
                <div className="relative">
                  <Mail className={`w-4 h-4 absolute left-3 top-3 transition-colors ${errorMsg ? 'text-red-400' : 'text-slate-400'}`} />
                  <input
                    ref={identifierInputRef}
                    type="text"
                    name="pioneer_user_login"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    disabled={isLoading || lockoutTime > 0}
                    placeholder="e.g. admin@pioneercorp.in or rahul@gmail.com"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className={`w-full pl-9 pr-3 py-2.5 text-xs rounded-lg focus:outline-none transition-all ${
                      errorMsg 
                        ? 'bg-red-50/20 border border-red-300 focus:ring-2 focus:ring-red-400 text-slate-900'
                        : 'bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className={`w-4 h-4 absolute left-3 top-3 transition-colors ${errorMsg ? 'text-red-400' : 'text-slate-400'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="pioneer_user_secret"
                    autoComplete="new-password"
                    required
                    disabled={isLoading || lockoutTime > 0}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className={`w-full pl-9 pr-10 py-2.5 text-xs rounded-lg focus:outline-none transition-all ${
                      errorMsg 
                        ? 'bg-red-50/20 border border-red-300 focus:ring-2 focus:ring-red-400 text-slate-900'
                        : 'bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || lockoutTime > 0}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isLoading || lockoutTime > 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                }`}
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </span>
                ) : lockoutTime > 0 ? (
                  <span>Locked ({lockoutTime}s)</span>
                ) : (
                  <>
                    <span>Sign In to Pioneer Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Notice */}
            <div className="pt-2 text-center text-[11px] text-slate-400 leading-relaxed border-t border-slate-100">
              <p>Under Tamil Nadu Shops & Establishments Act, 1948 Form T</p>
              <p className="mt-0.5 text-slate-500 font-medium">Internal Corporate Use Only</p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PRO-GRADE ACCESS DENIED / INCORRECT ACCOUNT POP-UP MODAL
          ========================================================================= */}
      {deniedModal && deniedModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className={`p-5 text-white flex items-center justify-between ${
              deniedModal.type === 'lockout' 
                ? 'bg-red-950 border-b border-red-900' 
                : deniedModal.type === 'disabled'
                ? 'bg-amber-950 border-b border-amber-900'
                : 'bg-slate-900 border-b border-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  deniedModal.type === 'lockout'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : deniedModal.type === 'disabled'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {deniedModal.type === 'lockout' ? (
                    <Lock className="w-5 h-5 text-red-400" />
                  ) : deniedModal.type === 'disabled' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    {deniedModal.title}
                  </h3>
                  <span className="text-[10px] text-slate-300 font-mono">
                    Security Policy: Access Verification
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 space-y-1.5 leading-relaxed">
                <p className="font-semibold">{deniedModal.message}</p>
                {deniedModal.identifierAttempted && (
                  <p className="text-[11px] text-red-700 font-mono bg-red-100/60 px-2 py-1 rounded inline-block">
                    Attempted ID: <strong>{deniedModal.identifierAttempted}</strong>
                  </p>
                )}
              </div>

              {/* Security Context / Explanatory Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-slate-600">
                    <p className="font-semibold text-slate-800">
                      Why are you seeing this alert?
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      For corporate compliance and security, Pioneer Payroll accounts are strictly provisioned by the HR Administration team. Self-registration is permanently disabled.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      Authorized HR Admin:
                    </span>
                    <span className="font-mono text-slate-700 block font-bold">admin@pioneercorp.in</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAdminEmail}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    {copiedAdminEmail ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied Email</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Admin Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Attempt Counter Warning */}
              {deniedModal.type === 'lockout' ? (
                <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-900 text-center font-bold">
                  Lockout active: Please wait {lockoutTime} seconds before retry.
                </div>
              ) : deniedModal.attemptsRemaining !== undefined && (
                <div className="flex items-center justify-between px-3 py-2 bg-slate-100 rounded-lg text-[11px] text-slate-600">
                  <span>Security status:</span>
                  <span className="font-semibold text-slate-800">
                    {deniedModal.attemptsRemaining > 0 
                      ? `${deniedModal.attemptsRemaining} attempt(s) remaining before temporary lockout`
                      : 'Lockout threshold reached'}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleDismissModal}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Re-enter Credentials / Try Again</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Information Modal */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
      />
    </div>
  );
};
