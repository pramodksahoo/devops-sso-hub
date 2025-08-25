/**
 * SSO Hub Tools Service
 * 
 * Comprehensive tools management service that provides:
 * - Tool registration and discovery
 * - Health monitoring and status tracking
 * - Access control and authorization
 * - Usage analytics and logging
 * 
 * Features:
 * - RESTful API for tool management
 * - Real-time health monitoring
 * - Role-based access control
 * - Integration with Auth-BFF for authentication
 * - PostgreSQL for data persistence
 * - Comprehensive API documentation
 * 
 * Technology Stack:
 * - Fastify 4.27.0 (latest stable)
 * - PostgreSQL for data storage
 * - Swagger/OpenAPI documentation
 * - Health monitoring with periodic checks
 * 
 * @author SSO Hub Team
 * @version 1.0.0
 */

const Fastify = require('fastify');
const { DatabaseManager } = require('./database');
const HealthMonitor = require('./enhanced-health-monitor');
const AccessControlManager = require('./access-control');
const ServiceHealthMonitor = require('./service-health-monitor');
const IntegrationHealthMonitor = require('./integration-health-monitor');

// Load environment-based configuration
const config = require('./config');

const server = Fastify({
  logger: { level: config.LOG_LEVEL }
});

let databaseManager;
let healthMonitor;
let accessControl;
let serviceHealthMonitor;
let integrationHealthMonitor;

// Setup server with proper plugin registration order
async function setupServer() {
  try {
    // 1. CORS first
    await server.register(require('@fastify/cors'), {
      origin: config.CORS_ORIGIN,
      credentials: true
    });

    // 2. Security headers
    await server.register(require('@fastify/helmet'), {
      contentSecurityPolicy: false // Allow Swagger UI
    });

    // 3. Rate limiting
    await server.register(require('@fastify/rate-limit'), {
      max: config.RATE_LIMIT_MAX,
      timeWindow: config.RATE_LIMIT_WINDOW
    });

    // 4. PostgreSQL connection
    await server.register(require('@fastify/postgres'), {
      connectionString: config.DATABASE_URL
    });

    // 5. Swagger documentation
    await server.register(require('@fastify/swagger'), {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'SSO Hub Tools Service API',
          description: 'Tools management service for registration, discovery, health monitoring, and access control',
          version: '1.0.0'
        },
        servers: [
          {
            url: `http://localhost:${config.PORT}`,
            description: 'Development server'
          }
        ],
        components: {
          securitySchemes: {
            IdentityHeaders: {
              type: 'apiKey',
              in: 'header',
              name: 'X-User-Sub',
              description: 'Identity headers from Auth-BFF (X-User-Sub, X-User-Email, X-User-Roles, X-User-Signature)'
            }
          }
        }
      }
    });

    await server.register(require('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false
      },
      staticCSP: true,
      transformStaticCSP: (header) => header
    });

    // Initialize database manager
    databaseManager = new DatabaseManager(server);
    await databaseManager.initializeSchema();

    // Initialize access control
    accessControl = new AccessControlManager(server, config, databaseManager);

    // Initialize health monitors
    healthMonitor = new HealthMonitor(server, config, databaseManager);
    serviceHealthMonitor = new ServiceHealthMonitor(server, config, databaseManager);
    integrationHealthMonitor = new IntegrationHealthMonitor(server, config, databaseManager);
    
    // Initialize all monitors
    await serviceHealthMonitor.initialize();
    await integrationHealthMonitor.initialize();

    server.log.info('✅ Tools Service: All plugins and services initialized');
    
  } catch (error) {
    server.log.error('❌ Server setup failed:', error);
    throw error;
  }
}

// Health check endpoints
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
}, async () => {
  return { 
    status: 'ok', 
    service: 'tools-service', 
    timestamp: new Date().toISOString() 
  };
});

server.get('/readyz', {
  schema: {
    description: 'Readiness check endpoint',
    tags: ['Health'],
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          service: { type: 'string' },
          timestamp: { type: 'string' },
          database: { type: 'string' },
          monitoring: { type: 'string' }
        }
      }
    }
  }
}, async () => {
  try {
    // Test database connection
    await server.pg.query('SELECT 1');
    
    return { 
      status: 'ready', 
      service: 'tools-service', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      monitoring: healthMonitor.isRunning ? 'active' : 'inactive',
      versions: {
        fastify: '4.27.0',
        postgres: 'connected'
      }
    };
  } catch (error) {
    server.log.error('Readiness check failed:', error);
    throw new Error('Service not ready');
  }
});

// Tool Registration Endpoints
server.post('/api/tools', {
  schema: {
    description: 'Register a new tool',
    tags: ['Tools'],
    security: [{ IdentityHeaders: [] }],
    body: {
      type: 'object',
      required: ['name', 'base_url'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 200 },
        slug: { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string', maxLength: 1000 },
        base_url: { type: 'string', format: 'uri' },
        health_check_url: { type: 'string', format: 'uri' },
        integration_type: { type: 'string', default: 'api' },
        required_roles: { type: 'array', items: { type: 'string' }, default: [] },
        required_groups: { type: 'array', items: { type: 'string' }, default: [] },
        metadata: { type: 'object', default: {} },
        configuration: { type: 'object', default: {} },
        tags: { type: 'array', items: { type: 'string' }, default: [] },
        is_active: { type: 'boolean', default: true },
        requires_authentication: { type: 'boolean', default: true }
      }
    }
  },
  preHandler: [
    async (request, reply) => await accessControl.authenticateRequest(request, reply)
  ]
}, async (request, reply) => {
  try {
    const tool = await databaseManager.registerTool(request.body);
    
    server.log.info(`Tool registered: ${tool.name} by ${request.user.email}`);
    
    return { 
      success: true, 
      tool,
      message: 'Tool registered successfully' 
    };
  } catch (error) {
    server.log.error('Tool registration failed:', error);
    reply.status(400).send({ 
      error: 'Registration failed', 
      details: error.message 
    });
  }
});

// Tool Discovery Endpoints
server.get('/api/tools', {
  schema: {
    description: 'Get accessible tools for authenticated user',
    tags: ['Tools'],
    security: [{ IdentityHeaders: [] }],
    querystring: {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
        is_active: { type: 'boolean' },
        requires_authentication: { type: 'boolean' }
      }
    }
  },
  preHandler: [
    async (request, reply) => await accessControl.authenticateRequest(request, reply)
  ]
}, async (request, reply) => {
  try {
    const tools = await accessControl.getAccessibleTools(request.user, request.query);
    
    return {
      success: true,
      tools,
      count: tools.length
    };
  } catch (error) {
    server.log.error('Failed to get tools:', error);
    reply.status(500).send({ 
      error: 'Failed to retrieve tools', 
      details: error.message 
    });
  }
});

server.get('/api/tools/:id', {
  schema: {
    description: 'Get specific tool details',
    tags: ['Tools'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        id: { type: 'integer' }
      }
    }
  },
  preHandler: [
    async (request, reply) => await accessControl.authenticateRequest(request, reply),
    async (request, reply) => await accessControl.authorizeToolAccess(request, reply)
  ]
}, async (request, reply) => {
  try {
    const tool = await databaseManager.getTool(request.params.id);
    const health = await healthMonitor.getToolHealthSummary(tool.id);
    
    return {
      success: true,
      tool: {
        ...tool,
        health
      }
    };
  } catch (error) {
    server.log.error('Failed to get tool:', error);
    reply.status(500).send({ 
      error: 'Failed to retrieve tool', 
      details: error.message 
    });
  }
});

// Health Monitoring Endpoints
server.get('/api/health/system', {
  schema: {
    description: 'Get system-wide health summary',
    tags: ['Health'],
    security: [{ IdentityHeaders: [] }]
  },
  preHandler: [
    async (request, reply) => await accessControl.authenticateRequest(request, reply)
  ]
}, async (request, reply) => {
  try {
    const healthSummary = await healthMonitor.getSystemHealthSummary();
    
    return {
      success: true,
      ...healthSummary
    };
  } catch (error) {
    server.log.error('Failed to get system health:', error);
    reply.status(500).send({ 
      error: 'Failed to retrieve system health', 
      details: error.message 
    });
  }
});

server.get('/api/health/tools/:id', {
  schema: {
    description: 'Get detailed health information for a tool',
    tags: ['Health'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        id: { type: 'integer' }
      }
    }
  },
  preHandler: [
    async (request, reply) => await accessControl.authenticateRequest(request, reply),
    async (request, reply) => await accessControl.authorizeToolAccess(request, reply)
  ]
}, async (request, reply) => {
  try {
    const healthHistory = await databaseManager.getToolHealth(request.params.id);
    const healthSummary = await healthMonitor.getToolHealthSummary(request.params.id);
    
    return {
      success: true,
      health: {
        summary: healthSummary,
        history: healthHistory
      }
    };
  } catch (error) {
    server.log.error('Failed to get tool health:', error);
    reply.status(500).send({ 
      error: 'Failed to retrieve tool health', 
      details: error.message 
    });
  }
});

// Access Control Endpoints
server.get('/api/access/logs/:toolId', {
  schema: {
    description: 'Get access logs for a tool',
    tags: ['Access Control'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        toolId: { type: 'integer' }
      }
    },
    querystring: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
      }
    }
  },
  preHandler: [
    async (request, reply) => await accessControl.authenticateRequest(request, reply),
    async (request, reply) => await accessControl.authorizeToolAccess(request, reply)
  ]
}, async (request, reply) => {
  try {
    const logs = await accessControl.getToolAccessLogs(
      request.params.toolId, 
      request.query.limit || 50
    );
    
    return {
      success: true,
      logs,
      count: logs.length
    };
  } catch (error) {
    server.log.error('Failed to get access logs:', error);
    reply.status(500).send({ 
      error: 'Failed to retrieve access logs', 
      details: error.message 
    });
  }
});

server.get('/api/access/my-logs', {
  schema: {
    description: 'Get access logs for current user',
    tags: ['Access Control'],
    security: [{ IdentityHeaders: [] }],
    querystring: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
      }
    }
  },
  preHandler: [
    async (request, reply) => await accessControl.authenticateRequest(request, reply)
  ]
}, async (request, reply) => {
  try {
    const logs = await accessControl.getUserAccessLogs(
      request.user.sub, 
      request.query.limit || 50
    );
    
    return {
      success: true,
      logs,
      count: logs.length
    };
  } catch (error) {
    server.log.error('Failed to get user access logs:', error);
    reply.status(500).send({ 
      error: 'Failed to retrieve access logs', 
      details: error.message 
    });
  }
});

// Graceful shutdown handling
async function gracefulShutdown() {
  try {
    server.log.info('🛑 Graceful shutdown initiated');
    
    if (healthMonitor) {
      await healthMonitor.stop();
    }
    
    await server.close();
    server.log.info('✅ Tools Service shutdown complete');
    process.exit(0);
  } catch (error) {
    server.log.error('❌ Shutdown error:', error);
    process.exit(1);
  }
}

// ===== HEALTH MONITORING API ENDPOINTS =====

server.get('/api/health/overview', {
  schema: {
    description: 'Get comprehensive health overview of all tools',
    tags: ['Health Monitoring'],
    security: [{ IdentityHeaders: [] }]
  },
  preHandler: [
    async (request, reply) => await accessControl.authenticateRequest(request, reply)
  ]
}, async (request, reply) => {
  try {
    const tools = await databaseManager.getToolHealthOverview();
    
    return {
      success: true,
      tools,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    server.log.error('Failed to get health overview:', error);
    reply.status(500).send({ 
      error: 'Failed to retrieve health overview', 
      details: error.message 
    });
  }
});

server.get('/api/health/tools/:toolId/metrics', {
  schema: {
    description: 'Get performance metrics for a specific tool',
    tags: ['Health Monitoring'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        toolId: { type: 'string', format: 'uuid' }
      },
      required: ['toolId']
    },
    querystring: {
      type: 'object',
      properties: {
        type: { type: 'string', default: 'response_time' },
        hours: { type: 'integer', minimum: 1, maximum: 168, default: 24 }
      }
    }
  },
  preHandler: [
    async (request, reply) => await accessControl.authenticateRequest(request, reply)
  ]
}, async (request, reply) => {
  try {
    const metrics = await databaseManager.getToolHealthMetrics(
      request.params.toolId,
      request.query.type || 'response_time',
      request.query.hours || 24
    );
    
    return {
      success: true,
      metrics,
      tool_id: request.params.toolId,
      metric_type: request.query.type || 'response_time',
      timeframe_hours: request.query.hours || 24
    };
  } catch (error) {
    server.log.error('Failed to get tool metrics:', error);
    reply.status(500).send({ 
      error: 'Failed to retrieve tool metrics', 
      details: error.message 
    });
  }
});

// ===== COMPREHENSIVE HEALTH MONITORING ENDPOINTS - PHASE 8 =====



// Service health overview
server.get('/api/health/services', {
  schema: {
    description: 'Get health status of all microservices',
    tags: ['Health Monitoring - Phase 8'],
    security: [{ IdentityHeaders: [] }]
  },
  preHandler: [
    async (request, reply) => await accessControl.authenticateRequest(request, reply)
  ]
}, async (request, reply) => {
  try {
    const services = await serviceHealthMonitor.getServiceHealthOverview();
    
    return {
      success: true,
      services,
      total_services: services.length,
      healthy_services: services.filter(s => s.status === 'healthy').length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    server.log.error('Failed to get service health overview:', error);
    reply.status(500).send({ 
      error: 'Failed to retrieve service health overview', 
      details: error.message 
    });
  }
});



// Integration health overview
server.get('/api/health/integrations', {
  schema: {
    description: 'Get health status of all tool integrations',
    tags: ['Health Monitoring - Phase 8'],
    security: [{ IdentityHeaders: [] }]
  },
  preHandler: [
    async (request, reply) => await accessControl.authenticateRequest(request, reply)
  ]
}, async (request, reply) => {
  try {
    const integrations = await integrationHealthMonitor.getIntegrationHealthOverview();
    
    // Group by tool
    const groupedIntegrations = {};
    for (const integration of integrations) {
      if (!groupedIntegrations[integration.tool_slug]) {
        groupedIntegrations[integration.tool_slug] = [];
      }
      groupedIntegrations[integration.tool_slug].push(integration);
    }
    
    return {
      success: true,
      integrations: groupedIntegrations,
      total_integrations: integrations.length,
      healthy_integrations: integrations.filter(i => i.status === 'healthy').length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    server.log.error('Failed to get integration health overview:', error);
    reply.status(500).send({ 
      error: 'Failed to retrieve integration health overview', 
      details: error.message 
    });
  }
});



// Comprehensive health dashboard
server.get('/api/health/dashboard', {
  schema: {
    description: 'Get comprehensive health dashboard data',
    tags: ['Health Monitoring - Phase 8'],
    security: [{ IdentityHeaders: [] }]
  },
  preHandler: [
    async (request, reply) => await accessControl.authenticateRequest(request, reply)
  ]
}, async (request, reply) => {
  try {
    // Get all health data
    const [services, integrations, tools] = await Promise.all([
      serviceHealthMonitor.getServiceHealthOverview(),
      integrationHealthMonitor.getIntegrationHealthOverview(),
      databaseManager.getToolHealthOverview()
    ]);
    
    // Calculate overall health score
    const totalComponents = services.length + integrations.length + tools.length;
    const healthyComponents = 
      services.filter(s => s.status === 'healthy').length +
      integrations.filter(i => i.status === 'healthy').length +
      tools.filter(t => t.status === 'healthy').length;
    
    const overallHealthScore = totalComponents > 0 ? 
      Math.round((healthyComponents / totalComponents) * 100) : 100;
    
    return {
      success: true,
      overall_health_score: overallHealthScore,
      services: {
        data: services,
        healthy: services.filter(s => s.status === 'healthy').length,
        total: services.length
      },
      integrations: {
        data: integrations,
        healthy: integrations.filter(i => i.status === 'healthy').length,
        total: integrations.length
      },
      tools: {
        data: tools,
        healthy: tools.filter(t => t.status === 'healthy').length,
        total: tools.length
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    server.log.error('Failed to get health dashboard:', error);
    reply.status(500).send({ 
      error: 'Failed to retrieve health dashboard', 
      details: error.message 
    });
  }
});

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const start = async () => {
  try {
    await setupServer();
    
    const port = parseInt(config.PORT, 10);
    const host = config.HOST;
    
    await server.listen({ port, host });
    
    // Start health monitoring after server is ready
    if (config.DISCOVERY_ENABLED) {
      await healthMonitor.start();
    }
    
    // Start comprehensive health monitoring
    await serviceHealthMonitor.start();
    await integrationHealthMonitor.start();
    
    server.log.info(`🚀 Tools Service listening on ${host}:${port}`);
    server.log.info('🎯 Phase 2: Tools Service with discovery, health monitoring, and access control ready');
    server.log.info(`📚 API Documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
