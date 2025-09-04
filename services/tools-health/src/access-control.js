/**
 * Access Control Service
 * 
 * Handles authorization for tool access based on user roles
 * and tool requirements. Integrates with Auth-BFF for user identity.
 */

const { createHmac } = require('crypto');
const axios = require('axios');

class AccessControlManager {
  constructor(fastify, config, databaseManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
  }

  /**
   * Verify identity headers from Auth-BFF
   */
  verifyIdentityHeaders(headers) {
    const userSub = headers['x-user-sub'];
    const userEmail = headers['x-user-email'];
    const userRoles = headers['x-user-roles'] ? headers['x-user-roles'].split(',') : [];
    const userName = headers['x-user-name'] || '';
    const signature = headers['x-user-signature'];

    if (!userSub || !userEmail || !signature) {
      throw new Error('Missing required identity headers');
    }

    // Verify signature
    const payload = `${userSub}|${userEmail}|${userRoles.join(',')}`;
    const expectedSignature = createHmac('sha256', this.config.IDENTITY_HEADER_SECRET)
      .update(payload)
      .digest('base64');

    if (signature !== expectedSignature) {
      throw new Error('Invalid identity signature');
    }

    return {
      sub: userSub,
      email: userEmail,
      roles: userRoles,
      name: userName
    };
  }

  /**
   * Check if user has access to a specific tool
   */
  async checkToolAccess(toolId, userInfo, requestInfo = {}) {
    try {
      const tool = await this.db.getTool(toolId);
      
      if (!tool) {
        await this.db.logAccess(toolId, userInfo, false, 'Tool not found', requestInfo);
        return { granted: false, reason: 'Tool not found' };
      }

          if (!tool.is_active) {
      await this.db.logAccess(tool.id, userInfo, false, 'Tool disabled', requestInfo);
      return { granted: false, reason: 'Tool is disabled' };
    }

    // Check authentication requirements
    if (tool.requires_authentication && !userInfo) {
      await this.db.logAccess(tool.id, userInfo, false, 'Authentication required', requestInfo);
      return { granted: false, reason: 'Authentication required' };
    }

    // Check role requirements
    const requiredRoles = tool.required_roles || [];
    const requiredGroups = tool.required_groups || [];
      
      if (requiredRoles.length === 0 && requiredGroups.length === 0) {
        // No specific roles or groups required - any authenticated user can access
        await this.db.logAccess(tool.id, userInfo, true, 'No access restrictions', requestInfo);
        return { granted: true, reason: 'Access granted - no access restrictions' };
      }

      // Check if user has any of the required roles
      const hasRequiredRole = requiredRoles.length === 0 || requiredRoles.some(requiredRole => 
        userInfo.roles.includes(requiredRole)
      );

      // Check if user has any of the required groups (if groups are provided in userInfo)
      const userGroups = userInfo.groups || [];
      const hasRequiredGroup = requiredGroups.length === 0 || requiredGroups.some(requiredGroup => 
        userGroups.includes(requiredGroup)
      );

      if (hasRequiredRole && hasRequiredGroup) {
        await this.db.logAccess(tool.id, userInfo, true, 'Role and group match', requestInfo);
        return { granted: true, reason: 'Access granted - role and group requirements met' };
      } else {
        const missingRequirements = [];
        if (!hasRequiredRole && requiredRoles.length > 0) {
          missingRequirements.push(`roles: ${requiredRoles.join(', ')}`);
        }
        if (!hasRequiredGroup && requiredGroups.length > 0) {
          missingRequirements.push(`groups: ${requiredGroups.join(', ')}`);
        }
        
        await this.db.logAccess(tool.id, userInfo, false, 'Insufficient permissions', requestInfo);
        return { 
          granted: false, 
          reason: `Insufficient permissions. Required: ${missingRequirements.join(' and ')}. User has roles: ${userInfo.roles.join(', ')}, groups: ${userGroups.join(', ')}` 
        };
      }
    } catch (error) {
      this.fastify.log.error('Access control error:', error);
      await this.db.logAccess(toolId, userInfo, false, `Error: ${error.message}`, requestInfo);
      return { granted: false, reason: 'Access control error' };
    }
  }

  /**
   * Get tools accessible by user
   */
  async getAccessibleTools(userInfo, filters = {}) {
    try {
      const tools = await this.db.getTools({ 
        is_active: true,
        ...filters
      });

      const accessibleTools = [];

      for (const tool of tools) {
        const access = await this.checkToolAccess(tool.id, userInfo);
        if (access.granted) {
          accessibleTools.push({
            ...tool,
            access_reason: access.reason
          });
        }
      }

      return accessibleTools;
    } catch (error) {
      this.fastify.log.error('Error getting accessible tools:', error);
      throw error;
    }
  }

  /**
   * Middleware to authenticate requests using Auth-BFF identity headers
   */
  async authenticateRequest(request, reply) {
    try {
      const userInfo = this.verifyIdentityHeaders(request.headers);
      
      // Add user info to request context
      request.user = userInfo;
      
      return userInfo;
    } catch (error) {
      this.fastify.log.warn('Authentication failed:', error.message);
      reply.status(401).send({ 
        error: 'Authentication required',
        details: error.message 
      });
      throw error;
    }
  }

  /**
   * Middleware to authorize tool access
   */
  async authorizeToolAccess(request, reply) {
    const toolId = request.params.toolId || request.params.id;
    
    if (!toolId) {
      reply.status(400).send({ error: 'Tool ID required' });
      throw new Error('Tool ID required');
    }

    const requestInfo = {
      ip: request.ip,
      userAgent: request.headers['user-agent']
    };

    const access = await this.checkToolAccess(toolId, request.user, requestInfo);
    
    if (!access.granted) {
      reply.status(403).send({ 
        error: 'Access denied',
        reason: access.reason 
      });
      throw new Error(access.reason);
    }

    // Add access info to request context
    request.toolAccess = access;
    
    return access;
  }

  /**
   * Get access logs for a tool
   */
  async getToolAccessLogs(toolId, limit = 50) {
    const client = await this.fastify.pg.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          tal.*,
          t.name as tool_name
        FROM tool_access_logs tal
        JOIN tools t ON tal.tool_id = t.id
        WHERE tal.tool_id = $1
        ORDER BY tal.created_at DESC
        LIMIT $2
      `, [toolId, limit]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get access logs for a user
   */
  async getUserAccessLogs(userSub, limit = 50) {
    const client = await this.fastify.pg.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          tal.*,
          t.name as tool_name,
          t.category
        FROM tool_access_logs tal
        JOIN tools t ON tal.tool_id = t.id
        WHERE tal.user_sub = $1
        ORDER BY tal.created_at DESC
        LIMIT $2
      `, [userSub, limit]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }
}

module.exports = AccessControlManager;
