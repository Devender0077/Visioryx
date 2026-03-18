/** Base URL for API - use same-origin when unset so Next.js rewrite proxies to backend (avoids CORS/failed to fetch) */
export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:8000';
}

/**
 * Direct backend URL for long-lived streams (MJPEG). Bypasses Next.js proxy to avoid
 * proxy timeout (streams can run indefinitely). Use for stream mjpeg endpoints only.
 */
export function getStreamBase(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  return url.replace(/\/$/, '');
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const isFormData = opts?.body instanceof FormData;
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    // If the token is invalid/expired, force logout and redirect to login.
    if (res.status === 401 && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('token');
      } catch {
        // ignore
      }
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail || res.statusText));
  }
  return res.json();
}
