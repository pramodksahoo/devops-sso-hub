/**
 * Analytics Manager - Core analytics processing and metrics calculation
 * Handles tool-specific usage analytics, performance metrics, and workflow analysis
 */

const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const { z } = require('zod');

// Analytics data validation schemas
const UsageAnalyticsSchema = z.object({
  tool_slug: z.string().min(1),
  user_id: z.string().min(1),
  usage_type: z.string().min(1),
  action: z.string().min(1),
  response_time_ms: z.number().optional(),
  success: z.boolean().optional().default(true),
  tool_specific_metrics: z.record(z.any()).optional().default({}),
  user_email: z.string().email().optional(),
  session_id: z.string().optional(),
  resource_type: z.string().optional(),
  resource_id: z.string().optional()
});

const PerformanceMetricSchema = z.object({
  tool_slug: z.string().min(1),
  metric_type: z.string().min(1),
  metric_category: z.enum(['authentication', 'integration', 'performance', 'reliability']),
  metric_value: z.number(),
  metric_unit: z.string().min(1),
  aggregation_period: z.enum(['minute', 'hour', 'day', 'week', 'month']),
  period_start: z.string().datetime(),
  period_end: z.string().datetime()
});

class AnalyticsManager {
  constructor(fastify, config) {
    this.fastify = fastify;
    this.config = config;
    this.metricsBuffer = [];
    this.aggregationTimers = new Map();
    
    // Start periodic aggregation if enabled
    if (this.config.REAL_TIME_PROCESSING) {
      this.startPeriodicAggregation();
    }
  }

  // ===== USAGE ANALYTICS TRACKING =====

  async trackUsage(usageData) {
    try {
      // Validate input data
      const validatedData = UsageAnalyticsSchema.parse(usageData);
      
      // Enrich with timestamp and buckets
      const now = new Date();
      const enrichedData = {
        ...validatedData,
        timestamp: now.toISOString(),
        hour_bucket: moment(now).startOf('hour').toDate(),
        day_bucket: moment(now).startOf('day').format('YYYY-MM-DD'),
        tool_specific_metrics: await this.enrichToolSpecificMetrics(validatedData.tool_slug, validatedData.tool_specific_metrics)
      };
      
      // Store in database
      const usageId = await this.storeUsageAnalytics(enrichedData);
      
      // Trigger real-time processing if enabled
      if (this.config.REAL_TIME_PROCESSING) {
        await this.processRealTimeMetrics(enrichedData);
      }
      
      return usageId;
    } catch (error) {
      this.fastify.log.error('Failed to track usage analytics:', error);
      throw error;
    }
  }

  async enrichToolSpecificMetrics(toolSlug, baseMetrics) {
    const toolConfig = this.config.METRICS_CONFIG[toolSlug];
    if (!toolConfig) return baseMetrics;
    
    const enriched = { ...baseMetrics };
    
    // Add tool-specific context
    switch (toolSlug) {
      case 'github':
        enriched.repository_count = await this.getGitHubRepoCount(baseMetrics);
        enriched.collaboration_score = await this.calculateCollaborationScore(baseMetrics);
        break;
      case 'jenkins':
        enriched.build_queue_length = await this.getJenkinsBuildQueueLength();
        enriched.agent_utilization = await this.calculateAgentUtilization(baseMetrics);
        break;
      case 'sonarqube':
        enriched.quality_score = await this.calculateQualityScore(baseMetrics);
        enriched.technical_debt_ratio = await this.getTechnicalDebtRatio(baseMetrics);
        break;
      // Add more tool-specific enrichments as needed
    }
    
    return enriched;
  }

  async storeUsageAnalytics(data) {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        INSERT INTO tool_usage_analytics (
          tool_slug, user_id, user_email, user_roles, session_id,
          usage_type, action, resource_type, resource_id, resource_name,
          tool_specific_metrics, response_time_ms, success, error_code, error_message,
          source_ip, user_agent, request_size_bytes, response_size_bytes,
          timestamp, hour_bucket, day_bucket
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        ) RETURNING id
      `;
      
      const values = [
        data.tool_slug, data.user_id, data.user_email, data.user_roles, data.session_id,
        data.usage_type, data.action, data.resource_type, data.resource_id, data.resource_name,
        JSON.stringify(data.tool_specific_metrics), data.response_time_ms, data.success,
        data.error_code, data.error_message, data.source_ip, data.user_agent,
        data.request_size_bytes, data.response_size_bytes, data.timestamp,
        data.hour_bucket, data.day_bucket
      ];
      
      const result = await client.query(query, values);
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  // ===== PERFORMANCE METRICS =====

  async recordPerformanceMetric(metricData) {
    try {
      const validatedData = PerformanceMetricSchema.parse(metricData);
      
      const client = await this.fastify.pg.connect();
      try {
        const query = `
          INSERT INTO integration_performance_metrics (
            tool_slug, metric_type, metric_category, metric_value, metric_unit,
            aggregation_period, period_start, period_end, sample_count, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `;
        
        const values = [
          validatedData.tool_slug, validatedData.metric_type, validatedData.metric_category,
          validatedData.metric_value, validatedData.metric_unit, validatedData.aggregation_period,
          validatedData.period_start, validatedData.period_end, 1, {}
        ];
        
        const result = await client.query(query, values);
        return result.rows[0].id;
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error('Failed to record performance metric:', error);
      throw error;
    }
  }

  // ===== WORKFLOW ANALYTICS =====

  async startWorkflow(workflowData) {
    try {
      const workflowId = uuidv4();
      const client = await this.fastify.pg.connect();
      
      try {
        const query = `
          INSERT INTO cross_tool_workflows (
            workflow_id, workflow_type, workflow_name, user_id, user_email, session_id,
            tools_involved, tool_sequence, workflow_start, trigger_event, entry_point, workflow_metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id
        `;
        
        const values = [
          workflowId, workflowData.workflow_type, workflowData.workflow_name,
          workflowData.user_id, workflowData.user_email, workflowData.session_id,
          workflowData.tools_involved, workflowData.tool_sequence, new Date(),
          workflowData.trigger_event, workflowData.entry_point,
          JSON.stringify(workflowData.metadata || {})
        ];
        
        const result = await client.query(query, values);
        return workflowId;
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error('Failed to start workflow:', error);
      throw error;
    }
  }

  async updateWorkflow(workflowId, updateData) {
    try {
      const client = await this.fastify.pg.connect();
      
      try {
        const query = `
          UPDATE cross_tool_workflows 
          SET 
            tool_sequence = COALESCE($2, tool_sequence),
            total_steps = COALESCE($3, total_steps),
            completed_steps = COALESCE($4, completed_steps),
            workflow_status = COALESCE($5, workflow_status),
            completion_rate = COALESCE($6, completion_rate),
            efficiency_score = COALESCE($7, efficiency_score),
            error_count = COALESCE($8, error_count),
            workflow_metadata = COALESCE($9, workflow_metadata),
            updated_at = NOW()
          WHERE workflow_id = $1
          RETURNING id
        `;
        
        const values = [
          workflowId, updateData.tool_sequence, updateData.total_steps,
          updateData.completed_steps, updateData.workflow_status, updateData.completion_rate,
          updateData.efficiency_score, updateData.error_count,
          JSON.stringify(updateData.metadata || {})
        ];
        
        const result = await client.query(query, values);
        return result.rows.length > 0;
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error('Failed to update workflow:', error);
      throw error;
    }
  }

  async completeWorkflow(workflowId, completionData) {
    try {
      const now = new Date();
      const client = await this.fastify.pg.connect();
      
      try {
        // First get the workflow start time
        const workflowQuery = `SELECT workflow_start FROM cross_tool_workflows WHERE workflow_id = $1`;
        const workflowResult = await client.query(workflowQuery, [workflowId]);
        
        if (workflowResult.rows.length === 0) {
          throw new Error('Workflow not found');
        }
        
        const startTime = workflowResult.rows[0].workflow_start;
        const durationSeconds = Math.floor((now - new Date(startTime)) / 1000);
        
        const query = `
          UPDATE cross_tool_workflows 
          SET 
            workflow_end = $2,
            total_duration_seconds = $3,
            workflow_status = $4,
            completion_rate = $5,
            efficiency_score = $6,
            exit_point = $7,
            success_indicators = $8,
            updated_at = NOW()
          WHERE workflow_id = $1
          RETURNING id
        `;
        
        const values = [
          workflowId, now, durationSeconds, completionData.status,
          completionData.completion_rate, completionData.efficiency_score,
          completionData.exit_point, JSON.stringify(completionData.success_indicators || {})
        ];
        
        const result = await client.query(query, values);
        return result.rows.length > 0;
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error('Failed to complete workflow:', error);
      throw error;
    }
  }

  // ===== ANALYTICS QUERIES =====

  async getToolUsageAnalytics(filters = {}) {
    const client = await this.fastify.pg.connect();
    
    try {
      let query = `
        SELECT 
          tool_slug,
          COUNT(*) as total_usage,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(response_time_ms) as avg_response_time,
          (COUNT(CASE WHEN success = true THEN 1 END) * 100.0 / COUNT(*)) as success_rate,
          DATE_TRUNC('${filters.groupBy || 'day'}', timestamp) as period
        FROM tool_usage_analytics
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (filters.tool_slug) {
        query += ` AND tool_slug = $${paramCount}`;
        params.push(filters.tool_slug);
        paramCount++;
      }
      
      if (filters.user_id) {
        query += ` AND user_id = $${paramCount}`;
        params.push(filters.user_id);
        paramCount++;
      }
      
      if (filters.since) {
        query += ` AND timestamp >= $${paramCount}`;
        params.push(filters.since);
        paramCount++;
      }
      
      if (filters.until) {
        query += ` AND timestamp <= $${paramCount}`;
        params.push(filters.until);
        paramCount++;
      }
      
      query += ` GROUP BY tool_slug, period ORDER BY period DESC, total_usage DESC`;
      
      if (filters.limit) {
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getPerformanceMetrics(filters = {}) {
    const client = await this.fastify.pg.connect();
    
    try {
      let query = `
        SELECT 
          tool_slug,
          metric_type,
          metric_category,
          AVG(metric_value) as avg_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value,
          metric_unit,
          COUNT(*) as sample_count,
          DATE_TRUNC('${filters.groupBy || 'hour'}', period_start) as period
        FROM integration_performance_metrics
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (filters.tool_slug) {
        query += ` AND tool_slug = $${paramCount}`;
        params.push(filters.tool_slug);
        paramCount++;
      }
      
      if (filters.metric_type) {
        query += ` AND metric_type = $${paramCount}`;
        params.push(filters.metric_type);
        paramCount++;
      }
      
      if (filters.metric_category) {
        query += ` AND metric_category = $${paramCount}`;
        params.push(filters.metric_category);
        paramCount++;
      }
      
      if (filters.since) {
        query += ` AND period_start >= $${paramCount}`;
        params.push(filters.since);
        paramCount++;
      }
      
      query += ` GROUP BY tool_slug, metric_type, metric_category, metric_unit, period ORDER BY period DESC`;
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getWorkflowAnalytics(filters = {}) {
    const client = await this.fastify.pg.connect();
    
    try {
      let query = `
        SELECT 
          workflow_type,
          COUNT(*) as total_workflows,
          AVG(total_duration_seconds) as avg_duration,
          AVG(completion_rate) as avg_completion_rate,
          AVG(efficiency_score) as avg_efficiency_score,
          COUNT(CASE WHEN workflow_status = 'completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN workflow_status = 'failed' THEN 1 END) as failed_count,
          ARRAY_AGG(DISTINCT UNNEST(tools_involved)) as all_tools_used,
          DATE_TRUNC('${filters.groupBy || 'day'}', workflow_start) as period
        FROM cross_tool_workflows
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (filters.workflow_type) {
        query += ` AND workflow_type = $${paramCount}`;
        params.push(filters.workflow_type);
        paramCount++;
      }
      
      if (filters.user_id) {
        query += ` AND user_id = $${paramCount}`;
        params.push(filters.user_id);
        paramCount++;
      }
      
      if (filters.since) {
        query += ` AND workflow_start >= $${paramCount}`;
        params.push(filters.since);
        paramCount++;
      }
      
      query += ` GROUP BY workflow_type, period ORDER BY period DESC, total_workflows DESC`;
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getToolSpecificAnalytics(toolSlug, filters = {}) {
    const client = await this.fastify.pg.connect();
    
    try {
      // Get tool-specific usage patterns
      const usageQuery = `
        SELECT 
          usage_type,
          action,
          COUNT(*) as usage_count,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(response_time_ms) as avg_response_time,
          tool_specific_metrics
        FROM tool_usage_analytics
        WHERE tool_slug = $1
        ${filters.since ? 'AND timestamp >= $2' : ''}
        GROUP BY usage_type, action, tool_specific_metrics
        ORDER BY usage_count DESC
      `;
      
      const usageParams = [toolSlug];
      if (filters.since) usageParams.push(filters.since);
      
      const usageResult = await client.query(usageQuery, usageParams);
      
      // Get performance metrics for this tool
      const performanceQuery = `
        SELECT 
          metric_type,
          AVG(metric_value) as avg_value,
          metric_unit,
          COUNT(*) as sample_count
        FROM integration_performance_metrics
        WHERE tool_slug = $1
        ${filters.since ? 'AND period_start >= $2' : ''}
        GROUP BY metric_type, metric_unit
        ORDER BY metric_type
      `;
      
      const performanceResult = await client.query(performanceQuery, usageParams);
      
      return {
        tool_slug: toolSlug,
        usage_patterns: usageResult.rows,
        performance_metrics: performanceResult.rows,
        generated_at: new Date().toISOString()
      };
    } finally {
      client.release();
    }
  }

  // ===== AGGREGATION AND PROCESSING =====

  async processRealTimeMetrics(usageData) {
    try {
      // Calculate immediate aggregations
      await this.updateHourlyAggregations(usageData);
      await this.updateDailyPatterns(usageData);
      
      // Check for threshold violations
      await this.checkPerformanceThresholds(usageData);
      
      // Update workflow if applicable
      if (usageData.session_id) {
        await this.updateActiveWorkflows(usageData);
      }
    } catch (error) {
      this.fastify.log.error('Real-time metrics processing failed:', error);
    }
  }

  async updateHourlyAggregations(usageData) {
    const client = await this.fastify.pg.connect();
    
    try {
      const hourBucket = moment(usageData.timestamp).startOf('hour').toISOString();
      
      const query = `
        INSERT INTO tool_usage_patterns (
          tool_slug, pattern_type, pattern_name, period_type, period_start, period_end,
          usage_count, unique_users, pattern_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (tool_slug, pattern_type, period_start) 
        DO UPDATE SET
          usage_count = tool_usage_patterns.usage_count + 1,
          pattern_data = $9,
          calculated_at = NOW()
      `;
      
      const values = [
        usageData.tool_slug, 'hourly_usage', 'Hourly Usage Pattern', 'hour',
        hourBucket, moment(hourBucket).add(1, 'hour').toISOString(),
        1, 1, JSON.stringify({ latest_action: usageData.action })
      ];
      
      await client.query(query, values);
    } finally {
      client.release();
    }
  }

  startPeriodicAggregation() {
    // Run aggregation every hour
    setInterval(() => {
      this.runPeriodicAggregation();
    }, this.config.AGGREGATION_INTERVAL_MINUTES * 60 * 1000);
  }

  async runPeriodicAggregation() {
    try {
      this.fastify.log.info('Starting periodic aggregation...');
      
      // Aggregate usage patterns
      await this.aggregateUsagePatterns();
      
      // Calculate performance metrics
      await this.calculatePerformanceMetrics();
      
      // Update workflow efficiency scores
      await this.updateWorkflowEfficiencyScores();
      
      this.fastify.log.info('Periodic aggregation completed');
    } catch (error) {
      this.fastify.log.error('Periodic aggregation failed:', error);
    }
  }

  // ===== TOOL-SPECIFIC METRIC CALCULATORS =====

  async getGitHubRepoCount(metrics) {
    // Placeholder - would integrate with GitHub API or existing data
    return metrics.repositories_accessed || 0;
  }

  async calculateCollaborationScore(metrics) {
    // Example calculation based on pull requests, reviews, etc.
    const prActivity = metrics.pull_requests_reviewed || 0;
    const commits = metrics.commits_authored || 0;
    const issues = metrics.issues_created || 0;
    
    return Math.min(100, (prActivity * 3 + commits * 2 + issues) / 10);
  }

  async getJenkinsBuildQueueLength() {
    // Placeholder - would integrate with Jenkins API
    return Math.floor(Math.random() * 10);
  }

  async calculateAgentUtilization(metrics) {
    // Example calculation for Jenkins agent utilization
    return Math.min(100, (metrics.builds_triggered || 0) * 10);
  }

  async calculateQualityScore(metrics) {
    // Example SonarQube quality score calculation
    const coverage = metrics.coverage_percentage || 0;
    const bugs = metrics.bugs_detected || 0;
    const duplications = metrics.duplications || 0;
    
    return Math.max(0, 100 - bugs * 2 - duplications + coverage / 2);
  }

  async getTechnicalDebtRatio(metrics) {
    // Example technical debt calculation
    const linesAnalyzed = metrics.lines_analyzed || 1;
    const issues = (metrics.bugs_detected || 0) + (metrics.code_smells || 0);
    
    return (issues / linesAnalyzed) * 100;
  }
}

module.exports = AnalyticsManager;
