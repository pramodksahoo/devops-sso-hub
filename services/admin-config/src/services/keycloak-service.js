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

  async validateClientExists(toolType, integrationType = null) {
    console.log(`🔍 validateClientExists called - toolType: ${toolType}, integrationType: ${integrationType}`);
    
    const metadata = this.getToolMetadata(toolType);
    // Use provided integration type or fall back to metadata protocol
    const protocol = integrationType || metadata.protocol;
    const clientId = `${toolType}-client-${protocol}`;
    
    console.log(`🔍 Looking for client: ${clientId} in realm: ${this.baseUrl}`);
    
    try {
      // Check if client exists in Keycloak
      const existingClient = await this.getClient(clientId);
      console.log(`🔍 getClient result for ${clientId}:`, existingClient ? 'FOUND' : 'NOT FOUND');

      if (!existingClient) {
        console.error(`❌ Keycloak client '${clientId}' not found in realm ${this.baseUrl}`);
        // Let's also check what clients do exist for debugging
        try {
          const allClients = await this.makeRequest('GET', '/clients');
          const clientIds = allClients.map(c => c.clientId);
          console.log(`📋 Available clients in realm:`, clientIds);
        } catch (listError) {
          console.error(`Failed to list clients for debugging:`, listError.message);
        }
        throw new Error(`Tool configuration for ${toolType} not found`);
      }

      if (!existingClient.enabled) {
        console.warn(`⚠️  Keycloak client '${clientId}' exists but is disabled`);
      }
      
      console.log(`✅ Validated Keycloak client exists: ${clientId}`);
      return {
        id: existingClient.id,
        clientId: existingClient.clientId,
        secret: existingClient.secret,
        enabled: existingClient.enabled,
        action: 'validated'
      };
    } catch (error) {
      console.error(`❌ Failed to validate client ${clientId}:`, error.message);
      throw error; // Re-throw the original error instead of wrapping it
    }
  }

  buildClientConfig(toolType, toolConfig, metadata) {
    const clientId = `${toolType}-client-${metadata.protocol}`;
    const baseClientConfig = {
      clientId: clientId,
      name: `${metadata.name} Client`,
      description: `${metadata.protocol.toUpperCase()} client for ${metadata.name} integration`,
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
      console.log(`🔍 Searching for client: ${clientId}`);
      const clients = await this.makeRequest('GET', `/clients?clientId=${clientId}`);
      console.log(`🔍 Keycloak API returned ${clients.length} clients for query: ${clientId}`);
      
      const foundClient = clients.find(c => c.clientId === clientId);
      if (foundClient) {
        console.log(`✅ Found client: ${foundClient.clientId} (ID: ${foundClient.id})`);
      } else {
        console.log(`❌ Client '${clientId}' not found in results`);
        if (clients.length > 0) {
          const returnedClientIds = clients.map(c => c.clientId);
          console.log(`📋 Returned clients:`, returnedClientIds);
        }
      }
      return foundClient;
    } catch (error) {
      console.error(`❌ Failed to get client '${clientId}':`, error.message);
      if (error.response) {
        console.error(`❌ HTTP Status: ${error.response.status}`);
        console.error(`❌ Response:`, error.response.data);
      }
      throw new Error(`Failed to get client: ${error.message}`);
    }
  }

  async updateClient(clientId, updateFields) {
    try {
      const client = await this.getClient(clientId);
      if (!client) {
        throw new Error(`Client ${clientId} not found`);
      }
      
      console.log(`🔄 Updating Keycloak client ${clientId} with fields:`, Object.keys(updateFields));
      
      // Prepare the update payload with enhanced field mappings
      const updatePayload = {};
      
      // CRITICAL: Handle UI field mappings to Keycloak fields
      
      // Root URL mapping (UI: Grafana URL/Root URL -> Keycloak: rootUrl)
      if (updateFields.rootUrl !== undefined || updateFields.root_url !== undefined) {
        updatePayload.rootUrl = updateFields.rootUrl || updateFields.root_url;
        console.log(`📝 Updating Root URL: ${updatePayload.rootUrl}`);
      }
      
      // Home URL mapping (UI: Home URL -> Keycloak: baseUrl)  
      if (updateFields.homeUrl !== undefined || updateFields.home_url !== undefined) {
        updatePayload.baseUrl = updateFields.homeUrl || updateFields.home_url;
        console.log(`📝 Updating Home URL (baseUrl): ${updatePayload.baseUrl}`);
      }
      
      // Valid Redirect URIs mapping (UI: Valid Redirect URIs -> Keycloak: redirectUris)
      if (updateFields.redirectUris !== undefined || updateFields.redirect_uris !== undefined) {
        const redirectUris = updateFields.redirectUris || updateFields.redirect_uris;
        updatePayload.redirectUris = Array.isArray(redirectUris) 
          ? redirectUris 
          : typeof redirectUris === 'string'
            ? redirectUris.split('\n').map(uri => uri.trim()).filter(uri => uri)
            : [redirectUris];
        console.log(`📝 Updating Redirect URIs: ${JSON.stringify(updatePayload.redirectUris)}`);
      }
      
      // Web Origins mapping (UI: Web Origins -> Keycloak: webOrigins)  
      if (updateFields.webOrigins !== undefined || updateFields.web_origins !== undefined) {
        const webOrigins = updateFields.webOrigins || updateFields.web_origins;
        updatePayload.webOrigins = Array.isArray(webOrigins)
          ? webOrigins
          : typeof webOrigins === 'string'
            ? webOrigins.split('\n').map(origin => origin.trim()).filter(origin => origin)
            : [webOrigins];
        console.log(`📝 Updating Web Origins: ${JSON.stringify(updatePayload.webOrigins)}`);
      }
      
      // Client Secret mapping (if provided)
      if (updateFields.clientSecret !== undefined || updateFields.client_secret !== undefined) {
        updatePayload.secret = updateFields.clientSecret || updateFields.client_secret;
        console.log(`📝 Updating Client Secret: [HIDDEN]`);
      }
      
      // Standard fields
      if (updateFields.name !== undefined) {
        updatePayload.name = updateFields.name;
        console.log(`📝 Updating name: ${updatePayload.name}`);
      }
      
      if (updateFields.description !== undefined) {
        updatePayload.description = updateFields.description;
        console.log(`📝 Updating description: ${updatePayload.description}`);
      }
      
      if (Object.keys(updatePayload).length === 0) {
        console.log(`⚠️ No update fields provided for client ${clientId}`);
        return client;
      }
      
      console.log(`🔄 Final update payload for ${clientId}:`, JSON.stringify(updatePayload, null, 2));
      
      // Update the client in Keycloak
      await this.makeRequest('PUT', `/clients/${client.id}`, updatePayload);
      console.log(`✅ Successfully updated Keycloak client: ${clientId}`);
      
      // Return the updated client to verify changes were applied
      const updatedClient = await this.getClient(clientId);
      console.log(`🔍 Verification - Updated client ${clientId} now has:`, {
        rootUrl: updatedClient.rootUrl,
        baseUrl: updatedClient.baseUrl,
        redirectUris: updatedClient.redirectUris,
        webOrigins: updatedClient.webOrigins
      });
      
      return updatedClient;
      
    } catch (error) {
      console.error(`❌ Failed to update client ${clientId}:`, error);
      throw new Error(`Failed to update client: ${error.message}`);
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

  async ensureClientExists(toolType, integrationType = null) {
    const metadata = this.getToolMetadata(toolType);
    // Use provided integration type or fall back to metadata protocol
    const protocol = integrationType || metadata.protocol;
    const clientId = `${toolType}-client-${protocol}`;
    
    try {
      console.log(`🔍 Ensuring client ${clientId} exists in Keycloak (read-only check)`);
      const existingClient = await this.getClient(clientId);
      
      if (!existingClient) {
        throw new Error(`Keycloak client '${clientId}' is required but not found in the realm. Please add this client to your Keycloak realm configuration before proceeding.`);
      }
      
      if (!existingClient.enabled) {
        throw new Error(`Keycloak client '${clientId}' exists but is disabled. Please enable it in Keycloak before proceeding.`);
      }
      
      console.log(`✅ Client ${clientId} exists and is enabled`);
      return {
        id: existingClient.id,
        clientId: existingClient.clientId,
        secret: existingClient.secret,
        enabled: existingClient.enabled,
        action: 'validated',
        created: false
      };
      
    } catch (error) {
      console.error(`❌ Failed to ensure client ${clientId} exists:`, error.message);
      throw new Error(`Client validation failed: ${error.message}`);
    }
  }

  /**
   * Get all clients from Keycloak
   */
  async getAllClients() {
    await this.ensureValidToken();
    
    try {
      const response = await this.makeRequest('GET', '/clients');
      return response;
    } catch (error) {
      console.error('❌ Failed to get all clients:', error.message);
      throw new Error(`Failed to get clients: ${error.message}`);
    }
  }

  /**
   * Fetch complete client configuration from Keycloak for bidirectional sync
   */
  async getClientConfiguration(clientId) {
    await this.ensureValidToken();
    
    try {
      const client = await this.getClient(clientId);
      if (!client) {
        throw new Error(`Client ${clientId} not found`);
      }

      // Get detailed client information including all settings
      const clientConfig = await this.makeRequest('GET', `/clients/${client.id}`);
      
      // Extract relevant configuration for tool sync
      return {
        clientId: clientConfig.clientId,
        id: clientConfig.id,
        protocol: clientConfig.protocol,
        rootUrl: clientConfig.rootUrl,
        baseUrl: clientConfig.baseUrl,
        adminUrl: clientConfig.adminUrl,
        redirectUris: clientConfig.redirectUris || [],
        webOrigins: clientConfig.webOrigins || [],
        enabled: clientConfig.enabled,
        publicClient: clientConfig.publicClient,
        standardFlowEnabled: clientConfig.standardFlowEnabled,
        implicitFlowEnabled: clientConfig.implicitFlowEnabled,
        directAccessGrantsEnabled: clientConfig.directAccessGrantsEnabled,
        serviceAccountsEnabled: clientConfig.serviceAccountsEnabled,
        authorizationServicesEnabled: clientConfig.authorizationServicesEnabled,
        attributes: clientConfig.attributes || {},
        // OAuth-specific settings
        consentRequired: clientConfig.consentRequired,
        clientAuthenticatorType: clientConfig.clientAuthenticatorType,
        secret: clientConfig.secret, // Note: This might not be returned for security
        // Timestamps
        lastModified: clientConfig.lastModified || Date.now()
      };
    } catch (error) {
      console.error(`❌ Failed to get client configuration for ${clientId}:`, error.message);
      throw new Error(`Failed to get client configuration: ${error.message}`);
    }
  }

  /**
   * Sync all tool clients from Keycloak back to database
   * This implements Keycloak → DB sync for bidirectional synchronization
   */
  async syncFromKeycloak(toolConfigService) {
    await this.ensureValidToken();
    
    try {
      console.log('🔄 Starting Keycloak → DB sync...');
      
      // Get all clients from Keycloak that match tool patterns
      const allClients = await this.getAllClients();
      const toolClientPattern = /^(grafana|jenkins|argocd|gitlab|github|terraform|sonarqube|prometheus|kibana|snyk|jira|servicenow)-client-(oauth2|oidc|saml)$/;
      
      const toolClients = allClients.filter(client => 
        toolClientPattern.test(client.clientId)
      );

      console.log(`📋 Found ${toolClients.length} tool clients in Keycloak to sync`);
      
      const syncResults = [];
      
      for (const client of toolClients) {
        try {
          // Parse tool type and integration type from client ID
          // Pattern: {toolType}-client-{integrationType}
          const parts = client.clientId.split('-');
          if (parts.length !== 3 || parts[1] !== 'client') {
            throw new Error(`Invalid client ID format: ${client.clientId}`);
          }
          const [toolType, , integrationType] = parts;
          
          console.log(`🔄 Syncing ${toolType}:${integrationType} (${client.clientId})`);
          
          // Get detailed client configuration
          const keycloakConfig = await this.getClientConfiguration(client.clientId);
          
          // Check if we have this configuration in database
          const existingConfig = await toolConfigService.getToolConfig(toolType);
          
          if (existingConfig) {
            // Update existing configuration with Keycloak changes
            const updatedConfig = {
              ...existingConfig.config,
              keycloak: {
                ...existingConfig.config.keycloak,
                root_url: keycloakConfig.rootUrl,
                home_url: keycloakConfig.baseUrl,
                redirect_uris: keycloakConfig.redirectUris,
                web_origins: keycloakConfig.webOrigins,
                enabled: keycloakConfig.enabled,
                protocol: keycloakConfig.protocol,
                public_client: keycloakConfig.publicClient,
                standard_flow_enabled: keycloakConfig.standardFlowEnabled,
                implicit_flow_enabled: keycloakConfig.implicitFlowEnabled,
                direct_access_grants_enabled: keycloakConfig.directAccessGrantsEnabled,
                service_accounts_enabled: keycloakConfig.serviceAccountsEnabled,
                last_synced_from_keycloak: new Date().toISOString()
              }
            };
            
            // Update database configuration
            await toolConfigService.updateToolConfig(toolType, {
              integration_type: integrationType,
              config_json: updatedConfig,
              keycloak_client_id: keycloakConfig.clientId,
              keycloak_client_uuid: keycloakConfig.id
            });
            
            syncResults.push({
              toolType,
              integrationType,
              clientId: client.clientId,
              status: 'updated',
              changes: ['keycloak_settings']
            });
            
          } else {
            console.log(`⚠️ No database configuration found for ${toolType}, skipping sync`);
            syncResults.push({
              toolType,
              integrationType,
              clientId: client.clientId,
              status: 'skipped',
              reason: 'no_database_config'
            });
          }
          
        } catch (clientSyncError) {
          console.error(`❌ Failed to sync client ${client.clientId}:`, clientSyncError.message);
          syncResults.push({
            toolType: 'unknown',
            integrationType: 'unknown',
            clientId: client.clientId,
            status: 'error',
            error: clientSyncError.message
          });
        }
      }
      
      console.log('✅ Keycloak → DB sync completed');
      console.log('📊 Sync results:', syncResults);
      
      return {
        success: true,
        syncedClients: syncResults.filter(r => r.status === 'updated').length,
        skippedClients: syncResults.filter(r => r.status === 'skipped').length,
        errorClients: syncResults.filter(r => r.status === 'error').length,
        results: syncResults
      };
      
    } catch (error) {
      console.error('❌ Failed to sync from Keycloak:', error.message);
      throw new Error(`Keycloak sync failed: ${error.message}`);
    }
  }
}

module.exports = new KeycloakService();
