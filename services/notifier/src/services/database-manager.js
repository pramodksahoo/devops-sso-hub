/**
 * Database Manager for Notifier Service
 * Handles all database operations for notifications, templates, channels, and deliveries
 */

class DatabaseManager {
  constructor(fastify, config) {
    this.fastify = fastify;
    this.config = config;
    this.db = fastify.pg;
  }

  async initialize() {
    this.fastify.log.info('✅ Database Manager: Initialized');
  }

  // ============================================================================
  // NOTIFICATION MANAGEMENT
  // ============================================================================

  async createNotification(notification) {
    const query = `
      INSERT INTO notifications (
        external_id, type, priority, title, message, html_message,
        recipients, channels, template_id, metadata, source_service,
        source_tool, user_id, scheduled_at, expires_at, max_retries, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;
    
    const values = [
      notification.external_id || null,
      notification.type,
      notification.priority || 'medium',
      notification.title,
      notification.message,
      notification.html_message || null,
      JSON.stringify(notification.recipients || []),
      JSON.stringify(notification.channels || []),
      notification.template_id || null,
      JSON.stringify(notification.metadata || {}),
      notification.source_service || null,
      notification.source_tool || null,
      notification.user_id || null,
      notification.scheduled_at || null,
      notification.expires_at || null,
      notification.max_retries || 3,
      notification.created_by || 'system'
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async getNotification(notificationId) {
    const query = `
      SELECT n.*, 
             t.name as template_name,
             t.subject_template,
             t.body_template,
             t.html_template
      FROM notifications n
      LEFT JOIN notification_templates t ON n.template_id = t.template_id
      WHERE n.notification_id = $1
    `;
    
    const result = await this.db.query(query, [notificationId]);
    return result.rows[0] || null;
  }

  async listNotifications(filters = {}) {
    let query = `
      SELECT n.*, 
             t.name as template_name,
             COUNT(nd.delivery_id) as delivery_count,
             COUNT(CASE WHEN nd.status = 'delivered' THEN 1 END) as delivered_count
      FROM notifications n
      LEFT JOIN notification_templates t ON n.template_id = t.template_id
      LEFT JOIN notification_deliveries nd ON n.notification_id = nd.notification_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    if (filters.type) {
      query += ` AND n.type = $${paramIndex++}`;
      params.push(filters.type);
    }

    if (filters.priority) {
      query += ` AND n.priority = $${paramIndex++}`;
      params.push(filters.priority);
    }

    if (filters.status) {
      query += ` AND n.status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters.source_service) {
      query += ` AND n.source_service = $${paramIndex++}`;
      params.push(filters.source_service);
    }

    if (filters.source_tool) {
      query += ` AND n.source_tool = $${paramIndex++}`;
      params.push(filters.source_tool);
    }

    if (filters.user_id) {
      query += ` AND n.user_id = $${paramIndex++}`;
      params.push(filters.user_id);
    }

    if (filters.created_after) {
      query += ` AND n.created_at >= $${paramIndex++}`;
      params.push(filters.created_after);
    }

    if (filters.created_before) {
      query += ` AND n.created_at <= $${paramIndex++}`;
      params.push(filters.created_before);
    }

    query += ` GROUP BY n.notification_id, t.name, t.subject_template, t.body_template, t.html_template`;
    query += ` ORDER BY n.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async updateNotification(notificationId, updates) {
    const setClause = [];
    const params = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (key !== 'notification_id' && updates[key] !== undefined) {
        if (key === 'recipients' || key === 'channels' || key === 'metadata') {
          setClause.push(`${key} = $${paramIndex++}`);
          params.push(JSON.stringify(updates[key]));
        } else {
          setClause.push(`${key} = $${paramIndex++}`);
          params.push(updates[key]);
        }
      }
    });

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClause.push(`updated_at = NOW()`);
    params.push(notificationId);

    const query = `
      UPDATE notifications 
      SET ${setClause.join(', ')}
      WHERE notification_id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0];
  }

  async deleteNotification(notificationId) {
    const query = `DELETE FROM notifications WHERE notification_id = $1 RETURNING *`;
    const result = await this.db.query(query, [notificationId]);
    return result.rows[0];
  }

  // ============================================================================
  // NOTIFICATION TEMPLATES
  // ============================================================================

  async createTemplate(template) {
    const query = `
      INSERT INTO notification_templates (
        name, type, subject_template, body_template, html_template,
        variables, supported_channels, tool_id, priority, enabled, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      template.name,
      template.type,
      template.subject_template,
      template.body_template,
      template.html_template || null,
      JSON.stringify(template.variables || []),
      JSON.stringify(template.supported_channels || []),
      template.tool_id || null,
      template.priority || 'medium',
      template.enabled !== false,
      template.created_by || 'system'
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async getTemplate(templateId) {
    const query = `SELECT * FROM notification_templates WHERE template_id = $1`;
    const result = await this.db.query(query, [templateId]);
    return result.rows[0] || null;
  }

  async getTemplateByName(name) {
    const query = `SELECT * FROM notification_templates WHERE name = $1 AND enabled = true`;
    const result = await this.db.query(query, [name]);
    return result.rows[0] || null;
  }

  async listTemplates(filters = {}) {
    let query = `SELECT * FROM notification_templates WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (filters.type) {
      query += ` AND type = $${paramIndex++}`;
      params.push(filters.type);
    }

    if (filters.tool_id) {
      query += ` AND tool_id = $${paramIndex++}`;
      params.push(filters.tool_id);
    }

    if (filters.enabled !== undefined) {
      query += ` AND enabled = $${paramIndex++}`;
      params.push(filters.enabled);
    }

    query += ` ORDER BY name`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async updateTemplate(templateId, updates) {
    const setClause = [];
    const params = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (key !== 'template_id' && updates[key] !== undefined) {
        if (key === 'variables' || key === 'supported_channels') {
          setClause.push(`${key} = $${paramIndex++}`);
          params.push(JSON.stringify(updates[key]));
        } else {
          setClause.push(`${key} = $${paramIndex++}`);
          params.push(updates[key]);
        }
      }
    });

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClause.push(`updated_at = NOW()`, `version = version + 1`);
    params.push(templateId);

    const query = `
      UPDATE notification_templates 
      SET ${setClause.join(', ')}
      WHERE template_id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0];
  }

  async deleteTemplate(templateId) {
    const query = `DELETE FROM notification_templates WHERE template_id = $1 RETURNING *`;
    const result = await this.db.query(query, [templateId]);
    return result.rows[0];
  }

  // ============================================================================
  // NOTIFICATION CHANNELS
  // ============================================================================

  async createChannel(channel) {
    const query = `
      INSERT INTO notification_channels (
        name, type, description, configuration, enabled, test_endpoint, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      channel.name,
      channel.type,
      channel.description || null,
      JSON.stringify(channel.configuration || {}),
      channel.enabled !== false,
      channel.test_endpoint || null,
      channel.created_by || 'system'
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async getChannel(channelId) {
    const query = `SELECT * FROM notification_channels WHERE channel_id = $1`;
    const result = await this.db.query(query, [channelId]);
    return result.rows[0] || null;
  }

  async getChannelByName(name) {
    const query = `SELECT * FROM notification_channels WHERE name = $1`;
    const result = await this.db.query(query, [name]);
    return result.rows[0] || null;
  }

  async getChannelsByType(type) {
    const query = `SELECT * FROM notification_channels WHERE type = $1 AND enabled = true`;
    const result = await this.db.query(query, [type]);
    return result.rows;
  }

  async listChannels(filters = {}) {
    let query = `SELECT * FROM notification_channels WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (filters.type) {
      query += ` AND type = $${paramIndex++}`;
      params.push(filters.type);
    }

    if (filters.enabled !== undefined) {
      query += ` AND enabled = $${paramIndex++}`;
      params.push(filters.enabled);
    }

    query += ` ORDER BY name`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async updateChannel(channelId, updates) {
    const setClause = [];
    const params = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (key !== 'channel_id' && updates[key] !== undefined) {
        if (key === 'configuration') {
          setClause.push(`${key} = $${paramIndex++}`);
          params.push(JSON.stringify(updates[key]));
        } else {
          setClause.push(`${key} = $${paramIndex++}`);
          params.push(updates[key]);
        }
      }
    });

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClause.push(`updated_at = NOW()`);
    params.push(channelId);

    const query = `
      UPDATE notification_channels 
      SET ${setClause.join(', ')}
      WHERE channel_id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0];
  }

  async deleteChannel(channelId) {
    const query = `DELETE FROM notification_channels WHERE channel_id = $1 RETURNING *`;
    const result = await this.db.query(query, [channelId]);
    return result.rows[0];
  }

  // ============================================================================
  // NOTIFICATION DELIVERIES
  // ============================================================================

  async createDelivery(delivery) {
    const query = `
      INSERT INTO notification_deliveries (
        notification_id, channel_id, channel_type, recipient, status,
        delivery_attempts, external_delivery_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      delivery.notification_id,
      delivery.channel_id,
      delivery.channel_type,
      delivery.recipient,
      delivery.status || 'pending',
      delivery.delivery_attempts || 0,
      delivery.external_delivery_id || null
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async updateDelivery(deliveryId, updates) {
    const setClause = [];
    const params = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (key !== 'delivery_id' && updates[key] !== undefined) {
        if (key === 'response_data') {
          setClause.push(`${key} = $${paramIndex++}`);
          params.push(JSON.stringify(updates[key]));
        } else {
          setClause.push(`${key} = $${paramIndex++}`);
          params.push(updates[key]);
        }
      }
    });

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClause.push(`updated_at = NOW()`);
    params.push(deliveryId);

    const query = `
      UPDATE notification_deliveries 
      SET ${setClause.join(', ')}
      WHERE delivery_id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0];
  }

  async getDeliveriesByNotification(notificationId) {
    const query = `
      SELECT nd.*, nc.name as channel_name, nc.type as channel_type
      FROM notification_deliveries nd
      LEFT JOIN notification_channels nc ON nd.channel_id = nc.channel_id
      WHERE nd.notification_id = $1
      ORDER BY nd.created_at
    `;
    
    const result = await this.db.query(query, [notificationId]);
    return result.rows;
  }

  async getDeliveryStatistics(filters = {}) {
    let query = `
      SELECT 
        nd.status,
        nd.channel_type,
        COUNT(*) as count,
        DATE(nd.created_at) as date
      FROM notification_deliveries nd
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    if (filters.start_date) {
      query += ` AND nd.created_at >= $${paramIndex++}`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ` AND nd.created_at <= $${paramIndex++}`;
      params.push(filters.end_date);
    }

    query += ` GROUP BY nd.status, nd.channel_type, DATE(nd.created_at)`;
    query += ` ORDER BY date DESC, channel_type, status`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  // ============================================================================
  // NOTIFICATION PREFERENCES
  // ============================================================================

  async getUserPreferences(userId) {
    const query = `
      SELECT * FROM notification_preferences 
      WHERE user_id = $1 
      ORDER BY notification_type, channel_type
    `;
    
    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  async updateUserPreference(userId, notificationType, channelType, preference) {
    const query = `
      INSERT INTO notification_preferences (
        user_id, notification_type, channel_type, enabled, 
        quiet_hours_start, quiet_hours_end, timezone, frequency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, notification_type, channel_type)
      DO UPDATE SET
        enabled = EXCLUDED.enabled,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        timezone = EXCLUDED.timezone,
        frequency = EXCLUDED.frequency,
        updated_at = NOW()
      RETURNING *
    `;
    
    const values = [
      userId,
      notificationType,
      channelType,
      preference.enabled !== false,
      preference.quiet_hours_start || null,
      preference.quiet_hours_end || null,
      preference.timezone || 'UTC',
      preference.frequency || 'immediate'
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async getHealthStatus() {
    try {
      const result = await this.db.query('SELECT NOW() as current_time, version() as db_version');
      return {
        database: 'healthy',
        timestamp: result.rows[0].current_time,
        version: result.rows[0].db_version
      };
    } catch (error) {
      return {
        database: 'unhealthy',
        error: error.message
      };
    }
  }

  async cleanupExpiredNotifications() {
    const query = `
      UPDATE notifications 
      SET status = 'expired', updated_at = NOW()
      WHERE expires_at < NOW() 
      AND status NOT IN ('sent', 'expired')
      RETURNING notification_id
    `;
    
    const result = await this.db.query(query);
    return result.rows.length;
  }

  async getNotificationCounts() {
    const query = `
      SELECT 
        status,
        priority,
        type,
        COUNT(*) as count
      FROM notifications 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY status, priority, type
      ORDER BY count DESC
    `;
    
    const result = await this.db.query(query);
    return result.rows;
  }
}

module.exports = DatabaseManager;
