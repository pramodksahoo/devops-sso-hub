/**
 * Audit Service Configuration
 * Environment-based configuration for comprehensive audit logging
 */

const config = {
  // Server Configuration
  HOST: process.env.AUDIT_HOST || '0.0.0.0',
  PORT: process.env.AUDIT_PORT || 3009,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://sso_user:sso_secure_password_123@postgres:5432/sso_hub',
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN === 'true' ? true : (process.env.CORS_ORIGIN || 'http://localhost:3000'),
  
  // Audit Configuration
  AUDIT_RETENTION_DAYS: parseInt(process.env.AUDIT_RETENTION_DAYS) || 90, // Default 90 days retention
  AUDIT_BATCH_SIZE: parseInt(process.env.AUDIT_BATCH_SIZE) || 1000,
  AUDIT_FLUSH_INTERVAL_MS: parseInt(process.env.AUDIT_FLUSH_INTERVAL_MS) || 5000, // 5 seconds
  ENABLE_REAL_TIME_PROCESSING: process.env.ENABLE_REAL_TIME_PROCESSING !== 'false',
  
  // Rate Limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 10000, // High limit for audit events
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || '1 minute',
  
  // Security and Compliance
  ENCRYPTION_KEY: process.env.AUDIT_ENCRYPTION_KEY || 'default-audit-encryption-key-change-in-production',
  ENABLE_PII_MASKING: process.env.ENABLE_PII_MASKING === 'true',
  COMPLIANCE_MODE: process.env.COMPLIANCE_MODE || 'standard', // 'minimal', 'standard', 'strict'
  
  // Integration URLs
  WEBHOOK_INGRESS_URL: process.env.WEBHOOK_INGRESS_URL || 'http://webhook-ingress:3007',
  AUTH_BFF_URL: process.env.AUTH_BFF_URL || 'http://auth-bff:3002',
  CATALOG_URL: process.env.CATALOG_URL || 'http://catalog:3006',
  TOOLS_HEALTH_URL: process.env.TOOLS_HEALTH_URL || 'http://tools-health:3005',
  
  // Tool Categories for Audit Classification
  TOOL_CATEGORIES: {
    'scm': ['github', 'gitlab'],
    'ci_cd': ['jenkins', 'argocd'],
    'infrastructure': ['terraform'],
    'code_quality': ['sonarqube'],
    'monitoring': ['grafana', 'prometheus'],
    'logging': ['kibana'],
    'security': ['snyk'],
    'issue_tracking': ['jira', 'servicenow']
  },
  
  // Event Severity Mapping
  EVENT_SEVERITY_MAPPING: {
    'sso_launch_success': 'info',
    'sso_launch_failure': 'error',
    'tool_config_change': 'warning',
    'permission_granted': 'info',
    'permission_revoked': 'warning',
    'health_status_critical': 'critical',
    'health_status_degraded': 'warning',
    'webhook_processing_failure': 'error',
    'security_violation': 'critical',
    'compliance_issue': 'critical'
  },
  
  // Workflow Correlation Rules
  WORKFLOW_CORRELATION_RULES: {
    'ci_cd_pipeline': {
      'start_events': ['github.push', 'gitlab.push'],
      'continuation_events': ['jenkins.build_started', 'argocd.app_sync'],
      'end_events': ['jenkins.build_completed', 'argocd.deployment'],
      'max_duration_minutes': 60
    },
    'incident_response': {
      'start_events': ['prometheus.alert_manager', 'grafana.alert_notification'],
      'continuation_events': ['jira.issue_created', 'servicenow.incident_created'],
      'end_events': ['jira.issue_resolved', 'servicenow.incident_closed'],
      'max_duration_minutes': 1440 // 24 hours
    },
    'security_review': {
      'start_events': ['snyk.vulnerability_event'],
      'continuation_events': ['sonarqube.quality_gate', 'jira.issue_created'],
      'end_events': ['jira.issue_resolved'],
      'max_duration_minutes': 2880 // 48 hours
    }
  },
  
  // Retention Policies
  RETENTION_POLICIES: {
    'critical': 2555, // 7 years in days
    'standard': 1095, // 3 years in days
    'short_term': 90, // 3 months in days
    'minimal': 30 // 1 month in days
  },
  
  // PII Fields to Mask (if PII masking is enabled)
  PII_FIELDS: [
    'user_email',
    'source_ip',
    'personal_data',
    'contact_info',
    'payment_info'
  ]
};

module.exports = config;
