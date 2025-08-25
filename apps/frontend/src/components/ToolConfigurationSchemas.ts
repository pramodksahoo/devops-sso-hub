// Dynamic tool configuration schemas for different integration types
export interface BaseConfigField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'textarea' | 'select' | 'checkbox';
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

// Tool-specific schema overrides
export const toolSpecificSchemas: Record<string, Partial<ToolConfigSchema>> = {
  'grafana': {
    fields: [
      {
        name: 'enabled',
        label: 'Enable OAuth Integration',
        type: 'checkbox',
        required: false,
        description: 'Enable OAuth2 authentication for Grafana'
      },
      {
        name: 'grafana_url',
        label: 'Grafana URL (Root URL)',
        type: 'url',
        required: true,
        placeholder: 'http://localhost:3100',
        description: 'The base URL of your Grafana instance'
      },
      {
        name: 'client_id',
        label: 'OAuth Client ID',
        type: 'text',
        required: true,
        placeholder: 'grafana-client-oauth2 (auto-generated)',
        description: 'System-generated OAuth Client ID. Uses pattern: {tool-name}-client-{protocol}',
        sensitive: false,
        readonly: true
      },
      {
        name: 'client_secret',
        label: 'OAuth Client Secret',
        type: 'password',
        required: true,
        placeholder: 'Enter your Client Secret',
        description: 'OAuth Client Secret from Keycloak',
        sensitive: true
      },
      {
        name: 'client_protocol',
        label: 'Client Protocol',
        type: 'select',
        required: false,
        options: [
          { label: 'openid-connect', value: 'openid-connect' },
          { label: 'saml', value: 'saml' }
        ],
        description: 'OAuth protocol type (usually openid-connect)'
      },
      {
        name: 'access_type',
        label: 'Access Type',
        type: 'select',
        required: false,
        options: [
          { label: 'confidential', value: 'confidential' },
          { label: 'public', value: 'public' }
        ],
        description: 'OAuth access type (confidential for server-side apps)'
      },
      {
        name: 'standard_flow_enabled',
        label: 'Standard Flow Enabled',
        type: 'checkbox',
        required: false,
        description: 'Enable OAuth2 Authorization Code flow'
      },
      {
        name: 'implicit_flow_enabled',
        label: 'Implicit Flow Enabled',
        type: 'checkbox',
        required: false,
        description: 'Enable OAuth2 Implicit flow (not recommended)'
      },
      {
        name: 'direct_access_grants_enabled',
        label: 'Direct Access Grants Enabled',
        type: 'checkbox',
        required: false,
        description: 'Enable Resource Owner Password Credentials flow'
      },
      {
        name: 'auth_url',
        label: 'Authorization URL (Auto-generated)',
        type: 'url',
        required: false,
        placeholder: 'http://localhost:8080/realms/sso-hub/protocol/openid-connect/auth',
        description: 'Keycloak OAuth authorization endpoint URL (auto-generated from system settings)'
      },
      {
        name: 'token_url',
        label: 'Token URL (Auto-generated)',
        type: 'url',
        required: false,
        placeholder: 'http://localhost:8080/realms/sso-hub/protocol/openid-connect/token',
        description: 'Keycloak OAuth token endpoint URL (auto-generated from system settings)'
      },
      {
        name: 'api_url',
        label: 'API URL - User Info (Auto-generated)',
        type: 'url',
        required: false,
        placeholder: 'http://localhost:8080/realms/sso-hub/protocol/openid-connect/userinfo',
        description: 'Keycloak OAuth userinfo API endpoint URL (auto-generated from system settings)'
      },
      {
        name: 'redirect_uri',
        label: 'Valid Redirect URIs',
        type: 'text',
        required: true,
        placeholder: 'http://localhost:3100/login/generic_oauth',
        description: 'The callback URL to be registered in Keycloak (must match Grafana OAuth callback)'
      },
      {
        name: 'web_origins',
        label: 'Web Origins',
        type: 'text',
        required: false,
        placeholder: 'http://localhost:3100',
        description: 'Allowed web origins for CORS (usually the Grafana URL)'
      },
      {
        name: 'admin_url',
        label: 'Admin URL',
        type: 'url',
        required: false,
        placeholder: 'http://localhost:3100',
        description: 'Admin URL for the client (usually the Grafana base URL)'
      },
      {
        name: 'base_url',
        label: 'Base URL',
        type: 'url',
        required: false,
        placeholder: 'http://localhost:3100',
        description: 'Base URL for the client (usually the Grafana base URL)'
      },
      {
        name: 'scopes',
        label: 'OAuth Scopes (email, offline_access, profile, roles)',
        type: 'text',
        required: true,
        placeholder: 'openid email profile offline_access roles',
        description: 'Space-separated list of OAuth scopes to request'
      },
      {
        name: 'use_refresh_token',
        label: 'Use Refresh Token',
        type: 'checkbox',
        required: false,
        description: 'Enable refresh token to maintain user sessions'
      },
      {
        name: 'allow_sign_up',
        label: 'Allow Sign Up',
        type: 'checkbox',
        required: false,
        description: 'Allow new users to sign up through OAuth (creates Grafana user on first login)'
      },
      {
        name: 'signout_redirect_url',
        label: 'Sign Out Redirect URL',
        type: 'url',
        required: false,
        placeholder: 'http://localhost:8080/realms/sso-hub/protocol/openid-connect/logout',
        description: 'URL to redirect after logout (for single logout support)'
      }
    ],
    setup_instructions: [
      'Configure OAuth in Grafana configuration file (grafana.ini or via environment variables)',
      'Set [auth.generic_oauth] enabled = true and configure all OAuth settings',
      'OAuth client will be automatically created in Keycloak with ID: grafana-client-oauth2',
      'Set Valid Redirect URIs in Keycloak to: http://localhost:3100/login/generic_oauth',
      'The Client ID is automatically generated using pattern: {tool-name}-client-{protocol}',
      'Click "Auto-populate from Keycloak" to fill most fields automatically',
      'Manually enter the Redirect URI: http://localhost:3100/login/generic_oauth',
      'Test the connection using the Test Connection button',
      'Save the configuration - this will sync to both database and Keycloak',
      'Verify user login through SSO and role assignments'
    ]
  },
  'jenkins': {
    fields: [
      ...oidcSchema.fields,
      {
        name: 'auto_provision_users',
        label: 'Auto-provision Users',
        type: 'checkbox',
        required: false,
        description: 'Automatically create Jenkins users on first login'
      },
      {
        name: 'role_mapping',
        label: 'Role Mapping',
        type: 'textarea',
        required: false,
        placeholder: '{\n  "admin": "jenkins-admin",\n  "developer": "jenkins-user"\n}',
        description: 'JSON mapping of SSO roles to Jenkins permissions'
      }
    ],
    setup_instructions: [
      'Install the OIDC plugin in Jenkins',
      'Configure OIDC settings in Manage Jenkins > Configure Global Security',
      'Set up role-based authorization strategy',
      'Configure user provisioning and role mapping',
      'Test authentication and job access permissions'
    ]
  },
  'gitlab': {
    fields: [
      ...oidcSchema.fields,
      {
        name: 'group_mapping',
        label: 'Group Mapping',
        type: 'textarea',
        required: false,
        placeholder: '{\n  "developers": "Developer",\n  "admins": "Owner"\n}',
        description: 'JSON mapping of SSO groups to GitLab access levels'
      }
    ]
  },
  'github': {
    fields: [
      ...oauth2Schema.fields.filter(f => f.name !== 'grant_type'),
      {
        name: 'organization',
        label: 'GitHub Organization',
        type: 'text',
        required: false,
        placeholder: 'your-org',
        description: 'Restrict access to specific GitHub organization'
      }
    ]
  },
  'sonarqube': {
    fields: [
      ...oidcSchema.fields,
      {
        name: 'force_authentication',
        label: 'Force Authentication',
        type: 'checkbox',
        required: false,
        description: 'Force users to authenticate via SSO (disable local login)'
      }
    ]
  }
};

// Main schema registry
export const configurationSchemas: Record<string, ToolConfigSchema> = {
  'oidc': oidcSchema,
  'oauth2': oauth2Schema,
  'saml': samlSchema,
  'custom': customSchema
};

// Helper function to get schema for a specific tool
export function getToolConfigurationSchema(toolSlug: string, integrationType: string): ToolConfigSchema {
  const baseSchema = configurationSchemas[integrationType] || customSchema;
  const toolOverrides = toolSpecificSchemas[toolSlug];
  
  if (toolOverrides) {
    return {
      ...baseSchema,
      ...toolOverrides,
      fields: toolOverrides.fields || baseSchema.fields,
      setup_instructions: toolOverrides.setup_instructions || baseSchema.setup_instructions
    };
  }
  
  return baseSchema;
}

// Helper function to determine integration type from tool slug
export function getDefaultIntegrationType(toolSlug: string): string {
  const toolIntegrationTypes: Record<string, string> = {
    'github': 'oauth2',
    'gitlab': 'oidc',
    'jenkins': 'oidc',
    'grafana': 'oauth2',  // Grafana uses OAuth2 with generic_oauth provider
    'sonarqube': 'oidc',
    'argocd': 'oidc',
    'prometheus': 'custom',
    'kibana': 'saml',
    'snyk': 'oidc',
    'jira': 'saml',
    'servicenow': 'saml',
    'terraform': 'saml'
  };
  
  return toolIntegrationTypes[toolSlug] || 'custom';
}

// Helper function to validate configuration fields
export function validateConfigurationField(field: BaseConfigField, value: string): { valid: boolean; error?: string } {
  if (field.required && (!value || value.trim() === '')) {
    return { valid: false, error: `${field.label} is required` };
  }
  
  if (field.validation?.pattern && value) {
    const regex = new RegExp(field.validation.pattern);
    if (!regex.test(value)) {
      return { valid: false, error: `${field.label} format is invalid` };
    }
  }
  
  if (field.validation?.minLength && value && value.length < field.validation.minLength) {
    return { valid: false, error: `${field.label} must be at least ${field.validation.minLength} characters` };
  }
  
  if (field.validation?.maxLength && value && value.length > field.validation.maxLength) {
    return { valid: false, error: `${field.label} must be no more than ${field.validation.maxLength} characters` };
  }
  
  return { valid: true };
}