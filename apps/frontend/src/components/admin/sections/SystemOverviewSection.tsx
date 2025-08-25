import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Server, Activity, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { LoadingMetric } from '../shared/LoadingStates';
import { MetricCard } from '../shared/Card';

interface SystemOverviewProps {
  onNavigate?: (view: string) => void;
}

interface MetricCard {
  title: string;
  value: string | number;
  previousValue: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
  description: string;
}

export const SystemOverviewSection: React.FC<SystemOverviewProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch real-time system overview metrics
    const fetchMetrics = async () => {
      try {
        // TODO: Replace with actual API calls to analytics and health services
        const mockMetrics: MetricCard[] = [
          {
            title: 'Total Users',
            value: '2,847',
            previousValue: 2650,
            trend: 'up',
            trendPercentage: 7.4,
            icon: Users,
            color: 'text-blue-600',
            bgGradient: 'from-blue-500 to-blue-600',
            description: 'Registered users in system'
          },
          {
            title: 'Active Tools',
            value: '12',
            previousValue: 10,
            trend: 'up',
            trendPercentage: 20,
            icon: Server,
            color: 'text-green-600',
            bgGradient: 'from-green-500 to-emerald-600',
            description: 'Connected DevOps tools'
          },
          {
            title: 'Live Sessions',
            value: '387',
            previousValue: 421,
            trend: 'down',
            trendPercentage: 8.1,
            icon: Activity,
            color: 'text-purple-600',
            bgGradient: 'from-purple-500 to-indigo-600',
            description: 'Current active sessions'
          },
          {
            title: 'Critical Alerts',
            value: '3',
            previousValue: 7,
            trend: 'down',
            trendPercentage: 57.1,
            icon: AlertTriangle,
            color: 'text-orange-600',
            bgGradient: 'from-orange-500 to-red-600',
            description: 'Alerts requiring attention'
          }
        ];

        setMetrics(mockMetrics);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch system overview metrics:', error);
        setIsLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? TrendingUp : TrendingDown;
  };

  const getTrendColor = (trend: string) => {
    return trend === 'up' ? 'text-green-500' : 'text-red-500';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">System Overview</h2>
          <p className="text-gray-600">Loading system metrics...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <LoadingMetric count={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">System Overview</h2>
          <p className="text-gray-600 mt-1">Key performance indicators and system health metrics</p>
        </div>
        <button 
          onClick={() => onNavigate?.('analytics')}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          View Detailed Analytics →
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon;
          const TrendIconComponent = getTrendIcon(metric.trend);

          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/80 backdrop-blur-sm rounded-xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100/60 hover:border-gray-200"
            >
              {/* Header with icon and trend */}
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${metric.bgGradient} shadow-sm`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
                <div className={`flex items-center space-x-1 ${getTrendColor(metric.trend)}`}>
                  <TrendIconComponent className="h-4 w-4" />
                  <span className="text-sm font-medium">{metric.trendPercentage}%</span>
                </div>
              </div>

              {/* Main metric */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
                <div className="text-3xl font-bold text-gray-900">{metric.value}</div>
                <p className="text-sm text-gray-500">{metric.description}</p>
              </div>

              {/* Trend comparison */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>vs. last period</span>
                  <span className={getTrendColor(metric.trend)}>
                    {metric.trend === 'up' ? '+' : '-'}{Math.abs(metric.value as number - metric.previousValue)} 
                    ({metric.trendPercentage}%)
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Summary Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-4 md:p-6 text-white shadow-xl border border-white/20"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <h3 className="text-lg font-semibold mb-2">System Health: Excellent</h3>
            <p className="text-blue-100">
              All critical systems operational • {metrics.find(m => m.title === 'Active Tools')?.value} tools connected • 
              {metrics.find(m => m.title === 'Live Sessions')?.value} active user sessions
            </p>
          </div>
          <div className="flex items-center space-x-4 justify-center md:justify-start">
            <div className="text-center md:text-right">
              <div className="text-xl md:text-2xl font-bold">99.8%</div>
              <div className="text-sm text-blue-200">Uptime</div>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Activity className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SystemOverviewSection;