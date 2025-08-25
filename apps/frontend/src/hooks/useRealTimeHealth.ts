import { useState, useEffect, useCallback, useRef } from 'react';
import { healthService, SystemHealth, ServiceMetrics, ToolHealthStatus } from '../services/api/healthService';

interface RealTimeHealthData {
  systemHealth: SystemHealth | null;
  serviceMetrics: ServiceMetrics[];
  toolHealthStatus: ToolHealthStatus[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface UseRealTimeHealthOptions {
  refreshInterval?: number; // in milliseconds, default 30000 (30s)
  enableAutoRefresh?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
}

export const useRealTimeHealth = (options: UseRealTimeHealthOptions = {}) => {
  const {
    refreshInterval = 30000,
    enableAutoRefresh = true,
    retryOnError = true,
    maxRetries = 3
  } = options;

  // State management
  const [data, setData] = useState<RealTimeHealthData>({
    systemHealth: null,
    serviceMetrics: [],
    toolHealthStatus: [],
    isConnected: false,
    isLoading: true,
    error: null,
    lastUpdated: null
  });

  // Refs for cleanup and retry logic
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  // Fetch health data from the service
  const fetchHealthData = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      // Fetch all health data in parallel for better performance
      const [systemHealthData, serviceMetricsData, toolHealthData] = await Promise.all([
        healthService.getSystemHealth(),
        healthService.getServiceMetrics(),
        healthService.getToolHealthStatus()
      ]);

      if (isMountedRef.current) {
        setData(prev => ({
          ...prev,
          systemHealth: systemHealthData,
          serviceMetrics: serviceMetricsData,
          toolHealthStatus: toolHealthData,
          isConnected: true,
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        }));

        // Reset retry count on successful fetch
        retryCountRef.current = 0;
      }
    } catch (error) {
      console.error('Failed to fetch health data:', error);
      
      if (isMountedRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch health data';
        
        setData(prev => ({
          ...prev,
          isConnected: false,
          isLoading: false,
          error: errorMessage
        }));

        // Retry logic
        if (retryOnError && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`Retrying health data fetch (attempt ${retryCountRef.current}/${maxRetries})`);
          
          // Exponential backoff: wait longer with each retry
          const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 10000);
          setTimeout(() => fetchHealthData(false), retryDelay);
        }
      }
    }
  }, [retryOnError, maxRetries]);

  // Refresh function for manual updates
  const refresh = useCallback(() => {
    fetchHealthData(true);
  }, [fetchHealthData]);

  // Start auto-refresh interval
  const startAutoRefresh = useCallback(() => {
    if (enableAutoRefresh && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        fetchHealthData(false);
      }, refreshInterval);
    }
  }, [enableAutoRefresh, refreshInterval, fetchHealthData]);

  // Stop auto-refresh interval
  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initialize and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial data fetch
    fetchHealthData(true);
    
    // Start auto-refresh if enabled
    if (enableAutoRefresh) {
      startAutoRefresh();
    }

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      stopAutoRefresh();
    };
  }, [fetchHealthData, enableAutoRefresh, startAutoRefresh, stopAutoRefresh]);

  // Update interval when refreshInterval changes
  useEffect(() => {
    if (enableAutoRefresh) {
      stopAutoRefresh();
      startAutoRefresh();
    }
  }, [refreshInterval, enableAutoRefresh, startAutoRefresh, stopAutoRefresh]);

  // Derived data and utility functions
  const healthSummary = {
    totalServices: data.serviceMetrics.length,
    healthyServices: data.serviceMetrics.filter(s => s.status === 'healthy').length,
    degradedServices: data.serviceMetrics.filter(s => s.status === 'degraded').length,
    errorServices: data.serviceMetrics.filter(s => s.status === 'error').length,
    totalTools: data.toolHealthStatus.length,
    activeTools: data.toolHealthStatus.filter(t => t.status === 'active').length,
    errorTools: data.toolHealthStatus.filter(t => t.status === 'error').length,
    averageResponseTime: data.serviceMetrics.length > 0 
      ? Math.round(data.serviceMetrics.reduce((acc, s) => acc + s.responseTime, 0) / data.serviceMetrics.length)
      : 0
  };

  // Get system health status
  const getSystemStatus = (): 'healthy' | 'degraded' | 'critical' => {
    if (data.error || !data.systemHealth) return 'critical';
    if (healthSummary.errorServices > 0 || healthSummary.errorTools > 0) return 'critical';
    if (healthSummary.degradedServices > 0) return 'degraded';
    return 'healthy';
  };

  return {
    // Core data
    ...data,
    
    // Summary statistics
    healthSummary,
    systemStatus: getSystemStatus(),
    
    // Control functions
    refresh,
    startAutoRefresh,
    stopAutoRefresh,
    
    // Utility functions
    isHealthy: getSystemStatus() === 'healthy',
    hasErrors: healthSummary.errorServices > 0 || healthSummary.errorTools > 0,
    
    // Connection status
    connectionStatus: data.isConnected ? 'connected' : data.error ? 'error' : 'connecting'
  };
};

export default useRealTimeHealth;