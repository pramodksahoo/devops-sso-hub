/**
 * Configuration for Provisioning Service - Phase 9
 * Environment-based configuration with secure defaults
 */

module.exports = {
  // Server configuration
  HOST: process.env.HOST || '0.0.0.0',
  PORT: process.env.PORT || 3011,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://sso_user:sso_password@postgres:5432/sso_hub',
  
  // CORS configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Provisioning configuration
  MAX_CONCURRENT_WORKFLOWS: parseInt(process.env.MAX_CONCURRENT_WORKFLOWS) || 10,
  WORKFLOW_TIMEOUT_MINUTES: parseInt(process.env.WORKFLOW_TIMEOUT_MINUTES) || 60,
  STEP_TIMEOUT_SECONDS: parseInt(process.env.STEP_TIMEOUT_SECONDS) || 300,
  DEFAULT_RETRY_ATTEMPTS: parseInt(process.env.DEFAULT_RETRY_ATTEMPTS) || 3,
  
  // Template configuration
  TEMPLATE_VALIDATION_STRICT: process.env.TEMPLATE_VALIDATION_STRICT === 'true',
  CUSTOM_TEMPLATES_ENABLED: process.env.CUSTOM_TEMPLATES_ENABLED !== 'false',
  
  // Bulk operations
  MAX_BULK_OPERATIONS: parseInt(process.env.MAX_BULK_OPERATIONS) || 100,
  BULK_BATCH_SIZE: parseInt(process.env.BULK_BATCH_SIZE) || 10,
  
  // Rate limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || '1 minute',
  
  // Authentication
  IDENTITY_SIGNATURE_SECRET: process.env.IDENTITY_SIGNATURE_SECRET || 'your-super-secret-signature-key-min-32-chars',
  
  // External service URLs
  AUDIT_SERVICE_URL: process.env.AUDIT_SERVICE_URL || 'http://audit:3009',
  TOOLS_HEALTH_URL: process.env.TOOLS_HEALTH_URL || 'http://tools-service:3004',
  CATALOG_SERVICE_URL: process.env.CATALOG_SERVICE_URL || 'http://catalog:3006',
  WEBHOOK_INGRESS_URL: process.env.WEBHOOK_INGRESS_URL || 'http://webhook-ingress:3007',
  
  // Tool-specific configurations
  GITHUB_CONFIG: {
    api_base_url: process.env.GITHUB_API_BASE_URL || 'https://api.github.com',
    rate_limit_buffer: 10, // Keep buffer for rate limits
    max_retries: 3
  },
  
  GITLAB_CONFIG: {
    api_base_url: process.env.GITLAB_API_BASE_URL || 'https://gitlab.com/api/v4',
    rate_limit_buffer: 5,
    max_retries: 3
  },
  
  JENKINS_CONFIG: {
    api_base_url: process.env.JENKINS_API_BASE_URL || 'http://jenkins:8080',
    max_retries: 3
  },
  
  ARGOCD_CONFIG: {
    api_base_url: process.env.ARGOCD_API_BASE_URL || 'http://argocd-server:8080/api/v1',
    max_retries: 3
  },
  
  TERRAFORM_CONFIG: {
    api_base_url: process.env.TERRAFORM_API_BASE_URL || 'https://app.terraform.io/api/v2',
    rate_limit_buffer: 5,
    max_retries: 3
  },
  
  SONARQUBE_CONFIG: {
    api_base_url: process.env.SONARQUBE_API_BASE_URL || 'http://sonarqube:9000/api',
    max_retries: 3
  },
  
  GRAFANA_CONFIG: {
    api_base_url: process.env.GRAFANA_API_BASE_URL || 'http://grafana:3000/api',
    max_retries: 3
  },
  
  PROMETHEUS_CONFIG: {
    api_base_url: process.env.PROMETHEUS_API_BASE_URL || 'http://prometheus:9090/api/v1',
    max_retries: 3
  },
  
  KIBANA_CONFIG: {
    api_base_url: process.env.KIBANA_API_BASE_URL || 'http://kibana:5601/api',
    max_retries: 3
  },
  
  SNYK_CONFIG: {
    api_base_url: process.env.SNYK_API_BASE_URL || 'https://api.snyk.io/v1',
    rate_limit_buffer: 10,
    max_retries: 3
  },
  
  JIRA_CONFIG: {
    api_base_url: process.env.JIRA_API_BASE_URL || 'https://your-domain.atlassian.net/rest/api/2',
    max_retries: 3
  },
  
  // Security configuration
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'your-32-char-encryption-key-here!',
  CREDENTIAL_ENCRYPTION_ENABLED: process.env.CREDENTIAL_ENCRYPTION_ENABLED !== 'false',
  
  // Monitoring and observability
  HEALTH_CHECK_INTERVAL_SECONDS: parseInt(process.env.HEALTH_CHECK_INTERVAL_SECONDS) || 30,
  METRICS_COLLECTION_ENABLED: process.env.METRICS_COLLECTION_ENABLED !== 'false',
  
  // Cleanup configuration
  AUTO_CLEANUP_ENABLED: process.env.AUTO_CLEANUP_ENABLED === 'true',
  DEFAULT_RETENTION_DAYS: parseInt(process.env.DEFAULT_RETENTION_DAYS) || 90,
  CLEANUP_CHECK_INTERVAL_HOURS: parseInt(process.env.CLEANUP_CHECK_INTERVAL_HOURS) || 24,
  
  // Feature flags
  ROLLBACK_ENABLED: process.env.ROLLBACK_ENABLED !== 'false',
  BULK_OPERATIONS_ENABLED: process.env.BULK_OPERATIONS_ENABLED !== 'false',
  POLICY_ENFORCEMENT_ENABLED: process.env.POLICY_ENFORCEMENT_ENABLED !== 'false',
  
  // Development and testing
  NODE_ENV: process.env.NODE_ENV || 'production',
  DEBUG_MODE: process.env.DEBUG_MODE === 'true'
};
