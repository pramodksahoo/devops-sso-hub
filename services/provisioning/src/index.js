/**
 * Provisioning Service - Phase 9
 * Comprehensive tool provisioning service for SSO Hub
 * 
 * @author SSO Hub Team
 * @version 1.0.0
 */

const Fastify = require('fastify');
const config = require('./config');

// Import core components
const DatabaseManager = require('./database-manager');
const WorkflowEngine = require('./workflow-engine');
const AuditLogger = require('./audit-logger');
const TemplateManager = require('./template-manager');
const ProvisionerRegistry = require('./provisioner-registry');

// Import provisioners
const GitHubProvisioner = require('./provisioners/github-provisioner');
const GitLabProvisioner = require('./provisioners/gitlab-provisioner');

const server = Fastify({
  logger: { level: config.LOG_LEVEL }
});

let databaseManager;
let workflowEngine;
let auditLogger;
let templateManager;
let provisionerRegistry;

// Setup server with proper plugin registration order
async function setupServer() {
  try {
    // 1. CORS first
    await server.register(require('@fastify/cors'), {
      origin: config.CORS_ORIGIN,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Sub', 'X-User-Email', 'X-User-Roles', 'X-User-Signature', 'X-User-Groups']
    });

    // 2. Rate limiting
    await server.register(require('@fastify/rate-limit'), {
      max: config.RATE_LIMIT_MAX,
      timeWindow: config.RATE_LIMIT_WINDOW
    });

    // 3. Database connection
    await server.register(require('@fastify/postgres'), {
      connectionString: config.DATABASE_URL
    });

    // 4. Swagger documentation
    await server.register(require('@fastify/swagger'), {
      swagger: {
        info: {
          title: 'SSO Hub Provisioning Service',
          description: 'Comprehensive tool provisioning service for DevOps tools',
          version: '1.0.0'
        },
        host: `${config.HOST}:${config.PORT}`,
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json'],
        securityDefinitions: {
          IdentityHeaders: {
            type: 'apiKey',
            name: 'X-User-Sub',
            in: 'header',
            description: 'User identity headers with HMAC signature'
          }
        },
        tags: [
          { name: 'Provisioning', description: 'Tool provisioning operations' },
          { name: 'Templates', description: 'Provisioning template management' },
          { name: 'Workflows', description: 'Workflow execution and monitoring' },
          { name: 'Resources', description: 'Provisioned resource management' },
          { name: 'Policies', description: 'Provisioning policy management' }
        ]
      }
    });

    await server.register(require('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      staticCSP: true,
      transformStaticCSP: (header) => header
    });

    // Initialize core services
    databaseManager = new DatabaseManager(server, config);
    await databaseManager.initialize();
    
    auditLogger = new AuditLogger(server, config, databaseManager);
    templateManager = new TemplateManager(server, config, databaseManager);
    workflowEngine = new WorkflowEngine(server, config, databaseManager, auditLogger);
    provisionerRegistry = new ProvisionerRegistry(server, config, databaseManager);
    
    // Register provisioners
    await provisionerRegistry.registerProvisioner('github', new GitHubProvisioner(config, server));
    await provisionerRegistry.registerProvisioner('gitlab', new GitLabProvisioner(config, server));
    
    // Initialize services
    await templateManager.initialize();
    await workflowEngine.initialize();
    await provisionerRegistry.initialize();
    
    server.log.info('✅ Provisioning Service: All plugins and services initialized');
    
  } catch (error) {
    server.log.error('❌ Server setup failed:', error);
    throw error;
  }
}

// ===== HEALTH ENDPOINTS =====

server.get('/healthz', {
  schema: {
    description: 'Health check endpoint',
    tags: ['Health'],
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          service: { type: 'string' },
          timestamp: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  return {
    status: 'ok',
    service: 'provisioning-service',
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
    // Check database connection
    await server.pg.query('SELECT 1');
    
    // Check core services
    const checks = {
      database: true,
      workflow_engine: workflowEngine?.isRunning || false,
      provisioner_registry: provisionerRegistry?.isInitialized || false,
      template_manager: templateManager?.isInitialized || false
    };
    
    const allReady = Object.values(checks).every(check => check);
    
    if (allReady) {
      return {
        status: 'ready',
        checks,
        timestamp: new Date().toISOString()
      };
    } else {
      reply.status(503);
      return {
        status: 'not_ready',
        checks,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    reply.status(503);
    return {
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
});

// ===== AUTHENTICATION MIDDLEWARE =====

async function authenticateRequest(request, reply) {
  const requiredHeaders = ['x-user-sub', 'x-user-email', 'x-user-roles', 'x-user-signature'];
  
  for (const header of requiredHeaders) {
    if (!request.headers[header]) {
      reply.status(401).send({
        error: 'Authentication required',
        details: 'Missing required identity headers'
      });
      return;
    }
  }
  
  // Verify HMAC signature
  const { createHmac } = require('crypto');
  const userSub = request.headers['x-user-sub'];
  const userEmail = request.headers['x-user-email'];
  const userRoles = request.headers['x-user-roles'];
  const userGroups = request.headers['x-user-groups'] || '[]';
  const providedSignature = request.headers['x-user-signature'];
  
  const payload = `${userSub}|${userEmail}|${userRoles}|${userGroups}`;
  const expectedSignature = createHmac('sha256', config.IDENTITY_SIGNATURE_SECRET)
    .update(payload)
    .digest('base64');
  
  if (providedSignature !== expectedSignature) {
    reply.status(401).send({
      error: 'Authentication required',
      details: 'Invalid identity signature'
    });
    return;
  }
  
  // Add user context to request
  request.user = {
    sub: userSub,
    email: userEmail,
    roles: JSON.parse(userRoles),
    groups: JSON.parse(userGroups)
  };
}

// ===== PROVISIONING ENDPOINTS =====

// Provisioning dashboard overview
server.get('/api/provisioning', {
  schema: {
    description: 'Get provisioning dashboard overview',
    tags: ['Provisioning'],
    security: [{ IdentityHeaders: [] }],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          dashboard: {
            type: 'object',
            properties: {
              templates: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  active: { type: 'number' }
                }
              },
              workflows: {
                type: 'object', 
                properties: {
                  total: { type: 'number' },
                  running: { type: 'number' },
                  completed: { type: 'number' },
                  failed: { type: 'number' }
                }
              },
              resources: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  healthy: { type: 'number' },
                  unhealthy: { type: 'number' }
                }
              },
              success_rate: {
                type: 'object',
                properties: {
                  percentage: { type: 'number' },
                  period: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    // Get templates summary
    const templatesResult = await server.pg.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active
      FROM provisioning_templates
    `);
    
    // Get workflows summary  
    const workflowsResult = await server.pg.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM provisioning_workflows
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    
    // Get resources summary
    const resourcesResult = await server.pg.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'healthy' THEN 1 END) as healthy,
        COUNT(CASE WHEN status != 'healthy' THEN 1 END) as unhealthy
      FROM provisioned_resources
    `);

    // Calculate success rate for last 24 hours
    const successRateResult = await server.pg.query(`
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 THEN ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*)), 0)
          ELSE 0 
        END as success_percentage
      FROM provisioning_workflows 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);

    const templates = templatesResult.rows[0];
    const workflows = workflowsResult.rows[0]; 
    const resources = resourcesResult.rows[0];
    const successRate = successRateResult.rows[0];

    return {
      success: true,
      dashboard: {
        templates: {
          total: parseInt(templates.total) || 0,
          active: parseInt(templates.active) || 0
        },
        workflows: {
          total: parseInt(workflows.total) || 0,
          running: parseInt(workflows.running) || 0,
          completed: parseInt(workflows.completed) || 0,
          failed: parseInt(workflows.failed) || 0
        },
        resources: {
          total: parseInt(resources.total) || 0,
          healthy: parseInt(resources.healthy) || 0,
          unhealthy: parseInt(resources.unhealthy) || 0
        },
        success_rate: {
          percentage: parseInt(successRate.success_percentage) || 0,
          period: 'Last 24 hours'
        }
      }
    };
  } catch (error) {
    server.log.error('Failed to get provisioning dashboard:', error);
    reply.status(500).send({
      error: 'Failed to get provisioning dashboard',
      details: error.message
    });
  }
});

// Start provisioning workflow
server.post('/api/provision', {
  schema: {
    description: 'Start a new provisioning workflow',
    tags: ['Provisioning'],
    security: [{ IdentityHeaders: [] }],
    body: {
      type: 'object',
      required: ['workflow_name', 'tool_slug', 'resource_type', 'template_id'],
      properties: {
        workflow_name: { type: 'string' },
        description: { type: 'string' },
        tool_slug: { type: 'string' },
        resource_type: { type: 'string' },
        template_id: { type: 'string', format: 'uuid' },
        variables: { type: 'object' },
        workflow_config: { type: 'object' }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const workflowConfig = {
      ...request.body,
      initiated_by: request.user.sub,
      initiated_by_email: request.user.email,
      user_roles: request.user.roles,
      target_resource_type: request.body.resource_type,
      execution_variables: request.body.variables || {}
    };
    
    // Validate template exists
    const template = await templateManager.getTemplate(request.body.template_id);
    if (!template) {
      reply.status(404).send({ error: 'Template not found' });
      return;
    }
    
    // Start workflow
    const workflow = await workflowEngine.executeWorkflow(workflowConfig);
    
    // Audit the workflow initiation
    await auditLogger.logEvent('workflow_initiated', {
      workflow_id: workflow.id,
      template_id: request.body.template_id,
      tool_slug: request.body.tool_slug,
      resource_type: request.body.resource_type,
      user_id: request.user.sub
    });
    
    return {
      success: true,
      workflow_id: workflow.id,
      status: workflow.status,
      message: 'Provisioning workflow started',
      workflow
    };
  } catch (error) {
    server.log.error('Failed to start provisioning workflow:', error);
    reply.status(500).send({
      error: 'Failed to start provisioning workflow',
      details: error.message
    });
  }
});

// Get workflow status
server.get('/api/workflows/:workflowId', {
  schema: {
    description: 'Get workflow status and details',
    tags: ['Workflows'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', format: 'uuid' }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const workflow = await databaseManager.getWorkflow(request.params.workflowId);
    
    if (!workflow) {
      reply.status(404).send({ error: 'Workflow not found' });
      return;
    }
    
    // Check user permissions
    if (workflow.initiated_by !== request.user.sub && !request.user.roles.includes('admin')) {
      reply.status(403).send({ error: 'Access denied' });
      return;
    }
    
    const steps = await databaseManager.getWorkflowSteps(request.params.workflowId);
    
    return {
      success: true,
      workflow: {
        ...workflow,
        steps
      }
    };
  } catch (error) {
    server.log.error('Failed to get workflow:', error);
    reply.status(500).send({
      error: 'Failed to get workflow',
      details: error.message
    });
  }
});

// List workflows
server.get('/api/workflows', {
  schema: {
    description: 'List provisioning workflows',
    tags: ['Workflows'],
    security: [{ IdentityHeaders: [] }],
    querystring: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        tool_slug: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        offset: { type: 'integer', minimum: 0, default: 0 }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const filters = {
      status: request.query.status,
      tool_slug: request.query.tool_slug,
      initiated_by: request.user.roles.includes('admin') ? undefined : request.user.sub,
      limit: request.query.limit || 20,
      offset: request.query.offset || 0
    };
    
    const workflows = await databaseManager.getWorkflows(filters);
    const total = await databaseManager.getWorkflowsCount(filters);
    
    return {
      success: true,
      workflows,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        has_more: (filters.offset + filters.limit) < total
      }
    };
  } catch (error) {
    server.log.error('Failed to list workflows:', error);
    reply.status(500).send({
      error: 'Failed to list workflows',
      details: error.message
    });
  }
});

// ===== TEMPLATE ENDPOINTS =====

// List templates
server.get('/api/templates', {
  schema: {
    description: 'List provisioning templates',
    tags: ['Templates'],
    security: [{ IdentityHeaders: [] }],
    querystring: {
      type: 'object',
      properties: {
        tool_slug: { type: 'string' },
        template_type: { type: 'string' },
        category: { type: 'string' }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const filters = {
      tool_slug: request.query.tool_slug,
      template_type: request.query.template_type,
      template_category: request.query.category,
      user_roles: request.user.roles
    };
    
    const templates = await templateManager.getTemplates(filters);
    
    return {
      success: true,
      templates
    };
  } catch (error) {
    server.log.error('Failed to list templates:', error);
    reply.status(500).send({
      error: 'Failed to list templates',
      details: error.message
    });
  }
});

// Get template details
server.get('/api/templates/:templateId', {
  schema: {
    description: 'Get template details',
    tags: ['Templates'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        templateId: { type: 'string', format: 'uuid' }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const template = await templateManager.getTemplate(request.params.templateId);
    
    if (!template) {
      reply.status(404).send({ error: 'Template not found' });
      return;
    }
    
    return {
      success: true,
      template
    };
  } catch (error) {
    server.log.error('Failed to get template:', error);
    reply.status(500).send({
      error: 'Failed to get template',
      details: error.message
    });
  }
});

// ===== RESOURCE ENDPOINTS =====

// List provisioned resources
server.get('/api/resources', {
  schema: {
    description: 'List provisioned resources',
    tags: ['Resources'],
    security: [{ IdentityHeaders: [] }],
    querystring: {
      type: 'object',
      properties: {
        tool_slug: { type: 'string' },
        resource_type: { type: 'string' },
        status: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        offset: { type: 'integer', minimum: 0, default: 0 }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const filters = {
      tool_slug: request.query.tool_slug,
      resource_type: request.query.resource_type,
      status: request.query.status,
      provisioned_by: request.user.roles.includes('admin') ? undefined : request.user.sub,
      limit: request.query.limit || 20,
      offset: request.query.offset || 0
    };
    
    const resources = await databaseManager.getProvisionedResources(filters);
    const total = await databaseManager.getProvisionedResourcesCount(filters);
    
    return {
      success: true,
      resources,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        has_more: (filters.offset + filters.limit) < total
      }
    };
  } catch (error) {
    server.log.error('Failed to list resources:', error);
    reply.status(500).send({
      error: 'Failed to list resources',
      details: error.message
    });
  }
});

// ===== CAPABILITY ENDPOINTS =====

// Get provisioning capabilities
server.get('/api/capabilities', {
  schema: {
    description: 'Get provisioning capabilities for all tools',
    tags: ['Provisioning'],
    security: [{ IdentityHeaders: [] }]
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const capabilities = await provisionerRegistry.getAllCapabilities();
    
    return {
      success: true,
      capabilities
    };
  } catch (error) {
    server.log.error('Failed to get capabilities:', error);
    reply.status(500).send({
      error: 'Failed to get capabilities',
      details: error.message
    });
  }
});

// ===== ADDITIONAL API ENDPOINTS =====

// Policies endpoint (stub for frontend compatibility)
server.get('/api/policies', {
  schema: {
    description: 'Get provisioning policies',
    tags: ['Provisioning'],
    security: [{ IdentityHeaders: [] }]
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  return {
    success: true,
    policies: []
  };
});

// Bulk operations endpoint (stub for frontend compatibility)
server.get('/api/bulk-operations', {
  schema: {
    description: 'Get bulk operations',
    tags: ['Provisioning'],
    security: [{ IdentityHeaders: [] }]
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  return {
    success: true,
    operations: []
  };
});

// ===== ERROR HANDLING =====

server.setErrorHandler((error, request, reply) => {
  server.log.error(error);
  reply.status(500).send({
    error: 'Internal server error',
    message: error.message
  });
});

// ===== GRACEFUL SHUTDOWN =====

async function gracefulShutdown(signal) {
  server.log.info(`Received ${signal}, starting graceful shutdown...`);
  
  try {
    if (workflowEngine) {
      await workflowEngine.stop();
    }
    
    await server.close();
    server.log.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    server.log.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const start = async () => {
  try {
    await setupServer();
    
    const port = parseInt(config.PORT, 10);
    const host = config.HOST;
    
    await server.listen({ port, host });
    
    // Start workflow engine
    await workflowEngine.start();
    
    server.log.info(`🚀 Provisioning Service listening on ${host}:${port}`);
    server.log.info('🎯 Phase 9: Comprehensive Tool Provisioning service ready');
    server.log.info(`📚 API Documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
