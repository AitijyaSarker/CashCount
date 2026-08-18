export interface User {
  id: string;
  email: string;
  fullName: string;
  businessName: string;
  taxIdMasked?: string;
  mfaEnabled: boolean;
  recoveryCodesLeft?: number;
  createdAt?: string;
}

export type PlatformType = 'Stripe' | 'Dots' | 'Bank' | 'Payoneer' | 'bKash' | 'Dot' | 'Bank Account' | 'Wise' | 'PayPal' | 'Other';
export type AccountType = 'PAYMENT_GATEWAY' | 'WALLET' | 'BANK' | 'CREDIT_CARD';
export type TransactionType = 'INFLOW' | 'WITHDRAWAL' | 'DEPOSIT' | 'EXPENSE' | 'TRANSFER' | 'FEE_DEDUCTION';
export type TransactionStatus = 'PENDING' | 'CLEARED' | 'WITHDRAWN' | 'DEPOSITED' | 'FAILED';

export interface Account {
  id: string;
  user_id: string;
  platform_name: PlatformType | string;
  account_name: string;
  account_type: AccountType;
  account_identifier_masked: string;
  currency: string;
  current_balance: number;
  is_active: boolean;
  logo_url?: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  source_account_id: string | null;
  destination_account_id: string | null;
  destination_account_name?: string | null;
  destination_platform?: string | null;
  source_account_name?: string | null;
  source_platform?: string | null;
  type: TransactionType;
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  currency: string;
  status: TransactionStatus;
  transaction_date: string;
  expected_clearing_date: string | null;
  cleared_at: string | null;
  reference_id: string;
  client_name: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  user_id: string;
  category_name: string;
  description: string;
  is_tax_deductible: boolean;
  schedule_c_line: string;
  color: string;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  category_id: string | null;
  category_name?: string;
  category_color?: string;
  schedule_c_line?: string | null;
  account_id: string | null;
  account_name?: string;
  amount: number;
  currency: string;
  vendor: string;
  expense_date: string;
  is_tax_deductible: boolean;
  tax_amount: number;
  receipt_url: string | null;
  receipt_name: string | null;
  receipt_data: string | null;
  notes: string;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  user_id: string;
  transaction_id: string | null;
  expense_id: string | null;
  account_id: string | null;
  account_name: string;
  entry_type: 'DEBIT' | 'CREDIT';
  amount: number;
  currency: string;
  description: string;
  entry_date: string;
  created_at: string;
}

export interface DashboardSummary {
  summary: {
    totalNetWorth: number;
    liquidCash: number;
    pendingFundsInTransit: number;
    pendingCount: number;
    clearedThisMonth: number;
    grossRevenueTotal: number;
    totalFeesPaid: number;
    totalExpenses: number;
    deductibleExpenses: number;
    netTaxableIncome: number;
    estimatedTaxOwed: number;
  };
  railBalances: Record<string, { id: string; name: string; type: string; balance: number }>;
  pendingPipeline: Array<Transaction & { platform_name: string }>;
}

export interface PLReport {
  taxYear: number;
  statementType: string;
  preparedFor: string;
  currency: string;
  revenue: {
    grossRevenue: number;
    platformFees: number;
    netRevenue: number;
    byRail: Record<string, { gross: number; fees: number; net: number; count: number }>;
  };
  operatingExpenses: {
    total: number;
    deductibleTotal: number;
    nonDeductibleTotal: number;
    byCategory: Array<{ name: string; amount: number; isDeductible: boolean; scheduleC: string; count: number }>;
  };
  netOperatingIncome: number;
  netTaxableIncome: number;
  estimatedTaxProvision: number;
}

export interface CashFlowReport {
  statementType: string;
  currency: string;
  operatingActivities: {
    cashReceivedFromClients: number;
    cashPaidForOperatingExpenses: number;
    platformProcessingFeesPaid: number;
    netCashFromOperations: number;
  };
  pendingInTransitLiquidity: {
    pendingClientReceipts: number;
  };
  financingAndTransfers: {
    sweepsToBankChecking: number;
  };
  netLiquidPosition: number;
}

export interface TaxPrepReport {
  form: string;
  taxYear: number;
  taxpayer: {
    name: string;
    businessName: string;
    taxIdMasked: string;
    accountingMethod: string;
  };
  part1_income: {
    line1_gross_receipts: number;
    line2_returns_allowances: number;
    line3_subtotal: number;
    line4_cost_of_goods_sold: number;
    line7_gross_income: number;
  };
  part2_expenses: {
    breakdown: Record<string, { label: string; amount: number; items: string[] }>;
    line28_total_expenses: number;
  };
  part3_net_profit_or_loss: {
    line31_net_profit: number;
    estimatedSelfEmploymentTax: number;
    estimatedIncomeTax: number;
    totalQuarterlyEstimatedProvision: number;
  };
}

export interface SecurityAuditLog {
  id: string;
  user_id: string | null;
  action: string;
  ip_address: string;
  user_agent: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details: string;
  created_at: string;
}
