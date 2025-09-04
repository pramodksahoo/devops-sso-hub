/**
 * SSO Hub Enhanced Catalog Service
 * 
 * Phase 3: Tool-specific launch capabilities, deep-linking, and webhook integration
 * 
 * Features:
 * - Tool-specific launch URL generation
 * - Deep-link support for direct tool navigation
 * - Webhook endpoint registration and processing
 * - Tool capability discovery and metadata
 * - Launch session tracking and analytics
 * - Policy-based tool access control
 * 
 * Technology Stack:
 * - Fastify 4.27.0 (latest stable)
 * - PostgreSQL for data persistence
 * - Redis for session caching
 * - Swagger/OpenAPI documentation
 * 
 * @author SSO Hub Team
 * @version 1.0.0
 */

const Fastify = require('fastify');
const config = require('./config');

// Service modules
const DatabaseManager = require('./services/database-manager');
const LaunchService = require('./services/enhanced-launch-service');
const WebhookService = require('./services/webhook-service');
const PolicyService = require('./services/policy-service');
const ToolMetadataService = require('./services/tool-metadata-service');

const server = Fastify({
  logger: { level: config.LOG_LEVEL }
});

let databaseManager;
let launchService;
let webhookService;
let policyService;
let toolMetadataService;

// Setup server with proper plugin registration order
async function setupServer() {
  try {
    // 1. CORS first
    await server.register(require('@fastify/cors'), {
      origin: config.CORS_ORIGIN,
      credentials: true,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'X-User-Sub',
        'X-User-Email',
        'X-User-Roles',
        'X-User-Signature',
        'X-User-Groups'
      ]
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

    // 5. Redis connection
    await server.register(require('@fastify/redis'), {
      url: config.REDIS_URL
    });

    // 6. CRITICAL FIX: Register axios before it's needed in routes
    const axios = require('axios');
    server.decorate('axios', axios);
    server.log.info('✅ Axios decorated on server instance');

    // 7. Swagger documentation
    await server.register(require('@fastify/swagger'), {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'SSO Hub Enhanced Catalog Service API',
          description: 'Tool catalog with launch capabilities, deep-linking, and webhook integration',
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

    server.log.info('✅ Enhanced Catalog Service: All plugins registered');

    server.log.info('✅ Enhanced Catalog Service: All plugins and services initialized');
    
  } catch (error) {
    server.log.error('❌ Server setup failed:', error);
    throw error;
  }
}

// Helper function to resolve tool by ID or slug
async function resolveToolId(toolId, databaseManager) {
  try {
    // Check if it's a UUID
    if (toolId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      return await databaseManager.getToolById(toolId);
    } else {
      // It's a slug
      return await databaseManager.getToolBySlug(toolId);
    }
  } catch (error) {
    server.log.error('Failed to resolve tool ID:', error);
    throw error;
  }
}

// Helper function to transform frontend auth_config to admin-config schema format
function transformToAdminConfigSchema(toolSlug, authConfig, integrationType) {
  const baseConfig = {
    keycloak: {
      realm: 'sso-hub',
      client_registration: true
    }
  };

  switch (toolSlug) {
    case 'grafana':
      return {
        ...baseConfig,
        grafana_url: authConfig.grafana_url || 'http://localhost:3100',
        oauth: {
          enabled: true,
          auth_url: authConfig.auth_url,
          token_url: authConfig.token_url,
          api_url: authConfig.api_url,
          client_id: `${toolSlug}-client-oauth2`, // Protocol-specific client ID for OAuth2
          client_secret: authConfig.client_secret,
          scopes: authConfig.scopes || 'openid email profile groups',
          allow_sign_up: true,
          name: 'Keycloak'
        },
        admin_credentials: {
          username: 'admin',
          password: 'admin' // Default for testing
        }
      };

    case 'jenkins':
      return {
        ...baseConfig,
        jenkins_url: authConfig.base_url || 'http://localhost:8080',
        oidc: {
          enabled: true,
          client_id: `${toolSlug}-client-oidc`, // Protocol-specific client ID for OIDC
          client_secret: authConfig.client_secret,
          well_known_url: authConfig.discovery_url,
          disable_ssl_verification: true,
          logout_from_openid_provider: true
        },
        admin_credentials: {
          username: authConfig.admin_username || 'admin',
          password: authConfig.admin_password || 'admin123'
        }
      };

    case 'sonarqube':
      return {
        ...baseConfig,
        sonarqube_url: authConfig.base_url || 'http://localhost:9000',
        oidc: {
          enabled: true,
          provider_id: 'keycloak',
          provider_name: 'Keycloak',
          issuer_uri: authConfig.issuer_url || 'http://localhost:8080/realms/sso-hub',
          client_id: `${toolSlug}-client-oidc`, // Protocol-specific client ID for OIDC
          client_secret: authConfig.client_secret
        }
      };

    case 'github':
      return {
        ...baseConfig,
        organization: authConfig.organization || 'your-org',
        oauth_app: {
          client_id: `${toolSlug}-client-oauth2`, // Protocol-specific client ID for OAuth2
          client_secret: authConfig.client_secret
        }
      };

    case 'gitlab':
      return {
        ...baseConfig,
        gitlab_url: authConfig.base_url || 'https://gitlab.com',
        oidc: {
          enabled: true,
          name: 'openid_connect',
          label: 'Keycloak',
          args: {
            name: 'openid_connect',
            scope: ['openid', 'profile', 'email'],
            response_type: 'code',
            issuer: authConfig.issuer_url || 'http://localhost:8080/realms/sso-hub',
            client_auth_method: 'basic',
            discovery: true,
            uid_field: 'sub',
            client_options: {
              identifier: `${toolSlug}-client-oidc`, // Protocol-specific client ID for OIDC
              secret: authConfig.client_secret,
              redirect_uri: authConfig.redirect_uri
            }
          }
        }
      };

    default:
      // Generic OAuth2/OIDC transformation for other tools
      return {
        ...baseConfig,
        base_url: authConfig.base_url,
        oauth: integrationType === 'oauth2' ? {
          enabled: true,
          client_id: `${toolSlug}-client-oauth2`, // Protocol-specific client ID for OAuth2
          client_secret: authConfig.client_secret,
          auth_url: authConfig.auth_url,
          token_url: authConfig.token_url,
          api_url: authConfig.api_url,
          scopes: authConfig.scopes || 'openid email profile'
        } : undefined,
        oidc: integrationType === 'oidc' ? {
          enabled: true,
          client_id: `${toolSlug}-client-oidc`, // Protocol-specific client ID for OIDC
          client_secret: authConfig.client_secret,
          discovery_url: authConfig.discovery_url,
          issuer_url: authConfig.issuer_url
        } : undefined,
        saml: integrationType === 'saml' ? {
          enabled: true,
          client_id: `${toolSlug}-client-saml`, // Protocol-specific client ID for SAML
          entity_id: authConfig.entity_id,
          sso_url: authConfig.sso_url,
          certificate: authConfig.certificate
        } : undefined
      };
  }
}


// Authentication middleware
async function authenticateRequest(request, reply) {
  const userSub = request.headers['x-user-sub'];
  const userEmail = request.headers['x-user-email'];
  const userName = request.headers['x-user-name'];
  const userRoles = request.headers['x-user-roles'];
  const userGroups = request.headers['x-user-groups'];
  const userSignature = request.headers['x-user-signature'];

  // Log authentication headers for debugging
  server.log.info('Auth headers received:', {
    'x-user-sub': userSub,
    'x-user-email': userEmail,
    'x-user-name': userName,
    'x-user-roles': userRoles,
    'x-user-groups': userGroups,
    'has-signature': !!userSignature
  });

  if (!userSub || !userEmail || !userSignature) {
    server.log.error('Missing required auth headers', { 
      hasSub: !!userSub, 
      hasEmail: !!userEmail, 
      hasSignature: !!userSignature 
    });
    return reply.status(401).send({ 
      error: 'Authentication required',
      details: 'Missing identity headers from Auth-BFF'
    });
  }

  // TODO: Verify signature with shared secret
  // For now, trust the headers from Auth-BFF

  // Parse roles and groups from JSON strings
  let roles = [];
  let groups = [];
  try {
    if (userRoles) {
      roles = typeof userRoles === 'string' && userRoles.startsWith('[') 
        ? JSON.parse(userRoles) 
        : userRoles.split(',');
    }
    if (userGroups) {
      groups = typeof userGroups === 'string' && userGroups.startsWith('[')
        ? JSON.parse(userGroups)
        : userGroups.split(',');
    }
  } catch (e) {
    server.log.warn('Failed to parse user roles/groups:', e);
  }

  request.user = {
    sub: userSub,
    email: userEmail,
    name: userName || userEmail.split('@')[0], // Fallback to email username if name not provided
    roles: roles,
    groups: groups,
    isAdmin: roles.includes('admin') || groups.includes('admins')
  };

  // Log the created user object
  server.log.info('User object created in auth middleware:', {
    sub: request.user.sub,
    email: request.user.email,
    name: request.user.name,
    hasRoles: roles.length > 0,
    hasGroups: groups.length > 0,
    isAdmin: request.user.isAdmin
  });

  return;
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
    service: 'catalog-service', 
    timestamp: new Date().toISOString() 
  };
});

server.get('/readyz', {
  schema: {
    description: 'Readiness check endpoint',
    tags: ['Health']
  }
}, async () => {
  try {
    // Test database connection
    await server.pg.query('SELECT 1');
    
    // Test Redis connection
    await server.redis.ping();
    
    return { 
      status: 'ready', 
      service: 'catalog-service', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      redis: 'connected',
      features: config.FEATURES
    };
  } catch (error) {
    server.log.error('Readiness check failed:', error);
    throw new Error('Service not ready');
  }
});

// ===========================================
// TOOL CATALOG ENDPOINTS
// ===========================================

// Get all tools with categorization
server.get('/api/tools', {
  schema: {
    description: 'Get available tools organized by categories',
    tags: ['Tools'],
    security: [{ IdentityHeaders: [] }],
    querystring: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        featured: { type: 'boolean' },
        include_capabilities: { type: 'boolean', default: false }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          categories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                slug: { type: 'string' },
                description: { type: 'string' },
                icon: { type: 'string' },
                tools: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      slug: { type: 'string' },
                      description: { type: 'string' },
                      icon_url: { type: 'string' },
                      is_featured: { type: 'boolean' },
                      status: { type: 'string' },
                      capabilities: { type: 'object' }
                    }
                  }
                }
              }
            }
          },
          total_tools: { type: 'integer' }
        }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const { category, featured, include_capabilities } = request.query;
    
    const catalogData = await toolMetadataService.getCategorizedTools({
      category,
      featured,
      include_capabilities,
      user: request.user
    });

    return {
      success: true,
      ...catalogData
    };
  } catch (error) {
    server.log.error('Failed to get tools catalog:', error);
    reply.status(500).send({
      error: 'Failed to retrieve tools catalog',
      details: error.message
    });
  }
});

// Get specific tool details
server.get('/api/tools/:toolId', {
  schema: {
    description: 'Get detailed information about a specific tool',
    tags: ['Tools'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        toolId: { type: 'string', description: 'Tool UUID or slug' }
      }
    },
    querystring: {
      type: 'object',
      properties: {
        include_launch_config: { type: 'boolean', default: false },
        include_capabilities: { type: 'boolean', default: true }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const { toolId } = request.params;
    const { include_launch_config, include_capabilities } = request.query;

    // Support both UUID and slug lookups
    let actualToolId = toolId;
    if (!toolId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      // It's a slug, convert to UUID
      const tool = await databaseManager.getToolBySlug(toolId);
      if (!tool) {
        return reply.status(404).send({
          error: 'Tool not found',
          tool_id: toolId
        });
      }
      actualToolId = tool.id;
    }

    const toolDetails = await toolMetadataService.getToolDetails(actualToolId, {
      include_launch_config,
      include_capabilities,
      user: request.user
    });

    if (!toolDetails) {
      return reply.status(404).send({
        error: 'Tool not found',
        tool_id: toolId
      });
    }

    return {
      success: true,
      tool: toolDetails
    };
  } catch (error) {
    server.log.error('Failed to get tool details:', error);
    reply.status(500).send({
      error: 'Failed to retrieve tool details',
      details: error.message
    });
  }
});

// Update tool (Admin only) - Basic tool information update
server.put('/api/tools/:toolId', {
  schema: {
    description: 'Update tool basic information (Admin only)',
    tags: ['Tools'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        toolId: { type: 'string', description: 'Tool UUID or slug' }
      }
    },
    body: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        base_url: { type: 'string', format: 'uri' },
        is_active: { type: 'boolean' },
        is_featured: { type: 'boolean' },
        status: { type: 'string', enum: ['active', 'inactive', 'maintenance', 'error'] }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    if (!request.user.isAdmin) {
      return reply.status(403).send({
        error: 'Admin access required'
      });
    }

    const { toolId } = request.params;
    const updateData = request.body;

    // Support both UUID and slug lookups
    let actualToolId = toolId;
    if (!toolId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      // It's a slug, convert to UUID
      const tool = await databaseManager.getToolBySlug(toolId);
      if (!tool) {
        return reply.status(404).send({
          error: 'Tool not found',
          tool_id: toolId
        });
      }
      actualToolId = tool.id;
    }

    const updatedTool = await databaseManager.updateTool(actualToolId, updateData);

    // ENHANCEMENT: If base_url was updated, also update Keycloak client configuration
    if (updateData.base_url) {
      const specializedTools = ['grafana', 'sonarqube', 'jenkins', 'github', 'gitlab', 'argocd', 'terraform', 'prometheus', 'kibana', 'snyk', 'jira', 'servicenow'];
      
      if (specializedTools.includes(updatedTool.slug)) {
        try {
          server.log.info(`🔧 Tool URL updated for ${updatedTool.slug}, updating Keycloak client configuration...`);
          
          // Get current tool configuration
          const toolConfig = await databaseManager.getToolById(actualToolId);
          if (toolConfig && toolConfig.auth_config && toolConfig.integration_type) {
            
            // Update auth config with new base URL if it contains URL references
            const updatedAuthConfig = { ...toolConfig.auth_config };
            if (updatedAuthConfig.redirect_uri && updatedAuthConfig.redirect_uri.includes('localhost')) {
              // Update redirect URI to use new base URL domain
              const newUrl = new URL(updateData.base_url);
              const oldRedirectUri = updatedAuthConfig.redirect_uri;
              updatedAuthConfig.redirect_uri = oldRedirectUri.replace(/https?:\/\/[^\/]+/, `${newUrl.protocol}//${newUrl.host}`);
              server.log.info(`🔄 Updated redirect URI from ${oldRedirectUri} to ${updatedAuthConfig.redirect_uri}`);
            }
            
            // Transform configuration and update admin-config service
            const transformedConfig = transformToAdminConfigSchema(updatedTool.slug, updatedAuthConfig, toolConfig.integration_type);
            
            const updateKeycloakResponse = await server.axios.put(
              `${config.ADMIN_CONFIG_SERVICE_URL}/api/tools/${updatedTool.slug}/config`, 
              transformedConfig, 
              {
                timeout: 30000,
                headers: {
                  'Content-Type': 'application/json',
                  'X-User-ID': request.user.sub,
                  'X-User-Email': request.user.email,
                  'X-User-Roles': JSON.stringify(request.user.roles || []),
                  'X-Api-Key': process.env.ADMIN_API_KEY || 'admin-api-key-change-in-production'
                }
              }
            );
            
            server.log.info(`✅ Successfully updated Keycloak client for ${updatedTool.slug} after URL change`);
          }
        } catch (keycloakError) {
          server.log.warn(`⚠️ Failed to update Keycloak client for ${updatedTool.slug} after URL change:`, keycloakError.message);
          // Don't fail the entire operation, but log the warning
        }
      }
    }

    return {
      success: true,
      tool: updatedTool,
      message: 'Tool updated successfully' + (updateData.base_url ? ' (Keycloak client also updated)' : '')
    };
  } catch (error) {
    server.log.error('Failed to update tool:', error);
    
    if (error.message.includes('not found')) {
      return reply.status(404).send({
        error: 'Tool not found',
        tool_id: request.params.toolId
      });
    }
    
    reply.status(500).send({
      error: 'Failed to update tool',
      details: error.message
    });
  }
});

// Get tool configuration (Admin only) - Fetch current authentication settings
server.get('/api/tools/:toolId/config', {
  schema: {
    description: 'Get tool authentication and integration configuration (Admin only)',
    tags: ['Tools'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        toolId: { type: 'string', description: 'Tool UUID or slug' }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    if (!request.user.isAdmin) {
      return reply.status(403).send({
        error: 'Admin access required'
      });
    }

    const { toolId } = request.params;

    // Support both UUID and slug lookups
    let tool;
    if (toolId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      // It's a UUID
      tool = await databaseManager.getToolById(toolId);
    } else {
      // It's a slug
      tool = await databaseManager.getToolBySlug(toolId);
    }

    if (!tool) {
      return reply.status(404).send({
        error: 'Tool not found',
        tool_id: toolId
      });
    }

    // Return the tool's configuration
    return {
      success: true,
      tool_id: tool.id,
      tool_slug: tool.slug,
      integration_type: tool.integration_type || '',
      auth_config: tool.auth_config || {}
    };
  } catch (error) {
    server.log.error('Failed to fetch tool configuration:', error);
    reply.status(500).send({
      error: 'Failed to fetch tool configuration',
      details: error.message
    });
  }
});

// Update tool configuration (Admin only) - Authentication & integration settings
server.put('/api/tools/:toolId/config', {
  schema: {
    description: 'Update tool authentication and integration configuration (Admin only)',
    tags: ['Tools'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        toolId: { type: 'string', description: 'Tool UUID or slug' }
      }
    },
    body: {
      type: 'object',
      properties: {
        integration_type: { 
          type: 'string', 
          enum: ['oidc', 'oauth2', 'saml', 'custom'],
          description: 'Type of authentication integration'
        },
        auth_config: { 
          type: 'object',
          description: 'Authentication configuration parameters (tool-specific)'
        }
      },
      required: ['integration_type', 'auth_config']
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    if (!request.user.isAdmin) {
      return reply.status(403).send({
        error: 'Admin access required'
      });
    }

    const { toolId } = request.params;
    const { integration_type, auth_config } = request.body;

    // Support both UUID and slug lookups
    let actualToolId = toolId;
    if (!toolId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      // It's a slug, convert to UUID
      const tool = await databaseManager.getToolBySlug(toolId);
      if (!tool) {
        return reply.status(404).send({
          error: 'Tool not found',
          tool_id: toolId
        });
      }
      actualToolId = tool.id;
    }

    // Get tool details for Keycloak integration
    const toolDetails = await databaseManager.getToolById(actualToolId);
    if (!toolDetails) {
      return reply.status(404).send({
        error: 'Tool not found',
        tool_id: actualToolId
      });
    }

    // Update tool configuration in database
    const updatedTool = await databaseManager.updateToolConfig(actualToolId, {
      integration_type,
      auth_config
    });

    // CRITICAL FIX: Register/update Keycloak client for specialized tools
    const specializedTools = ['grafana', 'sonarqube', 'jenkins', 'github', 'gitlab', 'argocd', 'terraform', 'prometheus', 'kibana', 'snyk', 'jira', 'servicenow'];
    
    let keycloakResult = null;
    if (specializedTools.includes(toolDetails.slug) && 
        (integration_type === 'oidc' || integration_type === 'oauth2' || integration_type === 'saml')) {
      
      try {
        server.log.info(`🔧 Registering/updating Keycloak client for ${toolDetails.slug} with integration type ${integration_type}`);
        server.log.info(`🔗 Admin config URL: ${config.ADMIN_CONFIG_SERVICE_URL}/api/tools/${toolDetails.slug}/register-client`);
        server.log.info(`📝 Request payload:`, { tool_config: auth_config, integration_type, force_update: true });
        
        // CRITICAL FIX: First save the tool configuration to admin-config service
        // Then call the register-client endpoint with the correct structure
        
        // Step 1: Transform configuration to admin-config schema format
        const transformedConfig = transformToAdminConfigSchema(toolDetails.slug, auth_config, integration_type);
        
        // Step 2: Save tool configuration to admin-config service
        try {
          server.log.info(`📤 Attempting to save config to admin-config service for ${toolDetails.slug}`);
          server.log.info(`🔗 PUT URL: ${config.ADMIN_CONFIG_SERVICE_URL}/api/tools/${toolDetails.slug}/config`);
          server.log.info(`📋 Transformed config payload:`, JSON.stringify(transformedConfig, null, 2));
          
          const saveConfigResponse = await server.axios.put(`${config.ADMIN_CONFIG_SERVICE_URL}/api/tools/${toolDetails.slug}/config`, transformedConfig, {
            timeout: 30000,
            headers: {
              'Content-Type': 'application/json',
              'X-User-ID': request.user.sub,
              'X-User-Email': request.user.email,
              'X-User-Roles': JSON.stringify(request.user.roles || []),
              'X-Api-Key': process.env.ADMIN_API_KEY || 'admin-api-key-change-in-production'
            }
          });
          server.log.info(`✅ Tool configuration saved to admin-config service for ${toolDetails.slug}`, {
            status: saveConfigResponse.status,
            data: saveConfigResponse.data
          });
        } catch (saveError) {
          server.log.error(`❌ Failed to save config to admin-config service:`, {
            message: saveError.message,
            status: saveError.response?.status,
            statusText: saveError.response?.statusText,
            data: saveError.response?.data,
            code: saveError.code,
            url: saveError.config?.url,
            method: saveError.config?.method
          });
          // Continue with client registration anyway
        }
        
        // Step 2: Register/update Keycloak client with correct admin-config API structure
        const keycloakResponse = await server.axios.post(`${config.ADMIN_CONFIG_SERVICE_URL}/api/tools/${toolDetails.slug}/register-client`, {
          force_update: true
        }, {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': request.user.sub,
            'X-User-Email': request.user.email,
            'X-User-Roles': JSON.stringify(request.user.roles || []),
            'X-Api-Key': process.env.ADMIN_API_KEY || 'admin-api-key-change-in-production'
          }
        });

        keycloakResult = keycloakResponse.data;
        server.log.info(`✅ Successfully registered/updated Keycloak client for ${toolDetails.slug}:`, keycloakResult);
        
      } catch (keycloakError) {
        server.log.error(`❌ Failed to register/update Keycloak client for ${toolDetails.slug}:`, {
          message: keycloakError.message,
          status: keycloakError.response?.status,
          statusText: keycloakError.response?.statusText,
          data: keycloakError.response?.data,
          code: keycloakError.code,
          config: {
            url: keycloakError.config?.url,
            method: keycloakError.config?.method,
            timeout: keycloakError.config?.timeout
          }
        });
        
        // Log the error but don't fail the entire operation
        // The database save was successful, Keycloak sync can be retried later
        server.log.warn(`⚠️ Tool configuration saved to database but Keycloak sync failed for ${toolDetails.slug}. Manual intervention may be required.`);
      }
    }

    return {
      success: true,
      tool: updatedTool,
      keycloak_sync: keycloakResult ? {
        success: true,
        client_id: keycloakResult.client_id,
        action: keycloakResult.action || 'updated'
      } : {
        success: false,
        message: specializedTools.includes(toolDetails.slug) ? 'Keycloak sync failed' : 'Not applicable for this tool'
      },
      message: 'Tool configuration updated successfully' + (keycloakResult ? ' (including Keycloak client)' : '')
    };
  } catch (error) {
    server.log.error('Failed to update tool configuration:', error);
    
    if (error.message.includes('not found')) {
      return reply.status(404).send({
        error: 'Tool not found',
        tool_id: request.params.toolId
      });
    }
    
    reply.status(500).send({
      error: 'Failed to update tool configuration',
      details: error.message
    });
  }
});

// Test tool connection (Admin only) - Validate authentication configuration
server.post('/api/tools/:toolId/test-connection', {
  schema: {
    description: 'Test tool connection and authentication (Admin only)',
    tags: ['Tools'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        toolId: { type: 'string', description: 'Tool UUID or slug' }
      }
    },
    body: {
      type: 'object',
      properties: {
        integration_type: { 
          type: 'string', 
          enum: ['oidc', 'oauth2', 'saml', 'custom']
        },
        config: { 
          type: 'object',
          description: 'Configuration parameters to test'
        }
      },
      required: ['integration_type', 'config']
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    if (!request.user.isAdmin) {
      return reply.status(403).send({
        error: 'Admin access required'
      });
    }

    const { toolId } = request.params;
    const { integration_type, config } = request.body;

    // Support both UUID and slug lookups
    let actualToolId = toolId;
    if (!toolId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      const tool = await databaseManager.getToolBySlug(toolId);
      if (!tool) {
        return reply.status(404).send({
          error: 'Tool not found',
          tool_id: toolId
        });
      }
      actualToolId = tool.id;
    }

    // Get the tool details first to determine the tool type
    const toolDetails = await databaseManager.getToolById(actualToolId);
    if (!toolDetails) {
      return reply.status(404).send({
        error: 'Tool not found',
        tool_id: actualToolId
      });
    }

    // For specialized tools, delegate to admin-config service for testing
    const specializedTools = ['grafana', 'sonarqube', 'jenkins', 'github', 'gitlab', 'argocd', 'terraform', 'prometheus', 'kibana', 'snyk', 'jira', 'servicenow'];
    
    if (specializedTools.includes(toolDetails.slug)) {
      try {
        // Call admin-config service for specialized testing
        const adminConfigResponse = await server.axios.post(`${config.ADMIN_CONFIG_SERVICE_URL}/api/tools/${toolDetails.slug}/test-connection`, {
          integration_type,
          config
        }, {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': request.user.sub,
            'X-User-Email': request.user.email,
            'X-User-Roles': JSON.stringify(request.user.roles || [])
          }
        });

        const testResult = adminConfigResponse.data;
        
        return {
          success: true,
          test_result: testResult,
          message: 'Connection test completed via admin-config service'
        };
      } catch (error) {
        server.log.error('Admin-config service test failed:', error);
        
        // Fallback to local testing
        const testResult = await testToolConnection(actualToolId, integration_type, config, toolDetails.slug);
        
        return {
          success: testResult.success,
          test_result: testResult,
          message: 'Connection test completed (fallback mode)'
        };
      }
    } else {
      // Use local testing for non-specialized tools
      const testResult = await testToolConnection(actualToolId, integration_type, config, toolDetails.slug);
      
      return {
        success: testResult.success,
        test_result: testResult,
        message: 'Connection test completed'
      };
    }
  } catch (error) {
    server.log.error('Failed to test tool connection:', error);
    
    reply.status(500).send({
      error: 'Connection test failed',
      details: error.message
    });
  }
});

// ===========================================
// TOOL LAUNCH ENDPOINTS
// ===========================================

// Generate tool launch URL
server.post('/api/tools/:toolId/launch', {
  schema: {
    description: 'Generate launch URL for a specific tool',
    tags: ['Tool Launch'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        toolId: { type: 'string', description: 'Tool UUID or slug' }
      }
    },
    body: {
      type: 'object',
      properties: {
        context: { 
          type: 'object',
          description: 'Tool-specific context (e.g., repository, project, workspace)'
        },
        deep_link: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            parameters: { type: 'object' }
          }
        },
        return_url: { type: 'string', format: 'uri' }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const { toolId } = request.params;
    const { context, deep_link, return_url } = request.body;

    // Support both UUID and slug lookups
    const tool = await resolveToolId(toolId, databaseManager);
    if (!tool) {
      return reply.status(404).send({
        error: 'Tool not found',
        tool_id: toolId
      });
    }

    const startTime = Date.now();
    const launchResult = await launchService.generateLaunchUrl(tool.id, {
      user: request.user,
      context,
      deep_link,
      return_url,
      user_agent: request.headers['user-agent'],
      ip_address: request.ip
    });
    const processingTime = Date.now() - startTime;

    // Log audit event for SSO launch
    try {
      await server.axios.post(`${config.AUDIT_SERVICE_URL}/api/audit/sso-launch`, {
        tool_slug: tool?.slug,
        tool_name: tool?.name,
        user_id: request.user?.sub,
        user_email: request.user?.email,
        session_id: request.headers['x-session-id'] || 'unknown',
        launch_result: 'success',
        launch_url: launchResult.launch_url,
        processing_time_ms: processingTime,
        source_ip: request.ip,
        user_agent: request.headers['user-agent']
      });
    } catch (auditError) {
      server.log.warn('Failed to log SSO launch audit event:', auditError.message);
    }

    // Track analytics for tool usage
    try {
      await server.axios.post(`${config.ANALYTICS_SERVICE_URL}/api/analytics/usage`, {
        tool_slug: tool?.slug,
        user_id: request.user?.sub,
        user_email: request.user?.email,
        session_id: request.headers['x-session-id'] || 'unknown',
        usage_type: 'sso_launch',
        action: 'launch',
        resource_type: 'tool',
        resource_id: tool.id,
        response_time_ms: processingTime,
        success: true,
        tool_specific_metrics: {
          launch_type: launchResult.launch_type,
          deep_link_requested: !!deep_link,
          context_provided: !!context,
          return_url_provided: !!return_url
        }
      });
    } catch (analyticsError) {
      server.log.warn('Failed to track usage analytics:', analyticsError.message);
    }

    // Track workflow if this is part of a larger workflow pattern
    try {
      const sessionId = request.headers['x-session-id'] || request.user?.sub + '-' + Date.now();
      
      // Detect workflow patterns based on tool usage sequence
      const workflowType = await detectWorkflowType(tool.slug, context);
      
      if (workflowType) {
        await server.axios.post(`${config.ANALYTICS_SERVICE_URL}/api/analytics/workflows`, {
          workflow_type: workflowType.type,
          workflow_name: workflowType.name,
          user_id: request.user?.sub,
          user_email: request.user?.email,
          session_id: sessionId,
          tools_involved: workflowType.expectedTools,
          tool_sequence: [tool.slug],
          trigger_event: 'sso_launch',
          entry_point: tool.slug,
          metadata: {
            launch_context: context,
            deep_link: deep_link,
            user_agent: request.headers['user-agent'],
            workflow_detected_at: new Date().toISOString()
          }
        });
      }
    } catch (workflowError) {
      server.log.warn('Failed to track workflow analytics:', workflowError.message);
    }

    return {
      success: true,
      launch_url: launchResult.launch_url,
      launch_type: launchResult.launch_type,
      session_token: launchResult.session_token,
      expires_at: launchResult.expires_at,
      instructions: launchResult.instructions
    };
  } catch (error) {
    server.log.error('Failed to generate launch URL:', error);
    
    // Log audit event for failed SSO launch
    try {
      // Get tool from params like in main handler
      let tool;
      const toolId = request.params.toolId;
      if (toolId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        tool = await databaseManager.getToolById(toolId);
      } else {
        tool = await databaseManager.getToolBySlug(toolId);
      }
      
      await server.axios.post(`${config.AUDIT_SERVICE_URL}/api/audit/sso-launch`, {
        tool_slug: tool?.slug || 'unknown',
        tool_name: tool?.name || 'Unknown Tool',
        user_id: request.user?.sub,
        user_email: request.user?.email,
        session_id: request.headers['x-session-id'] || 'unknown',
        launch_result: 'failure',
        error_message: error.message,
        source_ip: request.ip,
        user_agent: request.headers['user-agent']
      });
    } catch (auditError) {
      server.log.warn('Failed to log failed SSO launch audit event:', auditError.message);
    }
    
    if (error.message.includes('not found')) {
      return reply.status(404).send({
        error: 'Tool not found',
        tool_id: request.params.toolId
      });
    }
    
    if (error.message.includes('access denied')) {
      return reply.status(403).send({
        error: 'Access denied',
        details: error.message
      });
    }

    reply.status(500).send({
      error: 'Failed to generate launch URL',
      details: error.message
    });
  }
});

// Handle tool launch callback
server.get('/api/tools/:toolId/callback', {
  schema: {
    description: 'Handle OAuth/OIDC callback from tool',
    tags: ['Tool Launch'],
    params: {
      type: 'object',
      properties: {
        toolId: { type: 'string' }
      }
    },
    querystring: {
      type: 'object',
      properties: {
        state: { type: 'string' },
        code: { type: 'string' },
        error: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { toolId } = request.params;
    const { state, code, error } = request.query;

    const callbackResult = await launchService.handleCallback(toolId, {
      state,
      code,
      error,
      user_agent: request.headers['user-agent'],
      ip_address: request.ip
    });

    if (callbackResult.redirect_url) {
      return reply.redirect(callbackResult.redirect_url);
    }

    return {
      success: true,
      message: callbackResult.message,
      session_status: callbackResult.session_status
    };
  } catch (error) {
    server.log.error('Failed to handle tool callback:', error);
    reply.status(500).send({
      error: 'Callback processing failed',
      details: error.message
    });
  }
});

// Get launch session status
server.get('/api/launch-sessions/:sessionToken', {
  schema: {
    description: 'Get launch session status',
    tags: ['Tool Launch'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        sessionToken: { type: 'string' }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    const { sessionToken } = request.params;

    const sessionStatus = await launchService.getSessionStatus(sessionToken, request.user);

    return {
      success: true,
      session: sessionStatus
    };
  } catch (error) {
    server.log.error('Failed to get session status:', error);
    
    if (error.message.includes('not found')) {
      return reply.status(404).send({
        error: 'Session not found'
      });
    }

    reply.status(500).send({
      error: 'Failed to retrieve session status',
      details: error.message
    });
  }
});

// ===========================================
// WEBHOOK ENDPOINTS
// ===========================================

// Register webhook endpoint for a tool
server.post('/api/tools/:toolId/webhooks/register', {
  schema: {
    description: 'Register webhook endpoint for a tool',
    tags: ['Webhooks'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        toolId: { type: 'string' }
      }
    },
    body: {
      type: 'object',
      properties: {
        events: { 
          type: 'array',
          items: { type: 'string' }
        },
        signature_validation: { type: 'object' }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    if (!request.user.isAdmin) {
      return reply.status(403).send({
        error: 'Admin access required'
      });
    }

    const { toolId } = request.params;
    const { events, signature_validation } = request.body;

    const webhookConfig = await webhookService.registerWebhook(toolId, {
      events,
      signature_validation,
      registered_by: request.user
    });

    return {
      success: true,
      webhook_config: webhookConfig
    };
  } catch (error) {
    server.log.error('Failed to register webhook:', error);
    reply.status(500).send({
      error: 'Failed to register webhook',
      details: error.message
    });
  }
});

// Webhook receiver endpoint
server.post('/webhooks/:toolType/:toolId', {
  schema: {
    description: 'Receive webhook from tool',
    tags: ['Webhooks'],
    params: {
      type: 'object',
      properties: {
        toolType: { type: 'string' },
        toolId: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { toolType, toolId } = request.params;
    const payload = request.body;
    const headers = request.headers;

    const result = await webhookService.processWebhook(toolType, toolId, {
      payload,
      headers,
      ip_address: request.ip
    });

    return {
      success: true,
      processed: result.processed,
      event_type: result.event_type
    };
  } catch (error) {
    server.log.error('Failed to process webhook:', error);
    reply.status(500).send({
      error: 'Webhook processing failed',
      details: error.message
    });
  }
});

// ===========================================
// ADMIN ENDPOINTS
// ===========================================

// Get tool configuration (Admin only)
server.get('/api/admin/tools/:toolId/config', {
  schema: {
    description: 'Get tool configuration (Admin only)',
    tags: ['Admin'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        toolId: { type: 'string' }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    if (!request.user.isAdmin) {
      return reply.status(403).send({
        error: 'Admin access required'
      });
    }

    const { toolId } = request.params;
    const toolConfig = await toolMetadataService.getToolConfiguration(toolId);

    return {
      success: true,
      tool_config: toolConfig
    };
  } catch (error) {
    server.log.error('Failed to get tool configuration:', error);
    reply.status(500).send({
      error: 'Failed to retrieve tool configuration',
      details: error.message
    });
  }
});

// Update tool configuration (Admin only)
server.put('/api/admin/tools/:toolId/config', {
  schema: {
    description: 'Update tool configuration (Admin only)',
    tags: ['Admin'],
    security: [{ IdentityHeaders: [] }],
    params: {
      type: 'object',
      properties: {
        toolId: { type: 'string' }
      }
    },
    body: {
      type: 'object',
      properties: {
        launch_config: { type: 'object' },
        webhook_config: { type: 'object' },
        capabilities: { type: 'object' },
        metadata: { type: 'object' }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    if (!request.user.isAdmin) {
      return reply.status(403).send({
        error: 'Admin access required'
      });
    }

    const { toolId } = request.params;
    const configUpdates = request.body;

    const updatedConfig = await toolMetadataService.updateToolConfiguration(toolId, {
      ...configUpdates,
      updated_by: request.user
    });

    return {
      success: true,
      tool_config: updatedConfig,
      message: 'Tool configuration updated successfully'
    };
  } catch (error) {
    server.log.error('Failed to update tool configuration:', error);
    reply.status(500).send({
      error: 'Failed to update tool configuration',
      details: error.message
    });
  }
});

// Bulk Tool Configuration Update API (Admin only) - For automation and setup scripts
server.put('/api/admin/tools/bulk-config', {
  schema: {
    description: 'Bulk update tool configurations (Admin only) - Updates multiple tools and their Keycloak clients',
    tags: ['Admin'],
    security: [{ IdentityHeaders: [] }],
    body: {
      type: 'object',
      properties: {
        tools: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slug: { type: 'string', description: 'Tool slug identifier' },
              base_url: { type: 'string', format: 'uri', description: 'Tool base URL' },
              integration_type: { 
                type: 'string', 
                enum: ['oidc', 'oauth2', 'saml', 'custom'],
                description: 'Authentication integration type'
              },
              auth_config: { 
                type: 'object',
                description: 'Tool-specific authentication configuration'
              }
            },
            required: ['slug']
          }
        }
      },
      required: ['tools']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          updated_tools: { type: 'array' },
          failed_tools: { type: 'array' },
          message: { type: 'string' }
        }
      }
    }
  },
  preHandler: [authenticateRequest]
}, async (request, reply) => {
  try {
    if (!request.user.isAdmin) {
      return reply.status(403).send({
        error: 'Admin access required for bulk configuration updates'
      });
    }

    const { tools } = request.body;
    const results = {
      updated_tools: [],
      failed_tools: [],
      keycloak_updates: []
    };

    server.log.info(`🔧 Starting bulk configuration update for ${tools.length} tools by ${request.user.email}`);

    for (const toolConfig of tools) {
      const { slug, base_url, integration_type, auth_config } = toolConfig;
      
      try {
        // Get tool by slug
        const tool = await databaseManager.getToolBySlug(slug);
        if (!tool) {
          results.failed_tools.push({
            slug,
            error: 'Tool not found'
          });
          continue;
        }

        // Update basic tool information if provided
        const updateData = {};
        if (base_url) updateData.base_url = base_url;
        
        if (Object.keys(updateData).length > 0) {
          await databaseManager.updateTool(tool.id, updateData);
          server.log.info(`✅ Updated basic config for ${slug}`);
        }

        // Update authentication configuration if provided
        if (integration_type && auth_config) {
          await databaseManager.updateToolConfig(tool.id, {
            integration_type,
            auth_config
          });
          server.log.info(`✅ Updated auth config for ${slug}`);
          
          // Update Keycloak client if this is a specialized tool
          const specializedTools = ['grafana', 'sonarqube', 'jenkins', 'github', 'gitlab', 'argocd', 'terraform', 'prometheus', 'kibana', 'snyk', 'jira', 'servicenow'];
          
          if (specializedTools.includes(slug) && 
              (integration_type === 'oidc' || integration_type === 'oauth2' || integration_type === 'saml')) {
            
            try {
              server.log.info(`🔧 Updating Keycloak client for ${slug}...`);
              
              // Transform configuration and update admin-config service
              const transformedConfig = transformToAdminConfigSchema(slug, auth_config, integration_type);
              
              const keycloakResponse = await server.axios.put(
                `${config.ADMIN_CONFIG_SERVICE_URL}/api/tools/${slug}/config`, 
                transformedConfig, 
                {
                  timeout: 30000,
                  headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': request.user.sub,
                    'X-User-Email': request.user.email,
                    'X-User-Roles': JSON.stringify(request.user.roles || []),
                    'X-Api-Key': process.env.ADMIN_API_KEY || 'admin-api-key-change-in-production'
                  }
                }
              );
              
              results.keycloak_updates.push({
                slug,
                status: 'success',
                message: 'Keycloak client updated successfully'
              });
              server.log.info(`✅ Successfully updated Keycloak client for ${slug}`);
            } catch (keycloakError) {
              results.keycloak_updates.push({
                slug,
                status: 'warning',
                message: `Keycloak update failed: ${keycloakError.message}`
              });
              server.log.warn(`⚠️ Failed to update Keycloak client for ${slug}:`, keycloakError.message);
            }
          }
        }

        results.updated_tools.push({
          slug,
          status: 'success',
          updated_fields: Object.keys(updateData).concat(integration_type ? ['auth_config'] : [])
        });

      } catch (error) {
        server.log.error(`❌ Failed to update ${slug}:`, error);
        results.failed_tools.push({
          slug,
          error: error.message
        });
      }
    }

    const totalUpdated = results.updated_tools.length;
    const totalFailed = results.failed_tools.length;
    const keycloakUpdates = results.keycloak_updates.filter(u => u.status === 'success').length;
    
    server.log.info(`🎯 Bulk update completed: ${totalUpdated} success, ${totalFailed} failed, ${keycloakUpdates} Keycloak updates`);

    return {
      success: totalFailed === 0,
      message: `Bulk update completed: ${totalUpdated} tools updated successfully${totalFailed > 0 ? `, ${totalFailed} failed` : ''}`,
      summary: {
        total_tools: tools.length,
        successful_updates: totalUpdated,
        failed_updates: totalFailed,
        keycloak_updates: keycloakUpdates
      },
      results
    };

  } catch (error) {
    server.log.error('❌ Bulk configuration update failed:', error);
    reply.status(500).send({
      error: 'Bulk configuration update failed',
      details: error.message
    });
  }
});

// Workflow Detection Helper
async function detectWorkflowType(toolSlug, context) {
  // Define common workflow patterns
  const workflowPatterns = {
    'ci_cd_pipeline': {
      type: 'ci_cd_pipeline',
      name: 'CI/CD Pipeline Workflow',
      expectedTools: ['github', 'gitlab', 'jenkins', 'sonarqube', 'argocd'],
      entryPoints: ['github', 'gitlab'],
      description: 'Code commit to deployment workflow'
    },
    'incident_response': {
      type: 'incident_response',
      name: 'Incident Response Workflow',
      expectedTools: ['grafana', 'prometheus', 'kibana', 'jira', 'servicenow'],
      entryPoints: ['grafana', 'prometheus'],
      description: 'Alert to resolution workflow'
    },
    'security_review': {
      type: 'security_review',
      name: 'Security Vulnerability Review',
      expectedTools: ['snyk', 'sonarqube', 'jira'],
      entryPoints: ['snyk', 'sonarqube'],
      description: 'Security scan to fix workflow'
    },
    'infrastructure_deployment': {
      type: 'infrastructure_deployment',
      name: 'Infrastructure Deployment',
      expectedTools: ['terraform', 'argocd', 'grafana', 'prometheus'],
      entryPoints: ['terraform'],
      description: 'Infrastructure provisioning to monitoring'
    }
  };

  // Detect workflow based on entry point and context
  for (const [key, pattern] of Object.entries(workflowPatterns)) {
    if (pattern.entryPoints.includes(toolSlug)) {
      // Additional context-based detection could be added here
      if (context && typeof context === 'object') {
        // Check for workflow indicators in context
        if (context.workflow_type === key) {
          return pattern;
        }
        if (context.pipeline_id && key === 'ci_cd_pipeline') {
          return pattern;
        }
        if (context.incident_id && key === 'incident_response') {
          return pattern;
        }
        if (context.vulnerability_scan && key === 'security_review') {
          return pattern;
        }
        if (context.terraform_plan && key === 'infrastructure_deployment') {
          return pattern;
        }
      }
      
      // Default to pattern if tool is a common entry point
      return pattern;
    }
  }

  return null;
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

// Helper function to resolve tool ID (UUID or slug)
async function resolveToolId(toolId, databaseManager) {
  try {
    // Check if it's a UUID
    if (toolId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      return await databaseManager.getToolById(toolId);
    } else {
      // It's a slug
      return await databaseManager.getToolBySlug(toolId);
    }
  } catch (error) {
    return null;
  }
}

// Test tool connection based on integration type
async function testToolConnection(toolId, integrationType, config) {
  try {
    const axios = require('axios');
    const result = { success: false, message: '', details: {} };

    server.log.info(`Testing connection for tool ${toolId}, type: ${integrationType}`, { config: Object.keys(config) });

    switch (integrationType) {
      case 'oidc':
        // Test OIDC endpoints - prioritize auth_url since discovery endpoint may not be available
        if (config.auth_url) {
          try {
            // Convert localhost URLs to keycloak container name for internal Docker network access
            let testUrl = config.auth_url;
            if (testUrl.includes('localhost:8080')) {
              testUrl = testUrl.replace('localhost:8080', 'keycloak:8080');
            }
            
            server.log.info(`Testing OIDC auth URL: ${testUrl}`);
            
            // Add minimal required parameters for auth endpoint test
            const testParams = `?client_id=${encodeURIComponent(config.client_id || 'test')}&response_type=code&redirect_uri=http://localhost:3000/callback`;
            const fullTestUrl = testUrl + testParams;
            
            const response = await axios.get(fullTestUrl, { 
              timeout: 10000,
              validateStatus: (status) => status < 500, // Accept redirects and auth challenges (400, 302, etc.)
              maxRedirects: 0 // Don't follow redirects - we just want to test endpoint availability
            });
            result.success = true;
            result.message = 'OIDC authorization endpoint accessible and responding';
            result.details = {
              endpoint: config.auth_url,
              internal_endpoint: testUrl,
              client_id: config.client_id,
              status_code: response.status,
              response_type: 'success'
            };
            server.log.info(`OIDC connection test passed: ${response.status}`);
          } catch (error) {
            // For OIDC endpoints, a 302 redirect or HTML response is actually success
            if (error.response && (error.response.status === 302 || error.response.status === 200)) {
              result.success = true;
              result.message = 'OIDC authorization endpoint accessible (redirect response)';
              result.details = {
                endpoint: config.auth_url,
                client_id: config.client_id,
                status_code: error.response.status,
                response_type: 'redirect'
              };
              server.log.info(`OIDC connection test passed with redirect: ${error.response.status}`);
            } else {
              server.log.warn(`OIDC connection test failed:`, error.message);
              result.message = `OIDC authorization endpoint test failed: ${error.message}`;
              result.details = { error: error.message, endpoint: config.auth_url };
            }
          }
        } else if (config.discovery_url) {
          // Fallback to discovery endpoint
          try {
            // Convert localhost URLs to keycloak container name for internal Docker network access
            let testUrl = config.discovery_url;
            if (testUrl.includes('localhost:8080')) {
              testUrl = testUrl.replace('localhost:8080', 'keycloak:8080');
            }
            
            const response = await axios.get(testUrl, { timeout: 10000 });
            if (response.data && response.data.authorization_endpoint) {
              result.success = true;
              result.message = 'OIDC discovery endpoint accessible';
              result.details = {
                authorization_endpoint: response.data.authorization_endpoint,
                token_endpoint: response.data.token_endpoint,
                userinfo_endpoint: response.data.userinfo_endpoint
              };
            } else {
              result.message = 'Invalid OIDC discovery response';
            }
          } catch (error) {
            result.message = `OIDC discovery failed: ${error.message}`;
          }
        } else {
          result.message = 'Missing auth URL or discovery URL for OIDC configuration';
        }
        break;

      case 'oauth2':
        // Test OAuth2 authorization endpoint
        if (config.auth_url) {
          try {
            // Convert localhost URLs to keycloak container name for internal Docker network access
            let testUrl = config.auth_url;
            if (testUrl.includes('localhost:8080')) {
              testUrl = testUrl.replace('localhost:8080', 'keycloak:8080');
            }
            
            server.log.info(`Testing OAuth2 auth URL: ${testUrl}`);
            
            // Add minimal required parameters for auth endpoint test
            const testParams = `?client_id=${encodeURIComponent(config.client_id || 'test')}&response_type=code&redirect_uri=http://localhost:3000/callback`;
            const fullTestUrl = testUrl + testParams;
            
            const response = await axios.get(fullTestUrl, { 
              timeout: 10000,
              validateStatus: (status) => status < 500, // Accept redirects and auth challenges (400, 302, etc.)
              maxRedirects: 0 // Don't follow redirects
            });
            result.success = true;
            result.message = 'OAuth2 authorization endpoint accessible and responding';
            result.details = {
              endpoint: config.auth_url,
              internal_endpoint: testUrl,
              client_id: config.client_id,
              grant_type: config.grant_type,
              status_code: response.status,
              response_type: 'success'
            };
            server.log.info(`OAuth2 connection test passed: ${response.status}`);
          } catch (error) {
            // For OAuth2 endpoints, a 302 redirect or HTML response is actually success
            if (error.response && (error.response.status === 302 || error.response.status === 200)) {
              result.success = true;
              result.message = 'OAuth2 authorization endpoint accessible (redirect response)';
              result.details = {
                endpoint: config.auth_url,
                client_id: config.client_id,
                grant_type: config.grant_type,
                status_code: error.response.status,
                response_type: 'redirect'
              };
              server.log.info(`OAuth2 connection test passed with redirect: ${error.response.status}`);
            } else {
              server.log.warn(`OAuth2 connection test failed:`, error.message);
              result.message = `OAuth2 endpoint test failed: ${error.message}`;
              result.details = { error: error.message, endpoint: config.auth_url };
            }
          }
        } else {
          result.message = 'Missing authorization URL for OAuth2 configuration';
        }
        break;

      case 'saml':
        // Test SAML IdP SSO URL
        if (config.idp_sso_url) {
          try {
            // Convert localhost URLs to keycloak container name for internal Docker network access
            let testUrl = config.idp_sso_url;
            if (testUrl.includes('localhost:8080')) {
              testUrl = testUrl.replace('localhost:8080', 'keycloak:8080');
            }
            
            const response = await axios.get(testUrl, { 
              timeout: 10000,
              validateStatus: (status) => status < 500
            });
            result.success = true;
            result.message = 'SAML IdP SSO endpoint accessible';
          } catch (error) {
            result.message = `SAML IdP test failed: ${error.message}`;
          }
        } else {
          result.message = 'Missing IdP SSO URL for SAML configuration';
        }
        break;

      case 'custom':
        // Test custom API endpoint
        if (config.base_url) {
          try {
            const headers = {};
            
            // Add authentication header based on auth type
            if (config.auth_type === 'api_key' && config.api_key) {
              headers['Authorization'] = `ApiKey ${config.api_key}`;
            } else if (config.auth_type === 'bearer_token' && config.bearer_token) {
              headers['Authorization'] = `Bearer ${config.bearer_token}`;
            } else if (config.auth_type === 'basic_auth' && config.username && config.password) {
              const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
              headers['Authorization'] = `Basic ${credentials}`;
            } else if (config.auth_type === 'custom_header' && config.header_name && config.header_value) {
              headers[config.header_name] = config.header_value;
            }

            const response = await axios.get(config.base_url, { 
              headers,
              timeout: 10000,
              validateStatus: (status) => status < 500
            });
            result.success = response.status < 400;
            result.message = `API endpoint test completed (HTTP ${response.status})`;
          } catch (error) {
            result.message = `API endpoint test failed: ${error.message}`;
          }
        } else {
          result.message = 'Missing base URL for custom configuration';
        }
        break;

      default:
        result.message = `Unsupported integration type: ${integrationType}`;
    }

    return result;
  } catch (error) {
    return {
      success: false,
      message: `Connection test failed: ${error.message}`,
      details: {}
    };
  }
}

// Graceful shutdown handling
async function gracefulShutdown() {
  try {
    server.log.info('🛑 Graceful shutdown initiated');
    
    if (webhookService) {
      await webhookService.stop();
    }
    
    await server.close();
    server.log.info('✅ Enhanced Catalog Service shutdown complete');
    process.exit(0);
  } catch (error) {
    server.log.error('❌ Shutdown error:', error);
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

    // Axios already registered in setupServer()

    policyService = new PolicyService(server, config, databaseManager);
    toolMetadataService = new ToolMetadataService(server, config, databaseManager);
    launchService = new LaunchService(server, config, databaseManager, policyService);
    webhookService = new WebhookService(server, config, databaseManager);

    await policyService.initialize();
    await launchService.initialize();
    await webhookService.initialize();
    
    const port = parseInt(config.PORT, 10);
    const host = config.HOST;
    
    await server.listen({ port, host });
    
    server.log.info(`🚀 Enhanced Catalog Service listening on ${host}:${port}`);
    server.log.info('🎯 Phase 3: Tool-specific launch capabilities, deep-linking, and webhook integration ready');
    server.log.info(`📚 API Documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
