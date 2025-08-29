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
    // Auto-create tables if they don't exist (fallback for manual deployments)
    try {
      console.log('🔍 Verifying and auto-creating database tables if needed...');
      
      // Create supported_tools table if not exists
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS supported_tools (
          tool_type VARCHAR(50) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          category VARCHAR(50) NOT NULL,
          protocol VARCHAR(20) NOT NULL,
          description TEXT,
          is_enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create tool_configurations table if not exists
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS tool_configurations (
          id SERIAL PRIMARY KEY,
          tool_type VARCHAR(50) NOT NULL,
          environment VARCHAR(50) DEFAULT 'development',
          integration_type VARCHAR(20) NOT NULL,
          config_json JSONB NOT NULL,
          status VARCHAR(20) DEFAULT 'configured',
          keycloak_client_id VARCHAR(255),
          keycloak_client_uuid VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          created_by VARCHAR(100) DEFAULT 'system',
          updated_by VARCHAR(100) DEFAULT 'system',
          UNIQUE(tool_type, environment)
        )
      `);
      
      // Create tools table if not exists (for catalog service compatibility)
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS tools (
          id SERIAL PRIMARY KEY,
          slug VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          base_url VARCHAR(255),
          integration_type VARCHAR(20),
          auth_config JSONB,
          auth_config_json JSONB,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create config_audit_log table if not exists
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS config_audit_log (
          id SERIAL PRIMARY KEY,
          tool_type VARCHAR(50) NOT NULL,
          action VARCHAR(20) NOT NULL,
          old_config JSONB,
          new_config JSONB,
          changed_by VARCHAR(100) NOT NULL,
          changed_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create tool_status table if not exists
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS tool_status (
          id SERIAL PRIMARY KEY,
          tool_type VARCHAR(50) NOT NULL,
          status VARCHAR(20) NOT NULL,
          last_tested_at TIMESTAMP,
          test_results JSONB,
          error_message TEXT,
          uptime_percentage DECIMAL(5,2),
          response_time_ms INTEGER,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('✅ Database tables verified and auto-created if needed');
      
      // Ensure tools table has all supported tools as records
      await this.ensureToolRecords();
      
    } catch (error) {
      console.error('❌ Failed to verify/create database tables:', error);
      throw error;
    }
  }
  
  getDefaultBaseUrl(toolType) {
    const defaultUrls = {
      github: 'https://github.com',
      gitlab: 'https://gitlab.com',
      jenkins: 'https://jenkins.example.com',
      argocd: 'https://argocd.example.com',
      terraform: 'https://terraform.example.com',
      sonarqube: 'https://sonarqube.example.com',
      grafana: 'http://localhost:3100',
      prometheus: 'https://prometheus.example.com',
      kibana: 'https://kibana.example.com',
      snyk: 'https://snyk.io',
      jira: 'https://jira.example.com',
      servicenow: 'https://servicenow.example.com'
    };
    
    return defaultUrls[toolType] || `https://${toolType}.example.com`;
  }

  async ensureToolRecords() {
    try {
      console.log('🔍 Ensuring all supported tools exist in tools table...');
      
      const toolsMetadata = toolSchemas.getAllMetadata();
      
      for (const [toolType, metadata] of Object.entries(toolsMetadata)) {
        // Insert tool record if not exists with default base URL and integration type
        const defaultBaseUrl = this.getDefaultBaseUrl(toolType);
        await this.pool.query(`
          INSERT INTO tools (slug, name, base_url, integration_type, status)
          VALUES ($1, $2, $3, $4, 'active')
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            base_url = COALESCE(tools.base_url, EXCLUDED.base_url),
            integration_type = COALESCE(tools.integration_type, EXCLUDED.integration_type),
            updated_at = NOW()
        `, [toolType, metadata.name, defaultBaseUrl, metadata.protocol]);
      }
      
      console.log('✅ All supported tools ensured in tools table');
      
    } catch (error) {
      console.error('❌ Failed to ensure tool records:', error);
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
        WHERE st.is_enabled = true
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
        'SELECT config_json, keycloak_client_id, integration_type FROM tool_configurations WHERE tool_type = $1 AND environment = $2',
        [toolType, environment]
      );
      const oldConfig = existingResult.rows.length > 0 ? existingResult.rows[0].config_json : null;
      const existingIntegrationType = existingResult.rows.length > 0 ? existingResult.rows[0].integration_type : null;
      
      // Determine integration type - PRESERVE EXISTING TYPE TO MAINTAIN STABLE CLIENT IDs
      let integrationType;
      
      if (existingIntegrationType) {
        // If we already have an integration type, keep it to maintain stable client IDs
        integrationType = existingIntegrationType;
        console.log(`📝 Using existing integration type: ${integrationType} for ${toolType}`);
      } else {
        // First time setup - use tool metadata default protocol
        const toolSchemas = require('../schemas/tool-schemas');
        const metadata = toolSchemas.getMetadata(toolType);
        integrationType = metadata.protocol;
        console.log(`📝 First time setup for ${toolType}, using metadata protocol: ${integrationType}`);
      }
      
      // Generate correct keycloak_client_id with protocol suffix
      const keycloakClientId = `${toolType}-client-${integrationType}`;
      
      console.log(`📝 Saving config for ${toolType} with integration type: ${integrationType}, client_id: ${keycloakClientId}`);
      
      // Insert or update configuration in tool_configurations table
      // Use the actual composite unique constraint (tool_type, environment)
      const upsertResult = await client.query(`
        INSERT INTO tool_configurations (tool_type, integration_type, config_json, environment, status, updated_by, keycloak_client_id)
        VALUES ($1, $2, $3, $4, 'configured', $5, $6)
        ON CONFLICT (tool_type, environment) DO UPDATE SET
          config_json = EXCLUDED.config_json,
          integration_type = EXCLUDED.integration_type,
          status = EXCLUDED.status,
          updated_by = EXCLUDED.updated_by,
          keycloak_client_id = EXCLUDED.keycloak_client_id,
          updated_at = NOW()
        RETURNING *
      `, [toolType, integrationType, JSON.stringify(configData), environment, userId, keycloakClientId]);
      
      const savedConfig = upsertResult.rows[0];
      
      // IMPORTANT: Also update the main tools table for catalog service
      // Extract base URL from config
      let baseUrl = configData.base_url || configData.instance_url || configData.grafana_url || 
                    configData.jenkins_url || configData.argocd_url || configData.sonarqube_url || 
                    'https://example.com';
      
      // Update the tools table with the configuration and sync keycloak client info
      const toolsUpdateResult = await client.query(`
        UPDATE tools 
        SET 
          auth_config = $1,
          auth_config_json = $1,
          integration_type = $2,
          base_url = $3,
          status = 'active',
          updated_at = NOW()
        WHERE slug = $4
        RETURNING id, slug, name
      `, [
        JSON.stringify(configData),
        integrationType,
        baseUrl,
        toolType
      ]);
      
      if (toolsUpdateResult.rows.length === 0) {
        throw new Error(`Tool '${toolType}' not found in tools table. Please ensure it exists.`);
      }
      
      console.log(`✅ Updated tools table for ${toolType} with integration type: ${integrationType}, keycloak_client_id: ${keycloakClientId}`);
      
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

  async updateToolKeycloakClient(toolType, clientData, integrationType = 'oauth2') {
    try {
      // Use UPSERT (INSERT ON CONFLICT UPDATE) to handle both new and existing configurations
      // Note: The unique constraint is on (tool_type, environment), defaulting to 'development'
      const upsertResult = await this.pool.query(`
        INSERT INTO tool_configurations (
          tool_type, integration_type, keycloak_client_id, keycloak_client_uuid, environment, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, 'development', NOW(), NOW())
        ON CONFLICT (tool_type, environment)
        DO UPDATE SET 
          integration_type = EXCLUDED.integration_type,
          keycloak_client_id = EXCLUDED.keycloak_client_id,
          keycloak_client_uuid = EXCLUDED.keycloak_client_uuid,
          updated_at = NOW()
        RETURNING keycloak_client_id, integration_type
      `, [toolType, integrationType, clientData.clientId, clientData.id]);
      
      if (upsertResult.rows.length === 0) {
        throw new Error(`Failed to create or update tool configuration for ${toolType}`);
      }
      
      const updatedRecord = upsertResult.rows[0];
      console.log(`✅ Created/updated Keycloak client info for ${toolType}: ${updatedRecord.keycloak_client_id}`);
      
      // Validate that client_id follows the correct format
      const expectedFormat = `${toolType}-client-${updatedRecord.integration_type}`;
      if (clientData.clientId !== expectedFormat) {
        console.warn(`⚠️  Client ID format mismatch for ${toolType}: expected '${expectedFormat}', got '${clientData.clientId}'`);
      }
      
      return updatedRecord;
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

  /**
   * Get all tool configurations from database (for sync operations)
   */
  async getAllToolConfigs() {
    try {
      const result = await this.pool.query(`
        SELECT 
          id, tool_type, integration_type, config_json, 
          keycloak_client_id, keycloak_client_uuid, status,
          created_at, updated_at, created_by, updated_by
        FROM tool_configurations
        ORDER BY tool_type, integration_type
      `);
      
      return result.rows.map(row => ({
        ...row,
        config_json: row.config_json || {}
      }));
    } catch (error) {
      console.error('❌ Failed to get all tool configurations:', error);
      throw new Error(`Failed to get all tool configurations: ${error.message}`);
    }
  }

  /**
   * Update tool configuration (for sync operations)
   */
  async updateToolConfig(toolType, configData) {
    try {
      const { integration_type, config_json, keycloak_client_id, keycloak_client_uuid } = configData;
      
      const result = await this.pool.query(`
        UPDATE tool_configurations
        SET 
          integration_type = COALESCE($2, integration_type),
          config_json = COALESCE($3, config_json),
          keycloak_client_id = COALESCE($4, keycloak_client_id),
          keycloak_client_uuid = COALESCE($5, keycloak_client_uuid),
          updated_at = NOW()
        WHERE tool_type = $1
        RETURNING id, tool_type, integration_type, updated_at
      `, [toolType, integration_type, config_json, keycloak_client_id, keycloak_client_uuid]);
      
      if (result.rows.length === 0) {
        throw new Error(`No configuration found for tool type: ${toolType}`);
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`❌ Failed to update tool configuration for ${toolType}:`, error);
      throw new Error(`Failed to update tool configuration: ${error.message}`);
    }
  }
}

module.exports = new ToolConfigService();
