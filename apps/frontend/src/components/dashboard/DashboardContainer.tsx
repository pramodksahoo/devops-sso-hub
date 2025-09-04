import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimplePermissions } from '../../contexts/SimplePermissionContext';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardGrid } from './DashboardGrid';
import { LoadingSpinner } from '../ui/loading';

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  size: 'small' | 'medium' | 'large' | 'tall' | 'hero';
  position?: { x: number; y: number };
  config?: Record<string, any>;
  roles?: string[];
  isVisible?: boolean;
  isLoading?: boolean;
  lastUpdated?: Date;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  roles: string[];
  isDefault?: boolean;
}

interface DashboardContainerProps {
  layoutId?: string;
  enableDragDrop?: boolean;
  enableRealTime?: boolean;
  onWidgetUpdate?: (widgetId: string, data: any) => void;
  onLayoutChange?: (layout: DashboardLayout) => void;
  className?: string;
}

// Animation variants
const containerVariants = {
  hidden: { 
    opacity: 0,
    y: 20 
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.4,
      ease: "easeIn"
    }
  }
};

// Removed widgetVariants - not used in simplified grid

export const DashboardContainer: React.FC<DashboardContainerProps> = ({
  layoutId,
  enableDragDrop: _enableDragDrop = false,
  enableRealTime = true,
  onWidgetUpdate,
  onLayoutChange,
  className = ""
}) => {
  const { user } = useAuth();
  const { isAdmin } = useSimplePermissions();
  const getDashboardType = () => isAdmin ? 'admin' : 'user';
  
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Determine dashboard type based on permissions
  const dashboardType = getDashboardType();

  // Load dashboard layout
  const loadDashboardLayout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use provided layoutId or determine based on user role
      const targetLayoutId = layoutId || `${dashboardType}-default`;
      
      // TODO: Replace with actual API call
      const layout = await loadLayoutFromAPI(targetLayoutId, dashboardType);
      
      // Filter widgets based on user permissions
      const userRoles = isAdmin ? ['admin'] : ['user'];
      const visibleWidgets = layout.widgets.filter(widget => 
        canUserViewWidget(widget, userRoles)
      );

      setCurrentLayout({
        ...layout,
        widgets: visibleWidgets
      });
    } catch (err) {
      console.error('Failed to load dashboard layout:', err);
      setError('Failed to load dashboard layout');
      // Fallback to default layout
      setCurrentLayout(getDefaultLayout(dashboardType));
    } finally {
      setIsLoading(false);
    }
  }, [layoutId, dashboardType, isAdmin]);

  // Initialize dashboard
  useEffect(() => {
    loadDashboardLayout();
  }, [loadDashboardLayout]);

  // Real-time updates
  useEffect(() => {
    if (!enableRealTime || !currentLayout) return;

    const updateInterval = setInterval(() => {
      // Trigger widget updates
      currentLayout.widgets.forEach(widget => {
        if (shouldUpdateWidget(widget)) {
          onWidgetUpdate?.(widget.id, { lastUpdated: new Date() });
        }
      });
      setLastUpdateTime(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(updateInterval);
  }, [currentLayout, enableRealTime, onWidgetUpdate]);

  // Handle widget updates
  const handleWidgetUpdate = useCallback((widgetId: string, data: any) => {
    if (!currentLayout) return;

    const updatedWidgets = currentLayout.widgets.map(widget =>
      widget.id === widgetId 
        ? { ...widget, ...data, lastUpdated: new Date() }
        : widget
    );

    const updatedLayout = {
      ...currentLayout,
      widgets: updatedWidgets
    };

    setCurrentLayout(updatedLayout);
    onLayoutChange?.(updatedLayout);
  }, [currentLayout, onLayoutChange]);

  // Handle layout changes
  const handleLayoutChange = useCallback((layout: any) => {
    console.log('Layout changed:', layout);
    onLayoutChange?.(layout);
  }, [onLayoutChange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="text-error text-lg font-medium">Dashboard Error</div>
          <p className="text-muted-foreground">{error}</p>
          <button 
            onClick={loadDashboardLayout}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!currentLayout) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="text-muted-foreground">No dashboard layout available</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`dashboard-container min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 ${className}`}
    >
      {/* Dashboard Header */}
      <div className="dashboard-header mb-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="dashboard-title">
              {currentLayout.name}
            </h1>
            <p className="dashboard-subtitle">
              Welcome back, {user?.name || user?.email}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-xs text-muted-foreground">
              Last updated: {lastUpdateTime.toLocaleTimeString()}
            </div>
            
            {isAdmin && (
              <button className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors">
                Configure
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <AnimatePresence mode="wait">
        <DashboardGrid
          widgets={currentLayout.widgets}
          onWidgetUpdate={handleWidgetUpdate}
          onLayoutChange={handleLayoutChange}
        />
      </AnimatePresence>
    </motion.div>
  );
};

// Helper functions (these would typically be in separate service files)

async function loadLayoutFromAPI(_layoutId: string, dashboardType: string): Promise<DashboardLayout> {
  // TODO: Replace with actual API call
  return getDefaultLayout(dashboardType);
}

function getDefaultLayout(dashboardType: string): DashboardLayout {
  const baseWidgets: DashboardWidget[] = [
    {
      id: 'quick-access',
      type: 'quickAccess',
      title: 'Quick Access',
      size: 'medium',
      position: { x: 0, y: 0 }
    },
    {
      id: 'system-health',
      type: 'systemHealth',
      title: 'System Health',
      size: 'small',
      position: { x: 1, y: 0 }
    },
    {
      id: 'recent-activity',
      type: 'activityFeed',
      title: 'Recent Activity',
      size: 'small',
      position: { x: 2, y: 0 }
    }
  ];

  if (dashboardType === 'admin') {
    baseWidgets.push(
      {
        id: 'tool-management',
        type: 'toolManagement',
        title: 'Tool Management',
        size: 'large',
        position: { x: 0, y: 1 },
        roles: ['admin']
      },
      {
        id: 'user-analytics',
        type: 'userAnalytics',
        title: 'User Analytics',
        size: 'medium',
        position: { x: 1, y: 1 },
        roles: ['admin']
      }
    );
  }

  return {
    id: `${dashboardType}-default`,
    name: `${dashboardType.charAt(0).toUpperCase() + dashboardType.slice(1)} Dashboard`,
    widgets: baseWidgets,
    roles: [dashboardType],
    isDefault: true
  };
}

function canUserViewWidget(widget: DashboardWidget, userRoles: string[]): boolean {
  if (!widget.roles || widget.roles.length === 0) return true;
  return widget.roles.some(role => userRoles.includes(role));
}

function shouldUpdateWidget(widget: DashboardWidget): boolean {
  // Determine if widget needs real-time updates
  const realTimeWidgets = ['systemHealth', 'activityFeed', 'toolStatus'];
  return realTimeWidgets.includes(widget.type);
}