/**
 * FINAGROW API Client
 * Standardized HTTP client for backend REST API communication with credentials and error handling.
 */

export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1';

export interface ApiEnvelope<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    path?: string;
  };
}

export class ApiError extends Error {
  code: string;
  details?: any;
  status: number;

  constructor(message: string, code = 'API_ERROR', status = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function ensureActiveEntityId(): Promise<string> {
  const stored = localStorage.getItem('fms_active_entity_id');
  if (stored && UUID_REGEX.test(stored)) {
    return stored;
  }
  try {
    const res = await apiClient<any>('/entities');
    const list = Array.isArray(res) ? res : (res as any)?.data || [];
    if (list.length > 0 && list[0].id) {
      localStorage.setItem('fms_active_entity_id', list[0].id);
      if (list[0].organizationId) {
        localStorage.setItem('fms_active_organization_id', list[0].organizationId);
      }
      return list[0].id;
    }
  } catch (_) {}
  return stored && UUID_REGEX.test(stored) ? stored : '';
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  let rawUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  // Sanitize query params (remove undefined, null, or invalid non-UUID entityId)
  let url = rawUrl;
  try {
    const parsed = new URL(rawUrl);
    let dirty = false;
    const entries = Array.from(parsed.searchParams.entries());
    for (const [k, v] of entries) {
      if (v === 'undefined' || v === 'null' || v === '') {
        parsed.searchParams.delete(k);
        dirty = true;
      } else if (k === 'entityId' && !UUID_REGEX.test(v)) {
        parsed.searchParams.delete(k);
        dirty = true;
      }
    }
    if (dirty) {
      url = parsed.toString();
    }
  } catch (_) {
    // Fallback to rawUrl
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  // Include active organization header if stored
  const activeOrgId = localStorage.getItem('fms_active_organization_id');
  if (activeOrgId && !headers.has('x-organization-id')) {
    headers.set('x-organization-id', activeOrgId);
  }

  // Include Bearer Authorization token if stored (cross-origin resilient)
  const sessionToken = localStorage.getItem('fms_session_token');
  if (sessionToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Ensures HttpOnly cookies are transmitted
  };

  try {
    const response = await fetch(url, config);
    let json: ApiEnvelope<T>;

    try {
      json = await response.json();
    } catch (_) {
      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, 'HTTP_ERROR', response.status);
      }
      return {} as T;
    }

    if (!response.ok || json.success === false) {
      if (response.status === 401 || response.status === 403) {
        try {
          localStorage.removeItem('fms_active_organization_id');
          localStorage.removeItem('fms_active_entity_id');
        } catch (_) {}
      }
      const errMessage = json.error?.message || `Request failed with status ${response.status}`;
      const errCode = json.error?.code || `HTTP_${response.status}`;
      throw new ApiError(errMessage, errCode, response.status, json.error?.details);
    }

    return json.data as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network / fetch errors
    throw new ApiError(
      error.message || 'Unable to connect to the FINAGROW backend server. Please ensure the backend is running.',
      'NETWORK_ERROR',
      0,
    );
  }
}
