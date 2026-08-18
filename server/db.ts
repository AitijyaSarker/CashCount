import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { FieldCrypto } from './crypto.ts';
import { DecimalMath } from './precision.ts';

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  business_name: string;
  tax_id: string; // encrypted
  mfa_secret: string | null;
  mfa_enabled: boolean;
  recovery_codes: string[];
  created_at: string;
  updated_at: string;
}

export interface AccountRecord {
  id: string;
  user_id: string;
  platform_name: string; // 'Stripe' | 'Payoneer' | 'Dot' | 'Bank Account' | 'Wise' | 'PayPal'
  account_name: string;
  account_type: 'PAYMENT_GATEWAY' | 'WALLET' | 'BANK' | 'CREDIT_CARD';
  account_identifier: string; // Encrypted
  currency: string;
  current_balance: number;
  is_active: boolean;
  logo_url?: string | null;
  created_at: string;
}

export interface ExpenseCategoryRecord {
  id: string;
  user_id: string;
  category_name: string;
  description: string;
  is_tax_deductible: boolean;
  schedule_c_line: string;
  color: string;
  created_at: string;
}

export interface TransactionRecord {
  id: string;
  user_id: string;
  source_account_id: string | null;
  destination_account_id: string | null;
  type: 'INFLOW' | 'WITHDRAWAL' | 'DEPOSIT' | 'EXPENSE' | 'TRANSFER' | 'FEE_DEDUCTION';
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  currency: string;
  status: 'PENDING' | 'CLEARED' | 'WITHDRAWN' | 'DEPOSITED' | 'FAILED';
  transaction_date: string;
  expected_clearing_date: string | null;
  cleared_at: string | null;
  reference_id: string;
  client_name: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseRecord {
  id: string;
  user_id: string;
  category_id: string | null;
  account_id: string | null;
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

export interface LedgerEntryRecord {
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

export interface SecurityAuditRecord {
  id: string;
  user_id: string | null;
  action: string;
  ip_address: string;
  user_agent: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details: string;
  created_at: string;
}

// In-Memory Durable Relational Storage Engine for production preview
class RelationalDatabase {
  public users: Map<string, UserRecord> = new Map();
  public accounts: Map<string, AccountRecord> = new Map();
  public expenseCategories: Map<string, ExpenseCategoryRecord> = new Map();
  public transactions: Map<string, TransactionRecord> = new Map();
  public expenses: Map<string, ExpenseRecord> = new Map();
  public ledgerEntries: Map<string, LedgerEntryRecord> = new Map();
  public auditLogs: SecurityAuditRecord[] = [];

  constructor() {
    this.seedDefaultFreelancer();
  }

  public seedDefaultFreelancer() {
    this.users.clear();
    this.accounts.clear();
    this.expenseCategories.clear();
    this.transactions.clear();
    this.expenses.clear();
    this.ledgerEntries.clear();

    const userId = 'usr_demo_freelancer_01';
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('Freelancer2026!', salt);

    const demoUser: UserRecord = {
      id: userId,
      email: 'alex.morgan@freelancestudio.io',
      password_hash: passwordHash,
      full_name: 'Alex Morgan',
      business_name: 'Aitijya Sarker',
      tax_id: FieldCrypto.encrypt('XX-XXX4912'),
      mfa_secret: null,
      mfa_enabled: false,
      recovery_codes: [],
      created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.users.set(userId, demoUser);

    // Accounts
    const accStripe: AccountRecord = {
      id: 'acc_stripe_01',
      user_id: userId,
      platform_name: 'Stripe',
      account_name: 'Stripe Account',
      account_type: 'PAYMENT_GATEWAY',
      account_identifier: FieldCrypto.encrypt('acct_1NZStripe8892'),
      currency: 'USD',
      current_balance: 8450.00,
      is_active: true,
      created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    };
    const accDots: AccountRecord = {
      id: 'acc_dot_01',
      user_id: userId,
      platform_name: 'Dots',
      account_name: 'Dots Account',
      account_type: 'PAYMENT_GATEWAY',
      account_identifier: FieldCrypto.encrypt('dots_corp_339102'),
      currency: 'USD',
      current_balance: 6200.00,
      is_active: true,
      created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    };
    const accBank: AccountRecord = {
      id: 'acc_bank_01',
      user_id: userId,
      platform_name: 'Bank',
      account_name: 'Bank Account',
      account_type: 'BANK',
      account_identifier: FieldCrypto.encrypt('9821034912'),
      currency: 'USD',
      current_balance: 19480.25,
      is_active: true,
      created_at: new Date(Date.now() - 120 * 86400000).toISOString(),
    };
    const accPayoneer: AccountRecord = {
      id: 'acc_payoneer_01',
      user_id: userId,
      platform_name: 'Payoneer',
      account_name: 'Payoneer Account',
      account_type: 'WALLET',
      account_identifier: FieldCrypto.encrypt('payo_EU99182371'),
      currency: 'USD',
      current_balance: 4210.50,
      is_active: true,
      created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    };
    const accBkash: AccountRecord = {
      id: 'acc_bkash_01',
      user_id: userId,
      platform_name: 'bKash',
      account_name: 'bKash Wallet',
      account_type: 'WALLET',
      account_identifier: FieldCrypto.encrypt('+8801700000000'),
      currency: 'USD',
      current_balance: 2150.00,
      is_active: true,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    };

    this.accounts.set(accStripe.id, accStripe);
    this.accounts.set(accDots.id, accDots);
    this.accounts.set(accBank.id, accBank);
    this.accounts.set(accPayoneer.id, accPayoneer);
    this.accounts.set(accBkash.id, accBkash);

    // Expense Categories (IRS Schedule C aligned)
    const categories: ExpenseCategoryRecord[] = [
      {
        id: 'cat_software',
        user_id: userId,
        category_name: 'Software & Cloud Subscriptions',
        description: 'Figma, GitHub, AWS, Vercel, JetBrains, AI API credits',
        is_tax_deductible: true,
        schedule_c_line: 'Line 18: Office Expense',
        color: '#6366F1',
        created_at: new Date().toISOString(),
      },
      {
        id: 'cat_hardware',
        user_id: userId,
        category_name: 'Hardware & Equipment',
        description: 'MacBook Pro, ergonomic monitors, testing devices (Section 179)',
        is_tax_deductible: true,
        schedule_c_line: 'Line 13: Depreciation / Sec 179',
        color: '#3B82F6',
        created_at: new Date().toISOString(),
      },
      {
        id: 'cat_marketing',
        user_id: userId,
        category_name: 'Marketing & Portfolio Hosting',
        description: 'Domain names, portfolio hosting, Google Ads, design assets',
        is_tax_deductible: true,
        schedule_c_line: 'Line 8: Advertising',
        color: '#EC4899',
        created_at: new Date().toISOString(),
      },
      {
        id: 'cat_legal_pro',
        user_id: userId,
        category_name: 'Legal & Accounting Fees',
        description: 'CPA tax preparation, Delaware franchise agent, contract review',
        is_tax_deductible: true,
        schedule_c_line: 'Line 17: Legal and professional services',
        color: '#10B981',
        created_at: new Date().toISOString(),
      },
      {
        id: 'cat_platform_fees',
        user_id: userId,
        category_name: 'Payment Processing & Wire Fees',
        description: 'Stripe merchant fees, Payoneer FX conversion, wire transfer fees',
        is_tax_deductible: true,
        schedule_c_line: 'Line 10: Commissions and fees',
        color: '#F59E0B',
        created_at: new Date().toISOString(),
      },
      {
        id: 'cat_workspace',
        user_id: userId,
        category_name: 'Co-Working & Workspace',
        description: 'WeWork dedicated desk, high-speed fiber internet',
        is_tax_deductible: true,
        schedule_c_line: 'Line 20b: Rent or lease of other business property',
        color: '#8B5CF6',
        created_at: new Date().toISOString(),
      },
    ];

    categories.forEach(c => this.expenseCategories.set(c.id, c));

    // Seed Realistic Transactions
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const dateMinusDays = (d: number) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
    const datePlusDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

    const txSeeds: Array<Omit<TransactionRecord, 'created_at' | 'updated_at'>> = [
      {
        id: 'tx_01',
        user_id: userId,
        source_account_id: null,
        destination_account_id: accStripe.id,
        type: 'INFLOW',
        gross_amount: 4500.00,
        fee_amount: 130.80, // 2.9% + 0.30
        net_amount: 4369.20,
        currency: 'USD',
        status: 'PENDING',
        transaction_date: dateMinusDays(1),
        expected_clearing_date: datePlusDays(2),
        cleared_at: null,
        reference_id: 'pi_3MvStripeClient_9921',
        client_name: 'VentureScale Tech Ltd (US)',
        notes: 'Monthly Retainer: Full-stack React + Cloud Architecture design',
      },
      {
        id: 'tx_02',
        user_id: userId,
        source_account_id: null,
        destination_account_id: accDots.id,
        type: 'INFLOW',
        gross_amount: 6200.00,
        fee_amount: 15.00, // Dot capped ACH fee
        net_amount: 6185.00,
        currency: 'USD',
        status: 'PENDING',
        transaction_date: dateMinusDays(2),
        expected_clearing_date: datePlusDays(1),
        cleared_at: null,
        reference_id: 'DOT-INV-2026-881',
        client_name: 'Nordic AI Solutions AB',
        notes: 'Milestone 2 Delivery: Distributed database sync pipeline',
      },
      {
        id: 'tx_03',
        user_id: userId,
        source_account_id: null,
        destination_account_id: accPayoneer.id,
        type: 'INFLOW',
        gross_amount: 3850.00,
        fee_amount: 77.00, // 2.0%
        net_amount: 3773.00,
        currency: 'USD',
        status: 'CLEARED',
        transaction_date: dateMinusDays(5),
        expected_clearing_date: dateMinusDays(3),
        cleared_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        reference_id: 'PAYO-TR-998102',
        client_name: 'Kyoto Fintech Group (Japan)',
        notes: 'Security audit & vulnerability penetration testing report',
      },
      {
        id: 'tx_04',
        user_id: userId,
        source_account_id: accStripe.id,
        destination_account_id: accBank.id,
        type: 'WITHDRAWAL',
        gross_amount: 5000.00,
        fee_amount: 0.00,
        net_amount: 5000.00,
        currency: 'USD',
        status: 'DEPOSITED',
        transaction_date: dateMinusDays(10),
        expected_clearing_date: dateMinusDays(8),
        cleared_at: new Date(Date.now() - 8 * 86400000).toISOString(),
        reference_id: 'po_1NZStripePayout_44',
        client_name: 'Internal Transfer',
        notes: 'Scheduled bi-weekly payout sweep to Bank Checking',
      },
      {
        id: 'tx_05',
        user_id: userId,
        source_account_id: null,
        destination_account_id: accStripe.id,
        type: 'INFLOW',
        gross_amount: 8200.00,
        fee_amount: 238.10,
        net_amount: 7961.90,
        currency: 'USD',
        status: 'CLEARED',
        transaction_date: dateMinusDays(14),
        expected_clearing_date: dateMinusDays(12),
        cleared_at: new Date(Date.now() - 12 * 86400000).toISOString(),
        reference_id: 'pi_3LStripeClient_1192',
        client_name: 'HyperGrowth Labs (SF)',
        notes: 'Custom Web Application MVP build & deployment',
      },
      {
        id: 'tx_06',
        user_id: userId,
        source_account_id: accPayoneer.id,
        destination_account_id: accBank.id,
        type: 'WITHDRAWAL',
        gross_amount: 3000.00,
        fee_amount: 3.00,
        net_amount: 2997.00,
        currency: 'USD',
        status: 'DEPOSITED',
        transaction_date: dateMinusDays(20),
        expected_clearing_date: dateMinusDays(18),
        cleared_at: new Date(Date.now() - 18 * 86400000).toISOString(),
        reference_id: 'PAYO-WD-77182',
        client_name: 'Internal Bank Withdrawal',
        notes: 'Payoneer wallet balance withdrawal to local checking',
      },
      {
        id: 'tx_07',
        user_id: userId,
        source_account_id: null,
        destination_account_id: accDots.id,
        type: 'INFLOW',
        gross_amount: 2800.00,
        fee_amount: 15.00,
        net_amount: 2785.00,
        currency: 'USD',
        status: 'CLEARED',
        transaction_date: dateMinusDays(25),
        expected_clearing_date: dateMinusDays(23),
        cleared_at: new Date(Date.now() - 23 * 86400000).toISOString(),
        reference_id: 'DOT-INV-2026-712',
        client_name: 'Acuity Cloud Consulting',
        notes: 'Database optimization and GraphQL schema refactoring',
      },
    ];

    txSeeds.forEach(tx => {
      const record: TransactionRecord = {
        ...tx,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.transactions.set(record.id, record);

      // Create Double Entry Ledger Records
      this.createLedgerForTransaction(record);
    });

    // Seed Realistic Expenses with Receipts
    const expenseSeeds: Array<Omit<ExpenseRecord, 'created_at'>> = [
      {
        id: 'exp_01',
        user_id: userId,
        category_id: 'cat_software',
        account_id: accBank.id,
        amount: 240.00,
        currency: 'USD',
        vendor: 'AWS Cloud Services & Bedrock',
        expense_date: dateMinusDays(3),
        is_tax_deductible: true,
        tax_amount: 0.00,
        receipt_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        receipt_name: 'AWS_Invoice_Aug2026_INV9912.pdf',
        receipt_data: 'JVBERi0xLjQKJcTl8uXr... (Verified Encrypted Receipt Vault Payload)',
        notes: 'Production container hosting, Cloud SQL clusters, developer staging',
      },
      {
        id: 'exp_02',
        user_id: userId,
        category_id: 'cat_software',
        account_id: accBank.id,
        amount: 45.00,
        currency: 'USD',
        vendor: 'GitHub Enterprise & Copilot',
        expense_date: dateMinusDays(7),
        is_tax_deductible: true,
        tax_amount: 0.00,
        receipt_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
        receipt_name: 'GitHub_Subscription_Receipt.pdf',
        receipt_data: 'JVBERi0xLjQKJcTl8uXr... (Receipt Data Encrypted)',
        notes: 'Code repository CI/CD runners and Copilot seat',
      },
      {
        id: 'exp_03',
        user_id: userId,
        category_id: 'cat_legal_pro',
        account_id: accBank.id,
        amount: 650.00,
        currency: 'USD',
        vendor: 'Sterling & Co. CPAs',
        expense_date: dateMinusDays(12),
        is_tax_deductible: true,
        tax_amount: 0.00,
        receipt_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
        receipt_name: 'CPA_Q2_Tax_Advisory_Invoice.pdf',
        receipt_data: 'JVBERi0xLjQKJcTl8uXr... (Encrypted Vault Data)',
        notes: 'Q2 Estimated Tax calculations and state pass-through entity compliance',
      },
      {
        id: 'exp_04',
        user_id: userId,
        category_id: 'cat_workspace',
        account_id: accBank.id,
        amount: 450.00,
        currency: 'USD',
        vendor: 'WeWork Labs Downtown',
        expense_date: dateMinusDays(15),
        is_tax_deductible: true,
        tax_amount: 0.00,
        receipt_url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&auto=format&fit=crop&q=80',
        receipt_name: 'WeWork_Membership_INV882.pdf',
        receipt_data: 'JVBERi0xLjQKJcTl8uXr... (Encrypted Vault Data)',
        notes: 'Dedicated hot-desk membership & gigabit fiber connection',
      },
      {
        id: 'exp_05',
        user_id: userId,
        category_id: 'cat_marketing',
        account_id: accBank.id,
        amount: 180.00,
        currency: 'USD',
        vendor: 'Vercel Pro & Domains',
        expense_date: dateMinusDays(22),
        is_tax_deductible: true,
        tax_amount: 0.00,
        receipt_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        receipt_name: 'Vercel_Hosting_Annual_INV.pdf',
        receipt_data: 'JVBERi0xLjQKJcTl8uXr... (Encrypted Vault Data)',
        notes: 'Client staging deployments and edge middleware SSL',
      },
    ];

    expenseSeeds.forEach(exp => {
      const record: ExpenseRecord = {
        ...exp,
        created_at: new Date().toISOString(),
      };
      this.expenses.set(record.id, record);
      this.createLedgerForExpense(record);
    });

    // Security log
    this.logAudit(userId, 'SYSTEM_INITIALIZED', '127.0.0.1', 'System/1.0', 'SUCCESS', 'Initialized default freelancer ledger & rails');
  }

  public createLedgerForTransaction(tx: TransactionRecord) {
    const destAcc = tx.destination_account_id ? this.accounts.get(tx.destination_account_id) : null;
    const srcAcc = tx.source_account_id ? this.accounts.get(tx.source_account_id) : null;

    if (tx.type === 'INFLOW') {
      // Debit: Asset Account (Gateway/Bank) for Net Amount
      const debitEntry: LedgerEntryRecord = {
        id: `ldg_${crypto.randomBytes(6).toString('hex')}`,
        user_id: tx.user_id,
        transaction_id: tx.id,
        expense_id: null,
        account_id: tx.destination_account_id,
        account_name: destAcc ? destAcc.account_name : 'Undeposited Funds',
        entry_type: 'DEBIT',
        amount: tx.net_amount,
        currency: tx.currency,
        description: `Inflow from ${tx.client_name} (Net)`,
        entry_date: tx.transaction_date,
        created_at: new Date().toISOString(),
      };
      this.ledgerEntries.set(debitEntry.id, debitEntry);

      // Debit: Platform Fee Expense if fee > 0
      if (tx.fee_amount > 0) {
        const feeEntry: LedgerEntryRecord = {
          id: `ldg_${crypto.randomBytes(6).toString('hex')}`,
          user_id: tx.user_id,
          transaction_id: tx.id,
          expense_id: null,
          account_id: null,
          account_name: 'Operating Expense: Payment Processing Fees',
          entry_type: 'DEBIT',
          amount: tx.fee_amount,
          currency: tx.currency,
          description: `Platform Fee (${destAcc?.platform_name || 'Gateway'})`,
          entry_date: tx.transaction_date,
          created_at: new Date().toISOString(),
        };
        this.ledgerEntries.set(feeEntry.id, feeEntry);
      }

      // Credit: Service Revenue (Gross Amount)
      const creditEntry: LedgerEntryRecord = {
        id: `ldg_${crypto.randomBytes(6).toString('hex')}`,
        user_id: tx.user_id,
        transaction_id: tx.id,
        expense_id: null,
        account_id: null,
        account_name: 'Revenue: Freelance Consulting & Development',
        entry_type: 'CREDIT',
        amount: tx.gross_amount,
        currency: tx.currency,
        description: `Gross Revenue: ${tx.client_name}`,
        entry_date: tx.transaction_date,
        created_at: new Date().toISOString(),
      };
      this.ledgerEntries.set(creditEntry.id, creditEntry);
    } else if (tx.type === 'WITHDRAWAL' || tx.type === 'TRANSFER') {
      // Transfer between accounts
      // Debit Destination (Receiving Account)
      const debitEntry: LedgerEntryRecord = {
        id: `ldg_${crypto.randomBytes(6).toString('hex')}`,
        user_id: tx.user_id,
        transaction_id: tx.id,
        expense_id: null,
        account_id: tx.destination_account_id,
        account_name: destAcc ? destAcc.account_name : 'Bank Account',
        entry_type: 'DEBIT',
        amount: tx.net_amount,
        currency: tx.currency,
        description: `Transfer in from ${srcAcc?.account_name || 'Wallet'}`,
        entry_date: tx.transaction_date,
        created_at: new Date().toISOString(),
      };
      this.ledgerEntries.set(debitEntry.id, debitEntry);

      // Credit Source (Originating Account)
      const creditEntry: LedgerEntryRecord = {
        id: `ldg_${crypto.randomBytes(6).toString('hex')}`,
        user_id: tx.user_id,
        transaction_id: tx.id,
        expense_id: null,
        account_id: tx.source_account_id,
        account_name: srcAcc ? srcAcc.account_name : 'Originating Wallet',
        entry_type: 'CREDIT',
        amount: tx.gross_amount,
        currency: tx.currency,
        description: `Transfer out to ${destAcc?.account_name || 'Bank'}`,
        entry_date: tx.transaction_date,
        created_at: new Date().toISOString(),
      };
      this.ledgerEntries.set(creditEntry.id, creditEntry);
    }
  }

  public createLedgerForExpense(exp: ExpenseRecord) {
    const cat = exp.category_id ? this.expenseCategories.get(exp.category_id) : null;
    const acc = exp.account_id ? this.accounts.get(exp.account_id) : null;

    // Debit Expense Account
    const debitEntry: LedgerEntryRecord = {
      id: `ldg_${crypto.randomBytes(6).toString('hex')}`,
      user_id: exp.user_id,
      transaction_id: null,
      expense_id: exp.id,
      account_id: null,
      account_name: cat ? `Expense: ${cat.category_name}` : 'General Business Expense',
      entry_type: 'DEBIT',
      amount: exp.amount,
      currency: exp.currency,
      description: `Expense: ${exp.vendor} (${exp.notes || 'Purchased'})`,
      entry_date: exp.expense_date,
      created_at: new Date().toISOString(),
    };
    this.ledgerEntries.set(debitEntry.id, debitEntry);

    // Credit Cash / Bank / Credit Card
    const creditEntry: LedgerEntryRecord = {
      id: `ldg_${crypto.randomBytes(6).toString('hex')}`,
      user_id: exp.user_id,
      transaction_id: null,
      expense_id: exp.id,
      account_id: exp.account_id,
      account_name: acc ? acc.account_name : 'Operating Cash',
      entry_type: 'CREDIT',
      amount: exp.amount,
      currency: exp.currency,
      description: `Payment to ${exp.vendor}`,
      entry_date: exp.expense_date,
      created_at: new Date().toISOString(),
    };
    this.ledgerEntries.set(creditEntry.id, creditEntry);
  }

  public logAudit(
    userId: string | null,
    action: string,
    ip: string,
    ua: string,
    status: 'SUCCESS' | 'FAILURE' | 'WARNING',
    details: string
  ) {
    const log: SecurityAuditRecord = {
      id: `aud_${crypto.randomBytes(6).toString('hex')}`,
      user_id: userId,
      action,
      ip_address: ip,
      user_agent: ua,
      status,
      details,
      created_at: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
  }
}

export const database = new RelationalDatabase();
