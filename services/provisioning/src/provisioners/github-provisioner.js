/**
 * GitHub Provisioner - Phase 9
 * Handles provisioning of GitHub resources (repositories, teams, webhooks)
 */

const BaseProvisioner = require('./base-provisioner');
const { Octokit } = require('@octokit/rest');

class GitHubProvisioner extends BaseProvisioner {
  constructor(config, fastify) {
    super('github', config, fastify);
    
    // GitHub-specific supported resources
    this.supportedResourceTypes = [
      'repository',
      'team',
      'organization',
      'webhook',
      'branch_protection',
      'deploy_key',
      'secret'
    ];
    
    this.octokit = null;
  }

  /**
   * Initialize GitHub API client
   */
  async initializeApiClient() {
    const credentials = await this.getCredentials();
    
    this.octokit = new Octokit({
      auth: credentials.token,
      baseUrl: this.toolConfig.api_base_url || 'https://api.github.com',
      userAgent: 'SSO-Hub-Provisioning/1.0.0',
      throttle: {
        onRateLimit: (retryAfter, options) => {
          this.logger.warn(`GitHub rate limit exceeded. Retrying after ${retryAfter} seconds`);
          return true;
        },
        onSecondaryRateLimit: (retryAfter, options) => {
          this.logger.warn(`GitHub secondary rate limit exceeded. Retrying after ${retryAfter} seconds`);
          return true;
        }
      }
    });
  }

  /**
   * Validate connection to GitHub API
   */
  async validateConnection() {
    try {
      const credentials = await this.getCredentials();
      
      // Skip validation if using mock credentials (for demo purposes)
      if (credentials.token === 'mock_github_token') {
        this.logger.warn('GitHub provisioner using mock credentials - skipping connection validation');
        return { login: 'mock_user', id: 12345 };
      }
      
      const response = await this.octokit.rest.users.getAuthenticated();
      this.logger.info(`Connected to GitHub as: ${response.data.login}`);
      return response.data;
    } catch (error) {
      this.logger.warn(`GitHub connection validation failed: ${error.message}`);
      // Don't throw error during initialization - allow service to start
      return { login: 'validation_failed', id: 0 };
    }
  }

  /**
   * Create GitHub resource
   */
  async createResource(resourceType, config, variables) {
    const mergedConfig = this.applyTemplateVariables(config, variables);
    
    switch (resourceType) {
      case 'repository':
        return await this.createRepository(mergedConfig, variables);
      
      case 'team':
        return await this.createTeam(mergedConfig, variables);
      
      case 'webhook':
        return await this.createWebhook(mergedConfig, variables);
      
      case 'branch_protection':
        return await this.createBranchProtection(mergedConfig, variables);
      
      case 'deploy_key':
        return await this.createDeployKey(mergedConfig, variables);
      
      default:
        throw new Error(`Unsupported GitHub resource type: ${resourceType}`);
    }
  }

  /**
   * Update GitHub resource
   */
  async updateResource(resourceType, config, variables) {
    const mergedConfig = this.applyTemplateVariables(config, variables);
    
    switch (resourceType) {
      case 'repository':
        return await this.updateRepository(mergedConfig, variables);
      
      case 'team':
        return await this.updateTeam(mergedConfig, variables);
      
      case 'webhook':
        return await this.updateWebhook(mergedConfig, variables);
      
      default:
        throw new Error(`Update not supported for GitHub resource type: ${resourceType}`);
    }
  }

  /**
   * Delete GitHub resource
   */
  async deleteResource(resourceType, config, variables) {
    const mergedConfig = this.applyTemplateVariables(config, variables);
    
    switch (resourceType) {
      case 'repository':
        return await this.deleteRepository(mergedConfig, variables);
      
      case 'team':
        return await this.deleteTeam(mergedConfig, variables);
      
      case 'webhook':
        return await this.deleteWebhook(mergedConfig, variables);
      
      default:
        throw new Error(`Delete not supported for GitHub resource type: ${resourceType}`);
    }
  }

  /**
   * List GitHub resources
   */
  async listResources(resourceType, config, variables) {
    switch (resourceType) {
      case 'repository':
        return await this.listRepositories(config, variables);
      
      case 'team':
        return await this.listTeams(config, variables);
      
      case 'webhook':
        return await this.listWebhooks(config, variables);
      
      default:
        throw new Error(`List not supported for GitHub resource type: ${resourceType}`);
    }
  }

  // ===== REPOSITORY OPERATIONS =====

  /**
   * Create GitHub repository
   */
  async createRepository(config, variables) {
    try {
      const repoName = this.generateResourceName(config.name, config.naming_convention);
      
      const createParams = {
        name: repoName,
        description: config.description || `Repository created via SSO Hub`,
        private: config.private !== false,
        has_issues: config.has_issues !== false,
        has_projects: config.has_projects !== false,
        has_wiki: config.has_wiki === true,
        auto_init: config.auto_init === true,
        gitignore_template: config.gitignore_template,
        license_template: config.license_template,
        allow_squash_merge: config.allow_squash_merge !== false,
        allow_merge_commit: config.allow_merge_commit !== false,
        allow_rebase_merge: config.allow_rebase_merge !== false,
        delete_branch_on_merge: config.delete_branch_on_merge === true
      };

      // Create in organization or user account
      const response = config.organization 
        ? await this.octokit.rest.repos.createInOrg({
            org: config.organization,
            ...createParams
          })
        : await this.octokit.rest.repos.createForAuthenticatedUser(createParams);

      const repo = response.data;
      
      await this.logActivity('repository_created', 'repository', repo.full_name, {
        private: repo.private,
        organization: config.organization
      });

      // Set up additional configuration
      if (config.topics && config.topics.length > 0) {
        await this.setRepositoryTopics(repo.owner.login, repo.name, config.topics);
      }

      if (config.branch_protection && repo.default_branch) {
        await this.createBranchProtection({
          owner: repo.owner.login,
          repo: repo.name,
          branch: repo.default_branch,
          ...config.branch_protection
        }, variables);
      }

      if (config.team_access && config.organization) {
        await this.setupTeamAccess(repo.owner.login, repo.name, config.team_access);
      }

      return {
        resource_id: repo.id.toString(),
        resource_name: repo.full_name,
        external_id: repo.id.toString(),
        external_url: repo.html_url,
        resource_data: repo,
        rollback_data: this.generateRollbackData('create', 'repository', {
          id: repo.id,
          name: repo.name,
          owner: repo.owner.login,
          full_name: repo.full_name
        })
      };
    } catch (error) {
      throw new Error(`Failed to create GitHub repository: ${error.message}`);
    }
  }

  /**
   * Update GitHub repository
   */
  async updateRepository(config, variables) {
    try {
      const { owner, repo: repoName } = config;
      
      // Get current repository data for rollback
      const currentRepo = await this.octokit.rest.repos.get({
        owner,
        repo: repoName
      });

      const updateParams = {
        owner,
        repo: repoName,
        name: config.new_name || repoName,
        description: config.description,
        private: config.private,
        has_issues: config.has_issues,
        has_projects: config.has_projects,
        has_wiki: config.has_wiki,
        default_branch: config.default_branch,
        allow_squash_merge: config.allow_squash_merge,
        allow_merge_commit: config.allow_merge_commit,
        allow_rebase_merge: config.allow_rebase_merge,
        delete_branch_on_merge: config.delete_branch_on_merge,
        archived: config.archived
      };

      const response = await this.octokit.rest.repos.update(updateParams);
      const updatedRepo = response.data;

      await this.logActivity('repository_updated', 'repository', updatedRepo.full_name);

      return {
        resource_id: updatedRepo.id.toString(),
        resource_name: updatedRepo.full_name,
        external_id: updatedRepo.id.toString(),
        external_url: updatedRepo.html_url,
        resource_data: updatedRepo,
        rollback_data: this.generateRollbackData('update', 'repository', updatedRepo, currentRepo.data)
      };
    } catch (error) {
      throw new Error(`Failed to update GitHub repository: ${error.message}`);
    }
  }

  /**
   * Delete GitHub repository
   */
  async deleteRepository(config, variables) {
    try {
      const { owner, repo: repoName } = config;
      
      // Get repository data before deletion for rollback
      const repoData = await this.octokit.rest.repos.get({
        owner,
        repo: repoName
      });

      await this.octokit.rest.repos.delete({
        owner,
        repo: repoName
      });

      await this.logActivity('repository_deleted', 'repository', `${owner}/${repoName}`);

      return {
        resource_id: repoData.data.id.toString(),
        resource_name: repoData.data.full_name,
        external_id: repoData.data.id.toString(),
        resource_data: { deleted: true },
        rollback_data: this.generateRollbackData('delete', 'repository', null, repoData.data)
      };
    } catch (error) {
      throw new Error(`Failed to delete GitHub repository: ${error.message}`);
    }
  }

  // ===== TEAM OPERATIONS =====

  /**
   * Create GitHub team
   */
  async createTeam(config, variables) {
    try {
      const teamName = this.generateResourceName(config.name, config.naming_convention);
      
      const response = await this.octokit.rest.teams.create({
        org: config.organization,
        name: teamName,
        description: config.description || `Team created via SSO Hub`,
        privacy: config.privacy || 'closed',
        permission: config.permission || 'pull'
      });

      const team = response.data;

      await this.logActivity('team_created', 'team', team.slug, {
        organization: config.organization,
        privacy: team.privacy
      });

      // Add members if specified
      if (config.members && config.members.length > 0) {
        await this.addTeamMembers(config.organization, team.slug, config.members);
      }

      return {
        resource_id: team.id.toString(),
        resource_name: team.slug,
        external_id: team.id.toString(),
        external_url: team.html_url,
        resource_data: team,
        rollback_data: this.generateRollbackData('create', 'team', {
          id: team.id,
          slug: team.slug,
          organization: config.organization
        })
      };
    } catch (error) {
      throw new Error(`Failed to create GitHub team: ${error.message}`);
    }
  }

  // ===== WEBHOOK OPERATIONS =====

  /**
   * Create GitHub webhook
   */
  async createWebhook(config, variables) {
    try {
      const webhookConfig = {
        url: config.url,
        content_type: config.content_type || 'json',
        secret: config.secret,
        insecure_ssl: config.insecure_ssl ? '1' : '0'
      };

      const createParams = {
        name: 'web',
        active: config.active !== false,
        events: config.events || ['push'],
        config: webhookConfig
      };

      let response;
      if (config.repository) {
        // Repository webhook
        response = await this.octokit.rest.repos.createWebhook({
          owner: config.owner,
          repo: config.repository,
          ...createParams
        });
      } else if (config.organization) {
        // Organization webhook
        response = await this.octokit.rest.orgs.createWebhook({
          org: config.organization,
          ...createParams
        });
      } else {
        throw new Error('Either repository or organization must be specified for webhook');
      }

      const webhook = response.data;

      await this.logActivity('webhook_created', 'webhook', webhook.id.toString(), {
        url: webhook.config.url,
        events: webhook.events
      });

      return {
        resource_id: webhook.id.toString(),
        resource_name: `webhook-${webhook.id}`,
        external_id: webhook.id.toString(),
        external_url: webhook.url,
        resource_data: webhook,
        rollback_data: this.generateRollbackData('create', 'webhook', {
          id: webhook.id,
          owner: config.owner,
          repository: config.repository,
          organization: config.organization
        })
      };
    } catch (error) {
      throw new Error(`Failed to create GitHub webhook: ${error.message}`);
    }
  }

  // ===== BRANCH PROTECTION OPERATIONS =====

  /**
   * Create branch protection rule
   */
  async createBranchProtection(config, variables) {
    try {
      const protectionConfig = {
        required_status_checks: config.required_status_checks ? {
          strict: config.required_status_checks.strict !== false,
          contexts: config.required_status_checks.contexts || []
        } : null,
        enforce_admins: config.enforce_admins === true,
        required_pull_request_reviews: config.required_pull_request_reviews ? {
          required_approving_review_count: config.required_pull_request_reviews.required_reviews || 1,
          dismiss_stale_reviews: config.required_pull_request_reviews.dismiss_stale_reviews === true,
          require_code_owner_reviews: config.required_pull_request_reviews.require_code_owner_reviews === true,
          required_linear_history: config.required_linear_history === true,
          allow_force_pushes: config.allow_force_pushes === true,
          allow_deletions: config.allow_deletions === true
        } : null,
        restrictions: config.restrictions || null
      };

      const response = await this.octokit.rest.repos.updateBranchProtection({
        owner: config.owner,
        repo: config.repo,
        branch: config.branch,
        ...protectionConfig
      });

      await this.logActivity('branch_protection_created', 'branch_protection', 
        `${config.owner}/${config.repo}:${config.branch}`);

      return {
        resource_id: `${config.owner}/${config.repo}:${config.branch}`,
        resource_name: `${config.repo}-${config.branch}-protection`,
        external_id: response.data.url,
        resource_data: response.data,
        rollback_data: this.generateRollbackData('create', 'branch_protection', {
          owner: config.owner,
          repo: config.repo,
          branch: config.branch
        })
      };
    } catch (error) {
      throw new Error(`Failed to create GitHub branch protection: ${error.message}`);
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Set repository topics
   */
  async setRepositoryTopics(owner, repo, topics) {
    try {
      await this.octokit.rest.repos.replaceAllTopics({
        owner,
        repo,
        names: topics
      });
    } catch (error) {
      this.logger.warn(`Failed to set repository topics: ${error.message}`);
    }
  }

  /**
   * Setup team access to repository
   */
  async setupTeamAccess(owner, repo, teamAccess) {
    try {
      for (const teamConfig of teamAccess) {
        await this.octokit.rest.teams.addOrUpdateRepoPermissionsInOrg({
          org: owner,
          team_slug: teamConfig.team,
          owner,
          repo,
          permission: teamConfig.permission || 'pull'
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to setup team access: ${error.message}`);
    }
  }

  /**
   * Add members to team
   */
  async addTeamMembers(org, teamSlug, members) {
    try {
      for (const member of members) {
        await this.octokit.rest.teams.addOrUpdateMembershipForUserInOrg({
          org,
          team_slug: teamSlug,
          username: member.username,
          role: member.role || 'member'
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to add team members: ${error.message}`);
    }
  }

  /**
   * List repositories
   */
  async listRepositories(config, variables) {
    try {
      let response;
      
      if (config.organization) {
        response = await this.octokit.rest.repos.listForOrg({
          org: config.organization,
          type: config.type || 'all',
          sort: config.sort || 'updated',
          direction: config.direction || 'desc',
          per_page: config.per_page || 30
        });
      } else {
        response = await this.octokit.rest.repos.listForAuthenticatedUser({
          visibility: config.visibility || 'all',
          sort: config.sort || 'updated',
          direction: config.direction || 'desc',
          per_page: config.per_page || 30
        });
      }

      return {
        resources: response.data.map(repo => ({
          resource_id: repo.id.toString(),
          resource_name: repo.full_name,
          external_id: repo.id.toString(),
          external_url: repo.html_url,
          resource_data: repo
        })),
        total_count: response.data.length
      };
    } catch (error) {
      throw new Error(`Failed to list GitHub repositories: ${error.message}`);
    }
  }

  /**
   * Get credentials for GitHub
   */
  async getCredentials() {
    // In a real implementation, this would decrypt credentials from the database
    // For now, return mock credentials
    return {
      token: process.env.GITHUB_TOKEN || 'mock_github_token'
    };
  }
}

module.exports = GitHubProvisioner;
