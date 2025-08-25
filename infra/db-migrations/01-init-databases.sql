-- Initialize SSO Hub databases
-- This script creates the necessary databases and users

-- Create Keycloak database and user (if not exists)
SELECT 'CREATE DATABASE keycloak' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec

DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'keycloak_user') THEN
      CREATE ROLE keycloak_user LOGIN PASSWORD 'keycloak_password';
   END IF;
END
$do$;

GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak_user;

-- Create Infisical database (will use main sso_hub database)  
CREATE SCHEMA IF NOT EXISTS infisical;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA infisical TO sso_user;

-- Log initialization
INSERT INTO public.schema_migrations (version, applied_at) 
VALUES ('01-init-databases', NOW())
ON CONFLICT (version) DO NOTHING;
