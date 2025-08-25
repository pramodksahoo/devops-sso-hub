const { Pool } = require('pg');
const config = require('../config');
const toolSchemas = require('../schemas/tool-schemas');

class ToolConfigService {
  constructor() {
    this.pool = new Pool({
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      ssl: false
    });
  }

  async initialize() {
    console.log('🗄️ Initializing Tool Config service...');
    await this.createTables();
    await this.seedSupportedTools();
    console.log('✅ Tool Config service initialized');
  }

  async checkConnection() {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async createTables() {
    // Tables already exist from migration scripts, no need to create them
    // Just verify database connectivity
    try {
      await this.pool.query('SELECT 1');
      console.log('✅ Database tables verified (using existing migration tables)');
    } catch (error) {
      console.error('❌ Failed to verify database connectivity:', error);
      throw error;
    }
  }

  async seedSupportedTools() {
    const toolsMetadata = toolSchemas.getAllMetadata();
    
    for (const [toolType, metadata] of Object.entries(toolsMetadata)) {
      try {
        await this.pool.query(`
          INSERT INTO supported_tools (tool_type, name, category, protocol, description)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (tool_type) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            protocol = EXCLUDED.protocol,
            description = EXCLUDED.description,
            updated_at = NOW()
        `, [toolType, metadata.name, metadata.category, metadata.protocol, metadata.description]);
      } catch (error) {
        console.error(`Failed to seed tool metadata for ${toolType}:`, error);
      }
    }
    
    console.log('✅ Supported tools metadata seeded');
  }

  async getAllTools() {
    try {
      const query = `
        SELECT 
          st.tool_type,
          st.name,
          st.category,
          st.protocol,
          st.description,
          CASE 
            WHEN tc.tool_type IS NOT NULL THEN true 
            ELSE false 
          END as configured,
          COALESCE(tc.status, 'not_configured') as status,
          ts.last_tested_at,
          ts.uptime_percentage,
          ts.response_time_ms
        FROM supported_tools st
        LEFT JOIN tool_configurations tc ON st.tool_type = tc.tool_type
        LEFT JOIN (
          SELECT DISTINCT ON (tool_type) 
            tool_type, last_tested_at, uptime_percentage, response_time_ms
          FROM tool_status 
          ORDER BY tool_type, created_at DESC
        ) ts ON st.tool_type = ts.tool_type
        WHERE st.is_active = true
        ORDER BY st.category, st.name
      `;
      
      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Failed to get all tools:', error);
      throw error;
    }
  }

  async getToolConfig(toolType) {
    try {
      // First try to get from tool_configurations table
      const configResult = await this.pool.query(
        'SELECT * FROM tool_configurations WHERE tool_type = $1',
        [toolType]
      );
      
      // Also get from tools table for fallback
      const toolsResult = await this.pool.query(
        'SELECT auth_config, integration_type, base_url, status FROM tools WHERE slug = $1',
        [toolType]
      );
      
      let config = null;
      let toolConfig = null;
      
      if (configResult.rows.length > 0) {
        config = configResult.rows[0];
      }
      
      if (toolsResult.rows.length > 0 && toolsResult.rows[0].auth_config) {
        toolConfig = toolsResult.rows[0];
      }
      
      // If we have config in tool_configurations, use it
      if (config) {
        return {
          id: config.id,
          tool_type: config.tool_type,
          config: config.config_json,
          status: config.status,
          keycloak_client_id: config.keycloak_client_id,
          keycloak_client_uuid: config.keycloak_client_uuid,
          created_at: config.created_at,
          updated_at: config.updated_at,
          created_by: config.created_by,
          updated_by: config.updated_by
        };
      }
      
      // If only in tools table, return that
      if (toolConfig && toolConfig.auth_config) {
        return {
          tool_type: toolType,
          config: toolConfig.auth_config,
          status: toolConfig.status,
          integration_type: toolConfig.integration_type,
          base_url: toolConfig.base_url,
          from_tools_table: true
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to get config for ${toolType}:`, error);
      throw error;
    }
  }

  async saveToolConfig(toolType, configData, userId = 'system') {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get existing configuration for audit (using environment constraint)
      const environment = 'development'; // Default environment for admin-config
      const existingResult = await client.query(
        'SELECT config_json FROM tool_configurations WHERE tool_type = $1 AND environment = $2',
        [toolType, environment]
      );
      const oldConfig = existingResult.rows.length > 0 ? existingResult.rows[0].config_json : null;
      
      // Insert or update configuration in tool_configurations table
      // Use the actual composite unique constraint (tool_type, environment)
      const upsertResult = await client.query(`
        INSERT INTO tool_configurations (tool_type, integration_type, config_json, environment, status, updated_by)
        VALUES ($1, $2, $3, $4, 'configured', $5)
        ON CONFLICT (tool_type, environment) DO UPDATE SET
          config_json = EXCLUDED.config_json,
          status = EXCLUDED.status,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
        RETURNING *
      `, [toolType, 'oidc', JSON.stringify(configData), environment, userId]);
      
      const savedConfig = upsertResult.rows[0];
      
      // IMPORTANT: Also update the main tools table for catalog service
      // Extract integration type and base URL from config
      let integrationType = 'oidc'; // default
      let baseUrl = configData.base_url || configData.instance_url || configData.grafana_url || 'https://example.com';
      
      // Determine integration type based on config
      if (configData.auth_url && !configData.discovery_url) {
        integrationType = 'oauth2';
      } else if (configData.idp_sso_url) {
        integrationType = 'saml';
      } else if (configData.discovery_url || configData.auth_url) {
        integrationType = 'oidc';
      } else if (configData.api_key || configData.token) {
        integrationType = 'custom';
      }
      
      // Update the tools table with the configuration
      await client.query(`
        UPDATE tools 
        SET 
          auth_config = $1,
          integration_type = $2,
          base_url = $3,
          status = 'active',
          updated_at = NOW()
        WHERE slug = $4
      `, [
        JSON.stringify(configData),
        integrationType,
        baseUrl,
        toolType
      ]);
      
      console.log(`✅ Updated tools table for ${toolType} with integration type: ${integrationType}`);
      
      // Log the change in audit table
      await client.query(`
        INSERT INTO config_audit_log (tool_type, action, old_config, new_config, changed_by)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        toolType,
        oldConfig ? 'update' : 'create',
        oldConfig,
        JSON.stringify(configData),
        userId
      ]);
      
      await client.query('COMMIT');
      
      console.log(`✅ Saved configuration for ${toolType} in both tables`);
      return savedConfig;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Failed to save config for ${toolType}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateToolStatus(toolType, status, testResults = null, userId = 'system') {
    try {
      // Update main configuration status
      await this.pool.query(`
        UPDATE tool_configurations 
        SET status = $1, updated_by = $2, updated_at = NOW()
        WHERE tool_type = $3
      `, [status, userId, toolType]);
      
      // Insert status record
      await this.pool.query(`
        INSERT INTO tool_status (tool_type, status, last_tested_at, test_results, error_message)
        VALUES ($1, $2, NOW(), $3, $4)
      `, [
        toolType,
        status,
        testResults ? JSON.stringify(testResults) : null,
        testResults?.error || null
      ]);
      
      console.log(`✅ Updated status for ${toolType}: ${status}`);
    } catch (error) {
      console.error(`Failed to update status for ${toolType}:`, error);
      throw error;
    }
  }

  async updateToolKeycloakClient(toolType, clientData) {
    try {
      await this.pool.query(`
        UPDATE tool_configurations 
        SET 
          keycloak_client_id = $1,
          keycloak_client_uuid = $2,
          updated_at = NOW()
        WHERE tool_type = $3
      `, [clientData.clientId, clientData.id, toolType]);
      
      console.log(`✅ Updated Keycloak client info for ${toolType}`);
    } catch (error) {
      console.error(`Failed to update Keycloak client info for ${toolType}:`, error);
      throw error;
    }
  }

  async getToolStatus(toolType, limit = 10) {
    try {
      const result = await this.pool.query(`
        SELECT * FROM tool_status 
        WHERE tool_type = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [toolType, limit]);
      
      return result.rows;
    } catch (error) {
      console.error(`Failed to get status for ${toolType}:`, error);
      throw error;
    }
  }

  async getConfigAuditLog(toolType = null, limit = 50) {
    try {
      let query = `
        SELECT * FROM config_audit_log 
        ${toolType ? 'WHERE tool_type = $1' : ''}
        ORDER BY changed_at DESC 
        LIMIT ${toolType ? '$2' : '$1'}
      `;
      
      const params = toolType ? [toolType, limit] : [limit];
      const result = await this.pool.query(query, params);
      
      return result.rows;
    } catch (error) {
      console.error('Failed to get audit log:', error);
      throw error;
    }
  }

  async deleteToolConfig(toolType, userId = 'system') {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get existing configuration for audit
      const existingResult = await client.query(
        'SELECT config_json FROM tool_configurations WHERE tool_type = $1',
        [toolType]
      );
      
      if (existingResult.rows.length === 0) {
        throw new Error(`Configuration for ${toolType} not found`);
      }
      
      const oldConfig = existingResult.rows[0].config_json;
      
      // Delete configuration
      await client.query(
        'DELETE FROM tool_configurations WHERE tool_type = $1',
        [toolType]
      );
      
      // Log the deletion
      await client.query(`
        INSERT INTO config_audit_log (tool_type, action, old_config, new_config, changed_by)
        VALUES ($1, 'delete', $2, NULL, $3)
      `, [toolType, oldConfig, userId]);
      
      await client.query('COMMIT');
      
      console.log(`✅ Deleted configuration for ${toolType}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Failed to delete config for ${toolType}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getToolMetrics(toolType = null, days = 30) {
    try {
      let query = `
        SELECT 
          tool_type,
          COUNT(*) as total_tests,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as successful_tests,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_tests,
          AVG(response_time_ms) as avg_response_time,
          MAX(last_tested_at) as last_test_time
        FROM tool_status 
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        ${toolType ? 'AND tool_type = $1' : ''}
        GROUP BY tool_type
        ORDER BY tool_type
      `;
      
      const params = toolType ? [toolType] : [];
      const result = await this.pool.query(query, params);
      
      return result.rows.map(row => ({
        ...row,
        success_rate: row.total_tests > 0 ? 
          ((parseInt(row.successful_tests) / parseInt(row.total_tests)) * 100).toFixed(2) : 0
      }));
    } catch (error) {
      console.error('Failed to get tool metrics:', error);
      throw error;
    }
  }
}

module.exports = new ToolConfigService();
