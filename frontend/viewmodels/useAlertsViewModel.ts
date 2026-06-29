import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertsRepository } from './repositories';
import type { AlertModel } from './models';
import { useRealtimeTick } from '@/contexts/RealtimeContext';

export type SeverityFilter = 'All' | 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';

export const SEVERITY_OPTIONS: SeverityFilter[] = ['All', 'Critical', 'High', 'Medium', 'Low', 'Info'];

export interface AlertsViewModel {
  items: AlertModel[];
  total: number;
  unread: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  busy: boolean;
  query: string;
  severity: SeverityFilter;
  todayOnly: boolean;
  setQuery: (v: string) => void;
  setSeverity: (v: SeverityFilter) => void;
  toggleTodayOnly: () => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const PAGE_SIZE = 50;

export function useAlertsViewModel(): AlertsViewModel {
  const realtimeTick = useRealtimeTick();
  const [items, setItems] = useState<AlertModel[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState<SeverityFilter>('All');
  const [todayOnly, setTodayOnly] = useState(false);
  const offsetRef = useRef(0);

  const fetchPage = useCallback(async (offset: number, append: boolean) => {
    const r = await AlertsRepository.list({
      q: query, severity, todayOnly, limit: PAGE_SIZE, offset,
    });
    if (append) {
      setItems((prev) => [...prev, ...r.items]);
    } else {
      setItems(r.items);
    }
    setTotal(r.total);
    return r;
  }, [query, severity, todayOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    offsetRef.current = 0;
    try {
      await fetchPage(0, false);
    } catch {
      setItems([]);
      setTotal(0);
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
  }, [load, realtimeTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const unread = useMemo(() => items.filter((i) => !i.is_read).length, [items]);

  const markRead = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        await AlertsRepository.markRead(id);
        await load();
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const markAllRead = useCallback(async () => {
    setBusy(true);
    try {
      await AlertsRepository.markAllRead();
      await load();
    } finally {
      setBusy(false);
    }
  }, [load]);

  return {
    items,
    total,
    unread,
    loading,
    loadingMore,
    hasMore: items.length < total,
    busy,
    query,
    severity,
    todayOnly,
    setQuery,
    setSeverity,
    toggleTodayOnly: () => setTodayOnly((v) => !v),
    refresh: load,
    loadMore,
    markRead,
    markAllRead,
  };
}
