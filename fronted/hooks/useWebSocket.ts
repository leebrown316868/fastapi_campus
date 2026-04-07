import { useEffect, useRef, useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface WSMessage {
  type: string;
  data: Record<string, unknown>;
}

interface UseWebSocketOptions {
  user: { id: number } | null;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  unreadCount: number;
  lastMessage: WSMessage | null;
}

export function useWebSocket({ user }: UseWebSocketOptions): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectDelayRef = useRef(3000);
  const MAX_DELAY = 30000;

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = undefined;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent reconnect on intentional close
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (!user) {
      cleanup();
      return;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;

      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws/notifications?token=' + token;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        setIsConnected(true);
        reconnectDelayRef.current = 3000;
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        try {
          const msg: WSMessage = JSON.parse(event.data);

          if (msg.type === 'connection_established') {
            setUnreadCount((msg.data.unread_count as number) || 0);
          } else if (msg.type === 'new_notification') {
            setUnreadCount((prev) => prev + 1);
            setLastMessage(msg);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setIsConnected(false);
        // exponential backoff reconnect
        const delay = reconnectDelayRef.current;
        reconnectTimerRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, MAX_DELAY);
          connect();
        }, delay);
      };

      ws.onerror = () => {
        // onclose will handle reconnection
      };
    };

    connect();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [user, cleanup]);

  return { isConnected, unreadCount, lastMessage };
}
