-- ====================================================================
-- Freelancer Financial & Tax Accounting System - PostgreSQL Schema
-- Database: PostgreSQL 14+ / ANSI SQL Compliant
-- Features: Multi-rail consolidation, Pending fund tracking,
--           Double-entry ledger, Expense vault, Tax-prep categorization.
-- ====================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    business_name VARCHAR(255),
    tax_id VARCHAR(255), -- Stored with AES-256 encryption at application level
    recovery_codes JSONB DEFAULT '[]',
    mfa_secret VARCHAR(255),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ACCOUNTS / WALLETS TABLE (Payment rails & Banks)
CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform_name VARCHAR(64) NOT NULL, -- 'Stripe', 'Payoneer', 'Dot', 'Bank Account', 'Wise', 'PayPal'
    account_name VARCHAR(128) NOT NULL,
    account_type VARCHAR(32) NOT NULL,  -- 'PAYMENT_GATEWAY', 'WALLET', 'BANK', 'CREDIT_CARD'
    account_identifier VARCHAR(255),    -- Encrypted IBAN/last4/wallet-id
    currency VARCHAR(8) DEFAULT 'USD',
    current_balance NUMERIC(15, 4) DEFAULT 0.0000,
    is_active BOOLEAN DEFAULT TRUE,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. EXPENSE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS expense_categories (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_name VARCHAR(128) NOT NULL,
    description TEXT,
    is_tax_deductible BOOLEAN DEFAULT TRUE,
    schedule_c_line VARCHAR(64), -- e.g. 'Line 18: Office Expense', 'Line 10: Commissions and fees'
    color VARCHAR(32) DEFAULT '#6366F1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TRANSACTIONS TABLE (Inflows, Withdrawals, Transfers, Platform Fees)
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_account_id VARCHAR(64) REFERENCES accounts(id) ON DELETE SET NULL,
    destination_account_id VARCHAR(64) REFERENCES accounts(id) ON DELETE SET NULL,
    type VARCHAR(32) NOT NULL, -- 'INFLOW', 'WITHDRAWAL', 'DEPOSIT', 'EXPENSE', 'TRANSFER', 'FEE_DEDUCTION'
    gross_amount NUMERIC(15, 4) NOT NULL,
    fee_amount NUMERIC(15, 4) DEFAULT 0.0000,
    net_amount NUMERIC(15, 4) NOT NULL,
    currency VARCHAR(8) DEFAULT 'USD',
    status VARCHAR(32) NOT NULL, -- 'PENDING', 'CLEARED', 'WITHDRAWN', 'DEPOSITED', 'FAILED'
    transaction_date DATE NOT NULL,
    expected_clearing_date DATE,
    cleared_at TIMESTAMP WITH TIME ZONE,
    reference_id VARCHAR(128),   -- External payment intent / payout ID
    client_name VARCHAR(128),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure referenced external IDs are unique per user when provided
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_user_reference_unique ON transactions(user_id, reference_id) WHERE reference_id IS NOT NULL;

-- Basic sanity checks
ALTER TABLE IF EXISTS transactions ADD CONSTRAINT chk_tx_amounts_nonnegative CHECK (gross_amount >= 0 AND fee_amount >= 0 AND net_amount >= 0);

-- 5. EXPENSES TABLE (Receipt vault and deductible tracking)
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id VARCHAR(64) REFERENCES expense_categories(id) ON DELETE SET NULL,
    account_id VARCHAR(64) REFERENCES accounts(id) ON DELETE SET NULL,
    amount NUMERIC(15, 4) NOT NULL,
    currency VARCHAR(8) DEFAULT 'USD',
    vendor VARCHAR(128) NOT NULL,
    expense_date DATE NOT NULL,
    is_tax_deductible BOOLEAN DEFAULT TRUE,
    tax_amount NUMERIC(15, 4) DEFAULT 0.0000,
    receipt_url TEXT,
    receipt_name VARCHAR(255),
    receipt_data TEXT, -- Base64 thumbnail/preview for vault mockup
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. DOUBLE-ENTRY LEDGER ENTRIES (Audit & GAAP compliance simulation)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id VARCHAR(64) REFERENCES transactions(id) ON DELETE CASCADE,
    expense_id VARCHAR(64) REFERENCES expenses(id) ON DELETE CASCADE,
    account_id VARCHAR(64) REFERENCES accounts(id) ON DELETE SET NULL,
    account_name VARCHAR(128) NOT NULL,
    entry_type VARCHAR(16) NOT NULL, -- 'DEBIT', 'CREDIT'
    amount NUMERIC(15, 4) NOT NULL,
    currency VARCHAR(8) DEFAULT 'USD',
    description VARCHAR(255) NOT NULL,
    entry_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure entry type is constrained and amounts are non-negative
ALTER TABLE IF EXISTS ledger_entries ADD CONSTRAINT chk_ledger_entry_type CHECK (entry_type IN ('DEBIT','CREDIT'));
ALTER TABLE IF EXISTS ledger_entries ADD CONSTRAINT chk_ledger_amount_nonnegative CHECK (amount >= 0);

-- 7. AUDIT & SECURITY LOGS TABLE
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL, -- 'LOGIN', 'MFA_ENABLED', 'EXPORT_REPORT', 'TRANSACTION_MODIFIED'
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(16) DEFAULT 'SUCCESS',
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------
-- APPLICATION SUPPORT TABLES
-- ------------------------------------------------------------------

-- Feature label customization so UI renames persist per-user
CREATE TABLE IF NOT EXISTS feature_labels (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature_key VARCHAR(64) NOT NULL, -- e.g. 'DEPOSIT','WITHDRAW','TRANSFER','EXPENSE'
    label TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Track exported reports (CSV/PDF) for auditing and user downloads
CREATE TABLE IF NOT EXISTS exports (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    export_type VARCHAR(16) NOT NULL, -- 'CSV'|'PDF'
    export_kind VARCHAR(32) NOT NULL, -- 'TRANSACTIONS'|'EXPENSES'|'P&L' etc
    filter_payload JSONB,
    file_name VARCHAR(256),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trial balance view to help with double-entry verification
CREATE OR REPLACE VIEW trial_balance AS
SELECT
  account_name,
  SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) AS total_debits,
  SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) AS total_credits,
  SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) - SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) AS balance
FROM ledger_entries
GROUP BY account_name;

-- INDEXES FOR OPTIMIZED QUERYING
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_transaction ON ledger_entries(transaction_id);
