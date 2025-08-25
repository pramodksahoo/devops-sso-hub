/**
 * Tool Metadata Service
 * Handles tool catalog, categorization, and metadata management
 */

class ToolMetadataService {
  constructor(fastify, config, databaseManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
  }

  // ===== CATEGORIZED TOOL CATALOG =====

  async getCategorizedTools(options = {}) {
    const { category, featured, include_capabilities, user } = options;

    try {
      // Get categories
      const categories = await this.db.getCategories(category ? { slug: category } : {});
      
      // Get tools
      const tools = await this.db.getTools({
        category,
        featured
      });

      // Group tools by category
      const categorizedTools = [];

      for (const cat of categories) {
        const categoryTools = tools.filter(tool => tool.category_slug === cat.slug);
        
        // Process each tool
        const processedTools = [];
        for (const tool of categoryTools) {
          const processedTool = await this.processToolForCatalog(tool, {
            include_capabilities,
            user
          });
          if (processedTool) {
            processedTools.push(processedTool);
          }
        }

        categorizedTools.push({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          tools: processedTools
        });
      }

      const totalTools = tools.length;

      return {
        categories: categorizedTools,
        total_tools: totalTools
      };
    } catch (error) {
      this.fastify.log.error('Failed to get categorized tools:', error);
      throw error;
    }
  }

  async processToolForCatalog(tool, options = {}) {
    const { include_capabilities, include_auth_config, user } = options;

    try {
      // Build basic tool info
      const processedTool = {
        id: tool.id,
        name: tool.name,
        slug: tool.slug,
        description: tool.description,
        icon_url: tool.icon_url,
        logo_url: tool.logo_url,
        is_featured: tool.is_featured,
        status: tool.status,
        integration_type: tool.integration_type,
        tags: tool.tags || [],
        // Include auth_config if it exists (for admin users)
        auth_config: tool.auth_config || {}
      };

      // Add capabilities if requested
      if (include_capabilities) {
        const capabilities = await this.db.getToolCapabilities(tool.id);
        if (capabilities) {
          processedTool.capabilities = {
            sso: capabilities.supports_sso,
            scim: capabilities.supports_scim,
            webhooks: capabilities.supports_webhooks,
            deep_links: capabilities.supports_deep_links,
            api_access: capabilities.supports_api_access,
            user_provisioning: capabilities.supports_user_provisioning,
            group_management: capabilities.supports_group_management,
            role_mapping: capabilities.supports_role_mapping,
            audit_logs: capabilities.supports_audit_logs,
            session_management: capabilities.supports_session_management,
            mfa_enforcement: capabilities.supports_mfa_enforcement
          };
        }
      }

      // Add access information if user provided
      if (user) {
        // Note: We're not importing PolicyService here to avoid circular dependency
        // Access checking should be done at the API level
        processedTool.user_access = {
          has_access: true, // Will be determined by policy service
          required_roles: tool.required_roles || [],
          required_groups: tool.required_groups || []
        };
      }

      // Add usage statistics
      if (this.config.FEATURES.LAUNCH_ANALYTICS) {
        const usageStats = await this.db.getToolUsageStats(tool.id, '24h');
        processedTool.usage_stats = {
          daily_launches: usageStats.total_launches || 0,
          unique_users: usageStats.unique_users || 0,
          avg_response_time: usageStats.avg_response_time || 0
        };
      }

      return processedTool;
    } catch (error) {
      this.fastify.log.error('Failed to process tool for catalog:', error);
      return null;
    }
  }

  // ===== TOOL DETAILS =====

  async getToolDetails(toolId, options = {}) {
    const { include_launch_config, include_capabilities, user } = options;

    try {
      // Get tool basic info
      const tool = await this.db.getToolById(toolId);
      if (!tool) {
        return null;
      }

      // Build detailed tool info
      const toolDetails = {
        id: tool.id,
        name: tool.name,
        slug: tool.slug,
        description: tool.description,
        base_url: tool.base_url,
        icon_url: tool.icon_url,
        logo_url: tool.logo_url,
        documentation_url: tool.documentation_url,
        support_url: tool.support_url,
        integration_type: tool.integration_type,
        is_active: tool.is_active,
        is_featured: tool.is_featured,
        status: tool.status,
        tags: tool.tags || [],
        required_roles: tool.required_roles || [],
        required_groups: tool.required_groups || [],
        metadata: tool.metadata || {},
        auth_config: tool.auth_config || {}, // Include auth configuration
        category: {
          name: tool.category_name,
          slug: tool.category_slug,
          icon: tool.category_icon
        }
      };

      // Add launch configuration if requested
      if (include_launch_config) {
        const launchConfig = await this.db.getLaunchConfig(toolId);
        if (launchConfig) {
          toolDetails.launch_config = {
            launch_type: launchConfig.launch_type,
            supports_deep_links: launchConfig.supports_deep_links,
            deep_link_patterns: launchConfig.deep_link_patterns || {},
            context_parameters: launchConfig.context_parameters || {},
            auth_flow_config: launchConfig.auth_flow_config || {}
          };
        }
      }

      // Add capabilities if requested
      if (include_capabilities) {
        const capabilities = await this.db.getToolCapabilities(toolId);
        if (capabilities) {
          toolDetails.capabilities = {
            authentication: {
              supports_sso: capabilities.supports_sso,
              supports_scim: capabilities.supports_scim,
              supports_jit_provisioning: capabilities.supports_jit_provisioning,
              supports_mfa_enforcement: capabilities.supports_mfa_enforcement
            },
            integration: {
              supports_api_access: capabilities.supports_api_access,
              supports_webhooks: capabilities.supports_webhooks,
              supports_deep_links: capabilities.supports_deep_links
            },
            management: {
              supports_user_provisioning: capabilities.supports_user_provisioning,
              supports_group_management: capabilities.supports_group_management,
              supports_role_mapping: capabilities.supports_role_mapping,
              supports_session_management: capabilities.supports_session_management
            },
            monitoring: {
              supports_audit_logs: capabilities.supports_audit_logs
            },
            details: capabilities.capability_details || {}
          };
        }
      }

      // Add webhook configuration
      const webhookConfig = await this.db.getWebhookConfig(toolId);
      if (webhookConfig) {
        toolDetails.webhook_config = {
          webhook_url: webhookConfig.webhook_url,
          supported_events: webhookConfig.supported_events || [],
          enabled_events: webhookConfig.enabled_events || [],
          is_active: webhookConfig.is_active,
          last_received_at: webhookConfig.last_received_at
        };
      }

      // Add health information
      if (this.config.FEATURES.TOOL_HEALTH_CHECKS) {
        // TODO: Integrate with health monitoring service
        toolDetails.health = {
          status: 'unknown',
          last_check: null,
          response_time: null
        };
      }

      // Add usage analytics
      if (this.config.FEATURES.LAUNCH_ANALYTICS) {
        const usageStats = await this.db.getToolUsageStats(toolId, '24h');
        toolDetails.usage_analytics = {
          daily: {
            launches: usageStats.total_launches || 0,
            unique_users: usageStats.unique_users || 0,
            avg_response_time: usageStats.avg_response_time || 0
          }
        };
      }

      return toolDetails;
    } catch (error) {
      this.fastify.log.error('Failed to get tool details:', error);
      throw error;
    }
  }

  // ===== TOOL CONFIGURATION (ADMIN) =====

  async getToolConfiguration(toolId) {
    try {
      const tool = await this.db.getToolById(toolId);
      if (!tool) {
        throw new Error(`Tool not found: ${toolId}`);
      }

      const launchConfig = await this.db.getLaunchConfig(toolId);
      const webhookConfig = await this.db.getWebhookConfig(toolId);
      const capabilities = await this.db.getToolCapabilities(toolId);

      return {
        tool: {
          id: tool.id,
          name: tool.name,
          slug: tool.slug,
          description: tool.description,
          base_url: tool.base_url,
          integration_type: tool.integration_type,
          status: tool.status,
          metadata: tool.metadata || {},
          configuration: tool.configuration || {},
          health_check_config: tool.health_check_config || {}
        },
        launch_config: launchConfig || null,
        webhook_config: webhookConfig || null,
        capabilities: capabilities || null
      };
    } catch (error) {
      this.fastify.log.error('Failed to get tool configuration:', error);
      throw error;
    }
  }

  async updateToolConfiguration(toolId, updates) {
    const { launch_config, webhook_config, capabilities, metadata, updated_by } = updates;

    try {
      // Update tool metadata if provided
      if (metadata) {
        const query = `
          UPDATE tools SET
            metadata = $2,
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `;
        await this.db.db.query(query, [toolId, JSON.stringify(metadata)]);
      }

      // Update launch configuration if provided
      if (launch_config) {
        await this.db.updateLaunchConfig(toolId, launch_config);
      }

      // Update webhook configuration if provided
      if (webhook_config) {
        const existingWebhookConfig = await this.db.getWebhookConfig(toolId);
        if (existingWebhookConfig) {
          // Update existing webhook config
          const query = `
            UPDATE tool_webhook_configs SET
              enabled_events = $2,
              signature_validation = $3,
              processing_config = $4,
              is_active = $5,
              updated_at = NOW()
            WHERE tool_id = $1
            RETURNING *
          `;
          await this.db.db.query(query, [
            toolId,
            JSON.stringify(webhook_config.enabled_events || []),
            JSON.stringify(webhook_config.signature_validation || {}),
            JSON.stringify(webhook_config.processing_config || {}),
            webhook_config.is_active !== false
          ]);
        } else {
          // Create new webhook config
          await this.db.createWebhookConfig(toolId, {
            ...webhook_config,
            tool_type: (await this.db.getToolById(toolId)).slug
          });
        }
      }

      // Update capabilities if provided
      if (capabilities) {
        const query = `
          UPDATE tool_capabilities SET
            supports_sso = $2,
            supports_scim = $3,
            supports_jit_provisioning = $4,
            supports_api_access = $5,
            supports_webhooks = $6,
            supports_deep_links = $7,
            supports_user_provisioning = $8,
            supports_group_management = $9,
            supports_role_mapping = $10,
            supports_audit_logs = $11,
            supports_session_management = $12,
            supports_mfa_enforcement = $13,
            capability_details = $14,
            updated_at = NOW()
          WHERE tool_id = $1
          RETURNING *
        `;
        await this.db.db.query(query, [
          toolId,
          capabilities.supports_sso,
          capabilities.supports_scim,
          capabilities.supports_jit_provisioning,
          capabilities.supports_api_access,
          capabilities.supports_webhooks,
          capabilities.supports_deep_links,
          capabilities.supports_user_provisioning,
          capabilities.supports_group_management,
          capabilities.supports_role_mapping,
          capabilities.supports_audit_logs,
          capabilities.supports_session_management,
          capabilities.supports_mfa_enforcement,
          JSON.stringify(capabilities.capability_details || {})
        ]);
      }

      // Return updated configuration
      return await this.getToolConfiguration(toolId);
    } catch (error) {
      this.fastify.log.error('Failed to update tool configuration:', error);
      throw error;
    }
  }

  // ===== SEARCH AND FILTERING =====

  async searchTools(query, filters = {}) {
    try {
      let searchQuery = `
        SELECT DISTINCT
          t.id, t.name, t.slug, t.description, t.icon_url,
          t.is_featured, t.status, t.tags,
          tc.name as category_name, tc.slug as category_slug,
          ts_rank(to_tsvector('english', t.name || ' ' || t.description), plainto_tsquery('english', $1)) as rank
        FROM tools t
        LEFT JOIN tool_categories tc ON t.category_id = tc.id
        WHERE t.is_active = true
          AND (
            to_tsvector('english', t.name || ' ' || t.description) @@ plainto_tsquery('english', $1)
            OR t.name ILIKE $2
            OR t.slug ILIKE $2
            OR $1 = ANY(t.tags)
          )
      `;

      const params = [query, `%${query}%`];
      let paramCount = 2;

      if (filters.category) {
        searchQuery += ` AND tc.slug = $${++paramCount}`;
        params.push(filters.category);
      }

      if (filters.featured !== undefined) {
        searchQuery += ` AND t.is_featured = $${++paramCount}`;
        params.push(filters.featured);
      }

      searchQuery += ` ORDER BY rank DESC, t.is_featured DESC, t.name ASC`;

      if (filters.limit) {
        searchQuery += ` LIMIT $${++paramCount}`;
        params.push(filters.limit);
      }

      const result = await this.db.db.query(searchQuery, params);
      return result.rows;
    } catch (error) {
      this.fastify.log.error('Failed to search tools:', error);
      throw error;
    }
  }

  // ===== TOOL RECOMMENDATIONS =====

  async getRecommendedTools(user, options = {}) {
    try {
      const { limit = 6, exclude_tools = [] } = options;

      // Get tools based on user roles and usage patterns
      let query = `
        SELECT DISTINCT
          t.id, t.name, t.slug, t.description, t.icon_url,
          t.is_featured, t.status,
          tc.name as category_name, tc.slug as category_slug,
          CASE 
            WHEN t.is_featured THEN 3
            WHEN $1 = ANY(t.required_roles) THEN 2
            ELSE 1
          END as recommendation_score
        FROM tools t
        LEFT JOIN tool_categories tc ON t.category_id = tc.id
        WHERE t.is_active = true
          AND t.status = 'active'
      `;

      const params = [user.roles[0] || 'user'];

      if (exclude_tools.length > 0) {
        query += ` AND t.id NOT IN (${exclude_tools.map((_, i) => `$${i + 2}`).join(', ')})`;
        params.push(...exclude_tools);
      }

      query += ` ORDER BY recommendation_score DESC, t.is_featured DESC, t.name ASC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await this.db.db.query(query, params);
      return result.rows;
    } catch (error) {
      this.fastify.log.error('Failed to get recommended tools:', error);
      return [];
    }
  }
}

module.exports = ToolMetadataService;
