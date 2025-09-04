/**
 * Health Monitoring Service
 * 
 * Continuously monitors the health of registered tools
 * and maintains health status in the database.
 */

const axios = require('axios');

class HealthMonitor {
  constructor(fastify, config, databaseManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.healthCheckTimer = null;
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.fastify.log.info('🏥 Starting health monitoring service');
    
    // Initial health check
    await this.performHealthChecks();
    
    // Schedule periodic health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks().catch(error => {
        this.fastify.log.error('Health monitoring error:', error);
      });
    }, this.config.HEALTH_CHECK_INTERVAL);
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    this.fastify.log.info('🏥 Health monitoring service stopped');
  }

  async performHealthChecks() {
    try {
      const tools = await this.db.getTools({ is_active: true });
      this.fastify.log.debug(`Performing health checks for ${tools.length} tools`);

      const healthCheckPromises = tools.map(tool => 
        this.checkToolHealth(tool).catch(error => {
          this.fastify.log.error(`Health check failed for tool ${tool.name}:`, error);
          return {
            toolId: tool.id,
            status: 'unhealthy',
            responseTime: null,
            errorMessage: error.message
          };
        })
      );

      const results = await Promise.allSettled(healthCheckPromises);
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          await this.db.updateToolHealth(result.value.toolId, {
            status: result.value.status,
            responseTime: result.value.responseTime,
            errorMessage: result.value.errorMessage
          });
        }
      }

      this.fastify.log.debug('Health checks completed');
    } catch (error) {
      this.fastify.log.error('Failed to perform health checks:', error);
    }
  }

  async checkToolHealth(tool) {
    const startTime = Date.now();
    
    // Use health_check_url if available, otherwise fall back to base_url + /healthz
    const healthUrl = tool.health_check_url || `${tool.base_url}/healthz`;
    
    try {
      const response = await axios.get(healthUrl, {
        timeout: this.config.HEALTH_CHECK_TIMEOUT,
        validateStatus: (status) => status < 500 // Accept 4xx as healthy
      });

      const responseTime = Date.now() - startTime;
      
      let status = 'healthy';
      let errorMessage = null;

      // Determine health status based on response
      if (response.status >= 400) {
        status = 'unhealthy';
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      } else if (response.data && response.data.status) {
        // If the service provides its own status
        const serviceStatus = response.data.status;
        if (serviceStatus === 'ok' || serviceStatus === 'ready' || serviceStatus === 'healthy') {
          status = 'healthy';
        } else {
          status = 'unhealthy';
          errorMessage = `Service reported status: ${serviceStatus}`;
        }
      }

      return {
        toolId: tool.id,
        status,
        responseTime,
        errorMessage
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        toolId: tool.id,
        status: 'unhealthy',
        responseTime: responseTime > this.config.HEALTH_CHECK_TIMEOUT ? null : responseTime,
        errorMessage: error.message
      };
    }
  }

  async getToolHealthSummary(toolId) {
    const healthRecords = await this.db.getToolHealth(toolId);
    
    if (healthRecords.length === 0) {
      return {
        status: 'unknown',
        lastChecked: null,
        uptime: 0,
        avgResponseTime: null
      };
    }

    const latest = healthRecords[0];
    const healthyCount = healthRecords.filter(r => r.status === 'healthy').length;
    const uptime = (healthyCount / healthRecords.length) * 100;
    
    const responseTimes = healthRecords
      .filter(r => r.response_time_ms !== null)
      .map(r => r.response_time_ms);
    
    const avgResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;

    return {
      status: latest.status,
      lastChecked: latest.checked_at,
      uptime: Math.round(uptime),
      avgResponseTime,
      errorMessage: latest.error_message
    };
  }

  async getSystemHealthSummary() {
    const tools = await this.db.getTools({ enabled: true });
    const healthSummaries = await Promise.all(
      tools.map(async tool => ({
        ...tool,
        health: await this.getToolHealthSummary(tool.id)
      }))
    );

    const totalTools = tools.length;
    const healthyTools = healthSummaries.filter(t => t.health.status === 'healthy').length;
    const unhealthyTools = healthSummaries.filter(t => t.health.status === 'unhealthy').length;
    const unknownTools = totalTools - healthyTools - unhealthyTools;

    return {
      summary: {
        total: totalTools,
        healthy: healthyTools,
        unhealthy: unhealthyTools,
        unknown: unknownTools,
        systemHealth: totalTools > 0 ? (healthyTools / totalTools) * 100 : 0
      },
      tools: healthSummaries
    };
  }
}

module.exports = HealthMonitor;
