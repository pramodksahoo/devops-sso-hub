/**
 * Webhook Ingress Service - Phase 5
 * 
 * Comprehensive webhook ingress service for all 11 DevOps tools:
 * - GitHub, GitLab, Jenkins, Argo CD, Terraform, SonarQube
 * - Grafana, Prometheus, Kibana, Snyk, Jira, ServiceNow
 * 
 * Features:
 * - Tool-specific webhook signature validation
 * - Event processing and normalization
 * - Multi-channel notifications (email, Slack, Teams, webhook)
 * - Comprehensive audit logging
 * - Performance monitoring and analytics
 * 
 * @author SSO Hub Team
 * @version 1.0.0
 */

const Fastify = require('fastify');
const config = require('./config');
const DatabaseManager = require('./database-manager');
const WebhookHandlers = require('./webhook-handlers');
const NotificationService = require('./notification-service');

const server = Fastify({
  logger: { level: config.LOG_LEVEL },
  bodyLimit: 10485760 // 10MB
});

let databaseManager;
let webhookHandlers;
let notificationService;

// ===== SERVER SETUP =====

async function setupServer() {
  try {
    // 1. Register plugins in order
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
          title: 'SSO Hub Webhook Ingress Service',
          description: 'Comprehensive webhook processing for DevOps tools',
          version: '1.0.0'
        },
        host: `${config.HOST}:${config.PORT}`,
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json'],
        tags: [
          { name: 'Webhooks', description: 'Webhook ingress endpoints' },
          { name: 'Management', description: 'Webhook management endpoints' },
          { name: 'Notifications', description: 'Notification management' },
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

    // 4. Initialize services
    databaseManager = new DatabaseManager(server);
    notificationService = new NotificationService(server, config, databaseManager);
    webhookHandlers = new WebhookHandlers(server, config, databaseManager, notificationService);
    
    // 5. Register axios for audit service calls
    const axios = require('axios');
    server.decorate('axios', axios);

    server.log.info('✅ Webhook Ingress Service: All plugins registered');

  } catch (error) {
    server.log.error('Failed to setup server:', error);
    throw error;
  }
}

// ===== WEBHOOK INGRESS ENDPOINTS =====

// Generic webhook endpoint for all tools
server.post('/webhooks/:toolSlug', {
  schema: {
    description: 'Generic webhook endpoint for any supported tool',
    tags: ['Webhooks'],
    params: {
      type: 'object',
      properties: {
        toolSlug: { 
          type: 'string', 
          enum: ['github', 'gitlab', 'jenkins', 'argocd', 'terraform', 'sonarqube', 'grafana', 'prometheus', 'kibana', 'snyk', 'jira', 'servicenow'],
          description: 'Tool identifier'
        }
      },
      required: ['toolSlug']
    },
    body: {
      type: 'object',
      description: 'Webhook payload from the tool'
    }
  }
}, async (request, reply) => {
  const startTime = Date.now();
  const { toolSlug } = request.params;
  const rawBody = request.body;
  const headers = request.headers;

  try {
    server.log.info(`Received webhook from ${toolSlug}`, {
      toolSlug,
      event: headers['x-github-event'] || headers['x-gitlab-event'] || headers['x-jenkins-event'] || 'unknown',
      userAgent: headers['user-agent']
    });

    // 1. Validate tool configuration
    const tool = await databaseManager.getToolBySlug(toolSlug);
    if (!tool) {
      return reply.status(404).send({ error: 'Tool not found', tool: toolSlug });
    }

          // 2. Get webhook secret for signature validation
      const webhookSecret = await databaseManager.getWebhookSecret(tool.id);
      if (!webhookSecret) {
        server.log.warn(`No webhook secret found for tool: ${toolSlug}`);
        // Continue without signature validation for now
      }

      // 3. Validate webhook signature (skip for testing with placeholder secrets)
      if (webhookSecret && !webhookSecret.secret_value_encrypted.includes('PLACEHOLDER')) {
        const isValidSignature = await webhookHandlers.validateWebhookSignature(
          toolSlug, 
          headers, 
          JSON.stringify(rawBody), 
          webhookSecret.secret_value_encrypted // In production, this would be decrypted
        );

        if (!isValidSignature) {
          server.log.warn(`Invalid webhook signature for ${toolSlug}`);
          return reply.status(401).send({ error: 'Invalid signature' });
        }
      } else {
        server.log.info(`Skipping signature validation for ${toolSlug} (testing mode)`);
      }

    // 4. Process webhook based on tool type
    let normalizedEvent;
    
    switch (toolSlug) {
      case 'github':
        normalizedEvent = await webhookHandlers.handleGitHubWebhook(rawBody, headers);
        break;
      case 'gitlab':
        normalizedEvent = await webhookHandlers.handleGitLabWebhook(rawBody, headers);
        break;
      case 'jenkins':
        normalizedEvent = await webhookHandlers.handleJenkinsWebhook(rawBody, headers);
        break;
      case 'argocd':
        normalizedEvent = await webhookHandlers.handleArgoCDWebhook(rawBody, headers);
        break;
      case 'terraform':
        normalizedEvent = await webhookHandlers.handleTerraformWebhook(rawBody, headers);
        break;
      case 'sonarqube':
        normalizedEvent = await webhookHandlers.handleSonarQubeWebhook(rawBody, headers);
        break;
      case 'grafana':
        normalizedEvent = await webhookHandlers.handleGrafanaWebhook(rawBody, headers);
        break;
      case 'prometheus':
        normalizedEvent = await webhookHandlers.handlePrometheusWebhook(rawBody, headers);
        break;
      case 'kibana':
        normalizedEvent = await webhookHandlers.handleKibanaWebhook(rawBody, headers);
        break;
      case 'snyk':
        normalizedEvent = await webhookHandlers.handleSnykWebhook(rawBody, headers);
        break;
      case 'jira':
        normalizedEvent = await webhookHandlers.handleJiraWebhook(rawBody, headers);
        break;
      case 'servicenow':
        normalizedEvent = await webhookHandlers.handleServiceNowWebhook(rawBody, headers);
        break;
      default:
        return reply.status(400).send({ error: 'Unsupported tool', tool: toolSlug });
    }

    // 5. Process and route the event
    const deliveryRecord = await webhookHandlers.processWebhookEvent(toolSlug, normalizedEvent);

    // 6. Log audit event for webhook processing
    const processingTime = Date.now() - startTime;
    try {
      await server.axios.post(`${config.AUDIT_SERVICE_URL}/api/audit/webhook-processing`, {
        tool_slug: toolSlug,
        webhook_event_type: normalizedEvent.event_type,
        processing_result: 'success',
        processing_time_ms: processingTime,
        webhook_id: deliveryRecord.id,
        payload_size: JSON.stringify(rawBody).length
      });
    } catch (auditError) {
      server.log.warn('Failed to log webhook audit event:', auditError.message);
    }

    // Track performance metrics for webhook processing
    try {
      const currentHour = new Date();
      currentHour.setMinutes(0, 0, 0);
      const nextHour = new Date(currentHour.getTime() + 60 * 60 * 1000);
      
      await server.axios.post(`${config.ANALYTICS_SERVICE_URL}/api/analytics/performance`, {
        tool_slug: toolSlug,
        metric_type: 'webhook_processing_time',
        metric_category: 'performance',
        metric_value: processingTime,
        metric_unit: 'milliseconds',
        aggregation_period: 'hour',
        period_start: currentHour.toISOString(),
        period_end: nextHour.toISOString()
      });

      // Track webhook delivery success rate
      await server.axios.post(`${config.ANALYTICS_SERVICE_URL}/api/analytics/performance`, {
        tool_slug: toolSlug,
        metric_type: 'webhook_delivery_success_rate',
        metric_category: 'reliability',
        metric_value: 100,
        metric_unit: 'percentage',
        aggregation_period: 'hour',
        period_start: currentHour.toISOString(),
        period_end: nextHour.toISOString()
      });
    } catch (analyticsError) {
      server.log.warn('Failed to track webhook performance metrics:', analyticsError.message);
    }

    // 7. Send response
    server.log.info(`Webhook processed successfully for ${toolSlug}`, {
      toolSlug,
      eventType: normalizedEvent.event_type,
      processingTime,
      deliveryId: deliveryRecord.id
    });

    return {
      success: true,
      tool: toolSlug,
      event_type: normalizedEvent.event_type,
      event_id: normalizedEvent.event_id,
      delivery_id: deliveryRecord.id,
      processing_time_ms: processingTime
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    server.log.error(`Webhook processing failed for ${toolSlug}:`, error);

    // Record failed delivery
    try {
      await databaseManager.createWebhookDelivery({
        tool_slug: toolSlug,
        event_type: 'unknown',
        delivery_status: 'failed',
        http_status_code: 500,
        request_headers: headers,
        request_body: rawBody,
        error_message: error.message,
        delivery_attempts: 1
      });
    } catch (dbError) {
      server.log.error('Failed to record failed delivery:', dbError);
    }

    return reply.status(500).send({
      error: 'Webhook processing failed',
      tool: toolSlug,
      details: error.message,
      processing_time_ms: processingTime
    });
  }
});

// Tool-specific webhook endpoints (for tools that require specific URLs)
const toolSpecificEndpoints = [
  { tool: 'github', path: '/github' },
  { tool: 'gitlab', path: '/gitlab' },
  { tool: 'jenkins', path: '/jenkins' },
  { tool: 'argocd', path: '/argocd' },
  { tool: 'terraform', path: '/terraform' },
  { tool: 'sonarqube', path: '/sonarqube' },
  { tool: 'grafana', path: '/grafana' },
  { tool: 'prometheus', path: '/prometheus' },
  { tool: 'kibana', path: '/kibana' },
  { tool: 'snyk', path: '/snyk' },
  { tool: 'jira', path: '/jira' },
  { tool: 'servicenow', path: '/servicenow' }
];

// Register tool-specific endpoints that redirect to the generic handler
toolSpecificEndpoints.forEach(({ tool, path }) => {
  server.post(`/webhooks${path}`, async (request, reply) => {
    // Manually call the generic webhook handler
    const startTime = Date.now();
    const toolSlug = tool;
    const rawBody = request.body;
    const headers = request.headers;

    try {
      server.log.info(`Received webhook from ${toolSlug} (tool-specific endpoint)`, {
        toolSlug,
        event: headers['x-github-event'] || headers['x-gitlab-event'] || headers['x-jenkins-event'] || 'unknown',
        userAgent: headers['user-agent']
      });

      // 1. Validate tool configuration
      const toolRecord = await databaseManager.getToolBySlug(toolSlug);
      if (!toolRecord) {
        return reply.status(404).send({ error: 'Tool not found', tool: toolSlug });
      }

      // 2. Get webhook secret for signature validation (skip for testing with placeholder secrets)
      const webhookSecret = await databaseManager.getWebhookSecret(toolRecord.id);
      if (webhookSecret && !webhookSecret.secret_value_encrypted.includes('PLACEHOLDER')) {
        const isValidSignature = await webhookHandlers.validateWebhookSignature(
          toolSlug, 
          headers, 
          JSON.stringify(rawBody), 
          webhookSecret.secret_value_encrypted
        );

        if (!isValidSignature) {
          server.log.warn(`Invalid webhook signature for ${toolSlug}`);
          return reply.status(401).send({ error: 'Invalid signature' });
        }
      } else {
        server.log.info(`Skipping signature validation for ${toolSlug} (testing mode)`);
      }

      // 3. Process webhook based on tool type
      let normalizedEvent;
      
      switch (toolSlug) {
        case 'github':
          normalizedEvent = await webhookHandlers.handleGitHubWebhook(rawBody, headers);
          break;
        case 'gitlab':
          normalizedEvent = await webhookHandlers.handleGitLabWebhook(rawBody, headers);
          break;
        case 'jenkins':
          normalizedEvent = await webhookHandlers.handleJenkinsWebhook(rawBody, headers);
          break;
        case 'argocd':
          normalizedEvent = await webhookHandlers.handleArgoCDWebhook(rawBody, headers);
          break;
        case 'terraform':
          normalizedEvent = await webhookHandlers.handleTerraformWebhook(rawBody, headers);
          break;
        case 'sonarqube':
          normalizedEvent = await webhookHandlers.handleSonarQubeWebhook(rawBody, headers);
          break;
        case 'grafana':
          normalizedEvent = await webhookHandlers.handleGrafanaWebhook(rawBody, headers);
          break;
        case 'prometheus':
          normalizedEvent = await webhookHandlers.handlePrometheusWebhook(rawBody, headers);
          break;
        case 'kibana':
          normalizedEvent = await webhookHandlers.handleKibanaWebhook(rawBody, headers);
          break;
        case 'snyk':
          normalizedEvent = await webhookHandlers.handleSnykWebhook(rawBody, headers);
          break;
        case 'jira':
          normalizedEvent = await webhookHandlers.handleJiraWebhook(rawBody, headers);
          break;
        case 'servicenow':
          normalizedEvent = await webhookHandlers.handleServiceNowWebhook(rawBody, headers);
          break;
        default:
          return reply.status(400).send({ error: 'Unsupported tool', tool: toolSlug });
      }

      // 4. Process and route the event
      const deliveryRecord = await webhookHandlers.processWebhookEvent(toolSlug, normalizedEvent);

      // 5. Send response
      const processingTime = Date.now() - startTime;
      server.log.info(`Webhook processed successfully for ${toolSlug} (tool-specific endpoint)`, {
        toolSlug,
        eventType: normalizedEvent.event_type,
        processingTime,
        deliveryId: deliveryRecord.id
      });

      return {
        success: true,
        tool: toolSlug,
        event_type: normalizedEvent.event_type,
        event_id: normalizedEvent.event_id,
        delivery_id: deliveryRecord.id,
        processing_time_ms: processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      server.log.error(`Webhook processing failed for ${toolSlug} (tool-specific endpoint):`, error);

      // Record failed delivery
      try {
        await databaseManager.createWebhookDelivery({
          tool_slug: toolSlug,
          event_type: 'unknown',
          delivery_status: 'failed',
          http_status_code: 500,
          request_headers: headers,
          request_body: rawBody,
          error_message: error.message,
          delivery_attempts: 1
        });
      } catch (dbError) {
        server.log.error('Failed to record failed delivery:', dbError);
      }

      return reply.status(500).send({
        error: 'Webhook processing failed',
        tool: toolSlug,
        details: error.message,
        processing_time_ms: processingTime
      });
    }
  });
});

// ===== MANAGEMENT ENDPOINTS =====

server.get('/api/webhooks/deliveries', {
  schema: {
    description: 'Get webhook delivery history with filtering options',
    tags: ['Management'],
    querystring: {
      type: 'object',
      properties: {
        tool_slug: { type: 'string' },
        event_type: { type: 'string' },
        delivery_status: { type: 'string', enum: ['pending', 'delivered', 'failed', 'retrying'] },
        since: { type: 'string', format: 'date-time' },
        limit: { type: 'integer', minimum: 1, maximum: 1000, default: 100 }
      }
    }
  }
}, async (request, reply) => {
  try {
    const deliveries = await databaseManager.getWebhookDeliveries(request.query);
    return {
      success: true,
      deliveries,
      count: deliveries.length
    };
  } catch (error) {
    server.log.error('Failed to get webhook deliveries:', error);
    return reply.status(500).send({ error: 'Failed to retrieve webhook deliveries' });
  }
});

server.get('/api/webhooks/stats', {
  schema: {
    description: 'Get webhook delivery statistics',
    tags: ['Management'],
    querystring: {
      type: 'object',
      properties: {
        since: { type: 'string', format: 'date-time' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const [webhookStats, notificationStats] = await Promise.all([
      databaseManager.getWebhookStats(request.query),
      databaseManager.getNotificationStats(request.query)
    ]);

    return {
      success: true,
      webhook_stats: webhookStats,
      notification_stats: notificationStats,
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    server.log.error('Failed to get webhook stats:', error);
    return reply.status(500).send({ error: 'Failed to retrieve webhook statistics' });
  }
});

server.post('/api/webhooks/retry-failed', {
  schema: {
    description: 'Retry failed webhook deliveries',
    tags: ['Management'],
    body: {
      type: 'object',
      properties: {
        max_retries: { type: 'integer', minimum: 1, maximum: 10, default: 3 }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { max_retries = 3 } = request.body;
    const retriedDeliveries = await databaseManager.retryFailedDeliveries(max_retries);
    
    return {
      success: true,
      retried_count: retriedDeliveries.length,
      retried_deliveries: retriedDeliveries.map(d => ({
        id: d.id,
        tool_slug: d.tool_slug,
        event_type: d.event_type,
        attempts: d.delivery_attempts
      }))
    };
  } catch (error) {
    server.log.error('Failed to retry failed deliveries:', error);
    return reply.status(500).send({ error: 'Failed to retry failed deliveries' });
  }
});

// ===== NOTIFICATION RULE MANAGEMENT =====

server.get('/api/notifications/rules/:toolId', {
  schema: {
    description: 'Get notification rules for a specific tool',
    tags: ['Notifications'],
    params: {
      type: 'object',
      properties: {
        toolId: { type: 'string', format: 'uuid' }
      },
      required: ['toolId']
    }
  }
}, async (request, reply) => {
  try {
    const rules = await databaseManager.getNotificationRulesByTool(request.params.toolId);
    return {
      success: true,
      rules,
      count: rules.length
    };
  } catch (error) {
    server.log.error('Failed to get notification rules:', error);
    return reply.status(500).send({ error: 'Failed to retrieve notification rules' });
  }
});

server.post('/api/notifications/rules', {
  schema: {
    description: 'Create a new notification rule',
    tags: ['Notifications'],
    body: {
      type: 'object',
      properties: {
        tool_id: { type: 'string', format: 'uuid' },
        rule_name: { type: 'string' },
        event_types: { type: 'array', items: { type: 'string' } },
        conditions: { type: 'object' },
        notification_channels: { type: 'array', items: { type: 'string' } },
        notification_config: { type: 'object' },
        is_active: { type: 'boolean', default: true }
      },
      required: ['tool_id', 'rule_name', 'event_types', 'notification_channels']
    }
  }
}, async (request, reply) => {
  try {
    const rule = await databaseManager.createNotificationRule({
      ...request.body,
      created_by: 'api-user' // In production, get from authentication
    });
    
    return {
      success: true,
      rule,
      message: 'Notification rule created successfully'
    };
  } catch (error) {
    server.log.error('Failed to create notification rule:', error);
    return reply.status(500).send({ error: 'Failed to create notification rule' });
  }
});

server.put('/api/notifications/rules/:ruleId', {
  schema: {
    description: 'Update a notification rule',
    tags: ['Notifications'],
    params: {
      type: 'object',
      properties: {
        ruleId: { type: 'string', format: 'uuid' }
      },
      required: ['ruleId']
    },
    body: {
      type: 'object',
      properties: {
        rule_name: { type: 'string' },
        event_types: { type: 'array', items: { type: 'string' } },
        conditions: { type: 'object' },
        notification_channels: { type: 'array', items: { type: 'string' } },
        notification_config: { type: 'object' },
        is_active: { type: 'boolean' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const rule = await databaseManager.updateNotificationRule(request.params.ruleId, request.body);
    
    if (!rule) {
      return reply.status(404).send({ error: 'Notification rule not found' });
    }
    
    return {
      success: true,
      rule,
      message: 'Notification rule updated successfully'
    };
  } catch (error) {
    server.log.error('Failed to update notification rule:', error);
    return reply.status(500).send({ error: 'Failed to update notification rule' });
  }
});

server.delete('/api/notifications/rules/:ruleId', {
  schema: {
    description: 'Delete a notification rule',
    tags: ['Notifications'],
    params: {
      type: 'object',
      properties: {
        ruleId: { type: 'string', format: 'uuid' }
      },
      required: ['ruleId']
    }
  }
}, async (request, reply) => {
  try {
    const rule = await databaseManager.deleteNotificationRule(request.params.ruleId);
    
    if (!rule) {
      return reply.status(404).send({ error: 'Notification rule not found' });
    }
    
    return {
      success: true,
      message: 'Notification rule deleted successfully'
    };
  } catch (error) {
    server.log.error('Failed to delete notification rule:', error);
    return reply.status(500).send({ error: 'Failed to delete notification rule' });
  }
});

// ===== WEBHOOK EVENT TYPES =====

server.get('/api/webhooks/event-types', {
  schema: {
    description: 'Get all supported webhook event types',
    tags: ['Management'],
    querystring: {
      type: 'object',
      properties: {
        tool_slug: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const eventTypes = request.query.tool_slug 
      ? await databaseManager.getWebhookEventTypes(request.query.tool_slug)
      : await databaseManager.getAllWebhookEventTypes();
    
    return {
      success: true,
      event_types: eventTypes,
      count: eventTypes.length
    };
  } catch (error) {
    server.log.error('Failed to get webhook event types:', error);
    return reply.status(500).send({ error: 'Failed to retrieve webhook event types' });
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
    service: 'webhook-ingress',
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
      service: 'webhook-ingress',
      timestamp: new Date().toISOString(),
      database: 'connected',
      features: {
        WEBHOOK_PROCESSING: true,
        SIGNATURE_VALIDATION: true,
        NOTIFICATION_ROUTING: true,
        MULTI_CHANNEL_NOTIFICATIONS: true
      }
    };
  } catch (error) {
    return reply.status(503).send({
      status: 'not ready',
      service: 'webhook-ingress',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// ===== GRACEFUL SHUTDOWN =====

const gracefulShutdown = async (signal) => {
  server.log.info(`🛑 Received ${signal}, starting graceful shutdown...`);
  
  try {
    await server.close();
    server.log.info('✅ Webhook Ingress Service: Graceful shutdown completed');
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
    
    server.log.info(`🚀 Webhook Ingress Service listening on ${host}:${port}`);
    server.log.info('🎯 Phase 5: Comprehensive webhook processing for all 11 DevOps tools ready');
    server.log.info(`📚 API Documentation available at http://${host}:${port}/docs`);
    server.log.info('🔗 Supported tools: GitHub, GitLab, Jenkins, Argo CD, Terraform, SonarQube, Grafana, Prometheus, Kibana, Snyk, Jira, ServiceNow');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
