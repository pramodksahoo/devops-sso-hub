const { z } = require('zod');

// Common schema elements
const infisicalSecretRef = z.string().regex(/^infisical:\/\//, 'Must be an Infisical secret reference (infisical://...)');
const urlSchema = z.string().url('Must be a valid URL');
const clientCredentialsSchema = z.object({
  client_id: z.string().min(1, 'Client ID is required'),
  client_secret: z.string().optional().default('') // Can be auto-populated or provided by user
});

// GitHub Integration Schema
const githubSchema = z.object({
  // OAuth App Configuration
  oauth_app: clientCredentialsSchema,
  
  // GitHub Organization
  organization: z.string().min(1, 'Organization name is required'),
  
  // GitHub App Configuration (for enhanced integration)
  github_app: z.object({
    app_id: z.string().min(1, 'GitHub App ID is required'),
    installation_id: z.string().min(1, 'Installation ID is required'),
    private_key: infisicalSecretRef,
    webhook_secret: infisicalSecretRef
  }).optional(),
  
  // SCIM Provisioning
  scim: z.object({
    enabled: z.boolean().default(false),
    token: infisicalSecretRef.optional(),
    base_url: z.string().url().optional()
  }).optional(),
  
  // Webhook Configuration
  webhook: z.object({
    enabled: z.boolean().default(true),
    secret: infisicalSecretRef,
    events: z.array(z.enum([
      'push', 'pull_request', 'issues', 'repository', 
      'organization', 'membership', 'team'
    ])).default(['push', 'pull_request'])
  }).optional(),
  
  // Keycloak Integration
  keycloak: z.object({
    realm: z.string().default('sso-hub'),
    client_registration: z.boolean().default(true),
    role_mapping: z.record(z.array(z.string())).optional()
  }),
  
  // Additional Settings
  base_url: urlSchema.default('https://github.com'),
  api_url: urlSchema.default('https://api.github.com')
});

// GitLab Integration Schema
const gitlabSchema = z.object({
  // OIDC Configuration
  oidc: clientCredentialsSchema,
  
  // GitLab Instance
  instance_url: urlSchema,
  
  // Admin API Access
  admin_token: infisicalSecretRef,
  
  // Group Provisioning
  group_provisioning: z.object({
    enabled: z.boolean().default(true),
    default_visibility: z.enum(['private', 'internal', 'public']).default('private'),
    parent_group_id: z.string().optional()
  }).optional(),
  
  // Webhook Configuration
  webhook: z.object({
    enabled: z.boolean().default(true),
    secret: infisicalSecretRef,
    events: z.array(z.enum([
      'push', 'merge_requests', 'issues', 'pipeline', 
      'deployment', 'release', 'wiki'
    ])).default(['push', 'merge_requests'])
  }).optional(),
  
  // Keycloak Integration
  keycloak: z.object({
    realm: z.string().default('sso-hub'),
    client_registration: z.boolean().default(true),
    role_mapping: z.record(z.array(z.string())).optional()
  })
});

// Jenkins Integration Schema
const jenkinsSchema = z.object({
  // OIDC Plugin Configuration
  oidc: z.object({
    issuer: urlSchema,
    client_id: z.string().min(1),
    client_secret: infisicalSecretRef,
    scopes: z.array(z.string()).default(['openid', 'profile', 'email']),
    auto_discovery: z.boolean().default(true)
  }),
  
  // Jenkins Instance
  jenkins_url: urlSchema,
  
  // API Access
  api_token: infisicalSecretRef,
  api_user: z.string().min(1, 'API username is required'),
  
  // Job Configuration
  job_provisioning: z.object({
    enabled: z.boolean().default(true),
    folder_structure: z.enum(['flat', 'organization', 'team']).default('organization'),
    default_permissions: z.record(z.array(z.string())).optional()
  }).optional(),
  
  // Webhook Configuration
  webhook: z.object({
    enabled: z.boolean().default(true),
    secret: infisicalSecretRef.optional(),
    events: z.array(z.enum([
      'build_started', 'build_completed', 'build_failed', 
      'job_created', 'job_deleted'
    ])).default(['build_completed'])
  }).optional(),
  
  // Keycloak Integration
  keycloak: z.object({
    realm: z.string().default('sso-hub'),
    client_registration: z.boolean().default(true),
    role_mapping: z.record(z.array(z.string())).optional()
  })
});

// Argo CD Integration Schema
const argocdSchema = z.object({
  // OIDC Configuration
  oidc: z.object({
    issuer: urlSchema,
    client_id: z.string().min(1),
    client_secret: infisicalSecretRef,
    scopes: z.array(z.string()).default(['openid', 'profile', 'email', 'groups']),
    claims: z.object({
      username: z.string().default('preferred_username'),
      email: z.string().default('email'),
      groups: z.string().default('groups')
    }).optional()
  }),
  
  // Argo CD Instance
  argocd_url: urlSchema,
  
  // Admin Access
  admin_credentials: z.object({
    username: z.string().default('admin'),
    password: infisicalSecretRef
  }),
  
  // RBAC Configuration
  rbac: z.object({
    policy_csv: z.string().optional(),
    scopes: z.array(z.string()).default(['[groups]']),
    default_role: z.string().default('role:readonly')
  }).optional(),
  
  // Application Management
  app_management: z.object({
    enabled: z.boolean().default(true),
    default_project: z.string().default('default'),
    sync_policy: z.enum(['manual', 'automatic']).default('manual')
  }).optional(),
  
  // Webhook Configuration
  webhook: z.object({
    enabled: z.boolean().default(true),
    events: z.array(z.enum([
      'app_sync', 'app_health', 'app_degraded', 'app_deployed'
    ])).default(['app_sync', 'app_health'])
  }).optional(),
  
  // Keycloak Integration
  keycloak: z.object({
    realm: z.string().default('sso-hub'),
    client_registration: z.boolean().default(true),
    role_mapping: z.record(z.array(z.string())).optional()
  })
});

// Terraform Cloud/Enterprise Integration Schema
const terraformSchema = z.object({
  // SAML/OIDC Configuration
  sso_type: z.enum(['saml', 'oidc']).default('oidc'),
  
  oidc: z.object({
    issuer: urlSchema,
    client_id: z.string().min(1),
    client_secret: infisicalSecretRef,
    scopes: z.array(z.string()).default(['openid', 'profile', 'email'])
  }).optional(),
  
  saml: z.object({
    sso_url: urlSchema,
    certificate: infisicalSecretRef,
    signature_method: z.enum(['RSA-SHA1', 'RSA-SHA256']).default('RSA-SHA256')
  }).optional(),
  
  // Terraform Instance
  terraform_url: urlSchema.default('https://app.terraform.io'),
  organization: z.string().min(1, 'Organization name is required'),
  
  // API Access
  api_token: infisicalSecretRef,
  
  // Workspace Management
  workspace_management: z.object({
    enabled: z.boolean().default(true),
    naming_pattern: z.string().default('{team}-{environment}'),
    default_terraform_version: z.string().optional(),
    vcs_integration: z.boolean().default(true)
  }).optional(),
  
  // Webhook Configuration
  webhook: z.object({
    enabled: z.boolean().default(true),
    secret: infisicalSecretRef,
    events: z.array(z.enum([
      'run_completed', 'run_errored', 'workspace_created',
      'workspace_deleted', 'policy_check'
    ])).default(['run_completed'])
  }).optional(),
  
  // Keycloak Integration
  keycloak: z.object({
    realm: z.string().default('sso-hub'),
    client_registration: z.boolean().default(true),
    role_mapping: z.record(z.array(z.string())).optional()
  })
});

// SonarQube Integration Schema
const sonarqubeSchema = z.object({
  // OIDC Configuration
  oidc: z.object({
    issuer: urlSchema,
    client_id: z.string().min(1),
    client_secret: infisicalSecretRef,
    scopes: z.array(z.string()).default(['openid', 'profile', 'email'])
  }),
  
  // SonarQube Instance
  sonarqube_url: urlSchema,
  
  // Admin Access
  admin_token: infisicalSecretRef,
  
  // Project Provisioning
  project_provisioning: z.object({
    enabled: z.boolean().default(true),
    default_visibility: z.enum(['private', 'public']).default('private'),
    quality_gate: z.string().default('Sonar way'),
    project_key_pattern: z.string().default('{organization}:{repository}')
  }).optional(),
  
  // Quality Gate Webhooks
  webhook: z.object({
    enabled: z.boolean().default(true),
    secret: infisicalSecretRef.optional(),
    events: z.array(z.enum([
      'quality_gate', 'project_analysis', 'new_issues'
    ])).default(['quality_gate'])
  }).optional(),
  
  // Keycloak Integration
  keycloak: z.object({
    realm: z.string().default('sso-hub'),
    client_registration: z.boolean().default(true),
    role_mapping: z.record(z.array(z.string())).optional()
  })
});

// Grafana Integration Schema - Updated per official documentation
const grafanaSchema = z.object({
  // Grafana Instance URL (Required)
  grafana_url: urlSchema,
  
  // Generic OAuth Configuration (Core Requirements)
  oauth: z.object({
    // OAuth2 Provider Endpoints (Required)
    auth_url: urlSchema,
    token_url: urlSchema,
    api_url: urlSchema,
    
    // Client Credentials (client_id required, client_secret can be auto-populated)
    client_id: z.string().min(1, 'Client ID is required'),
    client_secret: z.string().optional().default(''), // Can be auto-populated from Keycloak
    
    // OAuth Settings
    enabled: z.boolean().default(true),
    allow_sign_up: z.boolean().default(true),
    scopes: z.string().default('openid email profile groups'),
    
    // Attribute Mappings
    login_attribute_path: z.string().default('preferred_username'),
    name_attribute_path: z.string().default('name'),
    email_attribute_path: z.string().default('email'),
    role_attribute_path: z.string().default('groups'),
    groups_attribute_path: z.string().default('groups'),
    
    // Team/Organization Mapping
    allowed_organizations: z.string().optional(),
    allowed_groups: z.string().optional(),
    team_ids: z.string().optional(),
    
    // Additional OAuth2 Settings
    use_pkce: z.boolean().default(true),
    use_refresh_token: z.boolean().default(true),
    auto_login: z.boolean().default(false)
  }),
  
  // Admin Access for Configuration
  admin_credentials: z.object({
    username: z.string().default('admin'),
    password: z.string().optional().default('') // Can be provided by user or left empty
  }),
  
  // Organization Management Settings
  org_management: z.object({
    enabled: z.boolean().default(true),
    auto_assign_org: z.boolean().default(true),
    auto_assign_org_id: z.number().default(1),
    auto_assign_org_role: z.enum(['Viewer', 'Editor', 'Admin']).default('Viewer'),
    skip_org_role_update_sync: z.boolean().default(false)
  }).optional(),
  
  // Team Synchronization
  team_sync: z.object({
    enabled: z.boolean().default(false),
    team_ids: z.string().optional(),
    sync_ttl: z.number().default(60)
  }).optional(),
  
  // Security Settings  
  security: z.object({
    tls_skip_verify_insecure: z.boolean().default(false),
    tls_client_cert: z.string().optional(),
    tls_client_key: z.string().optional(),
    tls_client_ca: z.string().optional()
  }).optional(),
  
  // Keycloak Integration Metadata
  keycloak: z.object({
    realm: z.string().default('sso-hub'),
    client_registration: z.boolean().default(true),
    role_mapping: z.record(z.array(z.string())).optional()
  })
});

// Prometheus Integration Schema
const prometheusSchema = z.object({
  // Proxy Configuration (OIDC enforcement via reverse proxy)
  proxy: z.object({
    enabled: z.boolean().default(true),
    upstream_url: urlSchema,
    oidc_issuer: urlSchema,
    client_id: z.string().min(1),
    client_secret: infisicalSecretRef,
    cookie_secret: infisicalSecretRef
  }),
  
  // Prometheus Instance
  prometheus_url: urlSchema,
  
  // Query Permissions
  query_permissions: z.object({
    enabled: z.boolean().default(true),
    role_based_access: z.boolean().default(true),
    query_restrictions: z.record(z.array(z.string())).optional()
  }).optional(),
  
  // AlertManager Integration
  alertmanager: z.object({
    enabled: z.boolean().default(false),
    url: urlSchema.optional(),
    webhook_url: urlSchema.optional()
  }).optional(),
  
  // Configuration Management
  config_management: z.object({
    enabled: z.boolean().default(false),
    config_reload_endpoint: z.string().optional()
  }).optional(),
  
  // Keycloak Integration
  keycloak: z.object({
    realm: z.string().default('sso-hub'),
    client_registration: z.boolean().default(true),
    role_mapping: z.record(z.array(z.string())).optional()
  })
});

// Kibana Integration Schema
const kibanaSchema = z.object({
  // SAML/OIDC Configuration
  sso_type: z.enum(['saml', 'oidc']).default('oidc'),
  
  oidc: z.object({
    issuer: urlSchema,
    client_id: z.string().min(1),
    client_secret: infisicalSecretRef,
    scopes: z.array(z.string()).default(['openid', 'profile', 'email'])
  }).optional(),
  
  saml: z.object({
    idp_entity_id: z.string(),
    idp_sso_url: urlSchema,
    idp_certificate: infisicalSecretRef,
    sp_entity_id: z.string(),
    attribute_mapping: z.object({
      principal: z.string().default('nameid'),
      groups: z.string().default('groups'),
      name: z.string().default('name'),
      email: z.string().default('email')
    }).optional()
  }).optional(),
  
  // Elastic Instance
  elastic_url: urlSchema,
  kibana_url: urlSchema,
  
  // Admin Access
  admin_credentials: z.object({
    username: z.string().default('elastic'),
    password: infisicalSecretRef
  }),
  
  // Index Pattern Management
  index_management: z.object({
    enabled: z.boolean().default(true),
    auto_create_patterns: z.boolean().default(true),
    default_patterns: z.array(z.string()).default(['logs-*', 'metrics-*']),
    role_based_access: z.boolean().default(true)
  }).optional(),
  
  // Space Management
  space_management: z.object({
    enabled: z.boolean().default(true),
    team_spaces: z.boolean().default(true),
    default_space: z.string().default('default')
  }).optional(),
  
  // Keycloak Integration
  keycloak: z.object({
    realm: z.string().default('sso-hub'),
    client_registration: z.boolean().default(true),
    role_mapping: z.record(z.array(z.string())).optional()
  })
});

// Snyk Integration Schema
const snykSchema = z.object({
  // OIDC Configuration
  oidc: z.object({
    issuer: urlSchema,
    client_id: z.string().min(1),
    client_secret: infisicalSecretRef,
    scopes: z.array(z.string()).default(['openid', 'profile', 'email'])
  }),
  
  // Snyk Organization
  organization_slug: z.string().min(1, 'Organization slug is required'),
  
  // API Access
  auth_token: infisicalSecretRef,
  
  // Project Provisioning
  project_provisioning: z.object({
    enabled: z.boolean().default(true),
    auto_import: z.boolean().default(true),
    default_settings: z.object({
      test_frequency: z.enum(['daily', 'weekly']).default('weekly'),
      severity_threshold: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
    }).optional()
  }).optional(),
  
  // Webhook Configuration
  webhook: z.object({
    enabled: z.boolean().default(true),
    secret: infisicalSecretRef,
    events: z.array(z.enum([
      'project_snapshot', 'new_issues', 'issue_remediation'
    ])).default(['new_issues'])
  }).optional(),
  
  // Integration URLs
  base_url: urlSchema.default('https://snyk.io'),
  api_url: urlSchema.default('https://api.snyk.io'),
  
  // Keycloak Integration
  keycloak: z.object({
    realm: z.string().default('sso-hub'),
    client_registration: z.boolean().default(true),
    role_mapping: z.record(z.array(z.string())).optional()
  })
});

// Jira Integration Schema
const jiraSchema = z.object({
  // SAML/OIDC Configuration
  sso_type: z.enum(['saml', 'oidc']).default('saml'),
  
  oidc: z.object({
    issuer: urlSchema,
    client_id: z.string().min(1),
    client_secret: infisicalSecretRef,
    scopes: z.array(z.string()).default(['openid', 'profile', 'email'])
  }).optional(),
  
  saml: z.object({
    entity_id: z.string(),
    sso_url: urlSchema,
    certificate: infisicalSecretRef,
    attribute_mapping: z.object({
      user_id: z.string().default('NameID'),
      email: z.string().default('EmailAddress'),
      display_name: z.string().default('DisplayName'),
      groups: z.string().default('Groups')
    }).optional()
  }).optional(),
  
  // Jira Instance
  jira_url: urlSchema,
  
  // Admin Access
  admin_credentials: z.object({
    email: z.string().email(),
    api_token: infisicalSecretRef
  }),
  
  // Project Management
  project_management: z.object({
    enabled: z.boolean().default(true),
    default_project_type: z.enum(['software', 'business']).default('software'),
    permission_schemes: z.record(z.array(z.string())).optional(),
    auto_create_projects: z.boolean().default(false)
  }).optional(),
  
  // Webhook Configuration
  webhook: z.object({
    enabled: z.boolean().default(true),
    secret: infisicalSecretRef.optional(),
    events: z.array(z.enum([
      'issue_created', 'issue_updated', 'issue_deleted',
      'project_created', 'user_created'
    ])).default(['issue_created', 'issue_updated'])
  }).optional(),
  
  // Keycloak Integration
  keycloak: z.object({
    realm: z.string().default('sso-hub'),
    client_registration: z.boolean().default(true),
    role_mapping: z.record(z.array(z.string())).optional()
  })
});

// ServiceNow Integration Schema
const servicenowSchema = z.object({
  // SAML/OIDC Configuration
  sso_type: z.enum(['saml', 'oidc']).default('saml'),
  
  oidc: z.object({
    issuer: urlSchema,
    client_id: z.string().min(1),
    client_secret: infisicalSecretRef,
    scopes: z.array(z.string()).default(['openid', 'profile', 'email'])
  }).optional(),
  
  saml: z.object({
    entity_id: z.string(),
    sso_url: urlSchema,
    certificate: infisicalSecretRef,
    name_id_format: z.string().default('urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'),
    attribute_mapping: z.object({
      user_id: z.string().default('NameID'),
      email: z.string().default('EmailAddress'),
      first_name: z.string().default('FirstName'),
      last_name: z.string().default('LastName'),
      roles: z.string().default('Roles')
    }).optional()
  }).optional(),
  
  // ServiceNow Instance
  instance_url: urlSchema,
  
  // Admin Access
  admin_credentials: z.object({
    username: z.string().min(1),
    password: infisicalSecretRef
  }),
  
  // Space/Group Management
  space_management: z.object({
    enabled: z.boolean().default(true),
    default_groups: z.array(z.string()).default(['itil']),
    role_mapping: z.record(z.array(z.string())).optional(),
    auto_provision_users: z.boolean().default(true)
  }).optional(),
  
  // Webhook Configuration
  webhook: z.object({
    enabled: z.boolean().default(true),
    events: z.array(z.enum([
      'incident_created', 'incident_updated', 'change_request',
      'user_created', 'user_updated'
    ])).default(['incident_created'])
  }).optional(),
  
  // Keycloak Integration
  keycloak: z.object({
    realm: z.string().default('sso-hub'),
    client_registration: z.boolean().default(true),
    role_mapping: z.record(z.array(z.string())).optional()
  })
});

// Tool schemas mapping
const toolSchemas = {
  github: githubSchema,
  gitlab: gitlabSchema,
  jenkins: jenkinsSchema,
  argocd: argocdSchema,
  terraform: terraformSchema,
  sonarqube: sonarqubeSchema,
  grafana: grafanaSchema,
  prometheus: prometheusSchema,
  kibana: kibanaSchema,
  snyk: snykSchema,
  jira: jiraSchema,
  servicenow: servicenowSchema
};

// Tool metadata
const toolMetadata = {
  github: {
    name: 'GitHub',
    category: 'Version Control',
    protocol: 'oauth2',
    description: 'GitHub organization integration with OAuth Apps and GitHub Apps'
  },
  gitlab: {
    name: 'GitLab',
    category: 'Version Control',
    protocol: 'oidc',
    description: 'GitLab instance integration with OIDC authentication'
  },
  jenkins: {
    name: 'Jenkins',
    category: 'CI/CD',
    protocol: 'oidc',
    description: 'Jenkins automation server with OIDC plugin'
  },
  argocd: {
    name: 'Argo CD',
    category: 'CI/CD',
    protocol: 'oidc',
    description: 'GitOps continuous delivery tool for Kubernetes'
  },
  terraform: {
    name: 'Terraform Cloud/Enterprise',
    category: 'Infrastructure',
    protocol: 'oidc',
    description: 'Infrastructure as Code platform with SAML/OIDC'
  },
  sonarqube: {
    name: 'SonarQube',
    category: 'Code Quality',
    protocol: 'oidc',
    description: 'Code quality and security analysis platform'
  },
  grafana: {
    name: 'Grafana',
    category: 'Monitoring',
    protocol: 'oauth2',
    description: 'Observability and monitoring platform'
  },
  prometheus: {
    name: 'Prometheus',
    category: 'Monitoring',
    protocol: 'oidc',
    description: 'Metrics collection and alerting system'
  },
  kibana: {
    name: 'Kibana',
    category: 'Monitoring',
    protocol: 'oidc',
    description: 'Elasticsearch data visualization and exploration'
  },
  snyk: {
    name: 'Snyk',
    category: 'Security',
    protocol: 'oidc',
    description: 'Developer security platform for vulnerability scanning'
  },
  jira: {
    name: 'Jira',
    category: 'Project Management',
    protocol: 'saml',
    description: 'Issue tracking and project management'
  },
  servicenow: {
    name: 'ServiceNow',
    category: 'Service Management',
    protocol: 'saml',
    description: 'IT service management and workflow automation'
  }
};

module.exports = {
  getSchema: (toolType) => {
    const schema = toolSchemas[toolType];
    if (!schema) {
      throw new Error(`Unsupported tool type: ${toolType}`);
    }
    return schema;
  },
  
  getMetadata: (toolType) => {
    const metadata = toolMetadata[toolType];
    if (!metadata) {
      throw new Error(`Unsupported tool type: ${toolType}`);
    }
    return metadata;
  },
  
  getAllMetadata: () => toolMetadata,
  
  getSupportedTools: () => Object.keys(toolSchemas),
  
  validateConfig: (toolType, config) => {
    const schema = toolSchemas[toolType];
    if (!schema) {
      throw new Error(`Unsupported tool type: ${toolType}`);
    }
    return schema.parse(config);
  }
};
