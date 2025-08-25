import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Activity,
  ArrowUpRight,
  Download,
  ExternalLink,
  Plus,
  Settings,
  Database,
  AlertTriangle,
  CheckCircle,
  Wrench,
  Globe,
  Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTool } from '../contexts/ToolContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge, Tabs, TabsList, TabsTrigger, UserContextDisplay } from '../components/ui';
import { formatRelativeTime } from '../lib/utils';
import { config } from '../config/environment';

interface DashboardProps {
  onNavigate?: (view: 'dashboard' | 'tools' | 'profile' | 'admin' | 'admin-tools' | 'launchpad' | 'health' | 'webhooks' | 'audit' | 'analytics' | 'user-management' | 'ldap' | 'provisioning' | 'privacy-policy' | 'terms-conditions' | 'features' | 'integrations' | 'security') => void;
}

interface AdminTool {
  tool_type: string;
  name: string;
  category: string;
  protocol: 'oidc' | 'saml';
  configured: boolean;
  status: string;
  last_tested?: string;
  uptime_percentage?: number;
  response_time_ms?: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { tools } = useTool();
  
  // Admin state
  const [adminTools, setAdminTools] = useState<AdminTool[]>([]);

  // Check if user has admin privileges - multiple detection methods
  const isAdmin = user?.roles?.includes('admin') || 
                  user?.groups?.includes('admins') || 
                  user?.roles?.includes('administrator') ||
                  user?.email?.includes('admin') ||
                  user?.name?.toLowerCase() === 'admin' ||
                  user?.sub?.toLowerCase() === 'admin' ||
                  true; // Temporary: treat all users as admin for testing

  const accessibleTools = tools.filter(tool => tool.hasAccess);
  const recentlyUsedTools = tools
    .filter(tool => tool.lastLaunched)
    .sort((a, b) => (b.lastLaunched || 0) - (a.lastLaunched || 0))
    .slice(0, 5);
  
  const getToolsByCategory = (): Record<string, typeof tools> => {
    const categories: Record<string, typeof tools> = {};
    accessibleTools.forEach(tool => {
      if (!categories[tool.category]) {
        categories[tool.category] = [];
      }
      categories[tool.category].push(tool);
    });
    return categories;
  };

  const toolsByCategory = getToolsByCategory();

  // Fetch admin tools if user is admin
  useEffect(() => {
    if (isAdmin) {
      fetchAdminTools();
    }
  }, [isAdmin]);

  const fetchAdminTools = async () => {
    try {
      const response = await fetch(`${config.urls.api}/admin`, {
        credentials: 'include',
        headers: {
          'X-API-Key': 'admin-api-key-change-in-production'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const toolsList = data.tools || [];
        setAdminTools(toolsList);
        
        // Admin stats updated
      }
    } catch (error) {
      console.error('Failed to fetch admin tools:', error);
    }
  };



  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  // Stats data for the new professional design - using inline values

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50"
    >
      {/* Professional Dashboard Header - shadcn/ui Style */}
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">Welcome back, {user?.name || user?.email}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add New
            </Button>
          </div>
        </div>
        
        {/* User Context Quick Info */}
        <div className="flex items-center justify-between">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics" disabled>Analytics</TabsTrigger>
              <TabsTrigger value="reports" disabled>Reports</TabsTrigger>
              <TabsTrigger value="notifications" disabled>Notifications</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Compact User Context Display */}
          <UserContextDisplay 
            variant="header"
            className="hidden md:flex"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Professional Stats Grid - shadcn/ui Style */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Tools
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                +2 this month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Configured
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Ready to use
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Running
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Errors
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Needs attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Content Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Professional Quick Access - shadcn/ui Style */}
          <div className="col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Access</CardTitle>
                <CardDescription>
                  {isAdmin ? 'Manage your tool integrations and system settings' : 'Access your DevOps tools quickly'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isAdmin ? (
                  // Admin Tool Management
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tool Management</span>
                      <Button 
                        size="sm" 
                        onClick={() => onNavigate?.('admin-tools')}
                      >
                        Manage Tools
                        <ArrowUpRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Settings className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">Configuration</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Configure new tool integrations</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Activity className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Monitoring</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Monitor tool health and status</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  // Regular User Tool Access
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tool Launchpad</span>
                      <Button 
                        size="sm" 
                        onClick={() => onNavigate?.('launchpad')}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Launch Tools
                        <ArrowUpRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {accessibleTools.slice(0, 6).map((tool) => (
                        <Card key={tool.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <Globe className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium">{tool.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{tool.category}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    {accessibleTools.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm font-medium mb-2">No tools configured yet</p>
                        <p className="text-xs">Contact your administrator to configure DevOps tools</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Professional shadcn/ui Style */}
          <div className="col-span-3 space-y-4">
            {/* User Context Information */}
            <UserContextDisplay 
              variant="sidebar"
              className="mb-6"
              onViewProfile={() => onNavigate?.('profile')}
            />

            {/* Admin Panel - Only show for admin users */}
            {isAdmin && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-blue-800">
                      <Settings className="h-5 w-5" />
                      <span>Admin Actions</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onNavigate?.('admin')}
                        className="w-full border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-colors"
                      >
                        <Activity className="w-4 h-4 mr-2" />
                        System Overview
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onNavigate?.('admin-tools')}
                        className="w-full border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-colors"
                      >
                        <Wrench className="w-4 h-4 mr-2" />
                        Tool Management
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Tool Categories */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Categories</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(toolsByCategory).map(([category, tools]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{category}</span>
                      <Badge variant="secondary">{tools.length}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recently Used - Full Width */}
        {recentlyUsedTools.length > 0 && (
          <motion.div variants={itemVariants} className="mt-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Recently Used Tools</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentlyUsedTools.map((tool) => (
                    <div key={tool.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{tool.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {tool.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{tool.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Last used: {tool.lastLaunched ? formatRelativeTime(tool.lastLaunched) : 'Never'}</span>
                        <Button size="sm" variant="ghost" className="h-6 px-2">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Admin Tools Overview - Only show for admin users */}
        {isAdmin && adminTools.length > 0 && (
          <motion.div variants={itemVariants} className="mt-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wrench className="h-5 w-5" />
                  <span>Tool Integrations Overview</span>
                </CardTitle>
                <CardDescription>
                  System-wide tool status and configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {adminTools.map((tool) => (
                    <div key={tool.tool_type} className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-900">{tool.name}</span>
                        <Badge 
                          variant={tool.status === 'active' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {tool.status}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Protocol:</span>
                          <span className="font-medium">{tool.protocol.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Configured:</span>
                          <span className={`font-medium ${tool.configured ? 'text-green-600' : 'text-red-600'}`}>
                            {tool.configured ? 'Yes' : 'No'}
                          </span>
                        </div>
                        {tool.uptime_percentage && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Uptime:</span>
                            <span className="font-medium text-blue-600">{tool.uptime_percentage}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default Dashboard;
