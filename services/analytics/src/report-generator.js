/**
 * Report Generator - Custom analytics reports and CSV exports
 * Handles generation of tool-specific reports and data exports
 */

const { v4: uuidv4 } = require('uuid');
const { Transform } = require('stream');
const fs = require('fs').promises;
const path = require('path');
const { Parser } = require('json2csv');
const moment = require('moment');

class ReportGenerator {
  constructor(fastify, config, analyticsManager) {
    this.fastify = fastify;
    this.config = config;
    this.analyticsManager = analyticsManager;
    this.reportCache = new Map();
  }

  // ===== CUSTOM REPORT GENERATION =====

  async generateReport(reportConfig) {
    try {
      const reportId = uuidv4();
      const startTime = new Date();
      
      // Store report execution record
      const executionId = await this.storeReportExecution(reportId, reportConfig, 'running');
      
      try {
        // Generate report data based on type
        const reportData = await this.generateReportData(reportConfig);
        
        // Format and export the report
        const exportData = await this.formatReportData(reportData, reportConfig);
        
        // Save report file
        const filePath = await this.saveReportFile(reportId, exportData, reportConfig.export_format);
        
        // Update execution record
        await this.updateReportExecution(executionId, {
          execution_status: 'completed',
          result_count: Array.isArray(reportData) ? reportData.length : 1,
          file_path: filePath,
          execution_end: new Date()
        });
        
        return { id: reportId, executionId, filePath };
      } catch (error) {
        // Update execution record with error
        await this.updateReportExecution(executionId, {
          execution_status: 'failed',
          error_message: error.message,
          execution_end: new Date()
        });
        throw error;
      }
    } catch (error) {
      this.fastify.log.error('Failed to generate report:', error);
      throw error;
    }
  }

  async generateReportData(config) {
    switch (config.report_type) {
      case 'tool_usage':
        return await this.generateToolUsageReport(config);
      case 'integration_health':
        return await this.generateIntegrationHealthReport(config);
      case 'security_compliance':
        return await this.generateSecurityComplianceReport(config);
      case 'performance_benchmark':
        return await this.generatePerformanceBenchmarkReport(config);
      case 'workflow_analysis':
        return await this.generateWorkflowAnalysisReport(config);
      default:
        throw new Error(`Unsupported report type: ${config.report_type}`);
    }
  }

  async generateToolUsageReport(config) {
    const client = await this.fastify.pg.connect();
    
    try {
      let query = `
        SELECT 
          tua.tool_slug,
          t.name as tool_name,
          t.category_slug,
          tua.usage_type,
          tua.action,
          COUNT(*) as usage_count,
          COUNT(DISTINCT tua.user_id) as unique_users,
          AVG(tua.response_time_ms) as avg_response_time,
          (COUNT(CASE WHEN tua.success = true THEN 1 END) * 100.0 / COUNT(*)) as success_rate,
          DATE_TRUNC('${config.groupBy || 'day'}', tua.timestamp) as period,
          MIN(tua.timestamp) as first_usage,
          MAX(tua.timestamp) as last_usage
        FROM tool_usage_analytics tua
        JOIN tools t ON tua.tool_slug = t.slug
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (config.tools_included && config.tools_included.length > 0) {
        query += ` AND tua.tool_slug = ANY($${paramCount})`;
        params.push(config.tools_included);
        paramCount++;
      }
      
      if (config.date_range_start) {
        query += ` AND tua.timestamp >= $${paramCount}`;
        params.push(config.date_range_start);
        paramCount++;
      }
      
      if (config.date_range_end) {
        query += ` AND tua.timestamp <= $${paramCount}`;
        params.push(config.date_range_end);
        paramCount++;
      }
      
      if (config.filters) {
        if (config.filters.user_id) {
          query += ` AND tua.user_id = $${paramCount}`;
          params.push(config.filters.user_id);
          paramCount++;
        }
        
        if (config.filters.usage_type) {
          query += ` AND tua.usage_type = $${paramCount}`;
          params.push(config.filters.usage_type);
          paramCount++;
        }
      }
      
      query += ` GROUP BY tua.tool_slug, t.name, t.category_slug, tua.usage_type, tua.action, period ORDER BY period DESC, usage_count DESC`;
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async generateIntegrationHealthReport(config) {
    const client = await this.fastify.pg.connect();
    
    try {
      let query = `
        SELECT 
          ipm.tool_slug,
          t.name as tool_name,
          t.category_slug,
          ipm.metric_type,
          ipm.metric_category,
          AVG(ipm.metric_value) as avg_value,
          MIN(ipm.metric_value) as min_value,
          MAX(ipm.metric_value) as max_value,
          STDDEV(ipm.metric_value) as stddev_value,
          ipm.metric_unit,
          COUNT(*) as sample_count,
          DATE_TRUNC('${config.groupBy || 'hour'}', ipm.period_start) as period
        FROM integration_performance_metrics ipm
        JOIN tools t ON ipm.tool_slug = t.slug
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (config.tools_included && config.tools_included.length > 0) {
        query += ` AND ipm.tool_slug = ANY($${paramCount})`;
        params.push(config.tools_included);
        paramCount++;
      }
      
      if (config.date_range_start) {
        query += ` AND ipm.period_start >= $${paramCount}`;
        params.push(config.date_range_start);
        paramCount++;
      }
      
      if (config.date_range_end) {
        query += ` AND ipm.period_start <= $${paramCount}`;
        params.push(config.date_range_end);
        paramCount++;
      }
      
      if (config.metrics_included && config.metrics_included.length > 0) {
        query += ` AND ipm.metric_type = ANY($${paramCount})`;
        params.push(config.metrics_included);
        paramCount++;
      }
      
      query += ` GROUP BY ipm.tool_slug, t.name, t.category_slug, ipm.metric_type, ipm.metric_category, ipm.metric_unit, period ORDER BY period DESC, tool_slug, metric_type`;
      
      const result = await client.query(query, params);
      
      // Add health score calculation
      const enrichedData = result.rows.map(row => ({
        ...row,
        health_score: this.calculateHealthScore(row.metric_type, row.avg_value, row.metric_unit),
        performance_grade: this.getPerformanceGrade(row.metric_type, row.avg_value)
      }));
      
      return enrichedData;
    } finally {
      client.release();
    }
  }

  async generateSecurityComplianceReport(config) {
    const client = await this.fastify.pg.connect();
    
    try {
      // Get security-related audit events and usage patterns
      let query = `
        SELECT 
          tua.tool_slug,
          t.name as tool_name,
          t.category_slug,
          tua.user_id,
          tua.user_email,
          tua.usage_type,
          tua.action,
          tua.success,
          tua.timestamp,
          tua.source_ip,
          CASE 
            WHEN tua.tool_slug IN ('snyk', 'sonarqube') THEN 'security_tool'
            WHEN tua.action LIKE '%permission%' THEN 'permission_related'
            WHEN tua.usage_type = 'sso_launch' AND tua.success = false THEN 'failed_authentication'
            ELSE 'general_usage'
          END as security_category
        FROM tool_usage_analytics tua
        JOIN tools t ON tua.tool_slug = t.slug
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (config.tools_included && config.tools_included.length > 0) {
        query += ` AND tua.tool_slug = ANY($${paramCount})`;
        params.push(config.tools_included);
        paramCount++;
      }
      
      if (config.date_range_start) {
        query += ` AND tua.timestamp >= $${paramCount}`;
        params.push(config.date_range_start);
        paramCount++;
      }
      
      if (config.date_range_end) {
        query += ` AND tua.timestamp <= $${paramCount}`;
        params.push(config.date_range_end);
        paramCount++;
      }
      
      // Focus on security-relevant events
      query += ` AND (
        tua.tool_slug IN ('snyk', 'sonarqube') OR
        tua.action LIKE '%permission%' OR
        tua.action LIKE '%security%' OR
        (tua.usage_type = 'sso_launch' AND tua.success = false)
      )`;
      
      query += ` ORDER BY tua.timestamp DESC`;
      
      const result = await client.query(query, params);
      
      // Add compliance scores and risk assessments
      const enrichedData = result.rows.map(row => ({
        ...row,
        risk_level: this.assessSecurityRisk(row),
        compliance_status: this.checkComplianceStatus(row),
        recommended_action: this.getSecurityRecommendation(row)
      }));
      
      return enrichedData;
    } finally {
      client.release();
    }
  }

  async generatePerformanceBenchmarkReport(config) {
    const client = await this.fastify.pg.connect();
    
    try {
      // Get performance metrics with benchmark comparisons
      let query = `
        SELECT 
          ipm.tool_slug,
          t.name as tool_name,
          t.category_slug,
          ipm.metric_type,
          AVG(ipm.metric_value) as current_avg,
          MIN(ipm.metric_value) as current_min,
          MAX(ipm.metric_value) as current_max,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ipm.metric_value) as median_value,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ipm.metric_value) as p95_value,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ipm.metric_value) as p99_value,
          ipm.metric_unit,
          COUNT(*) as sample_count,
          -- Previous period comparison
          LAG(AVG(ipm.metric_value)) OVER (PARTITION BY ipm.tool_slug, ipm.metric_type ORDER BY DATE_TRUNC('day', ipm.period_start)) as previous_avg
        FROM integration_performance_metrics ipm
        JOIN tools t ON ipm.tool_slug = t.slug
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (config.tools_included && config.tools_included.length > 0) {
        query += ` AND ipm.tool_slug = ANY($${paramCount})`;
        params.push(config.tools_included);
        paramCount++;
      }
      
      if (config.date_range_start) {
        query += ` AND ipm.period_start >= $${paramCount}`;
        params.push(config.date_range_start);
        paramCount++;
      }
      
      if (config.date_range_end) {
        query += ` AND ipm.period_start <= $${paramCount}`;
        params.push(config.date_range_end);
        paramCount++;
      }
      
      query += ` GROUP BY ipm.tool_slug, t.name, t.category_slug, ipm.metric_type, ipm.metric_unit, DATE_TRUNC('day', ipm.period_start) ORDER BY ipm.tool_slug, ipm.metric_type`;
      
      const result = await client.query(query, params);
      
      // Add benchmark analysis
      const enrichedData = result.rows.map(row => ({
        ...row,
        benchmark_grade: this.getBenchmarkGrade(row.metric_type, row.current_avg),
        performance_trend: this.calculateTrend(row.current_avg, row.previous_avg),
        optimization_potential: this.assessOptimizationPotential(row)
      }));
      
      return enrichedData;
    } finally {
      client.release();
    }
  }

  async generateWorkflowAnalysisReport(config) {
    const client = await this.fastify.pg.connect();
    
    try {
      let query = `
        SELECT 
          ctw.workflow_type,
          ctw.workflow_name,
          ctw.user_id,
          ctw.user_email,
          ctw.tools_involved,
          ctw.tool_sequence,
          ctw.total_steps,
          ctw.completed_steps,
          ctw.workflow_status,
          ctw.completion_rate,
          ctw.efficiency_score,
          ctw.total_duration_seconds,
          ctw.error_count,
          ctw.workflow_start,
          ctw.workflow_end,
          ctw.trigger_event,
          ctw.entry_point,
          ctw.exit_point,
          ARRAY_LENGTH(ctw.tools_involved, 1) as tools_count,
          CASE 
            WHEN ctw.total_duration_seconds < 300 THEN 'fast'
            WHEN ctw.total_duration_seconds < 1800 THEN 'moderate'
            ELSE 'slow'
          END as duration_category
        FROM cross_tool_workflows ctw
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (config.filters && config.filters.workflow_type) {
        query += ` AND ctw.workflow_type = $${paramCount}`;
        params.push(config.filters.workflow_type);
        paramCount++;
      }
      
      if (config.filters && config.filters.user_id) {
        query += ` AND ctw.user_id = $${paramCount}`;
        params.push(config.filters.user_id);
        paramCount++;
      }
      
      if (config.date_range_start) {
        query += ` AND ctw.workflow_start >= $${paramCount}`;
        params.push(config.date_range_start);
        paramCount++;
      }
      
      if (config.date_range_end) {
        query += ` AND ctw.workflow_start <= $${paramCount}`;
        params.push(config.date_range_end);
        paramCount++;
      }
      
      if (config.tools_included && config.tools_included.length > 0) {
        query += ` AND ctw.tools_involved && $${paramCount}`;
        params.push(config.tools_included);
        paramCount++;
      }
      
      query += ` ORDER BY ctw.workflow_start DESC`;
      
      const result = await client.query(query, params);
      
      // Add workflow analysis
      const enrichedData = result.rows.map(row => ({
        ...row,
        workflow_efficiency: this.calculateWorkflowEfficiency(row),
        bottleneck_analysis: this.identifyBottlenecks(row),
        improvement_suggestions: this.getWorkflowImprovements(row)
      }));
      
      return enrichedData;
    } finally {
      client.release();
    }
  }

  // ===== CSV EXPORT GENERATION =====

  async generateCSVExport(exportConfig) {
    try {
      let data;
      let fields;
      
      switch (exportConfig.data_type) {
        case 'usage':
          data = await this.getUsageDataForExport(exportConfig);
          fields = this.getUsageCSVFields();
          break;
        case 'performance':
          data = await this.getPerformanceDataForExport(exportConfig);
          fields = this.getPerformanceCSVFields();
          break;
        case 'workflows':
          data = await this.getWorkflowDataForExport(exportConfig);
          fields = this.getWorkflowCSVFields();
          break;
        default:
          throw new Error(`Unsupported export data type: ${exportConfig.data_type}`);
      }
      
      const parser = new Parser({ fields });
      return parser.parse(data);
    } catch (error) {
      this.fastify.log.error('Failed to generate CSV export:', error);
      throw error;
    }
  }

  async getUsageDataForExport(config) {
    const client = await this.fastify.pg.connect();
    
    try {
      let query = `
        SELECT 
          tua.tool_slug,
          t.name as tool_name,
          tc.slug as category_slug,
          tua.user_id,
          tua.user_email,
          tua.usage_type,
          tua.action,
          tua.resource_type,
          tua.resource_id,
          tua.response_time_ms,
          tua.success,
          tua.error_code,
          tua.source_ip,
          tua.timestamp,
          tua.tool_specific_metrics
        FROM tool_usage_analytics tua
        JOIN tools t ON tua.tool_slug = t.slug
        LEFT JOIN tool_categories tc ON t.category_id = tc.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (config.tool_slug) {
        query += ` AND tua.tool_slug = $${paramCount}`;
        params.push(config.tool_slug);
        paramCount++;
      }
      
      if (config.since) {
        query += ` AND tua.timestamp >= $${paramCount}`;
        params.push(config.since);
        paramCount++;
      }
      
      if (config.until) {
        query += ` AND tua.timestamp <= $${paramCount}`;
        params.push(config.until);
        paramCount++;
      }
      
      query += ` ORDER BY tua.timestamp DESC`;
      
      if (config.limit) {
        query += ` LIMIT $${paramCount}`;
        params.push(config.limit);
      }
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  getUsageCSVFields() {
    return [
      { label: 'Tool', value: 'tool_slug' },
      { label: 'Tool Name', value: 'tool_name' },
      { label: 'Category', value: 'category_slug' },
      { label: 'User ID', value: 'user_id' },
      { label: 'User Email', value: 'user_email' },
      { label: 'Usage Type', value: 'usage_type' },
      { label: 'Action', value: 'action' },
      { label: 'Resource Type', value: 'resource_type' },
      { label: 'Resource ID', value: 'resource_id' },
      { label: 'Response Time (ms)', value: 'response_time_ms' },
      { label: 'Success', value: 'success' },
      { label: 'Error Code', value: 'error_code' },
      { label: 'Source IP', value: 'source_ip' },
      { label: 'Timestamp', value: 'timestamp' },
      { label: 'Tool Specific Metrics', value: row => JSON.stringify(row.tool_specific_metrics || {}) }
    ];
  }

  // ===== HELPER METHODS =====

  calculateHealthScore(metricType, value, unit) {
    // Health score calculation based on metric type and thresholds
    const thresholds = this.config.PERFORMANCE_THRESHOLDS;
    
    switch (metricType) {
      case 'sso_success_rate':
        if (value >= thresholds.excellent.sso_success_rate) return 100;
        if (value >= thresholds.good.sso_success_rate) return 80;
        if (value >= thresholds.fair.sso_success_rate) return 60;
        return 40;
      case 'api_response_time':
        if (value <= thresholds.excellent.api_response_time) return 100;
        if (value <= thresholds.good.api_response_time) return 80;
        if (value <= thresholds.fair.api_response_time) return 60;
        return 40;
      default:
        return 75; // Default neutral score
    }
  }

  getPerformanceGrade(metricType, value) {
    const score = this.calculateHealthScore(metricType, value);
    
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  assessSecurityRisk(row) {
    if (row.tool_slug === 'snyk' && !row.success) return 'high';
    if (row.security_category === 'failed_authentication') return 'medium';
    if (row.security_category === 'permission_related') return 'medium';
    return 'low';
  }

  checkComplianceStatus(row) {
    // Simplified compliance check
    if (row.success && row.security_category !== 'failed_authentication') {
      return 'compliant';
    }
    return 'needs_review';
  }

  // ===== FILE OPERATIONS =====

  async saveReportFile(reportId, data, format) {
    const timestamp = moment().format('YYYY-MM-DD-HH-mm-ss');
    const filename = `report-${reportId}-${timestamp}.${format}`;
    const filePath = path.join(this.config.EXPORT_STORAGE_PATH, filename);
    
    let content;
    if (format === 'csv') {
      const parser = new Parser();
      content = parser.parse(data);
    } else {
      content = JSON.stringify(data, null, 2);
    }
    
    await fs.writeFile(filePath, content);
    return filePath;
  }

  async getReportDownload(reportId) {
    try {
      const client = await this.fastify.pg.connect();
      
      try {
        const query = `
          SELECT file_path, execution_status
          FROM report_executions
          WHERE id = $1 AND execution_status = 'completed'
        `;
        
        const result = await client.query(query, [reportId]);
        
        if (result.rows.length === 0) {
          return null;
        }
        
        const filePath = result.rows[0].file_path;
        const content = await fs.readFile(filePath, 'utf8');
        
        const contentType = filePath.endsWith('.csv') ? 'text/csv' : 'application/json';
        const filename = path.basename(filePath);
        
        return { content, contentType, filename };
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error('Failed to get report download:', error);
      return null;
    }
  }

  // ===== DATABASE OPERATIONS =====

  async storeReportExecution(reportId, config, status) {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        INSERT INTO report_executions (
          report_id, executed_by, execution_type, date_range_start, date_range_end,
          filters_applied, execution_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;
      
      const values = [
        reportId, 'api_user', 'api', config.date_range_start, config.date_range_end,
        JSON.stringify(config.filters || {}), status
      ];
      
      const result = await client.query(query, values);
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  async updateReportExecution(executionId, updateData) {
    const client = await this.fastify.pg.connect();
    
    try {
      const query = `
        UPDATE report_executions
        SET 
          execution_status = COALESCE($2, execution_status),
          result_count = COALESCE($3, result_count),
          file_path = COALESCE($4, file_path),
          execution_end = COALESCE($5, execution_end),
          execution_duration_seconds = CASE 
            WHEN $5 IS NOT NULL THEN EXTRACT(EPOCH FROM ($5 - execution_start))::INTEGER
            ELSE execution_duration_seconds
          END,
          error_message = COALESCE($6, error_message)
        WHERE id = $1
      `;
      
      const values = [
        executionId, updateData.execution_status, updateData.result_count,
        updateData.file_path, updateData.execution_end, updateData.error_message
      ];
      
      await client.query(query, values);
    } finally {
      client.release();
    }
  }
}

module.exports = ReportGenerator;
