-- Catalog Service Database Schema
-- Tool registry, categories, metadata, launch configurations, and access control

-- Tool categories
CREATE TABLE IF NOT EXISTS tool_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- Icon identifier
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Registered tools
CREATE TABLE IF NOT EXISTS tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category_id UUID REFERENCES tool_categories(id),
    
    -- Tool configuration
    base_url TEXT NOT NULL,
    icon_url TEXT,
    logo_url TEXT,
    documentation_url TEXT,
    support_url TEXT,
    
    -- Integration details
    integration_type VARCHAR(50) NOT NULL, -- 'oidc', 'oauth2', 'saml', 'api_key', 'custom'
    auth_config JSONB DEFAULT '{}', -- Auth-specific configuration
    auth_config_json JSONB DEFAULT '{}', -- For backward compatibility with services
    webhook_config_json JSONB DEFAULT '{}', -- Missing webhook configuration
    health_check_url TEXT,
    health_check_interval INTEGER DEFAULT 300, -- seconds
    health_check_config JSONB DEFAULT '{}', -- Health check configuration
    
    -- Access control
    requires_authentication BOOLEAN DEFAULT true,
    required_roles TEXT[] DEFAULT '{}',
    required_groups TEXT[] DEFAULT '{}',
    access_policy JSONB DEFAULT '{}',
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    configuration JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'maintenance', 'deprecated'
    
    -- Missing columns for service compatibility
    version VARCHAR(50), -- Tool version
    provider VARCHAR(100), -- Tool provider/vendor
    last_health_check TIMESTAMP WITH TIME ZONE, -- Last health check time
    health_status VARCHAR(20) DEFAULT 'unknown', -- Current health status
    supports_sso BOOLEAN DEFAULT true, -- REQUIRED by catalog service
    supports_scim BOOLEAN DEFAULT false, -- REQUIRED by catalog service
    supports_jit_provisioning BOOLEAN DEFAULT false, -- REQUIRED by catalog service  
    supports_api_access BOOLEAN DEFAULT true, -- REQUIRED by catalog service
    supports_webhooks BOOLEAN DEFAULT false, -- REQUIRED by catalog service
    supports_deep_links BOOLEAN DEFAULT false, -- REQUIRED by catalog service
    supports_user_provisioning BOOLEAN DEFAULT false, -- REQUIRED by catalog service
    supports_group_management BOOLEAN DEFAULT false, -- REQUIRED by catalog service
    supports_role_mapping BOOLEAN DEFAULT false, -- REQUIRED by catalog service
    supports_audit_logs BOOLEAN DEFAULT false, -- REQUIRED by catalog service
    supports_session_management BOOLEAN DEFAULT false, -- REQUIRED by catalog service
    supports_mfa_enforcement BOOLEAN DEFAULT false, -- REQUIRED by catalog service
    capability_details JSONB DEFAULT '{}', -- REQUIRED by catalog service
    environment VARCHAR(50) DEFAULT 'production', -- REQUIRED by analytics service
    tool_slug VARCHAR(50), -- Copy of slug for backwards compatibility
    
    -- Registration info
    registered_by UUID,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tool capabilities (what each tool can do)
CREATE TABLE IF NOT EXISTS tool_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    capability_type VARCHAR(100) NOT NULL, -- 'repository', 'build', 'deploy', 'monitor', etc.
    capability_name VARCHAR(100) NOT NULL,
    description TEXT,
    config_schema JSONB DEFAULT '{}', -- JSON schema for capability configuration
    is_enabled BOOLEAN DEFAULT true,
    
    -- Boolean capability flags expected by services (catalog/admin-config)
    supports_sso BOOLEAN DEFAULT false,
    supports_scim BOOLEAN DEFAULT false,
    supports_jit_provisioning BOOLEAN DEFAULT false,
    supports_api_access BOOLEAN DEFAULT false,
    supports_webhooks BOOLEAN DEFAULT false,
    supports_deep_links BOOLEAN DEFAULT false,
    supports_user_provisioning BOOLEAN DEFAULT false,
    supports_group_management BOOLEAN DEFAULT false,
    supports_role_mapping BOOLEAN DEFAULT false,
    supports_audit_logs BOOLEAN DEFAULT false,
    supports_session_management BOOLEAN DEFAULT false,
    supports_mfa_enforcement BOOLEAN DEFAULT false,
    capability_details JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tool_id, capability_type, capability_name)
);

-- Tool-specific launch configurations
CREATE TABLE IF NOT EXISTS tool_launch_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    tool_type VARCHAR(50) NOT NULL, -- github, gitlab, jenkins, etc.
    
    -- Launch URL configuration
    launch_url_pattern TEXT NOT NULL, -- Pattern for generating launch URLs
    launch_type VARCHAR(50) NOT NULL, -- 'direct', 'oauth_redirect', 'oidc_redirect', 'saml_redirect', 'seamless'
    
    -- Authentication flow configuration
    auth_flow_config JSONB DEFAULT '{}', -- Tool-specific auth flow parameters
    
    -- Deep-link capabilities
    supports_deep_links BOOLEAN DEFAULT false,
    deep_link_patterns JSONB DEFAULT '{}', -- Patterns for deep links (e.g., repo, project, etc.)
    
    -- Context parameters
    context_parameters JSONB DEFAULT '{}', -- Tool-specific context (org, workspace, project)
    
    -- Launch prerequisites
    prerequisites JSONB DEFAULT '{}', -- Required user roles, groups, or custom checks
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tool launch sessions (tracking user launches)
CREATE TABLE IF NOT EXISTS tool_launch_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    
    -- Launch details
    launch_type VARCHAR(50) NOT NULL,
    launch_url TEXT NOT NULL,
    target_url TEXT, -- Final destination URL
    
    -- Session tracking
    session_token VARCHAR(500),
    state_parameter VARCHAR(255), -- OAuth/OIDC state parameter
    
    -- Launch metadata
    context JSONB DEFAULT '{}', -- Launch context (deep link info, etc.)
    launch_context JSONB DEFAULT '{}', -- Launch context expected by catalog service
    user_agent TEXT,
    ip_address INET,
    
    -- Status
    status VARCHAR(20) DEFAULT 'initiated', -- 'initiated', 'completed', 'failed', 'expired'
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Tool access permissions (user-specific overrides)
CREATE TABLE IF NOT EXISTS tool_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    user_id UUID,
    access_type VARCHAR(20) NOT NULL, -- 'allow', 'deny'
    reason TEXT,
    granted_by UUID,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(tool_id, user_id)
);

-- Tool webhook configurations (referenced by catalog service)
CREATE TABLE IF NOT EXISTS tool_webhook_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    tool_type VARCHAR(50) NOT NULL,
    webhook_url TEXT NOT NULL,
    webhook_secret_key TEXT,
    
    -- Event configuration
    supported_events TEXT[] DEFAULT '{}',
    enabled_events TEXT[] DEFAULT '{}',
    
    -- Security and validation
    signature_validation JSONB DEFAULT '{}',
    processing_config JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_received_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tool usage tracking (referenced by catalog service)
CREATE TABLE IF NOT EXISTS tool_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    user_id UUID,
    
    -- Usage details
    action VARCHAR(100) NOT NULL, -- 'launch', 'api_call', 'webhook', etc.
    session_id VARCHAR(255),
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_path TEXT,
    request_method VARCHAR(10),
    
    -- Response details
    response_status INTEGER,
    response_time_ms INTEGER,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tools_slug ON tools(slug);
CREATE INDEX IF NOT EXISTS idx_tools_category_id ON tools(category_id);
CREATE INDEX IF NOT EXISTS idx_tools_active ON tools(is_active);
CREATE INDEX IF NOT EXISTS idx_tools_featured ON tools(is_featured);
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status);
CREATE INDEX IF NOT EXISTS idx_tools_tags ON tools USING gin(tags);

CREATE INDEX IF NOT EXISTS idx_tool_capabilities_tool_id ON tool_capabilities(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_capabilities_type ON tool_capabilities(capability_type);
CREATE INDEX IF NOT EXISTS idx_tool_capabilities_sso ON tool_capabilities(supports_sso);
CREATE INDEX IF NOT EXISTS idx_tool_capabilities_scim ON tool_capabilities(supports_scim);
CREATE INDEX IF NOT EXISTS idx_tool_capabilities_api ON tool_capabilities(supports_api_access);

CREATE INDEX IF NOT EXISTS idx_tool_launch_configs_tool_id ON tool_launch_configs(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_launch_configs_tool_type ON tool_launch_configs(tool_type);

CREATE INDEX IF NOT EXISTS idx_tool_launch_sessions_user_id ON tool_launch_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_launch_sessions_tool_id ON tool_launch_sessions(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_launch_sessions_status ON tool_launch_sessions(status);
CREATE INDEX IF NOT EXISTS idx_tool_launch_sessions_expires_at ON tool_launch_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_tool_access_tool_id ON tool_access(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_access_user_id ON tool_access(user_id);

CREATE INDEX IF NOT EXISTS idx_tool_webhook_configs_tool_id ON tool_webhook_configs(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_webhook_configs_tool_type ON tool_webhook_configs(tool_type);
CREATE INDEX IF NOT EXISTS idx_tool_webhook_configs_active ON tool_webhook_configs(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_id ON tool_usage(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_user_id ON tool_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_action ON tool_usage(action);
CREATE INDEX IF NOT EXISTS idx_tool_usage_created_at ON tool_usage(created_at);

-- Apply updated_at triggers
CREATE TRIGGER update_tool_categories_updated_at BEFORE UPDATE ON tool_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON tools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tool_launch_configs_updated_at BEFORE UPDATE ON tool_launch_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_tool_webhook_configs_updated_at BEFORE UPDATE ON tool_webhook_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert seed data for tool categories
INSERT INTO tool_categories (name, slug, description, icon, display_order) VALUES
    ('Version Control', 'version-control', 'Version control and source code management tools', 'git-branch', 1),
    ('CI/CD', 'cicd', 'Continuous Integration and Continuous Deployment tools', 'git-merge', 2),
    ('Infrastructure', 'infrastructure', 'Infrastructure as Code and cloud management', 'cloud', 3),
    ('Code Quality', 'code-quality', 'Code quality analysis and security scanning', 'shield-check', 4),
    ('Monitoring', 'monitoring', 'System monitoring, metrics, and alerting tools', 'activity', 5),
    ('Security', 'security', 'Security scanning and vulnerability management', 'shield', 6),
    ('Project Management', 'project-management', 'Project management and issue tracking', 'clipboard-list', 7),
    ('Service Management', 'service-management', 'IT service management and workflow automation', 'settings', 8)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    display_order = EXCLUDED.display_order;

-- Insert tool records for the 12 supported tools
DO $$
DECLARE
    vc_cat_id UUID;
    cicd_cat_id UUID;
    infra_cat_id UUID;
    quality_cat_id UUID;
    monitor_cat_id UUID;
    security_cat_id UUID;
    pm_cat_id UUID;
    sm_cat_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO vc_cat_id FROM tool_categories WHERE slug = 'version-control';
    SELECT id INTO cicd_cat_id FROM tool_categories WHERE slug = 'cicd';
    SELECT id INTO infra_cat_id FROM tool_categories WHERE slug = 'infrastructure';
    SELECT id INTO quality_cat_id FROM tool_categories WHERE slug = 'code-quality';
    SELECT id INTO monitor_cat_id FROM tool_categories WHERE slug = 'monitoring';
    SELECT id INTO security_cat_id FROM tool_categories WHERE slug = 'security';
    SELECT id INTO pm_cat_id FROM tool_categories WHERE slug = 'project-management';
    SELECT id INTO sm_cat_id FROM tool_categories WHERE slug = 'service-management';

    -- Insert tools
    INSERT INTO tools (name, slug, description, category_id, base_url, integration_type) VALUES
        ('GitHub', 'github', 'Version control and collaboration platform', vc_cat_id, 'https://github.com', 'oauth2'),
        ('GitLab', 'gitlab', 'DevOps platform with version control and CI/CD', vc_cat_id, 'http://localhost:8080', 'oidc'),
        ('Jenkins', 'jenkins', 'Automation server for CI/CD pipelines', cicd_cat_id, 'http://localhost:8080', 'oidc'),
        ('Argo CD', 'argocd', 'Declarative GitOps continuous delivery tool', cicd_cat_id, 'http://localhost:8080', 'oidc'),
        ('Terraform Cloud/Enterprise', 'terraform', 'Infrastructure as Code platform', infra_cat_id, 'https://app.terraform.io', 'oidc'),
        ('SonarQube', 'sonarqube', 'Code quality and security analysis', quality_cat_id, 'http://localhost:9000', 'oidc'),
        ('Grafana', 'grafana', 'Observability and monitoring platform', monitor_cat_id, 'http://localhost:3100', 'oauth2'),
        ('Prometheus', 'prometheus', 'Monitoring system and time series database', monitor_cat_id, 'http://localhost:9090', 'oidc'),
        ('Kibana', 'kibana', 'Data visualization and exploration for Elasticsearch', monitor_cat_id, 'http://localhost:5601', 'oidc'),
        ('Snyk', 'snyk', 'Security scanning and vulnerability management', security_cat_id, 'https://app.snyk.io', 'oidc'),
        ('Jira', 'jira', 'Project management and issue tracking', pm_cat_id, 'https://company.atlassian.net', 'saml'),
        ('ServiceNow', 'servicenow', 'IT service management platform', sm_cat_id, 'https://instance.service-now.com', 'saml')
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category_id = EXCLUDED.category_id,
        base_url = EXCLUDED.base_url,
        integration_type = EXCLUDED.integration_type;
END $$;

-- Insert tool launch configurations for each supported tool
INSERT INTO tool_launch_configs (tool_id, tool_type, launch_type, launch_url_pattern, supports_deep_links, deep_link_patterns, auth_flow_config)
SELECT 
  t.id, 
  'github',
  'oauth2',
  'https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope={scope}&state={state}',
  true,
  '{"repository": "/{org}/{repo}", "issue": "/{org}/{repo}/issues/{issue_id}", "pr": "/{org}/{repo}/pull/{pr_id}"}',
  '{"scopes": ["read:user", "user:email", "read:org", "repo", "admin:org_hook"], "redirect_uri": "{base_url}/auth/callback/github", "requires_org": true}'
FROM tools t 
WHERE t.slug = 'github'
  AND NOT EXISTS (SELECT 1 FROM tool_launch_configs tlc WHERE tlc.tool_id = t.id AND tlc.tool_type = 'github');

INSERT INTO tool_launch_configs (tool_id, tool_type, launch_type, launch_url_pattern, supports_deep_links, deep_link_patterns, auth_flow_config)
SELECT 
  t.id, 
  'gitlab',
  'oidc',
  '{base_url}/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope={scope}&state={state}',
  true,
  '{"project": "/{group}/{project}", "merge_request": "/{group}/{project}/-/merge_requests/{mr_id}", "issue": "/{group}/{project}/-/issues/{issue_id}"}',
  '{"scopes": ["openid", "read_user", "read_repository", "read_api", "read_registry"], "redirect_uri": "{base_url}/auth/callback/gitlab", "supports_groups": true}'
FROM tools t 
WHERE t.slug = 'gitlab'
  AND NOT EXISTS (SELECT 1 FROM tool_launch_configs tlc WHERE tlc.tool_id = t.id AND tlc.tool_type = 'gitlab');

INSERT INTO tool_launch_configs (tool_id, tool_type, launch_type, launch_url_pattern, supports_deep_links, deep_link_patterns, auth_flow_config)
SELECT 
  t.id, 
  'jenkins',
  'oidc',
  '{base_url}/login?from=%2F',
  true,
  '{"job": "/job/{job_name}", "build": "/job/{job_name}/{build_number}", "folder": "/job/{folder_name}"}',
  '{"scopes": ["openid", "email", "profile"], "redirect_uri": "{base_url}/securityRealm/finishLogin", "requires_oidc_plugin": true}'
FROM tools t 
WHERE t.slug = 'jenkins'
  AND NOT EXISTS (SELECT 1 FROM tool_launch_configs tlc WHERE tlc.tool_id = t.id AND tlc.tool_type = 'jenkins');

INSERT INTO tool_launch_configs (tool_id, tool_type, launch_type, launch_url_pattern, supports_deep_links, deep_link_patterns, auth_flow_config)
SELECT 
  t.id, 
  'argocd',
  'oidc',
  '{base_url}/auth/login?return_url={return_url}',
  true,
  '{"application": "/applications/{app_name}", "project": "/applications?proj={project_name}", "sync": "/applications/{app_name}?operation=sync"}',
  '{"scopes": ["openid", "profile", "email", "groups"], "redirect_uri": "{base_url}/auth/callback", "rbac_enabled": true}'
FROM tools t 
WHERE t.slug = 'argocd'
  AND NOT EXISTS (SELECT 1 FROM tool_launch_configs tlc WHERE tlc.tool_id = t.id AND tlc.tool_type = 'argocd');

INSERT INTO tool_launch_configs (tool_id, tool_type, launch_type, launch_url_pattern, supports_deep_links, deep_link_patterns, auth_flow_config)
SELECT 
  t.id, 
  'terraform',
  'oidc',
  '{base_url}/session',
  true,
  '{"workspace": "/app/{org_name}/workspaces/{workspace_name}", "run": "/app/{org_name}/workspaces/{workspace_name}/runs/{run_id}"}',
  '{"redirect_uri": "{base_url}/session/callback", "workspace_based": true, "organization_level": true}'
FROM tools t 
WHERE t.slug = 'terraform'
  AND NOT EXISTS (SELECT 1 FROM tool_launch_configs tlc WHERE tlc.tool_id = t.id AND tlc.tool_type = 'terraform');

INSERT INTO tool_launch_configs (tool_id, tool_type, launch_type, launch_url_pattern, supports_deep_links, deep_link_patterns, auth_flow_config)
SELECT 
  t.id, 
  'sonarqube',
  'oidc',
  '{base_url}/oauth2/authorization/oidc?redirect_uri={redirect_uri}&state={state}',
  true,
  '{"project": "/dashboard?id={project_key}", "issue": "/project/issues?id={project_key}&open={issue_key}", "security": "/security_hotspots?id={project_key}"}',
  '{"scopes": ["openid", "email", "profile"], "redirect_uri": "{base_url}/oauth2/callback/oidc", "project_level": true}'
FROM tools t 
WHERE t.slug = 'sonarqube'
  AND NOT EXISTS (SELECT 1 FROM tool_launch_configs tlc WHERE tlc.tool_id = t.id AND tlc.tool_type = 'sonarqube');

-- Grafana with seamless SSO and OAuth2 configuration (consolidated fixes)
INSERT INTO tool_launch_configs (tool_id, tool_type, launch_type, launch_url_pattern, supports_deep_links, deep_link_patterns, auth_flow_config)
SELECT 
  t.id, 
  'grafana',
  'seamless',
  'http://auth-proxy:3015/grafana/seamless?target={target_url}',
  true,
  '{"dashboard": "/d/{dashboard_uid}", "folder": "/dashboards/f/{folder_uid}", "explore": "/explore?orgId={org_id}&left={query}"}',
  '{"seamless_sso": true, "auth_proxy_enabled": true, "direct_access": true, "skip_oidc_redirect": true, "scopes": ["openid", "email", "profile", "offline_access"], "redirect_uri": "{base_url}/login/generic_oauth", "organization_based": true}'
FROM tools t 
WHERE t.slug = 'grafana'
  AND NOT EXISTS (SELECT 1 FROM tool_launch_configs tlc WHERE tlc.tool_id = t.id AND tlc.tool_type = 'grafana');

INSERT INTO tool_launch_configs (tool_id, tool_type, launch_type, launch_url_pattern, supports_deep_links, deep_link_patterns, auth_flow_config)
SELECT 
  t.id, 
  'prometheus',
  'proxy_auth',
  '{base_url}/graph?g0.expr={query}&g0.tab=1&g0.stacked=0&g0.range_input=1h',
  true,
  '{"query": "/graph?g0.expr={query}", "targets": "/targets", "alerts": "/alerts", "rules": "/rules"}',
  '{"proxy_authentication": true, "query_scopes": ["read", "write"], "requires_reverse_proxy": true}'
FROM tools t 
WHERE t.slug = 'prometheus'
  AND NOT EXISTS (SELECT 1 FROM tool_launch_configs tlc WHERE tlc.tool_id = t.id AND tlc.tool_type = 'prometheus');

INSERT INTO tool_launch_configs (tool_id, tool_type, launch_type, launch_url_pattern, supports_deep_links, deep_link_patterns, auth_flow_config)
SELECT 
  t.id, 
  'kibana',
  'oidc',
  '{base_url}/login?next=%2Fapp%2Fhome',
  true,
  '{"index": "/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(columns:!(_source),filters:!(),index:{index_pattern})", "dashboard": "/app/dashboards#/view/{dashboard_id}"}',
  '{"redirect_uri": "{base_url}/api/security/oidc/callback", "index_pattern_access": true, "space_based": true}'
FROM tools t 
WHERE t.slug = 'kibana'
  AND NOT EXISTS (SELECT 1 FROM tool_launch_configs tlc WHERE tlc.tool_id = t.id AND tlc.tool_type = 'kibana');

INSERT INTO tool_launch_configs (tool_id, tool_type, launch_type, launch_url_pattern, supports_deep_links, deep_link_patterns, auth_flow_config)
SELECT 
  t.id, 
  'snyk',
  'oidc',
  '{base_url}/oauth2/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope={scope}&state={state}',
  true,
  '{"project": "/org/{org_slug}/project/{project_id}", "vulnerability": "/org/{org_slug}/project/{project_id}/issue/{issue_id}", "org": "/org/{org_slug}"}',
  '{"scopes": ["openid", "email", "profile", "offline_access"], "redirect_uri": "{base_url}/oauth2/callback", "organization_based": true}'
FROM tools t 
WHERE t.slug = 'snyk'
  AND NOT EXISTS (SELECT 1 FROM tool_launch_configs tlc WHERE tlc.tool_id = t.id AND tlc.tool_type = 'snyk');

INSERT INTO tool_launch_configs (tool_id, tool_type, launch_type, launch_url_pattern, supports_deep_links, deep_link_patterns, auth_flow_config)
SELECT 
  t.id, 
  'jira',
  'saml',
  '{base_url}/login.jsp?os_destination=%2Fsecure%2FDashboard.jspa',
  true,
  '{"project": "/projects/{project_key}", "issue": "/browse/{issue_key}", "board": "/secure/RapidBoard.jspa?rapidView={board_id}"}',
  '{"redirect_uri": "{base_url}/plugins/servlet/saml/auth", "project_based": true, "issue_level_access": true}'
FROM tools t 
WHERE t.slug = 'jira'
  AND NOT EXISTS (SELECT 1 FROM tool_launch_configs tlc WHERE tlc.tool_id = t.id AND tlc.tool_type = 'jira');

INSERT INTO tool_launch_configs (tool_id, tool_type, launch_type, launch_url_pattern, supports_deep_links, deep_link_patterns, auth_flow_config)
SELECT 
  t.id, 
  'servicenow',
  'saml',
  '{base_url}/navpage.do',
  true,
  '{"incident": "/incident.do?sys_id={incident_id}", "request": "/com.glideapp.servicecatalog_cat_item_view.do?v=1&sysparm_id={catalog_item_id}", "change": "/change_request.do?sys_id={change_id}"}',
  '{"redirect_uri": "{base_url}/auth/saml/callback", "space_based": true, "role_based_access": true}'
FROM tools t 
WHERE t.slug = 'servicenow'
  AND NOT EXISTS (SELECT 1 FROM tool_launch_configs tlc WHERE tlc.tool_id = t.id AND tlc.tool_type = 'servicenow');

-- Update Grafana with consolidated configuration (merging all fixes)
UPDATE tools 
SET 
    base_url = 'http://localhost:3100',
    auth_config = jsonb_build_object(
        'client_id', 'grafana-client-oauth2',
        'client_secret', 'grafana-oauth-secret',
        'auth_url', 'http://localhost:8080/realms/sso-hub/protocol/openid-connect/auth',
        'token_url', 'http://localhost:8080/realms/sso-hub/protocol/openid-connect/token',
        'api_url', 'http://localhost:8080/realms/sso-hub/protocol/openid-connect/userinfo',
        'redirect_uri', 'http://localhost:3100/login/generic_oauth',
        'scopes', ARRAY['openid', 'email', 'profile', 'offline_access', 'roles'],
        'auto_login', true,
        'use_pkce', true,
        'use_refresh_token', true,
        'allow_sign_up', true,
        'name_attribute_path', 'name',
        'role_attribute_path', 'groups',
        'email_attribute_path', 'email',
        'login_attribute_path', 'preferred_username',
        'groups_attribute_path', 'groups',
        'signout_redirect_url', 'http://localhost:8080/realms/sso-hub/protocol/openid-connect/logout',
        'seamless_sso', true,
        'auth_proxy_enabled', true,
        'auth_proxy_url', 'http://auth-proxy:3015/grafana/seamless',
        'direct_access', true,
        'skip_oidc_redirect', true
    )
WHERE slug = 'grafana';

-- Add missing indexes for new tools table columns
CREATE INDEX IF NOT EXISTS idx_tools_auth_config_json ON tools USING gin(auth_config_json);
CREATE INDEX IF NOT EXISTS idx_tools_webhook_config_json ON tools USING gin(webhook_config_json);
CREATE INDEX IF NOT EXISTS idx_tools_health_status ON tools(health_status);
CREATE INDEX IF NOT EXISTS idx_tools_version ON tools(version);
CREATE INDEX IF NOT EXISTS idx_tools_supports_sso ON tools(supports_sso);
CREATE INDEX IF NOT EXISTS idx_tools_environment ON tools(environment);
CREATE INDEX IF NOT EXISTS idx_tools_tool_slug ON tools(tool_slug);

-- Update tools table with auth_config_json data from auth_config for backward compatibility
UPDATE tools 
SET auth_config_json = auth_config 
WHERE auth_config_json = '{}' AND auth_config != '{}';

-- Populate tool_slug column with data from slug column for service compatibility
UPDATE tools 
SET tool_slug = slug 
WHERE tool_slug IS NULL;

-- CRITICAL: Create capability records for all tools
-- The tool_capabilities table must have records for services to find tools
-- Each tool needs at least one capability record for the dashboard to display them

INSERT INTO tool_capabilities (tool_id, capability_type, capability_name, supports_sso, supports_api_access, supports_webhooks, supports_audit_logs, capability_details)
SELECT 
    id as tool_id,
    'authentication' as capability_type,
    'sso_integration' as capability_name,
    true as supports_sso,
    true as supports_api_access,
    true as supports_webhooks,
    true as supports_audit_logs,
    jsonb_build_object(
        'auto_generated', true,
        'created_by_migration', '03-catalog',
        'created_at', NOW(),
        'default_capabilities', true
    ) as capability_details
FROM tools
ON CONFLICT (tool_id, capability_type, capability_name) 
DO UPDATE SET
    supports_sso = EXCLUDED.supports_sso,
    supports_api_access = EXCLUDED.supports_api_access,
    supports_webhooks = EXCLUDED.supports_webhooks,
    supports_audit_logs = EXCLUDED.supports_audit_logs,
    capability_details = EXCLUDED.capability_details;

-- Add enterprise-specific capabilities for tools that typically support advanced features
INSERT INTO tool_capabilities (tool_id, capability_type, capability_name, supports_sso, supports_scim, supports_jit_provisioning, supports_user_provisioning, supports_group_management, capability_details)
SELECT 
    id as tool_id,
    'provisioning' as capability_type,
    'user_management' as capability_name,
    true as supports_sso,
    true as supports_scim,
    true as supports_jit_provisioning,
    true as supports_user_provisioning,
    true as supports_group_management,
    jsonb_build_object(
        'auto_generated', true,
        'enterprise_features', true,
        'created_by_migration', '03-catalog'
    ) as capability_details
FROM tools
WHERE slug IN ('github', 'gitlab', 'jira', 'servicenow')
ON CONFLICT (tool_id, capability_type, capability_name) 
DO UPDATE SET
    supports_sso = EXCLUDED.supports_sso,
    supports_scim = EXCLUDED.supports_scim,
    supports_jit_provisioning = EXCLUDED.supports_jit_provisioning,
    supports_user_provisioning = EXCLUDED.supports_user_provisioning,
    supports_group_management = EXCLUDED.supports_group_management;

-- Insert migration record
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('03-catalog', NOW())
ON CONFLICT (version) DO NOTHING;