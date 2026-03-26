/**
 * Point EXPO_PUBLIC_API_URL at your backend, e.g. http://192.168.1.10:8000
 * (use your machine's LAN IP so a physical device can reach the API.)
 */
export function getApiBase(): string {
  const u = process.env.EXPO_PUBLIC_API_URL;
  if (u && u.length > 0) return u.replace(/\/$/, '');
  return 'http://localhost:8000';
}
