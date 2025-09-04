import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { config, urlUtils } from '@/config/environment';
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
  SnykLogo,
  ServiceNowLogo,
  DefaultLogo
} from '../assets/logos';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: 'ci-cd' | 'monitoring' | 'security' | 'collaboration' | 'infrastructure';
  icon: string | React.ReactNode;
  url?: string;
  status: 'available' | 'unavailable' | 'maintenance';
  hasAccess: boolean;
  roles: string[];
  lastLaunched?: number;
  launchCount: number;
}

export interface ToolContextType {
  tools: Tool[];
  getToolById: (id: string) => Tool | undefined;
  launchTool: (toolId: string) => Promise<void>;
  getToolToken: (toolId: string) => Promise<string | null>;
  refreshToolStatus: () => Promise<void>;
}

const ToolContext = createContext<ToolContextType | undefined>(undefined);

export const useTool = () => {
  const context = useContext(ToolContext);
  if (context === undefined) {
    throw new Error('useTool must be used within a ToolProvider');
  }
  return context;
};

interface ToolProviderProps {
  children: ReactNode;
}

// Tool logo mapping function
const getToolIcon = (toolSlug: string): React.ReactNode => {
  const iconMap: Record<string, React.ReactNode> = {
    github: <img src={GitHubLogo} alt="GitHub" className="w-6 h-6" />,
    gitlab: <img src={GitLabLogo} alt="GitLab" className="w-6 h-6" />,
    jenkins: <img src={JenkinsLogo} alt="Jenkins" className="w-6 h-6" />,
    argocd: <img src={ArgoCDLogo} alt="Argo CD" className="w-6 h-6" />,
    terraform: <img src={TerraformLogo} alt="Terraform" className="w-6 h-6" />,
    sonarqube: <img src={SonarQubeLogo} alt="SonarQube" className="w-6 h-6" />,
    grafana: <img src={GrafanaLogo} alt="Grafana" className="w-6 h-6" />,
    prometheus: <img src={PrometheusLogo} alt="Prometheus" className="w-6 h-6" />,
    kibana: <img src={KibanaLogo} alt="Kibana" className="w-6 h-6" />,
    jira: <img src={JiraLogo} alt="Jira" className="w-6 h-6" />,
    servicenow: <img src={ServiceNowLogo} alt="ServiceNow" className="w-6 h-6" />,
    snyk: <img src={SnykLogo} alt="Snyk" className="w-6 h-6" />,
    aws: <img src={AWLogo} alt="AWS" className="w-6 h-6" />,
    azure: <img src={AzureLogo} alt="Azure" className="w-6 h-6" />,
    circleci: <img src={CircleCILogo} alt="CircleCI" className="w-6 h-6" />,
    bitbucket: <img src={BitBucketLogo} alt="BitBucket" className="w-6 h-6" />,
    kubernetes: <img src={KubernetesLogo} alt="Kubernetes" className="w-6 h-6" />
  };
  
  return iconMap[toolSlug] || <img src={DefaultLogo} alt={toolSlug} className="w-6 h-6" />;
};

export const ToolProvider: React.FC<ToolProviderProps> = ({ children }) => {
  const { hasToolAccess, getToolRoles } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [, setLoading] = useState(true);

  // Load tools from API on mount
  useEffect(() => {
    const loadTools = async () => {
      try {
        const response = await fetch(config.urls.tools, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.categories) {
            // Convert API response to Tool[] format
            const allTools: Tool[] = [];
            data.categories.forEach((category: any) => {
              category.tools.forEach((tool: any) => {
                allTools.push({
                  ...tool,
                  icon: getToolIcon(tool.id),
                  hasAccess: hasToolAccess(tool.id),
                  roles: getToolRoles(tool.id)
                });
              });
            });
            setTools(allTools);
            setLoading(false);
            return;
          }
        }
        
        // If API fails or returns unexpected data, use minimal fallback
        console.warn('Failed to load tools from API, using fallback');
        loadFallbackTools();
        
      } catch (error) {
        console.error('Failed to load tools from API:', error);
        loadFallbackTools();
      } finally {
        setLoading(false);
      }
    };

    const loadFallbackTools = () => {
      // Comprehensive tool catalog with all integrated DevOps tools
      const fallbackTools: Tool[] = [
        // Source Control Tools
        {
          id: 'github',
          name: 'GitHub',
          description: 'World\'s leading software development platform',
          category: 'collaboration',
          icon: getToolIcon('github'),
          status: 'available',
          hasAccess: hasToolAccess('github'),
          roles: getToolRoles('github'),
          launchCount: 0
        },
        {
          id: 'gitlab',
          name: 'GitLab',
          description: 'Complete DevOps platform with built-in CI/CD',
          category: 'collaboration',
          icon: getToolIcon('gitlab'),
          status: 'available',
          hasAccess: hasToolAccess('gitlab'),
          roles: getToolRoles('gitlab'),
          launchCount: 0
        },
        {
          id: 'bitbucket',
          name: 'Bitbucket',
          description: 'Git repository management solution',
          category: 'collaboration',
          icon: getToolIcon('bitbucket'),
          status: 'available',
          hasAccess: hasToolAccess('bitbucket'),
          roles: getToolRoles('bitbucket'),
          launchCount: 0
        },
        
        // CI/CD Tools
        {
          id: 'jenkins',
          name: 'Jenkins',
          description: 'Open source automation server for CI/CD',
          category: 'ci-cd',
          icon: getToolIcon('jenkins'),
          status: 'available',
          hasAccess: hasToolAccess('jenkins'),
          roles: getToolRoles('jenkins'),
          launchCount: 0
        },
        {
          id: 'argocd',
          name: 'Argo CD',
          description: 'Declarative GitOps continuous delivery tool',
          category: 'ci-cd',
          icon: getToolIcon('argocd'),
          status: 'available',
          hasAccess: hasToolAccess('argocd'),
          roles: getToolRoles('argocd'),
          launchCount: 0
        },
        {
          id: 'circleci',
          name: 'CircleCI',
          description: 'Cloud-based continuous integration and delivery',
          category: 'ci-cd',
          icon: getToolIcon('circleci'),
          status: 'available',
          hasAccess: hasToolAccess('circleci'),
          roles: getToolRoles('circleci'),
          launchCount: 0
        },
        
        // Infrastructure Tools
        {
          id: 'terraform',
          name: 'Terraform',
          description: 'Infrastructure as code provisioning tool',
          category: 'infrastructure',
          icon: getToolIcon('terraform'),
          status: 'available',
          hasAccess: hasToolAccess('terraform'),
          roles: getToolRoles('terraform'),
          launchCount: 0
        },
        {
          id: 'kubernetes',
          name: 'Kubernetes',
          description: 'Container orchestration platform',
          category: 'infrastructure',
          icon: getToolIcon('kubernetes'),
          status: 'available',
          hasAccess: hasToolAccess('kubernetes'),
          roles: getToolRoles('kubernetes'),
          launchCount: 0
        },
        {
          id: 'aws',
          name: 'AWS Console',
          description: 'Amazon Web Services cloud platform',
          category: 'infrastructure',
          icon: getToolIcon('aws'),
          status: 'available',
          hasAccess: hasToolAccess('aws'),
          roles: getToolRoles('aws'),
          launchCount: 0
        },
        {
          id: 'azure',
          name: 'Azure Portal',
          description: 'Microsoft Azure cloud services',
          category: 'infrastructure',
          icon: getToolIcon('azure'),
          status: 'available',
          hasAccess: hasToolAccess('azure'),
          roles: getToolRoles('azure'),
          launchCount: 0
        },
        
        // Monitoring & Observability
        {
          id: 'grafana',
          name: 'Grafana',
          description: 'Monitoring and observability platform',
          category: 'monitoring',
          icon: getToolIcon('grafana'),
          url: config.external.grafana,
          status: 'available',
          hasAccess: hasToolAccess('grafana'),
          roles: getToolRoles('grafana'),
          launchCount: 0
        },
        {
          id: 'prometheus',
          name: 'Prometheus',
          description: 'Monitoring system and time series database',
          category: 'monitoring',
          icon: getToolIcon('prometheus'),
          url: config.external.prometheus,
          status: 'available',
          hasAccess: hasToolAccess('prometheus'),
          roles: getToolRoles('prometheus'),
          launchCount: 0
        },
        {
          id: 'kibana',
          name: 'Kibana',
          description: 'Elasticsearch data visualization dashboard',
          category: 'monitoring',
          icon: getToolIcon('kibana'),
          status: 'available',
          hasAccess: hasToolAccess('kibana'),
          roles: getToolRoles('kibana'),
          launchCount: 0
        },
        
        // Security & Quality
        {
          id: 'sonarqube',
          name: 'SonarQube',
          description: 'Code quality and security analysis',
          category: 'security',
          icon: getToolIcon('sonarqube'),
          status: 'available',
          hasAccess: hasToolAccess('sonarqube'),
          roles: getToolRoles('sonarqube'),
          launchCount: 0
        },
        {
          id: 'snyk',
          name: 'Snyk',
          description: 'Developer security platform',
          category: 'security',
          icon: getToolIcon('snyk'),
          status: 'available',
          hasAccess: hasToolAccess('snyk'),
          roles: getToolRoles('snyk'),
          launchCount: 0
        },
        
        // Collaboration & Project Management
        {
          id: 'jira',
          name: 'Jira',
          description: 'Issue tracking and project management',
          category: 'collaboration',
          icon: getToolIcon('jira'),
          status: 'available',
          hasAccess: hasToolAccess('jira'),
          roles: getToolRoles('jira'),
          launchCount: 0
        },
        {
          id: 'servicenow',
          name: 'ServiceNow',
          description: 'IT service management platform',
          category: 'collaboration',
          icon: getToolIcon('servicenow'),
          status: 'available',
          hasAccess: hasToolAccess('servicenow'),
          roles: getToolRoles('servicenow'),
          launchCount: 0
        }
      ];
      
      setTools(fallbackTools);
    };
    
    loadTools();
  }, [hasToolAccess, getToolRoles]);

  const getToolById = (id: string) => {
    return tools.find(tool => tool.id === id);
  };

  const launchTool = async (toolId: string) => {
    try {
      const tool = getToolById(toolId);
      if (!tool || !tool.hasAccess) {
        throw new Error('Tool not accessible');
      }

      // Use API-based tool launch through auth-bff
      const response = await fetch(urlUtils.api(`tools/${toolId}/launch`), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: {},
          return_url: window.location.href
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `Launch failed: ${response.status}`);
      }

      const launchData = await response.json();
      if (launchData.success && launchData.launch_url) {
        window.open(launchData.launch_url, '_blank');
        
        // Update launch count
        tool.launchCount++;
        tool.lastLaunched = Date.now();
      } else {
        throw new Error('Invalid launch response');
      }
      
    } catch (error) {
      console.error(`Failed to launch tool ${toolId}:`, error);
      throw error;
    }
  };

  const getToolToken = async (toolId: string) => {
    try {
      const response = await fetch(urlUtils.join(config.urls.authBff, `auth/tools/${toolId}/token`), {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to get tool token');
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error(`Failed to get token for tool ${toolId}:`, error);
      return null;
    }
  };

  const refreshToolStatus = async () => {
    // Implementation for refreshing tool health status
    console.log('Refreshing tool status...');
  };

  const value: ToolContextType = {
    tools,
    getToolById,
    launchTool,
    getToolToken,
    refreshToolStatus
  };

  return (
    <ToolContext.Provider value={value}>
      {children}
    </ToolContext.Provider>
  );
};