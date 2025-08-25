/**
 * Configuration for LDAP Sync Service - Phase 10
 * Environment-based configuration with secure defaults
 */

module.exports = {
  // Server configuration
  HOST: process.env.HOST || '0.0.0.0',
  PORT: process.env.PORT || 3012,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://sso_user:sso_password@postgres:5432/sso_hub',
  
  // CORS configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // LDAP configuration
  LDAP_CONNECTION_TIMEOUT: parseInt(process.env.LDAP_CONNECTION_TIMEOUT) || 30000,
  LDAP_SEARCH_TIMEOUT: parseInt(process.env.LDAP_SEARCH_TIMEOUT) || 60000,
  LDAP_MAX_CONNECTIONS: parseInt(process.env.LDAP_MAX_CONNECTIONS) || 10,
  LDAP_RECONNECT_ENABLED: process.env.LDAP_RECONNECT_ENABLED !== 'false',
  LDAP_RECONNECT_INTERVAL: parseInt(process.env.LDAP_RECONNECT_INTERVAL) || 5000,
  
  // Sync configuration
  MAX_CONCURRENT_SYNC_JOBS: parseInt(process.env.MAX_CONCURRENT_SYNC_JOBS) || 5,
  SYNC_JOB_TIMEOUT_MINUTES: parseInt(process.env.SYNC_JOB_TIMEOUT_MINUTES) || 120,
  DEFAULT_SYNC_BATCH_SIZE: parseInt(process.env.DEFAULT_SYNC_BATCH_SIZE) || 100,
  DEFAULT_RATE_LIMIT_PER_MINUTE: parseInt(process.env.DEFAULT_RATE_LIMIT_PER_MINUTE) || 60,
  
  // Discovery configuration
  DISCOVERY_MAX_ENTRIES: parseInt(process.env.DISCOVERY_MAX_ENTRIES) || 10000,
  DISCOVERY_PAGE_SIZE: parseInt(process.env.DISCOVERY_PAGE_SIZE) || 1000,
  DISCOVERY_TIMEOUT_MINUTES: parseInt(process.env.DISCOVERY_TIMEOUT_MINUTES) || 30,
  
  // Cache configuration
  LDAP_CACHE_TTL_MINUTES: parseInt(process.env.LDAP_CACHE_TTL_MINUTES) || 60,
  LDAP_CACHE_CLEANUP_INTERVAL_HOURS: parseInt(process.env.LDAP_CACHE_CLEANUP_INTERVAL_HOURS) || 24,
  
  // Preview and dry-run configuration
  PREVIEW_MAX_CHANGES: parseInt(process.env.PREVIEW_MAX_CHANGES) || 1000,
  DRY_RUN_ENABLED: process.env.DRY_RUN_ENABLED !== 'false',
  
  // Conflict resolution
  DEFAULT_CONFLICT_RESOLUTION: process.env.DEFAULT_CONFLICT_RESOLUTION || 'ldap_wins',
  CONFLICT_DETECTION_ENABLED: process.env.CONFLICT_DETECTION_ENABLED !== 'false',
  
  // Rate limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || '1 minute',
  
  // Authentication
  IDENTITY_SIGNATURE_SECRET: process.env.IDENTITY_SIGNATURE_SECRET || 'your-super-secret-signature-key-min-32-chars',
  
  // External service URLs
  AUDIT_SERVICE_URL: process.env.AUDIT_SERVICE_URL || 'http://audit:3009',
  TOOLS_HEALTH_URL: process.env.TOOLS_HEALTH_URL || 'http://tools-service:3004',
  CATALOG_SERVICE_URL: process.env.CATALOG_SERVICE_URL || 'http://catalog:3006',
  PROVISIONING_SERVICE_URL: process.env.PROVISIONING_SERVICE_URL || 'http://provisioning:3011',
  
  // Tool-specific configurations for API access
  GITHUB_CONFIG: {
    api_base_url: process.env.GITHUB_API_BASE_URL || 'https://api.github.com',
    rate_limit_buffer: 10,
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
  
  // Scheduler configuration
  SCHEDULER_ENABLED: process.env.SCHEDULER_ENABLED !== 'false',
  SCHEDULER_CHECK_INTERVAL_MINUTES: parseInt(process.env.SCHEDULER_CHECK_INTERVAL_MINUTES) || 5,
  
  // Cleanup configuration
  AUTO_CLEANUP_ENABLED: process.env.AUTO_CLEANUP_ENABLED === 'true',
  CLEANUP_OLD_JOBS_DAYS: parseInt(process.env.CLEANUP_OLD_JOBS_DAYS) || 30,
  CLEANUP_OLD_AUDIT_DAYS: parseInt(process.env.CLEANUP_OLD_AUDIT_DAYS) || 90,
  
  // Feature flags
  PREVIEW_MODE_ENABLED: process.env.PREVIEW_MODE_ENABLED !== 'false',
  INCREMENTAL_SYNC_ENABLED: process.env.INCREMENTAL_SYNC_ENABLED !== 'false',
  BULK_OPERATIONS_ENABLED: process.env.BULK_OPERATIONS_ENABLED !== 'false',
  ADVANCED_MAPPING_ENABLED: process.env.ADVANCED_MAPPING_ENABLED !== 'false',
  
  // Development and testing
  NODE_ENV: process.env.NODE_ENV || 'production',
  DEBUG_MODE: process.env.DEBUG_MODE === 'true',
  MOCK_LDAP_ENABLED: process.env.MOCK_LDAP_ENABLED === 'true',
  
  // Tool credentials (use secrets manager in production)
  TOOL_CREDENTIALS: {
    github_token: process.env.GITHUB_TOKEN || 'mock_github_token',
    gitlab_token: process.env.GITLAB_TOKEN || 'mock_gitlab_token',
    jenkins_token: process.env.JENKINS_TOKEN || 'mock_jenkins_token',
    argocd_token: process.env.ARGOCD_TOKEN || 'mock_argocd_token',
    terraform_token: process.env.TERRAFORM_TOKEN || 'mock_terraform_token',
    sonarqube_token: process.env.SONARQUBE_TOKEN || 'mock_sonarqube_token',
    grafana_token: process.env.GRAFANA_TOKEN || 'mock_grafana_token',
    kibana_token: process.env.KIBANA_TOKEN || 'mock_kibana_token',
    snyk_token: process.env.SNYK_TOKEN || 'mock_snyk_token',
    jira_token: process.env.JIRA_TOKEN || 'mock_jira_token'
  }
};
