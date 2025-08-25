// User Service - Phase 2 SSO Hub (Simplified Working Version)
// Handles user profiles, preferences, API keys, and local user management

const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

const config = require('./config');

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
        description: 'User management service for SSO Hub',
        version: '1.0.0'
      },
      servers: [
        {
          url: 'http://localhost:3003',
          description: 'Development server'
        }
      ]
    }
  });

  await fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });
}

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  
  reply.status(error.statusCode || 500).send({
    error: error.name || 'Error',
    message: error.message
  });
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

// Simple authentication check endpoint (no auth required for testing)
fastify.get('/users/test', async (request, reply) => {
  return { 
    message: 'User service is working!',
    timestamp: new Date().toISOString(),
    headers: request.headers 
  };
});

// Protected endpoint example (with basic auth check)
fastify.get('/users/me', async (request, reply) => {
  const userSub = request.headers['x-user-sub'];
  
  if (!userSub) {
    return reply.code(401).send({ 
      error: 'Unauthorized',
      message: 'Missing identity headers - please authenticate through Auth-BFF'
    });
  }

  // Try to get user from database
  try {
    const result = await fastify.pg.query('SELECT * FROM users WHERE keycloak_sub = $1', [userSub]);
    
    if (result.rows.length === 0) {
      // Create user if doesn't exist
      const email = request.headers['x-user-email'];
      const name = request.headers['x-user-name'];
      
      if (!email) {
        return reply.code(400).send({ error: 'Missing user email' });
      }
      
      const insertResult = await fastify.pg.query(
        'INSERT INTO users (keycloak_sub, email, username, display_name) VALUES ($1, $2, $3, $4) RETURNING *',
        [userSub, email, email.split('@')[0], name]
      );
      
      return { 
        user: insertResult.rows[0],
        created: true,
        message: 'User profile created automatically'
      };
    }
    
    return { 
      user: result.rows[0],
      created: false
    };
  } catch (error) {
    fastify.log.error('Database error:', error);
    return reply.code(500).send({ error: 'Database error' });
  }
});

// Start server
const start = async () => {
  try {
    await registerPlugins();
    
    await fastify.listen({ 
      port: config.PORT, 
      host: config.HOST 
    });
    
    fastify.log.info(`✅ User Service listening on ${config.HOST}:${config.PORT}`);
    fastify.log.info(`📚 API Documentation: http://${config.HOST}:${config.PORT}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
