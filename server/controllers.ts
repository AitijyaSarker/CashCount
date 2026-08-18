import { Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { database, TransactionRecord, ExpenseRecord, AccountRecord, UserRecord, ExpenseCategoryRecord, LedgerEntryRecord } from './db.ts';
import { getAccountsForUser, createAccount as createAccountPg, logAudit as logAuditPg, createTransactionAtomic, updateTransactionStatusAtomic, deleteTransactionAtomic, getCollection, createUserMongo, findUserByEmailMongo, findUserByIdMongo, updateUserMongo } from './db_mongo.ts';
import { AuthenticatedRequest, AuthService } from './auth.ts';
import { FieldCrypto } from './crypto.ts';
import { DecimalMath } from './precision.ts';
import { MFAService } from './mfa.ts';

// -----------------------------------------------------------------------------
// AUTH CONTROLLER
// -----------------------------------------------------------------------------
export const AuthController = {
  async register(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, password, fullName, businessName, taxId } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }

      // Check existing user (now in MongoDB)
      const existingUser = await findUserByEmailMongo(email);
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }

      const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);

      const newUser: UserRecord = {
        id: userId,
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        full_name: fullName || 'Freelance Professional',
        business_name: businessName || 'Aitijya Sarker',
        tax_id: taxId ? FieldCrypto.encrypt(taxId) : '',
        mfa_secret: '',
        mfa_enabled: false,
        recovery_codes: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save user to MongoDB
      await createUserMongo(newUser);

      // Create default accounts for new freelancer
      const defaultRails = [
        { platform: 'Stripe', name: 'Stripe Invoicing & Card Rail', type: 'PAYMENT_GATEWAY' as const, ident: 'acct_stripe_default', bal: 0 },
        { platform: 'Payoneer', name: 'Payoneer Global Wallet', type: 'WALLET' as const, ident: 'payo_wallet_default', bal: 0 },
        { platform: 'Dot', name: 'Dot B2B Settlement', type: 'PAYMENT_GATEWAY' as const, ident: 'dot_rail_default', bal: 0 },
        { platform: 'Bank Account', name: 'Primary Business Checking', type: 'BANK' as const, ident: 'bank_checking_default', bal: 0 },
      ];

      for (const rail of defaultRails) {
        const accId = `acc_${crypto.randomBytes(6).toString('hex')}`;
        database.accounts.set(accId, {
          id: accId,
          user_id: userId,
          platform_name: rail.platform,
          account_name: rail.name,
          account_type: rail.type,
          account_identifier: FieldCrypto.encrypt(rail.ident),
          currency: 'USD',
          current_balance: rail.bal,
          is_active: true,
          created_at: new Date().toISOString(),
        });
      }

      // Default categories
      const defaultCategories = [
        { name: 'Software & Cloud Subscriptions', desc: 'SaaS tools, hosting, APIs', line: 'Line 18: Office Expense', color: '#6366F1' },
        { name: 'Hardware & Equipment', desc: 'Laptops, monitors (Sec 179)', line: 'Line 13: Depreciation / Sec 179', color: '#3B82F6' },
        { name: 'Payment Processing & Wire Fees', desc: 'Stripe, Payoneer, wire fees', line: 'Line 10: Commissions and fees', color: '#F59E0B' },
        { name: 'Legal & Professional Services', desc: 'CPA, tax prep, contracts', line: 'Line 17: Legal and professional', color: '#10B981' },
        { name: 'Advertising & Marketing', desc: 'Domains, portfolio, promotion', line: 'Line 8: Advertising', color: '#EC4899' },
      ];

      for (const cat of defaultCategories) {
        const catId = `cat_${crypto.randomBytes(6).toString('hex')}`;
        database.expenseCategories.set(catId, {
          id: catId,
          user_id: userId,
          category_name: cat.name,
          description: cat.desc,
          is_tax_deductible: true,
          schedule_c_line: cat.line,
          color: cat.color,
          created_at: new Date().toISOString(),
        });
      }

      const token = AuthService.signToken(newUser, false);
      AuthService.setAuthCookie(res, token);

      database.logAudit(userId, 'REGISTER', req.ip || '', req.headers['user-agent'] || '', 'SUCCESS', 'New user registered');

      return res.status(201).json({
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.full_name,
          businessName: newUser.business_name,
          mfaEnabled: newUser.mfa_enabled,
        },
        token,
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Failed to complete registration.' });
    }
  },

  async login(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, password, mfaCode } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      // Find user in MongoDB
      let user = await findUserByEmailMongo(email);

      if (!user) {
        database.logAudit(null, 'LOGIN_FAILED', req.ip || '', req.headers['user-agent'] || '', 'FAILURE', `User not found: ${email}`);
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = bcrypt.compareSync(password, user.password_hash);
      if (!isMatch) {
        database.logAudit(user.id, 'LOGIN_FAILED', req.ip || '', req.headers['user-agent'] || '', 'FAILURE', 'Password mismatch');
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Check MFA
      if (user.mfa_enabled && user.mfa_secret) {
        if (!mfaCode) {
          // Send temporary ticket token for MFA step-up
          const mfaPendingToken = AuthService.signToken(user, true);
          return res.status(200).json({
            mfaRequired: true,
            mfaToken: mfaPendingToken,
            message: 'Please provide your 6-digit Authenticator code.',
          });
        }

        const isValidMfa = MFAService.verifyToken(user.mfa_secret, mfaCode) || (user.recovery_codes && user.recovery_codes.includes(mfaCode.trim().toUpperCase()));
        if (!isValidMfa) {
          database.logAudit(user.id, 'MFA_FAILED', req.ip || '', req.headers['user-agent'] || '', 'WARNING', 'Invalid 2FA code provided');
          return res.status(401).json({ error: 'Invalid two-factor authentication code.' });
        }
      }

      const token = AuthService.signToken(user, false);
      AuthService.setAuthCookie(res, token);

      database.logAudit(user.id, 'LOGIN_SUCCESS', req.ip || '', req.headers['user-agent'] || '', 'SUCCESS', 'User logged in successfully');

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          businessName: user.business_name,
          taxIdMasked: user.tax_id ? FieldCrypto.maskIdentifier(user.tax_id) : '',
          mfaEnabled: user.mfa_enabled,
        },
        token,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Login process failed.' });
    }
  },

  async verifyMfaLogin(req: AuthenticatedRequest, res: Response) {
    try {
      const { mfaToken, mfaCode } = req.body;
      if (!mfaToken || !mfaCode) {
        return res.status(400).json({ error: 'MFA token and verification code are required.' });
      }

      const decoded = AuthService.verifyToken(mfaToken);
      if (!decoded || !decoded.sub) {
        return res.status(401).json({ error: 'Invalid or expired MFA session.' });
      }

      // Get user from MongoDB
      const user = await findUserByIdMongo(decoded.sub);
      if (!user || !user.mfa_secret) {
        return res.status(400).json({ error: 'MFA is not configured for this account.' });
      }

      const isMfaValid = MFAService.verifyToken(user.mfa_secret, mfaCode) || (user.recovery_codes && user.recovery_codes.includes(mfaCode.trim().toUpperCase()));
      if (!isMfaValid) {
        return res.status(401).json({ error: 'Invalid verification code.' });
      }

      const token = AuthService.signToken(user, false);
      AuthService.setAuthCookie(res, token);

      database.logAudit(user.id, 'MFA_LOGIN_SUCCESS', req.ip || '', req.headers['user-agent'] || '', 'SUCCESS', 'MFA verified');

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          businessName: user.business_name,
          mfaEnabled: user.mfa_enabled,
        },
        token,
      });
    } catch (err) {
      return res.status(500).json({ error: 'MFA verification failed.' });
    }
  },

  async getMe(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        businessName: user.business_name,
        taxIdMasked: user.tax_id ? FieldCrypto.maskIdentifier(user.tax_id) : '',
        mfaEnabled: user.mfa_enabled,
        recoveryCodesLeft: user.recovery_codes ? user.recovery_codes.length : 0,
        createdAt: user.created_at,
      },
    });
  },

  async logout(req: AuthenticatedRequest, res: Response) {
    AuthService.clearAuthCookie(res);
    return res.json({ success: true, message: 'Logged out successfully.' });
  },

  // Multi-Factor Setup
  async setupMFA(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const secret = MFAService.generateSecret(20);
    const otpAuthUrl = MFAService.getOTPAuthURI(user.email, secret);
    const recoveryCodes = MFAService.generateRecoveryCodes(8);

    // Temporarily store secret on user pending verification (save to MongoDB)
    user.mfa_secret = secret;
    user.recovery_codes = recoveryCodes;
    await updateUserMongo(user.id, { mfa_secret: secret, recovery_codes: recoveryCodes });

    return res.json({
      secret,
      otpAuthUrl,
      recoveryCodes,
      issuer: 'FreelanceFinance',
      email: user.email,
    });
  },

  async verifyAndEnableMFA(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { code } = req.body;

    if (!user.mfa_secret) {
      return res.status(400).json({ error: 'MFA setup has not been initiated.' });
    }

    const isValid = MFAService.verifyToken(user.mfa_secret, code);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code. Please check your authenticator app.' });
    }

    user.mfa_enabled = true;
    user.updated_at = new Date().toISOString();
    await updateUserMongo(user.id, { mfa_enabled: true, recovery_codes: user.recovery_codes, updated_at: user.updated_at });

    database.logAudit(user.id, 'MFA_ENABLED', req.ip || '', req.headers['user-agent'] || '', 'SUCCESS', 'Two-Factor Auth activated');

    return res.json({
      success: true,
      message: 'Two-Factor Authentication is now enabled on your account.',
      recoveryCodes: user.recovery_codes,
    });
  },

  async disableMFA(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { password } = req.body;

    if (!password || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid password. Required to disable MFA.' });
    }

    user.mfa_enabled = false;
    user.mfa_secret = null;
    user.recovery_codes = [];
    user.updated_at = new Date().toISOString();
    await updateUserMongo(user.id, { mfa_enabled: false, mfa_secret: null, recovery_codes: [], updated_at: user.updated_at });

    database.logAudit(user.id, 'MFA_DISABLED', req.ip || '', req.headers['user-agent'] || '', 'WARNING', 'Two-Factor Auth turned off');

    return res.json({ success: true, message: 'Two-Factor Authentication has been disabled.' });
  },
};

// -----------------------------------------------------------------------------
// AUDIT / LEDGER VERIFICATION CONTROLLER
// -----------------------------------------------------------------------------
export const AuditController = {
  async getTransactionAudit(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;
    try {
      // Try Mongo first
      try {
        const collLedger = getCollection<any>('ledger_entries');
        const collAudit = getCollection<any>('security_audit_logs');
        const ledgerEntries = await collLedger.find({ transaction_id: id, user_id: userId }).toArray();
        const auditLogs = await collAudit.find({ $or: [{ details: { $regex: id } }, { user_id: userId }] }).sort({ created_at: -1 }).toArray();
        return res.json({ ledgerEntries, auditLogs });
      } catch (mongoErr) {
        // Fallback to in-memory database
        const ledgerEntries = Array.from(database.ledgerEntries.values()).filter(le => le.transaction_id === id && le.user_id === userId);
        const auditLogs = (database.auditLogs || []).filter((a: any) => (a.details && a.details.includes(id)) || a.user_id === userId);
        return res.json({ ledgerEntries, auditLogs });
      }
    } catch (err: any) {
      console.error('Transaction audit error:', err);
      return res.status(500).json({ error: 'Failed to retrieve audit data.' });
    }
  },
};

export const LedgerController = {
  async verifyAccountLedger(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const { accountId } = req.query;
    if (!accountId) return res.status(400).json({ error: 'Missing accountId query parameter.' });
    try {
      try {
        const collLedger = getCollection<any>('ledger_entries');
        const collAccounts = getCollection<any>('accounts');
        const entries = await collLedger.find({ account_id: String(accountId), user_id: userId }).toArray();
        let debits = 0;
        let credits = 0;
        for (const e of entries) {
          if (String(e.entry_type).toUpperCase() === 'DEBIT') debits += Number(e.amount || 0);
          if (String(e.entry_type).toUpperCase() === 'CREDIT') credits += Number(e.amount || 0);
        }
        const netFromLedger = debits - credits;
        const account = await collAccounts.findOne({ id: String(accountId) });
        const currentBalance = account ? Number(account.current_balance || 0) : null;
        const mismatch = currentBalance === null ? null : Math.abs(currentBalance - netFromLedger) > 0.0001;
        return res.json({ accountId: String(accountId), currentBalance, netFromLedger, debits, credits, mismatch, entriesCount: entries.length });
      } catch (mongoErr) {
        // Fallback to in-memory
        const entries = Array.from(database.ledgerEntries.values()).filter(le => le.account_id === String(accountId) && le.user_id === userId);
        let debits = 0;
        let credits = 0;
        for (const e of entries) {
          if (String(e.entry_type).toUpperCase() === 'DEBIT') debits += Number(e.amount || 0);
          if (String(e.entry_type).toUpperCase() === 'CREDIT') credits += Number(e.amount || 0);
        }
        const netFromLedger = debits - credits;
        const acc = Array.from(database.accounts.values()).find(a => a.id === String(accountId) && a.user_id === userId) as any | undefined;
        const currentBalance = acc ? Number(acc.current_balance || 0) : null;
        const mismatch = currentBalance === null ? null : Math.abs(currentBalance - netFromLedger) > 0.0001;
        return res.json({ accountId: String(accountId), currentBalance, netFromLedger, debits, credits, mismatch, entriesCount: entries.length });
      }
    } catch (err: any) {
      console.error('Ledger verify error:', err);
      return res.status(500).json({ error: 'Failed to verify ledger.' });
    }
  },
};

// -----------------------------------------------------------------------------
// ACCOUNTS & PAYMENT RAILS CONTROLLER
// -----------------------------------------------------------------------------
export const AccountsController = {
  async list(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    try {
      const rows = await getAccountsForUser(userId);
      const accounts = rows.map((acc: any) => ({
        ...acc,
        account_identifier_masked: FieldCrypto.maskIdentifier(acc.account_identifier),
      }));
      return res.json(accounts);
    } catch (err: any) {
      console.error('Accounts list error (PG):', err);
      return res.status(500).json({ error: 'Failed to list accounts.' });
    }
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const { platformName, accountName, accountType, accountIdentifier, currency, initialBalance, logoUrl, logo_url } = req.body;

    if (!platformName || !accountName) {
      return res.status(400).json({ error: 'Platform name and account name are required.' });
    }

    const finalLogoUrl = logoUrl || logo_url || null;
    try {
      const row = await createAccountPg(userId, {
        platformName,
        accountName,
        accountType,
        accountIdentifier,
        currency,
        initialBalance: 0,
        logoUrl: finalLogoUrl,
      });

      if (Number(initialBalance) > 0) {
        const txId = `tx_${crypto.randomBytes(6).toString('hex')}`;
        await createTransactionAtomic({
          id: txId,
          user_id: userId,
          source_account_id: null,
          destination_account_id: row.id,
          type: 'DEPOSIT',
          gross_amount: Number(initialBalance),
          fee_amount: 0,
          net_amount: Number(initialBalance),
          currency: currency || 'USD',
          status: 'CLEARED',
          transaction_date: new Date().toISOString().slice(0, 10),
          client_name: 'Opening Balance',
          notes: 'Initial account balance deposit',
        });
        row.current_balance = Number(initialBalance);
      }

      await logAuditPg(userId, 'ACCOUNT_CREATED', req.ip || '', req.headers['user-agent'] || '', 'SUCCESS', `Created account ${accountName} (${platformName})`);

      return res.status(201).json({
        ...row,
        account_identifier_masked: FieldCrypto.maskIdentifier(row.account_identifier),
      });
    } catch (err: any) {
      console.error('Account create error (PG):', err);
      return res.status(500).json({ error: 'Failed to create account.' });
    }
  },

  async update(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;
    const { accountName, isActive, currentBalance, logoUrl, logo_url } = req.body;

    const acc = database.accounts.get(id);
    if (!acc || acc.user_id !== userId) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    if (accountName !== undefined) acc.account_name = accountName;
    if (isActive !== undefined) acc.is_active = isActive;
    if (currentBalance !== undefined) acc.current_balance = Number(currentBalance);
    if (logoUrl !== undefined) acc.logo_url = logoUrl;
    if (logo_url !== undefined) acc.logo_url = logo_url;

    return res.json({
      ...acc,
      account_identifier_masked: FieldCrypto.maskIdentifier(acc.account_identifier),
    });
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;

    const acc = database.accounts.get(id);
    if (!acc || acc.user_id !== userId) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    database.accounts.delete(id);
    return res.json({ success: true, message: 'Account removed.' });
  },
};

// -----------------------------------------------------------------------------
// TRANSACTIONS & STATUS PIPELINE CONTROLLER
// -----------------------------------------------------------------------------
export const TransactionsController = {
  async list(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const { platform, status, type, startDate, endDate, search, limit = 100 } = req.query;

    let sourceList: TransactionRecord[] = [];
    let accountsList: any[] = [];
    try {
      sourceList = await getCollection<TransactionRecord>('transactions').find({ user_id: userId }).toArray();
      accountsList = await getCollection<any>('accounts').find({ user_id: userId }).toArray();
    } catch (e) {
      sourceList = Array.from(database.transactions.values()).filter(tx => tx.user_id === userId);
      accountsList = Array.from(database.accounts.values()).filter(a => a.user_id === userId);
    }
    const accMap = new Map();
    accountsList.forEach(a => accMap.set(a.id, a));

    let list: TransactionRecord[] = [];
    for (const tx of sourceList) {
      // Platform filter
      if (platform && platform !== 'ALL') {
        const destAcc = tx.destination_account_id ? accMap.get(tx.destination_account_id) : null;
        const srcAcc = tx.source_account_id ? accMap.get(tx.source_account_id) : null;
        const matchDest = destAcc && destAcc.platform_name.toLowerCase() === String(platform).toLowerCase();
        const matchSrc = srcAcc && srcAcc.platform_name.toLowerCase() === String(platform).toLowerCase();
        if (!matchDest && !matchSrc) continue;
      }

      // Status filter
      if (status && status !== 'ALL' && tx.status !== status) {
        continue;
      }

      // Type filter
      if (type && type !== 'ALL' && tx.type !== type) {
        continue;
      }

      // Date range
      if (startDate && tx.transaction_date < String(startDate)) continue;
      if (endDate && tx.transaction_date > String(endDate)) continue;

      // Text search (client name, notes, reference)
      if (search) {
        const q = String(search).toLowerCase();
        const text = `${tx.client_name} ${tx.notes} ${tx.reference_id}`.toLowerCase();
        if (!text.includes(q)) continue;
      }

      list.push(tx);
    }

    // Sort descending by transaction date
    list.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

    // Enrich with account names
    const enriched = list.slice(0, Number(limit)).map(tx => {
      const dest = tx.destination_account_id ? accMap.get(tx.destination_account_id) : null;
      const src = tx.source_account_id ? accMap.get(tx.source_account_id) : null;
      return {
        ...tx,
        destination_account_name: dest ? dest.account_name : null,
        destination_platform: dest ? dest.platform_name : null,
        source_account_name: src ? src.account_name : null,
        source_platform: src ? src.platform_name : null,
      };
    });

    return res.json(enriched);
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const {
      sourceAccountId,
      destinationAccountId,
      type,
      grossAmount,
      feeAmount,
      currency = 'USD',
      status = 'PENDING',
      transactionDate,
      expectedClearingDate,
      referenceId,
      clientName,
      notes,
    } = req.body;

    const numGross = parseFloat(grossAmount);
    if (isNaN(numGross) || numGross <= 0) {
      return res.status(400).json({ error: 'Valid gross amount greater than zero is required.' });
    }

    let calculatedFee = feeAmount !== undefined ? parseFloat(feeAmount) : 0;
    if (isNaN(calculatedFee)) calculatedFee = 0;

    // Auto-calculate fee if not specified and platform is known
    if (feeAmount === undefined && destinationAccountId) {
      const destAcc = database.accounts.get(destinationAccountId);
      if (destAcc) {
        const feeCalc = DecimalMath.calculateRailFee(destAcc.platform_name, numGross);
        calculatedFee = feeCalc.fee;
      }
    }

    const netAmount = DecimalMath.subtract(numGross, calculatedFee);

    const txId = `tx_${crypto.randomBytes(6).toString('hex')}`;
    const txRecord: TransactionRecord = {
      id: txId,
      user_id: userId,
      source_account_id: sourceAccountId || null,
      destination_account_id: destinationAccountId || null,
      type: type || 'INFLOW',
      gross_amount: numGross,
      fee_amount: calculatedFee,
      net_amount: netAmount,
      currency,
      status: status,
      transaction_date: transactionDate || new Date().toISOString().slice(0, 10),
      expected_clearing_date: expectedClearingDate || null,
      cleared_at: status === 'CLEARED' || status === 'DEPOSITED' ? new Date().toISOString() : null,
      reference_id: referenceId || `REF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      client_name: clientName || 'Client / Payer',
      notes: notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      await createTransactionAtomic({
        id: txRecord.id,
        user_id: txRecord.user_id,
        source_account_id: txRecord.source_account_id,
        destination_account_id: txRecord.destination_account_id,
        type: txRecord.type,
        gross_amount: txRecord.gross_amount,
        fee_amount: txRecord.fee_amount,
        net_amount: txRecord.net_amount,
        currency: txRecord.currency,
        status: txRecord.status,
        transaction_date: txRecord.transaction_date,
        expected_clearing_date: txRecord.expected_clearing_date,
        reference_id: txRecord.reference_id,
        client_name: txRecord.client_name,
        notes: txRecord.notes,
        created_at: txRecord.created_at,
        updated_at: txRecord.updated_at,
      });

      await logAuditPg(userId, 'TRANSACTION_CREATED', req.ip || '', req.headers['user-agent'] || '', 'SUCCESS', `Created transaction ${txId} for $${numGross}`);
      return res.status(201).json(txRecord);
    } catch (err: any) {
      console.error('Transaction create error (Mongo):', err);
      return res.status(500).json({ error: 'Failed to create transaction.' });
    }
  },

  async updateStatus(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;
    const { status, expectedClearingDate } = req.body;
    try {
      const updated = await updateTransactionStatusAtomic(id, userId, status, expectedClearingDate);
      await logAuditPg(userId, 'STATUS_UPDATED', req.ip || '', req.headers['user-agent'] || '', 'SUCCESS', `Tx ${id} status changed to ${status}`);
      return res.json(updated);
    } catch (err: any) {
      console.error('Update status error (PG):', err);
      return res.status(500).json({ error: 'Failed to update transaction status.' });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;
    try {
      await deleteTransactionAtomic(id, userId);
      await logAuditPg(userId, 'TRANSACTION_DELETED', req.ip || '', req.headers['user-agent'] || '', 'SUCCESS', `Deleted transaction ${id}`);
      return res.json({ success: true, message: 'Transaction deleted.' });
    } catch (err: any) {
      console.error('Delete transaction error (PG):', err);
      return res.status(500).json({ error: 'Failed to delete transaction.' });
    }
  },
};

// -----------------------------------------------------------------------------
// EXPENSES & RECEIPT VAULT CONTROLLER
// -----------------------------------------------------------------------------
export const ExpensesController = {
  async list(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const { categoryId, startDate, endDate, isTaxDeductible } = req.query;

    let sourceExpenses: any[] = [];
    let accountsList: any[] = [];
    let categoriesList: any[] = [];
    try {
      sourceExpenses = await getCollection<any>('expenses').find({ user_id: userId }).toArray();
      accountsList = await getCollection<any>('accounts').find({ user_id: userId }).toArray();
      categoriesList = await getCollection<any>('expense_categories').find({ user_id: userId }).toArray();
      if (categoriesList.length === 0) {
        categoriesList = Array.from(database.expenseCategories.values()).filter(c => c.user_id === userId);
      }
    } catch (e) {
      sourceExpenses = Array.from(database.expenses.values()).filter(exp => exp.user_id === userId);
      accountsList = Array.from(database.accounts.values()).filter(a => a.user_id === userId);
      categoriesList = Array.from(database.expenseCategories.values()).filter(c => c.user_id === userId);
    }
    const accMap = new Map();
    accountsList.forEach(a => accMap.set(a.id, a));
    const catMap = new Map();
    categoriesList.forEach(c => catMap.set(c.id, c));

    const expenses: any[] = [];
    for (const exp of sourceExpenses) {
      if (categoryId && exp.category_id !== categoryId) continue;
      if (isTaxDeductible !== undefined && String(exp.is_tax_deductible) !== String(isTaxDeductible)) continue;
      if (startDate && exp.expense_date < String(startDate)) continue;
      if (endDate && exp.expense_date > String(endDate)) continue;

      const cat = exp.category_id ? catMap.get(exp.category_id) : null;
      const acc = exp.account_id ? accMap.get(exp.account_id) : null;

      expenses.push({
        ...exp,
        category_name: cat ? cat.category_name : 'Uncategorized',
        category_color: cat ? cat.color : '#94A3B8',
        schedule_c_line: cat ? cat.schedule_c_line : null,
        account_name: acc ? acc.account_name : 'Cash/Other',
      });
    }

    expenses.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
    return res.json(expenses);
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const {
      categoryId,
      accountId,
      amount,
      currency = 'USD',
      vendor,
      expenseDate,
      isTaxDeductible = true,
      taxAmount = 0,
      receiptUrl,
      receiptName,
      receiptData,
      notes,
    } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid expense amount is required.' });
    }
    if (!vendor) {
      return res.status(400).json({ error: 'Vendor name is required.' });
    }

    const expId = `exp_${crypto.randomBytes(6).toString('hex')}`;
    const newExpense: ExpenseRecord = {
      id: expId,
      user_id: userId,
      category_id: categoryId || null,
      account_id: accountId || null,
      amount: numAmount,
      currency,
      vendor: vendor.trim(),
      expense_date: expenseDate || new Date().toISOString().slice(0, 10),
      is_tax_deductible: isTaxDeductible,
      tax_amount: parseFloat(taxAmount) || 0,
      receipt_url: receiptUrl || null,
      receipt_name: receiptName || null,
      receipt_data: receiptData || null,
      notes: notes || '',
      created_at: new Date().toISOString(),
    };

    try {
      await getCollection('expenses').insertOne(newExpense as any);
      if (accountId) {
        await getCollection('accounts').updateOne({ id: accountId }, { $inc: { current_balance: -numAmount } });
      }
    } catch (e) {
      database.expenses.set(expId, newExpense);
      if (accountId) {
        const acc = database.accounts.get(accountId);
        if (acc) {
          acc.current_balance = DecimalMath.subtract(acc.current_balance, numAmount);
        }
      }
      database.createLedgerForExpense(newExpense);
    }


    database.logAudit(userId, 'EXPENSE_CREATED', req.ip || '', req.headers['user-agent'] || '', 'SUCCESS', `Logged expense $${numAmount} at ${vendor}`);

    return res.status(201).json(newExpense);
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;

    const exp = database.expenses.get(id);
    if (!exp || exp.user_id !== userId) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    try {
      await getCollection('expenses').deleteOne({ id });
      if (exp.account_id) {
        await getCollection('accounts').updateOne({ id: exp.account_id }, { $inc: { current_balance: exp.amount } });
      }
    } catch (e) {
      if (exp.account_id) {
        const acc = database.accounts.get(exp.account_id);
        if (acc) {
          acc.current_balance = DecimalMath.add(acc.current_balance, exp.amount);
        }
      }
      database.expenses.delete(id);
    }
    return res.json({ success: true, message: 'Expense deleted.' });
  },
};

// -----------------------------------------------------------------------------
// EXPENSE CATEGORIES CONTROLLER
// -----------------------------------------------------------------------------
export const CategoriesController = {
  async list(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    let cats: ExpenseCategoryRecord[] = [];
    try {
      cats = await getCollection<ExpenseCategoryRecord>('expense_categories').find({ user_id: userId }).toArray();
      if (cats.length === 0) {
        cats = Array.from(database.expenseCategories.values()).filter(c => c.user_id === userId);
      }
    } catch (e) {
      cats = Array.from(database.expenseCategories.values()).filter(c => c.user_id === userId);
    }
    return res.json(cats);
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const { categoryName, description, isTaxDeductible = true, scheduleCLine, color } = req.body;

    if (!categoryName) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const catId = `cat_${crypto.randomBytes(6).toString('hex')}`;
    const newCat: ExpenseCategoryRecord = {
      id: catId,
      user_id: userId,
      category_name: categoryName,
      description: description || '',
      is_tax_deductible: isTaxDeductible,
      schedule_c_line: scheduleCLine || 'Line 27a: Other Expenses',
      color: color || '#6366F1',
      created_at: new Date().toISOString(),
    };

    try {
      await getCollection('expense_categories').insertOne(newCat as any);
    } catch (e) {
      database.expenseCategories.set(catId, newCat);
    }
    return res.status(201).json(newCat);
  },
};

// -----------------------------------------------------------------------------
// FINANCIAL REPORTS, P&L, CASH FLOW & TAX PREP CONTROLLER
// -----------------------------------------------------------------------------
export const ReportsController = {
  async getDashboardSummary(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;

    let sourceAccounts: any[] = [];
    let sourceTransactions: any[] = [];
    let sourceExpenses: any[] = [];
    try {
      sourceAccounts = await getCollection('accounts').find({ user_id: userId }).toArray();
      sourceTransactions = await getCollection('transactions').find({ user_id: userId }).toArray();
      sourceExpenses = await getCollection('expenses').find({ user_id: userId }).toArray();
    } catch (e) {
      sourceAccounts = Array.from(database.accounts.values()).filter(a => a.user_id === userId);
      sourceTransactions = Array.from(database.transactions.values()).filter(t => t.user_id === userId);
      sourceExpenses = Array.from(database.expenses.values()).filter(e => e.user_id === userId);
    }

    // 1. Account Balances by Rail
    let totalLiquidCash = 0;
    const railBalances: Record<string, { balance: number; name: string; type: string; id: string }> = {};
    const accMap = new Map();

    for (const acc of sourceAccounts) {
      accMap.set(acc.id, acc);
      if (acc.user_id !== userId || !acc.is_active) continue;
      totalLiquidCash = DecimalMath.add(totalLiquidCash, acc.current_balance);
      railBalances[acc.platform_name] = {
        id: acc.id,
        name: acc.account_name,
        type: acc.account_type,
        balance: acc.current_balance,
      };
    }

    // 2. Pending Funds in Transit (Inflows with status PENDING)
    let pendingInflowsTotal = 0;
    let pendingCount = 0;
    const pendingTransactions: any[] = [];

    // 3. Cleared This Month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    let clearedInflowsThisMonth = 0;
    let grossRevenueTotal = 0;
    let totalFeesPaid = 0;

    for (const tx of sourceTransactions) {
      if (tx.user_id !== userId) continue;

      if (tx.type === 'INFLOW') {
        grossRevenueTotal = DecimalMath.add(grossRevenueTotal, tx.gross_amount);
        totalFeesPaid = DecimalMath.add(totalFeesPaid, tx.fee_amount);

        if (tx.status === 'PENDING') {
          pendingInflowsTotal = DecimalMath.add(pendingInflowsTotal, tx.net_amount);
          pendingCount += 1;
          const dest = tx.destination_account_id ? accMap.get(tx.destination_account_id) : null;
          pendingTransactions.push({
            ...tx,
            platform_name: dest ? dest.platform_name : 'Unknown',
          });
        } else if (tx.status === 'CLEARED' || tx.status === 'DEPOSITED') {
          if (tx.transaction_date.startsWith(currentMonth)) {
            clearedInflowsThisMonth = DecimalMath.add(clearedInflowsThisMonth, tx.net_amount);
          }
        }
      }
    }

    // 4. Expenses Total
    let totalExpenses = 0;
    let deductibleExpenses = 0;
    for (const exp of sourceExpenses) {
      if (exp.user_id !== userId) continue;
      totalExpenses = DecimalMath.add(totalExpenses, exp.amount);
      if (exp.is_tax_deductible) {
        deductibleExpenses = DecimalMath.add(deductibleExpenses, exp.amount);
      }
    }

    // Estimated Net Taxable Income
    const netTaxableIncome = Math.max(0, DecimalMath.subtract(DecimalMath.subtract(grossRevenueTotal, totalFeesPaid), deductibleExpenses));
    const estimatedTaxRate = 0.25; // 25% blended self-employment + federal tax provision
    const estimatedTaxOwed = DecimalMath.multiply(netTaxableIncome, estimatedTaxRate);

    // Total Net Worth = Liquid Bank & Gateways + Pending Clearances
    const netWorth = DecimalMath.add(totalLiquidCash, pendingInflowsTotal);

    return res.json({
      summary: {
        totalNetWorth: netWorth,
        liquidCash: totalLiquidCash,
        pendingFundsInTransit: pendingInflowsTotal,
        pendingCount,
        clearedThisMonth: clearedInflowsThisMonth,
        grossRevenueTotal,
        totalFeesPaid,
        totalExpenses,
        deductibleExpenses,
        netTaxableIncome,
        estimatedTaxOwed,
      },
      railBalances,
      pendingPipeline: pendingTransactions.sort((a, b) => {
        const da = a.expected_clearing_date || a.transaction_date;
        const db = b.expected_clearing_date || b.transaction_date;
        return new Date(da).getTime() - new Date(db).getTime();
      }),
    });
  },

  async getPLReport(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const { year = new Date().getFullYear() } = req.query;

    const yearPrefix = String(year);

    // Revenue by Payment Rail
    const revenueByRail: Record<string, { gross: number; fees: number; net: number; count: number }> = {
      Stripe: { gross: 0, fees: 0, net: 0, count: 0 },
      Payoneer: { gross: 0, fees: 0, net: 0, count: 0 },
      Dot: { gross: 0, fees: 0, net: 0, count: 0 },
      Other: { gross: 0, fees: 0, net: 0, count: 0 },
    };

    let totalGrossRevenue = 0;
    let totalPlatformFees = 0;

    for (const tx of database.transactions.values()) {
      if (tx.user_id !== userId || tx.type !== 'INFLOW' || !tx.transaction_date.startsWith(yearPrefix)) {
        continue;
      }

      const dest = tx.destination_account_id ? database.accounts.get(tx.destination_account_id) : null;
      const rail = dest ? dest.platform_name : 'Other';
      const key = revenueByRail[rail] ? rail : 'Other';

      revenueByRail[key].gross = DecimalMath.add(revenueByRail[key].gross, tx.gross_amount);
      revenueByRail[key].fees = DecimalMath.add(revenueByRail[key].fees, tx.fee_amount);
      revenueByRail[key].net = DecimalMath.add(revenueByRail[key].net, tx.net_amount);
      revenueByRail[key].count += 1;

      totalGrossRevenue = DecimalMath.add(totalGrossRevenue, tx.gross_amount);
      totalPlatformFees = DecimalMath.add(totalPlatformFees, tx.fee_amount);
    }

    // Expenses by Category
    const expensesByCategory: Record<string, { name: string; amount: number; isDeductible: boolean; scheduleC: string; count: number }> = {};
    let totalOperatingExpenses = 0;
    let totalDeductibleExpenses = 0;
    let totalNonDeductibleExpenses = 0;

    for (const exp of database.expenses.values()) {
      if (exp.user_id !== userId || !exp.expense_date.startsWith(yearPrefix)) continue;

      const cat = exp.category_id ? database.expenseCategories.get(exp.category_id) : null;
      const catName = cat ? cat.category_name : 'General Office / Miscellaneous';
      const catId = exp.category_id || 'uncat';

      if (!expensesByCategory[catId]) {
        expensesByCategory[catId] = {
          name: catName,
          amount: 0,
          isDeductible: exp.is_tax_deductible,
          scheduleC: cat?.schedule_c_line || 'Line 27a: Other Expenses',
          count: 0,
        };
      }

      expensesByCategory[catId].amount = DecimalMath.add(expensesByCategory[catId].amount, exp.amount);
      expensesByCategory[catId].count += 1;

      totalOperatingExpenses = DecimalMath.add(totalOperatingExpenses, exp.amount);
      if (exp.is_tax_deductible) {
        totalDeductibleExpenses = DecimalMath.add(totalDeductibleExpenses, exp.amount);
      } else {
        totalNonDeductibleExpenses = DecimalMath.add(totalNonDeductibleExpenses, exp.amount);
      }
    }

    const netOperatingIncome = DecimalMath.subtract(
      DecimalMath.subtract(totalGrossRevenue, totalPlatformFees),
      totalOperatingExpenses
    );

    const netTaxableIncome = Math.max(0, DecimalMath.subtract(
      DecimalMath.subtract(totalGrossRevenue, totalPlatformFees),
      totalDeductibleExpenses
    ));

    const estimatedTax = DecimalMath.multiply(netTaxableIncome, 0.25);

    return res.json({
      taxYear: Number(year),
      statementType: 'Profit and Loss (P&L) Statement',
      preparedFor: req.user!.business_name,
      currency: 'USD',
      revenue: {
        grossRevenue: totalGrossRevenue,
        platformFees: totalPlatformFees,
        netRevenue: DecimalMath.subtract(totalGrossRevenue, totalPlatformFees),
        byRail: revenueByRail,
      },
      operatingExpenses: {
        total: totalOperatingExpenses,
        deductibleTotal: totalDeductibleExpenses,
        nonDeductibleTotal: totalNonDeductibleExpenses,
        byCategory: Object.values(expensesByCategory),
      },
      netOperatingIncome,
      netTaxableIncome,
      estimatedTaxProvision: estimatedTax,
    });
  },

  async getCashFlowReport(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    let operatingInflowsCleared = 0;
    let operatingInflowsPending = 0;
    let platformFeesPaid = 0;
    let operatingExpensesPaid = 0;
    let bankWithdrawalsCompleted = 0;

    for (const tx of database.transactions.values()) {
      if (tx.user_id !== userId) continue;

      if (tx.type === 'INFLOW') {
        if (tx.status === 'CLEARED' || tx.status === 'DEPOSITED') {
          operatingInflowsCleared = DecimalMath.add(operatingInflowsCleared, tx.net_amount);
        } else if (tx.status === 'PENDING') {
          operatingInflowsPending = DecimalMath.add(operatingInflowsPending, tx.net_amount);
        }
        platformFeesPaid = DecimalMath.add(platformFeesPaid, tx.fee_amount);
      } else if (tx.type === 'WITHDRAWAL' && (tx.status === 'DEPOSITED' || tx.status === 'CLEARED')) {
        bankWithdrawalsCompleted = DecimalMath.add(bankWithdrawalsCompleted, tx.net_amount);
      }
    }

    for (const exp of database.expenses.values()) {
      if (exp.user_id !== userId) continue;
      operatingExpensesPaid = DecimalMath.add(operatingExpensesPaid, exp.amount);
    }

    const netOperatingCashFlow = DecimalMath.subtract(operatingInflowsCleared, operatingExpensesPaid);

    return res.json({
      statementType: 'Statement of Cash Flows',
      currency: 'USD',
      operatingActivities: {
        cashReceivedFromClients: operatingInflowsCleared,
        cashPaidForOperatingExpenses: -operatingExpensesPaid,
        platformProcessingFeesPaid: -platformFeesPaid,
        netCashFromOperations: netOperatingCashFlow,
      },
      pendingInTransitLiquidity: {
        pendingClientReceipts: operatingInflowsPending,
      },
      financingAndTransfers: {
        sweepsToBankChecking: bankWithdrawalsCompleted,
      },
      netLiquidPosition: netOperatingCashFlow,
    });
  },

  async getTaxPrepReport(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { year = new Date().getFullYear() } = req.query;
    const yearPrefix = String(year);

    // IRS Schedule C Breakdown
    let line1GrossReceipts = 0;
    let line10CommissionsFees = 0; // Payment rail fees

    for (const tx of database.transactions.values()) {
      if (tx.user_id !== user.id || tx.type !== 'INFLOW' || !tx.transaction_date.startsWith(yearPrefix)) {
        continue;
      }
      line1GrossReceipts = DecimalMath.add(line1GrossReceipts, tx.gross_amount);
      line10CommissionsFees = DecimalMath.add(line10CommissionsFees, tx.fee_amount);
    }

    // Schedule C Expense Lines
    const scheduleCLines: Record<string, { label: string; amount: number; items: string[] }> = {
      'Line 8': { label: 'Advertising & Marketing', amount: 0, items: [] },
      'Line 10': { label: 'Commissions and Fees (Payment Rails)', amount: line10CommissionsFees, items: ['Stripe, Payoneer, Dot Processing Fees'] },
      'Line 13': { label: 'Depreciation & Section 179 Expense (Hardware)', amount: 0, items: [] },
      'Line 17': { label: 'Legal and Professional Services (CPA, Tax Prep)', amount: 0, items: [] },
      'Line 18': { label: 'Office Expense (Software, SaaS, Cloud APIs)', amount: 0, items: [] },
      'Line 20b': { label: 'Rent / Lease of Business Space (Co-working)', amount: 0, items: [] },
      'Line 27a': { label: 'Other Business Expenses', amount: 0, items: [] },
    };

    for (const exp of database.expenses.values()) {
      if (exp.user_id !== user.id || !exp.is_tax_deductible || !exp.expense_date.startsWith(yearPrefix)) {
        continue;
      }

      const cat = exp.category_id ? database.expenseCategories.get(exp.category_id) : null;
      const rawLine = cat?.schedule_c_line || 'Line 27a: Other Expenses';
      
      let matchedKey = 'Line 27a';
      if (rawLine.includes('Line 8')) matchedKey = 'Line 8';
      else if (rawLine.includes('Line 10')) matchedKey = 'Line 10';
      else if (rawLine.includes('Line 13')) matchedKey = 'Line 13';
      else if (rawLine.includes('Line 17')) matchedKey = 'Line 17';
      else if (rawLine.includes('Line 18')) matchedKey = 'Line 18';
      else if (rawLine.includes('Line 20b')) matchedKey = 'Line 20b';

      scheduleCLines[matchedKey].amount = DecimalMath.add(scheduleCLines[matchedKey].amount, exp.amount);
      scheduleCLines[matchedKey].items.push(`${exp.vendor} ($${exp.amount.toFixed(2)})`);
    }

    let totalDeductions = 0;
    Object.values(scheduleCLines).forEach(l => {
      totalDeductions = DecimalMath.add(totalDeductions, l.amount);
    });

    const netTaxableProfit = Math.max(0, DecimalMath.subtract(line1GrossReceipts, totalDeductions));
    const selfEmploymentTaxEst = DecimalMath.multiply(netTaxableProfit, 0.153); // 15.3% SE tax
    const incomeTaxEst = DecimalMath.multiply(netTaxableProfit, 0.12); // ~12% effective fed

    return res.json({
      form: 'IRS Form 1040 (Schedule C) - Profit or Loss From Business (Sole Proprietorship / Single-Member LLC)',
      taxYear: Number(year),
      taxpayer: {
        name: user.full_name,
        businessName: user.business_name,
        taxIdMasked: user.tax_id ? FieldCrypto.maskIdentifier(user.tax_id) : 'XX-XXX-XXXX',
        accountingMethod: 'Cash Basis',
      },
      part1_income: {
        line1_gross_receipts: line1GrossReceipts,
        line2_returns_allowances: 0,
        line3_subtotal: line1GrossReceipts,
        line4_cost_of_goods_sold: 0,
        line7_gross_income: line1GrossReceipts,
      },
      part2_expenses: {
        breakdown: scheduleCLines,
        line28_total_expenses: totalDeductions,
      },
      part3_net_profit_or_loss: {
        line31_net_profit: netTaxableProfit,
        estimatedSelfEmploymentTax: selfEmploymentTaxEst,
        estimatedIncomeTax: incomeTaxEst,
        totalQuarterlyEstimatedProvision: DecimalMath.add(selfEmploymentTaxEst, incomeTaxEst),
      },
    });
  },

  async getLedgerJournal(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const entries: LedgerEntryRecord[] = [];

    let totalDebits = 0;
    let totalCredits = 0;

    for (const ldg of database.ledgerEntries.values()) {
      if (ldg.user_id !== userId) continue;
      entries.push(ldg);
      if (ldg.entry_type === 'DEBIT') {
        totalDebits = DecimalMath.add(totalDebits, ldg.amount);
      } else {
        totalCredits = DecimalMath.add(totalCredits, ldg.amount);
      }
    }

    entries.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());

    return res.json({
      ledgerJournal: entries,
      trialBalance: {
        totalDebits,
        totalCredits,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      },
    });
  },

  async getSecurityAuditLogs(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const logs = database.auditLogs.filter(l => l.user_id === userId || l.user_id === null);
    return res.json(logs);
  },

  async resetSeedData(req: AuthenticatedRequest, res: Response) {
    database.seedDefaultFreelancer();
    return res.json({ success: true, message: 'Database reset to default freelancer scenario.' });
  },
};
