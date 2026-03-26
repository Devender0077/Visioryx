import * as SecureStore from 'expo-secure-store';
import { getApiBase } from './config';

const TOKEN_KEY = 'visioryx_token';

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function publicApi<T>(path: string, opts?: RequestInit): Promise<T> {
  const isFormData = opts?.body instanceof FormData;
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail || res.statusText));
  }
  return res.json();
}

export async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = await getStoredToken();
  const isFormData = opts?.body instanceof FormData;
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail || res.statusText));
  }
  return res.json();
}

export function streamMjpegUrl(cameraId: number, token: string): string {
  const base = getApiBase();
  const q = new URLSearchParams({ token });
  return `${base}/api/v1/stream/${cameraId}/mjpeg?${q.toString()}`;
}
