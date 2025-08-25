/**
 * Enhanced Analytics Service - Phase 7
 * 
 * Comprehensive analytics service for tool-specific metrics and reporting:
 * - Per-tool usage analytics for all 11 supported tools
 * - Integration performance metrics and tracking
 * - Cross-tool workflow analytics and correlation
 * - Custom reporting with tool-specific filters
 * - CSV export capabilities
 * - Real-time metrics processing
 * 
 * @author SSO Hub Team
 * @version 1.0.0
 */

const Fastify = require('fastify');
const config = require('./config');
const AnalyticsManager = require('./analytics-manager');
const ReportGenerator = require('./report-generator');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs').promises;
const path = require('path');

const server = Fastify({
  logger: { level: config.LOG_LEVEL },
  bodyLimit: 20971520 // 20MB for large analytics payloads
});

let analyticsManager;
let reportGenerator;

// ===== SERVER SETUP =====

async function setupServer() {
  try {
    // 1. Register plugins
    await server.register(require('@fastify/helmet'), {
      contentSecurityPolicy: false
    });

    await server.register(require('@fastify/cors'), {
      origin: config.CORS_ORIGIN,
      credentials: true
    });

    await server.register(require('@fastify/rate-limit'), {
      max: config.RATE_LIMIT_MAX,
      timeWindow: config.RATE_LIMIT_WINDOW
    });

    // 2. Database connection
    await server.register(require('@fastify/postgres'), {
      connectionString: config.DATABASE_URL
    });

    // 3. Register axios for external API calls
    const axios = require('axios');
    server.decorate('axios', axios);

    // 4. Swagger documentation
    await server.register(require('@fastify/swagger'), {
      swagger: {
        info: {
          title: 'SSO Hub Enhanced Analytics Service',
          description: 'Comprehensive analytics and reporting for tool integration metrics',
          version: '1.0.0'
        },
        host: `${config.HOST}:${config.PORT}`,
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json', 'text/csv'],
        tags: [
          { name: 'Usage Analytics', description: 'Tool usage tracking and metrics' },
          { name: 'Performance', description: 'Integration performance metrics' },
          { name: 'Workflows', description: 'Cross-tool workflow analytics' },
          { name: 'Reports', description: 'Custom reporting and exports' },
          { name: 'Tool-Specific', description: 'Tool-specific analytics and insights' },
          { name: 'Health', description: 'Service health and monitoring' }
        ]
      }
    });

    await server.register(require('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false
      }
    });

    // 5. Initialize services
    analyticsManager = new AnalyticsManager(server, config);
    reportGenerator = new ReportGenerator(server, config, analyticsManager);

    // 6. Ensure export directory exists
    await fs.mkdir(config.EXPORT_STORAGE_PATH, { recursive: true });

    server.log.info('✅ Enhanced Analytics Service: All plugins registered');

  } catch (error) {
    server.log.error('Failed to setup server:', error);
    throw error;
  }
}

// ===== USAGE ANALYTICS ENDPOINTS =====

// Track tool usage
server.post('/api/analytics/usage', {
  schema: {
    description: 'Track tool usage analytics',
    tags: ['Usage Analytics'],
    body: {
      type: 'object',
      properties: {
        tool_slug: { type: 'string', description: 'Tool identifier' },
        user_id: { type: 'string', description: 'User identifier' },
        user_email: { type: 'string', format: 'email' },
        session_id: { type: 'string' },
        usage_type: { type: 'string', description: 'Type of usage (sso_launch, api_call, etc.)' },
        action: { type: 'string', description: 'Specific action performed' },
        resource_type: { type: 'string' },
        resource_id: { type: 'string' },
        response_time_ms: { type: 'integer' },
        success: { type: 'boolean' },
        tool_specific_metrics: { type: 'object', description: 'Tool-specific metric data' }
      },
      required: ['tool_slug', 'user_id', 'usage_type', 'action']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          usage_id: { type: 'string' },
          message: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const usageId = await analyticsManager.trackUsage(request.body);
    
    return {
      success: true,
      usage_id: usageId,
      message: 'Usage analytics tracked successfully'
    };
  } catch (error) {
    server.log.error('Failed to track usage analytics:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to track usage analytics',
      details: error.message
    });
  }
});

// Get tool usage analytics
server.get('/api/analytics/usage', {
  schema: {
    description: 'Retrieve tool usage analytics with filtering',
    tags: ['Usage Analytics'],
    querystring: {
      type: 'object',
      properties: {
        tool_slug: { type: 'string' },
        user_id: { type: 'string' },
        since: { type: 'string', format: 'date-time' },
        until: { type: 'string', format: 'date-time' },
        groupBy: { type: 'string', enum: ['hour', 'day', 'week', 'month'], default: 'day' },
        limit: { type: 'integer', minimum: 1, maximum: 10000, default: 100 }
      }
    }
  }
}, async (request, reply) => {
  try {
    const analytics = await analyticsManager.getToolUsageAnalytics(request.query);
    
    return {
      success: true,
      analytics,
      count: analytics.length,
      filters_applied: request.query
    };
  } catch (error) {
    server.log.error('Failed to retrieve usage analytics:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve usage analytics',
      details: error.message
    });
  }
});

// ===== PERFORMANCE METRICS ENDPOINTS =====

// Record performance metric
server.post('/api/analytics/performance', {
  schema: {
    description: 'Record integration performance metric',
    tags: ['Performance'],
    body: {
      type: 'object',
      properties: {
        tool_slug: { type: 'string' },
        metric_type: { type: 'string', description: 'Type of metric (sso_success_rate, api_response_time, etc.)' },
        metric_category: { type: 'string', enum: ['authentication', 'integration', 'performance', 'reliability'] },
        metric_value: { type: 'number' },
        metric_unit: { type: 'string', description: 'Unit of measurement' },
        aggregation_period: { type: 'string', enum: ['minute', 'hour', 'day', 'week', 'month'] },
        period_start: { type: 'string', format: 'date-time' },
        period_end: { type: 'string', format: 'date-time' }
      },
      required: ['tool_slug', 'metric_type', 'metric_category', 'metric_value', 'metric_unit', 'aggregation_period', 'period_start', 'period_end']
    }
  }
}, async (request, reply) => {
  try {
    const metricId = await analyticsManager.recordPerformanceMetric(request.body);
    
    return {
      success: true,
      metric_id: metricId,
      message: 'Performance metric recorded successfully'
    };
  } catch (error) {
    server.log.error('Failed to record performance metric:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to record performance metric',
      details: error.message
    });
  }
});

// Get performance metrics
server.get('/api/analytics/performance', {
  schema: {
    description: 'Retrieve integration performance metrics',
    tags: ['Performance'],
    querystring: {
      type: 'object',
      properties: {
        tool_slug: { type: 'string' },
        metric_type: { type: 'string' },
        metric_category: { type: 'string', enum: ['authentication', 'integration', 'performance', 'reliability'] },
        since: { type: 'string', format: 'date-time' },
        groupBy: { type: 'string', enum: ['hour', 'day', 'week'], default: 'hour' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const metrics = await analyticsManager.getPerformanceMetrics(request.query);
    
    return {
      success: true,
      metrics,
      count: metrics.length,
      filters_applied: request.query
    };
  } catch (error) {
    server.log.error('Failed to retrieve performance metrics:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve performance metrics',
      details: error.message
    });
  }
});

// ===== WORKFLOW ANALYTICS ENDPOINTS =====

// Start workflow tracking
server.post('/api/analytics/workflows', {
  schema: {
    description: 'Start tracking a cross-tool workflow',
    tags: ['Workflows'],
    body: {
      type: 'object',
      properties: {
        workflow_type: { type: 'string' },
        workflow_name: { type: 'string' },
        user_id: { type: 'string' },
        user_email: { type: 'string', format: 'email' },
        session_id: { type: 'string' },
        tools_involved: { type: 'array', items: { type: 'string' } },
        tool_sequence: { type: 'array', items: { type: 'string' } },
        trigger_event: { type: 'string' },
        entry_point: { type: 'string' },
        metadata: { type: 'object' }
      },
      required: ['workflow_type', 'user_id', 'tools_involved']
    }
  }
}, async (request, reply) => {
  try {
    const workflowId = await analyticsManager.startWorkflow(request.body);
    
    return {
      success: true,
      workflow_id: workflowId,
      message: 'Workflow tracking started'
    };
  } catch (error) {
    server.log.error('Failed to start workflow tracking:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to start workflow tracking',
      details: error.message
    });
  }
});

// Update workflow
server.put('/api/analytics/workflows/:workflowId', {
  schema: {
    description: 'Update workflow tracking data',
    tags: ['Workflows'],
    params: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', format: 'uuid' }
      },
      required: ['workflowId']
    },
    body: {
      type: 'object',
      properties: {
        tool_sequence: { type: 'array', items: { type: 'string' } },
        total_steps: { type: 'integer' },
        completed_steps: { type: 'integer' },
        workflow_status: { type: 'string', enum: ['active', 'completed', 'abandoned', 'failed'] },
        completion_rate: { type: 'number', minimum: 0, maximum: 100 },
        efficiency_score: { type: 'number', minimum: 0, maximum: 100 },
        error_count: { type: 'integer', minimum: 0 },
        metadata: { type: 'object' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const updated = await analyticsManager.updateWorkflow(request.params.workflowId, request.body);
    
    if (!updated) {
      return reply.status(404).send({
        success: false,
        error: 'Workflow not found'
      });
    }
    
    return {
      success: true,
      message: 'Workflow updated successfully'
    };
  } catch (error) {
    server.log.error('Failed to update workflow:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to update workflow',
      details: error.message
    });
  }
});

// Complete workflow
server.post('/api/analytics/workflows/:workflowId/complete', {
  schema: {
    description: 'Complete workflow tracking',
    tags: ['Workflows'],
    params: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', format: 'uuid' }
      },
      required: ['workflowId']
    },
    body: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['completed', 'failed', 'abandoned'] },
        completion_rate: { type: 'number', minimum: 0, maximum: 100 },
        efficiency_score: { type: 'number', minimum: 0, maximum: 100 },
        exit_point: { type: 'string' },
        success_indicators: { type: 'object' }
      },
      required: ['status']
    }
  }
}, async (request, reply) => {
  try {
    const completed = await analyticsManager.completeWorkflow(request.params.workflowId, request.body);
    
    if (!completed) {
      return reply.status(404).send({
        success: false,
        error: 'Workflow not found'
      });
    }
    
    return {
      success: true,
      message: 'Workflow completed successfully'
    };
  } catch (error) {
    server.log.error('Failed to complete workflow:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to complete workflow',
      details: error.message
    });
  }
});

// Get workflow analytics
server.get('/api/analytics/workflows', {
  schema: {
    description: 'Retrieve cross-tool workflow analytics',
    tags: ['Workflows'],
    querystring: {
      type: 'object',
      properties: {
        workflow_type: { type: 'string' },
        user_id: { type: 'string' },
        since: { type: 'string', format: 'date-time' },
        groupBy: { type: 'string', enum: ['hour', 'day', 'week'], default: 'day' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const workflows = await analyticsManager.getWorkflowAnalytics(request.query);
    
    return {
      success: true,
      workflows,
      count: workflows.length,
      filters_applied: request.query
    };
  } catch (error) {
    server.log.error('Failed to retrieve workflow analytics:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve workflow analytics',
      details: error.message
    });
  }
});

// ===== TOOL-SPECIFIC ANALYTICS ENDPOINTS =====

// Get tool-specific analytics
server.get('/api/analytics/tools/:toolSlug', {
  schema: {
    description: 'Get comprehensive analytics for a specific tool',
    tags: ['Tool-Specific'],
    params: {
      type: 'object',
      properties: {
        toolSlug: { type: 'string', description: 'Tool identifier' }
      },
      required: ['toolSlug']
    },
    querystring: {
      type: 'object',
      properties: {
        since: { type: 'string', format: 'date-time' },
        include_patterns: { type: 'boolean', default: true },
        include_performance: { type: 'boolean', default: true }
      }
    }
  }
}, async (request, reply) => {
  try {
    const analytics = await analyticsManager.getToolSpecificAnalytics(request.params.toolSlug, request.query);
    
    return {
      success: true,
      ...analytics
    };
  } catch (error) {
    server.log.error('Failed to retrieve tool-specific analytics:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve tool-specific analytics',
      details: error.message
    });
  }
});

// Get analytics summary for all tools
server.get('/api/analytics/tools', {
  schema: {
    description: 'Get analytics summary for all tools',
    tags: ['Tool-Specific'],
    querystring: {
      type: 'object',
      properties: {
        since: { type: 'string', format: 'date-time' },
        category: { type: 'string', description: 'Tool category filter' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const client = await server.pg.connect();
    
    try {
      let query = `
        SELECT 
          t.slug as tool_slug,
          t.name as tool_name,
          tc.slug as category_slug,
          COUNT(tua.id) as total_usage,
          COUNT(DISTINCT tua.user_id) as unique_users,
          AVG(tua.response_time_ms) as avg_response_time,
          (COUNT(CASE WHEN tua.success = true THEN 1 END) * 100.0 / NULLIF(COUNT(tua.id), 0)) as success_rate,
          MAX(tua.timestamp) as last_activity
        FROM tools t
        LEFT JOIN tool_categories tc ON t.category_id = tc.id
        LEFT JOIN tool_usage_analytics tua ON t.slug = tua.tool_slug
        WHERE t.is_active = true
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (request.query.since) {
        query += ` AND tua.timestamp >= $${paramCount}`;
        params.push(request.query.since);
        paramCount++;
      }
      
      if (request.query.category) {
        query += ` AND tc.slug = $${paramCount}`;
        params.push(request.query.category);
        paramCount++;
      }
      
      query += ` GROUP BY t.slug, t.name, tc.slug ORDER BY total_usage DESC NULLS LAST`;
      
      const result = await client.query(query, params);
      
      return {
        success: true,
        tools: result.rows,
        count: result.rows.length,
        filters_applied: request.query
      };
    } finally {
      client.release();
    }
  } catch (error) {
    server.log.error('Failed to retrieve tools analytics summary:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve tools analytics summary',
      details: error.message
    });
  }
});

// ===== REPORTING ENDPOINTS =====

// Generate custom report
server.post('/api/analytics/reports/generate', {
  schema: {
    description: 'Generate a custom analytics report',
    tags: ['Reports'],
    body: {
      type: 'object',
      properties: {
        report_name: { type: 'string' },
        report_type: { type: 'string', enum: ['tool_usage', 'integration_health', 'security_compliance', 'performance_benchmark', 'workflow_analysis'] },
        tools_included: { type: 'array', items: { type: 'string' } },
        metrics_included: { type: 'array', items: { type: 'string' } },
        date_range_start: { type: 'string', format: 'date-time' },
        date_range_end: { type: 'string', format: 'date-time' },
        filters: { type: 'object' },
        export_format: { type: 'string', enum: ['json', 'csv'], default: 'json' }
      },
      required: ['report_name', 'report_type']
    }
  }
}, async (request, reply) => {
  try {
    const report = await reportGenerator.generateReport(request.body);
    
    return {
      success: true,
      report_id: report.id,
      download_url: `/api/analytics/reports/${report.id}/download`,
      message: 'Report generated successfully'
    };
  } catch (error) {
    server.log.error('Failed to generate report:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to generate report',
      details: error.message
    });
  }
});

// Download report
server.get('/api/analytics/reports/:reportId/download', {
  schema: {
    description: 'Download generated report',
    tags: ['Reports'],
    params: {
      type: 'object',
      properties: {
        reportId: { type: 'string', format: 'uuid' }
      },
      required: ['reportId']
    }
  }
}, async (request, reply) => {
  try {
    const reportData = await reportGenerator.getReportDownload(request.params.reportId);
    
    if (!reportData) {
      return reply.status(404).send({
        success: false,
        error: 'Report not found'
      });
    }
    
    reply.header('Content-Disposition', `attachment; filename="${reportData.filename}"`);
    reply.type(reportData.contentType);
    
    return reportData.content;
  } catch (error) {
    server.log.error('Failed to download report:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to download report',
      details: error.message
    });
  }
});

// Export analytics data as CSV
server.get('/api/analytics/export/csv', {
  schema: {
    description: 'Export analytics data as CSV',
    tags: ['Reports'],
    querystring: {
      type: 'object',
      properties: {
        data_type: { type: 'string', enum: ['usage', 'performance', 'workflows'], default: 'usage' },
        tool_slug: { type: 'string' },
        since: { type: 'string', format: 'date-time' },
        until: { type: 'string', format: 'date-time' },
        limit: { type: 'integer', minimum: 1, maximum: 100000, default: 10000 }
      }
    }
  }
}, async (request, reply) => {
  try {
    const csvData = await reportGenerator.generateCSVExport(request.query);
    
    reply.header('Content-Disposition', `attachment; filename="analytics-${request.query.data_type}-${new Date().toISOString().split('T')[0]}.csv"`);
    reply.type('text/csv');
    
    return csvData;
  } catch (error) {
    server.log.error('Failed to export CSV:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to export CSV',
      details: error.message
    });
  }
});

// ===== HEALTH AND MONITORING =====

server.get('/healthz', {
  schema: {
    description: 'Health check endpoint',
    tags: ['Health']
  }
}, async (request, reply) => {
  return {
    status: 'ok',
    service: 'enhanced-analytics',
    timestamp: new Date().toISOString()
  };
});

server.get('/readyz', {
  schema: {
    description: 'Readiness check endpoint',
    tags: ['Health']
  }
}, async (request, reply) => {
  try {
    // Test database connection
    await server.pg.query('SELECT 1');
    
    return {
      status: 'ready',
      service: 'enhanced-analytics',
      timestamp: new Date().toISOString(),
      database: 'connected',
      features: {
        USAGE_ANALYTICS: true,
        PERFORMANCE_METRICS: true,
        WORKFLOW_TRACKING: true,
        CUSTOM_REPORTING: true,
        CSV_EXPORT: true,
        REAL_TIME_PROCESSING: config.REAL_TIME_PROCESSING,
        TOOL_SPECIFIC_ANALYTICS: true
      }
    };
  } catch (error) {
    return reply.status(503).send({
      status: 'not ready',
      service: 'enhanced-analytics',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// ===== GRACEFUL SHUTDOWN =====

const gracefulShutdown = async (signal) => {
  server.log.info(`🛑 Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Stop any running aggregations
    if (analyticsManager) {
      await analyticsManager.flushBuffers?.();
    }
    
    await server.close();
    server.log.info('✅ Enhanced Analytics Service: Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    server.log.error('❌ Shutdown error:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ===== START SERVER =====

const start = async () => {
  try {
    await setupServer();
    
    const port = parseInt(config.PORT, 10);
    const host = config.HOST;
    
    await server.listen({ port, host });
    
    server.log.info(`🚀 Enhanced Analytics Service listening on ${host}:${port}`);
    server.log.info('🎯 Phase 7: Tool-specific analytics and reporting ready');
    server.log.info(`📚 API Documentation available at http://${host}:${port}/docs`);
    server.log.info('📊 Features: Usage analytics, performance metrics, workflow tracking, custom reporting');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
