import { getToken } from '../utils/storage';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:5057/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string | null;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function joinUrl(baseUrl: string, endpoint: string) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${normalizedBase}${normalizedEndpoint}`;
}

function isJsonResponse(contentType: string | null) {
  return contentType?.toLowerCase().includes('application/json') ?? false;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  let resolvedToken = options.token;
  if (options.token === undefined) {
    resolvedToken = await getToken();
  }

  const response = await fetch(joinUrl(API_BASE_URL, endpoint), {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get('content-type');
  const responseBody = isJsonResponse(contentType)
    ? ((await response.json()) as unknown)
    : ((await response.text()) as unknown);

  if (!response.ok) {
    const fallback = `API request failed with status ${response.status}`;
    const message =
      typeof responseBody === 'string'
        ? responseBody || fallback
        : extractMessage(responseBody) || fallback;
    throw new ApiError(response.status, message);
  }

  return responseBody as T;
}

export function extractMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const messageFields = ['message', 'error', 'title', 'detail'];
  for (const key of messageFields) {
    if (typeof candidate[key] === 'string' && candidate[key]) {
      return candidate[key];
    }
  }

  return null;
}

export function extractData<T>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') {
    return payload as T;
  }

  const candidate = payload as Record<string, unknown>;
  if ('data' in candidate) {
    return candidate.data as T;
  }

  return payload as T;
}
