/**
 * Environment Configuration Module
 * 
 * Centralized configuration for all environment-dependent values.
 * This replaces hardcoded URLs and makes the application deployable
 * on any domain or IP address.
 */

// Environment variables with fallbacks for development
// These will be replaced by configure-external-access.sh for external deployments
const {
  VITE_APP_TITLE = 'SSO Hub',
  VITE_FRONTEND_URL = 'http://localhost:3000',
  VITE_AUTH_BFF_URL = 'http://localhost:3002',
  VITE_API_BASE_URL = 'http://localhost:3002/api',
  VITE_WS_URL = 'ws://localhost:3002',
  
  // Service URLs (for admin and power users)
  VITE_USER_SERVICE_URL = 'http://localhost:3003',
  VITE_TOOLS_SERVICE_URL = 'http://localhost:3004', 
  VITE_ADMIN_CONFIG_URL = 'http://localhost:3005',
  VITE_CATALOG_URL = 'http://localhost:3006',
  VITE_WEBHOOK_INGRESS_URL = 'http://localhost:3007',
  VITE_AUDIT_URL = 'http://localhost:3009',
  VITE_ANALYTICS_URL = 'http://localhost:3010',
  VITE_PROVISIONING_URL = 'http://localhost:3011',
  VITE_LDAP_SYNC_URL = 'http://localhost:3012',
  VITE_POLICY_URL = 'http://localhost:3013',
  VITE_NOTIFIER_URL = 'http://localhost:3014',
  
  // External URLs
  VITE_KEYCLOAK_URL = 'http://localhost:8080',
  VITE_GRAFANA_URL = 'http://localhost:3100',
  VITE_PROMETHEUS_URL = 'http://localhost:9090',
  
  // Feature flags
  VITE_ENABLE_ANALYTICS = 'true',
  VITE_ENABLE_AUDIT = 'true', 
  VITE_ENABLE_PROVISIONING = 'true',
  VITE_ENABLE_LDAP_SYNC = 'true',
  VITE_ENABLE_WEBHOOKS = 'true',
  
  // Development flags
  VITE_NODE_ENV = 'development',
  VITE_DEBUG_MODE = 'false',
  VITE_MOCK_API = 'false'
} = import.meta.env;

/**
 * Main application configuration
 */
export const config = {
  // App metadata
  app: {
    title: VITE_APP_TITLE,
    version: '1.0.0', // This could come from package.json
    environment: VITE_NODE_ENV,
    debug: VITE_DEBUG_MODE === 'true',
    mockApi: VITE_MOCK_API === 'true'
  },

  // Core URLs
  urls: {
    frontend: VITE_FRONTEND_URL,
    authBff: VITE_AUTH_BFF_URL,
    api: VITE_API_BASE_URL,
    ws: VITE_WS_URL,
    
    // Auth endpoints
    login: `${VITE_AUTH_BFF_URL}/auth/login`,
    logout: `${VITE_AUTH_BFF_URL}/auth/logout`, 
    callback: `${VITE_AUTH_BFF_URL}/auth/callback`,
    session: `${VITE_AUTH_BFF_URL}/auth/session`,
    
    // API endpoints
    tools: `${VITE_API_BASE_URL}/tools`,
    launch: `${VITE_API_BASE_URL}/launch`,
    health: `${VITE_API_BASE_URL}/health`,
    user: `${VITE_API_BASE_URL}/user`,
    admin: `${VITE_API_BASE_URL}/admin`
  },

  // Service URLs (for direct service communication)
  services: {
    user: VITE_USER_SERVICE_URL,
    tools: VITE_TOOLS_SERVICE_URL,
    adminConfig: VITE_ADMIN_CONFIG_URL,
    catalog: VITE_CATALOG_URL,
    webhookIngress: VITE_WEBHOOK_INGRESS_URL,
    audit: VITE_AUDIT_URL,
    analytics: VITE_ANALYTICS_URL,
    provisioning: VITE_PROVISIONING_URL,
    ldapSync: VITE_LDAP_SYNC_URL,
    policy: VITE_POLICY_URL,
    notifier: VITE_NOTIFIER_URL
  },

  // External tool URLs
  external: {
    keycloak: VITE_KEYCLOAK_URL,
    grafana: VITE_GRAFANA_URL,
    prometheus: VITE_PROMETHEUS_URL
  },

  // Feature flags
  features: {
    analytics: VITE_ENABLE_ANALYTICS === 'true',
    audit: VITE_ENABLE_AUDIT === 'true',
    provisioning: VITE_ENABLE_PROVISIONING === 'true',
    ldapSync: VITE_ENABLE_LDAP_SYNC === 'true',
    webhooks: VITE_ENABLE_WEBHOOKS === 'true'
  },

  // API configuration
  api: {
    timeout: 10000, // 10 seconds
    retries: 3,
    retryDelay: 1000 // 1 second
  },

  // WebSocket configuration
  websocket: {
    reconnectInterval: 5000, // 5 seconds
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000 // 30 seconds
  },

  // UI configuration
  ui: {
    theme: {
      default: 'system', // 'light', 'dark', or 'system'
    },
    layout: {
      sidebarCollapsed: false,
      compactMode: false
    },
    refresh: {
      interval: 30000, // 30 seconds for real-time updates
      enabled: true
    }
  }
} as const;

/**
 * Environment-specific configurations
 */
export const environmentConfig = {
  development: {
    logLevel: 'debug',
    showDebugInfo: true,
    enableDevTools: true,
    apiMocking: config.app.mockApi
  },
  production: {
    logLevel: 'error',
    showDebugInfo: false,
    enableDevTools: false,
    apiMocking: false
  },
  test: {
    logLevel: 'silent',
    showDebugInfo: false,
    enableDevTools: false,
    apiMocking: true
  }
} as const;

/**
 * Get environment-specific config
 */
export function getEnvironmentConfig() {
  const env = config.app.environment as keyof typeof environmentConfig;
  return environmentConfig[env] || environmentConfig.development;
}

/**
 * Runtime URL resolver for external deployment compatibility
 * Detects if we're on localhost or external host and constructs URLs accordingly
 */
export const runtimeUrlResolver = {
  /**
   * Get the current host information for dynamic URL construction
   */
  getCurrentHost: (): { protocol: string; hostname: string; isLocalhost: boolean } => {
    if (typeof window === 'undefined') {
      return { protocol: 'http', hostname: 'localhost', isLocalhost: true };
    }
    
    const protocol = window.location.protocol.replace(':', '');
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    return { protocol, hostname, isLocalhost };
  },
  
  /**
   * Resolve service URL at runtime - works for both localhost and external deployments
   */
  resolveServiceUrl: (port: string, envVarValue?: string): string => {
    // If environment variable is provided and not a localhost URL, use it
    if (envVarValue && !envVarValue.includes('localhost') && !envVarValue.includes('127.0.0.1')) {
      return envVarValue;
    }
    
    const { protocol, hostname, isLocalhost } = runtimeUrlResolver.getCurrentHost();
    
    // For localhost development, use environment variables as-is
    if (isLocalhost && envVarValue) {
      return envVarValue;
    }
    
    // For external deployment, construct URL using current host
    return `${protocol}://${hostname}:${port}`;
  },
  
  /**
   * Get all resolved service URLs for current environment
   */
  getResolvedConfig: () => {
    return {
      frontend: runtimeUrlResolver.resolveServiceUrl('3000', config.urls.frontend),
      authBff: runtimeUrlResolver.resolveServiceUrl('3002', config.urls.authBff),
      api: `${runtimeUrlResolver.resolveServiceUrl('3002', config.urls.authBff)}/api`,
      userService: runtimeUrlResolver.resolveServiceUrl('3003', config.services.user),
      toolsService: runtimeUrlResolver.resolveServiceUrl('3004', config.services.tools),
      adminConfig: runtimeUrlResolver.resolveServiceUrl('3005', config.services.adminConfig),
      catalog: runtimeUrlResolver.resolveServiceUrl('3006', config.services.catalog),
      webhookIngress: runtimeUrlResolver.resolveServiceUrl('3007', config.services.webhookIngress),
      audit: runtimeUrlResolver.resolveServiceUrl('3009', config.services.audit),
      analytics: runtimeUrlResolver.resolveServiceUrl('3010', config.services.analytics),
      provisioning: runtimeUrlResolver.resolveServiceUrl('3011', config.services.provisioning),
      ldapSync: runtimeUrlResolver.resolveServiceUrl('3012', config.services.ldapSync),
      policy: runtimeUrlResolver.resolveServiceUrl('3013', config.services.policy),
      notifier: runtimeUrlResolver.resolveServiceUrl('3014', config.services.notifier),
      keycloak: runtimeUrlResolver.resolveServiceUrl('8080', config.external.keycloak),
      grafana: runtimeUrlResolver.resolveServiceUrl('3100', config.external.grafana),
      prometheus: runtimeUrlResolver.resolveServiceUrl('9090', config.external.prometheus)
    };
  }
};

/**
 * Utility functions for URL construction
 */
export const urlUtils = {
  /**
   * Join URL parts safely
   */
  join: (...parts: string[]): string => {
    return parts
      .map(part => part.replace(/^\/+|\/+$/g, ''))
      .filter(Boolean)
      .join('/');
  },

  /**
   * Build API URL with path
   */
  api: (path: string): string => {
    return urlUtils.join(config.urls.api, path);
  },

  /**
   * Build service URL with path
   */
  service: (serviceName: keyof typeof config.services, path: string = ''): string => {
    const serviceUrl = config.services[serviceName];
    return path ? urlUtils.join(serviceUrl, path) : serviceUrl;
  },

  /**
   * Build WebSocket URL
   */
  websocket: (path: string = ''): string => {
    return path ? urlUtils.join(config.urls.ws, path) : config.urls.ws;
  },

  /**
   * Check if URL is external
   */
  isExternal: (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      const currentHost = window.location.host;
      return urlObj.host !== currentHost;
    } catch {
      return false;
    }
  },

  /**
   * Resolve URL relative to current frontend URL
   */
  resolve: (path: string): string => {
    if (path.startsWith('http')) {
      return path;
    }
    return urlUtils.join(config.urls.frontend, path);
  }
};

/**
 * Validation helpers
 */
export const validation = {
  /**
   * Validate that all required environment variables are set
   */
  validateEnvironment: (): { isValid: boolean; missing: string[] } => {
    const required = [
      'VITE_FRONTEND_URL',
      'VITE_AUTH_BFF_URL',
      'VITE_API_BASE_URL'
    ];

    const missing = required.filter(key => !import.meta.env[key]);
    
    return {
      isValid: missing.length === 0,
      missing
    };
  },

  /**
   * Log environment validation results
   */
  logEnvironmentStatus: (): void => {
    const { isValid, missing } = validation.validateEnvironment();
    
    if (isValid) {
      console.log('✅ Environment configuration is valid');
    } else {
      console.warn('⚠️  Missing required environment variables:', missing);
      console.warn('Using fallback values for development');
    }

    if (config.app.debug) {
      console.log('📋 Current configuration:', {
        app: config.app,
        urls: config.urls,
        features: config.features
      });
    }
  }
};

/**
 * Export for use in tests
 */
export const __test__ = {
  config,
  environmentConfig,
  getEnvironmentConfig,
  urlUtils,
  validation
};

// Validate environment on module load (in development)
if (config.app.environment === 'development') {
  validation.logEnvironmentStatus();
}