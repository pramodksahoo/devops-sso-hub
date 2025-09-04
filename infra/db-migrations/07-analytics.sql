-- Analytics Service Database Schema
-- Usage analytics, reporting, metrics collection, and business intelligence

-- Tool usage analytics
CREATE TABLE IF NOT EXISTS tool_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    tool_slug VARCHAR(50), -- For service compatibility
    user_id UUID,
    
    -- Usage metrics
    session_id VARCHAR(255),
    action VARCHAR(100) NOT NULL, -- 'login', 'api_call', 'feature_usage', 'export', 'config_change'
    feature_name VARCHAR(100),
    
    -- User context (missing columns)
    user_role VARCHAR(50),
    user_roles TEXT[] DEFAULT '{}', -- Array of user roles (required by analytics service)
    user_department VARCHAR(100),
    user_email VARCHAR(255),
    username VARCHAR(255),
    
    -- Workflow tracking (missing columns)
    workflow_id VARCHAR(255),
    correlation_id VARCHAR(255),
    parent_session_id VARCHAR(255),
    workflow_step VARCHAR(100),
    
    -- Timing data
    duration_seconds INTEGER,
    response_time_ms INTEGER,
    session_start_time TIMESTAMP WITH TIME ZONE,
    session_end_time TIMESTAMP WITH TIME ZONE,
    
    -- Context data
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    
    -- Additional context (missing columns)
    request_method VARCHAR(10),
    response_status INTEGER,
    error_code VARCHAR(50),
    error_message TEXT,
    resource_accessed TEXT,
    
    -- Usage metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Performance metrics (missing columns)
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    
    -- Aggregation helpers
    date_key DATE GENERATED ALWAYS AS ((created_at AT TIME ZONE 'UTC')::DATE) STORED,
    hour_key INTEGER GENERATED ALWAYS AS (EXTRACT(hour FROM (created_at AT TIME ZONE 'UTC'))) STORED,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tool usage patterns (aggregated data)
CREATE TABLE IF NOT EXISTS tool_usage_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    tool_slug VARCHAR(50), -- For service compatibility
    
    -- Pattern identification
    pattern_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'peak_hours', 'user_journey'
    pattern_name VARCHAR(100) NOT NULL,
    
    -- Time period
    time_period VARCHAR(50) NOT NULL, -- '1h', '1d', '1w', '1m'
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Metrics
    total_sessions INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    total_actions INTEGER DEFAULT 0,
    average_session_duration_seconds INTEGER DEFAULT 0,
    
    -- Missing columns for enhanced analytics
    peak_concurrent_users INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    average_response_time_ms DECIMAL(10,2),
    feature_usage_breakdown JSONB DEFAULT '{}',
    
    -- Pattern data
    pattern_data JSONB DEFAULT '{}',
    insights JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tool_id, pattern_type, period_start, period_end)
);

-- Analytics configuration for tools
CREATE TABLE IF NOT EXISTS tool_analytics_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    
    -- Tracking configuration
    tracking_enabled BOOLEAN DEFAULT true,
    events_to_track TEXT[] DEFAULT ARRAY['login', 'logout', 'api_call'],
    custom_events JSONB DEFAULT '{}',
    
    -- Reporting configuration
    reports_enabled BOOLEAN DEFAULT true,
    report_frequency VARCHAR(20) DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
    retention_days INTEGER DEFAULT 365,
    
    -- Privacy settings
    anonymize_ip BOOLEAN DEFAULT false,
    track_user_agents BOOLEAN DEFAULT true,
    gdpr_compliant BOOLEAN DEFAULT true,
    
    -- Custom metrics
    custom_metrics JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tool_id)
);

-- Custom reports configuration
CREATE TABLE IF NOT EXISTS custom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_name VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- 'usage', 'security', 'performance', 'compliance'
    
    -- Report scope
    tool_ids UUID[] DEFAULT '{}',
    user_filter JSONB DEFAULT '{}',
    date_range_type VARCHAR(50) DEFAULT 'last_30_days',
    
    -- Report configuration
    metrics TEXT[] NOT NULL,
    grouping TEXT[] DEFAULT '{}',
    filters JSONB DEFAULT '{}',
    
    -- Output configuration
    format VARCHAR(20) DEFAULT 'json', -- 'json', 'csv', 'pdf'
    delivery_method VARCHAR(20) DEFAULT 'download', -- 'download', 'email', 'webhook'
    delivery_config JSONB DEFAULT '{}',
    
    -- Scheduling
    is_scheduled BOOLEAN DEFAULT false,
    schedule_expression VARCHAR(100), -- Cron expression
    next_execution TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_by VARCHAR(255) NOT NULL,
    is_public BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report execution history
CREATE TABLE IF NOT EXISTS report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
    
    -- Execution details
    execution_type VARCHAR(20) NOT NULL, -- 'manual', 'scheduled'
    status VARCHAR(20) NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
    
    -- Results
    result_data JSONB DEFAULT '{}',
    result_file_path TEXT,
    result_size_bytes BIGINT,
    row_count INTEGER,
    
    -- Performance metrics
    execution_duration_ms INTEGER,
    query_duration_ms INTEGER,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB DEFAULT '{}',
    
    -- Execution context
    executed_by VARCHAR(255),
    execution_parameters JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Integration performance metrics (referenced by analytics service)
CREATE TABLE IF NOT EXISTS integration_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    tool_slug VARCHAR(50), -- For service compatibility
    
    -- Metric details
    metric_name VARCHAR(100) NOT NULL, -- 'response_time', 'throughput', 'error_rate'
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20) NOT NULL, -- 'ms', 'rps', 'percent', 'count'
    
    -- Missing columns for comprehensive metrics
    endpoint VARCHAR(255), -- API endpoint being measured
    method VARCHAR(10), -- HTTP method
    status_code INTEGER, -- Response status code
    
    -- Time series data
    measurement_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    aggregation_period VARCHAR(20) DEFAULT '1m', -- '1m', '5m', '1h', '1d'
    
    -- Additional context
    tags JSONB DEFAULT '{}',
    dimensions JSONB DEFAULT '{}',
    
    -- Partitioning helper
    measurement_date DATE GENERATED ALWAYS AS ((measurement_timestamp AT TIME ZONE 'UTC')::DATE) STORED
);

-- Cross-tool workflows (referenced by analytics service)
CREATE TABLE IF NOT EXISTS cross_tool_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID UNIQUE NOT NULL,
    workflow_name VARCHAR(200) NOT NULL,
    
    -- Workflow definition
    workflow_steps JSONB NOT NULL, -- Array of workflow steps
    trigger_conditions JSONB DEFAULT '{}',
    
    -- Tool integration
    participating_tools TEXT[] NOT NULL, -- Tool slugs involved
    tools_involved TEXT[] NOT NULL DEFAULT '{}', -- Required by analytics service (same as participating_tools)
    data_mappings JSONB DEFAULT '{}', -- How data flows between tools
    
    -- User context
    user_id VARCHAR(255),
    user_email VARCHAR(255), -- Missing column
    username VARCHAR(255), -- Missing column
    session_id VARCHAR(255),
    
    -- Workflow execution
    workflow_start TIMESTAMP WITH TIME ZONE,
    workflow_end TIMESTAMP WITH TIME ZONE,
    workflow_duration_seconds INTEGER,
    workflow_status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'failed', 'cancelled'
    
    -- Event tracking
    total_events INTEGER DEFAULT 0,
    successful_events INTEGER DEFAULT 0,
    failed_events INTEGER DEFAULT 0,
    
    -- Missing columns for enhanced workflow tracking
    workflow_type VARCHAR(50), -- Type of workflow
    priority INTEGER DEFAULT 0, -- Workflow priority
    correlation_id VARCHAR(255), -- For linking related workflows
    parent_workflow_id UUID, -- For nested workflows
    execution_context JSONB DEFAULT '{}', -- Additional execution context
    
    -- Performance tracking (missing columns)
    average_step_duration DECIMAL(10,2),
    bottleneck_step VARCHAR(100),
    
    -- Metadata
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time analytics dashboard data
CREATE TABLE IF NOT EXISTS dashboard_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'counter', 'gauge', 'histogram'
    
    -- Metric value
    value DECIMAL(15,4) NOT NULL,
    previous_value DECIMAL(15,4),
    
    -- Metric dimensions
    tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
    dimensions JSONB DEFAULT '{}', -- Additional grouping dimensions
    
    -- Time series data
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    granularity VARCHAR(20) DEFAULT '1m', -- '1m', '5m', '1h', '1d'
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    
    -- Partitioning helper
    created_date DATE GENERATED ALWAYS AS ((timestamp AT TIME ZONE 'UTC')::DATE) STORED,
    
    UNIQUE(metric_name, tool_id, dimensions, timestamp, granularity)
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_tool_usage_analytics_tool_id ON tool_usage_analytics(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_analytics_user_id ON tool_usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_analytics_action ON tool_usage_analytics(action);
CREATE INDEX IF NOT EXISTS idx_tool_usage_analytics_date_key ON tool_usage_analytics(date_key);
CREATE INDEX IF NOT EXISTS idx_tool_usage_analytics_created_at ON tool_usage_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_tool_usage_analytics_session_id ON tool_usage_analytics(session_id);

CREATE INDEX IF NOT EXISTS idx_tool_usage_patterns_tool_id ON tool_usage_patterns(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_patterns_type ON tool_usage_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_tool_usage_patterns_period ON tool_usage_patterns(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_tool_analytics_config_tool_id ON tool_analytics_config(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_analytics_config_enabled ON tool_analytics_config(tracking_enabled) WHERE tracking_enabled = true;

CREATE INDEX IF NOT EXISTS idx_custom_reports_type ON custom_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_custom_reports_created_by ON custom_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_reports_scheduled ON custom_reports(is_scheduled) WHERE is_scheduled = true;
CREATE INDEX IF NOT EXISTS idx_custom_reports_next_execution ON custom_reports(next_execution) WHERE is_scheduled = true;

CREATE INDEX IF NOT EXISTS idx_report_executions_report_id ON report_executions(report_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_status ON report_executions(status);
CREATE INDEX IF NOT EXISTS idx_report_executions_created_at ON report_executions(created_at);

CREATE INDEX IF NOT EXISTS idx_integration_performance_tool_id ON integration_performance_metrics(tool_id);
CREATE INDEX IF NOT EXISTS idx_integration_performance_metric ON integration_performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_integration_performance_timestamp ON integration_performance_metrics(measurement_timestamp);
CREATE INDEX IF NOT EXISTS idx_integration_performance_date ON integration_performance_metrics(measurement_date);

CREATE INDEX IF NOT EXISTS idx_cross_tool_workflows_workflow_id ON cross_tool_workflows(workflow_id);
CREATE INDEX IF NOT EXISTS idx_cross_tool_workflows_user_id ON cross_tool_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_cross_tool_workflows_status ON cross_tool_workflows(workflow_status);
CREATE INDEX IF NOT EXISTS idx_cross_tool_workflows_active ON cross_tool_workflows(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cross_tool_workflows_start ON cross_tool_workflows(workflow_start);

CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_name ON dashboard_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_tool_id ON dashboard_metrics(tool_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_timestamp ON dashboard_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_date ON dashboard_metrics(created_date);

-- Triggers
CREATE TRIGGER update_tool_analytics_config_updated_at BEFORE UPDATE ON tool_analytics_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_custom_reports_updated_at BEFORE UPDATE ON custom_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_cross_tool_workflows_updated_at BEFORE UPDATE ON cross_tool_workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Default analytics configurations for all tools
INSERT INTO tool_analytics_config (tool_id, tracking_enabled, events_to_track, reports_enabled)
SELECT id, true, 
    ARRAY['login', 'logout', 'api_call', 'feature_usage'],
    true
FROM tools
ON CONFLICT (tool_id) DO NOTHING;

-- Pre-built reports
INSERT INTO custom_reports (report_name, report_type, metrics, created_by, is_public) VALUES
    ('Daily Active Users', 'usage', ARRAY['unique_users', 'total_sessions'], 'system', true),
    ('Tool Adoption Report', 'usage', ARRAY['tool_usage_count', 'user_adoption_rate'], 'system', true),
    ('Security Events Summary', 'security', ARRAY['failed_logins', 'permission_changes'], 'system', true),
    ('Performance Metrics', 'performance', ARRAY['response_times', 'error_rates'], 'system', true),
    ('Weekly Usage Trends', 'usage', ARRAY['session_trends', 'feature_usage_trends'], 'system', true)
ON CONFLICT DO NOTHING;

-- Add missing indexes for analytics tables
CREATE INDEX IF NOT EXISTS idx_tool_usage_analytics_tool_slug ON tool_usage_analytics(tool_slug);
CREATE INDEX IF NOT EXISTS idx_tool_usage_analytics_user_role ON tool_usage_analytics(user_role);
CREATE INDEX IF NOT EXISTS idx_tool_usage_analytics_workflow_id ON tool_usage_analytics(workflow_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_analytics_correlation_id ON tool_usage_analytics(correlation_id);

CREATE INDEX IF NOT EXISTS idx_tool_usage_patterns_tool_slug ON tool_usage_patterns(tool_slug);
CREATE INDEX IF NOT EXISTS idx_integration_performance_metrics_tool_slug ON integration_performance_metrics(tool_slug);
CREATE INDEX IF NOT EXISTS idx_integration_performance_metrics_endpoint ON integration_performance_metrics(endpoint);

CREATE INDEX IF NOT EXISTS idx_cross_tool_workflows_workflow_type ON cross_tool_workflows(workflow_type);
CREATE INDEX IF NOT EXISTS idx_cross_tool_workflows_correlation_id ON cross_tool_workflows(correlation_id);
CREATE INDEX IF NOT EXISTS idx_cross_tool_workflows_parent_workflow_id ON cross_tool_workflows(parent_workflow_id);

-- Update analytics tables with tool_slug data for service compatibility
UPDATE tool_usage_analytics 
SET tool_slug = (SELECT slug FROM tools WHERE tools.id = tool_usage_analytics.tool_id)
WHERE tool_slug IS NULL;

UPDATE tool_usage_patterns 
SET tool_slug = (SELECT slug FROM tools WHERE tools.id = tool_usage_patterns.tool_id)
WHERE tool_slug IS NULL;

UPDATE integration_performance_metrics 
SET tool_slug = (SELECT slug FROM tools WHERE tools.id = integration_performance_metrics.tool_id)
WHERE tool_slug IS NULL;

-- Insert migration record
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('07-analytics', NOW())
ON CONFLICT (version) DO NOTHING;