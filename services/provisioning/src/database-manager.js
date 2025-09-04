/**
 * Database Manager for Provisioning Service - Phase 9
 * Handles all database operations for provisioning workflows and resources
 */

class DatabaseManager {
  constructor(fastify, config) {
    this.fastify = fastify;
    this.config = config;
    this.isInitialized = false;
  }

  get db() {
    return this.fastify.pg;
  }

  async initialize() {
    this.fastify.log.info('🗄️ Initializing Database Manager...');
    
    try {
      // Test database connection
      await this.db.query('SELECT 1');
      
      this.isInitialized = true;
      this.fastify.log.info('✅ Database Manager initialized successfully');
    } catch (error) {
      this.fastify.log.error('❌ Failed to initialize Database Manager:', error);
      throw error;
    }
  }

  // ===== WORKFLOW OPERATIONS =====

  async getWorkflow(workflowId) {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT * FROM provisioning_workflows
        WHERE id = $1
      `;
      
      const result = await client.query(query, [workflowId]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getWorkflows(filters) {
    const client = await this.db.connect();
    
    try {
      let query = `
        SELECT id, workflow_name, tool_type, template_id, environment,
               target_infrastructure, status, created_by, created_at, updated_at,
               pre_deployment_steps, deployment_steps, post_deployment_steps
        FROM provisioning_workflows
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 0;
      
      if (filters.status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(filters.status);
      }
      
      if (filters.tool_slug) {
        paramCount++;
        query += ` AND tool_slug = $${paramCount}`;
        params.push(filters.tool_slug);
      }
      
      if (filters.initiated_by) {
        paramCount++;
        query += ` AND initiated_by = $${paramCount}`;
        params.push(filters.initiated_by);
      }
      
      query += ` ORDER BY created_at DESC`;
      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(filters.limit, filters.offset);
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getWorkflowsCount(filters) {
    const client = await this.db.connect();
    
    try {
      let query = `
        SELECT COUNT(*) as count FROM provisioning_workflows
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 0;
      
      if (filters.status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(filters.status);
      }
      
      if (filters.tool_slug) {
        paramCount++;
        query += ` AND tool_slug = $${paramCount}`;
        params.push(filters.tool_slug);
      }
      
      if (filters.initiated_by) {
        paramCount++;
        query += ` AND initiated_by = $${paramCount}`;
        params.push(filters.initiated_by);
      }
      
      const result = await client.query(query, params);
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  async getWorkflowSteps(workflowId) {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT * FROM provisioning_workflow_steps
        WHERE workflow_id = $1
        ORDER BY step_order ASC
      `;
      
      const result = await client.query(query, [workflowId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // ===== RESOURCE OPERATIONS =====

  async getProvisionedResources(filters) {
    const client = await this.db.connect();
    
    try {
      let query = `
        SELECT * FROM provisioned_resources
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 0;
      
      if (filters.tool_slug) {
        paramCount++;
        query += ` AND tool_slug = $${paramCount}`;
        params.push(filters.tool_slug);
      }
      
      if (filters.resource_type) {
        paramCount++;
        query += ` AND resource_type = $${paramCount}`;
        params.push(filters.resource_type);
      }
      
      if (filters.status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(filters.status);
      }
      
      if (filters.provisioned_by) {
        paramCount++;
        query += ` AND provisioned_by = $${paramCount}`;
        params.push(filters.provisioned_by);
      }
      
      query += ` ORDER BY created_at DESC`;
      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(filters.limit, filters.offset);
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getProvisionedResourcesCount(filters) {
    const client = await this.db.connect();
    
    try {
      let query = `
        SELECT COUNT(*) as count FROM provisioned_resources
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 0;
      
      if (filters.tool_slug) {
        paramCount++;
        query += ` AND tool_slug = $${paramCount}`;
        params.push(filters.tool_slug);
      }
      
      if (filters.resource_type) {
        paramCount++;
        query += ` AND resource_type = $${paramCount}`;
        params.push(filters.resource_type);
      }
      
      if (filters.status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(filters.status);
      }
      
      if (filters.provisioned_by) {
        paramCount++;
        query += ` AND provisioned_by = $${paramCount}`;
        params.push(filters.provisioned_by);
      }
      
      const result = await client.query(query, params);
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  // ===== TEMPLATE OPERATIONS =====

  async getTemplates(filters) {
    const client = await this.db.connect();
    
    try {
      let query = `
        SELECT * FROM provisioning_templates
        WHERE is_active = true
      `;
      
      const params = [];
      let paramCount = 0;
      
      if (filters.tool_slug) {
        paramCount++;
        query += ` AND tool_slug = $${paramCount}`;
        params.push(filters.tool_slug);
      }
      
      if (filters.template_type) {
        paramCount++;
        query += ` AND template_type = $${paramCount}`;
        params.push(filters.template_type);
      }
      
      if (filters.template_category) {
        paramCount++;
        query += ` AND template_category = $${paramCount}`;
        params.push(filters.template_category);
      }
      
      // Role-based filtering
      if (filters.user_roles && !filters.user_roles.includes('admin')) {
        query += ` AND (required_roles = '{}' OR required_roles && $${paramCount + 1})`;
        params.push(filters.user_roles);
      }
      
      query += ` ORDER BY tool_slug, template_category, name`;
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getTemplate(templateId) {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT * FROM provisioning_templates
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await client.query(query, [templateId]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // ===== AUDIT OPERATIONS =====

  async logProvisioningAudit(eventData) {
    const client = await this.db.connect();
    
    try {
      const query = `
        INSERT INTO provisioning_audit_log (
          event_type, event_category, workflow_id, resource_id, template_id,
          event_description, event_data, user_id, user_email, user_roles,
          source_ip, user_agent, tool_slug, resource_type, success,
          error_code, error_message, duration_ms, correlation_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      `;
      
      const values = [
        eventData.event_type,
        eventData.event_category || 'provisioning',
        eventData.workflow_id,
        eventData.resource_id,
        eventData.template_id,
        eventData.event_description,
        JSON.stringify(eventData.event_data || {}),
        eventData.user_id,
        eventData.user_email,
        eventData.user_roles || [],
        eventData.source_ip,
        eventData.user_agent,
        eventData.tool_slug,
        eventData.resource_type,
        eventData.success !== false,
        eventData.error_code,
        eventData.error_message,
        eventData.duration_ms,
        eventData.correlation_id
      ];
      
      await client.query(query, values);
    } finally {
      client.release();
    }
  }
}

module.exports = DatabaseManager;
