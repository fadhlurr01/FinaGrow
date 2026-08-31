import { apiClient } from './client';

export interface Project {
  id: string;
  organizationId: string;
  entityId: string;
  code?: string | null;
  name: string;
  customer?: string | null;
  budget: number | string;
  spent: number | string;
  progress: number | string;
  status: 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  profitability: number | string;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  entity?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface ProjectMetrics {
  activeProjects: number;
  totalProjects: number;
  totalBudget: number;
  totalSpent: number;
  overallProfitability: number;
  onTimeCompletion: number;
}

export const projectsApi = {
  getProjects: (filter?: { entityId?: string; status?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v));
        }
      });
    }
    const qs = params.toString();
    return apiClient<Project[]>(`/projects${qs ? `?${qs}` : ''}`);
  },

  getMetrics: (entityId?: string) => {
    const query = entityId ? `?entityId=${entityId}` : '';
    return apiClient<ProjectMetrics>(`/projects/metrics/summary${query}`);
  },

  getProjectById: (id: string) => apiClient<Project>(`/projects/${id}`),

  createProject: (dto: {
    entityId: string;
    name: string;
    code?: string;
    customer?: string;
    budget?: number;
    spent?: number;
    progress?: number;
    status?: string;
    profitability?: number;
    startDate?: string;
    endDate?: string;
    description?: string;
  }) =>
    apiClient<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  updateProject: (
    id: string,
    dto: {
      name?: string;
      code?: string;
      customer?: string;
      budget?: number;
      spent?: number;
      progress?: number;
      status?: string;
      profitability?: number;
      startDate?: string;
      endDate?: string;
      description?: string;
    },
  ) =>
    apiClient<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  deleteProject: (id: string) =>
    apiClient<{ success: boolean; message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    }),
};
