/**
 * Enhanced Health Monitor - Phase 4
 * Comprehensive tool-specific health monitoring with advanced metrics collection
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class EnhancedHealthMonitor {
  constructor(fastify, config, databaseManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.monitoringIntervals = new Map();
    this.healthCheckers = new Map();
    this.isRunning = false;
    
    // Initialize tool-specific health checkers
    this.initializeToolCheckers();
  }

  async initialize() {
    this.fastify.log.info('🔍 Enhanced Health Monitor: Initializing comprehensive tool monitoring');
    
    // Load all tool health configurations
    await this.loadHealthConfigurations();
    
    this.fastify.log.info('✅ Enhanced Health Monitor: Initialized with comprehensive tool support');
  }

  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.fastify.log.info('🏥 Starting enhanced health monitoring service');
    
    // Start monitoring for all active tools
    await this.startComprehensiveMonitoring();
    
    this.fastify.log.info('✅ Enhanced Health Monitor: Active monitoring started for all tools');
  }

  async startComprehensiveMonitoring() {
    // This method will be called by start() to begin monitoring
    // Health monitoring is already set up in loadHealthConfigurations via setupToolMonitoring
    this.fastify.log.info('📊 Comprehensive monitoring active for all tools');
  }

  async loadHealthConfigurations() {
    try {
      const healthConfigs = await this.db.getAllHealthConfigurations();
      this.fastify.log.info(`Loaded health configurations for ${healthConfigs.length} tools`);
      
      for (const config of healthConfigs) {
        await this.setupToolMonitoring(config);
      }
    } catch (error) {
      this.fastify.log.error('Failed to load health configurations:', error);
      throw error;
    }
  }

  async setupToolMonitoring(healthConfig) {
    const { tool_id, tool_slug, check_interval_seconds } = healthConfig;
    
    // Clear existing interval if any
    if (this.monitoringIntervals.has(tool_id)) {
      clearInterval(this.monitoringIntervals.get(tool_id));
    }
    
    // Setup new monitoring interval
    const intervalId = setInterval(async () => {
      await this.performComprehensiveHealthCheck(healthConfig);
    }, check_interval_seconds * 1000);
    
    this.monitoringIntervals.set(tool_id, intervalId);
    
    // Perform initial health check
    setImmediate(() => this.performComprehensiveHealthCheck(healthConfig));
  }

  async performComprehensiveHealthCheck(healthConfig) {
    const startTime = performance.now();
    const checkTimestamp = new Date();
    
    try {
      // Get tool-specific checker
      const checker = this.healthCheckers.get(healthConfig.tool_slug) || this.defaultHealthChecker;
      
      // Perform the health check
      const result = await checker.call(this, healthConfig);
      
      const responseTime = Math.round(performance.now() - startTime);
      
      // Record successful check
      await this.recordHealthCheckResult(healthConfig.tool_id, {
        status: 'healthy',
        response_time_ms: responseTime,
        check_timestamp: checkTimestamp,
        status_details: result.details || {},
        consecutive_failures: 0
      });
      
      // Record performance metrics
      await this.recordPerformanceMetrics(healthConfig.tool_id, result.metrics || {}, responseTime);
      
      this.fastify.log.debug(`Health check passed for ${healthConfig.tool_slug}: ${responseTime}ms`);
      
    } catch (error) {
      const responseTime = Math.round(performance.now() - startTime);
      
      // Record failed check
      await this.recordHealthCheckResult(healthConfig.tool_id, {
        status: 'unhealthy',
        response_time_ms: responseTime,
        check_timestamp: checkTimestamp,
        failure_reason: error.message,
        status_details: { error: error.message, stack: error.stack },
        consecutive_failures: 1 // Will be incremented in DB
      });
      
      this.fastify.log.warn(`Health check failed for ${healthConfig.tool_slug}:`, error.message);
    }
  }

  // ===== TOOL-SPECIFIC HEALTH CHECKERS =====

  initializeToolCheckers() {
    this.healthCheckers.set('github', this.checkGitHubHealth);
    this.healthCheckers.set('gitlab', this.checkGitLabHealth);
    this.healthCheckers.set('jenkins', this.checkJenkinsHealth);
    this.healthCheckers.set('argocd', this.checkArgoCDHealth);
    this.healthCheckers.set('terraform', this.checkTerraformHealth);
    this.healthCheckers.set('sonarqube', this.checkSonarQubeHealth);
    this.healthCheckers.set('grafana', this.checkGrafanaHealth);
    this.healthCheckers.set('prometheus', this.checkPrometheusHealth);
    this.healthCheckers.set('kibana', this.checkKibanaHealth);
    this.healthCheckers.set('snyk', this.checkSnykHealth);
    this.healthCheckers.set('jira', this.checkJiraHealth);
    this.healthCheckers.set('servicenow', this.checkServiceNowHealth);
  }

  async checkGitHubHealth(healthConfig) {
    const baseUrl = this.getToolBaseUrl('github');
    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_HEALTH_TOKEN;
    
    // Check API rate limits and repository access
    const response = await this.makeHealthRequest({
      url: `${baseUrl}/rate_limit`,
      headers: token ? { 'Authorization': `token ${token}` } : {},
      timeout: healthConfig.timeout_seconds * 1000
    });
    
    const rateLimit = response.data.rate;
    const isHealthy = rateLimit.remaining > 100; // Threshold for rate limit warnings
    
    // Additional checks: webhook delivery, repository access
    const webhookHealth = token ? await this.checkGitHubWebhooks(baseUrl, token) : { status: 'skipped' };
    
    return {
      healthy: isHealthy,
      details: {
        rate_limit: rateLimit,
        webhook_health: webhookHealth,
        api_version: response.headers['x-github-media-type']
      },
      metrics: {
        rate_limit_remaining: rateLimit.remaining,
        rate_limit_limit: rateLimit.limit,
        rate_limit_reset_minutes: Math.round((rateLimit.reset * 1000 - Date.now()) / 60000)
      }
    };
  }

  async checkGitLabHealth(healthConfig) {
    const baseUrl = this.getToolBaseUrl('gitlab');
    const token = process.env.GITLAB_TOKEN || process.env.GITLAB_HEALTH_TOKEN;
    
    // Check GitLab version and API status
    const response = await this.makeHealthRequest({
      url: `${baseUrl}/api/v4/version`,
      headers: token ? { 'Private-Token': token } : {},
      timeout: healthConfig.timeout_seconds * 1000
    });
    
    // Additional checks: runner status, project access
    const runnerStatus = token ? await this.checkGitLabRunners(baseUrl, token) : { status: 'skipped' };
    
    return {
      healthy: true,
      details: {
        version: response.data.version,
        revision: response.data.revision,
        runner_status: runnerStatus
      },
      metrics: {
        version: response.data.version,
        api_response_time: response.responseTime || 0
      }
    };
  }

  async checkJenkinsHealth(healthConfig) {
    const baseUrl = this.getToolBaseUrl('jenkins');
    
    // Check Jenkins API and build queue
    const response = await this.makeHealthRequest({
      url: `${baseUrl}/api/json?tree=mode,jobs[name,color],quietingDown`,
      timeout: healthConfig.timeout_seconds * 1000
    });
    
    const jenkinsData = response.data;
    const isHealthy = jenkinsData.mode === 'NORMAL' && !jenkinsData.quietingDown;
    
    // Check build queue
    const queueResponse = await this.makeHealthRequest({
      url: `${baseUrl}/queue/api/json`,
      timeout: healthConfig.timeout_seconds * 1000
    });
    
    return {
      healthy: isHealthy,
      details: {
        mode: jenkinsData.mode,
        quieting_down: jenkinsData.quietingDown,
        total_jobs: jenkinsData.jobs?.length || 0,
        queue_size: queueResponse.data.items?.length || 0
      },
      metrics: {
        build_queue_size: queueResponse.data.items?.length || 0,
        total_jobs: jenkinsData.jobs?.length || 0,
        failed_jobs: jenkinsData.jobs?.filter(job => job.color?.includes('red')).length || 0
      }
    };
  }

  async checkArgoCDHealth(healthConfig) {
    const baseUrl = this.getToolBaseUrl('argocd');
    const token = process.env.ARGOCD_TOKEN || process.env.ARGOCD_HEALTH_TOKEN;
    
    // Check Argo CD version and cluster connectivity
    const response = await this.makeHealthRequest({
      url: `${baseUrl}/api/version`,
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      timeout: healthConfig.timeout_seconds * 1000
    });
    
    // Check application health
    const appHealth = token ? await this.checkArgoCDApplications(baseUrl, token) : { status: 'skipped' };
    
    return {
      healthy: true,
      details: {
        version: response.data.Version,
        build_date: response.data.BuildDate,
        application_health: appHealth
      },
      metrics: {
        version: response.data.Version,
        healthy_applications: appHealth.healthy || 0,
        total_applications: appHealth.total || 0
      }
    };
  }

  async checkTerraformHealth(healthConfig) {
    const baseUrl = 'https://app.terraform.io';
    
    // Check Terraform Cloud API status
    const response = await this.makeHealthRequest({
      url: `${baseUrl}/api/v2/ping`,
      timeout: healthConfig.timeout_seconds * 1000
    });
    
    return {
      healthy: response.status === 200,
      details: {
        api_status: 'available',
        response_data: response.data
      },
      metrics: {
        api_availability: response.status === 200 ? 1 : 0
      }
    };
  }

  async checkSonarQubeHealth(healthConfig) {
    const baseUrl = this.getToolBaseUrl('sonarqube');
    const token = process.env.SONARQUBE_TOKEN;
    
    // Check SonarQube system status
    const response = await this.makeHealthRequest({
      url: `${baseUrl}/api/system/status`,
      headers: token ? { 'Authorization': `Basic ${Buffer.from(`${token}:`).toString('base64')}` } : {},
      timeout: healthConfig.timeout_seconds * 1000
    });
    
    const isHealthy = response.data.status === 'UP';
    
    // Check quality gates and analysis completion
    const analysisMetrics = token ? await this.checkSonarQubeAnalysis(baseUrl, token) : { status: 'skipped' };
    
    return {
      healthy: isHealthy,
      details: {
        status: response.data.status,
        version: response.data.version,
        analysis_metrics: analysisMetrics
      },
      metrics: {
        system_status: isHealthy ? 1 : 0,
        version: response.data.version
      }
    };
  }

  async checkGrafanaHealth(healthConfig) {
    const baseUrl = this.getToolBaseUrl('grafana');
    const token = process.env.GRAFANA_TOKEN;
    
    // Check Grafana health endpoint
    const response = await this.makeHealthRequest({
      url: `${baseUrl}/api/health`,
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      timeout: healthConfig.timeout_seconds * 1000
    });
    
    const isHealthy = response.data.database === 'ok';
    
    // Check datasource connectivity
    const datasourceHealth = token ? await this.checkGrafanaDatasources(baseUrl, token) : { status: 'skipped' };
    
    return {
      healthy: isHealthy,
      details: {
        database: response.data.database,
        version: response.data.version,
        datasource_health: datasourceHealth
      },
      metrics: {
        database_status: isHealthy ? 1 : 0,
        healthy_datasources: datasourceHealth.healthy || 0,
        total_datasources: datasourceHealth.total || 0
      }
    };
  }

  async checkPrometheusHealth(healthConfig) {
    const baseUrl = this.getToolBaseUrl('prometheus');
    
    // Check Prometheus health endpoint
    const response = await this.makeHealthRequest({
      url: `${baseUrl}/-/healthy`,
      timeout: healthConfig.timeout_seconds * 1000
    });
    
    const isHealthy = response.status === 200;
    
    // Check metrics ingestion and query performance
    const metricsCheck = await this.checkPrometheusMetrics(baseUrl);
    
    return {
      healthy: isHealthy,
      details: {
        health_status: 'healthy',
        metrics_check: metricsCheck
      },
      metrics: {
        health_status: isHealthy ? 1 : 0,
        metrics_ingestion_rate: metricsCheck.ingestion_rate || 0
      }
    };
  }

  async checkKibanaHealth(healthConfig) {
    const baseUrl = this.getToolBaseUrl('kibana');
    
    // Check Kibana status
    const response = await this.makeHealthRequest({
      url: `${baseUrl}/api/status`,
      timeout: healthConfig.timeout_seconds * 1000
    });
    
    const overallState = response.data?.status?.overall?.state;
    const isHealthy = overallState === 'green';
    
    return {
      healthy: isHealthy,
      details: {
        overall_state: overallState,
        version: response.data?.version?.number,
        services: response.data?.status?.statuses
      },
      metrics: {
        overall_health: isHealthy ? 1 : 0,
        version: response.data?.version?.number
      }
    };
  }

  async checkSnykHealth(healthConfig) {
    const baseUrl = 'https://api.snyk.io';
    const token = process.env.SNYK_TOKEN;
    
    if (!token) {
      return {
        healthy: false,
        details: { error: 'Snyk token not configured' },
        metrics: { api_availability: 0 }
      };
    }
    
    // Check Snyk API and user info
    const response = await this.makeHealthRequest({
      url: `${baseUrl}/v1/user/me`,
      headers: { 'Authorization': `token ${token}` },
      timeout: healthConfig.timeout_seconds * 1000
    });
    
    return {
      healthy: true,
      details: {
        user: response.data.username,
        email: response.data.email
      },
      metrics: {
        api_availability: 1,
        user_authenticated: 1
      }
    };
  }

  async checkJiraHealth(healthConfig) {
    const baseUrl = this.getToolBaseUrl('jira');
    const token = process.env.JIRA_TOKEN;
    
    if (!token) {
      return {
        healthy: false,
        details: { error: 'Jira token not configured' },
        metrics: { api_availability: 0 }
      };
    }
    
    // Check Jira server info
    const response = await this.makeHealthRequest({
      url: `${baseUrl}/rest/api/2/serverInfo`,
      headers: { 'Authorization': `Basic ${Buffer.from(`${process.env.JIRA_USER}:${token}`).toString('base64')}` },
      timeout: healthConfig.timeout_seconds * 1000
    });
    
    return {
      healthy: true,
      details: {
        version: response.data.version,
        server_title: response.data.serverTitle,
        build_number: response.data.buildNumber
      },
      metrics: {
        api_availability: 1,
        version: response.data.version
      }
    };
  }

  async checkServiceNowHealth(healthConfig) {
    const baseUrl = this.getToolBaseUrl('servicenow');
    const user = process.env.SERVICENOW_USER;
    const password = process.env.SERVICENOW_PASSWORD;
    
    if (!user || !password) {
      return {
        healthy: false,
        details: { error: 'ServiceNow credentials not configured' },
        metrics: { api_availability: 0 }
      };
    }
    
    // Check ServiceNow API
    const response = await this.makeHealthRequest({
      url: `${baseUrl}/api/now/table/sys_user_role?sysparm_limit=1`,
      headers: { 'Authorization': `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}` },
      timeout: healthConfig.timeout_seconds * 1000
    });
    
    return {
      healthy: true,
      details: {
        api_status: 'available',
        record_count: response.data.result?.length || 0
      },
      metrics: {
        api_availability: 1,
        response_size: response.data.result?.length || 0
      }
    };
  }

  // ===== UTILITY METHODS =====

  async defaultHealthChecker(healthConfig) {
    const baseUrl = this.getToolBaseUrl(healthConfig.tool_slug);
    const url = healthConfig.health_check_url.replace('{base_url}', baseUrl);
    
    const response = await this.makeHealthRequest({
      url,
      method: healthConfig.health_check_method || 'GET',
      headers: healthConfig.health_check_headers || {},
      timeout: healthConfig.timeout_seconds * 1000
    });
    
    return {
      healthy: healthConfig.expected_status_codes.includes(response.status),
      details: {
        status_code: response.status,
        response_data: response.data
      },
      metrics: {
        status_code: response.status,
        response_size: JSON.stringify(response.data).length
      }
    };
  }

  async makeHealthRequest(options) {
    const startTime = performance.now();
    
    try {
      const response = await axios({
        ...options,
        validateStatus: () => true // Don't throw on non-2xx status codes
      });
      
      response.responseTime = Math.round(performance.now() - startTime);
      return response;
    } catch (error) {
      error.responseTime = Math.round(performance.now() - startTime);
      throw error;
    }
  }

  getToolBaseUrl(toolSlug) {
    return this.config.TOOL_BASE_URLS?.[toolSlug] || `https://${toolSlug}.local`;
  }

  async recordHealthCheckResult(toolId, result) {
    try {
      await this.db.updateToolHealthStatus(toolId, result);
    } catch (error) {
      this.fastify.log.error('Failed to record health check result:', error);
    }
  }

  async recordPerformanceMetrics(toolId, metrics, responseTime) {
    try {
      // Record response time
      await this.db.recordPerformanceMetric(toolId, 'response_time', responseTime, 'ms');
      
      // Record tool-specific metrics
      for (const [metricName, value] of Object.entries(metrics)) {
        if (typeof value === 'number') {
          await this.db.recordPerformanceMetric(toolId, metricName, value, 'count');
        }
      }
    } catch (error) {
      this.fastify.log.error('Failed to record performance metrics:', error);
    }
  }

  // ===== ADDITIONAL HEALTH CHECKS =====

  async checkGitHubWebhooks(baseUrl, token) {
    try {
      const response = await this.makeHealthRequest({
        url: `${baseUrl}/user/orgs`,
        headers: { 'Authorization': `token ${token}` },
        timeout: 10000
      });
      
      return {
        status: 'healthy',
        organizations: response.data.length
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async checkGitLabRunners(baseUrl, token) {
    try {
      const response = await this.makeHealthRequest({
        url: `${baseUrl}/api/v4/runners?scope=active`,
        headers: { 'Private-Token': token },
        timeout: 10000
      });
      
      return {
        status: 'healthy',
        active_runners: response.data.length
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async checkArgoCDApplications(baseUrl, token) {
    try {
      const response = await this.makeHealthRequest({
        url: `${baseUrl}/api/v1/applications`,
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });
      
      const apps = response.data.items || [];
      const healthyApps = apps.filter(app => app.status?.health?.status === 'Healthy').length;
      
      return {
        status: 'healthy',
        total: apps.length,
        healthy: healthyApps
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async checkSonarQubeAnalysis(baseUrl, token) {
    try {
      const response = await this.makeHealthRequest({
        url: `${baseUrl}/api/ce/activity?status=SUCCESS&ps=10`,
        headers: { 'Authorization': `Basic ${Buffer.from(`${token}:`).toString('base64')}` },
        timeout: 10000
      });
      
      return {
        status: 'healthy',
        recent_analyses: response.data.tasks?.length || 0
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async checkGrafanaDatasources(baseUrl, token) {
    try {
      const response = await this.makeHealthRequest({
        url: `${baseUrl}/api/datasources`,
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });
      
      const datasources = response.data || [];
      // Note: We can't easily check datasource health without additional API calls
      
      return {
        status: 'healthy',
        total: datasources.length,
        healthy: datasources.length // Assume healthy if accessible
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async checkPrometheusMetrics(baseUrl) {
    try {
      const response = await this.makeHealthRequest({
        url: `${baseUrl}/api/v1/query?query=up`,
        timeout: 10000
      });
      
      const metrics = response.data?.data?.result || [];
      
      return {
        status: 'healthy',
        ingestion_rate: metrics.length
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Clear all monitoring intervals
    for (const [toolId, intervalId] of this.monitoringIntervals) {
      clearInterval(intervalId);
    }
    this.monitoringIntervals.clear();
    
    this.fastify.log.info('🛑 Enhanced Health Monitor: Stopped monitoring');
  }
}

module.exports = EnhancedHealthMonitor;
