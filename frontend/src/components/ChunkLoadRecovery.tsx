'use client';

import { useEffect } from 'react';

/**
 * Recovers from stale Webpack chunks after dev server restarts or hot reload glitches.
 * Next.js throws ChunkLoadError when the browser requests an old hashed chunk that no longer exists.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    const isChunkFailure = (reason: unknown): boolean => {
      if (!reason || typeof reason !== 'object') return false;
      const r = reason as { name?: string; message?: string };
      if (r.name === 'ChunkLoadError') return true;
      const msg = String(r.message ?? '');
      return msg.includes('Loading chunk') || msg.includes('ChunkLoadError');
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkFailure(event.reason)) return;
      const key = '__visioryx_chunk_reload';
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      window.location.reload();
    };

    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => sessionStorage.removeItem('__visioryx_chunk_reload'), 8000);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
