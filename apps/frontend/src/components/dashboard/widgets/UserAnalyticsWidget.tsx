import React from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, Clock, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui';
import { useRealTimeAnalytics } from '../../../hooks/useRealTimeAnalytics';

export const UserAnalyticsWidget: React.FC = () => {
  const { 
    analyticsSummary, 
    isLoading, 
    error, 
    lastUpdated, 
    isConnected,
    analyticsInsights,
    refresh
  } = useRealTimeAnalytics({
    refreshInterval: 60000, // 1 minute
    enableAutoRefresh: true,
    timeRange: '24h',
    includeUserBehavior: false
  });

  // Show loading state
  if (isLoading && !analyticsSummary) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2 text-base">
            <TrendingUp className="h-4 w-4" />
            <span>User Analytics</span>
          </CardTitle>
          <CardDescription className="text-sm">
            Loading analytics data...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error && !analyticsSummary) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2 text-base">
            <TrendingUp className="h-4 w-4" />
            <span>User Analytics</span>
          </CardTitle>
          <CardDescription className="text-sm">
            Failed to load analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-32 space-y-2">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <p className="text-sm text-gray-500 text-center">{error}</p>
          <button 
            onClick={refresh}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Try Again
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!analyticsSummary) return null;

  // Map the real data to analytics format
  const analytics = [
    {
      label: 'Active Users',
      value: analyticsSummary.activeUsers.value,
      subValue: analyticsSummary.activeUsers.change > 0 ? 
        `+${analyticsSummary.activeUsers.change} today` : 
        `${analyticsSummary.activeUsers.change} today`,
      trend: analyticsSummary.activeUsers.trend,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      label: 'New Sign-ups',
      value: analyticsSummary.newSignups.value,
      subValue: analyticsSummary.newSignups.period,
      trend: 'up' as const,
      icon: UserCheck,
      color: 'text-green-600'
    },
    {
      label: 'Avg Session',
      value: analyticsSummary.sessionDuration.value,
      subValue: `trending ${analyticsSummary.sessionDuration.trend}`,
      trend: analyticsSummary.sessionDuration.trend,
      icon: Clock,
      color: 'text-purple-600'
    },
    {
      label: 'Tool Usage',
      value: `${analyticsSummary.toolAdoption.value}%`,
      subValue: analyticsSummary.toolAdoption.description,
      trend: 'stable' as const,
      icon: TrendingUp,
      color: 'text-orange-600'
    }
  ];

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '➡️';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-base">
          <TrendingUp className="h-4 w-4" />
          <span>User Analytics</span>
        </CardTitle>
        <CardDescription className="text-sm">
          User engagement and activity metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {analytics.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg bg-gray-100 ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{item.label}</div>
                  {item.subValue && (
                    <div className="text-xs text-gray-500">{item.subValue}</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{item.value}</div>
                {item.trend && (
                  <div className="text-xs text-gray-400">
                    {getTrendIcon(item.trend)}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Weekly Trend Chart */}
        {analyticsSummary.weeklyTrend && (
          <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Weekly Trend</span>
              <span className="text-xs text-gray-500">Last 7 days</span>
            </div>
            <div className="flex items-end space-x-1 h-12">
              {analyticsSummary.weeklyTrend.map((height, index) => (
                <motion.div
                  key={index}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex-1 bg-gradient-to-t from-blue-400 to-blue-500 rounded-sm"
                />
              ))}
            </div>
          </div>
        )}

        {/* Analytics Insights */}
        {analyticsInsights && (
          <div className="mt-3 p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${analyticsInsights.hasGrowth ? 'text-green-600' : 'text-gray-600'}`}>
                {analyticsInsights.hasGrowth ? '📈 Growing' : '📊 Stable'}
              </span>
              <span className="text-gray-500">
                Growth: {analyticsInsights.userGrowthRate > 0 ? '+' : ''}{analyticsInsights.userGrowthRate}%
              </span>
            </div>
          </div>
        )}

        <div className="mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {!isConnected && <span className="text-red-500">● Offline </span>}
              Updated: {lastUpdated ? 
                Math.round((Date.now() - lastUpdated.getTime()) / 60000) + 'm ago' : 
                'Never'
              }
            </span>
            <span>Auto-refresh: {isConnected ? 'ON' : 'OFF'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserAnalyticsWidget;