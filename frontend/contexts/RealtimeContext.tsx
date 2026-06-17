import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getWsUrl } from '@/lib/wsUrl';

/** Same triggers as frontend dashboard (src/app/(dashboard)/dashboard/page.tsx) + server `alert` broadcasts. */
const REFRESH_TYPES = new Set([
  'face_recognized',
  'unknown_person_detected',
  'object_detected',
  'camera_status',
  'alert',
]);

type WsEvent = { type: string; data?: Record<string, unknown> };

type RealtimeContextValue = {
  /** Increments when a relevant server event is received (refetch dashboard-style data). */
  tick: number;
  connected: boolean;
};

const RealtimeContext = createContext<RealtimeContextValue>({ tick: 0, connected: false });

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);

  const bump = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const connectRef = useRef<() => void>(() => {});

  const clearReconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!user) return;
    clearReconnect();
    const delay = Math.min(30_000, 2000 * Math.pow(1.5, reconnectAttempt.current));
    reconnectTimer.current = setTimeout(() => {
      reconnectAttempt.current += 1;
      connectRef.current?.();
    }, delay);
  }, [user, clearReconnect]);

  const connect = useCallback(() => {
    if (!user) return;
    clearReconnect();
    try {
      wsRef.current?.close();
    } catch {
      /* noop */
    }
    const url = getWsUrl();
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempt.current = 0;
      setConnected(true);
    };

    ws.onmessage = (e) => {
      if (typeof e.data === 'string' && e.data === 'pong') return;
      try {
        const msg = JSON.parse(e.data as string) as WsEvent;
        if (typeof msg.type === 'string' && REFRESH_TYPES.has(msg.type)) {
          bump();
        }
      } catch {
        /* ignore */
      }
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      if (user) scheduleReconnect();
    };
  }, [user, bump, clearReconnect, scheduleReconnect]);

  connectRef.current = connect;

  useEffect(() => {
    if (!user) {
      clearReconnect();
      try {
        wsRef.current?.close();
      } catch {
        /* noop */
      }
      wsRef.current = null;
      setConnected(false);
      reconnectAttempt.current = 0;
      return;
    }
    connect();
    return () => {
      clearReconnect();
      if (pingTimer.current) {
        clearInterval(pingTimer.current);
        pingTimer.current = null;
      }
      try {
        wsRef.current?.close();
      } catch {
        /* noop */
      }
      wsRef.current = null;
    };
  }, [user, connect, clearReconnect]);

  useEffect(() => {
    if (!user || !wsRef.current) return;
    if (pingTimer.current) clearInterval(pingTimer.current);
    pingTimer.current = setInterval(() => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send('ping');
        } catch {
          /* noop */
        }
      }
    }, 25_000);
    return () => {
      if (pingTimer.current) {
        clearInterval(pingTimer.current);
        pingTimer.current = null;
      }
    };
  }, [user, connected]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active' && user) {
        connect();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [user, connect]);

  /** When WebSocket is down, poll so the app stays roughly in sync with the web dashboard. */
  useEffect(() => {
    if (!user || connected) return;
    const id = setInterval(() => bump(), 30_000);
    return () => clearInterval(id);
  }, [user, connected, bump]);

  const value = React.useMemo(() => ({ tick, connected }), [tick, connected]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeTick(): number {
  return useContext(RealtimeContext).tick;
}

export function useRealtimeConnected(): boolean {
  return useContext(RealtimeContext).connected;
}
