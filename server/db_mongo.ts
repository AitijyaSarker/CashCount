import { MongoClient, Db, ClientSession } from 'mongodb';
import { database } from './db.ts';

const dbName = process.env.MONGODB_DB_NAME || 'cashcount';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(customUri?: string, customDb?: string) {
  if (client && db) return db;

  // Read the URI at runtime to avoid module-load ordering issues
  let realUri = customUri || process.env.MONGODB_URI;
  if (!realUri) {
    console.warn('MONGODB_URI is not set. Set it in .env or environment.');
    throw new Error('MONGODB_URI not set');
  }

  // Trim surrounding quotes or whitespace
  realUri = String(realUri).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');

  // Basic validation
  if (!/^mongodb(\+srv)?:\/\//.test(realUri)) {
    throw new Error('Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"');
  }

  const connectUri = realUri;
  client = new MongoClient(connectUri, {});
  await client.connect();
  db = client.db(customDb || dbName);
  
  // Initialize collections and indexes
  await initializeCollections();
  
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error('MongoDB not connected — call connectMongo() first');
  return db;
}

// ============================================================================
// INITIALIZE COLLECTIONS & SCHEMA
// ============================================================================

async function initializeCollections() {
  if (!db) return;

  try {
    // Create collections if they don't exist
    const existingCollections = await db.listCollections().toArray();
    const collectionNames = existingCollections.map((c: any) => c.name);

    // Users Collection
    if (!collectionNames.includes('users')) {
      console.log('Creating users collection...');
      await db.createCollection('users', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['id', 'email', 'password_hash', 'created_at'],
            properties: {
              id: { bsonType: 'string', description: 'User ID' },
              email: { bsonType: 'string', description: 'User email (unique)' },
              password_hash: { bsonType: 'string', description: 'Bcrypt password hash' },
              full_name: { bsonType: 'string', description: 'Full name' },
              business_name: { bsonType: 'string', description: 'Business name' },
              tax_id: { bsonType: 'string', description: 'Encrypted tax ID' },
              mfa_enabled: { bsonType: 'bool', description: 'MFA enabled flag' },
              mfa_secret: { bsonType: 'string', description: 'MFA secret (TOTP)' },
              recovery_codes: { bsonType: 'array', description: 'MFA recovery codes' },
              created_at: { bsonType: 'string', description: 'Creation timestamp' },
              updated_at: { bsonType: 'string', description: 'Last update timestamp' },
            },
          },
        },
      });
      
      // Create indexes
      const usersCol = db.collection('users');
      await usersCol.createIndex({ email: 1 }, { unique: true });
      await usersCol.createIndex({ id: 1 }, { unique: true });
      console.log('✓ Users collection created with indexes');
    } else {
      console.log('✓ Users collection already exists');
    }

    // Accounts Collection
    if (!collectionNames.includes('accounts')) {
      console.log('Creating accounts collection...');
      await db.createCollection('accounts');
      const accountsCol = db.collection('accounts');
      await accountsCol.createIndex({ user_id: 1 });
      await accountsCol.createIndex({ id: 1 });
      console.log('✓ Accounts collection created with indexes');
    }

    // Transactions Collection
    if (!collectionNames.includes('transactions')) {
      console.log('Creating transactions collection...');
      await db.createCollection('transactions');
      const txCol = db.collection('transactions');
      await txCol.createIndex({ user_id: 1 });
      await txCol.createIndex({ transaction_date: -1 });
      console.log('✓ Transactions collection created with indexes');
    }

    // Expenses Collection
    if (!collectionNames.includes('expenses')) {
      console.log('Creating expenses collection...');
      await db.createCollection('expenses');
      const expCol = db.collection('expenses');
      await expCol.createIndex({ user_id: 1 });
      await expCol.createIndex({ expense_date: -1 });
      console.log('✓ Expenses collection created with indexes');
    }

    // Expense Categories Collection
    if (!collectionNames.includes('expense_categories')) {
      console.log('Creating expense_categories collection...');
      const catCol = db.collection('expense_categories');
      await catCol.createIndex({ user_id: 1 });
      console.log('✓ Expense categories collection created');
    }

    // Ledger Entries Collection
    if (!collectionNames.includes('ledger_entries')) {
      console.log('Creating ledger_entries collection...');
      const ledgerCol = db.collection('ledger_entries');
      await ledgerCol.createIndex({ user_id: 1 });
      await ledgerCol.createIndex({ transaction_id: 1 });
      console.log('✓ Ledger entries collection created');
    }

    // Security Audit Logs Collection
    if (!collectionNames.includes('security_audit_logs')) {
      console.log('Creating security_audit_logs collection...');
      const auditCol = db.collection('security_audit_logs');
      await auditCol.createIndex({ user_id: 1 });
      await auditCol.createIndex({ action: 1 });
      await auditCol.createIndex({ timestamp: -1 });
      console.log('✓ Security audit logs collection created');
    }

    console.log('✅ MongoDB collections initialized for production');
  } catch (err: any) {
    if (err.codeName === 'NamespaceExists') {
      console.log('✓ Collections already exist');
    } else {
      console.error('Error initializing collections:', err.message || err);
    }
  }
}

export function getCollection<T>(name: string) {
  return getDb().collection<T>(name);
}

export async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export async function withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  if (!client) throw new Error('MongoClient not initialized. Call connectMongo() first.');
  const session = client.startSession();
  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    // @ts-ignore
    return result;
  } finally {
    await session.endSession();
  }
}

// Example helper: createTransactionAtomic (application-specific, adapt to your domain)
export async function createTransactionAtomic(tx: {
  id: string;
  user_id: string;
  source_account_id?: string | null;
  destination_account_id?: string | null;
  gross_amount: number;
  fee_amount?: number;
  net_amount: number;
  currency?: string;
  transaction_date: Date;
  type: string;
  status?: string;
}, session?: ClientSession) {
  // If Mongo is not connected, fallback to in-memory database operations
  if (!db) {
    // fallback: write to in-memory database
    database.transactions.set(tx.id, {
      id: tx.id,
      user_id: tx.user_id,
      source_account_id: tx.source_account_id || null,
      destination_account_id: tx.destination_account_id || null,
      type: tx.type as any,
      gross_amount: tx.gross_amount,
      fee_amount: tx.fee_amount || 0,
      net_amount: tx.net_amount,
      currency: tx.currency || 'USD',
      status: tx.status || 'PENDING',
      transaction_date: typeof tx.transaction_date === 'string' ? tx.transaction_date : (tx.transaction_date as Date).toISOString().slice(0,10),
      expected_clearing_date: (tx as any).expected_clearing_date || null,
      cleared_at: (tx as any).cleared_at || null,
      reference_id: (tx as any).reference_id || null,
      client_name: (tx as any).client_name || '',
      notes: (tx as any).notes || '',
      created_at: (tx as any).created_at || new Date().toISOString(),
      updated_at: (tx as any).updated_at || new Date().toISOString(),
    });

    // Update balances if status indicates cleared
    if ((tx as any).status === 'CLEARED' || (tx as any).status === 'DEPOSITED') {
      if (tx.destination_account_id) {
        const dest = database.accounts.get(tx.destination_account_id);
        if (dest) dest.current_balance = dest.current_balance + tx.net_amount;
      }
      if (tx.source_account_id) {
        const src = database.accounts.get(tx.source_account_id);
        if (src) src.current_balance = src.current_balance - tx.gross_amount;
      }
    }

    // create ledger entries using database helper
    database.createLedgerForTransaction && database.createLedgerForTransaction(tx as any);
    return;
  }

  const collTx = getCollection('transactions');
  const collLedger = getCollection('ledger_entries');
  const collAccounts = getCollection('accounts');

  // If caller provided a session, use it; otherwise run a transaction
  if (session) {
    await collTx.insertOne(tx as any, { session });
    // Create ledger entries and update balances as needed (simplified)
    // You should adapt to your double-entry rules
    await collLedger.insertOne({
      id: tx.id + '_L1',
      user_id: tx.user_id,
      transaction_id: tx.id,
      account_id: tx.source_account_id,
      account_name: 'source',
      entry_type: 'CREDIT',
      amount: tx.gross_amount,
      entry_date: tx.transaction_date,
    }, { session });
    await collLedger.insertOne({
      id: tx.id + '_L2',
      user_id: tx.user_id,
      transaction_id: tx.id,
      account_id: tx.destination_account_id,
      account_name: 'destination',
      entry_type: 'DEBIT',
      amount: tx.net_amount,
      entry_date: tx.transaction_date,
    }, { session });
    // Update account balances (simple increment/decrement)
    if (tx.source_account_id) {
      await collAccounts.updateOne({ id: tx.source_account_id }, { $inc: { current_balance: -tx.gross_amount } }, { session });
    }
    if (tx.destination_account_id) {
      await collAccounts.updateOne({ id: tx.destination_account_id }, { $inc: { current_balance: tx.net_amount } }, { session });
    }
    return;
  }

  // No session provided — run a transaction (requires replica set / Atlas)
  return withTransaction(async (s) => {
    return createTransactionAtomic(tx, s);
  });
}

// Helper: list accounts for a user
export async function getAccountsForUser(userId: string) {
  if (!db) {
    return Array.from(database.accounts.values()).filter(a => a.user_id === userId);
  }
  const coll = getCollection<any>('accounts');
  return coll.find({ user_id: userId }).toArray();
}

// Helper: create account for user
export async function createAccount(userId: string, payload: any) {
  const id = payload.id || `acc_${Math.random().toString(36).slice(2, 10)}`;
  const doc = {
    id,
    user_id: userId,
    platform_name: payload.platformName,
    account_name: payload.accountName,
    account_type: payload.accountType,
    account_identifier: payload.accountIdentifier || null,
    currency: payload.currency || 'USD',
    current_balance: payload.initialBalance || 0,
    is_active: true,
    logo_url: payload.logoUrl || null,
    created_at: new Date().toISOString(),
  };
  if (!db) {
    database.accounts.set(id, doc as any);
    return doc;
  }
  const coll = getCollection<any>('accounts');
  await coll.insertOne(doc);
  return doc;
}

// Helper: write audit log
export async function logAudit(userId: string | null, action: string, ip: string, userAgent: string, status: string, details: string) {
  const id = `al_${Math.random().toString(36).slice(2, 10)}`;
  if (!db) {
    if (database.logAudit) {
      database.logAudit(userId, action, ip, userAgent, status, details);
      return;
    }
    database.auditLogs.unshift({ id, user_id: userId, action, ip_address: ip, user_agent: userAgent, status: status as any, details, created_at: new Date().toISOString() } as any);
    return;
  }
  const coll = getCollection<any>('security_audit_logs');
  await coll.insertOne({ id, user_id: userId, action, ip_address: ip, user_agent: userAgent, status, details, created_at: new Date().toISOString() });
}

// Update transaction status atomically: adjust balances and ledger entries when clearing/deleting
export async function updateTransactionStatusAtomic(txId: string, userId: string, status: string, expectedClearingDate?: string) {
  if (!db) {
    const tx = database.transactions.get(txId as any);
    if (!tx || tx.user_id !== userId) throw new Error('Transaction not found');
    const prevStatus = tx.status;
    tx.status = status as any;
    tx.expected_clearing_date = expectedClearingDate || null;
    tx.updated_at = new Date().toISOString();

    if ((status === 'CLEARED' || status === 'DEPOSITED') && !(prevStatus === 'CLEARED' || prevStatus === 'DEPOSITED')) {
      if (tx.destination_account_id) {
        const dest = database.accounts.get(tx.destination_account_id);
        if (dest) dest.current_balance = dest.current_balance + tx.net_amount;
        database.createLedgerForTransaction && database.createLedgerForTransaction(tx as any);
      }
      if (tx.source_account_id) {
        const src = database.accounts.get(tx.source_account_id);
        if (src) src.current_balance = src.current_balance - tx.gross_amount;
        database.createLedgerForTransaction && database.createLedgerForTransaction(tx as any);
      }
      tx.cleared_at = new Date().toISOString();
    }
    return tx;
  }
  return withTransaction(async (session) => {
    const collTx = getCollection<any>('transactions');
    const collAccounts = getCollection<any>('accounts');
    const collLedger = getCollection<any>('ledger_entries');

    const tx = await collTx.findOne({ id: txId, user_id: userId }, { session });
    if (!tx) throw new Error('Transaction not found');

    const prevStatus = tx.status;

    await collTx.updateOne({ id: txId, user_id: userId }, { $set: { status, expected_clearing_date: expectedClearingDate || null, updated_at: new Date().toISOString() } }, { session });

    // If previously not cleared and now cleared/deposited, update balances and add ledger
    if ((status === 'CLEARED' || status === 'DEPOSITED') && !(prevStatus === 'CLEARED' || prevStatus === 'DEPOSITED')) {
      if (tx.destination_account_id) {
        await collAccounts.updateOne({ id: tx.destination_account_id }, { $inc: { current_balance: tx.net_amount } }, { session });
        await collLedger.insertOne({ id: `${txId}_L_dest`, user_id: userId, transaction_id: txId, account_id: tx.destination_account_id, account_name: 'destination', entry_type: 'DEBIT', amount: tx.net_amount, entry_date: tx.transaction_date, created_at: new Date().toISOString() }, { session });
      }
      if (tx.source_account_id) {
        await collAccounts.updateOne({ id: tx.source_account_id }, { $inc: { current_balance: -tx.gross_amount } }, { session });
        await collLedger.insertOne({ id: `${txId}_L_src`, user_id: userId, transaction_id: txId, account_id: tx.source_account_id, account_name: 'source', entry_type: 'CREDIT', amount: tx.gross_amount, entry_date: tx.transaction_date, created_at: new Date().toISOString() }, { session });
      }
      await collTx.updateOne({ id: txId }, { $set: { cleared_at: new Date().toISOString() } }, { session });
    }

    return await collTx.findOne({ id: txId, user_id: userId }, { session });
  });
}

export async function deleteTransactionAtomic(txId: string, userId: string) {
  if (!db) {
    const tx = database.transactions.get(txId as any);
    if (!tx || tx.user_id !== userId) throw new Error('Transaction not found');
    if (tx.status === 'CLEARED' || tx.status === 'DEPOSITED') {
      if (tx.destination_account_id) {
        const dest = database.accounts.get(tx.destination_account_id);
        if (dest) dest.current_balance = dest.current_balance - tx.net_amount;
      }
      if (tx.source_account_id) {
        const src = database.accounts.get(tx.source_account_id);
        if (src) src.current_balance = src.current_balance + tx.gross_amount;
      }
    }
    // remove ledger entries
    for (const [k, v] of database.ledgerEntries.entries()) {
      if (v.transaction_id === txId) database.ledgerEntries.delete(k);
    }
    database.transactions.delete(txId as any);
    return;
  }
  return withTransaction(async (session) => {
    const collTx = getCollection<any>('transactions');
    const collAccounts = getCollection<any>('accounts');
    const collLedger = getCollection<any>('ledger_entries');

    const tx = await collTx.findOne({ id: txId, user_id: userId }, { session });
    if (!tx) throw new Error('Transaction not found');

    // If cleared, revert balances
    if (tx.status === 'CLEARED' || tx.status === 'DEPOSITED') {
      if (tx.destination_account_id) {
        await collAccounts.updateOne({ id: tx.destination_account_id }, { $inc: { current_balance: -tx.net_amount } }, { session });
      }
      if (tx.source_account_id) {
        await collAccounts.updateOne({ id: tx.source_account_id }, { $inc: { current_balance: tx.gross_amount } }, { session });
      }
    }

    // Remove ledger entries and transaction
    await collLedger.deleteMany({ transaction_id: txId }, { session });
    await collTx.deleteOne({ id: txId, user_id: userId }, { session });
  });
}

// ============================================================================
// USER OPERATIONS (MongoDB)
// ============================================================================

import { UserRecord } from './db.ts';

export async function createUserMongo(user: UserRecord): Promise<UserRecord> {
  if (!db) {
    // Fallback: save to in-memory database
    database.users.set(user.id, user);
    return user;
  }
  
  const collUsers = getCollection('users');
  await collUsers.insertOne(user as any);
  return user;
}

export async function findUserByEmailMongo(email: string): Promise<UserRecord | null> {
  if (!db) {
    // Fallback: search in-memory database
    for (const user of database.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }
  
  const collUsers = getCollection('users');
  const user = await collUsers.findOne({ email: email.toLowerCase() }) as UserRecord | null;
  return user;
}

export async function findUserByIdMongo(userId: string): Promise<UserRecord | null> {
  if (!db) {
    // Fallback: search in-memory database
    return database.users.get(userId) || null;
  }
  
  const collUsers = getCollection('users');
  const user = await collUsers.findOne({ id: userId }) as UserRecord | null;
  return user;
}

export async function updateUserMongo(userId: string, updates: Partial<UserRecord>): Promise<UserRecord | null> {
  if (!db) {
    // Fallback: update in-memory database
    const user = database.users.get(userId);
    if (user) {
      const updated = { ...user, ...updates };
      database.users.set(userId, updated);
      return updated;
    }
    return null;
  }
  
  const collUsers = getCollection('users');
  const result = await collUsers.findOneAndUpdate(
    { id: userId },
    { $set: updates },
    { returnDocument: 'after' }
  );
  return result.value as UserRecord | null;
}
