/**
 * Tool Launch Service
 * Handles tool-specific launch URL generation and OAuth/OIDC/SAML redirects
 */

const { randomBytes, createHmac } = require('crypto');
const { v4: uuidv4 } = require('uuid');

class LaunchService {
  constructor(fastify, config, databaseManager, policyService) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.policy = policyService;
    this.redis = fastify.redis;
  }

  async initialize() {
    this.fastify.log.info('✅ Launch Service: Initialized');
  }

  // ===== LAUNCH URL GENERATION =====

  async generateLaunchUrl(toolId, options) {
    const { user, context, deep_link, return_url, user_agent, ip_address } = options;

    try {
      // Get tool details
      const tool = await this.db.getToolById(toolId);
      if (!tool) {
        throw new Error(`Tool not found: ${toolId}`);
      }

      // Check access permissions
      const hasAccess = await this.policy.checkToolAccess(tool, user);
      if (!hasAccess) {
        throw new Error(`Access denied to tool: ${tool.name}`);
      }

      // Get launch configuration
      const launchConfig = await this.db.getLaunchConfig(toolId);
      if (!launchConfig) {
        throw new Error(`Launch configuration not found for tool: ${tool.name}`);
      }

      // Generate session token and state parameter
      const sessionToken = this.generateSessionToken();
      const stateParameter = this.generateStateParameter();

      // Build launch URL based on tool type
      const launchUrl = await this.buildLaunchUrl(tool, launchConfig, {
        user,
        context,
        deep_link,
        return_url,
        state_parameter: stateParameter
      });

      // Create launch session
      const session = await this.db.createLaunchSession({
        tool_id: toolId,
        user_id: user.sub,
        launch_url: launchUrl,
        launch_type: launchConfig.launch_type,
        launch_context: { context, deep_link, return_url },
        session_token: sessionToken,
        state_parameter: stateParameter,
        status: 'initiated',
        user_agent,
        ip_address
      });

      // Cache session data in Redis for quick lookup
      await this.cacheSessionData(sessionToken, {
        tool_id: toolId,
        user_id: user.sub,
        state_parameter: stateParameter,
        return_url,
        expires_at: Date.now() + (this.config.LAUNCH_SESSION_TTL * 1000)
      });

      // Record usage analytics
      await this.db.recordToolUsage({
        tool_id: toolId,
        user_id: user.sub,
        action: 'launch',
        session_id: sessionToken,
        ip_address,
        user_agent,
        request_path: `/api/tools/${toolId}/launch`,
        request_method: 'POST',
        response_status: 200,
        metadata: { context, deep_link }
      });

      return {
        launch_url: launchUrl,
        launch_type: launchConfig.launch_type,
        session_token: sessionToken,
        expires_at: new Date(Date.now() + (this.config.LAUNCH_SESSION_TTL * 1000)),
        instructions: this.getLaunchInstructions(tool, launchConfig.launch_type)
      };
    } catch (error) {
      this.fastify.log.error('Failed to generate launch URL:', error);
      throw error;
    }
  }

  async buildLaunchUrl(tool, launchConfig, options) {
    const { user, context, deep_link, return_url, state_parameter } = options;

    // Get base URL for the tool
    const baseUrl = this.getToolBaseUrl(tool);
    
    // Start with the launch URL pattern
    let launchUrl = launchConfig.launch_url_pattern;

    // Replace common placeholders
    launchUrl = launchUrl
      .replace('{base_url}', baseUrl)
      .replace('{instance_url}', baseUrl)
      .replace('{jenkins_url}', baseUrl)
      .replace('{argocd_url}', baseUrl)
      .replace('{terraform_url}', baseUrl)
      .replace('{sonarqube_url}', baseUrl)
      .replace('{grafana_url}', baseUrl)
      .replace('{prometheus_url}', baseUrl)
      .replace('{kibana_url}', baseUrl)
      .replace('{jira_url}', baseUrl)
      .replace('{snyk_url}', baseUrl);

    // Tool-specific URL building
    switch (tool.slug) {
      case 'github':
        launchUrl = await this.buildGitHubLaunchUrl(launchUrl, options);
        break;
      case 'gitlab':
        launchUrl = await this.buildGitLabLaunchUrl(launchUrl, options);
        break;
      case 'jenkins':
        launchUrl = await this.buildJenkinsLaunchUrl(launchUrl, options);
        break;
      case 'argocd':
        launchUrl = await this.buildArgoCDLaunchUrl(launchUrl, options);
        break;
      case 'terraform':
        launchUrl = await this.buildTerraformLaunchUrl(launchUrl, options);
        break;
      case 'sonarqube':
        launchUrl = await this.buildSonarQubeLaunchUrl(launchUrl, options);
        break;
      case 'grafana':
        launchUrl = await this.buildGrafanaLaunchUrl(launchUrl, options);
        break;
      case 'prometheus':
        launchUrl = await this.buildPrometheusLaunchUrl(launchUrl, options);
        break;
      case 'kibana':
        launchUrl = await this.buildKibanaLaunchUrl(launchUrl, options);
        break;
      case 'snyk':
        launchUrl = await this.buildSnykLaunchUrl(launchUrl, options);
        break;
      case 'jira':
        launchUrl = await this.buildJiraLaunchUrl(launchUrl, options);
        break;
      case 'servicenow':
        launchUrl = await this.buildServiceNowLaunchUrl(launchUrl, options);
        break;
      default:
        // Generic OIDC/OAuth flow
        launchUrl = await this.buildGenericOIDCLaunchUrl(launchUrl, options);
    }

    // Add deep link if supported and requested
    if (deep_link && launchConfig.supports_deep_links) {
      launchUrl = this.addDeepLink(launchUrl, deep_link, launchConfig.deep_link_patterns);
    }

    return launchUrl;
  }

  // ===== TOOL-SPECIFIC URL BUILDERS =====

  async buildGitHubLaunchUrl(launchUrl, options) {
    const { context, state_parameter, user } = options;
    
    // Get GitHub OAuth app configuration from environment or tool config
    const clientId = process.env.GITHUB_CLIENT_ID || 'github-oauth-app-client-id';
    const baseScopes = ['read:user', 'user:email', 'read:org'];
    
    // Add contextual scopes based on requirements
    let scopes = [...baseScopes];
    if (context?.repo_access) scopes.push('repo');
    if (context?.webhook_manage) scopes.push('admin:repo_hook', 'admin:org_hook');
    if (context?.organization) scopes.push('read:org', 'admin:org');
    
    const redirectUri = `${this.config.WEBHOOK_BASE_URL}/auth/callback/github`;

    return launchUrl
      .replace('{client_id}', clientId)
      .replace('{state}', state_parameter)
      .replace('{scope}', encodeURIComponent(scopes.join(' ')))
      .replace('{redirect_uri}', encodeURIComponent(redirectUri));
  }

  async buildGitLabLaunchUrl(launchUrl, options) {
    const { context, state_parameter, user } = options;
    
    // Get GitLab OAuth app configuration
    const clientId = process.env.GITLAB_CLIENT_ID || 'gitlab-oauth-app-client-id';
    const baseScopes = ['openid', 'read_user', 'read_repository'];
    
    // Add contextual scopes based on requirements
    let scopes = [...baseScopes];
    if (context?.api_access) scopes.push('read_api', 'write_repository');
    if (context?.registry_access) scopes.push('read_registry', 'write_registry');
    if (context?.admin_access) scopes.push('api', 'admin_mode');
    
    const redirectUri = `${this.config.WEBHOOK_BASE_URL}/auth/callback/gitlab`;

    return launchUrl
      .replace('{client_id}', clientId)
      .replace('{state}', state_parameter)
      .replace('{scope}', encodeURIComponent(scopes.join(' ')))
      .replace('{redirect_uri}', encodeURIComponent(redirectUri));
  }

  async buildJenkinsLaunchUrl(launchUrl, options) {
    const { return_url } = options;
    
    // Jenkins OIDC plugin redirects to finish login
    if (return_url) {
      return `${launchUrl}?from=${encodeURIComponent(return_url)}`;
    }
    
    return launchUrl;
  }

  async buildArgoCDLaunchUrl(launchUrl, options) {
    const { return_url } = options;
    
    const returnUrl = return_url || '/applications';
    return launchUrl.replace('{return_url}', encodeURIComponent(returnUrl));
  }

  async buildTerraformLaunchUrl(launchUrl, options) {
    const { context } = options;
    
    // Navigate to specific workspace if provided
    if (context && context.workspace) {
      return launchUrl.replace('/workspaces', `/workspaces/${context.workspace}`);
    }
    
    return launchUrl.replace('{organization}', context?.organization || 'default');
  }

  async buildSonarQubeLaunchUrl(launchUrl, options) {
    const { context } = options;
    
    // Navigate to specific project if provided
    if (context && context.project) {
      return `${launchUrl}?returnTo=${encodeURIComponent(`/dashboard?id=${context.project}`)}`;
    }
    
    return launchUrl;
  }

  async buildGrafanaLaunchUrl(launchUrl, options) {
    const { context, return_url } = options;
    
    // Navigate to specific dashboard or organization
    if (return_url) {
      return `${launchUrl}?redirect=${encodeURIComponent(return_url)}`;
    }
    
    return launchUrl;
  }

  async buildPrometheusLaunchUrl(launchUrl, options) {
    const { context } = options;
    
    // Prometheus is accessed directly through proxy authentication
    // Add query parameters if provided
    if (context && context.query) {
      return `${launchUrl}/graph?g0.expr=${encodeURIComponent(context.query)}`;
    }
    
    return launchUrl;
  }

  async buildKibanaLaunchUrl(launchUrl, options) {
    const { context } = options;
    
    // Navigate to specific space or dashboard
    if (context && context.space && context.space !== 'default') {
      return launchUrl.replace('/login', `/s/${context.space}/login`);
    }
    
    return launchUrl;
  }

  async buildSnykLaunchUrl(launchUrl, options) {
    const { context } = options;
    
    // Navigate to specific organization
    if (context && context.organization) {
      return `${launchUrl}?org=${context.organization}`;
    }
    
    return launchUrl;
  }

  async buildJiraLaunchUrl(launchUrl, options) {
    const { context, return_url } = options;
    
    // SAML redirect with return URL
    if (return_url) {
      return `${launchUrl}?os_destination=${encodeURIComponent(return_url)}`;
    }
    
    return launchUrl;
  }

  async buildServiceNowLaunchUrl(launchUrl, options) {
    const { context, return_url } = options;
    
    // SAML redirect with return URL
    if (return_url) {
      return `${launchUrl}?sysparm_goto_url=${encodeURIComponent(return_url)}`;
    }
    
    return launchUrl;
  }

  async buildGenericOIDCLaunchUrl(launchUrl, options) {
    const { state_parameter } = options;
    
    // Generic OIDC flow
    const redirectUri = `${this.config.WEBHOOK_BASE_URL}/api/tools/generic/callback`;
    
    return launchUrl
      .replace('{state}', state_parameter)
      .replace('{redirect_uri}', encodeURIComponent(redirectUri));
  }

  // ===== DEEP LINKING =====

  addDeepLink(baseUrl, deepLink, patterns) {
    if (!deepLink || !deepLink.type || !patterns[deepLink.type]) {
      return baseUrl;
    }

    const pattern = patterns[deepLink.type];
    let deepLinkPath = pattern;

    // Replace parameters in the pattern
    if (deepLink.parameters) {
      Object.keys(deepLink.parameters).forEach(key => {
        deepLinkPath = deepLinkPath.replace(`{${key}}`, deepLink.parameters[key]);
      });
    }

    // Append deep link to base URL
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}returnTo=${encodeURIComponent(deepLinkPath)}`;
  }

  // ===== CALLBACK HANDLING =====

  async handleCallback(toolId, callbackData) {
    const { state, code, error, user_agent, ip_address } = callbackData;

    try {
      if (error) {
        throw new Error(`OAuth/OIDC error: ${error}`);
      }

      if (!state) {
        throw new Error('Missing state parameter');
      }

      // Get session data from cache
      const sessionData = await this.getSessionData(state);
      if (!sessionData) {
        throw new Error('Invalid or expired session');
      }

      // Update session status
      await this.db.updateLaunchSession(sessionData.session_token, {
        status: code ? 'completed' : 'failed',
        completed_at: new Date(),
        error_details: error ? { error } : null
      });

      // For OAuth/OIDC flows, we would typically exchange the code for tokens here
      // For now, we'll just redirect to the return URL or tool

      const redirectUrl = sessionData.return_url || this.getToolBaseUrl({ id: toolId });

      return {
        redirect_url: redirectUrl,
        message: 'Authentication completed successfully',
        session_status: 'completed'
      };
    } catch (error) {
      this.fastify.log.error('Failed to handle callback:', error);
      throw error;
    }
  }

  // ===== SESSION MANAGEMENT =====

  async getSessionStatus(sessionToken, user) {
    try {
      const session = await this.db.getLaunchSession(sessionToken);
      
      if (!session) {
        throw new Error('Session not found');
      }

      // Verify session belongs to user
      if (session.user_id !== user.sub) {
        throw new Error('Access denied to session');
      }

      return {
        session_token: sessionToken,
        tool_name: session.tool_name,
        tool_slug: session.tool_slug,
        status: session.status,
        launch_url: session.launch_url,
        created_at: session.created_at,
        completed_at: session.completed_at,
        launch_context: session.launch_context
      };
    } catch (error) {
      this.fastify.log.error('Failed to get session status:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  generateSessionToken() {
    return randomBytes(32).toString('hex');
  }

  generateStateParameter() {
    return randomBytes(this.config.STATE_PARAMETER_LENGTH).toString('hex');
  }

  async cacheSessionData(sessionToken, data) {
    const key = `launch_session:${sessionToken}`;
    await this.redis.setex(key, this.config.LAUNCH_SESSION_TTL, JSON.stringify(data));
  }

  async getSessionData(stateParameter) {
    try {
      // Find session by state parameter in Redis cache
      const keys = await this.redis.keys('launch_session:*');
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const sessionData = JSON.parse(data);
          if (sessionData.state_parameter === stateParameter) {
            return {
              ...sessionData,
              session_token: key.replace('launch_session:', '')
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      this.fastify.log.error('Failed to get session data:', error);
      return null;
    }
  }

  getToolBaseUrl(tool) {
    if (typeof tool === 'string') {
      return this.config.TOOL_BASE_URLS[tool] || 'https://example.com';
    }
    
    return tool.base_url || this.config.TOOL_BASE_URLS[tool.slug] || 'https://example.com';
  }

  getLaunchInstructions(tool, launchType) {
    const instructions = {
      direct: 'Click the launch URL to access the tool directly.',
      oauth_redirect: 'You will be redirected to authenticate with OAuth. After successful authentication, you will be redirected back to the tool.',
      oidc_redirect: 'You will be redirected to authenticate with OpenID Connect. After successful authentication, you will be redirected back to the tool.',
      saml_redirect: 'You will be redirected to authenticate with SAML. After successful authentication, you will be redirected back to the tool.'
    };

    return instructions[launchType] || instructions.direct;
  }
}

module.exports = LaunchService;
