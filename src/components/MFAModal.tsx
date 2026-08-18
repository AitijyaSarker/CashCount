import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface MFAModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MFAModal: React.FC<MFAModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState<'INITIAL' | 'SETUP' | 'RECOVERY_CODES' | 'DISABLE'>('INITIAL');
  const [mfaSecret, setMfaSecret] = useState<string>('');
  const [otpAuthUrl, setOtpAuthUrl] = useState<string>('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState<string>('');
  const [disablePassword, setDisablePassword] = useState<string>('');
  const [copiedSecret, setCopiedSecret] = useState<boolean>(false);
  const [copiedCodes, setCopiedCodes] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartSetup = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.setupMFA();
      setMfaSecret(res.secret);
      setOtpAuthUrl(res.otpAuthUrl);
      setRecoveryCodes(res.recoveryCodes);
      setStep('SETUP');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize MFA.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await api.verifyAndEnableMFA(code.trim());
      await refreshUser();
      setStep('RECOVERY_CODES');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid 6-digit TOTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await api.disableMFA(disablePassword);
      await refreshUser();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to disable MFA.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'SECRET' | 'CODES') => {
    navigator.clipboard.writeText(text);
    if (type === 'SECRET') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-mono text-[#141414] dark:text-[#F3F2EE]">
      <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border-2 border-[#141414] dark:border-[#383838] max-w-md w-full p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#141414] dark:border-[#383838]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#E4E3E0] dark:bg-[#262626] text-[#141414] dark:text-[#F3F2EE] border border-[#141414] dark:border-[#383838]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider">Two-Factor Auth (MFA / 2FA)</h2>
              <p className="text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70">TOTP AUTHENTICATOR APP & EMERGENCY BACKUP CODES</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#141414] hover:text-[#E4E3E0] dark:hover:bg-[#383838] border border-[#141414] dark:border-[#383838] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 p-2 bg-rose-100 dark:bg-rose-950/60 border border-rose-700 text-rose-900 dark:text-rose-300 text-[11px] font-bold">
            {errorMessage}
          </div>
        )}

        {/* --- STEP: INITIAL STATUS --- */}
        {step === 'INITIAL' && (
          <div className="mt-4 space-y-3.5 text-xs">
            {user?.mfaEnabled ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-700 flex items-start space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-800 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-emerald-900 dark:text-emerald-300 text-xs uppercase">MFA ACTIVE & PROTECTING ACCOUNT</h3>
                    <p className="mt-1 text-[11px] text-[#141414]/80 dark:text-[#F3F2EE]/80">
                      Account requires 6-digit TOTP code on every login, preventing unauthorized financial access.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    onClick={() => setStep('DISABLE')}
                    className="px-3.5 py-1 bg-rose-100 dark:bg-rose-950/40 hover:bg-rose-200 text-rose-900 dark:text-rose-300 font-bold uppercase text-xs border border-rose-700 transition-colors"
                  >
                    Disable Two-Factor Auth
                  </button>
                  <button
                    onClick={onClose}
                    className="px-3.5 py-1 bg-[#141414] dark:bg-[#383838] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] font-bold uppercase text-xs border border-[#141414] dark:border-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] space-y-1.5">
                  <h3 className="font-bold text-xs uppercase">Elevate Freelance Account Security</h3>
                  <p className="text-[11px] text-[#141414]/80 dark:text-[#F3F2EE]/80 leading-relaxed">
                    Protect multi-rail balances and tax information by requiring a time-based one-time password (TOTP) from Google Authenticator, Authy, or 1Password.
                  </p>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    onClick={onClose}
                    className="px-3.5 py-1 bg-[#E4E3E0] dark:bg-[#262626] hover:bg-[#D4D2CE] text-xs font-bold uppercase border border-[#141414] dark:border-[#383838]"
                  >
                    Maybe Later
                  </button>
                  <button
                    id="start-mfa-setup-btn"
                    onClick={handleStartSetup}
                    disabled={isLoading}
                    className="px-4 py-1 bg-[#141414] dark:bg-[#383838] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] font-bold uppercase text-xs border border-[#141414] dark:border-white transition-colors"
                  >
                    {isLoading ? 'Setting up...' : 'Setup Two-Factor Auth'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- STEP: SETUP & QR CODE --- */}
        {step === 'SETUP' && (
          <form onSubmit={handleVerifyAndEnable} className="mt-4 space-y-3.5 text-xs">
            <div className="space-y-1.5">
              <p className="font-bold text-[11px] uppercase">
                1. Add this key to your authenticator app:
              </p>
              <div className="p-2.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] flex items-center justify-between">
                <span className="font-mono text-xs font-bold tracking-wider">
                  {mfaSecret}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(mfaSecret, 'SECRET')}
                  className="p-1 bg-[#DCDAD7] dark:bg-[#1C1C1C] hover:bg-[#D4D2CE] border border-[#141414] dark:border-[#383838]"
                  title="Copy secret key"
                >
                  {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-[11px] uppercase">
                2. Enter the 6-digit code generated by your app:
              </label>
              <input
                id="mfa-verify-code-input"
                type="text"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-center text-base font-bold tracking-widest text-[#141414] dark:text-[#F3F2EE] focus:outline-none"
                required
              />
            </div>

            <div className="pt-3 border-t border-[#141414] dark:border-[#383838] flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setStep('INITIAL')}
                className="px-3.5 py-1 bg-[#E4E3E0] dark:bg-[#262626] hover:bg-[#D4D2CE] font-bold uppercase text-xs border border-[#141414] dark:border-[#383838]"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="mfa-activate-btn"
                disabled={isLoading || code.length < 6}
                className="px-4 py-1 bg-[#141414] dark:bg-[#383838] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] font-bold uppercase text-xs border border-[#141414] dark:border-white disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Verifying...' : 'Verify & Enable MFA'}
              </button>
            </div>
          </form>
        )}

        {/* --- STEP: RECOVERY CODES --- */}
        {step === 'RECOVERY_CODES' && (
          <div className="mt-4 space-y-3.5 text-xs">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-700 text-amber-900 dark:text-amber-300 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-800 dark:text-amber-400" />
              <div>
                <span className="font-bold uppercase text-[11px]">Save your emergency recovery codes!</span>
                <p className="text-[10px] mt-0.5">
                  If you lose your device, each code can be used once to log in.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 bg-[#E4E3E0] dark:bg-[#262626] p-2.5 border border-[#141414] dark:border-[#383838] font-mono text-center">
              {recoveryCodes.map((rc, idx) => (
                <div key={idx} className="p-1 bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] text-[11px] font-bold">
                  {rc}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => copyToClipboard(recoveryCodes.join('\n'), 'CODES')}
                className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#E4E3E0] dark:bg-[#262626] hover:bg-[#D4D2CE] text-xs font-bold uppercase border border-[#141414] dark:border-[#383838]"
              >
                {copiedCodes ? <Check className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCodes ? 'Codes Copied!' : 'Copy All Codes'}</span>
              </button>

              <button
                onClick={onClose}
                className="px-4 py-1 bg-[#141414] dark:bg-[#383838] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] text-xs font-bold uppercase border border-[#141414] dark:border-white"
              >
                I've Saved Them
              </button>
            </div>
          </div>
        )}

        {/* --- STEP: DISABLE MFA --- */}
        {step === 'DISABLE' && (
          <form onSubmit={handleDisable} className="mt-4 space-y-3.5 text-xs">
            <p className="font-bold text-[11px] uppercase">
              Please confirm your account password to disable two-factor authentication:
            </p>
            <div>
              <label className="block font-bold text-[11px] uppercase mb-1">Account Password</label>
              <input
                id="disable-mfa-password-input"
                type="password"
                value={disablePassword}
                onChange={e => setDisablePassword(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] text-xs focus:outline-none"
                required
              />
            </div>
            <div className="pt-3 border-t border-[#141414] dark:border-[#383838] flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setStep('INITIAL')}
                className="px-3.5 py-1 bg-[#E4E3E0] dark:bg-[#262626] hover:bg-[#D4D2CE] font-bold uppercase text-xs border border-[#141414] dark:border-[#383838]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !disablePassword}
                className="px-4 py-1 bg-rose-700 hover:bg-rose-800 text-white font-bold uppercase text-xs border border-rose-900 disabled:opacity-50"
              >
                {isLoading ? 'Disabling...' : 'Confirm Disable'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
