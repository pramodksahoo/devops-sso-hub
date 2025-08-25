/**
 * Enhanced Audit Service - Phase 6
 * 
 * Comprehensive audit logging service for tool integration tracking:
 * - Tool configuration changes
 * - SSO launch events per tool
 * - Webhook events from all tools
 * - Provisioning actions per tool
 * - Permission changes per tool
 * - Health status changes
 * - Cross-tool workflow correlation
 * 
 * @author SSO Hub Team
 * @version 1.0.0
 */

const Fastify = require('fastify');
const config = require('./config');
const AuditManager = require('./audit-manager');

const server = Fastify({
  logger: { level: config.LOG_LEVEL },
  bodyLimit: 10485760 // 10MB for large audit payloads
});

let auditManager;

// ===== SERVER SETUP =====

async function setupServer() {
  try {
    // 1. Register plugins
    await server.register(require('@fastify/helmet'), {
      contentSecurityPolicy: false
    });

    await server.register(require('@fastify/cors'), {
      origin: config.CORS_ORIGIN,
      credentials: true
    });

    await server.register(require('@fastify/rate-limit'), {
      max: config.RATE_LIMIT_MAX,
      timeWindow: config.RATE_LIMIT_WINDOW
    });

    // 2. Database connection
    await server.register(require('@fastify/postgres'), {
      connectionString: config.DATABASE_URL
    });

    // 3. Swagger documentation
    await server.register(require('@fastify/swagger'), {
      swagger: {
        info: {
          title: 'SSO Hub Enhanced Audit Service',
          description: 'Comprehensive audit logging for tool integration tracking',
          version: '1.0.0'
        },
        host: `${config.HOST}:${config.PORT}`,
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json'],
        tags: [
          { name: 'Audit Events', description: 'Audit event logging and retrieval' },
          { name: 'Tool Tracking', description: 'Tool-specific audit operations' },
          { name: 'Workflows', description: 'Cross-tool workflow correlation' },
          { name: 'Analytics', description: 'Audit analytics and reporting' },
          { name: 'Health', description: 'Service health and monitoring' }
        ]
      }
    });

    await server.register(require('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false
      }
    });

    // 4. Initialize audit manager
    auditManager = new AuditManager(server, config);

    server.log.info('✅ Enhanced Audit Service: All plugins registered');

  } catch (error) {
    server.log.error('Failed to setup server:', error);
    throw error;
  }
}

// ===== AUDIT EVENT ENDPOINTS =====

// Log a new audit event
server.post('/api/audit/events', {
  schema: {
    description: 'Log a new audit event',
    tags: ['Audit Events'],
    body: {
      type: 'object',
      properties: {
        event_type: { type: 'string', description: 'Type of event (e.g., sso_launch, tool_config_change)' },
        event_category: { type: 'string', enum: ['authentication', 'configuration', 'integration', 'security', 'monitoring'] },
        event_severity: { type: 'string', enum: ['critical', 'error', 'warning', 'info', 'debug'] },
        tool_slug: { type: 'string', description: 'Tool identifier' },
        tool_name: { type: 'string', description: 'Tool display name' },
        user_id: { type: 'string', description: 'User identifier' },
        user_email: { type: 'string', format: 'email' },
        session_id: { type: 'string', description: 'Session identifier' },
        action: { type: 'string', description: 'Action performed' },
        action_result: { type: 'string', enum: ['success', 'failure', 'partial', 'pending'] },
        action_details: { type: 'object', description: 'Detailed action information' },
        tool_metadata: { type: 'object', description: 'Tool-specific metadata' },
        source_ip: { type: 'string', description: 'Client IP address' },
        user_agent: { type: 'string', description: 'Client user agent' },
        processing_time_ms: { type: 'integer', description: 'Processing time in milliseconds' },
        error_message: { type: 'string', description: 'Error message if action failed' }
      },
      required: ['event_type', 'event_category', 'action', 'action_result']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          audit_event_id: { type: 'string' },
          correlation_id: { type: 'string' },
          workflow_id: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const auditEventId = await auditManager.logEvent(request.body);
    
    const event = await auditManager.getAuditEvents({ limit: 1 });
    const latestEvent = event[0];
    
    return {
      success: true,
      audit_event_id: auditEventId,
      correlation_id: latestEvent?.correlation_id,
      workflow_id: latestEvent?.workflow_id,
      message: 'Audit event logged successfully'
    };
  } catch (error) {
    server.log.error('Failed to log audit event:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to log audit event',
      details: error.message
    });
  }
});

// Get audit events with filtering
server.get('/api/audit/events', {
  schema: {
    description: 'Retrieve audit events with filtering options',
    tags: ['Audit Events'],
    querystring: {
      type: 'object',
      properties: {
        tool_slug: { type: 'string', description: 'Filter by tool' },
        user_id: { type: 'string', description: 'Filter by user' },
        event_type: { type: 'string', description: 'Filter by event type' },
        event_category: { type: 'string', enum: ['authentication', 'configuration', 'integration', 'security', 'monitoring'] },
        action_result: { type: 'string', enum: ['success', 'failure', 'partial', 'pending'] },
        since: { type: 'string', format: 'date-time', description: 'Events since this timestamp' },
        until: { type: 'string', format: 'date-time', description: 'Events until this timestamp' },
        limit: { type: 'integer', minimum: 1, maximum: 1000, default: 100 }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          events: { type: 'array' },
          count: { type: 'integer' },
          filters_applied: { type: 'object' }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const events = await auditManager.getAuditEvents(request.query);
    
    return {
      success: true,
      events,
      count: events.length,
      filters_applied: request.query
    };
  } catch (error) {
    server.log.error('Failed to retrieve audit events:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve audit events',
      details: error.message
    });
  }
});

// Get correlated events
server.get('/api/audit/events/correlation/:correlationId', {
  schema: {
    description: 'Get all events with the same correlation ID',
    tags: ['Audit Events'],
    params: {
      type: 'object',
      properties: {
        correlationId: { type: 'string', description: 'Correlation ID' }
      },
      required: ['correlationId']
    }
  }
}, async (request, reply) => {
  try {
    const events = await auditManager.getCorrelatedEvents(request.params.correlationId);
    
    return {
      success: true,
      correlation_id: request.params.correlationId,
      events,
      count: events.length
    };
  } catch (error) {
    server.log.error('Failed to retrieve correlated events:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve correlated events',
      details: error.message
    });
  }
});

// ===== WORKFLOW TRACKING ENDPOINTS =====

// Get workflow events
server.get('/api/audit/workflows/:workflowId/events', {
  schema: {
    description: 'Get all events for a specific workflow',
    tags: ['Workflows'],
    params: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', format: 'uuid', description: 'Workflow ID' }
      },
      required: ['workflowId']
    }
  }
}, async (request, reply) => {
  try {
    const events = await auditManager.getWorkflowEvents(request.params.workflowId);
    
    return {
      success: true,
      workflow_id: request.params.workflowId,
      events,
      count: events.length
    };
  } catch (error) {
    server.log.error('Failed to retrieve workflow events:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve workflow events',
      details: error.message
    });
  }
});

// Get active workflows
server.get('/api/audit/workflows/active', {
  schema: {
    description: 'Get all currently active workflows',
    tags: ['Workflows']
  }
}, async (request, reply) => {
  try {
    const client = await server.pg.connect();
    
    try {
      const query = `
        SELECT * FROM integration_workflows
        WHERE workflow_status = 'active'
        ORDER BY workflow_start DESC
      `;
      
      const result = await client.query(query);
      
      return {
        success: true,
        active_workflows: result.rows,
        count: result.rows.length
      };
    } finally {
      client.release();
    }
  } catch (error) {
    server.log.error('Failed to retrieve active workflows:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve active workflows',
      details: error.message
    });
  }
});

// ===== TOOL-SPECIFIC AUDIT ENDPOINTS =====

// Log SSO launch event
server.post('/api/audit/sso-launch', {
  schema: {
    description: 'Log an SSO launch attempt',
    tags: ['Tool Tracking'],
    body: {
      type: 'object',
      properties: {
        tool_slug: { type: 'string' },
        tool_name: { type: 'string' },
        user_id: { type: 'string' },
        user_email: { type: 'string', format: 'email' },
        session_id: { type: 'string' },
        launch_result: { type: 'string', enum: ['success', 'failure'] },
        launch_url: { type: 'string' },
        error_message: { type: 'string' },
        processing_time_ms: { type: 'integer' },
        source_ip: { type: 'string' },
        user_agent: { type: 'string' }
      },
      required: ['tool_slug', 'user_id', 'launch_result']
    }
  }
}, async (request, reply) => {
  try {
    const eventData = {
      event_type: 'sso_launch',
      event_category: 'authentication',
      integration_type: 'sso',
      action: 'launch',
      action_result: request.body.launch_result,
      tool_slug: request.body.tool_slug,
      tool_name: request.body.tool_name,
      user_id: request.body.user_id,
      user_email: request.body.user_email,
      session_id: request.body.session_id,
      processing_time_ms: request.body.processing_time_ms,
      error_message: request.body.error_message,
      source_ip: request.body.source_ip,
      user_agent: request.body.user_agent,
      action_details: {
        launch_url: request.body.launch_url
      },
      tool_metadata: {
        launch_type: 'sso_redirect',
        launch_timestamp: new Date().toISOString()
      }
    };
    
    const auditEventId = await auditManager.logEvent(eventData);
    
    return {
      success: true,
      audit_event_id: auditEventId,
      message: 'SSO launch event logged'
    };
  } catch (error) {
    server.log.error('Failed to log SSO launch event:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to log SSO launch event',
      details: error.message
    });
  }
});

// Log tool configuration change
server.post('/api/audit/config-change', {
  schema: {
    description: 'Log a tool configuration change',
    tags: ['Tool Tracking'],
    body: {
      type: 'object',
      properties: {
        tool_slug: { type: 'string' },
        tool_name: { type: 'string' },
        change_type: { type: 'string' },
        changed_by: { type: 'string' },
        changed_by_email: { type: 'string', format: 'email' },
        previous_config: { type: 'object' },
        new_config: { type: 'object' },
        change_reason: { type: 'string' }
      },
      required: ['tool_slug', 'change_type', 'changed_by']
    }
  }
}, async (request, reply) => {
  try {
    const eventData = {
      event_type: 'tool_config_change',
      event_category: 'configuration',
      action: 'configure',
      action_result: 'success',
      tool_slug: request.body.tool_slug,
      tool_name: request.body.tool_name,
      user_id: request.body.changed_by,
      user_email: request.body.changed_by_email,
      configuration_changes: {
        change_type: request.body.change_type,
        previous_config: request.body.previous_config,
        new_config: request.body.new_config,
        change_reason: request.body.change_reason
      },
      tool_metadata: {
        config_section: request.body.change_type,
        change_timestamp: new Date().toISOString()
      }
    };
    
    const auditEventId = await auditManager.logEvent(eventData);
    
    return {
      success: true,
      audit_event_id: auditEventId,
      message: 'Configuration change logged'
    };
  } catch (error) {
    server.log.error('Failed to log configuration change:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to log configuration change',
      details: error.message
    });
  }
});

// Log webhook processing result
server.post('/api/audit/webhook-processing', {
  schema: {
    description: 'Log webhook processing result',
    tags: ['Tool Tracking'],
    body: {
      type: 'object',
      properties: {
        tool_slug: { type: 'string' },
        webhook_event_type: { type: 'string' },
        processing_result: { type: 'string', enum: ['success', 'failure'] },
        processing_time_ms: { type: 'integer' },
        error_message: { type: 'string' },
        webhook_id: { type: 'string' },
        payload_size: { type: 'integer' }
      },
      required: ['tool_slug', 'webhook_event_type', 'processing_result']
    }
  }
}, async (request, reply) => {
  try {
    const eventData = {
      event_type: 'webhook_processing',
      event_category: 'integration',
      integration_type: 'webhook',
      action: 'process_webhook',
      action_result: request.body.processing_result,
      tool_slug: request.body.tool_slug,
      processing_time_ms: request.body.processing_time_ms,
      error_message: request.body.error_message,
      action_details: {
        webhook_event_type: request.body.webhook_event_type,
        webhook_id: request.body.webhook_id,
        payload_size: request.body.payload_size
      },
      tool_metadata: {
        webhook_processing_timestamp: new Date().toISOString()
      }
    };
    
    const auditEventId = await auditManager.logEvent(eventData);
    
    return {
      success: true,
      audit_event_id: auditEventId,
      message: 'Webhook processing logged'
    };
  } catch (error) {
    server.log.error('Failed to log webhook processing:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to log webhook processing',
      details: error.message
    });
  }
});

// ===== ANALYTICS ENDPOINTS =====

// Get audit statistics
server.get('/api/audit/statistics', {
  schema: {
    description: 'Get audit statistics and analytics',
    tags: ['Analytics'],
    querystring: {
      type: 'object',
      properties: {
        since: { type: 'string', format: 'date-time' },
        tool_slug: { type: 'string' },
        group_by: { type: 'string', enum: ['tool', 'category', 'result', 'hour', 'day'] }
      }
    }
  }
}, async (request, reply) => {
  try {
    const statistics = await auditManager.getAuditStatistics(request.query);
    
    return {
      success: true,
      statistics,
      filters_applied: request.query,
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    server.log.error('Failed to retrieve audit statistics:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve audit statistics',
      details: error.message
    });
  }
});

// Get tool usage analytics
server.get('/api/audit/analytics/tool-usage', {
  schema: {
    description: 'Get tool usage analytics',
    tags: ['Analytics'],
    querystring: {
      type: 'object',
      properties: {
        since: { type: 'string', format: 'date-time' },
        until: { type: 'string', format: 'date-time' },
        group_by: { type: 'string', enum: ['hour', 'day', 'week'], default: 'day' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const client = await server.pg.connect();
    
    try {
      const interval = request.query.group_by || 'day';
      let query = `
        SELECT 
          tool_slug,
          DATE_TRUNC($1, timestamp) as time_period,
          COUNT(*) as event_count,
          COUNT(CASE WHEN action_result = 'success' THEN 1 END) as success_count,
          COUNT(CASE WHEN action_result = 'failure' THEN 1 END) as failure_count,
          COUNT(DISTINCT user_id) as unique_users
        FROM audit_events
        WHERE 1=1
      `;
      
      const params = [interval];
      let paramCount = 2;
      
      if (request.query.since) {
        query += ` AND timestamp >= $${paramCount}`;
        params.push(request.query.since);
        paramCount++;
      }
      
      if (request.query.until) {
        query += ` AND timestamp <= $${paramCount}`;
        params.push(request.query.until);
        paramCount++;
      }
      
      query += ` GROUP BY tool_slug, time_period ORDER BY time_period DESC, event_count DESC`;
      
      const result = await client.query(query, params);
      
      return {
        success: true,
        analytics: result.rows,
        group_by: interval,
        generated_at: new Date().toISOString()
      };
    } finally {
      client.release();
    }
  } catch (error) {
    server.log.error('Failed to retrieve tool usage analytics:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve tool usage analytics',
      details: error.message
    });
  }
});

// ===== HEALTH AND MONITORING =====

server.get('/healthz', {
  schema: {
    description: 'Health check endpoint',
    tags: ['Health']
  }
}, async (request, reply) => {
  return {
    status: 'ok',
    service: 'enhanced-audit',
    timestamp: new Date().toISOString()
  };
});

server.get('/readyz', {
  schema: {
    description: 'Readiness check endpoint',
    tags: ['Health']
  }
}, async (request, reply) => {
  try {
    // Test database connection
    await server.pg.query('SELECT 1');
    
    return {
      status: 'ready',
      service: 'enhanced-audit',
      timestamp: new Date().toISOString(),
      database: 'connected',
      features: {
        AUDIT_LOGGING: true,
        CORRELATION_TRACKING: true,
        WORKFLOW_ANALYSIS: true,
        TOOL_INTEGRATION_TRACKING: true,
        REAL_TIME_PROCESSING: config.ENABLE_REAL_TIME_PROCESSING,
        PII_MASKING: config.ENABLE_PII_MASKING
      }
    };
  } catch (error) {
    return reply.status(503).send({
      status: 'not ready',
      service: 'enhanced-audit',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// ===== GRACEFUL SHUTDOWN =====

const gracefulShutdown = async (signal) => {
  server.log.info(`🛑 Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Flush any pending audit events
    if (auditManager) {
      await auditManager.flushBuffers();
    }
    
    await server.close();
    server.log.info('✅ Enhanced Audit Service: Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    server.log.error('❌ Shutdown error:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ===== START SERVER =====

const start = async () => {
  try {
    await setupServer();
    
    const port = parseInt(config.PORT, 10);
    const host = config.HOST;
    
    await server.listen({ port, host });
    
    server.log.info(`🚀 Enhanced Audit Service listening on ${host}:${port}`);
    server.log.info('🎯 Phase 6: Enhanced audit with comprehensive tool integration tracking ready');
    server.log.info(`📚 API Documentation available at http://${host}:${port}/docs`);
    server.log.info('📊 Features: Tool tracking, workflow correlation, cross-tool audit trails');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
