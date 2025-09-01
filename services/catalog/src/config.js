/**
 * Enhanced Catalog Service Configuration
 * Supports tool-specific launch capabilities, deep-linking, and webhook integration
 */

module.exports = {
  // Server configuration
  HOST: process.env.HOST || '0.0.0.0',
  PORT: process.env.PORT || 3006,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://sso_user:sso_password@localhost:5432/sso_hub',

  // Redis configuration
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // CORS configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Rate limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || '1 minute',

  // Auth-BFF service for identity verification
  AUTH_BFF_URL: process.env.AUTH_BFF_URL || 'http://localhost:3002',
  
  // Audit service for comprehensive logging
  AUDIT_SERVICE_URL: process.env.AUDIT_SERVICE_URL || 'http://audit:3009',
  
  // Analytics service for usage tracking
  ANALYTICS_SERVICE_URL: process.env.ANALYTICS_SERVICE_URL || 'http://analytics:3010',
  
  // Admin Config service for Keycloak integration
  ADMIN_CONFIG_SERVICE_URL: process.env.ADMIN_CONFIG_SERVICE_URL || 'http://admin-config:3005',
  
  // Tool launch configuration
  LAUNCH_SESSION_TTL: parseInt(process.env.LAUNCH_SESSION_TTL, 10) || 3600, // 1 hour
  
  // Security configuration
  LAUNCH_TOKEN_SECRET: process.env.LAUNCH_TOKEN_SECRET || 'launch-token-secret-change-in-production',
  STATE_PARAMETER_LENGTH: parseInt(process.env.STATE_PARAMETER_LENGTH, 10) || 32,
  
  // Webhook configuration
  WEBHOOK_BASE_URL: process.env.WEBHOOK_BASE_URL || 'http://localhost:3006',
  WEBHOOK_SECRET_KEY_PREFIX: process.env.WEBHOOK_SECRET_KEY_PREFIX || 'webhook-secret-',
  
  // Tool-specific base URLs (configurable per environment)
  TOOL_BASE_URLS: {
    github: process.env.GITHUB_BASE_URL || 'https://github.com',
    gitlab: process.env.GITLAB_BASE_URL || 'https://gitlab.com',
    jenkins: process.env.JENKINS_BASE_URL || 'http://localhost:8080',
    argocd: process.env.ARGOCD_BASE_URL || 'http://localhost:9090',
    terraform: process.env.TERRAFORM_BASE_URL || 'https://app.terraform.io',
    sonarqube: process.env.SONARQUBE_BASE_URL || 'http://localhost:9000',
    grafana: process.env.GRAFANA_BASE_URL || 'http://localhost:3001',
    prometheus: process.env.PROMETHEUS_BASE_URL || 'http://localhost:9090',
    kibana: process.env.KIBANA_BASE_URL || 'http://localhost:5601',
    snyk: process.env.SNYK_BASE_URL || 'https://snyk.io',
    jira: process.env.JIRA_BASE_URL || 'https://your-domain.atlassian.net',
    servicenow: process.env.SERVICENOW_BASE_URL || 'https://your-instance.service-now.com'
  },

  // Feature flags
  FEATURES: {
    DEEP_LINKING: process.env.FEATURE_DEEP_LINKING !== 'false',
    WEBHOOK_PROCESSING: process.env.FEATURE_WEBHOOK_PROCESSING !== 'false',
    LAUNCH_ANALYTICS: process.env.FEATURE_LAUNCH_ANALYTICS !== 'false',
    TOOL_HEALTH_CHECKS: process.env.FEATURE_TOOL_HEALTH_CHECKS !== 'false'
  },

  // External deployment configuration
  EXTERNAL_HOST: process.env.EXTERNAL_HOST,
  EXTERNAL_PROTOCOL: process.env.EXTERNAL_PROTOCOL || 'http',

  /**
   * Protocol-aware URL resolution helpers
   * Prioritizes tool-specific protocols over global infrastructure protocols
   */
  
  /**
   * Extract protocol from a tool's configured URL
   * @param {Object} toolConfig - Tool configuration object
   * @returns {string} Protocol (http: or https:)
   */
  extractToolProtocol: (toolConfig) => {
    if (!toolConfig || typeof toolConfig !== 'object') {
      console.warn('extractToolProtocol: Invalid or missing toolConfig, defaulting to http:');
      return 'http:';
    }

    console.log('🔍 extractToolProtocol: Analyzing tool config:', JSON.stringify(toolConfig, null, 2));

    // Check tool-specific URL fields for protocol in priority order
    const urlFields = [
      'grafana_url',      // Highest priority for Grafana tools
      'base_url', 
      'instance_url', 
      'jenkins_url', 
      'argocd_url', 
      'sonarqube_url', 
      'kibana_url',
      'prometheus_url',
      'terraform_url',
      'github_url',
      'gitlab_url'
    ];

    for (const field of urlFields) {
      if (toolConfig[field] && typeof toolConfig[field] === 'string') {
        try {
          const urlString = String(toolConfig[field]).trim();
          console.log(`🔍 extractToolProtocol: Checking field ${field} = ${urlString}`);
          
          const url = new URL(urlString);
          const protocol = url.protocol;
          
          console.log(`✅ extractToolProtocol: Found protocol ${protocol} from field ${field}`);
          return protocol; // Returns 'http:' or 'https:'
        } catch (error) {
          console.warn(`⚠️ extractToolProtocol: Invalid URL in field ${field}: ${toolConfig[field]}, error: ${error.message}`);
          // Invalid URL, continue to next field
          continue;
        }
      }
    }

    // Fallback to infrastructure protocol if no tool-specific URL found
    const fallbackProtocol = process.env.INFRASTRUCTURE_PROTOCOL ? `${process.env.INFRASTRUCTURE_PROTOCOL}:` : 'http:';
    console.log(`🔄 extractToolProtocol: No valid URLs found in tool config, using fallback: ${fallbackProtocol}`);
    return fallbackProtocol;
  },

  /**
   * Generate protocol-aware base URL for a tool
   * Respects tool's configured protocol, independent of global infrastructure protocol
   * @param {Object} toolConfig - Tool configuration object
   * @param {string} hostname - Hostname to use
   * @param {number|string} port - Port to use (optional)
   * @returns {string} Full base URL with correct protocol
   */
  generateProtocolAwareUrl: (toolConfig, hostname, port) => {
    const protocol = module.exports.extractToolProtocol(toolConfig);
    const portPart = port ? `:${port}` : '';
    return `${protocol}//${hostname}${portPart}`;
  },

  /**
   * Determine if we should use tool-specific protocol vs global protocol
   * @param {Object} toolConfig - Tool configuration object
   * @returns {boolean} True if tool has specific protocol configured
   */
  hasToolSpecificProtocol: (toolConfig) => {
    if (!toolConfig || typeof toolConfig !== 'object') {
      console.warn('hasToolSpecificProtocol: Invalid or missing toolConfig');
      return false;
    }

    console.log('🔍 hasToolSpecificProtocol: Checking tool config:', JSON.stringify(toolConfig, null, 2));

    const urlFields = [
      'grafana_url',      // Highest priority for Grafana tools
      'base_url', 
      'instance_url', 
      'jenkins_url',
      'argocd_url', 
      'sonarqube_url', 
      'kibana_url',
      'prometheus_url',
      'terraform_url',
      'github_url',
      'gitlab_url'
    ];

    const hasSpecificProtocol = urlFields.some(field => {
      const hasProtocol = toolConfig[field] && 
                         typeof toolConfig[field] === 'string' && 
                         toolConfig[field].includes('://');
      
      if (hasProtocol) {
        console.log(`✅ hasToolSpecificProtocol: Found protocol in field ${field}: ${toolConfig[field]}`);
      }
      
      return hasProtocol;
    });

    console.log(`🔍 hasToolSpecificProtocol: Result = ${hasSpecificProtocol}`);
    return hasSpecificProtocol;
  }
};
