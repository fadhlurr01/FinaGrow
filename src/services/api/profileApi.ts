import { apiClient } from './client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  role: string;
  organizationName: string;
  createdAt: string;
}

export const profileApi = {
  getProfile: () => apiClient<UserProfile>('/profile'),

  updateProfile: (dto: {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
    currentPassword?: string;
    newPassword?: string;
  }) =>
    apiClient<UserProfile>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
};
