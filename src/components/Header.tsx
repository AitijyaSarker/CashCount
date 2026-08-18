import React from 'react';
import {
  Wallet,
  Plus,
  Minus,
  Receipt,
  LogOut,
  RefreshCw,
  Sun,
  Moon,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFeatures } from '../context/FeatureContext';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAddTransaction: (type?: 'INFLOW' | 'WITHDRAWAL' | 'TRANSFER' | 'DEPOSIT', platform?: string) => void;
  onOpenAddExpense: () => void;
  onOpenMfaModal: () => void;
  onOpenSecurityCenter: () => void;
  onRefreshData: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddTransaction,
  onOpenAddExpense,
  onRefreshData,
  isRefreshing = false,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { features } = useFeatures();

  const navTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header id="app-header" className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border-b border-[#141414] dark:border-[#383838] sticky top-0 z-40 text-[#141414] dark:text-[#F3F2EE] transition-colors flex-shrink-0 shadow-sm">
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 bg-[#141414] dark:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] flex items-center justify-center font-mono font-bold text-sm border-2 border-[#141414] dark:border-[#383838] flex-shrink-0 rounded">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold font-mono uppercase tracking-tight truncate">
                Cashcount
              </h1>
              <p className="text-[10px] text-[#141414]/60 dark:text-[#F3F2EE]/60 truncate">
                {user?.businessName || 'Finance Manager'}
              </p>
            </div>
          </div>

          {/* Quick Actions - Simplified */}
          <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              className="p-2 border border-[#141414] dark:border-[#383838] bg-[#E4E3E0] dark:bg-[#262626] hover:bg-[#141414] hover:text-[#E4E3E0] dark:hover:bg-[#383838] text-[#141414] dark:text-[#F3F2EE] transition-colors font-mono flex-shrink-0 rounded"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-700" />}
            </button>

            {/* Add Income */}
            <button
              onClick={() => onOpenAddTransaction('DEPOSIT')}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold uppercase border border-emerald-700 transition-colors flex-shrink-0 rounded"
            >
              <Plus className="w-4 h-4" />
              <span>Income</span>
            </button>

            {/* Add Expense */}
            <button
              onClick={onOpenAddExpense}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold uppercase border border-rose-700 transition-colors flex-shrink-0 rounded"
            >
              <Minus className="w-4 h-4" />
              <span>Expense</span>
            </button>

            {/* Sign Out */}
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 border border-[#141414] dark:border-[#383838] bg-[#E4E3E0] dark:bg-[#262626] hover:bg-rose-700 hover:text-white hover:border-rose-700 text-[#141414] dark:text-[#F3F2EE] transition-colors font-mono flex-shrink-0 rounded"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 border-t border-[#141414]/10 dark:border-[#383838] py-0 px-2 sm:px-4 md:px-6 lg:px-8 overflow-x-auto">
          {navTabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-all border-b-2 ${
                  isActive
                    ? 'text-[#141414] dark:text-[#F3F2EE] border-b-[#141414] dark:border-b-[#F3F2EE]'
                    : 'text-[#141414]/60 dark:text-[#F3F2EE]/60 hover:text-[#141414] dark:hover:text-[#F3F2EE] border-b-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
