import { apiClient } from './client';

export interface Subscription {
  id: string;
  organizationId: string;
  planCode: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE' | string;
  status: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED' | string;
  startDate: string;
  endDate?: string | null;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export const subscriptionApi = {
  getCurrentSubscription: () => apiClient<Subscription>('/subscriptions/current'),

  changePlan: (planCode: string) =>
    apiClient<Subscription>('/subscriptions/change-plan', {
      method: 'POST',
      body: JSON.stringify({ planCode }),
    }),
};
