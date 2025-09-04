/**
 * Dashboard Widgets Export Index
 * Centralized exports for all dashboard widget components
 */

export { ToolOverviewWidget } from './ToolOverviewWidget';
export { HealthMonitorWidget } from './HealthMonitorWidget';
export { ActivityFeedWidget } from './ActivityFeedWidget';
export { QuickActionsWidget } from './QuickActionsWidget';

// Admin-specific widgets
export { SystemMetricsWidget } from './SystemMetricsWidget';
export { UserAnalyticsWidget } from './UserAnalyticsWidget';
export { ToolManagementWidget } from './ToolManagementWidget';

// Widget type definitions for dynamic rendering
export const WIDGET_TYPES = {
  TOOL_OVERVIEW: 'toolOverview',
  HEALTH_MONITOR: 'healthMonitor',
  ACTIVITY_FEED: 'activityFeed',
  QUICK_ACTIONS: 'quickActions',
  SYSTEM_METRICS: 'systemMetrics',
  USER_ANALYTICS: 'userAnalytics',
  TOOL_MANAGEMENT: 'toolManagement',
  RECENT_TOOLS: 'recentTools'
} as const;

export type WidgetType = typeof WIDGET_TYPES[keyof typeof WIDGET_TYPES];

// Widget configuration interface
export interface WidgetConfig {
  type: WidgetType;
  title: string;
  description: string;
  defaultSize: 'small' | 'medium' | 'large' | 'tall' | 'hero';
  minSize: 'small' | 'medium' | 'large' | 'tall' | 'hero';
  maxSize: 'small' | 'medium' | 'large' | 'tall' | 'hero';
  requiredPermissions?: string[];
  supportedRoles?: string[];
  category: 'overview' | 'monitoring' | 'activity' | 'management' | 'analytics';
  refreshInterval?: number; // in milliseconds
  configurable: boolean;
}

// Widget registry for available widgets
export const WIDGET_REGISTRY: Record<WidgetType, WidgetConfig> = {
  [WIDGET_TYPES.TOOL_OVERVIEW]: {
    type: WIDGET_TYPES.TOOL_OVERVIEW,
    title: 'Tool Overview',
    description: 'Overview of available tools and their status',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
    category: 'overview',
    refreshInterval: 60000,
    configurable: true
  },
  [WIDGET_TYPES.HEALTH_MONITOR]: {
    type: WIDGET_TYPES.HEALTH_MONITOR,
    title: 'System Health',
    description: 'Real-time system health monitoring',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
    category: 'monitoring',
    refreshInterval: 30000,
    configurable: true,
    requiredPermissions: ['system:read']
  },
  [WIDGET_TYPES.ACTIVITY_FEED]: {
    type: WIDGET_TYPES.ACTIVITY_FEED,
    title: 'Activity Feed',
    description: 'Recent system and user activity',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'tall',
    category: 'activity',
    refreshInterval: 60000,
    configurable: true,
    requiredPermissions: ['audit:read']
  },
  [WIDGET_TYPES.QUICK_ACTIONS]: {
    type: WIDGET_TYPES.QUICK_ACTIONS,
    title: 'Quick Actions',
    description: 'Frequently used actions and shortcuts',
    defaultSize: 'small',
    minSize: 'small',
    maxSize: 'medium',
    category: 'overview',
    configurable: true
  },
  [WIDGET_TYPES.SYSTEM_METRICS]: {
    type: WIDGET_TYPES.SYSTEM_METRICS,
    title: 'System Metrics',
    description: 'System performance and resource usage',
    defaultSize: 'medium',
    minSize: 'small',
    maxSize: 'large',
    category: 'monitoring',
    refreshInterval: 15000,
    configurable: true,
    requiredPermissions: ['system:monitor']
  },
  [WIDGET_TYPES.USER_ANALYTICS]: {
    type: WIDGET_TYPES.USER_ANALYTICS,
    title: 'User Analytics',
    description: 'User activity and usage statistics',
    defaultSize: 'large',
    minSize: 'medium',
    maxSize: 'hero',
    category: 'analytics',
    refreshInterval: 300000,
    configurable: true,
    requiredPermissions: ['analytics:read'],
    supportedRoles: ['admin', 'poweruser']
  },
  [WIDGET_TYPES.TOOL_MANAGEMENT]: {
    type: WIDGET_TYPES.TOOL_MANAGEMENT,
    title: 'Tool Management',
    description: 'Manage and configure tool integrations',
    defaultSize: 'large',
    minSize: 'medium',
    maxSize: 'hero',
    category: 'management',
    configurable: true,
    requiredPermissions: ['tools:configure'],
    supportedRoles: ['admin']
  },
  [WIDGET_TYPES.RECENT_TOOLS]: {
    type: WIDGET_TYPES.RECENT_TOOLS,
    title: 'Recently Used',
    description: 'Recently accessed tools and services',
    defaultSize: 'small',
    minSize: 'small',
    maxSize: 'medium',
    category: 'overview',
    configurable: true
  }
};

// Helper functions for widget management
export const getWidgetConfig = (type: WidgetType): WidgetConfig | undefined => {
  return WIDGET_REGISTRY[type];
};

export const getWidgetsByCategory = (category: WidgetConfig['category']): WidgetConfig[] => {
  return Object.values(WIDGET_REGISTRY).filter(widget => widget.category === category);
};

export const getWidgetsForRole = (role: string): WidgetConfig[] => {
  return Object.values(WIDGET_REGISTRY).filter(widget => 
    !widget.supportedRoles || widget.supportedRoles.includes(role)
  );
};

export const getWidgetPermissions = (type: WidgetType): string[] => {
  const config = getWidgetConfig(type);
  return config?.requiredPermissions || [];
};