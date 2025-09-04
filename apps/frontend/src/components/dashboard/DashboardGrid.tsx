import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DashboardWidget } from './DashboardContainer';
import { useWidgetPermissions } from '../../hooks/usePermissions';
import { cn } from '../../lib/utils';
import { QuickActionsWidget } from './widgets/QuickActionsWidget';
import { HealthMonitorWidget } from './widgets/HealthMonitorWidget';
import { ToolOverviewWidget } from './widgets/ToolOverviewWidget';
import { ActivityFeedWidget } from './widgets/ActivityFeedWidget';
import { SystemMetricsWidget } from './widgets/SystemMetricsWidget';
import { UserAnalyticsWidget } from './widgets/UserAnalyticsWidget';
import { ToolManagementWidget } from './widgets/ToolManagementWidget';

// Widget size mappings for CSS Grid - Mobile-first responsive design
const WIDGET_SIZE_CLASSES = {
  small: 'col-span-1 row-span-1',
  medium: 'col-span-1 sm:col-span-2 row-span-1',
  large: 'col-span-1 sm:col-span-2 lg:col-span-2 row-span-2',
  wide: 'col-span-1 sm:col-span-2 lg:col-span-3 row-span-1',
  tall: 'col-span-1 row-span-2',
  full: 'col-span-full row-span-2',
  hero: 'col-span-full row-span-3'
};

// Additional responsive classes for better mobile experience
const MOBILE_RESPONSIVE_CLASSES = {
  small: 'col-span-1',
  medium: 'col-span-1 sm:col-span-1 md:col-span-2',
  large: 'col-span-1 sm:col-span-1 md:col-span-2',
  wide: 'col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-3',
  tall: 'col-span-1',
  full: 'col-span-full',
  hero: 'col-span-full'
};

interface DashboardGridProps {
  widgets: DashboardWidget[];
  onWidgetUpdate: (widgetId: string, data: any) => void;
  onLayoutChange: (layout: any) => void;
  className?: string;
  editMode?: boolean;
}

// Widget renderer function
const renderWidget = (widget: DashboardWidget) => {
  switch (widget.type) {
    case 'quickAccess':
      return <QuickActionsWidget />;
    case 'systemHealth':
      return <HealthMonitorWidget />;
    case 'toolOverview':
      return <ToolOverviewWidget />;
    case 'activityFeed':
      return <ActivityFeedWidget />;
    // Admin-specific widgets
    case 'systemMetrics':
      return <SystemMetricsWidget />;
    case 'userAnalytics':
      return <UserAnalyticsWidget />;
    case 'toolManagement':
      return <ToolManagementWidget />;
    default:
      return (
        <div className="p-4 bg-white rounded-lg shadow h-full flex items-center justify-center text-gray-500">
          <span>Widget type "{widget.type}" not found</span>
        </div>
      );
  }
};

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  widgets,
  onWidgetUpdate: _onWidgetUpdate,
  onLayoutChange: _onLayoutChange,
  className,
  editMode = false
}) => {
  const { checkWidgetPermission } = useWidgetPermissions();

  // Filter widgets based on permissions
  const visibleWidgets = useMemo(() => {
    return widgets.filter(widget => 
      checkWidgetPermission(widget.id, 'view')
    );
  }, [widgets, checkWidgetPermission]);

  const gridClasses = cn(
    // Base grid setup with improved mobile-first responsive design
    'grid gap-4 p-4 sm:gap-6 sm:p-6',
    // Mobile-first responsive grid columns - prevent overlapping
    'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
    // Auto-sizing rows with minimum height
    'auto-rows-[minmax(200px,auto)]',
    // Custom min height for better layout
    'min-h-[400px]',
    // Ensure proper grid flow
    'grid-flow-row-dense',
    className
  );

  return (
    <div className={gridClasses}>
      {visibleWidgets.map((widget, index) => {
        const sizeClass = WIDGET_SIZE_CLASSES[widget.size || 'medium'];
        const mobileResponsiveClass = MOBILE_RESPONSIVE_CLASSES[widget.size || 'medium'];
        
        return (
          <motion.div
            key={widget.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ 
              duration: 0.3,
              delay: index * 0.05
            }}
            className={cn(
              sizeClass,
              mobileResponsiveClass,
              'relative group min-h-[200px]',
              editMode && 'cursor-move hover:scale-105 transition-transform'
            )}
          >
            {/* Widget Content */}
            <div className="h-full w-full">
              {renderWidget(widget)}
            </div>

            {/* Edit Mode Overlay */}
            {editMode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-primary/10 border-2 border-primary/20 rounded-lg pointer-events-none group-hover:bg-primary/20 transition-colors"
              >
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                  {widget.title}
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}

      {/* Empty State */}
      {visibleWidgets.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="col-span-full flex flex-col items-center justify-center py-12 text-center"
        >
          <div className="text-muted-foreground mb-4">
            <svg
              className="w-16 h-16 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No Widgets Available</h3>
          <p className="text-muted-foreground max-w-md">
            No dashboard widgets are available for your current permissions. 
            Contact your administrator to configure widgets for your role.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default DashboardGrid;