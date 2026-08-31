/**
 * FINAGROW — Phase 8 Indonesian Tax Engine API Client
 */
import { apiClient } from './client';

export interface TaxCode {
  id: string;
  organizationId: string;
  entityId?: string | null;
  code: string;
  name: string;
  taxType: 'VAT' | 'PPH23' | 'PPH4_2' | 'PPH21' | 'PPH26' | 'PPNBM' | 'OTHER';
  direction: 'OUTPUT' | 'INPUT' | 'WITHHOLDING_PAYABLE' | 'WITHHOLDING_RECEIVABLE';
  description?: string | null;
  isActive: boolean;
  rules?: TaxRule[];
  createdAt: string;
  updatedAt: string;
}

export interface TaxRule {
  id: string;
  taxCodeId: string;
  validFrom: string;
  validTo?: string | null;
  legalRate: number | string;
  dppFactor: number | string;
  calculationMethod: 'PERCENT_OF_BASE' | 'RATE_TIMES_DPP_FACTOR' | 'FIXED_AMOUNT' | 'SPECIAL_FORMULA';
  roundingMethod: 'ROUND_HALF_UP' | 'ROUND_DOWN' | 'ROUND_UP';
  notes?: string | null;
  isActive: boolean;
}

export interface TaxTransaction {
  id: string;
  organizationId: string;
  entityId: string;
  taxCodeId: string;
  taxRuleId: string;
  taxPeriodId?: string | null;
  sourceType: 'SALES_INVOICE' | 'VENDOR_BILL' | 'PAYMENT' | 'JOURNAL_ENTRY' | 'MANUAL';
  salesInvoiceId?: string | null;
  vendorBillId?: string | null;
  paymentId?: string | null;
  transactionDate: string;
  baseAmount: number | string;
  dppAmount: number | string;
  taxAmount: number | string;
  legalRate: number | string;
  dppFactor: number | string;
  direction: 'OUTPUT' | 'INPUT' | 'WITHHOLDING_PAYABLE' | 'WITHHOLDING_RECEIVABLE';
  status: 'DRAFT' | 'POSTED' | 'REPORTED' | 'REVERSED';
  journalEntryId?: string | null;
  reversalOfId?: string | null;
  notes?: string | null;
  taxCode?: {
    code: string;
    name: string;
    taxType: string;
    direction: string;
  };
  taxRule?: {
    legalRate: number | string;
    dppFactor: number | string;
    calculationMethod: string;
  };
  taxPeriod?: {
    periodYear: number;
    periodMonth: number;
    status: string;
  };
  createdAt: string;
}

export interface TaxPeriod {
  id: string;
  organizationId: string;
  entityId: string;
  taxType: string;
  periodYear: number;
  periodMonth: number;
  status: 'OPEN' | 'PREPARED' | 'FILED' | 'PARTIALLY_PAID' | 'PAID' | 'CLOSED' | 'REOPENED';
  totalOutputTax: number | string;
  totalInputTax: number | string;
  totalWithholdingPayable: number | string;
  totalWithholdingReceivable: number | string;
  netTax: number | string;
  totalPaid: number | string;
  filingDeadline?: string | null;
  filedAt?: string | null;
  notes?: string | null;
  _count?: {
    taxTransactions: number;
    taxDocuments: number;
    taxPayments: number;
  };
}

export interface TaxPayment {
  id: string;
  organizationId: string;
  entityId: string;
  taxPeriodId: string;
  paymentNumber: string;
  paymentDate: string;
  taxType: string;
  amount: number | string;
  ntpn?: string | null;
  sspNumber?: string | null;
  cashBankAccountId: string;
  journalEntryId?: string | null;
  status: 'DRAFT' | 'POSTED' | 'CANCELLED';
  notes?: string | null;
  taxPeriod?: {
    periodYear: number;
    periodMonth: number;
    taxType: string;
  };
  cashBankAccount?: {
    name: string;
    code: string;
  };
}

export interface VATSummary {
  year: number;
  month: number;
  outputVat: number | string;
  inputVat: number | string;
  netVat: number | string;
  vatPayable: number | string;
  vatRefundable: number | string;
  transactionCount: number;
}

export interface TaxReconciliationReport {
  entityId: string;
  periodYear: number;
  periodMonth: number;
  isFullyReconciled: boolean;
  lines: Array<{
    label: string;
    glAccountId?: string;
    subLedger: number | string;
    gl: number | string;
    difference: number | string;
    isBalanced: boolean;
  }>;
  generatedAt: string;
}

export const taxApi = {
  // ─── Tax Codes ───
  getTaxCodes: (entityId?: string) => {
    const query = entityId ? `?entityId=${entityId}` : '';
    return apiClient<TaxCode[]>(`/tax/codes${query}`);
  },

  getTaxCode: (id: string) => apiClient<TaxCode>(`/tax/codes/${id}`),

  createTaxCode: (dto: {
    code: string;
    name: string;
    taxType: string;
    direction: string;
    description?: string;
    entityId?: string;
    isActive?: boolean;
  }) => apiClient<TaxCode>('/tax/codes', {
    method: 'POST',
    body: JSON.stringify(dto),
  }),

  updateTaxCode: (id: string, dto: {
    name?: string;
    description?: string;
    isActive?: boolean;
  }) => apiClient<TaxCode>(`/tax/codes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  }),

  // ─── Tax Rules ───
  createTaxRule: (dto: {
    taxCodeId: string;
    validFrom: string;
    validTo?: string;
    legalRate: number;
    dppFactor?: number;
    calculationMethod?: string;
    roundingMethod?: string;
    notes?: string;
  }) => apiClient<TaxRule>('/tax/rules', {
    method: 'POST',
    body: JSON.stringify(dto),
  }),

  // ─── Calculation Preview ───
  calculateTax: (dto: {
    taxCodeId: string;
    transactionDate: string;
    baseAmount: number;
  }) => apiClient<any>('/tax/calculate', {
    method: 'POST',
    body: JSON.stringify(dto),
  }),

  // ─── Tax Transactions ───
  getTransactions: (filter?: {
    entityId?: string;
    taxCodeId?: string;
    taxType?: string;
    direction?: string;
    status?: string;
    periodYear?: number;
    periodMonth?: number;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v));
        }
      });
    }
    const qs = params.toString();
    return apiClient<TaxTransaction[]>(`/tax/transactions${qs ? `?${qs}` : ''}`);
  },

  postTransaction: (id: string) => apiClient<TaxTransaction>(`/tax/transactions/${id}/post`, {
    method: 'POST',
  }),

  reverseTransaction: (id: string, notes?: string) => apiClient<TaxTransaction>(`/tax/transactions/${id}/reverse`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  }),

  getVATSummary: (entityId: string, year: number, month: number) =>
    apiClient<VATSummary>(`/tax/summary/vat?entityId=${entityId}&year=${year}&month=${month}`),

  getWithholdingSummary: (entityId: string, year: number, month: number) =>
    apiClient<any>(`/tax/summary/withholding?entityId=${entityId}&year=${year}&month=${month}`),

  // ─── Tax Periods ───
  getPeriods: (filter?: {
    entityId?: string;
    taxType?: string;
    periodYear?: number;
    periodMonth?: number;
    status?: string;
  }) => {
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v));
        }
      });
    }
    const qs = params.toString();
    return apiClient<TaxPeriod[]>(`/tax/periods${qs ? `?${qs}` : ''}`);
  },

  getOrCreatePeriod: (dto: {
    entityId: string;
    taxType: string;
    periodYear: number;
    periodMonth: number;
  }) => apiClient<TaxPeriod>('/tax/periods', {
    method: 'POST',
    body: JSON.stringify(dto),
  }),

  preparePeriod: (id: string) => apiClient<TaxPeriod>(`/tax/periods/${id}/prepare`, {
    method: 'POST',
  }),

  filePeriod: (id: string) => apiClient<TaxPeriod>(`/tax/periods/${id}/file`, {
    method: 'POST',
  }),

  reopenPeriod: (id: string, reason: string) => apiClient<TaxPeriod>(`/tax/periods/${id}/reopen`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),

  // ─── Tax Payments & Remittances ───
  getTaxPayments: (filter?: {
    entityId?: string;
    taxType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v));
        }
      });
    }
    const qs = params.toString();
    return apiClient<TaxPayment[]>(`/tax/payments${qs ? `?${qs}` : ''}`);
  },

  createTaxPayment: (dto: {
    entityId: string;
    taxPeriodId: string;
    paymentDate: string;
    taxType: string;
    amount: number;
    cashBankAccountId: string;
    ntpn?: string;
    sspNumber?: string;
    notes?: string;
  }) => apiClient<TaxPayment>('/tax/payments', {
    method: 'POST',
    body: JSON.stringify(dto),
  }),

  postVATSettlement: (id: string) => apiClient<TaxPayment>(`/tax/payments/${id}/post-vat`, {
    method: 'POST',
  }),

  postWithholdingRemittance: (id: string) => apiClient<TaxPayment>(`/tax/payments/${id}/post-withholding`, {
    method: 'POST',
  }),

  // ─── Reconciliation ───
  reconcile: (entityId: string, year: number, month: number) =>
    apiClient<TaxReconciliationReport>(`/tax/reconciliation?entityId=${entityId}&year=${year}&month=${month}`),
};
