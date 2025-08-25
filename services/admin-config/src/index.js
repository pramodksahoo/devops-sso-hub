const fastify = require('fastify')({ 
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

const config = require('./config');
const toolSchemas = require('./schemas/tool-schemas');
const keycloakService = require('./services/keycloak-service');
const toolConfigService = require('./services/tool-config-service');
const integrationTestService = require('./services/integration-test-service');

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(require('@fastify/cors'), {
    origin: ['http://localhost:3000', 'http://localhost:3002'],
    credentials: true
  });

  // Swagger Documentation
  await fastify.register(require('@fastify/swagger'), {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'SSO Hub Admin Configuration API',
        description: 'Tool integration management and configuration API',
        version: '1.0.0'
      },
      servers: [
        {
          url: 'http://localhost:3005',
          description: 'Development server'
        }
      ]
    }
  });

  await fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    }
  });

  // Redis
  await fastify.register(require('@fastify/redis'), {
    host: config.REDIS_URL.split('://')[1].split(':')[0],
    port: parseInt(config.REDIS_URL.split(':')[2]) || 6379
  });
}

// Authentication middleware for admin endpoints
async function adminAuthHook(request, reply) {
  const apiKey = request.headers['x-api-key'];
  const authHeader = request.headers.authorization;
  
  if (!apiKey && !authHeader) {
    return reply.status(401).send({ error: 'Missing authentication' });
  }
  
  // Simple API key check for now
  if (apiKey && apiKey !== config.ADMIN_API_KEY) {
    return reply.status(401).send({ error: 'Invalid API key' });
  }
  
  // TODO: Validate JWT token from auth-bff service
  if (authHeader && !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Invalid authorization header' });
  }
}

// Health check endpoints
fastify.get('/healthz', async (request, reply) => {
  return { status: 'healthy', service: 'admin-config', timestamp: new Date().toISOString() };
});

fastify.get('/readyz', async (request, reply) => {
  try {
    // Check database connection
    await toolConfigService.checkConnection();
    
    // Check Redis connection
    await fastify.redis.ping();
    
    // Check Keycloak connectivity
    await keycloakService.checkHealth();
    
    return { 
      status: 'ready', 
      service: 'admin-config',
      dependencies: {
        database: 'healthy',
        redis: 'healthy',
        keycloak: 'healthy'
      },
      timestamp: new Date().toISOString() 
    };
  } catch (error) {
    reply.status(503);
    return { 
      status: 'not ready', 
      error: error.message,
      timestamp: new Date().toISOString() 
    };
  }
});

// ===========================================
// TOOL CONFIGURATION ENDPOINTS
// ===========================================

// Get all supported tools with their configuration status
fastify.get('/api/tools', {
  schema: {
    description: 'Get all supported tools with configuration status',
    tags: ['Tools'],
    response: {
      200: {
        type: 'object',
        properties: {
          tools: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                category: { type: 'string' },
                protocol: { type: 'string', enum: ['oidc', 'saml', 'oauth2'] },
                configured: { type: 'boolean' },
                status: { type: 'string', enum: ['not_configured', 'configured', 'testing', 'active', 'error'] },
                last_tested: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const tools = await toolConfigService.getAllTools();
    return { tools };
  } catch (error) {
    fastify.log.error('Failed to get tools:', error);
    reply.status(500);
    return { error: 'Failed to retrieve tools' };
  }
});

// Get specific tool configuration
fastify.get('/api/tools/:tool_type/config', {
  preHandler: [adminAuthHook],
  schema: {
    description: 'Get tool-specific configuration',
    tags: ['Tool Configuration'],
    params: {
      type: 'object',
      required: ['tool_type'],
      properties: {
        tool_type: { 
          type: 'string',
          enum: ['github', 'gitlab', 'jenkins', 'argocd', 'terraform', 'sonarqube', 'grafana', 'prometheus', 'kibana', 'snyk', 'jira', 'servicenow']
        }
      }
    }
  }
}, async (request, reply) => {
  const { tool_type } = request.params;
  
  try {
    const config = await toolConfigService.getToolConfig(tool_type);
    return { tool_type, config };
  } catch (error) {
    fastify.log.error(`Failed to get ${tool_type} config:`, error);
    reply.status(500);
    return { error: `Failed to retrieve ${tool_type} configuration` };
  }
});

// Update tool configuration
fastify.put('/api/tools/:tool_type/config', {
  preHandler: [adminAuthHook],
  schema: {
    description: 'Update tool-specific configuration',
    tags: ['Tool Configuration'],
    params: {
      type: 'object',
      required: ['tool_type'],
      properties: {
        tool_type: { 
          type: 'string',
          enum: ['github', 'gitlab', 'jenkins', 'argocd', 'terraform', 'sonarqube', 'grafana', 'prometheus', 'kibana', 'snyk', 'jira', 'servicenow']
        }
      }
    },
    body: {
      type: 'object',
      additionalProperties: true
    }
  }
}, async (request, reply) => {
  const { tool_type } = request.params;
  const configData = request.body;
  
  try {
    // Validate configuration against tool schema
    const schema = toolSchemas.getSchema(tool_type);
    const validatedConfig = schema.parse(configData);
    
    // Save configuration
    const savedConfig = await toolConfigService.saveToolConfig(tool_type, validatedConfig);
    
    // Register/update Keycloak client if needed
    if (validatedConfig.keycloak_client_registration !== false) {
      await keycloakService.registerOrUpdateClient(tool_type, validatedConfig);
    }
    
    fastify.log.info(`Tool configuration updated: ${tool_type}`);
    return { 
      success: true, 
      tool_type, 
      config_id: savedConfig.id,
      message: 'Configuration saved successfully' 
    };
  } catch (error) {
    fastify.log.error(`Failed to update ${tool_type} config:`, error);
    
    if (error.name === 'ZodError') {
      reply.status(400);
      return { 
        error: 'Validation failed', 
        details: error.errors 
      };
    }
    
    reply.status(500);
    return { error: `Failed to update ${tool_type} configuration` };
  }
});

// Test tool integration
fastify.post('/api/tools/:tool_type/test', {
  preHandler: [adminAuthHook],
  schema: {
    description: 'Test tool integration configuration',
    tags: ['Integration Testing'],
    params: {
      type: 'object',
      required: ['tool_type'],
      properties: {
        tool_type: { 
          type: 'string',
          enum: ['github', 'gitlab', 'jenkins', 'argocd', 'terraform', 'sonarqube', 'grafana', 'prometheus', 'kibana', 'snyk', 'jira', 'servicenow']
        }
      }
    },
    body: {
      type: 'object',
      properties: {
        test_type: { 
          type: 'string', 
          enum: ['connection', 'authentication', 'api', 'full'],
          default: 'connection' 
        }
      }
    }
  }
}, async (request, reply) => {
  const { tool_type } = request.params;
  const { test_type = 'connection' } = request.body;
  
  try {
    const testResults = await integrationTestService.testIntegration(tool_type, test_type);
    
    // Update tool status based on test results
    await toolConfigService.updateToolStatus(tool_type, testResults.success ? 'active' : 'error', testResults);
    
    return {
      tool_type,
      test_type,
      success: testResults.success,
      results: testResults,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    fastify.log.error(`Failed to test ${tool_type} integration:`, error);
    
    // Update tool status to error
    await toolConfigService.updateToolStatus(tool_type, 'error', { error: error.message });
    
    reply.status(500);
    return { 
      error: `Failed to test ${tool_type} integration`,
      details: error.message 
    };
  }
});

// Test connection with provided configuration (without saving)
fastify.post('/api/tools/:tool_type/test-connection', {
  preHandler: [adminAuthHook],
  schema: {
    description: 'Test tool connection with provided configuration',
    tags: ['Integration Testing'],
    params: {
      type: 'object',
      required: ['tool_type'],
      properties: {
        tool_type: { 
          type: 'string',
          enum: ['github', 'gitlab', 'jenkins', 'argocd', 'terraform', 'sonarqube', 'grafana', 'prometheus', 'kibana', 'snyk', 'jira', 'servicenow']
        }
      }
    },
    body: {
      type: 'object',
      required: ['integration_type', 'config'],
      properties: {
        integration_type: { 
          type: 'string', 
          enum: ['oidc', 'oauth2', 'saml', 'custom'],
          description: 'Integration type'
        },
        config: { 
          type: 'object',
          description: 'Tool configuration to test'
        },
        test_type: { 
          type: 'string', 
          enum: ['connection', 'authentication', 'api', 'full'],
          default: 'connection',
          description: 'Type of test to perform'
        }
      }
    }
  }
}, async (request, reply) => {
  const { tool_type } = request.params;
  const { integration_type, config, test_type = 'connection' } = request.body;
  
  try {
    fastify.log.info(`Testing ${tool_type} connection with config:`, { tool_type, integration_type, test_type, config_keys: Object.keys(config) });
    
    // Validate the configuration against the tool schema first
    try {
      const validatedConfig = toolSchemas.validateConfig(tool_type, config);
      fastify.log.info(`Configuration validation passed for ${tool_type}`, { validated_keys: Object.keys(validatedConfig) });
    } catch (validationError) {
      fastify.log.warn(`Configuration validation warning for ${tool_type}:`, validationError.message);
      // Continue with testing even if validation has warnings
    }
    
    // Create a temporary test configuration service entry for testing
    const tempToolConfig = {
      tool_type,
      integration_type,
      config,
      configured: true,
      status: 'testing'
    };
    
    // Use the integration test service with the provided configuration
    const testResults = await integrationTestService.testIntegration(tool_type, test_type, config);
    
    return {
      success: testResults.success,
      tool_type,
      integration_type,
      test_type,
      test_results: testResults,
      message: testResults.success ? 'Connection test successful' : `Connection test failed: ${testResults.error || 'Unknown error'}`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    fastify.log.error(`Failed to test ${tool_type} connection:`, error);
    
    return {
      success: false,
      tool_type,
      integration_type,
      test_type,
      error: error.message,
      message: `Connection test failed: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
});

// Dynamic Keycloak client registration
fastify.post('/api/tools/:tool_type/register-client', {
  preHandler: [adminAuthHook],
  schema: {
    description: 'Register or update Keycloak client for tool',
    tags: ['Client Registration'],
    params: {
      type: 'object',
      required: ['tool_type'],
      properties: {
        tool_type: { 
          type: 'string',
          enum: ['github', 'gitlab', 'jenkins', 'argocd', 'terraform', 'sonarqube', 'grafana', 'prometheus', 'kibana', 'snyk', 'jira', 'servicenow']
        }
      }
    },
    body: {
      type: 'object',
      properties: {
        force_update: { type: 'boolean', default: false }
      }
    }
  }
}, async (request, reply) => {
  const { tool_type } = request.params;
  const { force_update = false } = request.body;
  
  try {
    const toolConfig = await toolConfigService.getToolConfig(tool_type);
    
    if (!toolConfig) {
      reply.status(404);
      return { error: `No configuration found for ${tool_type}` };
    }
    
    const clientResult = await keycloakService.registerOrUpdateClient(tool_type, toolConfig, force_update);
    
    // Update tool configuration with client details
    await toolConfigService.updateToolKeycloakClient(tool_type, clientResult);
    
    return {
      success: true,
      tool_type,
      client_id: clientResult.clientId,
      client_uuid: clientResult.id,
      message: force_update ? 'Client updated successfully' : 'Client registered successfully'
    };
  } catch (error) {
    fastify.log.error(`Failed to register ${tool_type} client:`, error);
    reply.status(500);
    return { 
      error: `Failed to register Keycloak client for ${tool_type}`,
      details: error.message 
    };
  }
});

// ===========================================
// BULK OPERATIONS
// ===========================================

// Bulk test all configured tools
fastify.post('/api/tools/test-all', {
  preHandler: [adminAuthHook],
  schema: {
    description: 'Test all configured tool integrations',
    tags: ['Bulk Operations']
  }
}, async (request, reply) => {
  try {
    const results = await integrationTestService.testAllIntegrations();
    return {
      success: true,
      total_tools: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    fastify.log.error('Failed to test all integrations:', error);
    reply.status(500);
    return { error: 'Failed to test all integrations' };
  }
});

// Verify configuration sync between database and Keycloak
fastify.get('/api/tools/:tool_type/verify-sync', {
  preHandler: [adminAuthHook],
  schema: {
    description: 'Verify configuration sync between database and Keycloak for a specific tool',
    tags: ['Sync Verification'],
    params: {
      type: 'object',
      properties: {
        tool_type: { type: 'string' }
      },
      required: ['tool_type']
    }
  }
}, async (request, reply) => {
  try {
    const { tool_type } = request.params;
    
    // Get configuration from database
    const dbConfig = await toolConfigService.getToolConfig(tool_type);
    if (!dbConfig) {
      return {
        success: false,
        synchronized: false,
        error: 'Tool configuration not found in database'
      };
    }
    
    // Get client from Keycloak  
    const expectedClientId = `${tool_type}-client`;
    const keycloakClients = await keycloakService.makeRequest('GET', `/clients?clientId=${expectedClientId}`);
    const keycloakClient = keycloakClients.find(c => c.clientId === expectedClientId);
    
    if (!keycloakClient) {
      return {
        success: true,
        synchronized: false,
        issues: [{
          type: 'missing_keycloak_client',
          description: `Keycloak client '${expectedClientId}' not found`,
          database_client_id: dbConfig.keycloak_client_id,
          expected_client_id: expectedClientId
        }],
        database_config: {
          client_id: dbConfig.config_json?.oauth?.client_id || dbConfig.config_json?.oidc?.client_id,
          keycloak_client_id: dbConfig.keycloak_client_id,
          status: dbConfig.status
        }
      };
    }
    
    // Check for client ID consistency
    const issues = [];
    const configClientId = dbConfig.config_json?.oauth?.client_id || dbConfig.config_json?.oidc?.client_id;
    
    if (configClientId && configClientId !== expectedClientId) {
      issues.push({
        type: 'client_id_mismatch',
        description: `Configuration client_id '${configClientId}' does not match expected '${expectedClientId}'`,
        config_client_id: configClientId,
        expected_client_id: expectedClientId
      });
    }
    
    if (dbConfig.keycloak_client_id && dbConfig.keycloak_client_id !== expectedClientId) {
      issues.push({
        type: 'keycloak_client_id_mismatch', 
        description: `Database keycloak_client_id '${dbConfig.keycloak_client_id}' does not match expected '${expectedClientId}'`,
        database_keycloak_client_id: dbConfig.keycloak_client_id,
        expected_client_id: expectedClientId
      });
    }
    
    return {
      success: true,
      synchronized: issues.length === 0,
      issues,
      database_config: {
        client_id: configClientId,
        keycloak_client_id: dbConfig.keycloak_client_id,
        status: dbConfig.status
      },
      keycloak_config: {
        client_id: keycloakClient.clientId,
        client_uuid: keycloakClient.id,
        enabled: keycloakClient.enabled
      }
    };
    
  } catch (error) {
    fastify.log.error('Failed to verify sync for tool:', error);
    reply.status(500);
    return { 
      success: false,
      synchronized: false, 
      error: 'Failed to verify configuration sync' 
    };
  }
});

// Ensure client exists in Keycloak (create if needed)
fastify.post('/api/tools/:tool_type/ensure-client', {
  preHandler: [adminAuthHook],
  schema: {
    description: 'Ensure Keycloak client exists for a tool (create if needed)',
    tags: ['Client Management'],
    params: {
      type: 'object',
      properties: {
        tool_type: { type: 'string' }
      },
      required: ['tool_type']
    },
    body: {
      type: 'object',
      properties: {
        integration_type: { type: 'string', enum: ['oauth2', 'oidc', 'saml'] }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { tool_type } = request.params;
    const { integration_type } = request.body || {};
    
    // Get basic tool configuration or create a minimal one for client creation
    let toolConfig = await toolConfigService.getToolConfig(tool_type);
    
    if (!toolConfig) {
      // Create minimal config for client creation
      const metadata = toolSchemas.getMetadata(tool_type);
      toolConfig = {
        base_url: `http://localhost:${metadata.category === 'Monitoring' ? '9090' : '8080'}`,
        integration_type: integration_type || metadata.protocol
      };
    }
    
    // Ensure client exists in Keycloak
    const clientResult = await keycloakService.ensureClientExists(tool_type, toolConfig);
    
    return {
      success: true,
      client_id: clientResult.clientId,
      action: clientResult.action,
      created: clientResult.created,
      message: `Client ${clientResult.clientId} ${clientResult.action} successfully`
    };
    
  } catch (error) {
    fastify.log.error(`Failed to ensure client exists for ${request.params.tool_type}:`, error);
    reply.status(500);
    return { 
      success: false,
      error: 'Failed to ensure client exists' 
    };
  }
});

// Delete tool configuration and Keycloak client
fastify.delete('/api/tools/:tool_type/config', {
  preHandler: [adminAuthHook],
  schema: {
    description: 'Delete tool configuration and remove Keycloak client',
    tags: ['Tool Configuration'],
    params: {
      type: 'object',
      properties: {
        tool_type: { type: 'string' }
      },
      required: ['tool_type']
    }
  }
}, async (request, reply) => {
  try {
    const { tool_type } = request.params;
    
    // Get current configuration to get client ID
    const currentConfig = await toolConfigService.getToolConfig(tool_type);
    
    if (currentConfig) {
      // Delete from database
      await toolConfigService.deleteToolConfig(tool_type);
      fastify.log.info(`Deleted tool configuration: ${tool_type}`);
      
      // Delete Keycloak client
      try {
        const metadata = toolSchemas.getMetadata(tool_type);
        const clientId = `${tool_type}-client-${metadata.protocol}`;
        await keycloakService.deleteClient(clientId);
        fastify.log.info(`Deleted Keycloak client: ${clientId}`);
      } catch (keycloakError) {
        fastify.log.warn(`Failed to delete Keycloak client for ${tool_type}:`, keycloakError.message);
        // Continue anyway as database deletion succeeded
      }
      
      return {
        success: true,
        tool_type,
        message: 'Configuration and Keycloak client deleted successfully'
      };
    } else {
      reply.status(404);
      return {
        success: false,
        error: `No configuration found for tool: ${tool_type}`
      };
    }
    
  } catch (error) {
    fastify.log.error(`Failed to delete configuration for ${request.params.tool_type}:`, error);
    reply.status(500);
    return { 
      success: false,
      error: 'Failed to delete configuration' 
    };
  }
});

// Verify sync for all configured tools
fastify.get('/api/tools/verify-sync-all', {
  preHandler: [adminAuthHook],
  schema: {
    description: 'Verify configuration sync between database and Keycloak for all tools',
    tags: ['Sync Verification']
  }
}, async (request, reply) => {
  try {
    const allTools = await toolConfigService.getAllTools();
    const allConfigs = allTools.filter(tool => tool.status === 'configured');
    const results = [];
    
    for (const config of allConfigs) {
      const verifyResponse = await fastify.inject({
        method: 'GET',
        url: `/api/tools/${config.tool_type}/verify-sync`,
        headers: {
          'x-api-key': request.headers['x-api-key']
        }
      });
      
      const verification = JSON.parse(verifyResponse.body);
      results.push({
        tool_type: config.tool_type,
        synchronized: verification.synchronized,
        issues: verification.issues || [],
        ...verification
      });
    }
    
    const totalTools = results.length;
    const synchronizedTools = results.filter(r => r.synchronized).length;
    const issuesFound = results.filter(r => !r.synchronized).length;
    
    return {
      success: true,
      total_tools: totalTools,
      synchronized: synchronizedTools,
      with_issues: issuesFound,
      results,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    fastify.log.error('Failed to verify sync for all tools:', error);
    reply.status(500);
    return { 
      success: false,
      error: 'Failed to verify configuration sync for all tools' 
    };
  }
});

// ===========================================
// SERVER STARTUP
// ===========================================

async function start() {
  try {
    await registerPlugins();
    
    // Initialize services
    await toolConfigService.initialize();
    await keycloakService.initialize();
    
    // Start server
    await fastify.listen({ 
      host: config.HOST, 
      port: config.PORT 
    });
    
    fastify.log.info(`🚀 Admin Config service listening on ${config.HOST}:${config.PORT}`);
    fastify.log.info(`📚 API Documentation available at http://${config.HOST}:${config.PORT}/docs`);
    fastify.log.info(`🔧 Phase 2: Comprehensive tool integration management ready`);
    
  } catch (error) {
    fastify.log.error('❌ Admin Config service startup failed:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  fastify.log.info('Received SIGINT, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  fastify.log.info('Received SIGTERM, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

// Start the service
start();
