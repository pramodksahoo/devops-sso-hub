/**
 * Notification Channels for Notifier Service
 * Implements Email, Slack, and Webhook notification delivery
 */

const nodemailer = require('nodemailer');
const axios = require('axios');
const crypto = require('crypto');

class NotificationChannels {
  constructor(fastify, config, databaseManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    
    // Initialize email transporter
    this.emailTransporter = null;
    this.initializeEmailTransporter();
  }

  async initialize() {
    this.fastify.log.info('✅ Notification Channels: Initialized with Email, Slack, and Webhook support');
  }

  // ============================================================================
  // EMAIL CHANNEL
  // ============================================================================

  initializeEmailTransporter() {
    if (!this.config.EMAIL_ENABLED || !this.config.SMTP_PASS) {
      this.fastify.log.warn('Email transporter not initialized - missing configuration');
      return;
    }

    try {
      this.emailTransporter = nodemailer.createTransporter({
        host: this.config.SMTP_HOST,
        port: this.config.SMTP_PORT,
        secure: this.config.SMTP_SECURE,
        auth: {
          user: this.config.SMTP_USER,
          pass: this.config.SMTP_PASS
        },
        timeout: this.config.NOTIFICATION_TIMEOUT,
        connectionTimeout: this.config.NOTIFICATION_TIMEOUT,
        greetingTimeout: this.config.NOTIFICATION_TIMEOUT,
        socketTimeout: this.config.NOTIFICATION_TIMEOUT
      });

      this.fastify.log.info(`Email transporter initialized: ${this.config.SMTP_HOST}:${this.config.SMTP_PORT}`);
    } catch (error) {
      this.fastify.log.error('Failed to initialize email transporter:', error);
    }
  }

  async sendEmail(notification, channel, recipient) {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not configured');
    }

    const delivery = await this.db.createDelivery({
      notification_id: notification.notification_id,
      channel_id: channel.channel_id,
      channel_type: 'email',
      recipient: recipient,
      status: 'pending'
    });

    try {
      // Prepare email content
      const mailOptions = {
        from: {
          name: channel.configuration.from_name || this.config.EMAIL_FROM_NAME,
          address: channel.configuration.from_address || this.config.EMAIL_FROM_ADDRESS
        },
        to: recipient,
        subject: notification.title,
        text: notification.message,
        replyTo: this.config.EMAIL_REPLY_TO,
        headers: {
          'X-Notification-ID': notification.notification_id,
          'X-SSO-Hub-Service': 'notifier'
        }
      };

      // Add HTML content if available
      if (notification.html_message) {
        mailOptions.html = notification.html_message;
      }

      // Add priority headers
      if (notification.priority === 'high' || notification.priority === 'critical') {
        mailOptions.headers['X-Priority'] = '1';
        mailOptions.headers['X-MSMail-Priority'] = 'High';
        mailOptions.headers['Importance'] = 'High';
      }

      // Send email
      const info = await this.emailTransporter.sendMail(mailOptions);

      // Update delivery status
      await this.db.updateDelivery(delivery.delivery_id, {
        status: 'sent',
        delivered_at: new Date(),
        delivery_attempts: delivery.delivery_attempts + 1,
        external_delivery_id: info.messageId,
        response_data: {
          messageId: info.messageId,
          response: info.response,
          accepted: info.accepted,
          rejected: info.rejected,
          pending: info.pending
        }
      });

      this.fastify.log.info(`Email sent successfully to ${recipient}: ${info.messageId}`);
      return {
        success: true,
        delivery_id: delivery.delivery_id,
        external_id: info.messageId,
        response: info
      };

    } catch (error) {
      // Update delivery status with failure
      await this.db.updateDelivery(delivery.delivery_id, {
        status: 'failed',
        delivery_attempts: delivery.delivery_attempts + 1,
        failure_reason: error.message,
        response_data: { error: error.message }
      });

      this.fastify.log.error(`Email delivery failed to ${recipient}:`, error);
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }

  async testEmailChannel(channel) {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not configured');
    }

    const testEmail = {
      from: {
        name: channel.configuration.from_name || this.config.EMAIL_FROM_NAME,
        address: channel.configuration.from_address || this.config.EMAIL_FROM_ADDRESS
      },
      to: channel.test_endpoint || this.config.SMTP_USER,
      subject: 'SSO Hub Notifier - Email Channel Test',
      text: `This is a test email from SSO Hub Notifier service.\n\nChannel: ${channel.name}\nTimestamp: ${new Date().toISOString()}\n\nIf you receive this email, the channel is working correctly.`,
      headers: {
        'X-SSO-Hub-Test': 'true',
        'X-SSO-Hub-Service': 'notifier'
      }
    };

    try {
      const info = await this.emailTransporter.sendMail(testEmail);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      this.fastify.log.error('Email channel test failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // SLACK CHANNEL
  // ============================================================================

  async sendSlack(notification, channel, recipient) {
    const delivery = await this.db.createDelivery({
      notification_id: notification.notification_id,
      channel_id: channel.channel_id,
      channel_type: 'slack',
      recipient: recipient,
      status: 'pending'
    });

    try {
      const slackPayload = this.formatSlackMessage(notification, channel, recipient);
      const webhookUrl = channel.configuration.webhook_url || this.config.SLACK_WEBHOOK_URL;

      if (!webhookUrl) {
        throw new Error('Slack webhook URL not configured');
      }

      const response = await axios.post(webhookUrl, slackPayload, {
        timeout: this.config.NOTIFICATION_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.config.WEBHOOK_USER_AGENT
        }
      });

      // Update delivery status
      await this.db.updateDelivery(delivery.delivery_id, {
        status: 'sent',
        delivered_at: new Date(),
        delivery_attempts: delivery.delivery_attempts + 1,
        response_data: {
          status: response.status,
          statusText: response.statusText,
          data: response.data
        }
      });

      this.fastify.log.info(`Slack message sent successfully to ${recipient}`);
      return {
        success: true,
        delivery_id: delivery.delivery_id,
        response: response.data
      };

    } catch (error) {
      // Update delivery status with failure
      await this.db.updateDelivery(delivery.delivery_id, {
        status: 'failed',
        delivery_attempts: delivery.delivery_attempts + 1,
        failure_reason: error.message,
        response_data: { 
          error: error.message,
          status: error.response?.status,
          data: error.response?.data
        }
      });

      this.fastify.log.error(`Slack delivery failed to ${recipient}:`, error);
      throw new Error(`Slack delivery failed: ${error.message}`);
    }
  }

  formatSlackMessage(notification, channel, recipient) {
    const config = channel.configuration;
    const priorityColors = {
      low: '#36a64f',      // green
      medium: '#ff9500',   // orange
      high: '#ff0000',     // red
      critical: '#8B0000'  // dark red
    };

    const priorityEmojis = {
      low: ':information_source:',
      medium: ':warning:',
      high: ':exclamation:',
      critical: ':rotating_light:'
    };

    // Base payload
    const payload = {
      channel: recipient.startsWith('#') ? recipient : config.channel || this.config.SLACK_DEFAULT_CHANNEL,
      username: config.username || this.config.SLACK_USERNAME,
      icon_emoji: config.icon_emoji || this.config.SLACK_ICON_EMOJI,
      attachments: [
        {
          color: priorityColors[notification.priority] || priorityColors.medium,
          title: notification.title,
          text: notification.message,
          footer: 'SSO Hub Notifier',
          footer_icon: 'https://github.com/sso-hub.png',
          ts: Math.floor(Date.now() / 1000),
          fields: []
        }
      ]
    };

    // Add priority indicator
    payload.attachments[0].fields.push({
      title: 'Priority',
      value: `${priorityEmojis[notification.priority] || priorityEmojis.medium} ${notification.priority.toUpperCase()}`,
      short: true
    });

    // Add source information
    if (notification.source_tool) {
      payload.attachments[0].fields.push({
        title: 'Tool',
        value: notification.source_tool,
        short: true
      });
    }

    if (notification.source_service) {
      payload.attachments[0].fields.push({
        title: 'Service',
        value: notification.source_service,
        short: true
      });
    }

    // Add metadata fields
    if (notification.metadata) {
      const metadata = typeof notification.metadata === 'string' 
        ? JSON.parse(notification.metadata) 
        : notification.metadata;

      Object.keys(metadata).forEach(key => {
        if (metadata[key] && typeof metadata[key] !== 'object') {
          payload.attachments[0].fields.push({
            title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value: String(metadata[key]),
            short: true
          });
        }
      });
    }

    return payload;
  }

  async testSlackChannel(channel) {
    const webhookUrl = channel.configuration.webhook_url || this.config.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const testPayload = {
      channel: channel.configuration.channel || this.config.SLACK_DEFAULT_CHANNEL,
      username: channel.configuration.username || this.config.SLACK_USERNAME,
      icon_emoji: channel.configuration.icon_emoji || this.config.SLACK_ICON_EMOJI,
      text: ':white_check_mark: SSO Hub Notifier - Slack Channel Test',
      attachments: [
        {
          color: '#36a64f',
          title: 'Channel Test Successful',
          text: `This is a test message from SSO Hub Notifier service.\n\nChannel: ${channel.name}\nTimestamp: ${new Date().toISOString()}`,
          footer: 'SSO Hub Notifier',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    try {
      const response = await axios.post(webhookUrl, testPayload, {
        timeout: this.config.NOTIFICATION_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.config.WEBHOOK_USER_AGENT
        }
      });

      return {
        success: true,
        status: response.status,
        response: response.data
      };
    } catch (error) {
      this.fastify.log.error('Slack channel test failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // WEBHOOK CHANNEL
  // ============================================================================

  async sendWebhook(notification, channel, recipient) {
    const delivery = await this.db.createDelivery({
      notification_id: notification.notification_id,
      channel_id: channel.channel_id,
      channel_type: 'webhook',
      recipient: recipient,
      status: 'pending'
    });

    try {
      const webhookPayload = this.formatWebhookPayload(notification, channel);
      const signature = this.generateWebhookSignature(webhookPayload);

      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': this.config.WEBHOOK_USER_AGENT,
        'X-SSO-Hub-Notification-ID': notification.notification_id,
        'X-SSO-Hub-Timestamp': Date.now().toString(),
        [this.config.WEBHOOK_SIGNATURE_HEADER]: signature,
        ...channel.configuration.headers
      };

      const response = await axios({
        method: channel.configuration.method || 'POST',
        url: recipient,
        data: webhookPayload,
        headers: headers,
        timeout: channel.configuration.timeout || this.config.WEBHOOK_TIMEOUT,
        maxRedirects: 3,
        validateStatus: status => status >= 200 && status < 400
      });

      // Update delivery status
      await this.db.updateDelivery(delivery.delivery_id, {
        status: 'sent',
        delivered_at: new Date(),
        delivery_attempts: delivery.delivery_attempts + 1,
        response_data: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data
        }
      });

      this.fastify.log.info(`Webhook sent successfully to ${recipient}`);
      return {
        success: true,
        delivery_id: delivery.delivery_id,
        response: response.data
      };

    } catch (error) {
      // Update delivery status with failure
      await this.db.updateDelivery(delivery.delivery_id, {
        status: 'failed',
        delivery_attempts: delivery.delivery_attempts + 1,
        failure_reason: error.message,
        response_data: { 
          error: error.message,
          status: error.response?.status,
          data: error.response?.data
        }
      });

      this.fastify.log.error(`Webhook delivery failed to ${recipient}:`, error);
      throw new Error(`Webhook delivery failed: ${error.message}`);
    }
  }

  formatWebhookPayload(notification, channel) {
    return {
      notification_id: notification.notification_id,
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
      message: notification.message,
      source_service: notification.source_service,
      source_tool: notification.source_tool,
      user_id: notification.user_id,
      metadata: typeof notification.metadata === 'string' 
        ? JSON.parse(notification.metadata) 
        : notification.metadata,
      timestamp: notification.created_at,
      channel: {
        id: channel.channel_id,
        name: channel.name,
        type: channel.type
      }
    };
  }

  generateWebhookSignature(payload) {
    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', this.config.HMAC_SECRET)
      .update(payloadString)
      .digest('hex');
    return `sha256=${signature}`;
  }

  async testWebhookChannel(channel) {
    const testUrl = channel.test_endpoint || channel.configuration.url;

    if (!testUrl) {
      throw new Error('Webhook URL not configured');
    }

    const testPayload = {
      test: true,
      channel: channel.name,
      message: 'SSO Hub Notifier - Webhook Channel Test',
      timestamp: new Date().toISOString(),
      service: 'sso-hub-notifier'
    };

    const signature = this.generateWebhookSignature(testPayload);

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': this.config.WEBHOOK_USER_AGENT,
      'X-SSO-Hub-Test': 'true',
      'X-SSO-Hub-Timestamp': Date.now().toString(),
      [this.config.WEBHOOK_SIGNATURE_HEADER]: signature,
      ...channel.configuration.headers
    };

    try {
      const response = await axios({
        method: channel.configuration.method || 'POST',
        url: testUrl,
        data: testPayload,
        headers: headers,
        timeout: channel.configuration.timeout || this.config.WEBHOOK_TIMEOUT,
        maxRedirects: 3,
        validateStatus: status => status >= 200 && status < 400
      });

      return {
        success: true,
        status: response.status,
        response: response.data
      };
    } catch (error) {
      this.fastify.log.error('Webhook channel test failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // CHANNEL ROUTING AND DELIVERY
  // ============================================================================

  async deliverNotification(notification, channels) {
    const deliveryResults = [];
    const recipients = typeof notification.recipients === 'string' 
      ? JSON.parse(notification.recipients) 
      : notification.recipients;

    for (const channelType of notification.channels) {
      const availableChannels = channels.filter(c => c.type === channelType && c.enabled);
      
      if (availableChannels.length === 0) {
        this.fastify.log.warn(`No enabled channels found for type: ${channelType}`);
        continue;
      }

      // Use the first available channel of this type
      const channel = availableChannels[0];

      for (const recipient of recipients) {
        try {
          let result;
          
          switch (channelType) {
            case 'email':
              result = await this.sendEmail(notification, channel, recipient);
              break;
            case 'slack':
              result = await this.sendSlack(notification, channel, recipient);
              break;
            case 'webhook':
              result = await this.sendWebhook(notification, channel, recipient);
              break;
            default:
              throw new Error(`Unsupported channel type: ${channelType}`);
          }

          deliveryResults.push({
            channel_type: channelType,
            recipient: recipient,
            success: true,
            result: result
          });

        } catch (error) {
          deliveryResults.push({
            channel_type: channelType,
            recipient: recipient,
            success: false,
            error: error.message
          });
        }
      }
    }

    return deliveryResults;
  }

  async testChannel(channelId) {
    const channel = await this.db.getChannel(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    if (!channel.enabled) {
      throw new Error('Channel is disabled');
    }

    switch (channel.type) {
      case 'email':
        return await this.testEmailChannel(channel);
      case 'slack':
        return await this.testSlackChannel(channel);
      case 'webhook':
        return await this.testWebhookChannel(channel);
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getChannelHealth() {
    return {
      email: {
        enabled: this.config.EMAIL_ENABLED,
        configured: !!this.emailTransporter,
        smtp_host: this.config.SMTP_HOST
      },
      slack: {
        enabled: this.config.SLACK_ENABLED,
        configured: !!(this.config.SLACK_WEBHOOK_URL || this.config.SLACK_BOT_TOKEN)
      },
      webhook: {
        enabled: this.config.WEBHOOK_ENABLED,
        configured: true
      }
    };
  }
}

module.exports = NotificationChannels;
