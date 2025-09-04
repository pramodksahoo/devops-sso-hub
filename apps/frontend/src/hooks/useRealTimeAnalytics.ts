import { useState, useEffect, useCallback, useRef } from 'react';
import { analyticsService, UserActivityData, ToolUsageStats, UserBehaviorAnalytics } from '../services/api/analyticsService';

interface RealTimeAnalyticsData {
  userActivity: UserActivityData | null;
  toolUsage: ToolUsageStats[];
  userBehavior: UserBehaviorAnalytics | null;
  realTimeMetrics: {
    activeUsers: number;
    newSignups: number;
    averageSession: string;
    toolAdoption: number;
    weeklyTrend: number[];
  } | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface UseRealTimeAnalyticsOptions {
  refreshInterval?: number; // in milliseconds, default 60000 (1min)
  enableAutoRefresh?: boolean;
  timeRange?: '1h' | '24h' | '7d' | '30d';
  includeUserBehavior?: boolean;
}

export const useRealTimeAnalytics = (options: UseRealTimeAnalyticsOptions = {}) => {
  const {
    refreshInterval = 60000,
    enableAutoRefresh = true,
    timeRange = '24h',
    includeUserBehavior = true
  } = options;

  // State management
  const [data, setData] = useState<RealTimeAnalyticsData>({
    userActivity: null,
    toolUsage: [],
    userBehavior: null,
    realTimeMetrics: null,
    isConnected: false,
    isLoading: true,
    error: null,
    lastUpdated: null
  });

  // Refs for cleanup and control
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      // Prepare promises for parallel fetching
      const promises = [
        analyticsService.getUserActivityData(timeRange),
        analyticsService.getToolUsageStats(timeRange),
        analyticsService.getRealTimeMetrics()
      ];

      // Add user behavior analytics if requested
      if (includeUserBehavior) {
        promises.push(analyticsService.getUserBehaviorAnalytics());
      }

      // Fetch all data in parallel
      const results = await Promise.all(promises);
      
      const [userActivityData, toolUsageData, realTimeMetricsData, userBehaviorData] = results;

      if (isMountedRef.current) {
        setData(prev => ({
          ...prev,
          userActivity: userActivityData as UserActivityData,
          toolUsage: toolUsageData as ToolUsageStats[],
          realTimeMetrics: realTimeMetricsData as any,
          userBehavior: includeUserBehavior ? (userBehaviorData as UserBehaviorAnalytics) : null,
          isConnected: true,
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        }));
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      
      if (isMountedRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch analytics data';
        
        setData(prev => ({
          ...prev,
          isConnected: false,
          isLoading: false,
          error: errorMessage
        }));
      }
    }
  }, [timeRange, includeUserBehavior]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchAnalyticsData(true);
  }, [fetchAnalyticsData]);

  // Start auto-refresh
  const startAutoRefresh = useCallback(() => {
    if (enableAutoRefresh && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        fetchAnalyticsData(false);
      }, refreshInterval);
    }
  }, [enableAutoRefresh, refreshInterval, fetchAnalyticsData]);

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
    
    // Initial data fetch
    fetchAnalyticsData(true);
    
    // Start auto-refresh
    if (enableAutoRefresh) {
      startAutoRefresh();
    }

    return () => {
      isMountedRef.current = false;
      stopAutoRefresh();
    };
  }, [fetchAnalyticsData, enableAutoRefresh, startAutoRefresh, stopAutoRefresh]);

  // Update interval when options change
  useEffect(() => {
    if (enableAutoRefresh) {
      stopAutoRefresh();
      startAutoRefresh();
    }
  }, [refreshInterval, enableAutoRefresh, startAutoRefresh, stopAutoRefresh]);

  // Refetch when timeRange changes
  useEffect(() => {
    fetchAnalyticsData(true);
  }, [timeRange, includeUserBehavior, fetchAnalyticsData]);

  // Derived analytics and insights
  const analyticsInsights = {
    // User metrics
    userGrowthRate: data.userActivity?.userGrowth && data.userActivity.userGrowth.length >= 2
      ? Math.round(((data.userActivity.userGrowth[data.userActivity.userGrowth.length - 1].users - 
                   data.userActivity.userGrowth[data.userActivity.userGrowth.length - 2].users) / 
                   data.userActivity.userGrowth[data.userActivity.userGrowth.length - 2].users) * 100)
      : 0,
    
    // Tool insights
    mostPopularTool: data.toolUsage.length > 0 
      ? data.toolUsage.reduce((prev, current) => (prev.launches > current.launches) ? prev : current)
      : null,
    
    toolAdoptionRate: data.userActivity && data.toolUsage.length > 0
      ? Math.round((data.toolUsage.reduce((acc, tool) => acc + tool.uniqueUsers, 0) / 
                   (data.userActivity.totalUsers * data.toolUsage.length)) * 100)
      : 0,

    // Engagement metrics
    avgSessionDuration: data.userActivity?.averageSessionDuration || 0,
    engagementTrend: data.userActivity?.sessionData && data.userActivity.sessionData.length >= 2
      ? data.userActivity.sessionData[data.userActivity.sessionData.length - 1].duration > 
        data.userActivity.sessionData[data.userActivity.sessionData.length - 2].duration ? 'up' : 'down'
      : 'stable',

    // User behavior insights
    peakUsageHour: data.userBehavior?.loginPatterns && data.userBehavior.loginPatterns.length > 0
      ? data.userBehavior.loginPatterns.reduce((prev, current) => (prev.count > current.count) ? prev : current).hour
      : null,
    
    // Health indicators
    isHealthy: data.userActivity ? data.userActivity.activeUsers > 0 : false,
    hasGrowth: data.userActivity?.userGrowth && data.userActivity.userGrowth.length >= 2
      ? data.userActivity.userGrowth[data.userActivity.userGrowth.length - 1].users > 
        data.userActivity.userGrowth[data.userActivity.userGrowth.length - 2].users
      : false
  };

  // Get formatted analytics summary for widgets
  const getAnalyticsSummary = () => {
    if (!data.userActivity || !data.realTimeMetrics) return null;

    return {
      activeUsers: {
        value: data.realTimeMetrics.activeUsers,
        change: data.userActivity.userGrowth.length >= 2 
          ? data.userActivity.userGrowth[data.userActivity.userGrowth.length - 1].users - 
            data.userActivity.userGrowth[data.userActivity.userGrowth.length - 2].users
          : 0,
        trend: analyticsInsights.hasGrowth ? 'up' : 'down'
      },
      newSignups: {
        value: data.realTimeMetrics.newSignups,
        period: 'this week'
      },
      sessionDuration: {
        value: data.realTimeMetrics.averageSession,
        trend: analyticsInsights.engagementTrend
      },
      toolAdoption: {
        value: data.realTimeMetrics.toolAdoption,
        description: 'adoption rate'
      },
      weeklyTrend: data.realTimeMetrics.weeklyTrend
    };
  };

  // Export function
  const exportData = useCallback(async (format: 'csv' | 'json' = 'csv') => {
    try {
      const exportedData = await analyticsService.exportAnalyticsData(format, timeRange);
      return exportedData;
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      throw error;
    }
  }, [timeRange]);

  return {
    // Core data
    ...data,
    
    // Analytics insights
    analyticsInsights,
    analyticsSummary: getAnalyticsSummary(),
    
    // Control functions
    refresh,
    startAutoRefresh,
    stopAutoRefresh,
    exportData,
    
    // Utility functions
    isHealthy: analyticsInsights.isHealthy,
    hasGrowth: analyticsInsights.hasGrowth,
    
    // Connection status
    connectionStatus: data.isConnected ? 'connected' : data.error ? 'error' : 'connecting',
    
    // Configuration
    currentTimeRange: timeRange,
    refreshInterval
  };
};

export default useRealTimeAnalytics;