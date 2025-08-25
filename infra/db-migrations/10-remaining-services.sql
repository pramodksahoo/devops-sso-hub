-- Remaining Services Database Schema
-- LDAP Sync, Policy, Notifier, and Auth-BFF services consolidated

-- ==============================================
-- LDAP SYNC SERVICE TABLES
-- ==============================================

-- LDAP server configurations
CREATE TABLE IF NOT EXISTS ldap_servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_name VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100), -- REQUIRED by ldap-sync service (alias for server_name)
    server_url TEXT NOT NULL,
    
    -- Authentication
    bind_dn VARCHAR(500),
    bind_password_encrypted TEXT,
    
    -- Connection settings
    use_tls BOOLEAN DEFAULT true,
    port INTEGER DEFAULT 389,
    timeout_seconds INTEGER DEFAULT 30,
    
    -- Directory structure
    base_dn VARCHAR(500) NOT NULL,
    user_search_base VARCHAR(500),
    group_search_base VARCHAR(500),
    
    -- LDAP schema mappings
    user_object_class VARCHAR(100) DEFAULT 'person',
    group_object_class VARCHAR(100) DEFAULT 'group',
    user_id_attribute VARCHAR(100) DEFAULT 'uid',
    user_email_attribute VARCHAR(100) DEFAULT 'mail',
    group_name_attribute VARCHAR(100) DEFAULT 'cn',
    
    -- Sync configuration
    sync_enabled BOOLEAN DEFAULT true,
    sync_interval_hours INTEGER DEFAULT 24,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LDAP users cache
CREATE TABLE IF NOT EXISTS ldap_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ldap_server_id UUID NOT NULL REFERENCES ldap_servers(id) ON DELETE CASCADE,
    ldap_dn VARCHAR(500) NOT NULL,
    
    -- User attributes
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    display_name VARCHAR(255),
    
    -- LDAP metadata
    object_classes TEXT[] DEFAULT '{}',
    attributes JSONB DEFAULT '{}',
    
    -- Sync tracking
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ldap_server_id, username)
);

-- LDAP tool configurations (missing table that ldap-sync service expects)
CREATE TABLE IF NOT EXISTS ldap_tool_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_slug VARCHAR(50) NOT NULL, -- Tool slug for identification (REQUIRED by ldap-sync service)
    ldap_server_id UUID NOT NULL REFERENCES ldap_servers(id) ON DELETE CASCADE,
    
    -- Synchronization configuration
    sync_enabled BOOLEAN DEFAULT true,
    sync_direction VARCHAR(20) DEFAULT 'both', -- 'inbound', 'outbound', 'both'
    sync_interval_minutes INTEGER DEFAULT 60,
    
    -- Mapping configuration
    user_attribute_mappings JSONB DEFAULT '{}', -- How to map LDAP attributes to tool users
    group_attribute_mappings JSONB DEFAULT '{}', -- How to map LDAP groups to tool roles
    
    -- Filter configuration
    user_filter TEXT, -- LDAP filter for users to sync
    group_filter TEXT, -- LDAP filter for groups to sync
    
    -- Tool-specific settings
    tool_specific_config JSONB DEFAULT '{}',
    provisioning_rules JSONB DEFAULT '{}',
    
    -- Status tracking
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_sync_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'success', 'failure'
    last_sync_error TEXT,
    
    -- Metadata
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    
    UNIQUE(tool_slug, ldap_server_id)
);

-- LDAP sync jobs (referenced by ldap-sync service)
CREATE TABLE IF NOT EXISTS ldap_sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ldap_tool_config_id UUID NOT NULL REFERENCES ldap_tool_configs(id) ON DELETE CASCADE,
    
    -- Job details
    job_type VARCHAR(50) NOT NULL, -- 'full_sync', 'incremental_sync', 'user_provision', 'user_deprovision'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    
    -- Progress tracking
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    successful_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- Results and errors
    result_summary JSONB DEFAULT '{}',
    error_details JSONB DEFAULT '{}',
    
    -- Metadata
    triggered_by VARCHAR(255),
    trigger_reason VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- POLICY SERVICE TABLES  
-- ==============================================

-- Access policies
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name VARCHAR(200) NOT NULL,
    policy_type VARCHAR(50) NOT NULL, -- 'access', 'data', 'operational', 'compliance'
    
    -- Policy definition
    policy_document JSONB NOT NULL, -- Full policy rules in JSON
    version VARCHAR(20) DEFAULT '1.0',
    
    -- Scope
    applies_to_tools TEXT[] DEFAULT '{}', -- Tool types this applies to
    applies_to_users TEXT[] DEFAULT '{}', -- User groups/roles
    applies_to_environments TEXT[] DEFAULT ARRAY['production'],
    
    -- Policy settings
    enforcement_mode VARCHAR(20) DEFAULT 'enforce', -- 'monitor', 'warn', 'enforce'
    priority INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiration_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Audit
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policy rules (referenced by policy service)
CREATE TABLE IF NOT EXISTS policy_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    rule_name VARCHAR(200) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'access_control', 'data_protection', 'compliance'
    rule_definition JSONB NOT NULL,
    rule_conditions JSONB DEFAULT '{}',
    rule_actions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policy enforcement results (referenced by policy service)
CREATE TABLE IF NOT EXISTS policy_enforcement_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES policy_rules(id) ON DELETE CASCADE,
    
    -- Enforcement context
    user_id UUID,
    tool_id UUID REFERENCES tools(id),
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    
    -- Enforcement result
    enforcement_action VARCHAR(50) NOT NULL, -- 'allow', 'deny', 'warn', 'audit'
    enforcement_result VARCHAR(20) NOT NULL, -- 'success', 'failure', 'partial'
    enforcement_details JSONB DEFAULT '{}',
    
    -- Timing
    processing_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance rules (referenced by policy service)
CREATE TABLE IF NOT EXISTS compliance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(200) NOT NULL,
    compliance_framework VARCHAR(50) NOT NULL, -- 'GDPR', 'SOX', 'HIPAA', 'ISO27001'
    rule_category VARCHAR(100) NOT NULL,
    rule_description TEXT,
    rule_definition JSONB NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    remediation_guidance TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance assessments (referenced by policy service)
CREATE TABLE IF NOT EXISTS compliance_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_name VARCHAR(200) NOT NULL,
    compliance_framework VARCHAR(50) NOT NULL,
    assessment_scope JSONB DEFAULT '{}',
    
    -- Assessment results
    status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
    overall_score DECIMAL(5,2),
    assessment_results JSONB DEFAULT '{}',
    findings JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '{}',
    
    -- Assessment metadata
    assessed_by VARCHAR(255),
    assessment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policy violations tracking
CREATE TABLE IF NOT EXISTS policy_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    
    -- Violation details
    violation_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    
    -- Subject of violation
    user_id UUID,
    tool_id UUID REFERENCES tools(id),
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    
    -- Violation context
    violation_data JSONB DEFAULT '{}',
    context JSONB DEFAULT '{}',
    
    -- Resolution
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'acknowledged', 'resolved', 'false_positive'
    resolution_notes TEXT,
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tool policy configurations (missing table that policy service expects)
CREATE TABLE IF NOT EXISTS tool_policy_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_slug VARCHAR(50) NOT NULL, -- Tool slug for identification (REQUIRED by policy service)
    config_type VARCHAR(50) NOT NULL, -- 'access_control', 'data_protection', 'compliance'
    
    -- Configuration data
    configuration JSONB NOT NULL DEFAULT '{}',
    policy_rules JSONB DEFAULT '{}',
    enforcement_settings JSONB DEFAULT '{}',
    
    -- Status and metadata
    enabled BOOLEAN DEFAULT true,
    version VARCHAR(20) DEFAULT '1.0',
    description TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    
    UNIQUE(tool_slug, config_type)
);

-- ==============================================
-- NOTIFIER SERVICE TABLES
-- ==============================================

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(200) NOT NULL,
    template_type VARCHAR(50) NOT NULL, -- 'email', 'slack', 'webhook', 'sms'
    
    -- Template content
    subject_template TEXT,
    body_template TEXT NOT NULL,
    template_variables JSONB DEFAULT '{}',
    
    -- Template settings
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    category VARCHAR(100), -- 'security', 'system', 'user_action', 'compliance'
    
    -- Configuration
    channel_config JSONB DEFAULT '{}', -- Channel-specific configuration
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    enabled BOOLEAN DEFAULT true, -- REQUIRED by notifier service (alias for is_active)
    
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification channels
CREATE TABLE IF NOT EXISTS notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_name VARCHAR(200) NOT NULL,
    channel_type VARCHAR(50) NOT NULL, -- 'email', 'slack', 'webhook', 'sms'
    
    -- Channel configuration
    configuration JSONB NOT NULL,
    credentials_encrypted JSONB DEFAULT '{}',
    
    -- Channel settings
    rate_limit_per_hour INTEGER DEFAULT 100,
    is_default BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification queue
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES notification_templates(id),
    channel_id UUID NOT NULL REFERENCES notification_channels(id),
    
    -- Message content
    recipient VARCHAR(500) NOT NULL,
    subject TEXT,
    message_body TEXT NOT NULL,
    
    -- Message data
    template_data JSONB DEFAULT '{}',
    
    -- Delivery settings
    priority VARCHAR(20) DEFAULT 'normal',
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'queued', -- 'queued', 'sending', 'sent', 'failed', 'cancelled'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Results
    delivery_status JSONB DEFAULT '{}',
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Notifications table (missing table that notifier service expects)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255), -- External system notification ID
    type VARCHAR(50) NOT NULL, -- 'info', 'warning', 'error', 'success'
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    
    -- Content
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    html_message TEXT,
    
    -- Recipients and channels
    recipients JSONB NOT NULL DEFAULT '[]', -- Array of recipients
    channels TEXT[] DEFAULT '{}', -- Notification channels to use
    
    -- Template information
    template_id UUID REFERENCES notification_templates(id),
    
    -- Metadata and context
    metadata JSONB DEFAULT '{}', -- Additional notification metadata
    source_service VARCHAR(100), -- Service that created the notification (REQUIRED by notifier service)
    source_tool VARCHAR(50), -- Tool that triggered the notification
    user_id UUID, -- User associated with the notification
    
    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Status and delivery tracking
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'cancelled'
    max_retries INTEGER DEFAULT 3,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- ==============================================
-- AUTH-BFF SERVICE TABLES
-- ==============================================
-- Note: cross_tool_workflows table is defined in 07-analytics.sql
-- Note: integration_workflows table is defined in 06-audit.sql
-- Auth-BFF service references tables from other services for workflow management

-- ==============================================
-- INDEXES FOR ALL SERVICES
-- ==============================================

-- LDAP Sync indexes
CREATE INDEX IF NOT EXISTS idx_ldap_servers_active ON ldap_servers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ldap_servers_name ON ldap_servers(name);
CREATE INDEX IF NOT EXISTS idx_ldap_users_server_id ON ldap_users(ldap_server_id);
CREATE INDEX IF NOT EXISTS idx_ldap_users_username ON ldap_users(username);
CREATE INDEX IF NOT EXISTS idx_ldap_tool_configs_tool_slug ON ldap_tool_configs(tool_slug);
CREATE INDEX IF NOT EXISTS idx_ldap_tool_configs_server_id ON ldap_tool_configs(ldap_server_id);
CREATE INDEX IF NOT EXISTS idx_ldap_tool_configs_enabled ON ldap_tool_configs(sync_enabled) WHERE sync_enabled = true;
CREATE INDEX IF NOT EXISTS idx_ldap_sync_jobs_config_id ON ldap_sync_jobs(ldap_tool_config_id);
CREATE INDEX IF NOT EXISTS idx_ldap_sync_jobs_status ON ldap_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ldap_sync_jobs_started_at ON ldap_sync_jobs(started_at);

-- Policy indexes
CREATE INDEX IF NOT EXISTS idx_policies_active ON policies(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_policies_type ON policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_policy_violations_policy_id ON policy_violations(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_violations_status ON policy_violations(status);
CREATE INDEX IF NOT EXISTS idx_policy_violations_user_id ON policy_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_policy_configs_tool_slug ON tool_policy_configs(tool_slug);
CREATE INDEX IF NOT EXISTS idx_tool_policy_configs_enabled ON tool_policy_configs(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_tool_policy_configs_config_type ON tool_policy_configs(config_type);

-- Notifier indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notification_channels_type ON notification_channels(channel_type);
CREATE INDEX IF NOT EXISTS idx_notification_channels_active ON notification_channels(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_source_service ON notifications(source_service);
CREATE INDEX IF NOT EXISTS idx_notifications_source_tool ON notifications(source_tool);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at ON notifications(scheduled_at);

-- Policy service additional indexes
CREATE INDEX IF NOT EXISTS idx_policy_rules_policy_id ON policy_rules(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_rules_type ON policy_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_policy_rules_active ON policy_rules(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_policy_enforcement_policy_id ON policy_enforcement_results(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_enforcement_user_id ON policy_enforcement_results(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_enforcement_action ON policy_enforcement_results(enforcement_action);
CREATE INDEX IF NOT EXISTS idx_policy_enforcement_created_at ON policy_enforcement_results(created_at);

CREATE INDEX IF NOT EXISTS idx_compliance_rules_framework ON compliance_rules(compliance_framework);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_category ON compliance_rules(rule_category);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_active ON compliance_rules(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_compliance_assessments_framework ON compliance_assessments(compliance_framework);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_status ON compliance_assessments(status);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_date ON compliance_assessments(assessment_date);

-- Auth-BFF indexes (cross_tool_workflows and integration_workflows are in other services)
-- cross_tool_workflows indexes are in 07-analytics.sql
-- integration_workflows indexes are in 06-audit.sql

-- ==============================================
-- TRIGGERS
-- ==============================================

CREATE TRIGGER update_ldap_servers_updated_at BEFORE UPDATE ON ldap_servers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_ldap_tool_configs_updated_at BEFORE UPDATE ON ldap_tool_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_tool_policy_configs_updated_at BEFORE UPDATE ON tool_policy_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_notification_channels_updated_at BEFORE UPDATE ON notification_channels 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
-- cross_tool_workflows trigger is already created in 07-analytics.sql
    
CREATE TRIGGER update_policy_rules_updated_at BEFORE UPDATE ON policy_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_compliance_rules_updated_at BEFORE UPDATE ON compliance_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_compliance_assessments_updated_at BEFORE UPDATE ON compliance_assessments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- cross_tool_workflows and integration_workflows triggers are in other services

-- Populate name column in ldap_servers with data from server_name column
UPDATE ldap_servers 
SET name = server_name 
WHERE name IS NULL;

-- Populate enabled column in notification_templates with data from is_active column
UPDATE notification_templates 
SET enabled = is_active 
WHERE enabled IS NULL;

-- Insert migration record
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('10-remaining-services', NOW())
ON CONFLICT (version) DO NOTHING;