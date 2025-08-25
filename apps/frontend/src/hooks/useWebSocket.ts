import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { config } from '@/config/environment';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
  source?: string;
}

export interface WebSocketConfig {
  url?: string;
  protocols?: string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  connectionAttempts: number;
}

const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  url: config.urls.ws,
  protocols: [],
  reconnectInterval: config.websocket.reconnectInterval,
  maxReconnectAttempts: config.websocket.maxReconnectAttempts,
  heartbeatInterval: config.websocket.heartbeatInterval,
};

export const useWebSocket = (config: WebSocketConfig = {}) => {
  const { user, isLoading: authLoading } = useAuth();
  const wsConfig = { ...DEFAULT_CONFIG, ...config };
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout>();
  const heartbeatTimer = useRef<NodeJS.Timeout>();
  const messageHandlers = useRef<Map<string, (payload: any) => void>>(new Map());
  
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    connectionAttempts: 0,
  });

  // Clear timers
  const clearTimers = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = undefined;
    }
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = undefined;
    }
  }, []);

  // Send heartbeat to keep connection alive
  const sendHeartbeat = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: Date.now(),
      }));
    }
  }, []);

  // Start heartbeat interval
  const startHeartbeat = useCallback(() => {
    clearInterval(heartbeatTimer.current);
    heartbeatTimer.current = setInterval(sendHeartbeat, wsConfig.heartbeatInterval);
  }, [sendHeartbeat, wsConfig.heartbeatInterval]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!user || authLoading) return;
    if (ws.current?.readyState === WebSocket.CONNECTING) return;

    setState(prev => ({ 
      ...prev, 
      isConnecting: true, 
      error: null 
    }));

    try {
      // Add authentication token to WebSocket URL
      const wsUrl = new URL(wsConfig.url);
      wsUrl.searchParams.set('token', 'user-session-token'); // Replace with actual token
      wsUrl.searchParams.set('userId', user.sub);

      ws.current = new WebSocket(wsUrl.toString(), wsConfig.protocols);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          connectionAttempts: 0,
        }));
        
        startHeartbeat();
        
        // Send initial subscription message
        ws.current?.send(JSON.stringify({
          type: 'subscribe',
          payload: {
            userId: user.sub,
            subscriptions: ['dashboard', 'health', 'activity', 'tools']
          },
          timestamp: Date.now(),
        }));
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          setState(prev => ({ ...prev, lastMessage: message }));
          
          // Handle specific message types
          const handler = messageHandlers.current.get(message.type);
          if (handler) {
            handler(message.payload);
          }
          
          // Handle heartbeat response
          if (message.type === 'heartbeat') {
            console.log('Heartbeat response received');
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'WebSocket connection error',
          isConnecting: false 
        }));
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));
        
        clearTimers();

        // Attempt to reconnect if not a clean close and under retry limit
        if (event.code !== 1000 && state.connectionAttempts < wsConfig.maxReconnectAttempts) {
          setState(prev => ({
            ...prev,
            connectionAttempts: prev.connectionAttempts + 1,
          }));
          
          reconnectTimer.current = setTimeout(() => {
            console.log(`Attempting to reconnect... (${state.connectionAttempts + 1}/${wsConfig.maxReconnectAttempts})`);
            connect();
          }, wsConfig.reconnectInterval);
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to create WebSocket connection',
        isConnecting: false,
      }));
    }
  }, [user, authLoading, wsConfig, state.connectionAttempts, startHeartbeat, clearTimers]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    clearTimers();
    
    if (ws.current) {
      ws.current.close(1000, 'User disconnected');
      ws.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      connectionAttempts: 0,
    }));
  }, [clearTimers]);

  // Send message through WebSocket
  const sendMessage = useCallback((type: string, payload: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        payload,
        timestamp: Date.now(),
      };
      
      ws.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Subscribe to specific message types
  const subscribe = useCallback((messageType: string, handler: (payload: any) => void) => {
    messageHandlers.current.set(messageType, handler);
    
    // Return unsubscribe function
    return () => {
      messageHandlers.current.delete(messageType);
    };
  }, []);

  // Force reconnect
  const reconnect = useCallback(() => {
    disconnect();
    setState(prev => ({ ...prev, connectionAttempts: 0 }));
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  // Initialize connection when user is available
  useEffect(() => {
    if (user && !authLoading) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [user, authLoading, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      if (ws.current) {
        ws.current.close(1000, 'Component unmounted');
      }
    };
  }, [clearTimers]);

  return {
    ...state,
    sendMessage,
    subscribe,
    reconnect,
    disconnect,
  };
};