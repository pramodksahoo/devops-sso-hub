import React from 'react';
import { motion } from 'framer-motion';
import { useSimplePermissions } from '../contexts/SimplePermissionContext';
import { ModernAdminDashboard } from './ModernAdminDashboard';
import { UserDashboard } from './dashboards/UserDashboard';

interface ModernDashboardProps {
  onNavigate?: (view: string) => void;
}

/**
 * Modern Dashboard Router
 * Automatically routes users to the appropriate dashboard based on their permissions
 */
export const ModernDashboard: React.FC<ModernDashboardProps> = ({ onNavigate }) => {
  const { isAdmin, checkDashboardAccess } = useSimplePermissions();

  // Route to appropriate dashboard based on role
  if (isAdmin && checkDashboardAccess('admin')) {
    return (
      <motion.div
        key="admin-dashboard"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
      >
        <ModernAdminDashboard onNavigate={onNavigate} />
      </motion.div>
    );
  }

  // Default to user dashboard
  return (
    <motion.div
      key="user-dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <UserDashboard onNavigate={onNavigate} />
    </motion.div>
  );
};