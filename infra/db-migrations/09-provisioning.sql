-- Provisioning Service Database Schema
-- Tool provisioning templates, deployment automation, and resource management

-- Provisioning templates for each tool type
CREATE TABLE IF NOT EXISTS provisioning_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_type VARCHAR(50) NOT NULL,
    tool_slug VARCHAR(50), -- REQUIRED by provisioning service for queries
    template_name VARCHAR(200) NOT NULL,
    template_version VARCHAR(20) DEFAULT '1.0',
    template_type VARCHAR(50), -- REQUIRED by provisioning service
    template_category VARCHAR(50), -- REQUIRED by provisioning service
    name VARCHAR(200), -- REQUIRED by provisioning service (alias for template_name)
    required_roles TEXT[] DEFAULT '{}', -- REQUIRED by provisioning service for RBAC
    
    -- Template configuration
    infrastructure_config JSONB NOT NULL DEFAULT '{}', -- Docker, K8s, cloud resources
    security_config JSONB DEFAULT '{}', -- Security settings, certificates, secrets
    network_config JSONB DEFAULT '{}', -- Network, ingress, load balancer settings
    storage_config JSONB DEFAULT '{}', -- Volumes, databases, persistent storage
    
    -- Integration configuration
    integration_config JSONB DEFAULT '{}', -- SSO, LDAP, webhook configurations
    environment_variables JSONB DEFAULT '{}', -- Environment-specific variables
    
    -- Deployment settings
    deployment_strategy VARCHAR(50) DEFAULT 'rolling', -- 'blue-green', 'rolling', 'recreate'
    resource_requirements JSONB DEFAULT '{}', -- CPU, memory, storage requirements
    scaling_config JSONB DEFAULT '{}', -- Auto-scaling configuration
    
    -- Template metadata
    description TEXT,
    documentation_url TEXT,
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Lifecycle
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tool_type, template_name, template_version)
);

-- Provisioning workflows
CREATE TABLE IF NOT EXISTS provisioning_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name VARCHAR(200) NOT NULL,
    tool_type VARCHAR(50) NOT NULL,
    template_id UUID NOT NULL REFERENCES provisioning_templates(id),
    
    -- Workflow configuration
    environment VARCHAR(50) NOT NULL DEFAULT 'development',
    target_infrastructure VARCHAR(100) NOT NULL, -- 'docker-compose', 'kubernetes', 'aws', 'azure', 'gcp'
    
    -- Workflow steps
    pre_deployment_steps JSONB DEFAULT '[]',
    deployment_steps JSONB DEFAULT '[]',
    post_deployment_steps JSONB DEFAULT '[]',
    rollback_steps JSONB DEFAULT '[]',
    
    -- Approval requirements
    requires_approval BOOLEAN DEFAULT false,
    approval_workflow JSONB DEFAULT '{}',
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'deprecated'
    
    -- Metadata
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual workflow steps
CREATE TABLE IF NOT EXISTS provisioning_workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES provisioning_workflows(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    
    -- Step details
    step_name VARCHAR(200) NOT NULL,
    step_type VARCHAR(50) NOT NULL, -- 'shell', 'ansible', 'terraform', 'kubernetes', 'docker'
    step_config JSONB NOT NULL DEFAULT '{}',
    
    -- Execution settings
    timeout_seconds INTEGER DEFAULT 300,
    retry_attempts INTEGER DEFAULT 0,
    continue_on_failure BOOLEAN DEFAULT false,
    
    -- Conditions
    run_condition JSONB DEFAULT '{}', -- When to run this step
    success_criteria JSONB DEFAULT '{}', -- How to determine success
    
    -- Dependencies
    depends_on_steps INTEGER[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(workflow_id, step_order)
);

-- Provisioned resources tracking
CREATE TABLE IF NOT EXISTS provisioned_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_name VARCHAR(200) NOT NULL,
    tool_type VARCHAR(50) NOT NULL,
    
    -- Provisioning details
    workflow_id UUID REFERENCES provisioning_workflows(id),
    template_id UUID REFERENCES provisioning_templates(id),
    execution_id UUID, -- Reference to provisioning execution
    
    -- Resource identification
    resource_type VARCHAR(100) NOT NULL, -- 'container', 'service', 'database', 'secret'
    resource_id VARCHAR(255), -- External resource identifier
    resource_arn TEXT, -- Cloud resource ARN
    
    -- Resource configuration
    configuration JSONB DEFAULT '{}',
    endpoints JSONB DEFAULT '{}', -- Service endpoints, URLs
    credentials JSONB DEFAULT '{}', -- Access credentials (encrypted)
    
    -- Status
    status VARCHAR(20) DEFAULT 'provisioning', -- 'provisioning', 'active', 'failed', 'decommissioned'
    health_status VARCHAR(20) DEFAULT 'unknown',
    
    -- Resource metadata
    tags JSONB DEFAULT '{}',
    cost_center VARCHAR(100),
    owner VARCHAR(255),
    
    -- Lifecycle
    provisioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    decommissioned_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bulk provisioning operations
CREATE TABLE IF NOT EXISTS bulk_provisioning_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_name VARCHAR(200) NOT NULL,
    operation_type VARCHAR(50) NOT NULL, -- 'provision', 'update', 'decommission'
    
    -- Scope
    tool_types TEXT[] NOT NULL,
    environments TEXT[] DEFAULT ARRAY['development'],
    target_count INTEGER NOT NULL DEFAULT 1,
    
    -- Configuration
    template_overrides JSONB DEFAULT '{}',
    batch_size INTEGER DEFAULT 5,
    parallel_execution BOOLEAN DEFAULT true,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    progress_percent DECIMAL(5,2) DEFAULT 0,
    
    -- Results
    successful_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '{}',
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_duration_minutes INTEGER,
    
    -- Metadata
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Provisioning policies
CREATE TABLE IF NOT EXISTS provisioning_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name VARCHAR(200) NOT NULL,
    
    -- Policy scope
    tool_types TEXT[] DEFAULT '{}', -- Empty array means applies to all
    environments TEXT[] DEFAULT '{}',
    
    -- Resource limits
    max_instances_per_tool INTEGER DEFAULT 10,
    max_cpu_cores DECIMAL(5,2) DEFAULT 4.0,
    max_memory_gb DECIMAL(5,2) DEFAULT 8.0,
    max_storage_gb DECIMAL(8,2) DEFAULT 100.0,
    
    -- Security requirements
    security_requirements JSONB DEFAULT '{}',
    compliance_tags TEXT[] DEFAULT '{}',
    
    -- Approval requirements
    requires_approval_above_limits BOOLEAN DEFAULT true,
    auto_approval_conditions JSONB DEFAULT '{}',
    
    -- Cost controls
    max_cost_per_month DECIMAL(10,2),
    cost_alerts_enabled BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Higher number = higher priority
    
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Provisioning audit log
CREATE TABLE IF NOT EXISTS provisioning_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type VARCHAR(50) NOT NULL, -- 'provision', 'update', 'decommission', 'approve', 'reject'
    
    -- Target information
    resource_id UUID REFERENCES provisioned_resources(id),
    workflow_id UUID REFERENCES provisioning_workflows(id),
    template_id UUID REFERENCES provisioning_templates(id),
    
    -- Operation details
    operation_details JSONB DEFAULT '{}',
    before_state JSONB DEFAULT '{}',
    after_state JSONB DEFAULT '{}',
    
    -- Actor information
    performed_by VARCHAR(255),
    approval_chain JSONB DEFAULT '{}',
    
    -- Context
    reason TEXT,
    request_id VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_provisioning_templates_tool_type ON provisioning_templates(tool_type);
CREATE INDEX IF NOT EXISTS idx_provisioning_templates_active ON provisioning_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_provisioning_templates_default ON provisioning_templates(is_default) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_provisioning_workflows_tool_type ON provisioning_workflows(tool_type);
CREATE INDEX IF NOT EXISTS idx_provisioning_workflows_template_id ON provisioning_workflows(template_id);
CREATE INDEX IF NOT EXISTS idx_provisioning_workflows_status ON provisioning_workflows(status);

CREATE INDEX IF NOT EXISTS idx_provisioning_workflow_steps_workflow_id ON provisioning_workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_provisioning_workflow_steps_order ON provisioning_workflow_steps(workflow_id, step_order);

CREATE INDEX IF NOT EXISTS idx_provisioned_resources_tool_type ON provisioned_resources(tool_type);
CREATE INDEX IF NOT EXISTS idx_provisioned_resources_status ON provisioned_resources(status);
CREATE INDEX IF NOT EXISTS idx_provisioned_resources_workflow_id ON provisioned_resources(workflow_id);

CREATE INDEX IF NOT EXISTS idx_bulk_provisioning_operations_status ON bulk_provisioning_operations(status);
CREATE INDEX IF NOT EXISTS idx_bulk_provisioning_operations_created_by ON bulk_provisioning_operations(created_by);

CREATE INDEX IF NOT EXISTS idx_provisioning_policies_active ON provisioning_policies(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_provisioning_audit_log_resource_id ON provisioning_audit_log(resource_id);
CREATE INDEX IF NOT EXISTS idx_provisioning_audit_log_operation_type ON provisioning_audit_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_provisioning_audit_log_created_at ON provisioning_audit_log(created_at);

-- Triggers
CREATE TRIGGER update_provisioning_templates_updated_at BEFORE UPDATE ON provisioning_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_provisioning_workflows_updated_at BEFORE UPDATE ON provisioning_workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provisioned_resources_last_updated_at BEFORE UPDATE ON provisioned_resources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provisioning_policies_updated_at BEFORE UPDATE ON provisioning_policies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Populate tool_slug and other required columns in provisioning_templates
UPDATE provisioning_templates 
SET 
    tool_slug = tool_type,
    name = template_name,
    template_type = 'infrastructure',
    template_category = 'deployment'
WHERE tool_slug IS NULL OR name IS NULL;

-- Insert migration record
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('09-provisioning', NOW())
ON CONFLICT (version) DO NOTHING;