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
  }
};
