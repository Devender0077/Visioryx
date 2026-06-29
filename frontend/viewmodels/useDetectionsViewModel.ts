import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useRealtimeTick } from '@/contexts/RealtimeContext';

export interface DetectionItem {
  id: string;
  camera_name: string | null;
  user_name: string | null;
  status: 'known' | 'unknown' | string;
  confidence: number;
  timestamp: string;
}

export interface DetectionsViewModel {
  items: DetectionItem[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  query: string;
  setQuery: (v: string) => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  knownCount: number;
  unknownCount: number;
}

const PAGE_SIZE = 50;

export function useDetectionsViewModel(): DetectionsViewModel {
  const tick = useRealtimeTick();
  const [items, setItems] = useState<DetectionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState('');
  const offsetRef = useRef(0);

  const fetchPage = useCallback(async (offset: number, append: boolean) => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (query.trim()) params.set('q', query.trim());
    const r = await api<{ items: DetectionItem[]; total: number }>(
      `/api/v1/detections?${params.toString()}`,
    );
    if (append) {
      setItems((prev) => [...prev, ...r.items]);
    } else {
      setItems(r.items);
    }
    setTotal(r.total);
    return r;
  }, [query]);

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
  }, [query, load, tick]); // eslint-disable-line

  const knownCount = items.filter((i) => i.status === 'known').length;
  const unknownCount = items.filter((i) => i.status === 'unknown').length;

  return {
    items,
    total,
    loading,
    loadingMore,
    hasMore: items.length < total,
    query,
    setQuery,
    refresh: load,
    loadMore,
    knownCount,
    unknownCount,
  };
}
