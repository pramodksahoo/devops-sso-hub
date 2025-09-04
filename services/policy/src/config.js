/**
 * Policy Service Configuration
 * Centralized configuration for policy engine, compliance rules, and governance
 */

const config = {
  // Server Configuration
  HOST: process.env.POLICY_HOST || '0.0.0.0',
  PORT: process.env.POLICY_PORT || 3013,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://sso_user:sso_secure_password_123@postgres:5432/sso_hub',
  
  // Redis Configuration for caching
  REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379',
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN === 'true' ? true : (process.env.CORS_ORIGIN || 'http://localhost:3000'),
  
  // Rate Limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 10000, // High limit for policy evaluations
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || '1 minute',
  
  // Policy Engine Configuration
  POLICY_CACHE_TTL_SECONDS: parseInt(process.env.POLICY_CACHE_TTL_SECONDS) || 300, // 5 minutes
  POLICY_EVALUATION_TIMEOUT_MS: parseInt(process.env.POLICY_EVALUATION_TIMEOUT_MS) || 5000, // 5 seconds
  MAX_POLICIES_PER_EVALUATION: parseInt(process.env.MAX_POLICIES_PER_EVALUATION) || 100,
  
  // Performance Configuration
  ENABLE_POLICY_CACHING: process.env.ENABLE_POLICY_CACHING !== 'false',
  CACHE_WARM_UP_ON_START: process.env.CACHE_WARM_UP_ON_START !== 'false',
  PARALLEL_POLICY_EVALUATION: process.env.PARALLEL_POLICY_EVALUATION !== 'false',
  
  // Security Configuration
  REQUIRE_IDENTITY_HEADERS: process.env.REQUIRE_IDENTITY_HEADERS !== 'false',
  IDENTITY_HEADER_SECRET: process.env.IDENTITY_HEADER_SECRET || 'your-hmac-secret-here',
  ENABLE_REQUEST_SIGNING: process.env.ENABLE_REQUEST_SIGNING !== 'false',
  
  // Integration URLs
  AUDIT_SERVICE_URL: process.env.AUDIT_SERVICE_URL || 'http://audit:3009',
  CATALOG_SERVICE_URL: process.env.CATALOG_SERVICE_URL || 'http://catalog:3006',
  AUTH_BFF_URL: process.env.AUTH_BFF_URL || 'http://auth-bff:3002',
  USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://user-service:3003',
  ANALYTICS_SERVICE_URL: process.env.ANALYTICS_SERVICE_URL || 'http://analytics:3010',
  
  // Compliance Configuration
  COMPLIANCE_FRAMEWORKS: {
    'SOX': {
      'name': 'Sarbanes-Oxley Act',
      'description': 'Financial reporting and corporate governance',
      'risk_levels': ['low', 'medium', 'high', 'critical'],
      'default_retention_years': 7
    },
    'GDPR': {
      'name': 'General Data Protection Regulation',
      'description': 'EU data protection and privacy regulation',
      'risk_levels': ['low', 'medium', 'high', 'critical'],
      'default_retention_years': 7
    },
    'HIPAA': {
      'name': 'Health Insurance Portability and Accountability Act',
      'description': 'US healthcare data protection',
      'risk_levels': ['low', 'medium', 'high', 'critical'],
      'default_retention_years': 6
    },
    'PCI-DSS': {
      'name': 'Payment Card Industry Data Security Standard',
      'description': 'Credit card data protection',
      'risk_levels': ['low', 'medium', 'high', 'critical'],
      'default_retention_years': 3
    },
    'SOC2': {
      'name': 'Service Organization Control 2',
      'description': 'Security, availability, processing integrity, confidentiality, privacy',
      'risk_levels': ['low', 'medium', 'high', 'critical'],
      'default_retention_years': 3
    },
    'ISO27001': {
      'name': 'Information Security Management',
      'description': 'International standard for information security',
      'risk_levels': ['low', 'medium', 'high', 'critical'],
      'default_retention_years': 3
    }
  },
  
  // Tool-specific Policy Configuration
  TOOL_CONFIGURATIONS: {
    'github': {
      'resource_types': ['repository', 'organization', 'team', 'branch', 'pull_request', 'issue'],
      'actions': ['read', 'write', 'admin', 'push', 'pull', 'merge', 'create', 'delete'],
      'roles': ['viewer', 'contributor', 'developer', 'maintainer', 'admin'],
      'scopes': ['repository', 'organization', 'team']
    },
    'gitlab': {
      'resource_types': ['project', 'group', 'namespace', 'branch', 'merge_request', 'issue'],
      'actions': ['read', 'write', 'admin', 'push', 'pull', 'merge', 'create', 'delete'],
      'roles': ['guest', 'reporter', 'developer', 'maintainer', 'owner'],
      'scopes': ['project', 'group', 'namespace']
    },
    'jenkins': {
      'resource_types': ['job', 'folder', 'view', 'node', 'pipeline'],
      'actions': ['read', 'build', 'configure', 'delete', 'cancel', 'replay'],
      'roles': ['viewer', 'developer', 'admin'],
      'scopes': ['global', 'folder', 'job']
    },
    'argocd': {
      'resource_types': ['application', 'project', 'cluster', 'repository'],
      'actions': ['get', 'create', 'update', 'delete', 'sync', 'rollback'],
      'roles': ['readonly', 'developer', 'admin'],
      'scopes': ['application', 'project', 'cluster']
    },
    'terraform': {
      'resource_types': ['workspace', 'organization', 'team', 'variable', 'state'],
      'actions': ['read', 'plan', 'apply', 'destroy', 'force-unlock'],
      'roles': ['read', 'plan', 'write', 'admin'],
      'scopes': ['workspace', 'organization']
    },
    'sonarqube': {
      'resource_types': ['project', 'component', 'issue', 'rule', 'quality_gate'],
      'actions': ['browse', 'scan', 'administer', 'execute_analysis'],
      'roles': ['user', 'codeviewer', 'issueadmin', 'admin'],
      'scopes': ['global', 'project']
    },
    'grafana': {
      'resource_types': ['dashboard', 'folder', 'datasource', 'alert', 'team'],
      'actions': ['read', 'edit', 'admin'],
      'roles': ['viewer', 'editor', 'admin'],
      'scopes': ['global', 'folder', 'dashboard']
    },
    'prometheus': {
      'resource_types': ['metric', 'rule', 'target', 'alertmanager'],
      'actions': ['query', 'admin'],
      'roles': ['viewer', 'admin'],
      'scopes': ['global']
    },
    'kibana': {
      'resource_types': ['index', 'dashboard', 'visualization', 'search', 'space'],
      'actions': ['read', 'write', 'manage'],
      'roles': ['kibana_user', 'kibana_admin'],
      'scopes': ['space', 'global']
    },
    'snyk': {
      'resource_types': ['project', 'organization', 'integration', 'issue'],
      'actions': ['view', 'test', 'monitor', 'admin'],
      'roles': ['collaborator', 'admin'],
      'scopes': ['project', 'organization']
    },
    'jira': {
      'resource_types': ['project', 'issue', 'board', 'filter', 'dashboard'],
      'actions': ['browse', 'create', 'edit', 'delete', 'assign', 'resolve'],
      'roles': ['user', 'developer', 'admin'],
      'scopes': ['project', 'global']
    }
  },
  
  // Policy Decision Points (PDP) Configuration
  PDP_CONFIG: {
    'default_decision': 'deny', // 'allow' or 'deny'
    'evaluation_mode': 'first_match', // 'first_match', 'combining_algorithm'
    'combining_algorithm': 'deny_overrides', // 'permit_overrides', 'deny_overrides', 'first_applicable'
    'enable_obligations': true,
    'enable_advice': true
  },
  
  // Policy Information Points (PIP) Configuration
  PIP_CONFIG: {
    'user_attribute_sources': ['keycloak', 'ldap', 'database'],
    'resource_attribute_sources': ['tool_api', 'catalog', 'database'],
    'environment_attribute_sources': ['request_context', 'system']
  },
  
  // Audit and Logging Configuration
  AUDIT_CONFIG: {
    'log_all_decisions': true,
    'log_policy_evaluations': true,
    'log_rule_matches': true,
    'log_cache_operations': false,
    'retention_days': 90
  },
  
  // Notification Configuration
  NOTIFICATION_CONFIG: {
    'enable_policy_violations': true,
    'enable_compliance_alerts': true,
    'webhook_endpoints': [],
    'email_notifications': false
  },
  
  // Development and Testing
  DEVELOPMENT_MODE: process.env.NODE_ENV === 'development',
  ENABLE_POLICY_TESTING: process.env.ENABLE_POLICY_TESTING === 'true',
  MOCK_EXTERNAL_SERVICES: process.env.MOCK_EXTERNAL_SERVICES === 'true'
};

module.exports = config;
