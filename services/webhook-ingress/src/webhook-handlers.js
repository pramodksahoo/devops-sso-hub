/**
 * Tool-Specific Webhook Handlers
 * Comprehensive webhook processing for all 11 DevOps tools
 */

const crypto = require('crypto');
const { z } = require('zod');

class WebhookHandlers {
  constructor(fastify, config, databaseManager, notificationService) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.notifications = notificationService;
  }

  // ===== SIGNATURE VALIDATION =====

  async validateWebhookSignature(toolSlug, headers, rawBody, secret) {
    const toolConfig = this.config.TOOL_CONFIGS[toolSlug];
    if (!toolConfig) {
      throw new Error(`Unknown tool: ${toolSlug}`);
    }

    const signatureHeader = headers[toolConfig.signature_header.toLowerCase()];
    
    switch (toolSlug) {
      case 'github':
        return this.validateGitHubSignature(signatureHeader, rawBody, secret);
      case 'gitlab':
        return this.validateGitLabToken(signatureHeader, secret);
      case 'jenkins':
        return this.validateJenkinsAuth(signatureHeader, secret);
      case 'argocd':
        return this.validateArgoCDSignature(signatureHeader, rawBody, secret);
      case 'terraform':
        return this.validateTerraformSignature(signatureHeader, rawBody, secret);
      case 'sonarqube':
        return this.validateSonarQubeToken(signatureHeader, secret);
      case 'grafana':
        return this.validateGrafanaAuth(signatureHeader, secret);
      case 'prometheus':
        return this.validatePrometheusAuth(signatureHeader, secret);
      case 'kibana':
        return this.validateKibanaAuth(signatureHeader, secret);
      case 'snyk':
        return this.validateSnykSignature(signatureHeader, rawBody, secret);
      case 'jira':
      case 'servicenow':
        return this.validateBasicAuth(signatureHeader, secret);
      default:
        return this.validateHMACSignature(signatureHeader, rawBody, secret);
    }
  }

  validateGitHubSignature(signature, body, secret) {
    if (!signature || !signature.startsWith('sha256=')) {
      return false;
    }
    
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  validateGitLabToken(token, secret) {
    return token === secret;
  }

  validateJenkinsAuth(authHeader, secret) {
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }
    
    const encoded = authHeader.split(' ')[1];
    const decoded = Buffer.from(encoded, 'base64').toString();
    return decoded === secret;
  }

  validateArgoCDSignature(signature, body, secret) {
    if (!signature) {
      return false;
    }
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  validateTerraformSignature(signature, body, secret) {
    if (!signature) {
      return false;
    }
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  validateSonarQubeToken(token, secret) {
    return token === secret;
  }

  validateGrafanaAuth(authHeader, secret) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }
    
    const token = authHeader.split(' ')[1];
    return token === secret;
  }

  validatePrometheusAuth(authHeader, secret) {
    return this.validateBasicAuth(authHeader, secret);
  }

  validateKibanaAuth(authHeader, secret) {
    // Can be Bearer token or API key
    if (authHeader && (authHeader.startsWith('Bearer ') || authHeader.startsWith('ApiKey '))) {
      const token = authHeader.split(' ')[1];
      return token === secret;
    }
    return false;
  }

  validateSnykSignature(signature, body, secret) {
    if (!signature) {
      return false;
    }
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  validateBasicAuth(authHeader, secret) {
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }
    
    const encoded = authHeader.split(' ')[1];
    const decoded = Buffer.from(encoded, 'base64').toString();
    return decoded === secret;
  }

  validateHMACSignature(signature, body, secret) {
    if (!signature) {
      return false;
    }
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // ===== TOOL-SPECIFIC EVENT HANDLERS =====

  async handleGitHubWebhook(payload, headers) {
    const event = headers['x-github-event'];
    const delivery = headers['x-github-delivery'];
    
    const normalizedEvent = {
      tool: 'github',
      event_type: event,
      event_id: delivery,
      timestamp: new Date().toISOString(),
      raw_payload: payload,
      normalized_data: this.normalizeGitHubEvent(event, payload)
    };

    return normalizedEvent;
  }

  normalizeGitHubEvent(eventType, payload) {
    switch (eventType) {
      case 'push':
        return {
          repository: payload.repository?.full_name,
          branch: payload.ref?.replace('refs/heads/', ''),
          commits: payload.commits?.length || 0,
          author: payload.pusher?.name,
          commit_messages: payload.commits?.map(c => c.message) || []
        };
      case 'pull_request':
        return {
          repository: payload.repository?.full_name,
          pr_number: payload.pull_request?.number,
          action: payload.action,
          title: payload.pull_request?.title,
          author: payload.pull_request?.user?.login,
          state: payload.pull_request?.state
        };
      case 'issues':
        return {
          repository: payload.repository?.full_name,
          issue_number: payload.issue?.number,
          action: payload.action,
          title: payload.issue?.title,
          author: payload.issue?.user?.login,
          state: payload.issue?.state
        };
      case 'release':
        return {
          repository: payload.repository?.full_name,
          tag_name: payload.release?.tag_name,
          name: payload.release?.name,
          action: payload.action,
          author: payload.release?.author?.login,
          prerelease: payload.release?.prerelease
        };
      case 'deployment':
        return {
          repository: payload.repository?.full_name,
          environment: payload.deployment?.environment,
          ref: payload.deployment?.ref,
          creator: payload.deployment?.creator?.login,
          description: payload.deployment?.description
        };
      default:
        return payload;
    }
  }

  async handleGitLabWebhook(payload, headers) {
    const event = headers['x-gitlab-event'];
    
    const normalizedEvent = {
      tool: 'gitlab',
      event_type: payload.object_kind || event,
      event_id: payload.object_attributes?.id || payload.project_id,
      timestamp: new Date().toISOString(),
      raw_payload: payload,
      normalized_data: this.normalizeGitLabEvent(payload.object_kind || event, payload)
    };

    return normalizedEvent;
  }

  normalizeGitLabEvent(eventType, payload) {
    switch (eventType) {
      case 'push':
        return {
          project: payload.project?.path_with_namespace,
          branch: payload.ref?.replace('refs/heads/', ''),
          commits: payload.commits?.length || 0,
          author: payload.user_name,
          commit_messages: payload.commits?.map(c => c.message) || []
        };
      case 'merge_request':
        return {
          project: payload.project?.path_with_namespace,
          mr_number: payload.object_attributes?.iid,
          action: payload.object_attributes?.action,
          title: payload.object_attributes?.title,
          author: payload.user?.name,
          state: payload.object_attributes?.state
        };
      case 'pipeline':
        return {
          project: payload.project?.path_with_namespace,
          pipeline_id: payload.object_attributes?.id,
          status: payload.object_attributes?.status,
          ref: payload.object_attributes?.ref,
          duration: payload.object_attributes?.duration
        };
      default:
        return payload;
    }
  }

  async handleJenkinsWebhook(payload, headers) {
    const event = headers['x-jenkins-event'] || 'build_event';
    
    const normalizedEvent = {
      tool: 'jenkins',
      event_type: event,
      event_id: `${payload.name}-${payload.build?.number}`,
      timestamp: new Date().toISOString(),
      raw_payload: payload,
      normalized_data: this.normalizeJenkinsEvent(event, payload)
    };

    return normalizedEvent;
  }

  normalizeJenkinsEvent(eventType, payload) {
    return {
      job_name: payload.name,
      build_number: payload.build?.number,
      build_url: payload.build?.full_url,
      status: payload.build?.status || payload.build?.phase,
      duration: payload.build?.duration,
      executor: payload.build?.executor,
      parameters: payload.build?.parameters
    };
  }

  async handleArgoCDWebhook(payload, headers) {
    const event = headers['x-argo-event'] || 'app_event';
    
    const normalizedEvent = {
      tool: 'argocd',
      event_type: event,
      event_id: payload.metadata?.uid || payload.metadata?.name,
      timestamp: new Date().toISOString(),
      raw_payload: payload,
      normalized_data: this.normalizeArgoCDEvent(event, payload)
    };

    return normalizedEvent;
  }

  normalizeArgoCDEvent(eventType, payload) {
    return {
      app_name: payload.metadata?.name,
      namespace: payload.metadata?.namespace,
      sync_status: payload.status?.sync?.status,
      health_status: payload.status?.health?.status,
      operation_state: payload.status?.operationState?.phase,
      revision: payload.status?.sync?.revision
    };
  }

  async handleTerraformWebhook(payload, headers) {
    const event = headers['x-tfc-notification-event'] || 'run_event';
    
    const normalizedEvent = {
      tool: 'terraform',
      event_type: event,
      event_id: payload.run_id || payload.payload?.run?.id,
      timestamp: new Date().toISOString(),
      raw_payload: payload,
      normalized_data: this.normalizeTerraformEvent(event, payload)
    };

    return normalizedEvent;
  }

  normalizeTerraformEvent(eventType, payload) {
    const run = payload.payload?.run || payload;
    return {
      run_id: run.id,
      workspace: payload.payload?.workspace?.name,
      status: run.status,
      created_by: run.created_by?.username,
      plan_changes: run.plan?.resource_additions + run.plan?.resource_changes + run.plan?.resource_destructions,
      message: run.message
    };
  }

  async handleSonarQubeWebhook(payload, headers) {
    const event = headers['x-sonarqube-event'] || 'quality_gate';
    
    const normalizedEvent = {
      tool: 'sonarqube',
      event_type: event,
      event_id: payload.taskId || payload.project?.key,
      timestamp: new Date().toISOString(),
      raw_payload: payload,
      normalized_data: this.normalizeSonarQubeEvent(event, payload)
    };

    return normalizedEvent;
  }

  normalizeSonarQubeEvent(eventType, payload) {
    return {
      project_key: payload.project?.key,
      project_name: payload.project?.name,
      quality_gate_status: payload.qualityGate?.status,
      conditions: payload.qualityGate?.conditions,
      task_id: payload.taskId,
      analyzed_at: payload.analysedAt
    };
  }

  async handleGrafanaWebhook(payload, headers) {
    const event = headers['x-grafana-event'] || 'alert';
    
    const normalizedEvent = {
      tool: 'grafana',
      event_type: event,
      event_id: payload.ruleId || payload.dashboardId,
      timestamp: new Date().toISOString(),
      raw_payload: payload,
      normalized_data: this.normalizeGrafanaEvent(event, payload)
    };

    return normalizedEvent;
  }

  normalizeGrafanaEvent(eventType, payload) {
    return {
      alert_name: payload.ruleName || payload.title,
      state: payload.state,
      message: payload.message,
      dashboard_title: payload.title,
      org_id: payload.orgId,
      rule_url: payload.ruleUrl
    };
  }

  async handlePrometheusWebhook(payload, headers) {
    const event = headers['x-prometheus-event'] || 'alert_manager';
    
    const normalizedEvent = {
      tool: 'prometheus',
      event_type: event,
      event_id: payload.groupKey || Date.now().toString(),
      timestamp: new Date().toISOString(),
      raw_payload: payload,
      normalized_data: this.normalizePrometheusEvent(event, payload)
    };

    return normalizedEvent;
  }

  normalizePrometheusEvent(eventType, payload) {
    return {
      alerts: payload.alerts?.map(alert => ({
        alert_name: alert.labels?.alertname,
        severity: alert.labels?.severity,
        status: alert.status,
        starts_at: alert.startsAt,
        ends_at: alert.endsAt,
        summary: alert.annotations?.summary,
        description: alert.annotations?.description
      })),
      group_key: payload.groupKey,
      status: payload.status
    };
  }

  async handleKibanaWebhook(payload, headers) {
    const event = headers['x-kibana-event'] || 'watcher_alert';
    
    const normalizedEvent = {
      tool: 'kibana',
      event_type: event,
      event_id: payload.watch_id || payload.id,
      timestamp: new Date().toISOString(),
      raw_payload: payload,
      normalized_data: this.normalizeKibanaEvent(event, payload)
    };

    return normalizedEvent;
  }

  normalizeKibanaEvent(eventType, payload) {
    return {
      watch_id: payload.watch_id,
      watch_title: payload.watch_record?.trigger?.title,
      condition_met: payload.watch_record?.condition?.met,
      execution_time: payload.watch_record?.execution_time,
      state: payload.watch_record?.state
    };
  }

  async handleSnykWebhook(payload, headers) {
    const event = headers['x-snyk-event'] || 'vulnerability';
    
    const normalizedEvent = {
      tool: 'snyk',
      event_type: event,
      event_id: payload.id || payload.project?.id,
      timestamp: new Date().toISOString(),
      raw_payload: payload,
      normalized_data: this.normalizeSnykEvent(event, payload)
    };

    return normalizedEvent;
  }

  normalizeSnykEvent(eventType, payload) {
    return {
      project_name: payload.project?.name,
      org_name: payload.org?.name,
      vulnerability_count: payload.newIssues?.length || 0,
      severity_counts: payload.newIssues?.reduce((acc, issue) => {
        acc[issue.issueData?.severity] = (acc[issue.issueData?.severity] || 0) + 1;
        return acc;
      }, {})
    };
  }

  async handleJiraWebhook(payload, headers) {
    const event = payload.webhookEvent || 'issue_event';
    
    const normalizedEvent = {
      tool: 'jira',
      event_type: event,
      event_id: payload.issue?.key,
      timestamp: new Date().toISOString(),
      raw_payload: payload,
      normalized_data: this.normalizeJiraEvent(event, payload)
    };

    return normalizedEvent;
  }

  normalizeJiraEvent(eventType, payload) {
    return {
      issue_key: payload.issue?.key,
      issue_type: payload.issue?.fields?.issuetype?.name,
      summary: payload.issue?.fields?.summary,
      status: payload.issue?.fields?.status?.name,
      assignee: payload.issue?.fields?.assignee?.displayName,
      reporter: payload.issue?.fields?.reporter?.displayName,
      priority: payload.issue?.fields?.priority?.name,
      project: payload.issue?.fields?.project?.key
    };
  }

  async handleServiceNowWebhook(payload, headers) {
    const event = headers['x-servicenow-event'] || 'incident_event';
    
    const normalizedEvent = {
      tool: 'servicenow',
      event_type: event,
      event_id: payload.number || payload.sys_id,
      timestamp: new Date().toISOString(),
      raw_payload: payload,
      normalized_data: this.normalizeServiceNowEvent(event, payload)
    };

    return normalizedEvent;
  }

  normalizeServiceNowEvent(eventType, payload) {
    return {
      number: payload.number,
      short_description: payload.short_description,
      state: payload.state,
      priority: payload.priority,
      category: payload.category,
      assigned_to: payload.assigned_to,
      caller_id: payload.caller_id,
      sys_created_on: payload.sys_created_on
    };
  }

  // ===== EVENT PROCESSING AND ROUTING =====

  async processWebhookEvent(toolSlug, normalizedEvent) {
    try {
      // Store webhook delivery record
      const deliveryRecord = await this.db.createWebhookDelivery({
        tool_slug: toolSlug,
        event_type: normalizedEvent.event_type,
        event_id: normalizedEvent.event_id,
        delivery_status: 'delivered',
        http_status_code: 200,
        request_body: normalizedEvent.raw_payload,
        delivered_at: new Date()
      });

      // Get notification rules for this tool and event type
      const notificationRules = await this.db.getNotificationRules(toolSlug, normalizedEvent.event_type);

      // Process notifications
      for (const rule of notificationRules) {
        if (this.matchesRuleConditions(normalizedEvent, rule.conditions)) {
          await this.notifications.sendNotifications(rule, normalizedEvent, deliveryRecord);
        }
      }

      // Audit the webhook event
      await this.auditWebhookEvent(toolSlug, normalizedEvent, deliveryRecord);

      return deliveryRecord;
    } catch (error) {
      this.fastify.log.error(`Failed to process webhook event for ${toolSlug}:`, error);
      throw error;
    }
  }

  matchesRuleConditions(event, conditions) {
    // Simple condition matching - can be enhanced with more complex logic
    if (!conditions || Object.keys(conditions).length === 0) {
      return true;
    }

    for (const [key, expectedValue] of Object.entries(conditions)) {
      const actualValue = this.getNestedValue(event.normalized_data, key);
      if (actualValue !== expectedValue) {
        return false;
      }
    }

    return true;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  async auditWebhookEvent(toolSlug, event, deliveryRecord) {
    // Send audit event to audit service
    try {
      await this.fastify.axios.post(`${this.config.AUDIT_SERVICE_URL}/api/events`, {
        event_type: 'webhook_received',
        tool_slug: toolSlug,
        event_data: {
          webhook_event_type: event.event_type,
          event_id: event.event_id,
          delivery_id: deliveryRecord.id
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.fastify.log.warn('Failed to audit webhook event:', error.message);
    }
  }
}

module.exports = WebhookHandlers;
