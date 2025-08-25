import React from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { useRealTimeAnalytics } from '../../../hooks/useRealTimeAnalytics';

export const UserAnalyticsSection: React.FC = () => {
  const { 
    analyticsSummary, 
    analyticsInsights,
    isLoading, 
    error, 
    lastUpdated,
    isConnected
  } = useRealTimeAnalytics({
    refreshInterval: 60000,
    enableAutoRefresh: true,
    timeRange: '24h'
  });

  if (isLoading && !analyticsSummary) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">User Analytics</h2>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-red-200 text-center">
        <BarChart3 className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Error</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (!analyticsSummary) return null;

  const metrics = [
    {
      title: 'Active Users',
      value: analyticsSummary.activeUsers.value,
      change: analyticsSummary.activeUsers.change,
      trend: analyticsSummary.activeUsers.trend,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'New Sign-ups',
      value: analyticsSummary.newSignups.value,
      period: analyticsSummary.newSignups.period,
      trend: 'up',
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Avg Session',
      value: analyticsSummary.sessionDuration.value,
      trend: analyticsSummary.sessionDuration.trend,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Tool Adoption',
      value: `${analyticsSummary.toolAdoption.value}%`,
      description: analyticsSummary.toolAdoption.description,
      trend: 'stable',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">User Analytics</h2>
          <p className="text-gray-600 mt-1">User engagement metrics and activity insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-500">
            Updated: {lastUpdated ? Math.round((Date.now() - lastUpdated.getTime()) / 60000) + 'm ago' : 'Never'}
          </span>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon;
          
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                  <IconComponent className={`h-5 w-5 ${metric.color}`} />
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  metric.trend === 'up' ? 'bg-green-100 text-green-600' :
                  metric.trend === 'down' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {metric.trend === 'up' && '↗'}
                  {metric.trend === 'down' && '↘'}
                  {metric.trend === 'stable' && '→'}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{metric.title}</h3>
                <div className="text-2xl font-bold text-gray-900 mb-2">{metric.value}</div>
                <p className="text-xs text-gray-500">
                  {metric.change ? `${metric.change > 0 ? '+' : ''}${metric.change} today` :
                   metric.period ? metric.period :
                   metric.description || 'Current period'}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Weekly Trend Chart */}
      {analyticsSummary.weeklyTrend && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Weekly Activity Trend</h3>
            <div className="text-sm text-gray-500">Last 7 days</div>
          </div>
          
          <div className="flex items-end justify-between h-32 space-x-2">
            {analyticsSummary.weeklyTrend.map((height, index) => (
              <motion.div
                key={index}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
                className="flex-1 bg-gradient-to-t from-blue-400 to-blue-500 rounded-t-md min-h-[8px]"
              />
            ))}
          </div>
          
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <span key={day}>{day}</span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Growth Summary */}
      {analyticsInsights && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className={`rounded-xl p-6 text-white ${
            analyticsInsights.hasGrowth 
              ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
              : 'bg-gradient-to-r from-gray-500 to-gray-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {analyticsInsights.hasGrowth ? '📈 Growing User Base' : '📊 Stable Activity'}
              </h3>
              <p className="text-sm opacity-90">
                User growth: {analyticsInsights.userGrowthRate > 0 ? '+' : ''}{analyticsInsights.userGrowthRate}% • 
                Engagement: {analyticsInsights.engagementTrend} • 
                Adoption: {analyticsInsights.toolAdoptionRate}%
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{analyticsInsights.userGrowthRate}%</div>
              <div className="text-sm opacity-75">Growth Rate</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default UserAnalyticsSection;