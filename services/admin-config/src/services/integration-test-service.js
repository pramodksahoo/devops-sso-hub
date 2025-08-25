const axios = require('axios');
const toolConfigService = require('./tool-config-service');
const keycloakService = require('./keycloak-service');

class IntegrationTestService {
  constructor() {
    this.testTimeoutMs = 30000; // 30 seconds
  }

  async testIntegration(toolType, testType = 'connection', customConfig = null) {
    console.log(`🧪 Testing ${toolType} integration (${testType})...`);
    
    try {
      let config;
      
      if (customConfig) {
        // Use provided custom configuration for testing
        config = customConfig;
        console.log(`Using custom configuration for ${toolType} test`);
      } else {
        // Use saved configuration from database
        const toolConfig = await toolConfigService.getToolConfig(toolType);
        
        if (!toolConfig) {
          throw new Error(`No configuration found for ${toolType}`);
        }
        
        config = toolConfig.config;
      }
      let testResults = {
        tool_type: toolType,
        test_type: testType,
        success: false,
        tests: [],
        total_time_ms: 0,
        timestamp: new Date().toISOString()
      };
      
      const startTime = Date.now();
      
      switch (testType) {
        case 'connection':
          testResults = await this.testConnection(toolType, config, testResults);
          break;
        case 'authentication':
          testResults = await this.testAuthentication(toolType, config, testResults);
          break;
        case 'api':
          testResults = await this.testAPI(toolType, config, testResults);
          break;
        case 'full':
          testResults = await this.testConnection(toolType, config, testResults);
          if (testResults.success) {
            testResults = await this.testAuthentication(toolType, config, testResults);
          }
          if (testResults.success) {
            testResults = await this.testAPI(toolType, config, testResults);
          }
          break;
        default:
          throw new Error(`Unsupported test type: ${testType}`);
      }
      
      testResults.total_time_ms = Date.now() - startTime;
      testResults.success = testResults.tests.every(test => test.success);
      
      console.log(`✅ Integration test completed for ${toolType}: ${testResults.success ? 'PASSED' : 'FAILED'}`);
      return testResults;
      
    } catch (error) {
      console.error(`❌ Integration test failed for ${toolType}:`, error.message);
      return {
        tool_type: toolType,
        test_type: testType,
        success: false,
        error: error.message,
        tests: [],
        total_time_ms: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  async testConnection(toolType, config, testResults) {
    const connectionTests = [];
    
    try {
      switch (toolType) {
        case 'github':
          connectionTests.push(await this.testGitHubConnection(config));
          break;
        case 'gitlab':
          connectionTests.push(await this.testGitLabConnection(config));
          break;
        case 'jenkins':
          connectionTests.push(await this.testJenkinsConnection(config));
          break;
        case 'argocd':
          connectionTests.push(await this.testArgoCDConnection(config));
          break;
        case 'terraform':
          connectionTests.push(await this.testTerraformConnection(config));
          break;
        case 'sonarqube':
          connectionTests.push(await this.testSonarQubeConnection(config));
          break;
        case 'grafana':
          connectionTests.push(await this.testGrafanaConnection(config));
          break;
        case 'prometheus':
          connectionTests.push(await this.testPrometheusConnection(config));
          break;
        case 'kibana':
          connectionTests.push(await this.testKibanaConnection(config));
          break;
        case 'snyk':
          connectionTests.push(await this.testSnykConnection(config));
          break;
        case 'jira':
          connectionTests.push(await this.testJiraConnection(config));
          break;
        case 'servicenow':
          connectionTests.push(await this.testServiceNowConnection(config));
          break;
        default:
          throw new Error(`Connection test not implemented for ${toolType}`);
      }
      
      testResults.tests.push(...connectionTests);
      return testResults;
      
    } catch (error) {
      testResults.tests.push({
        name: 'connection',
        success: false,
        error: error.message,
        duration_ms: 0
      });
      return testResults;
    }
  }

  async testAuthentication(toolType, config, testResults) {
    const authTests = [];
    
    try {
      // Test Keycloak client configuration
      authTests.push(await this.testKeycloakClientConfig(toolType, config));
      
      // Test tool-specific authentication
      switch (toolType) {
        case 'github':
          authTests.push(await this.testGitHubAuth(config));
          break;
        case 'gitlab':
          authTests.push(await this.testGitLabAuth(config));
          break;
        case 'jenkins':
          authTests.push(await this.testJenkinsAuth(config));
          break;
        case 'grafana':
          authTests.push(await this.testGrafanaAuth(config));
          break;
        // Add more authentication tests as needed
        default:
          console.log(`Authentication test not implemented for ${toolType}`);
      }
      
      testResults.tests.push(...authTests);
      return testResults;
      
    } catch (error) {
      testResults.tests.push({
        name: 'authentication',
        success: false,
        error: error.message,
        duration_ms: 0
      });
      return testResults;
    }
  }

  async testAPI(toolType, config, testResults) {
    const apiTests = [];
    
    try {
      switch (toolType) {
        case 'github':
          apiTests.push(await this.testGitHubAPI(config));
          break;
        case 'gitlab':
          apiTests.push(await this.testGitLabAPI(config));
          break;
        case 'jenkins':
          apiTests.push(await this.testJenkinsAPI(config));
          break;
        case 'grafana':
          apiTests.push(await this.testGrafanaAPI(config));
          break;
        // Add more API tests as needed
        default:
          console.log(`API test not implemented for ${toolType}`);
      }
      
      testResults.tests.push(...apiTests);
      return testResults;
      
    } catch (error) {
      testResults.tests.push({
        name: 'api',
        success: false,
        error: error.message,
        duration_ms: 0
      });
      return testResults;
    }
  }

  // ==========================================
  // CONNECTION TESTS
  // ==========================================

  async testGitHubConnection(config) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${config.api_url || 'https://api.github.com'}/rate_limit`, {
        timeout: this.testTimeoutMs
      });
      
      return {
        name: 'github_connection',
        success: response.status === 200,
        duration_ms: Date.now() - startTime,
        details: { rate_limit: response.data }
      };
    } catch (error) {
      return {
        name: 'github_connection',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testGitLabConnection(config) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${config.instance_url}/api/v4/version`, {
        timeout: this.testTimeoutMs
      });
      
      return {
        name: 'gitlab_connection',
        success: response.status === 200,
        duration_ms: Date.now() - startTime,
        details: { version: response.data }
      };
    } catch (error) {
      return {
        name: 'gitlab_connection',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testJenkinsConnection(config) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${config.jenkins_url}/api/json`, {
        timeout: this.testTimeoutMs
      });
      
      return {
        name: 'jenkins_connection',
        success: response.status === 200,
        duration_ms: Date.now() - startTime,
        details: { mode: response.data.mode }
      };
    } catch (error) {
      return {
        name: 'jenkins_connection',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testArgoCDConnection(config) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${config.argocd_url}/api/v1/version`, {
        timeout: this.testTimeoutMs
      });
      
      return {
        name: 'argocd_connection',
        success: response.status === 200,
        duration_ms: Date.now() - startTime,
        details: { version: response.data }
      };
    } catch (error) {
      return {
        name: 'argocd_connection',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testTerraformConnection(config) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${config.terraform_url || 'https://app.terraform.io'}/api/v2/ping`, {
        timeout: this.testTimeoutMs
      });
      
      return {
        name: 'terraform_connection',
        success: response.status === 200,
        duration_ms: Date.now() - startTime,
        details: { ping: response.data }
      };
    } catch (error) {
      return {
        name: 'terraform_connection',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testSonarQubeConnection(config) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${config.sonarqube_url}/api/system/status`, {
        timeout: this.testTimeoutMs
      });
      
      return {
        name: 'sonarqube_connection',
        success: response.status === 200,
        duration_ms: Date.now() - startTime,
        details: { status: response.data }
      };
    } catch (error) {
      return {
        name: 'sonarqube_connection',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testGrafanaConnection(config) {
    const startTime = Date.now();
    
    try {
      // First validate the configuration
      const configValidation = this.validateGrafanaConfig(config);
      
      if (!configValidation.isValid) {
        return {
          name: 'grafana_connection',
          success: false,
          duration_ms: Date.now() - startTime,
          error: configValidation.error,
          details: { validation: 'Configuration validation failed' }
        };
      }
      
      // Test actual Grafana connectivity
      const response = await axios.get(`${config.grafana_url}/api/health`, {
        timeout: this.testTimeoutMs,
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Accept 2xx, 3xx, 4xx (auth errors are expected)
        }
      });
      
      // Check if Grafana is responding
      let healthCheck = 'unknown';
      if (response.status === 200) {
        healthCheck = response.data?.database || 'ok';
      } else if (response.status === 401 || response.status === 403) {
        healthCheck = 'reachable_auth_required';
      }
      
      // Support both flat and nested structures
      const isFlat = !config.oauth && config.client_id;
      
      return {
        name: 'grafana_connection',
        success: response.status >= 200 && response.status < 500,
        duration_ms: Date.now() - startTime,
        details: { 
          message: 'Grafana instance connectivity test',
          grafana_url: config.grafana_url,
          status_code: response.status,
          health_status: healthCheck,
          oauth_configured: isFlat ? !!config.client_id : !!config.oauth,
          client_id: isFlat ? config.client_id : config.oauth?.client_id,
          auth_url: isFlat ? config.auth_url : config.oauth?.auth_url,
          token_url: isFlat ? config.token_url : config.oauth?.token_url,
          api_url: isFlat ? config.api_url : config.oauth?.api_url,
          redirect_uri: isFlat ? config.redirect_uri : config.oauth?.redirect_uri
        }
      };
      
    } catch (error) {
      // Network errors, timeouts, etc.
      return {
        name: 'grafana_connection',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message,
        details: { 
          grafana_url: config.grafana_url,
          error_type: error.code || 'NETWORK_ERROR'
        }
      };
    }
  }
  
  validateGrafanaConfig(config) {
    console.log('🔍 Validating Grafana config:', JSON.stringify(config, null, 2));
    
    // Support both flat structure (new) and nested structure (legacy)
    const isFlat = !config.oauth && config.client_id;
    
    // Required fields validation
    if (!config.grafana_url) {
      return { isValid: false, error: 'Grafana URL is required' };
    }
    
    if (isFlat) {
      // Validate flat OAuth2 structure (new format)
      const requiredFields = [
        { field: 'client_id', name: 'Client ID' },
        { field: 'client_secret', name: 'Client Secret' },
        { field: 'auth_url', name: 'Authorization URL' },
        { field: 'token_url', name: 'Token URL' },
        { field: 'api_url', name: 'API URL' },
        { field: 'redirect_uri', name: 'Redirect URI' }
      ];
      
      for (const { field, name } of requiredFields) {
        if (!config[field]) {
          return { isValid: false, error: `${name} is required` };
        }
      }
      
      // URL format validation
      try {
        new URL(config.grafana_url);
        new URL(config.auth_url);
        new URL(config.token_url);
        new URL(config.api_url);
        new URL(config.redirect_uri);
      } catch (error) {
        return { isValid: false, error: 'One or more URLs are invalid format' };
      }
    } else {
      // Validate nested OAuth structure (legacy format)
      if (!config.oauth) {
        return { isValid: false, error: 'OAuth configuration is required' };
      }
      
      const requiredOAuthFields = [
        { field: 'client_id', name: 'Client ID' },
        { field: 'client_secret', name: 'Client Secret' },
        { field: 'auth_url', name: 'Authorization URL' },
        { field: 'token_url', name: 'Token URL' },
        { field: 'api_url', name: 'API URL' }
      ];
      
      for (const { field, name } of requiredOAuthFields) {
        if (!config.oauth[field]) {
          return { isValid: false, error: `OAuth ${name} is required` };
        }
      }
      
      // URL format validation
      try {
        new URL(config.grafana_url);
        new URL(config.oauth.auth_url);
        new URL(config.oauth.token_url);
        new URL(config.oauth.api_url);
      } catch (error) {
        return { isValid: false, error: 'One or more URLs are invalid format' };
      }
      
      // Admin credentials validation (legacy)
      if (config.admin_credentials) {
        if (!config.admin_credentials.username) {
          return { isValid: false, error: 'Admin username is required' };
        }
        if (!config.admin_credentials.password) {
          return { isValid: false, error: 'Admin password is required' };
        }
      }
    }
    
    return { isValid: true };
  }

  async testPrometheusConnection(config) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${config.prometheus_url}/-/healthy`, {
        timeout: this.testTimeoutMs
      });
      
      return {
        name: 'prometheus_connection',
        success: response.status === 200,
        duration_ms: Date.now() - startTime,
        details: { status: 'healthy' }
      };
    } catch (error) {
      return {
        name: 'prometheus_connection',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testKibanaConnection(config) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${config.kibana_url}/api/status`, {
        timeout: this.testTimeoutMs
      });
      
      return {
        name: 'kibana_connection',
        success: response.status === 200,
        duration_ms: Date.now() - startTime,
        details: { status: response.data }
      };
    } catch (error) {
      return {
        name: 'kibana_connection',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testSnykConnection(config) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${config.api_url || 'https://api.snyk.io'}/rest/openapi`, {
        timeout: this.testTimeoutMs
      });
      
      return {
        name: 'snyk_connection',
        success: response.status === 200,
        duration_ms: Date.now() - startTime,
        details: { api_available: true }
      };
    } catch (error) {
      return {
        name: 'snyk_connection',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testJiraConnection(config) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${config.jira_url}/rest/api/3/serverInfo`, {
        timeout: this.testTimeoutMs
      });
      
      return {
        name: 'jira_connection',
        success: response.status === 200,
        duration_ms: Date.now() - startTime,
        details: { server_info: response.data }
      };
    } catch (error) {
      return {
        name: 'jira_connection',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testServiceNowConnection(config) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${config.instance_url}/api/now/table/sys_user?sysparm_limit=1`, {
        timeout: this.testTimeoutMs
      });
      
      return {
        name: 'servicenow_connection',
        success: response.status === 200,
        duration_ms: Date.now() - startTime,
        details: { api_available: true }
      };
    } catch (error) {
      return {
        name: 'servicenow_connection',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  // ==========================================
  // AUTHENTICATION TESTS
  // ==========================================

  async testKeycloakClientConfig(toolType, config) {
    const startTime = Date.now();
    try {
      const clientId = `${toolType}-client`;
      const client = await keycloakService.getClient(clientId);
      
      return {
        name: 'keycloak_client_config',
        success: !!client,
        duration_ms: Date.now() - startTime,
        details: { 
          client_id: clientId,
          client_exists: !!client,
          client_enabled: client?.enabled || false
        }
      };
    } catch (error) {
      return {
        name: 'keycloak_client_config',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testGitHubAuth(config) {
    const startTime = Date.now();
    try {
      // Test OAuth app configuration by checking the client ID
      if (!config.oauth_app?.client_id) {
        throw new Error('GitHub OAuth app client ID not configured');
      }
      
      return {
        name: 'github_oauth_config',
        success: true,
        duration_ms: Date.now() - startTime,
        details: { 
          client_id: config.oauth_app.client_id,
          organization: config.organization
        }
      };
    } catch (error) {
      return {
        name: 'github_oauth_config',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testGitLabAuth(config) {
    const startTime = Date.now();
    try {
      // Test OIDC configuration
      if (!config.oidc?.client_id) {
        throw new Error('GitLab OIDC client ID not configured');
      }
      
      return {
        name: 'gitlab_oidc_config',
        success: true,
        duration_ms: Date.now() - startTime,
        details: { 
          client_id: config.oidc.client_id,
          instance_url: config.instance_url
        }
      };
    } catch (error) {
      return {
        name: 'gitlab_oidc_config',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testJenkinsAuth(config) {
    const startTime = Date.now();
    try {
      // Test OIDC plugin configuration
      if (!config.oidc?.client_id) {
        throw new Error('Jenkins OIDC client ID not configured');
      }
      
      return {
        name: 'jenkins_oidc_config',
        success: true,
        duration_ms: Date.now() - startTime,
        details: { 
          client_id: config.oidc.client_id,
          issuer: config.oidc.issuer
        }
      };
    } catch (error) {
      return {
        name: 'jenkins_oidc_config',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testGrafanaAuth(config) {
    const startTime = Date.now();
    try {
      // Support both flat and nested structures
      const isFlat = !config.oauth && config.client_id;
      
      // Test OAuth configuration
      const clientId = isFlat ? config.client_id : config.oauth?.client_id;
      const authUrl = isFlat ? config.auth_url : config.oauth?.auth_url;
      
      if (!clientId) {
        throw new Error('Grafana OAuth client ID not configured');
      }
      
      return {
        name: 'grafana_oauth_config',
        success: true,
        duration_ms: Date.now() - startTime,
        details: { 
          client_id: clientId,
          auth_url: authUrl,
          redirect_uri: isFlat ? config.redirect_uri : config.oauth?.redirect_uri,
          scopes: isFlat ? config.scopes : config.oauth?.scopes
        }
      };
    } catch (error) {
      return {
        name: 'grafana_oauth_config',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  // ==========================================
  // API TESTS
  // ==========================================

  async testGitHubAPI(config) {
    const startTime = Date.now();
    try {
      // This would require actual API token for full test
      // For now, just verify organization exists
      const response = await axios.get(`${config.api_url || 'https://api.github.com'}/orgs/${config.organization}`, {
        timeout: this.testTimeoutMs
      });
      
      return {
        name: 'github_api_access',
        success: response.status === 200,
        duration_ms: Date.now() - startTime,
        details: { 
          organization: response.data.login,
          organization_type: response.data.type
        }
      };
    } catch (error) {
      return {
        name: 'github_api_access',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testGitLabAPI(config) {
    const startTime = Date.now();
    try {
      // Test basic API access
      const response = await axios.get(`${config.instance_url}/api/v4/projects?membership=true&per_page=1`, {
        timeout: this.testTimeoutMs
      });
      
      return {
        name: 'gitlab_api_access',
        success: response.status === 200,
        duration_ms: Date.now() - startTime,
        details: { 
          api_available: true,
          projects_accessible: Array.isArray(response.data)
        }
      };
    } catch (error) {
      return {
        name: 'gitlab_api_access',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testJenkinsAPI(config) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${config.jenkins_url}/api/json?tree=jobs[name]`, {
        timeout: this.testTimeoutMs
      });
      
      return {
        name: 'jenkins_api_access',
        success: response.status === 200,
        duration_ms: Date.now() - startTime,
        details: { 
          jobs_accessible: Array.isArray(response.data.jobs),
          job_count: response.data.jobs?.length || 0
        }
      };
    } catch (error) {
      return {
        name: 'jenkins_api_access',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async testGrafanaAPI(config) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${config.grafana_url}/api/search?type=dash-db&limit=1`, {
        timeout: this.testTimeoutMs
      });
      
      return {
        name: 'grafana_api_access',
        success: response.status === 200,
        duration_ms: Date.now() - startTime,
        details: { 
          api_available: true,
          dashboards_accessible: Array.isArray(response.data)
        }
      };
    } catch (error) {
      return {
        name: 'grafana_api_access',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  // ==========================================
  // BULK TESTING
  // ==========================================

  async testAllIntegrations() {
    try {
      const tools = await toolConfigService.getAllTools();
      const configuredTools = tools.filter(tool => tool.configured);
      
      const testPromises = configuredTools.map(tool => 
        this.testIntegration(tool.tool_type, 'connection')
          .catch(error => ({
            tool_type: tool.tool_type,
            success: false,
            error: error.message,
            tests: [],
            timestamp: new Date().toISOString()
          }))
      );
      
      const results = await Promise.all(testPromises);
      
      console.log(`✅ Bulk integration test completed: ${results.length} tools tested`);
      return results;
      
    } catch (error) {
      console.error('❌ Bulk integration test failed:', error.message);
      throw error;
    }
  }
}

module.exports = new IntegrationTestService();
