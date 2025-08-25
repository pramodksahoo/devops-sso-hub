/**
 * Base Tool Sync Engine - Phase 10
 * Abstract base class for all tool-specific LDAP sync engines
 */

const { EventEmitter } = require('events');

class BaseToolSync extends EventEmitter {
  constructor(toolSlug, config, fastify) {
    super();
    this.toolSlug = toolSlug;
    this.config = config;
    this.fastify = fastify;
    this.logger = fastify.log;
    
    // Tool-specific configuration
    this.toolConfig = this.getToolConfig();
    this.apiClient = null;
    
    // Sync capabilities
    this.supportedSyncTypes = ['users', 'groups'];
    this.supportedOperations = ['create', 'update', 'delete', 'disable'];
    
    // Role mapping capabilities
    this.roleMapping = new Map();
    this.defaultRoles = new Map();
    
    // Rate limiting
    this.rateLimiter = null;
    this.lastApiCall = 0;
    this.apiCallCount = 0;
    
    // Sync statistics
    this.syncStats = {
      users_processed: 0,
      users_created: 0,
      users_updated: 0,
      users_deleted: 0,
      users_failed: 0,
      groups_processed: 0,
      groups_created: 0,
      groups_updated: 0,
      groups_deleted: 0,
      groups_failed: 0,
      conflicts_detected: 0,
      conflicts_resolved: 0
    };
  }

  /**
   * Initialize the tool sync engine
   */
  async initialize() {
    this.logger.info(`🔧 Initializing ${this.toolSlug} sync engine...`);
    
    try {
      // Initialize API client
      await this.initializeApiClient();
      
      // Validate tool connection
      await this.validateToolConnection();
      
      // Load role mappings
      await this.loadRoleMappings();
      
      this.logger.info(`✅ ${this.toolSlug} sync engine initialized successfully`);
    } catch (error) {
      this.logger.error(`❌ Failed to initialize ${this.toolSlug} sync engine:`, error);
      throw error;
    }
  }

  /**
   * Get tool-specific configuration
   */
  getToolConfig() {
    const configKey = `${this.toolSlug.toUpperCase()}_CONFIG`;
    return this.config[configKey] || {};
  }

  /**
   * Initialize API client - to be implemented by subclasses
   */
  async initializeApiClient() {
    throw new Error('initializeApiClient must be implemented by subclass');
  }

  /**
   * Validate tool connection - to be implemented by subclasses
   */
  async validateToolConnection() {
    throw new Error('validateToolConnection must be implemented by subclass');
  }

  /**
   * Load role mappings from database
   */
  async loadRoleMappings() {
    // This would load from database - for now, set defaults
    this.setDefaultRoleMappings();
  }

  /**
   * Set default role mappings - to be implemented by subclasses
   */
  setDefaultRoleMappings() {
    // Override in subclasses
  }

  /**
   * Preview sync changes without applying them
   */
  async previewSync(ldapUsers, ldapGroups, syncConfig) {
    try {
      this.logger.info(`🔍 Previewing ${this.toolSlug} sync changes...`);
      
      const preview = {
        tool: this.toolSlug,
        users: {
          to_create: [],
          to_update: [],
          to_delete: [],
          to_disable: [],
          conflicts: []
        },
        groups: {
          to_create: [],
          to_update: [],
          to_delete: [],
          conflicts: []
        },
        role_assignments: [],
        estimated_changes: 0,
        warnings: []
      };
      
      if (syncConfig.sync_users) {
        await this.previewUserSync(ldapUsers, preview, syncConfig);
      }
      
      if (syncConfig.sync_groups) {
        await this.previewGroupSync(ldapGroups, preview, syncConfig);
      }
      
      // Calculate total estimated changes
      preview.estimated_changes = 
        preview.users.to_create.length +
        preview.users.to_update.length +
        preview.users.to_delete.length +
        preview.users.to_disable.length +
        preview.groups.to_create.length +
        preview.groups.to_update.length +
        preview.groups.to_delete.length +
        preview.role_assignments.length;
      
      this.logger.info(`🔍 Preview complete: ${preview.estimated_changes} estimated changes for ${this.toolSlug}`);
      return preview;
    } catch (error) {
      this.logger.error(`Preview sync failed for ${this.toolSlug}:`, error);
      throw error;
    }
  }

  /**
   * Preview user sync changes
   */
  async previewUserSync(ldapUsers, preview, syncConfig) {
    try {
      // Get existing tool users
      const toolUsers = await this.getToolUsers();
      const toolUserMap = new Map(toolUsers.map(user => [this.getUserIdentifier(user), user]));
      
      for (const ldapUser of ldapUsers) {
        const userIdentifier = this.mapLDAPUserIdentifier(ldapUser);
        const existingUser = toolUserMap.get(userIdentifier);
        
        if (existingUser) {
          // Check if update is needed
          const changes = await this.detectUserChanges(ldapUser, existingUser);
          if (changes.length > 0) {
            preview.users.to_update.push({
              ldap_user: ldapUser,
              tool_user: existingUser,
              changes: changes,
              action: 'update'
            });
          }
        } else {
          // New user to create
          if (syncConfig.user_create_enabled) {
            preview.users.to_create.push({
              ldap_user: ldapUser,
              action: 'create',
              mapped_data: await this.mapLDAPUserToTool(ldapUser)
            });
          }
        }
        
        // Check for conflicts
        const conflicts = await this.detectUserConflicts(ldapUser, existingUser);
        if (conflicts.length > 0) {
          preview.users.conflicts.push({
            ldap_user: ldapUser,
            tool_user: existingUser,
            conflicts: conflicts
          });
        }
      }
      
      // Check for users to delete/disable
      if (syncConfig.user_delete_enabled || syncConfig.user_disable_enabled) {
        const ldapUserIds = new Set(ldapUsers.map(user => this.mapLDAPUserIdentifier(user)));
        
        for (const toolUser of toolUsers) {
          const toolUserId = this.getUserIdentifier(toolUser);
          if (!ldapUserIds.has(toolUserId)) {
            if (syncConfig.user_delete_enabled) {
              preview.users.to_delete.push({
                tool_user: toolUser,
                action: 'delete'
              });
            } else if (syncConfig.user_disable_enabled) {
              preview.users.to_disable.push({
                tool_user: toolUser,
                action: 'disable'
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Preview user sync failed for ${this.toolSlug}:`, error);
      throw error;
    }
  }

  /**
   * Preview group sync changes
   */
  async previewGroupSync(ldapGroups, preview, syncConfig) {
    try {
      // Get existing tool groups
      const toolGroups = await this.getToolGroups();
      const toolGroupMap = new Map(toolGroups.map(group => [this.getGroupIdentifier(group), group]));
      
      for (const ldapGroup of ldapGroups) {
        const groupIdentifier = this.mapLDAPGroupIdentifier(ldapGroup);
        const existingGroup = toolGroupMap.get(groupIdentifier);
        
        if (existingGroup) {
          // Check if update is needed
          const changes = await this.detectGroupChanges(ldapGroup, existingGroup);
          if (changes.length > 0) {
            preview.groups.to_update.push({
              ldap_group: ldapGroup,
              tool_group: existingGroup,
              changes: changes,
              action: 'update'
            });
          }
        } else {
          // New group to create
          if (syncConfig.group_create_enabled) {
            preview.groups.to_create.push({
              ldap_group: ldapGroup,
              action: 'create',
              mapped_data: await this.mapLDAPGroupToTool(ldapGroup)
            });
          }
        }
        
        // Check for conflicts
        const conflicts = await this.detectGroupConflicts(ldapGroup, existingGroup);
        if (conflicts.length > 0) {
          preview.groups.conflicts.push({
            ldap_group: ldapGroup,
            tool_group: existingGroup,
            conflicts: conflicts
          });
        }
      }
      
      // Check for groups to delete
      if (syncConfig.group_delete_enabled) {
        const ldapGroupIds = new Set(ldapGroups.map(group => this.mapLDAPGroupIdentifier(group)));
        
        for (const toolGroup of toolGroups) {
          const toolGroupId = this.getGroupIdentifier(toolGroup);
          if (!ldapGroupIds.has(toolGroupId)) {
            preview.groups.to_delete.push({
              tool_group: toolGroup,
              action: 'delete'
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Preview group sync failed for ${this.toolSlug}:`, error);
      throw error;
    }
  }

  /**
   * Execute sync operation
   */
  async executeSync(ldapUsers, ldapGroups, syncConfig, isPreview = false) {
    try {
      this.logger.info(`🔄 ${isPreview ? 'Preview' : 'Executing'} ${this.toolSlug} sync...`);
      
      // Reset statistics
      this.resetSyncStats();
      
      const results = {
        tool: this.toolSlug,
        started_at: new Date(),
        completed_at: null,
        is_preview: isPreview,
        success: false,
        users: { processed: 0, created: 0, updated: 0, deleted: 0, failed: 0 },
        groups: { processed: 0, created: 0, updated: 0, deleted: 0, failed: 0 },
        conflicts: [],
        errors: [],
        warnings: []
      };
      
      try {
        if (syncConfig.sync_users) {
          await this.syncUsers(ldapUsers, syncConfig, results, isPreview);
        }
        
        if (syncConfig.sync_groups) {
          await this.syncGroups(ldapGroups, syncConfig, results, isPreview);
        }
        
        results.success = true;
        results.completed_at = new Date();
        
        this.logger.info(`✅ ${this.toolSlug} sync ${isPreview ? 'preview' : 'execution'} completed successfully`);
      } catch (error) {
        results.success = false;
        results.completed_at = new Date();
        results.errors.push(error.message);
        
        this.logger.error(`❌ ${this.toolSlug} sync ${isPreview ? 'preview' : 'execution'} failed:`, error);
        throw error;
      }
      
      return results;
    } catch (error) {
      this.logger.error(`Sync execution failed for ${this.toolSlug}:`, error);
      throw error;
    }
  }

  /**
   * Sync users with tool
   */
  async syncUsers(ldapUsers, syncConfig, results, isPreview) {
    // To be implemented by subclasses
    this.logger.info(`Syncing ${ldapUsers.length} users to ${this.toolSlug}`);
  }

  /**
   * Sync groups with tool
   */
  async syncGroups(ldapGroups, syncConfig, results, isPreview) {
    // To be implemented by subclasses
    this.logger.info(`Syncing ${ldapGroups.length} groups to ${this.toolSlug}`);
  }

  // ===== ABSTRACT METHODS TO BE IMPLEMENTED BY SUBCLASSES =====

  /**
   * Get all users from the tool
   */
  async getToolUsers() {
    throw new Error('getToolUsers must be implemented by subclass');
  }

  /**
   * Get all groups from the tool
   */
  async getToolGroups() {
    throw new Error('getToolGroups must be implemented by subclass');
  }

  /**
   * Get user identifier for matching
   */
  getUserIdentifier(toolUser) {
    throw new Error('getUserIdentifier must be implemented by subclass');
  }

  /**
   * Get group identifier for matching
   */
  getGroupIdentifier(toolGroup) {
    throw new Error('getGroupIdentifier must be implemented by subclass');
  }

  /**
   * Map LDAP user identifier to tool format
   */
  mapLDAPUserIdentifier(ldapUser) {
    // Default implementation uses email
    return ldapUser.email;
  }

  /**
   * Map LDAP group identifier to tool format
   */
  mapLDAPGroupIdentifier(ldapGroup) {
    // Default implementation uses group name
    return ldapGroup.group_name;
  }

  /**
   * Map LDAP user to tool format
   */
  async mapLDAPUserToTool(ldapUser) {
    throw new Error('mapLDAPUserToTool must be implemented by subclass');
  }

  /**
   * Map LDAP group to tool format
   */
  async mapLDAPGroupToTool(ldapGroup) {
    throw new Error('mapLDAPGroupToTool must be implemented by subclass');
  }

  /**
   * Detect changes between LDAP user and tool user
   */
  async detectUserChanges(ldapUser, toolUser) {
    throw new Error('detectUserChanges must be implemented by subclass');
  }

  /**
   * Detect changes between LDAP group and tool group
   */
  async detectGroupChanges(ldapGroup, toolGroup) {
    throw new Error('detectGroupChanges must be implemented by subclass');
  }

  /**
   * Detect conflicts for user
   */
  async detectUserConflicts(ldapUser, toolUser) {
    // Default implementation - no conflicts
    return [];
  }

  /**
   * Detect conflicts for group
   */
  async detectGroupConflicts(ldapGroup, toolGroup) {
    // Default implementation - no conflicts
    return [];
  }

  // ===== UTILITY METHODS =====

  /**
   * Reset sync statistics
   */
  resetSyncStats() {
    Object.keys(this.syncStats).forEach(key => {
      this.syncStats[key] = 0;
    });
  }

  /**
   * Apply rate limiting
   */
  async applyRateLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    const minInterval = 60000 / (this.toolConfig.rate_limit_per_minute || 60); // Convert to milliseconds
    
    if (timeSinceLastCall < minInterval) {
      const waitTime = minInterval - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastApiCall = Date.now();
    this.apiCallCount++;
  }

  /**
   * Get sync capabilities
   */
  getCapabilities() {
    return {
      tool: this.toolSlug,
      supported_sync_types: this.supportedSyncTypes,
      supported_operations: this.supportedOperations,
      role_mapping_supported: this.roleMapping.size > 0,
      rate_limit_per_minute: this.toolConfig.rate_limit_per_minute || 60,
      max_retries: this.toolConfig.max_retries || 3
    };
  }

  /**
   * Get sync statistics
   */
  getSyncStats() {
    return {
      tool: this.toolSlug,
      ...this.syncStats,
      api_calls_made: this.apiCallCount,
      last_api_call: this.lastApiCall
    };
  }
}

module.exports = BaseToolSync;
