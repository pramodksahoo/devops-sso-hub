import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { SkeletonCard } from '../components/ui/loading';
import { Switch } from '../components/ui/switch';
import { AlertCircle, ExternalLink, Settings, Star, Zap, Shield, Database, BarChart3, GitBranch, AlertTriangle, Activity, Users } from 'lucide-react';
import {
  GitHubLogo,
  GitLabLogo,
  JenkinsLogo,
  ArgoCDLogo,
  TerraformLogo,
  SonarQubeLogo,
  GrafanaLogo,
  PrometheusLogo,
  KibanaLogo,
  JiraLogo,
  AWLogo,
  AzureLogo,
  CircleCILogo,
  BitBucketLogo,
  KubernetesLogo,
  DefaultLogo
} from '../assets/logos';
import { config } from '../config/environment';

interface Tool {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_url: string;
  logo_url: string;
  is_featured: boolean;
  status: string;
  integration_type: string;
  tags: string[];
  capabilities?: {
    sso: boolean;
    scim: boolean;
    webhooks: boolean;
    deep_links: boolean;
    api_access: boolean;
    user_provisioning: boolean;
    group_management: boolean;
    role_mapping: boolean;
    audit_logs: boolean;
    session_management: boolean;
    mfa_enforcement: boolean;
  };
  usage_stats?: {
    daily_launches: number;
    unique_users: number;
    avg_response_time: number;
  };
  user_access?: {
    has_access: boolean;
    required_roles: string[];
    required_groups: string[];
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  tools: Tool[];
}

interface CatalogResponse {
  success: boolean;
  categories: Category[];
  total_tools: number;
}

interface LaunchResponse {
  success: boolean;
  launch_url: string;
  launch_type: string;
  session_token: string;
  expires_at: string;
  instructions: string;
}

const getCategoryIcon = (iconName: string) => {
  const icons: Record<string, React.ReactNode> = {
    'git-branch': <GitBranch className="h-5 w-5" />,
    'cloud': <Database className="h-5 w-5" />,
    'shield-check': <Shield className="h-5 w-5" />,
    'activity': <BarChart3 className="h-5 w-5" />,
    'file-text': <Database className="h-5 w-5" />,
    'clipboard-list': <Settings className="h-5 w-5" />,
    'settings': <Settings className="h-5 w-5" />,
    'shield': <Shield className="h-5 w-5" />,
    'bar-chart': <BarChart3 className="h-5 w-5" />
  };
  return icons[iconName] || <Settings className="h-5 w-5" />;
};

// Tool icon mapping function
const getToolIcon = (toolSlug: string, toolName: string): React.ReactNode => {
  const iconMap: Record<string, string> = {
    github: GitHubLogo,
    gitlab: GitLabLogo,
    jenkins: JenkinsLogo,
    argocd: ArgoCDLogo,
    'argo cd': ArgoCDLogo,
    terraform: TerraformLogo,
    sonarqube: SonarQubeLogo,
    grafana: GrafanaLogo,
    prometheus: PrometheusLogo,
    kibana: KibanaLogo,
    jira: JiraLogo,
    servicenow: DefaultLogo,
    snyk: DefaultLogo,
    aws: AWLogo,
    azure: AzureLogo,
    circleci: CircleCILogo,
    bitbucket: BitBucketLogo,
    kubernetes: KubernetesLogo
  };
  
  const toolKey = toolSlug?.toLowerCase() || toolName?.toLowerCase().replace(/\s+/g, '') || '';
  const logoSrc = iconMap[toolKey] || DefaultLogo;
  
  return (
    <img 
      src={logoSrc} 
      alt={toolName} 
      className="w-8 h-8 object-contain" 
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src = DefaultLogo;
      }}
    />
  );
};


const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
    case 'available':
      return { 
        label: 'Active', 
        variant: 'default' as const, 
        icon: <Activity className="h-3 w-3 mr-1 text-green-600" />, 
        color: 'bg-green-50 text-green-700' 
      };
    case 'maintenance':
    case 'degraded':
      return { 
        label: 'Maintenance', 
        variant: 'secondary' as const, 
        icon: <AlertTriangle className="h-3 w-3 mr-1 text-yellow-600" />, 
        color: 'bg-yellow-50 text-yellow-700' 
      };
    case 'error':
    case 'unavailable':
      return { 
        label: 'Inactive', 
        variant: 'destructive' as const, 
        icon: <AlertCircle className="h-3 w-3 mr-1 text-red-600" />, 
        color: 'bg-red-50 text-red-700' 
      };
    default:
      return { 
        label: 'Active', 
        variant: 'default' as const, 
        icon: <Activity className="h-3 w-3 mr-1 text-green-600" />, 
        color: 'bg-green-50 text-green-700' 
      };
  }
};

export const ToolLaunchpad: React.FC = () => {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [launchingTool, setLaunchingTool] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCatalog();
    }
  }, [user, selectedCategory, showFeaturedOnly]);

  const fetchCatalog = async () => {
    if (!user) {
      setError('Authentication required - User not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (showFeaturedOnly) {
        params.append('featured', 'true');
      }
      params.append('include_capabilities', 'true');

      const response = await fetch(`${config.urls.api}/tools?${params}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(errorData.error || `Failed to fetch catalog: ${response.status}`);
      }

      const data: CatalogResponse = await response.json();
      setCatalog(data);
    } catch (err) {
      console.error('Failed to fetch catalog:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch catalog');
    } finally {
      setLoading(false);
    }
  };

  const launchTool = async (tool: Tool, context?: any) => {
    if (!user) {
      setError('Authentication required');
      return;
    }

    try {
      setLaunchingTool(tool.id);
      setError(null);

      const launchRequest = {
        context: context || {},
        return_url: window.location.href
      };

      const response = await fetch(`${config.urls.api}/tools/${tool.id}/launch`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(launchRequest)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `Launch failed: ${response.status}`);
      }

      const launchData: LaunchResponse = await response.json();

      if (launchData.success && launchData.launch_url) {
        // Open tool in new tab/window
        window.open(launchData.launch_url, '_blank', 'noopener,noreferrer');
        // Show success message with instructions
        console.log('Tool launch instructions:', launchData.instructions);
      } else {
        throw new Error('Invalid launch response');
      }
    } catch (err) {
      console.error('Failed to launch tool:', err);
      setError(err instanceof Error ? err.message : 'Failed to launch tool');
    } finally {
      setLaunchingTool(null);
    }
  };

  const renderCapabilityBadges = (capabilities: Tool['capabilities']) => {
    if (!capabilities) return null;

    const activeCaps = Object.entries(capabilities)
      .filter(([_, enabled]) => enabled)
      .slice(0, 3);

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {activeCaps.map(([cap]) => (
          <Badge key={cap} variant="secondary" className="text-xs">
            {cap.replace('_', ' ')}
          </Badge>
        ))}
        {Object.values(capabilities).filter(Boolean).length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{Object.values(capabilities).filter(Boolean).length - 3} more
          </Badge>
        )}
      </div>
    );
  };

  const renderToolCard = (tool: Tool) => {
    const statusBadge = getStatusBadge(tool.status || 'active');
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <Card className="relative h-full group hover:shadow-xl transition-all duration-300 border-0 shadow-md hover:shadow-2xl hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50">
          {/* Featured ribbon */}
          {tool.is_featured && (
            <div className="absolute -top-2 -right-2 z-10 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs px-3 py-1 shadow-lg flex items-center font-medium">
              <Star className="h-3 w-3 mr-1 fill-white" /> Featured
            </div>
          )}
          
          <CardHeader className="pb-4">
            <div className="flex items-start space-x-4">
              {/* Tool Icon */}
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm group-hover:shadow-md transition-shadow">
                {getToolIcon(tool.slug, tool.name)}
              </div>
              
              {/* Tool Info */}
              <div className="flex-grow min-w-0">
                <CardTitle className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                  {tool.name}
                </CardTitle>
                
                {/* Status Badge */}
                <div className="flex items-center space-x-2">
                  <Badge className={`${statusBadge.color} border-0 font-medium text-xs px-2 py-1`}>
                    {statusBadge.icon}
                    {statusBadge.label}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <CardDescription className="text-gray-600 mb-4 line-clamp-3 leading-relaxed">
              {tool.description}
            </CardDescription>

            {/* Capabilities */}
            {renderCapabilityBadges(tool.capabilities)}

            {/* Usage Stats */}
            {tool.usage_stats && (
              <div className="flex items-center justify-between mt-4 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-600">
                <span className="flex items-center">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  {tool.usage_stats.daily_launches} launches today
                </span>
                <span className="flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {tool.usage_stats.unique_users} users
                </span>
              </div>
            )}

            {/* Launch Button */}
            <div className="mt-6">
              <Button
                onClick={() => launchTool(tool)}
                disabled={launchingTool === tool.id || tool.status === 'maintenance'}
                className={`w-full h-12 text-sm font-semibold transition-all duration-200 ${
                  tool.is_featured 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl' 
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50'
                }`}
                variant={tool.is_featured ? 'default' : 'outline'}
              >
                {launchingTool === tool.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Launching...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Launch {tool.name}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const allCategories = catalog?.categories || [];
  const categoryOptions = [
    { slug: 'all', name: 'All Tools' },
    ...allCategories.map(cat => ({ slug: cat.slug, name: cat.name }))
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Catalog</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchCatalog}>
              Try Again
            </Button>
          </div>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Tool Launchpad</h1>
          <p className="text-muted-foreground">
            Launch and manage your integrated development and operations tools
          </p>
          {catalog && (
            <p className="text-sm text-muted-foreground mt-2">
              {catalog.total_tools} tools available across {catalog.categories.length} categories
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="flex items-center space-x-2">
            <label htmlFor="category-select" className="text-sm font-medium">
              Category:
            </label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-input rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-ring focus:border-ring bg-background"
            >
              {categoryOptions.map(option => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={showFeaturedOnly}
              onCheckedChange={setShowFeaturedOnly as any}
              id="featured-switch"
            />
            <label htmlFor="featured-switch" className="text-sm">Featured tools only</label>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Tool Categories */}
        {selectedCategory === 'all' ? (
          allCategories.map((category) => (
            <div key={category.id} className="mb-12">
              <div className="flex items-center space-x-3 mb-6">
                {getCategoryIcon(category.icon)}
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{category.name}</h2>
                  <p className="text-muted-foreground">{category.description}</p>
                </div>
              </div>
              
              {category.tools.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {category.tools.map((t) => renderToolCard(t))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tools available in this category</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div>
            {allCategories
              .filter(cat => cat.slug === selectedCategory)
              .map(category => (
                <div key={category.id}>
                  <div className="flex items-center space-x-3 mb-6">
                    {getCategoryIcon(category.icon)}
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{category.name}</h2>
                      <p className="text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  
                  {category.tools.length > 0 ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {category.tools.map((t) => renderToolCard(t))}
                  </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No tools available in this category</p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {catalog && catalog.total_tools === 0 && (
          <div className="text-center py-12">
            <Zap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Tools Available</h3>
            <p className="text-muted-foreground mb-6">
              Tools will appear here once they are configured and activated by administrators.
            </p>
            {user?.roles?.includes('admin') && (
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configure Tools
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
