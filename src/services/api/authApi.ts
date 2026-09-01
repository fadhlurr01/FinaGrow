import { apiClient, clearApiCache } from './client';

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  organizationName?: string;
  phoneNumber?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    isActive: boolean;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
    baseCurrency: string;
  } | null;
  entity?: {
    id: string;
    organizationId: string;
    name: string;
    code: string;
    baseCurrency?: string;
  } | null;
  role: 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'AUDITOR' | 'VIEWER' | string;
  sessionToken?: string;
  memberships?: any[];
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    clearApiCache();
    return apiClient<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    clearApiCache();
    return apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async logout(): Promise<{ message: string }> {
    clearApiCache();
    return apiClient<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },

  async getMe(): Promise<AuthResponse> {
    return apiClient<AuthResponse>('/auth/me', {
      method: 'GET',
    });
  },
};
