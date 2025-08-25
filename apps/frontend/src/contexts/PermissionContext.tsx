import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { 
  UserRole, 
  ResourceType, 
  ActionType, 
  Permission, 
  UserPermissions,
  DashboardPermissions,
  WidgetPermissions,
  hasPermission,
  hasAnyPermission,
  getRolePermissions
} from '../types/permissions';

interface PermissionContextType extends UserPermissions {
  dashboardPermissions: DashboardPermissions;
  getWidgetPermissions: (widgetType: string) => WidgetPermissions;
  checkDashboardAccess: (dashboardType: 'admin' | 'user' | 'poweruser') => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

interface PermissionProviderProps {
  children: ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const { user, isAdmin } = useAuth();

  // Enhanced role detection with multiple fallback methods
  const userRoles = useMemo((): UserRole[] => {
    if (!user) return [];

    const detectedRoles: UserRole[] = [];

    // Check for admin role
    const hasAdminAccess = 
      user.roles?.includes('admin') || 
      user.groups?.includes('admins') || 
      user.groups?.includes('/admins') ||
      user.roles?.includes('administrator') ||
      user.email?.includes('admin') ||
      user.name?.toLowerCase() === 'admin' ||
      user.sub?.toLowerCase() === 'admin' ||
      isAdmin;

    if (hasAdminAccess) {
      detectedRoles.push('admin');
    }

    // For simplified admin/user system, all non-admin users are regular users
    // (Removed poweruser, developer, auditor role detection)

    // Default to user role if no other roles detected
    if (detectedRoles.length === 0) {
      detectedRoles.push('user');
    }

    return detectedRoles;
  }, [user, isAdmin]);

  // Calculate user permissions based on roles
  const userPermissions = useMemo((): Permission[] => {
    return getRolePermissions(userRoles);
  }, [userRoles]);

  // Permission checking functions
  const canAccess = useMemo(() => 
    (resource: ResourceType, action: ActionType): boolean => 
      hasPermission(userPermissions, resource, action)
  , [userPermissions]);

  const canManage = useMemo(() => 
    (resource: ResourceType): boolean => 
      hasAnyPermission(userPermissions, [
        { resource, action: 'create' },
        { resource, action: 'update' },
        { resource, action: 'delete' },
        { resource, action: 'configure' }
      ])
  , [userPermissions]);

  const hasRole = useMemo(() => 
    (role: UserRole): boolean => 
      userRoles.includes(role)
  , [userRoles]);

  const hasAnyRole = useMemo(() => 
    (roles: UserRole[]): boolean => 
      roles.some(role => userRoles.includes(role))
  , [userRoles]);

  // Dashboard-specific permissions
  const dashboardPermissions = useMemo((): DashboardPermissions => ({
    canViewAdminDashboard: hasRole('admin'),
    canViewUserDashboard: true, // All authenticated users can view user dashboard
    canViewPowerUserDashboard: false, // Removed in simplified admin/user system
    canViewAnalytics: canAccess('analytics', 'read'),
    canViewSystemHealth: canAccess('system', 'read'),
    canManageTools: canManage('tools'),
    canManageUsers: canManage('users'),
    canViewAuditLogs: canAccess('audit', 'read'),
    canConfigureWebhooks: canManage('webhooks'),
    canManageLDAP: canManage('ldap'),
  }), [hasRole, hasAnyRole, canAccess, canManage]);

  // Widget-level permissions
  const getWidgetPermissions = useMemo(() => 
    (widgetType: string): WidgetPermissions => {
      const isAdminWidget = widgetType.includes('admin') || widgetType.includes('management');
      const isPowerUserWidget = widgetType.includes('analytics') || widgetType.includes('advanced');
      
      return {
        canViewWidget: isAdminWidget ? hasRole('admin') : 
                      isPowerUserWidget ? hasRole('admin') : 
                      true,
        canConfigureWidget: hasRole('admin'),
        canDeleteWidget: hasRole('admin'),
        canMoveWidget: hasRole('admin'),
      };
    }
  , [hasRole, hasAnyRole]);

  // Dashboard access checker
  const checkDashboardAccess = useMemo(() => 
    (dashboardType: 'admin' | 'user' | 'poweruser'): boolean => {
      switch (dashboardType) {
        case 'admin':
          return dashboardPermissions.canViewAdminDashboard;
        case 'poweruser':
          return false; // Removed in simplified system
        case 'user':
        default:
          return dashboardPermissions.canViewUserDashboard;
      }
    }
  , [dashboardPermissions]);

  // Computed role flags (simplified) - removed unused variables

  const contextValue: PermissionContextType = {
    roles: userRoles,
    permissions: userPermissions,
    isAdmin: hasRole('admin'),
    isPowerUser: false,
    isDeveloper: false,
    canAccess,
    canManage,
    hasRole,
    hasAnyRole,
    dashboardPermissions,
    getWidgetPermissions,
    checkDashboardAccess,
  };

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
};