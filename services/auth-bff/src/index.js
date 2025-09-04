/**
 * SSO Hub Auth-BFF Service - WORKING VERSION
 * 
 * Fixed authentication service with proper scope handling
 */

const fastify = require('fastify');
const { Issuer, generators } = require('openid-client');

// Dynamic configuration builder - supports mixed protocol deployments
function buildDynamicConfig() {
  const externalHost = process.env.EXTERNAL_HOST || 'localhost';
  const externalProtocol = process.env.EXTERNAL_PROTOCOL || 'http';
  const externalPort = process.env.EXTERNAL_PORT || '';
  
  // PROTOCOL INDEPENDENCE: Support mixed protocols for SSO-Hub + Tools
  const toolSpecificProtocols = process.env.TOOL_SPECIFIC_PROTOCOLS === 'true';
  
  // Check if this is an external deployment (not localhost)
  const isExternalDeployment = externalHost !== 'localhost';
  
  console.log('🔧 Building mixed protocol configuration:', {
    external_host: externalHost,
    external_protocol: externalProtocol, 
    external_port: externalPort,
    is_external: isExternalDeployment,
    tool_specific_protocols: toolSpecificProtocols
  });
  
  // Build URLs dynamically based on external configuration
  const frontendUrl = isExternalDeployment 
    ? `${externalProtocol}://${externalHost}${externalPort ? `:${externalPort}` : ''}`
    : 'http://localhost:3000';
    
  const keycloakPublicUrl = isExternalDeployment
    ? `${externalProtocol}://${externalHost}:8080`
    : 'http://localhost:8080';
    
  const authBffUrl = isExternalDeployment
    ? `${externalProtocol}://${externalHost}:3002`
    : 'http://localhost:3002';
  
  console.log('🔧 Computed URLs:', {
    frontend_url: frontendUrl,
    keycloak_public_url: keycloakPublicUrl,
    auth_bff_url: authBffUrl
  });
  
  // Build CORS origins dynamically
  const corsOrigins = [
    // Always allow localhost for development
    'http://localhost:3000',
    'http://localhost:3002',
    'http://127.0.0.1:3000'
  ];
  
  if (isExternalDeployment) {
    corsOrigins.push(frontendUrl);
    corsOrigins.push(authBffUrl);
    // Add alternative port access patterns
    corsOrigins.push(`${externalProtocol}://${externalHost}:3000`);
  }
  
  return {
    PORT: process.env.PORT || 3002,
    HOST: process.env.HOST || '0.0.0.0',
    
    // Dynamic URLs based on external configuration
    FRONTEND_URL: frontendUrl,
    KEYCLOAK_PUBLIC_URL: keycloakPublicUrl,
    AUTH_BFF_URL: authBffUrl,
    
    // OIDC Configuration - Dynamic
    OIDC_ISSUER: isExternalDeployment 
      ? `${keycloakPublicUrl}/realms/sso-hub`
      : 'http://keycloak:8080/realms/sso-hub', // Internal for localhost
    OIDC_PUBLIC_URL: `${keycloakPublicUrl}/realms/sso-hub`,
    OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID || 'sso-hub-client',
    OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET || 'your-client-secret',
    OIDC_REDIRECT_URI: `${authBffUrl}/auth/callback`,
    
    // Security
    SESSION_SECRET: process.env.SESSION_SECRET || 'super-secret-session-key-for-development',
    
    // CORS Configuration - Dynamic
    CORS_ORIGIN: corsOrigins,
    
    // Session Configuration
    SESSION_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    
    // Mixed Protocol Support
    TOOL_SPECIFIC_PROTOCOLS: toolSpecificProtocols,
    
    // Helper flags
    IS_EXTERNAL_DEPLOYMENT: isExternalDeployment,
    IS_HTTPS: externalProtocol === 'https'
  };
}

/**
 * CRITICAL FIX: Generate tool-specific redirect URIs with correct protocols
 * This function bypasses the Auth-BFF protocol contamination by respecting tool database configurations
 * @param {string} toolId - Tool identifier
 * @param {Object} toolConfig - Tool configuration from database (optional)
 * @returns {Promise<string>} Properly protocoled redirect URI
 */
async function generateToolRedirectUri(toolId, toolConfig = null) {
  console.log('🔧 generateToolRedirectUri: Starting for tool:', toolId);
  
  try {
    // If tool config not provided, fetch from catalog service
    if (!toolConfig) {
      console.log('🔍 Fetching tool configuration from catalog service...');
      const catalogResponse = await fetch(`http://catalog:3006/api/tools/${toolId}`, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (catalogResponse.ok) {
        const toolData = await catalogResponse.json();
        toolConfig = toolData.tool?.auth_config || toolData.auth_config || {};
        console.log('✅ Retrieved tool config from catalog:', Object.keys(toolConfig));
      } else {
        console.warn('⚠️ Failed to fetch tool config, using fallback approach');
        toolConfig = {};
      }
    }
    
    // Determine tool's preferred protocol from its configuration
    let toolProtocol = null;
    let toolHost = null;
    let toolPort = null;
    
    // Check for tool-specific URL fields in priority order
    const urlFields = [
      'grafana_url',      // Highest priority for Grafana
      'base_url', 
      'instance_url', 
      'jenkins_url', 
      'argocd_url', 
      'sonarqube_url'
    ];
    
    for (const field of urlFields) {
      if (toolConfig[field] && typeof toolConfig[field] === 'string') {
        try {
          const toolUrl = new URL(toolConfig[field]);
          toolProtocol = toolUrl.protocol;
          toolHost = toolUrl.hostname;
          toolPort = toolUrl.port;
          
          console.log(`✅ Found tool URL in ${field}: ${toolConfig[field]}`);
          console.log(`✅ Extracted: protocol=${toolProtocol}, host=${toolHost}, port=${toolPort}`);
          break;
        } catch (error) {
          console.warn(`⚠️ Invalid URL in ${field}: ${toolConfig[field]}`);
          continue;
        }
      }
    }
    
    // If no tool-specific URL found, check environment variables for tool-specific overrides
    if (!toolProtocol && config.TOOL_SPECIFIC_PROTOCOLS) {
      const envVarMap = {
        grafana: 'GRAFANA_BASE_URL',
        jenkins: 'JENKINS_BASE_URL', 
        argocd: 'ARGOCD_BASE_URL',
        sonarqube: 'SONARQUBE_BASE_URL'
      };
      
      const envVar = envVarMap[toolId];
      if (envVar && process.env[envVar]) {
        try {
          const envUrl = new URL(process.env[envVar]);
          toolProtocol = envUrl.protocol;
          toolHost = envUrl.hostname;
          toolPort = envUrl.port;
          
          console.log(`✅ Found tool URL in environment ${envVar}: ${process.env[envVar]}`);
          console.log(`✅ Extracted: protocol=${toolProtocol}, host=${toolHost}, port=${toolPort}`);
        } catch (error) {
          console.warn(`⚠️ Invalid environment URL in ${envVar}`);
        }
      }
    }
    
    // Build the redirect URI with tool's protocol or fallback to SSO-Hub protocol
    let redirectUri;
    
    if (toolProtocol && toolHost) {
      // Use tool's specific protocol and host
      const portPart = toolPort ? `:${toolPort}` : '';
      redirectUri = `${toolProtocol}//${toolHost}${portPart}/login/generic_oauth`;
      console.log(`✅ Generated tool-specific redirect URI: ${redirectUri}`);
    } else {
      // Fallback to SSO-Hub infrastructure protocol (but warn about it)
      redirectUri = `${config.AUTH_BFF_URL}/auth/callback`;
      console.log(`⚠️ No tool-specific URL found, using SSO-Hub callback: ${redirectUri}`);
    }
    
    return redirectUri;
    
  } catch (error) {
    console.error('❌ generateToolRedirectUri error:', error.message);
    // Safe fallback to original behavior
    return `${config.AUTH_BFF_URL}/auth/callback`;
  }
}

// Initialize configuration
const config = buildDynamicConfig();

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
    
    // Environment-aware OIDC configuration 
    // For external deployments: OIDC_ISSUER = external URL, but server endpoints need internal URLs
    // For localhost deployments: Both issuer and endpoints use internal URLs
    
    const isExternalDeployment = config.OIDC_ISSUER !== 'http://keycloak:8080/realms/sso-hub';
    const publicUrl = config.OIDC_PUBLIC_URL.replace('/realms/sso-hub', '');
    const internalBaseUrl = 'http://keycloak:8080';
    
    console.log('🔧 External deployment detected:', isExternalDeployment);
    console.log('🔧 OIDC Issuer (for token validation):', config.OIDC_ISSUER);
    console.log('🔧 Public URL (for browser endpoints):', publicUrl);
    console.log('🔧 Internal URL (for server endpoints):', internalBaseUrl);
    
    // CRITICAL FIX: Issuer must match what Keycloak returns in tokens
    // Keycloak returns issuer based on the authorization_endpoint URL
    const expectedIssuer = `${publicUrl}/realms/sso-hub`;
    console.log('🔧 Expected issuer (must match Keycloak tokens):', expectedIssuer);
    
    const issuer = new Issuer({
      // FIXED: Use public URL for issuer to match what Keycloak returns
      issuer: expectedIssuer,
      
      // Browser-facing endpoints: Use public URL 
      authorization_endpoint: `${publicUrl}/realms/sso-hub/protocol/openid-connect/auth`,
      end_session_endpoint: `${publicUrl}/realms/sso-hub/protocol/openid-connect/logout`,
        
      // Server-side endpoints: Use internal URLs for container communication  
      token_endpoint: `${internalBaseUrl}/realms/sso-hub/protocol/openid-connect/token`,
      userinfo_endpoint: `${internalBaseUrl}/realms/sso-hub/protocol/openid-connect/userinfo`,
      jwks_uri: `${internalBaseUrl}/realms/sso-hub/protocol/openid-connect/certs`,
      introspection_endpoint: `${internalBaseUrl}/realms/sso-hub/protocol/openid-connect/token/introspect`,
      revocation_endpoint: `${internalBaseUrl}/realms/sso-hub/protocol/openid-connect/revoke`
    });
    console.log('✅ OIDC issuer configuration successful');
    console.log('🔧 Issuer (for token validation):', issuer.issuer);
    console.log('🔧 Authorization endpoint (browser):', issuer.authorization_endpoint);
    console.log('🔧 Token endpoint (server):', issuer.token_endpoint);
    console.log('🔧 Userinfo endpoint (server):', issuer.userinfo_endpoint);
    console.log('🔧 JWKS URI (server):', issuer.jwks_uri);
    
    console.log('⚠️  ISSUER MISMATCH CHECK:');
    console.log('   Expected issuer in tokens: ', issuer.issuer);
    console.log('   Keycloak will return issuer based on auth endpoint:', issuer.authorization_endpoint.replace('/protocol/openid-connect/auth', ''));
    console.log('   Match?', issuer.issuer === issuer.authorization_endpoint.replace('/protocol/openid-connect/auth', ''));
    
    oidcClient = new issuer.Client({
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
    // 1. CORS Configuration - Environment-aware for external deployments
    await server.register(require('@fastify/cors'), {
      origin: (origin, callback) => {
        // Use dynamically built CORS origins
        const allowedOrigins = config.CORS_ORIGIN;
        
        console.log('🔧 Dynamic CORS configuration:', {
          external_deployment: config.IS_EXTERNAL_DEPLOYMENT,
          frontend_url: config.FRONTEND_URL,
          allowed_origins: allowedOrigins
        });
        
        // Allow requests with no origin (like Postman, curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          console.log(`✅ CORS allowed origin: ${origin}`);
          return callback(null, true);
        }
        
        console.log(`❌ CORS blocked origin: ${origin}`);
        console.log(`❌ Allowed origins: ${allowedOrigins.join(', ')}`);
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
    
    // Dynamic cookie configuration based on deployment environment
    const cookieOptions = {
      httpOnly: true,
      secure: config.IS_HTTPS, // true for HTTPS, false for HTTP
      sameSite: 'lax',
      maxAge: 600000, // 10 minutes
      path: '/'
    };
    
    console.log('🍪 Setting auth-state cookie with options:', {
      is_https: config.IS_HTTPS,
      is_external: config.IS_EXTERNAL_DEPLOYMENT,
      cookie_options: cookieOptions
    });
    
    reply.setCookie('auth-state', authStateToken, cookieOptions);
    
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
    
    // Debug: Log all cookies received
    console.log('🍪 Callback received cookies:', {
      all_cookies: Object.keys(request.cookies || {}),
      cookie_count: Object.keys(request.cookies || {}).length,
      has_auth_state: 'auth-state' in (request.cookies || {})
    });
    
    // Retrieve auth state from JWT cookie
    const authStateToken = request.cookies['auth-state'];
    if (!authStateToken) {
      console.error('❌ No auth state token found in callback');
      console.error('❌ Available cookies:', Object.keys(request.cookies || {}));
      return reply.status(400).send({ error: 'Invalid authentication state' });
    }
    
    console.log('✅ Auth state token found, validating JWT...');
    
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
    console.log('🔗 Expected issuer in token:', oidcClient.issuer.issuer);
    
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
    
    // Verify the issuer in the received token
    const idTokenClaims = tokenSet.claims();
    console.log('🔍 Token issuer verification:', {
      expected_issuer: oidcClient.issuer.issuer,
      received_issuer: idTokenClaims.iss,
      issuer_match: idTokenClaims.iss === oidcClient.issuer.issuer
    });
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
    
    // Set secure HTTP-only cookie with JWT token - Dynamic configuration
    console.log('🍪 Setting JWT cookie for environment:', {
      frontend_url: config.FRONTEND_URL,
      is_external: config.IS_EXTERNAL_DEPLOYMENT,
      is_https: config.IS_HTTPS
    });
    
    reply.setCookie('sso-hub-token', authToken, {
      httpOnly: true,
      secure: config.IS_HTTPS, // Dynamic based on protocol
      sameSite: 'lax',
      maxAge: config.SESSION_MAX_AGE,
      path: '/'
    });
    
    // Clear auth state cookie with same configuration used to set it
    reply.clearCookie('auth-state', { path: '/' });
    
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
    
    // Clear JWT authentication cookies with dynamic configuration
    reply.clearCookie('sso-hub-token', { 
      path: '/',
      secure: config.IS_HTTPS, // Match the secure flag used when setting the cookie
      sameSite: 'lax'
    });
    reply.clearCookie('auth-state', { 
      path: '/',
      secure: config.IS_HTTPS,
      sameSite: 'lax'
    });
    
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
      
      // FIXED: Protocol-aware client mapping with tool database configuration priority
      const getClientCredentials = async (tool, integrationType) => {
        console.log(`📝 Getting client credentials for tool: ${tool}, type: ${integrationType}`);
        
        // Generate protocol-specific client ID
        const clientId = `${tool}-client-${integrationType}`;
        const clientSecret = `${tool}-client-secret`;
        
        // CRITICAL FIX: Use database-aware redirect URI generation
        let toolSpecificRedirectUri = '';
        
        try {
          if (config.TOOL_SPECIFIC_PROTOCOLS) {
            // Use our new protocol-aware function
            toolSpecificRedirectUri = await generateToolRedirectUri(tool);
            console.log(`🎯 Generated protocol-aware redirect URI for ${tool}: ${toolSpecificRedirectUri}`);
          } else {
            // Fallback to environment variables (original behavior)
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
            
            const envVar = envVarMapping[tool];
            if (envVar && process.env[envVar]) {
              toolSpecificRedirectUri = process.env[envVar];
              console.log(`🔄 Using environment redirect URI for ${tool}: ${toolSpecificRedirectUri}`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to generate tool-specific redirect URI for ${tool}:`, error.message);
          toolSpecificRedirectUri = '';
        }
        
        return {
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: toolSpecificRedirectUri
        };
      };
      
      const clientCreds = await getClientCredentials(tool, integrationType);
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