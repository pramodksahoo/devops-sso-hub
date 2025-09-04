import { useSimplePermissions } from '../contexts/SimplePermissionContext';
import { UserRole } from '../types/permissions';

/**
 * Custom hook for accessing permission system
 * Provides convenient access to user permissions and role-based checks
 */
export const usePermissions = () => {
  return useSimplePermissions();
};

/**
 * Hook for checking specific resource permissions - simplified
 */
export const useResourcePermissions = () => {
  const { isAdmin } = useSimplePermissions();
  
  return {
    canCreate: isAdmin,
    canRead: true,
    canUpdate: isAdmin,
    canDelete: isAdmin,
    canConfigure: isAdmin,
    canMonitor: true,
    canLaunch: true,
    canApprove: isAdmin,
    canManage: isAdmin,
  };
};

/**
 * Hook for dashboard-specific permissions - simplified
 */
export const useDashboardPermissions = () => {
  const { isAdmin, checkDashboardAccess } = useSimplePermissions();
  
  return {
    canViewAdminDashboard: isAdmin,
    canViewUserDashboard: true,
    canViewPowerUserDashboard: false,
    canViewAnalytics: isAdmin,
    canViewSystemHealth: true,
    canManageTools: isAdmin,
    canManageUsers: isAdmin,
    canViewAuditLogs: isAdmin,
    canConfigureWebhooks: isAdmin,
    canManageLDAP: isAdmin,
    checkDashboardAccess,
    getDashboardType: () => isAdmin ? 'admin' : 'user',
  };
};

/**
 * Hook for role-based UI rendering - simplified
 */
export const useRoleBasedRendering = () => {
  const { isAdmin, roles } = useSimplePermissions();
  
  return {
    roles,
    isAdmin,
    isPowerUser: false,
    isDeveloper: false,
    hasRole: (role: UserRole) => (role === 'admin' && isAdmin) || (role === 'user' && !isAdmin),
    hasAnyRole: (roles: UserRole[]) => roles.includes('admin') ? isAdmin : true,
    renderForRoles: (allowedRoles: UserRole[], children: React.ReactNode) => {
      const hasAccess = allowedRoles.includes('admin') ? isAdmin : true;
      return hasAccess ? children : null;
    },
    renderForAdmin: (children: React.ReactNode) => {
      return isAdmin ? children : null;
    },
    renderForPowerUser: (children: React.ReactNode) => {
      return isAdmin ? children : null; // Only admin in simplified system
    },
    renderForDeveloper: (children: React.ReactNode) => {
      return isAdmin ? children : null; // Only admin in simplified system
    },
  };
};

/**
 * Hook for widget-level permissions
 */
export const useWidgetPermissions = () => {
  const { checkPermission } = useSimplePermissions();
  
  return {
    checkWidgetPermission: (_widgetId: string, action: string) => {
      return checkPermission(`${action}_widget`);
    }
  };
};

export default usePermissions;