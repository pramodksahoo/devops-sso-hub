/**
 * Audit Manager - Core audit logging and correlation engine
 * Handles tool-specific event processing, correlation tracking, and workflow analysis
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { z } = require('zod');

// Audit event validation schemas
const AuditEventSchema = z.object({
  event_type: z.string().min(1).max(100),
  event_category: z.enum(['authentication', 'configuration', 'integration', 'security', 'monitoring']),
  event_severity: z.enum(['critical', 'error', 'warning', 'info', 'debug']).optional().default('info'),
  tool_id: z.string().uuid().optional(),
  tool_slug: z.string().min(1).max(50).optional(),
  tool_name: z.string().max(255).optional(),
  tool_version: z.string().max(50).optional(),
  integration_type: z.enum(['sso', 'webhook', 'provisioning', 'health_check']).optional(),
  user_id: z.string().max(255).optional(),
  user_email: z.string().email().optional(),
  user_roles: z.array(z.string()).optional(),
  user_groups: z.array(z.string()).optional(),
  session_id: z.string().max(255).optional(),
  action: z.string().min(1).max(100),
  action_result: z.enum(['success', 'failure', 'partial', 'pending']),
  action_details: z.record(z.any()).optional().default({}),
  request_id: z.string().max(255).optional(),
  source_ip: z.string().optional(),
  user_agent: z.string().optional(),
  processing_time_ms: z.number().int().min(0).optional(),
  error_code: z.string().max(50).optional(),
  error_message: z.string().optional(),
  tool_metadata: z.record(z.any()).optional().default({}),
  integration_metadata: z.record(z.any()).optional().default({}),
  security_context: z.record(z.any()).optional().default({}),
  resource_type: z.string().max(100).optional(),
  resource_id: z.string().max(255).optional(),
  resource_name: z.string().max(255).optional(),
  configuration_changes: z.record(z.any()).optional().default({})
});

class AuditManager {
  constructor(fastify, config) {
    this.fastify = fastify;
    this.config = config;
    this.eventBuffer = [];
    this.correlationMap = new Map(); // For tracking related events
    this.workflowMap = new Map(); // For tracking ongoing workflows
    this.sessionMap = new Map(); // For tracking user sessions
    
    // Start periodic flush if real-time processing is enabled
    if (this.config.ENABLE_REAL_TIME_PROCESSING) {
      this.startPeriodicFlush();
    }
  }

  // ===== CORE AUDIT EVENT PROCESSING =====

  async logEvent(eventData) {
    try {
      // Validate event data
      const validatedEvent = AuditEventSchema.parse(eventData);
      
      // Enrich event with additional context
      const enrichedEvent = await this.enrichEvent(validatedEvent);
      
      // Process correlation and workflow tracking
      await this.processCorrelation(enrichedEvent);
      
      // Store the event
      const auditEventId = await this.storeEvent(enrichedEvent);
      
      // Update session tracking
      if (enrichedEvent.session_id && enrichedEvent.user_id) {
        await this.updateSessionTracking(enrichedEvent);
      }
      
      // Trigger real-time processing if enabled
      if (this.config.ENABLE_REAL_TIME_PROCESSING) {
        await this.processRealTimeAlerts(enrichedEvent);
      }
      
      return auditEventId;
    } catch (error) {
      this.fastify.log.error('Failed to log audit event:', error);
      throw error;
    }
  }

  async enrichEvent(event) {
    const enriched = {
      ...event,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      audit_version: 1,
      audit_source: 'sso-hub',
      audit_tags: this.generateAuditTags(event)
    };

    // Auto-generate correlation ID if not provided
    if (!enriched.correlation_id) {
      enriched.correlation_id = this.generateCorrelationId(event);
    }

    // Auto-detect workflow if not provided
    if (!enriched.workflow_id) {
      enriched.workflow_id = this.detectWorkflow(event);
    }

    // Set event severity based on configuration
    if (!enriched.event_severity) {
      enriched.event_severity = this.determineEventSeverity(event);
    }

    // Apply PII masking if enabled
    if (this.config.ENABLE_PII_MASKING) {
      this.maskPII(enriched);
    }

    // Set retention policy
    enriched.retention_policy = this.determineRetentionPolicy(enriched);
    enriched.expires_at = this.calculateExpirationDate(enriched.retention_policy);

    return enriched;
  }

  generateAuditTags(event) {
    const tags = [];
    
    // Add tool category tag
    if (event.tool_slug) {
      const category = this.getToolCategory(event.tool_slug);
      if (category) tags.push(`category:${category}`);
      tags.push(`tool:${event.tool_slug}`);
    }
    
    // Add integration type tag
    if (event.integration_type) {
      tags.push(`integration:${event.integration_type}`);
    }
    
    // Add action tag
    tags.push(`action:${event.action}`);
    
    // Add result tag
    tags.push(`result:${event.action_result}`);
    
    // Add severity tag
    tags.push(`severity:${event.event_severity || 'info'}`);
    
    return tags;
  }

  generateCorrelationId(event) {
    // Generate correlation ID based on session, user, and tool context
    const correlationData = [
      event.session_id || '',
      event.user_id || '',
      event.tool_slug || '',
      event.request_id || ''
    ].join('|');
    
    return crypto.createHash('md5').update(correlationData).digest('hex');
  }

  detectWorkflow(event) {
    // Check if this event matches any workflow patterns
    const eventKey = `${event.tool_slug}.${event.event_type}`;
    
    for (const [workflowType, rules] of Object.entries(this.config.WORKFLOW_CORRELATION_RULES)) {
      // Check for workflow start events
      if (rules.start_events.includes(eventKey)) {
        const workflowId = uuidv4();
        this.startWorkflow(workflowId, workflowType, event);
        return workflowId;
      }
      
      // Check for workflow continuation events
      if (rules.continuation_events.includes(eventKey) || rules.end_events.includes(eventKey)) {
        const existingWorkflow = this.findActiveWorkflow(event);
        if (existingWorkflow) {
          if (rules.end_events.includes(eventKey)) {
            this.endWorkflow(existingWorkflow.workflow_id, event);
          }
          return existingWorkflow.workflow_id;
        }
      }
    }
    
    return null;
  }

  determineEventSeverity(event) {
    const eventKey = `${event.action}_${event.action_result}`;
    return this.config.EVENT_SEVERITY_MAPPING[eventKey] || 'info';
  }

  getToolCategory(toolSlug) {
    for (const [category, tools] of Object.entries(this.config.TOOL_CATEGORIES)) {
      if (tools.includes(toolSlug)) {
        return category;
      }
    }
    return null;
  }

  determineRetentionPolicy(event) {
    if (event.event_severity === 'critical' || event.event_category === 'security') {
      return 'critical';
    } else if (event.event_category === 'configuration' || event.action.includes('permission')) {
      return 'standard';
    } else if (event.event_category === 'monitoring') {
      return 'short_term';
    }
    return 'standard';
  }

  calculateExpirationDate(retentionPolicy) {
    const retentionDays = this.config.RETENTION_POLICIES[retentionPolicy] || this.config.AUDIT_RETENTION_DAYS;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + retentionDays);
    return expirationDate.toISOString();
  }

  maskPII(event) {
    this.config.PII_FIELDS.forEach(field => {
      if (event[field]) {
        event[field] = this.maskString(event[field]);
      }
    });
    
    // Also mask PII in nested objects
    ['action_details', 'tool_metadata', 'integration_metadata', 'security_context'].forEach(objField => {
      if (event[objField] && typeof event[objField] === 'object') {
        this.maskPIIInObject(event[objField]);
      }
    });
  }

  maskString(value) {
    if (typeof value !== 'string') return value;
    
    // For email addresses, mask the local part
    if (value.includes('@')) {
      const [local, domain] = value.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    }
    
    // For other strings, mask middle part
    if (value.length <= 4) return '***';
    return value.substring(0, 2) + '***' + value.substring(value.length - 2);
  }

  maskPIIInObject(obj) {
    this.config.PII_FIELDS.forEach(field => {
      if (obj[field]) {
        obj[field] = this.maskString(obj[field]);
      }
    });
  }

  // ===== CORRELATION AND WORKFLOW TRACKING =====

  async processCorrelation(event) {
    // Update correlation map
    const correlationKey = event.correlation_id;
    if (!this.correlationMap.has(correlationKey)) {
      this.correlationMap.set(correlationKey, []);
    }
    this.correlationMap.get(correlationKey).push(event);
    
    // Process workflow correlation
    if (event.workflow_id) {
      await this.updateWorkflow(event.workflow_id, event);
    }
  }

  startWorkflow(workflowId, workflowType, triggerEvent) {
    const workflow = {
      workflow_id: workflowId,
      workflow_type: workflowType,
      workflow_name: `${workflowType}_${Date.now()}`,
      user_id: triggerEvent.user_id,
      user_email: triggerEvent.user_email,
      session_id: triggerEvent.session_id,
      tools_involved: [triggerEvent.tool_slug],
      workflow_start: new Date(),
      workflow_status: 'active',
      total_events: 1,
      successful_events: triggerEvent.action_result === 'success' ? 1 : 0,
      failed_events: triggerEvent.action_result === 'failure' ? 1 : 0,
      workflow_metadata: {
        trigger_event: triggerEvent.event_type,
        trigger_tool: triggerEvent.tool_slug
      }
    };
    
    this.workflowMap.set(workflowId, workflow);
    return workflow;
  }

  findActiveWorkflow(event) {
    // Look for active workflows that might be related to this event
    for (const workflow of this.workflowMap.values()) {
      if (workflow.workflow_status === 'active' &&
          workflow.user_id === event.user_id &&
          workflow.session_id === event.session_id) {
        return workflow;
      }
    }
    return null;
  }

  async updateWorkflow(workflowId, event) {
    const workflow = this.workflowMap.get(workflowId);
    if (!workflow) return;
    
    // Update workflow statistics
    workflow.total_events += 1;
    if (event.action_result === 'success') {
      workflow.successful_events += 1;
    } else if (event.action_result === 'failure') {
      workflow.failed_events += 1;
    }
    
    // Add tool to involved tools if not already present
    if (event.tool_slug && !workflow.tools_involved.includes(event.tool_slug)) {
      workflow.tools_involved.push(event.tool_slug);
    }
    
    // Update workflow metadata
    workflow.workflow_metadata.last_event = event.event_type;
    workflow.workflow_metadata.last_tool = event.tool_slug;
    workflow.workflow_metadata.updated_at = new Date();
  }

  endWorkflow(workflowId, event) {
    const workflow = this.workflowMap.get(workflowId);
    if (!workflow) return;
    
    workflow.workflow_end = new Date();
    workflow.workflow_duration_seconds = Math.floor(
      (workflow.workflow_end - workflow.workflow_start) / 1000
    );
    workflow.workflow_status = event.action_result === 'success' ? 'completed' : 'failed';
    workflow.workflow_metadata.end_event = event.event_type;
    workflow.workflow_metadata.end_tool = event.tool_slug;
    
    // Store workflow in database
    this.storeWorkflow(workflow);
    
    // Remove from active workflows
    this.workflowMap.delete(workflowId);
  }

  // ===== SESSION TRACKING =====

  async updateSessionTracking(event) {
    const sessionKey = event.session_id;
    let session = this.sessionMap.get(sessionKey);
    
    if (!session) {
      // Create new session record
      session = {
        session_id: event.session_id,
        user_id: event.user_id,
        user_email: event.user_email,
        user_roles: event.user_roles || [],
        user_groups: event.user_groups || [],
        session_start: new Date(),
        session_last_activity: new Date(),
        session_status: 'active',
        initial_ip: event.source_ip,
        initial_user_agent: event.user_agent,
        tools_accessed: [],
        total_tool_launches: 0,
        total_events: 0,
        session_metadata: {}
      };
      this.sessionMap.set(sessionKey, session);
    }
    
    // Update session activity
    session.session_last_activity = new Date();
    session.total_events += 1;
    
    // Track tool access
    if (event.tool_slug && !session.tools_accessed.includes(event.tool_slug)) {
      session.tools_accessed.push(event.tool_slug);
    }
    
    // Track tool launches
    if (event.action === 'launch' && event.action_result === 'success') {
      session.total_tool_launches += 1;
    }
    
    // Periodically store session updates
    if (session.total_events % 10 === 0) {
      await this.storeSessionUpdate(session);
    }
  }

  // ===== DATABASE OPERATIONS =====

  async storeEvent(event) {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        INSERT INTO audit_events (
          id, event_type, event_category, event_severity, tool_id, tool_slug, tool_name,
          tool_version, integration_type, user_id, user_email, user_roles, user_groups,
          session_id, correlation_id, workflow_id, action, action_result, action_details,
          request_id, source_ip, user_agent, request_headers, request_payload,
          response_status, response_headers, response_payload, processing_time_ms,
          error_code, error_message, tool_metadata, integration_metadata, security_context,
          resource_type, resource_id, resource_name, configuration_changes, timestamp,
          expires_at, audit_version, audit_source, audit_tags, retention_policy
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36,
          $37, $38, $39, $40, $41, $42, $43
        ) RETURNING id
      `;
      
      const values = [
        event.id, event.event_type, event.event_category, event.event_severity,
        event.tool_id, event.tool_slug, event.tool_name, event.tool_version,
        event.integration_type, event.user_id, event.user_email, event.user_roles,
        event.user_groups, event.session_id, event.correlation_id, event.workflow_id,
        event.action, event.action_result, JSON.stringify(event.action_details),
        event.request_id, event.source_ip, event.user_agent,
        JSON.stringify(event.request_headers || {}), JSON.stringify(event.request_payload || {}),
        event.response_status, JSON.stringify(event.response_headers || {}),
        JSON.stringify(event.response_payload || {}), event.processing_time_ms,
        event.error_code, event.error_message, JSON.stringify(event.tool_metadata),
        JSON.stringify(event.integration_metadata), JSON.stringify(event.security_context),
        event.resource_type, event.resource_id, event.resource_name,
        JSON.stringify(event.configuration_changes), event.timestamp, event.expires_at,
        event.audit_version, event.audit_source, event.audit_tags, event.retention_policy
      ];
      
      const result = await client.query(query, values);
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  async storeWorkflow(workflow) {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        INSERT INTO integration_workflows (
          workflow_id, workflow_type, workflow_name, workflow_description,
          user_id, user_email, session_id, tools_involved, workflow_start,
          workflow_end, workflow_duration_seconds, workflow_status,
          total_events, successful_events, failed_events, workflow_metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (workflow_id) DO UPDATE SET
          workflow_end = EXCLUDED.workflow_end,
          workflow_duration_seconds = EXCLUDED.workflow_duration_seconds,
          workflow_status = EXCLUDED.workflow_status,
          total_events = EXCLUDED.total_events,
          successful_events = EXCLUDED.successful_events,
          failed_events = EXCLUDED.failed_events,
          workflow_metadata = EXCLUDED.workflow_metadata
      `;
      
      const values = [
        workflow.workflow_id, workflow.workflow_type, workflow.workflow_name, '',
        workflow.user_id, workflow.user_email, workflow.session_id, workflow.tools_involved,
        workflow.workflow_start, workflow.workflow_end, workflow.workflow_duration_seconds,
        workflow.workflow_status, workflow.total_events, workflow.successful_events,
        workflow.failed_events, JSON.stringify(workflow.workflow_metadata)
      ];
      
      await client.query(query, values);
    } finally {
      client.release();
    }
  }

  async storeSessionUpdate(session) {
    // For now, we'll just log session updates since the existing user_sessions table
    // has a different schema. In a production environment, we'd want to update
    // the schema or create a new session tracking table.
    this.fastify.log.info('Session update:', {
      session_id: session.session_id,
      user_id: session.user_id,
      tools_accessed: session.tools_accessed,
      total_events: session.total_events
    });
  }

  // ===== REAL-TIME PROCESSING =====

  async processRealTimeAlerts(event) {
    // Check for critical events that need immediate attention
    if (event.event_severity === 'critical' || event.action_result === 'failure') {
      this.fastify.log.warn('Critical audit event detected:', {
        event_type: event.event_type,
        tool_slug: event.tool_slug,
        user_id: event.user_id,
        error_message: event.error_message
      });
      
      // Here you could trigger real-time alerts, notifications, etc.
    }
  }

  startPeriodicFlush() {
    setInterval(() => {
      this.flushBuffers();
    }, this.config.AUDIT_FLUSH_INTERVAL_MS);
  }

  async flushBuffers() {
    // Flush any buffered events, session updates, etc.
    // This could be used for batch processing in high-volume scenarios
    this.fastify.log.debug('Flushing audit buffers...');
  }

  // ===== QUERY METHODS =====

  async getAuditEvents(filters = {}) {
    const client = await this.fastify.pg.connect();
    
    try {
      let query = `
        SELECT * FROM audit_events
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;
      
      // Add filters
      if (filters.tool_slug) {
        query += ` AND tool_slug = $${paramCount}`;
        params.push(filters.tool_slug);
        paramCount++;
      }
      
      if (filters.user_id) {
        query += ` AND user_id = $${paramCount}`;
        params.push(filters.user_id);
        paramCount++;
      }
      
      if (filters.event_type) {
        query += ` AND event_type = $${paramCount}`;
        params.push(filters.event_type);
        paramCount++;
      }
      
      if (filters.event_category) {
        query += ` AND event_category = $${paramCount}`;
        params.push(filters.event_category);
        paramCount++;
      }
      
      if (filters.action_result) {
        query += ` AND action_result = $${paramCount}`;
        params.push(filters.action_result);
        paramCount++;
      }
      
      if (filters.since) {
        query += ` AND timestamp >= $${paramCount}`;
        params.push(filters.since);
        paramCount++;
      }
      
      if (filters.until) {
        query += ` AND timestamp <= $${paramCount}`;
        params.push(filters.until);
        paramCount++;
      }
      
      query += ` ORDER BY timestamp DESC`;
      
      if (filters.limit) {
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
        paramCount++;
      }
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getCorrelatedEvents(correlationId) {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        SELECT * FROM audit_events
        WHERE correlation_id = $1
        ORDER BY timestamp ASC
      `;
      
      const result = await client.query(query, [correlationId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getWorkflowEvents(workflowId) {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        SELECT ae.*, iw.workflow_type, iw.workflow_name, iw.workflow_status
        FROM audit_events ae
        JOIN integration_workflows iw ON ae.workflow_id = iw.workflow_id
        WHERE ae.workflow_id = $1
        ORDER BY ae.timestamp ASC
      `;
      
      const result = await client.query(query, [workflowId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getAuditStatistics(filters = {}) {
    const client = await this.fastify.pg.connect();
    
    try {
      let query = `
        SELECT 
          tool_slug,
          event_category,
          action_result,
          COUNT(*) as event_count,
          COUNT(CASE WHEN action_result = 'success' THEN 1 END) as success_count,
          COUNT(CASE WHEN action_result = 'failure' THEN 1 END) as failure_count,
          AVG(processing_time_ms) as avg_processing_time,
          MAX(timestamp) as last_event_time
        FROM audit_events
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;
      
      if (filters.since) {
        query += ` AND timestamp >= $${paramCount}`;
        params.push(filters.since);
        paramCount++;
      }
      
      if (filters.tool_slug) {
        query += ` AND tool_slug = $${paramCount}`;
        params.push(filters.tool_slug);
        paramCount++;
      }
      
      query += ` GROUP BY tool_slug, event_category, action_result ORDER BY event_count DESC`;
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
}

module.exports = AuditManager;
