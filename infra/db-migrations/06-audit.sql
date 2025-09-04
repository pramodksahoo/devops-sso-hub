-- Audit Service Database Schema  
-- Audit logging, security events, access tracking, and compliance monitoring

-- Main audit events table
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'access', 'config_change', 'security_violation'
    event_category VARCHAR(50) NOT NULL, -- 'authentication', 'configuration', 'integration', 'security', 'monitoring'
    event_severity VARCHAR(20) DEFAULT 'info', -- 'critical', 'error', 'warning', 'info', 'debug'
    
    -- Tool context
    tool_id VARCHAR(255),
    tool_slug VARCHAR(50),
    tool_name VARCHAR(255),
    tool_version VARCHAR(50),
    integration_type VARCHAR(50), -- 'sso', 'webhook', 'provisioning', 'health_check'
    webhook_event_type VARCHAR(100), -- Webhook event type (REQUIRED by audit service for webhook events)
    
    -- User context
    user_id VARCHAR(255),
    user_email VARCHAR(255),
    user_roles TEXT[] DEFAULT '{}',
    user_groups TEXT[] DEFAULT '{}',
    session_id VARCHAR(255),
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    action_result VARCHAR(20) NOT NULL, -- 'success', 'failure', 'partial', 'pending'
    action_details JSONB DEFAULT '{}',
    
    -- Request context
    request_id VARCHAR(255),
    source_ip INET,
    user_agent TEXT,
    request_headers JSONB DEFAULT '{}',
    request_payload JSONB DEFAULT '{}',
    
    -- Response context
    response_status INTEGER,
    response_headers JSONB DEFAULT '{}',
    response_payload JSONB DEFAULT '{}',
    processing_time_ms INTEGER,
    
    -- Error details
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Metadata
    tool_metadata JSONB DEFAULT '{}',
    integration_metadata JSONB DEFAULT '{}',
    security_context JSONB DEFAULT '{}',
    
    -- Resource information
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    resource_name VARCHAR(255),
    configuration_changes JSONB DEFAULT '{}',
    
    -- Workflow tracking
    correlation_id VARCHAR(255),
    workflow_id VARCHAR(255),
    
    -- Compliance and retention
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    audit_version INTEGER DEFAULT 1,
    audit_source VARCHAR(100) DEFAULT 'sso-hub',
    audit_tags TEXT[] DEFAULT '{}',
    retention_policy VARCHAR(50) DEFAULT 'standard'
);

-- Tool configuration audit trail
CREATE TABLE IF NOT EXISTS tool_config_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_type VARCHAR(50) NOT NULL,
    config_id UUID,
    
    -- Change details
    action VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete', 'activate', 'deactivate'
    field_name VARCHAR(255),
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    
    -- Actor information
    changed_by_user_id UUID,
    changed_by_username VARCHAR(255),
    changed_by_session_id VARCHAR(255),
    
    -- Request context
    request_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Change metadata
    change_metadata JSONB DEFAULT '{}',
    validation_results JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tool permission changes audit
CREATE TABLE IF NOT EXISTS tool_permission_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
    
    -- Permission change details
    action VARCHAR(20) NOT NULL, -- 'grant', 'revoke', 'modify'
    permission_type VARCHAR(50) NOT NULL, -- 'access', 'admin', 'readonly', 'custom'
    
    -- Subject of permission change
    subject_type VARCHAR(20) NOT NULL, -- 'user', 'group', 'role'
    subject_id VARCHAR(255) NOT NULL,
    subject_name VARCHAR(255),
    
    -- Permission details
    old_permissions JSONB DEFAULT '{}',
    new_permissions JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Actor information
    granted_by_user_id UUID,
    granted_by_username VARCHAR(255),
    reason TEXT,
    
    -- Request context
    request_id VARCHAR(255),
    ip_address INET,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tool health monitoring audit
CREATE TABLE IF NOT EXISTS tool_health_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    
    -- Health check details
    check_type VARCHAR(50) NOT NULL, -- 'automatic', 'manual', 'triggered'
    health_status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'unhealthy', 'unknown'
    previous_status VARCHAR(20),
    
    -- Check results
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    check_details JSONB DEFAULT '{}',
    
    -- Check context
    triggered_by VARCHAR(255),
    check_source VARCHAR(100), -- 'scheduled', 'api', 'webhook', 'manual'
    
    -- Timestamps
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security incident audit
CREATE TABLE IF NOT EXISTS security_incident_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_type VARCHAR(50) NOT NULL, -- 'failed_login', 'privilege_escalation', 'unauthorized_access'
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    
    -- Incident details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    detection_method VARCHAR(100), -- 'automated', 'manual', 'reported'
    
    -- Actor information (potential attacker/user)
    user_id UUID,
    username VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Target information
    target_type VARCHAR(50),
    target_id VARCHAR(255),
    target_resource TEXT,
    
    -- Incident data
    incident_data JSONB DEFAULT '{}',
    evidence JSONB DEFAULT '{}',
    
    -- Response information
    status VARCHAR(20) DEFAULT 'detected', -- 'detected', 'investigating', 'contained', 'resolved'
    assigned_to VARCHAR(255),
    resolution_notes TEXT,
    
    -- Timestamps
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance reporting data
CREATE TABLE IF NOT EXISTS compliance_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compliance_framework VARCHAR(50) NOT NULL, -- 'GDPR', 'SOX', 'HIPAA', 'ISO27001'
    audit_type VARCHAR(50) NOT NULL, -- 'access_review', 'data_retention', 'security_assessment'
    
    -- Audit scope
    scope_description TEXT,
    audit_criteria JSONB DEFAULT '{}',
    
    -- Results
    findings JSONB DEFAULT '{}',
    compliance_score DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
    
    -- Audit metadata
    auditor VARCHAR(255),
    audit_period_start TIMESTAMP WITH TIME ZONE,
    audit_period_end TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance and compliance queries
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_category ON audit_events(event_category);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_tool_slug ON audit_events(tool_slug);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_events_severity ON audit_events(event_severity);
CREATE INDEX IF NOT EXISTS idx_audit_events_source_ip ON audit_events(source_ip);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_events_action_result ON audit_events(action_result);
CREATE INDEX IF NOT EXISTS idx_audit_events_correlation_id ON audit_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_workflow_id ON audit_events(workflow_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_audit_tags ON audit_events USING gin(audit_tags);
CREATE INDEX IF NOT EXISTS idx_audit_events_webhook_event_type ON audit_events(webhook_event_type);

CREATE INDEX IF NOT EXISTS idx_tool_config_audit_tool_type ON tool_config_audit(tool_type);
CREATE INDEX IF NOT EXISTS idx_tool_config_audit_config_id ON tool_config_audit(config_id);
CREATE INDEX IF NOT EXISTS idx_tool_config_audit_user_id ON tool_config_audit(changed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_tool_config_audit_action ON tool_config_audit(action);
CREATE INDEX IF NOT EXISTS idx_tool_config_audit_created_at ON tool_config_audit(created_at);

CREATE INDEX IF NOT EXISTS idx_tool_permission_audit_tool_id ON tool_permission_audit(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_permission_audit_subject ON tool_permission_audit(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_tool_permission_audit_user_id ON tool_permission_audit(granted_by_user_id);
CREATE INDEX IF NOT EXISTS idx_tool_permission_audit_created_at ON tool_permission_audit(created_at);

CREATE INDEX IF NOT EXISTS idx_tool_health_audit_tool_id ON tool_health_audit(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_health_audit_status ON tool_health_audit(health_status);
CREATE INDEX IF NOT EXISTS idx_tool_health_audit_checked_at ON tool_health_audit(checked_at);

CREATE INDEX IF NOT EXISTS idx_security_incident_audit_type ON security_incident_audit(incident_type);
CREATE INDEX IF NOT EXISTS idx_security_incident_audit_severity ON security_incident_audit(severity);
CREATE INDEX IF NOT EXISTS idx_security_incident_audit_status ON security_incident_audit(status);
CREATE INDEX IF NOT EXISTS idx_security_incident_audit_user_id ON security_incident_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_security_incident_audit_ip ON security_incident_audit(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_incident_audit_detected_at ON security_incident_audit(detected_at);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_framework ON compliance_audit(compliance_framework);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_type ON compliance_audit(audit_type);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_status ON compliance_audit(status);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_created_at ON compliance_audit(created_at);

-- Integration workflows tracking (referenced by audit manager)
CREATE TABLE IF NOT EXISTS integration_workflows (
    workflow_id UUID PRIMARY KEY,
    workflow_type VARCHAR(100) NOT NULL,
    workflow_name VARCHAR(200) NOT NULL,
    workflow_description TEXT,
    
    -- User context
    user_id VARCHAR(255),
    user_email VARCHAR(255),
    session_id VARCHAR(255),
    
    -- Workflow details
    tools_involved TEXT[] DEFAULT '{}',
    workflow_start TIMESTAMP WITH TIME ZONE NOT NULL,
    workflow_end TIMESTAMP WITH TIME ZONE,
    workflow_duration_seconds INTEGER,
    workflow_status VARCHAR(20) NOT NULL, -- 'active', 'completed', 'failed', 'cancelled'
    
    -- Event tracking
    total_events INTEGER DEFAULT 0,
    successful_events INTEGER DEFAULT 0,
    failed_events INTEGER DEFAULT 0,
    
    -- Workflow metadata
    workflow_metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for integration_workflows
CREATE INDEX IF NOT EXISTS idx_integration_workflows_type ON integration_workflows(workflow_type);
CREATE INDEX IF NOT EXISTS idx_integration_workflows_user_id ON integration_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_workflows_status ON integration_workflows(workflow_status);
CREATE INDEX IF NOT EXISTS idx_integration_workflows_start ON integration_workflows(workflow_start);
CREATE INDEX IF NOT EXISTS idx_integration_workflows_session ON integration_workflows(session_id);

-- Data retention policies (for compliance)
CREATE TABLE IF NOT EXISTS audit_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name VARCHAR(100) UNIQUE NOT NULL,
    event_types TEXT[] NOT NULL,
    retention_days INTEGER NOT NULL,
    archive_after_days INTEGER,
    compliance_requirements TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO audit_retention_policies (policy_name, event_types, retention_days, archive_after_days, compliance_requirements) VALUES
    ('Standard', ARRAY['login', 'logout', 'access'], 365, 180, ARRAY['SOX', 'ISO27001']),
    ('Security', ARRAY['security_violation', 'privilege_escalation'], 2555, 365, ARRAY['SOX', 'ISO27001', 'GDPR']), -- 7 years
    ('Configuration', ARRAY['config_change', 'permission_change'], 1095, 365, ARRAY['SOX', 'ISO27001']), -- 3 years
    ('Compliance', ARRAY['compliance_audit', 'data_access'], 2555, 730, ARRAY['GDPR', 'HIPAA', 'SOX']) -- 7 years
ON CONFLICT (policy_name) DO NOTHING;

-- Insert migration record
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('06-audit', NOW())
ON CONFLICT (version) DO NOTHING;