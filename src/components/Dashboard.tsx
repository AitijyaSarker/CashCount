import React from 'react';
import { Plus, Minus, ChevronRight } from 'lucide-react';
import { Account, DashboardSummary, Transaction, Expense } from '../types';
import { PlatformLogo } from './PlatformLogo';

interface DashboardProps {
  summary: DashboardSummary | null;
  accounts: Account[];
  transactions: Transaction[];
  expenses: Expense[];
  onOpenAddTransaction: (type?: 'INFLOW' | 'WITHDRAWAL' | 'TRANSFER' | 'DEPOSIT', platform?: string) => void;
  onOpenAddExpense: () => void;
  onUpdateTransactionStatus: (id: string, newStatus: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenCreatePlatform?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  summary,
  accounts = [],
  transactions = [],
  expenses = [],
  onOpenAddTransaction,
  onOpenAddExpense,
  onUpdateTransactionStatus,
  onNavigateTab,
  onOpenCreatePlatform,
}) => {
  const formatCurrency = (val: number | undefined) => {
    const num = val || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Calculate key metrics
  let totalBalance = 0;
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalPending = 0;

  accounts.forEach(acc => {
    totalBalance += acc.current_balance;
  });

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();

  transactions.forEach(tx => {
    const txDate = new Date(tx.transaction_date);
    if (txDate.getMonth() === thisMonth && txDate.getFullYear() === thisYear) {
      if (tx.type === 'INFLOW' || tx.type === 'DEPOSIT') {
        if (tx.status === 'CLEARED' || tx.status === 'DEPOSITED') {
          totalIncome += tx.net_amount;
        } else if (tx.status === 'PENDING') {
          totalPending += tx.net_amount;
        }
      } else if (tx.type === 'WITHDRAWAL') {
        if (tx.status === 'CLEARED' || tx.status === 'DEPOSITED') {
          totalExpenses += tx.gross_amount;
        }
      }
    }
  });

  expenses.forEach(exp => {
    const expDate = new Date(exp.expense_date);
    if (expDate.getMonth() === thisMonth && expDate.getFullYear() === thisYear) {
      totalExpenses += exp.amount;
    }
  });

  const recentTxs = transactions.slice(0, 8);

  return (
    <div className="space-y-6 text-[#141414] dark:text-[#F3F2EE] font-mono">
      {/* KEY METRICS - Clean & Simple */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Balance */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-2 border-blue-300 dark:border-blue-700 p-5 rounded-lg shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block mb-2">
            Total Balance
          </span>
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {formatCurrency(totalBalance)}
          </div>
        </div>

        {/* Income This Month */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 border-2 border-emerald-300 dark:border-emerald-700 p-5 rounded-lg shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block mb-2">
            Deposits (This Month)
          </span>
          <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
            +{formatCurrency(totalIncome)}
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/20 border-2 border-rose-300 dark:border-rose-700 p-5 rounded-lg shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 block mb-2">
            Withdrawals (This Month)
          </span>
          <div className="text-3xl font-bold text-rose-900 dark:text-rose-100">
            -{formatCurrency(totalExpenses)}
          </div>
        </div>

        {/* Pending */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 border-2 border-amber-300 dark:border-amber-700 p-5 rounded-lg shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block mb-2">
            Pending Deposits
          </span>
          <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
            {formatCurrency(totalPending)}
          </div>
        </div>
      </div>

      {/* ACCOUNTS SECTION */}
      <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border-2 border-[#141414] dark:border-[#383838] p-5 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider">Your Accounts ({accounts.length})</h2>
          {onOpenCreatePlatform && (
            <button
              onClick={onOpenCreatePlatform}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Account
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {accounts.length > 0 ? (
            accounts.map(acc => (
              <div key={acc.id} className="bg-[#E4E3E0] dark:bg-[#262626] border-2 border-[#141414]/20 dark:border-[#383838] p-4 rounded-lg hover:shadow-md transition-shadow flex flex-col">
                {/* Logo */}
                <div className="mb-3 flex justify-center">
                  <PlatformLogo
                    platform={acc.platform_name}
                    customLogoUrl={undefined}
                    size="md"
                    showLabel={false}
                  />
                </div>
                
                <div className="text-xs font-semibold text-[#141414]/70 dark:text-[#F3F2EE]/70 mb-1 truncate text-center">
                  {acc.platform_name}
                </div>
                <div className="text-2xl font-bold mb-2 text-[#141414] dark:text-[#F3F2EE] text-center">
                  {formatCurrency(acc.current_balance)}
                </div>
                <div className="text-[10px] text-[#141414]/60 dark:text-[#F3F2EE]/60 truncate mb-4 text-center">
                  {acc.account_name}
                </div>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => onOpenAddTransaction('DEPOSIT', acc.id)}
                    className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded transition-colors"
                  >
                    + Add
                  </button>
                  <button
                    onClick={() => onOpenAddTransaction('WITHDRAWAL', acc.id)}
                    className="flex-1 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded transition-colors"
                  >
                    - Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-[#141414]/60 dark:text-[#F3F2EE]/60">
              <p className="text-sm">No accounts yet. Click "Add Account" to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border-2 border-[#141414] dark:border-[#383838] p-5 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider">Recent Transactions</h2>
          <button
            onClick={() => onNavigateTab('transactions')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-[#141414] dark:border-[#383838]">
                <th className="text-left py-3 px-3 font-bold text-[#141414] dark:text-[#F3F2EE]">Date</th>
                <th className="text-left py-3 px-3 font-bold text-[#141414] dark:text-[#F3F2EE]">Account</th>
                <th className="text-left py-3 px-3 font-bold text-[#141414] dark:text-[#F3F2EE]">Type</th>
                <th className="text-right py-3 px-3 font-bold text-[#141414] dark:text-[#F3F2EE]">Amount</th>
                <th className="text-center py-3 px-3 font-bold text-[#141414] dark:text-[#F3F2EE]">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTxs.map((tx, idx) => (
                <tr 
                  key={idx} 
                  className="border-b border-[#141414]/10 dark:border-[#383838]/30 hover:bg-[#E4E3E0] dark:hover:bg-[#1A1A1A] transition-colors"
                >
                  <td className="py-3 px-3 text-[#141414] dark:text-[#F3F2EE]">
                    {new Date(tx.transaction_date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3 text-[#141414]/70 dark:text-[#F3F2EE]/70 truncate">
                    {tx.account_name}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-block text-[9px] font-bold uppercase px-2 py-0.5 bg-[#141414]/10 dark:bg-white/10 rounded text-[#141414] dark:text-[#F3F2EE]">
                      {tx.type}
                    </span>
                  </td>
                  <td className={`py-3 px-3 text-right font-bold ${
                    tx.type === 'INFLOW' || tx.type === 'DEPOSIT' 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {tx.type === 'INFLOW' || tx.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(tx.net_amount)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                      tx.status === 'CLEARED' || tx.status === 'DEPOSITED'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentTxs.length === 0 && (
            <div className="text-center py-12 text-[#141414]/60 dark:text-[#F3F2EE]/60">
              <p className="text-sm">No transactions yet. Add your first transaction to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
