/**
 * Service Health Monitor - Phase 8
 * Comprehensive monitoring of all microservices and infrastructure components
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class ServiceHealthMonitor {
  constructor(fastify, config, databaseManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.monitoringIntervals = new Map();
    this.circuitBreakers = new Map();
    this.isRunning = false;
    
    // Service configurations
    this.services = {
      'auth-bff': { 
        url: 'http://auth-bff:3002', 
        healthEndpoint: '/healthz',
        readinessEndpoint: '/readyz',
        critical: true,
        timeout: 5000
      },
      'catalog': { 
        url: 'http://catalog:3006', 
        healthEndpoint: '/healthz',
        readinessEndpoint: '/readyz',
        critical: true,
        timeout: 5000
      },
      'webhook-ingress': { 
        url: 'http://webhook-ingress:3007', 
        healthEndpoint: '/healthz',
        readinessEndpoint: '/readyz',
        critical: false,
        timeout: 5000
      },
      'audit': { 
        url: 'http://audit:3009', 
        healthEndpoint: '/healthz',
        readinessEndpoint: '/readyz',
        critical: false,
        timeout: 5000
      },
      'analytics': { 
        url: 'http://analytics:3010', 
        healthEndpoint: '/healthz',
        readinessEndpoint: '/readyz',
        critical: false,
        timeout: 5000
      },
      'admin-config': { 
        url: 'http://admin-config:3005', 
        healthEndpoint: '/healthz',
        readinessEndpoint: '/readyz',
        critical: false,
        timeout: 5000
      },
      'keycloak': { 
        url: 'http://keycloak:8080', 
        healthEndpoint: '/health',
        readinessEndpoint: '/health/ready',
        critical: true,
        timeout: 10000
      }
    };
  }

  async initialize() {
    this.fastify.log.info('🔍 Initializing Service Health Monitor...');
    
    try {
      // Load service configurations from database
      await this.loadServiceConfigurations();
      
      // Initialize circuit breakers
      this.initializeCircuitBreakers();
      
      this.fastify.log.info('✅ Service Health Monitor initialized successfully');
    } catch (error) {
      this.fastify.log.error('❌ Failed to initialize Service Health Monitor:', error);
      throw error;
    }
  }

  async start() {
    if (this.isRunning) {
      this.fastify.log.warn('Service Health Monitor is already running');
      return;
    }

    this.isRunning = true;
    this.fastify.log.info('🚀 Starting Service Health Monitor...');

    // Start monitoring each service
    for (const [serviceName, serviceConfig] of Object.entries(this.services)) {
      const interval = setInterval(
        () => this.checkServiceHealth(serviceName, serviceConfig),
        serviceConfig.checkInterval || 30000 // Default 30 seconds
      );
      
      this.monitoringIntervals.set(serviceName, interval);
      
      // Immediate first check
      setImmediate(() => this.checkServiceHealth(serviceName, serviceConfig));
    }

    this.fastify.log.info('✅ Service Health Monitor started for all services');
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.fastify.log.info('🛑 Stopping Service Health Monitor...');

    // Clear all monitoring intervals
    for (const [serviceName, interval] of this.monitoringIntervals) {
      clearInterval(interval);
      this.fastify.log.debug(`Stopped monitoring ${serviceName}`);
    }
    
    this.monitoringIntervals.clear();
    this.fastify.log.info('✅ Service Health Monitor stopped');
  }

  async loadServiceConfigurations() {
    try {
      const client = await this.db.db.connect();
      
      try {
        const query = `
          SELECT service_name, host, port, health_endpoint, check_interval_seconds, 
                 timeout_seconds, failure_threshold, success_threshold
          FROM service_health 
          WHERE environment = $1
        `;
        
        const result = await client.query(query, ['production']);
        
        // Update service configurations from database
        for (const row of result.rows) {
          if (this.services[row.service_name]) {
            this.services[row.service_name] = {
              ...this.services[row.service_name],
              url: `http://${row.host}:${row.port}`,
              healthEndpoint: row.health_endpoint,
              checkInterval: (row.check_interval_seconds || 30) * 1000,
              timeout: (row.timeout_seconds || 5) * 1000,
              failureThreshold: row.failure_threshold || 3,
              successThreshold: row.success_threshold || 2
            };
          }
        }
        
        this.fastify.log.info(`Loaded configuration for ${result.rows.length} services`);
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error('Failed to load service configurations:', error);
      // Continue with default configurations
    }
  }

  initializeCircuitBreakers() {
    for (const serviceName of Object.keys(this.services)) {
      this.circuitBreakers.set(serviceName, {
        state: 'closed', // closed, open, half-open
        failureCount: 0,
        successCount: 0,
        lastFailureTime: null,
        openTimeout: 60000 // 1 minute
      });
    }
  }

  async checkServiceHealth(serviceName, serviceConfig) {
    const startTime = performance.now();
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    
    try {
      // Check circuit breaker state
      if (circuitBreaker.state === 'open') {
        const timeSinceLastFailure = Date.now() - circuitBreaker.lastFailureTime;
        if (timeSinceLastFailure < circuitBreaker.openTimeout) {
          // Circuit is still open, skip check
          return;
        } else {
          // Try to half-open the circuit
          circuitBreaker.state = 'half-open';
          this.fastify.log.info(`Circuit breaker for ${serviceName} moved to half-open state`);
        }
      }

      // Perform health check
      const healthResult = await this.performHealthCheck(serviceName, serviceConfig);
      const responseTime = Math.round(performance.now() - startTime);

      // Update circuit breaker
      if (healthResult.status === 'healthy') {
        circuitBreaker.failureCount = 0;
        circuitBreaker.successCount++;
        
        if (circuitBreaker.state === 'half-open' && 
            circuitBreaker.successCount >= serviceConfig.successThreshold) {
          circuitBreaker.state = 'closed';
          this.fastify.log.info(`Circuit breaker for ${serviceName} closed`);
        }
      } else {
        circuitBreaker.failureCount++;
        circuitBreaker.successCount = 0;
        circuitBreaker.lastFailureTime = Date.now();
        
        if (circuitBreaker.failureCount >= serviceConfig.failureThreshold) {
          circuitBreaker.state = 'open';
          this.fastify.log.warn(`Circuit breaker for ${serviceName} opened due to failures`);
        }
      }

      // Store health result in database
      await this.storeServiceHealth(serviceName, {
        ...healthResult,
        response_time_ms: responseTime,
        circuit_breaker_state: circuitBreaker.state
      });

      // Check for cascade failures
      if (healthResult.status !== 'healthy' && serviceConfig.critical) {
        await this.checkCascadeFailures(serviceName, healthResult);
      }

    } catch (error) {
      this.fastify.log.error(`Service health check failed for ${serviceName}:`, error);
      
      // Update circuit breaker for check failures
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = Date.now();
      
      await this.storeServiceHealth(serviceName, {
        status: 'unhealthy',
        error_message: error.message,
        response_time_ms: Math.round(performance.now() - startTime),
        circuit_breaker_state: circuitBreaker.state
      });
    }
  }

  async performHealthCheck(serviceName, serviceConfig) {
    try {
      // Check basic health endpoint
      const healthResponse = await axios.get(
        `${serviceConfig.url}${serviceConfig.healthEndpoint}`,
        {
          timeout: serviceConfig.timeout,
          validateStatus: (status) => status < 500
        }
      );

      let status = 'healthy';
      let details = {};

      // Analyze health response
      if (healthResponse.status >= 400) {
        status = 'unhealthy';
        details.error = `HTTP ${healthResponse.status}: ${healthResponse.statusText}`;
      } else if (healthResponse.data) {
        if (healthResponse.data.status === 'ok' || 
            healthResponse.data.status === 'ready' || 
            healthResponse.data.status === 'healthy') {
          status = 'healthy';
        } else if (healthResponse.data.status === 'degraded') {
          status = 'degraded';
        } else {
          status = 'unhealthy';
        }
        
        details = healthResponse.data;
      }

      // Additional readiness check for critical services
      if (status === 'healthy' && serviceConfig.readinessEndpoint && serviceConfig.critical) {
        try {
          const readinessResponse = await axios.get(
            `${serviceConfig.url}${serviceConfig.readinessEndpoint}`,
            { timeout: serviceConfig.timeout }
          );
          
          if (readinessResponse.status >= 400) {
            status = 'degraded';
            details.readiness_issue = 'Service not ready';
          }
        } catch (readinessError) {
          status = 'degraded';
          details.readiness_error = readinessError.message;
        }
      }

      return {
        status,
        details,
        checked_at: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error_message: error.message,
        error_code: error.code,
        checked_at: new Date().toISOString()
      };
    }
  }

  async storeServiceHealth(serviceName, healthData) {
    try {
      const client = await this.db.db.connect();
      
      try {
        const query = `
          UPDATE service_health 
          SET 
            status = $2::VARCHAR(20),
            response_time_ms = $3,
            last_check_at = NOW(),
            last_healthy_at = CASE WHEN $2::VARCHAR(20) = 'healthy' THEN NOW() ELSE last_healthy_at END,
            consecutive_failures = CASE 
              WHEN $2::VARCHAR(20) = 'healthy' THEN 0 
              ELSE consecutive_failures + 1 
            END,
            consecutive_successes = CASE 
              WHEN $2::VARCHAR(20) = 'healthy' THEN consecutive_successes + 1 
              ELSE 0 
            END,
            error_message = $4,
            details = $5,
            updated_at = NOW()
          WHERE service_name = $1::VARCHAR(100) AND environment = 'production'
        `;
        
        const values = [
          serviceName,
          healthData.status,
          healthData.response_time_ms,
          healthData.error_message,
          JSON.stringify(healthData.details || {})
        ];
        
        await client.query(query, values);
        
        // Store metrics history - temporarily disabled due to schema mismatch
        // await this.storeHealthMetrics(serviceName, healthData);
        
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error(`Failed to store health data for ${serviceName}:`, error);
    }
  }

  async storeHealthMetrics(serviceName, healthData) {
    try {
      const now = new Date();
      const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const client = await this.db.db.connect();
      
      try {
        // Store response time metric
        if (healthData.response_time_ms) {
          const query = `
            INSERT INTO health_metrics_history (
              metric_type, source_id, source_name, metric_name, metric_value, metric_unit,
              aggregation_period, period_start, period_end
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (metric_type, source_id, metric_name, aggregation_period, period_start)
            DO UPDATE SET
              metric_value = (health_metrics_history.metric_value * health_metrics_history.sample_count + $5) / 
                           (health_metrics_history.sample_count + 1),
              sample_count = health_metrics_history.sample_count + 1,
              min_value = LEAST(health_metrics_history.min_value, $5),
              max_value = GREATEST(health_metrics_history.max_value, $5)
          `;
          
          await client.query(query, [
            'service_health', serviceName, serviceName, 'response_time', 
            healthData.response_time_ms, 'milliseconds', 'hour', hourStart, hourEnd
          ]);
        }
        
        // Store availability metric
        const availabilityValue = healthData.status === 'healthy' ? 100 : 0;
        const availabilityQuery = `
          INSERT INTO health_metrics_history (
            metric_type, source_id, source_name, metric_name, metric_value, metric_unit,
            aggregation_period, period_start, period_end
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (metric_type, source_id, metric_name, aggregation_period, period_start)
          DO UPDATE SET
            metric_value = (health_metrics_history.metric_value * health_metrics_history.sample_count + $5) / 
                         (health_metrics_history.sample_count + 1),
            sample_count = health_metrics_history.sample_count + 1
        `;
        
        await client.query(availabilityQuery, [
          'service_health', serviceName, serviceName, 'availability', 
          availabilityValue, 'percentage', 'hour', hourStart, hourEnd
        ]);
        
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error(`Failed to store health metrics for ${serviceName}:`, error);
    }
  }

  async checkCascadeFailures(failedService, healthResult) {
    try {
      // Get dependencies of the failed service
      const dependencies = await this.getDependentServices(failedService);
      
      if (dependencies.length > 0) {
        this.fastify.log.warn(`Checking cascade impact for ${failedService} failure on ${dependencies.length} dependent services`);
        
        // Create or update cascade failure record
        await this.recordCascadeFailure(failedService, dependencies, healthResult);
      }
    } catch (error) {
      this.fastify.log.error('Failed to check cascade failures:', error);
    }
  }

  async getDependentServices(sourcService) {
    try {
      const client = await this.db.db.connect();
      
      try {
        const query = `
          SELECT DISTINCT source_service 
          FROM service_dependencies 
          WHERE target_service = $1 AND is_critical = TRUE
        `;
        
        const result = await client.query(query, [sourcService]);
        return result.rows.map(row => row.source_service);
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error('Failed to get dependent services:', error);
      return [];
    }
  }

  async recordCascadeFailure(rootCause, affectedServices, healthResult) {
    try {
      const incidentId = `cascade-${rootCause}-${Date.now()}`;
      
      const client = await this.db.db.connect();
      
      try {
        const query = `
          INSERT INTO cascade_failures (
            incident_id, root_cause_service, affected_services, failure_pattern,
            severity, user_impact, detected_at, failure_type, propagation_path, started_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'service_failure', '{}', NOW())
        `;
        
        const severity = this.calculateCascadeSeverity(rootCause, affectedServices);
        const userImpact = this.assessUserImpact(rootCause, affectedServices);
        
        await client.query(query, [
          incidentId, rootCause, affectedServices, 'downstream', 
          severity, userImpact
        ]);
        
        this.fastify.log.warn(`Cascade failure recorded: ${incidentId}`);
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error('Failed to record cascade failure:', error);
    }
  }

  calculateCascadeSeverity(rootCause, affectedServices) {
    if (rootCause === 'auth-bff' || rootCause === 'keycloak') {
      return 'critical';
    }
    if (affectedServices.length >= 3) {
      return 'high';
    }
    if (affectedServices.length >= 1) {
      return 'medium';
    }
    return 'low';
  }

  assessUserImpact(rootCause, affectedServices) {
    if (rootCause === 'auth-bff' || rootCause === 'keycloak') {
      return 'complete_outage';
    }
    if (rootCause === 'catalog') {
      return 'partial_outage';
    }
    if (affectedServices.length >= 2) {
      return 'degraded_performance';
    }
    return 'minimal';
  }

  // ===== PUBLIC API METHODS =====

  async getServiceHealthOverview() {
    try {
      const client = await this.db.db.connect();
      
      try {
        const query = `
          SELECT 
            service_name, service_type, status, response_time_ms,
            last_check_at, last_healthy_at, consecutive_failures,
            error_message, tags
          FROM service_health 
          WHERE environment = 'production'
          ORDER BY service_name
        `;
        
        const result = await client.query(query);
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error('Failed to get service health overview:', error);
      throw error;
    }
  }

  async getServiceHealthMetrics(serviceName, metricType = 'response_time', hours = 24) {
    try {
      const client = await this.db.db.connect();
      
      try {
        const query = `
          SELECT 
            metric_value, metric_unit, sample_count,
            min_value, max_value, avg_value,
            period_start, period_end
          FROM health_metrics_history
          WHERE metric_type = 'service_health' 
            AND source_id = $1 
            AND metric_name = $2
            AND period_start >= NOW() - INTERVAL '${hours} hours'
          ORDER BY period_start DESC
        `;
        
        const result = await client.query(query, [serviceName, metricType]);
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error('Failed to get service health metrics:', error);
      throw error;
    }
  }
}

module.exports = ServiceHealthMonitor;
