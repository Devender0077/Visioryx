const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const isFormData = opts?.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail || res.statusText));
  }
  return res.json();
}
