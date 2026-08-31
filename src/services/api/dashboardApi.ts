import { apiClient } from './client';

export interface DashboardSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
  accountWatchlist: Array<{
    id: string;
    code: string;
    name: string;
    type: string;
    currentBalance: number;
  }>;
  revenueChangePercent: string;
  expenseChangePercent: string;
  netProfitChangePercent: string;
  cashBalanceChangePercent: string;
}

export interface RevenueExpenseItem {
  name: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

export interface RecentTransactionItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  status: 'Completed' | 'Pending' | 'Cancelled';
  reference?: string;
  party?: string;
}

export interface DashboardFilter {
  entityId?: string;
  periodPreset?: 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'ALL' | string;
  startDate?: string;
  endDate?: string;
  year?: string;
}

export const dashboardApi = {
  getSummary: (filter?: DashboardFilter) => {
    const params = new URLSearchParams();
    if (filter?.entityId) params.append('entityId', filter.entityId);
    if (filter?.periodPreset) params.append('periodPreset', filter.periodPreset);
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient<DashboardSummary>(`/dashboard/summary${query}`);
  },

  getRevenueVsExpenses: (filter?: DashboardFilter) => {
    const params = new URLSearchParams();
    if (filter?.entityId) params.append('entityId', filter.entityId);
    if (filter?.year) params.append('year', filter.year);

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient<RevenueExpenseItem[]>(`/dashboard/revenue-expense${query}`);
  },

  getRecentTransactions: (filter?: DashboardFilter, limit = 15) => {
    const params = new URLSearchParams();
    if (filter?.entityId) params.append('entityId', filter.entityId);
    params.append('limit', String(limit));

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient<RecentTransactionItem[]>(`/dashboard/recent-transactions${query}`);
  },
};
