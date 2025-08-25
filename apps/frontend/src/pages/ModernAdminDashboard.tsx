import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { SystemOverviewSection } from '../components/admin/sections/SystemOverviewSection';
import { QuickActionsSection } from '../components/admin/sections/QuickActionsSection';
import { SystemHealthSection } from '../components/admin/sections/SystemHealthSection';
import { ToolManagementSection } from '../components/admin/sections/ToolManagementSection';
import { UserAnalyticsSection } from '../components/admin/sections/UserAnalyticsSection';
import { RecentActivitySection } from '../components/admin/sections/RecentActivitySection';

interface ModernAdminDashboardProps {
  onNavigate?: (view: string) => void;
}

export const ModernAdminDashboard: React.FC<ModernAdminDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  // Animation variants for smooth section loading
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
    >
      {/* Dashboard Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-4 md:py-6 space-y-4 md:space-y-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.name || user?.email} • SSO Hub Management Center
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 font-medium">Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <div className="space-y-6 md:space-y-8">
          {/* Section 1: System Overview */}
          <motion.div variants={sectionVariants}>
            <SystemOverviewSection onNavigate={onNavigate} />
          </motion.div>

          {/* Section 2: Quick Actions */}
          <motion.div variants={sectionVariants}>
            <QuickActionsSection onNavigate={onNavigate} />
          </motion.div>

          {/* Section 3: System Health & Metrics */}
          <motion.div variants={sectionVariants}>
            <SystemHealthSection />
          </motion.div>

          {/* Section 4: Tool Management */}
          <motion.div variants={sectionVariants}>
            <ToolManagementSection onNavigate={onNavigate} />
          </motion.div>

          {/* Section 5: User Analytics */}
          <motion.div variants={sectionVariants}>
            <UserAnalyticsSection />
          </motion.div>

          {/* Section 6: Recent Activity */}
          <motion.div variants={sectionVariants}>
            <RecentActivitySection onNavigate={onNavigate} />
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white/60 backdrop-blur-sm border-t border-gray-200/70 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm text-gray-500 space-y-2 sm:space-y-0">
            <div>SSO Hub Admin Dashboard v2.0</div>
            <div className="flex items-center space-x-4 justify-start sm:justify-end">
              <span>System Status: Operational</span>
              <span className="hidden sm:inline">•</span>
              <span>Uptime: 99.8%</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ModernAdminDashboard;