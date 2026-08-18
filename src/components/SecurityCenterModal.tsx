import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Server,
  Activity,
  RotateCcw,
  X,
  CheckCircle2,
  AlertTriangle,
  FileCode,
} from 'lucide-react';
import { SecurityAuditLog } from '../types';
import { api } from '../services/api';

interface SecurityCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeedReset: () => void;
}

export const SecurityCenterModal: React.FC<SecurityCenterModalProps> = ({
  isOpen,
  onClose,
  onSeedReset,
}) => {
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const logs = await api.getSecurityAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSeed = async () => {
    if (!window.confirm('Reset sample demo ledger and transactions to default baseline?')) return;
    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await api.resetSeedData();
      setResetMessage(res.message);
      onSeedReset();
      fetchLogs();
    } catch (err: any) {
      setResetMessage(err.message || 'Reset failed.');
    } finally {
      setIsResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-mono text-[#141414] dark:text-[#F3F2EE]">
      <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border-2 border-[#141414] dark:border-[#383838] max-w-2xl w-full p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#141414] dark:border-[#383838]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#E4E3E0] dark:bg-[#262626] text-[#141414] dark:text-[#F3F2EE] border border-[#141414] dark:border-[#383838]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider">Security & Compliance Center</h2>
              <p className="text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70">SOC 2 & AUDIT TRAIL COMPLIANCE VERIFICATION</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#141414] hover:text-[#E4E3E0] dark:hover:bg-[#383838] border border-[#141414] dark:border-[#383838] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4 text-xs">
          <div className="p-3 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] space-y-1">
            <div className="flex items-center space-x-1.5 font-bold uppercase text-[11px]">
              <Lock className="w-3.5 h-3.5" />
              <span>AES-256-GCM Encryption</span>
            </div>
            <p className="text-[#141414]/75 dark:text-[#F3F2EE]/75 text-[10px] leading-relaxed">
              Tax IDs, routing identifiers, and receipt vault payloads are encrypted using standard AES-256-GCM with authentication tags.
            </p>
          </div>

          <div className="p-3 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] space-y-1">
            <div className="flex items-center space-x-1.5 font-bold uppercase text-[11px]">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Bcrypt & JWT Session Security</span>
            </div>
            <p className="text-[#141414]/75 dark:text-[#F3F2EE]/75 text-[10px] leading-relaxed">
              Passwords hashed with 10 salt rounds. Stateless JWT bearer tokens signed with HMAC-SHA256 and paired with secure HTTP-only cookies.
            </p>
          </div>

          <div className="p-3 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] space-y-1">
            <div className="flex items-center space-x-1.5 font-bold uppercase text-[11px]">
              <Activity className="w-3.5 h-3.5" />
              <span>Rate Limiting (Sliding Window)</span>
            </div>
            <p className="text-[#141414]/75 dark:text-[#F3F2EE]/75 text-[10px] leading-relaxed">
              Active sliding window rate limiter protects auth routes against brute-force attacks and prevents API denial-of-service.
            </p>
          </div>

          <div className="p-3 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] space-y-1">
            <div className="flex items-center space-x-1.5 font-bold uppercase text-[11px]">
              <FileCode className="w-3.5 h-3.5" />
              <span>Decimal Math (Scaled Integers)</span>
            </div>
            <p className="text-[#141414]/75 dark:text-[#F3F2EE]/75 text-[10px] leading-relaxed">
              All calculations use a 4-decimal integer scaling engine to guarantee zero floating-point roundoff errors across ledgers and reports.
            </p>
          </div>
        </div>

        {/* Security Audit Log Stream */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Immutable Security Audit Log
            </h3>
            <button
              onClick={fetchLogs}
              className="text-[10px] underline hover:opacity-80 font-bold uppercase"
            >
              [Refresh Logs]
            </button>
          </div>

          <div className="bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] p-2.5 max-h-48 overflow-y-auto font-mono text-[11px] space-y-1 scrollbar-none">
            {isLoading ? (
              <p className="text-[#141414]/60 dark:text-[#F3F2EE]/60 text-center py-4">Loading audit stream...</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-[#141414]/60 dark:text-[#F3F2EE]/60 text-center py-4">No audit logs recorded yet.</p>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="flex items-start justify-between border-b border-[#141414]/20 dark:border-[#383838] pb-1">
                  <div>
                    <span className="font-bold">[{log.status}]</span>{' '}
                    <span className="font-bold underline">{log.action}</span>:{' '}
                    <span className="text-[#141414]/80 dark:text-[#F3F2EE]/80">{log.details}</span>
                  </div>
                  <span className="text-[#141414]/60 dark:text-[#F3F2EE]/60 text-[10px] whitespace-nowrap ml-2">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Demo Seed Reset Control */}
        <div className="mt-4 pt-3 border-t border-[#141414] dark:border-[#383838] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-[11px] uppercase">Testing & Demonstration State</span>
            <p className="text-[10px] text-[#141414]/70 dark:text-[#F3F2EE]/70">Reset sample transactions and receipts to clean initial state.</p>
          </div>

          <div className="flex items-center space-x-2">
            {resetMessage && <span className="text-emerald-800 dark:text-emerald-400 text-xs font-bold">{resetMessage}</span>}
            <button
              id="reset-demo-seed-btn"
              onClick={handleResetSeed}
              disabled={isResetting}
              className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#E4E3E0] dark:bg-[#262626] hover:bg-[#D4D2CE] dark:hover:bg-[#303030] font-bold uppercase text-xs border border-[#141414] dark:border-[#383838] transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isResetting ? 'Resetting...' : 'Reset Demo Data'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1 bg-[#141414] dark:bg-[#383838] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] font-bold uppercase text-xs border border-[#141414] dark:border-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
