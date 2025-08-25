/**
 * Analytics Service Configuration
 * Comprehensive configuration for tool-specific analytics and reporting
 */

const config = {
  // Server Configuration
  HOST: process.env.ANALYTICS_HOST || '0.0.0.0',
  PORT: process.env.ANALYTICS_PORT || 3010,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://sso_user:sso_secure_password_123@postgres:5432/sso_hub',
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN === 'true' ? true : (process.env.CORS_ORIGIN || 'http://localhost:3000'),
  
  // Analytics Configuration
  ANALYTICS_RETENTION_DAYS: parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 365, // 1 year default
  BATCH_SIZE: parseInt(process.env.ANALYTICS_BATCH_SIZE) || 10000,
  AGGREGATION_INTERVAL_MINUTES: parseInt(process.env.AGGREGATION_INTERVAL_MINUTES) || 60, // 1 hour
  REAL_TIME_PROCESSING: process.env.REAL_TIME_PROCESSING !== 'false',
  
  // Rate Limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || '1 minute',
  
  // Export Configuration
  EXPORT_MAX_ROWS: parseInt(process.env.EXPORT_MAX_ROWS) || 100000,
  EXPORT_TIMEOUT_SECONDS: parseInt(process.env.EXPORT_TIMEOUT_SECONDS) || 300, // 5 minutes
  EXPORT_STORAGE_PATH: process.env.EXPORT_STORAGE_PATH || '/tmp/analytics-exports',
  
  // Integration URLs
  AUDIT_SERVICE_URL: process.env.AUDIT_SERVICE_URL || 'http://audit:3009',
  CATALOG_SERVICE_URL: process.env.CATALOG_SERVICE_URL || 'http://catalog:3006',
  WEBHOOK_INGRESS_URL: process.env.WEBHOOK_INGRESS_URL || 'http://webhook-ingress:3007',
  TOOLS_HEALTH_URL: process.env.TOOLS_HEALTH_URL || 'http://tools-health:3005',
  
  // Tool Categories for Analytics
  TOOL_CATEGORIES: {
    'source_control': ['github', 'gitlab'],
    'ci_cd': ['jenkins', 'argocd'],
    'infrastructure': ['terraform'],
    'code_quality': ['sonarqube'],
    'monitoring': ['grafana', 'prometheus'],
    'logging': ['kibana'],
    'security': ['snyk'],
    'project_management': ['jira', 'servicenow']
  },
  
  // Analytics Metrics Configuration
  METRICS_CONFIG: {
    'github': {
      'usage_metrics': ['repo_access', 'commit_activity', 'pull_request_activity', 'issue_activity', 'api_usage'],
      'performance_metrics': ['api_response_time', 'webhook_delivery_time', 'sso_success_rate'],
      'business_metrics': ['active_repositories', 'developer_productivity', 'collaboration_score']
    },
    'gitlab': {
      'usage_metrics': ['project_access', 'merge_request_activity', 'pipeline_usage', 'issue_tracking', 'wiki_usage'],
      'performance_metrics': ['pipeline_duration', 'merge_request_time', 'api_response_time'],
      'business_metrics': ['project_velocity', 'code_review_efficiency', 'deployment_frequency']
    },
    'jenkins': {
      'usage_metrics': ['build_frequency', 'job_access_patterns', 'plugin_usage', 'queue_utilization'],
      'performance_metrics': ['build_duration', 'queue_time', 'success_rate', 'resource_utilization'],
      'business_metrics': ['deployment_frequency', 'lead_time', 'failure_recovery_time']
    },
    'argocd': {
      'usage_metrics': ['application_deployments', 'sync_frequency', 'user_activity', 'resource_management'],
      'performance_metrics': ['sync_duration', 'health_check_time', 'rollback_frequency'],
      'business_metrics': ['deployment_success_rate', 'environment_stability', 'change_frequency']
    },
    'terraform': {
      'usage_metrics': ['plan_frequency', 'apply_frequency', 'workspace_usage', 'module_usage'],
      'performance_metrics': ['plan_duration', 'apply_duration', 'success_rate', 'resource_drift'],
      'business_metrics': ['infrastructure_efficiency', 'cost_optimization', 'compliance_score']
    },
    'sonarqube': {
      'usage_metrics': ['analysis_frequency', 'project_access', 'rule_usage', 'quality_gate_usage'],
      'performance_metrics': ['analysis_duration', 'quality_gate_response_time'],
      'business_metrics': ['code_quality_trend', 'technical_debt', 'security_vulnerability_trend']
    },
    'grafana': {
      'usage_metrics': ['dashboard_views', 'panel_interactions', 'datasource_usage', 'alert_management'],
      'performance_metrics': ['dashboard_load_time', 'query_response_time', 'alert_latency'],
      'business_metrics': ['monitoring_coverage', 'incident_detection_rate', 'dashboard_adoption']
    },
    'prometheus': {
      'usage_metrics': ['query_patterns', 'metric_usage', 'alert_frequency', 'target_monitoring'],
      'performance_metrics': ['query_duration', 'scrape_duration', 'storage_usage'],
      'business_metrics': ['system_observability', 'alert_accuracy', 'resource_optimization']
    },
    'kibana': {
      'usage_metrics': ['search_patterns', 'dashboard_usage', 'index_access', 'visualization_usage'],
      'performance_metrics': ['search_response_time', 'index_performance', 'aggregation_time'],
      'business_metrics': ['log_analysis_efficiency', 'incident_resolution_time', 'data_insights']
    },
    'snyk': {
      'usage_metrics': ['scan_frequency', 'project_monitoring', 'vulnerability_tracking', 'license_scanning'],
      'performance_metrics': ['scan_duration', 'detection_accuracy', 'fix_implementation_time'],
      'business_metrics': ['security_posture', 'vulnerability_resolution_rate', 'compliance_score']
    },
    'jira': {
      'usage_metrics': ['ticket_creation', 'workflow_usage', 'project_activity', 'sprint_management'],
      'performance_metrics': ['ticket_resolution_time', 'workflow_efficiency', 'search_performance'],
      'business_metrics': ['team_productivity', 'project_velocity', 'customer_satisfaction']
    },
    'servicenow': {
      'usage_metrics': ['incident_management', 'change_requests', 'knowledge_base_usage', 'workflow_automation'],
      'performance_metrics': ['incident_resolution_time', 'change_approval_time', 'sla_performance'],
      'business_metrics': ['service_availability', 'process_efficiency', 'user_satisfaction']
    }
  },
  
  // Workflow Patterns
  WORKFLOW_PATTERNS: {
    'ci_cd_pipeline': {
      'typical_sequence': ['github', 'jenkins', 'sonarqube', 'argocd'],
      'success_indicators': ['build_success', 'quality_gate_pass', 'deployment_success'],
      'efficiency_metrics': ['total_duration', 'manual_intervention_count', 'rollback_frequency']
    },
    'incident_response': {
      'typical_sequence': ['grafana', 'prometheus', 'kibana', 'jira', 'servicenow'],
      'success_indicators': ['issue_identified', 'root_cause_found', 'resolution_implemented'],
      'efficiency_metrics': ['detection_time', 'resolution_time', 'communication_effectiveness']
    },
    'security_review': {
      'typical_sequence': ['snyk', 'sonarqube', 'jira'],
      'success_indicators': ['vulnerabilities_identified', 'fixes_implemented', 'verification_completed'],
      'efficiency_metrics': ['scan_coverage', 'fix_time', 'false_positive_rate']
    },
    'deployment_pipeline': {
      'typical_sequence': ['github', 'jenkins', 'terraform', 'argocd', 'grafana'],
      'success_indicators': ['code_merged', 'infrastructure_provisioned', 'application_deployed', 'monitoring_active'],
      'efficiency_metrics': ['deployment_frequency', 'lead_time', 'recovery_time']
    }
  },
  
  // Performance Thresholds
  PERFORMANCE_THRESHOLDS: {
    'excellent': { 'sso_success_rate': 99, 'api_response_time': 500, 'uptime': 99.9 },
    'good': { 'sso_success_rate': 95, 'api_response_time': 1000, 'uptime': 99.5 },
    'fair': { 'sso_success_rate': 90, 'api_response_time': 2000, 'uptime': 99.0 },
    'poor': { 'sso_success_rate': 80, 'api_response_time': 5000, 'uptime': 95.0 }
  },
  
  // Report Templates
  REPORT_TEMPLATES: {
    'tool_usage_summary': {
      'description': 'Comprehensive usage summary for all tools',
      'default_metrics': ['sso_launches', 'unique_users', 'session_duration', 'feature_usage'],
      'default_period': '30d'
    },
    'integration_health': {
      'description': 'Health and performance metrics for all integrations',
      'default_metrics': ['uptime', 'response_time', 'error_rate', 'success_rate'],
      'default_period': '7d'
    },
    'security_compliance': {
      'description': 'Security and compliance metrics across all tools',
      'default_metrics': ['access_patterns', 'permission_changes', 'vulnerability_trends', 'compliance_violations'],
      'default_period': '30d'
    },
    'performance_benchmark': {
      'description': 'Performance benchmarks and trends',
      'default_metrics': ['response_times', 'throughput', 'resource_utilization', 'efficiency_scores'],
      'default_period': '90d'
    },
    'workflow_analysis': {
      'description': 'Cross-tool workflow patterns and efficiency',
      'default_metrics': ['workflow_completion_rate', 'step_durations', 'bottleneck_analysis', 'user_journeys'],
      'default_period': '30d'
    }
  },
  
  // Caching Configuration
  CACHE_TTL_SECONDS: parseInt(process.env.CACHE_TTL_SECONDS) || 300, // 5 minutes
  ENABLE_CACHING: process.env.ENABLE_CACHING !== 'false',
  
  // Notification Configuration
  ENABLE_ANALYTICS_ALERTS: process.env.ENABLE_ANALYTICS_ALERTS === 'true',
  ALERT_WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL,
  
  // Data Privacy
  ANONYMIZE_PERSONAL_DATA: process.env.ANONYMIZE_PERSONAL_DATA === 'true',
  GDPR_COMPLIANCE_MODE: process.env.GDPR_COMPLIANCE_MODE === 'true'
};

module.exports = config;
