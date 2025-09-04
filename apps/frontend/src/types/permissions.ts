/**
 * Permission System Types
 * Centralized permission definitions for role-based access control
 */

// Core role definitions - simplified to match current SSO-HUB system
export type UserRole = 'admin' | 'user';

// Resource types that can be accessed
export type ResourceType = 
  | 'dashboard'
  | 'tools'
  | 'users'
  | 'analytics'
  | 'audit'
  | 'system'
  | 'webhooks'
  | 'provisioning'
  | 'ldap';

// Action types that can be performed
export type ActionType = 
  | 'create'
  | 'read'
  | 'update' 
  | 'delete'
  | 'launch'
  | 'configure'
  | 'monitor'
  | 'approve';

// Permission structure
export interface Permission {
  resource: ResourceType;
  action: ActionType;
  condition?: string; // Optional condition for contextual permissions
}

// Role-based permissions mapping
export interface RolePermissions {
  [key: string]: Permission[];
}

// User permission context
export interface UserPermissions {
  roles: UserRole[];
  permissions: Permission[];
  isAdmin: boolean;
  isPowerUser: boolean;
  isDeveloper: boolean;
  canAccess: (resource: ResourceType, action: ActionType) => boolean;
  canManage: (resource: ResourceType) => boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

// Dashboard-specific permissions
export interface DashboardPermissions {
  canViewAdminDashboard: boolean;
  canViewUserDashboard: boolean;
  canViewPowerUserDashboard: boolean;
  canViewAnalytics: boolean;
  canViewSystemHealth: boolean;
  canManageTools: boolean;
  canManageUsers: boolean;
  canViewAuditLogs: boolean;
  canConfigureWebhooks: boolean;
  canManageLDAP: boolean;
}

// Widget-level permissions
export interface WidgetPermissions {
  canViewWidget: boolean;
  canConfigureWidget: boolean;
  canDeleteWidget: boolean;
  canMoveWidget: boolean;
}

// Default role permissions configuration
export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  admin: [
    { resource: 'dashboard', action: 'read' },
    { resource: 'dashboard', action: 'configure' },
    { resource: 'tools', action: 'create' },
    { resource: 'tools', action: 'read' },
    { resource: 'tools', action: 'update' },
    { resource: 'tools', action: 'delete' },
    { resource: 'tools', action: 'launch' },
    { resource: 'tools', action: 'configure' },
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'update' },
    { resource: 'users', action: 'delete' },
    { resource: 'analytics', action: 'read' },
    { resource: 'audit', action: 'read' },
    { resource: 'system', action: 'read' },
    { resource: 'system', action: 'configure' },
    { resource: 'system', action: 'monitor' },
    { resource: 'webhooks', action: 'create' },
    { resource: 'webhooks', action: 'read' },
    { resource: 'webhooks', action: 'update' },
    { resource: 'webhooks', action: 'delete' },
    { resource: 'provisioning', action: 'read' },
    { resource: 'provisioning', action: 'configure' },
    { resource: 'ldap', action: 'read' },
    { resource: 'ldap', action: 'configure' },
  ],
  // poweruser role removed in simplified admin/user system
  user: [
    { resource: 'dashboard', action: 'read' },
    { resource: 'tools', action: 'read' },
    { resource: 'tools', action: 'launch' },
    { resource: 'system', action: 'read' },
  ],
  // developer and auditor roles removed in simplified admin/user system
};

// Permission checking utilities
export const hasPermission = (
  userPermissions: Permission[], 
  resource: ResourceType, 
  action: ActionType
): boolean => {
  return userPermissions.some(
    permission => 
      permission.resource === resource && 
      permission.action === action
  );
};

export const hasAnyPermission = (
  userPermissions: Permission[], 
  checks: Array<{ resource: ResourceType; action: ActionType }>
): boolean => {
  return checks.some(check => 
    hasPermission(userPermissions, check.resource, check.action)
  );
};

export const hasAllPermissions = (
  userPermissions: Permission[], 
  checks: Array<{ resource: ResourceType; action: ActionType }>
): boolean => {
  return checks.every(check => 
    hasPermission(userPermissions, check.resource, check.action)
  );
};

export const getRolePermissions = (roles: UserRole[]): Permission[] => {
  const permissions: Permission[] = [];
  
  roles.forEach(role => {
    if (DEFAULT_ROLE_PERMISSIONS[role]) {
      permissions.push(...DEFAULT_ROLE_PERMISSIONS[role]);
    }
  });
  
  return permissions;
};