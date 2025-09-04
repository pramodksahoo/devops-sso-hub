/**
 * Configuration for Notifier Service
 * Centralized notification and alerting service for SSO Hub
 */

const config = {
  // Server configuration
  HOST: process.env.NOTIFIER_HOST || '0.0.0.0',
  PORT: process.env.NOTIFIER_PORT || 3014,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://sso_user:sso_secure_password_123@localhost:5432/sso_hub',
  
  // Redis configuration for queuing
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_DB: process.env.REDIS_DB || 1, // Use different DB from other services
  
  // CORS configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Rate limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000,
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || '1 minute',
  
  // Notification processing configuration
  NOTIFICATION_PROCESSING_CONCURRENCY: parseInt(process.env.NOTIFICATION_PROCESSING_CONCURRENCY, 10) || 5,
  NOTIFICATION_RETRY_ATTEMPTS: parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS, 10) || 3,
  NOTIFICATION_RETRY_DELAY: parseInt(process.env.NOTIFICATION_RETRY_DELAY, 10) || 5000, // 5 seconds
  NOTIFICATION_BATCH_SIZE: parseInt(process.env.NOTIFICATION_BATCH_SIZE, 10) || 100,
  NOTIFICATION_TIMEOUT: parseInt(process.env.NOTIFICATION_TIMEOUT, 10) || 30000, // 30 seconds
  
  // Template configuration
  TEMPLATE_CACHING_ENABLED: process.env.TEMPLATE_CACHING_ENABLED === 'true',
  TEMPLATE_CACHE_TTL: parseInt(process.env.TEMPLATE_CACHE_TTL, 10) || 3600, // 1 hour
  
  // Email configuration
  EMAIL_ENABLED: process.env.EMAIL_ENABLED !== 'false',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.example.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || 'notifications@sso-hub.com',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || 'notifications@sso-hub.com',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'SSO Hub Notifications',
  EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO || 'noreply@sso-hub.com',
  
  // Slack configuration
  SLACK_ENABLED: process.env.SLACK_ENABLED !== 'false',
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL || '',
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || '',
  SLACK_DEFAULT_CHANNEL: process.env.SLACK_DEFAULT_CHANNEL || '#alerts',
  SLACK_USERNAME: process.env.SLACK_USERNAME || 'SSO Hub Bot',
  SLACK_ICON_EMOJI: process.env.SLACK_ICON_EMOJI || ':warning:',
  
  // Webhook configuration
  WEBHOOK_ENABLED: process.env.WEBHOOK_ENABLED !== 'false',
  WEBHOOK_TIMEOUT: parseInt(process.env.WEBHOOK_TIMEOUT, 10) || 30000,
  WEBHOOK_RETRY_ATTEMPTS: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS, 10) || 3,
  WEBHOOK_SIGNATURE_HEADER: process.env.WEBHOOK_SIGNATURE_HEADER || 'X-SSO-Hub-Signature',
  WEBHOOK_USER_AGENT: process.env.WEBHOOK_USER_AGENT || 'SSO-Hub-Notifier/1.0',
  
  // Service integration URLs
  AUDIT_SERVICE_URL: process.env.AUDIT_SERVICE_URL || 'http://audit:3009',
  USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://user-service:3003',
  POLICY_SERVICE_URL: process.env.POLICY_SERVICE_URL || 'http://policy:3013',
  
  // Security configuration
  HMAC_SECRET: process.env.HMAC_SECRET || 'notifier-service-hmac-secret-key-change-in-production',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'notifier-32-char-encryption-key!',
  
  // Performance and monitoring
  HEALTH_CHECK_TIMEOUT: parseInt(process.env.HEALTH_CHECK_TIMEOUT, 10) || 5000,
  METRICS_ENABLED: process.env.METRICS_ENABLED !== 'false',
  TELEMETRY_ENABLED: process.env.TELEMETRY_ENABLED !== 'false',
  
  // Queue configuration
  QUEUE_NAMES: {
    IMMEDIATE: 'notifier:immediate',
    DELAYED: 'notifier:delayed', 
    RETRY: 'notifier:retry',
    ESCALATION: 'notifier:escalation',
    BATCH: 'notifier:batch'
  },
  
  // Escalation configuration
  ESCALATION_ENABLED: process.env.ESCALATION_ENABLED !== 'false',
  ESCALATION_DELAY: parseInt(process.env.ESCALATION_DELAY, 10) || 300000, // 5 minutes
  ESCALATION_MAX_LEVELS: parseInt(process.env.ESCALATION_MAX_LEVELS, 10) || 3,
  
  // Archive configuration
  ARCHIVE_ENABLED: process.env.ARCHIVE_ENABLED !== 'false',
  ARCHIVE_AFTER_DAYS: parseInt(process.env.ARCHIVE_AFTER_DAYS, 10) || 30,
  CLEANUP_ENABLED: process.env.CLEANUP_ENABLED !== 'false',
  CLEANUP_AFTER_DAYS: parseInt(process.env.CLEANUP_AFTER_DAYS, 10) || 90
};

// Validate required configuration
const requiredEnvVars = ['DATABASE_URL', 'REDIS_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Validate email configuration if enabled
if (config.EMAIL_ENABLED && !config.SMTP_PASS) {
  console.warn('Email notifications enabled but SMTP_PASS not configured. Email delivery may fail.');
}

// Validate Slack configuration if enabled
if (config.SLACK_ENABLED && !config.SLACK_WEBHOOK_URL && !config.SLACK_BOT_TOKEN) {
  console.warn('Slack notifications enabled but neither SLACK_WEBHOOK_URL nor SLACK_BOT_TOKEN configured. Slack delivery may fail.');
}

module.exports = config;
