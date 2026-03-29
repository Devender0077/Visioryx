/**
 * Backend API base (FastAPI), e.g. http://192.168.1.10:8000
 * Not the Metro bundler port (8081) — that is only for Expo to load JS in development.
 */
export function getApiBase(): string {
  const u = process.env.EXPO_PUBLIC_API_URL;
  if (u && u.length > 0) return u.replace(/\/$/, '');
  return 'http://localhost:8000';
}

/** Next.js dashboard — open SMTP / admin pages in browser (same LAN as API). */
export function getDashboardBase(): string {
  const u = process.env.EXPO_PUBLIC_DASHBOARD_URL;
  if (u && u.length > 0) return u.replace(/\/$/, '');
  return 'http://localhost:3000';
}
