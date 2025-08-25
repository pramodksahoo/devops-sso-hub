/**
 * Audit Logger for Provisioning Service - Phase 9
 * Handles audit logging for all provisioning activities
 */

class AuditLogger {
  constructor(fastify, config, databaseManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.isInitialized = false;
  }

  async initialize() {
    this.fastify.log.info('📝 Initializing Audit Logger...');
    this.isInitialized = true;
    this.fastify.log.info('✅ Audit Logger initialized successfully');
  }

  /**
   * Log a provisioning event
   */
  async logEvent(eventType, eventData, userContext = null) {
    try {
      const auditData = {
        event_type: eventType,
        event_category: this.getEventCategory(eventType),
        event_description: this.generateEventDescription(eventType, eventData),
        event_data: eventData,
        user_id: userContext?.sub || eventData.user_id || 'system',
        user_email: userContext?.email || eventData.user_email,
        user_roles: userContext?.roles || eventData.user_roles || [],
        tool_slug: eventData.tool_slug,
        resource_type: eventData.resource_type,
        workflow_id: eventData.workflow_id,
        resource_id: eventData.resource_id,
        template_id: eventData.template_id,
        success: eventData.success !== false,
        error_code: eventData.error_code,
        error_message: eventData.error_message,
        duration_ms: eventData.duration_ms,
        correlation_id: eventData.correlation_id || this.generateCorrelationId(),
        timestamp: new Date()
      };

      await this.db.logProvisioningAudit(auditData);
      
      this.fastify.log.info(`Audit logged: ${eventType}`, {
        workflow_id: eventData.workflow_id,
        tool_slug: eventData.tool_slug,
        user_id: auditData.user_id
      });
    } catch (error) {
      this.fastify.log.error('Failed to log audit event:', error);
      // Don't throw - audit failures shouldn't break the main flow
    }
  }

  /**
   * Get event category based on event type
   */
  getEventCategory(eventType) {
    const categoryMap = {
      'workflow_initiated': 'provisioning',
      'workflow_started': 'provisioning',
      'workflow_completed': 'provisioning',
      'workflow_failed': 'provisioning',
      'workflow_cancelled': 'provisioning',
      'rollback_initiated': 'rollback',
      'rollback_completed': 'rollback',
      'rollback_failed': 'rollback',
      'resource_created': 'provisioning',
      'resource_updated': 'provisioning',
      'resource_deleted': 'provisioning',
      'template_used': 'template',
      'policy_evaluated': 'policy',
      'policy_violated': 'policy',
      'permission_checked': 'security',
      'authentication_failed': 'security',
      'bulk_operation_started': 'bulk',
      'bulk_operation_completed': 'bulk'
    };
    
    return categoryMap[eventType] || 'general';
  }

  /**
   * Generate human-readable event description
   */
  generateEventDescription(eventType, eventData) {
    const descriptions = {
      'workflow_initiated': `Provisioning workflow initiated for ${eventData.resource_type} in ${eventData.tool_slug}`,
      'workflow_started': `Workflow ${eventData.workflow_id} started`,
      'workflow_completed': `Workflow ${eventData.workflow_id} completed successfully`,
      'workflow_failed': `Workflow ${eventData.workflow_id} failed: ${eventData.error_message || 'Unknown error'}`,
      'workflow_cancelled': `Workflow ${eventData.workflow_id} was cancelled`,
      'rollback_initiated': `Rollback initiated for workflow ${eventData.workflow_id}`,
      'rollback_completed': `Rollback completed for workflow ${eventData.workflow_id}`,
      'rollback_failed': `Rollback failed for workflow ${eventData.workflow_id}`,
      'resource_created': `${eventData.resource_type} '${eventData.resource_name}' created in ${eventData.tool_slug}`,
      'resource_updated': `${eventData.resource_type} '${eventData.resource_name}' updated in ${eventData.tool_slug}`,
      'resource_deleted': `${eventData.resource_type} '${eventData.resource_name}' deleted from ${eventData.tool_slug}`,
      'template_used': `Template '${eventData.template_name}' used for ${eventData.tool_slug}`,
      'policy_evaluated': `Policy '${eventData.policy_name}' evaluated`,
      'policy_violated': `Policy '${eventData.policy_name}' violated: ${eventData.violation_reason}`,
      'permission_checked': `Permission check for ${eventData.resource_type} access`,
      'authentication_failed': `Authentication failed for user ${eventData.user_id}`,
      'bulk_operation_started': `Bulk operation started: ${eventData.operation_type}`,
      'bulk_operation_completed': `Bulk operation completed: ${eventData.operation_type}`
    };
    
    return descriptions[eventType] || `${eventType}: ${JSON.stringify(eventData)}`;
  }

  /**
   * Generate correlation ID for tracking related events
   */
  generateCorrelationId() {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log workflow events with proper context
   */
  async logWorkflowEvent(eventType, workflow, additionalData = {}) {
    const eventData = {
      workflow_id: workflow.id,
      tool_slug: workflow.tool_slug,
      resource_type: workflow.target_resource_type,
      user_id: workflow.initiated_by,
      user_email: workflow.initiated_by_email,
      user_roles: workflow.user_roles,
      template_id: workflow.template_id,
      ...additionalData
    };

    await this.logEvent(eventType, eventData);
  }

  /**
   * Log resource events with proper context
   */
  async logResourceEvent(eventType, resource, userContext, additionalData = {}) {
    const eventData = {
      resource_id: resource.id,
      resource_type: resource.resource_type,
      resource_name: resource.resource_name,
      tool_slug: resource.tool_slug,
      workflow_id: resource.workflow_id,
      ...additionalData
    };

    await this.logEvent(eventType, eventData, userContext);
  }

  /**
   * Log policy evaluation events
   */
  async logPolicyEvent(eventType, policy, evaluation, userContext, additionalData = {}) {
    const eventData = {
      policy_id: policy.id,
      policy_name: policy.name,
      policy_type: policy.policy_type,
      evaluation_result: evaluation.result,
      violation_reason: evaluation.violation_reason,
      enforcement_level: policy.enforcement_level,
      ...additionalData
    };

    await this.logEvent(eventType, eventData, userContext);
  }

  /**
   * Log bulk operation events
   */
  async logBulkOperationEvent(eventType, operation, userContext, additionalData = {}) {
    const eventData = {
      operation_id: operation.id,
      operation_type: operation.operation_type,
      operation_name: operation.operation_name,
      tool_slug: operation.target_tool_slug,
      resource_type: operation.target_resource_type,
      total_resources: operation.total_resources,
      processed_resources: operation.processed_resources,
      successful_resources: operation.successful_resources,
      failed_resources: operation.failed_resources,
      ...additionalData
    };

    await this.logEvent(eventType, eventData, userContext);
  }

  /**
   * Get audit trail for a specific workflow
   */
  async getWorkflowAuditTrail(workflowId) {
    try {
      const client = await this.db.db.connect();
      
      try {
        const query = `
          SELECT event_type, event_description, event_data, user_email,
                 success, error_message, timestamp
          FROM provisioning_audit_log
          WHERE workflow_id = $1
          ORDER BY timestamp ASC
        `;
        
        const result = await client.query(query, [workflowId]);
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error('Failed to get workflow audit trail:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(timeframe = '24 hours') {
    try {
      const client = await this.db.db.connect();
      
      try {
        const query = `
          SELECT 
            event_category,
            COUNT(*) as total_events,
            COUNT(CASE WHEN success = true THEN 1 END) as successful_events,
            COUNT(CASE WHEN success = false THEN 1 END) as failed_events
          FROM provisioning_audit_log
          WHERE timestamp >= NOW() - INTERVAL '${timeframe}'
          GROUP BY event_category
          ORDER BY total_events DESC
        `;
        
        const result = await client.query(query);
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error('Failed to get audit statistics:', error);
      return [];
    }
  }
}

module.exports = AuditLogger;
