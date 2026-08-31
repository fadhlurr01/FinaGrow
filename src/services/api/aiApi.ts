import { apiClient } from './client';

export interface AIQueryPayload {
  prompt: string;
  context?: string;
  entityId?: string;
}

export interface AIQueryResponse {
  response: string;
  model: string;
}

export const aiApi = {
  async query(payload: AIQueryPayload): Promise<AIQueryResponse> {
    return apiClient<AIQueryResponse>('/ai/query', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
