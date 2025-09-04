/**
 * Notifier Service - Main Entry Point
 * Centralized notification and alerting service for SSO Hub
 */

const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    } : undefined
  }
});

const config = require('./config');

// Service dependencies
const DatabaseManager = require('./services/database-manager');
const NotificationChannels = require('./services/notification-channels');
const TemplateEngine = require('./services/template-engine');
const NotificationProcessor = require('./services/notification-processor');
const AuditLogger = require('./services/audit-logger');

// Zod validation
const { z } = require('zod');

// Service instances
let databaseManager;
let notificationChannels;
let templateEngine;
let notificationProcessor;
let auditLogger;

// ============================================================================
// FASTIFY PLUGINS AND MIDDLEWARE
// ============================================================================

const setupServer = async () => {
  // Register core plugins
  await fastify.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  });

  await fastify.register(require('@fastify/cors'), {
    origin: config.CORS_ORIGIN,
    credentials: true
  });

  await fastify.register(require('@fastify/rate-limit'), {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW
  });

  // Database connection
  await fastify.register(require('@fastify/postgres'), {
    connectionString: config.DATABASE_URL
  });

  // Redis connection
  await fastify.register(require('@fastify/redis'), {
    url: config.REDIS_URL,
    db: config.REDIS_DB
  });

  // OpenAPI documentation
  await fastify.register(require('@fastify/swagger'), {
    swagger: {
      info: {
        title: 'SSO Hub Notifier Service API',
        description: 'Centralized notification and alerting service for SSO Hub that handles all system notifications, alerts, and communication across all integrated DevOps tools and services',
        version: '1.0.0',
        contact: {
          name: 'SSO Hub Team',
          email: 'support@sso-hub.com'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      host: `${config.HOST}:${config.PORT}`,
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'Health', description: 'Service health and status endpoints' },
        { name: 'Notifications', description: 'Notification management endpoints' },
        { name: 'Templates', description: 'Notification template management' },
        { name: 'Channels', description: 'Notification channel management' },
        { name: 'Delivery', description: 'Notification delivery and tracking' },
        { name: 'Queue', description: 'Queue management and statistics' }
      ],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header'
        }
      }
    }
  });

  await fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    }
  });

  fastify.log.info('✅ Notifier Service: Core plugins registered');
};

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const NotificationSchema = z.object({
  external_id: z.string().optional(),
  type: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  title: z.string().min(1).max(500),
  message: z.string().min(1),
  html_message: z.string().optional(),
  recipients: z.array(z.string()).min(1),
  channels: z.array(z.enum(['email', 'slack', 'webhook', 'sms', 'teams'])).min(1),
  template_id: z.string().uuid().optional(),
  metadata: z.record(z.any()).default({}),
  source_service: z.string().optional(),
  source_tool: z.string().optional(),
  user_id: z.string().optional(),
  scheduled_at: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional(),
  max_retries: z.number().int().min(0).max(10).default(3)
});

const TemplateSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(100),
  subject_template: z.string().min(1),
  body_template: z.string().min(1),
  html_template: z.string().optional(),
  variables: z.array(z.string()).default([]),
  supported_channels: z.array(z.enum(['email', 'slack', 'webhook', 'sms', 'teams'])).default([]),
  tool_id: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  enabled: z.boolean().default(true)
});

const ChannelSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['email', 'slack', 'webhook', 'sms', 'teams']),
  description: z.string().optional(),
  configuration: z.record(z.any()),
  enabled: z.boolean().default(true),
  test_endpoint: z.string().url().optional()
});

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

fastify.addHook('preHandler', async (request, reply) => {
  // Skip auth for health endpoints and docs
  if (request.url.startsWith('/healthz') || 
      request.url.startsWith('/readyz') || 
      request.url.startsWith('/docs') || 
      request.url.startsWith('/swagger')) {
    return;
  }

  // Validate identity headers
  const userSub = request.headers['x-user-sub'];
  const userEmail = request.headers['x-user-email'];
  const userRoles = request.headers['x-user-roles'];

  if (!userSub || !userEmail) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Missing required identity headers'
    });
    return;
  }

  // Attach user context to request
  request.user = {
    sub: userSub,
    email: userEmail,
    roles: userRoles ? userRoles.split(',') : []
  };
});

// ============================================================================
// HEALTH CHECK ENDPOINTS
// ============================================================================

fastify.get('/healthz', {
  schema: {
    tags: ['Health'],
    summary: 'Basic health check',
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
          version: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
});

fastify.get('/readyz', {
  schema: {
    tags: ['Health'],
    summary: 'Readiness check with dependencies',
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
          dependencies: { type: 'object' },
          queue_status: { type: 'object' },
          processing_status: { type: 'object' }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const dbHealth = await databaseManager.getHealthStatus();
    const queueStats = await notificationProcessor.getQueueStats();
    const processingStatus = notificationProcessor.getProcessingStatus();
    const channelHealth = notificationChannels.getChannelHealth();

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbHealth,
        channels: channelHealth
      },
      queue_status: queueStats,
      processing_status: processingStatus
    };
  } catch (error) {
    reply.code(503).send({
      status: 'not ready',
      error: error.message
    });
  }
});

// ============================================================================
// NOTIFICATION MANAGEMENT ENDPOINTS
// ============================================================================

fastify.post('/api/notifications', {
  schema: {
    tags: ['Notifications'],
    summary: 'Create a new notification',
    body: {
      type: 'object',
      required: ['type', 'title', 'message', 'recipients', 'channels'],
      properties: {
        external_id: { type: 'string' },
        type: { type: 'string', minLength: 1 },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
        title: { type: 'string', minLength: 1, maxLength: 500 },
        message: { type: 'string', minLength: 1 },
        html_message: { type: 'string' },
        recipients: { type: 'array', items: { type: 'string' }, minItems: 1 },
        channels: { type: 'array', items: { type: 'string', enum: ['email', 'slack', 'webhook', 'sms', 'teams'] }, minItems: 1 },
        template_id: { type: 'string', format: 'uuid' },
        metadata: { type: 'object' },
        source_service: { type: 'string' },
        source_tool: { type: 'string' },
        user_id: { type: 'string' },
        scheduled_at: { type: 'string', format: 'date-time' },
        expires_at: { type: 'string', format: 'date-time' },
        max_retries: { type: 'integer', minimum: 0, maximum: 10 }
      }
    },
    response: {
      201: {
        type: 'object',
        properties: {
          notification_id: { type: 'string' },
          status: { type: 'string' },
          created_at: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const notificationData = { ...request.body, created_by: request.user.sub };
    const notification = await databaseManager.createNotification(notificationData);
    
    // Queue for processing
    const queueResult = await notificationProcessor.queueNotification(notification);
    
    // Log to audit
    await auditLogger.logNotificationCreated(notification, request.user.sub);

    reply.code(201).send({
      notification_id: notification.notification_id,
      status: notification.status,
      created_at: notification.created_at,
      queue_result: queueResult
    });
  } catch (error) {
    fastify.log.error('Failed to create notification:', error);
    reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

fastify.get('/api/notifications', {
  schema: {
    tags: ['Notifications'],
    summary: 'List notifications with filtering',
    querystring: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        priority: { type: 'string' },
        status: { type: 'string' },
        source_service: { type: 'string' },
        source_tool: { type: 'string' },
        user_id: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        offset: { type: 'integer', minimum: 0, default: 0 }
      }
    }
  }
}, async (request, reply) => {
  try {
    const notifications = await databaseManager.listNotifications(request.query);
    
    return {
      notifications: notifications,
      count: notifications.length,
      filters: request.query
    };
  } catch (error) {
    fastify.log.error('Failed to list notifications:', error);
    reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

fastify.get('/api/notifications/:id', {
  schema: {
    tags: ['Notifications'],
    summary: 'Get notification details',
    params: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' }
      },
      required: ['id']
    }
  }
}, async (request, reply) => {
  try {
    const notification = await databaseManager.getNotification(request.params.id);
    
    if (!notification) {
      reply.code(404).send({
        error: 'Not Found',
        message: 'Notification not found'
      });
      return;
    }

    const deliveries = await databaseManager.getDeliveriesByNotification(request.params.id);
    
    return {
      ...notification,
      deliveries: deliveries
    };
  } catch (error) {
    fastify.log.error('Failed to get notification:', error);
    reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// ============================================================================
// NOTIFICATION SENDING ENDPOINTS
// ============================================================================

fastify.post('/api/notifications/send', {
  schema: {
    tags: ['Notifications'],
    summary: 'Send immediate notification',
    body: {
      oneOf: [
        {
          type: 'object',
          required: ['type', 'title', 'message', 'recipients', 'channels'],
          properties: {
            external_id: { type: 'string' },
            type: { type: 'string', minLength: 1 },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            title: { type: 'string', minLength: 1, maxLength: 500 },
            message: { type: 'string', minLength: 1 },
            html_message: { type: 'string' },
            recipients: { type: 'array', items: { type: 'string' }, minItems: 1 },
            channels: { type: 'array', items: { type: 'string', enum: ['email', 'slack', 'webhook', 'sms', 'teams'] }, minItems: 1 },
            template_id: { type: 'string', format: 'uuid' },
            metadata: { type: 'object' },
            source_service: { type: 'string' },
            source_tool: { type: 'string' },
            user_id: { type: 'string' },
            scheduled_at: { type: 'string', format: 'date-time' },
            expires_at: { type: 'string', format: 'date-time' },
            max_retries: { type: 'integer', minimum: 0, maximum: 10 }
          }
        },
        {
          type: 'object',
          required: ['template_name', 'variables', 'recipients'],
          properties: {
            template_name: { type: 'string' },
            variables: { type: 'object' },
            recipients: { type: 'array', items: { type: 'string' } },
            channels: { type: 'array', items: { type: 'string' } },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            metadata: { type: 'object' }
          }
        }
      ]
    }
  }
}, async (request, reply) => {
  try {
    let notification;

    if (request.body.template_name) {
      // Create from template
      const options = {
        recipients: request.body.recipients,
        channels: request.body.channels || ['email'],
        priority: request.body.priority,
        metadata: request.body.metadata,
        source_service: request.body.source_service,
        source_tool: request.body.source_tool,
        user_id: request.body.user_id,
        created_by: request.user.sub
      };

      const result = await notificationProcessor.createAndQueue(
        request.body.template_name,
        request.body.variables,
        { ...options, immediate: true }
      );

      return {
        notification_id: result.notification_id,
        status: 'queued',
        queue_result: result.queue_result
      };
    } else {
      // Create direct notification
      const notificationData = { ...request.body, created_by: request.user.sub };
      notification = await databaseManager.createNotification(notificationData);
      
      // Queue for immediate processing
      const queueResult = await notificationProcessor.queueNotification(notification, { immediate: true });
      
      return {
        notification_id: notification.notification_id,
        status: notification.status,
        queue_result: queueResult
      };
    }
  } catch (error) {
    fastify.log.error('Failed to send notification:', error);
    reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

fastify.get('/api/notifications/delivery/:id', {
  schema: {
    tags: ['Delivery'],
    summary: 'Get delivery status',
    params: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' }
      },
      required: ['id']
    }
  }
}, async (request, reply) => {
  try {
    const deliveries = await databaseManager.getDeliveriesByNotification(request.params.id);
    
    return {
      notification_id: request.params.id,
      deliveries: deliveries,
      summary: {
        total: deliveries.length,
        sent: deliveries.filter(d => d.status === 'sent').length,
        delivered: deliveries.filter(d => d.status === 'delivered').length,
        failed: deliveries.filter(d => d.status === 'failed').length,
        pending: deliveries.filter(d => d.status === 'pending').length
      }
    };
  } catch (error) {
    fastify.log.error('Failed to get delivery status:', error);
    reply.code(500).send({
      error: 'Internal Server Error', 
      message: error.message
    });
  }
});

// ============================================================================
// TEMPLATE MANAGEMENT ENDPOINTS
// ============================================================================

fastify.get('/api/templates', {
  schema: {
    tags: ['Templates'],
    summary: 'List notification templates'
  }
}, async (request, reply) => {
  try {
    const templates = await databaseManager.listTemplates(request.query);
    return { templates: templates };
  } catch (error) {
    fastify.log.error('Failed to list templates:', error);
    reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

fastify.post('/api/templates', {
  schema: {
    tags: ['Templates'],
    summary: 'Create notification template',
    body: {
      type: 'object',
      required: ['name', 'type', 'subject_template', 'body_template'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 255 },
        type: { type: 'string', minLength: 1, maxLength: 100 },
        subject_template: { type: 'string', minLength: 1 },
        body_template: { type: 'string', minLength: 1 },
        html_template: { type: 'string' },
        variables: { type: 'array', items: { type: 'string' } },
        supported_channels: { type: 'array', items: { type: 'string', enum: ['email', 'slack', 'webhook', 'sms', 'teams'] } },
        tool_id: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        enabled: { type: 'boolean' }
      }
    }
  }
}, async (request, reply) => {
  try {
    // Validate template
    const validation = templateEngine.validateTemplate(request.body);
    if (!validation.valid) {
      reply.code(400).send({
        error: 'Validation Error',
        message: 'Invalid template',
        errors: validation.errors
      });
      return;
    }

    const templateData = { ...request.body, created_by: request.user.sub };
    const template = await databaseManager.createTemplate(templateData);
    
    // Clear template cache
    templateEngine.clearCache();
    
    // Log to audit
    await auditLogger.logTemplateEvent({
      action: 'template_created',
      template_id: template.template_id,
      template_name: template.name,
      template_type: template.type,
      user_id: request.user.sub
    });

    reply.code(201).send(template);
  } catch (error) {
    fastify.log.error('Failed to create template:', error);
    reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

fastify.post('/api/templates/:id/test', {
  schema: {
    tags: ['Templates'],
    summary: 'Test template rendering',
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      },
      required: ['id']
    },
    body: {
      type: 'object',
      properties: {
        variables: { type: 'object' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const result = await templateEngine.testTemplate(
      request.params.id,
      request.body.variables || {}
    );
    
    // Log to audit
    await auditLogger.logTemplateRendered(
      request.params.id,
      result.template_name,
      request.body.variables || {},
      result,
      request.user.sub
    );

    return result;
  } catch (error) {
    fastify.log.error('Failed to test template:', error);
    reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// ============================================================================
// CHANNEL MANAGEMENT ENDPOINTS  
// ============================================================================

fastify.get('/api/channels', {
  schema: {
    tags: ['Channels'],
    summary: 'List notification channels'
  }
}, async (request, reply) => {
  try {
    const channels = await databaseManager.listChannels(request.query);
    return { channels: channels };
  } catch (error) {
    fastify.log.error('Failed to list channels:', error);
    reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

fastify.post('/api/channels', {
  schema: {
    tags: ['Channels'],
    summary: 'Create notification channel',
    body: {
      type: 'object',
      required: ['name', 'type', 'configuration'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        type: { type: 'string', enum: ['email', 'slack', 'webhook', 'sms', 'teams'] },
        description: { type: 'string' },
        configuration: { type: 'object' },
        enabled: { type: 'boolean' },
        test_endpoint: { type: 'string', format: 'uri' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const channelData = { ...request.body, created_by: request.user.sub };
    const channel = await databaseManager.createChannel(channelData);
    
    reply.code(201).send(channel);
  } catch (error) {
    fastify.log.error('Failed to create channel:', error);
    reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

fastify.post('/api/channels/:id/test', {
  schema: {
    tags: ['Channels'],
    summary: 'Test channel connectivity',
    params: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' }
      },
      required: ['id']
    }
  }
}, async (request, reply) => {
  try {
    const result = await notificationChannels.testChannel(request.params.id);
    
    // Log to audit
    const channel = await databaseManager.getChannel(request.params.id);
    await auditLogger.logChannelTested(
      request.params.id,
      channel.name,
      channel.type,
      result,
      request.user.sub
    );

    return result;
  } catch (error) {
    fastify.log.error('Failed to test channel:', error);
    reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// ============================================================================
// QUEUE MANAGEMENT ENDPOINTS
// ============================================================================

fastify.get('/api/queue/stats', {
  schema: {
    tags: ['Queue'],
    summary: 'Get queue statistics'
  }
}, async (request, reply) => {
  try {
    const stats = await notificationProcessor.getQueueStats();
    const processingStatus = notificationProcessor.getProcessingStatus();
    
    return {
      queue_stats: stats,
      processing_status: processingStatus,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    fastify.log.error('Failed to get queue stats:', error);
    reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// ============================================================================
// SERVER STARTUP AND SHUTDOWN
// ============================================================================

const gracefulShutdown = async () => {
  try {
    fastify.log.info('🛑 Notifier Service: Graceful shutdown initiated');
    
    // Stop notification processor
    if (notificationProcessor) {
      await notificationProcessor.shutdown();
    }
    
    // Stop audit logger
    if (auditLogger) {
      auditLogger.destroy();
    }
    
    // Close Fastify server
    await fastify.close();
    
    fastify.log.info('✅ Notifier Service: Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    fastify.log.error('❌ Notifier Service: Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const start = async () => {
  try {
    await setupServer();
    
    // Initialize services
    databaseManager = new DatabaseManager(fastify, config);
    await databaseManager.initialize();

    auditLogger = new AuditLogger(fastify, config);
    await auditLogger.initialize();

    notificationChannels = new NotificationChannels(fastify, config, databaseManager);
    await notificationChannels.initialize();

    templateEngine = new TemplateEngine(fastify, config, databaseManager);
    await templateEngine.initialize();

    notificationProcessor = new NotificationProcessor(fastify, config, databaseManager, templateEngine, notificationChannels, auditLogger);
    await notificationProcessor.initialize();
    
    const port = parseInt(config.PORT, 10);
    const host = config.HOST;
    
    fastify.log.info(`Starting server on ${host}:${port}...`);
    await fastify.listen({ port, host });
    fastify.log.info(`Server started successfully on ${host}:${port}`);
    
    // Log startup (with error handling)
    try {
      await auditLogger.logServiceStarted({
        processing_enabled: true,
        queue_count: Object.keys(config.QUEUE_NAMES).length,
        channel_count: 3 // email, slack, webhook
      });
    } catch (auditError) {
      fastify.log.warn('Failed to log startup to audit service:', auditError.message);
    }
    
    fastify.log.info(`🚀 Notifier Service listening on ${host}:${port}`);
    fastify.log.info('🎯 Phase 7.5: Centralized notification and alerting service ready');
    fastify.log.info(`📚 API Documentation available at http://${host}:${port}/docs`);
    fastify.log.info(`📧 Email notifications: ${config.EMAIL_ENABLED ? 'enabled' : 'disabled'}`);
    fastify.log.info(`💬 Slack notifications: ${config.SLACK_ENABLED ? 'enabled' : 'disabled'}`);
    fastify.log.info(`🔗 Webhook notifications: ${config.WEBHOOK_ENABLED ? 'enabled' : 'disabled'}`);
    
  } catch (err) {
    console.error('❌ Notifier Service: Failed to start:', err);
    if (err.message) {
      fastify.log.error('❌ Notifier Service: Failed to start:', err.message);
    } else {
      fastify.log.error('❌ Notifier Service: Failed to start with unknown error');
    }
    if (err.stack) {
      fastify.log.error('Stack trace:', err.stack);
    }
    process.exit(1);
  }
};

start();
