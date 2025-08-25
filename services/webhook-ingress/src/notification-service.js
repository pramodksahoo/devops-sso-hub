/**
 * Notification Service
 * Handles multi-channel notifications for webhook events
 */

const nodemailer = require('nodemailer');
const { WebClient } = require('@slack/web-api');
const axios = require('axios');

class NotificationService {
  constructor(fastify, config, databaseManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    
    this.initializeNotificationChannels();
  }

  initializeNotificationChannels() {
    // Initialize email transporter
    if (this.config.NOTIFICATION_CHANNELS.email.enabled) {
      this.emailTransporter = nodemailer.createTransporter({
        host: this.config.NOTIFICATION_CHANNELS.email.smtp_host,
        port: this.config.NOTIFICATION_CHANNELS.email.smtp_port,
        secure: this.config.NOTIFICATION_CHANNELS.email.smtp_port === 465,
        auth: {
          user: this.config.NOTIFICATION_CHANNELS.email.smtp_user,
          pass: this.config.NOTIFICATION_CHANNELS.email.smtp_password
        }
      });
    }

    // Initialize Slack client
    if (this.config.NOTIFICATION_CHANNELS.slack.enabled && this.config.NOTIFICATION_CHANNELS.slack.bot_token) {
      this.slackClient = new WebClient(this.config.NOTIFICATION_CHANNELS.slack.bot_token);
    }
  }

  async sendNotifications(rule, event, deliveryRecord) {
    const notifications = [];

    for (const channel of rule.notification_channels) {
      try {
        let result;
        
        switch (channel) {
          case 'email':
            result = await this.sendEmailNotification(rule, event);
            break;
          case 'slack':
            result = await this.sendSlackNotification(rule, event);
            break;
          case 'teams':
            result = await this.sendTeamsNotification(rule, event);
            break;
          case 'webhook':
            result = await this.sendWebhookNotification(rule, event);
            break;
          default:
            this.fastify.log.warn(`Unknown notification channel: ${channel}`);
            continue;
        }

        // Record notification delivery
        const notificationRecord = await this.db.createNotificationDelivery({
          webhook_delivery_id: deliveryRecord.id,
          notification_rule_id: rule.id,
          channel: channel,
          recipient: this.getRecipient(rule, channel),
          message_content: result.messageContent,
          delivery_status: result.success ? 'sent' : 'failed',
          error_message: result.error,
          delivered_at: result.success ? new Date() : null
        });

        notifications.push(notificationRecord);

      } catch (error) {
        this.fastify.log.error(`Failed to send ${channel} notification:`, error);
        
        // Record failed notification
        await this.db.createNotificationDelivery({
          webhook_delivery_id: deliveryRecord.id,
          notification_rule_id: rule.id,
          channel: channel,
          recipient: this.getRecipient(rule, channel),
          delivery_status: 'failed',
          error_message: error.message
        });
      }
    }

    return notifications;
  }

  async sendEmailNotification(rule, event) {
    if (!this.emailTransporter) {
      throw new Error('Email notifications not configured');
    }

    const { subject, body } = this.buildEmailContent(rule, event);
    const recipients = this.getEmailRecipients(rule);

    const mailOptions = {
      from: this.config.NOTIFICATION_CHANNELS.email.smtp_user,
      to: recipients.join(', '),
      subject: subject,
      html: body,
      text: this.stripHtml(body)
    };

    try {
      const info = await this.emailTransporter.sendMail(mailOptions);
      return {
        success: true,
        messageContent: { subject, body, recipients },
        messageId: info.messageId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        messageContent: { subject, body, recipients }
      };
    }
  }

  async sendSlackNotification(rule, event) {
    if (!this.slackClient && !this.config.NOTIFICATION_CHANNELS.slack.webhook_url) {
      throw new Error('Slack notifications not configured');
    }

    const message = this.buildSlackMessage(rule, event);

    try {
      let result;
      
      if (this.slackClient) {
        // Use Slack Bot API
        const channel = rule.notification_config?.slack?.channel || '#general';
        result = await this.slackClient.chat.postMessage({
          channel: channel,
          ...message
        });
      } else {
        // Use webhook URL
        result = await axios.post(this.config.NOTIFICATION_CHANNELS.slack.webhook_url, message);
      }

      return {
        success: true,
        messageContent: message,
        response: result.data || result.ts
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        messageContent: message
      };
    }
  }

  async sendTeamsNotification(rule, event) {
    if (!this.config.NOTIFICATION_CHANNELS.teams.webhook_url) {
      throw new Error('Teams notifications not configured');
    }

    const message = this.buildTeamsMessage(rule, event);

    try {
      const result = await axios.post(this.config.NOTIFICATION_CHANNELS.teams.webhook_url, message);
      return {
        success: true,
        messageContent: message,
        response: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        messageContent: message
      };
    }
  }

  async sendWebhookNotification(rule, event) {
    const webhookUrl = rule.notification_config?.webhook?.url || this.config.NOTIFICATION_CHANNELS.webhook.default_endpoint;
    
    if (!webhookUrl) {
      throw new Error('Webhook notification URL not configured');
    }

    const payload = this.buildWebhookPayload(rule, event);

    try {
      const result = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SSO-Hub-Webhook-Notifier/1.0',
          ...(rule.notification_config?.webhook?.headers || {})
        },
        timeout: 10000
      });

      return {
        success: true,
        messageContent: payload,
        response: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        messageContent: payload
      };
    }
  }

  // ===== MESSAGE BUILDERS =====

  buildEmailContent(rule, event) {
    const template = rule.notification_config?.email?.template || this.getDefaultEmailTemplate(event.tool);
    
    const subject = this.interpolateTemplate(
      template.subject || `${event.tool.toUpperCase()} ${event.event_type}`,
      event.normalized_data
    );

    const body = this.interpolateTemplate(
      template.body || this.getDefaultEmailBody(event),
      event.normalized_data
    );

    return { subject, body };
  }

  buildSlackMessage(rule, event) {
    const template = rule.notification_config?.slack?.template;
    
    if (template) {
      return {
        text: this.interpolateTemplate(template.text, event.normalized_data),
        blocks: template.blocks ? this.interpolateBlocks(template.blocks, event.normalized_data) : undefined
      };
    }

    // Default Slack message
    return {
      text: `${event.tool.toUpperCase()} ${event.event_type}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${event.tool.toUpperCase()} Event: ${event.event_type}*`
          }
        },
        {
          type: 'section',
          fields: this.buildSlackFields(event.normalized_data)
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Timestamp: ${new Date(event.timestamp).toLocaleString()}`
            }
          ]
        }
      ]
    };
  }

  buildTeamsMessage(rule, event) {
    const template = rule.notification_config?.teams?.template;
    
    if (template) {
      return this.interpolateTemplate(template, event.normalized_data);
    }

    // Default Teams message
    return {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: this.getThemeColor(event.event_type),
      summary: `${event.tool.toUpperCase()} ${event.event_type}`,
      sections: [
        {
          activityTitle: `${event.tool.toUpperCase()} Event`,
          activitySubtitle: event.event_type,
          facts: this.buildTeamsFacts(event.normalized_data),
          markdown: true
        }
      ]
    };
  }

  buildWebhookPayload(rule, event) {
    const template = rule.notification_config?.webhook?.template;
    
    if (template) {
      return this.interpolateTemplate(template, event.normalized_data);
    }

    // Default webhook payload
    return {
      tool: event.tool,
      event_type: event.event_type,
      event_id: event.event_id,
      timestamp: event.timestamp,
      data: event.normalized_data,
      rule_name: rule.rule_name
    };
  }

  // ===== HELPER METHODS =====

  interpolateTemplate(template, data) {
    if (typeof template === 'string') {
      return template.replace(/\{([^}]+)\}/g, (match, key) => {
        return this.getNestedValue(data, key) || match;
      });
    } else if (typeof template === 'object' && template !== null) {
      const result = Array.isArray(template) ? [] : {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.interpolateTemplate(value, data);
      }
      return result;
    }
    return template;
  }

  interpolateBlocks(blocks, data) {
    return blocks.map(block => this.interpolateTemplate(block, data));
  }

  buildSlackFields(data) {
    const fields = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        fields.push({
          type: 'mrkdwn',
          text: `*${this.formatFieldName(key)}:* ${value}`
        });
      }
    }
    return fields.slice(0, 10); // Slack limits fields
  }

  buildTeamsFacts(data) {
    const facts = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        facts.push({
          name: this.formatFieldName(key),
          value: String(value)
        });
      }
    }
    return facts.slice(0, 10); // Teams limits facts
  }

  getThemeColor(eventType) {
    const colorMap = {
      push: '0076D7',
      pull_request: '28A745',
      merge_request: '28A745',
      build_completed: '28A745',
      build_failed: 'DC3545',
      deployment: '6F42C1',
      alert: 'FFC107',
      error: 'DC3545',
      warning: 'FFC107',
      info: '17A2B8'
    };
    
    return colorMap[eventType] || '6C757D';
  }

  formatFieldName(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getDefaultEmailTemplate(tool) {
    return {
      subject: `${tool.toUpperCase()} Event Notification`,
      body: `
        <html>
          <body style="font-family: Arial, sans-serif;">
            <h2>${tool.toUpperCase()} Event Notification</h2>
            <p>An event has been triggered in your ${tool} integration.</p>
            <p><strong>Timestamp:</strong> {timestamp}</p>
            <hr>
            <p>This is an automated notification from your SSO Hub.</p>
          </body>
        </html>
      `
    };
  }

  getDefaultEmailBody(event) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>${event.tool.toUpperCase()} Event: ${event.event_type}</h2>
          <p><strong>Event ID:</strong> ${event.event_id}</p>
          <p><strong>Timestamp:</strong> ${event.timestamp}</p>
          <h3>Event Details:</h3>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">${JSON.stringify(event.normalized_data, null, 2)}</pre>
          <hr>
          <p>This is an automated notification from your SSO Hub.</p>
        </body>
      </html>
    `;
  }

  getEmailRecipients(rule) {
    return rule.notification_config?.email?.recipients || ['admin@example.com'];
  }

  getRecipient(rule, channel) {
    switch (channel) {
      case 'email':
        return this.getEmailRecipients(rule).join(', ');
      case 'slack':
        return rule.notification_config?.slack?.channel || '#general';
      case 'teams':
        return 'teams-webhook';
      case 'webhook':
        return rule.notification_config?.webhook?.url || 'default-webhook';
      default:
        return 'unknown';
    }
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').trim();
  }
}

module.exports = NotificationService;
