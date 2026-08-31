import { apiClient } from './client';

export interface OrgUser {
  id: string;
  membershipId: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'AUDITOR' | 'VIEWER' | string;
  status: 'Active' | 'Suspended';
  joinedAt: string;
}

export const usersApi = {
  getUsers: () => apiClient<OrgUser[]>('/users'),

  createUser: (dto: {
    email: string;
    fullName: string;
    role: string;
    password?: string;
  }) =>
    apiClient<OrgUser>('/users', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  updateUserRole: (id: string, role: string) =>
    apiClient<OrgUser>(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  deleteUser: (id: string) =>
    apiClient<{ success: boolean; message: string }>(`/users/${id}`, {
      method: 'DELETE',
    }),
};
