/**
 * Redis Session Store for Fastify
 * 
 * Custom Redis session store implementation for Fastify 4.x that supports
 * tool-specific session data and enhanced session management.
 * 
 * Note: @fastify/session v10.x does not support Redis stores natively,
 * so we implement a custom store following Fastify session store interface.
 */

const Redis = require('ioredis');

class RedisSessionStore {
  constructor(options = {}) {
    this.redis = new Redis(options.redisUrl || 'redis://redis:6379', {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      ...options.redisOptions
    });

    this.ttl = options.ttl || 86400; // 24 hours default
    this.prefix = options.prefix || 'sso:session:';
    
    // Error handling
    this.redis.on('error', (err) => {
      console.error('Redis session store error:', err);
    });

    this.redis.on('ready', () => {
      console.log('✅ Redis session store connected');
    });
  }

  // Get session data
  async get(sessionId) {
    try {
      const key = this.prefix + sessionId;
      const data = await this.redis.get(key);
      
      if (!data) {
        return null;
      }

      const session = JSON.parse(data);
      
      // Check if session has expired
      if (session._expires && Date.now() > session._expires) {
        await this.destroy(sessionId);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Redis session get error:', error);
      return null;
    }
  }

  // Set session data
  async set(sessionId, session, callback) {
    try {
      const key = this.prefix + sessionId;
      
      // Add metadata
      const sessionData = {
        ...session,
        _sessionId: sessionId,
        _lastAccess: Date.now(),
        _expires: Date.now() + (this.ttl * 1000)
      };

      // Enhance session with tool-specific data if user is authenticated
      if (session.user) {
        sessionData.toolSessions = this.generateToolSessions(session.user);
      }

      await this.redis.setex(key, this.ttl, JSON.stringify(sessionData));
      
      if (callback) callback(null);
      return sessionData;
    } catch (error) {
      console.error('Redis session set error:', error);
      if (callback) callback(error);
      throw error;
    }
  }

  // Destroy session
  async destroy(sessionId, callback) {
    try {
      const key = this.prefix + sessionId;
      await this.redis.del(key);
      
      if (callback) callback(null);
      return true;
    } catch (error) {
      console.error('Redis session destroy error:', error);
      if (callback) callback(error);
      return false;
    }
  }

  // Touch session (update TTL)
  async touch(sessionId, session, callback) {
    try {
      const key = this.prefix + sessionId;
      await this.redis.expire(key, this.ttl);
      
      if (callback) callback(null);
      return true;
    } catch (error) {
      console.error('Redis session touch error:', error);
      if (callback) callback(error);
      return false;
    }
  }

  // Generate tool-specific session data
  generateToolSessions(user) {
    const supportedTools = ['github', 'gitlab', 'jenkins', 'argocd', 'terraform', 'sonarqube', 'grafana', 'prometheus', 'kibana', 'snyk', 'jira', 'servicenow'];
    const toolSessions = {};

    for (const toolId of supportedTools) {
      toolSessions[toolId] = {
        hasAccess: this.hasToolAccess(toolId, user.roles, user.groups || []),
        lastTokenGenerated: null,
        tokenExpiresAt: null,
        launchCount: 0,
        lastLaunchAt: null,
        preferences: {},
        entitlements: this.getToolEntitlements(toolId, user.roles, user.groups || [])
      };
    }

    return toolSessions;
  }

  // Check if user has access to a tool
  hasToolAccess(toolId, userRoles, userGroups) {
    // Basic access check - can be enhanced based on business rules
    const allRoles = [...userRoles, ...userGroups.map(g => g.replace('/', ''))];
    
    // Admin users have access to all tools
    if (allRoles.some(role => role.toLowerCase() === 'admin')) {
      return true;
    }

    // Tool-specific access logic
    const toolSpecificRoles = {
      github: ['github-user', 'developer', 'user'],
      gitlab: ['gitlab-user', 'developer', 'user'],
      jenkins: ['jenkins-user', 'ci-user', 'developer', 'user'],
      argocd: ['argocd-user', 'deployment-user', 'developer', 'user'],
      terraform: ['terraform-user', 'infrastructure-user', 'user'],
      sonarqube: ['sonarqube-user', 'quality-user', 'developer', 'user'],
      grafana: ['grafana-user', 'monitoring-user', 'user'],
      prometheus: ['prometheus-user', 'monitoring-user', 'user'],
      kibana: ['kibana-user', 'logging-user', 'user'],
      snyk: ['snyk-user', 'security-user', 'developer', 'user'],
      jira: ['jira-user', 'project-user', 'user'],
      servicenow: ['servicenow-user', 'itil-user', 'user']
    };

    const allowedRoles = toolSpecificRoles[toolId] || ['user'];
    return allRoles.some(role => 
      allowedRoles.some(allowed => 
        role.toLowerCase().includes(allowed.toLowerCase())
      )
    );
  }

  // Get tool-specific entitlements
  getToolEntitlements(toolId, userRoles, userGroups) {
    const allRoles = [...userRoles, ...userGroups.map(g => g.replace('/', ''))];
    const isAdmin = allRoles.some(role => role.toLowerCase() === 'admin');

    const baseEntitlements = {
      canLaunch: this.hasToolAccess(toolId, userRoles, userGroups),
      canConfigure: isAdmin,
      canViewLogs: true,
      canViewMetrics: true
    };

    // Tool-specific entitlements
    const toolEntitlements = {
      github: {
        ...baseEntitlements,
        canCreateRepo: isAdmin || allRoles.includes('developer'),
        canManageWebhooks: isAdmin,
        canManageTeams: isAdmin
      },
      gitlab: {
        ...baseEntitlements,
        canCreateProject: isAdmin || allRoles.includes('developer'),
        canManagePipelines: isAdmin || allRoles.includes('developer'),
        canManageGroups: isAdmin
      },
      jenkins: {
        ...baseEntitlements,
        canCreateJobs: isAdmin || allRoles.includes('jenkins-admin'),
        canTriggerBuilds: isAdmin || allRoles.includes('developer'),
        canViewBuildHistory: true
      },
      argocd: {
        ...baseEntitlements,
        canSync: isAdmin || allRoles.includes('developer'),
        canCreateApps: isAdmin,
        canManageRepos: isAdmin
      },
      terraform: {
        ...baseEntitlements,
        canCreateWorkspace: isAdmin,
        canRunPlans: isAdmin || allRoles.includes('infrastructure-user'),
        canApplyChanges: isAdmin
      },
      sonarqube: {
        ...baseEntitlements,
        canCreateProjects: isAdmin,
        canViewQualityGates: true,
        canConfigureRules: isAdmin
      },
      grafana: {
        ...baseEntitlements,
        canCreateDashboards: isAdmin || allRoles.includes('developer'),
        canManageAlerts: isAdmin,
        canManageDataSources: isAdmin
      },
      prometheus: {
        ...baseEntitlements,
        canViewMetrics: true,
        canConfigureRules: isAdmin,
        canManageTargets: isAdmin
      },
      kibana: {
        ...baseEntitlements,
        canCreateIndices: isAdmin,
        canViewLogs: true,
        canCreateVisualizations: isAdmin || allRoles.includes('developer')
      },
      snyk: {
        ...baseEntitlements,
        canScanProjects: isAdmin || allRoles.includes('developer'),
        canViewVulnerabilities: true,
        canManagePolicies: isAdmin
      },
      jira: {
        ...baseEntitlements,
        canCreateTickets: true,
        canManageProjects: isAdmin,
        canViewReports: isAdmin || allRoles.includes('project-manager')
      },
      servicenow: {
        ...baseEntitlements,
        canCreateIncidents: true,
        canManageWorkflows: isAdmin,
        canViewReports: isAdmin
      }
    };

    return toolEntitlements[toolId] || baseEntitlements;
  }

  // Get active sessions count
  async getActiveSessionsCount() {
    try {
      const keys = await this.redis.keys(this.prefix + '*');
      return keys.length;
    } catch (error) {
      console.error('Redis session count error:', error);
      return 0;
    }
  }

  // Clean expired sessions
  async cleanExpiredSessions() {
    try {
      const keys = await this.redis.keys(this.prefix + '*');
      let cleanedCount = 0;

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const session = JSON.parse(data);
          if (session._expires && Date.now() > session._expires) {
            await this.redis.del(key);
            cleanedCount++;
          }
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Redis session cleanup error:', error);
      return 0;
    }
  }

  // Close Redis connection
  async close() {
    await this.redis.quit();
  }
}

module.exports = RedisSessionStore;
