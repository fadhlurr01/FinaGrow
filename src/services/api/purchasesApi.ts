import { apiClient } from './client';

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'PARTIALLY_BILLED'
  | 'FULLY_BILLED'
  | 'CANCELLED';

export type VendorBillStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type BillPostingStatus = 'UNPOSTED' | 'POSTED' | 'REVERSED';

export interface ApiVendor {
  id: string;
  organizationId: string;
  entityId: string;
  vendorCode: string;
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  billingAddress?: string;
  bankDetails?: string;
  currency: string;
  paymentTermsDays: number;
  creditLimit: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateVendorPayload {
  entityId: string;
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  billingAddress?: string;
  bankDetails?: string;
  currency?: string;
  paymentTermsDays?: number;
  creditLimit?: number;
}

export interface UpdateVendorPayload {
  name?: string;
  legalName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  billingAddress?: string;
  bankDetails?: string;
  currency?: string;
  paymentTermsDays?: number;
  creditLimit?: number;
  isActive?: boolean;
}

export interface ApiPurchaseOrderLine {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  lineSubtotal?: number;
  lineTotal?: number;
  expenseAccountId?: string;
}

export interface ApiPurchaseOrder {
  id: string;
  organizationId: string;
  entityId: string;
  vendorId: string;
  vendor?: ApiVendor;
  poNumber: string;
  orderDate: string;
  expectedDate?: string;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: PurchaseOrderStatus;
  notes?: string;
  reference?: string;
  lines: ApiPurchaseOrderLine[];
  createdAt: string;
}

export interface CreatePurchaseOrderPayload {
  entityId: string;
  vendorId: string;
  orderDate: string;
  expectedDate?: string;
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
    expenseAccountId?: string;
  }[];
}

export interface ApiVendorBillLine {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  lineSubtotal?: number;
  lineTotal?: number;
  expenseAccountId?: string;
  lineType?: string;
}

export interface ApiVendorBill {
  id: string;
  organizationId: string;
  entityId: string;
  vendorId: string;
  vendor?: ApiVendor;
  purchaseOrderId?: string;
  purchaseOrder?: { id: string; poNumber: string };
  billNumber: string;
  vendorReference?: string;
  billDate: string;
  dueDate: string;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  status: VendorBillStatus;
  postingStatus: BillPostingStatus;
  journalEntryId?: string;
  notes?: string;
  lines: ApiVendorBillLine[];
  createdAt: string;
}

export interface CreateVendorBillPayload {
  entityId: string;
  vendorId: string;
  purchaseOrderId?: string;
  vendorReference?: string;
  billDate: string;
  dueDate: string;
  currency?: string;
  exchangeRate?: number;
  notes?: string;
  lines: {
    description: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    taxRate?: number;
    expenseAccountId?: string;
    lineType?: string;
  }[];
}

export interface APSummaryResponse {
  totalBilled: number;
  totalPaid: number;
  totalPayables: number;
  totalOverdue: number;
  openBillCount: number;
  overdueBillCount: number;
}

export interface APAgingBucket {
  count: number;
  amount: number;
}

export interface APAgingResponse {
  asOfDate: string;
  totalPayables: number;
  buckets: {
    current: APAgingBucket;
    days1_30: APAgingBucket;
    days31_60: APAgingBucket;
    days61_90: APAgingBucket;
    days90Plus: APAgingBucket;
  };
  vendors: {
    vendorId: string;
    vendorCode: string;
    name: string;
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
    totalDue: number;
  }[];
}

export interface APReconciliationResponse {
  entityId: string;
  apAccountId: string;
  apAccountCode: string;
  apAccountName: string;
  subledgerTotal: number;
  glControlBalance: number;
  difference: number;
  isReconciled: boolean;
  message?: string;
}

export const purchasesApi = {
  // Vendors
  async getVendors(filter?: { entityId?: string; search?: string; activeOnly?: boolean }): Promise<ApiVendor[]> {
    const params = new URLSearchParams();
    if (filter?.entityId) params.append('entityId', filter.entityId);
    if (filter?.search) params.append('search', filter.search);
    if (filter?.activeOnly !== undefined) params.append('activeOnly', String(filter.activeOnly));
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient<ApiVendor[]>(`/purchases/vendors${query}`);
  },

  async getVendorById(id: string): Promise<ApiVendor> {
    return apiClient<ApiVendor>(`/purchases/vendors/${id}`);
  },

  async createVendor(payload: CreateVendorPayload): Promise<ApiVendor> {
    return apiClient<ApiVendor>('/purchases/vendors', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateVendor(id: string, payload: UpdateVendorPayload): Promise<ApiVendor> {
    return apiClient<ApiVendor>(`/purchases/vendors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deactivateVendor(id: string): Promise<{ message: string; vendor: ApiVendor }> {
    return apiClient<{ message: string; vendor: ApiVendor }>(`/purchases/vendors/${id}/deactivate`, {
      method: 'POST',
    });
  },

  // Purchase Orders
  async getOrders(filter?: Record<string, any>): Promise<ApiPurchaseOrder[]> {
    const params = new URLSearchParams(filter || {}).toString();
    const query = params ? `?${params}` : '';
    return apiClient<ApiPurchaseOrder[]>(`/purchases/orders${query}`);
  },

  async getOrderById(id: string): Promise<ApiPurchaseOrder> {
    return apiClient<ApiPurchaseOrder>(`/purchases/orders/${id}`);
  },

  async createOrder(payload: CreatePurchaseOrderPayload): Promise<ApiPurchaseOrder> {
    return apiClient<ApiPurchaseOrder>('/purchases/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async approveOrder(id: string): Promise<ApiPurchaseOrder> {
    return apiClient<ApiPurchaseOrder>(`/purchases/orders/${id}/approve`, {
      method: 'POST',
    });
  },

  async cancelOrder(id: string): Promise<ApiPurchaseOrder> {
    return apiClient<ApiPurchaseOrder>(`/purchases/orders/${id}/cancel`, {
      method: 'POST',
    });
  },

  async createBillFromPO(poId: string): Promise<ApiVendorBill> {
    return apiClient<ApiVendorBill>(`/purchases/orders/${poId}/create-bill`, {
      method: 'POST',
    });
  },

  // Vendor Bills
  async getBills(filter?: Record<string, any>): Promise<ApiVendorBill[]> {
    const params = new URLSearchParams(filter || {}).toString();
    const query = params ? `?${params}` : '';
    return apiClient<ApiVendorBill[]>(`/purchases/bills${query}`);
  },

  async getBillById(id: string): Promise<ApiVendorBill> {
    return apiClient<ApiVendorBill>(`/purchases/bills/${id}`);
  },

  async createBill(payload: CreateVendorBillPayload): Promise<ApiVendorBill> {
    return apiClient<ApiVendorBill>('/purchases/bills', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async postBill(id: string): Promise<ApiVendorBill> {
    return apiClient<ApiVendorBill>(`/purchases/bills/${id}/post`, {
      method: 'POST',
    });
  },

  async cancelBill(id: string): Promise<ApiVendorBill> {
    return apiClient<ApiVendorBill>(`/purchases/bills/${id}/cancel`, {
      method: 'POST',
    });
  },

  // Accounts Payable Analytics & Aging
  async getAPSummary(filter?: Record<string, any>): Promise<APSummaryResponse> {
    const params = new URLSearchParams(filter || {}).toString();
    const query = params ? `?${params}` : '';
    return apiClient<APSummaryResponse>(`/purchases/ap/summary${query}`);
  },

  async getAPAging(filter?: Record<string, any>): Promise<APAgingResponse> {
    const params = new URLSearchParams(filter || {}).toString();
    const query = params ? `?${params}` : '';
    return apiClient<APAgingResponse>(`/purchases/ap/aging${query}`);
  },

  async getAPControlReconciliation(entityId: string): Promise<APReconciliationResponse> {
    return apiClient<APReconciliationResponse>(`/purchases/ap/reconciliation?entityId=${encodeURIComponent(entityId)}`);
  },
};
