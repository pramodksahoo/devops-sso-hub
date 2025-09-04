import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface UserContextState {
  // Enhanced user information
  displayName: string;
  primaryRole: string;
  allRoles: string[];
  primaryGroup: string;
  allGroups: string[];
  toolAccessCount: number;
  isAdmin: boolean;
  hasMultipleRoles: boolean;
  hasMultipleGroups: boolean;
  sessionStatus: 'active' | 'expiring' | 'expired';
  lastActivity: Date;
  
  // Context display preferences
  showDetailedContext: boolean;
  showToolAccess: boolean;
  showSessionInfo: boolean;
  compactMode: boolean;
}

export interface UserContextActions {
  toggleDetailedContext: () => void;
  toggleToolAccess: () => void;
  toggleSessionInfo: () => void;
  toggleCompactMode: () => void;
  refreshUserContext: () => Promise<void>;
  updateLastActivity: () => void;
}

export interface UserContextType {
  state: UserContextState;
  actions: UserContextActions;
}

const UserContextContext = createContext<UserContextType | undefined>(undefined);

export const useUserContext = () => {
  const context = useContext(UserContextContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserContextProvider');
  }
  return context;
};

interface UserContextProviderProps {
  children: ReactNode;
}

export const UserContextProvider: React.FC<UserContextProviderProps> = ({ children }) => {
  const { user, session, toolRoleMappings, refreshAuth } = useAuth();
  
  // Enhanced user context state
  const [state, setState] = useState<UserContextState>({
    displayName: '',
    primaryRole: '',
    allRoles: [],
    primaryGroup: '',
    allGroups: [],
    toolAccessCount: 0,
    isAdmin: false,
    hasMultipleRoles: false,
    hasMultipleGroups: false,
    sessionStatus: 'active',
    lastActivity: new Date(),
    showDetailedContext: true,
    showToolAccess: true,
    showSessionInfo: false,
    compactMode: false
  });

  // Update user context state when auth data changes
  useEffect(() => {
    if (user) {
      const isAdmin = user.roles?.includes('admin') || 
                     user.groups?.includes('admins') || 
                     user.roles?.includes('administrator') ||
                     user.email?.includes('admin');
      
      const toolAccessCount = toolRoleMappings ? Object.keys(toolRoleMappings).length : 0;
      
      const sessionStatus = session ? 
        (Date.now() > session.expiresAt - 300000 ? 'expiring' : 'active') : 'expired';

      setState(prev => ({
        ...prev,
        displayName: user.name || user.email?.split('@')[0] || 'User',
        primaryRole: isAdmin ? 'Admin' : (user.roles?.[0] || 'User'),
        allRoles: user.roles || [],
        primaryGroup: user.groups?.[0] || '',
        allGroups: user.groups || [],
        toolAccessCount,
        isAdmin,
        hasMultipleRoles: (user.roles?.length || 0) > 1,
        hasMultipleGroups: (user.groups?.length || 0) > 1,
        sessionStatus,
        lastActivity: new Date()
      }));
    }
  }, [user, session, toolRoleMappings]);

  // Load preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('userContextPreferences');
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        setState(prev => ({
          ...prev,
          showDetailedContext: preferences.showDetailedContext ?? true,
          showToolAccess: preferences.showToolAccess ?? true,
          showSessionInfo: preferences.showSessionInfo ?? false,
          compactMode: preferences.compactMode ?? false
        }));
      } catch (error) {
        console.warn('Failed to load user context preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = (newState: Partial<UserContextState>) => {
    const preferences = {
      showDetailedContext: newState.showDetailedContext,
      showToolAccess: newState.showToolAccess,
      showSessionInfo: newState.showSessionInfo,
      compactMode: newState.compactMode
    };
    localStorage.setItem('userContextPreferences', JSON.stringify(preferences));
  };

  // Actions
  const actions: UserContextActions = {
    toggleDetailedContext: () => {
      setState(prev => {
        const newState = { ...prev, showDetailedContext: !prev.showDetailedContext };
        savePreferences(newState);
        return newState;
      });
    },
    
    toggleToolAccess: () => {
      setState(prev => {
        const newState = { ...prev, showToolAccess: !prev.showToolAccess };
        savePreferences(newState);
        return newState;
      });
    },
    
    toggleSessionInfo: () => {
      setState(prev => {
        const newState = { ...prev, showSessionInfo: !prev.showSessionInfo };
        savePreferences(newState);
        return newState;
      });
    },
    
    toggleCompactMode: () => {
      setState(prev => {
        const newState = { ...prev, compactMode: !prev.compactMode };
        savePreferences(newState);
        return newState;
      });
    },
    
    refreshUserContext: async () => {
      await refreshAuth();
    },
    
    updateLastActivity: () => {
      setState(prev => ({ ...prev, lastActivity: new Date() }));
    }
  };

  // Auto-update last activity on user interaction
  useEffect(() => {
    const handleActivity = () => {
      actions.updateLastActivity();
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  const value: UserContextType = {
    state,
    actions
  };

  return (
    <UserContextContext.Provider value={value}>
      {children}
    </UserContextContext.Provider>
  );
};