import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { FeatureProvider } from './context/FeatureContext';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TransactionTable } from './components/TransactionTable';
import { AddTransactionModal } from './components/AddTransactionModal';
import { ExpenseTracker } from './components/ExpenseTracker';
import { AddExpenseModal } from './components/AddExpenseModal';
import { FinancialReports } from './components/FinancialReports';
import { Settings } from './components/Settings';
import { MFAModal } from './components/MFAModal';
import { SecurityCenterModal } from './components/SecurityCenterModal';
import { AuthModal } from './components/AuthModal';
import { CreatePlatformModal } from './components/CreatePlatformModal';
import {
  Account,
  Transaction,
  Expense,
  ExpenseCategory,
  DashboardSummary,
  PLReport,
  CashFlowReport,
  TaxPrepReport,
  LedgerEntry,
} from './types';
import { api } from './services/api';

const AppContent: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Core Data State
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [plReport, setPlReport] = useState<PLReport | null>(null);
  const [cashFlowReport, setCashFlowReport] = useState<CashFlowReport | null>(null);
  const [taxPrepReport, setTaxPrepReport] = useState<TaxPrepReport | null>(null);
  const [ledgerJournal, setLedgerJournal] = useState<LedgerEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<{ totalDebits: number; totalCredits: number; isBalanced: boolean } | null>(null);

  // Modal States
  const [isAddTxOpen, setIsAddTxOpen] = useState<boolean>(false);
  const [addTxInitialType, setAddTxInitialType] = useState<'INFLOW' | 'WITHDRAWAL' | 'TRANSFER' | 'DEPOSIT'>('DEPOSIT');
  const [addTxInitialPlatform, setAddTxInitialPlatform] = useState<string | undefined>(undefined);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);
  const [isCreatePlatformOpen, setIsCreatePlatformOpen] = useState<boolean>(false);
  const [isMfaModalOpen, setIsMfaModalOpen] = useState<boolean>(false);
  const [isSecurityCenterOpen, setIsSecurityCenterOpen] = useState<boolean>(false);

  const loadAllData = useCallback(async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      const [
        sumData,
        accData,
        txData,
        expData,
        catData,
        plData,
        cfData,
        taxData,
        ledgerData,
      ] = await Promise.all([
        api.getDashboardSummary().catch(() => null),
        api.getAccounts().catch(() => []),
        api.getTransactions().catch(() => []),
        api.getExpenses().catch(() => []),
        api.getCategories().catch(() => []),
        api.getPLReport().catch(() => null),
        api.getCashFlowReport().catch(() => null),
        api.getTaxPrepReport().catch(() => null),
        api.getLedgerJournal().catch(() => ({ ledgerJournal: [], trialBalance: { totalDebits: 0, totalCredits: 0, isBalanced: true } })),
      ]);

      if (sumData) setSummary(sumData);
      if (accData) setAccounts(accData);
      if (txData) setTransactions(txData);
      if (expData) setExpenses(expData);
      if (catData) setCategories(catData);
      if (plData) setPlReport(plData);
      if (cfData) setCashFlowReport(cfData);
      if (taxData) setTaxPrepReport(taxData);
      if (ledgerData) {
        setLedgerJournal(ledgerData.ledgerJournal || []);
        setTrialBalance(ledgerData.trialBalance || null);
      }
    } catch (err) {
      console.error('Error loading financial state:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] dark:bg-[#121212] flex items-center justify-center text-[#141414] dark:text-[#F3F2EE]">
        <div className="flex items-center space-x-3 text-xs font-mono font-semibold uppercase tracking-widest border border-[#141414] dark:border-[#383838] bg-[#DCDAD7] dark:bg-[#1C1C1C] p-4 shadow-xs">
          <div className="w-3.5 h-3.5 border-2 border-[#141414] dark:border-[#F3F2EE] border-t-transparent animate-spin" />
          <span>LOADING...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  // Handlers
  const handleOpenAddTx = (type: 'INFLOW' | 'WITHDRAWAL' | 'TRANSFER' | 'DEPOSIT' = 'DEPOSIT', platform?: string) => {
    setAddTxInitialType(type);
    setAddTxInitialPlatform(platform);
    setIsAddTxOpen(true);
  };

  const handleCreateTransaction = async (data: any) => {
    await api.createTransaction(data);
    await loadAllData();
  };

  const handleUpdateTxStatus = async (id: string, newStatus: string) => {
    await api.updateTransactionStatus(id, newStatus);
    await loadAllData();
  };

  const handleDeleteTransaction = async (id: string) => {
    await api.deleteTransaction(id);
    await loadAllData();
  };

  const handleCreateExpense = async (data: any) => {
    await api.createExpense(data);
    await loadAllData();
  };

  const handleDeleteExpense = async (id: string) => {
    await api.deleteExpense(id);
    await loadAllData();
  };

  return (
    <div className="h-screen w-screen bg-[#E4E3E0] dark:bg-[#121212] text-[#141414] dark:text-[#F3F2EE] flex flex-col font-mono selection:bg-[#141414] selection:text-[#E4E3E0] transition-colors duration-200 overflow-hidden">
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddTransaction={handleOpenAddTx}
        onOpenAddExpense={() => setIsAddExpenseOpen(true)}
        onOpenMfaModal={() => setIsMfaModalOpen(true)}
        onOpenSecurityCenter={() => setIsSecurityCenterOpen(true)}
        onRefreshData={loadAllData}
        isRefreshing={isRefreshing}
      />

      {/* Main App Body */}
      <main className="flex-1 w-full h-full overflow-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5">
        {activeTab === 'dashboard' && (
          <Dashboard
            summary={summary}
            accounts={accounts}
            transactions={transactions}
            expenses={expenses}
            onOpenAddTransaction={handleOpenAddTx}
            onOpenAddExpense={() => setIsAddExpenseOpen(true)}
            onUpdateTransactionStatus={handleUpdateTxStatus}
            onDeleteTransaction={handleDeleteTransaction}
            onNavigateTab={setActiveTab}
            onOpenCreatePlatform={() => setIsCreatePlatformOpen(true)}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionTable
            transactions={transactions}
            accounts={accounts}
            onOpenAddTransaction={handleOpenAddTx}
            onUpdateStatus={handleUpdateTxStatus}
            onDeleteTransaction={handleDeleteTransaction}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpenseTracker
            expenses={expenses}
            categories={categories}
            accounts={accounts}
            onOpenAddExpense={() => setIsAddExpenseOpen(true)}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === 'reports' && (
          <FinancialReports
            plReport={plReport}
            cashFlowReport={cashFlowReport}
            taxPrepReport={taxPrepReport}
            ledgerJournal={ledgerJournal}
            trialBalance={trialBalance}
            user={user}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'settings' && (
          <Settings
            accounts={accounts}
            transactions={transactions}
            expenses={expenses}
            plReport={plReport}
            onRefreshData={loadAllData}
            onOpenMfaModal={() => setIsMfaModalOpen(true)}
            onOpenSecurityCenter={() => setIsSecurityCenterOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => {
          setIsAddTxOpen(false);
          setAddTxInitialPlatform(undefined);
        }}
        accounts={accounts}
        onSubmit={handleCreateTransaction}
        initialType={addTxInitialType}
        initialPlatform={addTxInitialPlatform}
        onOpenCreatePlatform={() => setIsCreatePlatformOpen(true)}
      />

      <CreatePlatformModal
        isOpen={isCreatePlatformOpen}
        onClose={() => setIsCreatePlatformOpen(false)}
        onPlatformCreated={loadAllData}
      />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        categories={categories}
        accounts={accounts}
        onSubmit={handleCreateExpense}
      />

      <MFAModal
        isOpen={isMfaModalOpen}
        onClose={() => setIsMfaModalOpen(false)}
      />

      <SecurityCenterModal
        isOpen={isSecurityCenterOpen}
        onClose={() => setIsSecurityCenterOpen(false)}
        onSeedReset={loadAllData}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <FeatureProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </FeatureProvider>
    </ThemeProvider>
  );
}
