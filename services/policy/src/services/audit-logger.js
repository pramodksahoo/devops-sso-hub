/**
 * Audit Logger for Policy Service
 * Comprehensive audit logging for all policy decisions and changes
 */

const axios = require('axios');

class AuditLogger {
  constructor(fastify, config) {
    this.fastify = fastify;
    this.config = config;
    this.auditQueue = [];
    this.flushInterval = null;
  }

  async initialize() {
    // Start periodic flush of audit logs
    this.flushInterval = setInterval(() => {
      this.flushAuditQueue();
    }, 5000); // Flush every 5 seconds
    
    this.fastify.log.info('✅ Audit Logger: Initialized with periodic flushing');
  }

  // ============================================================================
  // POLICY ACCESS LOGGING
  // ============================================================================

  async logPolicyAccess(user, action, resource, additionalData = {}) {
    const auditEvent = {
      event_type: 'policy_access',
      event_category: 'access',
      user_id: user.sub,
      user_email: user.email,
      user_roles: user.roles,
      action: action,
      resource: resource,
      success: true,
      timestamp: new Date().toISOString(),
      source_ip: additionalData.source_ip || null,
      user_agent: additionalData.user_agent || null,
      session_id: additionalData.session_id || null,
      request_id: additionalData.request_id || null,
      additional_data: additionalData
    };

    await this.queueAuditEvent(auditEvent);
  }

  async logPolicyChange(user, action, policyId, policyData, additionalData = {}) {
    const auditEvent = {
      event_type: 'policy_change',
      event_category: 'management',
      user_id: user.sub,
      user_email: user.email,
      user_roles: user.roles,
      action: action,
      resource: `policy:${policyId}`,
      success: true,
      timestamp: new Date().toISOString(),
      policy_data: {
        policy_id: policyId,
        policy_name: policyData.name,
        policy_type: policyData.type,
        tool_id: policyData.tool_id,
        enabled: policyData.enabled,
        change_summary: this.generateChangeSummary(action, policyData)
      },
      source_ip: additionalData.source_ip || null,
      user_agent: additionalData.user_agent || null,
      session_id: additionalData.session_id || null,
      request_id: additionalData.request_id || null
    };

    await this.queueAuditEvent(auditEvent);
  }

  // ============================================================================
  // POLICY ENFORCEMENT LOGGING
  // ============================================================================

  async logPolicyEnforcement(enforcementRequest, enforcementResult) {
    const auditEvent = {
      event_type: 'policy_enforcement',
      event_category: 'enforcement',
      user_id: enforcementRequest.user.sub,
      user_email: enforcementRequest.user.email,
      user_roles: enforcementRequest.user.roles,
      action: enforcementRequest.action,
      resource: `${enforcementRequest.tool_slug}:${enforcementRequest.resource_type}:${enforcementRequest.resource_id}`,
      success: true,
      timestamp: new Date().toISOString(),
      enforcement_data: {
        tool_slug: enforcementRequest.tool_slug,
        resource_type: enforcementRequest.resource_type,
        resource_id: enforcementRequest.resource_id,
        resource_name: enforcementRequest.resource_name,
        decision: enforcementResult.decision,
        decision_reason: enforcementResult.reason,
        confidence_score: enforcementResult.confidence_score,
        evaluation_id: enforcementResult.evaluation_id,
        primary_policy: enforcementResult.primary_policy,
        matched_rules: enforcementResult.matched_rules,
        evaluation_summary: enforcementResult.evaluation_summary
      },
      request_id: enforcementRequest.request_id,
      session_id: enforcementRequest.session_id || null
    };

    await this.queueAuditEvent(auditEvent);

    // If decision is deny, also log as a policy violation
    if (enforcementResult.decision === 'deny') {
      await this.logPolicyViolation(enforcementRequest, enforcementResult);
    }
  }

  async logPolicyViolation(enforcementRequest, enforcementResult) {
    const violationEvent = {
      event_type: 'policy_violation',
      event_category: 'security',
      user_id: enforcementRequest.user.sub,
      user_email: enforcementRequest.user.email,
      user_roles: enforcementRequest.user.roles,
      action: enforcementRequest.action,
      resource: `${enforcementRequest.tool_slug}:${enforcementRequest.resource_type}:${enforcementRequest.resource_id}`,
      success: false, // Violation means the request was not successful
      timestamp: new Date().toISOString(),
      violation_data: {
        violation_type: 'access_denied',
        severity: this.calculateViolationSeverity(enforcementRequest, enforcementResult),
        tool_slug: enforcementRequest.tool_slug,
        resource_type: enforcementRequest.resource_type,
        attempted_action: enforcementRequest.action,
        denial_reason: enforcementResult.reason,
        primary_policy: enforcementResult.primary_policy,
        risk_indicators: this.identifyRiskIndicators(enforcementRequest, enforcementResult)
      },
      request_id: enforcementRequest.request_id
    };

    await this.queueAuditEvent(violationEvent);

    // Send immediate notification for high-severity violations
    if (violationEvent.violation_data.severity === 'high' || violationEvent.violation_data.severity === 'critical') {
      await this.sendViolationAlert(violationEvent);
    }
  }

  // ============================================================================
  // COMPLIANCE LOGGING
  // ============================================================================

  async logComplianceChange(user, action, ruleId, ruleData, additionalData = {}) {
    const auditEvent = {
      event_type: 'compliance_change',
      event_category: 'compliance',
      user_id: user.sub,
      user_email: user.email,
      user_roles: user.roles,
      action: action,
      resource: `compliance_rule:${ruleId}`,
      success: true,
      timestamp: new Date().toISOString(),
      compliance_data: {
        rule_id: ruleId,
        rule_name: ruleData.name,
        framework: ruleData.framework,
        risk_level: ruleData.risk_level,
        applicable_tools: ruleData.applicable_tools,
        change_summary: this.generateChangeSummary(action, ruleData)
      },
      source_ip: additionalData.source_ip || null,
      user_agent: additionalData.user_agent || null,
      session_id: additionalData.session_id || null,
      request_id: additionalData.request_id || null
    };

    await this.queueAuditEvent(auditEvent);
  }

  async logComplianceAssessment(assessment, user) {
    const auditEvent = {
      event_type: 'compliance_assessment',
      event_category: 'compliance',
      user_id: user.sub,
      user_email: user.email,
      user_roles: user.roles,
      action: 'assessment_completed',
      resource: `compliance_assessment:${assessment.assessment_id}`,
      success: assessment.status !== 'failed',
      timestamp: new Date().toISOString(),
      assessment_data: {
        assessment_id: assessment.assessment_id,
        compliance_rule_id: assessment.compliance_rule_id,
        tool_slug: assessment.tool_slug,
        assessment_scope: assessment.assessment_scope,
        status: assessment.status,
        compliance_score: assessment.compliance_score,
        findings: assessment.findings,
        gaps_identified: assessment.gaps_identified,
        remediation_required: assessment.remediation_required
      }
    };

    await this.queueAuditEvent(auditEvent);
  }

  // ============================================================================
  // SYSTEM EVENT LOGGING
  // ============================================================================

  async logSystemEvent(eventType, eventData, user = null) {
    const auditEvent = {
      event_type: eventType,
      event_category: 'system',
      user_id: user?.sub || 'system',
      user_email: user?.email || null,
      user_roles: user?.roles || [],
      action: eventData.action || eventType,
      resource: eventData.resource || 'system',
      success: eventData.success !== false,
      timestamp: new Date().toISOString(),
      system_data: eventData
    };

    await this.queueAuditEvent(auditEvent);
  }

  // ============================================================================
  // AUDIT QUEUE MANAGEMENT
  // ============================================================================

  async queueAuditEvent(auditEvent) {
    try {
      // Add correlation ID if not present
      if (!auditEvent.correlation_id) {
        auditEvent.correlation_id = this.generateCorrelationId();
      }

      // Add event to queue
      this.auditQueue.push(auditEvent);

      // If queue is getting full, flush immediately
      if (this.auditQueue.length >= 100) {
        await this.flushAuditQueue();
      }

      // Log locally for immediate visibility
      this.fastify.log.info('Audit event queued', {
        event_type: auditEvent.event_type,
        user_id: auditEvent.user_id,
        action: auditEvent.action,
        resource: auditEvent.resource,
        success: auditEvent.success
      });

    } catch (error) {
      this.fastify.log.error('Failed to queue audit event:', error);
    }
  }

  async flushAuditQueue() {
    if (this.auditQueue.length === 0) {
      return;
    }

    const eventsToFlush = [...this.auditQueue];
    this.auditQueue = [];

    try {
      // Send to audit service
      await this.sendToAuditService(eventsToFlush);
      
      // Also store in local database for backup
      await this.storeAuditEventsLocally(eventsToFlush);

      this.fastify.log.debug(`Flushed ${eventsToFlush.length} audit events`);
    } catch (error) {
      this.fastify.log.error('Failed to flush audit queue:', error);
      
      // Put events back in queue for retry (with limit to prevent memory issues)
      if (this.auditQueue.length < 1000) {
        this.auditQueue.unshift(...eventsToFlush);
      }
    }
  }

  async sendToAuditService(events) {
    if (!this.config.AUDIT_SERVICE_URL) {
      return;
    }

    try {
      const response = await axios.post(`${this.config.AUDIT_SERVICE_URL}/api/events/bulk`, {
        events: events,
        source: 'policy-service'
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PolicyService/1.0'
        }
      });

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Audit service returned status ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'TIMEOUT') {
        this.fastify.log.warn('Audit service unavailable, events stored locally');
      } else {
        throw error;
      }
    }
  }

  async storeAuditEventsLocally(events) {
    // Store events in local database as backup
    const client = await this.fastify.pg.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const event of events) {
        const query = `
          INSERT INTO policy_enforcement_results (
            request_id, user_id, user_email, user_roles, tool_slug,
            action, decision, decision_reason, timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT DO NOTHING
        `;
        
        const values = [
          event.request_id || event.correlation_id,
          event.user_id,
          event.user_email,
          event.user_roles,
          event.enforcement_data?.tool_slug || 'unknown',
          event.action,
          event.enforcement_data?.decision || (event.success ? 'allow' : 'deny'),
          event.enforcement_data?.decision_reason || event.event_type,
          event.timestamp
        ];
        
        await client.query(query, values);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      this.fastify.log.error('Failed to store audit events locally:', error);
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // NOTIFICATION AND ALERTING
  // ============================================================================

  async sendViolationAlert(violationEvent) {
    try {
      if (this.config.NOTIFICATION_CONFIG.enable_policy_violations) {
        // Send to notification service or webhook
        if (this.config.NOTIFICATION_CONFIG.webhook_endpoints.length > 0) {
          for (const webhook of this.config.NOTIFICATION_CONFIG.webhook_endpoints) {
            await this.sendWebhookNotification(webhook, violationEvent);
          }
        }
      }
    } catch (error) {
      this.fastify.log.error('Failed to send violation alert:', error);
    }
  }

  async sendWebhookNotification(webhookUrl, event) {
    try {
      await axios.post(webhookUrl, {
        type: 'policy_violation',
        severity: event.violation_data.severity,
        user: {
          id: event.user_id,
          email: event.user_email
        },
        violation: event.violation_data,
        timestamp: event.timestamp
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PolicyService/1.0'
        }
      });
    } catch (error) {
      this.fastify.log.error('Failed to send webhook notification:', error);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  generateChangeSummary(action, data) {
    const summary = {
      action: action,
      timestamp: new Date().toISOString()
    };

    switch (action) {
      case 'create_policy':
        summary.description = `Created policy ${data.name} for ${data.tool_id || 'all tools'}`;
        summary.impact = data.enabled ? 'Policy is active and will be enforced' : 'Policy created but disabled';
        break;
      
      case 'update_policy':
        summary.description = `Updated policy ${data.name}`;
        summary.impact = 'Policy changes will affect future access decisions';
        break;
      
      case 'delete_policy':
        summary.description = `Deleted policy ${data.name}`;
        summary.impact = 'Policy no longer enforced, access may be affected';
        break;
      
      case 'create_compliance_rule':
        summary.description = `Created compliance rule ${data.name} for ${data.framework}`;
        summary.impact = 'New compliance requirement active';
        break;
      
      default:
        summary.description = `${action} performed`;
        summary.impact = 'Configuration change made';
    }

    return summary;
  }

  calculateViolationSeverity(enforcementRequest, enforcementResult) {
    let severity = 'low';

    // Check for high-risk actions
    const highRiskActions = ['admin', 'delete', 'deploy', 'modify', 'execute'];
    if (highRiskActions.includes(enforcementRequest.action)) {
      severity = 'medium';
    }

    // Check for production environment
    const resourceName = enforcementRequest.resource_name || '';
    if (resourceName.includes('prod') || resourceName.includes('production')) {
      severity = 'high';
    }

    // Check for admin users (admin being denied is suspicious)
    if (enforcementRequest.user.roles.includes('admin')) {
      severity = 'high';
    }

    // Check for critical tools
    const criticalTools = ['terraform', 'argocd', 'jenkins'];
    if (criticalTools.includes(enforcementRequest.tool_slug)) {
      severity = severity === 'low' ? 'medium' : 'high';
    }

    return severity;
  }

  identifyRiskIndicators(enforcementRequest, enforcementResult) {
    const indicators = [];

    // Time-based indicators
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      indicators.push('outside_business_hours');
    }

    // Role-based indicators
    if (enforcementRequest.user.roles.includes('admin') || enforcementRequest.user.roles.includes('root')) {
      indicators.push('privileged_user');
    }

    // Action-based indicators
    const destructiveActions = ['delete', 'destroy', 'remove', 'drop'];
    if (destructiveActions.some(action => enforcementRequest.action.includes(action))) {
      indicators.push('destructive_action');
    }

    // Resource-based indicators
    if (enforcementRequest.resource_name && enforcementRequest.resource_name.includes('prod')) {
      indicators.push('production_resource');
    }

    return indicators;
  }

  generateCorrelationId() {
    return `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // CLEANUP AND SHUTDOWN
  // ============================================================================

  async flush() {
    await this.flushAuditQueue();
  }

  async close() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Final flush
    await this.flushAuditQueue();
    
    this.fastify.log.info('Audit logger closed successfully');
  }
}

module.exports = AuditLogger;
