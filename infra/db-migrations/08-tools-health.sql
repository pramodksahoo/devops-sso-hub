-- Tools Health Service Database Schema
-- Health monitoring, performance tracking, and status management

-- Service health monitoring
CREATE TABLE IF NOT EXISTS service_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    health_status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'unhealthy', 'unknown'
    status VARCHAR(20) DEFAULT 'unknown', -- REQUIRED by tools-health service (alias for health_status)
    
    -- Connection details (missing columns that services expect)
    host VARCHAR(255) NOT NULL DEFAULT 'localhost',
    port INTEGER NOT NULL DEFAULT 8080,
    environment VARCHAR(50) DEFAULT 'production', -- REQUIRED by tools-health service
    
    -- Health metrics
    response_time_ms INTEGER,
    cpu_usage_percent DECIMAL(5,2),
    memory_usage_percent DECIMAL(5,2),
    disk_usage_percent DECIMAL(5,2),
    
    -- Check details (missing columns that services expect)
    health_endpoint TEXT DEFAULT '/health',
    health_check_url TEXT,
    last_check_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_healthy_at TIMESTAMP WITH TIME ZONE, -- REQUIRED by tools-health service
    check_interval_seconds INTEGER DEFAULT 60,
    timeout_seconds INTEGER DEFAULT 30,
    failure_threshold INTEGER DEFAULT 3,
    success_threshold INTEGER DEFAULT 1,
    consecutive_failures INTEGER DEFAULT 0, -- REQUIRED by tools-health service
    consecutive_successes INTEGER DEFAULT 0, -- REQUIRED by tools-health service
    
    -- Status details
    error_message TEXT,
    details JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- REQUIRED by tools-health service
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tool integration health
CREATE TABLE IF NOT EXISTS integration_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    tool_slug VARCHAR(50), -- REQUIRED by tools-health service for queries
    integration_type VARCHAR(50) NOT NULL,
    
    -- Health status
    status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'unhealthy', 'unknown'
    previous_status VARCHAR(20),
    status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Performance metrics
    response_time_ms INTEGER,
    success_rate_percent DECIMAL(5,2),
    error_rate_percent DECIMAL(5,2),
    
    -- Missing columns that services expect
    last_healthy_at TIMESTAMP WITH TIME ZONE, -- CRITICAL: REQUIRED by tools-health service
    environment VARCHAR(50) DEFAULT 'production', -- REQUIRED by tools-health service
    auth_status VARCHAR(20) DEFAULT 'unknown', -- REQUIRED by tools-health service
    
    -- Check configuration
    health_check_url TEXT,
    check_method VARCHAR(10) DEFAULT 'GET',
    expected_status_codes INTEGER[] DEFAULT ARRAY[200],
    timeout_seconds INTEGER DEFAULT 30,
    
    -- Status tracking
    consecutive_failures INTEGER DEFAULT 0,
    consecutive_successes INTEGER DEFAULT 0,
    last_success_at TIMESTAMP WITH TIME ZONE,
    last_failure_at TIMESTAMP WITH TIME ZONE,
    last_check_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Error tracking
    last_error_message TEXT,
    error_details JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tool_id, integration_type)
);

-- Performance metrics history (defined in 07-analytics.sql)
-- integration_performance_metrics table is owned by analytics service

-- Health alerts configuration
CREATE TABLE IF NOT EXISTS health_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_name VARCHAR(200) NOT NULL,
    tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
    
    -- Alert conditions
    metric_name VARCHAR(100) NOT NULL,
    condition_type VARCHAR(20) NOT NULL, -- 'threshold', 'trend', 'anomaly'
    condition_config JSONB NOT NULL,
    
    -- Alert settings
    severity VARCHAR(20) DEFAULT 'warning', -- 'info', 'warning', 'error', 'critical'
    is_enabled BOOLEAN DEFAULT true,
    
    -- Notification settings
    notification_channels TEXT[] DEFAULT ARRAY['email'],
    escalation_rules JSONB DEFAULT '{}',
    
    -- State tracking
    is_firing BOOLEAN DEFAULT false,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(255),
    
    -- Metadata
    description TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health metrics aggregation
CREATE TABLE IF NOT EXISTS health_metrics_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
    service_name VARCHAR(100),
    
    -- Time period
    period_type VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly'
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Aggregated metrics
    avg_response_time_ms DECIMAL(10,2),
    max_response_time_ms INTEGER,
    min_response_time_ms INTEGER,
    success_rate_percent DECIMAL(5,2),
    total_requests INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    uptime_percent DECIMAL(5,2),
    
    -- Status distribution
    healthy_minutes INTEGER DEFAULT 0,
    degraded_minutes INTEGER DEFAULT 0,
    unhealthy_minutes INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tool_id, service_name, period_type, period_start)
);

-- Service dependencies mapping
CREATE TABLE IF NOT EXISTS service_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_service VARCHAR(100) NOT NULL, -- Updated column name
    target_service VARCHAR(100), -- Updated column name
    target_tool_slug VARCHAR(50), -- Missing column that services expect
    dependency_type VARCHAR(50) DEFAULT 'hard', -- 'hard', 'soft', 'optional'
    
    -- Dependency configuration
    health_impact_weight DECIMAL(3,2) DEFAULT 1.0, -- How much this dependency affects overall health
    check_dependency BOOLEAN DEFAULT true,
    is_critical BOOLEAN DEFAULT false, -- Missing column
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'unknown', -- Renamed from dependency_status
    response_time_ms INTEGER, -- Missing column
    failure_count INTEGER DEFAULT 0, -- Missing column
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Missing columns that services expect
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(source_service, target_service, target_tool_slug)
);

-- Cascade failure tracking
CREATE TABLE IF NOT EXISTS cascade_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id VARCHAR(255), -- REQUIRED by tools-health service
    root_cause_service VARCHAR(100) NOT NULL,
    root_cause_tool_slug VARCHAR(50), -- REQUIRED by tools-health service
    affected_services TEXT[] NOT NULL,
    affected_tools TEXT[], -- REQUIRED by tools-health service
    
    -- Failure details
    failure_type VARCHAR(50) NOT NULL, -- 'timeout', 'connection_refused', 'service_unavailable'
    failure_pattern VARCHAR(100), -- REQUIRED by tools-health service
    propagation_path JSONB NOT NULL, -- How the failure propagated
    
    -- Timeline
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Impact assessment
    severity VARCHAR(20) DEFAULT 'medium',
    user_impact VARCHAR(100), -- REQUIRED by tools-health service
    affected_users_count INTEGER DEFAULT 0,
    business_impact TEXT,
    
    -- Resolution tracking
    resolution_status VARCHAR(20) DEFAULT 'ongoing', -- REQUIRED by tools-health service: 'ongoing', 'resolved'
    resolution_steps TEXT[],
    lessons_learned TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- REQUIRED by tools-health service
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance monitoring
CREATE INDEX IF NOT EXISTS idx_service_health_service_name ON service_health(service_name);
CREATE INDEX IF NOT EXISTS idx_service_health_status ON service_health(health_status);
CREATE INDEX IF NOT EXISTS idx_service_health_last_check ON service_health(last_check_at);

CREATE INDEX IF NOT EXISTS idx_integration_health_tool_id ON integration_health(tool_id);
CREATE INDEX IF NOT EXISTS idx_integration_health_tool_slug ON integration_health(tool_slug);
CREATE INDEX IF NOT EXISTS idx_integration_health_status ON integration_health(status);
CREATE INDEX IF NOT EXISTS idx_integration_health_last_check ON integration_health(last_check_at);

-- integration_performance_metrics indexes are in 07-analytics.sql

CREATE INDEX IF NOT EXISTS idx_health_alerts_tool_id ON health_alerts(tool_id);
CREATE INDEX IF NOT EXISTS idx_health_alerts_enabled ON health_alerts(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_health_alerts_firing ON health_alerts(is_firing) WHERE is_firing = true;

CREATE INDEX IF NOT EXISTS idx_health_metrics_history_tool_id ON health_metrics_history(tool_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_history_period ON health_metrics_history(period_type, period_start);

CREATE INDEX IF NOT EXISTS idx_service_dependencies_source ON service_dependencies(source_service);
CREATE INDEX IF NOT EXISTS idx_service_dependencies_target ON service_dependencies(target_service, target_tool_slug);
CREATE INDEX IF NOT EXISTS idx_service_dependencies_status ON service_dependencies(status, last_checked_at);

CREATE INDEX IF NOT EXISTS idx_cascade_failures_root_cause ON cascade_failures(root_cause_service);
CREATE INDEX IF NOT EXISTS idx_cascade_failures_started_at ON cascade_failures(started_at);
CREATE INDEX IF NOT EXISTS idx_cascade_failures_incident_id ON cascade_failures(incident_id);

-- Triggers
CREATE TRIGGER update_health_alerts_updated_at BEFORE UPDATE ON health_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default service dependencies
INSERT INTO service_dependencies (source_service, target_service, dependency_type, is_critical, description) VALUES
    ('admin-config', 'postgres', 'hard', true, 'Database connectivity'),
    ('admin-config', 'redis', 'hard', true, 'Cache and session storage'),
    ('admin-config', 'keycloak', 'hard', true, 'Authentication and authorization'),
    ('auth-bff', 'keycloak', 'hard', true, 'SSO authentication'),
    ('auth-bff', 'redis', 'soft', false, 'Session caching'),
    ('catalog', 'postgres', 'hard', true, 'Tools catalog storage'),
    ('webhook-ingress', 'postgres', 'hard', true, 'Webhook event storage'),
    ('webhook-ingress', 'redis', 'soft', false, 'Event caching'),
    ('audit', 'postgres', 'hard', true, 'Audit log storage'),
    ('analytics', 'postgres', 'hard', true, 'Analytics data storage'),
    ('notifier', 'postgres', 'soft', false, 'Notification storage'),
    ('notifier', 'redis', 'hard', true, 'Queue management'),
    ('policy', 'postgres', 'hard', true, 'Policy data storage'),
    ('provisioning', 'postgres', 'hard', true, 'Provisioning data storage'),
    ('ldap-sync', 'postgres', 'hard', true, 'LDAP sync data storage')
ON CONFLICT (source_service, target_service, target_tool_slug) DO NOTHING;

-- Populate tool_slug column in integration_health with data from tools table
UPDATE integration_health 
SET tool_slug = (SELECT slug FROM tools WHERE tools.id = integration_health.tool_id)
WHERE tool_slug IS NULL;

-- Insert migration record
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('08-tools-health', NOW())
ON CONFLICT (version) DO NOTHING;