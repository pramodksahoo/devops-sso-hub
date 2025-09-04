/**
 * GitHub Sync Engine - Phase 10
 * Handles LDAP synchronization with GitHub organizations and teams
 */

const BaseToolSync = require('./base-tool-sync');
const { Octokit } = require('@octokit/rest');

class GitHubSync extends BaseToolSync {
  constructor(config, fastify) {
    super('github', config, fastify);
    
    this.octokit = null;
    this.organization = null; // Target GitHub organization
    
    // GitHub-specific sync capabilities
    this.supportedSyncTypes = ['users', 'teams'];
    this.supportedOperations = ['invite', 'update', 'remove'];
    
    // GitHub role mappings
    this.githubRoles = ['member', 'admin'];
    this.teamRoles = ['member', 'maintainer'];
  }

  /**
   * Initialize GitHub API client
   */
  async initializeApiClient() {
    const credentials = await this.getCredentials();
    
    this.octokit = new Octokit({
      auth: credentials.token,
      baseUrl: this.toolConfig.api_base_url || 'https://api.github.com',
      userAgent: 'SSO-Hub-LDAP-Sync/1.0.0',
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
    
    // Set default organization if configured
    this.organization = process.env.GITHUB_ORGANIZATION || 'demo-org';
  }

  /**
   * Validate GitHub connection
   */
  async validateToolConnection() {
    try {
      const credentials = await this.getCredentials();
      
      // Skip validation if using mock credentials
      if (credentials.token === 'mock_github_token') {
        this.logger.warn('GitHub sync engine using mock credentials - skipping connection validation');
        return { login: 'mock_user', organization: this.organization };
      }
      
      const response = await this.octokit.rest.users.getAuthenticated();
      this.logger.info(`Connected to GitHub as: ${response.data.login}`);
      
      // Verify organization access
      if (this.organization) {
        try {
          const orgResponse = await this.octokit.rest.orgs.get({
            org: this.organization
          });
          this.logger.info(`Verified access to GitHub organization: ${orgResponse.data.login}`);
        } catch (error) {
          this.logger.warn(`Cannot access GitHub organization ${this.organization}:`, error.message);
        }
      }
      
      return response.data;
    } catch (error) {
      this.logger.warn(`GitHub connection validation failed: ${error.message}`);
      return { login: 'validation_failed', organization: this.organization };
    }
  }

  /**
   * Set default role mappings for GitHub
   */
  setDefaultRoleMappings() {
    // LDAP group -> GitHub organization role
    this.roleMapping.set('github-admins', { type: 'org_role', role: 'admin' });
    this.roleMapping.set('github-members', { type: 'org_role', role: 'member' });
    this.roleMapping.set('developers', { type: 'org_role', role: 'member' });
    
    // LDAP group -> GitHub team mappings
    this.roleMapping.set('devops-team', { type: 'team', team: 'devops', role: 'maintainer' });
    this.roleMapping.set('frontend-team', { type: 'team', team: 'frontend', role: 'member' });
    this.roleMapping.set('backend-team', { type: 'team', team: 'backend', role: 'member' });
    
    // Default role for users without specific mappings
    this.defaultRoles.set('user', { type: 'org_role', role: 'member' });
  }

  /**
   * Get all users from GitHub organization
   */
  async getToolUsers() {
    try {
      if (!this.organization) {
        return [];
      }
      
      await this.applyRateLimit();
      
      const response = await this.octokit.rest.orgs.listMembers({
        org: this.organization,
        per_page: 100
      });
      
      return response.data.map(user => ({
        id: user.id,
        login: user.login,
        email: user.email || '',
        type: user.type,
        site_admin: user.site_admin,
        organization_role: 'member' // Default, would need separate API call for exact role
      }));
    } catch (error) {
      this.logger.error('Failed to get GitHub users:', error);
      return [];
    }
  }

  /**
   * Get all teams from GitHub organization
   */
  async getToolGroups() {
    try {
      if (!this.organization) {
        return [];
      }
      
      await this.applyRateLimit();
      
      const response = await this.octokit.rest.teams.list({
        org: this.organization,
        per_page: 100
      });
      
      const teams = [];
      
      for (const team of response.data) {
        // Get team members
        const membersResponse = await this.octokit.rest.teams.listMembersInOrg({
          org: this.organization,
          team_slug: team.slug,
          per_page: 100
        });
        
        teams.push({
          id: team.id,
          name: team.name,
          slug: team.slug,
          description: team.description,
          privacy: team.privacy,
          permission: team.permission,
          members: membersResponse.data.map(member => ({
            id: member.id,
            login: member.login,
            role: 'member' // Would need separate call for exact role
          })),
          member_count: membersResponse.data.length
        });
      }
      
      return teams;
    } catch (error) {
      this.logger.error('Failed to get GitHub teams:', error);
      return [];
    }
  }

  /**
   * Get user identifier for matching
   */
  getUserIdentifier(toolUser) {
    return toolUser.login.toLowerCase();
  }

  /**
   * Get group identifier for matching
   */
  getGroupIdentifier(toolGroup) {
    return toolGroup.slug;
  }

  /**
   * Map LDAP user identifier to GitHub format
   */
  mapLDAPUserIdentifier(ldapUser) {
    // Use email prefix as GitHub username
    return ldapUser.email.split('@')[0].toLowerCase();
  }

  /**
   * Map LDAP group identifier to GitHub format
   */
  mapLDAPGroupIdentifier(ldapGroup) {
    // Convert group name to GitHub team slug format
    return ldapGroup.group_name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  /**
   * Map LDAP user to GitHub format
   */
  async mapLDAPUserToTool(ldapUser) {
    return {
      username: this.mapLDAPUserIdentifier(ldapUser),
      email: ldapUser.email,
      name: ldapUser.display_name,
      role: this.mapUserRole(ldapUser),
      teams: this.mapUserTeams(ldapUser)
    };
  }

  /**
   * Map LDAP group to GitHub team format
   */
  async mapLDAPGroupToTool(ldapGroup) {
    return {
      name: ldapGroup.group_name,
      slug: this.mapLDAPGroupIdentifier(ldapGroup),
      description: ldapGroup.description || `Team synced from LDAP group: ${ldapGroup.group_name}`,
      privacy: 'closed', // Default to closed teams
      permission: 'pull' // Default permission
    };
  }

  /**
   * Map user role based on LDAP groups
   */
  mapUserRole(ldapUser) {
    // Check LDAP groups against role mappings
    for (const ldapGroup of ldapUser.ldap_groups) {
      const mapping = this.roleMapping.get(ldapGroup.toLowerCase());
      if (mapping && mapping.type === 'org_role') {
        return mapping.role;
      }
    }
    
    // Return default role
    return this.defaultRoles.get('user')?.role || 'member';
  }

  /**
   * Map user teams based on LDAP groups
   */
  mapUserTeams(ldapUser) {
    const teams = [];
    
    for (const ldapGroup of ldapUser.ldap_groups) {
      const mapping = this.roleMapping.get(ldapGroup.toLowerCase());
      if (mapping && mapping.type === 'team') {
        teams.push({
          team: mapping.team,
          role: mapping.role || 'member'
        });
      }
    }
    
    return teams;
  }

  /**
   * Detect changes between LDAP user and GitHub user
   */
  async detectUserChanges(ldapUser, toolUser) {
    const changes = [];
    
    const mappedUser = await this.mapLDAPUserToTool(ldapUser);
    
    // Check role changes
    if (mappedUser.role !== toolUser.organization_role) {
      changes.push({
        field: 'organization_role',
        current_value: toolUser.organization_role,
        new_value: mappedUser.role,
        change_type: 'role_update'
      });
    }
    
    // Check team membership changes
    // This would require getting current team memberships and comparing
    // Simplified for demo
    if (mappedUser.teams.length > 0) {
      changes.push({
        field: 'team_memberships',
        current_value: [], // Would get actual teams
        new_value: mappedUser.teams,
        change_type: 'team_membership_update'
      });
    }
    
    return changes;
  }

  /**
   * Detect changes between LDAP group and GitHub team
   */
  async detectGroupChanges(ldapGroup, toolGroup) {
    const changes = [];
    
    const mappedGroup = await this.mapLDAPGroupToTool(ldapGroup);
    
    // Check description changes
    if (mappedGroup.description !== toolGroup.description) {
      changes.push({
        field: 'description',
        current_value: toolGroup.description,
        new_value: mappedGroup.description,
        change_type: 'description_update'
      });
    }
    
    return changes;
  }

  /**
   * Sync users with GitHub
   */
  async syncUsers(ldapUsers, syncConfig, results, isPreview) {
    this.logger.info(`Syncing ${ldapUsers.length} users to GitHub organization: ${this.organization}`);
    
    if (!this.organization) {
      throw new Error('GitHub organization not configured');
    }
    
    for (const ldapUser of ldapUsers) {
      try {
        results.users.processed++;
        
        const mappedUser = await this.mapLDAPUserToTool(ldapUser);
        
        if (!isPreview) {
          await this.syncSingleUser(ldapUser, mappedUser, syncConfig);
        }
        
        results.users.created++; // Simplified - would track actual action
        
        this.emit('user_synced', {
          ldap_user: ldapUser,
          tool_user: mappedUser,
          action: 'invite'
        });
        
      } catch (error) {
        results.users.failed++;
        results.errors.push({
          type: 'user_sync_error',
          user: ldapUser.email,
          error: error.message
        });
        
        this.logger.error(`Failed to sync user ${ldapUser.email} to GitHub:`, error);
      }
    }
  }

  /**
   * Sync single user with GitHub
   */
  async syncSingleUser(ldapUser, mappedUser, syncConfig) {
    try {
      await this.applyRateLimit();
      
      // Invite user to organization
      await this.octokit.rest.orgs.createInvitation({
        org: this.organization,
        email: ldapUser.email,
        role: mappedUser.role
      });
      
      this.logger.info(`Invited ${ldapUser.email} to GitHub organization as ${mappedUser.role}`);
      
      // Add to teams
      for (const teamMapping of mappedUser.teams) {
        try {
          await this.octokit.rest.teams.addOrUpdateMembershipForUserInOrg({
            org: this.organization,
            team_slug: teamMapping.team,
            username: mappedUser.username,
            role: teamMapping.role
          });
          
          this.logger.info(`Added ${mappedUser.username} to team ${teamMapping.team} as ${teamMapping.role}`);
        } catch (teamError) {
          this.logger.warn(`Failed to add user to team ${teamMapping.team}:`, teamError.message);
        }
      }
      
    } catch (error) {
      if (error.status === 422 && error.message.includes('already a member')) {
        this.logger.info(`User ${ldapUser.email} is already a member of the organization`);
        return;
      }
      throw error;
    }
  }

  /**
   * Sync groups with GitHub teams
   */
  async syncGroups(ldapGroups, syncConfig, results, isPreview) {
    this.logger.info(`Syncing ${ldapGroups.length} groups to GitHub teams`);
    
    for (const ldapGroup of ldapGroups) {
      try {
        results.groups.processed++;
        
        const mappedGroup = await this.mapLDAPGroupToTool(ldapGroup);
        
        if (!isPreview) {
          await this.syncSingleGroup(ldapGroup, mappedGroup, syncConfig);
        }
        
        results.groups.created++; // Simplified - would track actual action
        
        this.emit('group_synced', {
          ldap_group: ldapGroup,
          tool_group: mappedGroup,
          action: 'create'
        });
        
      } catch (error) {
        results.groups.failed++;
        results.errors.push({
          type: 'group_sync_error',
          group: ldapGroup.group_name,
          error: error.message
        });
        
        this.logger.error(`Failed to sync group ${ldapGroup.group_name} to GitHub:`, error);
      }
    }
  }

  /**
   * Sync single group with GitHub team
   */
  async syncSingleGroup(ldapGroup, mappedGroup, syncConfig) {
    try {
      await this.applyRateLimit();
      
      // Create or update team
      await this.octokit.rest.teams.create({
        org: this.organization,
        name: mappedGroup.name,
        description: mappedGroup.description,
        privacy: mappedGroup.privacy,
        permission: mappedGroup.permission
      });
      
      this.logger.info(`Created GitHub team: ${mappedGroup.name}`);
      
    } catch (error) {
      if (error.status === 422 && error.message.includes('already exists')) {
        this.logger.info(`GitHub team ${mappedGroup.name} already exists`);
        
        // Update existing team
        try {
          await this.octokit.rest.teams.updateInOrg({
            org: this.organization,
            team_slug: mappedGroup.slug,
            name: mappedGroup.name,
            description: mappedGroup.description,
            privacy: mappedGroup.privacy,
            permission: mappedGroup.permission
          });
          
          this.logger.info(`Updated GitHub team: ${mappedGroup.name}`);
        } catch (updateError) {
          this.logger.warn(`Failed to update GitHub team ${mappedGroup.name}:`, updateError.message);
        }
        
        return;
      }
      throw error;
    }
  }

  /**
   * Get credentials for GitHub
   */
  async getCredentials() {
    return {
      token: this.config.TOOL_CREDENTIALS?.github_token || 'mock_github_token'
    };
  }

  /**
   * Get GitHub-specific sync status
   */
  async getSyncStatus() {
    try {
      const status = {
        tool: 'github',
        organization: this.organization,
        connected: false,
        rate_limit: null,
        last_sync: null
      };
      
      if (this.octokit) {
        // Get rate limit status
        const rateLimitResponse = await this.octokit.rest.rateLimit.get();
        status.rate_limit = rateLimitResponse.data.rate;
        status.connected = true;
      }
      
      return status;
    } catch (error) {
      this.logger.error('Failed to get GitHub sync status:', error);
      return {
        tool: 'github',
        organization: this.organization,
        connected: false,
        error: error.message
      };
    }
  }
}

module.exports = GitHubSync;
