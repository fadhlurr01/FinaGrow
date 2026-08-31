import { apiClient } from './client';

export type CashBankAccountType = 'CASH' | 'BANK' | 'E_WALLET' | 'OTHER';

export type PaymentType =
  | 'CUSTOMER_RECEIPT'
  | 'VENDOR_PAYMENT'
  | 'TRANSFER'
  | 'OTHER_RECEIPT'
  | 'OTHER_PAYMENT';

export type PaymentDirection = 'INBOUND' | 'OUTBOUND' | 'INTERNAL';

export type PaymentStatus = 'DRAFT' | 'POSTED' | 'REVERSED' | 'CANCELLED';

export type StatementLineStatus =
  | 'UNMATCHED'
  | 'MATCHED'
  | 'PARTIALLY_MATCHED'
  | 'IGNORED'
  | 'RECONCILED';

export type BankReconciliationStatus = 'IN_PROGRESS' | 'RECONCILED' | 'REOPENED';

export interface ApiCashBankAccount {
  id: string;
  organizationId: string;
  entityId: string;
  code: string;
  name: string;
  type: CashBankAccountType;
  coaAccountId: string;
  coaAccount?: {
    id: string;
    code: string;
    name: string;
    type: string;
    subtype: string;
    isActive: boolean;
  };
  currency: string;
  bankName?: string;
  bankAccountNumber?: string;
  maskedAccountNumber?: string;
  bankAccountHolder?: string;
  branch?: string;
  swiftCode?: string;
  openingBalance: number;
  glBalance?: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCashBankAccountPayload {
  entityId: string;
  name: string;
  type?: CashBankAccountType;
  coaAccountId: string;
  currency?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  branch?: string;
  swiftCode?: string;
  openingBalance?: number;
}

export interface ApiPaymentAllocation {
  id?: string;
  paymentId?: string;
  salesInvoiceId?: string;
  vendorBillId?: string;
  allocatedAmount: number;
  salesInvoice?: { id: string; invoiceNumber: string; totalAmount: number; amountDue: number };
  vendorBill?: { id: string; billNumber: string; totalAmount: number; amountDue: number };
}

export interface ApiPayment {
  id: string;
  organizationId: string;
  entityId: string;
  paymentNumber: string;
  type: PaymentType;
  direction: PaymentDirection;
  status: PaymentStatus;
  paymentDate: string;
  customerId?: string;
  vendorId?: string;
  cashBankAccountId: string;
  toCashBankAccountId?: string;
  currency: string;
  exchangeRate: number;
  amount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  reference?: string;
  externalReference?: string;
  method?: string;
  journalEntryId?: string;
  notes?: string;
  customer?: { id: string; customerCode: string; name: string };
  vendor?: { id: string; vendorCode: string; name: string };
  cashBankAccount?: ApiCashBankAccount;
  toCashBankAccount?: ApiCashBankAccount;
  allocations: ApiPaymentAllocation[];
  createdAt: string;
}

export interface CreatePaymentPayload {
  entityId: string;
  type: PaymentType;
  cashBankAccountId: string;
  toCashBankAccountId?: string;
  customerId?: string;
  vendorId?: string;
  paymentDate: string;
  amount: number;
  currency?: string;
  exchangeRate?: number;
  reference?: string;
  externalReference?: string;
  method?: string;
  notes?: string;
  allocations?: {
    salesInvoiceId?: string;
    vendorBillId?: string;
    allocatedAmount: number;
  }[];
}

export interface CreateTransferPayload {
  entityId: string;
  fromCashBankAccountId: string;
  toCashBankAccountId: string;
  transferDate: string;
  amount: number;
  reference?: string;
  notes?: string;
}

export interface ApiBankStatementLine {
  id: string;
  bankStatementImportId: string;
  transactionDate: string;
  valueDate?: string;
  description: string;
  reference?: string;
  debitAmount: number;
  creditAmount: number;
  amount: number;
  balance?: number;
  normalizedHash: string;
  reconciliationStatus: StatementLineStatus;
}

export interface ApiBankStatementImport {
  id: string;
  organizationId: string;
  entityId: string;
  cashBankAccountId: string;
  cashBankAccount?: { id: string; code: string; name: string };
  sourceFilename: string;
  statementStartDate?: string;
  statementEndDate?: string;
  openingBalance: number;
  closingBalance: number;
  status: string;
  lines?: ApiBankStatementLine[];
  _count?: { lines: number };
  createdAt: string;
}

export interface ImportStatementPayload {
  entityId: string;
  cashBankAccountId: string;
  filename: string;
  csvContent: string;
  openingBalance?: number;
  closingBalance?: number;
}

export interface ApiBankReconciliation {
  id: string;
  organizationId: string;
  entityId: string;
  cashBankAccountId: string;
  cashBankAccount?: ApiCashBankAccount;
  periodStart: string;
  periodEnd: string;
  statementOpeningBalance: number;
  statementClosingBalance: number;
  bookClosingBalance: number;
  difference: number;
  status: BankReconciliationStatus;
  isReconciled?: boolean;
  createdAt: string;
}

export interface CreateReconciliationPayload {
  entityId: string;
  cashBankAccountId: string;
  periodStart: string;
  periodEnd: string;
  statementOpeningBalance: number;
  statementClosingBalance: number;
}

export interface ApiMatchSuggestion {
  statementLine: ApiBankStatementLine;
  suggestedMatches: {
    paymentId: string;
    paymentNumber: string;
    paymentDate: string;
    amount: number;
    type: PaymentType;
    reference?: string;
    counterparty: string;
    confidence: number;
    daysDifference: number;
  }[];
}

export const cashBankApi = {
  // Cash & Bank Accounts
  async getAccounts(filter?: { entityId?: string; activeOnly?: boolean }): Promise<ApiCashBankAccount[]> {
    const params = new URLSearchParams();
    if (filter?.entityId) params.append('entityId', filter.entityId);
    if (filter?.activeOnly !== undefined) params.append('activeOnly', String(filter.activeOnly));
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient<ApiCashBankAccount[]>(`/cash-bank/accounts${query}`);
  },

  async getAccountById(id: string): Promise<ApiCashBankAccount> {
    return apiClient<ApiCashBankAccount>(`/cash-bank/accounts/${id}`);
  },

  async createAccount(payload: CreateCashBankAccountPayload): Promise<ApiCashBankAccount> {
    return apiClient<ApiCashBankAccount>('/cash-bank/accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deactivateAccount(id: string): Promise<{ message: string; account: ApiCashBankAccount }> {
    return apiClient<{ message: string; account: ApiCashBankAccount }>(`/cash-bank/accounts/${id}/deactivate`, {
      method: 'POST',
    });
  },

  async getAccountBalance(id: string): Promise<any> {
    return apiClient<any>(`/cash-bank/accounts/${id}/balance`);
  },

  // Payments & Receipts
  async getPayments(filter?: Record<string, any>): Promise<ApiPayment[]> {
    const params = new URLSearchParams(filter || {}).toString();
    const query = params ? `?${params}` : '';
    return apiClient<ApiPayment[]>(`/payments${query}`);
  },

  async getPaymentById(id: string): Promise<ApiPayment> {
    return apiClient<ApiPayment>(`/payments/${id}`);
  },

  async createPayment(payload: CreatePaymentPayload): Promise<ApiPayment> {
    return apiClient<ApiPayment>('/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async postPayment(id: string): Promise<ApiPayment> {
    return apiClient<ApiPayment>(`/payments/${id}/post`, {
      method: 'POST',
    });
  },

  async reversePayment(id: string): Promise<ApiPayment> {
    return apiClient<ApiPayment>(`/payments/${id}/reverse`, {
      method: 'POST',
    });
  },

  // Transfers
  async createTransfer(payload: CreateTransferPayload): Promise<ApiPayment> {
    return apiClient<ApiPayment>('/cash-bank/transfers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Bank Statements
  async importStatement(payload: ImportStatementPayload): Promise<any> {
    return apiClient<any>('/cash-bank/statements/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getStatements(filter?: { entityId?: string; accountId?: string }): Promise<ApiBankStatementImport[]> {
    const params = new URLSearchParams(filter || {}).toString();
    const query = params ? `?${params}` : '';
    return apiClient<ApiBankStatementImport[]>(`/cash-bank/statements${query}`);
  },

  async getStatementById(id: string): Promise<ApiBankStatementImport> {
    return apiClient<ApiBankStatementImport>(`/cash-bank/statements/${id}`);
  },

  // Bank Reconciliation
  async getReconciliations(filter?: { entityId?: string; accountId?: string }): Promise<ApiBankReconciliation[]> {
    const params = new URLSearchParams(filter || {}).toString();
    const query = params ? `?${params}` : '';
    return apiClient<ApiBankReconciliation[]>(`/cash-bank/reconciliation${query}`);
  },

  async createReconciliation(payload: CreateReconciliationPayload): Promise<ApiBankReconciliation> {
    return apiClient<ApiBankReconciliation>('/cash-bank/reconciliation', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getReconciliationById(id: string): Promise<ApiBankReconciliation> {
    return apiClient<ApiBankReconciliation>(`/cash-bank/reconciliation/${id}`);
  },

  async getMatchSuggestions(reconId: string): Promise<ApiMatchSuggestion[]> {
    return apiClient<ApiMatchSuggestion[]>(`/cash-bank/reconciliation/${reconId}/suggestions`);
  },

  async matchStatementLine(payload: { statementLineId: string; paymentId?: string; journalEntryId?: string }): Promise<any> {
    return apiClient<any>('/cash-bank/reconciliation/match', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async unmatchStatementLine(statementLineId: string): Promise<any> {
    return apiClient<any>('/cash-bank/reconciliation/unmatch', {
      method: 'POST',
      body: JSON.stringify({ statementLineId }),
    });
  },

  async completeReconciliation(reconId: string): Promise<ApiBankReconciliation> {
    return apiClient<ApiBankReconciliation>(`/cash-bank/reconciliation/${reconId}/complete`, {
      method: 'POST',
    });
  },

  async reopenReconciliation(reconId: string): Promise<ApiBankReconciliation> {
    return apiClient<ApiBankReconciliation>(`/cash-bank/reconciliation/${reconId}/reopen`, {
      method: 'POST',
    });
  },
};
