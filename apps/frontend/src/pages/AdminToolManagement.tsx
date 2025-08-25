import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loading } from '../components/ui/loading';
import DynamicToolConfiguration from '../components/DynamicToolConfiguration';
import { 
  Settings, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink, 
  RefreshCw,
  Edit,
  Eye,
  Zap,
  Database,
  Shield,
  Play,
  GitBranch,
  Cloud,
  Activity,
  FileText,
  ClipboardList,
  Lock,
  Wrench
} from 'lucide-react';
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
  base_url?: string;
  icon_url: string;
  integration_type?: string;
  auth_config?: Record<string, any>;
  is_active?: boolean;
  is_featured: boolean;
  status: string;
  category?: {
    name: string;
    slug: string;
    icon: string;
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

interface AdminToolManagementProps {
  onNavigate: (view: 'dashboard' | 'tools' | 'profile' | 'admin' | 'admin-tools' | 'launchpad' | 'health' | 'webhooks' | 'audit' | 'analytics' | 'user-management' | 'ldap' | 'provisioning' | 'privacy-policy' | 'terms-conditions' | 'features' | 'integrations' | 'security') => void;
}

// Tool icon mapping function for AdminToolManagement
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

const AdminToolManagement: React.FC<AdminToolManagementProps> = ({ onNavigate }) => {
  console.log('🔧 AdminToolManagement component rendering');
  const { user, isAdmin } = useAuth();
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configTool, setConfigTool] = useState<Tool | null>(null);
  const [toolFormData, setToolFormData] = useState({
    name: '',
    description: '',
    base_url: '',
    is_active: true,
    is_featured: false,
    status: 'active'
  });

  useEffect(() => {
    console.log('🔧 useEffect triggered, user:', !!user, 'isAdmin:', isAdmin);
    if (user) {
      fetchCatalog();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchCatalog = async () => {
    if (!user) {
      console.log('🔧 No user, skipping fetch');
      return;
    }
    
    try {
      console.log('🔧 Starting catalog fetch...');
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${config.urls.api}/tools?include_capabilities=true&include_launch_config=true`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔧 Response status:', response.status);
      console.log('🔧 Response ok:', response.ok);
      
      if (response.ok) {
        const data: CatalogResponse = await response.json();
        console.log('🔧 Received data:', data);
        setCatalog(data);
      } else {
        const errorText = await response.text();
        console.error('🔧 Response error:', errorText);
        setError(`Failed to fetch catalog: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('🔧 Fetch error:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch catalog');
    } finally {
      setIsLoading(false);
    }
  };

  // Safe access to tools with null checks
  const allTools = catalog?.categories ? catalog.categories.flatMap(cat => 
    cat.tools.map(tool => ({
      ...tool,
      category: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon
      }
    }))
  ) : [];

  // Tool management functions
  const handleEditTool = (tool: Tool) => {
    setEditingTool(tool);
    setToolFormData({
      name: tool.name,
      description: tool.description,
      base_url: tool.base_url || '',
      is_active: tool.is_active || true,
      is_featured: tool.is_featured,
      status: tool.status
    });
    setShowEditModal(true);
  };

  const handleConfigureTool = async (tool: Tool) => {
    // Fetch the tool's current configuration from the backend
    try {
      const response = await fetch(`${config.urls.api}/tools/${tool.id}/config`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Fetched tool config:', result);
        
        // Set the tool with its auth_config
        setConfigTool({
          ...tool,
          integration_type: result.integration_type || tool.integration_type,
          auth_config: result.auth_config || {}
        });
      } else {
        console.warn('Failed to fetch tool config, using default:', response.status);
        // If fetch fails, still open the modal with the basic tool info
        setConfigTool(tool);
      }
    } catch (error) {
      console.error('Error fetching tool config:', error);
      // If error occurs, still open the modal with the basic tool info
      setConfigTool(tool);
    }
    
    setShowConfigModal(true);
  };

  const handleSaveTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTool) return;

    try {
      console.log('🔧 Updating tool:', editingTool.id, toolFormData);
      
      const response = await fetch(`${config.urls.api}/tools/${editingTool.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(toolFormData)
      });

      if (response.ok) {
        console.log('✅ Tool updated successfully');
        await fetchCatalog(); // Refresh the catalog
        setShowEditModal(false);
        setEditingTool(null);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to update tool:', errorText);
        setError('Failed to update tool: ' + errorText);
      }
    } catch (error) {
      console.error('❌ Error updating tool:', error);
      setError('Error updating tool: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleSaveToolConfig = async (configData: Record<string, any>) => {
    if (!configTool) return;

    try {
      console.log('🔧 Updating tool configuration:', configTool.id, configData);
      
      const response = await fetch(`${config.urls.api}/tools/${configTool.id}/config`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Tool configuration updated successfully', result);
        
        // Update the configTool state with the actual saved tool data from the server
        if (result.success && result.tool) {
          setConfigTool(prevTool => ({
            ...prevTool!,
            ...result.tool,  // Use the server response which includes updated auth_config
            integration_type: result.tool.integration_type,
            auth_config: result.tool.auth_config
          }));
        }
        
        await fetchCatalog(); // Refresh the catalog for other tools
        
        // Show success and close modal after a brief delay for user feedback
        setTimeout(() => {
          setShowConfigModal(false);
          setConfigTool(null);
        }, 1500);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to update tool configuration:', errorText);
        setError('Failed to update tool configuration: ' + errorText);
      }
    } catch (error) {
      console.error('❌ Error updating tool configuration:', error);
      setError('Error updating tool configuration: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleLaunchTool = (tool: Tool) => {
    if (tool.base_url) {
      window.open(tool.base_url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('Tool has no base URL configured:', tool.name);
    }
  };

  // Tools are filtered at the category level in the render logic below

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'code': <GitBranch className="h-5 w-5" />,
      'git-branch': <GitBranch className="h-5 w-5" />,
      'cloud': <Cloud className="h-5 w-5" />,
      'shield-check': <Shield className="h-5 w-5" />,
      'activity': <Activity className="h-5 w-5" />,
      'file-text': <FileText className="h-5 w-5" />,
      'shield': <Shield className="h-5 w-5" />,
      'clipboard-list': <ClipboardList className="h-5 w-5" />,
      'settings': <Settings className="h-5 w-5" />
    };
    return iconMap[iconName] || <Settings className="h-5 w-5" />;
  };

  // Access control check
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You need administrator privileges to access tool management.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Loading />
            <p className="mt-4 text-gray-600">Loading tool catalog...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Catalog</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={fetchCatalog}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600">Please log in to access tool management.</p>
          </div>
        </div>
      </div>
    );
  }

  console.log('🔧 Rendering main component, catalog:', !!catalog, 'tools count:', allTools.length);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Tool Management</h1>
              <p className="text-gray-600">
                Configure and manage your integrated DevOps tools
              </p>
              {catalog && (
                <p className="text-sm text-gray-500 mt-2">
                  {catalog.total_tools} tools across {catalog.categories.length} categories
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => onNavigate('launchpad')} variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                View Launchpad
              </Button>
              <Button onClick={fetchCatalog}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="flex items-center space-x-2">
            <label htmlFor="search" className="text-sm font-medium text-gray-700">
              Search:
            </label>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools..."
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="category-select" className="text-sm font-medium text-gray-700">
              Category:
            </label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {catalog?.categories.map(cat => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Tools</p>
                  <p className="text-2xl font-bold">{catalog?.total_tools || 0}</p>
                </div>
                <Database className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Tools</p>
                  <p className="text-2xl font-bold text-green-600">
                    {allTools.filter(t => t.status === 'active').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Featured Tools</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {allTools.filter(t => t.is_featured).length}
                  </p>
                </div>
                <Zap className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Categories</p>
                  <p className="text-2xl font-bold">{catalog?.categories.length || 0}</p>
                </div>
                <Settings className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories and Tools */}
        {catalog && catalog.categories.length > 0 ? (
          <div className="space-y-8">
            {catalog.categories
              .filter(category => 
                selectedCategory === 'all' || category.slug === selectedCategory
              )
              .filter(category => 
                searchQuery === '' || 
                category.tools.some(tool => 
                  tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  tool.description.toLowerCase().includes(searchQuery.toLowerCase())
                )
              )
              .map((category) => {
                const categoryTools = category.tools.filter(tool =>
                  searchQuery === '' ||
                  tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  tool.description.toLowerCase().includes(searchQuery.toLowerCase())
                );

                if (categoryTools.length === 0) return null;

                return (
                  <div key={category.id}>
                    {/* Category Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-50">
                        {getCategoryIcon(category.icon)}
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">{category.name}</h2>
                        <p className="text-sm text-gray-600">{category.description}</p>
                      </div>
                      <Badge variant="secondary" className="ml-auto">
                        {categoryTools.length} tool{categoryTools.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {/* Tools Grid - Fixed alignment with equal heights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                      {categoryTools.map((tool) => (
                        <Card key={tool.id} className="flex flex-col hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-blue-300">
                          <CardHeader className="pb-3 flex-shrink-0">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border border-blue-100">
                                {getToolIcon(tool.slug, tool.name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                                  {tool.name}
                                </CardTitle>
                                <div className="flex items-center flex-wrap gap-2 mt-1">
                                  <Badge className={getStatusColor(tool.status)}>
                                    {tool.status}
                                  </Badge>
                                  {tool.is_featured && (
                                    <Badge variant="outline" className="text-purple-600 border-purple-200">
                                      Featured
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="flex-1 flex flex-col justify-between pt-0">
                            <div className="flex-1">
                              <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                                {tool.description}
                              </p>
                              <div className="text-xs text-gray-500 mb-4">
                                <span className="font-medium">Slug:</span> 
                                <code className="ml-1 px-1 py-0.5 bg-gray-100 rounded text-xs">{tool.slug}</code>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                              <div className="flex items-center space-x-1">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="hover:bg-green-50 hover:border-green-300"
                                  onClick={() => handleLaunchTool(tool)}
                                  title="Launch Tool"
                                >
                                  <Play className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="hover:bg-blue-50 hover:border-blue-300"
                                  onClick={() => handleEditTool(tool)}
                                  title="Edit Tool Details"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="hover:bg-purple-50 hover:border-purple-300"
                                  onClick={() => handleConfigureTool(tool)}
                                  title="Configure Integration"
                                >
                                  {tool.auth_config ? (
                                    <Lock className="h-3 w-3 text-purple-600" />
                                  ) : (
                                    <Wrench className="h-3 w-3" />
                                  )}
                                </Button>
                                {tool.base_url && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="hover:bg-gray-50"
                                    onClick={() => window.open(tool.base_url, '_blank')}
                                    title="Open in New Tab"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                {tool.category?.name}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tools Found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedCategory !== 'all' 
                ? 'No tools match your current filters.'
                : 'No tools are configured yet.'
              }
            </p>
          </div>
        )}
        
        {/* Edit Tool Modal */}
        {showEditModal && editingTool && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Edit Tool: {editingTool.name}
                  </h2>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTool(null);
                    }}
                  >
                    ×
                  </Button>
                </div>

                <form onSubmit={handleSaveTool} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tool Name
                    </label>
                    <input
                      type="text"
                      required
                      value={toolFormData.name}
                      onChange={(e) => setToolFormData((prev: typeof toolFormData) => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={toolFormData.description}
                      onChange={(e) => setToolFormData((prev: typeof toolFormData) => ({ ...prev, description: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Base URL
                    </label>
                    <input
                      type="url"
                      value={toolFormData.base_url}
                      onChange={(e) => setToolFormData((prev: typeof toolFormData) => ({ ...prev, base_url: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={toolFormData.status}
                      onChange={(e) => setToolFormData((prev: typeof toolFormData) => ({ ...prev, status: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="error">Error</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={toolFormData.is_active}
                        onChange={(e) => setToolFormData((prev: typeof toolFormData) => ({ ...prev, is_active: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Tool is active</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={toolFormData.is_featured}
                        onChange={(e) => setToolFormData((prev: typeof toolFormData) => ({ ...prev, is_featured: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Featured tool</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingTool(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      Save Changes
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tool Configuration Modal */}
        {showConfigModal && configTool && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <DynamicToolConfiguration
                  tool={configTool}
                  onSave={handleSaveToolConfig}
                  onCancel={() => {
                    setShowConfigModal(false);
                    setConfigTool(null);
                  }}
                  readonly={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminToolManagement;