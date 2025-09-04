// Dynamic tool configuration schemas for different integration types
export interface BaseConfigField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'textarea' | 'select' | 'checkbox' | 'email' | 'number';
  required: boolean;
  placeholder?: string;
  description?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  options?: Array<{ label: string; value: string }>;
  sensitive?: boolean; // For fields that should be encrypted
  readonly?: boolean; // For fields that should not be editable by users
}

export interface ToolConfigSchema {
  integration_type: string;
  display_name: string;
  description: string;
  fields: BaseConfigField[];
  validation_endpoints?: string[];
  setup_instructions?: string[];
}

// OIDC Configuration Schema
const oidcSchema: ToolConfigSchema = {
  integration_type: 'oidc',
  display_name: 'OpenID Connect (OIDC)',
  description: 'Configure OIDC authentication for secure single sign-on integration',
  fields: [
    {
      name: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: 'Enter your OIDC Client ID',
      description: 'The Client ID provided by your OIDC provider',
      sensitive: false
    },
    {
      name: 'client_secret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      placeholder: 'Enter your Client Secret',
      description: 'The Client Secret provided by your OIDC provider',
      sensitive: true
    },
    {
      name: 'discovery_url',
      label: 'Discovery URL',
      type: 'url',
      required: true,
      placeholder: 'https://your-provider.com/.well-known/openid_configuration',
      description: 'OIDC Discovery URL for automatic endpoint configuration',
      validation: {
        pattern: '^https://.*/.well-known/openid[_-]configuration$'
      }
    },
    {
      name: 'auth_url',
      label: 'Authorization URL',
      type: 'url',
      required: false,
      placeholder: 'https://your-provider.com/oauth/authorize',
      description: 'Custom authorization endpoint (auto-discovered if not provided)'
    },
    {
      name: 'token_url',
      label: 'Token URL',
      type: 'url',
      required: false,
      placeholder: 'https://your-provider.com/oauth/token',
      description: 'Custom token endpoint (auto-discovered if not provided)'
    },
    {
      name: 'userinfo_url',
      label: 'User Info URL',
      type: 'url',
      required: false,
      placeholder: 'https://your-provider.com/oauth/userinfo',
      description: 'Custom userinfo endpoint (auto-discovered if not provided)'
    },
    {
      name: 'scopes',
      label: 'OAuth Scopes',
      type: 'text',
      required: true,
      placeholder: 'openid profile email',
      description: 'Space-separated list of OAuth scopes to request'
    },
    {
      name: 'redirect_uri',
      label: 'Redirect URI',
      type: 'url',
      required: true,
      placeholder: 'https://sso-hub.company.com/auth/callback/oidc',
      description: 'The callback URL registered with your OIDC provider'
    }
  ],
  setup_instructions: [
    'Register your application with your OIDC provider',
    'Configure the redirect URI in your provider settings',
    'Copy the Client ID and Client Secret from your provider',
    'Test the connection using the validation button'
  ]
};

// OAuth2 Configuration Schema
const oauth2Schema: ToolConfigSchema = {
  integration_type: 'oauth2',
  display_name: 'OAuth 2.0',
  description: 'Configure OAuth 2.0 authentication for API-based integrations',
  fields: [
    {
      name: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: 'Enter your OAuth2 Client ID',
      description: 'The Client ID from your OAuth2 application registration',
      sensitive: false
    },
    {
      name: 'client_secret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      placeholder: 'Enter your Client Secret',
      description: 'The Client Secret from your OAuth2 application registration',
      sensitive: true
    },
    {
      name: 'auth_url',
      label: 'Authorization URL',
      type: 'url',
      required: true,
      placeholder: 'https://api.example.com/oauth/authorize',
      description: 'OAuth2 authorization endpoint URL'
    },
    {
      name: 'token_url',
      label: 'Token URL',
      type: 'url',
      required: true,
      placeholder: 'https://api.example.com/oauth/token',
      description: 'OAuth2 token endpoint URL'
    },
    {
      name: 'scopes',
      label: 'OAuth Scopes',
      type: 'text',
      required: true,
      placeholder: 'read write admin',
      description: 'Space-separated list of OAuth scopes to request'
    },
    {
      name: 'redirect_uri',
      label: 'Redirect URI',
      type: 'url',
      required: true,
      placeholder: 'https://sso-hub.company.com/auth/callback/oauth2',
      description: 'The callback URL registered with your OAuth2 provider'
    },
    {
      name: 'grant_type',
      label: 'Grant Type',
      type: 'select',
      required: true,
      options: [
        { label: 'Authorization Code', value: 'authorization_code' },
        { label: 'Client Credentials', value: 'client_credentials' },
        { label: 'Resource Owner Password', value: 'password' }
      ],
      description: 'OAuth2 grant type for token acquisition'
    }
  ],
  setup_instructions: [
    'Create an OAuth2 application in your provider',
    'Configure the redirect URI in your application settings',
    'Copy the Client ID and Client Secret',
    'Ensure the required scopes are available for your application'
  ]
};

// SAML Configuration Schema
const samlSchema: ToolConfigSchema = {
  integration_type: 'saml',
  display_name: 'SAML 2.0',
  description: 'Configure SAML 2.0 authentication for enterprise SSO integration',
  fields: [
    {
      name: 'entity_id',
      label: 'Entity ID (SP)',
      type: 'text',
      required: true,
      placeholder: 'https://sso-hub.company.com/saml/metadata',
      description: 'Service Provider Entity ID (usually your SSO Hub URL)'
    },
    {
      name: 'idp_entity_id',
      label: 'Identity Provider Entity ID',
      type: 'text',
      required: true,
      placeholder: 'https://idp.company.com/saml/metadata',
      description: 'Identity Provider Entity ID from your SAML provider'
    },
    {
      name: 'idp_sso_url',
      label: 'IdP SSO URL',
      type: 'url',
      required: true,
      placeholder: 'https://idp.company.com/saml/sso',
      description: 'Identity Provider Single Sign-On URL'
    },
    {
      name: 'idp_slo_url',
      label: 'IdP SLO URL',
      type: 'url',
      required: false,
      placeholder: 'https://idp.company.com/saml/slo',
      description: 'Identity Provider Single Logout URL (optional)'
    },
    {
      name: 'x509_cert',
      label: 'X.509 Certificate',
      type: 'textarea',
      required: true,
      placeholder: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
      description: 'Identity Provider X.509 certificate for signature verification',
      sensitive: true
    },
    {
      name: 'name_id_format',
      label: 'NameID Format',
      type: 'select',
      required: true,
      options: [
        { label: 'Email Address', value: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress' },
        { label: 'Persistent', value: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent' },
        { label: 'Transient', value: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient' },
        { label: 'Unspecified', value: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified' }
      ],
      description: 'NameID format for user identification'
    },
    {
      name: 'attribute_mapping',
      label: 'Attribute Mapping',
      type: 'textarea',
      required: false,
      placeholder: '{\n  "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",\n  "name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"\n}',
      description: 'JSON mapping of user attributes from SAML assertions'
    }
  ],
  setup_instructions: [
    'Configure your application as a Service Provider in your SAML IdP',
    'Download the IdP metadata or copy the required values',
    'Upload or paste the X.509 certificate',
    'Configure attribute mappings for user data',
    'Test the SAML assertion flow'
  ]
};

// Custom/API Key Configuration Schema
const customSchema: ToolConfigSchema = {
  integration_type: 'custom',
  display_name: 'Custom Integration',
  description: 'Configure custom authentication methods including API keys and tokens',
  fields: [
    {
      name: 'auth_type',
      label: 'Authentication Type',
      type: 'select',
      required: true,
      options: [
        { label: 'API Key', value: 'api_key' },
        { label: 'Bearer Token', value: 'bearer_token' },
        { label: 'Basic Authentication', value: 'basic_auth' },
        { label: 'Custom Header', value: 'custom_header' }
      ],
      description: 'Type of authentication mechanism'
    },
    {
      name: 'api_key',
      label: 'API Key',
      type: 'password',
      required: false,
      placeholder: 'Enter your API key',
      description: 'API key for authentication (if using API Key auth type)',
      sensitive: true
    },
    {
      name: 'bearer_token',
      label: 'Bearer Token',
      type: 'password',
      required: false,
      placeholder: 'Enter your bearer token',
      description: 'Bearer token for authentication (if using Bearer Token auth type)',
      sensitive: true
    },
    {
      name: 'username',
      label: 'Username',
      type: 'text',
      required: false,
      placeholder: 'Enter username',
      description: 'Username for basic authentication (if using Basic Auth)'
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      required: false,
      placeholder: 'Enter password',
      description: 'Password for basic authentication (if using Basic Auth)',
      sensitive: true
    },
    {
      name: 'header_name',
      label: 'Custom Header Name',
      type: 'text',
      required: false,
      placeholder: 'X-API-Key',
      description: 'Custom header name (if using Custom Header auth type)'
    },
    {
      name: 'header_value',
      label: 'Custom Header Value',
      type: 'password',
      required: false,
      placeholder: 'Enter header value',
      description: 'Custom header value (if using Custom Header auth type)',
      sensitive: true
    },
    {
      name: 'base_url',
      label: 'API Base URL',
      type: 'url',
      required: true,
      placeholder: 'https://api.example.com/v1',
      description: 'Base URL for API endpoints'
    }
  ],
  setup_instructions: [
    'Select the appropriate authentication type for your tool',
    'Generate API keys or tokens from your tool\'s settings',
    'Configure the authentication credentials',
    'Test the connection to verify setup'
  ]
};

// Enhanced tool-specific schema definitions with nested object support
export const toolSpecificSchemas: Record<string, Record<string, ToolConfigSchema>> = {
  'grafana': {
    'oauth2': {
      integration_type: 'oauth2',
      display_name: 'Grafana OAuth2 Integration',
      description: 'Configure Grafana with OAuth2 authentication via Keycloak',
      fields: [
        // Core Grafana Settings
        {
          name: 'grafana_url',
          label: 'Grafana URL (Root URL)',
          type: 'url',
          required: true,
          placeholder: 'http://localhost:3100',
          description: 'The base URL of your Grafana instance'
        },
        
        // OAuth Configuration Section
        {
          name: 'oauth.enabled',
          label: 'Enable OAuth Integration',
          type: 'checkbox',
          required: false,
          description: 'Enable OAuth2 authentication for Grafana'
        },
        {
          name: 'oauth.client_id',
          label: 'OAuth Client ID',
          type: 'text',
          required: true,
          placeholder: 'grafana-client-oauth2 (auto-generated)',
          description: 'System-generated OAuth Client ID',
          readonly: true
        },
        {
          name: 'oauth.client_secret',
          label: 'OAuth Client Secret',
          type: 'password',
          required: true,
          placeholder: 'Enter your Client Secret',
          description: 'OAuth Client Secret from Keycloak',
          sensitive: true
        },
        {
          name: 'oauth.auth_url',
          label: 'Authorization URL',
          type: 'url',
          required: false,
          placeholder: 'http://localhost:8080/realms/sso-hub/protocol/openid-connect/auth',
          description: 'OAuth authorization endpoint (auto-generated)',
          readonly: true
        },
        {
          name: 'oauth.token_url',
          label: 'Token URL',
          type: 'url',
          required: false,
          placeholder: 'http://localhost:8080/realms/sso-hub/protocol/openid-connect/token',
          description: 'OAuth token endpoint (auto-generated)',
          readonly: true
        },
        {
          name: 'oauth.api_url',
          label: 'User Info URL',
          type: 'url',
          required: false,
          placeholder: 'http://localhost:8080/realms/sso-hub/protocol/openid-connect/userinfo',
          description: 'OAuth userinfo endpoint (auto-generated)',
          readonly: true
        },
        {
          name: 'oauth.scopes',
          label: 'OAuth Scopes',
          type: 'text',
          required: false,
          placeholder: 'openid email profile offline_access roles',
          description: 'Space-separated OAuth scopes with default values: openid email profile offline_access roles'
        },
        {
          name: 'oauth.allow_sign_up',
          label: 'Allow Sign Up',
          type: 'checkbox',
          required: false,
          description: 'Allow automatic user registration'
        },
        
        // Keycloak Client Configuration Section (Root URL handled by Grafana URL)
        {
          name: 'keycloak.home_url',
          label: 'Home URL',
          type: 'url',
          required: false,
          placeholder: 'http://localhost:3100',
          description: 'Keycloak client home URL - syncs bidirectionally with Keycloak'
        },
        {
          name: 'keycloak.redirect_uris',
          label: 'Valid Redirect URIs',
          type: 'textarea',
          required: false,
          placeholder: 'http://localhost:3100/login/generic_oauth\nhttp://localhost:3100/auth/callback',
          description: 'One redirect URI per line - syncs bidirectionally with Keycloak'
        },
        {
          name: 'keycloak.web_origins',
          label: 'Web Origins',
          type: 'textarea',
          required: false,
          placeholder: 'http://localhost:3100\nhttp://grafana.company.com',
          description: 'One web origin per line - syncs bidirectionally with Keycloak'
        },
        
        
        // Organization Management Section
        {
          name: 'org_management.enabled',
          label: 'Enable Organization Management',
          type: 'checkbox',
          required: false,
          description: 'Enable automatic organization assignment'
        },
        {
          name: 'org_management.auto_assign_org',
          label: 'Auto Assign Organization',
          type: 'checkbox',
          required: false,
          description: 'Automatically assign users to organization'
        },
        {
          name: 'org_management.auto_assign_org_role',
          label: 'Default Organization Role',
          type: 'select',
          required: false,
          options: [
            { label: 'Viewer', value: 'Viewer' },
            { label: 'Editor', value: 'Editor' },
            { label: 'Admin', value: 'Admin' }
          ],
          description: 'Default role for new users'
        }
      ],
      setup_instructions: [
        'Configure your Keycloak realm with the sso-hub settings',
        'The OAuth2 client will be automatically created in Keycloak',
        'Update your Grafana configuration with the OAuth settings',
        'Test the authentication flow'
      ]
    }
  },
  
  'jenkins': {
    'oidc': {
      integration_type: 'oidc',
      display_name: 'Jenkins OIDC Integration',
      description: 'Configure Jenkins with OIDC authentication via Keycloak',
      fields: [
        {
          name: 'jenkins_url',
          label: 'Jenkins URL',
          type: 'url',
          required: true,
          placeholder: 'http://localhost:8080',
          description: 'The base URL of your Jenkins instance'
        },
        {
          name: 'client_id',
          label: 'OIDC Client ID',
          type: 'text',
          required: true,
          placeholder: 'jenkins-client-oidc',
          description: 'OIDC Client ID (auto-generated)',
          readonly: true
        },
        {
          name: 'client_secret',
          label: 'OIDC Client Secret',
          type: 'password',
          required: true,
          placeholder: 'Enter client secret',
          description: 'OIDC Client Secret from Keycloak',
          sensitive: true
        },
        {
          name: 'discovery_url',
          label: 'Discovery URL',
          type: 'url',
          required: false,
          placeholder: 'http://localhost:8080/realms/sso-hub/.well-known/openid_configuration',
          description: 'OIDC Discovery URL (auto-generated)',
          readonly: true
        },
        {
          name: 'scopes',
          label: 'OIDC Scopes',
          type: 'text',
          required: false,
          placeholder: 'openid email profile offline_access roles',
          description: 'Space-separated OIDC scopes (auto-populated with defaults)'
        },
        
        // Keycloak Client Configuration Section
        {
          name: 'keycloak.root_url',
          label: 'Root URL',
          type: 'url',
          required: false,
          placeholder: 'http://localhost:8080',
          description: 'Keycloak client root URL (auto-populated from Jenkins URL)'
        },
        {
          name: 'keycloak.home_url',
          label: 'Home URL',
          type: 'url',
          required: false,
          placeholder: 'http://localhost:8080',
          description: 'Keycloak client home URL (auto-populated from Jenkins URL)'
        },
        {
          name: 'keycloak.redirect_uris',
          label: 'Valid Redirect URIs',
          type: 'textarea',
          required: false,
          placeholder: 'http://localhost:8080/securityRealm/finishLogin\nhttp://localhost:8080/auth/callback',
          description: 'One redirect URI per line (auto-populated with Jenkins OIDC paths)'
        },
        {
          name: 'keycloak.web_origins',
          label: 'Web Origins',
          type: 'textarea',
          required: false,
          placeholder: 'http://localhost:8080\nhttp://jenkins.company.com',
          description: 'One web origin per line (auto-populated from Root URL)'
        }
      ]
    }
  },
  
  'argocd': {
    'oidc': {
      integration_type: 'oidc',
      display_name: 'Argo CD OIDC Integration',
      description: 'Configure Argo CD with OIDC authentication via Keycloak',
      fields: [
        {
          name: 'argocd_url',
          label: 'Argo CD URL',
          type: 'url',
          required: true,
          placeholder: 'http://localhost:8080',
          description: 'The base URL of your Argo CD instance'
        },
        {
          name: 'client_id',
          label: 'OIDC Client ID',
          type: 'text',
          required: true,
          placeholder: 'argocd-client-oidc',
          description: 'OIDC Client ID (auto-generated)',
          readonly: true
        },
        {
          name: 'client_secret',
          label: 'OIDC Client Secret',
          type: 'password',
          required: true,
          placeholder: 'Enter client secret',
          description: 'OIDC Client Secret from Keycloak',
          sensitive: true
        },
        {
          name: 'scopes',
          label: 'OIDC Scopes',
          type: 'text',
          required: false,
          placeholder: 'openid email profile offline_access roles',
          description: 'Space-separated OIDC scopes (auto-populated with defaults)'
        },
        
        // Keycloak Client Configuration Section
        {
          name: 'keycloak.root_url',
          label: 'Root URL',
          type: 'url',
          required: false,
          placeholder: 'http://localhost:8080',
          description: 'Keycloak client root URL (auto-populated from Argo CD URL)'
        },
        {
          name: 'keycloak.home_url',
          label: 'Home URL',
          type: 'url',
          required: false,
          placeholder: 'http://localhost:8080',
          description: 'Keycloak client home URL (auto-populated from Argo CD URL)'
        },
        {
          name: 'keycloak.redirect_uris',
          label: 'Valid Redirect URIs',
          type: 'textarea',
          required: false,
          placeholder: 'http://localhost:8080/auth/callback\nhttp://localhost:8080/api/dex/callback',
          description: 'One redirect URI per line (auto-populated with Argo CD OIDC paths)'
        },
        {
          name: 'keycloak.web_origins',
          label: 'Web Origins',
          type: 'textarea',
          required: false,
          placeholder: 'http://localhost:8080\nhttp://argocd.company.com',
          description: 'One web origin per line (auto-populated from Root URL)'
        }
      ]
    }
  }
};

/**
 * Get schema for a specific tool and integration type
 */
export function getToolConfigSchema(toolSlug: string, integrationType: string): ToolConfigSchema {
  console.log(`🔍 Looking for schema: ${toolSlug}:${integrationType}`);
  
  // Check for tool-specific schema first
  if (toolSpecificSchemas[toolSlug] && toolSpecificSchemas[toolSlug][integrationType]) {
    console.log(`✅ Found tool-specific schema for ${toolSlug}:${integrationType}`);
    return toolSpecificSchemas[toolSlug][integrationType];
  }
  
  // Fall back to generic schema by integration type
  console.log(`⚠️ Using generic schema for ${integrationType}`);
  switch (integrationType) {
    case 'oidc':
      return oidcSchema;
    case 'oauth2':
      return oauth2Schema;
    case 'saml':
      return samlSchema;
    case 'custom':
      return customSchema;
    default:
      return oidcSchema;
  }
}

/**
 * Convert nested field names to flat object structure
 * Example: 'oauth.client_id' -> { oauth: { client_id: value } }
 */
export function convertFlatToNested(flatData: Record<string, any>): Record<string, any> {
  const nested: Record<string, any> = {};
  
  Object.entries(flatData).forEach(([key, value]) => {
    if (key.includes('.')) {
      const parts = key.split('.');
      let current = nested;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      current[parts[parts.length - 1]] = value;
    } else {
      nested[key] = value;
    }
  });
  
  return nested;
}

/**
 * Convert nested object to flat field names
 * Example: { oauth: { client_id: value } } -> 'oauth.client_id'
 */
export function convertNestedToFlat(nestedData: Record<string, any>, prefix = ''): Record<string, any> {
  const flat: Record<string, any> = {};
  
  Object.entries(nestedData).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flat, convertNestedToFlat(value, fullKey));
    } else {
      flat[fullKey] = value;
    }
  });
  
  return flat;
}

/**
 * Validate a configuration field value
 */
export function validateConfigurationField(field: BaseConfigField, value: any): { valid: boolean; error?: string } {
  // Skip validation for readonly fields
  if (field.readonly) {
    return { valid: true };
  }

  // Check required fields
  if (field.required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: `${field.label} is required` };
  }

  // Skip validation if field is not required and empty
  if (!field.required && (value === undefined || value === null || value === '')) {
    return { valid: true };
  }

  // Type-specific validation
  switch (field.type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return { valid: false, error: 'Please enter a valid email address' };
      }
      break;

    case 'url':
      try {
        new URL(value);
      } catch {
        return { valid: false, error: 'Please enter a valid URL' };
      }
      break;

    case 'number':
      if (isNaN(Number(value))) {
        return { valid: false, error: 'Please enter a valid number' };
      }
      break;

    case 'select':
      if (field.options && !field.options.some(opt => opt.value === value)) {
        return { valid: false, error: 'Please select a valid option' };
      }
      break;

    case 'checkbox':
      // Checkbox values should be boolean
      if (typeof value !== 'boolean') {
        return { valid: false, error: 'Invalid checkbox value' };
      }
      break;

    case 'password':
    case 'text':
    case 'textarea':
      // Basic text validation - could be enhanced with min/max length if needed
      if (typeof value !== 'string') {
        return { valid: false, error: 'Please enter valid text' };
      }
      break;

    default:
      // Unknown field type, assume valid
      break;
  }

  return { valid: true };
}

// Export all schemas for use in components
export {
  oidcSchema,
  oauth2Schema,
  samlSchema,
  customSchema
};
