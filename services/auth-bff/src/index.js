/**
 * SSO Hub Auth-BFF Service - WORKING VERSION
 * 
 * Fixed authentication service with proper scope handling
 */

const fastify = require('fastify');
const { Issuer, generators } = require('openid-client');

// Initialize configuration
const config = {
  PORT: process.env.PORT || 3002,
  HOST: process.env.HOST || '0.0.0.0',
  
  // OIDC Configuration - Environment aware
  OIDC_ISSUER: process.env.OIDC_ISSUER || 'http://keycloak:8080/realms/sso-hub',
  OIDC_PUBLIC_URL: process.env.KEYCLOAK_PUBLIC_URL || process.env.OIDC_ISSUER || 'http://localhost:8080/realms/sso-hub',
  OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID || 'sso-hub-client',
  OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET || 'your-client-secret',
  OIDC_REDIRECT_URI: process.env.OIDC_REDIRECT_URI || 'http://localhost:3002/auth/callback',
  
  // Security
  SESSION_SECRET: process.env.SESSION_SECRET || 'super-secret-session-key-for-development',
  
  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  CORS_ORIGIN: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3002'],
  
  // Session Configuration
  SESSION_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
};

// Initialize Fastify with disabled logger
const server = fastify({
  logger: false
});

// Global variables
let oidcClient = null;

// OIDC Client initialization - Manual configuration (no discovery endpoint dependency)
async function initializeOIDC() {
  try {
    console.log('🔧 Initializing OIDC client...');
    console.log('🔗 OIDC Issuer URL:', config.OIDC_ISSUER);
    
    // Manual OIDC issuer configuration (bypassing discovery endpoint)
    const issuer = new Issuer({
      issuer: config.OIDC_ISSUER,
      authorization_endpoint: `${config.OIDC_ISSUER}/protocol/openid-connect/auth`,
      token_endpoint: `${config.OIDC_ISSUER}/protocol/openid-connect/token`,
      userinfo_endpoint: `${config.OIDC_ISSUER}/protocol/openid-connect/userinfo`,
      jwks_uri: `${config.OIDC_ISSUER}/protocol/openid-connect/certs`,
      end_session_endpoint: `${config.OIDC_ISSUER}/protocol/openid-connect/logout`,
      introspection_endpoint: `${config.OIDC_ISSUER}/protocol/openid-connect/token/introspect`,
      revocation_endpoint: `${config.OIDC_ISSUER}/protocol/openid-connect/revoke`
    });
    console.log('✅ OIDC manual configuration successful');
    console.log('🔍 Raw authorization endpoint:', issuer.authorization_endpoint);
    console.log('🔍 Raw token endpoint:', issuer.token_endpoint);
    
    // SMART FIX: Create issuer with environment-aware endpoint correction
    // Browser endpoints: Use public URL | Server endpoints: Use internal keycloak URL
    const publicUrl = config.OIDC_PUBLIC_URL.replace('/realms/sso-hub', '');
    const internalUrl = config.OIDC_ISSUER.replace('/realms/sso-hub', '');
    
    console.log('🔧 Public URL (for browser):', publicUrl);
    console.log('🔧 Internal URL (for server):', internalUrl);
    
    const correctedIssuer = new Issuer({
      issuer: issuer.issuer,
      // Browser-facing endpoints use public URL
      authorization_endpoint: issuer.authorization_endpoint.replace(internalUrl, publicUrl),
      end_session_endpoint: issuer.end_session_endpoint?.replace(internalUrl, publicUrl),
      // Server-side endpoints use internal URL for container communication  
      token_endpoint: issuer.token_endpoint.replace(publicUrl, internalUrl),
      userinfo_endpoint: issuer.userinfo_endpoint?.replace(publicUrl, internalUrl),
      jwks_uri: issuer.jwks_uri?.replace(publicUrl, internalUrl),
      introspection_endpoint: issuer.introspection_endpoint?.replace(publicUrl, internalUrl),
      revocation_endpoint: issuer.revocation_endpoint?.replace(publicUrl, internalUrl)
    });
    
    console.log('🔧 Corrected authorization endpoint (browser):', correctedIssuer.authorization_endpoint);
    console.log('🔧 Corrected token endpoint (server):', correctedIssuer.token_endpoint);
    console.log('🔧 Corrected userinfo endpoint (server):', correctedIssuer.userinfo_endpoint);
    console.log('🔧 Corrected JWKS URI (server):', correctedIssuer.jwks_uri);
    
    oidcClient = new correctedIssuer.Client({
      client_id: config.OIDC_CLIENT_ID,
      client_secret: config.OIDC_CLIENT_SECRET,
      redirect_uris: [config.OIDC_REDIRECT_URI],
      response_types: ['code'],
    });
    
    console.log('✅ OIDC client initialized successfully');
    console.log('✅ Client ID:', config.OIDC_CLIENT_ID);
    console.log('✅ Redirect URI:', config.OIDC_REDIRECT_URI);
  } catch (error) {
    console.error('❌ OIDC initialization failed:', error.message);
    console.error('❌ Full error:', error);
    console.log('🔗 Attempted OIDC Issuer:', config.OIDC_ISSUER);
    console.log('⚠️ Service will start without OIDC - auth endpoints will not work');
    oidcClient = null;
  }
}

// Server setup with proper plugin registration
async function setupServer() {
  try {
    // 1. CORS Configuration - Fixed for proper origin handling
    await server.register(require('@fastify/cors'), {
      origin: (origin, callback) => {
        // Allow requests from the frontend and localhost variants
        const allowedOrigins = ['http://localhost:3000', 'http://localhost:3002', 'http://127.0.0.1:3000'];
        
        // Allow requests with no origin (like Postman, curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        console.log(`❌ CORS blocked origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'), false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
      preflightContinue: false,
      optionsSuccessStatus: 204
    });

    // 2. Cookie Support
    await server.register(require('@fastify/cookie'));

    // 3. JWT Support for Stateless Authentication
    await server.register(require('@fastify/jwt'), {
      secret: config.SESSION_SECRET,
      sign: {
        algorithm: 'HS256',
        expiresIn: '1h' // Short-lived access tokens
      },
      verify: {
        algorithms: ['HS256']
      },
      cookie: {
        cookieName: 'sso-hub-token',
        signed: false
      }
    });

    console.log('🔄 Registering proxy endpoints...');
    // 4. Register proxy endpoints
    await registerProxyRoutes(server);

    console.log('✅ Server plugins registered successfully');
  } catch (error) {
    console.error('❌ Server setup failed:', error);
    throw error;
  }
}

// Utility Functions
function extractRoles(idTokenClaims) {
  const roles = [];
  
  // Standard Keycloak role extraction
  if (idTokenClaims.realm_access && idTokenClaims.realm_access.roles) {
    roles.push(...idTokenClaims.realm_access.roles);
  }
  
  if (idTokenClaims.resource_access) {
    Object.values(idTokenClaims.resource_access).forEach(resource => {
      if (resource.roles) {
        roles.push(...resource.roles);
      }
    });
  }
  
  // Remove duplicates
  return [...new Set(roles)];
}

function extractGroups(idTokenClaims) {
  const groups = [];
  
  if (idTokenClaims.groups) {
    groups.push(...idTokenClaims.groups);
  }
  
  return groups;
}

function isAdmin(user) {
  const adminRoles = ['admin', 'administrator'];
  const adminGroups = ['admins', '/admins', 'administrators'];
  
  // Check roles
  if (user.roles && user.roles.some(role => adminRoles.includes(role.toLowerCase()))) {
    return true;
  }
  
  // Check groups
  if (user.groups && user.groups.some(group => adminGroups.includes(group.toLowerCase()))) {
    return true;
  }
  
  // Check email
  if (user.email && user.email.toLowerCase().includes('admin')) {
    return true;
  }
  
  return false;
}

// Routes
server.get('/healthz', async (request, reply) => {
  const token = request.cookies['sso-hub-token'];
  let hasValidToken = false;
  if (token) {
    try {
      server.jwt.verify(token);
      hasValidToken = true;
    } catch (error) {
      hasValidToken = false;
    }
  }
  
  return { 
    status: 'ok', 
    service: 'auth-bff-jwt', 
    timestamp: new Date().toISOString(),
    authenticated: hasValidToken,
    oidc: !!oidcClient
  };
});

// Debug endpoint
server.get('/debug/auth', async (request, reply) => {
  const token = request.cookies['sso-hub-token'];
  let tokenInfo = null;
  
  if (token) {
    try {
      const decoded = server.jwt.verify(token);
      tokenInfo = {
        valid: true,
        user: decoded.user,
        exp: decoded.exp,
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      };
    } catch (error) {
      tokenInfo = {
        valid: false,
        error: error.message
      };
    }
  }
  
  return {
    authentication: {
      hasToken: !!token,
      tokenInfo,
      cookieCount: request.headers.cookie ? request.headers.cookie.split(';').length : 0
    },
    oidc: {
      initialized: !!oidcClient,
      issuer: config.OIDC_ISSUER
    },
    timestamp: new Date().toISOString()
  };
});

// Authentication endpoints
server.get('/auth/login', async (request, reply) => {
  try {
    console.log('🔐 Login request received');
    console.log('🔧 Debug - OIDC_REDIRECT_URI config:', config.OIDC_REDIRECT_URI);
    
    if (!oidcClient) {
      console.error('❌ OIDC client not initialized');
      return reply.status(500).send({ error: 'OIDC not configured' });
    }
    
    const state = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    
    // Store auth state in temporary JWT (short-lived for OIDC flow)
    const authStateToken = server.jwt.sign({
      authState: {
        state,
        nonce,
        codeVerifier,
        createdAt: Date.now()
      }
    }, { expiresIn: '10m' }); // 10 minutes for auth flow
    
    reply.setCookie('auth-state', authStateToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 600000 // 10 minutes
    });
    
    // FIXED: Use only valid scopes that Keycloak supports
    const authUrl = oidcClient.authorizationUrl({
      scope: 'openid email profile', // Removed 'roles groups' that are causing errors
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      redirect_uri: config.OIDC_REDIRECT_URI, // Explicitly set redirect URI
    });
    
    console.log('✅ Redirecting to Keycloak for authentication');
    console.log('🔗 Auth URL:', authUrl);
    return reply.redirect(authUrl);
    
  } catch (error) {
    console.error('❌ Login failed:', error);
    return reply.status(500).send({ error: 'Login failed: ' + error.message });
  }
});

server.get('/auth/callback', async (request, reply) => {
  try {
    console.log('🔄 Processing authentication callback');
    
    if (!oidcClient) {
      console.error('❌ OIDC client not initialized');
      return reply.status(500).send({ error: 'OIDC not configured' });
    }
    
    const params = oidcClient.callbackParams(request.raw);
    
    // Retrieve auth state from JWT cookie
    const authStateToken = request.cookies['auth-state'];
    if (!authStateToken) {
      console.error('❌ No auth state token found');
      return reply.status(400).send({ error: 'Invalid authentication state' });
    }
    
    let authState;
    try {
      const decoded = server.jwt.verify(authStateToken);
      authState = decoded.authState;
    } catch (error) {
      console.error('❌ Invalid auth state token:', error.message);
      return reply.status(400).send({ error: 'Invalid authentication state' });
    }
    
    // Validate state parameter
    if (params.state !== authState.state) {
      console.error('❌ State parameter mismatch');
      return reply.status(400).send({ error: 'Invalid state parameter' });
    }
    
    // Exchange code for tokens
    console.log('🔄 Exchanging authorization code for tokens...');
    console.log('🔗 Using redirect URI:', config.OIDC_REDIRECT_URI);
    console.log('🔗 Client token endpoint should be:', oidcClient.issuer.token_endpoint);
    
    const tokenSet = await oidcClient.callback(
      config.OIDC_REDIRECT_URI,
      params,
      { 
        state: authState.state,
        nonce: authState.nonce,
        code_verifier: authState.codeVerifier
      }
    );
    
    console.log('✅ Token exchange successful!');
    
    // Extract user info from ID token
    const idTokenClaims = tokenSet.claims();
    console.log('✅ ID token claims received:', Object.keys(idTokenClaims));
    
    // Create user object
    const user = {
      sub: idTokenClaims.sub,
      email: idTokenClaims.email,
      name: idTokenClaims.name || idTokenClaims.preferred_username,
      roles: extractRoles(idTokenClaims),
      groups: extractGroups(idTokenClaims),
      accessToken: tokenSet.access_token,
      refreshToken: tokenSet.refresh_token,
      idToken: tokenSet.id_token,
      expiresAt: Date.now() + (tokenSet.expires_in * 1000),
      isAdmin: false // Will be set below
    };
    
    // Set admin status
    user.isAdmin = isAdmin(user);
    
    console.log('✅ User authenticated:', {
      email: user.email,
      roles: user.roles,
      groups: user.groups,
      isAdmin: user.isAdmin
    });
    
    // CRITICAL: Create JWT authentication token
    const authToken = server.jwt.sign({
      user: {
        sub: user.sub,
        email: user.email,
        name: user.name,
        roles: user.roles,
        groups: user.groups,
        isAdmin: user.isAdmin
      },
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + config.SESSION_MAX_AGE) / 1000)
    });
    
    // Set secure HTTP-only cookie with JWT token
    reply.setCookie('sso-hub-token', authToken, {
      httpOnly: true,
      secure: false, // false for localhost development
      sameSite: 'lax',
      maxAge: config.SESSION_MAX_AGE,
      path: '/'
    });
    
    // Clear auth state cookie
    reply.clearCookie('auth-state');
    
    console.log('✅ JWT authentication token created successfully');
    console.log('🔄 Redirecting to dashboard');
    
    return reply.redirect(`${config.FRONTEND_URL}/dashboard?auth=success`);
    
  } catch (error) {
    console.error('❌ Callback failed:', error);
    return reply.status(500).send({ error: 'Authentication failed: ' + error.message });
  }
});

server.get('/auth/me', async (request, reply) => {
  try {
    console.log('🔍 /auth/me request - checking JWT token');
    
    const token = request.cookies['sso-hub-token'];
    if (!token) {
      console.log('❌ No JWT token found');
      return reply.status(401).send({ error: 'Not authenticated' });
    }
    
    let decoded;
    try {
      decoded = server.jwt.verify(token);
    } catch (error) {
      console.log('❌ Invalid JWT token:', error.message);
      return reply.status(401).send({ error: 'Invalid token' });
    }
    
    const user = decoded.user;
    console.log('✅ User found in JWT token:', user.email);
    
    return {
      user: {
        sub: user.sub,
        email: user.email,
        name: user.name,
        roles: user.roles,
        groups: user.groups,
        isAdmin: user.isAdmin
      },
      session: {
        expiresAt: decoded.exp * 1000 // Convert to milliseconds
      }
    };
    
  } catch (error) {
    console.error('❌ /auth/me failed:', error);
    return reply.status(500).send({ error: 'Token validation failed' });
  }
});

server.post('/auth/logout', async (request, reply) => {
  try {
    console.log('🔐 Logout request received');
    
    const token = request.cookies['sso-hub-token'];
    if (token) {
      try {
        const decoded = server.jwt.verify(token);
        console.log('✅ Clearing JWT token for user:', decoded.user.email);
      } catch (error) {
        console.log('⚠️ Invalid token during logout');
      }
    }
    
    // Clear JWT authentication cookies
    reply.clearCookie('sso-hub-token', { path: '/' });
    reply.clearCookie('auth-state', { path: '/' });
    
    console.log('✅ JWT tokens cleared successfully');
    return { message: 'Logged out successfully' };
    
  } catch (error) {
    console.error('❌ Logout failed:', error);
    return reply.status(500).send({ error: 'Logout failed' });
  }
});

// Middleware to validate authentication for API proxies
function requireAuth(request, reply, done) {
  const token = request.cookies['sso-hub-token'];
  if (!token) {
    console.error('❌ No authentication token found in cookies');
    reply.status(401).send({ error: 'Authentication required' });
    return;
  }
  
  try {
    const decoded = server.jwt.verify(token);
    request.user = decoded.user; // Attach user to request for proxy functions
    console.log(`✅ User authenticated: ${request.user.email} (admin: ${request.user.isAdmin})`);
    done();
  } catch (error) {
    console.error('❌ JWT verification failed in requireAuth:', error.message);
    reply.status(401).send({ error: 'Invalid authentication token' });
    return;
  }
}

// Proxy route registration function
async function registerProxyRoutes(server) {
  console.log('🔗 Registering proxy routes...');
  
  // Test proxy endpoint
  server.get('/api/test', { preHandler: requireAuth }, async (request, reply) => {
    return { message: 'Proxy working', user: request.user.email };
  });

  // Tools/Catalog Service Proxy (catalog service handles tools API)
  server.get('/api/tools', { preHandler: requireAuth }, async (request, reply) => {
    console.log('🔗 Proxying tools request');
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://catalog:3006/api/tools${queryString}`;
    return proxyRequest(request, reply, url);
  });
  
  server.get('/api/tools/*', { preHandler: requireAuth }, async (request, reply) => {
    const path = request.url.replace('/api/tools', '');
    const url = `http://catalog:3006/api/tools${path}`;
    return proxyRequest(request, reply, url);
  });
  
  server.post('/api/tools/*', { preHandler: requireAuth }, async (request, reply) => {
    const path = request.url.replace('/api/tools', '');
    const url = `http://catalog:3006/api/tools${path}`;
    return proxyRequest(request, reply, url);
  });
  
  server.put('/api/tools/:toolId', { preHandler: requireAuth }, async (request, reply) => {
    // Check if user is admin
    if (!request.user.isAdmin) {
      return reply.status(403).send({ error: 'Admin access required' });
    }
    
    const url = `http://catalog:3006/api/tools/${request.params.toolId}`;
    return proxyRequest(request, reply, url);
  });

  // Get Tool Configuration Endpoint (Admin only)
  server.get('/api/tools/:toolId/config', { preHandler: requireAuth }, async (request, reply) => {
    // Check if user is admin
    if (!request.user.isAdmin) {
      return reply.status(403).send({ error: 'Admin access required' });
    }
    
    const url = `http://catalog:3006/api/tools/${request.params.toolId}/config`;
    return proxyRequest(request, reply, url);
  });

  // Update Tool Configuration Endpoint (Admin only)
  server.put('/api/tools/:toolId/config', { preHandler: requireAuth }, async (request, reply) => {
    // Check if user is admin
    if (!request.user.isAdmin) {
      return reply.status(403).send({ error: 'Admin access required' });
    }
    
    const url = `http://catalog:3006/api/tools/${request.params.toolId}/config`;
    return proxyRequest(request, reply, url);
  });

  // Tool Connection Test Endpoint (Admin only)
  server.post('/api/tools/:toolId/test-connection', { preHandler: requireAuth }, async (request, reply) => {
    // Check if user is admin
    if (!request.user.isAdmin) {
      return reply.status(403).send({ error: 'Admin access required' });
    }
    
    const url = `http://catalog:3006/api/tools/${request.params.toolId}/test-connection`;
    return proxyRequest(request, reply, url);
  });

  // Get Keycloak Configuration by Integration Type (Admin only)
  server.get('/api/keycloak/config/:integrationType', { preHandler: requireAuth }, async (request, reply) => {
    // Check if user is admin
    if (!request.user.isAdmin) {
      console.error(`❌ Non-admin user ${request.user.email} attempted to access Keycloak config`);
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const { integrationType } = request.params;
    const { tool } = request.query; // Get tool context from query parameter
    
    console.log(`🔧 Generating ${integrationType} config for tool: ${tool}`);
    
    try {
      const baseUrl = process.env.KEYCLOAK_PUBLIC_URL || 'http://localhost:8080/realms/sso-hub';
      
      // Protocol-specific client mapping with tool context
      const getClientCredentials = (tool, integrationType) => {
        console.log(`📝 Getting client credentials for tool: ${tool}, type: ${integrationType}`);
        
        // Generate protocol-specific client ID
        const clientId = `${tool}-client-${integrationType}`;
        const clientSecret = `${tool}-client-secret`;
        
        // Tool-specific redirect URIs from environment variables
        const getToolRedirectUri = (toolName, integrationType) => {
          // Map tool names to environment variable names
          const envVarMapping = {
            grafana: 'GRAFANA_REDIRECT_URI',
            jenkins: 'JENKINS_REDIRECT_URI', 
            gitlab: 'GITLAB_REDIRECT_URI',
            github: 'GITHUB_REDIRECT_URI',
            sonarqube: 'SONARQUBE_REDIRECT_URI',
            argocd: 'ARGOCD_REDIRECT_URI',
            terraform: 'TERRAFORM_REDIRECT_URI',
            prometheus: 'PROMETHEUS_REDIRECT_URI',
            kibana: 'KIBANA_REDIRECT_URI',
            snyk: 'SNYK_REDIRECT_URI',
            jira: 'JIRA_REDIRECT_URI',
            servicenow: 'SERVICENOW_REDIRECT_URI'
          };
          
          const envVar = envVarMapping[toolName];
          if (!envVar) {
            console.warn(`No redirect URI environment variable defined for tool: ${toolName}`);
            return '';
          }
          
          return process.env[envVar] || '';
        };
        
        const defaultRedirectUris = {
          grafana: integrationType === 'oauth2' ? getToolRedirectUri('grafana', integrationType) : '',
          jenkins: integrationType === 'oidc' ? getToolRedirectUri('jenkins', integrationType) : '',
          gitlab: integrationType === 'oidc' ? getToolRedirectUri('gitlab', integrationType) : '',
          github: integrationType === 'oauth2' ? getToolRedirectUri('github', integrationType) : '',
          sonarqube: integrationType === 'oidc' ? getToolRedirectUri('sonarqube', integrationType) : '',
          argocd: integrationType === 'oidc' ? getToolRedirectUri('argocd', integrationType) : '',
          terraform: integrationType === 'oidc' ? getToolRedirectUri('terraform', integrationType) : '',
          prometheus: integrationType === 'oidc' ? getToolRedirectUri('prometheus', integrationType) : '',
          kibana: integrationType === 'oidc' ? getToolRedirectUri('kibana', integrationType) : '',
          snyk: integrationType === 'oidc' ? getToolRedirectUri('snyk', integrationType) : '',
          jira: integrationType === 'saml' ? getToolRedirectUri('jira', integrationType) : '',
          servicenow: integrationType === 'saml' ? getToolRedirectUri('servicenow', integrationType) : ''
        };
        
        return {
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: defaultRedirectUris[tool] || ''
        };
      };
      
      const clientCreds = getClientCredentials(tool, integrationType);
      console.log(`🔑 Client credentials for ${tool}:`, { client_id: clientCreds.client_id, has_secret: !!clientCreds.client_secret });
      
      // Ensure client exists in Keycloak by calling admin-config service
      try {
        console.log(`🔧 Ensuring client ${clientCreds.client_id} exists in Keycloak...`);
        const ensureClientResponse = await server.axios.post(
          `http://admin-config:3005/api/tools/${tool}/ensure-client`,
          { integration_type: integrationType },
          {
            headers: { 'X-Api-Key': config.ADMIN_API_KEY }
          }
        );
        
        if (ensureClientResponse.data.created) {
          console.log(`✅ Created new client ${clientCreds.client_id} in Keycloak`);
        } else {
          console.log(`✅ Client ${clientCreds.client_id} already exists in Keycloak`);
        }
      } catch (ensureClientError) {
        console.warn(`⚠️ Failed to ensure client exists in Keycloak:`, ensureClientError.message);
        // Continue anyway as we can still provide the configuration
      }
      
      if (integrationType === 'oidc') {
        // Return OIDC configuration (manual endpoints, no discovery URL)
        const oidcConfig = {
          client_id: clientCreds.client_id,
          client_secret: clientCreds.client_secret,
          auth_url: `${baseUrl}/protocol/openid-connect/auth`,
          token_url: `${baseUrl}/protocol/openid-connect/token`, 
          userinfo_url: `${baseUrl}/protocol/openid-connect/userinfo`,
          jwks_url: `${baseUrl}/protocol/openid-connect/certs`,
          logout_url: `${baseUrl}/protocol/openid-connect/logout`,
          scopes: 'openid profile email groups',
          redirect_uri: clientCreds.redirect_uri
        };
        
        console.log('✅ Generated OIDC config:', Object.keys(oidcConfig));
        return { success: true, config: oidcConfig };
      } else if (integrationType === 'oauth2') {
        // Return OAuth2 configuration
        const oauth2Config = {
          client_id: clientCreds.client_id,
          client_secret: clientCreds.client_secret,
          auth_url: `${baseUrl}/protocol/openid-connect/auth`,
          token_url: `${baseUrl}/protocol/openid-connect/token`,
          scopes: 'openid email profile offline_access roles',
          redirect_uri: clientCreds.redirect_uri, // Will be empty for Grafana
          grant_type: 'authorization_code' // Required for OAuth2
        };
        
        // Add tool-specific OAuth2 fields
        if (tool === 'grafana') {
          // For Grafana, add the API URL (userinfo endpoint) and other required fields
          oauth2Config.api_url = `${baseUrl}/protocol/openid-connect/userinfo`;
          oauth2Config.userinfo_url = `${baseUrl}/protocol/openid-connect/userinfo`;
          // Grafana-specific OAuth2 attributes with proper defaults
          oauth2Config.email_attribute_name = 'email';
          oauth2Config.login_attribute_path = 'username';
          oauth2Config.name_attribute_path = 'full_name';
          oauth2Config.role_attribute_path = "contains(roles[*], 'admin') && 'Admin' || contains(roles[*], 'editor') && 'Editor' || 'Viewer'";
          oauth2Config.allow_sign_up = true;
          oauth2Config.use_refresh_token = true;
          oauth2Config.signout_redirect_url = `${baseUrl}/protocol/openid-connect/logout`;
          // Don't auto-populate sensitive or instance-specific fields
          oauth2Config.grafana_url = ''; // Admin needs to fill this
          oauth2Config.redirect_uri = ''; // Admin needs to fill this based on their Grafana URL
        }
        
        console.log('✅ Generated OAuth2 config:', Object.keys(oauth2Config));
        return { success: true, config: oauth2Config };
      } else if (integrationType === 'saml') {
        // Return SAML configuration from our Keycloak instance  
        const samlConfig = {
          entity_id: `${config.OIDC_ISSUER}`,
          idp_entity_id: `${config.OIDC_ISSUER}`,
          idp_sso_url: `${config.OIDC_ISSUER}/protocol/saml`,
          idp_slo_url: `${config.OIDC_ISSUER}/protocol/saml`,
          name_id_format: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
          x509_cert: '', // Would need to fetch from Keycloak API
          attribute_mapping: JSON.stringify({
            "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
            "name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
            "groups": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/groups"
          }, null, 2)
        };
        
        console.log('✅ Generated SAML config:', Object.keys(samlConfig));
        return { success: true, config: samlConfig };
      } else {
        console.error(`❌ Invalid integration type: ${integrationType}`);
        return reply.status(400).send({ error: `Invalid integration type: ${integrationType}. Supported: oidc, oauth2, saml` });
      }
    } catch (error) {
      console.error('❌ Failed to get Keycloak config:', error);
      return reply.status(500).send({ error: 'Failed to retrieve Keycloak configuration' });
    }
  });
  
  // Admin Config Service Proxy (fix route mapping)
  server.all('/api/admin', { preHandler: requireAuth }, async (request, reply) => {
    const url = `http://admin-config:3005/api/tools${request.url.includes('?') ? '?' + request.url.split('?')[1] : ''}`;
    return proxyRequest(request, reply, url);
  });
  
  server.all('/api/admin/*', { preHandler: requireAuth }, async (request, reply) => {
    const path = request.url.replace('/api/admin', '');
    const url = `http://admin-config:3005/api/tools${path}`;
    return proxyRequest(request, reply, url);
  });
  
  // Audit Service Proxy
  server.all('/api/audit', { preHandler: requireAuth }, async (request, reply) => {
    const url = `http://audit:3009/api/audit${request.url.includes('?') ? '?' + request.url.split('?')[1] : ''}`;
    return proxyRequest(request, reply, url);
  });
  
  server.all('/api/audit/*', { preHandler: requireAuth }, async (request, reply) => {
    const path = request.url.replace('/api/audit', '');
    const url = `http://audit:3009/api/audit${path}`;
    return proxyRequest(request, reply, url);
  });
  
  // LDAP Sync Service Proxy
  server.all('/api/ldap', { preHandler: requireAuth }, async (request, reply) => {
    const url = `http://ldap-sync:3012/api/ldap${request.url.includes('?') ? '?' + request.url.split('?')[1] : ''}`;
    return proxyRequest(request, reply, url);
  });
  
  server.all('/api/ldap/*', { preHandler: requireAuth }, async (request, reply) => {
    const path = request.url.replace('/api/ldap', '');
    const url = `http://ldap-sync:3012/api/ldap${path}`;
    return proxyRequest(request, reply, url);
  });
  
  // Provisioning Service Proxy
  server.all('/api/provisioning', { preHandler: requireAuth }, async (request, reply) => {
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://provisioning:3011/api${queryString}`;
    return proxyRequest(request, reply, url);
  });
  
  server.all('/api/provisioning/*', { preHandler: requireAuth }, async (request, reply) => {
    const path = request.url.replace('/api/provisioning', '');
    // Map frontend routes to actual service routes
    const url = `http://provisioning:3011/api${path}`;
    return proxyRequest(request, reply, url);
  });
  
  // Analytics Service Proxy
  server.get('/api/analytics/usage', { preHandler: requireAuth }, async (request, reply) => {
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://analytics:3010/api/analytics/usage${queryString}`;
    return proxyRequest(request, reply, url);
  });
  
  server.post('/api/analytics/usage', { preHandler: requireAuth }, async (request, reply) => {
    const url = `http://analytics:3010/api/analytics/usage`;
    return proxyRequest(request, reply, url);
  });
  
  server.get('/api/analytics/tools', { preHandler: requireAuth }, async (request, reply) => {
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://analytics:3010/api/analytics/tools${queryString}`;
    return proxyRequest(request, reply, url);
  });
  
  server.get('/api/analytics/tools/:toolSlug', { preHandler: requireAuth }, async (request, reply) => {
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://analytics:3010/api/analytics/tools/${request.params.toolSlug}${queryString}`;
    return proxyRequest(request, reply, url);
  });
  
  server.get('/api/analytics/performance', { preHandler: requireAuth }, async (request, reply) => {
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://analytics:3010/api/analytics/performance${queryString}`;
    return proxyRequest(request, reply, url);
  });
  
  server.post('/api/analytics/performance', { preHandler: requireAuth }, async (request, reply) => {
    const url = `http://analytics:3010/api/analytics/performance`;
    return proxyRequest(request, reply, url);
  });
  
  server.get('/api/analytics/workflows', { preHandler: requireAuth }, async (request, reply) => {
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://analytics:3010/api/analytics/workflows${queryString}`;
    return proxyRequest(request, reply, url);
  });
  
  server.post('/api/analytics/workflows', { preHandler: requireAuth }, async (request, reply) => {
    const url = `http://analytics:3010/api/analytics/workflows`;
    return proxyRequest(request, reply, url);
  });
  
  server.put('/api/analytics/workflows/:workflowId', { preHandler: requireAuth }, async (request, reply) => {
    const url = `http://analytics:3010/api/analytics/workflows/${request.params.workflowId}`;
    return proxyRequest(request, reply, url);
  });
  
  server.post('/api/analytics/workflows/:workflowId/complete', { preHandler: requireAuth }, async (request, reply) => {
    const url = `http://analytics:3010/api/analytics/workflows/${request.params.workflowId}/complete`;
    return proxyRequest(request, reply, url);
  });
  
  server.get('/api/analytics/reports/:reportId/download', { preHandler: requireAuth }, async (request, reply) => {
    const url = `http://analytics:3010/api/analytics/reports/${request.params.reportId}/download`;
    return proxyRequest(request, reply, url);
  });
  
  server.post('/api/analytics/reports/generate', { preHandler: requireAuth }, async (request, reply) => {
    const url = `http://analytics:3010/api/analytics/reports/generate`;
    return proxyRequest(request, reply, url);
  });
  
  server.get('/api/analytics/export/csv', { preHandler: requireAuth }, async (request, reply) => {
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://analytics:3010/api/analytics/export/csv${queryString}`;
    return proxyRequest(request, reply, url);
  });

  // Custom analytics endpoints that don't exist in the service but are expected by frontend
  server.get('/api/analytics/users', { preHandler: requireAuth }, async (request, reply) => {
    // Map to appropriate analytics endpoint
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://analytics:3010/api/analytics/usage${queryString}`;
    return proxyRequest(request, reply, url);
  });
  
  server.get('/api/analytics/behavior', { preHandler: requireAuth }, async (request, reply) => {
    // Map to workflow analytics as it's closest match
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://analytics:3010/api/analytics/workflows${queryString}`;
    return proxyRequest(request, reply, url);
  });
  
  server.get('/api/analytics/realtime', { preHandler: requireAuth }, async (request, reply) => {
    // Return real-time metrics by getting recent usage data
    const url = `http://analytics:3010/api/analytics/usage?groupBy=hour&limit=1`;
    return proxyRequest(request, reply, url);
  });
  
  server.get('/api/analytics/dashboard', { preHandler: requireAuth }, async (request, reply) => {
    // Map to tools summary for dashboard
    const url = `http://analytics:3010/api/analytics/tools`;
    return proxyRequest(request, reply, url);
  });
  
  server.get('/api/analytics/export', { preHandler: requireAuth }, async (request, reply) => {
    // Map to CSV export
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://analytics:3010/api/analytics/export/csv${queryString}`;
    return proxyRequest(request, reply, url);
  });

  // Health Service Proxy (Tools Health)
  server.get('/api/health/dashboard', { preHandler: requireAuth }, async (request, reply) => {
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://tools-service:3004/api/health/dashboard${queryString}`;
    return proxyRequest(request, reply, url);
  });
  
  server.get('/api/health/system', { preHandler: requireAuth }, async (request, reply) => {
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://tools-service:3004/api/health/system${queryString}`;
    return proxyRequest(request, reply, url);
  });
  
  server.get('/api/health/services', { preHandler: requireAuth }, async (request, reply) => {
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://tools-service:3004/api/health/services${queryString}`;
    return proxyRequest(request, reply, url);
  });
  
  server.get('/api/health/integrations', { preHandler: requireAuth }, async (request, reply) => {
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://tools-service:3004/api/health/integrations${queryString}`;
    return proxyRequest(request, reply, url);
  });
  
  server.get('/api/health/metrics', { preHandler: requireAuth }, async (request, reply) => {
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://tools-service:3004/api/health/system${queryString}`;
    return proxyRequest(request, reply, url);
  });
  
  server.get('/api/health/overview', { preHandler: requireAuth }, async (request, reply) => {
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://tools-service:3004/api/health/overview${queryString}`;
    return proxyRequest(request, reply, url);
  });
  
  server.get('/api/health/tools/:toolId/metrics', { preHandler: requireAuth }, async (request, reply) => {
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://tools-service:3004/api/health/tools/${request.params.toolId}/metrics${queryString}`;
    return proxyRequest(request, reply, url);
  });

  // User Service Proxy (Admin only)
  server.get('/api/users', { preHandler: requireAuth }, async (request, reply) => {
    // Check if user is admin
    if (!request.user.isAdmin) {
      return reply.status(403).send({ error: 'Admin access required' });
    }
    
    const queryString = request.url.includes('?') ? '?' + request.url.split('?')[1] : '';
    const url = `http://user-service:3003/users${queryString}`;
    return proxyRequest(request, reply, url);
  });
  
  server.post('/api/users', { preHandler: requireAuth }, async (request, reply) => {
    // Check if user is admin
    if (!request.user.isAdmin) {
      return reply.status(403).send({ error: 'Admin access required' });
    }
    
    const url = `http://user-service:3003/users`;
    return proxyRequest(request, reply, url);
  });
  
  server.put('/api/users/:userId', { preHandler: requireAuth }, async (request, reply) => {
    // Check if user is admin
    if (!request.user.isAdmin) {
      return reply.status(403).send({ error: 'Admin access required' });
    }
    
    const url = `http://user-service:3003/users/${request.params.userId}`;
    return proxyRequest(request, reply, url);
  });
  
  server.delete('/api/users/:userId', { preHandler: requireAuth }, async (request, reply) => {
    // Check if user is admin
    if (!request.user.isAdmin) {
      return reply.status(403).send({ error: 'Admin access required' });
    }
    
    const url = `http://user-service:3003/users/${request.params.userId}`;
    return proxyRequest(request, reply, url);
  });
  
  console.log('✅ Proxy routes registered successfully');
}

// Generic proxy function with identity headers
async function proxyRequest(request, reply, targetUrl) {
  try {
    const user = request.user; // User attached by requireAuth middleware
    
    // Prepare headers with identity information
    const userRoles = JSON.stringify(user.roles || []);
    const userGroups = JSON.stringify(user.groups || []);
    
    // Generate HMAC signature for service authentication
    const crypto = require('crypto');
    const payload = `${user.sub}|${user.email}|${userRoles}|${userGroups}`;
    const signature = crypto.createHmac('sha256', process.env.IDENTITY_HEADER_SECRET || 'default-secret')
      .update(payload)
      .digest('base64');
    
    const headers = {
      'X-User-Sub': user.sub,
      'X-User-Email': user.email,
      'X-User-Name': user.name,
      'X-User-Roles': userRoles,
      'X-User-Groups': userGroups,
      'X-User-Admin': user.isAdmin ? 'true' : 'false',
      'X-User-Signature': signature
    };
    
    // Add original request headers (except authorization and cookie)
    Object.keys(request.headers).forEach(key => {
      if (!key.startsWith('x-user-') && key !== 'authorization' && key !== 'cookie') {
        headers[key] = request.headers[key];
      }
    });
    
    // Only set Content-Type if not already present
    if (!headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
    
    const options = {
      method: request.method,
      headers
    };
    
    // Add body for POST/PUT requests
    if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      options.body = JSON.stringify(request.body);
    }
    
    console.log(`🔗 Proxying ${request.method} ${targetUrl} for user ${user.email}`);
    console.log(`🔗 Headers being sent:`, JSON.stringify(headers, null, 2));
    
    const response = await fetch(targetUrl, options);
    console.log(`🔗 Response status: ${response.status} ${response.statusText}`);
    const data = await response.text();
    console.log(`🔗 Response data:`, data.substring(0, 200));
    
    reply.status(response.status);
    reply.headers(Object.fromEntries(response.headers.entries()));
    
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
    
  } catch (error) {
    console.error('❌ Proxy request failed:', error);
    reply.status(500).send({ error: 'Proxy request failed', details: error.message });
  }
}

// Start server
async function start() {
  try {
    await setupServer();
    await initializeOIDC();
    
    await server.listen({ 
      port: parseInt(config.PORT, 10), 
      host: config.HOST 
    });
    
    console.log(`🚀 Auth-BFF JWT service listening on ${config.HOST}:${config.PORT}`);
    console.log('✅ JWT-based stateless authentication active');
    console.log('✅ OIDC integration ready');
    console.log('🔧 Enterprise security: JWT tokens with HTTP-only cookies');
    console.log('🔧 Using scopes: openid email profile');
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Graceful shutdown initiated');
  await server.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Graceful shutdown initiated');
  await server.close();
  process.exit(0);
});

start();