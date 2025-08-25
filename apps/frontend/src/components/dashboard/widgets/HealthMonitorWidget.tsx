import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Server, 
  Database, 
  Shield, 
  Wifi,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
// import { useSimplePermissions } from '../../../contexts/SimplePermissionContext'; // Available if needed
import { Badge } from '../../ui';
import { cn } from '../../../lib/utils';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  lastCheck: Date;
  responseTime?: number;
  uptime?: number;
  message?: string;
}

interface ServiceHealth {
  id: string;
  name: string;
  type: 'service' | 'database' | 'external' | 'infrastructure';
  health: HealthStatus;
  metrics?: {
    cpu?: number;
    memory?: number;
    connections?: number;
  };
}

interface HealthMonitorData {
  overallHealth: HealthStatus;
  services: ServiceHealth[];
  systemMetrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  alerts: Array<{
    id: string;
    service: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
    timestamp: Date;
  }>;
}

interface HealthMonitorWidgetProps {
  onNavigate?: (view: string) => void;
  enableRealTime?: boolean;
  className?: string;
}

export const HealthMonitorWidget: React.FC<HealthMonitorWidgetProps> = ({
  onNavigate,
  enableRealTime = true,
  className = ""
}) => {
  // const { canAccess } = usePermissions(); // Simplified - removed permission checks
  const [data, setData] = useState<HealthMonitorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchHealthData = async () => {
    try {
      // TODO: Replace with actual API call
      const mockData: HealthMonitorData = {
        overallHealth: {
          status: 'healthy',
          lastCheck: new Date(),
          responseTime: 45,
          uptime: 99.8,
          message: 'All systems operational'
        },
        services: [
          {
            id: 'auth-service',
            name: 'Authentication Service',
            type: 'service',
            health: {
              status: 'healthy',
              lastCheck: new Date(),
              responseTime: 23,
              uptime: 99.9
            },
            metrics: {
              cpu: 15,
              memory: 42,
              connections: 127
            }
          },
          {
            id: 'catalog-service',
            name: 'Catalog Service',
            type: 'service',
            health: {
              status: 'healthy',
              lastCheck: new Date(),
              responseTime: 31,
              uptime: 99.7
            },
            metrics: {
              cpu: 22,
              memory: 58,
              connections: 89
            }
          },
          {
            id: 'postgres-db',
            name: 'PostgreSQL Database',
            type: 'database',
            health: {
              status: 'degraded',
              lastCheck: new Date(),
              responseTime: 156,
              uptime: 98.5,
              message: 'High response time detected'
            },
            metrics: {
              cpu: 78,
              memory: 85,
              connections: 45
            }
          },
          {
            id: 'keycloak',
            name: 'Keycloak',
            type: 'external',
            health: {
              status: 'healthy',
              lastCheck: new Date(),
              responseTime: 67,
              uptime: 99.5
            }
          }
        ],
        systemMetrics: {
          cpu: 35,
          memory: 67,
          disk: 43,
          network: 12
        },
        alerts: [
          {
            id: '1',
            service: 'PostgreSQL Database',
            message: 'High CPU usage detected (>75%)',
            severity: 'warning',
            timestamp: new Date(Date.now() - 10 * 60 * 1000)
          },
          {
            id: '2',
            service: 'Network',
            message: 'Increased latency to external services',
            severity: 'info',
            timestamp: new Date(Date.now() - 25 * 60 * 1000)
          }
        ]
      };

      setData(mockData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();

    if (enableRealTime) {
      const interval = setInterval(fetchHealthData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [enableRealTime]);

  const getStatusColor = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-success border-success/20 bg-success/5';
      case 'degraded':
        return 'text-warning border-warning/20 bg-warning/5';
      case 'critical':
        return 'text-error border-error/20 bg-error/5';
      default:
        return 'text-muted-foreground border-muted/20 bg-muted/5';
    }
  };

  const getStatusIcon = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4" />;
      case 'critical':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getServiceIcon = (type: ServiceHealth['type']) => {
    switch (type) {
      case 'service':
        return <Server className="w-4 h-4" />;
      case 'database':
        return <Database className="w-4 h-4" />;
      case 'external':
        return <Wifi className="w-4 h-4" />;
      case 'infrastructure':
        return <Shield className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getMetricColor = (value: number, type: 'cpu' | 'memory' | 'disk' | 'network') => {
    const thresholds = {
      cpu: { warning: 70, critical: 85 },
      memory: { warning: 75, critical: 90 },
      disk: { warning: 80, critical: 95 },
      network: { warning: 50, critical: 75 }
    };

    const threshold = thresholds[type];
    if (value >= threshold.critical) return 'text-error';
    if (value >= threshold.warning) return 'text-warning';
    return 'text-success';
  };

  if (isLoading) {
    return (
      <div className={cn("widget-loading h-full", className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-muted rounded"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                  <div className="h-2 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cn("flex items-center justify-center h-full text-muted-foreground", className)}>
        Failed to load health data
      </div>
    );
  }

  return (
    <div className={cn("health-monitor-widget h-full", className)}>
      {/* Overall Status */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "overall-status p-3 rounded-lg border mb-4",
          getStatusColor(data.overallHealth.status)
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {getStatusIcon(data.overallHealth.status)}
            <span className="font-medium">System Health</span>
          </div>
          <Badge 
            variant="outline" 
            className={cn("text-xs", getStatusColor(data.overallHealth.status))}
          >
            {data.overallHealth.status.toUpperCase()}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Uptime:</span>
            <span className="ml-1 font-medium">{data.overallHealth.uptime}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">Response:</span>
            <span className="ml-1 font-medium">{data.overallHealth.responseTime}ms</span>
          </div>
        </div>
        
        {data.overallHealth.message && (
          <p className="text-xs mt-2 opacity-80">{data.overallHealth.message}</p>
        )}
      </motion.div>

      {/* System Metrics */}
      <div className="system-metrics mb-4">
        <h4 className="text-sm font-medium mb-2">System Metrics</h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(data.systemMetrics).map(([key, value], index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="metric-item p-2 bg-muted/50 rounded"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground capitalize">{key}</span>
                <span className={cn("text-xs font-medium", getMetricColor(value, key as any))}>
                  {value}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1">
                <div 
                  className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    value >= 85 ? 'bg-error' : value >= 70 ? 'bg-warning' : 'bg-success'
                  )}
                  style={{ width: `${value}%` }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Services Status */}
      <div className="services-status mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">Services</h4>
          {true && (
            <button 
              onClick={() => onNavigate?.('health')}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              View details
            </button>
          )}
        </div>
        
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {data.services.slice(0, 4).map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded transition-colors"
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {getServiceIcon(service.type)}
                <span className="text-xs text-foreground truncate">{service.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className={cn("w-2 h-2 rounded-full", {
                  'bg-success': service.health.status === 'healthy',
                  'bg-warning': service.health.status === 'degraded',
                  'bg-error': service.health.status === 'critical',
                  'bg-muted': service.health.status === 'unknown'
                })} />
                {service.health.responseTime && (
                  <span className="text-xs text-muted-foreground">
                    {service.health.responseTime}ms
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Alerts */}
      {data.alerts.length > 0 && (
        <div className="recent-alerts">
          <h4 className="text-sm font-medium mb-2">Recent Alerts</h4>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {data.alerts.slice(0, 2).map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="alert-item p-2 rounded text-xs"
              >
                <div className="flex items-start space-x-2">
                  <div className={cn("w-2 h-2 rounded-full mt-1", {
                    'bg-blue-500': alert.severity === 'info',
                    'bg-warning': alert.severity === 'warning',
                    'bg-error': alert.severity === 'error'
                  })} />
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground font-medium truncate">{alert.service}</div>
                    <div className="text-muted-foreground">{alert.message}</div>
                    <div className="text-muted-foreground/80 mt-1">
                      {formatRelativeTime(alert.timestamp)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Last Update */}
      <div className="mt-4 pt-2 border-t border-border text-xs text-muted-foreground text-center">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  );
};

// Helper function for time formatting
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}