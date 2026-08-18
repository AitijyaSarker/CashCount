import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Edit2,
  Sun,
  Moon,
  Check,
  RotateCcw,
  Sliders,
  Wallet,
  Download,
  FileText,
  Shield,
  Layers,
  Sparkles,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { Account, Transaction, Expense, PLReport } from '../types';
import { PlatformLogo, SupportedPlatform } from './PlatformLogo';
import { useTheme } from '../context/ThemeContext';
import { useFeatures } from '../context/FeatureContext';
import {
  exportTransactionsCSV,
  exportTransactionsPDF,
  exportExpensesCSV,
  exportExpensesPDF,
  exportFinancialReportPDF,
} from '../utils/exportUtils';
import { api } from '../services/api';

interface SettingsProps {
  accounts: Account[];
  transactions: Transaction[];
  expenses: Expense[];
  plReport: PLReport | null;
  businessName?: string;
  onRefreshData: () => void;
  onOpenMfaModal: () => void;
  onOpenSecurityCenter: () => void;
}

const PRESET_PLATFORMS: { id: SupportedPlatform; label: string }[] = [
  { id: 'Stripe', label: 'Stripe' },
  { id: 'Dots', label: 'Dots' },
  { id: 'Bank', label: 'Bank Account' },
  { id: 'Payoneer', label: 'Payoneer' },
  { id: 'bKash', label: 'bKash' },
  { id: 'PayPal', label: 'PayPal' },
  { id: 'Wise', label: 'Wise' },
  { id: 'Crypto', label: 'Crypto Wallet' },
  { id: 'Upwork', label: 'Upwork Direct' },
  { id: 'Fiverr', label: 'Fiverr' },
];

export const Settings: React.FC<SettingsProps> = ({
  accounts,
  transactions,
  expenses,
  plReport,
  businessName = 'Freelance Studio',
  onRefreshData,
  onOpenMfaModal,
  onOpenSecurityCenter,
}) => {
  const { theme, toggleTheme, setTheme } = useTheme();
  const { features, updateFeatureConfig, resetFeatureConfig } = useFeatures();

  // Active settings section
  const [activeSection, setActiveSection] = useState<'PLATFORMS' | 'FEATURES' | 'THEME' | 'DATA' | 'SECURITY'>('PLATFORMS');

  // New Platform Form State
  const [isAddingPlatform, setIsAddingPlatform] = useState<boolean>(false);
  const [platformName, setPlatformName] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<SupportedPlatform>('bKash');
  const [logoMode, setLogoMode] = useState<'preset' | 'upload' | 'url'>('preset');
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [initialBalance, setInitialBalance] = useState<string>('0');
  const [currency, setCurrency] = useState<string>('USD');
  const [accountIdentifier, setAccountIdentifier] = useState<string>('');
  const [isSubmittingPlatform, setIsSubmittingPlatform] = useState<boolean>(false);
  const [platformError, setPlatformError] = useState<string | null>(null);

  // Edit Platform State
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editAccountName, setEditAccountName] = useState<string>('');
  const [editBalance, setEditBalance] = useState<string>('');

  // Feature Config Form State
  const [depositLabel, setDepositLabel] = useState<string>(features.depositLabel);
  const [withdrawLabel, setWithdrawLabel] = useState<string>(features.withdrawLabel);
  const [transferLabel, setTransferLabel] = useState<string>(features.transferLabel);
  const [expenseLabel, setExpenseLabel] = useState<string>(features.expenseLabel);
  const [featureSaveSuccess, setFeatureSaveSuccess] = useState<boolean>(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPlatformError('Please upload an image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPlatformError('File size exceeds 5MB limit.');
      return;
    }

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setCustomLogoUrl(event.target.result);
        setPlatformError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlatformError(null);

    const nameToUse = platformName.trim() || selectedPreset;
    if (!nameToUse) {
      setPlatformError('Please enter a platform name.');
      return;
    }

    setIsSubmittingPlatform(true);
    try {
      await api.createAccount({
        platformName: nameToUse,
        accountName: `${nameToUse} Wallet`,
        initialBalance: parseFloat(initialBalance) || 0,
        currency,
        accountIdentifier: accountIdentifier.trim() || undefined,
        logoUrl: customLogoUrl.trim() || undefined,
      });

      // Reset form
      setPlatformName('');
      setInitialBalance('0');
      setAccountIdentifier('');
      setCustomLogoUrl('');
      setUploadedFileName('');
      setLogoMode('preset');
      setIsAddingPlatform(false);
      onRefreshData();
    } catch (err: any) {
      setPlatformError(err.message || 'Failed to add platform.');
    } finally {
      setIsSubmittingPlatform(false);
    }
  };

  const handleDeletePlatform = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete platform "${name}"?`)) {
      try {
        await api.deleteAccount(id);
        onRefreshData();
      } catch (err: any) {
        alert(err.message || 'Failed to delete platform.');
      }
    }
  };

  const handleUpdatePlatform = async (id: string) => {
    try {
      await api.updateAccount(id, {
        account_name: editAccountName,
        current_balance: parseFloat(editBalance) || 0,
      });
      setEditingAccountId(null);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to update platform.');
    }
  };

  const handleSaveFeatures = (e: React.FormEvent) => {
    e.preventDefault();
    updateFeatureConfig({
      depositLabel: depositLabel.trim() || 'Deposit',
      withdrawLabel: withdrawLabel.trim() || 'Withdraw',
      transferLabel: transferLabel.trim() || 'Transfer',
      expenseLabel: expenseLabel.trim() || 'Expense',
    });
    setFeatureSaveSuccess(true);
    setTimeout(() => setFeatureSaveSuccess(false), 2500);
  };

  const handleResetFeatures = () => {
    resetFeatureConfig();
    setDepositLabel('Deposit');
    setWithdrawLabel('Withdraw');
    setTransferLabel('Transfer');
    setExpenseLabel('Expense');
    setFeatureSaveSuccess(true);
    setTimeout(() => setFeatureSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* 1. Top Settings Header */}
      <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#141414] dark:text-[#F3F2EE] font-mono">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-[#141414] dark:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] border border-[#141414] dark:border-[#383838] flex items-center justify-center">
            <SettingsIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider">
              System Settings & Customization
            </h2>
            <p className="text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70 mt-0.5">
              MANAGE PLATFORMS, LOGOS, CUSTOM FEATURE NAMES, DARK/LIGHT MODE & EXPORTS
            </p>
          </div>
        </div>

        {/* Quick Theme Toggle in Top Right */}
        <div className="flex items-center space-x-2">
          <button
            id="settings-theme-toggle-btn"
            onClick={toggleTheme}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#E4E3E0] dark:bg-[#2A2A2A] hover:bg-[#141414] hover:text-[#E4E3E0] dark:hover:bg-[#383838] text-[#141414] dark:text-[#F3F2EE] text-xs font-mono font-bold uppercase border border-[#141414] dark:border-[#383838] transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-700" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </div>

      {/* 2. Settings Nav Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 bg-[#E4E3E0] dark:bg-[#1C1C1C] p-1 border border-[#141414] dark:border-[#383838] font-mono text-xs">
        <button
          id="tab-settings-platforms"
          onClick={() => setActiveSection('PLATFORMS')}
          className={`py-2 px-3 text-center font-bold uppercase transition-colors border ${
            activeSection === 'PLATFORMS'
              ? 'bg-[#141414] dark:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] border-[#141414] dark:border-[#383838]'
              : 'text-[#141414] dark:text-[#F3F2EE]/80 border-transparent hover:bg-[#D4D2CE] dark:hover:bg-[#262626]'
          }`}
        >
          Platforms & Logos
        </button>

        <button
          id="tab-settings-features"
          onClick={() => setActiveSection('FEATURES')}
          className={`py-2 px-3 text-center font-bold uppercase transition-colors border ${
            activeSection === 'FEATURES'
              ? 'bg-[#141414] dark:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] border-[#141414] dark:border-[#383838]'
              : 'text-[#141414] dark:text-[#F3F2EE]/80 border-transparent hover:bg-[#D4D2CE] dark:hover:bg-[#262626]'
          }`}
        >
          Feature Names
        </button>

        <button
          id="tab-settings-theme"
          onClick={() => setActiveSection('THEME')}
          className={`py-2 px-3 text-center font-bold uppercase transition-colors border ${
            activeSection === 'THEME'
              ? 'bg-[#141414] dark:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] border-[#141414] dark:border-[#383838]'
              : 'text-[#141414] dark:text-[#F3F2EE]/80 border-transparent hover:bg-[#D4D2CE] dark:hover:bg-[#262626]'
          }`}
        >
          Dark / Light Mode
        </button>

        <button
          id="tab-settings-data"
          onClick={() => setActiveSection('DATA')}
          className={`py-2 px-3 text-center font-bold uppercase transition-colors border ${
            activeSection === 'DATA'
              ? 'bg-[#141414] dark:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] border-[#141414] dark:border-[#383838]'
              : 'text-[#141414] dark:text-[#F3F2EE]/80 border-transparent hover:bg-[#D4D2CE] dark:hover:bg-[#262626]'
          }`}
        >
          CSV & PDF Exports
        </button>

        <button
          id="tab-settings-security"
          onClick={() => setActiveSection('SECURITY')}
          className={`py-2 px-3 text-center font-bold uppercase transition-colors border ${
            activeSection === 'SECURITY'
              ? 'bg-[#141414] dark:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] border-[#141414] dark:border-[#383838]'
              : 'text-[#141414] dark:text-[#F3F2EE]/80 border-transparent hover:bg-[#D4D2CE] dark:hover:bg-[#262626]'
          }`}
        >
          Security & 2FA
        </button>
      </div>

      {/* 3. SECTION 1: PLATFORM MANAGEMENT & LOGOS */}
      {activeSection === 'PLATFORMS' && (
        <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] p-5 space-y-5 text-[#141414] dark:text-[#F3F2EE] font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#141414] dark:border-[#383838]">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Platforms & Payment Rails ({accounts.length} Active)
              </h3>
              <p className="text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70 mt-0.5">
                Add, customize logos, view live balances, or delete payment platforms
              </p>
            </div>
            <button
              id="open-add-platform-btn"
              onClick={() => setIsAddingPlatform(!isAddingPlatform)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#141414] dark:bg-[#2A2A2A] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] text-xs font-bold uppercase border border-[#141414] dark:border-[#383838]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingPlatform ? 'Cancel' : '+ Add Platform'}</span>
            </button>
          </div>

          {/* Add Platform Form Panel */}
          {isAddingPlatform && (
            <form onSubmit={handleCreatePlatform} className="bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-[#141414]/20 dark:border-[#383838] pb-2">
                <h4 className="font-bold uppercase tracking-wider text-xs flex items-center space-x-1.5">
                  <Wallet className="w-4 h-4" />
                  <span>Add New Payment Platform / Wallet</span>
                </h4>
                <span className="text-[10px] text-[#141414]/60 dark:text-[#F3F2EE]/60">
                  Custom Branding & Instant Sync
                </span>
              </div>

              {platformError && (
                <div className="p-2 bg-rose-100 dark:bg-rose-950/50 border border-rose-700 text-rose-800 dark:text-rose-300 font-bold text-[11px]">
                  {platformError}
                </div>
              )}

              {/* Logo Selection Mode Tabs */}
              <div>
                <label className="block font-bold text-[11px] uppercase mb-1.5">
                  Platform Logo / Icon:
                </label>
                <div className="flex border border-[#141414] dark:border-[#383838] bg-[#DCDAD7] dark:bg-[#1C1C1C] p-0.5 mb-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLogoMode('preset');
                      setCustomLogoUrl('');
                    }}
                    className={`flex-1 py-1 text-[11px] font-bold uppercase transition-colors ${
                      logoMode === 'preset'
                        ? 'bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE]'
                        : 'text-[#141414] dark:text-[#F3F2EE]/70 hover:bg-[#D4D2CE] dark:hover:bg-[#2A2A2A]'
                    }`}
                  >
                    1. Brand Preset Icons
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoMode('upload')}
                    className={`flex-1 py-1 text-[11px] font-bold uppercase transition-colors ${
                      logoMode === 'upload'
                        ? 'bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE]'
                        : 'text-[#141414] dark:text-[#F3F2EE]/70 hover:bg-[#D4D2CE] dark:hover:bg-[#2A2A2A]'
                    }`}
                  >
                    2. Upload Logo File
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoMode('url')}
                    className={`flex-1 py-1 text-[11px] font-bold uppercase transition-colors ${
                      logoMode === 'url'
                        ? 'bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE]'
                        : 'text-[#141414] dark:text-[#F3F2EE]/70 hover:bg-[#D4D2CE] dark:hover:bg-[#2A2A2A]'
                    }`}
                  >
                    3. Custom Image URL
                  </button>
                </div>

                {/* Mode 1: Presets */}
                {logoMode === 'preset' && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {PRESET_PLATFORMS.map(preset => {
                      const isSelected = selectedPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          id={`select-preset-${preset.id.toLowerCase()}`}
                          onClick={() => {
                            setSelectedPreset(preset.id);
                            if (!platformName || PRESET_PLATFORMS.some(p => p.label === platformName || p.id === platformName)) {
                              setPlatformName(preset.label);
                            }
                          }}
                          className={`p-2 border flex flex-col items-center justify-center space-y-1 transition-all ${
                            isSelected
                              ? 'bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE] border-[#141414] dark:border-white shadow-xs'
                              : 'bg-[#DCDAD7] dark:bg-[#1C1C1C] text-[#141414] dark:text-[#F3F2EE] border-[#141414]/30 dark:border-[#383838] hover:border-[#141414]'
                          }`}
                        >
                          <PlatformLogo platform={preset.id} size="md" />
                          <span className="text-[10px] font-bold truncate max-w-full">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Mode 2: Upload Image File */}
                {logoMode === 'upload' && (
                  <div className="border border-dashed border-[#141414]/40 dark:border-[#383838] p-3.5 bg-[#DCDAD7]/50 dark:bg-[#1C1C1C]/50 flex flex-col items-center justify-center text-center">
                    <input
                      type="file"
                      id="platform-logo-file-input"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="platform-logo-file-input"
                      className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE] font-bold uppercase text-[11px] border border-[#141414] dark:border-white hover:bg-[#2A2A2A] transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadedFileName ? 'Change Logo Image' : 'Browse & Upload Logo File'}</span>
                    </label>
                    <p className="text-[10px] text-[#141414]/60 dark:text-[#F3F2EE]/60 mt-1.5">
                      Supports PNG, JPG, SVG, WebP up to 5MB
                    </p>
                    {customLogoUrl && (
                      <div className="mt-2 flex items-center space-x-2 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] px-2 py-1">
                        <img src={customLogoUrl} alt="Preview" className="w-5 h-5 object-contain" />
                        <span className="text-[10px] font-bold truncate max-w-xs">{uploadedFileName || 'Custom Upload'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomLogoUrl('');
                            setUploadedFileName('');
                          }}
                          className="p-0.5 hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode 3: Image URL */}
                {logoMode === 'url' && (
                  <div className="space-y-1.5">
                    <input
                      type="url"
                      id="platform-logo-url-input"
                      placeholder="https://example.com/logo.png"
                      value={customLogoUrl}
                      onChange={e => setCustomLogoUrl(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] font-mono focus:outline-none text-xs"
                    />
                    <p className="text-[10px] text-[#141414]/60 dark:text-[#F3F2EE]/60">
                      Paste direct public image URL
                    </p>
                  </div>
                )}
              </div>

              {/* Custom Name & Identifier */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[11px] uppercase mb-1">
                    Platform Name:
                  </label>
                  <input
                    id="new-platform-name-input"
                    type="text"
                    placeholder="e.g. bKash, Revolut, Custom Bank"
                    value={platformName}
                    onChange={e => setPlatformName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] font-mono focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[11px] uppercase mb-1">
                    Starting Balance ($):
                  </label>
                  <input
                    id="new-platform-balance-input"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={initialBalance}
                    onChange={e => setInitialBalance(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[11px] uppercase mb-1">
                    Account / Wallet ID (Optional):
                  </label>
                  <input
                    id="new-platform-id-input"
                    type="text"
                    placeholder="e.g. +8801700000000 or act_992"
                    value={accountIdentifier}
                    onChange={e => setAccountIdentifier(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddingPlatform(false)}
                  className="px-3 py-1.5 bg-[#DCDAD7] dark:bg-[#1C1C1C] text-[#141414] dark:text-[#F3F2EE] font-bold uppercase border border-[#141414] dark:border-[#383838]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-create-platform-btn"
                  disabled={isSubmittingPlatform}
                  className="px-4 py-1.5 bg-[#141414] dark:bg-[#383838] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] font-bold uppercase border border-[#141414] dark:border-white disabled:opacity-50"
                >
                  {isSubmittingPlatform ? 'Saving...' : '+ Save Platform'}
                </button>
              </div>
            </form>
          )}

          {/* Current Platforms Table */}
          <div className="overflow-x-auto border border-[#141414] dark:border-[#383838] bg-[#E4E3E0] dark:bg-[#262626]">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border-b border-[#141414] dark:border-[#383838] font-bold uppercase text-[10px] text-[#141414] dark:text-[#F3F2EE]">
                  <th className="py-2.5 px-3 border-r border-[#141414]/20 dark:border-[#383838]">Logo</th>
                  <th className="py-2.5 px-3 border-r border-[#141414]/20 dark:border-[#383838]">Platform Name</th>
                  <th className="py-2.5 px-3 border-r border-[#141414]/20 dark:border-[#383838]">Wallet / Account Title</th>
                  <th className="py-2.5 px-3 border-r border-[#141414]/20 dark:border-[#383838]">Identifier</th>
                  <th className="py-2.5 px-3 text-right border-r border-[#141414]/20 dark:border-[#383838]">Live Balance</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]/20 dark:divide-[#383838]">
                {accounts.map(acc => {
                  const isEditing = editingAccountId === acc.id;

                  return (
                    <tr key={acc.id} className="hover:bg-[#D4D2CE] dark:hover:bg-[#303030] transition-colors">
                      {/* Logo with customLogoUrl support */}
                      <td className="py-2.5 px-3 whitespace-nowrap border-r border-[#141414]/20 dark:border-[#383838]">
                        <PlatformLogo
                          platform={acc.platform_name}
                          customLogoUrl={acc.logo_url || undefined}
                          size="md"
                        />
                      </td>

                      {/* Platform Name */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold border-r border-[#141414]/20 dark:border-[#383838]">
                        {acc.platform_name}
                      </td>

                      {/* Account Name */}
                      <td className="py-2.5 px-3 border-r border-[#141414]/20 dark:border-[#383838]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editAccountName}
                            onChange={e => setEditAccountName(e.target.value)}
                            className="px-2 py-1 bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] w-full text-xs"
                          />
                        ) : (
                          <span>{acc.account_name}</span>
                        )}
                      </td>

                      {/* Identifier */}
                      <td className="py-2.5 px-3 border-r border-[#141414]/20 dark:border-[#383838] text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70">
                        {acc.account_identifier_masked || '—'}
                      </td>

                      {/* Balance */}
                      <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap border-r border-[#141414]/20 dark:border-[#383838]">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editBalance}
                            onChange={e => setEditBalance(e.target.value)}
                            className="px-2 py-1 bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] w-24 text-right text-xs"
                          />
                        ) : (
                          <span className="text-emerald-800 dark:text-emerald-400">
                            ${acc.current_balance.toFixed(2)} USD
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap space-x-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleUpdatePlatform(acc.id)}
                              className="px-2 py-1 bg-emerald-800 text-white font-bold text-[10px] uppercase border border-emerald-900"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingAccountId(null)}
                              className="px-2 py-1 bg-[#DCDAD7] dark:bg-[#1C1C1C] text-[#141414] dark:text-[#F3F2EE] font-bold text-[10px] uppercase border border-[#141414] dark:border-[#383838]"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingAccountId(acc.id);
                                setEditAccountName(acc.account_name);
                                setEditBalance(acc.current_balance.toString());
                              }}
                              className="p-1 text-[#141414]/70 dark:text-[#F3F2EE]/70 hover:text-[#141414] dark:hover:text-white"
                              title="Edit platform details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`delete-platform-btn-${acc.id}`}
                              onClick={() => handleDeletePlatform(acc.id, acc.platform_name)}
                              className="p-1 text-rose-700 hover:text-rose-900"
                              title="Delete platform"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. SECTION 2: FEATURE MANAGEMENT & FUNCTION RENAMING */}
      {activeSection === 'FEATURES' && (
        <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] p-5 space-y-5 text-[#141414] dark:text-[#F3F2EE] font-mono">
          <div className="pb-3 border-b border-[#141414] dark:border-[#383838]">
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Feature & Action Customizer
            </h3>
            <p className="text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70 mt-0.5">
              Customize the function names of buttons like Deposit, Withdraw, Transfer, and Expense to fit your personal workflow terminology (e.g. Cash In, Payout, Add Money)
            </p>
          </div>

          {featureSaveSuccess && (
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center space-x-1.5">
              <Check className="w-4 h-4" />
              <span>Feature function names updated and applied across the entire interface!</span>
            </div>
          )}

          <form onSubmit={handleSaveFeatures} className="space-y-4 max-w-2xl bg-[#E4E3E0] dark:bg-[#262626] p-4 border border-[#141414] dark:border-[#383838] text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Deposit Feature Label */}
              <div>
                <label className="block font-bold text-[11px] uppercase mb-1">
                  1. Deposit Function Name:
                </label>
                <input
                  id="feature-deposit-name-input"
                  type="text"
                  value={depositLabel}
                  onChange={e => setDepositLabel(e.target.value)}
                  placeholder="e.g. Deposit, Cash In, Add Money, Payout Inflow"
                  className="w-full px-2.5 py-1.5 bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] font-mono font-bold focus:outline-none"
                  required
                />
                <span className="text-[10px] text-[#141414]/60 dark:text-[#F3F2EE]/60 block mt-0.5">
                  Used on top action bar, dashboard buttons, and modal title
                </span>
              </div>

              {/* Withdraw Feature Label */}
              <div>
                <label className="block font-bold text-[11px] uppercase mb-1">
                  2. Withdraw Function Name:
                </label>
                <input
                  id="feature-withdraw-name-input"
                  type="text"
                  value={withdrawLabel}
                  onChange={e => setWithdrawLabel(e.target.value)}
                  placeholder="e.g. Withdraw, Cash Out, Send Money, Payout"
                  className="w-full px-2.5 py-1.5 bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] font-mono font-bold focus:outline-none"
                  required
                />
                <span className="text-[10px] text-[#141414]/60 dark:text-[#F3F2EE]/60 block mt-0.5">
                  Used for payout operations and bank cash-outs
                </span>
              </div>

              {/* Transfer Feature Label */}
              <div>
                <label className="block font-bold text-[11px] uppercase mb-1">
                  3. Transfer Function Name:
                </label>
                <input
                  id="feature-transfer-name-input"
                  type="text"
                  value={transferLabel}
                  onChange={e => setTransferLabel(e.target.value)}
                  placeholder="e.g. Transfer, Inter-Wallet Sweep, Move Funds"
                  className="w-full px-2.5 py-1.5 bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] font-mono font-bold focus:outline-none"
                  required
                />
              </div>

              {/* Expense Feature Label */}
              <div>
                <label className="block font-bold text-[11px] uppercase mb-1">
                  4. Expense Function Name:
                </label>
                <input
                  id="feature-expense-name-input"
                  type="text"
                  value={expenseLabel}
                  onChange={e => setExpenseLabel(e.target.value)}
                  placeholder="e.g. Expense, Spent, Business Write-Off"
                  className="w-full px-2.5 py-1.5 bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] font-mono font-bold focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#141414]/20 dark:border-[#383838] flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetFeatures}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#DCDAD7] dark:bg-[#1C1C1C] text-[#141414] dark:text-[#F3F2EE] text-xs font-bold uppercase border border-[#141414] dark:border-[#383838]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Defaults</span>
              </button>

              <button
                type="submit"
                id="save-features-btn"
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-[#141414] dark:bg-[#383838] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] text-xs font-bold uppercase border border-[#141414] dark:border-white shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Feature Names</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. SECTION 3: DARK MODE & LIGHT MODE */}
      {activeSection === 'THEME' && (
        <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] p-5 space-y-5 text-[#141414] dark:text-[#F3F2EE] font-mono">
          <div className="pb-3 border-b border-[#141414] dark:border-[#383838]">
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Display & Color Theme
            </h3>
            <p className="text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70 mt-0.5">
              Choose between high-contrast daylight aesthetic and sleek low-light dark mode
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {/* Light Mode Card */}
            <div
              onClick={() => setTheme('light')}
              className={`p-4 border-2 cursor-pointer transition-all ${
                theme === 'light'
                  ? 'border-[#141414] bg-[#E4E3E0] shadow-md'
                  : 'border-[#141414]/30 bg-[#D4D2CE]/40 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#141414]/30">
                <div className="flex items-center space-x-2">
                  <Sun className="w-5 h-5 text-amber-600" />
                  <span className="font-bold text-xs uppercase text-[#141414]">Light Mode</span>
                </div>
                {theme === 'light' && (
                  <span className="px-2 py-0.5 bg-[#141414] text-[#E4E3E0] text-[10px] font-bold uppercase">
                    Active
                  </span>
                )}
              </div>
              <div className="mt-3 p-3 bg-[#DCDAD7] border border-[#141414] text-[#141414] text-[11px] space-y-1">
                <div className="font-bold">Retro Minimal Daylight Canvas</div>
                <div className="text-[#141414]/70">Crisp high-contrast borders and sharp typography.</div>
              </div>
            </div>

            {/* Dark Mode Card */}
            <div
              onClick={() => setTheme('dark')}
              className={`p-4 border-2 cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'border-white bg-[#1C1C1C] text-[#F3F2EE] shadow-md'
                  : 'border-[#141414]/30 bg-[#2A2A2A]/40 text-[#F3F2EE] opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#383838]">
                <div className="flex items-center space-x-2">
                  <Moon className="w-5 h-5 text-indigo-400" />
                  <span className="font-bold text-xs uppercase text-[#F3F2EE]">Dark Mode</span>
                </div>
                {theme === 'dark' && (
                  <span className="px-2 py-0.5 bg-[#383838] text-white text-[10px] font-bold uppercase">
                    Active
                  </span>
                )}
              </div>
              <div className="mt-3 p-3 bg-[#262626] border border-[#383838] text-[#F3F2EE] text-[11px] space-y-1">
                <div className="font-bold">OLED Dark Night Canvas</div>
                <div className="text-[#F3F2EE]/70">Eye-friendly contrast with dark panels and neon status tags.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SECTION 4: CSV & PDF EXPORT HUB */}
      {activeSection === 'DATA' && (
        <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] p-5 space-y-5 text-[#141414] dark:text-[#F3F2EE] font-mono">
          <div className="pb-3 border-b border-[#141414] dark:border-[#383838]">
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Data Exports (CSV & PDF)
            </h3>
            <p className="text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70 mt-0.5">
              Export your transactions, write-offs, and accountant statements as structured CSVs or printable PDFs
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Transactions Export */}
            <div className="bg-[#E4E3E0] dark:bg-[#262626] p-4 border border-[#141414] dark:border-[#383838] flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-xs uppercase text-[#141414] dark:text-[#F3F2EE]">
                  Transactions Statement
                </h4>
                <p className="text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70 mt-1">
                  Complete ledger of {transactions.length} deposits, withdrawals, fees, and notes.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#141414]/20 dark:border-[#383838]">
                <button
                  id="export-txs-csv-btn"
                  onClick={() => exportTransactionsCSV(transactions)}
                  className="py-1.5 px-2 bg-[#DCDAD7] dark:bg-[#1C1C1C] hover:bg-[#141414] hover:text-[#E4E3E0] text-[#141414] dark:text-[#F3F2EE] text-xs font-bold uppercase border border-[#141414] dark:border-[#383838] flex items-center justify-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  id="export-txs-pdf-btn"
                  onClick={() => exportTransactionsPDF(transactions, `${businessName} Transactions`)}
                  className="py-1.5 px-2 bg-[#141414] dark:bg-[#383838] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] text-xs font-bold uppercase border border-[#141414] dark:border-white flex items-center justify-center space-x-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* Expenses Export */}
            <div className="bg-[#E4E3E0] dark:bg-[#262626] p-4 border border-[#141414] dark:border-[#383838] flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-xs uppercase text-[#141414] dark:text-[#F3F2EE]">
                  Expenses & Tax Write-Offs
                </h4>
                <p className="text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70 mt-1">
                  Itemized list of {expenses.length} operating costs with Schedule C tax lines.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#141414]/20 dark:border-[#383838]">
                <button
                  id="export-exp-csv-btn"
                  onClick={() => exportExpensesCSV(expenses)}
                  className="py-1.5 px-2 bg-[#DCDAD7] dark:bg-[#1C1C1C] hover:bg-[#141414] hover:text-[#E4E3E0] text-[#141414] dark:text-[#F3F2EE] text-xs font-bold uppercase border border-[#141414] dark:border-[#383838] flex items-center justify-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  id="export-exp-pdf-btn"
                  onClick={() => exportExpensesPDF(expenses, `${businessName} Expenses`)}
                  className="py-1.5 px-2 bg-[#141414] dark:bg-[#383838] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] text-xs font-bold uppercase border border-[#141414] dark:border-white flex items-center justify-center space-x-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* P&L Statement Export */}
            <div className="bg-[#E4E3E0] dark:bg-[#262626] p-4 border border-[#141414] dark:border-[#383838] flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-xs uppercase text-[#141414] dark:text-[#F3F2EE]">
                  P&L Accountant Financials
                </h4>
                <p className="text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70 mt-1">
                  Full formal GAAP P&L statement with rail breakdowns and tax provisions.
                </p>
              </div>

              <div className="pt-2 border-t border-[#141414]/20 dark:border-[#383838]">
                <button
                  id="export-pl-pdf-btn"
                  onClick={() => exportFinancialReportPDF(plReport, businessName)}
                  className="w-full py-1.5 px-2 bg-[#141414] dark:bg-[#383838] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] text-xs font-bold uppercase border border-[#141414] dark:border-white flex items-center justify-center space-x-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export P&L PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. SECTION 5: SECURITY & 2FA */}
      {activeSection === 'SECURITY' && (
        <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] p-5 space-y-5 text-[#141414] dark:text-[#F3F2EE] font-mono">
          <div className="pb-3 border-b border-[#141414] dark:border-[#383838]">
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Account Security & Two-Factor Authentication
            </h3>
            <p className="text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70 mt-0.5">
              Protect your multi-platform balances with TOTP Authenticator 2FA and audit logs
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#E4E3E0] dark:bg-[#262626] p-4 border border-[#141414] dark:border-[#383838] flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs uppercase">Two-Factor Authentication (2FA)</h4>
                <p className="text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70 mt-1">
                  Require an authenticator app code on login to secure withdrawals and funds.
                </p>
              </div>
              <button
                onClick={onOpenMfaModal}
                className="mt-3 w-full py-1.5 bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE] font-bold uppercase text-xs border border-[#141414] dark:border-white"
              >
                Configure 2FA
              </button>
            </div>

            <div className="bg-[#E4E3E0] dark:bg-[#262626] p-4 border border-[#141414] dark:border-[#383838] flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs uppercase">Security Audit Center</h4>
                <p className="text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70 mt-1">
                  Inspect login IP trails, cryptographic ledger status, or reset demo state.
                </p>
              </div>
              <button
                onClick={onOpenSecurityCenter}
                className="mt-3 w-full py-1.5 bg-[#DCDAD7] dark:bg-[#1C1C1C] text-[#141414] dark:text-[#F3F2EE] font-bold uppercase text-xs border border-[#141414] dark:border-[#383838]"
              >
                Open Audit Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Credit */}
      <div className="bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] p-3 text-center text-[10px] text-[#141414]/60 dark:text-[#F3F2EE]/60 font-mono">
        Built with ❤️ by Aitijya Sarker | Cashcount - Freelancer Finance Manager
      </div>
    </div>
  );
};
