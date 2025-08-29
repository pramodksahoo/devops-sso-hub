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

// Helper function for field-specific guidance
function getFieldGuidance(fieldName, expectedType) {
  const guidanceMap = {
    'grafana_url': 'Please enter a valid URL for your Grafana instance (e.g., http://localhost:3100)',
    'oauth.client_secret': 'Client secret is required for OAuth authentication',
    'oauth.scopes': 'Use space-separated scopes like: openid email profile offline_access roles',
    'keycloak.redirect_uris': 'Enter one redirect URI per line (e.g., http://localhost:3100/login/generic_oauth)',
    'keycloak.web_origins': 'Enter one web origin per line (e.g., http://localhost:3100)',
    'keycloak.root_url': 'Should match your Grafana URL for consistent configuration',
    'keycloak.home_url': 'Should match your Grafana URL for consistent configuration'
  };
  
  return guidanceMap[fieldName] || `Please provide a valid ${expectedType || 'value'} for ${fieldName}`;
}

// Helper function to parse multi-line fields correctly
function parseMultilineField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  
  // Handle both Unix (\n) and Windows (\r\n) line endings
  return value.split(/\r?\n/)
             .map(item => item.trim())
             .filter(item => item.length > 0);
}

// Helper function to debug field processing
function debugFieldProcessing(fieldName, userValue, processedValue) {
  console.log(`🔍 Debug ${fieldName}:`);
  console.log(`   - User provided: ${JSON.stringify(userValue)}`);
  console.log(`   - Processed to: ${JSON.stringify(processedValue)}`);
}

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
  const requestBody = request.body;
  
  try {
    // Import tool defaults system
    const { mergeWithDefaults } = require('./schemas/tool-defaults');
    
    // Extract the actual tool configuration data
    // Frontend sends: { integration_type: "oauth2", auth_config: { ... } }
    const rawConfigData = requestBody.auth_config || requestBody;
    const providedIntegrationType = requestBody.integration_type;
    
    console.log(`🔧 Processing ${tool_type} configuration with integration type: ${providedIntegrationType}`);
    console.log(`📥 Raw config data:`, JSON.stringify(rawConfigData, null, 2));
    
    // Determine base URL for the tool (extract from common patterns)
    let baseUrl;
    const urlFields = [`${tool_type}_url`, 'url', 'base_url', 'grafana_url', 'jenkins_url', 'argocd_url'];
    for (const field of urlFields) {
      if (rawConfigData[field]) {
        baseUrl = rawConfigData[field];
        break;
      }
    }
    
    // Merge user configuration with comprehensive defaults
    const completeConfigData = mergeWithDefaults(
      tool_type, 
      providedIntegrationType, 
      rawConfigData, 
      baseUrl
    );
    
    console.log(`✅ Complete config after merging defaults:`, JSON.stringify(completeConfigData, null, 2));
    
    // Validate the complete configuration against tool schema
    const schema = toolSchemas.getSchema(tool_type);
    const validatedConfig = schema.parse(completeConfigData);
    
    // CRITICAL: Determine integration type from config
    let integrationType = providedIntegrationType || 'oidc'; // use provided type or default
    if (!providedIntegrationType) {
      if (validatedConfig.auth_url && !validatedConfig.discovery_url && !validatedConfig.api_url) {
        integrationType = 'oauth2';
      } else if (validatedConfig.idp_sso_url) {
        integrationType = 'saml';
      } else if (validatedConfig.discovery_url || validatedConfig.auth_url || validatedConfig.api_url) {
        integrationType = 'oidc';
      }
    }
    
    // IMPORTANT: Validate that Keycloak client exists before saving
    try {
      const clientValidation = await keycloakService.validateClientExists(tool_type, integrationType);
      fastify.log.info(`✅ Validated Keycloak client exists: ${clientValidation.clientId}`);
      
      // Update tool configuration with validated client details
      await toolConfigService.updateToolKeycloakClient(tool_type, clientValidation, integrationType);
      
    } catch (validationError) {
      fastify.log.error(`❌ Keycloak client validation failed for ${tool_type}:`, validationError.message);
      reply.status(400);
      return {
        success: false,
        error: 'Configuration cannot be saved - Keycloak client validation failed',
        reason: validationError.message,
        expected_client_id: `${tool_type}-client-${integrationType}`,
        suggestion: validationError.message.includes('not found') 
          ? `Please ensure the Keycloak client '${tool_type}-client-${integrationType}' exists in your realm before saving the configuration.`
          : 'Please check the Keycloak client configuration and ensure it is enabled.'
      };
    }
    
    // CRITICAL: Implement atomic transaction for Database + Keycloak sync
    let savedConfig;
    let syncResult = { success: false, error: null };
    
    try {
      console.log(`🔄 Starting atomic save and sync operation for ${tool_type}...`);
      
      // Step 1: Save configuration to database
      savedConfig = await toolConfigService.saveToolConfig(tool_type, validatedConfig);
      console.log(`✅ Database save completed for ${tool_type}`);
      
      // Step 2: Sync to Keycloak (real-time)
      const integrationType = savedConfig.integration_type;
      const clientId = `${tool_type}-client-${integrationType}`;
      
      // Get existing Keycloak client
      const existingClient = await keycloakService.getClient(clientId);
      if (existingClient) {
        console.log(`🔄 Syncing ${tool_type} configuration to Keycloak client ${clientId}...`);
        
        // Extract fields for bidirectional sync with exact UI field mappings
        // Don't use buildClientConfig to avoid overriding user values
        const updateFields = {};
        
        // UI: Grafana URL (Root URL) -> Keycloak: rootUrl
        if (validatedConfig.grafana_url) {
          updateFields.rootUrl = validatedConfig.grafana_url;
        }
        
        // UI: Home URL -> Keycloak: baseUrl (defaults to same as Root URL)
        if (validatedConfig.keycloak?.home_url || validatedConfig.grafana_url) {
          updateFields.homeUrl = validatedConfig.keycloak?.home_url || validatedConfig.grafana_url;
        }
        
        // UI: Valid Redirect URIs -> Keycloak: redirectUris
        if (validatedConfig.keycloak?.redirect_uris) {
          const userRedirectUris = parseMultilineField(validatedConfig.keycloak.redirect_uris);
          updateFields.redirectUris = userRedirectUris;
          debugFieldProcessing('redirect_uris', validatedConfig.keycloak.redirect_uris, userRedirectUris);
        } else {
          // Generate default redirect URIs only if not provided
          const grafanaUrl = validatedConfig.grafana_url || 'http://localhost:3100';
          updateFields.redirectUris = [`${grafanaUrl}/login/generic_oauth`];
          console.log(`🔧 Generated default redirect URIs: ${JSON.stringify(updateFields.redirectUris)}`);
        }
        
        // UI: Web Origins -> Keycloak: webOrigins  
        if (validatedConfig.keycloak?.web_origins) {
          const userWebOrigins = parseMultilineField(validatedConfig.keycloak.web_origins);
          updateFields.webOrigins = userWebOrigins;
          debugFieldProcessing('web_origins', validatedConfig.keycloak.web_origins, userWebOrigins);
        } else {
          // Generate default web origins only if not provided
          const grafanaUrl = validatedConfig.grafana_url || 'http://localhost:3100';
          updateFields.webOrigins = [grafanaUrl];
          console.log(`🔧 Generated default web origins: ${JSON.stringify(updateFields.webOrigins)}`);
        }
        
        // UI: Client Secret -> Keycloak: secret
        if (validatedConfig.oauth?.client_secret) {
          updateFields.clientSecret = validatedConfig.oauth.client_secret;
        }
        
        // Standard metadata fields
        updateFields.name = `Grafana Client`;
        updateFields.description = `OAuth2 client for Grafana integration`;
        
        console.log(`🔄 Prepared updateFields for ${tool_type}:`, JSON.stringify(updateFields, null, 2));
        
        // ATOMIC SYNC OPERATION: Get original state for rollback
        const originalClient = await keycloakService.getClient(clientId);
        console.log(`💾 Backup original client state for rollback capability`);
        
        let updatedClient;
        try {
          // Update Keycloak client with new configuration
          updatedClient = await keycloakService.updateClient(clientId, updateFields);
          console.log(`✅ Keycloak sync completed for ${tool_type}`);
          
          // Step 3: Update database with Keycloak client UUID for audit trail
          await toolConfigService.updateToolKeycloakClient(tool_type, updatedClient);
          console.log(`✅ Database metadata updated with Keycloak client info for ${tool_type}`);
          
        } catch (keycloakError) {
          console.error(`❌ Keycloak sync failed, attempting rollback...`);
          try {
            // Attempt to restore original Keycloak state
            await keycloakService.updateClient(clientId, {
              rootUrl: originalClient.rootUrl,
              baseUrl: originalClient.baseUrl,
              redirectUris: originalClient.redirectUris,
              webOrigins: originalClient.webOrigins,
              secret: originalClient.secret
            });
            console.log(`🔄 Rollback successful - restored original Keycloak state`);
          } catch (rollbackError) {
            console.error(`💥 Rollback failed:`, rollbackError);
          }
          throw keycloakError;
        }
        
        // CRITICAL FIX: Return actual Keycloak client state, not updateFields
        syncResult = { 
          success: true, 
          clientId: clientId,
          redirectUris: updatedClient.redirectUris || [],
          webOrigins: updatedClient.webOrigins || [],
          rootUrl: updatedClient.rootUrl,
          baseUrl: updatedClient.baseUrl,
          secret: updatedClient.secret ? '[HIDDEN]' : undefined,
          debug_sent_to_keycloak: updateFields, // Debug: show what was sent
          atomic_operation: true,
          rollback_available: true
        };
        
      } else {
        console.warn(`⚠️ Keycloak client ${clientId} not found - configuration saved to database only`);
        syncResult = { 
          success: false, 
          error: `Keycloak client ${clientId} not found`,
          clientId: clientId
        };
      }
      
    } catch (syncError) {
      console.error(`❌ Failed atomic operation for ${tool_type}:`, syncError);
      
      // If database save succeeded but Keycloak sync failed, log the inconsistency
      if (savedConfig) {
        console.error(`🚨 INCONSISTENCY WARNING: ${tool_type} config saved to database but Keycloak sync failed`);
        console.error(`📋 Manual intervention may be required to sync Keycloak client: ${tool_type}-client-${savedConfig.integration_type}`);
        
        // Update tool status to indicate sync failure
        try {
          await toolConfigService.updateToolStatus(tool_type, 'sync_failed', {
            error: syncError.message,
            database_saved: true,
            keycloak_synced: false,
            timestamp: new Date().toISOString()
          });
        } catch (statusError) {
          console.error(`Failed to update tool status:`, statusError);
        }
      }
      
      syncResult = { 
        success: false, 
        error: syncError.message 
      };
      
      // Don't fail the entire operation if database save succeeded
      if (!savedConfig) {
        throw syncError;
      }
    }
    
    fastify.log.info(`Tool configuration updated: ${tool_type} (sync: ${syncResult.success})`);
    
    return { 
      success: true, 
      tool_type, 
      config_id: savedConfig.id,
      message: syncResult.success 
        ? 'Configuration saved and synced to Keycloak successfully'
        : `Configuration saved to database, but Keycloak sync ${syncResult.error ? 'failed: ' + syncResult.error : 'incomplete'}`,
      sync_status: {
        database_saved: true,
        keycloak_synced: syncResult.success,
        client_id: syncResult.clientId,
        redirect_uris: syncResult.redirectUris,
        web_origins: syncResult.webOrigins,
        error: syncResult.error
      }
    };
  } catch (error) {
    fastify.log.error(`Failed to update ${tool_type} config:`, error);
    
    // Enhanced error handling with specific messages
    if (error.name === 'ZodError') {
      reply.status(400);
      const detailedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        received_value: err.received,
        expected_type: err.expected || err.code
      }));
      
      return {
        success: false,
        error: `Configuration validation failed`,
        error_type: 'validation_error',
        details: detailedErrors,
        required_fields: detailedErrors.filter(e => e.message.toLowerCase().includes('required')).map(e => e.field),
        invalid_fields: detailedErrors.filter(e => !e.message.toLowerCase().includes('required')).map(e => ({
          field: e.field,
          issue: e.message,
          guidance: getFieldGuidance(e.field, e.expected_type)
        })),
        guidance: `Please check the following fields: ${detailedErrors.map(e => e.field).join(', ')}`
      };
    }
    
    // Keycloak-specific errors
    if (error.message.includes('client validation failed') || error.message.includes('not found')) {
      reply.status(400);
      return {
        success: false,
        error: `Keycloak client validation failed`,
        error_type: 'client_validation_error',
        details: error.message,
        guidance: `Please ensure the Keycloak client '${tool_type}-client-oauth2' exists and is enabled in your realm`,
        suggested_actions: [
          'Check that the Keycloak realm contains the required client',
          'Verify that the client is enabled',
          'Confirm that the integration type matches the client configuration'
        ]
      };
    }
    
    // Database sync errors
    if (error.message.includes('database') || error.message.includes('UPSERT') || error.message.includes('constraint')) {
      reply.status(500);
      return {
        success: false,
        error: `Database synchronization failed`,
        error_type: 'database_sync_error',
        details: error.message,
        guidance: 'Configuration could not be saved to database',
        suggested_actions: [
          'Check database connectivity',
          'Verify database schema is up to date',
          'Contact system administrator if the issue persists'
        ]
      };
    }
    
    // Keycloak sync errors
    if (error.message.includes('sync') || error.message.includes('Keycloak')) {
      reply.status(500);
      return {
        success: false,
        error: `Keycloak synchronization failed`,
        error_type: 'keycloak_sync_error', 
        details: error.message,
        guidance: 'Configuration may be saved to database but not synchronized with Keycloak',
        suggested_actions: [
          'Check Keycloak server connectivity',
          'Verify Keycloak admin credentials',
          'Try the sync operation again',
          'Contact system administrator if the issue persists'
        ]
      };
    }
    
    // Generic server error
    reply.status(500);
    return {
      success: false,
      error: `Failed to update ${tool_type} configuration`,
      error_type: 'server_error',
      details: error.message,
      guidance: 'An unexpected error occurred while processing your request',
      suggested_actions: [
        'Check your configuration values',
        'Try the operation again',
        'Contact system administrator if the issue persists'
      ]
    };
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

// Validate Keycloak client exists for tool
fastify.post('/api/tools/:tool_type/validate-client', {
  preHandler: [adminAuthHook],
  schema: {
    description: 'Validate that Keycloak client exists for tool',
    tags: ['Client Validation'],
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
        integration_type: { type: 'string', enum: ['oauth2', 'oidc', 'saml'] }
      }
    }
  }
}, async (request, reply) => {
  const { tool_type } = request.params;
  const { integration_type } = request.body;
  
  try {
    // Validate that the client exists in Keycloak
    const clientResult = await keycloakService.validateClientExists(tool_type, integration_type);
    
    // Update tool configuration with validated client details
    await toolConfigService.updateToolKeycloakClient(tool_type, clientResult);
    
    return {
      success: true,
      tool_type,
      integration_type,
      client_id: clientResult.clientId,
      client_uuid: clientResult.id,
      enabled: clientResult.enabled,
      message: `Keycloak client '${clientResult.clientId}' validated successfully`
    };
  } catch (error) {
    fastify.log.error(`Failed to validate ${tool_type} client:`, error);
    reply.status(400);
    return { 
      success: false,
      error: `Failed to validate Keycloak client for ${tool_type}`,
      details: error.message,
      suggestion: error.message.includes('not found') 
        ? 'Please ensure the client exists in your Keycloak realm configuration'
        : 'Please check the Keycloak client configuration'
    };
  }
});

// Auto-populate configuration from Keycloak client
fastify.get('/api/keycloak/config/:integration_type', {
  schema: {
    description: 'Auto-populate ONLY Authorization URL, Token URL, and User Info URL from Keycloak - preserves all sync field values',
    tags: ['Keycloak Integration'],
    params: {
      type: 'object',
      required: ['integration_type'],
      properties: {
        integration_type: { 
          type: 'string',
          enum: ['oauth2', 'oidc', 'saml']
        }
      }
    },
    querystring: {
      type: 'object',
      required: ['tool'],
      properties: {
        tool: { 
          type: 'string',
          enum: ['github', 'gitlab', 'jenkins', 'argocd', 'terraform', 'sonarqube', 'grafana', 'prometheus', 'kibana', 'snyk', 'jira', 'servicenow']
        }
      }
    }
  }
}, async (request, reply) => {
  const { integration_type } = request.params;
  const { tool } = request.query;
  
  try {
    fastify.log.info(`Auto-populating ${integration_type} config for tool: ${tool}`);
    
    // Get the expected client ID based on tool and integration type
    const clientId = `${tool}-client-${integration_type}`;
    
    // Get client from Keycloak
    const keycloakClient = await keycloakService.getClient(clientId);
    
    if (!keycloakClient) {
      reply.status(404);
      return {
        success: false,
        error: `Keycloak client '${clientId}' not found. Please ensure the client exists in Keycloak realm.`,
        tool,
        integration_type,
        expected_client_id: clientId
      };
    }
    
    // CRITICAL: Auto-populate ONLY Authorization URL, Token URL, and User Info URL
    // The "Auto-populate from Keycloak" button should NEVER change any other fields
    // This returns ONLY the three fields that should be auto-populated
    let config = {};
    
    if (integration_type === 'oauth2' || integration_type === 'oidc') {
      // Return ONLY the three allowed fields - frontend will merge with existing values
      config = {
        // ONLY these three URLs should be auto-populated
        'oauth.auth_url': `${require('./config').KEYCLOAK_URL}/realms/${require('./config').KEYCLOAK_REALM}/protocol/openid-connect/auth`,
        'oauth.token_url': `${require('./config').KEYCLOAK_URL}/realms/${require('./config').KEYCLOAK_REALM}/protocol/openid-connect/token`,
        'oauth.api_url': `${require('./config').KEYCLOAK_URL}/realms/${require('./config').KEYCLOAK_REALM}/protocol/openid-connect/userinfo`
      };
      
      // NO tool-specific field population - preserve existing sync field values
      
    } else if (integration_type === 'saml') {
      // SAML configuration - only populate SAML URLs, preserve all other fields
      config = {
        // ONLY these three SAML URLs should be auto-populated
        'saml.idp_sso_url': `${require('./config').KEYCLOAK_URL}/realms/${require('./config').KEYCLOAK_REALM}/protocol/saml`,
        'saml.idp_slo_url': `${require('./config').KEYCLOAK_URL}/realms/${require('./config').KEYCLOAK_REALM}/protocol/saml`,
        'saml.idp_metadata_url': `${require('./config').KEYCLOAK_URL}/realms/${require('./config').KEYCLOAK_REALM}/protocol/saml/descriptor`
      };
    }
    
    fastify.log.info(`Successfully auto-populated config for ${tool}:`, { 
      client_id: clientId, 
      config_keys: Object.keys(config) 
    });
    
    return {
      success: true,
      tool,
      integration_type,
      client_id: clientId,
      config,
      message: `Auto-populated Authorization URL, Token URL, and User Info URL from Keycloak client '${clientId}' - all sync field values preserved`
    };
    
  } catch (error) {
    fastify.log.error(`Failed to auto-populate config for ${tool}:`, error);
    reply.status(500);
    return {
      success: false,
      tool,
      integration_type,
      error: `Failed to fetch configuration from Keycloak: ${error.message}`
    };
  }
});

// Comprehensive sync verification for all tools
fastify.get('/api/tools/verify-all-sync', {
  preHandler: [adminAuthHook],
  schema: {
    description: 'Verify configuration sync between database and Keycloak for all tools',
    tags: ['Sync Verification']
  }
}, async (request, reply) => {
  try {
    const allTools = await toolConfigService.getAllTools();
    const syncResults = [];
    
    for (const tool of allTools) {
      if (!tool.configured) {
        syncResults.push({
          tool_type: tool.tool_type,
          synchronized: true,
          status: 'not_configured',
          message: 'Tool not configured - no sync required'
        });
        continue;
      }
      
      try {
        // Get configuration from database
        const dbConfig = await toolConfigService.getToolConfig(tool.tool_type);
        if (!dbConfig) {
          syncResults.push({
            tool_type: tool.tool_type,
            synchronized: false,
            status: 'error',
            issues: [{
              type: 'missing_database_config',
              description: 'Tool marked as configured but no database configuration found'
            }]
          });
          continue;
        }
        
        // Get expected client ID
        const metadata = toolSchemas.getMetadata(tool.tool_type);
        const expectedClientId = `${tool.tool_type}-client-${metadata.protocol}`;
        
        // Check Keycloak client
        const keycloakClient = await keycloakService.getClient(expectedClientId);
        
        const issues = [];
        
        if (!keycloakClient) {
          issues.push({
            type: 'missing_keycloak_client',
            description: `Keycloak client '${expectedClientId}' not found`,
            expected_client_id: expectedClientId
          });
        } else {
          // Check client ID consistency
          if (dbConfig.keycloak_client_id && dbConfig.keycloak_client_id !== expectedClientId) {
            issues.push({
              type: 'client_id_mismatch',
              description: `Database keycloak_client_id '${dbConfig.keycloak_client_id}' does not match expected '${expectedClientId}'`,
              database_client_id: dbConfig.keycloak_client_id,
              expected_client_id: expectedClientId
            });
          }
          
          if (!keycloakClient.enabled) {
            issues.push({
              type: 'client_disabled',
              description: `Keycloak client '${expectedClientId}' is disabled`,
              client_id: expectedClientId
            });
          }
        }
        
        syncResults.push({
          tool_type: tool.tool_type,
          synchronized: issues.length === 0,
          status: issues.length === 0 ? 'synchronized' : 'issues_found',
          issues: issues,
          database_config: {
            keycloak_client_id: dbConfig.keycloak_client_id,
            integration_type: dbConfig.integration_type,
            status: dbConfig.status
          },
          keycloak_config: keycloakClient ? {
            client_id: keycloakClient.clientId,
            enabled: keycloakClient.enabled
          } : null
        });
        
      } catch (error) {
        syncResults.push({
          tool_type: tool.tool_type,
          synchronized: false,
          status: 'error',
          error: error.message
        });
      }
    }
    
    const summary = {
      total_tools: syncResults.length,
      synchronized: syncResults.filter(r => r.synchronized).length,
      with_issues: syncResults.filter(r => !r.synchronized).length,
      not_configured: syncResults.filter(r => r.status === 'not_configured').length
    };
    
    return {
      success: true,
      summary,
      results: syncResults,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    fastify.log.error('Failed to verify sync for all tools:', error);
    reply.status(500);
    return { 
      success: false,
      error: 'Failed to verify configuration sync for all tools',
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
    
    // Get client from Keycloak using correct protocol-based format  
    const metadata = toolSchemas.getMetadata(tool_type);
    const expectedClientId = `${tool_type}-client-${metadata.protocol}`;
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

// Ensure client exists in Keycloak (validate only)
fastify.post('/api/tools/:tool_type/ensure-client', {
  preHandler: [adminAuthHook],
  schema: {
    description: 'Ensure Keycloak client exists for a tool (validation only)',
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
    
    // Validate that client exists in Keycloak (read-only)
    const clientResult = await keycloakService.ensureClientExists(tool_type, integration_type);
    
    return {
      success: true,
      client_id: clientResult.clientId,
      action: clientResult.action,
      enabled: clientResult.enabled,
      created: clientResult.created,
      message: `Client '${clientResult.clientId}' validated successfully`
    };
    
  } catch (error) {
    fastify.log.error(`Failed to ensure client exists for ${request.params.tool_type}:`, error);
    
    // Provide helpful error message
    const isNotFound = error.message.includes('not found');
    const isDisabled = error.message.includes('disabled');
    
    reply.status(isNotFound || isDisabled ? 400 : 500);
    return { 
      success: false,
      error: error.message,
      suggestion: isNotFound 
        ? 'Please add the required client to your Keycloak realm configuration'
        : isDisabled 
        ? 'Please enable the client in your Keycloak realm'
        : 'Please check the Keycloak configuration'
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

// Debug endpoint to test Keycloak client validation
fastify.get('/debug/keycloak/:tool_type', async (request, reply) => {
  const { tool_type } = request.params;
  const integration_type = request.query.integration_type;
  
  try {
    console.log(`🐛 Debug: Testing Keycloak validation for ${tool_type} with integration_type: ${integration_type}`);
    
    // Test client validation
    const clientResult = await keycloakService.validateClientExists(tool_type, integration_type);
    
    return {
      success: true,
      tool_type,
      integration_type,
      client_found: true,
      client_details: clientResult
    };
    
  } catch (error) {
    console.error(`🐛 Debug: Validation failed for ${tool_type}:`, error.message);
    return {
      success: false,
      tool_type,
      integration_type,
      client_found: false,
      error: error.message
    };
  }
});

// Debug endpoint to test the complete PUT flow without auth
fastify.put('/debug/config/:tool_type', async (request, reply) => {
  const { tool_type } = request.params;
  const requestBody = request.body;
  
  try {
    console.log(`🐛 Debug: Testing complete configuration flow for ${tool_type}`);
    console.log(`🐛 Debug: Request body:`, JSON.stringify(requestBody, null, 2));
    
    // Import tool defaults system
    const { mergeWithDefaults } = require('./schemas/tool-defaults');
    
    // Extract the actual tool configuration data
    const rawConfigData = requestBody.auth_config || requestBody;
    const providedIntegrationType = requestBody.integration_type;
    
    console.log(`🐛 Debug: Raw config data:`, JSON.stringify(rawConfigData, null, 2));
    console.log(`🐛 Debug: Provided integration type: ${providedIntegrationType}`);
    
    // Determine base URL for the tool
    let baseUrl;
    const urlFields = [`${tool_type}_url`, 'url', 'base_url', 'grafana_url', 'jenkins_url', 'argocd_url'];
    for (const field of urlFields) {
      if (rawConfigData[field]) {
        baseUrl = rawConfigData[field];
        break;
      }
    }
    console.log(`🐛 Debug: Detected base URL: ${baseUrl}`);
    
    // Merge user configuration with comprehensive defaults
    const completeConfigData = mergeWithDefaults(
      tool_type, 
      providedIntegrationType, 
      rawConfigData, 
      baseUrl
    );
    
    console.log(`🐛 Debug: Complete config after merging defaults:`, JSON.stringify(completeConfigData, null, 2));
    
    // Test Keycloak client validation
    const clientValidation = await keycloakService.validateClientExists(tool_type, providedIntegrationType);
    console.log(`🐛 Debug: Client validation result:`, clientValidation);
    
    return {
      success: true,
      tool_type,
      integration_type: providedIntegrationType,
      base_url: baseUrl,
      raw_config: rawConfigData,
      complete_config: completeConfigData,
      client_validation: clientValidation
    };
    
  } catch (error) {
    console.error(`🐛 Debug: Configuration flow failed for ${tool_type}:`, error.message);
    console.error(`🐛 Debug: Full error:`, error);
    return {
      success: false,
      tool_type,
      error: error.message,
      stack: error.stack
    };
  }
});

// Bidirectional sync endpoints
fastify.post('/api/sync/from-keycloak', {
  preHandler: [adminAuthHook],
  schema: {
    description: 'Sync tool configurations from Keycloak back to database',
    tags: ['Sync'],
    summary: 'Bidirectional sync: Keycloak → DB'
  }
}, async (request, reply) => {
  try {
    console.log('🔄 Starting bidirectional sync from Keycloak to database...');
    const syncResult = await keycloakService.syncFromKeycloak(toolConfigService);
    
    return {
      success: syncResult.success,
      message: `Sync completed: ${syncResult.syncedClients} updated, ${syncResult.skippedClients} skipped, ${syncResult.errorClients} errors`,
      syncedClients: syncResult.syncedClients,
      skippedClients: syncResult.skippedClients,
      errorClients: syncResult.errorClients,
      results: syncResult.results
    };
  } catch (error) {
    console.error('❌ Bidirectional sync failed:', error.message);
    reply.status(500);
    return { success: false, error: error.message };
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
