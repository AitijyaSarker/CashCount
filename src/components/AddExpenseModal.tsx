import React, { useState } from 'react';
import {
  Receipt,
  UploadCloud,
  FileText,
  DollarSign,
  Calendar,
  Tag,
  Building2,
  Check,
  X,
} from 'lucide-react';
import { ExpenseCategory, Account } from '../types';
import { useFeatures } from '../context/FeatureContext';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  accounts: Account[];
  onSubmit: (data: any) => Promise<void>;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  onSubmit,
}) => {
  const { features } = useFeatures();
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [accountId, setAccountId] = useState(accounts.find(a => a.account_type === 'BANK')?.id || accounts[0]?.id || '');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [isTaxDeductible, setIsTaxDeductible] = useState(true);
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<{ name: string; url: string; data?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setReceiptFile({
          name: file.name,
          url: URL.createObjectURL(file),
          data: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setReceiptFile({
          name: file.name,
          url: URL.createObjectURL(file),
          data: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid expense amount (greater than $0).');
      return;
    }
    if (!vendor.trim()) {
      setErrorMessage('Please enter who you paid (Vendor / Company name).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        vendor: vendor.trim(),
        amount: numAmount,
        categoryId: categoryId || null,
        accountId: accountId || null,
        expenseDate,
        isTaxDeductible,
        taxAmount: 0,
        notes: notes.trim(),
        receiptName: receiptFile?.name || null,
        receiptUrl: receiptFile?.url || null,
        receiptData: receiptFile?.data || null,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-mono">
      <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border-2 border-[#141414] dark:border-[#383838] max-w-xl w-full p-6 shadow-2xl text-[#141414] dark:text-[#F3F2EE] my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#141414] dark:border-[#383838]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#141414] dark:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] border border-[#141414] dark:border-[#383838]">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider">Log {features.expenseLabel} (Outflow)</h2>
              <p className="text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70">Record software, subscriptions, hardware, or office costs</p>
            </div>
          </div>
          <button
            id="close-expense-modal-btn"
            onClick={onClose}
            className="p-1 hover:bg-[#141414] hover:text-[#E4E3E0] dark:hover:bg-[#383838] border border-[#141414] dark:border-[#383838] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          {errorMessage && (
            <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 border border-rose-700 text-rose-900 dark:text-rose-300 font-bold text-[11px]">
              {errorMessage}
            </div>
          )}

          {/* Vendor & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-[11px] uppercase mb-1">
                1. What did you buy / Who did you pay? <span className="text-rose-700 dark:text-rose-400">*</span>
              </label>
              <input
                id="expense-vendor-input"
                type="text"
                placeholder="e.g. Figma, AWS, Adobe, GitHub, WeWork, Apple"
                value={vendor}
                onChange={e => setVendor(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] text-xs focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-[11px] uppercase mb-1">
                2. Amount Paid ($) <span className="text-rose-700 dark:text-rose-400">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-[#141414]/60 dark:text-[#F3F2EE]/60 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  id="expense-amount-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="45.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] font-mono font-bold text-xs focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Category & Paying Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-[11px] uppercase mb-1">
                3. Category <span className="text-rose-700 dark:text-rose-400">*</span>
              </label>
              <select
                id="expense-category-select"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] text-xs font-mono focus:outline-none"
                required
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[11px] uppercase mb-1">4. Payment Account</label>
              <select
                id="expense-account-select"
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] text-xs font-mono focus:outline-none"
              >
                <option value="">Personal Card / Cash</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name} ({acc.platform_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Tax Deductible Flag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
            <div>
              <label className="block font-bold text-[11px] uppercase mb-1">Date of Expense</label>
              <input
                id="expense-date-input"
                type="date"
                value={expenseDate}
                onChange={e => setExpenseDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] text-xs focus:outline-none"
                required
              />
            </div>

            <div className="pt-4">
              <label className="flex items-center space-x-2 cursor-pointer bg-[#E4E3E0] dark:bg-[#262626] p-2 border border-[#141414] dark:border-[#383838]">
                <input
                  id="expense-tax-deductible-check"
                  type="checkbox"
                  checked={isTaxDeductible}
                  onChange={e => setIsTaxDeductible(e.target.checked)}
                  className="accent-[#141414] w-3.5 h-3.5"
                />
                <div>
                  <span className="font-bold text-[11px] uppercase">Business Tax Write-Off</span>
                  <p className="text-[10px] text-[#141414]/70 dark:text-[#F3F2EE]/70">Reduces your taxable income at tax time</p>
                </div>
              </label>
            </div>
          </div>

          {/* Receipt Upload Area */}
          <div>
            <label className="block font-bold text-[11px] uppercase mb-1">Receipt or Invoice (Optional)</label>
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-[#141414]/40 dark:border-[#383838] hover:border-[#141414] dark:hover:border-white p-3 text-center bg-[#E4E3E0] dark:bg-[#262626] transition-colors"
            >
              {receiptFile ? (
                <div className="flex items-center justify-between bg-[#DCDAD7] dark:bg-[#1C1C1C] p-2 border border-[#141414] dark:border-[#383838]">
                  <div className="flex items-center space-x-2 text-left">
                    <FileText className="w-4 h-4 text-[#141414] dark:text-[#F3F2EE]" />
                    <div>
                      <p className="font-bold truncate max-w-[240px] text-xs">{receiptFile.name}</p>
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold uppercase">ATTACHED</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReceiptFile(null)}
                    className="text-rose-700 dark:text-rose-400 hover:text-rose-900 text-xs font-bold uppercase"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <UploadCloud className="w-6 h-6 text-[#141414]/60 dark:text-[#F3F2EE]/60 mx-auto mb-1" />
                  <p className="text-xs font-bold">
                    DRAG RECEIPT HERE OR{' '}
                    <label className="underline cursor-pointer hover:opacity-80">
                      CHOOSE FILE
                      <input
                        id="receipt-file-input"
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-[10px] text-[#141414]/60 dark:text-[#F3F2EE]/60 mt-0.5">PNG, JPG, PDF (Up to 10MB)</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-[11px] uppercase mb-1">Notes / Project Purpose</label>
            <input
              id="expense-notes-input"
              type="text"
              placeholder="e.g. Hosting for client project, Yearly software license, Client coffee meeting"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] text-xs focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-[#141414] dark:border-[#383838] flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] hover:bg-[#D4D2CE] text-[#141414] dark:text-[#F3F2EE] text-xs font-bold uppercase border border-[#141414] dark:border-[#383838]"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-expense-btn"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-[#141414] dark:bg-[#383838] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] text-xs font-bold uppercase border border-[#141414] dark:border-white transition-colors disabled:opacity-50"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : `Save ${features.expenseLabel}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
