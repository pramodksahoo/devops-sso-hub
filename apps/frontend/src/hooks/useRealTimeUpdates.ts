import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

export interface RealTimeEvent {
  type: 'health' | 'activity' | 'tools' | 'users' | 'system' | 'metrics';
  action: 'update' | 'create' | 'delete' | 'status_change';
  data: any;
  timestamp: number;
  source?: string;
}

export interface RealTimeState {
  isConnected: boolean;
  lastUpdate: Date | null;
  eventCount: number;
  events: RealTimeEvent[];
  healthUpdates: any[];
  activityUpdates: any[];
  toolUpdates: any[];
  systemMetrics: any;
}

interface UseRealTimeUpdatesConfig {
  enableHealth?: boolean;
  enableActivity?: boolean;
  enableTools?: boolean;
  enableMetrics?: boolean;
  maxEvents?: number;
  onEvent?: (event: RealTimeEvent) => void;
  onHealthUpdate?: (data: any) => void;
  onActivityUpdate?: (data: any) => void;
  onToolUpdate?: (data: any) => void;
  onMetricsUpdate?: (data: any) => void;
}

const DEFAULT_CONFIG: UseRealTimeUpdatesConfig = {
  enableHealth: true,
  enableActivity: true,
  enableTools: true,
  enableMetrics: true,
  maxEvents: 100,
};

export const useRealTimeUpdates = (config: UseRealTimeUpdatesConfig = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { isConnected, subscribe, sendMessage } = useWebSocket();
  
  const [state, setState] = useState<RealTimeState>({
    isConnected: false,
    lastUpdate: null,
    eventCount: 0,
    events: [],
    healthUpdates: [],
    activityUpdates: [],
    toolUpdates: [],
    systemMetrics: null,
  });

  // Update connection status
  useEffect(() => {
    setState(prev => ({ ...prev, isConnected }));
  }, [isConnected]);

  // Add event to state
  const addEvent = useCallback((event: RealTimeEvent) => {
    setState(prev => {
      const newEvents = [event, ...prev.events].slice(0, finalConfig.maxEvents || 100);
      return {
        ...prev,
        events: newEvents,
        eventCount: prev.eventCount + 1,
        lastUpdate: new Date(),
      };
    });
    
    // Call custom event handler
    finalConfig.onEvent?.(event);
  }, [finalConfig]);

  // Handle health updates
  const handleHealthUpdate = useCallback((data: any) => {
    if (!finalConfig.enableHealth) return;
    
    const event: RealTimeEvent = {
      type: 'health',
      action: 'update',
      data,
      timestamp: Date.now(),
      source: 'health-monitor'
    };
    
    setState(prev => ({
      ...prev,
      healthUpdates: [data, ...prev.healthUpdates.slice(0, 9)], // Keep last 10
    }));
    
    addEvent(event);
    finalConfig.onHealthUpdate?.(data);
  }, [finalConfig, addEvent]);

  // Handle activity updates
  const handleActivityUpdate = useCallback((data: any) => {
    if (!finalConfig.enableActivity) return;
    
    const event: RealTimeEvent = {
      type: 'activity',
      action: 'update',
      data,
      timestamp: Date.now(),
      source: 'activity-feed'
    };
    
    setState(prev => ({
      ...prev,
      activityUpdates: [data, ...prev.activityUpdates.slice(0, 19)], // Keep last 20
    }));
    
    addEvent(event);
    finalConfig.onActivityUpdate?.(data);
  }, [finalConfig, addEvent]);

  // Handle tool updates
  const handleToolUpdate = useCallback((data: any) => {
    if (!finalConfig.enableTools) return;
    
    const event: RealTimeEvent = {
      type: 'tools',
      action: data.action || 'update',
      data,
      timestamp: Date.now(),
      source: 'tool-monitor'
    };
    
    setState(prev => ({
      ...prev,
      toolUpdates: [data, ...prev.toolUpdates.slice(0, 9)], // Keep last 10
    }));
    
    addEvent(event);
    finalConfig.onToolUpdate?.(data);
  }, [finalConfig, addEvent]);

  // Handle system metrics updates
  const handleMetricsUpdate = useCallback((data: any) => {
    if (!finalConfig.enableMetrics) return;
    
    const event: RealTimeEvent = {
      type: 'metrics',
      action: 'update',
      data,
      timestamp: Date.now(),
      source: 'system-monitor'
    };
    
    setState(prev => ({
      ...prev,
      systemMetrics: data,
    }));
    
    addEvent(event);
    finalConfig.onMetricsUpdate?.(data);
  }, [finalConfig, addEvent]);

  // Handle user events
  const handleUserUpdate = useCallback((data: any) => {
    const event: RealTimeEvent = {
      type: 'users',
      action: data.action || 'update',
      data,
      timestamp: Date.now(),
      source: 'user-service'
    };
    
    addEvent(event);
  }, [addEvent]);

  // Handle system events
  const handleSystemUpdate = useCallback((data: any) => {
    const event: RealTimeEvent = {
      type: 'system',
      action: data.action || 'update',
      data,
      timestamp: Date.now(),
      source: 'system-monitor'
    };
    
    addEvent(event);
  }, [addEvent]);

  // Subscribe to WebSocket events
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    if (finalConfig.enableHealth) {
      unsubscribers.push(subscribe('health_update', handleHealthUpdate));
      unsubscribers.push(subscribe('service_health', handleHealthUpdate));
    }

    if (finalConfig.enableActivity) {
      unsubscribers.push(subscribe('activity', handleActivityUpdate));
      unsubscribers.push(subscribe('user_activity', handleActivityUpdate));
      unsubscribers.push(subscribe('system_activity', handleActivityUpdate));
    }

    if (finalConfig.enableTools) {
      unsubscribers.push(subscribe('tool_status', handleToolUpdate));
      unsubscribers.push(subscribe('tool_configuration', handleToolUpdate));
    }

    if (finalConfig.enableMetrics) {
      unsubscribers.push(subscribe('system_metrics', handleMetricsUpdate));
      unsubscribers.push(subscribe('performance_metrics', handleMetricsUpdate));
    }

    // Subscribe to user and system events
    unsubscribers.push(subscribe('user_event', handleUserUpdate));
    unsubscribers.push(subscribe('system_event', handleSystemUpdate));

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [
    finalConfig,
    subscribe,
    handleHealthUpdate,
    handleActivityUpdate,
    handleToolUpdate,
    handleMetricsUpdate,
    handleUserUpdate,
    handleSystemUpdate,
  ]);

  // Request initial data on connection
  useEffect(() => {
    if (isConnected) {
      // Request current data when connected
      const requests = [];
      
      if (finalConfig.enableHealth) {
        requests.push({ type: 'get_health_status' });
      }
      
      if (finalConfig.enableActivity) {
        requests.push({ type: 'get_recent_activity', limit: 20 });
      }
      
      if (finalConfig.enableTools) {
        requests.push({ type: 'get_tool_status' });
      }
      
      if (finalConfig.enableMetrics) {
        requests.push({ type: 'get_system_metrics' });
      }

      // Send requests with a small delay to avoid overwhelming the server
      requests.forEach((request, index) => {
        setTimeout(() => {
          sendMessage('request', request);
        }, index * 100);
      });
    }
  }, [isConnected, sendMessage, finalConfig]);

  // Utility functions
  const getRecentEvents = useCallback((type?: RealTimeEvent['type'], limit = 10) => {
    return state.events
      .filter(event => !type || event.type === type)
      .slice(0, limit);
  }, [state.events]);

  const getEventsByTimeRange = useCallback((startTime: Date, endTime?: Date) => {
    const end = endTime || new Date();
    return state.events.filter(event => {
      const eventTime = new Date(event.timestamp);
      return eventTime >= startTime && eventTime <= end;
    });
  }, [state.events]);

  const clearEvents = useCallback(() => {
    setState(prev => ({
      ...prev,
      events: [],
      eventCount: 0,
    }));
  }, []);

  const requestUpdate = useCallback((type: string, params?: any) => {
    if (isConnected) {
      return sendMessage('request', { type, ...params });
    }
    return false;
  }, [isConnected, sendMessage]);

  return {
    ...state,
    getRecentEvents,
    getEventsByTimeRange,
    clearEvents,
    requestUpdate,
    // Specific getters for convenience
    getHealthUpdates: () => state.healthUpdates,
    getActivityUpdates: () => state.activityUpdates,
    getToolUpdates: () => state.toolUpdates,
    getSystemMetrics: () => state.systemMetrics,
  };
};