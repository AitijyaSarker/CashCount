import React, { useState } from 'react';
import { Trash2, Clock, CheckCircle2, Plus, Minus } from 'lucide-react';
import { Transaction, Account } from '../types';

interface TransactionTableProps {
  transactions: Transaction[];
  accounts: Account[];
  onOpenAddTransaction: (type?: 'INFLOW' | 'WITHDRAWAL' | 'TRANSFER' | 'DEPOSIT', platform?: string) => void;
  onUpdateStatus: (id: string, newStatus: string) => void;
  onDeleteTransaction: (id: string) => void;
  onRefresh: () => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  accounts,
  onOpenAddTransaction,
  onUpdateStatus,
  onDeleteTransaction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const filteredTxs = transactions.filter(tx =>
    tx.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.payer_recipient?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5 font-mono text-[#141414] dark:text-[#F3F2EE]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg font-bold uppercase tracking-wider">Transactions</h1>
        <div className="flex gap-2">
          <button
            onClick={() => onOpenAddTransaction('DEPOSIT')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            Income
          </button>
          <button
            onClick={() => onOpenAddTransaction('WITHDRAWAL')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded transition-colors"
          >
            <Minus className="w-4 h-4" />
            Expense
          </button>
        </div>
      </div>

      {/* Search Box */}
      <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border-2 border-[#141414] dark:border-[#383838] p-3 rounded-lg">
        <input
          type="text"
          placeholder="Search by account, description, or payer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] px-4 py-2 text-sm rounded text-[#141414] dark:text-[#F3F2EE] placeholder-[#141414]/50 dark:placeholder-[#F3F2EE]/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Transactions Table */}
      <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border-2 border-[#141414] dark:border-[#383838] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border-b-2 border-[#141414] dark:border-[#383838]">
                <th className="text-left py-3 px-4 font-bold">Date</th>
                <th className="text-left py-3 px-4 font-bold">Account</th>
                <th className="text-left py-3 px-4 font-bold">Description</th>
                <th className="text-left py-3 px-4 font-bold">Type</th>
                <th className="text-right py-3 px-4 font-bold">Amount</th>
                <th className="text-center py-3 px-4 font-bold">Status</th>
                <th className="text-center py-3 px-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxs.length > 0 ? (
                filteredTxs.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-[#141414]/10 dark:border-[#383838]/30 hover:bg-[#E4E3E0] dark:hover:bg-[#1A1A1A] transition-colors"
                  >
                    <td className="py-3 px-4 text-sm">
                      {new Date(tx.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold truncate">
                      {tx.account_name}
                    </td>
                    <td className="py-3 px-4 text-sm text-[#141414]/70 dark:text-[#F3F2EE]/70 truncate">
                      {tx.description}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block text-xs font-bold uppercase px-2 py-1 rounded ${
                        tx.type === 'INFLOW' || tx.type === 'DEPOSIT'
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${
                      tx.type === 'INFLOW' || tx.type === 'DEPOSIT'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {tx.type === 'INFLOW' || tx.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(tx.net_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {tx.status === 'PENDING' ? (
                          <>
                            <Clock className="w-4 h-4 text-amber-500" />
                            <select
                              value={tx.status}
                              onChange={(e) => onUpdateStatus(tx.id, e.target.value)}
                              className="text-xs font-bold uppercase px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded border border-amber-600 cursor-pointer"
                            >
                              <option value="PENDING">Pending</option>
                              <option value="CLEARED">Clear</option>
                            </select>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded">
                            <CheckCircle2 className="w-4 h-4" />
                            Cleared
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded text-xs font-bold transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#141414]/60 dark:text-[#F3F2EE]/60">
                    {searchTerm ? 'No transactions match your search.' : 'No transactions yet. Add your first transaction!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
