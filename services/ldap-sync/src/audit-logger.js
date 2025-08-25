/**
 * Audit Logger for LDAP Sync Service - Phase 10
 * Handles audit logging for all LDAP sync activities
 */

class AuditLogger {
  constructor(fastify, config, databaseManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.isInitialized = false;
  }

  async initialize() {
    this.fastify.log.info('📝 Initializing LDAP Sync Audit Logger...');
    this.isInitialized = true;
    this.fastify.log.info('✅ LDAP Sync Audit Logger initialized');
  }

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
        ldap_server_id: eventData.ldap_server_id,
        ldap_tool_config_id: eventData.ldap_tool_config_id,
        sync_job_id: eventData.sync_job_id,
        success: eventData.success !== false,
        error_code: eventData.error_code,
        error_message: eventData.error_message,
        duration_ms: eventData.duration_ms,
        correlation_id: eventData.correlation_id || this.generateCorrelationId()
      };

      await this.db.logSyncAudit(auditData);
      
      this.fastify.log.info(`Audit logged: ${eventType}`, {
        sync_job_id: eventData.sync_job_id,
        tool_slug: eventData.tool_slug,
        user_id: auditData.user_id
      });
    } catch (error) {
      this.fastify.log.error('Failed to log audit event:', error);
    }
  }

  getEventCategory(eventType) {
    const categoryMap = {
      'sync_started': 'sync',
      'sync_completed': 'sync',
      'sync_failed': 'sync',
      'user_discovered': 'discovery',
      'group_discovered': 'discovery',
      'user_synced': 'sync',
      'group_synced': 'sync',
      'role_assigned': 'mapping',
      'conflict_detected': 'conflict',
      'ldap_connection_test': 'discovery'
    };
    
    return categoryMap[eventType] || 'general';
  }

  generateEventDescription(eventType, eventData) {
    const descriptions = {
      'sync_started': `LDAP sync started for ${eventData.tool_slug}`,
      'sync_completed': `LDAP sync completed for ${eventData.tool_slug}`,
      'sync_failed': `LDAP sync failed for ${eventData.tool_slug}: ${eventData.error_message || 'Unknown error'}`,
      'user_discovered': `User discovered from LDAP: ${eventData.user_email}`,
      'group_discovered': `Group discovered from LDAP: ${eventData.group_name}`,
      'user_synced': `User synced to ${eventData.tool_slug}: ${eventData.user_email}`,
      'group_synced': `Group synced to ${eventData.tool_slug}: ${eventData.group_name}`,
      'role_assigned': `Role assigned in ${eventData.tool_slug}: ${eventData.role_name}`,
      'conflict_detected': `Sync conflict detected in ${eventData.tool_slug}`,
      'ldap_connection_test': `LDAP connection test for server: ${eventData.server_name}`
    };
    
    return descriptions[eventType] || `${eventType}: ${JSON.stringify(eventData)}`;
  }

  generateCorrelationId() {
    return `ldap-sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = AuditLogger;
