import React from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Users, 
  Shield, 
  Activity, 
  Database,
  Zap,
  BarChart3,
  FileText,
  Webhook,
  GitBranch
} from 'lucide-react';
import { useSimplePermissions } from '../../../contexts/SimplePermissionContext';
import { cn } from '../../../lib/utils';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  action: string;
  color: string;
  requiresPermission?: {
    resource: string;
    action: string;
  };
  requiredRoles?: string[];
  category: 'user' | 'admin' | 'developer' | 'general';
}

interface QuickActionsWidgetProps {
  onNavigate?: (view: string) => void;
  onAction?: (actionId: string) => void;
  maxActions?: number;
  showCategories?: boolean;
  className?: string;
}

// Default quick actions configuration
const DEFAULT_ACTIONS: QuickAction[] = [
  // User actions
  {
    id: 'launch-tools',
    title: 'Launch Tools',
    description: 'Quick access to your DevOps tools',
    icon: Zap,
    action: 'launchpad',
    color: 'text-primary bg-primary/10 hover:bg-primary/20',
    category: 'user'
  },
  {
    id: 'view-profile',
    title: 'View Profile',
    description: 'Manage your account settings',
    icon: Users,
    action: 'profile',
    color: 'text-blue-600 bg-blue-50 hover:bg-blue-100',
    category: 'user'
  },
  {
    id: 'system-health',
    title: 'System Health',
    description: 'Check system status and metrics',
    icon: Activity,
    action: 'health',
    color: 'text-green-600 bg-green-50 hover:bg-green-100',
    category: 'general'
  },

  // Admin actions
  {
    id: 'manage-tools',
    title: 'Manage Tools',
    description: 'Configure and manage tool integrations',
    icon: Settings,
    action: 'admin-tools',
    color: 'text-purple-600 bg-purple-50 hover:bg-purple-100',
    requiresPermission: { resource: 'tools', action: 'configure' },
    requiredRoles: ['admin'],
    category: 'admin'
  },
  {
    id: 'manage-users',
    title: 'Manage Users',
    description: 'User administration and permissions',
    icon: Users,
    action: 'user-management',
    color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100',
    requiresPermission: { resource: 'users', action: 'update' },
    requiredRoles: ['admin'],
    category: 'admin'
  },
  {
    id: 'audit-logs',
    title: 'Audit Logs',
    description: 'View system audit trail',
    icon: FileText,
    action: 'audit',
    color: 'text-orange-600 bg-orange-50 hover:bg-orange-100',
    requiresPermission: { resource: 'audit', action: 'read' },
    requiredRoles: ['admin', 'auditor'],
    category: 'admin'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'View usage analytics and reports',
    icon: BarChart3,
    action: 'analytics',
    color: 'text-teal-600 bg-teal-50 hover:bg-teal-100',
    requiresPermission: { resource: 'analytics', action: 'read' },
    requiredRoles: ['admin', 'poweruser'],
    category: 'admin'
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    description: 'Configure webhook integrations',
    icon: Webhook,
    action: 'webhooks',
    color: 'text-pink-600 bg-pink-50 hover:bg-pink-100',
    requiresPermission: { resource: 'webhooks', action: 'configure' },
    requiredRoles: ['admin'],
    category: 'admin'
  },

  // Developer actions
  {
    id: 'ldap-sync',
    title: 'LDAP Sync',
    description: 'Manage LDAP synchronization',
    icon: Database,
    action: 'ldap',
    color: 'text-cyan-600 bg-cyan-50 hover:bg-cyan-100',
    requiresPermission: { resource: 'ldap', action: 'configure' },
    requiredRoles: ['admin'],
    category: 'developer'
  },
  {
    id: 'provisioning',
    title: 'Provisioning',
    description: 'User provisioning workflows',
    icon: GitBranch,
    action: 'provisioning',
    color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100',
    requiresPermission: { resource: 'provisioning', action: 'configure' },
    requiredRoles: ['admin'],
    category: 'developer'
  }
];

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({
  onNavigate,
  onAction,
  maxActions = 6,
  showCategories = false,
  className = ""
}) => {
  const { isAdmin } = useSimplePermissions();
  
  const dashboardType = isAdmin ? 'admin' : 'user';

  // Filter actions based on permissions and roles
  const availableActions = DEFAULT_ACTIONS.filter(action => {
    // Check role requirements for admin-only actions
    if (action.requiredRoles && action.requiredRoles.includes('admin')) {
      return isAdmin;
    }

    // All other actions are available to authenticated users
    return true;
  });

  // Sort actions by category relevance to user
  const sortedActions = availableActions.sort((a, b) => {
    const categoryPriority = {
      admin: dashboardType === 'admin' ? 1 : 3,
      user: dashboardType === 'user' ? 1 : 2,
      developer: dashboardType === 'admin' ? 2 : 3,
      general: 2
    };

    return categoryPriority[a.category] - categoryPriority[b.category];
  });

  const handleActionClick = (action: QuickAction) => {
    if (onAction) {
      onAction(action.id);
    } else if (onNavigate) {
      onNavigate(action.action);
    }
  };

  const groupedActions = showCategories ? 
    sortedActions.reduce((groups, action) => {
      if (!groups[action.category]) {
        groups[action.category] = [];
      }
      groups[action.category].push(action);
      return groups;
    }, {} as Record<string, QuickAction[]>) : 
    { all: sortedActions };

  if (availableActions.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full text-muted-foreground", className)}>
        <div className="text-center space-y-2">
          <Shield className="w-8 h-8 mx-auto opacity-50" />
          <p className="text-sm">No actions available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("quick-actions-widget h-full", className)}>
      {showCategories ? (
        <div className="space-y-4">
          {Object.entries(groupedActions).map(([category, actions]) => (
            <div key={category} className="category-section">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {category}
              </h5>
              <div className="grid grid-cols-2 gap-2">
                {actions.slice(0, maxActions).map((action, index) => (
                  <ActionButton 
                    key={action.id}
                    action={action}
                    index={index}
                    onClick={() => handleActionClick(action)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sortedActions.slice(0, maxActions).map((action, index) => (
            <ActionButton 
              key={action.id}
              action={action}
              index={index}
              onClick={() => handleActionClick(action)}
            />
          ))}
        </div>
      )}
      
      {availableActions.length > maxActions && (
        <div className="show-more text-center mt-4">
          <button className="text-xs text-primary hover:text-primary/80 transition-colors">
            Show {availableActions.length - maxActions} more actions
          </button>
        </div>
      )}
    </div>
  );
};

// Action button component
interface ActionButtonProps {
  action: QuickAction;
  index: number;
  onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ action, index, onClick }) => {
  const Icon = action.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index }}
      onClick={onClick}
      className={cn(
        "action-button p-3 rounded-lg border border-transparent",
        "text-left transition-all duration-200",
        "hover:scale-105 hover:shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1",
        action.color
      )}
    >
      <div className="flex items-start space-x-2">
        <Icon className="w-5 h-5 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">
            {action.title}
          </div>
          <div className="text-xs opacity-80 mt-1 line-clamp-2">
            {action.description}
          </div>
        </div>
      </div>
    </motion.button>
  );
};