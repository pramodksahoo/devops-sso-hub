import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Settings, 
  ExternalLink, 
  Shield, 
  Filter,
  RefreshCw,
  UserPlus,
  UserMinus,
  Key,
  AlertTriangle,
  CheckCircle,
  Eye
} from 'lucide-react';
// import { useAuth } from '../../../contexts/AuthContext'; // Available if needed
// import { useSimplePermissions } from '../../../contexts/SimplePermissionContext'; // Available if needed
import { Badge } from '../../ui';
import { cn } from '../../../lib/utils';

interface ActivityEvent {
  id: string;
  type: 'user' | 'system' | 'tool' | 'security' | 'audit';
  action: string;
  description: string;
  timestamp: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  target?: {
    type: string;
    name: string;
    id?: string;
  };
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, any>;
}

interface ActivityFeedData {
  events: ActivityEvent[];
  stats: {
    totalToday: number;
    userEvents: number;
    systemEvents: number;
    securityEvents: number;
  };
  filters: {
    types: string[];
    severities: string[];
  };
}

interface ActivityFeedWidgetProps {
  maxEvents?: number;
  enableFilters?: boolean;
  enableRealTime?: boolean;
  onNavigate?: (view: string) => void;
  className?: string;
}

export const ActivityFeedWidget: React.FC<ActivityFeedWidgetProps> = ({
  maxEvents = 10,
  enableFilters = true,
  enableRealTime = true,
  onNavigate,
  className = ""
}) => {
  // const { user } = useAuth(); // Available if needed for user-specific activity
  // const { canAccess } = usePermissions(); // Simplified - removed permission checks
  const [data, setData] = useState<ActivityFeedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState<{
    type?: string;
    severity?: string;
  }>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchActivityData = async () => {
    try {
      // TODO: Replace with actual API call
      const mockEvents: ActivityEvent[] = [
        {
          id: '1',
          type: 'user',
          action: 'login',
          description: 'User logged in successfully',
          timestamp: new Date(Date.now() - 2 * 60 * 1000),
          user: { id: '1', name: 'John Doe', email: 'john@company.com' },
          severity: 'success'
        },
        {
          id: '2',
          type: 'tool',
          action: 'launch',
          description: 'Launched Jenkins pipeline dashboard',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          user: { id: '2', name: 'Jane Smith', email: 'jane@company.com' },
          target: { type: 'tool', name: 'Jenkins', id: 'jenkins-prod' },
          severity: 'info'
        },
        {
          id: '3',
          type: 'security',
          action: 'permission_change',
          description: 'User permissions updated for GitLab access',
          timestamp: new Date(Date.now() - 8 * 60 * 1000),
          user: { id: '3', name: 'Admin User', email: 'admin@company.com' },
          target: { type: 'user', name: 'Bob Wilson' },
          severity: 'warning'
        },
        {
          id: '4',
          type: 'system',
          action: 'health_check',
          description: 'System health check completed successfully',
          timestamp: new Date(Date.now() - 12 * 60 * 1000),
          severity: 'success'
        },
        {
          id: '5',
          type: 'tool',
          action: 'configuration',
          description: 'Grafana OIDC configuration updated',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          user: { id: '3', name: 'Admin User', email: 'admin@company.com' },
          target: { type: 'tool', name: 'Grafana', id: 'grafana-main' },
          severity: 'info'
        },
        {
          id: '6',
          type: 'security',
          action: 'failed_login',
          description: 'Failed login attempt detected',
          timestamp: new Date(Date.now() - 20 * 60 * 1000),
          target: { type: 'user', name: 'unknown@external.com' },
          severity: 'error'
        }
      ];

      const mockData: ActivityFeedData = {
        events: mockEvents,
        stats: {
          totalToday: 47,
          userEvents: 23,
          systemEvents: 12,
          securityEvents: 8
        },
        filters: {
          types: ['user', 'system', 'tool', 'security', 'audit'],
          severities: ['info', 'success', 'warning', 'error']
        }
      };

      setData(mockData);
    } catch (error) {
      console.error('Failed to fetch activity data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivityData();

    if (enableRealTime) {
      const interval = setInterval(fetchActivityData, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [enableRealTime]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchActivityData();
  };

  const getEventIcon = (event: ActivityEvent) => {
    switch (event.type) {
      case 'user':
        switch (event.action) {
          case 'login':
            return <User className="w-4 h-4 text-success" />;
          case 'logout':
            return <User className="w-4 h-4 text-muted-foreground" />;
          case 'created':
            return <UserPlus className="w-4 h-4 text-success" />;
          case 'deleted':
            return <UserMinus className="w-4 h-4 text-error" />;
          default:
            return <User className="w-4 h-4 text-primary" />;
        }
      case 'tool':
        switch (event.action) {
          case 'launch':
            return <ExternalLink className="w-4 h-4 text-primary" />;
          case 'configuration':
            return <Settings className="w-4 h-4 text-warning" />;
          default:
            return <Settings className="w-4 h-4 text-muted-foreground" />;
        }
      case 'security':
        switch (event.action) {
          case 'permission_change':
            return <Key className="w-4 h-4 text-warning" />;
          case 'failed_login':
            return <Shield className="w-4 h-4 text-error" />;
          default:
            return <Shield className="w-4 h-4 text-primary" />;
        }
      case 'system':
        switch (event.action) {
          case 'health_check':
            return <CheckCircle className="w-4 h-4 text-success" />;
          case 'error':
            return <AlertTriangle className="w-4 h-4 text-error" />;
          default:
            return <Settings className="w-4 h-4 text-muted-foreground" />;
        }
      default:
        return <Eye className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: ActivityEvent['severity']) => {
    switch (severity) {
      case 'success':
        return 'text-success border-success/20';
      case 'warning':
        return 'text-warning border-warning/20';
      case 'error':
        return 'text-error border-error/20';
      default:
        return 'text-primary border-primary/20';
    }
  };

  const filteredEvents = data?.events.filter(event => {
    if (selectedFilters.type && event.type !== selectedFilters.type) return false;
    if (selectedFilters.severity && event.severity !== selectedFilters.severity) return false;
    return true;
  }) || [];

  if (isLoading) {
    return (
      <div className={cn("widget-loading h-full", className)}>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-muted rounded-full"></div>
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-muted rounded w-3/4"></div>
                <div className="h-2 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cn("flex items-center justify-center h-full text-muted-foreground", className)}>
        Failed to load activity data
      </div>
    );
  }

  return (
    <div className={cn("activity-feed-widget h-full", className)}>
      {/* Header with Stats */}
      <div className="widget-header flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium">Activity Feed</h4>
          <Badge variant="secondary" className="text-xs">
            {data.stats.totalToday} today
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </button>
          
          {true && (
            <button 
              onClick={() => onNavigate?.('audit')}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              View all
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats grid grid-cols-3 gap-2 mb-4">
        <div className="stat-item text-center p-2 bg-muted/50 rounded">
          <div className="text-xs text-success font-medium">{data.stats.userEvents}</div>
          <div className="text-xs text-muted-foreground">Users</div>
        </div>
        <div className="stat-item text-center p-2 bg-muted/50 rounded">
          <div className="text-xs text-primary font-medium">{data.stats.systemEvents}</div>
          <div className="text-xs text-muted-foreground">System</div>
        </div>
        <div className="stat-item text-center p-2 bg-muted/50 rounded">
          <div className="text-xs text-warning font-medium">{data.stats.securityEvents}</div>
          <div className="text-xs text-muted-foreground">Security</div>
        </div>
      </div>

      {/* Filters */}
      {enableFilters && (
        <div className="filters flex items-center space-x-2 mb-4">
          <Filter className="w-3 h-3 text-muted-foreground" />
          <select 
            value={selectedFilters.type || ''}
            onChange={(e) => setSelectedFilters(prev => ({ ...prev, type: e.target.value || undefined }))}
            className="text-xs bg-background border border-border rounded px-2 py-1"
          >
            <option value="">All types</option>
            {data.filters.types.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select 
            value={selectedFilters.severity || ''}
            onChange={(e) => setSelectedFilters(prev => ({ ...prev, severity: e.target.value || undefined }))}
            className="text-xs bg-background border border-border rounded px-2 py-1"
          >
            <option value="">All levels</option>
            {data.filters.severities.map(severity => (
              <option key={severity} value={severity}>{severity}</option>
            ))}
          </select>
        </div>
      )}

      {/* Event List */}
      <div className="event-list max-h-64 overflow-y-auto space-y-2">
        <AnimatePresence>
          {filteredEvents.slice(0, maxEvents).map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ delay: 0.05 * index }}
              className="event-item flex items-start space-x-3 p-2 hover:bg-muted/50 rounded transition-colors"
            >
              <div className="event-icon mt-0.5">
                {getEventIcon(event)}
              </div>
              
              <div className="event-content flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground font-medium mb-1 line-clamp-2">
                      {event.description}
                    </p>
                    
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>{formatRelativeTime(event.timestamp)}</span>
                      {event.user && (
                        <>
                          <span>•</span>
                          <span>{event.user.name}</span>
                        </>
                      )}
                      {event.target && (
                        <>
                          <span>•</span>
                          <span>{event.target.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-2">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getSeverityColor(event.severity))}
                    >
                      {event.type}
                    </Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredEvents.length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-4">
            No activity events found
          </div>
        )}
      </div>
      
      {filteredEvents.length > maxEvents && (
        <div className="show-more text-center mt-4">
          <button 
            onClick={() => onNavigate?.('audit')}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Show {filteredEvents.length - maxEvents} more events
          </button>
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