import { getApiBase } from './config';

/**
 * Same origin as the REST API, `ws`/`wss` scheme (matches frontend NEXT_PUBLIC_WS_URL pattern).
 * Override with EXPO_PUBLIC_WS_URL if the WS endpoint differs (e.g. TLS terminator).
 */
export function getWsUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_WS_URL;
  if (explicit && explicit.length > 0) {
    return explicit.replace(/\/$/, '');
  }
  const base = getApiBase();
  try {
    const u = new URL(base);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = '/ws';
    u.search = '';
    u.hash = '';
    return u.toString().replace(/\/$/, '');
  } catch {
    return 'ws://localhost:8000/ws';
  }
}
