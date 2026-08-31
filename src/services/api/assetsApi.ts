import { apiClient } from './client';

export type DepreciationMethod = 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'NONE';
export type AssetStatus = 'DRAFT' | 'ACTIVE' | 'FULLY_DEPRECIATED' | 'DISPOSED' | 'RETIRED' | 'IMPAIRED';
export type DepreciationScheduleStatus = 'SCHEDULED' | 'POSTED' | 'REVERSED';
export type DepreciationRunStatus = 'DRAFT' | 'CALCULATED' | 'POSTED' | 'REVERSED';
export type DisposalType = 'SALE' | 'SCRAP' | 'RETIREMENT' | 'LOSS';
export type DisposalStatus = 'DRAFT' | 'POSTED' | 'REVERSED';

export interface ApiAssetCategory {
  id: string;
  organizationId: string;
  entityId: string;
  code: string;
  name: string;
  description?: string;
  fixedAssetAccountId: string;
  fixedAssetAccount?: { id: string; code: string; name: string };
  accumulatedDepreciationAccountId: string;
  accumulatedDepreciationAccount?: { id: string; code: string; name: string };
  depreciationExpenseAccountId: string;
  depreciationExpenseAccount?: { id: string; code: string; name: string };
  gainOnDisposalAccountId: string;
  gainOnDisposalAccount?: { id: string; code: string; name: string };
  lossOnDisposalAccountId: string;
  lossOnDisposalAccount?: { id: string; code: string; name: string };
  defaultUsefulLifeMonths?: number | null;
  defaultDepreciationMethod: DepreciationMethod;
  defaultResidualValuePercent: number;
  isActive: boolean;
  _count?: { assets: number };
}

export interface ApiFixedAsset {
  id: string;
  organizationId: string;
  entityId: string;
  assetNumber: string;
  categoryId: string;
  category?: ApiAssetCategory;
  name: string;
  description?: string;
  serialNumber?: string;
  acquisitionDate: string;
  capitalizationDate?: string;
  depreciationStartDate?: string;
  acquisitionCost: number;
  residualValue: number;
  depreciableAmount: number;
  usefulLifeMonths?: number | null;
  depreciationMethod: DepreciationMethod;
  accumulatedDepreciation: number;
  netBookValue: number;
  status: AssetStatus;
  vendorId?: string;
  vendor?: { id: string; vendorCode: string; name: string };
  vendorBillId?: string;
  vendorBill?: { id: string; billNumber: string };
  purchaseOrderId?: string;
  location?: string;
  department?: string;
  custodian?: string;
  reference?: string;
  journalEntryId?: string;
  createdById?: string;
  capitalizedById?: string;
  capitalizedAt?: string;
  disposedAt?: string;
  createdAt: string;
  schedules?: ApiDepreciationSchedule[];
}

export interface ApiDepreciationSchedule {
  id: string;
  assetId: string;
  periodYear: number;
  periodMonth: number;
  depreciationDate: string;
  openingBookValue: number;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  closingBookValue: number;
  status: DepreciationScheduleStatus;
  depreciationRunId?: string;
  journalEntryId?: string;
  postedAt?: string;
}

export interface ApiDepreciationRun {
  id: string;
  organizationId: string;
  entityId: string;
  periodYear: number;
  periodMonth: number;
  runNumber: string;
  status: DepreciationRunStatus;
  totalDepreciation: number;
  journalEntryId?: string;
  postedById?: string;
  postedBy?: { id: string; fullName: string; email: string };
  postedAt?: string;
  createdAt: string;
}

export interface ApiAssetMovement {
  id: string;
  assetId: string;
  asset?: { id: string; assetNumber: string; name: string };
  fromLocation?: string;
  toLocation: string;
  fromCustodian?: string;
  toCustodian?: string;
  movementDate: string;
  reason?: string;
  createdBy?: { id: string; fullName: string };
  createdAt: string;
}

export interface ApiAssetDisposal {
  id: string;
  organizationId: string;
  entityId: string;
  assetId: string;
  asset?: { id: string; assetNumber: string; name: string };
  disposalDate: string;
  disposalType: DisposalType;
  proceeds: number;
  buyerId?: string;
  buyer?: { id: string; customerCode: string; name: string };
  cashBankAccountId?: string;
  cashBankAccount?: { id: string; code: string; name: string };
  disposalReference?: string;
  assetCost: number;
  accumulatedDeprec: number;
  netBookValue: number;
  gainLoss: number;
  journalEntryId?: string;
  status: DisposalStatus;
  notes?: string;
  createdAt: string;
}

export interface ApiAssetReconciliation {
  entityId: string;
  assetCount: number;
  assetRegisterCost: number;
  glAssetCost: number;
  costDifference: number;
  registerAccumulatedDepreciation: number;
  glAccumulatedDepreciation: number;
  depreciationDifference: number;
  netBookValue: number;
  glNetBookValue: number;
  isReconciled: boolean;
}

export const assetsApi = {
  // Categories
  getCategories: () => apiClient<ApiAssetCategory[]>('/assets/categories'),
  createCategory: (data: Partial<ApiAssetCategory>) =>
    apiClient<ApiAssetCategory>('/assets/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCategory: (id: string, data: Partial<ApiAssetCategory>) =>
    apiClient<ApiAssetCategory>(`/assets/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Assets Register
  getAssets: (params?: { status?: AssetStatus; categoryId?: string; search?: string }) => {
    const cleanParams: Record<string, string> = {};
    if (params?.status) cleanParams.status = params.status;
    if (params?.categoryId && params.categoryId !== 'all') cleanParams.categoryId = params.categoryId;
    if (params?.search) cleanParams.search = params.search;
    const qs = new URLSearchParams(cleanParams).toString();
    return apiClient<ApiFixedAsset[]>(`/assets/register${qs ? `?${qs}` : ''}`);
  },
  getAsset: (id: string) => apiClient<ApiFixedAsset>(`/assets/${id}`),
  createAsset: (data: any) =>
    apiClient<ApiFixedAsset>('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAsset: (id: string, data: any) =>
    apiClient<ApiFixedAsset>(`/assets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  capitalizeAsset: (id: string, data: { capitalizationDate: string; depreciationStartDate?: string; creditAccountId?: string }) =>
    apiClient<ApiFixedAsset>(`/assets/${id}/capitalize`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Movements
  moveAsset: (id: string, data: { toLocation: string; toCustodian?: string; movementDate: string; reason?: string }) =>
    apiClient<ApiAssetMovement>(`/assets/${id}/move`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMovements: (assetId?: string) =>
    apiClient<ApiAssetMovement[]>(`/assets/movements/all${assetId ? `?assetId=${assetId}` : ''}`),

  // Depreciation Runs
  getDepreciationRuns: () => apiClient<ApiDepreciationRun[]>('/assets/depreciation-runs/all'),
  calculateDepreciationRun: (data: { periodYear: number; periodMonth: number }) =>
    apiClient<any>('/assets/depreciation-runs/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  postDepreciationRun: (data: { periodYear: number; periodMonth: number }) =>
    apiClient<any>('/assets/depreciation-runs/post', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  reverseDepreciationRun: (id: string) =>
    apiClient<any>(`/assets/depreciation-runs/${id}/reverse`, {
      method: 'POST',
    }),

  // Disposals
  getDisposals: () => apiClient<ApiAssetDisposal[]>('/assets/disposals/all'),
  disposeAsset: (id: string, data: { disposalDate: string; disposalType: DisposalType; proceeds?: number; buyerId?: string; cashBankAccountId?: string; disposalReference?: string; notes?: string }) =>
    apiClient<any>(`/assets/${id}/dispose`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Reconciliation
  getReconciliation: () => apiClient<ApiAssetReconciliation>('/assets/reconciliation'),
};
