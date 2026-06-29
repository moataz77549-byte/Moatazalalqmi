import { useAppStore } from '@/lib/store';

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Build a URL that goes through the gateway on port 3000.
 * All routes must be relative; XTransformPort is appended as a query param.
 */
export function apiUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  search.set('XTransformPort', '3000');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    }
  }
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}${search.toString()}`;
}

export function authHeaders(token: string | null, extra?: HeadersInit): HeadersInit {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | boolean | undefined | null>): Promise<ApiResult<T>> {
  const token = useAppStore.getState().token;
  const res = await fetch(apiUrl(path, params), {
    method: 'GET',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
  });
  return res.json() as Promise<ApiResult<T>>;
}

export async function apiPost<T>(path: string, body?: unknown, headers?: HeadersInit): Promise<ApiResult<T>> {
  const token = useAppStore.getState().token;
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json', ...headers }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res.json() as Promise<ApiResult<T>>;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  const token = useAppStore.getState().token;
  const res = await fetch(apiUrl(path), {
    method: 'PATCH',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res.json() as Promise<ApiResult<T>>;
}

export async function apiDelete<T>(path: string): Promise<ApiResult<T>> {
  const token = useAppStore.getState().token;
  const res = await fetch(apiUrl(path), {
    method: 'DELETE',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
  });
  return res.json() as Promise<ApiResult<T>>;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<ApiResult<T>> {
  const token = useAppStore.getState().token;
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  });
  return res.json() as Promise<ApiResult<T>>;
}

// ─── Helpers ────────────────────────────────────────

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatNumber(n: number | undefined | null): string {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

export function estimateTokens(text: string): number {
  // Rough estimate: 4 chars ≈ 1 token
  return Math.ceil(text.length / 4);
}

export function estimateMessageCost(
  tokensIn: number,
  tokensOut: number,
  pricing?: { input?: number; output?: number } | null
): number {
  if (!pricing) return 0;
  const inputCost = (tokensIn / 1_000_000) * (pricing.input ?? 0);
  const outputCost = (tokensOut / 1_000_000) * (pricing.output ?? 0);
  return inputCost + outputCost;
}

export function modelPricingLabel(pricing?: { input?: number; output?: number } | null): string {
  if (!pricing || (!pricing.input && !pricing.output)) return 'Free';
  const inCost = pricing.input ?? 0;
  const outCost = pricing.output ?? 0;
  if (inCost === 0 && outCost === 0) return 'Free';
  return `$${(inCost * 1_000_000).toFixed(2)}/M in · $${(outCost * 1_000_000).toFixed(2)}/M out`;
}
