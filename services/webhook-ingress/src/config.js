/**
 * Webhook Ingress Service Configuration
 * Environment-based configuration for comprehensive webhook processing
 */

const config = {
  // Server Configuration
  HOST: process.env.WEBHOOK_INGRESS_HOST || '0.0.0.0',
  PORT: process.env.WEBHOOK_INGRESS_PORT || 3007,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://sso_user:sso_secure_password_123@postgres:5432/sso_hub',
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN === 'true' ? true : (process.env.CORS_ORIGIN || 'http://localhost:3000'),
  
  // Webhook Configuration
  WEBHOOK_TIMEOUT: parseInt(process.env.WEBHOOK_TIMEOUT) || 30000,
  MAX_PAYLOAD_SIZE: process.env.MAX_PAYLOAD_SIZE || '10mb',
  SIGNATURE_TOLERANCE: parseInt(process.env.SIGNATURE_TOLERANCE) || 300, // 5 minutes
  
  // Rate Limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || '1 minute',
  
  // Security
  WEBHOOK_SECRET_ENCRYPTION_KEY: process.env.WEBHOOK_SECRET_ENCRYPTION_KEY || 'default-encryption-key-change-in-production',
  
  // External Services
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || 'http://notifier:3010',
  AUDIT_SERVICE_URL: process.env.AUDIT_SERVICE_URL || 'http://audit:3009',
  ANALYTICS_SERVICE_URL: process.env.ANALYTICS_SERVICE_URL || 'http://analytics:3010',
  
  // Tool-Specific Configuration
  TOOL_CONFIGS: {
    github: {
      signature_header: 'x-hub-signature-256',
      event_header: 'x-github-event',
      delivery_header: 'x-github-delivery',
      user_agent_pattern: /^GitHub-Hookshot/,
      supported_events: ['push', 'pull_request', 'issues', 'release', 'deployment', 'workflow_run']
    },
    gitlab: {
      signature_header: 'x-gitlab-token',
      event_header: 'x-gitlab-event',
      user_agent_pattern: /^GitLab/,
      supported_events: ['push', 'merge_request', 'pipeline', 'deployment', 'issue', 'tag_push']
    },
    jenkins: {
      signature_header: 'authorization',
      event_header: 'x-jenkins-event',
      user_agent_pattern: /^Jenkins/,
      supported_events: ['build_started', 'build_completed', 'build_failed', 'queue_event']
    },
    argocd: {
      signature_header: 'x-argo-signature',
      event_header: 'x-argo-event',
      user_agent_pattern: /^ArgoCD/,
      supported_events: ['app_sync', 'app_health', 'deployment', 'resource_event']
    },
    terraform: {
      signature_header: 'x-tfc-webhook-signature',
      event_header: 'x-tfc-notification-event',
      user_agent_pattern: /^TerraformEnterprise/,
      supported_events: ['run_started', 'run_completed', 'run_errored', 'plan_event']
    },
    sonarqube: {
      signature_header: 'x-sonarqube-token',
      event_header: 'x-sonarqube-event',
      user_agent_pattern: /^SonarQube/,
      supported_events: ['quality_gate', 'analysis_completed', 'project_event']
    },
    grafana: {
      signature_header: 'authorization',
      event_header: 'x-grafana-event',
      user_agent_pattern: /^Grafana/,
      supported_events: ['alert_notification', 'dashboard_change', 'annotation']
    },
    prometheus: {
      signature_header: 'authorization',
      event_header: 'x-prometheus-event',
      user_agent_pattern: /^Alertmanager/,
      supported_events: ['alert_manager', 'metric_threshold', 'silence']
    },
    kibana: {
      signature_header: 'authorization',
      event_header: 'x-kibana-event',
      user_agent_pattern: /^Elastic/,
      supported_events: ['watcher_alert', 'index_management', 'ml_anomaly']
    },
    snyk: {
      signature_header: 'x-snyk-signature',
      event_header: 'x-snyk-event',
      user_agent_pattern: /^Snyk/,
      supported_events: ['vulnerability_event', 'project_event', 'license_issue']
    },
    jira: {
      signature_header: 'authorization',
      event_header: 'x-atlassian-webhook-identifier',
      user_agent_pattern: /^Atlassian/,
      supported_events: ['issue_created', 'issue_updated', 'status_change', 'comment_created']
    },
    servicenow: {
      signature_header: 'authorization',
      event_header: 'x-servicenow-event',
      user_agent_pattern: /^ServiceNow/,
      supported_events: ['incident_created', 'incident_updated', 'change_request', 'problem_created']
    }
  },
  
  // Notification Channels
  NOTIFICATION_CHANNELS: {
    email: {
      enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
      smtp_host: process.env.SMTP_HOST,
      smtp_port: parseInt(process.env.SMTP_PORT) || 587,
      smtp_user: process.env.SMTP_USER,
      smtp_password: process.env.SMTP_PASSWORD
    },
    slack: {
      enabled: process.env.SLACK_NOTIFICATIONS_ENABLED === 'true',
      webhook_url: process.env.SLACK_WEBHOOK_URL,
      bot_token: process.env.SLACK_BOT_TOKEN
    },
    teams: {
      enabled: process.env.TEAMS_NOTIFICATIONS_ENABLED === 'true',
      webhook_url: process.env.TEAMS_WEBHOOK_URL
    },
    webhook: {
      enabled: process.env.WEBHOOK_NOTIFICATIONS_ENABLED === 'true',
      default_endpoint: process.env.WEBHOOK_NOTIFICATION_ENDPOINT
    }
  }
};

module.exports = config;
