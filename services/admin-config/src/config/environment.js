/**
 * Environment Configuration for Admin Config Service
 */

const config = {
  keycloak: {
    base_url: process.env.KEYCLOAK_BASE_URL || 'http://localhost:8080',
    realm: process.env.KEYCLOAK_REALM || 'sso-hub',
    admin_username: process.env.KEYCLOAK_ADMIN_USERNAME || 'admin',
    admin_password: process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin_secure_password_123'
  },
  
  frontend: {
    base_url: process.env.FRONTEND_BASE_URL || 'http://localhost:3000'
  },
  
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 5432,
    name: process.env.DATABASE_NAME || 'sso_hub',
    username: process.env.DATABASE_USERNAME || 'sso_hub_user',
    password: process.env.DATABASE_PASSWORD || 'sso_hub_secure_password_456'
  }
};

module.exports = { config };