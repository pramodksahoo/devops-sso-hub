/**
 * Database Manager for Enhanced Catalog Service
 * Handles all database operations for tools, categories, and configurations
 */

class DatabaseManager {
  constructor(fastify, config) {
    this.fastify = fastify;
    this.config = config;
    this.db = fastify.pg;
  }

  async initialize() {
    try {
      // Test database connection
      await this.db.query('SELECT 1');
      this.fastify.log.info('✅ Database Manager: PostgreSQL connection established');
    } catch (error) {
      this.fastify.log.error('❌ Database Manager: Failed to connect to PostgreSQL', error);
      throw error;
    }
  }

  // ===== TOOL CATEGORIES =====
  
  async getCategories(filters = {}) {
    try {
      let query = `
        SELECT id, name, slug, description, icon, display_order
        FROM tool_categories 
        WHERE is_active = true
      `;
      const params = [];

      if (filters.slug) {
        query += ` AND slug = $${params.length + 1}`;
        params.push(filters.slug);
      }

      query += ` ORDER BY display_order ASC, name ASC`;

      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      this.fastify.log.error('Failed to get categories:', error);
      throw error;
    }
  }

  // ===== TOOLS =====

  async getTools(filters = {}) {
    try {
      let query = `
        SELECT 
          t.id, t.name, t.slug, t.description, t.base_url,
          t.icon_url, t.logo_url, t.integration_type, t.auth_config,
          t.is_active, t.is_featured, t.status, t.tags,
          t.required_roles, t.required_groups,
          tc.name as category_name, tc.slug as category_slug,
          tc.icon as category_icon
        FROM tools t
        LEFT JOIN tool_categories tc ON t.category_id = tc.id
        WHERE t.is_active = true
      `;
      const params = [];

      if (filters.category) {
        query += ` AND tc.slug = $${params.length + 1}`;
        params.push(filters.category);
      }

      if (filters.featured !== undefined) {
        query += ` AND t.is_featured = $${params.length + 1}`;
        params.push(filters.featured);
      }

      if (filters.tool_type) {
        query += ` AND t.slug = $${params.length + 1}`;
        params.push(filters.tool_type);
      }

      query += ` ORDER BY tc.display_order ASC, t.is_featured DESC, t.name ASC`;

      const result = await this.db.query(query, params);
      
      // auth_config is already a JSON object from PostgreSQL (JSONB column)
      return result.rows.map(row => ({
        ...row,
        auth_config: row.auth_config || {}
      }));
    } catch (error) {
      this.fastify.log.error('Failed to get tools:', error);
      throw error;
    }
  }

  async getToolById(toolId) {
    try {
      const query = `
        SELECT 
          t.id, t.name, t.slug, t.description, t.base_url,
          t.icon_url, t.logo_url, t.integration_type, t.auth_config,
          t.is_active, t.is_featured, t.status, t.tags,
          t.required_roles, t.required_groups, t.metadata,
          t.configuration, t.health_check_config,
          tc.name as category_name, tc.slug as category_slug,
          tc.icon as category_icon
        FROM tools t
        LEFT JOIN tool_categories tc ON t.category_id = tc.id
        WHERE t.id = $1 AND t.is_active = true
      `;

      const result = await this.db.query(query, [toolId]);
      const row = result.rows[0];
      if (!row) return null;
      
      // auth_config is already a JSON object from PostgreSQL (JSONB column)
      return {
        ...row,
        auth_config: row.auth_config || {}
      };
    } catch (error) {
      this.fastify.log.error('Failed to get tool by ID:', error);
      throw error;
    }
  }

  async getToolBySlug(slug) {
    try {
      const query = `
        SELECT 
          t.id, t.name, t.slug, t.description, t.base_url,
          t.icon_url, t.logo_url, t.integration_type, t.auth_config,
          t.is_active, t.is_featured, t.status, t.tags,
          t.required_roles, t.required_groups, t.metadata,
          t.configuration, t.health_check_config,
          tc.name as category_name, tc.slug as category_slug
        FROM tools t
        LEFT JOIN tool_categories tc ON t.category_id = tc.id
        WHERE t.slug = $1 AND t.is_active = true
      `;

      const result = await this.db.query(query, [slug]);
      const row = result.rows[0];
      if (!row) return null;
      
      // auth_config is already a JSON object from PostgreSQL (JSONB column)
      return {
        ...row,
        auth_config: row.auth_config || {}
      };
    } catch (error) {
      this.fastify.log.error('Failed to get tool by slug:', error);
      throw error;
    }
  }

  async updateTool(toolId, updateData) {
    try {
      const allowedFields = ['name', 'description', 'base_url', 'is_active', 'is_featured', 'status'];
      const updateFields = [];
      const params = [toolId];
      let paramIndex = 2;

      // Build dynamic update query based on provided fields
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add updated_at timestamp
      updateFields.push(`updated_at = NOW()`);

      const query = `
        UPDATE tools 
        SET ${updateFields.join(', ')}
        WHERE id = $1 AND is_active = true
        RETURNING 
          id, name, slug, description, base_url,
          icon_url, logo_url, integration_type, auth_config,
          is_active, is_featured, status, tags,
          required_roles, required_groups, metadata,
          configuration, health_check_config,
          created_at, updated_at
      `;

      const result = await this.db.query(query, params);
      
      if (result.rows.length === 0) {
        throw new Error('Tool not found or inactive');
      }

      const row = result.rows[0];
      
      // auth_config is already a JSON object from PostgreSQL (JSONB column)
      const tool = {
        ...row,
        auth_config: row.auth_config || {}
      };
      
      this.fastify.log.info(`Tool updated: ${toolId}`, { updateData });
      return tool;
    } catch (error) {
      this.fastify.log.error('Failed to update tool:', error);
      throw error;
    }
  }

  async getToolById(toolId) {
    try {
      const query = `
        SELECT 
          id, name, slug, description, base_url,
          icon_url, logo_url, integration_type, auth_config,
          is_active, is_featured, status, tags,
          required_roles, required_groups, metadata,
          configuration, health_check_config,
          created_at, updated_at
        FROM tools 
        WHERE id = $1 AND is_active = true
      `;

      const result = await this.db.query(query, [toolId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        auth_config: row.auth_config || {}
      };
    } catch (error) {
      this.fastify.log.error('Failed to get tool by ID:', error);
      throw error;
    }
  }

  async getToolBySlug(slug) {
    try {
      const query = `
        SELECT 
          id, name, slug, description, base_url,
          icon_url, logo_url, integration_type, auth_config,
          is_active, is_featured, status, tags,
          required_roles, required_groups, metadata,
          configuration, health_check_config,
          created_at, updated_at
        FROM tools 
        WHERE slug = $1 AND is_active = true
      `;

      const result = await this.db.query(query, [slug]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        auth_config: row.auth_config || {}
      };
    } catch (error) {
      this.fastify.log.error('Failed to get tool by slug:', error);
      throw error;
    }
  }

  async updateToolConfig(toolId, configData) {
    try {
      const { integration_type, auth_config } = configData;
      
      // Update tool configuration including integration type and auth config
      const query = `
        UPDATE tools 
        SET 
          integration_type = $2,
          auth_config = $3,
          updated_at = NOW()
        WHERE id = $1 AND is_active = true
        RETURNING 
          id, name, slug, description, base_url,
          icon_url, logo_url, integration_type, auth_config,
          is_active, is_featured, status, tags,
          required_roles, required_groups, metadata,
          configuration, health_check_config,
          created_at, updated_at
      `;

      const result = await this.db.query(query, [
        toolId,
        integration_type,
        JSON.stringify(auth_config || {})
      ]);
      
      if (result.rows.length === 0) {
        throw new Error('Tool not found or inactive');
      }

      const row = result.rows[0];
      
      // auth_config is already a JSON object from PostgreSQL (JSONB column)
      const tool = {
        ...row,
        auth_config: row.auth_config || {}
      };
      
      this.fastify.log.info(`Tool configuration updated: ${toolId}`, { integration_type });
      return tool;
    } catch (error) {
      this.fastify.log.error('Failed to update tool configuration:', error);
      throw error;
    }
  }

  // ===== TOOL LAUNCH CONFIGURATIONS =====

  async getLaunchConfig(toolId) {
    try {
      const query = `
        SELECT 
          id, tool_id, tool_type, launch_url_pattern, launch_type,
          auth_flow_config, supports_deep_links, deep_link_patterns,
          context_parameters, prerequisites
        FROM tool_launch_configs
        WHERE tool_id = $1
      `;

      const result = await this.db.query(query, [toolId]);
      return result.rows[0] || null;
    } catch (error) {
      this.fastify.log.error('Failed to get launch config:', error);
      throw error;
    }
  }

  async updateLaunchConfig(toolId, config) {
    try {
      const query = `
        UPDATE tool_launch_configs SET
          launch_url_pattern = $2,
          launch_type = $3,
          auth_flow_config = $4,
          supports_deep_links = $5,
          deep_link_patterns = $6,
          context_parameters = $7,
          prerequisites = $8,
          updated_at = NOW()
        WHERE tool_id = $1
        RETURNING *
      `;

      const result = await this.db.query(query, [
        toolId,
        config.launch_url_pattern,
        config.launch_type,
        JSON.stringify(config.auth_flow_config || {}),
        config.supports_deep_links || false,
        JSON.stringify(config.deep_link_patterns || {}),
        JSON.stringify(config.context_parameters || {}),
        JSON.stringify(config.prerequisites || {})
      ]);

      return result.rows[0];
    } catch (error) {
      this.fastify.log.error('Failed to update launch config:', error);
      throw error;
    }
  }

  // ===== TOOL CAPABILITIES =====

  async getToolCapabilities(toolId) {
    try {
      const query = `
        SELECT 
          supports_sso, supports_scim, supports_jit_provisioning,
          supports_api_access, supports_webhooks, supports_deep_links,
          supports_user_provisioning, supports_group_management,
          supports_role_mapping, supports_audit_logs,
          supports_session_management, supports_mfa_enforcement,
          capability_details
        FROM tool_capabilities
        WHERE tool_id = $1
      `;

      const result = await this.db.query(query, [toolId]);
      return result.rows[0] || null;
    } catch (error) {
      this.fastify.log.error('Failed to get tool capabilities:', error);
      throw error;
    }
  }

  // ===== TOOL WEBHOOK CONFIGURATIONS =====

  async getWebhookConfig(toolId) {
    try {
      const query = `
        SELECT 
          id, tool_id, tool_type, webhook_url, webhook_secret_key,
          supported_events, enabled_events, signature_validation,
          processing_config, is_active, last_received_at
        FROM tool_webhook_configs
        WHERE tool_id = $1
      `;

      const result = await this.db.query(query, [toolId]);
      return result.rows[0] || null;
    } catch (error) {
      this.fastify.log.error('Failed to get webhook config:', error);
      throw error;
    }
  }

  async createWebhookConfig(toolId, config) {
    try {
      const query = `
        INSERT INTO tool_webhook_configs (
          tool_id, tool_type, webhook_url, webhook_secret_key,
          supported_events, enabled_events, signature_validation,
          processing_config, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const result = await this.db.query(query, [
        toolId,
        config.tool_type,
        config.webhook_url,
        config.webhook_secret_key,
        JSON.stringify(config.supported_events || []),
        JSON.stringify(config.enabled_events || []),
        JSON.stringify(config.signature_validation || {}),
        JSON.stringify(config.processing_config || {}),
        config.is_active !== false
      ]);

      return result.rows[0];
    } catch (error) {
      this.fastify.log.error('Failed to create webhook config:', error);
      throw error;
    }
  }

  // ===== TOOL LAUNCH SESSIONS =====

  async ensureUserExists(userInfo) {
    try {
      // Log the incoming user info for debugging
      this.fastify.log.info('ensureUserExists called with:', {
        sub: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        hasUsername: !!userInfo.username
      });
      
      // Validate required fields
      if (!userInfo.sub || !userInfo.email) {
        throw new Error(`Missing required user fields: sub=${userInfo.sub}, email=${userInfo.email}`);
      }
      
      // Use UPSERT to handle both new users and existing users safely
      // This prevents duplicate key violations and race conditions
      const upsertQuery = `
        INSERT INTO users (
          keycloak_sub, email, username, 
          first_name, last_name, display_name,
          is_active, created_at, updated_at, last_login_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW(), NOW())
        ON CONFLICT (keycloak_sub) 
        DO UPDATE SET 
          email = EXCLUDED.email,
          username = EXCLUDED.username,
          first_name = COALESCE(EXCLUDED.first_name, users.first_name),
          last_name = COALESCE(EXCLUDED.last_name, users.last_name),
          display_name = COALESCE(EXCLUDED.display_name, users.display_name),
          last_login_at = NOW(),
          updated_at = NOW()
        RETURNING id, (xmax = 0) AS was_inserted
      `;
      
      // Extract username from email if not provided
      const username = userInfo.username || userInfo.email.split('@')[0];
      
      // Parse name into first and last if provided
      let firstName = userInfo.given_name || userInfo.first_name;
      let lastName = userInfo.family_name || userInfo.last_name;
      
      if (!firstName && !lastName && userInfo.name) {
        const nameParts = userInfo.name.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      const displayName = userInfo.name || `${firstName} ${lastName}`.trim() || username;
      
      const upsertResult = await this.db.query(upsertQuery, [
        userInfo.sub,
        userInfo.email,
        username,
        firstName || null,
        lastName || null,
        displayName
      ]);
      
      const { id, was_inserted } = upsertResult.rows[0];
      
      if (was_inserted) {
        this.fastify.log.info(`Created new user record for ${userInfo.email} (${userInfo.sub})`);
      } else {
        this.fastify.log.info(`Updated existing user record for ${userInfo.email} (${userInfo.sub})`);
      }
      
      return id;
      
    } catch (error) {
      this.fastify.log.error('Failed to ensure user exists:', error);
      throw error;
    }
  }

  async createLaunchSession(sessionData) {
    try {
      const query = `
        INSERT INTO tool_launch_sessions (
          tool_id, user_id, launch_url, launch_type, launch_context,
          session_token, state_parameter, status, user_agent, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await this.db.query(query, [
        sessionData.tool_id,
        sessionData.user_id,
        sessionData.launch_url,
        sessionData.launch_type,
        JSON.stringify(sessionData.launch_context || {}),
        sessionData.session_token,
        sessionData.state_parameter,
        sessionData.status || 'initiated',
        sessionData.user_agent,
        sessionData.ip_address
      ]);

      return result.rows[0];
    } catch (error) {
      this.fastify.log.error('Failed to create launch session:', error);
      throw error;
    }
  }

  async getLaunchSession(sessionToken) {
    try {
      const query = `
        SELECT 
          ls.*, t.name as tool_name, t.slug as tool_slug
        FROM tool_launch_sessions ls
        JOIN tools t ON ls.tool_id = t.id
        WHERE ls.session_token = $1
      `;

      const result = await this.db.query(query, [sessionToken]);
      return result.rows[0] || null;
    } catch (error) {
      this.fastify.log.error('Failed to get launch session:', error);
      throw error;
    }
  }

  async updateLaunchSession(sessionToken, updates) {
    try {
      const setClauses = [];
      const params = [sessionToken];
      let paramCount = 1;

      if (updates.status !== undefined) {
        setClauses.push(`status = $${++paramCount}`);
        params.push(updates.status);
      }

      if (updates.completed_at !== undefined) {
        setClauses.push(`completed_at = $${++paramCount}`);
        params.push(updates.completed_at);
      }

      if (updates.error_details !== undefined) {
        setClauses.push(`error_details = $${++paramCount}`);
        params.push(JSON.stringify(updates.error_details));
      }

      if (setClauses.length === 0) {
        return null;
      }

      setClauses.push('updated_at = NOW()');

      const query = `
        UPDATE tool_launch_sessions SET
          ${setClauses.join(', ')}
        WHERE session_token = $1
        RETURNING *
      `;

      const result = await this.db.query(query, params);
      return result.rows[0];
    } catch (error) {
      this.fastify.log.error('Failed to update launch session:', error);
      throw error;
    }
  }

  // ===== ANALYTICS AND USAGE =====

  async recordToolUsage(usageData) {
    try {
      const query = `
        INSERT INTO tool_usage (
          tool_id, user_id, action, session_id, ip_address,
          user_agent, request_path, request_method,
          response_status, response_time_ms, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      await this.db.query(query, [
        usageData.tool_id,
        usageData.user_id,
        usageData.action,
        usageData.session_id,
        usageData.ip_address,
        usageData.user_agent,
        usageData.request_path,
        usageData.request_method,
        usageData.response_status,
        usageData.response_time_ms,
        JSON.stringify(usageData.metadata || {})
      ]);

      return true;
    } catch (error) {
      this.fastify.log.error('Failed to record tool usage:', error);
      // Don't throw error for analytics failures
      return false;
    }
  }

  async getToolUsageStats(toolId, timeRange = '24h') {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_launches,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(response_time_ms) as avg_response_time
        FROM tool_usage
        WHERE tool_id = $1 
          AND action = 'launch'
          AND created_at > NOW() - INTERVAL '${timeRange}'
      `;

      const result = await this.db.query(query, [toolId]);
      return result.rows[0];
    } catch (error) {
      this.fastify.log.error('Failed to get tool usage stats:', error);
      return {
        total_launches: 0,
        unique_users: 0,
        avg_response_time: 0
      };
    }
  }
}

module.exports = DatabaseManager;
