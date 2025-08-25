import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Settings, 
  Shield, 
  BarChart3, 
  FileText, 
  Database,
  Wrench,
  UserPlus,
  Download,
  RefreshCw,
  Eye
} from 'lucide-react';

interface QuickActionsProps {
  onNavigate?: (view: string) => void;
}

interface ActionCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  hoverColor: string;
  action: () => void;
  badge?: string;
  urgent?: boolean;
}

export const QuickActionsSection: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  const actions: ActionCard[] = [
    {
      id: 'user-management',
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100',
      action: () => onNavigate?.('users'),
      badge: '2,847 users'
    },
    {
      id: 'tool-configuration',
      title: 'Tool Configuration',
      description: 'Configure and manage DevOps integrations',
      icon: Wrench,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100',
      action: () => onNavigate?.('admin-tools'),
      badge: '12 tools'
    },
    {
      id: 'security-audit',
      title: 'Security & Audit',
      description: 'View security logs and audit trails',
      icon: Shield,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100',
      action: () => onNavigate?.('audit'),
      badge: '3 alerts',
      urgent: true
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      description: 'View system analytics and generate reports',
      icon: BarChart3,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      hoverColor: 'hover:bg-orange-100',
      action: () => onNavigate?.('analytics')
    },
    {
      id: 'system-settings',
      title: 'System Settings',
      description: 'Configure global system preferences',
      icon: Settings,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      hoverColor: 'hover:bg-gray-100',
      action: () => onNavigate?.('settings')
    },
    {
      id: 'health-monitoring',
      title: 'Health Monitoring',
      description: 'Monitor system health and performance',
      icon: Eye,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      hoverColor: 'hover:bg-teal-100',
      action: () => onNavigate?.('health')
    }
  ];

  const quickTasks = [
    {
      icon: UserPlus,
      label: 'Add New User',
      action: () => onNavigate?.('users'),
      shortcut: '⌘+N'
    },
    {
      icon: Download,
      label: 'Export Data',
      action: () => console.log('Export data'),
      shortcut: '⌘+E'
    },
    {
      icon: RefreshCw,
      label: 'Sync All Tools',
      action: () => console.log('Sync tools'),
      shortcut: '⌘+R'
    },
    {
      icon: FileText,
      label: 'Generate Report',
      action: () => onNavigate?.('analytics'),
      shortcut: '⌘+G'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
          <p className="text-gray-600 mt-1">Frequently used administrative functions and shortcuts</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Database className="h-4 w-4" />
          <span>All systems operational</span>
        </div>
      </div>

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {actions.map((action, index) => {
          const IconComponent = action.icon;

          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={action.action}
              className={`
                relative bg-white rounded-xl p-4 md:p-6 cursor-pointer transition-all duration-300
                shadow-sm hover:shadow-lg border border-gray-200 hover:border-gray-300
                ${action.hoverColor} group
              `}
            >
              {/* Urgent indicator */}
              {action.urgent && (
                <div className="absolute top-3 right-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                </div>
              )}

              {/* Icon and badge */}
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${action.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                  <IconComponent className={`h-6 w-6 ${action.color}`} />
                </div>
                {action.badge && (
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {action.badge}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {action.description}
                </p>
              </div>

              {/* Action indicator */}
              <div className="mt-4 flex items-center text-xs text-gray-400 group-hover:text-gray-600">
                <span>Click to open</span>
                <motion.div
                  initial={{ x: 0 }}
                  whileHover={{ x: 4 }}
                  className="ml-1"
                >
                  →
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Tasks Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-200"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Quick Tasks</h3>
          <span className="text-xs text-gray-500">Keyboard shortcuts available</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickTasks.map((task, index) => {
            const IconComponent = task.icon;

            return (
              <motion.button
                key={task.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + index * 0.05 }}
                onClick={task.action}
                className="flex flex-col sm:flex-row items-center sm:space-x-3 space-y-2 sm:space-y-0 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group text-center sm:text-left"
              >
                <IconComponent className="h-4 w-4 text-gray-600 group-hover:text-gray-800" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{task.label}</div>
                  <div className="text-xs text-gray-500">{task.shortcut}</div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* System Status Indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.0 }}
        className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <div>
              <div className="font-semibold">All Systems Operational</div>
              <div className="text-sm text-green-100">Last updated: {new Date().toLocaleTimeString()}</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-1 sm:space-y-0 text-sm">
            <div>99.8% Uptime</div>
            <div className="hidden sm:block">•</div>
            <div>387 Active Sessions</div>
            <div className="hidden sm:block">•</div>
            <div>12 Tools Connected</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default QuickActionsSection;