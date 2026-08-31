import { apiClient } from './client';

export interface SystemSettings {
  language: string;
  theme: string;
  timezone: string;
  baseCurrency: string;
  enabledModules: Record<string, boolean>;
}

export const settingsApi = {
  getSettings: () => apiClient<SystemSettings>('/settings'),

  updateSettings: (dto: {
    language?: string;
    theme?: string;
    timezone?: string;
    enabledModules?: Record<string, boolean>;
  }) =>
    apiClient<SystemSettings>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
};
