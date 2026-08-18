import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const uri = (process.env.MONGODB_URI || '').trim().replace(/^"|"$/g, '');
  if (!uri) throw new Error('MONGODB_URI not set in environment');
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGODB_DB_NAME || 'cashcount';
  const db = client.db(dbName);

  console.log('Connected to', uri, 'db:', dbName);

  // Create recommended indexes
  await db.collection('accounts').createIndex({ id: 1 }, { unique: true });
  await db.collection('accounts').createIndex({ user_id: 1 });

  await db.collection('transactions').createIndex({ id: 1 }, { unique: true });
  await db.collection('transactions').createIndex({ user_id: 1 });
  await db.collection('transactions').createIndex({ destination_account_id: 1 });
  await db.collection('transactions').createIndex({ status: 1 });

  await db.collection('ledger_entries').createIndex({ transaction_id: 1 });
  await db.collection('ledger_entries').createIndex({ account_id: 1 });
  await db.collection('ledger_entries').createIndex({ user_id: 1 });

  await db.collection('security_audit_logs').createIndex({ user_id: 1 });
  await db.collection('security_audit_logs').createIndex({ created_at: -1 });

  console.log('Indexes created');
  await client.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
