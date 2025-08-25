/**
 * Auth-BFF Configuration
 * 
 * Environment-based configuration for the Auth-BFF service.
 * All values can be overridden via environment variables.
 * 
 * Security Note: In production, ensure all secrets are properly
 * configured via environment variables and not using defaults.
 */

const config = {
  // Server configuration
  HOST: process.env.HOST || '0.0.0.0',
  PORT: parseInt(process.env.PORT) || 3002,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // OIDC Configuration
  OIDC_ISSUER: process.env.OIDC_ISSUER || 'http://localhost:8080/realms/sso-hub',
  OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID || 'sso-hub-client',
  OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET || 'sso-client-secret',
  OIDC_REDIRECT_URI: process.env.OIDC_REDIRECT_URI || 'http://localhost:3002/auth/callback',

  // Session Configuration
  SESSION_SECRET: process.env.SESSION_SECRET || 'sso-hub-session-secret-2025-secure-and-unique',
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME || 'sso_session',
  SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 24 hours

  // Redis Configuration
  REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379',
  NODE_ENV: process.env.NODE_ENV || 'development',
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,

  // Security Configuration
  IDENTITY_HEADER_SECRET: process.env.IDENTITY_HEADER_SECRET || 'your-hmac-secret-here',
  CORS_ORIGIN: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3002'],
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000'
};

module.exports = config;
