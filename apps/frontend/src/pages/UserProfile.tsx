import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, UserContextDisplay } from '../components/ui';
import { Badge } from '../components/ui/badge';
import { User, Shield, Clock, Settings, Lock, RefreshCw, Activity } from 'lucide-react';

const UserProfile: React.FC = () => {
  const { user, session, toolRoleMappings, refreshAuth } = useAuth();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh user context every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (user) {
        await refreshAuth();
        setLastUpdated(new Date());
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user, refreshAuth]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAuth();
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">User Profile</h1>
                <p className="text-muted-foreground">Your account information and permissions</p>
              </div>
            </div>
            
            {/* Refresh Button */}
            <motion.button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg border border-primary-200 transition-colors disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">Refresh</span>
            </motion.button>
          </div>
          
          {/* Last Updated Indicator */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live updates enabled</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Account Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-foreground font-medium">{user.name || 'Not provided'}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-foreground font-medium">{user.email || 'Not provided'}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Subject ID</label>
                    <p className="text-foreground font-mono text-sm">{user.sub || 'Not provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Session Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <p className="text-foreground font-medium">
                      {session?.createdAt ? new Date(session.createdAt).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Expires</label>
                    <p className="text-foreground font-medium">
                      {session?.expiresAt ? new Date(session.expiresAt).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tool Permissions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Tool Permissions</span>
                </CardTitle>
                <CardDescription>
                  Your access permissions across integrated DevOps tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                {toolRoleMappings && Object.keys(toolRoleMappings).length > 0 ? (
                  <div className="grid gap-4">
                    {Object.entries(toolRoleMappings).map(([toolId, roles]) => (
                      <div key={toolId} className="border rounded-lg p-4 bg-muted/30">
                        <h4 className="font-semibold text-foreground mb-3 capitalize">
                          {toolId.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {roles && roles.length > 0 ? (
                            roles.map((role) => (
                              <Badge key={role} variant="secondary">
                                {role}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              No access
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No tool permissions configured</p>
                    <p className="text-sm">Contact your administrator to configure access</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - User Context Info */}
          <div className="space-y-6">
            {/* Enhanced User Context Information */}
            <UserContextDisplay 
              variant="dashboard"
              showControls={true}
            />
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <button className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Request Role Change</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Submit a request for role modification</p>
                </button>
                
                <button className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-2">
                    <Settings className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Update Preferences</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Customize your dashboard settings</p>
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default UserProfile;
