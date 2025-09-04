/**
 * GitLab Provisioner - Phase 9
 * Handles provisioning of GitLab resources (projects, groups, users)
 */

const BaseProvisioner = require('./base-provisioner');
const axios = require('axios');

class GitLabProvisioner extends BaseProvisioner {
  constructor(config, fastify) {
    super('gitlab', config, fastify);
    
    // GitLab-specific supported resources
    this.supportedResourceTypes = [
      'project',
      'group',
      'user',
      'webhook',
      'pipeline',
      'merge_request_approval',
      'deploy_key',
      'variable'
    ];
    
    this.apiClient = null;
    this.baseUrl = this.toolConfig.api_base_url || 'https://gitlab.com/api/v4';
  }

  /**
   * Initialize GitLab API client
   */
  async initializeApiClient() {
    const credentials = await this.getCredentials();
    
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${credentials.token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Validate connection to GitLab API
   */
  async validateConnection() {
    try {
      const credentials = await this.getCredentials();
      
      // Skip validation if using mock credentials (for demo purposes)
      if (credentials.token === 'mock_gitlab_token') {
        this.logger.warn('GitLab provisioner using mock credentials - skipping connection validation');
        return { username: 'mock_user', id: 12345 };
      }
      
      const response = await this.apiClient.get('/user');
      this.logger.info(`Connected to GitLab as: ${response.data.username}`);
      return response.data;
    } catch (error) {
      this.logger.warn(`GitLab connection validation failed: ${error.message}`);
      // Don't throw error during initialization - allow service to start
      return { username: 'validation_failed', id: 0 };
    }
  }

  /**
   * Create GitLab resource
   */
  async createResource(resourceType, config, variables) {
    const mergedConfig = this.applyTemplateVariables(config, variables);
    
    switch (resourceType) {
      case 'project':
        return await this.createProject(mergedConfig, variables);
      
      case 'group':
        return await this.createGroup(mergedConfig, variables);
      
      case 'webhook':
        return await this.createWebhook(mergedConfig, variables);
      
      case 'pipeline':
        return await this.createPipeline(mergedConfig, variables);
      
      default:
        throw new Error(`Unsupported GitLab resource type: ${resourceType}`);
    }
  }

  /**
   * Create GitLab project
   */
  async createProject(config, variables) {
    try {
      const projectName = this.generateResourceName(config.name, config.naming_convention);
      const projectPath = config.path || projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      const createParams = {
        name: projectName,
        path: projectPath,
        description: config.description || `Project created via SSO Hub`,
        visibility: config.visibility || 'private',
        issues_enabled: config.issues_enabled !== false,
        merge_requests_enabled: config.merge_requests_enabled !== false,
        wiki_enabled: config.wiki_enabled === true,
        snippets_enabled: config.snippets_enabled !== false,
        ci_enabled: config.ci_enabled !== false,
        default_branch: config.default_branch || 'main',
        initialize_with_readme: config.initialize_with_readme === true,
        namespace_id: config.namespace_id
      };

      const response = await this.apiClient.post('/projects', createParams);
      const project = response.data;
      
      await this.logActivity('project_created', 'project', project.path_with_namespace, {
        visibility: project.visibility,
        namespace: project.namespace.name
      });

      // Set up additional configuration
      if (config.topics && config.topics.length > 0) {
        await this.setProjectTopics(project.id, config.topics);
      }

      if (config.merge_request_approval_rules) {
        await this.setupMergeRequestApprovals(project.id, config.merge_request_approval_rules);
      }

      if (config.ci_cd_template) {
        await this.setupCICDTemplate(project.id, config.ci_cd_template);
      }

      return {
        resource_id: project.id.toString(),
        resource_name: project.path_with_namespace,
        external_id: project.id.toString(),
        external_url: project.web_url,
        resource_data: project,
        rollback_data: this.generateRollbackData('create', 'project', {
          id: project.id,
          path_with_namespace: project.path_with_namespace
        })
      };
    } catch (error) {
      throw new Error(`Failed to create GitLab project: ${error.message}`);
    }
  }

  /**
   * Create GitLab group
   */
  async createGroup(config, variables) {
    try {
      const groupName = this.generateResourceName(config.name, config.naming_convention);
      const groupPath = config.path || groupName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      const createParams = {
        name: groupName,
        path: groupPath,
        description: config.description || `Group created via SSO Hub`,
        visibility: config.visibility || 'private',
        parent_id: config.parent_id
      };

      const response = await this.apiClient.post('/groups', createParams);
      const group = response.data;
      
      await this.logActivity('group_created', 'group', group.full_path, {
        visibility: group.visibility
      });

      return {
        resource_id: group.id.toString(),
        resource_name: group.full_path,
        external_id: group.id.toString(),
        external_url: group.web_url,
        resource_data: group,
        rollback_data: this.generateRollbackData('create', 'group', {
          id: group.id,
          full_path: group.full_path
        })
      };
    } catch (error) {
      throw new Error(`Failed to create GitLab group: ${error.message}`);
    }
  }

  /**
   * Create GitLab webhook
   */
  async createWebhook(config, variables) {
    try {
      const webhookConfig = {
        url: config.url,
        push_events: config.push_events !== false,
        issues_events: config.issues_events === true,
        merge_requests_events: config.merge_requests_events === true,
        tag_push_events: config.tag_push_events === true,
        note_events: config.note_events === true,
        job_events: config.job_events === true,
        pipeline_events: config.pipeline_events === true,
        wiki_page_events: config.wiki_page_events === true,
        deployment_events: config.deployment_events === true,
        releases_events: config.releases_events === true,
        enable_ssl_verification: config.enable_ssl_verification !== false,
        token: config.secret
      };

      const response = await this.apiClient.post(`/projects/${config.project_id}/hooks`, webhookConfig);
      const webhook = response.data;

      await this.logActivity('webhook_created', 'webhook', webhook.id.toString(), {
        project_id: config.project_id,
        url: webhook.url
      });

      return {
        resource_id: webhook.id.toString(),
        resource_name: `webhook-${webhook.id}`,
        external_id: webhook.id.toString(),
        external_url: webhook.url,
        resource_data: webhook,
        rollback_data: this.generateRollbackData('create', 'webhook', {
          id: webhook.id,
          project_id: config.project_id
        })
      };
    } catch (error) {
      throw new Error(`Failed to create GitLab webhook: ${error.message}`);
    }
  }

  /**
   * Delete GitLab resource
   */
  async deleteResource(resourceType, config, variables) {
    const mergedConfig = this.applyTemplateVariables(config, variables);
    
    switch (resourceType) {
      case 'project':
        return await this.deleteProject(mergedConfig, variables);
      
      case 'group':
        return await this.deleteGroup(mergedConfig, variables);
      
      case 'webhook':
        return await this.deleteWebhook(mergedConfig, variables);
      
      default:
        throw new Error(`Delete not supported for GitLab resource type: ${resourceType}`);
    }
  }

  /**
   * Delete GitLab project
   */
  async deleteProject(config, variables) {
    try {
      // Get project data before deletion for rollback
      const projectResponse = await this.apiClient.get(`/projects/${config.project_id}`);
      const projectData = projectResponse.data;

      await this.apiClient.delete(`/projects/${config.project_id}`);

      await this.logActivity('project_deleted', 'project', projectData.path_with_namespace);

      return {
        resource_id: projectData.id.toString(),
        resource_name: projectData.path_with_namespace,
        external_id: projectData.id.toString(),
        resource_data: { deleted: true },
        rollback_data: this.generateRollbackData('delete', 'project', null, projectData)
      };
    } catch (error) {
      throw new Error(`Failed to delete GitLab project: ${error.message}`);
    }
  }

  /**
   * List GitLab resources
   */
  async listResources(resourceType, config, variables) {
    switch (resourceType) {
      case 'project':
        return await this.listProjects(config, variables);
      
      case 'group':
        return await this.listGroups(config, variables);
      
      default:
        throw new Error(`List not supported for GitLab resource type: ${resourceType}`);
    }
  }

  /**
   * List GitLab projects
   */
  async listProjects(config, variables) {
    try {
      const params = {
        owned: config.owned || false,
        membership: config.membership || false,
        starred: config.starred || false,
        visibility: config.visibility || 'all',
        order_by: config.order_by || 'updated_at',
        sort: config.sort || 'desc',
        per_page: config.per_page || 20
      };

      const response = await this.apiClient.get('/projects', { params });

      return {
        resources: response.data.map(project => ({
          resource_id: project.id.toString(),
          resource_name: project.path_with_namespace,
          external_id: project.id.toString(),
          external_url: project.web_url,
          resource_data: project
        })),
        total_count: response.data.length
      };
    } catch (error) {
      throw new Error(`Failed to list GitLab projects: ${error.message}`);
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Set project topics
   */
  async setProjectTopics(projectId, topics) {
    try {
      await this.apiClient.put(`/projects/${projectId}`, {
        topics: topics
      });
    } catch (error) {
      this.logger.warn(`Failed to set project topics: ${error.message}`);
    }
  }

  /**
   * Setup merge request approval rules
   */
  async setupMergeRequestApprovals(projectId, approvalRules) {
    try {
      for (const rule of approvalRules) {
        await this.apiClient.post(`/projects/${projectId}/merge_request_approval_rules`, {
          name: rule.name,
          approvals_required: rule.approvals_required || 1,
          user_ids: rule.user_ids || [],
          group_ids: rule.group_ids || []
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to setup merge request approvals: ${error.message}`);
    }
  }

  /**
   * Setup CI/CD template
   */
  async setupCICDTemplate(projectId, template) {
    try {
      const ciContent = this.generateCITemplate(template);
      
      await this.apiClient.post(`/projects/${projectId}/repository/files/.gitlab-ci.yml`, {
        branch: 'main',
        content: ciContent,
        commit_message: 'Add CI/CD pipeline via SSO Hub'
      });
    } catch (error) {
      this.logger.warn(`Failed to setup CI/CD template: ${error.message}`);
    }
  }

  /**
   * Generate CI template content
   */
  generateCITemplate(template) {
    const templates = {
      nodejs: `stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: node:16
  script:
    - npm ci
    - npm test

build:
  stage: build
  image: node:16
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/`,
      
      python: `stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: python:3.9
  script:
    - pip install -r requirements.txt
    - python -m pytest`,
      
      default: `stages:
  - test
  - build
  - deploy

test:
  stage: test
  script:
    - echo "Add your test commands here"`
    };

    return templates[template.type] || templates.default;
  }

  /**
   * Get credentials for GitLab
   */
  async getCredentials() {
    // In a real implementation, this would decrypt credentials from the database
    return {
      token: process.env.GITLAB_TOKEN || 'mock_gitlab_token'
    };
  }
}

module.exports = GitLabProvisioner;
