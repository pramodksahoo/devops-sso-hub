/**
 * Seamless Authentication Service
 * Provides true SSO without redirects or additional clicks
 * 
 * This service implements token-based authentication to bypass OIDC redirects
 * and provide direct access to tools with pre-authenticated sessions
 */

const crypto = require('crypto');
const axios = require('axios');

class SeamlessAuthService {
  constructor(fastify, config) {
    this.fastify = fastify;
    this.config = config;
    this.logger = fastify.log;
  }

  /**
   * Generate seamless authentication for Grafana
   * Creates a pre-authenticated session without OIDC redirects
   */
  async generateGrafanaSeamlessAuth(user, tool, context) {
    try {
      this.logger.info('Generating seamless auth for Grafana', { 
        user: user.email,
        context 
      });

      // Option 1: Use Grafana API to create authenticated session
      const grafanaUrl = tool.auth_config?.grafana_url || 'http://localhost:3100';
      
      // Generate a unique auth token for this session
      const authToken = this.generateAuthToken(user);
      
      // Store the auth token with user context in Redis for validation
      await this.storeAuthToken(authToken, user, tool);
      
      // Build the seamless launch URL with embedded auth
      const launchUrl = await this.buildSeamlessLaunchUrl(grafanaUrl, authToken, context);
      
      this.logger.info('Seamless auth URL generated for Grafana', { 
        launchUrl,
        hasContext: !!context 
      });
      
      return {
        launch_url: launchUrl,
        auth_token: authToken,
        seamless: true,
        method: 'embedded_token'
      };
    } catch (error) {
      this.logger.error('Failed to generate seamless auth for Grafana:', error);
      throw error;
    }
  }

  /**
   * Generate seamless authentication for any tool
   * Determines the best method based on tool capabilities
   */
  async generateSeamlessAuth(tool, user, context) {
    const toolSlug = tool.slug;
    
    this.logger.info(`Generating seamless auth for ${toolSlug}`, {
      user: user.email,
      integration_type: tool.integration_type
    });

    // Tool-specific seamless auth strategies
    switch (toolSlug) {
      case 'grafana':
        return await this.generateGrafanaSeamlessAuth(user, tool, context);
      
      case 'prometheus':
        return await this.generatePrometheusSeamlessAuth(user, tool, context);
      
      case 'jenkins':
        return await this.generateJenkinsSeamlessAuth(user, tool, context);
      
      case 'sonarqube':
        return await this.generateSonarQubeSeamlessAuth(user, tool, context);
      
      default:
        // Fallback to token-based auth for other tools
        return await this.generateTokenBasedAuth(user, tool, context);
    }
  }

  /**
   * Generate Prometheus seamless auth (reverse proxy approach)
   */
  async generatePrometheusSeamlessAuth(user, tool, context) {
    const prometheusUrl = tool.base_url || 'http://localhost:9090';
    const authToken = this.generateAuthToken(user);
    
    // For Prometheus, we can use a reverse proxy with pre-auth headers
    const proxyUrl = await this.setupAuthProxy(prometheusUrl, authToken, user);
    
    return {
      launch_url: proxyUrl,
      auth_token: authToken,
      seamless: true,
      method: 'auth_proxy'
    };
  }

  /**
   * Generate Jenkins seamless auth using API token
   */
  async generateJenkinsSeamlessAuth(user, tool, context) {
    const jenkinsUrl = tool.base_url || 'http://localhost:8081';
    
    // Create Jenkins API token for the user
    const apiToken = await this.createJenkinsApiToken(user, tool);
    
    // Build auto-login URL with embedded credentials
    const launchUrl = `${jenkinsUrl}/login?from=%2F&j_username=${encodeURIComponent(user.email)}&j_password=${encodeURIComponent(apiToken)}`;
    
    return {
      launch_url: launchUrl,
      auth_token: apiToken,
      seamless: true,
      method: 'api_token'
    };
  }

  /**
   * Generate SonarQube seamless auth using user token
   */
  async generateSonarQubeSeamlessAuth(user, tool, context) {
    const sonarUrl = tool.base_url || 'http://localhost:9000';
    
    // Create SonarQube user token
    const userToken = await this.createSonarQubeUserToken(user, tool);
    
    // Build auto-authenticated URL
    const launchUrl = `${sonarUrl}?auth_token=${userToken}`;
    
    return {
      launch_url: launchUrl,
      auth_token: userToken,
      seamless: true,
      method: 'user_token'
    };
  }

  /**
   * Generic token-based authentication for tools
   */
  async generateTokenBasedAuth(user, tool, context) {
    const authToken = this.generateAuthToken(user);
    await this.storeAuthToken(authToken, user, tool);
    
    const baseUrl = tool.base_url || tool.auth_config?.base_url;
    const launchUrl = `${baseUrl}/sso/login?token=${authToken}&redirect=${encodeURIComponent(context?.return_url || '/')}`;
    
    return {
      launch_url: launchUrl,
      auth_token: authToken,
      seamless: true,
      method: 'sso_token'
    };
  }

  /**
   * Build seamless launch URL with embedded authentication
   */
  async buildSeamlessLaunchUrl(baseUrl, authToken, context) {
    let url = baseUrl;
    
    // For Grafana, we'll use a special endpoint that accepts our auth token
    // This requires custom Grafana plugin or auth proxy
    if (baseUrl.includes('grafana') || baseUrl.includes(':3100')) {
      // Option 1: Use auth proxy endpoint
      url = `${baseUrl}/login?auth_token=${authToken}`;
      
      // Add dashboard navigation if specified
      if (context?.dashboard_uid) {
        url += `&redirect_to=${encodeURIComponent(`/d/${context.dashboard_uid}`)}`;
      } else if (context?.dashboard_name) {
        url += `&redirect_to=${encodeURIComponent(`/dashboards?query=${context.dashboard_name}`)}`;
      }
    } else {
      // Generic seamless URL pattern
      url = `${baseUrl}/sso/seamless?token=${authToken}`;
      
      if (context?.return_url) {
        url += `&return=${encodeURIComponent(context.return_url)}`;
      }
    }
    
    return url;
  }

  /**
   * Setup authentication proxy for tools that don't support token auth
   */
  async setupAuthProxy(targetUrl, authToken, user) {
    // This would create a temporary proxy endpoint that adds auth headers
    // For now, return a proxy URL pattern
    const proxyBaseUrl = process.env.AUTH_PROXY_URL || 'http://localhost:3015';
    
    const proxyUrl = `${proxyBaseUrl}/proxy/${authToken}?target=${encodeURIComponent(targetUrl)}`;
    
    // Store proxy configuration
    await this.storeProxyConfig(authToken, {
      target: targetUrl,
      user: user,
      headers: {
        'X-Auth-User': user.email,
        'X-Auth-Name': user.name,
        'X-Auth-Roles': (user.roles || []).join(',')
      }
    });
    
    return proxyUrl;
  }

  /**
   * Create Jenkins API token for user
   */
  async createJenkinsApiToken(user, tool) {
    // This would integrate with Jenkins API to create user token
    // For now, generate a mock token
    return this.generateAuthToken(user, 'jenkins');
  }

  /**
   * Create SonarQube user token
   */
  async createSonarQubeUserToken(user, tool) {
    // This would integrate with SonarQube API to create user token
    // For now, generate a mock token
    return this.generateAuthToken(user, 'sonarqube');
  }

  /**
   * Generate a secure authentication token
   */
  generateAuthToken(user, prefix = 'sso') {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const data = `${prefix}_${user.sub}_${timestamp}_${random}`;
    
    const hash = crypto
      .createHmac('sha256', process.env.SSO_SECRET || 'sso-hub-secret')
      .update(data)
      .digest('hex');
    
    return `${prefix}_${timestamp}_${hash.substring(0, 32)}`;
  }

  /**
   * Store auth token in Redis for validation
   */
  async storeAuthToken(token, user, tool) {
    const redis = this.fastify.redis;
    const ttl = 300; // 5 minutes TTL
    
    const tokenData = {
      user_sub: user.sub,
      user_email: user.email,
      user_name: user.name,
      user_roles: user.roles || [],
      tool_id: tool.id,
      tool_slug: tool.slug,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + ttl * 1000).toISOString()
    };
    
    await redis.setex(
      `auth_token:${token}`,
      ttl,
      JSON.stringify(tokenData)
    );
    
    this.logger.info('Auth token stored', { 
      token: token.substring(0, 10) + '...', 
      user: user.email,
      tool: tool.slug 
    });
  }

  /**
   * Store proxy configuration
   */
  async storeProxyConfig(token, config) {
    const redis = this.fastify.redis;
    const ttl = 300; // 5 minutes TTL
    
    await redis.setex(
      `proxy_config:${token}`,
      ttl,
      JSON.stringify(config)
    );
  }

  /**
   * Validate auth token
   */
  async validateAuthToken(token) {
    const redis = this.fastify.redis;
    const data = await redis.get(`auth_token:${token}`);
    
    if (!data) {
      return null;
    }
    
    const tokenData = JSON.parse(data);
    
    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      await redis.del(`auth_token:${token}`);
      return null;
    }
    
    return tokenData;
  }
}

module.exports = SeamlessAuthService;