import { apiClient } from './client';

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export type AccountSubtype =
  | 'CASH'
  | 'BANK'
  | 'ACCOUNTS_RECEIVABLE'
  | 'INVENTORY'
  | 'FIXED_ASSET'
  | 'OTHER_ASSET'
  | 'ACCOUNTS_PAYABLE'
  | 'TAX_PAYABLE'
  | 'LOAN'
  | 'OTHER_LIABILITY'
  | 'OWNER_EQUITY'
  | 'RETAINED_EARNINGS'
  | 'SALES'
  | 'SERVICE_REVENUE'
  | 'OTHER_REVENUE'
  | 'COGS'
  | 'OPERATING_EXPENSE'
  | 'PAYROLL_EXPENSE'
  | 'TAX_EXPENSE'
  | 'DEPRECIATION_EXPENSE'
  | 'OTHER_EXPENSE';

export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'VOIDED';

export interface ApiAccount {
  id: string;
  organizationId: string;
  entityId: string;
  code: string;
  name: string;
  type: AccountType;
  subtype?: AccountSubtype;
  parentId?: string;
  parent?: { id: string; code: string; name: string };
  description?: string;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
}

export interface CreateAccountPayload {
  entityId: string;
  code: string;
  name: string;
  type: AccountType;
  subtype?: AccountSubtype;
  parentId?: string;
  description?: string;
}

export interface UpdateAccountPayload {
  name?: string;
  type?: AccountType;
  subtype?: AccountSubtype;
  parentId?: string;
  description?: string;
  isActive?: boolean;
}

export interface ApiJournalLine {
  id?: string;
  accountId: string;
  description?: string;
  debit: number;
  credit: number;
  currency?: string;
  account?: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
  };
}

export interface ApiJournalEntry {
  id: string;
  organizationId: string;
  entityId: string;
  entryNumber: string;
  entryDate: string;
  reference?: string;
  description: string;
  status: JournalEntryStatus;
  sourceType: string;
  currency: string;
  exchangeRate: number;
  postedAt?: string;
  postedBy?: { id: string; email: string; fullName: string };
  lines: ApiJournalLine[];
  createdAt: string;
}

export interface CreateJournalEntryPayload {
  entityId: string;
  entryDate: string;
  description: string;
  reference?: string;
  status?: JournalEntryStatus;
  currency?: string;
  exchangeRate?: number;
  lines: {
    accountId: string;
    description?: string;
    debit: number;
    credit: number;
  }[];
}

export interface LedgerItem {
  lineId: string;
  journalEntryId: string;
  entryNumber: string;
  entryDate: string;
  reference?: string;
  description: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debit: number;
  credit: number;
  runningBalance: number;
  currency: string;
}

export interface LedgerResponse {
  entries: LedgerItem[];
  totalCount: number;
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  subtype?: AccountSubtype;
  totalDebit: number;
  totalCredit: number;
  netDebit: number;
  netCredit: number;
}

export interface TrialBalanceResponse {
  asOfDate: string;
  isBalanced: boolean;
  totalDebitBalance: number;
  totalCreditBalance: number;
  difference: number;
  rows: TrialBalanceRow[];
}

export const accountingApi = {
  // Accounts
  async getAccounts(entityId?: string): Promise<ApiAccount[]> {
    const query = entityId ? `?entityId=${encodeURIComponent(entityId)}` : '';
    return apiClient<ApiAccount[]>(`/accounting/accounts${query}`);
  },

  async getAccountById(id: string): Promise<ApiAccount> {
    return apiClient<ApiAccount>(`/accounting/accounts/${id}`);
  },

  async createAccount(payload: CreateAccountPayload): Promise<ApiAccount> {
    return apiClient<ApiAccount>('/accounting/accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateAccount(id: string, payload: UpdateAccountPayload): Promise<ApiAccount> {
    return apiClient<ApiAccount>(`/accounting/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deactivateAccount(id: string): Promise<{ message: string; account?: ApiAccount }> {
    return apiClient<{ message: string; account?: ApiAccount }>(`/accounting/accounts/${id}`, {
      method: 'DELETE',
    });
  },

  // Journal Entries
  async getJournalEntries(filter?: Record<string, any>): Promise<ApiJournalEntry[]> {
    const params = new URLSearchParams(filter || {}).toString();
    const query = params ? `?${params}` : '';
    return apiClient<ApiJournalEntry[]>(`/accounting/journal-entries${query}`);
  },

  async getJournalEntryById(id: string): Promise<ApiJournalEntry> {
    return apiClient<ApiJournalEntry>(`/accounting/journal-entries/${id}`);
  },

  async createJournalEntry(payload: CreateJournalEntryPayload): Promise<ApiJournalEntry> {
    return apiClient<ApiJournalEntry>('/accounting/journal-entries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async postJournalEntry(id: string): Promise<ApiJournalEntry> {
    return apiClient<ApiJournalEntry>(`/accounting/journal-entries/${id}/post`, {
      method: 'POST',
    });
  },

  async voidJournalEntry(id: string): Promise<ApiJournalEntry> {
    return apiClient<ApiJournalEntry>(`/accounting/journal-entries/${id}/void`, {
      method: 'POST',
    });
  },

  // General Ledger & Trial Balance
  async getGeneralLedger(filter?: Record<string, any>): Promise<LedgerResponse> {
    const params = new URLSearchParams(filter || {}).toString();
    const query = params ? `?${params}` : '';
    return apiClient<LedgerResponse>(`/accounting/ledger${query}`);
  },

  async getTrialBalance(filter?: Record<string, any>): Promise<TrialBalanceResponse> {
    const params = new URLSearchParams(filter || {}).toString();
    const query = params ? `?${params}` : '';
    return apiClient<TrialBalanceResponse>(`/accounting/trial-balance${query}`);
  },
};
