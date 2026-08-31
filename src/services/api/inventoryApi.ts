import { apiClient } from './client';

export type ItemType = 'INVENTORY' | 'SERVICE' | 'NON_INVENTORY';
export type ValuationMethod = 'FIFO' | 'WEIGHTED_AVERAGE';
export type GoodsReceiptStatus = 'DRAFT' | 'POSTED' | 'REVERSED' | 'CANCELLED';
export type DeliveryStatus = 'DRAFT' | 'POSTED' | 'REVERSED' | 'CANCELLED';
export type StockAdjustmentType = 'INCREASE' | 'DECREASE';
export type StockAdjustmentStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';
export type StockTransferStatus = 'DRAFT' | 'IN_TRANSIT' | 'POSTED' | 'CANCELLED';

export interface ApiInventoryItem {
  id: string;
  organizationId: string;
  entityId: string;
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  category?: { id: string; code: string; name: string };
  itemType: ItemType;
  unitOfMeasureId?: string;
  unitOfMeasure?: { id: string; code: string; name: string };
  inventoryAccountId?: string;
  inventoryAccount?: { id: string; code: string; name: string };
  cogsAccountId?: string;
  cogsAccount?: { id: string; code: string; name: string };
  salesAccountId?: string;
  salesAccount?: { id: string; code: string; name: string };
  purchaseAccountId?: string;
  valuationMethod: ValuationMethod;
  isInventoryTracked: boolean;
  reorderLevel: number;
  sellingPrice: number;
  purchasePrice: number;
  quantityOnHand: number;
  inventoryValue: number;
  averageCost: number;
  isLowStock: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateInventoryItemPayload {
  entityId: string;
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  itemType?: ItemType;
  unitOfMeasureId?: string;
  inventoryAccountId?: string;
  cogsAccountId?: string;
  salesAccountId?: string;
  purchaseAccountId?: string;
  valuationMethod?: ValuationMethod;
  isInventoryTracked?: boolean;
  reorderLevel?: number;
  sellingPrice?: number;
  purchasePrice?: number;
}

export interface ApiWarehouse {
  id: string;
  organizationId: string;
  entityId: string;
  code: string;
  name: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateWarehousePayload {
  entityId: string;
  code: string;
  name: string;
  address?: string;
}

export interface ApiGoodsReceiptLine {
  id: string;
  itemId: string;
  item?: { id: string; sku: string; name: string };
  purchaseOrderLineId?: string;
  quantityReceived: number;
  unitCost: number;
  totalCost: number;
}

export interface ApiGoodsReceipt {
  id: string;
  organizationId: string;
  entityId: string;
  receiptNumber: string;
  vendorId?: string;
  vendor?: { id: string; vendorCode: string; name: string };
  purchaseOrderId?: string;
  purchaseOrder?: { id: string; poNumber: string };
  warehouseId: string;
  warehouse?: { id: string; code: string; name: string };
  receiptDate: string;
  status: GoodsReceiptStatus;
  totalValue: number;
  reference?: string;
  notes?: string;
  journalEntryId?: string;
  lines: ApiGoodsReceiptLine[];
  createdAt: string;
}

export interface CreateGoodsReceiptPayload {
  entityId: string;
  vendorId?: string;
  purchaseOrderId?: string;
  warehouseId: string;
  receiptDate: string;
  reference?: string;
  notes?: string;
  lines: {
    itemId: string;
    purchaseOrderLineId?: string;
    quantityReceived: number;
    unitCost: number;
  }[];
}

export interface ApiDeliveryLine {
  id: string;
  itemId: string;
  item?: { id: string; sku: string; name: string };
  salesInvoiceLineId?: string;
  quantityDelivered: number;
  calculatedUnitCost: number;
  calculatedTotalCost: number;
}

export interface ApiDelivery {
  id: string;
  organizationId: string;
  entityId: string;
  deliveryNumber: string;
  customerId?: string;
  customer?: { id: string; customerCode: string; name: string };
  salesInvoiceId?: string;
  salesInvoice?: { id: string; invoiceNumber: string };
  warehouseId: string;
  warehouse?: { id: string; code: string; name: string };
  deliveryDate: string;
  status: DeliveryStatus;
  totalCost: number;
  reference?: string;
  notes?: string;
  journalEntryId?: string;
  lines: ApiDeliveryLine[];
  createdAt: string;
}

export interface CreateDeliveryPayload {
  entityId: string;
  customerId?: string;
  salesInvoiceId?: string;
  warehouseId: string;
  deliveryDate: string;
  reference?: string;
  notes?: string;
  lines: {
    itemId: string;
    salesInvoiceLineId?: string;
    quantityDelivered: number;
  }[];
}

export interface ApiStockTransferLine {
  id: string;
  itemId: string;
  item?: { id: string; sku: string; name: string };
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface ApiStockTransfer {
  id: string;
  organizationId: string;
  entityId: string;
  transferNumber: string;
  fromWarehouseId: string;
  fromWarehouse?: { id: string; code: string; name: string };
  toWarehouseId: string;
  toWarehouse?: { id: string; code: string; name: string };
  transferDate: string;
  status: StockTransferStatus;
  totalCost: number;
  reference?: string;
  notes?: string;
  lines: ApiStockTransferLine[];
  createdAt: string;
}

export interface CreateStockTransferPayload {
  entityId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  transferDate: string;
  reference?: string;
  notes?: string;
  lines: {
    itemId: string;
    quantity: number;
  }[];
}

export interface ApiStockAdjustmentLine {
  id: string;
  itemId: string;
  item?: { id: string; sku: string; name: string };
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface ApiStockAdjustment {
  id: string;
  organizationId: string;
  entityId: string;
  adjustmentNumber: string;
  warehouseId: string;
  warehouse?: { id: string; code: string; name: string };
  adjustmentDate: string;
  adjustmentType: StockAdjustmentType;
  status: StockAdjustmentStatus;
  totalCost: number;
  reason: string;
  reference?: string;
  journalEntryId?: string;
  lines: ApiStockAdjustmentLine[];
  createdAt: string;
}

export interface CreateStockAdjustmentPayload {
  entityId: string;
  warehouseId: string;
  adjustmentDate: string;
  adjustmentType: StockAdjustmentType;
  reason: string;
  reference?: string;
  lines: {
    itemId: string;
    quantity: number;
    unitCost?: number;
  }[];
}

export interface ApiStockCardLine {
  id: string;
  movementDate: string;
  movementNumber: string;
  movementType: string;
  reference?: string;
  warehouse?: { id: string; code: string; name: string };
  inQuantity: number;
  outQuantity: number;
  unitCost: number;
  totalCost: number;
  runningQuantity: number;
  runningValue: number;
}

export interface ApiStockCard {
  item: ApiInventoryItem;
  lines: ApiStockCardLine[];
  closingQuantity: number;
  closingValue: number;
}

export interface ApiValuationReport {
  totalValuation: number;
  items: {
    id: string;
    sku: string;
    name: string;
    category: string;
    unit: string;
    valuationMethod: ValuationMethod;
    quantityOnHand: number;
    averageCost: number;
    inventoryValue: number;
  }[];
}

export interface ApiInventoryReconciliation {
  subledgerValue: number;
  glBalance: number;
  difference: number;
  isReconciled: boolean;
  warning?: string;
}

export interface ApiGrniReconciliation {
  unbilledReceiptsValue: number;
  glGrniBalance: number;
  difference: number;
  isReconciled: boolean;
  warning?: string;
}

export const inventoryApi = {
  // Items
  async getItems(filter?: Record<string, any>): Promise<ApiInventoryItem[]> {
    const params = new URLSearchParams(filter || {}).toString();
    const query = params ? `?${params}` : '';
    return apiClient<ApiInventoryItem[]>(`/inventory/items${query}`);
  },

  async getItemById(id: string): Promise<ApiInventoryItem> {
    return apiClient<ApiInventoryItem>(`/inventory/items/${id}`);
  },

  async createItem(payload: CreateInventoryItemPayload): Promise<ApiInventoryItem> {
    return apiClient<ApiInventoryItem>('/inventory/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateItem(id: string, payload: Partial<CreateInventoryItemPayload>): Promise<ApiInventoryItem> {
    return apiClient<ApiInventoryItem>(`/inventory/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deactivateItem(id: string): Promise<{ message: string; item: ApiInventoryItem }> {
    return apiClient<{ message: string; item: ApiInventoryItem }>(`/inventory/items/${id}/deactivate`, {
      method: 'POST',
    });
  },

  // Warehouses
  async getWarehouses(entityId?: string): Promise<ApiWarehouse[]> {
    const query = entityId ? `?entityId=${entityId}` : '';
    return apiClient<ApiWarehouse[]>(`/inventory/warehouses${query}`);
  },

  async createWarehouse(payload: CreateWarehousePayload): Promise<ApiWarehouse> {
    return apiClient<ApiWarehouse>('/inventory/warehouses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Goods Receipts
  async getReceipts(entityId?: string): Promise<ApiGoodsReceipt[]> {
    const query = entityId ? `?entityId=${entityId}` : '';
    return apiClient<ApiGoodsReceipt[]>(`/inventory/receipts${query}`);
  },

  async getReceiptById(id: string): Promise<ApiGoodsReceipt> {
    return apiClient<ApiGoodsReceipt>(`/inventory/receipts/${id}`);
  },

  async createReceipt(payload: CreateGoodsReceiptPayload): Promise<ApiGoodsReceipt> {
    return apiClient<ApiGoodsReceipt>('/inventory/receipts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async postReceipt(id: string): Promise<ApiGoodsReceipt> {
    return apiClient<ApiGoodsReceipt>(`/inventory/receipts/${id}/post`, {
      method: 'POST',
    });
  },

  async reverseReceipt(id: string): Promise<ApiGoodsReceipt> {
    return apiClient<ApiGoodsReceipt>(`/inventory/receipts/${id}/reverse`, {
      method: 'POST',
    });
  },

  // Deliveries
  async getDeliveries(entityId?: string): Promise<ApiDelivery[]> {
    const query = entityId ? `?entityId=${entityId}` : '';
    return apiClient<ApiDelivery[]>(`/inventory/deliveries${query}`);
  },

  async getDeliveryById(id: string): Promise<ApiDelivery> {
    return apiClient<ApiDelivery>(`/inventory/deliveries/${id}`);
  },

  async createDelivery(payload: CreateDeliveryPayload): Promise<ApiDelivery> {
    return apiClient<ApiDelivery>('/inventory/deliveries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async postDelivery(id: string): Promise<ApiDelivery> {
    return apiClient<ApiDelivery>(`/inventory/deliveries/${id}/post`, {
      method: 'POST',
    });
  },

  async reverseDelivery(id: string): Promise<ApiDelivery> {
    return apiClient<ApiDelivery>(`/inventory/deliveries/${id}/reverse`, {
      method: 'POST',
    });
  },

  // Transfers
  async getTransfers(entityId?: string): Promise<ApiStockTransfer[]> {
    const query = entityId ? `?entityId=${entityId}` : '';
    return apiClient<ApiStockTransfer[]>(`/inventory/transfers${query}`);
  },

  async createTransfer(payload: CreateStockTransferPayload): Promise<ApiStockTransfer> {
    return apiClient<ApiStockTransfer>('/inventory/transfers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Adjustments
  async getAdjustments(entityId?: string): Promise<ApiStockAdjustment[]> {
    const query = entityId ? `?entityId=${entityId}` : '';
    return apiClient<ApiStockAdjustment[]>(`/inventory/adjustments${query}`);
  },

  async createAdjustment(payload: CreateStockAdjustmentPayload): Promise<ApiStockAdjustment> {
    return apiClient<ApiStockAdjustment>('/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Reports & Reconciliation
  async getStockCard(params: { itemId: string; warehouseId?: string; dateFrom?: string; dateTo?: string }): Promise<ApiStockCard> {
    const p = new URLSearchParams();
    p.append('itemId', params.itemId);
    if (params.warehouseId) p.append('warehouseId', params.warehouseId);
    if (params.dateFrom) p.append('dateFrom', params.dateFrom);
    if (params.dateTo) p.append('dateTo', params.dateTo);
    return apiClient<ApiStockCard>(`/inventory/stock-card?${p.toString()}`);
  },

  async getValuationReport(entityId?: string, warehouseId?: string): Promise<ApiValuationReport> {
    const p = new URLSearchParams();
    if (entityId) p.append('entityId', entityId);
    if (warehouseId) p.append('warehouseId', warehouseId);
    const query = p.toString() ? `?${p.toString()}` : '';
    return apiClient<ApiValuationReport>(`/inventory/valuation${query}`);
  },

  async getInventoryReconciliation(entityId: string): Promise<ApiInventoryReconciliation> {
    return apiClient<ApiInventoryReconciliation>(`/inventory/reconciliation?entityId=${entityId}`);
  },

  async getGrniReconciliation(entityId: string): Promise<ApiGrniReconciliation> {
    return apiClient<ApiGrniReconciliation>(`/inventory/grni/reconciliation?entityId=${entityId}`);
  },
};
