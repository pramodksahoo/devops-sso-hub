-- User Service Database Schema
-- User profiles, authentication, sessions, groups, and API key management

-- Users table (extends Keycloak data with local profile info)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keycloak_sub VARCHAR(255) UNIQUE NOT NULL, -- Links to Keycloak user ID
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(255),
    avatar_url TEXT,
    
    -- Additional user profile fields
    department VARCHAR(100),
    job_title VARCHAR(100),
    manager_id VARCHAR(255), -- Can reference another user
    
    -- User preferences and metadata
    preferences JSONB DEFAULT '{}', -- UI preferences, theme, language, etc.
    metadata JSONB DEFAULT '{}', -- Additional user metadata
    timezone VARCHAR(100) DEFAULT 'UTC',
    
    -- User status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    
    -- Onboarding tracking
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_step INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- User groups for organizing users
CREATE TABLE IF NOT EXISTS user_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    
    -- Group permissions and configuration
    permissions JSONB DEFAULT '{}', -- Group-level permissions
    metadata JSONB DEFAULT '{}', -- Additional group metadata
    is_system_group BOOLEAN DEFAULT false, -- System-managed groups (e.g., "admin", "users")
    auto_assignment_rules JSONB DEFAULT '{}', -- Rules for automatic group assignment
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- User group memberships
CREATE TABLE IF NOT EXISTS user_group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
    
    -- Membership details
    role VARCHAR(50) DEFAULT 'member', -- member, admin, owner
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    
    -- Assignment tracking (matches database.js usage)
    granted_by VARCHAR(255), -- User who granted this membership
    assignment_reason TEXT,
    
    UNIQUE(user_id, group_id)
);

-- User sessions for tracking active user sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session identification
    session_id VARCHAR(255) UNIQUE NOT NULL, -- From Keycloak or JWT
    ip_address INET,
    user_agent TEXT,
    
    -- Login method and timing (matches database.js)
    login_method VARCHAR(50), -- Method used to login (oidc, saml, etc.)
    expires_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Session lifecycle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- User API keys for programmatic access
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Key identification (matches database.js schema)
    name VARCHAR(100) NOT NULL, -- Key name
    key_hash VARCHAR(255) UNIQUE NOT NULL, -- Hashed version of the key
    key_prefix VARCHAR(20) NOT NULL, -- First few characters for identification
    
    -- Permissions (matches database.js usage)
    permissions JSONB DEFAULT '{}', -- Fine-grained permissions as JSON
    
    -- Key lifecycle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(user_id, name)
);

-- Seamless SSO sessions for streamlined tool access
CREATE TABLE IF NOT EXISTS seamless_sso_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session identification
    session_token VARCHAR(500) UNIQUE NOT NULL,
    keycloak_session_id VARCHAR(255),
    
    -- Target tool information
    target_tool_slug VARCHAR(100),
    target_url TEXT,
    
    -- Session lifecycle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    is_consumed BOOLEAN DEFAULT false,
    
    -- Session metadata
    metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_keycloak_sub ON users(keycloak_sub);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_group_memberships_user_id ON user_group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_group_id ON user_group_memberships(group_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_hash ON user_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_prefix ON user_api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_seamless_sso_sessions_token ON seamless_sso_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_seamless_sso_sessions_expires ON seamless_sso_sessions(expires_at) WHERE NOT is_consumed;
CREATE INDEX IF NOT EXISTS idx_seamless_sso_sessions_user_id ON seamless_sso_sessions(user_id);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_groups_updated_at BEFORE UPDATE ON user_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON user_api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default user groups
INSERT INTO user_groups (name, slug, description, is_system_group, permissions) VALUES
('Administrators', 'admin', 'System administrators with full access', true, '{"admin": true, "all_tools": true}'),
('Users', 'users', 'Standard users with basic access', true, '{"basic_access": true}'),
('Power Users', 'power-users', 'Advanced users with extended permissions', true, '{"advanced_access": true, "tool_management": true}')
ON CONFLICT (slug) DO NOTHING;

-- Insert migration record
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('02-user-service', NOW())
ON CONFLICT (version) DO NOTHING;