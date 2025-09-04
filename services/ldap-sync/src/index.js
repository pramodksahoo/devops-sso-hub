/**
 * LDAP Sync Service - Phase 10
 * Comprehensive LDAP integration and tool synchronization service
 * 
 * @author SSO Hub Team
 * @version 1.0.0
 */

const Fastify = require('fastify');
const config = require('./config');

// Import core components
const DatabaseManager = require('./database-manager');
const LDAPDiscoveryService = require('./ldap-discovery-service');
const SyncScheduler = require('./sync-scheduler');
const SyncJobManager = require('./sync-job-manager');
const AuditLogger = require('./audit-logger');

// Import tool sync engines
const GitHubSync = require('./tool-sync-engines/github-sync');
const GitLabSync = require('./tool-sync-engines/gitlab-sync');

const server = Fastify({
  logger: { level: config.LOG_LEVEL }
});

let databaseManager;
let ldapDiscoveryService;
let syncScheduler;
let syncJobManager;
let auditLogger;
let toolSyncEngines;

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
          title: 'SSO Hub LDAP Sync Service',
          description: 'LDAP integration and tool synchronization service for DevOps tools',
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
          { name: 'LDAP', description: 'LDAP server configuration and testing' },
          { name: 'Discovery', description: 'LDAP user and group discovery' },
          { name: 'Sync', description: 'Tool synchronization operations' },
          { name: 'Preview', description: 'Sync preview and dry-run capabilities' },
          { name: 'Mapping', description: 'Role and attribute mapping configuration' },
          { name: 'Monitoring', description: 'Sync status and monitoring' }
        ]
      }
    });

    await server.register(require('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      staticCSP: true,
      transformStaticCSP: (header) => header
    });

    // Note: Cron scheduling handled by sync-scheduler directly

    // Initialize core services
    databaseManager = new DatabaseManager(server, config);
    await databaseManager.initialize();
    
    auditLogger = new AuditLogger(server, config, databaseManager);
    ldapDiscoveryService = new LDAPDiscoveryService(server, config, databaseManager);
    syncJobManager = new SyncJobManager(server, config, databaseManager, auditLogger);
    syncScheduler = new SyncScheduler(server, config, databaseManager, syncJobManager);
    
    // Initialize tool sync engines
    toolSyncEngines = new Map();
    toolSyncEngines.set('github', new GitHubSync(config, server));
    toolSyncEngines.set('gitlab', new GitLabSync(config, server));
    
    // Initialize all services
    await ldapDiscoveryService.initialize();
    await syncJobManager.initialize();
    await syncScheduler.initialize();
    
    // Initialize tool sync engines
    for (const [toolSlug, syncEngine] of toolSyncEngines) {
      try {
        await syncEngine.initialize();
        server.log.info(`✅ ${toolSlug} sync engine initialized`);
      } catch (error) {
        server.log.warn(`⚠️  ${toolSlug} sync engine initialization failed:`, error.message);
      }
    }
    
    server.log.info('✅ LDAP Sync Service: All plugins and services initialized');
    
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
    service: 'ldap-sync-service',
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
      ldap_discovery: ldapDiscoveryService?.isInitialized || false,
      sync_job_manager: syncJobManager?.isInitialized || false,
      sync_scheduler: syncScheduler?.isInitialized || false,
      tool_sync_engines: toolSyncEngines?.size || 0
    };
    
    const allReady = checks.database && checks.ldap_discovery && checks.sync_job_manager && checks.sync_scheduler;
    
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

// ===== LDAP SERVER ENDPOINTS =====

// List LDAP servers
server.get('/api/ldap/servers', {
  schema: {
    description: 'List LDAP servers',
    tags: ['LDAP'],
    security: [{ IdentityHeaders: [] }]
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const servers = await databaseManager.getLDAPServers();
    
    return {
      success: true,
      servers
    };
  } catch (error) {
    server.log.error('Failed to list LDAP servers:', error);
    reply.status(500).send({
      error: 'Failed to list LDAP servers',
      details: error.message
    });
  }
});

// Test LDAP server connection
server.post('/api/ldap/servers/:serverId/test', {
  schema: {
    description: 'Test LDAP server connection',
    tags: ['LDAP'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        serverId: { type: 'string', format: 'uuid' }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const serverConfig = await databaseManager.getLDAPServer(request.params.serverId);
    
    if (!serverConfig) {
      reply.status(404).send({ error: 'LDAP server not found' });
      return;
    }
    
    const testResult = await ldapDiscoveryService.testConnection(serverConfig);
    
    // Update server test status
    await databaseManager.updateLDAPServerTestStatus(
      request.params.serverId,
      testResult.success ? 'success' : 'failed',
      testResult.success ? null : testResult.message
    );
    
    return {
      success: true,
      test_result: testResult
    };
  } catch (error) {
    server.log.error('Failed to test LDAP connection:', error);
    reply.status(500).send({
      error: 'Failed to test LDAP connection',
      details: error.message
    });
  }
});

// ===== DISCOVERY ENDPOINTS =====

// Discover LDAP users
server.post('/api/ldap/discover/users', {
  schema: {
    description: 'Discover users from LDAP',
    tags: ['Discovery'],
    security: [{ IdentityHeaders: [] }],
    body: {
      type: 'object',
      required: ['ldap_server_id'],
      properties: {
        ldap_server_id: { type: 'string', format: 'uuid' },
        search_base: { type: 'string' },
        additional_filter: { type: 'string' },
        max_results: { type: 'integer', minimum: 1, maximum: 10000, default: 1000 }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const users = await ldapDiscoveryService.discoverUsers(
      request.body.ldap_server_id,
      {
        searchBase: request.body.search_base,
        additionalFilter: request.body.additional_filter,
        maxResults: request.body.max_results
      }
    );
    
    return {
      success: true,
      users_discovered: users.length,
      users: users.slice(0, 100), // Limit response size
      total_count: users.length
    };
  } catch (error) {
    server.log.error('Failed to discover users:', error);
    reply.status(500).send({
      error: 'Failed to discover users',
      details: error.message
    });
  }
});

// Discover LDAP groups
server.post('/api/ldap/discover/groups', {
  schema: {
    description: 'Discover groups from LDAP',
    tags: ['Discovery'],
    security: [{ IdentityHeaders: [] }],
    body: {
      type: 'object',
      required: ['ldap_server_id'],
      properties: {
        ldap_server_id: { type: 'string', format: 'uuid' },
        search_base: { type: 'string' },
        additional_filter: { type: 'string' },
        max_results: { type: 'integer', minimum: 1, maximum: 10000, default: 1000 }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const groups = await ldapDiscoveryService.discoverGroups(
      request.body.ldap_server_id,
      {
        searchBase: request.body.search_base,
        additionalFilter: request.body.additional_filter,
        maxResults: request.body.max_results
      }
    );
    
    return {
      success: true,
      groups_discovered: groups.length,
      groups: groups.slice(0, 100), // Limit response size
      total_count: groups.length
    };
  } catch (error) {
    server.log.error('Failed to discover groups:', error);
    reply.status(500).send({
      error: 'Failed to discover groups',
      details: error.message
    });
  }
});

// ===== SYNC PREVIEW ENDPOINTS =====

// Preview sync for a tool
server.post('/api/sync/preview', {
  schema: {
    description: 'Preview sync changes for a tool',
    tags: ['Preview'],
    security: [{ IdentityHeaders: [] }],
    body: {
      type: 'object',
      required: ['tool_slug', 'ldap_tool_config_id'],
      properties: {
        tool_slug: { type: 'string' },
        ldap_tool_config_id: { type: 'string', format: 'uuid' },
        sync_scope: { type: 'string', enum: ['users', 'groups', 'both'], default: 'both' }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const preview = await syncJobManager.previewSync(
      request.body.ldap_tool_config_id,
      request.body.sync_scope
    );
    
    return {
      success: true,
      preview
    };
  } catch (error) {
    server.log.error('Failed to preview sync:', error);
    reply.status(500).send({
      error: 'Failed to preview sync',
      details: error.message
    });
  }
});

// ===== SYNC EXECUTION ENDPOINTS =====

// Start sync job
server.post('/api/sync/start', {
  schema: {
    description: 'Start a sync job',
    tags: ['Sync'],
    security: [{ IdentityHeaders: [] }],
    body: {
      type: 'object',
      required: ['ldap_tool_config_id'],
      properties: {
        ldap_tool_config_id: { type: 'string', format: 'uuid' },
        job_type: { type: 'string', enum: ['full', 'incremental'], default: 'incremental' },
        sync_scope: { type: 'string', enum: ['users', 'groups', 'both'], default: 'both' },
        is_preview: { type: 'boolean', default: false }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const job = await syncJobManager.startSyncJob({
      ldap_tool_config_id: request.body.ldap_tool_config_id,
      job_type: request.body.job_type,
      sync_scope: request.body.sync_scope,
      is_preview: request.body.is_preview,
      triggered_by: 'manual',
      triggered_by_user: request.user.sub
    });
    
    return {
      success: true,
      job_id: job.id,
      status: job.status,
      message: 'Sync job started successfully'
    };
  } catch (error) {
    server.log.error('Failed to start sync job:', error);
    reply.status(500).send({
      error: 'Failed to start sync job',
      details: error.message
    });
  }
});

// Get sync job status
server.get('/api/sync/jobs/:jobId', {
  schema: {
    description: 'Get sync job status',
    tags: ['Sync'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        jobId: { type: 'string', format: 'uuid' }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const job = await databaseManager.getSyncJob(request.params.jobId);
    
    if (!job) {
      reply.status(404).send({ error: 'Sync job not found' });
      return;
    }
    
    return {
      success: true,
      job
    };
  } catch (error) {
    server.log.error('Failed to get sync job:', error);
    reply.status(500).send({
      error: 'Failed to get sync job',
      details: error.message
    });
  }
});

// ===== TOOL CONFIGURATION ENDPOINTS =====

// Get tool sync configurations
server.get('/api/tools/configs', {
  schema: {
    description: 'Get tool sync configurations',
    tags: ['Sync'],
    security: [{ IdentityHeaders: [] }]
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const configs = await databaseManager.getToolConfigs();
    
    return {
      success: true,
      configs
    };
  } catch (error) {
    server.log.error('Failed to get tool configs:', error);
    reply.status(500).send({
      error: 'Failed to get tool configs',
      details: error.message
    });
  }
});

// ===== MONITORING ENDPOINTS =====

// Get sync status overview
server.get('/api/sync/status', {
  schema: {
    description: 'Get overall sync status',
    tags: ['Monitoring'],
    security: [{ IdentityHeaders: [] }]
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const status = await syncJobManager.getSyncStatusOverview();
    
    return {
      success: true,
      status
    };
  } catch (error) {
    server.log.error('Failed to get sync status:', error);
    reply.status(500).send({
      error: 'Failed to get sync status',
      details: error.message
    });
  }
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
    if (syncScheduler) {
      await syncScheduler.stop();
    }
    
    if (syncJobManager) {
      await syncJobManager.stop();
    }
    
    if (ldapDiscoveryService) {
      await ldapDiscoveryService.stop();
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
    
    // Start scheduler
    if (config.SCHEDULER_ENABLED) {
      await syncScheduler.start();
    }
    
    server.log.info(`🚀 LDAP Sync Service listening on ${host}:${port}`);
    server.log.info('🎯 Phase 10: LDAP Configuration with Tool Sync service ready');
    server.log.info(`📚 API Documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
