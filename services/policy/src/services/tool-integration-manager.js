/**
 * Tool Integration Manager for Policy Service
 * Manages integration with all 11 DevOps tools for policy enforcement
 */

const axios = require('axios');

class ToolIntegrationManager {
  constructor(fastify, config, databaseManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.toolClients = new Map();
  }

  async initialize() {
    // Initialize tool-specific clients and configurations
    await this.initializeToolClients();
    this.fastify.log.info('✅ Tool Integration Manager: Initialized with 11 tool integrations');
  }

  async initializeToolClients() {
    // Load tool-specific configurations from database
    const toolConfigs = await this.loadToolConfigurations();
    
    for (const [toolSlug, config] of Object.entries(toolConfigs)) {
      this.toolClients.set(toolSlug, {
        config: config,
        client: this.createToolClient(toolSlug, config)
      });
    }
  }

  // ============================================================================
  // RESOURCE CONTEXT RETRIEVAL
  // ============================================================================

  async getResourceContext(toolSlug, resourceType, resourceId) {
    try {
      const toolClient = this.toolClients.get(toolSlug);
      if (!toolClient) {
        this.fastify.log.warn(`No client configured for tool: ${toolSlug}`);
        return {};
      }

      // Get tool-specific context
      switch (toolSlug) {
        case 'github':
          return await this.getGitHubContext(resourceType, resourceId, toolClient);
        case 'gitlab':
          return await this.getGitLabContext(resourceType, resourceId, toolClient);
        case 'jenkins':
          return await this.getJenkinsContext(resourceType, resourceId, toolClient);
        case 'argocd':
          return await this.getArgoCDContext(resourceType, resourceId, toolClient);
        case 'terraform':
          return await this.getTerraformContext(resourceType, resourceId, toolClient);
        case 'sonarqube':
          return await this.getSonarQubeContext(resourceType, resourceId, toolClient);
        case 'grafana':
          return await this.getGrafanaContext(resourceType, resourceId, toolClient);
        case 'prometheus':
          return await this.getPrometheusContext(resourceType, resourceId, toolClient);
        case 'kibana':
          return await this.getKibanaContext(resourceType, resourceId, toolClient);
        case 'snyk':
          return await this.getSnykContext(resourceType, resourceId, toolClient);
        case 'jira':
          return await this.getJiraContext(resourceType, resourceId, toolClient);
        default:
          return {};
      }
    } catch (error) {
      this.fastify.log.error(`Failed to get resource context for ${toolSlug}:`, error);
      return {};
    }
  }

  // ============================================================================
  // TOOL-SPECIFIC CONTEXT METHODS
  // ============================================================================

  async getGitHubContext(resourceType, resourceId, toolClient) {
    const context = {
      tool_context: {}
    };

    try {
      switch (resourceType) {
        case 'repository':
          const repo = await this.makeToolRequest(toolClient, `/repos/${resourceId}`);
          context.tool_context = {
            repository_name: repo.name,
            repository_owner: repo.owner?.login,
            is_private: repo.private,
            is_fork: repo.fork,
            default_branch: repo.default_branch,
            visibility: repo.visibility,
            archived: repo.archived,
            disabled: repo.disabled
          };
          context.environment = repo.name.includes('prod') ? 'production' : 'development';
          break;

        case 'organization':
          const org = await this.makeToolRequest(toolClient, `/orgs/${resourceId}`);
          context.tool_context = {
            organization_name: org.login,
            organization_type: org.type,
            public_repos: org.public_repos,
            private_repos: org.total_private_repos
          };
          break;

        case 'branch':
          const [owner, repoName, branch] = resourceId.split('/');
          const branchInfo = await this.makeToolRequest(toolClient, `/repos/${owner}/${repoName}/branches/${branch}`);
          context.tool_context = {
            branch_name: branchInfo.name,
            is_protected: branchInfo.protected,
            commit_sha: branchInfo.commit?.sha
          };
          context.environment = ['main', 'master', 'prod'].includes(branch) ? 'production' : 'development';
          break;
      }
    } catch (error) {
      this.fastify.log.debug(`GitHub context retrieval failed: ${error.message}`);
    }

    return context;
  }

  async getGitLabContext(resourceType, resourceId, toolClient) {
    const context = {
      tool_context: {}
    };

    try {
      switch (resourceType) {
        case 'project':
          const project = await this.makeToolRequest(toolClient, `/projects/${resourceId}`);
          context.tool_context = {
            project_name: project.name,
            project_path: project.path_with_namespace,
            visibility: project.visibility,
            is_fork: project.forked_from_project !== null,
            default_branch: project.default_branch,
            archived: project.archived
          };
          context.environment = project.name.includes('prod') ? 'production' : 'development';
          break;

        case 'group':
          const group = await this.makeToolRequest(toolClient, `/groups/${resourceId}`);
          context.tool_context = {
            group_name: group.name,
            group_path: group.full_path,
            visibility: group.visibility,
            project_count: group.projects?.length || 0
          };
          break;
      }
    } catch (error) {
      this.fastify.log.debug(`GitLab context retrieval failed: ${error.message}`);
    }

    return context;
  }

  async getJenkinsContext(resourceType, resourceId, toolClient) {
    const context = {
      tool_context: {}
    };

    try {
      switch (resourceType) {
        case 'job':
          const job = await this.makeToolRequest(toolClient, `/job/${resourceId}/api/json`);
          context.tool_context = {
            job_name: job.name,
            job_type: job._class,
            buildable: job.buildable,
            last_build: job.lastBuild?.number,
            last_successful_build: job.lastSuccessfulBuild?.number,
            in_queue: job.inQueue
          };
          context.environment = resourceId.includes('prod') ? 'production' : 'development';
          break;

        case 'folder':
          const folder = await this.makeToolRequest(toolClient, `/job/${resourceId}/api/json`);
          context.tool_context = {
            folder_name: folder.name,
            job_count: folder.jobs?.length || 0
          };
          break;
      }
    } catch (error) {
      this.fastify.log.debug(`Jenkins context retrieval failed: ${error.message}`);
    }

    return context;
  }

  async getArgoCDContext(resourceType, resourceId, toolClient) {
    const context = {
      tool_context: {}
    };

    try {
      switch (resourceType) {
        case 'application':
          const app = await this.makeToolRequest(toolClient, `/applications/${resourceId}`);
          context.tool_context = {
            app_name: app.metadata?.name,
            namespace: app.spec?.destination?.namespace,
            cluster: app.spec?.destination?.server,
            sync_status: app.status?.sync?.status,
            health_status: app.status?.health?.status,
            auto_sync: app.spec?.syncPolicy?.automated !== null
          };
          context.environment = app.spec?.destination?.namespace?.includes('prod') ? 'production' : 'development';
          break;

        case 'cluster':
          const cluster = await this.makeToolRequest(toolClient, `/clusters/${resourceId}`);
          context.tool_context = {
            cluster_name: cluster.name,
            server_url: cluster.server,
            connection_status: cluster.connectionState?.status
          };
          break;
      }
    } catch (error) {
      this.fastify.log.debug(`ArgoCD context retrieval failed: ${error.message}`);
    }

    return context;
  }

  async getTerraformContext(resourceType, resourceId, toolClient) {
    const context = {
      tool_context: {}
    };

    try {
      switch (resourceType) {
        case 'workspace':
          const workspace = await this.makeToolRequest(toolClient, `/workspaces/${resourceId}`);
          context.tool_context = {
            workspace_name: workspace.data?.attributes?.name,
            terraform_version: workspace.data?.attributes?.terraformVersion,
            working_directory: workspace.data?.attributes?.workingDirectory,
            auto_apply: workspace.data?.attributes?.autoApply,
            execution_mode: workspace.data?.attributes?.executionMode
          };
          context.environment = workspace.data?.attributes?.name?.includes('prod') ? 'production' : 'development';
          break;

        case 'organization':
          const org = await this.makeToolRequest(toolClient, `/organizations/${resourceId}`);
          context.tool_context = {
            organization_name: org.data?.attributes?.name,
            workspace_count: org.data?.attributes?.workspaceCount || 0
          };
          break;
      }
    } catch (error) {
      this.fastify.log.debug(`Terraform context retrieval failed: ${error.message}`);
    }

    return context;
  }

  async getSonarQubeContext(resourceType, resourceId, toolClient) {
    const context = {
      tool_context: {}
    };

    try {
      switch (resourceType) {
        case 'project':
          const project = await this.makeToolRequest(toolClient, `/projects/show?project=${resourceId}`);
          context.tool_context = {
            project_key: project.component?.key,
            project_name: project.component?.name,
            qualifier: project.component?.qualifier,
            visibility: project.component?.visibility
          };
          break;

        case 'component':
          const component = await this.makeToolRequest(toolClient, `/components/show?component=${resourceId}`);
          context.tool_context = {
            component_key: component.component?.key,
            component_name: component.component?.name,
            language: component.component?.language,
            qualifier: component.component?.qualifier
          };
          break;
      }
    } catch (error) {
      this.fastify.log.debug(`SonarQube context retrieval failed: ${error.message}`);
    }

    return context;
  }

  async getGrafanaContext(resourceType, resourceId, toolClient) {
    const context = {
      tool_context: {}
    };

    try {
      switch (resourceType) {
        case 'dashboard':
          const dashboard = await this.makeToolRequest(toolClient, `/dashboards/uid/${resourceId}`);
          context.tool_context = {
            dashboard_title: dashboard.dashboard?.title,
            dashboard_uid: dashboard.dashboard?.uid,
            folder_id: dashboard.meta?.folderId,
            is_starred: dashboard.meta?.isStarred,
            tags: dashboard.dashboard?.tags || []
          };
          break;

        case 'folder':
          const folder = await this.makeToolRequest(toolClient, `/folders/${resourceId}`);
          context.tool_context = {
            folder_title: folder.title,
            folder_uid: folder.uid,
            can_admin: folder.canAdmin,
            can_edit: folder.canEdit
          };
          break;
      }
    } catch (error) {
      this.fastify.log.debug(`Grafana context retrieval failed: ${error.message}`);
    }

    return context;
  }

  async getPrometheusContext(resourceType, resourceId, toolClient) {
    const context = {
      tool_context: {}
    };

    try {
      switch (resourceType) {
        case 'metric':
          // For Prometheus, we might query metadata about the metric
          const metadata = await this.makeToolRequest(toolClient, `/metadata?metric=${resourceId}`);
          context.tool_context = {
            metric_name: resourceId,
            metric_type: metadata.data?.[resourceId]?.[0]?.type,
            help: metadata.data?.[resourceId]?.[0]?.help
          };
          break;

        case 'rule':
          const rules = await this.makeToolRequest(toolClient, '/rules');
          const rule = this.findRuleById(rules.data?.groups, resourceId);
          if (rule) {
            context.tool_context = {
              rule_name: rule.name,
              rule_type: rule.type,
              group: rule.group
            };
          }
          break;
      }
    } catch (error) {
      this.fastify.log.debug(`Prometheus context retrieval failed: ${error.message}`);
    }

    return context;
  }

  async getKibanaContext(resourceType, resourceId, toolClient) {
    const context = {
      tool_context: {}
    };

    try {
      switch (resourceType) {
        case 'index':
          const indexPattern = await this.makeToolRequest(toolClient, `/saved_objects/index-pattern/${resourceId}`);
          context.tool_context = {
            index_pattern: indexPattern.attributes?.title,
            time_field: indexPattern.attributes?.timeFieldName,
            field_count: indexPattern.attributes?.fields?.length || 0
          };
          break;

        case 'dashboard':
          const dashboard = await this.makeToolRequest(toolClient, `/saved_objects/dashboard/${resourceId}`);
          context.tool_context = {
            dashboard_title: dashboard.attributes?.title,
            description: dashboard.attributes?.description,
            panel_count: dashboard.attributes?.panelsJSON ? JSON.parse(dashboard.attributes.panelsJSON).length : 0
          };
          break;
      }
    } catch (error) {
      this.fastify.log.debug(`Kibana context retrieval failed: ${error.message}`);
    }

    return context;
  }

  async getSnykContext(resourceType, resourceId, toolClient) {
    const context = {
      tool_context: {}
    };

    try {
      switch (resourceType) {
        case 'project':
          const project = await this.makeToolRequest(toolClient, `/projects/${resourceId}`);
          context.tool_context = {
            project_name: project.name,
            project_type: project.type,
            origin: project.origin,
            branch: project.branch,
            issue_count: project.issueCountsBySeverity
          };
          break;

        case 'organization':
          const org = await this.makeToolRequest(toolClient, `/orgs/${resourceId}`);
          context.tool_context = {
            organization_name: org.name,
            organization_slug: org.slug,
            group_id: org.group?.id
          };
          break;
      }
    } catch (error) {
      this.fastify.log.debug(`Snyk context retrieval failed: ${error.message}`);
    }

    return context;
  }

  async getJiraContext(resourceType, resourceId, toolClient) {
    const context = {
      tool_context: {}
    };

    try {
      switch (resourceType) {
        case 'project':
          const project = await this.makeToolRequest(toolClient, `/project/${resourceId}`);
          context.tool_context = {
            project_key: project.key,
            project_name: project.name,
            project_type: project.projectTypeKey,
            lead: project.lead?.displayName,
            archived: project.archived
          };
          break;

        case 'issue':
          const issue = await this.makeToolRequest(toolClient, `/issue/${resourceId}`);
          context.tool_context = {
            issue_key: issue.key,
            issue_type: issue.fields?.issuetype?.name,
            status: issue.fields?.status?.name,
            priority: issue.fields?.priority?.name,
            project_key: issue.fields?.project?.key,
            assignee: issue.fields?.assignee?.displayName
          };
          break;
      }
    } catch (error) {
      this.fastify.log.debug(`Jira context retrieval failed: ${error.message}`);
    }

    return context;
  }

  // ============================================================================
  // TOOL CLIENT MANAGEMENT
  // ============================================================================

  createToolClient(toolSlug, config) {
    const baseConfig = {
      timeout: 10000,
      headers: {
        'User-Agent': 'SSO-Hub-Policy-Service/1.0'
      }
    };

    // Tool-specific authentication setup
    switch (toolSlug) {
      case 'github':
        baseConfig.headers['Authorization'] = `token ${config.token}`;
        baseConfig.baseURL = 'https://api.github.com';
        break;

      case 'gitlab':
        baseConfig.headers['Authorization'] = `Bearer ${config.token}`;
        baseConfig.baseURL = `${config.base_url}/api/v4`;
        break;

      case 'jenkins':
        baseConfig.auth = {
          username: config.username,
          password: config.token
        };
        baseConfig.baseURL = config.base_url;
        break;

      case 'argocd':
        baseConfig.headers['Authorization'] = `Bearer ${config.token}`;
        baseConfig.baseURL = `${config.base_url}/api/v1`;
        break;

      case 'terraform':
        baseConfig.headers['Authorization'] = `Bearer ${config.token}`;
        baseConfig.baseURL = 'https://app.terraform.io/api/v2';
        break;

      case 'sonarqube':
        baseConfig.auth = {
          username: config.token,
          password: ''
        };
        baseConfig.baseURL = `${config.base_url}/api`;
        break;

      case 'grafana':
        baseConfig.headers['Authorization'] = `Bearer ${config.token}`;
        baseConfig.baseURL = `${config.base_url}/api`;
        break;

      case 'prometheus':
        baseConfig.baseURL = `${config.base_url}/api/v1`;
        break;

      case 'kibana':
        baseConfig.headers['Authorization'] = `ApiKey ${config.api_key}`;
        baseConfig.baseURL = `${config.base_url}/api`;
        break;

      case 'snyk':
        baseConfig.headers['Authorization'] = `token ${config.token}`;
        baseConfig.baseURL = 'https://api.snyk.io/v1';
        break;

      case 'jira':
        baseConfig.auth = {
          username: config.username,
          password: config.token
        };
        baseConfig.baseURL = `${config.base_url}/rest/api/2`;
        break;
    }

    return axios.create(baseConfig);
  }

  async makeToolRequest(toolClient, endpoint, options = {}) {
    try {
      const response = await toolClient.client.get(endpoint, options);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  async loadToolConfigurations() {
    const query = `
      SELECT tool_slug, configuration 
      FROM tool_policy_configs 
      WHERE enabled = true AND config_type = 'access_control'
    `;
    
    const result = await this.fastify.pg.query(query);
    const configurations = {};
    
    for (const row of result.rows) {
      configurations[row.tool_slug] = row.configuration;
    }
    
    // Add default configurations for tools without specific config
    const defaultConfigs = this.getDefaultToolConfigurations();
    for (const [toolSlug, defaultConfig] of Object.entries(defaultConfigs)) {
      if (!configurations[toolSlug]) {
        configurations[toolSlug] = defaultConfig;
      }
    }
    
    return configurations;
  }

  getDefaultToolConfigurations() {
    return {
      github: {
        base_url: 'https://github.com',
        api_base_url: 'https://api.github.com',
        token: process.env.GITHUB_TOKEN || 'mock_token'
      },
      gitlab: {
        base_url: 'https://gitlab.com',
        token: process.env.GITLAB_TOKEN || 'mock_token'
      },
      jenkins: {
        base_url: process.env.JENKINS_BASE_URL || 'http://localhost:8080',
        username: process.env.JENKINS_USERNAME || 'admin',
        token: process.env.JENKINS_TOKEN || 'mock_token'
      },
      argocd: {
        base_url: process.env.ARGOCD_BASE_URL || 'http://localhost:9090',
        token: process.env.ARGOCD_TOKEN || 'mock_token'
      },
      terraform: {
        base_url: 'https://app.terraform.io',
        token: process.env.TERRAFORM_TOKEN || 'mock_token'
      },
      sonarqube: {
        base_url: process.env.SONARQUBE_BASE_URL || 'http://localhost:9000',
        token: process.env.SONARQUBE_TOKEN || 'mock_token'
      },
      grafana: {
        base_url: process.env.GRAFANA_BASE_URL || 'http://localhost:3001',
        token: process.env.GRAFANA_TOKEN || 'mock_token'
      },
      prometheus: {
        base_url: process.env.PROMETHEUS_BASE_URL || 'http://localhost:9090',
        token: process.env.PROMETHEUS_TOKEN || 'mock_token'
      },
      kibana: {
        base_url: process.env.KIBANA_BASE_URL || 'http://localhost:5601',
        api_key: process.env.KIBANA_API_KEY || 'mock_key'
      },
      snyk: {
        base_url: 'https://api.snyk.io',
        token: process.env.SNYK_TOKEN || 'mock_token'
      },
      jira: {
        base_url: process.env.JIRA_BASE_URL || 'https://your-domain.atlassian.net',
        username: process.env.JIRA_USERNAME || 'admin',
        token: process.env.JIRA_TOKEN || 'mock_token'
      }
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  findRuleById(groups, ruleId) {
    for (const group of groups || []) {
      for (const rule of group.rules || []) {
        if (rule.name === ruleId) {
          return { ...rule, group: group.name };
        }
      }
    }
    return null;
  }

  // ============================================================================
  // TOOL AVAILABILITY CHECKING
  // ============================================================================

  async checkToolAvailability(toolSlug) {
    const toolClient = this.toolClients.get(toolSlug);
    if (!toolClient) {
      return { available: false, reason: 'Tool client not configured' };
    }

    try {
      // Make a simple health check request
      const healthEndpoints = {
        github: '/user',
        gitlab: '/user',
        jenkins: '/api/json',
        argocd: '/version',
        terraform: '/account/details',
        sonarqube: '/system/status',
        grafana: '/health',
        prometheus: '/query?query=up',
        kibana: '/status',
        snyk: '/user/me',
        jira: '/myself'
      };

      const endpoint = healthEndpoints[toolSlug];
      if (!endpoint) {
        return { available: false, reason: 'No health check endpoint defined' };
      }

      await this.makeToolRequest(toolClient, endpoint);
      return { available: true, last_checked: new Date() };
    } catch (error) {
      return { 
        available: false, 
        reason: error.message,
        status_code: error.response?.status,
        last_checked: new Date()
      };
    }
  }

  async getToolsStatus() {
    const status = {};
    
    for (const toolSlug of this.toolClients.keys()) {
      status[toolSlug] = await this.checkToolAvailability(toolSlug);
    }
    
    return status;
  }
}

module.exports = ToolIntegrationManager;
