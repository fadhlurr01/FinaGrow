import { apiClient } from './client';

export interface Budget {
  id: string;
  organizationId: string;
  entityId: string;
  accountId: string;
  period: string;
  amount: number | string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  account?: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
  entity?: {
    id: string;
    code: string;
    name: string;
  };
  accountName: string;
  accountCode: string;
  actualSpent: number;
  remaining: number;
  utilization: number;
}

export const budgetingApi = {
  getBudgets: (filter?: { entityId?: string; period?: string; accountId?: string }) => {
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v));
        }
      });
    }
    const qs = params.toString();
    return apiClient<Budget[]>(`/budgets${qs ? `?${qs}` : ''}`);
  },

  getBudgetById: (id: string) => apiClient<Budget>(`/budgets/${id}`),

  createBudget: (dto: {
    entityId: string;
    accountId: string;
    period: string;
    amount: number;
    notes?: string;
  }) =>
    apiClient<Budget>('/budgets', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  updateBudget: (
    id: string,
    dto: {
      amount?: number;
      notes?: string;
    },
  ) =>
    apiClient<Budget>(`/budgets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  deleteBudget: (id: string) =>
    apiClient<{ success: boolean; message: string }>(`/budgets/${id}`, {
      method: 'DELETE',
    }),
};
