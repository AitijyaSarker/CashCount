import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  DollarSign,
  Check,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { PlatformLogo, SupportedPlatform } from './PlatformLogo';
import { api } from '../services/api';

interface CreatePlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlatformCreated: () => void;
}

const PRESET_PLATFORMS: { id: SupportedPlatform; label: string }[] = [
  { id: 'bKash', label: 'bKash' },
  { id: 'Dots', label: 'Dots' },
  { id: 'Bank', label: 'Bank Account' },
  { id: 'Stripe', label: 'Stripe' },
  { id: 'Payoneer', label: 'Payoneer' },
  { id: 'PayPal', label: 'PayPal' },
  { id: 'Wise', label: 'Wise' },
  { id: 'Crypto', label: 'Crypto' },
  { id: 'Upwork', label: 'Upwork' },
  { id: 'Fiverr', label: 'Fiverr' },
];

export const CreatePlatformModal: React.FC<CreatePlatformModalProps> = ({
  isOpen,
  onClose,
  onPlatformCreated,
}) => {
  const [platformName, setPlatformName] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [initialBalance, setInitialBalance] = useState<string>('0');
  const [currency, setCurrency] = useState<string>('USD');
  const [accountIdentifier, setAccountIdentifier] = useState<string>('');
  
  // Logo Choice: 'PRESET' | 'UPLOAD' | 'URL'
  const [logoMode, setLogoMode] = useState<'PRESET' | 'UPLOAD' | 'URL'>('PRESET');
  const [selectedPreset, setSelectedPreset] = useState<SupportedPlatform>('bKash');
  const [uploadedLogoData, setUploadedLogoData] = useState<string | null>(null);
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, SVG, WebP, etc.).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file must be under 5MB.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUploadedLogoData(result);
      setLogoMode('UPLOAD');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameToUse = platformName.trim();
    if (!nameToUse) {
      setError('Platform name is required.');
      return;
    }

    let finalLogoUrl: string | null = null;
    if (logoMode === 'UPLOAD' && uploadedLogoData) {
      finalLogoUrl = uploadedLogoData;
    } else if (logoMode === 'URL' && customLogoUrl.trim()) {
      finalLogoUrl = customLogoUrl.trim();
    }

    setIsSubmitting(true);
    try {
      await api.createAccount({
        platformName: nameToUse,
        accountName: accountName.trim() || `${nameToUse} Wallet`,
        initialBalance: parseFloat(initialBalance) || 0,
        currency,
        accountIdentifier: accountIdentifier.trim() || undefined,
        logoUrl: finalLogoUrl,
      });

      onPlatformCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create platform.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentActiveLogoUrl =
    logoMode === 'UPLOAD' ? uploadedLogoData || undefined : logoMode === 'URL' ? customLogoUrl || undefined : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-mono text-[#141414] dark:text-[#F3F2EE]">
      <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border-2 border-[#141414] dark:border-[#383838] max-w-xl w-full p-5 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#141414] dark:border-[#383838]">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-[#141414] dark:bg-[#262626] text-[#E4E3E0] dark:text-[#F3F2EE] border border-[#141414] dark:border-[#383838]">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider">Create New Platform & Wallet</h2>
              <p className="text-[10px] text-[#141414]/70 dark:text-[#F3F2EE]/70">
                ADD PAYMENT RAIL WITH NAME, BALANCE, AND CUSTOM LOGO
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#141414] hover:text-[#E4E3E0] dark:hover:bg-[#383838] border border-[#141414] dark:border-[#383838] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2 bg-rose-100 dark:bg-rose-950/60 border border-rose-700 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center space-x-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Platform Name & Wallet Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[11px] uppercase mb-1">
                Platform Name *
              </label>
              <input
                id="modal-platform-name-input"
                type="text"
                value={platformName}
                onChange={e => {
                  setPlatformName(e.target.value);
                  if (!accountName) setAccountName(`${e.target.value} Account`);
                }}
                placeholder="e.g. bKash, Revolut, Mercury Bank"
                className="w-full px-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] font-mono focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-[11px] uppercase mb-1">
                Account / Wallet Label
              </label>
              <input
                id="modal-account-name-input"
                type="text"
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                placeholder="e.g. Primary Inflow Wallet"
                className="w-full px-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Starting Balance & Identifier */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[11px] uppercase mb-1">
                Starting Balance ($)
              </label>
              <input
                id="modal-platform-balance-input"
                type="number"
                step="0.01"
                value={initialBalance}
                onChange={e => setInitialBalance(e.target.value)}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] font-mono focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-[11px] uppercase mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] font-mono focus:outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="BDT">BDT (৳)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[11px] uppercase mb-1">
                Account ID / Number (Opt)
              </label>
              <input
                id="modal-platform-id-input"
                type="text"
                value={accountIdentifier}
                onChange={e => setAccountIdentifier(e.target.value)}
                placeholder="e.g. +8801700000000"
                className="w-full px-2.5 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* LOGO SELECTION & UPLOAD HUB */}
          <div className="bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] p-3 space-y-3">
            <div className="flex items-center justify-between border-b border-[#141414]/20 dark:border-[#383838] pb-1.5">
              <span className="font-bold text-[11px] uppercase">Platform Logo Option:</span>
              <div className="flex bg-[#DCDAD7] dark:bg-[#1C1C1C] p-0.5 border border-[#141414] dark:border-[#383838]">
                <button
                  type="button"
                  id="tab-logo-upload"
                  onClick={() => setLogoMode('UPLOAD')}
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                    logoMode === 'UPLOAD'
                      ? 'bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE]'
                      : 'text-[#141414] dark:text-[#F3F2EE]/70'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  id="tab-logo-preset"
                  onClick={() => setLogoMode('PRESET')}
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                    logoMode === 'PRESET'
                      ? 'bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE]'
                      : 'text-[#141414] dark:text-[#F3F2EE]/70'
                  }`}
                >
                  Brand Preset
                </button>
                <button
                  type="button"
                  id="tab-logo-url"
                  onClick={() => setLogoMode('URL')}
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                    logoMode === 'URL'
                      ? 'bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE]'
                      : 'text-[#141414] dark:text-[#F3F2EE]/70'
                  }`}
                >
                  Image URL
                </button>
              </div>
            </div>

            {/* Mode 1: Upload File */}
            {logoMode === 'UPLOAD' && (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => e.target.files && e.target.files[0] && handleFileChange(e.target.files[0])}
                  className="hidden"
                />

                {uploadedLogoData ? (
                  <div className="flex items-center justify-between p-2.5 bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838]">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/10 dark:bg-white/5 border border-[#141414]/30 dark:border-[#383838] rounded-md overflow-hidden flex items-center justify-center p-1">
                        <img src={uploadedLogoData} alt="Uploaded logo" className="max-w-full max-h-full object-contain" />
                      </div>
                      <div>
                        <span className="font-bold text-xs uppercase text-emerald-800 dark:text-emerald-400">✓ Custom Logo Uploaded</span>
                        <p className="text-[10px] text-[#141414]/70 dark:text-[#F3F2EE]/70">Ready to save with platform</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2 py-1 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] font-bold text-[10px] uppercase"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadedLogoData(null)}
                        className="p-1 text-rose-700 hover:text-rose-900"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
                        : 'border-[#141414]/40 dark:border-[#383838] hover:border-[#141414] dark:hover:border-white bg-[#DCDAD7]/50 dark:bg-[#1C1C1C]/50'
                    }`}
                  >
                    <Upload className="w-5 h-5 mx-auto mb-1 text-[#141414]/70 dark:text-[#F3F2EE]/70" />
                    <span className="font-bold text-xs uppercase block">Drag & Drop Logo Image Here</span>
                    <span className="text-[10px] text-[#141414]/60 dark:text-[#F3F2EE]/60 block mt-0.5">
                      or click to browse from device (PNG, JPG, SVG, WebP up to 5MB)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Brand Preset */}
            {logoMode === 'PRESET' && (
              <div>
                <span className="text-[10px] text-[#141414]/70 dark:text-[#F3F2EE]/70 block mb-1.5">
                  Click a brand to use official vector SVG logo:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {PRESET_PLATFORMS.map(p => {
                    const isSelected = selectedPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        id={`modal-select-preset-${p.id.toLowerCase()}`}
                        onClick={() => {
                          setSelectedPreset(p.id);
                          if (!platformName || PRESET_PLATFORMS.some(pre => pre.label === platformName || pre.id === platformName)) {
                            setPlatformName(p.label);
                            setAccountName(`${p.label} Account`);
                          }
                        }}
                        className={`p-1.5 border flex flex-col items-center justify-center space-y-1 transition-all ${
                          isSelected
                            ? 'bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE] border-[#141414] dark:border-white'
                            : 'bg-[#DCDAD7] dark:bg-[#1C1C1C] text-[#141414] dark:text-[#F3F2EE] border-[#141414]/30 dark:border-[#383838]'
                        }`}
                      >
                        <PlatformLogo platform={p.id} size="sm" />
                        <span className="text-[9px] font-bold truncate max-w-full">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode 3: Image URL */}
            {logoMode === 'URL' && (
              <div>
                <label className="block font-bold text-[10px] uppercase mb-1">
                  Logo Image URL:
                </label>
                <input
                  id="modal-custom-logo-url-input"
                  type="url"
                  value={customLogoUrl}
                  onChange={e => setCustomLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-2.5 py-1.5 bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] text-[#141414] dark:text-[#F3F2EE] font-mono text-xs focus:outline-none"
                />
              </div>
            )}

            {/* Live Preview Box */}
            <div className="pt-2 border-t border-[#141414]/20 dark:border-[#383838] flex items-center justify-between text-[11px]">
              <span className="font-bold uppercase text-[#141414]/70 dark:text-[#F3F2EE]/70">Card Live Preview:</span>
              <div className="flex items-center space-x-2 px-3 py-1 bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838]">
                <PlatformLogo
                  platform={platformName || selectedPreset}
                  customLogoUrl={currentActiveLogoUrl}
                  size="sm"
                  showLabel={true}
                />
                <span className="font-bold text-emerald-800 dark:text-emerald-400 ml-2">
                  ${parseFloat(initialBalance || '0').toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-2 border-t border-[#141414] dark:border-[#383838] flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-[#E4E3E0] dark:bg-[#262626] text-[#141414] dark:text-[#F3F2EE] font-bold uppercase border border-[#141414] dark:border-[#383838]"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="confirm-create-platform-btn"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-[#141414] dark:bg-[#383838] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] font-bold uppercase border border-[#141414] dark:border-white disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : '+ Create Platform'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
