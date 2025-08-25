/**
 * Webhook Service
 * Handles webhook registration and processing for tool-specific events
 */

const { createHmac } = require('crypto');

class WebhookService {
  constructor(fastify, config, databaseManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
  }

  async initialize() {
    this.fastify.log.info('✅ Webhook Service: Initialized');
  }

  // ===== WEBHOOK REGISTRATION =====

  async registerWebhook(toolId, options) {
    const { events, signature_validation, registered_by } = options;

    try {
      const tool = await this.db.getToolById(toolId);
      if (!tool) {
        throw new Error(`Tool not found: ${toolId}`);
      }

      // Generate webhook URL and secret
      const webhookUrl = `${this.config.WEBHOOK_BASE_URL}/webhooks/${tool.slug}/${toolId}`;
      const webhookSecretKey = `${this.config.WEBHOOK_SECRET_KEY_PREFIX}${tool.slug}`;

      // Get supported events for this tool type
      const supportedEvents = this.getSupportedEvents(tool.slug);

      // Validate requested events
      const validEvents = events.filter(event => supportedEvents.includes(event));
      if (validEvents.length === 0) {
        throw new Error(`No valid events specified. Supported events for ${tool.name}: ${supportedEvents.join(', ')}`);
      }

      const webhookConfig = {
        tool_type: tool.slug,
        webhook_url: webhookUrl,
        webhook_secret_key: webhookSecretKey,
        supported_events: supportedEvents,
        enabled_events: validEvents,
        signature_validation: signature_validation || this.getDefaultSignatureValidation(tool.slug),
        processing_config: this.getDefaultProcessingConfig(tool.slug),
        is_active: true
      };

      // Create or update webhook configuration
      const existingConfig = await this.db.getWebhookConfig(toolId);
      let result;

      if (existingConfig) {
        // Update existing configuration
        const query = `
          UPDATE tool_webhook_configs SET
            enabled_events = $2,
            signature_validation = $3,
            processing_config = $4,
            is_active = $5,
            updated_at = NOW()
          WHERE tool_id = $1
          RETURNING *
        `;
        const updateResult = await this.db.db.query(query, [
          toolId,
          JSON.stringify(webhookConfig.enabled_events),
          JSON.stringify(webhookConfig.signature_validation),
          JSON.stringify(webhookConfig.processing_config),
          webhookConfig.is_active
        ]);
        result = updateResult.rows[0];
      } else {
        // Create new configuration
        result = await this.db.createWebhookConfig(toolId, webhookConfig);
      }

      this.fastify.log.info(`Webhook registered for ${tool.name}:`, {
        webhook_url: webhookUrl,
        events: validEvents
      });

      return {
        id: result.id,
        webhook_url: webhookUrl,
        secret_key: webhookSecretKey,
        supported_events: supportedEvents,
        enabled_events: validEvents,
        signature_validation: webhookConfig.signature_validation,
        setup_instructions: this.getSetupInstructions(tool.slug, webhookUrl, webhookSecretKey)
      };
    } catch (error) {
      this.fastify.log.error('Failed to register webhook:', error);
      throw error;
    }
  }

  // ===== WEBHOOK PROCESSING =====

  async processWebhook(toolType, toolId, data) {
    const { payload, headers, ip_address } = data;

    try {
      // Get webhook configuration
      const webhookConfig = await this.db.getWebhookConfig(toolId);
      if (!webhookConfig || !webhookConfig.is_active) {
        throw new Error(`Webhook not configured or inactive for tool: ${toolId}`);
      }

      // Validate webhook signature
      const isValidSignature = await this.validateSignature(
        toolType,
        payload,
        headers,
        webhookConfig.signature_validation
      );

      if (!isValidSignature) {
        throw new Error('Invalid webhook signature');
      }

      // Determine event type
      const eventType = this.extractEventType(toolType, payload, headers);
      if (!eventType) {
        throw new Error('Unable to determine event type');
      }

      // Check if event is enabled
      const enabledEvents = webhookConfig.enabled_events || [];
      if (!enabledEvents.includes(eventType)) {
        this.fastify.log.debug(`Event ${eventType} not enabled for tool ${toolId}`);
        return {
          processed: false,
          event_type: eventType,
          reason: 'Event not enabled'
        };
      }

      // Process the webhook based on tool type and event
      const processingResult = await this.processToolWebhook(toolType, eventType, payload, webhookConfig.processing_config);

      // Update last received timestamp
      await this.updateLastReceivedTimestamp(toolId);

      // Log the webhook event
      await this.logWebhookEvent(toolId, eventType, {
        payload_size: JSON.stringify(payload).length,
        ip_address,
        processing_result,
        headers: this.sanitizeHeaders(headers)
      });

      this.fastify.log.info(`Webhook processed for ${toolType}:`, {
        tool_id: toolId,
        event_type: eventType,
        processed: processingResult.success
      });

      return {
        processed: processingResult.success,
        event_type: eventType,
        result: processingResult
      };
    } catch (error) {
      this.fastify.log.error('Failed to process webhook:', error);
      
      // Log failed webhook attempt
      await this.logWebhookEvent(toolId, 'processing_error', {
        error: error.message,
        ip_address,
        headers: this.sanitizeHeaders(headers)
      });

      throw error;
    }
  }

  // ===== SIGNATURE VALIDATION =====

  async validateSignature(toolType, payload, headers, validationConfig) {
    try {
      switch (toolType) {
        case 'github':
          return this.validateGitHubSignature(payload, headers, validationConfig);
        case 'gitlab':
          return this.validateGitLabSignature(payload, headers, validationConfig);
        case 'jenkins':
          return this.validateJenkinsSignature(payload, headers, validationConfig);
        default:
          return this.validateGenericSignature(payload, headers, validationConfig);
      }
    } catch (error) {
      this.fastify.log.error('Signature validation failed:', error);
      return false;
    }
  }

  validateGitHubSignature(payload, headers, config) {
    const signature = headers['x-hub-signature-256'];
    if (!signature) {
      return false;
    }

    const secret = config.secret || 'default-secret';
    const expectedSignature = 'sha256=' + createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === expectedSignature;
  }

  validateGitLabSignature(payload, headers, config) {
    const token = headers['x-gitlab-token'];
    if (!token) {
      return false;
    }

    const expectedToken = config.token || 'default-token';
    return token === expectedToken;
  }

  validateJenkinsSignature(payload, headers, config) {
    // Jenkins doesn't have built-in signature validation
    // Could implement custom token-based validation
    return true;
  }

  validateGenericSignature(payload, headers, config) {
    if (!config.method) {
      return true; // No validation configured
    }

    if (config.method === 'hmac-sha256') {
      const signature = headers[config.header_name || 'x-webhook-signature'];
      if (!signature) {
        return false;
      }

      const secret = config.secret || 'default-secret';
      const expectedSignature = createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return signature === expectedSignature;
    }

    return false;
  }

  // ===== EVENT TYPE EXTRACTION =====

  extractEventType(toolType, payload, headers) {
    switch (toolType) {
      case 'github':
        return headers['x-github-event'];
      case 'gitlab':
        return headers['x-gitlab-event'];
      case 'jenkins':
        return payload.event || 'build_event';
      case 'argocd':
        return payload.eventType || 'app_event';
      case 'terraform':
        return payload.notification_type || 'run_event';
      case 'sonarqube':
        return payload.analysisType || 'analysis_event';
      case 'grafana':
        return payload.type || 'alert_event';
      case 'snyk':
        return payload.event || 'security_event';
      case 'jira':
        return payload.webhookEvent || 'issue_event';
      case 'servicenow':
        return payload.eventName || 'service_event';
      default:
        return payload.event_type || 'generic_event';
    }
  }

  // ===== TOOL-SPECIFIC PROCESSING =====

  async processToolWebhook(toolType, eventType, payload, processingConfig) {
    try {
      switch (toolType) {
        case 'github':
          return await this.processGitHubWebhook(eventType, payload, processingConfig);
        case 'gitlab':
          return await this.processGitLabWebhook(eventType, payload, processingConfig);
        case 'jenkins':
          return await this.processJenkinsWebhook(eventType, payload, processingConfig);
        case 'argocd':
          return await this.processArgoCDWebhook(eventType, payload, processingConfig);
        default:
          return await this.processGenericWebhook(eventType, payload, processingConfig);
      }
    } catch (error) {
      this.fastify.log.error(`Failed to process ${toolType} webhook:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processGitHubWebhook(eventType, payload, config) {
    switch (eventType) {
      case 'push':
        return this.processGitHubPush(payload);
      case 'pull_request':
        return this.processGitHubPullRequest(payload);
      case 'issues':
        return this.processGitHubIssue(payload);
      default:
        return { success: true, message: `GitHub ${eventType} event processed` };
    }
  }

  async processGitLabWebhook(eventType, payload, config) {
    switch (eventType) {
      case 'push':
        return this.processGitLabPush(payload);
      case 'merge_requests':
        return this.processGitLabMergeRequest(payload);
      default:
        return { success: true, message: `GitLab ${eventType} event processed` };
    }
  }

  async processJenkinsWebhook(eventType, payload, config) {
    // Process Jenkins build events
    return { success: true, message: `Jenkins ${eventType} event processed` };
  }

  async processArgoCDWebhook(eventType, payload, config) {
    // Process Argo CD application events
    return { success: true, message: `Argo CD ${eventType} event processed` };
  }

  async processGenericWebhook(eventType, payload, config) {
    // Generic webhook processing
    return { success: true, message: `Generic ${eventType} event processed` };
  }

  // ===== SPECIFIC EVENT PROCESSORS =====

  async processGitHubPush(payload) {
    // Extract useful information from push event
    const { repository, pusher, commits } = payload;
    
    this.fastify.log.info('GitHub push event:', {
      repository: repository.full_name,
      pusher: pusher.name,
      commit_count: commits.length
    });

    // Here you could trigger additional workflows, notifications, etc.
    return {
      success: true,
      message: 'GitHub push event processed',
      data: {
        repository: repository.full_name,
        commits: commits.length
      }
    };
  }

  async processGitHubPullRequest(payload) {
    const { action, pull_request, repository } = payload;
    
    this.fastify.log.info('GitHub pull request event:', {
      action,
      repository: repository.full_name,
      pr_number: pull_request.number,
      pr_title: pull_request.title
    });

    return {
      success: true,
      message: 'GitHub pull request event processed',
      data: {
        action,
        repository: repository.full_name,
        pr_number: pull_request.number
      }
    };
  }

  async processGitHubIssue(payload) {
    const { action, issue, repository } = payload;
    
    this.fastify.log.info('GitHub issue event:', {
      action,
      repository: repository.full_name,
      issue_number: issue.number,
      issue_title: issue.title
    });

    return {
      success: true,
      message: 'GitHub issue event processed',
      data: {
        action,
        repository: repository.full_name,
        issue_number: issue.number
      }
    };
  }

  async processGitLabPush(payload) {
    const { project, user_name, commits } = payload;
    
    this.fastify.log.info('GitLab push event:', {
      project: project.name,
      user: user_name,
      commit_count: commits.length
    });

    return {
      success: true,
      message: 'GitLab push event processed',
      data: {
        project: project.name,
        commits: commits.length
      }
    };
  }

  async processGitLabMergeRequest(payload) {
    const { object_attributes, project } = payload;
    
    this.fastify.log.info('GitLab merge request event:', {
      action: object_attributes.action,
      project: project.name,
      mr_iid: object_attributes.iid,
      mr_title: object_attributes.title
    });

    return {
      success: true,
      message: 'GitLab merge request event processed',
      data: {
        action: object_attributes.action,
        project: project.name,
        mr_iid: object_attributes.iid
      }
    };
  }

  // ===== UTILITY METHODS =====

  getSupportedEvents(toolType) {
    const supportedEvents = {
      github: ['push', 'pull_request', 'issues', 'repository', 'organization', 'membership', 'team'],
      gitlab: ['push', 'merge_requests', 'issues', 'pipeline', 'deployment', 'release', 'wiki'],
      jenkins: ['build_started', 'build_completed', 'build_failed', 'job_created', 'job_deleted'],
      argocd: ['app_sync', 'app_health', 'app_degraded', 'app_deployed'],
      terraform: ['run_completed', 'run_errored', 'workspace_created', 'workspace_deleted', 'policy_check'],
      sonarqube: ['quality_gate', 'project_analysis', 'new_issues'],
      grafana: ['alert_state_changed', 'dashboard_saved', 'user_login'],
      snyk: ['project_snapshot', 'new_issues', 'issue_remediation'],
      jira: ['issue_created', 'issue_updated', 'issue_deleted', 'project_created', 'user_created'],
      servicenow: ['incident_created', 'incident_updated', 'change_request', 'user_created', 'user_updated']
    };

    return supportedEvents[toolType] || ['generic_event'];
  }

  getDefaultSignatureValidation(toolType) {
    const defaults = {
      github: { method: 'hmac-sha256', header_name: 'x-hub-signature-256' },
      gitlab: { method: 'token', header_name: 'x-gitlab-token' },
      jenkins: { method: 'none' },
      argocd: { method: 'none' },
      terraform: { method: 'hmac-sha256', header_name: 'x-terraform-signature' },
      sonarqube: { method: 'none' },
      grafana: { method: 'none' },
      snyk: { method: 'hmac-sha256', header_name: 'x-snyk-signature' },
      jira: { method: 'none' },
      servicenow: { method: 'none' }
    };

    return defaults[toolType] || { method: 'none' };
  }

  getDefaultProcessingConfig(toolType) {
    return {
      enabled: true,
      async_processing: false,
      max_retries: 3,
      notification_targets: []
    };
  }

  getSetupInstructions(toolType, webhookUrl, secretKey) {
    const instructions = {
      github: `1. Go to your GitHub repository settings\n2. Click on "Webhooks"\n3. Add webhook URL: ${webhookUrl}\n4. Set secret: ${secretKey}\n5. Select events: push, pull_request, issues`,
      gitlab: `1. Go to your GitLab project settings\n2. Click on "Webhooks"\n3. Add webhook URL: ${webhookUrl}\n4. Set secret token: ${secretKey}\n5. Select triggers: push, merge_requests, issues`,
      jenkins: `1. Install "Generic Webhook Trigger" plugin\n2. Configure webhook URL: ${webhookUrl}\n3. Set up build triggers as needed`,
      default: `1. Configure your tool to send webhooks to: ${webhookUrl}\n2. Use secret key: ${secretKey}\n3. Configure signature validation as needed`
    };

    return instructions[toolType] || instructions.default;
  }

  async updateLastReceivedTimestamp(toolId) {
    try {
      const query = `
        UPDATE tool_webhook_configs 
        SET last_received_at = NOW() 
        WHERE tool_id = $1
      `;
      await this.db.db.query(query, [toolId]);
    } catch (error) {
      this.fastify.log.error('Failed to update last received timestamp:', error);
    }
  }

  async logWebhookEvent(toolId, eventType, metadata) {
    try {
      // Log webhook event in tool_usage table
      await this.db.recordToolUsage({
        tool_id: toolId,
        user_id: null, // Webhook events don't have a specific user
        action: 'webhook_received',
        metadata: {
          event_type: eventType,
          ...metadata,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.fastify.log.error('Failed to log webhook event:', error);
    }
  }

  sanitizeHeaders(headers) {
    // Remove sensitive headers from logs
    const sensitiveHeaders = ['authorization', 'x-hub-signature', 'x-hub-signature-256', 'x-gitlab-token'];
    const sanitized = { ...headers };
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  async stop() {
    this.fastify.log.info('🛑 Webhook Service: Stopped');
  }
}

module.exports = WebhookService;
