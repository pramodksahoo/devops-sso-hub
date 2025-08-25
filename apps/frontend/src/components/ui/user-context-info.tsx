import React from 'react';
import { Shield, Users, Wrench, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { useAuth } from '../../contexts/AuthContext';

interface UserContextInfoProps {
  variant?: 'compact' | 'detailed' | 'dashboard';
  showToolAccess?: boolean;
  showSessionInfo?: boolean;
  className?: string;
  onViewProfile?: () => void;
}

export const UserContextInfo: React.FC<UserContextInfoProps> = ({
  variant = 'detailed',
  showToolAccess = true,
  showSessionInfo = false,
  className = '',
  onViewProfile
}) => {
  const { user, session, toolRoleMappings } = useAuth();

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">User not authenticated</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasRoles = user.roles && user.roles.length > 0;
  const hasGroups = user.groups && user.groups.length > 0;
  const hasToolAccess = toolRoleMappings && Object.keys(toolRoleMappings).length > 0;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">
            {hasRoles ? user.roles[0] : 'User'}
          </span>
        </div>
        {hasGroups && (
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-600">
              {user.groups[0]}
              {user.groups.length > 1 && ` +${user.groups.length - 1}`}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <Card className={`border-0 shadow-lg ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Shield className="h-5 w-5 text-blue-600" />
            <span>Your Access</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Roles Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Role</span>
              {hasRoles ? (
                <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                  {user.roles[0]}
                  {user.roles.length > 1 && ` +${user.roles.length - 1}`}
                </Badge>
              ) : (
                <Badge variant="secondary">No roles</Badge>
              )}
            </div>
            {user.roles && user.roles.length > 1 && (
              <div className="flex flex-wrap gap-1">
                {user.roles.slice(1).map((role, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Groups Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Groups</span>
              {hasGroups ? (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  {user.groups.length} group{user.groups.length !== 1 ? 's' : ''}
                </Badge>
              ) : (
                <Badge variant="secondary">No groups</Badge>
              )}
            </div>
            {hasGroups && (
              <div className="flex flex-wrap gap-1">
                {user.groups.map((group, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {group}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Tool Access Summary */}
          {showToolAccess && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Tools Access</span>
                <Badge variant="default" className="bg-purple-100 text-purple-800 border-purple-200">
                  {hasToolAccess ? Object.keys(toolRoleMappings || {}).length : 0} tools
                </Badge>
              </div>
              {hasToolAccess && (
                <div className="text-xs text-gray-600">
                  Access to {Object.keys(toolRoleMappings || {}).length} integrated tools
                </div>
              )}
            </div>
          )}

          {/* View Profile Button */}
          {onViewProfile && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onViewProfile}
              className="w-full mt-3"
            >
              View Full Profile
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Detailed variant (default)
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>User Context Information</span>
        </CardTitle>
        <CardDescription>
          Your current roles, groups, and system access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Roles Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span>Roles</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {hasRoles ? (
              user.roles.map((role, index) => (
                <Badge 
                  key={role} 
                  variant={index === 0 ? "default" : "secondary"}
                  className={index === 0 ? "bg-blue-100 text-blue-800 border-blue-200" : ""}
                >
                  {role}
                </Badge>
              ))
            ) : (
              <Badge variant="secondary">No roles assigned</Badge>
            )}
          </div>
          {hasRoles && (
            <p className="text-sm text-muted-foreground">
              Primary role: <span className="font-medium">{user.roles[0]}</span>
              {user.roles.length > 1 && ` (${user.roles.length - 1} additional role${user.roles.length > 2 ? 's' : ''})`}
            </p>
          )}
        </div>

        {/* Groups Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center space-x-2">
            <Users className="h-5 w-5 text-green-600" />
            <span>Groups</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {hasGroups ? (
              user.groups.map((group, index) => (
                <Badge 
                  key={group} 
                  variant={index === 0 ? "default" : "outline"}
                  className={index === 0 ? "bg-green-100 text-green-800 border-green-200" : ""}
                >
                  {group}
                </Badge>
              ))
            ) : (
              <Badge variant="secondary">No groups assigned</Badge>
            )}
          </div>
          {hasGroups && (
            <p className="text-sm text-muted-foreground">
              Member of {user.groups.length} group{user.groups.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Tool Access Section */}
        {showToolAccess && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-purple-600" />
              <span>Tool Access</span>
            </h3>
            {hasToolAccess ? (
              <div className="space-y-3">
                <div className="grid gap-3">
                  {Object.entries(toolRoleMappings || {}).map(([toolId, roles]) => (
                    <div key={toolId} className="border rounded-lg p-3 bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-foreground capitalize">
                          {toolId.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {roles?.length || 0} role{roles?.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {roles && roles.length > 0 ? (
                          roles.map((role) => (
                            <Badge key={role} variant="secondary" className="text-xs">
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            No access
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Access to {Object.keys(toolRoleMappings || {}).length} integrated DevOps tools
                </p>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tool access configured</p>
                <p className="text-xs">Contact your administrator to configure access</p>
              </div>
            )}
          </div>
        )}

        {/* Session Information */}
        {showSessionInfo && session && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <span>Session</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-foreground font-medium">
                  {new Date(session.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Expires</label>
                <p className="text-foreground font-medium">
                  {new Date(session.expiresAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Update Indicator */}
        <div className="pt-4 border-t">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Information updates in real-time</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserContextInfo;
