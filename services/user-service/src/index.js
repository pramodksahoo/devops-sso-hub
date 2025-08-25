// User Service - Phase 2 SSO Hub
// Handles user profiles, preferences, API keys, and local user management

const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

const config = require('./config');
const UserDatabase = require('./database');
const AuthMiddleware = require('./auth');
const { 
  UserProfileSchema, 
  UpdateUserProfileSchema, 
  CreateApiKeySchema, 
  CreateUserGroupSchema,
  UpdateUserGroupSchema,
  GroupMembershipSchema,
  UserQuerySchema,
  openApiSchemas 
} = require('./schemas');

let userDb;
let authMiddleware;

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(require('@fastify/cors'), {
    origin: config.CORS_ORIGIN,
    credentials: true
  });

  // Security headers
  await fastify.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  });

  // Rate limiting
  await fastify.register(require('@fastify/rate-limit'), {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW
  });

  // PostgreSQL
  await fastify.register(require('@fastify/postgres'), {
    connectionString: config.DATABASE_URL
  });

  // Swagger/OpenAPI Documentation
  await fastify.register(require('@fastify/swagger'), {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'SSO Hub User Service API',
        description: 'User management service for SSO Hub - handles user profiles, preferences, API keys, and local user data',
        version: '1.0.0'
      },
      servers: [
        {
          url: 'http://localhost:3003',
          description: 'Development server'
        }
      ],
      components: {
        schemas: openApiSchemas,
        securitySchemes: {
          identityHeaders: {
            type: 'apiKey',
            in: 'header',
            name: 'X-User-Sub',
            description: 'HMAC-signed identity headers from Auth-BFF'
          },
          apiKey: {
            type: 'http',
            scheme: 'bearer',
            description: 'User API key authentication'
          }
        }
      },
      security: [
        { identityHeaders: [] },
        { apiKey: [] }
      ]
    }
  });

  await fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });

  // Initialize database and auth middleware
  userDb = new UserDatabase(fastify.pg);
  authMiddleware = new AuthMiddleware(config, userDb);
}

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  
  if (error.validation) {
    reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation
    });
  } else if (error.statusCode) {
    reply.status(error.statusCode).send({
      error: error.name || 'Error',
      message: error.message
    });
  } else {
    reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  }
});

// Health check endpoints
fastify.get('/healthz', async (request, reply) => {
  try {
    await fastify.pg.query('SELECT 1');
    return { status: 'ok', service: 'user-service', timestamp: new Date().toISOString() };
  } catch (error) {
    reply.code(503).send({ status: 'error', message: 'Database connection failed' });
  }
});

fastify.get('/readyz', async (request, reply) => {
  try {
    await fastify.pg.query('SELECT COUNT(*) FROM users');
    return { status: 'ready', service: 'user-service', timestamp: new Date().toISOString() };
  } catch (error) {
    reply.code(503).send({ status: 'not ready', message: 'Database not accessible' });
  }
});

// User Profile Routes
fastify.register(async function userRoutes(fastify) {
  // Create local database and auth instances for this plugin
  const localUserDb = new UserDatabase(fastify.pg);
  const auth = new AuthMiddleware(config, localUserDb);
  fastify.addHook('preHandler', async (request, reply) => {
    await auth.authenticate(request, reply);
  });

  // Get current user profile
  fastify.get('/users/me', {
    schema: {
      description: 'Get current user profile',
      tags: ['Users'],
      security: [{ identityHeaders: [] }, { apiKey: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            keycloak_sub: { type: 'string' },
            email: { type: 'string' },
            username: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            display_name: { type: 'string' },
            is_active: { type: 'boolean' }
          }
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (request, reply) => {
    const userSub = request.user?.sub || request.apiKey?.userSub;
    
    let user = await localUserDb.getUserByKeycloakSub(userSub);
    
    if (!user) {
      // Auto-create user from identity headers if doesn't exist
      if (request.user) {
        const userData = {
          keycloak_sub: request.user.sub,
          email: request.user.email,
          username: request.user.email.split('@')[0], // Default username from email
          first_name: request.user.name?.split(' ')[0],
          last_name: request.user.name?.split(' ').slice(1).join(' '),
          display_name: request.user.name
        };
        
        try {
          user = await localUserDb.createUser(userData);
          fastify.log.info(`Auto-created user profile for ${user.email}`);
        } catch (error) {
          if (error.code === '23505') { // Unique constraint violation
            // Race condition - user was created by another request
            user = await localUserDb.getUserByKeycloakSub(userSub);
          } else {
            throw error;
          }
        }
      } else {
        return reply.code(404).send({ error: 'User not found' });
      }
    }
    
    return user;
  });

  // Update current user profile
  fastify.put('/users/me', {
    schema: {
      description: 'Update current user profile',
      tags: ['Users'],
      security: [{ identityHeaders: [] }, { apiKey: [] }],
      body: {
        type: 'object',
        properties: {
          first_name: { type: 'string', maxLength: 100 },
          last_name: { type: 'string', maxLength: 100 },
          display_name: { type: 'string', maxLength: 200 },
          avatar_url: { type: 'string', format: 'uri' },
          department: { type: 'string', maxLength: 100 },
          job_title: { type: 'string', maxLength: 100 },
          preferences: { type: 'object' },
          metadata: { type: 'object' }
        }
      },
      response: {
        200: { type: 'object' },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (request, reply) => {
    const userSub = request.user?.sub || request.apiKey?.userSub;
    
    try {
      const validatedData = UpdateUserProfileSchema.parse(request.body);
      
      let user = await localUserDb.getUserByKeycloakSub(userSub);
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      const updatedUser = await localUserDb.updateUser(user.id, validatedData);
      return updatedUser;
    } catch (error) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ 
          error: 'Validation Error', 
          message: error.errors.map(e => e.message).join(', ')
        });
      }
      throw error;
    }
  });

  // Admin: Search and list users
  fastify.get('/users', {
    preHandler: [auth.requireRole(['admin', 'user-admin'])],
    schema: {
      description: 'Search and list users (admin only)',
      tags: ['Users'],
      security: [{ identityHeaders: [] }, { apiKey: [] }],
      querystring: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          department: { type: 'string' },
          is_active: { type: 'boolean' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          sort: { type: 'string', enum: ['created_at', 'updated_at', 'username', 'email', 'last_login_at'] },
          order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      },
      response: {
        200: { $ref: '#/components/schemas/PaginatedResponse' },
        401: { $ref: '#/components/schemas/Error' },
        403: { $ref: '#/components/schemas/Error' }
      }
    }
  }, async (request, reply) => {
    try {
      const queryParams = UserQuerySchema.parse(request.query);
      const result = await localUserDb.searchUsers(queryParams);
      return result;
    } catch (error) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ 
          error: 'Validation Error', 
          message: error.errors.map(e => e.message).join(', ')
        });
      }
      throw error;
    }
  });

  // Admin: Get user by ID
  fastify.get('/users/:userId', {
    preHandler: [auth.requireRole(['admin', 'user-admin'])],
    schema: {
      description: 'Get user by ID (admin only)',
      tags: ['Users'],
      security: [{ identityHeaders: [] }, { apiKey: [] }],
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' }
        },
        required: ['userId']
      },
      response: {
        200: { $ref: '#/components/schemas/User' },
        401: { $ref: '#/components/schemas/Error' },
        403: { $ref: '#/components/schemas/Error' },
        404: { $ref: '#/components/schemas/Error' }
      }
    }
  }, async (request, reply) => {
    const user = await localUserDb.getUserById(request.params.userId);
    
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    return user;
  });
});

// API Key Management Routes
fastify.register(async function apiKeyRoutes(fastify) {
  const localUserDb = new UserDatabase(fastify.pg);
  const auth = new AuthMiddleware(config, localUserDb);
  fastify.addHook('preHandler', async (request, reply) => {
    await auth.authenticate(request, reply);
  });

  // Create API key
  fastify.post('/users/me/api-keys', {
    schema: {
      description: 'Create a new API key for current user',
      tags: ['API Keys'],
      security: [{ identityHeaders: [] }, { apiKey: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          permissions: { type: 'array', items: { type: 'string' }, default: [] },
          expires_at: { type: 'string', format: 'date-time' }
        },
        required: ['name']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            api_key: { type: 'string' },
            key_data: { $ref: '#/components/schemas/UserApiKey' }
          }
        },
        400: { $ref: '#/components/schemas/Error' },
        401: { $ref: '#/components/schemas/Error' }
      }
    }
  }, async (request, reply) => {
    const userSub = request.user?.sub || request.apiKey?.userSub;
    
    try {
      const validatedData = CreateApiKeySchema.parse(request.body);
      
      let user = await localUserDb.getUserByKeycloakSub(userSub);
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      const result = await localUserDb.createApiKey(user.id, validatedData);
      
      reply.code(201).send({
        api_key: result.api_key,
        key_data: {
          id: result.id,
          name: result.name,
          key_prefix: result.key_prefix,
          permissions: result.permissions,
          expires_at: result.expires_at,
          is_active: result.is_active,
          created_at: result.created_at
        }
      });
    } catch (error) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ 
          error: 'Validation Error', 
          message: error.errors.map(e => e.message).join(', ')
        });
      }
      throw error;
    }
  });

  // List user's API keys
  fastify.get('/users/me/api-keys', {
    schema: {
      description: 'List current user API keys',
      tags: ['API Keys'],
      security: [{ identityHeaders: [] }, { apiKey: [] }],
      response: {
        200: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserApiKey' }
        },
        401: { $ref: '#/components/schemas/Error' }
      }
    }
  }, async (request, reply) => {
    const userSub = request.user?.sub || request.apiKey?.userSub;
    
    let user = await localUserDb.getUserByKeycloakSub(userSub);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    const apiKeys = await localUserDb.getUserApiKeys(user.id);
    return apiKeys;
  });

  // Revoke API key
  fastify.delete('/users/me/api-keys/:keyId', {
    schema: {
      description: 'Revoke an API key',
      tags: ['API Keys'],
      security: [{ identityHeaders: [] }, { apiKey: [] }],
      params: {
        type: 'object',
        properties: {
          keyId: { type: 'string', format: 'uuid' }
        },
        required: ['keyId']
      },
      response: {
        204: { type: 'null' },
        401: { $ref: '#/components/schemas/Error' },
        404: { $ref: '#/components/schemas/Error' }
      }
    }
  }, async (request, reply) => {
    const userSub = request.user?.sub || request.apiKey?.userSub;
    
    let user = await localUserDb.getUserByKeycloakSub(userSub);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    const result = await localUserDb.revokeApiKey(user.id, request.params.keyId);
    
    if (!result) {
      return reply.code(404).send({ error: 'API key not found' });
    }
    
    reply.code(204).send();
  });
});

// User Groups Routes (Admin only)
fastify.register(async function groupRoutes(fastify) {
  const localUserDb = new UserDatabase(fastify.pg);
  const auth = new AuthMiddleware(config, localUserDb);
  fastify.addHook('preHandler', async (request, reply) => {
    await auth.authenticate(request, reply);
  });
  fastify.addHook('preHandler', async (request, reply) => {
    await auth.requireRole(['admin', 'user-admin'])(request, reply);
  });

  // Create user group
  fastify.post('/groups', {
    schema: {
      description: 'Create a new user group (admin only)',
      tags: ['User Groups'],
      security: [{ identityHeaders: [] }, { apiKey: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string' },
          permissions: { type: 'array', items: { type: 'string' }, default: [] },
          metadata: { type: 'object', default: {} }
        },
        required: ['name']
      },
      response: {
        201: { $ref: '#/components/schemas/UserGroup' },
        400: { $ref: '#/components/schemas/Error' },
        401: { $ref: '#/components/schemas/Error' },
        403: { $ref: '#/components/schemas/Error' }
      }
    }
  }, async (request, reply) => {
    try {
      const validatedData = CreateUserGroupSchema.parse(request.body);
      const group = await localUserDb.createUserGroup(validatedData);
      reply.code(201).send(group);
    } catch (error) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ 
          error: 'Validation Error', 
          message: error.errors.map(e => e.message).join(', ')
        });
      }
      if (error.code === '23505') {
        return reply.code(409).send({ error: 'Group name already exists' });
      }
      throw error;
    }
  });

  // List user groups
  fastify.get('/groups', {
    schema: {
      description: 'List user groups (admin only)',
      tags: ['User Groups'],
      security: [{ identityHeaders: [] }, { apiKey: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      },
      response: {
        200: { $ref: '#/components/schemas/PaginatedResponse' },
        401: { $ref: '#/components/schemas/Error' },
        403: { $ref: '#/components/schemas/Error' }
      }
    }
  }, async (request, reply) => {
    const { page = 1, limit = 20 } = request.query;
    const result = await localUserDb.getUserGroups(page, limit);
    return result;
  });
});

// Start server
const start = async () => {
  try {
    await registerPlugins();
    
    await fastify.listen({ 
      port: config.PORT, 
      host: config.HOST 
    });
    
    fastify.log.info(`User Service listening on ${config.HOST}:${config.PORT}`);
    fastify.log.info(`API Documentation available at http://${config.HOST}:${config.PORT}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
