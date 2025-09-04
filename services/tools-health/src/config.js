/**
 * Tools Service Configuration
 * 
 * Environment-based configuration for the Tools Service.
 * Handles tool registration, discovery, health monitoring, and access control.
 * 
 * Security Note: In production, ensure all secrets are properly
 * configured via environment variables and not using defaults.
 */

const config = {
  // Server configuration
  HOST: process.env.HOST || '0.0.0.0',
  PORT: parseInt(process.env.PORT) || 3004,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/sso_hub',
  
  // Auth-BFF Integration
  AUTH_BFF_URL: process.env.AUTH_BFF_URL || 'http://auth-bff:3002',
  IDENTITY_HEADER_SECRET: process.env.IDENTITY_HEADER_SECRET || 'your-hmac-secret-here',
  
  // Security Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Tool Health Monitoring
  HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000, // 30 seconds
  HEALTH_CHECK_TIMEOUT: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,   // 5 seconds
  
  // Service Discovery
  DISCOVERY_ENABLED: process.env.DISCOVERY_ENABLED === 'true' || true,
  DISCOVERY_INTERVAL: parseInt(process.env.DISCOVERY_INTERVAL) || 60000, // 1 minute
  
  // Rate Limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000, // 1 minute
};

module.exports = config;
