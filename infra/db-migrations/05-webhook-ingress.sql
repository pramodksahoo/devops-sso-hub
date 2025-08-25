-- Webhook Ingress Service Database Schema
-- Webhook processing, delivery tracking, and event management
-- Note: tool_webhook_configs table is defined in 03-catalog.sql

-- Tool-specific webhook endpoints
CREATE TABLE IF NOT EXISTS tool_webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    endpoint_url TEXT NOT NULL,
    webhook_type VARCHAR(50) NOT NULL, -- 'push', 'pull_request', 'build', 'deployment', etc.
    tool_specific_config JSONB DEFAULT '{}',
    secret_token TEXT,
    signature_method VARCHAR(50) DEFAULT 'hmac-sha256',
    headers JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tool_id, webhook_type)
);

-- Webhook event types registry
CREATE TABLE IF NOT EXISTS webhook_event_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_slug VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_description TEXT,
    event_schema JSONB DEFAULT '{}',
    processing_rules JSONB DEFAULT '{}',
    notification_template JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tool_slug, event_type)
);

-- Webhook delivery tracking
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    webhook_endpoint_id UUID REFERENCES tool_webhook_endpoints(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255), -- Tool-specific event identifier
    
    -- Delivery status
    delivery_status VARCHAR(20) NOT NULL, -- 'pending', 'delivered', 'failed', 'retrying'
    http_status_code INTEGER,
    delivery_attempts INTEGER DEFAULT 0,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Request/Response data
    request_headers JSONB DEFAULT '{}',
    request_body JSONB DEFAULT '{}',
    response_headers JSONB DEFAULT '{}',
    response_body TEXT,
    error_message TEXT,
    
    -- Processing metadata
    processing_duration_ms INTEGER,
    processing_result VARCHAR(20) DEFAULT 'pending', -- 'success', 'failure', 'pending' (REQUIRED by services)
    retry_after TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- REQUIRED by tools-health and catalog services
    tool_slug VARCHAR(50), -- REQUIRED by webhook-ingress service for lookups
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook secrets management
CREATE TABLE IF NOT EXISTS webhook_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    secret_name VARCHAR(100) NOT NULL,
    secret_hash VARCHAR(255) NOT NULL, -- Hashed version
    algorithm VARCHAR(50) DEFAULT 'sha256',
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    UNIQUE(tool_id, secret_name)
);

-- Webhook notification rules
CREATE TABLE IF NOT EXISTS webhook_notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    event_types TEXT[] NOT NULL, -- Event type patterns to match
    
    -- Conditions
    conditions JSONB DEFAULT '{}', -- Additional matching conditions
    priority INTEGER DEFAULT 0,
    
    -- Actions
    notification_channels TEXT[] DEFAULT '{}', -- Which channels to notify
    notification_config JSONB DEFAULT '{}', -- Notification configuration
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- Notification deliveries (referenced by webhook-ingress service)
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_delivery_id UUID REFERENCES webhook_deliveries(id) ON DELETE CASCADE,
    notification_rule_id UUID REFERENCES webhook_notification_rules(id) ON DELETE CASCADE,
    
    -- Delivery details
    channel VARCHAR(50) NOT NULL, -- 'slack', 'email', 'webhook', 'sms'
    recipient VARCHAR(500) NOT NULL,
    
    -- Message content
    message_content JSONB DEFAULT '{}',
    
    -- Delivery status
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    error_message TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
-- tool_webhook_configs indexes are in 03-catalog.sql

CREATE INDEX IF NOT EXISTS idx_tool_webhook_endpoints_tool_id ON tool_webhook_endpoints(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_webhook_endpoints_type ON tool_webhook_endpoints(webhook_type);
CREATE INDEX IF NOT EXISTS idx_tool_webhook_endpoints_active ON tool_webhook_endpoints(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_webhook_event_types_tool_slug ON webhook_event_types(tool_slug);
CREATE INDEX IF NOT EXISTS idx_webhook_event_types_event_type ON webhook_event_types(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_event_types_enabled ON webhook_event_types(is_enabled) WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tool_id ON webhook_deliveries(tool_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(delivery_status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry_after ON webhook_deliveries(retry_after) WHERE retry_after IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_processing_result ON webhook_deliveries(processing_result);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_received_at ON webhook_deliveries(received_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tool_slug ON webhook_deliveries(tool_slug);

CREATE INDEX IF NOT EXISTS idx_webhook_secrets_tool_id ON webhook_secrets(tool_id);
CREATE INDEX IF NOT EXISTS idx_webhook_secrets_active ON webhook_secrets(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_webhook_notification_rules_tool_id ON webhook_notification_rules(tool_id);
CREATE INDEX IF NOT EXISTS idx_webhook_notification_rules_active ON webhook_notification_rules(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_webhook_delivery_id ON notification_deliveries(webhook_delivery_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_rule_id ON notification_deliveries(notification_rule_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON notification_deliveries(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_channel ON notification_deliveries(channel);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_created_at ON notification_deliveries(created_at);

-- Triggers for updated_at timestamps
-- tool_webhook_configs trigger is in 03-catalog.sql
    
CREATE TRIGGER update_tool_webhook_endpoints_updated_at BEFORE UPDATE ON tool_webhook_endpoints 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_webhook_notification_rules_updated_at BEFORE UPDATE ON webhook_notification_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed webhook event types for all supported tools
INSERT INTO webhook_event_types (tool_slug, event_type, event_description, event_schema, processing_rules) VALUES

-- GitHub events
('github', 'push', 'Code pushed to repository', 
 '{"repository": "string", "ref": "string", "commits": "array"}',
 '{"notify_channels": ["slack", "email"], "extract_fields": ["repository.name", "pusher.name"]}'),
('github', 'pull_request', 'Pull request created/updated', 
 '{"action": "string", "number": "integer", "pull_request": "object"}',
 '{"notify_channels": ["slack"], "filter_actions": ["opened", "closed", "merged"]}'),
('github', 'issues', 'Issue created/updated', 
 '{"action": "string", "number": "integer", "issue": "object"}',
 '{"notify_channels": ["slack"], "filter_actions": ["opened", "closed"]}'),

-- GitLab events
('gitlab', 'push', 'Code pushed to repository', 
 '{"project": "object", "ref": "string", "commits": "array"}',
 '{"notify_channels": ["slack", "email"], "extract_fields": ["project.name", "user_name"]}'),
('gitlab', 'merge_request', 'Merge request created/updated', 
 '{"object_kind": "string", "object_attributes": "object"}',
 '{"notify_channels": ["slack"], "filter_actions": ["open", "close", "merge"]}'),
('gitlab', 'pipeline', 'CI/CD pipeline status change', 
 '{"object_kind": "string", "object_attributes": "object"}',
 '{"notify_channels": ["slack"], "filter_status": ["success", "failed"]}'),

-- Jenkins events
('jenkins', 'build_started', 'Build job started', 
 '{"job": "string", "build": "object"}',
 '{"notify_channels": ["slack"], "extract_fields": ["job.name", "build.number"]}'),
('jenkins', 'build_completed', 'Build job completed', 
 '{"job": "string", "build": "object", "result": "string"}',
 '{"notify_channels": ["slack", "email"], "filter_results": ["SUCCESS", "FAILURE", "UNSTABLE"]}'),

-- Argo CD events
('argocd', 'app_sync', 'Application synchronization event', 
 '{"application": "string", "sync_status": "string"}',
 '{"notify_channels": ["slack"], "filter_status": ["Synced", "OutOfSync", "Failed"]}'),
('argocd', 'app_health', 'Application health status change', 
 '{"application": "string", "health_status": "string"}',
 '{"notify_channels": ["slack", "email"], "filter_status": ["Healthy", "Degraded", "Missing"]}'),

-- SonarQube events
('sonarqube', 'quality_gate', 'Quality gate status change', 
 '{"project": "string", "status": "string", "conditions": "array"}',
 '{"notify_channels": ["slack", "email"], "filter_status": ["ERROR", "OK"]}'),
('sonarqube', 'analysis_completed', 'Code analysis completed', 
 '{"project": "string", "branch": "string", "status": "string"}',
 '{"notify_channels": ["slack"], "extract_fields": ["project.name", "qualityGate.status"]}'),

-- Grafana events
('grafana', 'alert', 'Grafana alert triggered', 
 '{"title": "string", "state": "string", "message": "string"}',
 '{"notify_channels": ["slack", "email", "pagerduty"], "priority": "high"}'),
('grafana', 'dashboard_saved', 'Dashboard saved or updated', 
 '{"dashboard": "object", "user": "string"}',
 '{"notify_channels": ["slack"], "extract_fields": ["dashboard.title", "user"]}'),

-- Snyk events
('snyk', 'vulnerability_found', 'New vulnerability detected', 
 '{"project": "string", "vulnerability": "object", "severity": "string"}',
 '{"notify_channels": ["slack", "email"], "filter_severity": ["high", "critical"]}'),
('snyk', 'license_issue', 'License compliance issue', 
 '{"project": "string", "license": "object", "severity": "string"}',
 '{"notify_channels": ["slack"], "extract_fields": ["project.name", "license.id"]}'),

-- Jira events
('jira', 'issue_created', 'New issue created', 
 '{"issue": "object", "user": "object"}',
 '{"notify_channels": ["slack"], "extract_fields": ["issue.key", "issue.fields.summary"]}'),
('jira', 'issue_updated', 'Issue updated', 
 '{"issue": "object", "user": "object", "changelog": "object"}',
 '{"notify_channels": ["slack"], "filter_fields": ["status", "assignee"]}'),

-- ServiceNow events
('servicenow', 'incident_created', 'New incident created', 
 '{"incident": "object", "priority": "string"}',
 '{"notify_channels": ["slack", "email", "pagerduty"], "filter_priority": ["1", "2"]}'),
('servicenow', 'change_request', 'Change request created/updated', 
 '{"change": "object", "state": "string"}',
 '{"notify_channels": ["slack"], "filter_states": ["Approved", "Rejected", "Implemented"]}')

ON CONFLICT (tool_slug, event_type) DO UPDATE SET
    event_description = EXCLUDED.event_description,
    event_schema = EXCLUDED.event_schema,
    processing_rules = EXCLUDED.processing_rules;

-- Populate tool_slug column in webhook_deliveries with data from tools table
UPDATE webhook_deliveries 
SET tool_slug = (SELECT slug FROM tools WHERE tools.id = webhook_deliveries.tool_id)
WHERE tool_slug IS NULL;

-- Insert migration record
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('05-webhook-ingress', NOW())
ON CONFLICT (version) DO NOTHING;