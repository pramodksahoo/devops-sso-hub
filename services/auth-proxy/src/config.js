/**
 * Auth Proxy Service Configuration
 */

require('dotenv').config();

module.exports = {
  // Server configuration
  HOST: process.env.HOST || '0.0.0.0',
  PORT: process.env.PORT || 3015,
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Grafana configuration
  GRAFANA_URL: process.env.GRAFANA_URL || 'http://grafana:3000',
  GRAFANA_ADMIN_USER: process.env.GRAFANA_ADMIN_USER || 'admin',
  GRAFANA_ADMIN_PASSWORD: process.env.GRAFANA_ADMIN_PASSWORD || 'grafana_admin_pass',
  
  // Token TTL
  TOKEN_TTL: parseInt(process.env.TOKEN_TTL || '300', 10), // 5 minutes
  
  // Proxy settings
  PROXY_TIMEOUT: parseInt(process.env.PROXY_TIMEOUT || '30000', 10) // 30 seconds
};