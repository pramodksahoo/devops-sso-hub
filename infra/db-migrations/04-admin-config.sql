-- Admin Config Service Database Schema
-- Tool configurations, supported tools metadata, and integration settings

-- Supported tools metadata (for admin-config service seeding)
CREATE TABLE IF NOT EXISTS supported_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_type VARCHAR(50) UNIQUE NOT NULL, -- github, gitlab, jenkins, etc.
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    protocol VARCHAR(20) NOT NULL, -- oauth2, oidc, saml
    description TEXT,
    icon VARCHAR(50),
    metadata JSONB DEFAULT '{}', -- Tool-specific metadata
    schema_version VARCHAR(20) DEFAULT '1.0',
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tool configurations (managed by admin-config service)
CREATE TABLE IF NOT EXISTS tool_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_type VARCHAR(50) NOT NULL,
    integration_type VARCHAR(50) NOT NULL, -- oauth2, oidc, saml, api_key, custom
    
    -- Configuration JSON (tool-specific structure)
    config_json JSONB NOT NULL DEFAULT '{}',
    
    -- Keycloak integration
    keycloak_client_id VARCHAR(255),
    keycloak_client_uuid VARCHAR(255),
    keycloak_realm VARCHAR(100) DEFAULT 'sso-hub',
    
    -- Status and lifecycle
    status VARCHAR(20) DEFAULT 'not_configured', -- not_configured, configured, testing, active, error
    last_tested_at TIMESTAMP WITH TIME ZONE,
    test_results JSONB DEFAULT '{}',
    
    -- Configuration metadata
    environment VARCHAR(50) DEFAULT 'development',
    version VARCHAR(20) DEFAULT '1.0',
    tags TEXT[] DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    UNIQUE(tool_type, environment)
);

-- Configuration validation rules
CREATE TABLE IF NOT EXISTS config_validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_type VARCHAR(50) NOT NULL,
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'required', 'format', 'custom'
    field_path VARCHAR(255) NOT NULL, -- JSON path in config
    validation_config JSONB DEFAULT '{}',
    error_message TEXT,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tool_type, rule_name)
);

-- Configuration templates for quick setup
CREATE TABLE IF NOT EXISTS config_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_type VARCHAR(50) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    description TEXT,
    template_config JSONB NOT NULL DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,
    environment VARCHAR(50) DEFAULT 'development',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    UNIQUE(tool_type, template_name, environment)
);

-- Integration test configurations
CREATE TABLE IF NOT EXISTS integration_test_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_type VARCHAR(50) NOT NULL,
    test_name VARCHAR(100) NOT NULL,
    test_type VARCHAR(50) NOT NULL, -- connection, authentication, api, full
    test_config JSONB DEFAULT '{}',
    expected_results JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    timeout_seconds INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tool_type, test_name)
);

-- Tool status and health tracking (required by admin-config service)
CREATE TABLE IF NOT EXISTS tool_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_type VARCHAR(50) NOT NULL REFERENCES supported_tools(tool_type),
    
    -- Status information
    status VARCHAR(20) NOT NULL, -- 'active', 'error', 'testing', 'unknown'
    last_tested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Test results and diagnostics
    test_results JSONB DEFAULT '{}',
    error_message TEXT,
    
    -- Performance metrics
    response_time_ms INTEGER,
    uptime_percentage DECIMAL(5,2), -- 0.00 to 100.00
    
    -- Metadata
    test_type VARCHAR(50), -- 'connection', 'authentication', 'api', 'full'
    environment VARCHAR(50) DEFAULT 'production',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_supported_tools_tool_type ON supported_tools(tool_type);
CREATE INDEX IF NOT EXISTS idx_supported_tools_category ON supported_tools(category);
CREATE INDEX IF NOT EXISTS idx_supported_tools_protocol ON supported_tools(protocol);
CREATE INDEX IF NOT EXISTS idx_supported_tools_enabled ON supported_tools(is_enabled) WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_tool_configurations_tool_type ON tool_configurations(tool_type);
CREATE INDEX IF NOT EXISTS idx_tool_configurations_status ON tool_configurations(status);
CREATE INDEX IF NOT EXISTS idx_tool_configurations_environment ON tool_configurations(environment);
CREATE INDEX IF NOT EXISTS idx_tool_configurations_keycloak_client_id ON tool_configurations(keycloak_client_id);

CREATE INDEX IF NOT EXISTS idx_config_validation_rules_tool_type ON config_validation_rules(tool_type);
CREATE INDEX IF NOT EXISTS idx_config_validation_rules_enabled ON config_validation_rules(is_enabled) WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_config_templates_tool_type ON config_templates(tool_type);
CREATE INDEX IF NOT EXISTS idx_config_templates_default ON config_templates(is_default) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_integration_test_configs_tool_type ON integration_test_configs(tool_type);
CREATE INDEX IF NOT EXISTS idx_integration_test_configs_enabled ON integration_test_configs(is_enabled) WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_tool_status_tool_type ON tool_status(tool_type);
CREATE INDEX IF NOT EXISTS idx_tool_status_status ON tool_status(status);
CREATE INDEX IF NOT EXISTS idx_tool_status_created_at ON tool_status(created_at);
CREATE INDEX IF NOT EXISTS idx_tool_status_last_tested_at ON tool_status(last_tested_at);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_supported_tools_updated_at BEFORE UPDATE ON supported_tools 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_tool_configurations_updated_at BEFORE UPDATE ON tool_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_tool_status_updated_at BEFORE UPDATE ON tool_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed supported tools metadata
INSERT INTO supported_tools (tool_type, name, category, protocol, description, icon) VALUES
    ('github', 'GitHub', 'Version Control', 'oauth2', 'Version control and collaboration platform', 'github'),
    ('gitlab', 'GitLab', 'Version Control', 'oidc', 'DevOps platform with version control and CI/CD', 'gitlab'),
    ('jenkins', 'Jenkins', 'CI/CD', 'oidc', 'Automation server for CI/CD pipelines', 'jenkins'),
    ('argocd', 'Argo CD', 'CI/CD', 'oidc', 'Declarative GitOps continuous delivery tool', 'argocd'),
    ('terraform', 'Terraform Cloud/Enterprise', 'Infrastructure', 'oidc', 'Infrastructure as Code platform', 'terraform'),
    ('sonarqube', 'SonarQube', 'Code Quality', 'oidc', 'Code quality and security analysis', 'sonarqube'),
    ('grafana', 'Grafana', 'Monitoring', 'oauth2', 'Observability and monitoring platform', 'grafana'),
    ('prometheus', 'Prometheus', 'Monitoring', 'oidc', 'Monitoring system and time series database', 'prometheus'),
    ('kibana', 'Kibana', 'Monitoring', 'oidc', 'Data visualization and exploration for Elasticsearch', 'kibana'),
    ('snyk', 'Snyk', 'Security', 'oidc', 'Security scanning and vulnerability management', 'snyk'),
    ('jira', 'Jira', 'Project Management', 'saml', 'Project management and issue tracking', 'jira'),
    ('servicenow', 'ServiceNow', 'Service Management', 'saml', 'IT service management platform', 'servicenow')
ON CONFLICT (tool_type) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    protocol = EXCLUDED.protocol,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    updated_at = NOW();

-- Insert common validation rules
INSERT INTO config_validation_rules (tool_type, rule_name, rule_type, field_path, validation_config, error_message) VALUES
    ('github', 'client_id_required', 'required', '$.oauth.client_id', '{}', 'OAuth client ID is required'),
    ('github', 'client_secret_required', 'required', '$.oauth.client_secret', '{}', 'OAuth client secret is required'),
    ('github', 'organization_required', 'required', '$.organization', '{}', 'GitHub organization is required'),
    
    ('gitlab', 'client_id_required', 'required', '$.oidc.client_id', '{}', 'OIDC client ID is required'),
    ('gitlab', 'client_secret_required', 'required', '$.oidc.client_secret', '{}', 'OIDC client secret is required'),
    ('gitlab', 'instance_url_required', 'required', '$.instance_url', '{}', 'GitLab instance URL is required'),
    
    ('jenkins', 'client_id_required', 'required', '$.oidc.client_id', '{}', 'OIDC client ID is required'),
    ('jenkins', 'jenkins_url_required', 'required', '$.jenkins_url', '{}', 'Jenkins URL is required'),
    
    ('grafana', 'client_id_required', 'required', '$.oauth.client_id', '{}', 'OAuth client ID is required'),
    ('grafana', 'client_secret_required', 'required', '$.oauth.client_secret', '{}', 'OAuth client secret is required'),
    ('grafana', 'grafana_url_required', 'required', '$.grafana_url', '{}', 'Grafana URL is required')
ON CONFLICT (tool_type, rule_name) DO UPDATE SET
    validation_config = EXCLUDED.validation_config,
    error_message = EXCLUDED.error_message;

-- Insert migration record
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('04-admin-config', NOW())
ON CONFLICT (version) DO NOTHING;