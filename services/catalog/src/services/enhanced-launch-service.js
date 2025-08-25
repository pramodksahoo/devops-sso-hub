/**
 * Enhanced Tool Launch Service - Phase 4
 * Comprehensive tool-specific launch URL generation and OAuth/OIDC/SAML redirects
 * Supports all 11 tools with specific authentication flows
 */

const { randomBytes, createHmac } = require('crypto');
const { v4: uuidv4 } = require('uuid');
const SeamlessAuthService = require('./seamless-auth-service');

class EnhancedLaunchService {
  constructor(fastify, config, databaseManager, policyService) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.policy = policyService;
    this.redis = fastify.redis;
    this.seamlessAuth = new SeamlessAuthService(fastify, config);
  }

  async initialize() {
    this.fastify.log.info('✅ Enhanced Launch Service: Initialized with comprehensive tool support and seamless SSO');
  }

  // ===== MAIN LAUNCH URL GENERATION =====

  async generateLaunchUrl(toolId, options) {
    const { user, context, deep_link, return_url, user_agent, ip_address } = options;

    try {
      // Get tool details with launch configuration
      const tool = await this.db.getToolById(toolId);
      if (!tool) {
        throw new Error(`Tool not found: ${toolId}`);
      }

      // Check access permissions via policy service
      const hasAccess = await this.policy.checkToolAccess(tool, user);
      if (!hasAccess) {
        throw new Error(`Access denied to tool: ${tool.name}`);
      }

      // Get comprehensive launch configuration
      const launchConfig = await this.db.getLaunchConfig(toolId);
      if (!launchConfig) {
        throw new Error(`Launch configuration not found for tool: ${tool.name}`);
      }

      // Check if seamless SSO is enabled for this tool
      const useSeamlessSSO = this.shouldUseSeamlessSSO(tool, launchConfig);
      
      let launchUrl;
      let sessionToken;
      let stateParameter;
      let seamlessResult = null;
      
      if (useSeamlessSSO) {
        // Use seamless authentication for supported tools
        this.fastify.log.info(`Using seamless SSO for ${tool.slug}`);
        seamlessResult = await this.seamlessAuth.generateSeamlessAuth(tool, user, context);
        launchUrl = seamlessResult.launch_url;
        sessionToken = seamlessResult.auth_token;
        stateParameter = this.generateStateParameter();
      } else {
        // Generate secure session tokens for traditional flow
        sessionToken = this.generateSessionToken();
        stateParameter = this.generateStateParameter();

        // Build tool-specific launch URL using traditional OIDC flow
        launchUrl = await this.buildComprehensiveLaunchUrl(tool, launchConfig, {
          user,
          context,
          deep_link,
          return_url,
          state_parameter: stateParameter,
          tool  // Pass the tool object for access to auth_config
        });
      }

      // Ensure user exists in the database and get their UUID
      const userId = await this.db.ensureUserExists(user);
      
      // Create launch session with comprehensive tracking
      const session = await this.db.createLaunchSession({
        tool_id: toolId,
        user_id: userId,  // Use the actual UUID from users table
        launch_url: launchUrl,
        launch_type: launchConfig.launch_type,
        launch_context: { context, deep_link, return_url },
        session_token: sessionToken,
        state_parameter: stateParameter,
        status: 'initiated',
        user_agent,
        ip_address,
        launch_timestamp: new Date()
      });

      // Cache session data in Redis
      await this.cacheSessionData(sessionToken, {
        tool_id: toolId,
        user_id: userId,  // Use the actual UUID from users table
        user_sub: user.sub,  // Keep the Keycloak sub for reference
        state_parameter: stateParameter,
        return_url,
        expires_at: Date.now() + (this.config.LAUNCH_SESSION_TTL * 1000)
      });

      // Record comprehensive usage analytics
      await this.db.recordToolUsage({
        tool_id: toolId,
        user_id: userId,  // Use the actual UUID from users table
        action: 'launch',
        session_id: sessionToken,
        ip_address,
        user_agent,
        request_path: `/api/tools/${toolId}/launch`,
        request_method: 'POST',
        response_status: 200,
        metadata: { 
          context, 
          deep_link, 
          launch_type: launchConfig.launch_type,
          has_deep_link: !!deep_link,
          user_roles: user.roles,
          keycloak_sub: user.sub  // Keep for reference
        }
      });

      return {
        launch_url: launchUrl,
        launch_type: seamlessResult ? 'seamless' : launchConfig.launch_type,
        session_token: sessionToken,
        expires_at: new Date(Date.now() + (this.config.LAUNCH_SESSION_TTL * 1000)),
        instructions: seamlessResult ? 'Direct access granted - no additional login required' : this.getToolSpecificInstructions(tool, launchConfig.launch_type),
        supports_deep_links: launchConfig.supports_deep_links,
        context_applied: context || {},
        seamless: !!seamlessResult,
        auth_method: seamlessResult?.method || 'oidc_redirect'
      };
    } catch (error) {
      this.fastify.log.error('Failed to generate launch URL:', error);
      
      // Record failed launch attempt
      if (user && toolId) {
        try {
          // Try to get user ID if possible
          const userId = await this.db.ensureUserExists(user).catch(() => null);
          if (userId) {
            await this.db.recordToolUsage({
              tool_id: toolId,
              user_id: userId,
              action: 'launch_failed',
              request_path: `/api/tools/${toolId}/launch`,
              request_method: 'POST',
              response_status: 500,
              metadata: { error: error.message, keycloak_sub: user.sub }
            });
          }
        } catch (recordError) {
          this.fastify.log.warn('Failed to record launch failure:', recordError);
        }
      }
      
      throw error;
    }
  }

  async buildComprehensiveLaunchUrl(tool, launchConfig, options) {
    const { user, context, deep_link, return_url, state_parameter } = options;

    // Get base URL for the tool
    const baseUrl = this.getToolBaseUrl(tool);
    
    // Start with the launch URL pattern
    let launchUrl = launchConfig.launch_url_pattern;

    // Replace common placeholders
    launchUrl = this.replaceCommonPlaceholders(launchUrl, baseUrl, return_url);

    // Build tool-specific launch URL with comprehensive implementations
    switch (tool.slug) {
      case 'github':
        launchUrl = await this.buildGitHubLaunchUrl(launchUrl, { ...options, baseUrl, tool });
        break;
      case 'gitlab':
        launchUrl = await this.buildGitLabLaunchUrl(launchUrl, { ...options, baseUrl, tool });
        break;
      case 'jenkins':
        launchUrl = await this.buildJenkinsLaunchUrl(launchUrl, { ...options, baseUrl, tool });
        break;
      case 'argocd':
        launchUrl = await this.buildArgoCDLaunchUrl(launchUrl, { ...options, baseUrl, tool });
        break;
      case 'terraform':
        launchUrl = await this.buildTerraformLaunchUrl(launchUrl, { ...options, baseUrl, tool });
        break;
      case 'sonarqube':
        launchUrl = await this.buildSonarQubeLaunchUrl(launchUrl, { ...options, baseUrl, tool });
        break;
      case 'grafana':
        launchUrl = await this.buildGrafanaLaunchUrl(launchUrl, { ...options, baseUrl, tool });
        break;
      case 'prometheus':
        launchUrl = await this.buildPrometheusLaunchUrl(launchUrl, { ...options, baseUrl, tool });
        break;
      case 'kibana':
        launchUrl = await this.buildKibanaLaunchUrl(launchUrl, { ...options, baseUrl, tool });
        break;
      case 'snyk':
        launchUrl = await this.buildSnykLaunchUrl(launchUrl, { ...options, baseUrl, tool });
        break;
      case 'jira':
        launchUrl = await this.buildJiraLaunchUrl(launchUrl, { ...options, baseUrl, tool });
        break;
      case 'servicenow':
        launchUrl = await this.buildServiceNowLaunchUrl(launchUrl, { ...options, baseUrl, tool });
        break;
      default:
        launchUrl = await this.buildGenericOIDCLaunchUrl(launchUrl, { ...options, tool });
    }

    // Add deep link if supported and requested
    if (deep_link && launchConfig.supports_deep_links) {
      launchUrl = this.addDeepLink(launchUrl, deep_link, launchConfig.deep_link_patterns);
    }

    return launchUrl;
  }

  // ===== COMPREHENSIVE TOOL-SPECIFIC IMPLEMENTATIONS =====

  async buildGitHubLaunchUrl(launchUrl, options) {
    const { context, state_parameter, user, baseUrl } = options;
    
    // GitHub OAuth App Configuration
    const clientId = process.env.GITHUB_CLIENT_ID || 'github-oauth-app-client-id';
    const baseScopes = ['read:user', 'user:email', 'read:org'];
    
    // Context-aware scope selection
    let scopes = [...baseScopes];
    if (context?.repo_access) scopes.push('repo');
    if (context?.webhook_manage) scopes.push('admin:repo_hook', 'admin:org_hook');
    if (context?.organization_admin) scopes.push('admin:org');
    if (context?.gist_access) scopes.push('gist');
    if (context?.notification_access) scopes.push('notifications');
    
    const redirectUri = `${this.config.WEBHOOK_BASE_URL}/auth/callback/github`;

    return launchUrl
      .replace('{client_id}', clientId)
      .replace('{state}', state_parameter)
      .replace('{scope}', encodeURIComponent(scopes.join(' ')))
      .replace('{redirect_uri}', encodeURIComponent(redirectUri))
      .replace('{base_url}', 'https://github.com');
  }

  async buildGitLabLaunchUrl(launchUrl, options) {
    const { context, state_parameter, user, baseUrl } = options;
    
    // GitLab OAuth Application Configuration
    const clientId = process.env.GITLAB_CLIENT_ID || 'gitlab-oauth-app-client-id';
    const baseScopes = ['openid', 'read_user', 'read_repository'];
    
    // Context-aware scope selection
    let scopes = [...baseScopes];
    if (context?.api_access) scopes.push('read_api', 'write_repository');
    if (context?.registry_access) scopes.push('read_registry', 'write_registry');
    if (context?.admin_access) scopes.push('api', 'admin_mode');
    if (context?.project_management) scopes.push('write_repository', 'api');
    
    const redirectUri = `${this.config.WEBHOOK_BASE_URL}/auth/callback/gitlab`;

    return launchUrl
      .replace('{client_id}', clientId)
      .replace('{state}', state_parameter)
      .replace('{scope}', encodeURIComponent(scopes.join(' ')))
      .replace('{redirect_uri}', encodeURIComponent(redirectUri))
      .replace('{base_url}', baseUrl);
  }

  async buildJenkinsLaunchUrl(launchUrl, options) {
    const { return_url, context, user, baseUrl } = options;
    
    // Jenkins OIDC Plugin Integration
    // Navigate to specific job/folder if provided in context
    let targetUrl = launchUrl;
    
    if (context?.job_name) {
      targetUrl = `${baseUrl}/job/${context.job_name}/`;
    } else if (context?.folder_name) {
      targetUrl = `${baseUrl}/job/${context.folder_name}/`;
    } else if (return_url) {
      targetUrl = `${baseUrl}/login?from=${encodeURIComponent(return_url)}`;
    }
    
    return targetUrl;
  }

  async buildArgoCDLaunchUrl(launchUrl, options) {
    const { return_url, context, user, baseUrl } = options;
    
    // Argo CD OIDC Integration with RBAC
    let targetUrl = return_url || '/applications';
    
    // Navigate to specific application or project
    if (context?.application_name) {
      targetUrl = `/applications/${context.application_name}`;
    } else if (context?.project_name) {
      targetUrl = `/applications?proj=${context.project_name}`;
    }
    
    return launchUrl.replace('{return_url}', encodeURIComponent(targetUrl));
  }

  async buildTerraformLaunchUrl(launchUrl, options) {
    const { context, user, baseUrl } = options;
    
    // Terraform Cloud/Enterprise SAML/OIDC
    let targetUrl = launchUrl;
    
    // Navigate to specific workspace or organization
    if (context?.workspace_name && context?.organization_name) {
      targetUrl = `${baseUrl}/app/${context.organization_name}/workspaces/${context.workspace_name}`;
    } else if (context?.organization_name) {
      targetUrl = `${baseUrl}/app/${context.organization_name}/workspaces`;
    }
    
    return targetUrl;
  }

  async buildSonarQubeLaunchUrl(launchUrl, options) {
    const { context, state_parameter, user, baseUrl } = options;
    
    // SonarQube OIDC Integration
    const redirectUri = `${this.config.WEBHOOK_BASE_URL}/auth/callback/sonarqube`;
    
    let finalUrl = launchUrl
      .replace('{redirect_uri}', encodeURIComponent(redirectUri))
      .replace('{state}', state_parameter)
      .replace('{base_url}', baseUrl);
    
    // Navigate to specific project
    if (context?.project_key) {
      finalUrl += `&returnTo=${encodeURIComponent(`/dashboard?id=${context.project_key}`)}`;
    }
    
    return finalUrl;
  }

  async buildGrafanaLaunchUrl(launchUrl, options) {
    const { context, state_parameter, user, baseUrl, tool } = options;
    
    // Get Grafana configuration from the tool's auth_config
    const authConfig = tool?.auth_config || {};
    
    // For direct launch with OIDC, Grafana handles authentication itself
    if (authConfig.direct_launch || authConfig.grafana_url) {
      // Just redirect to Grafana - it will handle OIDC flow internally
      let targetUrl = authConfig.grafana_url || 'http://localhost:3100';
      
      // Add any dashboard or folder navigation
      if (context?.dashboard_uid) {
        targetUrl = `${targetUrl}/d/${context.dashboard_uid}`;
      } else if (context?.folder_uid) {
        targetUrl = `${targetUrl}/dashboards/f/${context.folder_uid}`;
      } else if (context?.dashboard_name) {
        // Search for dashboard by name
        targetUrl = `${targetUrl}/dashboards?query=${encodeURIComponent(context.dashboard_name)}`;
      } else {
        // Default to home dashboard
        targetUrl = `${targetUrl}`;
      }
      
      // For OIDC flow, Grafana will handle the authentication redirect
      this.fastify.log.info(`Launching Grafana with direct URL: ${targetUrl}`);
      return targetUrl;
    }
    
    // Fallback to building OAuth URL if not using direct launch
    const clientId = authConfig.client_id || process.env.GRAFANA_CLIENT_ID || 'grafana-client';
    const scopes = authConfig.scopes || ['openid', 'email', 'profile'];
    const redirectUri = authConfig.redirect_uri || 'http://localhost:3100/login/generic_oauth';
    
    // Build the OAuth authorization URL for Keycloak
    const authUrl = authConfig.auth_url || 'http://localhost:8080/realms/sso-hub/protocol/openid-connect/auth';
    const scopeString = Array.isArray(scopes) ? scopes.join(' ') : scopes;
    
    const oauthUrl = new URL(authUrl);
    oauthUrl.searchParams.set('client_id', clientId);
    oauthUrl.searchParams.set('redirect_uri', redirectUri);
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('scope', scopeString);
    oauthUrl.searchParams.set('state', state_parameter);
    
    this.fastify.log.info(`Building Grafana OAuth URL: ${oauthUrl.toString()}`);
    return oauthUrl.toString();
  }

  async buildPrometheusLaunchUrl(launchUrl, options) {
    const { context, user, baseUrl } = options;
    
    // Prometheus Reverse-Proxy Authentication
    // Access through proxy with pre-authenticated headers
    let targetUrl = baseUrl;
    
    // Navigate to specific query or dashboard
    if (context?.query) {
      targetUrl = `${baseUrl}/graph?g0.expr=${encodeURIComponent(context.query)}&g0.tab=1&g0.stacked=0&g0.range_input=1h`;
    } else if (context?.target === 'alerts') {
      targetUrl = `${baseUrl}/alerts`;
    } else if (context?.target === 'rules') {
      targetUrl = `${baseUrl}/rules`;
    } else if (context?.target === 'targets') {
      targetUrl = `${baseUrl}/targets`;
    }
    
    return targetUrl;
  }

  async buildKibanaLaunchUrl(launchUrl, options) {
    const { context, user, baseUrl } = options;
    
    // Kibana SAML/OIDC Integration
    let targetUrl = launchUrl;
    
    // Navigate to specific space
    if (context?.space && context.space !== 'default') {
      targetUrl = targetUrl.replace('/login', `/s/${context.space}/login`);
    }
    
    // Add next parameter for post-login navigation
    if (context?.index_pattern) {
      const discoverUrl = `/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(columns:!(_source),filters:!(),index:'${context.index_pattern}')`;
      targetUrl += `?next=${encodeURIComponent(discoverUrl)}`;
    } else if (context?.dashboard_id) {
      targetUrl += `?next=${encodeURIComponent(`/app/dashboards#/view/${context.dashboard_id}`)}`;
    }
    
    return targetUrl;
  }

  async buildSnykLaunchUrl(launchUrl, options) {
    const { context, state_parameter, user, baseUrl } = options;
    
    // Snyk OIDC Integration
    const clientId = process.env.SNYK_CLIENT_ID || 'snyk-oauth-client-id';
    const scopes = ['openid', 'email', 'profile', 'offline_access'];
    const redirectUri = `${this.config.WEBHOOK_BASE_URL}/auth/callback/snyk`;
    
    let finalUrl = launchUrl
      .replace('{client_id}', clientId)
      .replace('{state}', state_parameter)
      .replace('{scope}', encodeURIComponent(scopes.join(' ')))
      .replace('{redirect_uri}', encodeURIComponent(redirectUri))
      .replace('{base_url}', baseUrl);
    
    // Navigate to specific organization
    if (context?.organization_slug) {
      finalUrl += `&org=${context.organization_slug}`;
    }
    
    return finalUrl;
  }

  async buildJiraLaunchUrl(launchUrl, options) {
    const { context, return_url, user, baseUrl } = options;
    
    // Jira SAML Integration
    let targetUrl = launchUrl;
    
    // Navigate to specific project or issue
    if (context?.project_key) {
      targetUrl = `${baseUrl}/login.jsp?os_destination=${encodeURIComponent(`/projects/${context.project_key}`)}`;
    } else if (context?.issue_key) {
      targetUrl = `${baseUrl}/login.jsp?os_destination=${encodeURIComponent(`/browse/${context.issue_key}`)}`;
    } else if (return_url) {
      targetUrl = `${baseUrl}/login.jsp?os_destination=${encodeURIComponent(return_url)}`;
    }
    
    return targetUrl;
  }

  async buildServiceNowLaunchUrl(launchUrl, options) {
    const { context, return_url, user, baseUrl } = options;
    
    // ServiceNow SAML Integration
    let targetUrl = launchUrl;
    
    // Navigate to specific module or record
    if (context?.table && context?.sys_id) {
      const recordUrl = `/${context.table}.do?sys_id=${context.sys_id}`;
      targetUrl = `${baseUrl}/navpage.do?sysparm_goto_url=${encodeURIComponent(recordUrl)}`;
    } else if (return_url) {
      targetUrl = `${baseUrl}/navpage.do?sysparm_goto_url=${encodeURIComponent(return_url)}`;
    }
    
    return targetUrl;
  }

  async buildGenericOIDCLaunchUrl(launchUrl, options) {
    const { state_parameter, user, baseUrl } = options;
    
    // Generic OIDC flow for other tools
    const redirectUri = `${this.config.WEBHOOK_BASE_URL}/auth/callback/generic`;
    
    return launchUrl
      .replace('{state}', state_parameter)
      .replace('{redirect_uri}', encodeURIComponent(redirectUri))
      .replace('{base_url}', baseUrl);
  }

  // ===== UTILITY METHODS =====

  replaceCommonPlaceholders(launchUrl, baseUrl, returnUrl) {
    return launchUrl
      .replace('{base_url}', baseUrl)
      .replace('{instance_url}', baseUrl)
      .replace('{return_url}', encodeURIComponent(returnUrl || '/'))
      .replace('{jenkins_url}', baseUrl)
      .replace('{argocd_url}', baseUrl)
      .replace('{terraform_url}', baseUrl)
      .replace('{sonarqube_url}', baseUrl)
      .replace('{grafana_url}', baseUrl)
      .replace('{prometheus_url}', baseUrl)
      .replace('{kibana_url}', baseUrl)
      .replace('{jira_url}', baseUrl)
      .replace('{snyk_url}', baseUrl);
  }

  getToolBaseUrl(tool) {
    return this.config.TOOL_BASE_URLS[tool.slug] || tool.base_url || `https://${tool.slug}.local`;
  }

  getToolSpecificInstructions(tool, launchType) {
    const instructions = {
      github: 'You will be redirected to GitHub to authorize this application. After authorization, you will be redirected back to access your repositories and organizations.',
      gitlab: 'You will be redirected to GitLab for authentication. Grant the necessary permissions to access your projects and groups.',
      jenkins: 'You will be redirected to Jenkins for OIDC authentication. Ensure the OIDC plugin is configured properly.',
      argocd: 'You will be redirected to Argo CD for authentication. Your access will be based on RBAC policies configured in Argo CD.',
      terraform: 'You will be redirected to Terraform Cloud/Enterprise for SAML authentication. Access will be granted based on workspace permissions.',
      sonarqube: 'You will be redirected to SonarQube for OIDC authentication. Access will be granted based on project-level permissions.',
      grafana: 'You will be redirected to Grafana for OAuth authentication. Access will be based on organization and folder permissions.',
      prometheus: 'You will access Prometheus through a reverse proxy with pre-authenticated headers. No additional authentication required.',
      kibana: 'You will be redirected to Kibana for SAML authentication. Access will be based on space and index pattern permissions.',
      snyk: 'You will be redirected to Snyk for OIDC authentication. Access will be based on organization and project roles.',
      jira: 'You will be redirected to Jira for SAML authentication. Access will be based on project permissions and issue-level access.',
      servicenow: 'You will be redirected to ServiceNow for SAML authentication. Access will be based on role-based permissions and workflow access.'
    };

    return instructions[tool.slug] || 'You will be redirected to the tool for authentication. Follow the authentication flow and grant necessary permissions.';
  }

  generateSessionToken() {
    return randomBytes(32).toString('hex');
  }

  generateStateParameter() {
    return randomBytes(16).toString('hex');
  }

  shouldUseSeamlessSSO(tool, launchConfig) {
    // Enable seamless SSO for supported tools
    const seamlessEnabledTools = ['grafana', 'prometheus', 'jenkins', 'sonarqube'];
    
    // Check if tool supports seamless SSO
    if (seamlessEnabledTools.includes(tool.slug)) {
      // Check if seamless is explicitly enabled in config
      const seamlessEnabled = 
        tool.auth_config?.seamless_sso === true ||
        launchConfig.auth_flow_config?.seamless_sso === true ||
        process.env.ENABLE_SEAMLESS_SSO === 'true';
      
      if (seamlessEnabled) {
        this.fastify.log.info(`Seamless SSO enabled for ${tool.slug}`);
        return true;
      }
    }
    
    return false;
  }

  async cacheSessionData(sessionToken, data) {
    await this.redis.setex(`launch_session:${sessionToken}`, this.config.LAUNCH_SESSION_TTL, JSON.stringify(data));
  }

  async getSessionData(stateParameter) {
    const keys = await this.redis.keys('launch_session:*');
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.state_parameter === stateParameter) {
          return parsed;
        }
      }
    }
    return null;
  }

  // ===== DEEP LINKING SUPPORT =====

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
}

module.exports = EnhancedLaunchService;
