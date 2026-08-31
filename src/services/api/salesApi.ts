import { apiClient } from './client';

export type SalesInvoiceStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type InvoicePostingStatus = 'UNPOSTED' | 'POSTED' | 'REVERSED';

export interface ApiCustomer {
  id: string;
  organizationId: string;
  entityId: string;
  customerCode: string;
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  billingAddress?: string;
  shippingAddress?: string;
  currency: string;
  paymentTermsDays: number;
  creditLimit: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCustomerPayload {
  entityId: string;
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  billingAddress?: string;
  shippingAddress?: string;
  currency?: string;
  paymentTermsDays?: number;
  creditLimit?: number;
}

export interface UpdateCustomerPayload {
  name?: string;
  legalName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  billingAddress?: string;
  shippingAddress?: string;
  currency?: string;
  paymentTermsDays?: number;
  creditLimit?: number;
  isActive?: boolean;
}

export interface ApiSalesInvoiceLine {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  lineSubtotal?: number;
  lineTotal?: number;
  revenueAccountId?: string;
}

export interface ApiSalesInvoice {
  id: string;
  organizationId: string;
  entityId: string;
  customerId: string;
  customer?: ApiCustomer;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  status: SalesInvoiceStatus;
  postingStatus: InvoicePostingStatus;
  journalEntryId?: string;
  reference?: string;
  notes?: string;
  lines: ApiSalesInvoiceLine[];
  createdAt: string;
}

export interface CreateSalesInvoicePayload {
  entityId: string;
  customerId: string;
  invoiceDate: string;
  dueDate: string;
  currency?: string;
  exchangeRate?: number;
  reference?: string;
  notes?: string;
  lines: {
    description: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    taxRate?: number;
    revenueAccountId?: string;
  }[];
}

export interface UpdateSalesInvoicePayload {
  customerId?: string;
  invoiceDate?: string;
  dueDate?: string;
  currency?: string;
  exchangeRate?: number;
  reference?: string;
  notes?: string;
  lines?: {
    description: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    taxRate?: number;
    revenueAccountId?: string;
  }[];
}

export interface ARSummaryResponse {
  totalInvoiced: number;
  totalPaid: number;
  totalReceivables: number;
  totalOverdue: number;
  openInvoiceCount: number;
  overdueInvoiceCount: number;
}

export interface ARAgingBucket {
  count: number;
  amount: number;
}

export interface ARAgingResponse {
  asOfDate: string;
  totalReceivables: number;
  buckets: {
    current: ARAgingBucket;
    days1_30: ARAgingBucket;
    days31_60: ARAgingBucket;
    days61_90: ARAgingBucket;
    days90Plus: ARAgingBucket;
  };
  customers: {
    customerId: string;
    customerCode: string;
    name: string;
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
    totalDue: number;
  }[];
}

export interface ARReconciliationResponse {
  entityId: string;
  arAccountId: string;
  arAccountCode: string;
  arAccountName: string;
  subledgerTotal: number;
  glControlBalance: number;
  difference: number;
  isReconciled: boolean;
  message?: string;
}

export const salesApi = {
  // Customers
  async getCustomers(filter?: { entityId?: string; search?: string; activeOnly?: boolean }): Promise<ApiCustomer[]> {
    const params = new URLSearchParams();
    if (filter?.entityId) params.append('entityId', filter.entityId);
    if (filter?.search) params.append('search', filter.search);
    if (filter?.activeOnly !== undefined) params.append('activeOnly', String(filter.activeOnly));
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient<ApiCustomer[]>(`/sales/customers${query}`);
  },

  async getCustomerById(id: string): Promise<ApiCustomer> {
    return apiClient<ApiCustomer>(`/sales/customers/${id}`);
  },

  async createCustomer(payload: CreateCustomerPayload): Promise<ApiCustomer> {
    return apiClient<ApiCustomer>('/sales/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateCustomer(id: string, payload: UpdateCustomerPayload): Promise<ApiCustomer> {
    return apiClient<ApiCustomer>(`/sales/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deactivateCustomer(id: string): Promise<{ message: string; customer: ApiCustomer }> {
    return apiClient<{ message: string; customer: ApiCustomer }>(`/sales/customers/${id}/deactivate`, {
      method: 'POST',
    });
  },

  // Sales Invoices
  async getInvoices(filter?: Record<string, any>): Promise<ApiSalesInvoice[]> {
    const params = new URLSearchParams(filter || {}).toString();
    const query = params ? `?${params}` : '';
    return apiClient<ApiSalesInvoice[]>(`/sales/invoices${query}`);
  },

  async getInvoiceById(id: string): Promise<ApiSalesInvoice> {
    return apiClient<ApiSalesInvoice>(`/sales/invoices/${id}`);
  },

  async createInvoice(payload: CreateSalesInvoicePayload): Promise<ApiSalesInvoice> {
    return apiClient<ApiSalesInvoice>('/sales/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateInvoice(id: string, payload: UpdateSalesInvoicePayload): Promise<ApiSalesInvoice> {
    return apiClient<ApiSalesInvoice>(`/sales/invoices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async postInvoice(id: string): Promise<ApiSalesInvoice> {
    return apiClient<ApiSalesInvoice>(`/sales/invoices/${id}/post`, {
      method: 'POST',
    });
  },

  async cancelInvoice(id: string): Promise<ApiSalesInvoice> {
    return apiClient<ApiSalesInvoice>(`/sales/invoices/${id}/cancel`, {
      method: 'POST',
    });
  },

  // Accounts Receivable Analytics
  async getARSummary(filter?: Record<string, any>): Promise<ARSummaryResponse> {
    const params = new URLSearchParams(filter || {}).toString();
    const query = params ? `?${params}` : '';
    return apiClient<ARSummaryResponse>(`/sales/ar/summary${query}`);
  },

  async getARAging(filter?: Record<string, any>): Promise<ARAgingResponse> {
    const params = new URLSearchParams(filter || {}).toString();
    const query = params ? `?${params}` : '';
    return apiClient<ARAgingResponse>(`/sales/ar/aging${query}`);
  },

  async getARControlReconciliation(entityId: string): Promise<ARReconciliationResponse> {
    return apiClient<ARReconciliationResponse>(`/sales/ar/reconciliation?entityId=${encodeURIComponent(entityId)}`);
  },
};
