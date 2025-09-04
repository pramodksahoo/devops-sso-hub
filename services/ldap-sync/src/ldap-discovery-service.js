/**
 * LDAP Discovery Service - Phase 10
 * Handles LDAP server discovery and user/group caching
 */

const LDAPClient = require('./ldap-client');

class LDAPDiscoveryService {
  constructor(fastify, config, databaseManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.isInitialized = false;
    
    // Active LDAP connections
    this.ldapClients = new Map();
  }

  async initialize() {
    this.fastify.log.info('🔍 Initializing LDAP Discovery Service...');
    this.isInitialized = true;
    this.fastify.log.info('✅ LDAP Discovery Service initialized');
  }

  async testConnection(serverConfig) {
    try {
      const client = new LDAPClient(serverConfig, this.fastify, this.config);
      const result = await client.testConnection();
      await client.disconnect();
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
        server: serverConfig.name
      };
    }
  }

  async discoverUsers(serverId, options = {}) {
    try {
      const serverConfig = await this.db.getLDAPServer(serverId);
      if (!serverConfig) {
        throw new Error('LDAP server not found');
      }

      const client = new LDAPClient(serverConfig, this.fastify, this.config);
      const users = await client.discoverUsers(options);
      
      // Store users in cache
      await this.db.storeLDAPUsers(serverId, users);
      
      await client.disconnect();
      return users;
    } catch (error) {
      this.fastify.log.error('User discovery failed:', error);
      throw error;
    }
  }

  async discoverGroups(serverId, options = {}) {
    try {
      const serverConfig = await this.db.getLDAPServer(serverId);
      if (!serverConfig) {
        throw new Error('LDAP server not found');
      }

      const client = new LDAPClient(serverConfig, this.fastify, this.config);
      const groups = await client.discoverGroups(options);
      
      // Store groups in cache
      await this.db.storeLDAPGroups(serverId, groups);
      
      await client.disconnect();
      return groups;
    } catch (error) {
      this.fastify.log.error('Group discovery failed:', error);
      throw error;
    }
  }

  async stop() {
    // Disconnect all LDAP clients
    for (const [serverId, client] of this.ldapClients) {
      await client.disconnect();
    }
    this.ldapClients.clear();
  }
}

module.exports = LDAPDiscoveryService;
