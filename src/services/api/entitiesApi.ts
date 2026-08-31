import { apiClient } from './client';

export interface Entity {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  legalName?: string | null;
  baseCurrency: string;
  country: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const entitiesApi = {
  getEntities: () => apiClient<Entity[]>('/entities'),

  getEntityById: (id: string) => apiClient<Entity>(`/entities/${id}`),

  createEntity: (dto: {
    name: string;
    code: string;
    legalName?: string;
    baseCurrency?: string;
    country?: string;
    timezone?: string;
  }) =>
    apiClient<Entity>('/entities', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  updateEntity: (
    id: string,
    dto: {
      name?: string;
      code?: string;
      legalName?: string;
      baseCurrency?: string;
      country?: string;
      timezone?: string;
      isActive?: boolean;
    },
  ) =>
    apiClient<Entity>(`/entities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  deleteEntity: (id: string) =>
    apiClient<{ success: boolean; message: string; entity: Entity }>(`/entities/${id}`, {
      method: 'DELETE',
    }),
};
