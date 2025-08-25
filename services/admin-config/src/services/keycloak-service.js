const axios = require('axios');
const config = require('../config');

class KeycloakService {
  constructor() {
    this.adminToken = null;
    this.tokenExpiry = null;
    this.baseUrl = `${config.KEYCLOAK_URL}/admin/realms/${config.KEYCLOAK_REALM}`;
  }

  async initialize() {
    console.log('🔑 Initializing Keycloak service...');
    await this.getAdminToken();
    console.log('✅ Keycloak service initialized');
  }

  async checkHealth() {
    try {
      const response = await axios.get(`${config.KEYCLOAK_URL}/realms/master`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      throw new Error(`Keycloak health check failed: ${error.message}`);
    }
  }

  async getAdminToken() {
    try {
      const response = await axios.post(
        `${config.KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
        new URLSearchParams({
          username: config.KEYCLOAK_ADMIN_USERNAME,
          password: config.KEYCLOAK_ADMIN_PASSWORD,
          grant_type: 'password',
          client_id: 'admin-cli'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.adminToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 30000; // 30s buffer
      
      return this.adminToken;
    } catch (error) {
      throw new Error(`Failed to get Keycloak admin token: ${error.message}`);
    }
  }

  async ensureValidToken() {
    if (!this.adminToken || Date.now() >= this.tokenExpiry) {
      await this.getAdminToken();
    }
    return this.adminToken;
  }

  async makeRequest(method, endpoint, data = null) {
    await this.ensureValidToken();
    
    const requestConfig = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${this.adminToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      requestConfig.data = data;
    }

    try {
      const response = await axios(requestConfig);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token might be expired, retry once
        await this.getAdminToken();
        requestConfig.headers.Authorization = `Bearer ${this.adminToken}`;
        const retryResponse = await axios(requestConfig);
        return retryResponse.data;
      }
      throw error;
    }
  }

  async registerOrUpdateClient(toolType, toolConfig, forceUpdate = false) {
    console.log(`🚀 registerOrUpdateClient called - toolType: ${toolType}, forceUpdate: ${forceUpdate}`);
    console.log(`🚀 toolConfig received:`, JSON.stringify(toolConfig, null, 2));
    
    const metadata = this.getToolMetadata(toolType);
    const clientId = `${toolType}-client-${metadata.protocol}`;
    
    try {
      // Check if client already exists
      const existingClients = await this.makeRequest('GET', `/clients?clientId=${clientId}`);
      const existingClient = existingClients.find(c => c.clientId === clientId);

      if (existingClient && !forceUpdate) {
        console.log(`Client ${clientId} already exists`);
        return {
          id: existingClient.id,
          clientId: existingClient.clientId,
          secret: existingClient.secret,
          action: 'existing'
        };
      }

      const clientConfig = this.buildClientConfig(toolType, toolConfig, metadata);

      if (existingClient && forceUpdate) {
        // Update existing client
        await this.makeRequest('PUT', `/clients/${existingClient.id}`, clientConfig);
        console.log(`Updated Keycloak client: ${clientId}`);
        
        return {
          id: existingClient.id,
          clientId: clientId,
          secret: clientConfig.secret,
          action: 'updated'
        };
      } else {
        // Create new client
        const response = await this.makeRequest('POST', '/clients', clientConfig);
        
        // Get the created client to return its ID
        const createdClients = await this.makeRequest('GET', `/clients?clientId=${clientId}`);
        const createdClient = createdClients.find(c => c.clientId === clientId);
        
        console.log(`Created Keycloak client: ${clientId}`);
        
        return {
          id: createdClient.id,
          clientId: clientId,
          secret: clientConfig.secret,
          action: 'created'
        };
      }
    } catch (error) {
      console.error(`Failed to register/update client ${clientId}:`, error.message);
      throw new Error(`Client registration failed: ${error.message}`);
    }
  }

  buildClientConfig(toolType, toolConfig, metadata) {
    const clientId = `${toolType}-client`;
    const baseClientConfig = {
      clientId: clientId,
      name: `${metadata.name} Client`,
      description: `OIDC client for ${metadata.name} integration`,
      enabled: true,
      clientAuthenticatorType: 'client-secret',
      secret: this.generateClientSecret(),
      standardFlowEnabled: true,
      implicitFlowEnabled: false,
      directAccessGrantsEnabled: false,
      serviceAccountsEnabled: false,
      publicClient: false,
      frontchannelLogout: false,
      protocol: metadata.protocol === 'saml' ? 'saml' : 'openid-connect',
      fullScopeAllowed: true,
      defaultClientScopes: ['openid', 'profile', 'email', 'roles', 'web-origins'],
      optionalClientScopes: ['address', 'phone', 'offline_access']
    };

    // Add tool-specific configuration
    if (metadata.protocol === 'oidc' || metadata.protocol === 'oauth2') {
      this.configureOIDCClient(baseClientConfig, toolType, toolConfig);
    } else if (metadata.protocol === 'saml') {
      this.configureSAMLClient(baseClientConfig, toolType, toolConfig);
    }

    return baseClientConfig;
  }

  configureOIDCClient(clientConfig, toolType, toolConfig) {
    const redirectUris = this.getRedirectUris(toolType, toolConfig);
    const webOrigins = this.getWebOrigins(toolType, toolConfig);

    clientConfig.redirectUris = redirectUris;
    clientConfig.webOrigins = webOrigins;
    
    // Add protocol mappers for roles and groups
    clientConfig.protocolMappers = [
      {
        name: 'realm-roles',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-usermodel-realm-role-mapper',
        consentRequired: false,
        config: {
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'realm_access.roles',
          'jsonType.label': 'String',
          'multivalued': 'true'
        }
      },
      {
        name: 'groups',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-group-membership-mapper',
        consentRequired: false,
        config: {
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'groups',
          'full.path': 'false'
        }
      },
      {
        name: 'tool-specific-roles',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        consentRequired: false,
        config: {
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': `${toolType}_roles`,
          'user.attribute': `${toolType}_roles`,
          'jsonType.label': 'String',
          'multivalued': 'true'
        }
      }
    ];
  }

  configureSAMLClient(clientConfig, toolType, toolConfig) {
    clientConfig.protocol = 'saml';
    clientConfig.frontchannelLogout = true;
    
    // SAML-specific configuration
    clientConfig.attributes = {
      'saml.assertion.signature': 'true',
      'saml.force.post.binding': 'true',
      'saml.multivalued.roles': 'true',
      'saml.encrypt': 'false',
      'saml.server.signature': 'true',
      'saml.server.signature.keyinfo.ext': 'false',
      'exclude.session.state.from.auth.response': 'false',
      'saml.artifact.binding': 'false',
      'saml.client.signature': 'false',
      'saml.signature.algorithm': 'RSA_SHA256',
      'saml.signing.certificate': '',
      'saml.assertion.lifespan': '300'
    };

    // Add SAML protocol mappers
    clientConfig.protocolMappers = [
      {
        name: 'role-mapper',
        protocol: 'saml',
        protocolMapper: 'saml-role-list-mapper',
        consentRequired: false,
        config: {
          'attribute.name': 'Role',
          'attribute.nameformat': 'Unspecified',
          'single': 'false'
        }
      },
      {
        name: 'email',
        protocol: 'saml',
        protocolMapper: 'saml-user-property-mapper',
        consentRequired: false,
        config: {
          'attribute.name': 'EmailAddress',
          'attribute.nameformat': 'Unspecified',
          'user.attribute': 'email'
        }
      },
      {
        name: 'username',
        protocol: 'saml',
        protocolMapper: 'saml-user-property-mapper',
        consentRequired: false,
        config: {
          'attribute.name': 'Username',
          'attribute.nameformat': 'Unspecified',
          'user.attribute': 'username'
        }
      }
    ];
  }

  getRedirectUris(toolType, toolConfig) {
    const baseUris = [];
    
    console.log(`🔍 Debug getRedirectUris - toolType: ${toolType}, toolConfig keys:`, Object.keys(toolConfig));
    console.log(`🔍 Debug getRedirectUris - toolConfig.redirect_uri:`, toolConfig.redirect_uri);
    console.log(`🔍 Debug getRedirectUris - full toolConfig:`, JSON.stringify(toolConfig, null, 2));
    
    // CRITICAL FIX: Check for explicit redirect_uri in config first
    if (toolConfig.redirect_uri) {
      baseUris.push(toolConfig.redirect_uri);
      console.log(`✅ Added explicit redirect_uri: ${toolConfig.redirect_uri}`);
    }
    
    switch (toolType) {
      case 'github':
        // GitHub OAuth App callback
        if (!toolConfig.redirect_uri) {
          baseUris.push('https://github.com/login/oauth/callback');
          if (toolConfig.base_url && toolConfig.base_url !== 'https://github.com') {
            baseUris.push(`${toolConfig.base_url}/login/oauth/callback`);
          }
        }
        break;
        
      case 'gitlab':
        if (!toolConfig.redirect_uri && toolConfig.instance_url) {
          baseUris.push(`${toolConfig.instance_url}/users/auth/openid_connect/callback`);
        }
        break;
        
      case 'jenkins':
        if (!toolConfig.redirect_uri && toolConfig.jenkins_url) {
          baseUris.push(`${toolConfig.jenkins_url}/securityRealm/finishLogin`);
        }
        break;
        
      case 'argocd':
        if (!toolConfig.redirect_uri && toolConfig.argocd_url) {
          baseUris.push(`${toolConfig.argocd_url}/auth/callback`);
        }
        break;
        
      case 'grafana':
        if (!toolConfig.redirect_uri && toolConfig.grafana_url) {
          const grafanaUri = `${toolConfig.grafana_url}/login/generic_oauth`;
          baseUris.push(grafanaUri);
          console.log(`✅ Added Grafana redirect URI: ${grafanaUri}`);
        }
        break;
        
      case 'sonarqube':
        if (!toolConfig.redirect_uri && toolConfig.sonarqube_url) {
          baseUris.push(`${toolConfig.sonarqube_url}/oauth2/callback/oidc`);
        }
        break;
        
      default:
        // Generic OIDC callback
        if (!toolConfig.redirect_uri && (toolConfig.base_url || toolConfig.instance_url)) {
          const baseUrl = toolConfig.base_url || toolConfig.instance_url;
          baseUris.push(`${baseUrl}/auth/callback`);
        }
    }
    
    console.log(`🔍 Final redirect URIs for ${toolType}:`, baseUris);
    return baseUris;
  }

  getWebOrigins(toolType, toolConfig) {
    const origins = [];
    
    console.log(`🔍 Debug getWebOrigins - toolType: ${toolType}, toolConfig keys:`, Object.keys(toolConfig));
    console.log(`🔍 Debug getWebOrigins - toolConfig.web_origins:`, toolConfig.web_origins);
    console.log(`🔍 Debug getWebOrigins - full toolConfig:`, JSON.stringify(toolConfig, null, 2));
    
    // CRITICAL FIX: Check for explicit web_origins in config first
    if (toolConfig.web_origins) {
      if (typeof toolConfig.web_origins === 'string') {
        origins.push(toolConfig.web_origins);
        console.log(`✅ Added explicit web_origins (string): ${toolConfig.web_origins}`);
      } else if (Array.isArray(toolConfig.web_origins)) {
        origins.push(...toolConfig.web_origins);
        console.log(`✅ Added explicit web_origins (array): ${toolConfig.web_origins.join(', ')}`);
      }
    }
    
    // Add tool-specific URLs if no explicit web origins provided
    if (origins.length === 0) {
      if (toolConfig.base_url) {
        origins.push(toolConfig.base_url);
        console.log(`✅ Added base_url as web origin: ${toolConfig.base_url}`);
      }
      if (toolConfig.instance_url) {
        origins.push(toolConfig.instance_url);
        console.log(`✅ Added instance_url as web origin: ${toolConfig.instance_url}`);
      }
      if (toolConfig.jenkins_url) {
        origins.push(toolConfig.jenkins_url);
        console.log(`✅ Added jenkins_url as web origin: ${toolConfig.jenkins_url}`);
      }
      if (toolConfig.argocd_url) {
        origins.push(toolConfig.argocd_url);
        console.log(`✅ Added argocd_url as web origin: ${toolConfig.argocd_url}`);
      }
      if (toolConfig.grafana_url) {
        origins.push(toolConfig.grafana_url);
        console.log(`✅ Added grafana_url as web origin: ${toolConfig.grafana_url}`);
      }
      if (toolConfig.sonarqube_url) {
        origins.push(toolConfig.sonarqube_url);
        console.log(`✅ Added sonarqube_url as web origin: ${toolConfig.sonarqube_url}`);
      }
    }
    
    const finalOrigins = [...new Set(origins)]; // Remove duplicates
    console.log(`🔍 Final web origins for ${toolType}:`, finalOrigins);
    return finalOrigins;
  }

  generateClientSecret() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  getToolMetadata(toolType) {
    const toolSchemas = require('../schemas/tool-schemas');
    return toolSchemas.getMetadata(toolType);
  }

  async getClient(clientId) {
    try {
      const clients = await this.makeRequest('GET', `/clients?clientId=${clientId}`);
      return clients.find(c => c.clientId === clientId);
    } catch (error) {
      throw new Error(`Failed to get client: ${error.message}`);
    }
  }

  async deleteClient(clientId) {
    try {
      const client = await this.getClient(clientId);
      if (client) {
        await this.makeRequest('DELETE', `/clients/${client.id}`);
        console.log(`Deleted Keycloak client: ${clientId}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete client: ${error.message}`);
    }
  }

  async ensureClientExists(toolType, toolConfig) {
    const metadata = this.getToolMetadata(toolType);
    const clientId = `${toolType}-client-${metadata.protocol}`;
    
    try {
      console.log(`🔍 Checking if client ${clientId} exists in Keycloak`);
      const existingClient = await this.getClient(clientId);
      
      if (existingClient) {
        console.log(`✅ Client ${clientId} already exists`);
        return {
          id: existingClient.id,
          clientId: existingClient.clientId,
          secret: existingClient.secret,
          action: 'existing',
          created: false
        };
      }
      
      // Client doesn't exist, create it
      console.log(`🚀 Creating new client ${clientId} in Keycloak`);
      const clientConfig = this.buildClientConfig(toolType, toolConfig, metadata);
      
      await this.makeRequest('POST', '/clients', clientConfig);
      
      // Get the created client to return its details
      const createdClient = await this.getClient(clientId);
      
      console.log(`✅ Successfully created client ${clientId}`);
      return {
        id: createdClient.id,
        clientId: createdClient.clientId,
        secret: clientConfig.secret,
        action: 'created',
        created: true
      };
      
    } catch (error) {
      console.error(`❌ Failed to ensure client ${clientId} exists:`, error.message);
      throw new Error(`Failed to ensure client exists: ${error.message}`);
    }
  }
}

module.exports = new KeycloakService();
