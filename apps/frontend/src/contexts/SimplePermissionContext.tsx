import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Simple permission types for admin/user system
export type SimpleUserRole = 'admin' | 'user';

export interface SimplePermissionContextType {
  roles: SimpleUserRole[];
  isAdmin: boolean;
  isUser: boolean;
  checkPermission: (action: string) => boolean;
  checkDashboardAccess: (dashboardType: string) => boolean;
  getDashboardType: () => 'admin' | 'user';
}

const SimplePermissionContext = createContext<SimplePermissionContextType | undefined>(undefined);

export const useSimplePermissions = () => {
  const context = useContext(SimplePermissionContext);
  if (context === undefined) {
    throw new Error('useSimplePermissions must be used within a SimplePermissionProvider');
  }
  return context;
};

interface SimplePermissionProviderProps {
  children: ReactNode;
}

export const SimplePermissionProvider: React.FC<SimplePermissionProviderProps> = ({ children }) => {
  const { user, isAdmin: authIsAdmin } = useAuth();

  // Simple role detection based on existing auth system
  const isAdmin = authIsAdmin || 
                  user?.roles?.includes('admin') || 
                  user?.groups?.includes('admins') || 
                  user?.groups?.includes('/admins') ||
                  user?.roles?.includes('administrator') ||
                  false;

  const isUser = !!user && !isAdmin;

  const roles: SimpleUserRole[] = isAdmin ? ['admin'] : ['user'];

  const checkPermission = (action: string): boolean => {
    if (!user) return false;
    
    // Admin has all permissions
    if (isAdmin) return true;
    
    // User permissions
    const userPermissions = [
      'view_dashboard',
      'view_tools',
      'launch_tools',
      'view_profile',
      'view_health',
      'view_basic_analytics'
    ];
    
    return userPermissions.includes(action);
  };

  const checkDashboardAccess = (dashboardType: string): boolean => {
    if (!user) return false;
    
    switch (dashboardType) {
      case 'admin':
        return isAdmin;
      case 'user':
        return true; // All authenticated users can access user dashboard
      default:
        return false;
    }
  };

  const getDashboardType = (): 'admin' | 'user' => {
    return isAdmin ? 'admin' : 'user';
  };

  const value: SimplePermissionContextType = {
    roles,
    isAdmin,
    isUser,
    checkPermission,
    checkDashboardAccess,
    getDashboardType
  };

  return (
    <SimplePermissionContext.Provider value={value}>
      {children}
    </SimplePermissionContext.Provider>
  );
};

export default SimplePermissionProvider;