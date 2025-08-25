import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Database, HardDrive, Zap, Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import { useSystemMetrics } from '../../../hooks/useSystemMetrics';

export const SystemHealthSection: React.FC = () => {
  const { 
    allMetrics, 
    healthSummary,
    isLoading, 
    error, 
    lastUpdated, 
    isConnected,
    refresh
  } = useSystemMetrics({
    refreshInterval: 15000, // 15 seconds
    enableAutoRefresh: true,
    includeHistoricalData: true
  });

  // Icon mapping for metrics
  const iconMap = {
    'CPU Usage': Cpu,
    'Memory': Database,
    'Disk I/O': HardDrive,
    'Network': Zap
  };

  // Loading state
  if (isLoading && allMetrics.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">System Health & Metrics</h2>
          <p className="text-gray-600">Loading system performance data...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && allMetrics.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">System Health & Metrics</h2>
          <p className="text-red-600">Failed to load system metrics</p>
        </div>
        <div className="bg-white rounded-xl p-8 shadow-sm border border-red-200 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Metrics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const getProgressPercentage = (metric: any) => {
    if (metric.name === 'CPU Usage') return parseFloat(metric.value);
    if (metric.name === 'Memory') return (parseFloat(metric.value) / 8) * 100; // Assuming 8GB max
    if (metric.name === 'Disk I/O') return Math.min((parseFloat(metric.value) / 300) * 100, 100); // 300MB/s max
    if (metric.name === 'Network') return Math.min((parseFloat(metric.value) / 100) * 100, 100); // 100Mbps max
    return 0;
  };

  const getProgressColor = (percentage: number, status: string) => {
    if (status === 'critical') return 'bg-red-500';
    if (status === 'warning') return 'bg-yellow-500';
    if (percentage > 80) return 'bg-orange-500';
    if (percentage > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'critical') return { color: 'bg-red-100 text-red-800', label: 'Critical' };
    if (status === 'warning') return { color: 'bg-yellow-100 text-yellow-800', label: 'Warning' };
    return { color: 'bg-green-100 text-green-800', label: 'Normal' };
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">System Health & Metrics</h2>
          <p className="text-gray-600 mt-1">Real-time performance monitoring and resource utilization</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Updated: {lastUpdated ? 
              Math.round((Date.now() - lastUpdated.getTime()) / 1000) + 's ago' : 
              'Never'
            }
          </div>
        </div>
      </div>

      {/* Health Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Overall System Health</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            healthSummary.overallStatus === 'critical' ? 'bg-red-100 text-red-800' :
            healthSummary.overallStatus === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {healthSummary.overallStatus === 'critical' ? 'Critical Issues' :
             healthSummary.overallStatus === 'warning' ? 'Warning Status' :
             'All Systems Normal'}
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{healthSummary.normal}</div>
            <div className="text-sm text-gray-600">Normal</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{healthSummary.warnings}</div>
            <div className="text-sm text-gray-600">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{healthSummary.critical}</div>
            <div className="text-sm text-gray-600">Critical</div>
          </div>
        </div>
      </motion.div>

      {/* Individual Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {allMetrics.map((metric, index) => {
          const IconComponent = iconMap[metric.name as keyof typeof iconMap] || Activity;
          const percentage = getProgressPercentage(metric);
          const statusBadge = getStatusBadge(metric.status);
          const progressColor = getProgressColor(percentage, metric.status);

          return (
            <motion.div
              key={metric.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white rounded-xl p-4 md:p-6 shadow-sm border transition-all duration-300 hover:shadow-md ${
                metric.status === 'critical' ? 'border-red-200 bg-red-50' :
                metric.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${
                  metric.status === 'critical' ? 'bg-red-100' :
                  metric.status === 'warning' ? 'bg-yellow-100' :
                  'bg-blue-100'
                }`}>
                  <IconComponent className={`h-5 w-5 ${
                    metric.status === 'critical' ? 'text-red-600' :
                    metric.status === 'warning' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`} />
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                  {statusBadge.label}
                </div>
              </div>

              {/* Metric Value */}
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-medium text-gray-600">{metric.name}</h3>
                <div className="text-2xl font-bold text-gray-900">
                  {typeof metric.value === 'number' ? 
                    `${metric.value}${metric.unit || ''}` : 
                    metric.value
                  }
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Usage</span>
                  <span>{percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-2 rounded-full ${progressColor}`}
                  />
                </div>
              </div>

              {/* Trend Indicator */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Trend</span>
                  <div className={`flex items-center space-x-1 ${
                    metric.trend === 'up' ? 'text-red-500' : 
                    metric.trend === 'down' ? 'text-green-500' : 
                    'text-gray-500'
                  }`}>
                    <span>
                      {metric.trend === 'up' && '↗'}
                      {metric.trend === 'down' && '↘'}
                      {metric.trend === 'stable' && '→'}
                    </span>
                    <span className="font-medium">
                      {metric.trend === 'stable' ? 'Stable' : 
                       metric.trend === 'up' ? 'Increasing' : 'Decreasing'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Services Status Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Service Status</h3>
          <button 
            onClick={refresh}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Refresh Status
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {[
            { name: 'Auth-BFF', status: 'healthy', uptime: '99.9%' },
            { name: 'Catalog', status: 'healthy', uptime: '99.7%' },
            { name: 'Analytics', status: 'warning', uptime: '98.5%' },
            { name: 'Audit', status: 'healthy', uptime: '99.8%' },
            { name: 'Tools-Health', status: 'healthy', uptime: '99.9%' },
            { name: 'User-Service', status: 'healthy', uptime: '99.6%' }
          ].map((service, index) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + index * 0.05 }}
              className="text-center p-2 md:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                service.status === 'healthy' ? 'bg-green-500' : 
                service.status === 'warning' ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}></div>
              <div className="text-sm font-medium text-gray-900">{service.name}</div>
              <div className="text-xs text-gray-500">{service.uptime}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default SystemHealthSection;