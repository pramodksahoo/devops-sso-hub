import { useState, useEffect, useCallback, useRef } from 'react';
import { healthService } from '../services/api/healthService';

interface SystemMetricData {
  name: string;
  value: string | number;
  unit?: string;
  trend: 'up' | 'down' | 'stable';
  threshold?: {
    warning: number;
    critical: number;
  };
  status: 'normal' | 'warning' | 'critical';
  icon: string;
  color: string;
}

interface SystemMetricsState {
  cpu: SystemMetricData | null;
  memory: SystemMetricData | null;
  disk: SystemMetricData | null;
  network: SystemMetricData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isConnected: boolean;
}

interface UseSystemMetricsOptions {
  refreshInterval?: number; // in milliseconds, default 15000 (15s)
  enableAutoRefresh?: boolean;
  includeHistoricalData?: boolean;
}

export const useSystemMetrics = (options: UseSystemMetricsOptions = {}) => {
  const {
    refreshInterval = 15000,
    enableAutoRefresh = true,
    includeHistoricalData = false
  } = options;

  // State management
  const [metrics, setMetrics] = useState<SystemMetricsState>({
    cpu: null,
    memory: null,
    disk: null,
    network: null,
    isLoading: true,
    error: null,
    lastUpdated: null,
    isConnected: false
  });

  // Historical data for trend analysis (last 10 readings)
  const [historicalData, setHistoricalData] = useState<{
    cpu: number[];
    memory: number[];
    disk: number[];
    network: number[];
  }>({
    cpu: [],
    memory: [],
    disk: [],
    network: []
  });

  // Refs for cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Determine status based on value and thresholds
  const getMetricStatus = (value: number, threshold?: { warning: number; critical: number }): 'normal' | 'warning' | 'critical' => {
    if (!threshold) return 'normal';
    if (value >= threshold.critical) return 'critical';
    if (value >= threshold.warning) return 'warning';
    return 'normal';
  };

  // Calculate trend based on historical data
  const calculateTrend = (historical: number[], current: number): 'up' | 'down' | 'stable' => {
    if (historical.length < 2) return 'stable';
    
    const recent = historical.slice(-3); // Last 3 readings
    const avg = recent.reduce((acc, val) => acc + val, 0) / recent.length;
    
    const threshold = 5; // 5% change threshold
    const change = ((current - avg) / avg) * 100;
    
    if (Math.abs(change) < threshold) return 'stable';
    return change > 0 ? 'up' : 'down';
  };

  // Process raw metrics into structured format
  const processMetrics = useCallback((rawData: any) => {
    const cpuUsage = parseFloat(rawData.cpu?.usage || 45);
    const memoryUsage = parseFloat(rawData.memory?.usage || 2.1);
    const diskIO = parseFloat(rawData.disk?.io || 120);
    const networkThroughput = parseFloat(rawData.network?.throughput || 45);

    // Update historical data if enabled
    if (includeHistoricalData) {
      setHistoricalData(prev => ({
        cpu: [...prev.cpu.slice(-9), cpuUsage], // Keep last 10 readings
        memory: [...prev.memory.slice(-9), memoryUsage],
        disk: [...prev.disk.slice(-9), diskIO],
        network: [...prev.network.slice(-9), networkThroughput]
      }));
    }

    return {
      cpu: {
        name: 'CPU Usage',
        value: cpuUsage,
        unit: '%',
        trend: calculateTrend(historicalData.cpu, cpuUsage),
        threshold: { warning: 70, critical: 90 },
        status: getMetricStatus(cpuUsage, { warning: 70, critical: 90 }),
        icon: 'cpu',
        color: getMetricStatus(cpuUsage, { warning: 70, critical: 90 }) === 'normal' ? 'text-blue-600' : 
               getMetricStatus(cpuUsage, { warning: 70, critical: 90 }) === 'warning' ? 'text-yellow-600' : 'text-red-600'
      },
      memory: {
        name: 'Memory',
        value: memoryUsage,
        unit: 'GB',
        trend: calculateTrend(historicalData.memory, memoryUsage),
        threshold: { warning: 4.0, critical: 6.0 },
        status: getMetricStatus(memoryUsage, { warning: 4.0, critical: 6.0 }),
        icon: 'database',
        color: getMetricStatus(memoryUsage, { warning: 4.0, critical: 6.0 }) === 'normal' ? 'text-green-600' : 
               getMetricStatus(memoryUsage, { warning: 4.0, critical: 6.0 }) === 'warning' ? 'text-yellow-600' : 'text-red-600'
      },
      disk: {
        name: 'Disk I/O',
        value: diskIO,
        unit: 'MB/s',
        trend: calculateTrend(historicalData.disk, diskIO),
        threshold: { warning: 200, critical: 300 },
        status: getMetricStatus(diskIO, { warning: 200, critical: 300 }),
        icon: 'harddrive',
        color: getMetricStatus(diskIO, { warning: 200, critical: 300 }) === 'normal' ? 'text-purple-600' : 
               getMetricStatus(diskIO, { warning: 200, critical: 300 }) === 'warning' ? 'text-yellow-600' : 'text-red-600'
      },
      network: {
        name: 'Network',
        value: networkThroughput,
        unit: 'Mbps',
        trend: calculateTrend(historicalData.network, networkThroughput),
        threshold: { warning: 80, critical: 95 },
        status: getMetricStatus(networkThroughput, { warning: 80, critical: 95 }),
        icon: 'zap',
        color: getMetricStatus(networkThroughput, { warning: 80, critical: 95 }) === 'normal' ? 'text-orange-600' : 
               getMetricStatus(networkThroughput, { warning: 80, critical: 95 }) === 'warning' ? 'text-yellow-600' : 'text-red-600'
      }
    };
  }, [historicalData, includeHistoricalData]);

  // Fetch system metrics
  const fetchMetrics = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setMetrics(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      const rawData = await healthService.getSystemMetrics();
      
      if (isMountedRef.current) {
        const processedMetrics = processMetrics(rawData);
        
        setMetrics(prev => ({
          ...prev,
          ...processedMetrics,
          isLoading: false,
          error: null,
          isConnected: true,
          lastUpdated: new Date()
        }));
      }
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
      
      if (isMountedRef.current) {
        setMetrics(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch metrics',
          isConnected: false
        }));
      }
    }
  }, [processMetrics]);

  // Manual refresh
  const refresh = useCallback(() => {
    fetchMetrics(true);
  }, [fetchMetrics]);

  // Start auto-refresh
  const startAutoRefresh = useCallback(() => {
    if (enableAutoRefresh && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        fetchMetrics(false);
      }, refreshInterval);
    }
  }, [enableAutoRefresh, refreshInterval, fetchMetrics]);

  // Stop auto-refresh
  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initialize and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial fetch
    fetchMetrics(true);
    
    // Start auto-refresh
    if (enableAutoRefresh) {
      startAutoRefresh();
    }

    return () => {
      isMountedRef.current = false;
      stopAutoRefresh();
    };
  }, [fetchMetrics, enableAutoRefresh, startAutoRefresh, stopAutoRefresh]);

  // Update interval when refreshInterval changes
  useEffect(() => {
    if (enableAutoRefresh) {
      stopAutoRefresh();
      startAutoRefresh();
    }
  }, [refreshInterval, enableAutoRefresh, startAutoRefresh, stopAutoRefresh]);

  // Get all metrics as array for easier rendering
  const getAllMetrics = (): SystemMetricData[] => {
    return [metrics.cpu, metrics.memory, metrics.disk, metrics.network]
      .filter((metric): metric is SystemMetricData => metric !== null);
  };

  // Get system health summary
  const getSystemHealthSummary = () => {
    const allMetrics = getAllMetrics();
    const critical = allMetrics.filter(m => m.status === 'critical').length;
    const warnings = allMetrics.filter(m => m.status === 'warning').length;
    const normal = allMetrics.filter(m => m.status === 'normal').length;

    return {
      total: allMetrics.length,
      critical,
      warnings,
      normal,
      overallStatus: critical > 0 ? 'critical' : warnings > 0 ? 'warning' : 'normal'
    };
  };

  // Get metrics for widget display
  const getMetricsForWidget = () => {
    return getAllMetrics().map(metric => ({
      name: metric.name,
      value: typeof metric.value === 'number' 
        ? `${metric.value}${metric.unit || ''}` 
        : metric.value,
      trend: metric.trend,
      icon: metric.icon,
      color: metric.color,
      status: metric.status
    }));
  };

  return {
    // Individual metrics
    cpu: metrics.cpu,
    memory: metrics.memory,
    disk: metrics.disk,
    network: metrics.network,
    
    // All metrics
    allMetrics: getAllMetrics(),
    metricsForWidget: getMetricsForWidget(),
    
    // State
    isLoading: metrics.isLoading,
    error: metrics.error,
    lastUpdated: metrics.lastUpdated,
    isConnected: metrics.isConnected,
    
    // Historical data (if enabled)
    historicalData: includeHistoricalData ? historicalData : null,
    
    // Summary
    healthSummary: getSystemHealthSummary(),
    
    // Control functions
    refresh,
    startAutoRefresh,
    stopAutoRefresh,
    
    // Utility functions
    isHealthy: getSystemHealthSummary().overallStatus === 'normal',
    hasWarnings: getSystemHealthSummary().warnings > 0,
    hasCriticalIssues: getSystemHealthSummary().critical > 0,
    
    // Configuration
    refreshInterval,
    isAutoRefreshEnabled: enableAutoRefresh
  };
};

export default useSystemMetrics;