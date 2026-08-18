import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Expense, ExpenseCategory } from '../types';

interface ExpenseTrackerProps {
  expenses: Expense[];
  categories: ExpenseCategory[];
  onOpenAddExpense: () => void;
  onDeleteExpense: (id: string) => void;
  onRefresh: () => void;
}

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  expenses,
  categories,
  onOpenAddExpense,
  onDeleteExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const filtered = expenses.filter(e => {
    if (selectedCategory !== 'ALL' && e.category_id !== selectedCategory && e.category_name !== selectedCategory) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const text = `${e.merchant} ${e.description} ${e.category_name}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  const totalExpenses = filtered.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-5 font-mono text-[#141414] dark:text-[#F3F2EE]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg font-bold uppercase tracking-wider">Expenses</h1>
        <button
          onClick={onOpenAddExpense}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/20 border-2 border-rose-300 dark:border-rose-700 p-5 rounded-lg">
        <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 block mb-2">
          Total Expenses (Filtered)
        </span>
        <div className="text-3xl font-bold text-rose-900 dark:text-rose-100">
          {formatCurrency(totalExpenses)}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border-2 border-[#141414] dark:border-[#383838] p-3 rounded-lg space-y-3">
        {/* Search */}
        <input
          type="text"
          placeholder="Search by merchant, description, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] px-4 py-2 text-sm rounded text-[#141414] dark:text-[#F3F2EE] placeholder-[#141414]/50 dark:placeholder-[#F3F2EE]/50 focus:outline-none focus:ring-2 focus:ring-rose-500"
        />

        {/* Category Filter */}
        {categories.length > 0 && (
          <div>
            <label className="text-xs font-bold uppercase text-[#141414]/70 dark:text-[#F3F2EE]/70 block mb-2">
              Filter by Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] px-4 py-2 text-sm rounded text-[#141414] dark:text-[#F3F2EE] cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="ALL">All Categories ({expenses.length})</option>
              {categories.map((cat) => {
                const count = expenses.filter(e => e.category_id === cat.id || e.category_name === cat.category_name).length;
                return (
                  <option key={cat.id} value={cat.id}>
                    {cat.category_name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* Expenses Table */}
      <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border-2 border-[#141414] dark:border-[#383838] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border-b-2 border-[#141414] dark:border-[#383838]">
                <th className="text-left py-3 px-4 font-bold">Date</th>
                <th className="text-left py-3 px-4 font-bold">Merchant</th>
                <th className="text-left py-3 px-4 font-bold">Description</th>
                <th className="text-left py-3 px-4 font-bold">Category</th>
                <th className="text-right py-3 px-4 font-bold">Amount</th>
                <th className="text-center py-3 px-4 font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-[#141414]/10 dark:border-[#383838]/30 hover:bg-[#E4E3E0] dark:hover:bg-[#1A1A1A] transition-colors"
                  >
                    <td className="py-3 px-4 text-sm">
                      {new Date(expense.expense_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold truncate">
                      {expense.merchant}
                    </td>
                    <td className="py-3 px-4 text-sm text-[#141414]/70 dark:text-[#F3F2EE]/70 truncate">
                      {expense.description}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-block text-xs font-bold uppercase px-2 py-1 rounded text-white"
                        style={{ backgroundColor: expense.color || '#6366F1' }}
                      >
                        {expense.category_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                      -{formatCurrency(expense.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onDeleteExpense(expense.id)}
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
                  <td colSpan={6} className="py-12 text-center text-[#141414]/60 dark:text-[#F3F2EE]/60">
                    {searchTerm || selectedCategory !== 'ALL' ? 'No expenses match your filters.' : 'No expenses yet. Add your first expense!'}
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
