/**
 * Database Manager for LDAP Sync Service - Phase 10
 * Handles all database operations for LDAP sync and tool configurations
 */

class DatabaseManager {
  constructor(fastify, config) {
    this.fastify = fastify;
    this.config = config;
    this.isInitialized = false;
  }

  get db() {
    return this.fastify.pg;
  }

  async initialize() {
    this.fastify.log.info('🗄️ Initializing LDAP Sync Database Manager...');
    
    try {
      // Test database connection
      await this.db.query('SELECT 1');
      
      this.isInitialized = true;
      this.fastify.log.info('✅ LDAP Sync Database Manager initialized successfully');
    } catch (error) {
      this.fastify.log.error('❌ Failed to initialize LDAP Sync Database Manager:', error);
      throw error;
    }
  }

  // ===== LDAP SERVERS =====

  async getLDAPServers() {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT * FROM ldap_servers
        ORDER BY name ASC
      `;
      
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getLDAPServer(serverId) {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT * FROM ldap_servers
        WHERE id = $1
      `;
      
      const result = await client.query(query, [serverId]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateLDAPServerTestStatus(serverId, status, error = null) {
    const client = await this.db.connect();
    
    try {
      const query = `
        UPDATE ldap_servers
        SET last_test_at = NOW(),
            last_test_status = $2,
            last_test_error = $3,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await client.query(query, [serverId, status, error]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // ===== TOOL CONFIGURATIONS =====

  async getToolConfigs() {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT tc.*, ls.name as ldap_server_name, ls.server_url
        FROM ldap_tool_configs tc
        JOIN ldap_servers ls ON tc.ldap_server_id = ls.id
        ORDER BY tc.tool_slug ASC
      `;
      
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getToolConfig(configId) {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT tc.*, ls.name as ldap_server_name, ls.server_url
        FROM ldap_tool_configs tc
        JOIN ldap_servers ls ON tc.ldap_server_id = ls.id
        WHERE tc.id = $1
      `;
      
      const result = await client.query(query, [configId]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // ===== LDAP USERS CACHE =====

  async storeLDAPUsers(serverId, users) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Clear existing users for this server
      await client.query('DELETE FROM ldap_users WHERE ldap_server_id = $1', [serverId]);
      
      // Insert new users
      for (const user of users) {
        const query = `
          INSERT INTO ldap_users (
            ldap_server_id, ldap_dn, ldap_uid, ldap_cn, email,
            first_name, last_name, display_name, ldap_object_class,
            ldap_attributes, ldap_groups, ldap_group_dns
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `;
        
        const values = [
          serverId,
          user.ldap_dn,
          user.ldap_uid,
          user.ldap_cn,
          user.email,
          user.first_name,
          user.last_name,
          user.display_name,
          user.ldap_object_class,
          JSON.stringify(user.ldap_attributes),
          user.ldap_groups,
          user.ldap_group_dns
        ];
        
        await client.query(query, values);
      }
      
      await client.query('COMMIT');
      this.fastify.log.info(`Stored ${users.length} LDAP users for server ${serverId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getLDAPUsers(serverId) {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT * FROM ldap_users
        WHERE ldap_server_id = $1 AND is_active = true AND is_deleted = false
        ORDER BY email ASC
      `;
      
      const result = await client.query(query, [serverId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // ===== LDAP GROUPS CACHE =====

  async storeLDAPGroups(serverId, groups) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Clear existing groups for this server
      await client.query('DELETE FROM ldap_groups WHERE ldap_server_id = $1', [serverId]);
      
      // Insert new groups
      for (const group of groups) {
        const query = `
          INSERT INTO ldap_groups (
            ldap_server_id, ldap_dn, ldap_cn, group_name, description,
            ldap_object_class, ldap_attributes, parent_group_dn,
            member_dns, member_count
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        
        const values = [
          serverId,
          group.ldap_dn,
          group.ldap_cn,
          group.group_name,
          group.description,
          group.ldap_object_class,
          JSON.stringify(group.ldap_attributes),
          group.parent_group_dn,
          group.member_dns,
          group.member_count
        ];
        
        await client.query(query, values);
      }
      
      await client.query('COMMIT');
      this.fastify.log.info(`Stored ${groups.length} LDAP groups for server ${serverId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getLDAPGroups(serverId) {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT * FROM ldap_groups
        WHERE ldap_server_id = $1 AND is_active = true AND is_deleted = false
        ORDER BY group_name ASC
      `;
      
      const result = await client.query(query, [serverId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // ===== SYNC JOBS =====

  async createSyncJob(jobData) {
    const client = await this.db.connect();
    
    try {
      const query = `
        INSERT INTO ldap_sync_jobs (
          ldap_tool_config_id, job_type, sync_scope, status,
          triggered_by, triggered_by_user, job_config, is_preview
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        jobData.ldap_tool_config_id,
        jobData.job_type,
        jobData.sync_scope,
        'pending',
        jobData.triggered_by,
        jobData.triggered_by_user,
        JSON.stringify(jobData.job_config || {}),
        jobData.is_preview || false
      ];
      
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateSyncJob(jobId, updates) {
    const client = await this.db.connect();
    
    try {
      const setFields = ['updated_at = NOW()'];
      const values = [jobId];
      let paramCount = 1;
      
      Object.entries(updates).forEach(([key, value]) => {
        paramCount++;
        setFields.push(`${key} = $${paramCount}`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      });
      
      const query = `
        UPDATE ldap_sync_jobs 
        SET ${setFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getSyncJob(jobId) {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT sj.*, tc.tool_slug, ls.name as ldap_server_name
        FROM ldap_sync_jobs sj
        JOIN ldap_tool_configs tc ON sj.ldap_tool_config_id = tc.id
        JOIN ldap_servers ls ON tc.ldap_server_id = ls.id
        WHERE sj.id = $1
      `;
      
      const result = await client.query(query, [jobId]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getSyncJobs(filters = {}) {
    const client = await this.db.connect();
    
    try {
      let query = `
        SELECT sj.*, tc.tool_slug, ls.name as ldap_server_name
        FROM ldap_sync_jobs sj
        JOIN ldap_tool_configs tc ON sj.ldap_tool_config_id = tc.id
        JOIN ldap_servers ls ON tc.ldap_server_id = ls.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 0;
      
      if (filters.status) {
        paramCount++;
        query += ` AND sj.status = $${paramCount}`;
        params.push(filters.status);
      }
      
      if (filters.tool_slug) {
        paramCount++;
        query += ` AND tc.tool_slug = $${paramCount}`;
        params.push(filters.tool_slug);
      }
      
      if (filters.job_type) {
        paramCount++;
        query += ` AND sj.job_type = $${paramCount}`;
        params.push(filters.job_type);
      }
      
      query += ` ORDER BY sj.created_at DESC`;
      
      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // ===== ROLE MAPPINGS =====

  async getRoleMappings(toolConfigId) {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT * FROM ldap_role_mappings
        WHERE ldap_tool_config_id = $1 AND is_active = true
        ORDER BY ldap_group_name ASC
      `;
      
      const result = await client.query(query, [toolConfigId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // ===== AUDIT LOGGING =====

  async logSyncAudit(auditData) {
    const client = await this.db.connect();
    
    try {
      const query = `
        INSERT INTO ldap_sync_audit (
          event_type, event_category, ldap_server_id, ldap_tool_config_id,
          sync_job_id, ldap_user_id, ldap_group_id, event_description,
          event_data, tool_slug, tool_user_id, tool_group_id, user_id,
          user_email, user_roles, success, error_code, error_message,
          duration_ms, correlation_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      `;
      
      const values = [
        auditData.event_type,
        auditData.event_category || 'sync',
        auditData.ldap_server_id,
        auditData.ldap_tool_config_id,
        auditData.sync_job_id,
        auditData.ldap_user_id,
        auditData.ldap_group_id,
        auditData.event_description,
        JSON.stringify(auditData.event_data || {}),
        auditData.tool_slug,
        auditData.tool_user_id,
        auditData.tool_group_id,
        auditData.user_id,
        auditData.user_email,
        auditData.user_roles || [],
        auditData.success !== false,
        auditData.error_code,
        auditData.error_message,
        auditData.duration_ms,
        auditData.correlation_id
      ];
      
      await client.query(query, values);
    } finally {
      client.release();
    }
  }
}

module.exports = DatabaseManager;
