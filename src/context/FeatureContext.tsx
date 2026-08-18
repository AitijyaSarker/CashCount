import React, { createContext, useContext, useState, useEffect } from 'react';

export interface FeatureConfig {
  depositLabel: string;
  withdrawLabel: string;
  transferLabel: string;
  expenseLabel: string;
  enableTransfer: boolean;
  enableExpense: boolean;
}

const DEFAULT_FEATURE_CONFIG: FeatureConfig = {
  depositLabel: 'Deposit',
  withdrawLabel: 'Withdraw',
  transferLabel: 'Transfer',
  expenseLabel: 'Expense',
  enableTransfer: true,
  enableExpense: true,
};

interface FeatureContextType {
  features: FeatureConfig;
  updateFeatureConfig: (config: Partial<FeatureConfig>) => void;
  resetFeatureConfig: () => void;
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [features, setFeatures] = useState<FeatureConfig>(() => {
    try {
      const saved = localStorage.getItem('freelance_feature_config');
      if (saved) {
        return { ...DEFAULT_FEATURE_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Error reading feature config from localStorage', e);
    }
    return DEFAULT_FEATURE_CONFIG;
  });

  const updateFeatureConfig = (newConfig: Partial<FeatureConfig>) => {
    setFeatures(prev => {
      const updated = { ...prev, ...newConfig };
      try {
        localStorage.setItem('freelance_feature_config', JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving feature config to localStorage', e);
      }
      return updated;
    });
  };

  const resetFeatureConfig = () => {
    setFeatures(DEFAULT_FEATURE_CONFIG);
    try {
      localStorage.removeItem('freelance_feature_config');
    } catch {}
  };

  return (
    <FeatureContext.Provider value={{ features, updateFeatureConfig, resetFeatureConfig }}>
      {children}
    </FeatureContext.Provider>
  );
};

export const useFeatures = (): FeatureContextType => {
  const context = useContext(FeatureContext);
  if (!context) {
    throw new Error('useFeatures must be used within a FeatureProvider');
  }
  return context;
};
