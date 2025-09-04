import React from 'react';
import { motion } from 'framer-motion';
import { DashboardContainer } from '../../components/dashboard/DashboardContainer';
import { useAuth } from '../../contexts/AuthContext';
import { useSimplePermissions } from '../../contexts/SimplePermissionContext';
import { 
  User, 
  Zap, 
  Activity, 
  Clock, 
  Heart,
  Shield,
  BookOpen
} from 'lucide-react';
import { Badge } from '../../components/ui';

interface UserDashboardProps {
  onNavigate?: (view: string) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { } = useSimplePermissions(); // Permissions available if needed

  const handleWidgetUpdate = (widgetId: string, data: any) => {
    console.log('User widget update:', widgetId, data);
  };

  const handleLayoutChange = (layout: any) => {
    console.log('User layout change:', layout);
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="user-dashboard-container min-h-screen">
      {/* User Theme Header */}
      <div className="user-header bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}!
            </h1>
            
            <p className="text-blue-100 text-lg mb-6">
              Welcome to your SSO Hub dashboard
            </p>

            {/* Quick Access Buttons */}
            <div className="flex items-center justify-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate?.('launchpad')}
                className="px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center space-x-2 shadow-lg"
              >
                <Zap className="w-5 h-5" />
                <span>Launch Tools</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate?.('profile')}
                className="px-6 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors flex items-center space-x-2 border border-white/20"
              >
                <User className="w-5 h-5" />
                <span>My Profile</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate?.('health')}
                className="px-6 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors flex items-center space-x-2 border border-white/20"
              >
                <Activity className="w-5 h-5" />
                <span>System Status</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* User Status Bar */}
      <div className="user-status-bar bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-600">Connected</span>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Last login: {new Date().toLocaleDateString()}</span>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Shield className="w-4 h-4" />
                <span>Security: Active</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Standard User
              </Badge>
              
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
                <Heart className="w-4 h-4 text-red-500" />
                <span>System Health: Good</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Tips */}
      <div className="welcome-tips bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-start space-x-3"
          >
            <BookOpen className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 mb-1">Quick Tips</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Click "Launch Tools" to access your DevOps tools with single sign-on</p>
                <p>• Check "System Status" to monitor the health of all integrated services</p>
                <p>• Visit "My Profile" to manage your account settings and preferences</p>
              </div>
            </div>
            <button className="text-blue-600 hover:text-blue-800 text-sm underline">
              Learn more
            </button>
          </motion.div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="dashboard-content bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <DashboardContainer
          layoutId="user-default"
          enableDragDrop={false}
          enableRealTime={true}
          onWidgetUpdate={handleWidgetUpdate}
          onLayoutChange={handleLayoutChange}
          className="user-theme px-4 sm:px-6 lg:px-8 py-8"
        />
      </div>

      {/* User Help Floating Button */}
      <div className="user-help-button fixed bottom-6 right-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
          className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center group relative"
          title="Need Help?"
        >
          <BookOpen className="w-6 h-6" />
          
          {/* Help tooltip */}
          <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900 text-white text-sm rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="mb-2 font-medium">Need help?</div>
            <ul className="text-xs space-y-1">
              <li>• Documentation</li>
              <li>• Contact Support</li>
              <li>• Video Tutorials</li>
            </ul>
          </div>
        </motion.button>
      </div>
    </div>
  );
};