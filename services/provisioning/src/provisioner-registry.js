/**
 * Provisioner Registry - Phase 9
 * Manages all tool-specific provisioners
 */

class ProvisionerRegistry {
  constructor(fastify, config, databaseManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.provisioners = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    this.fastify.log.info('🔧 Initializing Provisioner Registry...');
    
    try {
      // Initialize all registered provisioners
      for (const [toolSlug, provisioner] of this.provisioners) {
        await provisioner.initialize();
        this.fastify.log.info(`✅ ${toolSlug} provisioner initialized`);
      }
      
      this.isInitialized = true;
      this.fastify.log.info('✅ Provisioner Registry initialized successfully');
    } catch (error) {
      this.fastify.log.error('❌ Failed to initialize Provisioner Registry:', error);
      throw error;
    }
  }

  /**
   * Register a provisioner for a tool
   */
  async registerProvisioner(toolSlug, provisioner) {
    this.fastify.log.info(`📝 Registering provisioner for ${toolSlug}`);
    this.provisioners.set(toolSlug, provisioner);
  }

  /**
   * Get provisioner for a tool
   */
  getProvisioner(toolSlug) {
    return this.provisioners.get(toolSlug);
  }

  /**
   * Get all capabilities from all provisioners
   */
  async getAllCapabilities() {
    const capabilities = {};
    
    for (const [toolSlug, provisioner] of this.provisioners) {
      try {
        capabilities[toolSlug] = provisioner.getCapabilities();
      } catch (error) {
        this.fastify.log.error(`Failed to get capabilities for ${toolSlug}:`, error);
        capabilities[toolSlug] = {
          tool: toolSlug,
          error: error.message,
          supported_resource_types: [],
          supported_operations: []
        };
      }
    }
    
    return capabilities;
  }

  /**
   * Check health of all provisioners
   */
  async checkAllHealth() {
    const healthResults = {};
    
    for (const [toolSlug, provisioner] of this.provisioners) {
      try {
        healthResults[toolSlug] = await provisioner.healthCheck();
      } catch (error) {
        healthResults[toolSlug] = {
          status: 'unhealthy',
          tool: toolSlug,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    return healthResults;
  }

  /**
   * Get list of registered tools
   */
  getRegisteredTools() {
    return Array.from(this.provisioners.keys());
  }

  /**
   * Check if tool is supported
   */
  isToolSupported(toolSlug) {
    return this.provisioners.has(toolSlug);
  }
}

module.exports = ProvisionerRegistry;
