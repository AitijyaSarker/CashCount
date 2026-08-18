import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ArrowRightLeft, DollarSign, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { Account, TransactionType } from '../types';
import { PlatformLogo, SupportedPlatform } from './PlatformLogo';
import { useFeatures } from '../context/FeatureContext';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  accounts: Account[];
  initialType?: 'INFLOW' | 'WITHDRAWAL' | 'TRANSFER' | 'DEPOSIT';
  initialPlatform?: string;
  onOpenCreatePlatform?: () => void;
}

const DEFAULT_PLATFORMS: SupportedPlatform[] = ['bKash', 'Dots', 'Bank', 'Stripe', 'Payoneer', 'PayPal', 'Wise'];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  accounts,
  initialType = 'DEPOSIT',
  initialPlatform,
  onOpenCreatePlatform,
}) => {
  const { features } = useFeatures();
  const [type, setType] = useState<TransactionType>(
    initialType === 'WITHDRAWAL' ? 'WITHDRAWAL' : initialType === 'TRANSFER' ? 'TRANSFER' : 'INFLOW'
  );

  const [selectedPlatform, setSelectedPlatform] = useState<string>(initialPlatform || 'Stripe');
  const [destinationAccount, setDestinationAccount] = useState<string>('');
  const [sourceAccount, setSourceAccount] = useState<string>('');
  const [grossAmount, setGrossAmount] = useState<string>('');
  const [feeAmount, setFeeAmount] = useState<string>('0');
  const [clientName, setClientName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [referenceId, setReferenceId] = useState<string>('');
  const [status, setStatus] = useState<'PENDING' | 'CLEARED'>('CLEARED');
  const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Available platforms (defaults + all active accounts)
  const allPlatforms = Array.from(
    new Set([
      ...DEFAULT_PLATFORMS,
      ...accounts.map(a => a.platform_name),
    ])
  );

  useEffect(() => {
    if (initialType === 'WITHDRAWAL') setType('WITHDRAWAL');
    else if (initialType === 'TRANSFER') setType('TRANSFER');
    else setType('INFLOW');

    if (initialPlatform) {
      setSelectedPlatform(initialPlatform);
    }
  }, [initialType, initialPlatform, isOpen]);

  useEffect(() => {
    if (accounts.length > 0) {
      const match = accounts.find(a => a.platform_name.toLowerCase() === selectedPlatform.toLowerCase());
      if (match) {
        setDestinationAccount(match.account_name);
      } else {
        setDestinationAccount(`${selectedPlatform} Account`);
      }
    }
  }, [selectedPlatform, accounts]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const gross = parseFloat(grossAmount);
    const fee = parseFloat(feeAmount) || 0;

    if (isNaN(gross) || gross <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        type,
        grossAmount: gross,
        feeAmount: fee,
        clientName: clientName.trim() || (type === 'INFLOW' ? 'Client Payment' : type === 'WITHDRAWAL' ? 'Bank Payout' : 'Transfer'),
        notes: notes.trim(),
        referenceId: referenceId.trim() || undefined,
        status: status === 'CLEARED' ? 'CLEARED' : 'PENDING',
        transactionDate,
      };

      const matchedAccount = accounts.find(a => a.platform_name.toLowerCase() === selectedPlatform.toLowerCase());
      const accountId = matchedAccount ? matchedAccount.id : undefined;

      const bankAccount = accounts.find(a => a.account_type === 'BANK' || a.platform_name.toLowerCase() === 'bank');
      const bankAccountId = bankAccount ? bankAccount.id : undefined;

      if (type === 'INFLOW') {
        payload.destinationPlatform = selectedPlatform;
        payload.destinationAccountName = destinationAccount || `${selectedPlatform} Account`;
        payload.destinationAccountId = accountId;
      } else if (type === 'WITHDRAWAL') {
        payload.sourcePlatform = selectedPlatform;
        payload.sourceAccountName = destinationAccount || `${selectedPlatform} Account`;
        payload.sourceAccountId = accountId;
        payload.destinationPlatform = 'Bank';
        payload.destinationAccountName = bankAccount ? bankAccount.account_name : 'Bank Checking';
        payload.destinationAccountId = bankAccountId;
      } else {
        payload.sourcePlatform = selectedPlatform;
        payload.sourceAccountId = accountId;
        payload.destinationPlatform = destinationAccount || 'Bank';
        payload.destinationAccountId = bankAccountId;
      }

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono">
      <div
        id="add-transaction-modal-dialog"
        className="bg-[#DCDAD7] dark:bg-[#1C1C1C] text-[#141414] dark:text-[#F3F2EE] border-2 border-[#141414] dark:border-[#383838] w-full max-w-lg shadow-2xl p-5 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#141414] dark:border-[#383838] pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-[#141414] dark:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] flex items-center justify-center text-xs font-bold border border-[#141414] dark:border-[#383838]">
              {type === 'WITHDRAWAL' ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider">
              {type === 'WITHDRAWAL' ? features.withdrawLabel : features.depositLabel} Entry
            </h3>
          </div>
          <button
            id="close-transaction-modal-btn"
            onClick={onClose}
            className="p-1 hover:bg-[#141414] hover:text-[#E4E3E0] dark:hover:bg-[#383838] border border-[#141414] dark:border-[#383838] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2 bg-rose-100 dark:bg-rose-950/60 border border-rose-700 text-rose-900 dark:text-rose-300 text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Action Type Selector */}
          <div>
            <label className="block font-bold text-[11px] uppercase mb-1">
              Select Action:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="modal-type-deposit"
                onClick={() => setType('INFLOW')}
                className={`py-2 px-3 border font-bold uppercase flex items-center justify-center space-x-1.5 transition-all ${
                  type === 'INFLOW'
                    ? 'bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE] border-[#141414] dark:border-white shadow-xs'
                    : 'bg-[#E4E3E0] dark:bg-[#262626] text-[#141414] dark:text-[#F3F2EE] border-[#141414]/30 dark:border-[#383838]'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ {features.depositLabel} (Inflow)</span>
              </button>

              <button
                type="button"
                id="modal-type-withdraw"
                onClick={() => setType('WITHDRAWAL')}
                className={`py-2 px-3 border font-bold uppercase flex items-center justify-center space-x-1.5 transition-all ${
                  type === 'WITHDRAWAL'
                    ? 'bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE] border-[#141414] dark:border-white shadow-xs'
                    : 'bg-[#E4E3E0] dark:bg-[#262626] text-[#141414] dark:text-[#F3F2EE] border-[#141414]/30 dark:border-[#383838]'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                <span>- {features.withdrawLabel} (Outflow)</span>
              </button>
            </div>
          </div>

          {/* Platform Selector with Exact Logos */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-[11px] uppercase">
                Select Platform:
              </label>
              {onOpenCreatePlatform && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCreatePlatform();
                  }}
                  className="text-[10px] font-bold uppercase underline text-[#141414]/80 dark:text-[#F3F2EE]/80 hover:text-[#141414] dark:hover:text-white"
                >
                  + Add New Platform
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {allPlatforms.map(p => {
                const isSelected = selectedPlatform.toLowerCase() === p.toLowerCase();
                const matchedAccount = accounts.find(
                  a => a.platform_name.toLowerCase() === p.toLowerCase()
                );
                return (
                  <button
                    key={p}
                    type="button"
                    id={`modal-select-platform-${p.toLowerCase()}`}
                    onClick={() => setSelectedPlatform(p)}
                    className={`p-2 border flex flex-col items-center justify-center space-y-1 transition-all ${
                      isSelected
                        ? 'bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE] border-[#141414] dark:border-white shadow-xs'
                        : 'bg-[#E4E3E0] dark:bg-[#262626] text-[#141414] dark:text-[#F3F2EE] border-[#141414]/30 dark:border-[#383838] hover:border-[#141414]'
                    }`}
                  >
                    <PlatformLogo
                      platform={p}
                      customLogoUrl={matchedAccount?.logo_url || undefined}
                      size="sm"
                    />
                    <span className="text-[10px] font-bold truncate max-w-full">{p}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amounts & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[11px] uppercase mb-1">
                Gross Amount ($):
              </label>
              <input
                id="modal-gross-amount-input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={grossAmount}
                onChange={e => setGrossAmount(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] font-bold focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-[11px] uppercase mb-1">
                Platform Fee ($):
              </label>
              <input
                id="modal-fee-amount-input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={feeAmount}
                onChange={e => setFeeAmount(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[11px] uppercase mb-1">
                Date:
              </label>
              <input
                id="modal-tx-date-input"
                type="date"
                value={transactionDate}
                onChange={e => setTransactionDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Client / Payer */}
          <div>
            <label className="block font-bold text-[11px] uppercase mb-1">
              Client / Payer / Source Name:
            </label>
            <input
              id="modal-client-name-input"
              type="text"
              placeholder="e.g. Acme Corp, Upwork Direct, Client Retainer"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] focus:outline-none"
            />
          </div>

          {/* Note Field (Explicit User Requirement) */}
          <div>
            <label className="block font-bold text-[11px] uppercase mb-1">
              Note (Add details/instructions):
            </label>
            <textarea
              id="modal-note-input"
              rows={2}
              placeholder="e.g. Website redesign milestone 2, 50% upfront deposit, invoice #1042..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] focus:outline-none"
            />
          </div>

          {/* Status Tracker Choice */}
          <div>
            <label className="block font-bold text-[11px] uppercase mb-1">
              Status Tracker:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`p-2 border flex items-center space-x-2 cursor-pointer ${
                status === 'CLEARED'
                  ? 'bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE] border-[#141414] dark:border-white'
                  : 'bg-[#E4E3E0] dark:bg-[#262626] text-[#141414] dark:text-[#F3F2EE] border-[#141414]/30 dark:border-[#383838]'
              }`}>
                <input
                  type="radio"
                  name="status"
                  value="CLEARED"
                  checked={status === 'CLEARED'}
                  onChange={() => setStatus('CLEARED')}
                  className="hidden"
                />
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs uppercase">✓ Received (Available)</span>
              </label>

              <label className={`p-2 border flex items-center space-x-2 cursor-pointer ${
                status === 'PENDING'
                  ? 'bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE] border-[#141414] dark:border-white'
                  : 'bg-[#E4E3E0] dark:bg-[#262626] text-[#141414] dark:text-[#F3F2EE] border-[#141414]/30 dark:border-[#383838]'
              }`}>
                <input
                  type="radio"
                  name="status"
                  value="PENDING"
                  checked={status === 'PENDING'}
                  onChange={() => setStatus('PENDING')}
                  className="hidden"
                />
                <span className="text-amber-400">⏳</span>
                <span className="font-bold text-xs uppercase">Pending (Waiting)</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 border-t border-[#141414]/20 dark:border-[#383838] flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] text-[#141414] dark:text-[#F3F2EE] font-bold uppercase border border-[#141414] dark:border-[#383838]"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-record-transaction-btn"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-[#141414] dark:bg-[#383838] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] font-bold uppercase border border-[#141414] dark:border-white disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : `+ Save ${type === 'WITHDRAWAL' ? features.withdrawLabel : features.depositLabel}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
