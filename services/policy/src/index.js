/**
 * SSO Hub Policy Service
 * 
 * Phase 6.5: Centralized policy management service for access control, compliance, and governance
 * 
 * Features:
 * - Rule-based policy evaluation engine
 * - Support for all 11 DevOps tools
 * - Compliance framework integration (SOX, GDPR, HIPAA, etc.)
 * - Real-time policy enforcement
 * - Performance optimized with caching
 * - Comprehensive audit logging
 * 
 * Technology Stack:
 * - Fastify 4.27.0 with TypeScript support
 * - PostgreSQL for policy storage
 * - Redis for performance caching
 * - Zod for schema validation
 * - OpenAPI/Swagger documentation
 * 
 * @author SSO Hub Team
 * @version 1.0.0
 */

const Fastify = require('fastify');
const config = require('./config');

// Service modules
const DatabaseManager = require('./services/database-manager');
const PolicyEngine = require('./services/policy-engine');
const ComplianceManager = require('./services/compliance-manager');
const CacheManager = require('./services/cache-manager');
const AuditLogger = require('./services/audit-logger');
const PolicyValidator = require('./services/policy-validator');
const ToolIntegrationManager = require('./services/tool-integration-manager');

const server = Fastify({
  logger: { level: config.LOG_LEVEL }
});

let databaseManager;
let policyEngine;
let complianceManager;
let cacheManager;
let auditLogger;
let policyValidator;
let toolIntegrationManager;

// Setup server with plugin registration
async function setupServer() {
  try {
    // Register core plugins
    await server.register(require('@fastify/cors'), {
      origin: config.CORS_ORIGIN,
      credentials: true
    });

    await server.register(require('@fastify/helmet'), {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      }
    });

    await server.register(require('@fastify/rate-limit'), {
      max: config.RATE_LIMIT_MAX,
      timeWindow: config.RATE_LIMIT_WINDOW,
      keyGenerator: (request) => {
        return request.headers['x-user-sub'] || request.ip;
      }
    });

    // Database connection
    await server.register(require('@fastify/postgres'), {
      connectionString: config.DATABASE_URL
    });

    // Redis connection for caching
    await server.register(require('@fastify/redis'), {
      url: config.REDIS_URL,
      family: 4
    });

    // OpenAPI documentation
    await server.register(require('@fastify/swagger'), {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'SSO Hub Policy Service API',
          description: 'Centralized policy management for access control, compliance, and governance across all DevOps tools',
          version: '1.0.0',
          contact: {
            name: 'SSO Hub Team',
            email: 'team@ssohub.dev'
          }
        },
        servers: [
          {
            url: `http://localhost:${config.PORT}`,
            description: 'Development server'
          }
        ],
        components: {
          securitySchemes: {
            identityHeaders: {
              type: 'apiKey',
              in: 'header',
              name: 'x-user-sub',
              description: 'Identity headers from auth gateway'
            }
          }
        },
        security: [{ identityHeaders: [] }],
        tags: [
          { name: 'Health', description: 'Service health and readiness' },
          { name: 'Policies', description: 'Policy management operations' },
          { name: 'Enforcement', description: 'Policy enforcement and evaluation' },
          { name: 'Compliance', description: 'Compliance rules and assessments' },
          { name: 'Analytics', description: 'Policy analytics and reporting' }
        ]
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

    server.log.info('✅ Policy Service: Core plugins registered');
  } catch (error) {
    server.log.error('❌ Policy Service: Failed to setup server:', error);
    throw error;
  }
}

// Identity verification middleware
async function verifyIdentity(request, reply) {
  if (!config.REQUIRE_IDENTITY_HEADERS) {
    return;
  }

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

  // Parse roles
  const roles = userRoles ? userRoles.split(',').map(r => r.trim()) : [];

  // Add user context to request
  request.user = {
    sub: userSub,
    email: userEmail,
    roles: roles,
    isAdmin: roles.includes('admin')
  };
}

// Register routes
async function registerRoutes() {
  // Apply identity verification to all routes except health checks
  server.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/health') || request.url.startsWith('/docs') || request.url === '/') {
      return;
    }
    await verifyIdentity(request, reply);
  });

  // ===== HEALTH CHECK ROUTES =====
  
  server.get('/healthz', {
    schema: {
      tags: ['Health'],
      summary: 'Basic health check',
      description: 'Returns basic service health status',
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

  server.get('/readyz', {
    schema: {
      tags: ['Health'],
      summary: 'Readiness check',
      description: 'Returns detailed service readiness including database and cache connectivity',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            services: { type: 'object' },
            policy_cache_status: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const checks = {
      database: 'unknown',
      redis: 'unknown',
      policy_engine: 'unknown'
    };

    try {
      // Test database connection
      await server.pg.query('SELECT 1');
      checks.database = 'healthy';
    } catch (error) {
      checks.database = 'unhealthy';
      server.log.error('Database health check failed:', error);
    }

    try {
      // Test Redis connection
      await server.redis.ping();
      checks.redis = 'healthy';
    } catch (error) {
      checks.redis = 'unhealthy';
      server.log.error('Redis health check failed:', error);
    }

    try {
      // Test policy engine
      if (policyEngine && policyEngine.isInitialized()) {
        checks.policy_engine = 'healthy';
      } else {
        checks.policy_engine = 'initializing';
      }
    } catch (error) {
      checks.policy_engine = 'unhealthy';
      server.log.error('Policy engine health check failed:', error);
    }

    const allHealthy = Object.values(checks).every(status => status === 'healthy');
    
    const response = {
      status: allHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      services: checks,
      policy_cache_status: cacheManager ? await cacheManager.getCacheStats() : {}
    };

    reply.code(allHealthy ? 200 : 503);
    return response;
  });

  // ===== POLICY MANAGEMENT ROUTES =====

  // List all policies
  server.get('/api/policies', {
    schema: {
      tags: ['Policies'],
      summary: 'List all policies',
      description: 'Retrieve all policies with optional filtering',
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Filter by policy type' },
          tool_id: { type: 'string', description: 'Filter by tool ID' },
          enabled: { type: 'boolean', description: 'Filter by enabled status' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            policies: { type: 'array' },
            pagination: { type: 'object' },
            total: { type: 'integer' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await policyEngine.listPolicies(request.query, request.user);
      await auditLogger.logPolicyAccess(request.user, 'list_policies', result.total);
      return result;
    } catch (error) {
      server.log.error('Failed to list policies:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get specific policy
  server.get('/api/policies/:id', {
    schema: {
      tags: ['Policies'],
      summary: 'Get policy by ID',
      description: 'Retrieve detailed information about a specific policy',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Policy ID' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const policy = await policyEngine.getPolicyById(request.params.id, request.user);
      if (!policy) {
        reply.code(404).send({ error: 'Policy not found' });
        return;
      }
      await auditLogger.logPolicyAccess(request.user, 'get_policy', request.params.id);
      return { policy };
    } catch (error) {
      server.log.error('Failed to get policy:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create new policy
  server.post('/api/policies', {
    schema: {
      tags: ['Policies'],
      summary: 'Create new policy',
      description: 'Create a new policy with rules and conditions',
      body: {
        type: 'object',
        required: ['policy_id', 'name', 'type', 'category', 'rules'],
        properties: {
          policy_id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string' },
          category: { type: 'string' },
          tool_id: { type: 'string' },
          priority: { type: 'integer' },
          enabled: { type: 'boolean' },
          rules: { type: 'array' },
          conditions: { type: 'object' },
          compliance_framework: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Validate policy structure
      const validation = await policyValidator.validatePolicy(request.body);
      if (!validation.valid) {
        reply.code(400).send({ 
          error: 'Invalid policy structure', 
          details: validation.errors 
        });
        return;
      }

      const policy = await policyEngine.createPolicy(request.body, request.user);
      await auditLogger.logPolicyChange(request.user, 'create_policy', policy.id, request.body);
      
      reply.code(201);
      return { policy };
    } catch (error) {
      server.log.error('Failed to create policy:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update existing policy
  server.put('/api/policies/:id', {
    schema: {
      tags: ['Policies'],
      summary: 'Update policy',
      description: 'Update an existing policy',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const validation = await policyValidator.validatePolicy(request.body);
      if (!validation.valid) {
        reply.code(400).send({ 
          error: 'Invalid policy structure', 
          details: validation.errors 
        });
        return;
      }

      const policy = await policyEngine.updatePolicy(request.params.id, request.body, request.user);
      if (!policy) {
        reply.code(404).send({ error: 'Policy not found' });
        return;
      }
      
      await auditLogger.logPolicyChange(request.user, 'update_policy', request.params.id, request.body);
      return { policy };
    } catch (error) {
      server.log.error('Failed to update policy:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete policy
  server.delete('/api/policies/:id', {
    schema: {
      tags: ['Policies'],
      summary: 'Delete policy',
      description: 'Delete an existing policy',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const success = await policyEngine.deletePolicy(request.params.id, request.user);
      if (!success) {
        reply.code(404).send({ error: 'Policy not found' });
        return;
      }
      
      await auditLogger.logPolicyChange(request.user, 'delete_policy', request.params.id);
      reply.code(204).send();
    } catch (error) {
      server.log.error('Failed to delete policy:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ===== POLICY ENFORCEMENT ROUTES =====

  // Enforce policy for specific request
  server.post('/api/policies/enforce', {
    schema: {
      tags: ['Enforcement'],
      summary: 'Enforce policy',
      description: 'Evaluate policies for a specific user action and resource',
      body: {
        type: 'object',
        required: ['tool_slug', 'action'],
        properties: {
          tool_slug: { type: 'string' },
          action: { type: 'string' },
          resource_type: { type: 'string' },
          resource_id: { type: 'string' },
          resource_name: { type: 'string' },
          context: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const enforcementRequest = {
        user: request.user,
        tool_slug: request.body.tool_slug,
        action: request.body.action,
        resource_type: request.body.resource_type,
        resource_id: request.body.resource_id,
        resource_name: request.body.resource_name,
        context: request.body.context || {},
        request_id: request.id,
        timestamp: new Date()
      };

      const result = await policyEngine.enforcePolicy(enforcementRequest);
      
      // Log enforcement result for audit
      await auditLogger.logPolicyEnforcement(enforcementRequest, result);
      
      return result;
    } catch (error) {
      server.log.error('Failed to enforce policy:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get enforcement result by ID
  server.get('/api/policies/enforcement/:id', {
    schema: {
      tags: ['Enforcement'],
      summary: 'Get enforcement result',
      description: 'Retrieve policy enforcement result by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const result = await policyEngine.getEnforcementResult(request.params.id);
      if (!result) {
        reply.code(404).send({ error: 'Enforcement result not found' });
        return;
      }
      return { result };
    } catch (error) {
      server.log.error('Failed to get enforcement result:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get enforcement history
  server.get('/api/policies/enforcement/history', {
    schema: {
      tags: ['Enforcement'],
      summary: 'Get enforcement history',
      description: 'Retrieve policy enforcement history with filtering options',
      querystring: {
        type: 'object',
        properties: {
          user_id: { type: 'string' },
          tool_slug: { type: 'string' },
          decision: { type: 'string' },
          from_date: { type: 'string', format: 'date-time' },
          to_date: { type: 'string', format: 'date-time' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const history = await policyEngine.getEnforcementHistory(request.query, request.user);
      return history;
    } catch (error) {
      server.log.error('Failed to get enforcement history:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ===== COMPLIANCE MANAGEMENT ROUTES =====

  // List compliance rules
  server.get('/api/compliance/rules', {
    schema: {
      tags: ['Compliance'],
      summary: 'List compliance rules',
      description: 'Retrieve all compliance rules with optional filtering',
      querystring: {
        type: 'object',
        properties: {
          framework: { type: 'string' },
          risk_level: { type: 'string' },
          enabled: { type: 'boolean' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const rules = await complianceManager.listComplianceRules(request.query, request.user);
      return rules;
    } catch (error) {
      server.log.error('Failed to list compliance rules:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create compliance rule
  server.post('/api/compliance/rules', {
    schema: {
      tags: ['Compliance'],
      summary: 'Create compliance rule',
      description: 'Create a new compliance rule',
      body: {
        type: 'object',
        required: ['rule_id', 'name', 'description', 'framework', 'requirement_text', 'assessment_method', 'assessment_frequency', 'risk_level'],
        properties: {
          rule_id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          framework: { type: 'string' },
          control_id: { type: 'string' },
          requirement_text: { type: 'string' },
          assessment_method: { type: 'string' },
          assessment_frequency: { type: 'string' },
          risk_level: { type: 'string' },
          applicable_tools: { type: 'array' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const rule = await complianceManager.createComplianceRule(request.body, request.user);
      await auditLogger.logComplianceChange(request.user, 'create_compliance_rule', rule.id, request.body);
      
      reply.code(201);
      return { rule };
    } catch (error) {
      server.log.error('Failed to create compliance rule:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update compliance rule
  server.put('/api/compliance/rules/:id', {
    schema: {
      tags: ['Compliance'],
      summary: 'Update compliance rule',
      description: 'Update an existing compliance rule'
    }
  }, async (request, reply) => {
    try {
      const rule = await complianceManager.updateComplianceRule(request.params.id, request.body, request.user);
      if (!rule) {
        reply.code(404).send({ error: 'Compliance rule not found' });
        return;
      }
      
      await auditLogger.logComplianceChange(request.user, 'update_compliance_rule', request.params.id, request.body);
      return { rule };
    } catch (error) {
      server.log.error('Failed to update compliance rule:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get compliance analytics
  server.get('/api/analytics/compliance', {
    schema: {
      tags: ['Analytics'],
      summary: 'Get compliance analytics',
      description: 'Retrieve compliance analytics and metrics',
      querystring: {
        type: 'object',
        properties: {
          framework: { type: 'string' },
          period: { type: 'string', enum: ['7d', '30d', '90d', '1y'] },
          tool_slug: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const analytics = await complianceManager.getComplianceAnalytics(request.query, request.user);
      return analytics;
    } catch (error) {
      server.log.error('Failed to get compliance analytics:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  server.log.info('✅ Policy Service: All routes registered');
}

// Graceful shutdown handling
async function gracefulShutdown(signal) {
  server.log.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    if (cacheManager) {
      await cacheManager.close();
    }
    
    if (auditLogger) {
      await auditLogger.flush();
    }
    
    await server.close();
    server.log.info('✅ Policy Service: Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    server.log.error('❌ Policy Service: Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const start = async () => {
  try {
    await setupServer();
    
    // Initialize services after plugin registration
    databaseManager = new DatabaseManager(server, config);
    await databaseManager.initialize();

    cacheManager = new CacheManager(server, config);
    await cacheManager.initialize();

    auditLogger = new AuditLogger(server, config);
    await auditLogger.initialize();

    policyValidator = new PolicyValidator(server, config);
    await policyValidator.initialize();

    complianceManager = new ComplianceManager(server, config, databaseManager, auditLogger);
    await complianceManager.initialize();

    toolIntegrationManager = new ToolIntegrationManager(server, config, databaseManager);
    await toolIntegrationManager.initialize();

    policyEngine = new PolicyEngine(server, config, databaseManager, cacheManager, auditLogger, toolIntegrationManager);
    await policyEngine.initialize();

    // Register routes after all services are initialized
    await registerRoutes();
    
    const port = parseInt(config.PORT, 10);
    const host = config.HOST;
    
    await server.listen({ port, host });
    
    server.log.info(`🚀 Policy Service listening on ${host}:${port}`);
    server.log.info('🎯 Phase 6.5: Centralized policy management for access control, compliance, and governance ready');
    server.log.info(`📚 API Documentation available at http://${host}:${port}/docs`);
    server.log.info(`🔒 Policy enforcement active for all 11 tools`);
    
  } catch (err) {
    server.log.error('❌ Policy Service: Failed to start:', err);
    process.exit(1);
  }
};

start();
