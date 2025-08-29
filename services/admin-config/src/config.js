const config = {
  // Server Configuration
  HOST: process.env.HOST || '0.0.0.0',
  PORT: process.env.PORT || 3005,
  
  // Database Configuration
  DB_HOST: process.env.POSTGRES_HOST || 'postgres',
  DB_PORT: process.env.POSTGRES_PORT || 5432,
  DB_NAME: process.env.POSTGRES_DB || 'sso_hub',
  DB_USER: process.env.POSTGRES_USER || 'sso_user',
  DB_PASSWORD: process.env.POSTGRES_PASSWORD || 'sso_secure_password',
  
  // Redis Configuration
  REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379',
  
  // Keycloak Configuration
  KEYCLOAK_URL: process.env.KEYCLOAK_URL || 'http://keycloak:8080',
  KEYCLOAK_REALM: process.env.KEYCLOAK_REALM || 'sso-hub',
  KEYCLOAK_ADMIN_USERNAME: process.env.KEYCLOAK_ADMIN_USERNAME || 'admin',
  KEYCLOAK_ADMIN_PASSWORD: process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin_secure_password_123',
  
  // Infisical Configuration (for secret management)
  INFISICAL_URL: process.env.INFISICAL_URL || 'http://infisical:8080',
  INFISICAL_TOKEN: process.env.INFISICAL_TOKEN || '',
  INFISICAL_PROJECT_ID: process.env.INFISICAL_PROJECT_ID || '',
  
  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'admin-config-jwt-secret-key',
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || 'admin-api-key-change-in-production',
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Tool Integration URLs (can be overridden per configuration)
  TOOL_DEFAULTS: {
    github: {
      base_url: 'https://github.com',
      api_url: 'https://api.github.com',
      auth_url: 'https://github.com/login/oauth/authorize',
      token_url: 'https://github.com/login/oauth/access_token'
    },
    gitlab: {
      base_url: 'https://gitlab.com',
      api_url: 'https://gitlab.com/api/v4',
      auth_url: '/oauth/authorize',
      token_url: '/oauth/token'
    },
    jenkins: {
      auth_url: '/securityRealm/finishLogin',
      api_path: '/api/json'
    },
    argocd: {
      api_path: '/api/v1',
      auth_path: '/auth'
    },
    terraform: {
      base_url: 'https://app.terraform.io',
      api_url: 'https://app.terraform.io/api/v2'
    },
    sonarqube: {
      api_path: '/api',
      auth_path: '/oauth2/authorization'
    },
    grafana: {
      api_path: '/api',
      auth_path: '/login/generic_oauth'
    },
    prometheus: {
      api_path: '/api/v1'
    },
    kibana: {
      api_path: '/api',
      auth_path: '/api/security/v1'
    },
    snyk: {
      base_url: 'https://snyk.io',
      api_url: 'https://api.snyk.io',
      auth_url: 'https://app.snyk.io/oauth2/authorize'
    },
    jira: {
      api_path: '/rest/api/3',
      auth_path: '/plugins/servlet/oauth'
    },
    servicenow: {
      api_path: '/api',
      auth_path: '/oauth'
    }
  }
};

module.exports = config;
