import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react';

interface RecentActivityProps {
  onNavigate?: (view: string) => void;
}

interface ActivityItem {
  id: string;
  type: 'user' | 'security' | 'system' | 'tool';
  title: string;
  description: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user?: string;
  icon: React.ElementType;
  color: string;
}

export const RecentActivitySection: React.FC<RecentActivityProps> = ({ onNavigate }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching recent activities
    setTimeout(() => {
      setActivities([
        {
          id: '1',
          type: 'user',
          title: 'New user registration',
          description: 'john.doe@company.com registered successfully',
          timestamp: '2 minutes ago',
          severity: 'low',
          user: 'john.doe@company.com',
          icon: User,
          color: 'text-blue-600'
        },
        {
          id: '2',
          type: 'security',
          title: 'Failed login attempts',
          description: 'Multiple failed login attempts detected for admin account',
          timestamp: '5 minutes ago',
          severity: 'high',
          user: 'admin@company.com',
          icon: Shield,
          color: 'text-red-600'
        },
        {
          id: '3',
          type: 'system',
          title: 'Tool configuration updated',
          description: 'Jenkins integration settings modified',
          timestamp: '12 minutes ago',
          severity: 'medium',
          user: 'admin@company.com',
          icon: CheckCircle,
          color: 'text-green-600'
        },
        {
          id: '4',
          type: 'tool',
          title: 'SonarQube connection failed',
          description: 'Unable to establish connection to SonarQube server',
          timestamp: '1 hour ago',
          severity: 'critical',
          icon: AlertTriangle,
          color: 'text-orange-600'
        },
        {
          id: '5',
          type: 'user',
          title: 'User role updated',
          description: 'jane.smith@company.com promoted to admin role',
          timestamp: '2 hours ago',
          severity: 'medium',
          user: 'admin@company.com',
          icon: User,
          color: 'text-purple-600'
        }
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Recent Activity</h2>
          <p className="text-gray-600">Loading recent system activities...</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
          <p className="text-gray-600 mt-1">Latest system events, alerts, and user activities</p>
        </div>
        <button
          onClick={() => onNavigate?.('audit')}
          className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <span>View All Activity</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Activity Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        <div className="divide-y divide-gray-100">
          {activities.map((activity, index) => {
            const IconComponent = activity.icon;
            
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 md:p-6 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg bg-gray-100 flex-shrink-0`}>
                    <IconComponent className={`h-5 w-5 ${activity.color}`} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 sm:mb-1 space-y-2 sm:space-y-0">
                      <h3 className="text-sm font-medium text-gray-900">{activity.title}</h3>
                      <div className="flex items-center space-x-2 justify-start sm:justify-end">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(activity.severity)}`}>
                          {activity.severity}
                        </div>
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{activity.timestamp}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                    
                    {activity.user && (
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>by</span>
                        <span className="font-medium text-gray-700">{activity.user}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-200 text-center"
        >
          <div className="text-base md:text-lg font-bold text-blue-600">127</div>
          <div className="text-sm text-gray-600">Today's Events</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl p-4 shadow-sm border border-red-200 bg-red-50/30 text-center"
        >
          <div className="text-base md:text-lg font-bold text-red-600">3</div>
          <div className="text-sm text-gray-600">Security Alerts</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-xl p-4 shadow-sm border border-green-200 bg-green-50/30 text-center"
        >
          <div className="text-base md:text-lg font-bold text-green-600">45</div>
          <div className="text-sm text-gray-600">User Actions</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white rounded-xl p-4 shadow-sm border border-yellow-200 bg-yellow-50/30 text-center"
        >
          <div className="text-base md:text-lg font-bold text-yellow-600">8</div>
          <div className="text-sm text-gray-600">System Changes</div>
        </motion.div>
      </div>
    </div>
  );
};

export default RecentActivitySection;