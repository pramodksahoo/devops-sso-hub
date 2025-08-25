/**
 * LDAP Client - Phase 10
 * Handles LDAP server connections, discovery, and data retrieval
 */

const ldap = require('ldapjs');
const { EventEmitter } = require('events');

class LDAPClient extends EventEmitter {
  constructor(serverConfig, fastify, config) {
    super();
    this.serverConfig = serverConfig;
    this.fastify = fastify;
    this.config = config;
    this.client = null;
    this.isConnected = false;
    this.isBinding = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    
    // Connection options
    this.connectionOptions = {
      url: this.buildServerUrl(),
      timeout: this.config.LDAP_CONNECTION_TIMEOUT,
      connectTimeout: this.config.LDAP_CONNECTION_TIMEOUT,
      idleTimeout: 300000, // 5 minutes
      reconnect: this.config.LDAP_RECONNECT_ENABLED
    };
    
    // Add TLS options if needed
    if (this.serverConfig.use_ssl || this.serverConfig.use_tls) {
      this.connectionOptions.tlsOptions = {
        rejectUnauthorized: false // For demo purposes
      };
    }
  }

  /**
   * Build LDAP server URL
   */
  buildServerUrl() {
    const protocol = this.serverConfig.use_ssl ? 'ldaps://' : 'ldap://';
    const port = this.serverConfig.port || (this.serverConfig.use_ssl ? 636 : 389);
    return `${protocol}${this.serverConfig.server_url}:${port}`;
  }

  /**
   * Connect to LDAP server
   */
  async connect() {
    if (this.isConnected) {
      return true;
    }

    try {
      this.fastify.log.info(`Connecting to LDAP server: ${this.serverConfig.name}`);
      
      this.client = ldap.createClient(this.connectionOptions);
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Wait for connection
      await this.waitForConnection();
      
      // Bind if credentials provided
      if (this.serverConfig.bind_dn && this.serverConfig.bind_password_encrypted) {
        await this.bind();
      }
      
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      this.fastify.log.info(`Successfully connected to LDAP server: ${this.serverConfig.name}`);
      this.emit('connected');
      
      return true;
    } catch (error) {
      this.fastify.log.error(`Failed to connect to LDAP server ${this.serverConfig.name}:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Set up LDAP client event handlers
   */
  setupEventHandlers() {
    this.client.on('connect', () => {
      this.fastify.log.debug(`LDAP client connected to ${this.serverConfig.name}`);
    });

    this.client.on('error', (error) => {
      this.fastify.log.error(`LDAP client error for ${this.serverConfig.name}:`, error);
      this.isConnected = false;
      this.emit('error', error);
    });

    this.client.on('close', () => {
      this.fastify.log.warn(`LDAP connection closed for ${this.serverConfig.name}`);
      this.isConnected = false;
      this.emit('disconnected');
      
      // Auto-reconnect if enabled
      if (this.config.LDAP_RECONNECT_ENABLED && this.connectionAttempts < this.maxConnectionAttempts) {
        setTimeout(() => {
          this.connectionAttempts++;
          this.connect().catch(() => {
            // Reconnection failed, will try again if attempts available
          });
        }, this.config.LDAP_RECONNECT_INTERVAL);
      }
    });

    this.client.on('timeout', () => {
      this.fastify.log.warn(`LDAP connection timeout for ${this.serverConfig.name}`);
      this.disconnect();
    });
  }

  /**
   * Wait for LDAP connection to be established
   */
  waitForConnection() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.config.LDAP_CONNECTION_TIMEOUT);

      this.client.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.client.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Bind to LDAP server with credentials
   */
  async bind() {
    if (this.isBinding) {
      return;
    }

    try {
      this.isBinding = true;
      
      // Decrypt password (for demo, we'll use plaintext)
      const password = this.decryptPassword(this.serverConfig.bind_password_encrypted);
      
      await new Promise((resolve, reject) => {
        this.client.bind(this.serverConfig.bind_dn, password, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
      
      this.fastify.log.info(`Successfully bound to LDAP server as: ${this.serverConfig.bind_dn}`);
    } catch (error) {
      this.fastify.log.error(`Failed to bind to LDAP server:`, error);
      throw error;
    } finally {
      this.isBinding = false;
    }
  }

  /**
   * Test LDAP connection
   */
  async testConnection() {
    try {
      await this.connect();
      
      // Perform a simple search to verify functionality
      const searchOptions = {
        scope: 'base',
        filter: '(objectclass=*)',
        attributes: ['objectClass']
      };
      
      const results = await this.search(this.serverConfig.base_dn, searchOptions);
      
      return {
        success: true,
        message: 'LDAP connection test successful',
        server: this.serverConfig.name,
        base_dn: this.serverConfig.base_dn,
        results_count: results.length
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        server: this.serverConfig.name,
        error: error
      };
    }
  }

  /**
   * Search LDAP directory
   */
  async search(baseDN, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    const searchOptions = {
      scope: options.scope || 'sub',
      filter: options.filter || '(objectclass=*)',
      attributes: options.attributes || [],
      paged: true,
      sizeLimit: options.sizeLimit || this.config.DISCOVERY_PAGE_SIZE,
      timeLimit: options.timeLimit || (this.config.LDAP_SEARCH_TIMEOUT / 1000)
    };

    return new Promise((resolve, reject) => {
      const results = [];
      const search = this.client.search(baseDN, searchOptions, (error, res) => {
        if (error) {
          reject(error);
          return;
        }

        res.on('searchEntry', (entry) => {
          const entryData = {
            dn: entry.dn.toString(),
            attributes: {}
          };

          entry.attributes.forEach(attr => {
            if (attr.vals && attr.vals.length > 0) {
              entryData.attributes[attr.type] = attr.vals.length === 1 ? attr.vals[0] : attr.vals;
            }
          });

          results.push(entryData);
        });

        res.on('searchReference', (referral) => {
          this.fastify.log.debug('LDAP search referral:', referral.uris);
        });

        res.on('error', (error) => {
          reject(error);
        });

        res.on('end', (result) => {
          if (result.status === 0) {
            resolve(results);
          } else {
            reject(new Error(`LDAP search failed with status: ${result.status}`));
          }
        });
      });

      // Set timeout
      setTimeout(() => {
        search.abandon();
        reject(new Error('LDAP search timeout'));
      }, this.config.LDAP_SEARCH_TIMEOUT);
    });
  }

  /**
   * Discover users from LDAP
   */
  async discoverUsers(options = {}) {
    try {
      const searchBase = options.searchBase || 
                        this.serverConfig.user_search_base || 
                        this.serverConfig.base_dn;
      
      const filter = this.buildUserSearchFilter(options.additionalFilter);
      const attributes = this.getUserAttributes();
      
      this.fastify.log.info(`Discovering users from: ${searchBase}`);
      
      const searchOptions = {
        scope: 'sub',
        filter: filter,
        attributes: attributes,
        sizeLimit: options.maxResults || this.config.DISCOVERY_MAX_ENTRIES
      };
      
      const results = await this.search(searchBase, searchOptions);
      
      // Transform results to user objects
      const users = results.map(entry => this.transformLDAPUser(entry));
      
      this.fastify.log.info(`Discovered ${users.length} users from LDAP`);
      return users;
    } catch (error) {
      this.fastify.log.error('Failed to discover users:', error);
      throw error;
    }
  }

  /**
   * Discover groups from LDAP
   */
  async discoverGroups(options = {}) {
    try {
      const searchBase = options.searchBase || 
                        this.serverConfig.group_search_base || 
                        this.serverConfig.base_dn;
      
      const filter = this.buildGroupSearchFilter(options.additionalFilter);
      const attributes = this.getGroupAttributes();
      
      this.fastify.log.info(`Discovering groups from: ${searchBase}`);
      
      const searchOptions = {
        scope: 'sub',
        filter: filter,
        attributes: attributes,
        sizeLimit: options.maxResults || this.config.DISCOVERY_MAX_ENTRIES
      };
      
      const results = await this.search(searchBase, searchOptions);
      
      // Transform results to group objects
      const groups = results.map(entry => this.transformLDAPGroup(entry));
      
      this.fastify.log.info(`Discovered ${groups.length} groups from LDAP`);
      return groups;
    } catch (error) {
      this.fastify.log.error('Failed to discover groups:', error);
      throw error;
    }
  }

  /**
   * Build user search filter
   */
  buildUserSearchFilter(additionalFilter) {
    const objectClass = this.serverConfig.user_object_class || 'person';
    let filter = `(objectClass=${objectClass})`;
    
    if (this.serverConfig.user_search_filter) {
      filter = `(&${filter}${this.serverConfig.user_search_filter})`;
    }
    
    if (additionalFilter) {
      filter = `(&${filter}${additionalFilter})`;
    }
    
    return filter;
  }

  /**
   * Build group search filter
   */
  buildGroupSearchFilter(additionalFilter) {
    const objectClass = this.serverConfig.group_object_class || 'group';
    let filter = `(objectClass=${objectClass})`;
    
    if (this.serverConfig.group_search_filter) {
      filter = `(&${filter}${this.serverConfig.group_search_filter})`;
    }
    
    if (additionalFilter) {
      filter = `(&${filter}${additionalFilter})`;
    }
    
    return filter;
  }

  /**
   * Get user attributes to retrieve
   */
  getUserAttributes() {
    return [
      'objectClass',
      this.serverConfig.user_id_attribute || 'uid',
      this.serverConfig.user_email_attribute || 'mail',
      this.serverConfig.user_name_attribute || 'cn',
      this.serverConfig.user_first_name_attribute || 'givenName',
      this.serverConfig.user_last_name_attribute || 'sn',
      'memberOf'
    ];
  }

  /**
   * Get group attributes to retrieve
   */
  getGroupAttributes() {
    return [
      'objectClass',
      this.serverConfig.group_id_attribute || 'cn',
      this.serverConfig.group_name_attribute || 'cn',
      this.serverConfig.group_description_attribute || 'description',
      this.serverConfig.group_member_attribute || 'member',
      'memberOf'
    ];
  }

  /**
   * Transform LDAP user entry to standardized user object
   */
  transformLDAPUser(entry) {
    const attrs = entry.attributes;
    const uidAttr = this.serverConfig.user_id_attribute || 'uid';
    const emailAttr = this.serverConfig.user_email_attribute || 'mail';
    const nameAttr = this.serverConfig.user_name_attribute || 'cn';
    const firstNameAttr = this.serverConfig.user_first_name_attribute || 'givenName';
    const lastNameAttr = this.serverConfig.user_last_name_attribute || 'sn';
    
    return {
      ldap_dn: entry.dn,
      ldap_uid: attrs[uidAttr] || '',
      ldap_cn: attrs[nameAttr] || '',
      email: attrs[emailAttr] || '',
      first_name: attrs[firstNameAttr] || '',
      last_name: attrs[lastNameAttr] || '',
      display_name: attrs[nameAttr] || `${attrs[firstNameAttr] || ''} ${attrs[lastNameAttr] || ''}`.trim(),
      ldap_object_class: Array.isArray(attrs.objectClass) ? attrs.objectClass : [attrs.objectClass],
      ldap_attributes: attrs,
      ldap_groups: this.extractGroupMemberships(attrs.memberOf),
      ldap_group_dns: Array.isArray(attrs.memberOf) ? attrs.memberOf : (attrs.memberOf ? [attrs.memberOf] : [])
    };
  }

  /**
   * Transform LDAP group entry to standardized group object
   */
  transformLDAPGroup(entry) {
    const attrs = entry.attributes;
    const idAttr = this.serverConfig.group_id_attribute || 'cn';
    const nameAttr = this.serverConfig.group_name_attribute || 'cn';
    const descAttr = this.serverConfig.group_description_attribute || 'description';
    const memberAttr = this.serverConfig.group_member_attribute || 'member';
    
    const members = Array.isArray(attrs[memberAttr]) ? attrs[memberAttr] : (attrs[memberAttr] ? [attrs[memberAttr]] : []);
    
    return {
      ldap_dn: entry.dn,
      ldap_cn: attrs[idAttr] || '',
      group_name: attrs[nameAttr] || '',
      description: attrs[descAttr] || '',
      ldap_object_class: Array.isArray(attrs.objectClass) ? attrs.objectClass : [attrs.objectClass],
      ldap_attributes: attrs,
      member_dns: members,
      member_count: members.length,
      parent_group_dn: this.extractParentGroup(entry.dn),
      child_groups: [] // Will be populated in post-processing
    };
  }

  /**
   * Extract group memberships from memberOf attribute
   */
  extractGroupMemberships(memberOf) {
    if (!memberOf) return [];
    
    const groups = Array.isArray(memberOf) ? memberOf : [memberOf];
    return groups.map(groupDN => {
      // Extract CN from DN (e.g., CN=DevOps,OU=Groups,DC=example,DC=com -> DevOps)
      const cnMatch = groupDN.match(/CN=([^,]+)/i);
      return cnMatch ? cnMatch[1] : groupDN;
    });
  }

  /**
   * Extract parent group from DN
   */
  extractParentGroup(dn) {
    const parts = dn.split(',');
    if (parts.length > 1) {
      return parts.slice(1).join(',');
    }
    return null;
  }

  /**
   * Decrypt password (placeholder - implement proper decryption)
   */
  decryptPassword(encryptedPassword) {
    // For demo purposes, assume it's not encrypted
    // In production, implement proper decryption using ENCRYPTION_KEY
    return encryptedPassword || 'demo_password';
  }

  /**
   * Disconnect from LDAP server
   */
  async disconnect() {
    if (this.client) {
      try {
        await new Promise((resolve) => {
          this.client.unbind((error) => {
            if (error) {
              this.fastify.log.warn('Error during LDAP unbind:', error);
            }
            resolve();
          });
        });
      } catch (error) {
        this.fastify.log.warn('Error during LDAP disconnect:', error);
      }
      
      this.client = null;
      this.isConnected = false;
      this.emit('disconnected');
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      server: this.serverConfig.name,
      connected: this.isConnected,
      connection_attempts: this.connectionAttempts,
      server_url: this.buildServerUrl(),
      base_dn: this.serverConfig.base_dn
    };
  }
}

module.exports = LDAPClient;
