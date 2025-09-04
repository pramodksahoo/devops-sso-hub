import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Database, Cpu, HardDrive, Zap, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui';
import { useSystemMetrics } from '../../../hooks/useSystemMetrics';

// Icon mapping
const iconMap = {
  cpu: Cpu,
  database: Database,
  harddrive: HardDrive,
  zap: Zap
};

export const SystemMetricsWidget: React.FC = () => {
  const { 
    metricsForWidget, 
    isLoading, 
    error, 
    lastUpdated, 
    isConnected,
    healthSummary,
    refresh
  } = useSystemMetrics({
    refreshInterval: 15000, // 15 seconds
    enableAutoRefresh: true,
    includeHistoricalData: false
  });

  // Show loading state
  if (isLoading && metricsForWidget.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2 text-base">
            <Activity className="h-4 w-4" />
            <span>System Metrics</span>
          </CardTitle>
          <CardDescription className="text-sm">
            Loading system performance data...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error && metricsForWidget.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2 text-base">
            <Activity className="h-4 w-4" />
            <span>System Metrics</span>
          </CardTitle>
          <CardDescription className="text-sm">
            Failed to load system metrics
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

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-500';
      case 'down': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-base">
          <Activity className="h-4 w-4" />
          <span>System Metrics</span>
        </CardTitle>
        <CardDescription className="text-sm">
          Real-time system performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {metricsForWidget.map((metric, index) => {
            const IconComponent = iconMap[metric.icon as keyof typeof iconMap] || Activity;
            
            return (
              <motion.div
                key={metric.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 bg-gradient-to-br from-gray-50 to-white rounded-lg border ${
                  metric.status === 'critical' ? 'border-red-200 bg-red-50' :
                  metric.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                  'border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <IconComponent className={`h-4 w-4 ${metric.color}`} />
                  <div className={`text-xs ${getTrendColor(metric.trend)}`}>
                    {metric.trend === 'up' && '↗'}
                    {metric.trend === 'down' && '↘'}
                    {metric.trend === 'stable' && '→'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-sm">{metric.value}</div>
                  <div className="text-xs text-gray-500">{metric.name}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {/* System Health Summary */}
        {healthSummary && (
          <div className="mt-3 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${
                healthSummary.overallStatus === 'critical' ? 'text-red-600' :
                healthSummary.overallStatus === 'warning' ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {healthSummary.overallStatus === 'critical' ? '⚠️ Critical' :
                 healthSummary.overallStatus === 'warning' ? '⚡ Warning' :
                 '✅ All systems normal'}
              </span>
              <span className="text-gray-500">
                {healthSummary.critical > 0 && `${healthSummary.critical} critical `}
                {healthSummary.warnings > 0 && `${healthSummary.warnings} warnings`}
              </span>
            </div>
          </div>
        )}

        <div className="mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {!isConnected && <span className="text-red-500">● Offline </span>}
              Last updated: {lastUpdated ? 
                Math.round((Date.now() - lastUpdated.getTime()) / 1000) + 's ago' : 
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

export default SystemMetricsWidget;