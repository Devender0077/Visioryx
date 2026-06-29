import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useRealtimeTick } from '@/contexts/RealtimeContext';

export interface UserItem {
  id: string;
  name?: string | null;
  email: string;
  role?: string;
  is_active?: boolean;
  has_face_embedding?: boolean;
  image_path?: string | null;
}

export interface UsersViewModel {
  items: UserItem[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  query: string;
  setQuery: (v: string) => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  add: (body: { email: string; password: string; role: string; name?: string }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  updateRole: (id: string, role: string) => Promise<void>;
  sendEnrollLink: (id: string) => Promise<{ ok: boolean; enroll_url?: string; sent_to?: string }>;
  filtered: UserItem[];
  enrolledCount: number;
  pendingCount: number;
  activeCount: number;
}

const PAGE_SIZE = 50;

export function useUsersViewModel(): UsersViewModel {
  const tick = useRealtimeTick();
  const [items, setItems] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const offsetRef = useRef(0);

  const fetchPage = useCallback(async (offset: number, append: boolean) => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (query.trim()) params.set('q', query.trim());
    const r = await api<{ items: UserItem[]; total: number }>(`/api/v1/users?${params.toString()}`);
    if (append) {
      setItems((prev) => [...prev, ...r.items]);
    } else {
      setItems(r.items ?? []);
    }
    setTotal(r.total ?? 0);
    return r;
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    offsetRef.current = 0;
    try {
      await fetchPage(0, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || items.length >= total) return;
    setLoadingMore(true);
    const nextOffset = offsetRef.current + PAGE_SIZE;
    try {
      await fetchPage(nextOffset, true);
      offsetRef.current = nextOffset;
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  }, [fetchPage, loadingMore, items.length, total]);

  useEffect(() => {
    const delay = query ? 350 : 0;
    const t = setTimeout(() => void load(), delay);
    return () => clearTimeout(t);
  }, [query, load, tick]); // eslint-disable-line

  const filtered = items.filter(
    (u) => !query.trim() || (u.email?.toLowerCase().includes(query.toLowerCase()) || u.name?.toLowerCase().includes(query.toLowerCase())),
  );

  const add = async (body: { email: string; password: string; role: string; name?: string }) => {
    await api('/api/v1/users', { method: 'POST', body: JSON.stringify(body) });
    await load();
  };

  const remove = async (id: string) => {
    await api(`/api/v1/users/${id}`, { method: 'DELETE' });
    await load();
  };

  const updateRole = async (id: string, role: string) => {
    await api(`/api/v1/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
    await load();
  };

  const sendEnrollLink = async (id: string) => {
    return api(`/api/v1/users/${id}/enroll-link`, { method: 'POST' });
  };

  const enrolledCount = items.filter((u) => u.has_face_embedding).length;
  const pendingCount = items.filter((u) => !u.has_face_embedding).length;
  const activeCount = items.filter((u) => u.is_active).length;

  return {
    items,
    total,
    loading,
    loadingMore,
    hasMore: items.length < total,
    error,
    query,
    setQuery,
    refresh: load,
    loadMore,
    add,
    remove,
    updateRole,
    sendEnrollLink,
    filtered,
    enrolledCount,
    pendingCount,
    activeCount,
  };
}
