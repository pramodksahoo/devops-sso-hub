// Authentication and authorization middleware for User Service
const crypto = require('crypto');

class AuthMiddleware {
  constructor(config, userDb) {
    this.config = config;
    this.userDb = userDb;
  }

  // Verify HMAC-signed identity headers from Auth-BFF
  verifyIdentityHeaders(request, reply) {
    const headers = request.headers;
    const userSub = headers['x-user-sub'];
    const userEmail = headers['x-user-email'];
    const userName = headers['x-user-name'];
    const userRoles = headers['x-user-roles'];
    const userGroups = headers['x-user-groups'];
    const signature = headers['x-user-signature'];

    if (!userSub || !userEmail || !signature) {
      return reply.code(401).send({ 
        error: 'Unauthorized',
        message: 'Missing required identity headers'
      });
    }

    // Verify HMAC signature
    const payload = `${userSub}|${userEmail}|${userRoles || ''}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.config.IDENTITY_HEADER_SECRET)
      .update(payload)
      .digest('base64');

    if (signature !== expectedSignature) {
      return reply.code(401).send({ 
        error: 'Unauthorized',
        message: 'Invalid identity signature'
      });
    }

    // Add user context to request
    request.user = {
      sub: userSub,
      email: userEmail,
      name: userName,
      roles: userRoles ? userRoles.split(',') : [],
      groups: userGroups ? userGroups.split(',') : []
    };
  }

  // API Key authentication
  async verifyApiKey(request, reply) {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ 
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer '
    
    try {
      const keyData = await this.userDb.verifyApiKey(apiKey);
      
      if (!keyData) {
        return reply.code(401).send({ 
          error: 'Unauthorized',
          message: 'Invalid API key'
        });
      }

      // Add API key context to request
      request.apiKey = {
        id: keyData.id,
        userId: keyData.user_id,
        permissions: keyData.permissions,
        userSub: keyData.keycloak_sub,
        userEmail: keyData.email
      };
    } catch (error) {
      reply.code(500).send({ 
        error: 'Internal Server Error',
        message: 'Authentication failed'
      });
    }
  }

  // Combined authentication (identity headers OR API key)
  async authenticate(request, reply) {
    // Try identity headers first
    if (request.headers['x-user-sub']) {
      return this.verifyIdentityHeaders(request, reply);
    }
    
    // Try API key authentication
    if (request.headers.authorization) {
      return await this.verifyApiKey(request, reply);
    }

    return reply.code(401).send({ 
      error: 'Unauthorized',
      message: 'No valid authentication provided'
    });
  }

  // Authorization checks
  requireRole(roles) {
    return (request, reply) => {
      const userRoles = request.user?.roles || [];
      const hasRole = roles.some(role => userRoles.includes(role));
      
      if (!hasRole) {
        return reply.code(403).send({ 
          error: 'Forbidden',
          message: `Required roles: ${roles.join(', ')}`
        });
      }
    };
  }

  requirePermission(permissions) {
    return (request, reply) => {
      // For identity header auth, check user roles
      if (request.user) {
        const userRoles = request.user.roles || [];
        const hasAdminRole = userRoles.includes('admin') || userRoles.includes('super-admin');
        
        if (hasAdminRole) {
          return; // Admins have all permissions
        }
      }

      // For API key auth, check explicit permissions
      if (request.apiKey) {
        const keyPermissions = request.apiKey.permissions || [];
        const hasPermission = permissions.some(perm => keyPermissions.includes(perm));
        
        if (hasPermission) {
          return;
        }
      }

      return reply.code(403).send({ 
        error: 'Forbidden',
        message: `Required permissions: ${permissions.join(', ')}`
      });
    };
  }

  // Check if user can access their own data or is admin
  requireSelfOrAdmin(request, reply) {
    const targetUserId = request.params.userId;
    const currentUserSub = request.user?.sub || request.apiKey?.userSub;
    const userRoles = request.user?.roles || [];
    
    const isAdmin = userRoles.includes('admin') || userRoles.includes('super-admin');
    const isSelf = request.user?.sub === targetUserId; // If using keycloak_sub as ID
    
    if (!isAdmin && !isSelf) {
      return reply.code(403).send({ 
        error: 'Forbidden',
        message: 'Can only access your own data or requires admin role'
      });
    }
  }
}

module.exports = AuthMiddleware;
