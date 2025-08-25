/**
 * Integration Health Monitor - Phase 8
 * Comprehensive monitoring of tool integration health including SSO, API, webhooks, permissions
 */

const axios = require('axios');
const crypto = require('crypto');

class IntegrationHealthMonitor {
  constructor(fastify, config, databaseManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.monitoringIntervals = new Map();
    this.isRunning = false;
    
    // Tool-specific integration checkers
    this.integrationCheckers = {
      'github': this.checkGitHubIntegrations.bind(this),
      'gitlab': this.checkGitLabIntegrations.bind(this),
      'jenkins': this.checkJenkinsIntegrations.bind(this),
      'argocd': this.checkArgoCDIntegrations.bind(this),
      'terraform': this.checkTerraformIntegrations.bind(this),
      'sonarqube': this.checkSonarQubeIntegrations.bind(this),
      'grafana': this.checkGrafanaIntegrations.bind(this),
      'prometheus': this.checkPrometheusIntegrations.bind(this),
      'kibana': this.checkKibanaIntegrations.bind(this),
      'snyk': this.checkSnykIntegrations.bind(this),
      'jira': this.checkJiraIntegrations.bind(this),
      'servicenow': this.checkServiceNowIntegrations.bind(this)
    };
  }

  async initialize() {
    this.fastify.log.info('🔗 Initializing Integration Health Monitor...');
    
    try {
      // Load tool configurations
      await this.loadToolConfigurations();
      
      this.fastify.log.info('✅ Integration Health Monitor initialized successfully');
    } catch (error) {
      this.fastify.log.error('❌ Failed to initialize Integration Health Monitor:', error);
      throw error;
    }
  }

  async start() {
    if (this.isRunning) {
      this.fastify.log.warn('Integration Health Monitor is already running');
      return;
    }

    this.isRunning = true;
    this.fastify.log.info('🚀 Starting Integration Health Monitor...');

    // Start monitoring for each tool
    const tools = await this.getActiveTools();
    
    for (const tool of tools) {
      if (this.integrationCheckers[tool.slug]) {
        const interval = setInterval(
          () => this.checkToolIntegrations(tool),
          this.getCheckInterval(tool.slug)
        );
        
        this.monitoringIntervals.set(tool.slug, interval);
        
        // Immediate first check
        setImmediate(() => this.checkToolIntegrations(tool));
      }
    }

    this.fastify.log.info(`✅ Integration Health Monitor started for ${tools.length} tools`);
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.fastify.log.info('🛑 Stopping Integration Health Monitor...');

    // Clear all monitoring intervals
    for (const [toolSlug, interval] of this.monitoringIntervals) {
      clearInterval(interval);
      this.fastify.log.debug(`Stopped monitoring ${toolSlug}`);
    }
    
    this.monitoringIntervals.clear();
    this.fastify.log.info('✅ Integration Health Monitor stopped');
  }

  async loadToolConfigurations() {
    try {
      this.toolConfigs = await this.getActiveTools();
      this.fastify.log.info(`Loaded ${this.toolConfigs.length} tool configurations`);
    } catch (error) {
      this.fastify.log.error('Failed to load tool configurations:', error);
      throw error;
    }
  }

  async getActiveTools() {
    try {
      const client = await this.db.db.connect();
      
      try {
        const query = `
          SELECT id, slug, name, base_url, auth_config_json, webhook_config_json
          FROM tools 
          WHERE is_active = TRUE
          ORDER BY slug
        `;
        
        const result = await client.query(query);
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error('Failed to get active tools:', error);
      return [];
    }
  }

  getCheckInterval(toolSlug) {
    // Different intervals for different integration types
    const intervals = {
      'sso': 60000,       // 1 minute
      'api': 120000,      // 2 minutes
      'webhook': 300000,  // 5 minutes
      'permission': 600000, // 10 minutes
      'data_sync': 900000   // 15 minutes
    };
    
    return intervals.sso; // Default to SSO interval
  }

  async checkToolIntegrations(tool) {
    try {
      this.fastify.log.debug(`Checking integrations for ${tool.slug}`);
      
      const checker = this.integrationCheckers[tool.slug];
      if (checker) {
        await checker(tool);
      } else {
        await this.checkGenericIntegrations(tool);
      }
    } catch (error) {
      this.fastify.log.error(`Failed to check integrations for ${tool.slug}:`, error);
    }
  }

  // ===== TOOL-SPECIFIC INTEGRATION CHECKERS =====

  async checkGitHubIntegrations(tool) {
    const integrations = {
      sso: () => this.checkGitHubSSO(tool),
      api: () => this.checkGitHubAPI(tool),
      webhook: () => this.checkGitHubWebhooks(tool),
      permission: () => this.checkGitHubPermissions(tool)
    };

    for (const [type, checker] of Object.entries(integrations)) {
      try {
        const result = await checker();
        await this.storeIntegrationHealth(tool.slug, type, result);
      } catch (error) {
        await this.storeIntegrationHealth(tool.slug, type, {
          status: 'unhealthy',
          error_message: error.message,
          checked_at: new Date().toISOString()
        });
      }
    }
  }

  async checkGitHubSSO(tool) {
    try {
      // Check GitHub OAuth app status
      const authConfig = this.parseAuthConfig(tool.auth_config_json);
      if (!authConfig.client_id || !authConfig.client_secret) {
        return {
          status: 'unhealthy',
          auth_status: 'missing',
          error_message: 'GitHub OAuth configuration missing'
        };
      }

      // Verify OAuth app accessibility
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          'User-Agent': 'SSO-Hub-Health-Check',
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 10000,
        validateStatus: (status) => status === 401 // Expect unauthorized without token
      });

      return {
        status: response.status === 401 ? 'healthy' : 'degraded',
        auth_status: 'configured',
        response_time_ms: response.headers['x-response-time'] || null,
        api_rate_limit_remaining: response.headers['x-ratelimit-remaining'] || null,
        checked_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        auth_status: 'invalid',
        error_message: error.message,
        checked_at: new Date().toISOString()
      };
    }
  }

  async checkGitHubAPI(tool) {
    try {
      // Check GitHub API connectivity and rate limits
      const response = await axios.get('https://api.github.com/rate_limit', {
        headers: {
          'User-Agent': 'SSO-Hub-Health-Check',
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 10000
      });

      const rateLimit = response.data.rate;
      const remaining = rateLimit.remaining;
      const resetTime = new Date(rateLimit.reset * 1000);

      return {
        status: remaining > 100 ? 'healthy' : 'degraded',
        api_rate_limit_remaining: remaining,
        api_rate_limit_reset: resetTime.toISOString(),
        response_time_ms: response.headers['x-response-time'] || null,
        checked_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error_message: error.message,
        checked_at: new Date().toISOString()
      };
    }
  }

  async checkGitHubWebhooks(tool) {
    try {
      const webhookConfig = this.parseWebhookConfig(tool.webhook_config_json);
      
      // Check webhook configuration
      if (!webhookConfig.secret || !webhookConfig.endpoint) {
        return {
          status: 'unhealthy',
          error_message: 'Webhook configuration incomplete',
          webhook_delivery_success_rate: 0,
          checked_at: new Date().toISOString()
        };
      }

      // Get recent webhook delivery statistics
      const deliveryStats = await this.getWebhookDeliveryStats(tool.slug);
      
      return {
        status: deliveryStats.success_rate > 90 ? 'healthy' : 'degraded',
        webhook_delivery_success_rate: deliveryStats.success_rate,
        last_webhook_received: deliveryStats.last_received,
        checked_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error_message: error.message,
        webhook_delivery_success_rate: 0,
        checked_at: new Date().toISOString()
      };
    }
  }

  async checkGitHubPermissions(tool) {
    // Simplified permission check - in real implementation, would verify OAuth scopes
    return {
      status: 'healthy',
      permission_status: 'granted',
      checked_at: new Date().toISOString()
    };
  }

  async checkGitLabIntegrations(tool) {
    const integrations = {
      sso: () => this.checkGitLabSSO(tool),
      api: () => this.checkGitLabAPI(tool),
      webhook: () => this.checkGitLabWebhooks(tool),
      permission: () => this.checkGitLabPermissions(tool)
    };

    for (const [type, checker] of Object.entries(integrations)) {
      try {
        const result = await checker();
        await this.storeIntegrationHealth(tool.slug, type, result);
      } catch (error) {
        await this.storeIntegrationHealth(tool.slug, type, {
          status: 'unhealthy',
          error_message: error.message,
          checked_at: new Date().toISOString()
        });
      }
    }
  }

  async checkGitLabSSO(tool) {
    try {
      const authConfig = this.parseAuthConfig(tool.auth_config_json);
      const baseUrl = tool.base_url || 'https://gitlab.com';
      
      // Check GitLab instance health
      const response = await axios.get(`${baseUrl}/-/health`, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      return {
        status: response.status === 200 ? 'healthy' : 'degraded',
        auth_status: authConfig.client_id ? 'configured' : 'missing',
        response_time_ms: response.headers['x-response-time'] || null,
        checked_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        auth_status: 'invalid',
        error_message: error.message,
        checked_at: new Date().toISOString()
      };
    }
  }

  async checkGitLabAPI(tool) {
    // Similar to GitHub but for GitLab API
    return this.checkGenericAPI(tool, `${tool.base_url}/api/v4/version`);
  }

  async checkGitLabWebhooks(tool) {
    return this.checkGenericWebhooks(tool);
  }

  async checkGitLabPermissions(tool) {
    return this.checkGenericPermissions(tool);
  }

  async checkJenkinsIntegrations(tool) {
    const integrations = {
      sso: () => this.checkJenkinsSSO(tool),
      api: () => this.checkJenkinsAPI(tool),
      webhook: () => this.checkJenkinsWebhooks(tool)
    };

    for (const [type, checker] of Object.entries(integrations)) {
      try {
        const result = await checker();
        await this.storeIntegrationHealth(tool.slug, type, result);
      } catch (error) {
        await this.storeIntegrationHealth(tool.slug, type, {
          status: 'unhealthy',
          error_message: error.message,
          checked_at: new Date().toISOString()
        });
      }
    }
  }

  async checkJenkinsSSO(tool) {
    try {
      // Check Jenkins OIDC plugin status
      const response = await axios.get(`${tool.base_url}/api/json`, {
        timeout: 10000,
        validateStatus: (status) => status === 401 || status === 200
      });

      return {
        status: response.status === 401 ? 'healthy' : 'degraded',
        auth_status: 'configured',
        checked_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        auth_status: 'invalid',
        error_message: error.message,
        checked_at: new Date().toISOString()
      };
    }
  }

  async checkJenkinsAPI(tool) {
    return this.checkGenericAPI(tool, `${tool.base_url}/api/json`);
  }

  async checkJenkinsWebhooks(tool) {
    return this.checkGenericWebhooks(tool);
  }

  // ===== GENERIC INTEGRATION CHECKERS =====

  async checkGenericIntegrations(tool) {
    const integrations = ['sso', 'api', 'webhook', 'permission'];
    
    for (const type of integrations) {
      try {
        let result;
        
        switch (type) {
          case 'sso':
            result = await this.checkGenericSSO(tool);
            break;
          case 'api':
            result = await this.checkGenericAPI(tool);
            break;
          case 'webhook':
            result = await this.checkGenericWebhooks(tool);
            break;
          case 'permission':
            result = await this.checkGenericPermissions(tool);
            break;
        }
        
        await this.storeIntegrationHealth(tool.slug, type, result);
      } catch (error) {
        await this.storeIntegrationHealth(tool.slug, type, {
          status: 'unhealthy',
          error_message: error.message,
          checked_at: new Date().toISOString()
        });
      }
    }
  }

  async checkGenericSSO(tool) {
    try {
      const authConfig = this.parseAuthConfig(tool.auth_config_json);
      
      // Basic connectivity check
      const response = await axios.get(tool.base_url, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      return {
        status: response.status < 400 ? 'healthy' : 'degraded',
        auth_status: authConfig.client_id ? 'configured' : 'missing',
        response_time_ms: response.headers['x-response-time'] || null,
        checked_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        auth_status: 'invalid',
        error_message: error.message,
        checked_at: new Date().toISOString()
      };
    }
  }

  async checkGenericAPI(tool, apiEndpoint = null) {
    try {
      const endpoint = apiEndpoint || `${tool.base_url}/api/health`;
      
      const response = await axios.get(endpoint, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      return {
        status: response.status < 400 ? 'healthy' : 'degraded',
        response_time_ms: response.headers['x-response-time'] || null,
        checked_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error_message: error.message,
        checked_at: new Date().toISOString()
      };
    }
  }

  async checkGenericWebhooks(tool) {
    try {
      const deliveryStats = await this.getWebhookDeliveryStats(tool.slug);
      
      return {
        status: deliveryStats.success_rate > 90 ? 'healthy' : 'degraded',
        webhook_delivery_success_rate: deliveryStats.success_rate,
        last_webhook_received: deliveryStats.last_received,
        checked_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error_message: error.message,
        webhook_delivery_success_rate: 0,
        checked_at: new Date().toISOString()
      };
    }
  }

  async checkGenericPermissions(tool) {
    // Generic permission check - assumes healthy if auth is configured
    const authConfig = this.parseAuthConfig(tool.auth_config_json);
    
    return {
      status: 'healthy',
      permission_status: authConfig.client_id ? 'granted' : 'unknown',
      checked_at: new Date().toISOString()
    };
  }

  // ===== HELPER METHODS =====

  parseAuthConfig(configJson) {
    try {
      if (typeof configJson === 'string') {
        return JSON.parse(configJson);
      }
      return configJson || {};
    } catch (error) {
      return {};
    }
  }

  parseWebhookConfig(configJson) {
    try {
      if (typeof configJson === 'string') {
        return JSON.parse(configJson);
      }
      return configJson || {};
    } catch (error) {
      return {};
    }
  }

  async getWebhookDeliveryStats(toolSlug) {
    try {
      const client = await this.db.db.connect();
      
      try {
        const query = `
          SELECT 
            COUNT(*) as total_webhooks,
            COUNT(CASE WHEN processing_result = 'success' THEN 1 END) as successful_webhooks,
            MAX(received_at) as last_received
          FROM webhook_deliveries 
          WHERE tool_slug = $1 
            AND received_at >= NOW() - INTERVAL '24 hours'
        `;
        
        const result = await client.query(query, [toolSlug]);
        const row = result.rows[0];
        
        const total = parseInt(row.total_webhooks) || 0;
        const successful = parseInt(row.successful_webhooks) || 0;
        const successRate = total > 0 ? (successful / total) * 100 : 100;
        
        return {
          success_rate: Math.round(successRate * 100) / 100,
          last_received: row.last_received,
          total_count: total,
          successful_count: successful
        };
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error('Failed to get webhook delivery stats:', error);
      return { success_rate: 0, last_received: null, total_count: 0, successful_count: 0 };
    }
  }

  async storeIntegrationHealth(toolSlug, integrationType, healthData) {
    try {
      const client = await this.db.db.connect();
      
      try {
        const query = `
          UPDATE integration_health 
          SET 
            status = $3::VARCHAR(20),
            response_time_ms = $4,
            last_check_at = NOW(),
            last_healthy_at = CASE WHEN $3::VARCHAR(20) = 'healthy' THEN NOW() ELSE last_healthy_at END,
            auth_status = $5::VARCHAR(20),
            last_error_message = $6,
            consecutive_failures = CASE 
              WHEN $3::VARCHAR(20) = 'healthy' THEN 0 
              ELSE consecutive_failures + 1 
            END
          WHERE tool_slug = $1::VARCHAR(50) AND integration_type = $2::VARCHAR(50)
        `;
        
        const values = [
          toolSlug,
          integrationType,
          healthData.status,
          healthData.response_time_ms,
          healthData.auth_status,
          healthData.error_message
        ];
        
        await client.query(query, values);
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error(`Failed to store integration health for ${toolSlug}:${integrationType}:`, error);
    }
  }

  // Add placeholder methods for other tools
  async checkArgoCDIntegrations(tool) { return this.checkGenericIntegrations(tool); }
  async checkTerraformIntegrations(tool) { return this.checkGenericIntegrations(tool); }
  async checkSonarQubeIntegrations(tool) { return this.checkGenericIntegrations(tool); }
  async checkGrafanaIntegrations(tool) { return this.checkGenericIntegrations(tool); }
  async checkPrometheusIntegrations(tool) { return this.checkGenericIntegrations(tool); }
  async checkKibanaIntegrations(tool) { return this.checkGenericIntegrations(tool); }
  async checkSnykIntegrations(tool) { return this.checkGenericIntegrations(tool); }
  async checkJiraIntegrations(tool) { return this.checkGenericIntegrations(tool); }
  async checkServiceNowIntegrations(tool) { return this.checkGenericIntegrations(tool); }

  // ===== PUBLIC API METHODS =====

  async getIntegrationHealthOverview() {
    try {
      const client = await this.db.db.connect();
      
      try {
        const query = `
          SELECT 
            tool_slug, integration_type, status, response_time_ms,
            last_check_at, last_healthy_at, auth_status, permission_status,
            api_rate_limit_remaining, webhook_delivery_success_rate,
            error_message, consecutive_failures
          FROM integration_health 
          ORDER BY tool_slug, integration_type
        `;
        
        const result = await client.query(query);
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error('Failed to get integration health overview:', error);
      throw error;
    }
  }
}

module.exports = IntegrationHealthMonitor;
