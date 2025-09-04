/**
 * Audit Logger for Notifier Service
 * Logs all notification activities to the Audit Service
 */

const axios = require('axios');

class AuditLogger {
  constructor(fastify, config) {
    this.fastify = fastify;
    this.config = config;
    this.auditQueue = [];
    this.isFlushingInProgress = false;
    
    // Setup periodic flushing
    this.flushInterval = setInterval(() => {
      this.flushAuditLogs();
    }, 5000); // Flush every 5 seconds
  }

  async initialize() {
    this.fastify.log.info('✅ Audit Logger: Initialized with periodic flushing');
  }

  // ============================================================================
  // NOTIFICATION EVENT LOGGING
  // ============================================================================

  async logNotificationEvent(eventData) {
    const auditEntry = {
      service: 'notifier',
      event_type: eventData.action || 'notification_event',
      user_id: eventData.user_id || 'system',
      resource_type: 'notification',
      resource_id: eventData.notification_id,
      action: eventData.action,
      details: {
        notification_id: eventData.notification_id,
        notification_type: eventData.notification_type,
        priority: eventData.priority,
        status: eventData.status,
        channels: eventData.channels,
        recipients: eventData.recipients,
        template_id: eventData.template_id,
        template_name: eventData.template_name,
        delivery_results: eventData.delivery_results,
        processing_time: eventData.processing_time,
        success_rate: eventData.success_rate,
        error: eventData.error,
        attempt: eventData.attempt,
        metadata: eventData.metadata
      },
      ip_address: eventData.ip_address || '127.0.0.1',
      user_agent: eventData.user_agent || 'SSO-Hub-Notifier/1.0',
      timestamp: new Date().toISOString()
    };

    this.auditQueue.push(auditEntry);
    
    // Flush immediately for critical events
    if (eventData.priority === 'critical' || eventData.action === 'notification_failed') {
      await this.flushAuditLogs();
    }
  }

  async logChannelEvent(eventData) {
    const auditEntry = {
      service: 'notifier',
      event_type: 'channel_event',
      user_id: eventData.user_id || 'system',
      resource_type: 'notification_channel',
      resource_id: eventData.channel_id,
      action: eventData.action,
      details: {
        channel_id: eventData.channel_id,
        channel_name: eventData.channel_name,
        channel_type: eventData.channel_type,
        test_result: eventData.test_result,
        configuration_changes: eventData.configuration_changes,
        error: eventData.error,
        metadata: eventData.metadata
      },
      ip_address: eventData.ip_address || '127.0.0.1',
      user_agent: eventData.user_agent || 'SSO-Hub-Notifier/1.0',
      timestamp: new Date().toISOString()
    };

    this.auditQueue.push(auditEntry);
  }

  async logTemplateEvent(eventData) {
    const auditEntry = {
      service: 'notifier',
      event_type: 'template_event',
      user_id: eventData.user_id || 'system',
      resource_type: 'notification_template',
      resource_id: eventData.template_id,
      action: eventData.action,
      details: {
        template_id: eventData.template_id,
        template_name: eventData.template_name,
        template_type: eventData.template_type,
        changes: eventData.changes,
        validation_result: eventData.validation_result,
        test_result: eventData.test_result,
        variables_used: eventData.variables_used,
        error: eventData.error,
        metadata: eventData.metadata
      },
      ip_address: eventData.ip_address || '127.0.0.1',
      user_agent: eventData.user_agent || 'SSO-Hub-Notifier/1.0',
      timestamp: new Date().toISOString()
    };

    this.auditQueue.push(auditEntry);
  }

  async logDeliveryEvent(eventData) {
    const auditEntry = {
      service: 'notifier',
      event_type: 'delivery_event',
      user_id: eventData.user_id || 'system',
      resource_type: 'notification_delivery',
      resource_id: eventData.delivery_id,
      action: eventData.action,
      details: {
        delivery_id: eventData.delivery_id,
        notification_id: eventData.notification_id,
        channel_type: eventData.channel_type,
        recipient: eventData.recipient,
        status: eventData.status,
        attempts: eventData.attempts,
        delivery_time: eventData.delivery_time,
        response_data: eventData.response_data,
        failure_reason: eventData.failure_reason,
        external_delivery_id: eventData.external_delivery_id,
        metadata: eventData.metadata
      },
      ip_address: eventData.ip_address || '127.0.0.1',
      user_agent: eventData.user_agent || 'SSO-Hub-Notifier/1.0',
      timestamp: new Date().toISOString()
    };

    this.auditQueue.push(auditEntry);
  }

  async logSystemEvent(eventData) {
    const auditEntry = {
      service: 'notifier',
      event_type: 'system_event',
      user_id: eventData.user_id || 'system',
      resource_type: 'notifier_service',
      resource_id: 'notifier',
      action: eventData.action,
      details: {
        service_status: eventData.service_status,
        queue_stats: eventData.queue_stats,
        processing_stats: eventData.processing_stats,
        health_status: eventData.health_status,
        configuration_changes: eventData.configuration_changes,
        error: eventData.error,
        metadata: eventData.metadata
      },
      ip_address: eventData.ip_address || '127.0.0.1',
      user_agent: eventData.user_agent || 'SSO-Hub-Notifier/1.0',
      timestamp: new Date().toISOString()
    };

    this.auditQueue.push(auditEntry);
  }

  // ============================================================================
  // SPECIFIC EVENT HELPERS
  // ============================================================================

  async logNotificationCreated(notification, userId = 'system') {
    await this.logNotificationEvent({
      action: 'notification_created',
      notification_id: notification.notification_id,
      notification_type: notification.type,
      priority: notification.priority,
      channels: notification.channels,
      recipients: notification.recipients,
      template_id: notification.template_id,
      user_id: userId,
      metadata: notification.metadata
    });
  }

  async logNotificationSent(notification, deliveryResults, processingTime) {
    await this.logNotificationEvent({
      action: 'notification_sent',
      notification_id: notification.notification_id,
      notification_type: notification.type,
      priority: notification.priority,
      status: 'sent',
      delivery_results: deliveryResults,
      processing_time: processingTime,
      success_rate: deliveryResults.filter(r => r.success).length / deliveryResults.length * 100
    });
  }

  async logNotificationFailed(notification, error, attempt = 1) {
    await this.logNotificationEvent({
      action: 'notification_failed',
      notification_id: notification.notification_id,
      notification_type: notification.type,
      priority: notification.priority,
      status: 'failed',
      error: error.message,
      attempt: attempt
    });
  }

  async logChannelTested(channelId, channelName, channelType, testResult, userId) {
    await this.logChannelEvent({
      action: 'channel_tested',
      channel_id: channelId,
      channel_name: channelName,
      channel_type: channelType,
      test_result: testResult,
      user_id: userId
    });
  }

  async logTemplateRendered(templateId, templateName, variables, result, userId = 'system') {
    await this.logTemplateEvent({
      action: 'template_rendered',
      template_id: templateId,
      template_name: templateName,
      variables_used: Object.keys(variables),
      test_result: result,
      user_id: userId
    });
  }

  async logServiceStarted(stats) {
    await this.logSystemEvent({
      action: 'service_started',
      service_status: 'started',
      processing_stats: stats
    });
  }

  async logServiceStopped() {
    await this.logSystemEvent({
      action: 'service_stopped',
      service_status: 'stopped'
    });
  }

  // ============================================================================
  // AUDIT LOG FLUSHING
  // ============================================================================

  async flushAuditLogs() {
    if (this.isFlushingInProgress || this.auditQueue.length === 0) {
      return;
    }

    this.isFlushingInProgress = true;

    try {
      const logsToFlush = [...this.auditQueue];
      this.auditQueue = [];

      await this.sendToAuditService(logsToFlush);
      
      this.fastify.log.debug(`Flushed ${logsToFlush.length} audit entries`);

    } catch (error) {
      this.fastify.log.error('Failed to flush audit logs:', error);
      // Re-queue failed logs (keep only last 1000 to prevent memory issues)
      this.auditQueue = [...this.auditQueue.slice(-500), ...this.auditQueue];
    } finally {
      this.isFlushingInProgress = false;
    }
  }

  async sendToAuditService(auditEntries) {
    if (!this.config.AUDIT_SERVICE_URL) {
      this.fastify.log.warn('Audit service URL not configured, skipping audit logging');
      return;
    }

    try {
      const response = await axios.post(`${this.config.AUDIT_SERVICE_URL}/api/events/batch`, {
        events: auditEntries
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'notifier',
          'X-Service-Version': '1.0.0'
        }
      });

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Audit service returned status: ${response.status}`);
      }

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        this.fastify.log.warn('Audit service unavailable, audit logs will be retried');
      } else {
        this.fastify.log.error('Failed to send audit logs:', error.message);
      }
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getQueueStatus() {
    return {
      queued_entries: this.auditQueue.length,
      is_flushing: this.isFlushingInProgress,
      audit_service_url: this.config.AUDIT_SERVICE_URL,
      flush_interval: 5000
    };
  }

  async forceFlush() {
    await this.flushAuditLogs();
  }

  clearQueue() {
    this.auditQueue = [];
    this.fastify.log.info('Audit queue cleared');
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Flush any remaining logs
    if (this.auditQueue.length > 0) {
      this.flushAuditLogs().catch(error => {
        this.fastify.log.error('Failed to flush final audit logs:', error);
      });
    }
  }
}

module.exports = AuditLogger;
