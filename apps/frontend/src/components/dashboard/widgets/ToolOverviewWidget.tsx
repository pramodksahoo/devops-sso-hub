import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ExternalLink, 
  Settings, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Minus
} from 'lucide-react';
import { useTool } from '../../../contexts/ToolContext';
// import { useSimplePermissions } from '../../../contexts/SimplePermissionContext'; // Available if needed
import { Badge } from '../../ui';
import { cn } from '../../../lib/utils';

interface ToolOverviewData {
  totalTools: number;
  configuredTools: number;
  activeTools: number;
  errorTools: number;
  recentActivity: Array<{
    id: string;
    name: string;
    action: string;
    timestamp: Date;
    status: 'success' | 'warning' | 'error';
  }>;
  trends: {
    tools: 'up' | 'down' | 'stable';
    usage: 'up' | 'down' | 'stable';
    errors: 'up' | 'down' | 'stable';
  };
}

interface ToolOverviewWidgetProps {
  onNavigate?: (view: string) => void;
  className?: string;
}

export const ToolOverviewWidget: React.FC<ToolOverviewWidgetProps> = ({
  onNavigate,
  className = ""
}) => {
  const { tools } = useTool();
  // const { canAccess } = usePermissions(); // Simplified - removed permission checks
  const [data, setData] = useState<ToolOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadToolOverview = async () => {
      setIsLoading(true);
      try {
        // Calculate tool statistics
        const totalTools = tools.length;
        const configuredTools = tools.filter(tool => tool.hasAccess).length;
        const activeTools = tools.filter(tool => tool.status === 'available').length;
        const errorTools = tools.filter(tool => tool.status === 'maintenance').length;

        // Mock recent activity (replace with real data)
        const recentActivity = [
          {
            id: '1',
            name: 'Jenkins',
            action: 'Configuration updated',
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            status: 'success' as const
          },
          {
            id: '2',
            name: 'GitLab',
            action: 'Health check failed',
            timestamp: new Date(Date.now() - 15 * 60 * 1000),
            status: 'error' as const
          },
          {
            id: '3',
            name: 'Grafana',
            action: 'User access granted',
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            status: 'success' as const
          }
        ];

        setData({
          totalTools,
          configuredTools,
          activeTools,
          errorTools,
          recentActivity,
          trends: {
            tools: totalTools > 5 ? 'up' : 'stable',
            usage: 'up',
            errors: errorTools > 0 ? 'up' : 'stable'
          }
        });
      } catch (error) {
        console.error('Failed to load tool overview:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadToolOverview();
  }, [tools]);

  if (isLoading) {
    return (
      <div className={cn("widget-loading h-full", className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded"></div>
            <div className="h-3 bg-muted rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cn("flex items-center justify-center h-full text-muted-foreground", className)}>
        Failed to load tool overview
      </div>
    );
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'down':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusIcon = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-error" />;
    }
  };

  return (
    <div className={cn("tool-overview-widget h-full", className)}>
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="metric-card p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-primary">Total</span>
            {getTrendIcon(data.trends.tools)}
          </div>
          <div className="text-2xl font-bold text-primary">{data.totalTools}</div>
          <div className="text-xs text-muted-foreground">Tools available</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="metric-card p-3 bg-gradient-to-r from-success/5 to-success/10 rounded-lg border border-success/20"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-success">Active</span>
            <Activity className="w-4 h-4 text-success" />
          </div>
          <div className="text-2xl font-bold text-success">{data.activeTools}</div>
          <div className="text-xs text-muted-foreground">Currently running</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="metric-card p-3 bg-gradient-to-r from-warning/5 to-warning/10 rounded-lg border border-warning/20"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-warning">Configured</span>
            <Settings className="w-4 h-4 text-warning" />
          </div>
          <div className="text-2xl font-bold text-warning">{data.configuredTools}</div>
          <div className="text-xs text-muted-foreground">Ready to use</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={cn(
            "metric-card p-3 rounded-lg border",
            data.errorTools > 0 
              ? "bg-gradient-to-r from-error/5 to-error/10 border-error/20"
              : "bg-gradient-to-r from-muted/5 to-muted/10 border-muted/20"
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={cn(
              "text-xs font-medium",
              data.errorTools > 0 ? "text-error" : "text-muted-foreground"
            )}>
              Issues
            </span>
            <AlertTriangle className={cn(
              "w-4 h-4",
              data.errorTools > 0 ? "text-error" : "text-muted-foreground"
            )} />
          </div>
          <div className={cn(
            "text-2xl font-bold",
            data.errorTools > 0 ? "text-error" : "text-muted-foreground"
          )}>
            {data.errorTools}
          </div>
          <div className="text-xs text-muted-foreground">Need attention</div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-foreground">Recent Activity</h4>
          {true && (
            <button 
              onClick={() => onNavigate?.('audit')}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              View all
            </button>
          )}
        </div>

        <div className="space-y-2">
          {data.recentActivity.slice(0, 3).map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg transition-colors"
            >
              {getStatusIcon(activity.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {activity.name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {activity.action}
                  </Badge>
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatRelativeTime(activity.timestamp)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      {true && (
        <div className="quick-actions mt-4 pt-4 border-t border-border">
          <div className="flex space-x-2">
            <button 
              onClick={() => onNavigate?.('admin-tools')}
              className="flex-1 px-3 py-2 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Settings className="w-3 h-3 mr-1 inline" />
              Manage
            </button>
            <button 
              onClick={() => onNavigate?.('launchpad')}
              className="flex-1 px-3 py-2 text-xs bg-secondary text-secondary-foreground border border-border rounded-md hover:bg-secondary/80 transition-colors"
            >
              <ExternalLink className="w-3 h-3 mr-1 inline" />
              Launch
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for time formatting
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}