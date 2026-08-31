/**
 * FINAGROW API Client
 * Standardized HTTP client for backend REST API communication with credentials and error handling.
 */

export const API_BASE_URL = 
  (import.meta as any).env?.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') 
    ? 'https://fina-grow-backend-pi.vercel.app/api/v1' 
    : 'http://localhost:4000/api/v1');

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

const apiCache = new Map<string, { data: any; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<any>>();
const CACHE_TTL_MS = 60000; // 60 seconds TTL for fast instant loads

export function clearApiCache() {
  apiCache.clear();
  inFlightRequests.clear();
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

  const isGet = !options.method || options.method.toUpperCase() === 'GET';
  const cacheKey = `${url}:${localStorage.getItem('fms_active_organization_id') || ''}:${localStorage.getItem('fms_active_entity_id') || ''}`;

  // Return from in-memory cache if fresh (0ms instant response)
  if (isGet) {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as T;
    }

    // Deduplicate in-flight requests
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }
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

  // Include session token in Authorization header if present
  const sessionToken = localStorage.getItem('fms_session_token');
  if (sessionToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }

  // Set 9-second timeout to prevent UI freezes while allowing adequate serverless response time
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  const config: RequestInit = {
    ...options,
    headers,
    signal: options.signal || controller.signal,
    credentials: 'include', // Ensures HttpOnly cookies are transmitted
  };

  const fetchPromise = (async () => {
    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
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
            clearApiCache();
          } catch (_) {}
        }
        const errMessage = json.error?.message || `Request failed with status ${response.status}`;
        const errCode = json.error?.code || `HTTP_${response.status}`;
        throw new ApiError(errMessage, errCode, response.status, json.error?.details);
      }

      // Save successful GET result to cache
      if (isGet) {
        apiCache.set(cacheKey, { data: json.data, timestamp: Date.now() });
      } else {
        // Invalidate cache on mutations (POST, PUT, DELETE, PATCH)
        apiCache.clear();
      }

      return json.data as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new ApiError('Request timed out. Please retry.', 'TIMEOUT', 408);
      }
      if (error instanceof ApiError) {
        throw error;
      }
      // Network / fetch errors
      throw new ApiError(
        error.message || 'Unable to connect to backend server.',
        'NETWORK_ERROR',
        0,
      );
    } finally {
      if (isGet) {
        inFlightRequests.delete(cacheKey);
      }
    }
  })();

  if (isGet) {
    inFlightRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
}
