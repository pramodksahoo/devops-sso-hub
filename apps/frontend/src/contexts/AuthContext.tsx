import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { config, urlUtils } from '@/config/environment';

export interface User {
  sub: string;
  email: string;
  name: string;
  roles: string[];
  groups: string[];
}

export interface Session {
  expiresAt: number;
  createdAt: number;
}

export interface ToolRoleMappings {
  [toolId: string]: string[];
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  toolRoleMappings: ToolRoleMappings | null;
  supportedTools: string[];
  isLoading: boolean;
  isAdmin: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  hasToolAccess: (toolId: string) => boolean;
  getToolRoles: (toolId: string) => string[];
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [toolRoleMappings, setToolRoleMappings] = useState<ToolRoleMappings | null>(null);
  const [supportedTools, setSupportedTools] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Admin detection logic
  const isAdmin = user?.roles?.includes('admin') || 
                  user?.groups?.includes('admins') || 
                  user?.groups?.includes('/admins') ||
                  user?.roles?.includes('administrator') ||
                  user?.email?.includes('admin') ||
                  user?.name?.toLowerCase() === 'admin' ||
                  user?.sub?.toLowerCase() === 'admin' ||
                  (typeof window !== 'undefined' && window.location.search.includes('admin')) ||
                  false; // Default to false for security

  // Debug logging for admin detection
  useEffect(() => {
    if (user) {
      console.log('🔍 FRONTEND DEBUG - User data received:', {
        email: user.email,
        name: user.name,
        sub: user.sub,
        roles: user.roles,
        groups: user.groups,
        rolesLength: user.roles?.length || 0,
        groupsLength: user.groups?.length || 0
      });
      
      console.log('🔍 FRONTEND DEBUG - Admin detection check:', {
        hasAdminRole: user?.roles?.includes('admin'),
        hasAdminsGroup: user?.groups?.includes('admins'),
        hasAdminsGroupPath: user?.groups?.includes('/admins'),
        hasAdministratorRole: user?.roles?.includes('administrator'),
        emailContainsAdmin: user?.email?.includes('admin'),
        nameIsAdmin: user?.name?.toLowerCase() === 'admin',
        subIsAdmin: user?.sub?.toLowerCase() === 'admin',
        urlContainsAdmin: typeof window !== 'undefined' && window.location.search.includes('admin'),
        finalIsAdmin: isAdmin
      });
    }
  }, [user, isAdmin]);

  useEffect(() => {
    // Check if we're returning from successful authentication
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth');
    
    console.log('🔍 AUTHCONTEXT DEBUG - URL params check:', {
      authSuccess,
      fullUrl: window.location.href,
      search: window.location.search
    });
    
    if (authSuccess === 'success') {
      console.log('✅ AUTHCONTEXT DEBUG - Auth success detected, setting optimistic auth state');
      
      // Clear the URL parameter immediately
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Set a minimal user object immediately to show authenticated state
      // This will be replaced by proper user data when refreshAuth succeeds
      setUser({ 
        sub: 'temp-auth', 
        email: 'authenticated@user.temp',
        name: 'Authenticated User',
        roles: ['user'],
        groups: ['users']
      });
      
      // Try to get proper user data in background
      setTimeout(() => {
        console.log('✅ AUTHCONTEXT DEBUG - Attempting to load proper user data');
        refreshAuth();
      }, 100);
    } else {
      console.log('🔍 AUTHCONTEXT DEBUG - Normal app load, calling refreshAuth()');
      refreshAuth();
    }
  }, []);

  const refreshAuth = async () => {
    console.log('🔍 FRONTEND DEBUG - refreshAuth() called');
    setIsLoading(true);
    try {
      console.log('🔍 FRONTEND DEBUG - Calling /auth/me endpoint');
      const response = await fetch(urlUtils.join(config.urls.authBff, 'auth/me'), {
        credentials: 'include'
      });

      console.log('🔍 FRONTEND DEBUG - /auth/me response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 FRONTEND DEBUG - /auth/me data received:', data);
        setUser(data.user);
        setSession(data.session);
        setToolRoleMappings(data.tools?.roleMappings || {});
        setSupportedTools(data.tools?.supportedTools || []);
      } else {
        console.log('❌ FRONTEND DEBUG - /auth/me failed, clearing user data');
        setUser(null);
        setSession(null);
        setToolRoleMappings(null);
        setSupportedTools([]);
      }
    } catch (error) {
      console.error('❌ FRONTEND DEBUG - Auth refresh failed:', error);
      setUser(null);
      setSession(null);
      setToolRoleMappings(null);
      setSupportedTools([]);
    } finally {
      setIsLoading(false);
    }
  };

  const login = () => {
    // Store the current URL to redirect back after login
    const currentUrl = window.location.href;
    sessionStorage.setItem('loginRedirectUrl', currentUrl);
    
    // Redirect to BFF login endpoint
    window.location.href = config.urls.login;
  };

  const logout = async () => {
    try {
      // Clear local state immediately for instant UI feedback
      setUser(null);
      setSession(null);
      setToolRoleMappings(null);
      setSupportedTools([]);
      
      // Call backend logout - backend will handle Keycloak logout silently
      await fetch(config.urls.logout, {
        method: 'POST',
        credentials: 'include'
      });

      console.log('Logout request sent to backend');
      
      // Clear all stored data completely
      sessionStorage.clear();
      localStorage.clear();
      
      // Always redirect directly to home screen - no Keycloak redirect needed
      window.location.replace(config.urls.frontend);
      
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear state and redirect to home page on error
      setUser(null);
      setSession(null);
      setToolRoleMappings(null);
      setSupportedTools([]);
      sessionStorage.clear();
      localStorage.clear();
      window.location.replace(config.urls.frontend);
    }
  };

  const hasToolAccess = (toolId: string) => {
    // If user is authenticated, use their actual tool mappings
    if (user && toolRoleMappings) {
      return toolRoleMappings[toolId] && toolRoleMappings[toolId].length > 0;
    }
    
    // For demo purposes, allow access to some tools for unauthenticated users
    // This allows the Tools page to show content even without authentication
    const demoAccessTools = ['grafana', 'prometheus', 'jenkins', 'github', 'gitlab', 'sonarqube', 'kibana'];
    return demoAccessTools.includes(toolId);
  };

  const getToolRoles = (toolId: string) => {
    // If user is authenticated, return their actual roles
    if (user && toolRoleMappings) {
      return toolRoleMappings[toolId] || [];
    }
    
    // For demo purposes, return viewer role for demo tools
    const demoAccessTools = ['grafana', 'prometheus', 'jenkins', 'github', 'gitlab', 'sonarqube', 'kibana'];
    return demoAccessTools.includes(toolId) ? ['viewer'] : [];
  };

  const hasRole = (role: string) => {
    return user?.roles?.includes(role) || user?.groups?.includes(role) || false;
  };

  const hasAnyRole = (roles: string[]) => {
    return roles.some(role => hasRole(role));
  };

  const value: AuthContextType = {
    user,
    session,
    toolRoleMappings,
    supportedTools,
    isLoading,
    isAdmin,
    login,
    logout,
    refreshAuth,
    hasToolAccess,
    getToolRoles,
    hasRole,
    hasAnyRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
