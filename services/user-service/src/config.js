// User Service Configuration
const config = {
  // Server configuration
  HOST: process.env.HOST || '0.0.0.0',
  PORT: parseInt(process.env.PORT) || 3003,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://sso_user:password@localhost:5432/sso_hub',

  // Security configuration
  IDENTITY_HEADER_SECRET: process.env.IDENTITY_HEADER_SECRET || 'your-hmac-secret-here',
  
  // CORS configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Rate limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || '1 minute',

  // API Key settings
  API_KEY_LENGTH: parseInt(process.env.API_KEY_LENGTH) || 32,
  API_KEY_PREFIX_LENGTH: parseInt(process.env.API_KEY_PREFIX_LENGTH) || 8,

  // Pagination defaults
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE) || 20,
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE) || 100
};

module.exports = config;
