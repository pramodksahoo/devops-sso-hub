/**
 * Tool Configuration Defaults
 * 
 * This module provides default configurations for each tool type and integration type
 * combination, ensuring that all required schema objects are properly populated.
 */

const { config } = require('../config/environment');

/**
 * Generate default OAuth2 configuration for tools
 */
const getOAuth2Defaults = (toolType, baseUrl) => ({
  enabled: true,
  client_id: `${toolType}-client-oauth2`,
  client_secret: '', // Will be populated from user input
  auth_url: `${config.keycloak.base_url}/realms/${config.keycloak.realm}/protocol/openid-connect/auth`,
  token_url: `${config.keycloak.base_url}/realms/${config.keycloak.realm}/protocol/openid-connect/token`,
  api_url: `${config.keycloak.base_url}/realms/${config.keycloak.realm}/protocol/openid-connect/userinfo`,
  scopes: 'openid email profile offline_access roles',
  use_pkce: false, // Grafana compatibility
  use_refresh_token: true,
  allow_sign_up: true,
  auto_login: false,
  
  // Attribute mappings
  login_attribute_path: 'preferred_username',
  name_attribute_path: 'name',
  email_attribute_path: 'email',
  role_attribute_path: 'groups',
  groups_attribute_path: 'groups'
});

/**
 * Generate default OIDC configuration for tools
 */
const getOIDCDefaults = (toolType, baseUrl) => ({
  enabled: true,
  client_id: `${toolType}-client-oidc`,
  client_secret: '', // Will be populated from user input
  discovery_url: `${config.keycloak.base_url}/realms/${config.keycloak.realm}/.well-known/openid_configuration`,
  scopes: 'openid email profile offline_access roles',
  use_pkce: true,
  use_refresh_token: true,
  
  // Optional endpoints (auto-discovered)
  auth_url: `${config.keycloak.base_url}/realms/${config.keycloak.realm}/protocol/openid-connect/auth`,
  token_url: `${config.keycloak.base_url}/realms/${config.keycloak.realm}/protocol/openid-connect/token`,
  userinfo_url: `${config.keycloak.base_url}/realms/${config.keycloak.realm}/protocol/openid-connect/userinfo`
});

/**
 * Generate default SAML configuration for tools
 */
const getSAMLDefaults = (toolType, baseUrl) => ({
  enabled: true,
  sp_entity_id: `${config.frontend.base_url}/saml/${toolType}/metadata`,
  idp_entity_id: `${config.keycloak.base_url}/realms/${config.keycloak.realm}`,
  idp_sso_url: `${config.keycloak.base_url}/realms/${config.keycloak.realm}/protocol/saml`,
  idp_slo_url: `${config.keycloak.base_url}/realms/${config.keycloak.realm}/protocol/saml`,
  name_id_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  x509_cert: '', // Will be populated from user input
  attribute_mapping: {
    email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
    groups: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/groups'
  }
});

/**
 * Default admin credentials based on tool type
 */
const getAdminCredentialsDefaults = (toolType) => {
  const defaults = {
    username: 'admin',
    password: '' // Will be populated from user input or environment
  };

  // Tool-specific admin credential defaults
  switch (toolType) {
    case 'grafana':
      defaults.username = 'admin';
      break;
    case 'jenkins':
      defaults.username = 'admin';
      break;
    case 'argocd':
      defaults.username = 'admin';
      break;
    case 'sonarqube':
      defaults.username = 'admin';
      break;
    default:
      defaults.username = 'admin';
  }

  return defaults;
};

/**
 * Default Keycloak integration settings with client configuration fields
 */
const getKeycloakDefaults = (toolType, baseUrl = 'http://localhost:8080') => {
  const toolPorts = {
    grafana: 3100,
    jenkins: 8080,
    argocd: 8080,
    gitlab: 80,
    sonarqube: 9000,
    prometheus: 9090,
    kibana: 5601,
    terraform: 443,
    snyk: 443,
    jira: 443,
    servicenow: 443
  };

  const defaultPort = toolPorts[toolType] || 8080;
  const defaultBaseUrl = baseUrl || `http://localhost:${defaultPort}`;
  
  // Tool-specific redirect URIs
  const getRedirectUris = (toolType, baseUrl) => {
    const uris = [];
    switch (toolType) {
      case 'grafana':
        uris.push(`${baseUrl}/login/generic_oauth`);
        uris.push(`${baseUrl}/auth/callback`);
        break;
      case 'jenkins':
        uris.push(`${baseUrl}/securityRealm/finishLogin`);
        uris.push(`${baseUrl}/auth/callback`);
        break;
      case 'argocd':
        uris.push(`${baseUrl}/auth/callback`);
        uris.push(`${baseUrl}/api/dex/callback`);
        break;
      case 'gitlab':
        uris.push(`${baseUrl}/-/users/auth/openid_connect/callback`);
        break;
      case 'sonarqube':
        uris.push(`${baseUrl}/oauth2/callback/oidc`);
        break;
      default:
        uris.push(`${baseUrl}/auth/callback`);
    }
    return uris;
  };

  return {
    realm: config.keycloak.realm || 'sso-hub',
    client_registration: true,
    enabled: true,
    role_mapping: {
      admin: ['admin', 'superuser'],
      user: ['user', 'viewer'],
      developer: ['developer', 'editor']
    },
    // New Keycloak client configuration fields
    root_url: defaultBaseUrl,
    home_url: defaultBaseUrl,
    redirect_uris: getRedirectUris(toolType, defaultBaseUrl),
    web_origins: [defaultBaseUrl],
    // Additional client settings
    protocol: 'openid-connect',
    public_client: false,
    standard_flow_enabled: true,
    implicit_flow_enabled: false,
    direct_access_grants_enabled: true,
    service_accounts_enabled: false
  };
};

/**
 * Tool-specific configuration defaults
 */
const toolDefaults = {
  grafana: {
    oauth2: (baseUrl = 'http://localhost:3100') => ({
      grafana_url: baseUrl,
      oauth: getOAuth2Defaults('grafana', baseUrl),
      admin_credentials: getAdminCredentialsDefaults('grafana'),
      org_management: {
        enabled: true,
        auto_assign_org: true,
        auto_assign_org_id: 1,
        auto_assign_org_role: 'Viewer',
        skip_org_role_update_sync: false
      },
      team_sync: {
        enabled: false,
        sync_ttl: 60
      },
      security: {
        tls_skip_verify_insecure: false
      },
      keycloak: getKeycloakDefaults('grafana', baseUrl)
    })
  },
  
  jenkins: {
    oidc: (baseUrl = 'http://localhost:8080') => ({
      jenkins_url: baseUrl,
      client_id: 'jenkins-client-oidc',
      client_secret: '',
      discovery_url: `${config.keycloak.base_url}/realms/${config.keycloak.realm}/.well-known/openid_configuration`,
      scopes: 'openid email profile offline_access roles',
      admin_credentials: getAdminCredentialsDefaults('jenkins'),
      rbac: {
        enabled: true,
        matrix_auth: true,
        role_based_auth: true,
        group_mapping: {
          'jenkins-admin': 'admin',
          'jenkins-user': 'user'
        }
      },
      keycloak: getKeycloakDefaults('jenkins', baseUrl)
    })
  },

  argocd: {
    oidc: (baseUrl = 'http://localhost:8080') => ({
      argocd_url: baseUrl,
      client_id: 'argocd-client-oidc',
      client_secret: '',
      discovery_url: `${config.keycloak.base_url}/realms/${config.keycloak.realm}/.well-known/openid_configuration`,
      scopes: 'openid email profile offline_access roles',
      admin_credentials: getAdminCredentialsDefaults('argocd'),
      rbac: {
        policy_csv: '',
        scopes: ['[groups]'],
        default_role: 'role:readonly'
      },
      app_management: {
        enabled: true,
        default_project: 'default',
        sync_policy: 'manual'
      },
      webhook: {
        enabled: true,
        events: ['app_sync', 'app_health']
      },
      keycloak: getKeycloakDefaults('argocd', baseUrl)
    })
  },

  gitlab: {
    oidc: (baseUrl = 'http://localhost:80') => ({
      gitlab_url: baseUrl,
      client_id: 'gitlab-client-oidc',
      client_secret: '',
      discovery_url: `${config.keycloak.base_url}/realms/${config.keycloak.realm}/.well-known/openid_configuration`,
      scopes: 'openid email profile offline_access roles',
      admin_credentials: getAdminCredentialsDefaults('gitlab'),
      group_sync: {
        enabled: true,
        base_dn: 'ou=groups,dc=company,dc=com',
        filter: '(objectClass=groupOfNames)',
        attributes: {
          cn: 'name',
          member: 'members'
        }
      },
      keycloak: getKeycloakDefaults('gitlab')
    })
  },

  github: {
    oauth2: (baseUrl = 'https://github.com') => ({
      github_url: baseUrl,
      oauth_app: {
        client_id: '',
        client_secret: '',
        callback_url: `${config.frontend.base_url}/auth/github/callback`
      },
      github_app: {
        app_id: '',
        installation_id: '',
        private_key: '',
        webhook_secret: ''
      },
      admin_credentials: getAdminCredentialsDefaults('github'),
      organization: {
        name: '',
        team_mapping: {
          admin: 'admin',
          member: 'user'
        }
      },
      keycloak: getKeycloakDefaults('github')
    })
  },

  terraform: {
    oidc: (baseUrl = 'https://app.terraform.io') => ({
      terraform_url: baseUrl,
      client_id: 'terraform-client-oidc',
      client_secret: '',
      discovery_url: `${config.keycloak.base_url}/realms/${config.keycloak.realm}/.well-known/openid_configuration`,
      scopes: 'openid email profile offline_access roles',
      admin_credentials: getAdminCredentialsDefaults('terraform'),
      workspace: {
        organization: '',
        workspace_access: {
          read: true,
          plan: true,
          write: false,
          admin: false
        }
      },
      keycloak: getKeycloakDefaults('terraform')
    })
  },

  sonarqube: {
    oidc: (baseUrl = 'http://localhost:9000') => ({
      sonarqube_url: baseUrl,
      client_id: 'sonarqube-client-oidc',
      client_secret: '',
      discovery_url: `${config.keycloak.base_url}/realms/${config.keycloak.realm}/.well-known/openid_configuration`,
      scopes: 'openid email profile offline_access roles',
      admin_credentials: getAdminCredentialsDefaults('sonarqube'),
      group_sync: {
        enabled: true,
        default_group: 'sonar-users',
        admin_group: 'sonar-administrators'
      },
      keycloak: getKeycloakDefaults('sonarqube')
    })
  },

  prometheus: {
    oidc: (baseUrl = 'http://localhost:9090') => ({
      prometheus_url: baseUrl,
      client_id: 'prometheus-client-oidc',
      client_secret: '',
      discovery_url: `${config.keycloak.base_url}/realms/${config.keycloak.realm}/.well-known/openid_configuration`,
      scopes: 'openid email profile offline_access roles',
      admin_credentials: getAdminCredentialsDefaults('prometheus'),
      auth_config: {
        basic_auth: false,
        oauth2_proxy: true,
        allowed_groups: ['prometheus-users', 'admin']
      },
      keycloak: getKeycloakDefaults('prometheus')
    })
  },

  kibana: {
    oidc: (baseUrl = 'http://localhost:5601') => ({
      kibana_url: baseUrl,
      elasticsearch_url: 'http://localhost:9200',
      client_id: 'kibana-client-oidc',
      client_secret: '',
      discovery_url: `${config.keycloak.base_url}/realms/${config.keycloak.realm}/.well-known/openid_configuration`,
      scopes: 'openid email profile offline_access roles',
      admin_credentials: getAdminCredentialsDefaults('kibana'),
      role_mapping: {
        'kibana-admin': ['superuser'],
        'kibana-user': ['kibana_user']
      },
      keycloak: getKeycloakDefaults('kibana')
    })
  },

  snyk: {
    oauth2: (baseUrl = 'https://app.snyk.io') => ({
      snyk_url: baseUrl,
      oauth: getOAuth2Defaults('snyk', baseUrl),
      admin_credentials: getAdminCredentialsDefaults('snyk'),
      organization: {
        org_id: '',
        role_mapping: {
          admin: 'org_admin',
          collaborator: 'collaborator'
        }
      },
      keycloak: getKeycloakDefaults('snyk')
    })
  },

  jira: {
    saml: (baseUrl = 'https://company.atlassian.net') => ({
      jira_url: baseUrl,
      saml: getSAMLDefaults('jira', baseUrl),
      admin_credentials: getAdminCredentialsDefaults('jira'),
      project_access: {
        default_role: 'jira-users',
        admin_role: 'jira-administrators',
        group_mapping: {
          'jira-admin': 'jira-administrators',
          'jira-user': 'jira-users'
        }
      },
      keycloak: getKeycloakDefaults('jira')
    })
  },

  servicenow: {
    saml: (baseUrl = 'https://company.service-now.com') => ({
      servicenow_url: baseUrl,
      saml: getSAMLDefaults('servicenow', baseUrl),
      admin_credentials: getAdminCredentialsDefaults('servicenow'),
      user_provisioning: {
        enabled: true,
        default_role: 'snc_read_only',
        admin_role: 'admin',
        group_mapping: {
          'snow-admin': 'admin',
          'snow-user': 'snc_read_only'
        }
      },
      keycloak: getKeycloakDefaults('servicenow')
    })
  }
};

/**
 * Get default configuration for a tool and integration type
 */
function getToolDefaults(toolType, integrationType, baseUrl) {
  console.log(`📋 Getting defaults for ${toolType}:${integrationType} with baseUrl: ${baseUrl}`);
  
  if (!toolDefaults[toolType]) {
    console.warn(`⚠️ No defaults found for tool: ${toolType}, using generic defaults`);
    return {
      [`${toolType}_url`]: baseUrl || `http://localhost:8080`,
      admin_credentials: getAdminCredentialsDefaults(toolType),
      keycloak: getKeycloakDefaults(toolType)
    };
  }

  if (!toolDefaults[toolType][integrationType]) {
    console.warn(`⚠️ No defaults found for ${toolType}:${integrationType}, using first available`);
    const firstAvailable = Object.keys(toolDefaults[toolType])[0];
    if (firstAvailable && typeof toolDefaults[toolType][firstAvailable] === 'function') {
      return toolDefaults[toolType][firstAvailable](baseUrl);
    }
    return {};
  }

  if (typeof toolDefaults[toolType][integrationType] === 'function') {
    return toolDefaults[toolType][integrationType](baseUrl);
  }

  return toolDefaults[toolType][integrationType];
}

/**
 * Merge user configuration with defaults
 */
function mergeWithDefaults(toolType, integrationType, userConfig, baseUrl) {
  const defaults = getToolDefaults(toolType, integrationType, baseUrl);
  
  // Deep merge function
  function deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
        result[key] = source[key];
      }
    }
    
    return result;
  }
  
  console.log(`🔄 Merging user config with defaults for ${toolType}:${integrationType}`);
  console.log(`📋 Defaults:`, JSON.stringify(defaults, null, 2));
  console.log(`👤 User config:`, JSON.stringify(userConfig, null, 2));
  
  const merged = deepMerge(defaults, userConfig);
  console.log(`✅ Merged config:`, JSON.stringify(merged, null, 2));
  
  return merged;
}

module.exports = {
  toolDefaults,
  getToolDefaults,
  mergeWithDefaults,
  getOAuth2Defaults,
  getOIDCDefaults,
  getSAMLDefaults,
  getAdminCredentialsDefaults,
  getKeycloakDefaults
};