/**
 * SSO Hub Authentication Proxy Service
 * 
 * This service provides seamless authentication by acting as a proxy
 * that injects authentication headers and handles session management
 * for tools that don't support direct token authentication.
 */

const Fastify = require('fastify');
const config = require('./config');
const axios = require('axios');

const server = Fastify({
  logger: { level: config.LOG_LEVEL }
});

// Setup server plugins
async function setupServer() {
  try {
    // CORS
    await server.register(require('@fastify/cors'), {
      origin: config.CORS_ORIGIN,
      credentials: true
    });

    // Security headers
    await server.register(require('@fastify/helmet'), {
      contentSecurityPolicy: false
    });

    // Redis for token validation
    await server.register(require('@fastify/redis'), {
      url: config.REDIS_URL
    });

    // Cookie support
    await server.register(require('@fastify/cookie'));

    server.log.info('✅ Auth Proxy Service: All plugins registered');
  } catch (error) {
    server.log.error('❌ Server setup failed:', error);
    throw error;
  }
}

// Validate authentication token
async function validateToken(token) {
  try {
    const data = await server.redis.get(`auth_token:${token}`);
    if (!data) {
      return null;
    }

    const tokenData = JSON.parse(data);
    
    // Check expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      await server.redis.del(`auth_token:${token}`);
      return null;
    }

    return tokenData;
  } catch (error) {
    server.log.error('Token validation error:', error);
    return null;
  }
}

// Health check
server.get('/healthz', async () => {
  return { 
    status: 'ok', 
    service: 'auth-proxy', 
    timestamp: new Date().toISOString() 
  };
});

// Seamless Grafana authentication endpoint
server.get('/grafana/seamless', async (request, reply) => {
  try {
    const token = request.query.token;
    const redirectTo = request.query.redirect_to || '/';
    
    if (!token) {
      return reply.status(401).send({ error: 'Token required' });
    }

    const authData = await validateToken(token);
    if (!authData) {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    // Create Grafana session using admin API
    const grafanaUrl = config.GRAFANA_URL || 'http://sso-grafana-test:3000';
    
    try {
      // Option 1: Try to create session via Grafana API
      const sessionResponse = await axios.post(
        `${grafanaUrl}/api/auth/keys`,
        {
          name: `sso-session-${authData.user_email}-${Date.now()}`,
          role: authData.user_roles.includes('admin') ? 'Admin' : 'Editor',
          secondsToLive: 86400 // 24 hours
        },
        {
          auth: {
            username: config.GRAFANA_ADMIN_USER || 'admin',
            password: config.GRAFANA_ADMIN_PASSWORD || 'grafana_admin_pass'
          }
        }
      );

      const apiKey = sessionResponse.data.key;
      
      // Set cookie and redirect
      reply.setCookie('grafana_session', apiKey, {
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        sameSite: 'lax',
        path: '/',
        maxAge: 86400 // 24 hours
      });

      // Redirect to Grafana with session
      const publicGrafanaUrl = 'http://localhost:3100';
      return reply.redirect(`${publicGrafanaUrl}${redirectTo}`);
    } catch (grafanaError) {
      server.log.warn('Grafana API session creation failed, trying alternate method:', grafanaError.message);
      
      // Option 2: Redirect with auth proxy headers
      // This requires Grafana to be configured with auth.proxy.enabled = true
      const publicGrafanaUrl = 'http://localhost:3100';
      
      // Store auth data temporarily for proxy pass
      await server.redis.setex(
        `proxy_auth:${token}`,
        300, // 5 minutes TTL
        JSON.stringify({
          user: authData.user_email,
          name: authData.user_name,
          roles: authData.user_roles
        })
      );
      
      // Redirect to Grafana with token in URL (Grafana needs to be configured to accept this)
      return reply.redirect(`${publicGrafanaUrl}/login?token=${token}&redirect=${encodeURIComponent(redirectTo)}`);
    }
  } catch (error) {
    server.log.error('Seamless Grafana auth failed:', error);
    return reply.status(500).send({ 
      error: 'Authentication failed',
      details: error.message 
    });
  }
});

// Generic proxy endpoint with authentication
server.all('/proxy/:token/*', async (request, reply) => {
  try {
    const token = request.params.token;
    const target = request.query.target;
    
    if (!token || !target) {
      return reply.status(400).send({ 
        error: 'Token and target URL required' 
      });
    }

    const authData = await validateToken(token);
    if (!authData) {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    // Get proxy configuration from Redis or use defaults
    const proxyConfigStr = await server.redis.get(`proxy_config:${token}`);
    const proxyConfig = proxyConfigStr ? JSON.parse(proxyConfigStr) : {};
    
    // Extract path after /proxy/:token
    const proxyPath = request.url.replace(`/proxy/${token}`, '');
    const fullUrl = target + proxyPath;
    
    // Forward request with auth headers
    const response = await axios({
      method: request.method,
      url: fullUrl,
      headers: {
        ...request.headers,
        'x-webauth-user': authData.user_email,
        'x-webauth-name': authData.user_name,
        'x-webauth-role': authData.user_roles.includes('admin') ? 'Admin' : 'Editor',
        'x-authenticated-by': 'sso-hub',
        ...proxyConfig.headers,
        'host': new URL(target).host
      },
      data: request.body,
      validateStatus: () => true,
      maxRedirects: 0
    });

    // Forward response
    reply.code(response.status);
    Object.entries(response.headers).forEach(([key, value]) => {
      if (key.toLowerCase() !== 'content-encoding') { // Skip compression headers
        reply.header(key, value);
      }
    });
    
    return response.data;
  } catch (error) {
    server.log.error('Proxy request failed:', error);
    return reply.status(500).send({ 
      error: 'Proxy request failed',
      details: error.message 
    });
  }
});

// Start server
const start = async () => {
  try {
    await setupServer();
    
    const port = parseInt(config.PORT, 10);
    const host = config.HOST;
    
    await server.listen({ port, host });
    
    server.log.info(`🚀 Auth Proxy Service listening on ${host}:${port}`);
    server.log.info('🔐 Seamless authentication proxy ready');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();