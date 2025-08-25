/**
 * Database Schema and Operations for Tools Service
 * 
 * Handles tool registration, health status, access control,
 * and service discovery data persistence.
 * 
 * Works with existing SSO Hub database schema that uses UUID primary keys.
 */

const { z } = require('zod');

// Database schemas for validation - updated to match existing schema
const ToolRegistrationSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).optional(), // Auto-generated if not provided
  description: z.string().max(1000).optional(),
  base_url: z.string().url(),
  health_check_url: z.string().url().optional(),
  integration_type: z.string().default('api'),
  required_roles: z.array(z.string()).default([]),
  required_groups: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
  configuration: z.record(z.any()).default({}),
  tags: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  requires_authentication: z.boolean().default(true)
});

const ToolUpdateSchema = ToolRegistrationSchema.partial();

class DatabaseManager {
  constructor(fastify) {
    this.fastify = fastify;
  }

  async initializeSchema() {
    const client = await this.fastify.pg.connect();
    
    try {
      // Check if tools table exists - if not, we have the wrong database
      const toolsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'tools'
        );
      `);
      
      if (!toolsCheck.rows[0].exists) {
        throw new Error('Tools table not found - ensure you are connected to the correct SSO Hub database');
      }

      // Create tool_access_logs table if it doesn't exist (for our access control)
      await client.query(`
        CREATE TABLE IF NOT EXISTS tool_access_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
          user_sub VARCHAR(255) NOT NULL,
          user_email VARCHAR(255),
          access_granted BOOLEAN NOT NULL,
          access_reason TEXT,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create indexes for our access logs
      await client.query('CREATE INDEX IF NOT EXISTS idx_access_logs_tool_id ON tool_access_logs(tool_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_access_logs_user_sub ON tool_access_logs(user_sub)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON tool_access_logs(created_at)');

      this.fastify.log.info('✅ Database schema verified - using existing SSO Hub tables + access logs');
    } finally {
      client.release();
    }
  }

  async registerTool(toolData) {
    const validatedData = ToolRegistrationSchema.parse(toolData);
    const client = await this.fastify.pg.connect();
    
    try {
      // Generate slug if not provided
      const slug = validatedData.slug || validatedData.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const result = await client.query(`
        INSERT INTO tools (
          name, slug, description, base_url, health_check_url, 
          integration_type, required_roles, required_groups, 
          metadata, configuration, tags, is_active, requires_authentication
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (slug) 
        DO UPDATE SET 
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          base_url = EXCLUDED.base_url,
          health_check_url = EXCLUDED.health_check_url,
          integration_type = EXCLUDED.integration_type,
          required_roles = EXCLUDED.required_roles,
          required_groups = EXCLUDED.required_groups,
          metadata = EXCLUDED.metadata,
          configuration = EXCLUDED.configuration,
          tags = EXCLUDED.tags,
          is_active = EXCLUDED.is_active,
          requires_authentication = EXCLUDED.requires_authentication,
          updated_at = NOW()
        RETURNING *
      `, [
        validatedData.name,
        slug,
        validatedData.description,
        validatedData.base_url,
        validatedData.health_check_url,
        validatedData.integration_type,
        validatedData.required_roles,
        validatedData.required_groups,
        JSON.stringify(validatedData.metadata),
        JSON.stringify(validatedData.configuration),
        validatedData.tags,
        validatedData.is_active,
        validatedData.requires_authentication
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getTools(filters = {}) {
    const client = await this.fastify.pg.connect();
    
    try {
      let query = 'SELECT * FROM tools WHERE 1=1';
      const params = [];
      let paramCount = 0;

      if (filters.tags && filters.tags.length > 0) {
        paramCount++;
        query += ` AND tags && $${paramCount}`;
        params.push(filters.tags);
      }

      if (filters.is_active !== undefined) {
        paramCount++;
        query += ` AND is_active = $${paramCount}`;
        params.push(filters.is_active);
      }

      if (filters.requires_authentication !== undefined) {
        paramCount++;
        query += ` AND requires_authentication = $${paramCount}`;
        params.push(filters.requires_authentication);
      }

      query += ' ORDER BY name ASC';

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getTool(toolId) {
    const client = await this.fastify.pg.connect();
    
    try {
      const result = await client.query('SELECT * FROM tools WHERE id = $1', [toolId]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateToolHealth(toolId, healthData) {
    const client = await this.fastify.pg.connect();
    
    try {
      await client.query(`
        INSERT INTO tool_health (tool_id, status, response_time_ms, error_message, details)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        toolId, 
        healthData.status, 
        healthData.responseTime, 
        healthData.errorMessage,
        JSON.stringify({ timestamp: new Date().toISOString() })
      ]);

      // Keep only last 100 health records per tool
      await client.query(`
        DELETE FROM tool_health 
        WHERE tool_id = $1 
        AND id NOT IN (
          SELECT id FROM tool_health 
          WHERE tool_id = $1 
          ORDER BY checked_at DESC 
          LIMIT 100
        )
      `, [toolId]);
    } finally {
      client.release();
    }
  }

  async getToolHealth(toolId) {
    const client = await this.fastify.pg.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM tool_health 
        WHERE tool_id = $1 
        ORDER BY checked_at DESC 
        LIMIT 10
      `, [toolId]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  async logAccess(toolId, userInfo, accessGranted, reason, requestInfo = {}) {
    const client = await this.fastify.pg.connect();
    
    try {
      await client.query(`
        INSERT INTO tool_access_logs (tool_id, user_sub, user_email, access_granted, access_reason, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        toolId,
        userInfo.sub,
        userInfo.email,
        accessGranted,
        reason,
        requestInfo.ip,
        requestInfo.userAgent
      ]);
    } finally {
      client.release();
    }
  }

  // Enhanced health monitoring methods for Phase 4
  async getAllHealthConfigurations() {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        SELECT 
          thc.*,
          t.slug as tool_slug,
          t.name as tool_name
        FROM tool_health_configs thc
        JOIN tools t ON thc.tool_id = t.id
        WHERE t.is_active = true
        ORDER BY t.name;
      `;
      
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async updateToolHealthStatus(toolId, healthResult) {
    const client = await this.fastify.pg.connect();
    
    try {
      const {
        status,
        response_time_ms,
        check_timestamp,
        failure_reason,
        status_details,
        consecutive_failures
      } = healthResult;

      // Update tool integration status
      const query = `
        INSERT INTO tool_integration_status (
          tool_id, status, last_check_at, last_success_at, last_failure_at,
          consecutive_failures, consecutive_successes, failure_reason,
          response_time_ms, status_details, updated_at
        ) VALUES (
          $1, $2, $3, 
          CASE WHEN $2 = 'healthy' THEN $3 ELSE NULL END,
          CASE WHEN $2 != 'healthy' THEN $3 ELSE NULL END,
          CASE WHEN $2 != 'healthy' THEN COALESCE((
            SELECT consecutive_failures + 1 FROM tool_integration_status WHERE tool_id = $1
          ), 1) ELSE 0 END,
          CASE WHEN $2 = 'healthy' THEN COALESCE((
            SELECT consecutive_successes + 1 FROM tool_integration_status WHERE tool_id = $1
          ), 1) ELSE 0 END,
          $4, $5, $6, NOW()
        )
        ON CONFLICT (tool_id) DO UPDATE SET
          status = EXCLUDED.status,
          last_check_at = EXCLUDED.last_check_at,
          last_success_at = COALESCE(EXCLUDED.last_success_at, tool_integration_status.last_success_at),
          last_failure_at = COALESCE(EXCLUDED.last_failure_at, tool_integration_status.last_failure_at),
          consecutive_failures = EXCLUDED.consecutive_failures,
          consecutive_successes = EXCLUDED.consecutive_successes,
          failure_reason = EXCLUDED.failure_reason,
          response_time_ms = EXCLUDED.response_time_ms,
          status_details = EXCLUDED.status_details,
          updated_at = EXCLUDED.updated_at
        RETURNING *;
      `;
      
      const result = await client.query(query, [
        toolId, status, check_timestamp, failure_reason, response_time_ms, status_details
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async recordPerformanceMetric(toolId, metricType, metricValue, metricUnit) {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        INSERT INTO tool_performance_metrics (
          tool_id, metric_type, metric_value, metric_unit, measurement_timestamp
        ) VALUES ($1, $2, $3, $4, NOW())
        RETURNING *;
      `;
      
      const result = await client.query(query, [toolId, metricType, metricValue, metricUnit]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getToolHealthMetrics(toolId, metricType, hoursBack = 24) {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        SELECT 
          metric_type,
          metric_value,
          metric_unit,
          measurement_timestamp
        FROM tool_performance_metrics
        WHERE tool_id = $1 
          AND metric_type = $2
          AND measurement_timestamp > NOW() - INTERVAL '${hoursBack} hours'
        ORDER BY measurement_timestamp DESC
        LIMIT 100;
      `;
      
      const result = await client.query(query, [toolId, metricType]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getToolHealthOverview() {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        SELECT 
          t.id,
          t.name,
          t.slug,
          t.category_id,
          tc.name as category_name,
          tis.status,
          tis.last_check_at,
          tis.last_success_at,
          tis.last_failure_at,
          tis.consecutive_failures,
          tis.response_time_ms,
          tis.failure_reason
        FROM tools t
        LEFT JOIN tool_categories tc ON t.category_id = tc.id
        LEFT JOIN tool_integration_status tis ON t.id = tis.tool_id
        WHERE t.is_active = true
        ORDER BY tc.display_order, t.name;
      `;
      
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // ===== PHASE 8: COMPREHENSIVE HEALTH MONITORING DATABASE METHODS =====

  /**
   * Get service health overview for all microservices
   */
  async getServiceHealthOverview() {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        SELECT 
          service_name, service_type, host, port, status, 
          response_time_ms, last_check_at, last_healthy_at,
          consecutive_failures, consecutive_successes,
          error_message, tags
        FROM service_health 
        WHERE environment = 'production'
        ORDER BY service_name
      `;
      
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Update service health status
   */
  async updateServiceHealth(serviceName, healthData) {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        UPDATE service_health 
        SET 
          status = $2::VARCHAR(20),
          response_time_ms = $3,
          last_check_at = NOW(),
          last_healthy_at = CASE WHEN $2::VARCHAR(20) = 'healthy' THEN NOW() ELSE last_healthy_at END,
          consecutive_failures = CASE 
            WHEN $2::VARCHAR(20) = 'healthy' THEN 0 
            ELSE consecutive_failures + 1 
          END,
          consecutive_successes = CASE 
            WHEN $2::VARCHAR(20) = 'healthy' THEN consecutive_successes + 1 
            ELSE 0 
          END,
          error_message = $4,
          error_details = $5,
          updated_at = NOW()
        WHERE service_name = $1::VARCHAR(100) AND environment = 'production'
        RETURNING *
      `;
      
      const values = [
        serviceName,
        healthData.status,
        healthData.response_time_ms,
        healthData.error_message,
        JSON.stringify(healthData.details || {})
      ];
      
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get integration health overview for all tool integrations
   */
  async getIntegrationHealthOverview() {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        SELECT 
          tool_slug, integration_type, status, response_time_ms,
          last_check_at, last_healthy_at, auth_status, permission_status,
          api_rate_limit_remaining, webhook_delivery_success_rate,
          error_message, consecutive_failures
        FROM integration_health 
        ORDER BY tool_slug, integration_type
      `;
      
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Update integration health status
   */
  async updateIntegrationHealth(toolSlug, integrationType, healthData) {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        UPDATE integration_health 
        SET 
          status = $3::VARCHAR(20),
          response_time_ms = $4,
          last_check_at = NOW(),
          last_healthy_at = CASE WHEN $3::VARCHAR(20) = 'healthy' THEN NOW() ELSE last_healthy_at END,
          auth_status = $5::VARCHAR(20),
          permission_status = $6::VARCHAR(20),
          api_rate_limit_remaining = $7,
          api_rate_limit_reset = $8,
          webhook_delivery_success_rate = $9,
          error_message = $10,
          error_code = $11,
          consecutive_failures = CASE 
            WHEN $3::VARCHAR(20) = 'healthy' THEN 0 
            ELSE consecutive_failures + 1 
          END,
          updated_at = NOW()
        WHERE tool_slug = $1::VARCHAR(50) AND integration_type = $2::VARCHAR(50)
        RETURNING *
      `;
      
      const values = [
        toolSlug,
        integrationType,
        healthData.status,
        healthData.response_time_ms,
        healthData.auth_status,
        healthData.permission_status,
        healthData.api_rate_limit_remaining,
        healthData.api_rate_limit_reset,
        healthData.webhook_delivery_success_rate,
        healthData.error_message,
        healthData.error_code
      ];
      
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get service dependencies health
   */
  async getServiceDependenciesHealth() {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        SELECT 
          source_service, target_service, target_tool_slug, dependency_type,
          status, response_time_ms, is_critical, failure_count,
          last_check_at, last_failure_at, error_message, description
        FROM service_dependencies
        ORDER BY source_service, target_service, target_tool_slug
      `;
      
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Update service dependency health
   */
  async updateServiceDependencyHealth(sourceService, targetService, targetToolSlug, dependencyType, healthData) {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        UPDATE service_dependencies 
        SET 
          status = $5,
          response_time_ms = $6,
          last_check_at = NOW(),
          failure_count = CASE 
            WHEN $5 = 'healthy' THEN 0 
            ELSE failure_count + 1 
          END,
          last_failure_at = CASE WHEN $5 != 'healthy' THEN NOW() ELSE last_failure_at END,
          error_message = $7,
          updated_at = NOW()
        WHERE source_service = $1 
          AND (target_service = $2 OR ($2 IS NULL AND target_service IS NULL))
          AND (target_tool_slug = $3 OR ($3 IS NULL AND target_tool_slug IS NULL))
          AND dependency_type = $4
        RETURNING *
      `;
      
      const values = [
        sourceService,
        targetService,
        targetToolSlug,
        dependencyType,
        healthData.status,
        healthData.response_time_ms,
        healthData.error_message
      ];
      
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Record cascade failure
   */
  async recordCascadeFailure(incidentData) {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        INSERT INTO cascade_failures (
          incident_id, root_cause_service, root_cause_tool_slug,
          affected_services, affected_tools, failure_pattern,
          severity, user_impact, detected_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (incident_id) DO UPDATE SET
          affected_services = EXCLUDED.affected_services,
          affected_tools = EXCLUDED.affected_tools,
          failure_pattern = EXCLUDED.failure_pattern,
          severity = EXCLUDED.severity,
          user_impact = EXCLUDED.user_impact,
          updated_at = NOW()
        RETURNING *
      `;
      
      const values = [
        incidentData.incident_id,
        incidentData.root_cause_service,
        incidentData.root_cause_tool_slug,
        incidentData.affected_services,
        incidentData.affected_tools,
        incidentData.failure_pattern,
        incidentData.severity,
        incidentData.user_impact
      ];
      
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get active cascade failures
   */
  async getActiveCascadeFailures() {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        SELECT 
          incident_id, root_cause_service, root_cause_tool_slug,
          affected_services, affected_tools, failure_pattern,
          severity, user_impact, started_at, detected_at, resolution_status
        FROM cascade_failures
        WHERE resolution_status = 'ongoing'
        ORDER BY started_at DESC
      `;
      
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Store health metrics history for trending
   */
  async storeHealthMetricsHistory(metricData) {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        INSERT INTO health_metrics_history (
          metric_type, source_id, source_name, metric_name, metric_value, metric_unit,
          aggregation_period, period_start, period_end, sample_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (metric_type, source_id, metric_name, aggregation_period, period_start)
        DO UPDATE SET
          metric_value = (health_metrics_history.metric_value * health_metrics_history.sample_count + $5) / 
                       (health_metrics_history.sample_count + 1),
          sample_count = health_metrics_history.sample_count + 1,
          min_value = LEAST(COALESCE(health_metrics_history.min_value, $5), $5),
          max_value = GREATEST(COALESCE(health_metrics_history.max_value, $5), $5)
        RETURNING *
      `;
      
      const values = [
        metricData.metric_type,
        metricData.source_id,
        metricData.source_name,
        metricData.metric_name,
        metricData.metric_value,
        metricData.metric_unit,
        metricData.aggregation_period,
        metricData.period_start,
        metricData.period_end,
        metricData.sample_count || 1
      ];
      
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get health metrics history for trending analysis
   */
  async getHealthMetricsHistory(sourceId, metricName, aggregationPeriod = 'hour', hoursBack = 24) {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        SELECT 
          metric_value, metric_unit, sample_count,
          min_value, max_value, avg_value,
          period_start, period_end
        FROM health_metrics_history
        WHERE source_id = $1 
          AND metric_name = $2
          AND aggregation_period = $3
          AND period_start >= NOW() - INTERVAL '${hoursBack} hours'
        ORDER BY period_start DESC
        LIMIT 100
      `;
      
      const result = await client.query(query, [sourceId, metricName, aggregationPeriod]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get health alerts
   */
  async getHealthAlerts(status = 'active') {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        SELECT 
          alert_type, severity, source_type, source_id, status,
          title, description, triggered_at, resolved_at,
          notification_channels, runbook_url
        FROM health_alerts
        WHERE enabled = true
          AND ($1 = 'all' OR status = $1)
        ORDER BY triggered_at DESC
        LIMIT 50
      `;
      
      const result = await client.query(query, [status]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get database connection reference for advanced queries
   */
  get db() {
    return this.fastify.pg;
  }
}

module.exports = { DatabaseManager, ToolRegistrationSchema, ToolUpdateSchema };
