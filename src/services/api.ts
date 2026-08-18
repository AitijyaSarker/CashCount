import {
  User,
  Account,
  Transaction,
  Expense,
  ExpenseCategory,
  DashboardSummary,
  PLReport,
  CashFlowReport,
  TaxPrepReport,
  LedgerEntry,
  SecurityAuditLog,
} from '../types';

const TOKEN_KEY = 'freelance_auth_jwt_token';

class ApiService {
  private getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  public setToken(token: string | null) {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch (e) {
      console.error('Could not save auth token to localStorage', e);
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    const token = this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
      credentials: 'include', // sends HTTP-only cookie automatically
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.message || data.error || `HTTP error ${response.status}`;
      const error: any = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data as T;
  }

  // Auth
  async register(body: { email: string; password: string; fullName?: string; businessName?: string; taxId?: string }) {
    const res = await this.request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async login(body: { email: string; password: string; mfaCode?: string }) {
    const res = await this.request<{ user?: User; token?: string; mfaRequired?: boolean; mfaToken?: string; message?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async verifyMfaLogin(body: { mfaToken: string; mfaCode: string }) {
    const res = await this.request<{ user: User; token: string }>('/api/auth/mfa/verify-login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async getMe() {
    return this.request<{ user: User }>('/api/auth/me');
  }

  async logout() {
    this.setToken(null);
    return this.request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
  }

  async setupMFA() {
    return this.request<{ secret: string; otpAuthUrl: string; recoveryCodes: string[]; email: string }>('/api/auth/mfa/setup', {
      method: 'POST',
    });
  }

  async verifyAndEnableMFA(code: string) {
    return this.request<{ success: boolean; recoveryCodes: string[]; message: string }>('/api/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async disableMFA(password: string) {
    return this.request<{ success: boolean; message: string }>('/api/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  // Accounts
  async getAccounts() {
    return this.request<Account[]>('/api/accounts');
  }

  async createAccount(data: Partial<Account> & { platformName: string; accountName: string; initialBalance?: number; accountIdentifier?: string; logoUrl?: string | null; logo_url?: string | null }) {
    return this.request<Account>('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAccount(id: string, data: Partial<Account>) {
    return this.request<Account>(`/api/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(id: string) {
    return this.request<{ success: boolean }>(`/api/accounts/${id}`, {
      method: 'DELETE',
    });
  }

  // Transactions
  async getTransactions(params: {
    platform?: string;
    status?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  } = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) query.append(k, v);
    });
    return this.request<Transaction[]>(`/api/transactions?${query.toString()}`);
  }

  async createTransaction(data: any) {
    return this.request<Transaction>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTransactionStatus(id: string, status: string, expectedClearingDate?: string) {
    return this.request<Transaction>(`/api/transactions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, expectedClearingDate }),
    });
  }

  async deleteTransaction(id: string) {
    return this.request<{ success: boolean }>(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // Expenses & Categories
  async getExpenses(params: { categoryId?: string; startDate?: string; endDate?: string; isTaxDeductible?: boolean } = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, String(v));
    });
    return this.request<Expense[]>(`/api/expenses?${query.toString()}`);
  }

  async createExpense(data: any) {
    return this.request<Expense>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id: string) {
    return this.request<{ success: boolean }>(`/api/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  async getCategories() {
    return this.request<ExpenseCategory[]>('/api/categories');
  }

  async createCategory(data: Partial<ExpenseCategory> & { categoryName: string }) {
    return this.request<ExpenseCategory>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Reports
  async getDashboardSummary() {
    return this.request<DashboardSummary>('/api/reports/dashboard-summary');
  }

  async getPLReport(year?: number) {
    const y = year || new Date().getFullYear();
    return this.request<PLReport>(`/api/reports/pl?year=${y}`);
  }

  async getCashFlowReport() {
    return this.request<CashFlowReport>('/api/reports/cashflow');
  }

  async getTaxPrepReport(year?: number) {
    const y = year || new Date().getFullYear();
    return this.request<TaxPrepReport>(`/api/reports/tax-prep?year=${y}`);
  }

  async getLedgerJournal() {
    return this.request<{ ledgerJournal: LedgerEntry[]; trialBalance: { totalDebits: number; totalCredits: number; isBalanced: boolean } }>(
      '/api/reports/ledger'
    );
  }

  async getSecurityAuditLogs() {
    return this.request<SecurityAuditLog[]>('/api/reports/security-audit');
  }

  async resetSeedData() {
    return this.request<{ success: boolean; message: string }>('/api/seed/reset', {
      method: 'POST',
    });
  }
}

export const api = new ApiService();
