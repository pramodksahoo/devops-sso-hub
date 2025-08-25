import axios from 'axios';
import { config } from '../../config/environment';

// Types for admin configuration service
export interface ToolConfiguration {
  id: string;
  toolType: string;
  name: string;
  category: string;
  protocol: 'oidc' | 'saml';
  status: 'active' | 'inactive' | 'error' | 'configuring';
  configured: boolean;
  enabled: boolean;
  configuration: ToolConfigDetails;
  healthCheck: HealthCheckConfig;
  lastTested?: string;
  lastModified: string;
  modifiedBy: string;
}

export interface ToolConfigDetails {
  baseUrl: string;
  clientId?: string;
  clientSecret?: string; // Masked in responses
  scopes?: string[];
  redirectUri?: string;
  metadata?: Record<string, any>;
  customAttributes?: Record<string, string>;
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // seconds
  timeout: number; // seconds
  retryCount: number;
  endpoints: string[];
}

export interface ToolTestResult {
  toolId: string;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface ConfigurationTemplate {
  toolType: string;
  name: string;
  description: string;
  protocol: 'oidc' | 'saml';
  defaultConfig: Partial<ToolConfigDetails>;
  requiredFields: string[];
  validationRules: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'url' | 'email' | 'regex';
  pattern?: string;
  message: string;
}

class AdminConfigService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = config.urls.authBff;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get all tool configurations
   */
  async getAllToolConfigurations(): Promise<ToolConfiguration[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/admin/tools`, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch tool configurations:', error);
      return this.getFallbackToolConfigurations();
    }
  }

  /**
   * Get specific tool configuration
   */
  async getToolConfiguration(toolId: string): Promise<ToolConfiguration | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/admin/tools/${toolId}`, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error(`Failed to fetch tool configuration for ${toolId}:`, error);
      return null;
    }
  }

  /**
   * Create new tool configuration
   */
  async createToolConfiguration(config: Partial<ToolConfiguration>): Promise<ToolConfiguration> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/admin/tools`, config, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to create tool configuration:', error);
      throw error;
    }
  }

  /**
   * Update existing tool configuration
   */
  async updateToolConfiguration(toolId: string, config: Partial<ToolConfiguration>): Promise<ToolConfiguration> {
    try {
      const response = await axios.put(`${this.baseUrl}/api/admin/tools/${toolId}`, config, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error(`Failed to update tool configuration for ${toolId}:`, error);
      throw error;
    }
  }

  /**
   * Delete tool configuration
   */
  async deleteToolConfiguration(toolId: string): Promise<boolean> {
    try {
      await axios.delete(`${this.baseUrl}/api/admin/tools/${toolId}`, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 5000
      });

      return true;
    } catch (error) {
      console.error(`Failed to delete tool configuration for ${toolId}:`, error);
      return false;
    }
  }

  /**
   * Test tool configuration
   */
  async testToolConfiguration(toolId: string): Promise<ToolTestResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/admin/tools/${toolId}/test`, {}, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error(`Failed to test tool configuration for ${toolId}:`, error);
      return {
        toolId,
        success: false,
        responseTime: 0,
        error: 'Test failed',
        timestamp: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Get available configuration templates
   */
  async getConfigurationTemplates(): Promise<ConfigurationTemplate[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/admin/templates`, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch configuration templates:', error);
      return this.getFallbackTemplates();
    }
  }

  /**
   * Get tool management dashboard data
   */
  async getToolManagementData() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/admin/dashboard`, {
        headers: this.getHeaders(),
        withCredentials: true,
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch tool management data:', error);
      return {
        totalTools: 4,
        activeTools: 2,
        configuringTools: 1,
        errorTools: 1,
        lastTestRun: new Date().toISOString(),
        recentActivity: [
          { action: 'Configuration updated', tool: 'Jenkins', timestamp: new Date().toISOString() },
          { action: 'Health check failed', tool: 'SonarQube', timestamp: new Date().toISOString() }
        ]
      };
    }
  }

  /**
   * Enable/disable tool
   */
  async toggleToolStatus(toolId: string, enabled: boolean): Promise<boolean> {
    try {
      await axios.patch(`${this.baseUrl}/api/admin/tools/${toolId}/toggle`, 
        { enabled }, 
        {
          headers: this.getHeaders(),
          withCredentials: true,
          timeout: 5000
        }
      );

      return true;
    } catch (error) {
      console.error(`Failed to toggle tool status for ${toolId}:`, error);
      return false;
    }
  }

  /**
   * Fallback data for development/offline scenarios
   */
  private getFallbackToolConfigurations(): ToolConfiguration[] {
    const now = new Date().toISOString();
    
    return [
      {
        id: '1',
        toolType: 'jenkins',
        name: 'Jenkins CI/CD',
        category: 'CI/CD',
        protocol: 'oidc',
        status: 'active',
        configured: true,
        enabled: true,
        configuration: {
          baseUrl: 'http://jenkins.local:8080',
          clientId: 'jenkins-client',
          scopes: ['openid', 'profile', 'email'],
          redirectUri: 'http://jenkins.local:8080/securityRealm/finishLogin'
        },
        healthCheck: {
          enabled: true,
          interval: 300,
          timeout: 10,
          retryCount: 3,
          endpoints: ['/api/health', '/login']
        },
        lastTested: '2 minutes ago',
        lastModified: now,
        modifiedBy: 'admin@sso-hub.local'
      },
      {
        id: '2',
        toolType: 'gitlab',
        name: 'GitLab SCM',
        category: 'SCM',
        protocol: 'oidc',
        status: 'active',
        configured: true,
        enabled: true,
        configuration: {
          baseUrl: 'http://gitlab.local',
          clientId: 'gitlab-app-id',
          scopes: ['openid', 'profile', 'email'],
          redirectUri: 'http://gitlab.local/users/auth/openid_connect/callback'
        },
        healthCheck: {
          enabled: true,
          interval: 300,
          timeout: 10,
          retryCount: 3,
          endpoints: ['/health', '/users/sign_in']
        },
        lastTested: '5 minutes ago',
        lastModified: now,
        modifiedBy: 'admin@sso-hub.local'
      },
      {
        id: '3',
        toolType: 'sonarqube',
        name: 'SonarQube',
        category: 'Code Quality',
        protocol: 'saml',
        status: 'error',
        configured: false,
        enabled: false,
        configuration: {
          baseUrl: 'http://sonarqube.local:9000',
          metadata: {}
        },
        healthCheck: {
          enabled: false,
          interval: 300,
          timeout: 10,
          retryCount: 3,
          endpoints: ['/api/system/status']
        },
        lastTested: '1 hour ago',
        lastModified: now,
        modifiedBy: 'admin@sso-hub.local'
      },
      {
        id: '4',
        toolType: 'grafana',
        name: 'Grafana Monitoring',
        category: 'Monitoring',
        protocol: 'oidc',
        status: 'configuring',
        configured: false,
        enabled: false,
        configuration: {
          baseUrl: 'http://grafana.local:3000',
          metadata: {}
        },
        healthCheck: {
          enabled: false,
          interval: 300,
          timeout: 10,
          retryCount: 3,
          endpoints: ['/api/health']
        },
        lastModified: now,
        modifiedBy: 'admin@sso-hub.local'
      }
    ];
  }

  private getFallbackTemplates(): ConfigurationTemplate[] {
    return [
      {
        toolType: 'jenkins',
        name: 'Jenkins CI/CD',
        description: 'Jenkins continuous integration and deployment server',
        protocol: 'oidc',
        defaultConfig: {
          scopes: ['openid', 'profile', 'email'],
          redirectUri: '/securityRealm/finishLogin'
        },
        requiredFields: ['baseUrl', 'clientId'],
        validationRules: [
          { field: 'baseUrl', type: 'url', message: 'Please enter a valid URL' },
          { field: 'clientId', type: 'required', message: 'Client ID is required' }
        ]
      },
      {
        toolType: 'gitlab',
        name: 'GitLab',
        description: 'GitLab source code management platform',
        protocol: 'oidc',
        defaultConfig: {
          scopes: ['openid', 'profile', 'email'],
          redirectUri: '/users/auth/openid_connect/callback'
        },
        requiredFields: ['baseUrl', 'clientId'],
        validationRules: [
          { field: 'baseUrl', type: 'url', message: 'Please enter a valid GitLab URL' },
          { field: 'clientId', type: 'required', message: 'Application ID is required' }
        ]
      }
    ];
  }
}

export const adminConfigService = new AdminConfigService();
export default adminConfigService;