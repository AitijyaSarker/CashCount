import React, { useState } from 'react';
import {
  Wallet,
  Lock,
  Mail,
  User,
  Building,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Key,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { login, verifyMfaLogin, register, demoLogin, error, clearError } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'MFA_CHALLENGE'>('LOGIN');
  const [email, setEmail] = useState('alex.morgan@freelancestudio.io');
  const [password, setPassword] = useState('Freelancer2026!');
  const [fullName, setFullName] = useState('Alex Morgan');
  const [businessName, setBusinessName] = useState('Aitijya Sarker');
  const [taxId, setTaxId] = useState('XX-XXX4912');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);

    try {
      if (mode === 'LOGIN') {
        const res = await login(email.trim(), password);
        if (res && res.mfaRequired && res.mfaToken) {
          setMfaToken(res.mfaToken);
          setMode('MFA_CHALLENGE');
        }
      } else if (mode === 'REGISTER') {
        await register(email.trim(), password, fullName.trim(), businessName.trim(), taxId.trim());
      } else if (mode === 'MFA_CHALLENGE') {
        await verifyMfaLogin(mfaToken, mfaCode.trim());
      }
    } catch (err) {
      // Error handled in auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setIsSubmitting(true);
    try {
      await demoLogin();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] dark:bg-[#121212] flex items-center justify-center p-4 font-mono text-[#141414] dark:text-[#F3F2EE]">
      <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border-2 border-[#141414] dark:border-[#383838] max-w-md w-full p-6 shadow-2xl relative">
        {/* Brand Banner */}
        <div className="text-center space-y-1.5 pb-4 border-b border-[#141414] dark:border-[#383838]">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-[#141414] dark:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] border border-[#141414] dark:border-[#383838] mb-1">
            <Wallet className="w-5 h-5" />
          </div>
          <h1 className="text-sm font-bold uppercase tracking-wider">
            Finance & Payment Tracker
          </h1>
          <p className="text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70 max-w-xs mx-auto">
            MULTI-PLATFORM INFLOW & OUTFLOW TRACKER (STRIPE, PAYONEER, DOTS, BKASH, BANK)
          </p>
        </div>

        {/* 1-Click Demo Login Banner */}
        <div className="mt-4 p-3 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] flex items-center justify-between">
          <div className="text-left">
            <span className="text-xs font-bold uppercase flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> DEMO WORKSPACE
            </span>
            <p className="text-[10px] text-[#141414]/70 dark:text-[#F3F2EE]/70 mt-0.5">Pre-populated multi-platform inflows & notes</p>
          </div>
          <button
            id="demo-login-btn"
            type="button"
            onClick={handleDemo}
            disabled={isSubmitting}
            className="px-3 py-1 bg-[#141414] dark:bg-[#383838] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] text-xs font-bold uppercase border border-[#141414] dark:border-white transition-colors disabled:opacity-50"
          >
            1-Click Enter
          </button>
        </div>

        {/* Auth Error Banner */}
        {error && (
          <div className="mt-3 p-2 bg-rose-100 dark:bg-rose-950/60 border border-rose-700 text-rose-900 dark:text-rose-300 text-[11px] font-bold">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
          {mode === 'MFA_CHALLENGE' ? (
            <div className="space-y-3">
              <div className="p-3 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-center">
                <ShieldCheck className="w-5 h-5 text-emerald-800 dark:text-emerald-400 mx-auto mb-1" />
                <h3 className="font-bold text-xs uppercase">Two-Factor Authentication Required</h3>
                <p className="text-[#141414]/70 dark:text-[#F3F2EE]/70 text-[11px] mt-0.5">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>

              <div>
                <label className="block font-bold text-[11px] uppercase mb-1">6-Digit Security Code</label>
                <input
                  id="auth-mfa-code-input"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-center text-base font-bold tracking-widest text-[#141414] dark:text-[#F3F2EE] focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                id="submit-mfa-challenge-btn"
                disabled={isSubmitting || mfaCode.length < 6}
                className="w-full py-2 bg-[#141414] dark:bg-[#383838] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] font-bold uppercase text-xs border border-[#141414] dark:border-white transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Verifying...' : 'Authenticate'}
              </button>

              <button
                type="button"
                onClick={() => setMode('LOGIN')}
                className="w-full text-center text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70 hover:text-[#141414] dark:hover:text-white uppercase font-bold"
              >
                ← Back to Login
              </button>
            </div>
          ) : (
            <>
              {mode === 'REGISTER' && (
                <>
                  <div>
                    <label className="block font-bold text-[11px] uppercase mb-1">Full Legal Name</label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-[#141414]/60 dark:text-[#F3F2EE]/60 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-name-input"
                        type="text"
                        placeholder="Alex Morgan"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] text-xs focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[11px] uppercase mb-1">Business / Trade Name</label>
                    <div className="relative">
                      <Building className="w-3.5 h-3.5 text-[#141414]/60 dark:text-[#F3F2EE]/60 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-business-input"
                        type="text"
                        placeholder="Aitijya Sarker"
                        value={businessName}
                        onChange={e => setBusinessName(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] text-xs focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[11px] uppercase mb-1">Tax ID / SSN / EIN (Optional)</label>
                    <input
                      id="auth-taxid-input"
                      type="text"
                      placeholder="XX-XXX1234"
                      value={taxId}
                      onChange={e => setTaxId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] text-xs focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-bold text-[11px] uppercase mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-[#141414]/60 dark:text-[#F3F2EE]/60 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-email-input"
                    type="email"
                    placeholder="alex.morgan@freelancestudio.io"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[11px] uppercase mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-[#141414]/60 dark:text-[#F3F2EE]/60 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-password-input"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                id="auth-submit-btn"
                disabled={isSubmitting}
                className="w-full py-2 bg-[#141414] dark:bg-[#383838] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] font-bold uppercase text-xs border border-[#141414] dark:border-white transition-colors disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                <span>{isSubmitting ? 'Authenticating...' : mode === 'LOGIN' ? 'Sign In' : 'Create Secure Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-2">
                {mode === 'LOGIN' ? (
                  <p className="text-[#141414]/70 dark:text-[#F3F2EE]/70 text-xs">
                    Need an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('REGISTER')}
                      className="text-[#141414] dark:text-white underline font-bold uppercase"
                    >
                      Register New Business
                    </button>
                  </p>
                ) : (
                  <p className="text-[#141414]/70 dark:text-[#F3F2EE]/70 text-xs">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('LOGIN')}
                      className="text-[#141414] dark:text-white underline font-bold uppercase"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
