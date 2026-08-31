import { apiClient } from './client';

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
  };
  entity?: {
    id: string;
    name: string;
    code: string;
  };
  role: string;
  sessionToken?: string;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    return apiClient<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    return apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async logout(): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },

  async getMe(): Promise<any> {
    return apiClient<any>('/auth/me', {
      method: 'GET',
    });
  },
};
