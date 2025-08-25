/**
 * Notification Processor for Notifier Service
 * Handles asynchronous notification processing with Redis queuing
 */

const Queue = require('bull');
const IORedis = require('ioredis');

class NotificationProcessor {
  constructor(fastify, config, databaseManager, templateEngine, notificationChannels, auditLogger) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.templateEngine = templateEngine;
    this.channels = notificationChannels;
    this.audit = auditLogger;
    
    this.redis = null;
    this.queues = {};
    this.isProcessing = false;
  }

  async initialize() {
    await this.setupRedis();
    await this.setupQueues();
    await this.startProcessing();
    
    this.fastify.log.info('✅ Notification Processor: Initialized with Redis queuing and async processing');
  }

  async setupRedis() {
    try {
      this.redis = new IORedis(this.config.REDIS_URL, {
        db: this.config.REDIS_DB,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      await this.redis.connect();
      this.fastify.log.info(`Redis connected: ${this.config.REDIS_URL} (DB: ${this.config.REDIS_DB})`);
      
    } catch (error) {
      this.fastify.log.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async setupQueues() {
    const redisConfig = {
      redis: {
        port: this.redis.options.port,
        host: this.redis.options.host,
        db: this.config.REDIS_DB,
        password: this.redis.options.password
      }
    };

    // Initialize queues
    this.queues.immediate = new Queue(this.config.QUEUE_NAMES.IMMEDIATE, redisConfig);
    this.queues.delayed = new Queue(this.config.QUEUE_NAMES.DELAYED, redisConfig);
    this.queues.retry = new Queue(this.config.QUEUE_NAMES.RETRY, redisConfig);
    this.queues.escalation = new Queue(this.config.QUEUE_NAMES.ESCALATION, redisConfig);
    this.queues.batch = new Queue(this.config.QUEUE_NAMES.BATCH, redisConfig);

    // Configure queue settings
    Object.values(this.queues).forEach(queue => {
      queue.on('error', (error) => {
        this.fastify.log.error(`Queue error: ${error.message}`);
      });

      queue.on('waiting', (jobId) => {
        this.fastify.log.debug(`Job ${jobId} waiting`);
      });

      queue.on('active', (job, jobPromise) => {
        this.fastify.log.debug(`Job ${job.id} started processing`);
      });

      queue.on('completed', (job, result) => {
        this.fastify.log.debug(`Job ${job.id} completed`);
      });

      queue.on('failed', (job, err) => {
        this.fastify.log.error(`Job ${job.id} failed: ${err.message}`);
      });
    });

    this.fastify.log.info('Notification queues initialized');
  }

  async startProcessing() {
    // Process immediate notifications
    this.queues.immediate.process(this.config.NOTIFICATION_PROCESSING_CONCURRENCY, async (job) => {
      return await this.processNotification(job.data);
    });

    // Process delayed notifications
    this.queues.delayed.process(this.config.NOTIFICATION_PROCESSING_CONCURRENCY, async (job) => {
      return await this.processNotification(job.data);
    });

    // Process retry notifications
    this.queues.retry.process(this.config.NOTIFICATION_PROCESSING_CONCURRENCY, async (job) => {
      return await this.processRetryNotification(job.data);
    });

    // Process escalation notifications
    this.queues.escalation.process(1, async (job) => {
      return await this.processEscalation(job.data);
    });

    // Process batch notifications
    this.queues.batch.process(1, async (job) => {
      return await this.processBatchNotification(job.data);
    });

    this.isProcessing = true;
    this.fastify.log.info('Notification processing started');
  }

  // ============================================================================
  // NOTIFICATION QUEUING
  // ============================================================================

  async queueNotification(notification, options = {}) {
    try {
      const queueData = {
        notification_id: notification.notification_id,
        notification: notification,
        options: options,
        queued_at: new Date().toISOString(),
        attempt: 0
      };

      // Determine which queue to use
      let queue;
      let delay = 0;

      if (options.immediate || notification.priority === 'critical') {
        queue = this.queues.immediate;
      } else if (notification.scheduled_at) {
        queue = this.queues.delayed;
        delay = new Date(notification.scheduled_at).getTime() - Date.now();
        delay = Math.max(0, delay); // Ensure positive delay
      } else {
        queue = this.queues.immediate;
      }

      // Queue job options
      const jobOptions = {
        delay: delay,
        attempts: notification.max_retries + 1,
        backoff: {
          type: 'exponential',
          delay: this.config.NOTIFICATION_RETRY_DELAY
        },
        removeOnComplete: 10,
        removeOnFail: 50
      };

      const job = await queue.add(queueData, jobOptions);

      // Update queue record in database
      await this.db.fastify.pg.query(
        `INSERT INTO notification_queue (
          notification_id, queue_name, priority, scheduled_for, status
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          notification.notification_id,
          queue.name,
          this.getPriorityNumber(notification.priority),
          notification.scheduled_at || new Date(),
          'queued'
        ]
      );

      this.fastify.log.info(`Notification queued: ${notification.notification_id} (Queue: ${queue.name})`);
      
      return {
        job_id: job.id,
        queue: queue.name,
        delay: delay,
        scheduled_for: notification.scheduled_at
      };

    } catch (error) {
      this.fastify.log.error('Failed to queue notification:', error);
      throw error;
    }
  }

  async queueBatchNotifications(notifications, options = {}) {
    const batchData = {
      notifications: notifications.map(n => n.notification_id),
      batch_id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      options: options,
      queued_at: new Date().toISOString()
    };

    const jobOptions = {
      delay: options.delay || 0,
      attempts: 3,
      backoff: 'exponential',
      removeOnComplete: 5,
      removeOnFail: 10
    };

    const job = await this.queues.batch.add(batchData, jobOptions);
    
    this.fastify.log.info(`Batch notifications queued: ${notifications.length} notifications (Batch: ${batchData.batch_id})`);
    
    return {
      job_id: job.id,
      batch_id: batchData.batch_id,
      count: notifications.length
    };
  }

  // ============================================================================
  // NOTIFICATION PROCESSING
  // ============================================================================

  async processNotification(jobData) {
    const startTime = Date.now();
    const { notification_id, notification, options, attempt = 0 } = jobData;

    try {
      this.fastify.log.info(`Processing notification: ${notification_id} (Attempt: ${attempt + 1})`);

      // Update processing status
      await this.db.updateNotification(notification_id, { 
        status: 'processing' 
      });

      // Get available channels
      const availableChannels = await this.db.listChannels({ enabled: true });
      const channelsByType = {};
      availableChannels.forEach(channel => {
        if (!channelsByType[channel.type]) {
          channelsByType[channel.type] = [];
        }
        channelsByType[channel.type].push(channel);
      });

      // Deliver notification through all specified channels
      const deliveryResults = await this.channels.deliverNotification(notification, availableChannels);

      // Calculate success rate
      const successCount = deliveryResults.filter(r => r.success).length;
      const totalCount = deliveryResults.length;
      const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

      // Update notification status based on success rate
      let finalStatus;
      if (successRate === 100) {
        finalStatus = 'sent';
      } else if (successRate > 0) {
        finalStatus = 'partially_sent';
      } else {
        finalStatus = 'failed';
      }

      await this.db.updateNotification(notification_id, { 
        status: finalStatus,
        retry_count: attempt + 1
      });

      // Log to audit service
      await this.audit.logNotificationEvent({
        action: 'notification_processed',
        notification_id: notification_id,
        status: finalStatus,
        delivery_results: deliveryResults,
        processing_time: Date.now() - startTime,
        success_rate: successRate
      });

      // Handle failed deliveries
      if (successRate < 100 && attempt < notification.max_retries) {
        await this.scheduleRetry(notification, attempt + 1, deliveryResults);
      }

      // Handle escalation for critical notifications
      if (finalStatus === 'failed' && notification.priority === 'critical') {
        await this.scheduleEscalation(notification);
      }

      this.fastify.log.info(`Notification processed: ${notification_id} (Status: ${finalStatus}, Success Rate: ${successRate}%)`);

      return {
        notification_id: notification_id,
        status: finalStatus,
        delivery_results: deliveryResults,
        success_rate: successRate,
        processing_time: Date.now() - startTime
      };

    } catch (error) {
      this.fastify.log.error(`Notification processing failed: ${notification_id}`, error);

      // Update notification status
      await this.db.updateNotification(notification_id, { 
        status: 'failed',
        retry_count: attempt + 1
      });

      // Log error to audit service
      await this.audit.logNotificationEvent({
        action: 'notification_failed',
        notification_id: notification_id,
        error: error.message,
        attempt: attempt + 1
      });

      throw error;
    }
  }

  async processRetryNotification(jobData) {
    const { notification_id, original_notification, failed_deliveries, attempt } = jobData;

    this.fastify.log.info(`Retrying notification: ${notification_id} (Attempt: ${attempt})`);

    // Only retry failed deliveries
    const retryNotification = {
      ...original_notification,
      channels: failed_deliveries.map(d => d.channel_type),
      recipients: failed_deliveries.map(d => d.recipient)
    };

    return await this.processNotification({
      notification_id: notification_id,
      notification: retryNotification,
      attempt: attempt
    });
  }

  async processBatchNotification(jobData) {
    const { notifications, batch_id, options } = jobData;
    const results = [];

    this.fastify.log.info(`Processing batch: ${batch_id} (${notifications.length} notifications)`);

    for (const notification_id of notifications) {
      try {
        const notification = await this.db.getNotification(notification_id);
        if (!notification) {
          this.fastify.log.warn(`Notification not found in batch: ${notification_id}`);
          continue;
        }

        const result = await this.processNotification({
          notification_id: notification_id,
          notification: notification,
          options: options
        });

        results.push(result);

        // Add delay between batch items if specified
        if (options.batch_delay && results.length < notifications.length) {
          await new Promise(resolve => setTimeout(resolve, options.batch_delay));
        }

      } catch (error) {
        this.fastify.log.error(`Batch notification failed: ${notification_id}`, error);
        results.push({
          notification_id: notification_id,
          status: 'failed',
          error: error.message
        });
      }
    }

    this.fastify.log.info(`Batch processed: ${batch_id} (${results.length}/${notifications.length} processed)`);

    return {
      batch_id: batch_id,
      total: notifications.length,
      processed: results.length,
      results: results
    };
  }

  async processEscalation(jobData) {
    const { notification_id, escalation_level = 1, escalation_config } = jobData;

    this.fastify.log.info(`Processing escalation: ${notification_id} (Level: ${escalation_level})`);

    const originalNotification = await this.db.getNotification(notification_id);
    if (!originalNotification) {
      throw new Error(`Original notification not found: ${notification_id}`);
    }

    // Create escalated notification
    const escalatedNotification = await this.db.createNotification({
      external_id: `${originalNotification.external_id}-escalation-${escalation_level}`,
      type: 'escalation',
      priority: 'critical',
      title: `🚨 ESCALATION (L${escalation_level}): ${originalNotification.title}`,
      message: `This is an escalated notification.\n\nOriginal notification failed to be delivered.\n\n${originalNotification.message}`,
      recipients: escalation_config.recipients || ['admin@sso-hub.com'],
      channels: escalation_config.channels || ['email', 'slack'],
      template_id: null,
      metadata: {
        ...originalNotification.metadata,
        escalation: true,
        escalation_level: escalation_level,
        original_notification_id: notification_id
      },
      source_service: 'notifier',
      source_tool: 'escalation',
      created_by: 'system'
    });

    // Process the escalated notification
    return await this.processNotification({
      notification_id: escalatedNotification.notification_id,
      notification: escalatedNotification,
      options: { immediate: true }
    });
  }

  // ============================================================================
  // RETRY AND ESCALATION LOGIC
  // ============================================================================

  async scheduleRetry(notification, attempt, deliveryResults) {
    const failedDeliveries = deliveryResults.filter(r => !r.success);
    if (failedDeliveries.length === 0) return;

    const retryDelay = this.config.NOTIFICATION_RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
    const retryAt = Date.now() + retryDelay;

    const retryData = {
      notification_id: notification.notification_id,
      original_notification: notification,
      failed_deliveries: failedDeliveries,
      attempt: attempt,
      retry_at: new Date(retryAt).toISOString()
    };

    const job = await this.queues.retry.add(retryData, {
      delay: retryDelay,
      attempts: 1,
      removeOnComplete: 5,
      removeOnFail: 10
    });

    this.fastify.log.info(`Retry scheduled: ${notification.notification_id} (Attempt: ${attempt}, Delay: ${retryDelay}ms)`);

    return job.id;
  }

  async scheduleEscalation(notification) {
    if (!this.config.ESCALATION_ENABLED) return;

    const escalationData = {
      notification_id: notification.notification_id,
      escalation_level: 1,
      escalation_config: {
        recipients: ['admin@sso-hub.com', 'ops@sso-hub.com'],
        channels: ['email', 'slack']
      }
    };

    const job = await this.queues.escalation.add(escalationData, {
      delay: this.config.ESCALATION_DELAY,
      attempts: 3,
      backoff: 'exponential',
      removeOnComplete: 5,
      removeOnFail: 10
    });

    this.fastify.log.info(`Escalation scheduled: ${notification.notification_id}`);

    return job.id;
  }

  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================

  async getQueueStats() {
    const stats = {};

    for (const [name, queue] of Object.entries(this.queues)) {
      stats[name] = {
        waiting: await queue.getWaiting().then(jobs => jobs.length),
        active: await queue.getActive().then(jobs => jobs.length),
        completed: await queue.getCompleted().then(jobs => jobs.length),
        failed: await queue.getFailed().then(jobs => jobs.length),
        delayed: await queue.getDelayed().then(jobs => jobs.length)
      };
    }

    return stats;
  }

  async pauseProcessing() {
    for (const queue of Object.values(this.queues)) {
      await queue.pause();
    }
    this.isProcessing = false;
    this.fastify.log.info('Notification processing paused');
  }

  async resumeProcessing() {
    for (const queue of Object.values(this.queues)) {
      await queue.resume();
    }
    this.isProcessing = true;
    this.fastify.log.info('Notification processing resumed');
  }

  async clearQueue(queueName) {
    if (this.queues[queueName]) {
      await this.queues[queueName].empty();
      this.fastify.log.info(`Queue cleared: ${queueName}`);
    }
  }

  async shutdown() {
    this.fastify.log.info('Shutting down notification processor...');

    // Close all queues
    for (const queue of Object.values(this.queues)) {
      await queue.close();
    }

    // Close Redis connection
    if (this.redis) {
      await this.redis.disconnect();
    }

    this.fastify.log.info('Notification processor shutdown complete');
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getPriorityNumber(priority) {
    const priorities = {
      critical: 1,
      high: 25,
      medium: 50,
      low: 100
    };
    return priorities[priority] || 50;
  }

  async createAndQueue(templateName, variables, options = {}) {
    try {
      // Create notification from template
      const notification = await this.templateEngine.createNotificationFromTemplate(
        templateName,
        variables,
        options
      );

      // Save to database
      const savedNotification = await this.db.createNotification(notification);

      // Queue for processing
      const queueResult = await this.queueNotification(savedNotification, options);

      return {
        notification_id: savedNotification.notification_id,
        queue_result: queueResult,
        notification: savedNotification
      };

    } catch (error) {
      this.fastify.log.error('Failed to create and queue notification:', error);
      throw error;
    }
  }

  getProcessingStatus() {
    return {
      processing: this.isProcessing,
      queues: Object.keys(this.queues),
      redis_connected: this.redis && this.redis.status === 'ready'
    };
  }
}

module.exports = NotificationProcessor;
