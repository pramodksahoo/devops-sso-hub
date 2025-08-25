/**
 * Database Manager for Webhook Ingress Service
 * Handles webhook-related database operations
 */

const { z } = require('zod');

// Validation schemas
const WebhookDeliverySchema = z.object({
  tool_slug: z.string(),
  event_type: z.string(),
  event_id: z.string().optional(),
  delivery_status: z.enum(['pending', 'delivered', 'failed', 'retrying']),
  http_status_code: z.number().optional(),
  request_headers: z.record(z.any()).optional(),
  request_body: z.any().optional(),
  response_headers: z.record(z.any()).optional(),
  response_body: z.string().optional(),
  error_message: z.string().optional(),
  delivery_attempts: z.number().default(0),
  delivered_at: z.date().optional()
});

const NotificationDeliverySchema = z.object({
  webhook_delivery_id: z.string().uuid(),
  notification_rule_id: z.string().uuid(),
  channel: z.string(),
  recipient: z.string(),
  message_content: z.record(z.any()).optional(),
  delivery_status: z.enum(['sent', 'failed', 'pending']),
  error_message: z.string().optional(),
  delivered_at: z.date().optional()
});

class DatabaseManager {
  constructor(fastify) {
    this.fastify = fastify;
  }

  async getToolBySlug(slug) {
    const client = await this.fastify.pg.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM tools WHERE slug = $1 AND is_active = true',
        [slug]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getWebhookSecret(toolId, secretName = 'default_webhook_secret') {
    const client = await this.fastify.pg.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM webhook_secrets WHERE tool_id = $1 AND secret_name = $2 AND is_active = true',
        [toolId, secretName]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async createWebhookDelivery(data) {
    const validatedData = WebhookDeliverySchema.parse(data);
    const client = await this.fastify.pg.connect();
    
    try {
      // Get tool ID from slug
      const tool = await this.getToolBySlug(validatedData.tool_slug);
      if (!tool) {
        throw new Error(`Tool not found: ${validatedData.tool_slug}`);
      }

      const result = await client.query(`
        INSERT INTO webhook_deliveries (
          tool_id, event_type, event_id, delivery_status, http_status_code,
          request_headers, request_body, response_headers, response_body,
          error_message, delivery_attempts, delivered_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        tool.id,
        validatedData.event_type,
        validatedData.event_id,
        validatedData.delivery_status,
        validatedData.http_status_code,
        JSON.stringify(validatedData.request_headers || {}),
        JSON.stringify(validatedData.request_body || {}),
        JSON.stringify(validatedData.response_headers || {}),
        validatedData.response_body,
        validatedData.error_message,
        validatedData.delivery_attempts,
        validatedData.delivered_at
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateWebhookDelivery(deliveryId, updates) {
    const client = await this.fastify.pg.connect();
    
    try {
      const setParts = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        setParts.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }

      if (setParts.length === 0) {
        throw new Error('No updates provided');
      }

      setParts.push(`updated_at = NOW()`);
      values.push(deliveryId);

      const result = await client.query(`
        UPDATE webhook_deliveries 
        SET ${setParts.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, values);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getNotificationRules(toolSlug, eventType) {
    const client = await this.fastify.pg.connect();
    
    try {
      const result = await client.query(`
        SELECT wnr.* 
        FROM webhook_notification_rules wnr
        JOIN tools t ON wnr.tool_id = t.id
        WHERE t.slug = $1 
          AND (wnr.event_types @> ARRAY[$2] OR wnr.event_types @> ARRAY['*'])
          AND wnr.is_active = true
      `, [toolSlug, eventType]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  async createNotificationDelivery(data) {
    const validatedData = NotificationDeliverySchema.parse(data);
    const client = await this.fastify.pg.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO notification_deliveries (
          webhook_delivery_id, notification_rule_id, channel, recipient,
          message_content, delivery_status, error_message, delivered_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        validatedData.webhook_delivery_id,
        validatedData.notification_rule_id,
        validatedData.channel,
        validatedData.recipient,
        JSON.stringify(validatedData.message_content || {}),
        validatedData.delivery_status,
        validatedData.error_message,
        validatedData.delivered_at
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getWebhookDeliveries(options = {}) {
    const client = await this.fastify.pg.connect();
    
    try {
      let query = `
        SELECT wd.*, t.name as tool_name, t.slug as tool_slug
        FROM webhook_deliveries wd
        JOIN tools t ON wd.tool_id = t.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (options.tool_slug) {
        query += ` AND t.slug = $${paramCount}`;
        params.push(options.tool_slug);
        paramCount++;
      }

      if (options.event_type) {
        query += ` AND wd.event_type = $${paramCount}`;
        params.push(options.event_type);
        paramCount++;
      }

      if (options.delivery_status) {
        query += ` AND wd.delivery_status = $${paramCount}`;
        params.push(options.delivery_status);
        paramCount++;
      }

      if (options.since) {
        query += ` AND wd.created_at >= $${paramCount}`;
        params.push(options.since);
        paramCount++;
      }

      query += ` ORDER BY wd.created_at DESC`;

      if (options.limit) {
        query += ` LIMIT $${paramCount}`;
        params.push(options.limit);
        paramCount++;
      }

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getWebhookStats(options = {}) {
    const client = await this.fastify.pg.connect();
    
    try {
      const timeFilter = options.since ? 'WHERE wd.created_at >= $1' : '';
      const params = options.since ? [options.since] : [];

      const result = await client.query(`
        SELECT 
          t.slug as tool_slug,
          t.name as tool_name,
          COUNT(wd.id) as total_deliveries,
          COUNT(CASE WHEN wd.delivery_status = 'delivered' THEN 1 END) as successful_deliveries,
          COUNT(CASE WHEN wd.delivery_status = 'failed' THEN 1 END) as failed_deliveries,
          AVG(CASE WHEN wd.delivery_status = 'delivered' THEN wd.delivery_attempts END) as avg_delivery_attempts,
          MAX(wd.created_at) as last_delivery_at
        FROM tools t
        LEFT JOIN webhook_deliveries wd ON t.id = wd.tool_id ${timeFilter}
        WHERE t.is_active = true
        GROUP BY t.id, t.slug, t.name
        ORDER BY total_deliveries DESC
      `, params);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getNotificationStats(options = {}) {
    const client = await this.fastify.pg.connect();
    
    try {
      const timeFilter = options.since ? 'WHERE nd.created_at >= $1' : '';
      const params = options.since ? [options.since] : [];

      const result = await client.query(`
        SELECT 
          nd.channel,
          COUNT(nd.id) as total_notifications,
          COUNT(CASE WHEN nd.delivery_status = 'sent' THEN 1 END) as successful_notifications,
          COUNT(CASE WHEN nd.delivery_status = 'failed' THEN 1 END) as failed_notifications,
          MAX(nd.created_at) as last_notification_at
        FROM notification_deliveries nd
        ${timeFilter}
        GROUP BY nd.channel
        ORDER BY total_notifications DESC
      `, params);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  async createNotificationRule(data) {
    const client = await this.fastify.pg.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO webhook_notification_rules (
          tool_id, rule_name, event_types, conditions, notification_channels,
          notification_config, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        data.tool_id,
        data.rule_name,
        data.event_types,
        JSON.stringify(data.conditions || {}),
        data.notification_channels,
        JSON.stringify(data.notification_config || {}),
        data.is_active !== false,
        data.created_by
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getNotificationRulesByTool(toolId) {
    const client = await this.fastify.pg.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM webhook_notification_rules WHERE tool_id = $1 ORDER BY created_at DESC',
        [toolId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async updateNotificationRule(ruleId, data) {
    const client = await this.fastify.pg.connect();
    
    try {
      const setParts = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(data)) {
        if (key === 'conditions' || key === 'notification_config') {
          setParts.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          setParts.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }

      if (setParts.length === 0) {
        throw new Error('No updates provided');
      }

      setParts.push(`updated_at = NOW()`);
      values.push(ruleId);

      const result = await client.query(`
        UPDATE webhook_notification_rules 
        SET ${setParts.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, values);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteNotificationRule(ruleId) {
    const client = await this.fastify.pg.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM webhook_notification_rules WHERE id = $1 RETURNING *',
        [ruleId]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getWebhookEventTypes(toolSlug) {
    const client = await this.fastify.pg.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM webhook_event_types WHERE tool_slug = $1 AND is_enabled = true ORDER BY event_type',
        [toolSlug]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getAllWebhookEventTypes() {
    const client = await this.fastify.pg.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM webhook_event_types WHERE is_enabled = true ORDER BY tool_slug, event_type'
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async retryFailedDeliveries(maxRetries = 3) {
    const client = await this.fastify.pg.connect();
    
    try {
      const result = await client.query(`
        UPDATE webhook_deliveries 
        SET delivery_status = 'pending', delivery_attempts = delivery_attempts + 1, updated_at = NOW()
        WHERE delivery_status = 'failed' 
          AND delivery_attempts < $1
          AND created_at > NOW() - INTERVAL '24 hours'
        RETURNING *
      `, [maxRetries]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  async cleanupOldDeliveries(daysToKeep = 30) {
    const client = await this.fastify.pg.connect();
    
    try {
      await client.query(`
        DELETE FROM notification_deliveries 
        WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
      `);

      const result = await client.query(`
        DELETE FROM webhook_deliveries 
        WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
        RETURNING COUNT(*)
      `);
      
      return result.rows[0].count;
    } finally {
      client.release();
    }
  }
}

module.exports = DatabaseManager;
