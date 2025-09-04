/**
 * Policy Service for Tool Access Control
 * Handles role-based access control and tool-specific permissions
 */

class PolicyService {
  constructor(fastify, config, databaseManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
  }

  async initialize() {
    this.fastify.log.info('✅ Policy Service: Initialized');
  }

  // ===== TOOL ACCESS CONTROL =====

  async checkToolAccess(tool, user) {
    try {
      // Admin users have access to all tools
      if (user.isAdmin || user.roles.includes('admin')) {
        return true;
      }

      // Check if tool requires authentication
      if (!tool.requires_authentication) {
        return true;
      }

      // Check required roles
      if (tool.required_roles && tool.required_roles.length > 0) {
        const hasRequiredRole = tool.required_roles.some(role => 
          user.roles.includes(role)
        );
        if (!hasRequiredRole) {
          this.fastify.log.debug(`User ${user.email} lacks required roles for ${tool.name}:`, {
            required: tool.required_roles,
            user_roles: user.roles
          });
          return false;
        }
      }

      // Check required groups (if available in user data)
      if (tool.required_groups && tool.required_groups.length > 0 && user.groups) {
        const hasRequiredGroup = tool.required_groups.some(group => 
          user.groups.includes(group)
        );
        if (!hasRequiredGroup) {
          this.fastify.log.debug(`User ${user.email} lacks required groups for ${tool.name}:`, {
            required: tool.required_groups,
            user_groups: user.groups
          });
          return false;
        }
      }

      // Check for specific user access overrides
      const accessOverride = await this.getUserAccessOverride(tool.id, user.sub);
      if (accessOverride) {
        if (accessOverride.access_type === 'deny') {
          this.fastify.log.debug(`User ${user.email} explicitly denied access to ${tool.name}`);
          return false;
        }
        if (accessOverride.access_type === 'allow') {
          return true;
        }
      }

      // Check tool-specific access policies
      const hasToolSpecificAccess = await this.checkToolSpecificPolicy(tool, user);
      if (!hasToolSpecificAccess) {
        return false;
      }

      return true;
    } catch (error) {
      this.fastify.log.error('Failed to check tool access:', error);
      // Fail secure - deny access on error
      return false;
    }
  }

  async getUserAccessOverride(toolId, userId) {
    try {
      const query = `
        SELECT access_type, reason, expires_at
        FROM tool_access
        WHERE tool_id = $1 AND user_id = $2
          AND (expires_at IS NULL OR expires_at > NOW())
      `;

      const result = await this.db.db.query(query, [toolId, userId]);
      return result.rows[0] || null;
    } catch (error) {
      this.fastify.log.error('Failed to get user access override:', error);
      return null;
    }
  }

  async checkToolSpecificPolicy(tool, user) {
    try {
      // Tool-specific policy checks based on access_policy JSON
      if (!tool.access_policy || Object.keys(tool.access_policy).length === 0) {
        return true; // No specific policy, allow access
      }

      const policy = tool.access_policy;

      // Check time-based restrictions
      if (policy.time_restrictions) {
        const hasTimeAccess = await this.checkTimeRestrictions(policy.time_restrictions, user);
        if (!hasTimeAccess) {
          return false;
        }
      }

      // Check IP-based restrictions
      if (policy.ip_restrictions) {
        const hasIpAccess = await this.checkIpRestrictions(policy.ip_restrictions, user);
        if (!hasIpAccess) {
          return false;
        }
      }

      // Check custom conditions
      if (policy.custom_conditions) {
        const hasCustomAccess = await this.checkCustomConditions(policy.custom_conditions, user);
        if (!hasCustomAccess) {
          return false;
        }
      }

      return true;
    } catch (error) {
      this.fastify.log.error('Failed to check tool-specific policy:', error);
      return false;
    }
  }

  async checkTimeRestrictions(timeRestrictions, user) {
    // Check if current time is within allowed hours/days
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    if (timeRestrictions.allowed_hours) {
      const allowedHours = timeRestrictions.allowed_hours;
      if (!allowedHours.includes(currentHour)) {
        this.fastify.log.debug(`Access denied due to time restriction. Current hour: ${currentHour}, Allowed: ${allowedHours}`);
        return false;
      }
    }

    if (timeRestrictions.allowed_days) {
      const allowedDays = timeRestrictions.allowed_days;
      if (!allowedDays.includes(currentDay)) {
        this.fastify.log.debug(`Access denied due to day restriction. Current day: ${currentDay}, Allowed: ${allowedDays}`);
        return false;
      }
    }

    return true;
  }

  async checkIpRestrictions(ipRestrictions, user) {
    // Note: This would require IP address to be passed in user context
    // For now, we'll assume this check passes
    return true;
  }

  async checkCustomConditions(customConditions, user) {
    // Implement custom condition logic based on your requirements
    // For example, checking user department, project membership, etc.
    
    if (customConditions.min_roles_count) {
      const minRoles = customConditions.min_roles_count;
      if (user.roles.length < minRoles) {
        this.fastify.log.debug(`User ${user.email} has insufficient roles. Has: ${user.roles.length}, Required: ${minRoles}`);
        return false;
      }
    }

    if (customConditions.required_any_role) {
      const requiredAnyRole = customConditions.required_any_role;
      const hasAnyRole = requiredAnyRole.some(role => user.roles.includes(role));
      if (!hasAnyRole) {
        this.fastify.log.debug(`User ${user.email} lacks any of required roles:`, requiredAnyRole);
        return false;
      }
    }

    return true;
  }

  // ===== ROLE MAPPING =====

  async getToolRoleMapping(toolId, userRoles) {
    try {
      // Get tool capabilities to understand role mapping
      const capabilities = await this.db.getToolCapabilities(toolId);
      if (!capabilities || !capabilities.supports_role_mapping) {
        return null;
      }

      // Get tool-specific role mapping configuration
      const tool = await this.db.getToolById(toolId);
      if (!tool || !tool.metadata || !tool.metadata.role_mapping) {
        return this.getDefaultRoleMapping(userRoles);
      }

      const roleMapping = tool.metadata.role_mapping;
      const mappedRoles = [];

      // Map user roles to tool-specific roles
      userRoles.forEach(userRole => {
        if (roleMapping[userRole]) {
          mappedRoles.push(...roleMapping[userRole]);
        }
      });

      return {
        user_roles: userRoles,
        mapped_roles: [...new Set(mappedRoles)], // Remove duplicates
        mapping_config: roleMapping
      };
    } catch (error) {
      this.fastify.log.error('Failed to get tool role mapping:', error);
      return this.getDefaultRoleMapping(userRoles);
    }
  }

  getDefaultRoleMapping(userRoles) {
    // Default role mapping logic
    const mappedRoles = [];

    if (userRoles.includes('admin')) {
      mappedRoles.push('admin', 'maintainer', 'developer', 'viewer');
    } else if (userRoles.includes('maintainer')) {
      mappedRoles.push('maintainer', 'developer', 'viewer');
    } else if (userRoles.includes('developer')) {
      mappedRoles.push('developer', 'viewer');
    } else if (userRoles.includes('user')) {
      mappedRoles.push('viewer');
    }

    return {
      user_roles: userRoles,
      mapped_roles: [...new Set(mappedRoles)],
      mapping_config: 'default'
    };
  }

  // ===== ACCESS LOGGING =====

  async logAccessAttempt(toolId, user, granted, reason = null) {
    try {
      // Record access attempt in tool_usage table
      await this.db.recordToolUsage({
        tool_id: toolId,
        user_id: user.sub,
        action: granted ? 'access_granted' : 'access_denied',
        metadata: {
          reason,
          user_roles: user.roles,
          user_email: user.email,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.fastify.log.error('Failed to log access attempt:', error);
      // Don't throw error for logging failures
    }
  }

  // ===== PERMISSION MANAGEMENT =====

  async grantUserAccess(toolId, userId, grantedBy, options = {}) {
    try {
      const query = `
        INSERT INTO tool_access (tool_id, user_id, access_type, reason, granted_by, expires_at)
        VALUES ($1, $2, 'allow', $3, $4, $5)
        ON CONFLICT (tool_id, user_id) 
        DO UPDATE SET
          access_type = 'allow',
          reason = $3,
          granted_by = $4,
          expires_at = $5,
          created_at = NOW()
        RETURNING *
      `;

      const result = await this.db.db.query(query, [
        toolId,
        userId,
        options.reason || 'Manually granted access',
        grantedBy,
        options.expires_at || null
      ]);

      return result.rows[0];
    } catch (error) {
      this.fastify.log.error('Failed to grant user access:', error);
      throw error;
    }
  }

  async revokeUserAccess(toolId, userId, revokedBy, reason = null) {
    try {
      const query = `
        INSERT INTO tool_access (tool_id, user_id, access_type, reason, granted_by)
        VALUES ($1, $2, 'deny', $3, $4)
        ON CONFLICT (tool_id, user_id) 
        DO UPDATE SET
          access_type = 'deny',
          reason = $3,
          granted_by = $4,
          created_at = NOW()
        RETURNING *
      `;

      const result = await this.db.db.query(query, [
        toolId,
        userId,
        reason || 'Access revoked',
        revokedBy
      ]);

      return result.rows[0];
    } catch (error) {
      this.fastify.log.error('Failed to revoke user access:', error);
      throw error;
    }
  }

  async removeUserAccess(toolId, userId) {
    try {
      const query = `
        DELETE FROM tool_access 
        WHERE tool_id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await this.db.db.query(query, [toolId, userId]);
      return result.rows[0];
    } catch (error) {
      this.fastify.log.error('Failed to remove user access:', error);
      throw error;
    }
  }

  // ===== POLICY EVALUATION =====

  async evaluateToolPolicy(toolId, user, action = 'access') {
    try {
      const tool = await this.db.getToolById(toolId);
      if (!tool) {
        return {
          allowed: false,
          reason: 'Tool not found',
          policy_decision: 'deny'
        };
      }

      const hasAccess = await this.checkToolAccess(tool, user);
      const roleMapping = await this.getToolRoleMapping(toolId, user.roles);

      // Log the access attempt
      await this.logAccessAttempt(toolId, user, hasAccess, hasAccess ? 'Policy check passed' : 'Policy check failed');

      return {
        allowed: hasAccess,
        reason: hasAccess ? 'Access granted by policy' : 'Access denied by policy',
        policy_decision: hasAccess ? 'allow' : 'deny',
        role_mapping: roleMapping,
        tool_info: {
          id: tool.id,
          name: tool.name,
          slug: tool.slug,
          category: tool.category_slug
        }
      };
    } catch (error) {
      this.fastify.log.error('Failed to evaluate tool policy:', error);
      return {
        allowed: false,
        reason: 'Policy evaluation error',
        policy_decision: 'deny',
        error: error.message
      };
    }
  }
}

module.exports = PolicyService;
