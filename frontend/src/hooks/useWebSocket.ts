'use client';

import { useEffect, useRef, useState } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export type WSEvent = {
  type: string;
  data: Record<string, unknown>;
};

export function useWebSocket(onMessage?: (event: WSEvent) => void) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ws = new WebSocket(`${WS_URL}/ws`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as WSEvent;
        onMessageRef.current?.(event);
      } catch {
        // ignore
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, []);

  return { connected };
}
