import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, CheckCircle, AlertCircle, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button } from '../../ui';
import { adminConfigService, ToolConfiguration } from '../../../services/api/adminConfigService';
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
  DefaultLogo
} from '../../../assets/logos';

// Tool icon mapping for ToolConfiguration
const getToolIcon = (toolName: string): React.ReactNode => {
  const iconMap: Record<string, string> = {
    github: GitHubLogo,
    gitlab: GitLabLogo,
    jenkins: JenkinsLogo,
    'argo cd': ArgoCDLogo,
    argocd: ArgoCDLogo,
    terraform: TerraformLogo,
    sonarqube: SonarQubeLogo,
    grafana: GrafanaLogo,
    prometheus: PrometheusLogo,
    kibana: KibanaLogo,
    jira: JiraLogo
  };
  
  const toolKey = toolName.toLowerCase().replace(/\s+/g, '');
  const logoSrc = iconMap[toolKey] || DefaultLogo;
  
  return <img src={logoSrc} alt={toolName} className="w-4 h-4" />;
};

export const ToolManagementWidget: React.FC = () => {
  const [tools, setTools] = useState<ToolConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch tool configurations
  const fetchTools = async () => {
    try {
      setError(null);
      const toolConfigs = await adminConfigService.getAllToolConfigurations();
      setTools(toolConfigs);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tools');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize and set up auto-refresh
  useEffect(() => {
    fetchTools();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTools, 30000);
    return () => clearInterval(interval);
  }, []);

  // Show loading state
  if (isLoading && tools.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <CardTitle className="text-base">Tool Management</CardTitle>
            </div>
          </div>
          <CardDescription className="text-sm">
            Loading tool configurations...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error && tools.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <CardTitle className="text-base">Tool Management</CardTitle>
          </div>
          <CardDescription className="text-sm">
            Failed to load tool configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-32 space-y-2">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <p className="text-sm text-gray-500 text-center">{error}</p>
          <button 
            onClick={fetchTools}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Try Again
          </button>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'error': return <AlertCircle className="h-3 w-3 text-red-600" />;
      case 'configuring': return <Clock className="h-3 w-3 text-yellow-600" />;
      default: return <AlertCircle className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'configuring': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <CardTitle className="text-base">Tool Management</CardTitle>
          </div>
          <Button size="sm" variant="outline" className="text-xs">
            Configure
          </Button>
        </div>
        <CardDescription className="text-sm">
          DevOps tool integration status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tools.map((tool, index) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex items-center space-x-2">
                  {getToolIcon(tool.name)}
                  {getStatusIcon(tool.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm truncate">{tool.name}</span>
                    {tool.configuration.baseUrl && (
                      <ExternalLink 
                        className="h-3 w-3 text-gray-400 hover:text-blue-600 cursor-pointer" 
                        onClick={() => window.open(tool.configuration.baseUrl, '_blank')}
                      />
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">{tool.category}</span>
                    <Badge 
                      className={`text-xs px-2 py-0 ${getStatusColor(tool.status)}`}
                    >
                      {tool.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xs ${tool.configured ? 'text-green-600' : 'text-gray-400'}`}>
                  {tool.configured ? '✓ Ready' : '○ Setup needed'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {tool.lastTested || 'Never'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-600">
                {tools.filter(t => t.status === 'active').length}
              </div>
              <div className="text-xs text-gray-600">Active</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600">
                {tools.filter(t => t.status === 'configuring').length}
              </div>
              <div className="text-xs text-gray-600">Configuring</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">
                {tools.filter(t => t.status === 'error').length}
              </div>
              <div className="text-xs text-gray-600">Errors</div>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{tools.length} tools configured</span>
            <span>
              {isLoading && <span className="text-blue-500">● Updating... </span>}
              Last check: {lastUpdated ? 
                Math.round((Date.now() - lastUpdated.getTime()) / 1000) + 's ago' : 
                'Never'
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ToolManagementWidget;