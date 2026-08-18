import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
dotenv.config();
import { connectMongo } from './server/db_mongo.ts';

import {
  AuthController,
  AccountsController,
  TransactionsController,
  ExpensesController,
  CategoriesController,
  ReportsController,
  AuditController,
  LedgerController,
} from './server/controllers.ts';
import { requireAuth } from './server/auth.ts';
import { createRateLimiter } from './server/rateLimiter.ts';

async function startServer() {
  // Connect to MongoDB if configured
  if (process.env.MONGODB_URI) {
    try {
      await connectMongo();
      console.log('Connected to MongoDB');
    } catch (err) {
      console.warn('Failed to connect to MongoDB:', err.message || err);
    }
  } else {
    console.warn('MONGODB_URI not set; skipping MongoDB connection. Create a .env from .env.example');
  }

  const app = express();
  const PORT = 3000;

  // Global Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  // Security middlewares
  const isDev = process.env.NODE_ENV === 'development';
  app.use(
    helmet({
      contentSecurityPolicy: isDev ? false : {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "data:"],
        },
      },
    })
  );
  const allowed = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length > 0) {
    app.use(cors({ origin: allowed }));
  } else {
    app.use(cors());
  }

  // Basic runtime checks
  if (!process.env.JWT_SECRET || String(process.env.JWT_SECRET).length < 16) {
    console.warn('WARNING: JWT_SECRET is not set or is weak. Set a strong secret in production.');
  }

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Rate limiters for security
  const authLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: 'Too many authentication attempts. Please wait 1 minute.',
    keyPrefix: 'auth_rate_limit',
  });

  const apiLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 200,
    message: 'API rate limit exceeded. Please slow down.',
    keyPrefix: 'api_rate_limit',
  });

  // ---------------------------------------------------------------------------
  // API ROUTES
  // ---------------------------------------------------------------------------

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'freelancer-finance-accounting-api',
      version: '1.0.0',
    });
  });

  // Auth Routes
  app.post('/api/auth/register', authLimiter, AuthController.register);
  app.post('/api/auth/login', authLimiter, AuthController.login);
  app.post('/api/auth/mfa/verify-login', authLimiter, AuthController.verifyMfaLogin);
  app.post('/api/auth/logout', AuthController.logout);
  app.get('/api/auth/me', requireAuth, AuthController.getMe);
  app.post('/api/auth/mfa/setup', requireAuth, AuthController.setupMFA);
  app.post('/api/auth/mfa/verify', requireAuth, AuthController.verifyAndEnableMFA);
  app.post('/api/auth/mfa/disable', requireAuth, AuthController.disableMFA);

  // Accounts & Payment Rails Routes
  app.get('/api/accounts', requireAuth, apiLimiter, AccountsController.list);
  app.post('/api/accounts', requireAuth, apiLimiter, AccountsController.create);
  app.put('/api/accounts/:id', requireAuth, apiLimiter, AccountsController.update);
  app.delete('/api/accounts/:id', requireAuth, apiLimiter, AccountsController.delete);

  // Transactions & Status Pipeline Routes
  app.get('/api/transactions', requireAuth, apiLimiter, TransactionsController.list);
  app.post('/api/transactions', requireAuth, apiLimiter, TransactionsController.create);
  app.put('/api/transactions/:id/status', requireAuth, apiLimiter, TransactionsController.updateStatus);
  app.delete('/api/transactions/:id', requireAuth, apiLimiter, TransactionsController.delete);

  // Audit & Ledger verification
  app.get('/api/transactions/:id/audit', requireAuth, apiLimiter, AuditController.getTransactionAudit);
  app.get('/api/ledger/verify', requireAuth, apiLimiter, LedgerController.verifyAccountLedger);

  // Expenses & Receipt Vault Routes
  app.get('/api/expenses', requireAuth, apiLimiter, ExpensesController.list);
  app.post('/api/expenses', requireAuth, apiLimiter, ExpensesController.create);
  app.delete('/api/expenses/:id', requireAuth, apiLimiter, ExpensesController.delete);

  // Expense Categories
  app.get('/api/categories', requireAuth, apiLimiter, CategoriesController.list);
  app.post('/api/categories', requireAuth, apiLimiter, CategoriesController.create);

  // Financial Statements & Accountant Reports
  app.get('/api/reports/dashboard-summary', requireAuth, apiLimiter, ReportsController.getDashboardSummary);
  app.get('/api/reports/pl', requireAuth, apiLimiter, ReportsController.getPLReport);
  app.get('/api/reports/cashflow', requireAuth, apiLimiter, ReportsController.getCashFlowReport);
  app.get('/api/reports/tax-prep', requireAuth, apiLimiter, ReportsController.getTaxPrepReport);
  app.get('/api/reports/ledger', requireAuth, apiLimiter, ReportsController.getLedgerJournal);
  app.get('/api/reports/security-audit', requireAuth, apiLimiter, ReportsController.getSecurityAuditLogs);
  app.post('/api/seed/reset', requireAuth, apiLimiter, ReportsController.resetSeedData);

  // Global API Error Handler
  app.use('/api/*', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled API Error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred.',
    });
  });

  // ---------------------------------------------------------------------------
  // VITE & FRONTEND INTEGRATION
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Freelance Finance & Accounting API Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
