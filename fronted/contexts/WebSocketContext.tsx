import React, { createContext, useContext } from 'react';
import { useWebSocket, WSMessage } from '../hooks/useWebSocket';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  isConnected: boolean;
  unreadCount: number;
  lastNotification: WSMessage | null;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  unreadCount: 0,
  lastNotification: null,
});

export const useWebSocketContext = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { isConnected, unreadCount, lastMessage } = useWebSocket({ user });

  // 浏览器后台通知
  React.useEffect(() => {
    if (lastMessage?.type === 'new_notification' && document.hidden) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(lastMessage.data.title as string, {
          body: lastMessage.data.content as string,
        });
      }
    }
  }, [lastMessage]);

  return (
    <WebSocketContext.Provider value={{
      isConnected,
      unreadCount,
      lastNotification: lastMessage,
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};
