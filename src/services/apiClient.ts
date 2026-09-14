/**
 * Centralized API Client configuration for the Frontend.
 * Supports both unified deployment (relative /api) and split deployment
 * (where VITE_API_URL points to a standalone backend instance on Vercel or Cloud Run).
 */

export const API_BASE_URL: string = (
  ((import.meta as any).env?.VITE_API_URL as string | undefined) || ''
).replace(/\/+$/, '');

/**
 * Resolves an API path with the configured API_BASE_URL.
 * Example:
 *   apiUrl('/api/invoices') -> 'https://backend.vercel.app/api/invoices' (if VITE_API_URL is set)
 *   apiUrl('/api/invoices') -> '/api/invoices' (if VITE_API_URL is empty)
 */
export function apiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}

/**
 * Standard fetch wrapper that automatically prefixes API_BASE_URL.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof input === 'string') {
    return fetch(apiUrl(input), init);
  }
  return fetch(input, init);
}

export default {
  API_BASE_URL,
  apiUrl,
  apiFetch,
};
