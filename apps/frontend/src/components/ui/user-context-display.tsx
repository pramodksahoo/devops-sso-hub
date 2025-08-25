import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Users, 
  Wrench, 
  Clock, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { useAuth } from '../../contexts/AuthContext';
import { useUserContext } from '../../contexts/UserContextProvider';
import { cn } from '../../lib/utils';

interface UserContextDisplayProps {
  variant?: 'header' | 'sidebar' | 'dashboard' | 'floating' | 'minimal';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
  onViewProfile?: () => void;
  showControls?: boolean;
}

export const UserContextDisplay: React.FC<UserContextDisplayProps> = ({
  variant = 'dashboard',
  position = 'top-right',
  className = '',
  onViewProfile,
  showControls = true
}) => {
  const { user, session } = useAuth();
  const { state, actions } = useUserContext();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!user) {
    return (
      <Card className={cn('border-red-200 bg-red-50', className)}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Authentication Required</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await actions.refreshUserContext();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getSessionStatusColor = () => {
    switch (state.sessionStatus) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'expiring': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // const formatTimeAgo = (date: Date) => {
  //   const now = new Date();
  //   const diffMs = now.getTime() - date.getTime();
  //   const diffMins = Math.floor(diffMs / 60000);
  //   const diffHours = Math.floor(diffMins / 60);
  //   
  //   if (diffMins < 1) return 'Just now';
  //   if (diffMins < 60) return `${diffMins}m ago`;
  //   if (diffHours < 24) return `${diffHours}h ago`;
  //   return date.toLocaleDateString();
  // };

  // Header variant - compact display for top navigation
  if (variant === 'header') {
    return (
      <div className={cn('flex items-center space-x-3', className)}>
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">
            {state.primaryRole}
          </span>
        </div>
        {state.hasMultipleGroups && (
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-600">
              {state.primaryGroup}
              {state.allGroups.length > 1 && ` +${state.allGroups.length - 1}`}
            </span>
          </div>
        )}
        {state.toolAccessCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {state.toolAccessCount} tools
          </Badge>
        )}
      </div>
    );
  }

  // Minimal variant - very compact
  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <Badge variant={state.isAdmin ? 'default' : 'secondary'} className="text-xs">
          {state.primaryRole}
        </Badge>
        <Badge 
          variant="outline" 
          className={cn('text-xs', getSessionStatusColor())}
        >
          {state.sessionStatus}
        </Badge>
      </div>
    );
  }

  // Floating variant - positioned overlay
  if (variant === 'floating') {
    const positionClasses = {
      'top-right': 'fixed top-16 right-4 z-40',
      'top-left': 'fixed top-16 left-4 z-40',
      'bottom-right': 'fixed bottom-4 right-4 z-40',
      'bottom-left': 'fixed bottom-4 left-4 z-40'
    };

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(positionClasses[position], className)}
      >
        <Card className="w-80 shadow-lg border-0 bg-white/95 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">User Context</CardTitle>
              <div className="flex items-center space-x-1">
                {showControls && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="h-6 w-6 p-0"
                    >
                      <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="h-6 w-6 p-0"
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="pt-0">
                  <UserContextContent 
                  user={user}
                  state={state}
                  session={session}
                  onViewProfile={onViewProfile}
                  compact={true}
                />
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    );
  }

  // Dashboard variant - full featured display
  return (
    <Card className={cn('border-0 shadow-lg', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Shield className="h-5 w-5 text-blue-600" />
            <span>User Context</span>
          </CardTitle>
          {showControls && (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={actions.toggleCompactMode}
                className="h-8 w-8 p-0"
                title={state.compactMode ? 'Expand view' : 'Compact view'}
              >
                {state.compactMode ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 p-0"
                title="Refresh context"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
        <CardDescription>
          Real-time user context and access information
        </CardDescription>
      </CardHeader>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent>
              <UserContextContent 
                user={user}
                state={state}
                session={session}
                onViewProfile={onViewProfile}
                compact={state.compactMode}
              />
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

// Separate component for the main content to keep it organized
interface UserContextContentProps {
  user: any;
  state: any;
  session: any;
  onViewProfile?: () => void;
  compact?: boolean;
}

const UserContextContent: React.FC<UserContextContentProps> = ({
  user,
  state,
  session,
  onViewProfile,
  compact = false
}) => {
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getSessionStatusColor = () => {
    switch (state.sessionStatus) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'expiring': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-4 overflow-hidden">
      {/* User Identity */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700">Identity</span>
          <Badge variant="outline" className="text-xs max-w-[150px] truncate">
            {state.displayName}
          </Badge>
        </div>
        <div className="text-xs text-gray-600 truncate">
          {user.email}
        </div>
      </div>

      {/* Roles Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700 flex items-center space-x-1">
            <Shield className="h-4 w-4 text-blue-600" />
            <span>Roles</span>
          </span>
          <Badge 
            variant={state.isAdmin ? "default" : "secondary"}
            className={state.isAdmin ? "bg-blue-100 text-blue-800 border-blue-200 max-w-[150px] truncate" : "max-w-[150px] truncate"}
          >
            {state.primaryRole}
            {state.hasMultipleRoles && ` +${state.allRoles.length - 1}`}
          </Badge>
        </div>
        {!compact && state.hasMultipleRoles && (
          <div className="flex flex-wrap gap-1">
            {state.allRoles.slice(1).map((role: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {role}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Groups Section */}
      {state.allGroups.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <Users className="h-4 w-4 text-green-600" />
              <span>Groups</span>
            </span>
            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 max-w-[150px] truncate">
              {state.allGroups.length} group{state.allGroups.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          {!compact && (
            <div className="flex flex-wrap gap-1">
              {state.allGroups.map((group: string, index: number) => (
                <Badge 
                  key={index} 
                  variant={index === 0 ? "default" : "outline"}
                  className={index === 0 ? "bg-green-100 text-green-800 border-green-200 text-xs" : "text-xs"}
                >
                  {group}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tool Access Summary */}
      {state.showToolAccess && (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <Wrench className="h-4 w-4 text-purple-600" />
              <span>Tool Access</span>
            </span>
            <Badge variant="default" className="bg-purple-100 text-purple-800 border-purple-200 max-w-[150px] truncate">
              {state.toolAccessCount} tools
            </Badge>
          </div>
          {!compact && state.toolAccessCount > 0 && (
            <div className="text-xs text-gray-600">
              Access to {state.toolAccessCount} integrated DevOps tools
            </div>
          )}
        </div>
      )}

      {/* Session Information */}
      {state.showSessionInfo && session && (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <Clock className="h-4 w-4 text-orange-600" />
              <span>Session</span>
            </span>
            <Badge className={getSessionStatusColor()}>
              {state.sessionStatus}
            </Badge>
          </div>
          {!compact && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Expires:</span>
                <div className="font-medium">
                  {new Date(session.expiresAt).toLocaleTimeString()}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Last Activity:</span>
                <div className="font-medium">
                  {formatTimeAgo(state.lastActivity)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {onViewProfile && (
        <div className="pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onViewProfile}
            className="w-full"
          >
            View Full Profile
          </Button>
        </div>
      )}

      {/* Real-time indicator */}
      <div className="pt-2 border-t">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Real-time updates active</span>
        </div>
      </div>
    </div>
  );
};

export default UserContextDisplay;