/**
 * Sync Scheduler - Phase 10
 * Handles scheduled LDAP sync operations
 */

const cron = require('node-cron');

class SyncScheduler {
  constructor(fastify, config, databaseManager, syncJobManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.syncJobManager = syncJobManager;
    this.isInitialized = false;
    this.scheduledJobs = new Map();
  }

  async initialize() {
    this.fastify.log.info('⏰ Initializing Sync Scheduler...');
    this.isInitialized = true;
    this.fastify.log.info('✅ Sync Scheduler initialized');
  }

  async start() {
    if (!this.config.SCHEDULER_ENABLED) {
      this.fastify.log.info('Scheduler is disabled');
      return;
    }

    this.fastify.log.info('🚀 Starting Sync Scheduler...');
    
    // Load scheduled sync configurations
    const configs = await this.db.getToolConfigs();
    
    for (const config of configs) {
      if (config.auto_sync_enabled && config.sync_schedule_cron) {
        this.scheduleSync(config);
      }
    }
    
    this.fastify.log.info(`✅ Scheduler started with ${this.scheduledJobs.size} scheduled syncs`);
  }

  scheduleSync(toolConfig) {
    try {
      const jobKey = `${toolConfig.tool_slug}-${toolConfig.id}`;
      
      if (this.scheduledJobs.has(jobKey)) {
        // Remove existing schedule
        this.scheduledJobs.get(jobKey).stop();
      }
      
      // Create new schedule
      const task = cron.schedule(toolConfig.sync_schedule_cron, async () => {
        await this.executeScheduledSync(toolConfig);
      }, {
        scheduled: false // Don't start immediately
      });
      
      this.scheduledJobs.set(jobKey, task);
      task.start();
      
      this.fastify.log.info(`Scheduled sync for ${toolConfig.tool_slug}: ${toolConfig.sync_schedule_cron}`);
    } catch (error) {
      this.fastify.log.error(`Failed to schedule sync for ${toolConfig.tool_slug}:`, error);
    }
  }

  async executeScheduledSync(toolConfig) {
    try {
      this.fastify.log.info(`🔄 Executing scheduled sync for ${toolConfig.tool_slug}`);
      
      const job = await this.syncJobManager.startSyncJob({
        ldap_tool_config_id: toolConfig.id,
        job_type: 'incremental',
        sync_scope: 'both',
        triggered_by: 'schedule',
        triggered_by_user: 'system'
      });
      
      this.fastify.log.info(`Started scheduled sync job ${job.id} for ${toolConfig.tool_slug}`);
    } catch (error) {
      this.fastify.log.error(`Scheduled sync failed for ${toolConfig.tool_slug}:`, error);
    }
  }

  async stop() {
    this.fastify.log.info('⏹️ Stopping Sync Scheduler...');
    
    for (const [jobKey, task] of this.scheduledJobs) {
      task.stop();
    }
    
    this.scheduledJobs.clear();
    this.fastify.log.info('✅ Sync Scheduler stopped');
  }
}

module.exports = SyncScheduler;
