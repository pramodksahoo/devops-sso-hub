/**
 * Base Provisioner Class - Phase 9
 * Abstract base class for all tool-specific provisioners
 */

const axios = require('axios');
const crypto = require('crypto');

class BaseProvisioner {
  constructor(toolSlug, config, fastify) {
    this.toolSlug = toolSlug;
    this.config = config;
    this.fastify = fastify;
    this.logger = fastify.log;
    
    // Tool-specific configuration
    this.toolConfig = this.getToolConfig();
    this.apiClient = null;
    
    // Rate limiting and retry configuration
    this.maxRetries = this.toolConfig.max_retries || 3;
    this.rateLimitBuffer = this.toolConfig.rate_limit_buffer || 5;
    
    // Supported operations by this provisioner
    this.supportedResourceTypes = [];
    this.supportedOperations = ['create', 'update', 'delete', 'list'];
  }

  /**
   * Initialize the provisioner
   */
  async initialize() {
    this.logger.info(`🔧 Initializing ${this.toolSlug} provisioner...`);
    
    try {
      // Initialize API client
      await this.initializeApiClient();
      
      // Validate connection
      await this.validateConnection();
      
      this.logger.info(`✅ ${this.toolSlug} provisioner initialized successfully`);
    } catch (error) {
      this.logger.error(`❌ Failed to initialize ${this.toolSlug} provisioner:`, error);
      throw error;
    }
  }

  /**
   * Get tool-specific configuration
   */
  getToolConfig() {
    const configKey = `${this.toolSlug.toUpperCase()}_CONFIG`;
    return this.config[configKey] || {};
  }

  /**
   * Initialize API client - to be implemented by subclasses
   */
  async initializeApiClient() {
    throw new Error('initializeApiClient must be implemented by subclass');
  }

  /**
   * Validate connection to the tool - to be implemented by subclasses
   */
  async validateConnection() {
    throw new Error('validateConnection must be implemented by subclass');
  }

  /**
   * Execute API call with error handling and retries
   */
  async executeApiCall(config, variables) {
    const operation = config.operation;
    const resourceType = config.resource_type;
    
    this.validateResourceType(resourceType);
    this.validateOperation(operation);
    
    switch (operation) {
      case 'create':
        return await this.createResource(resourceType, config, variables);
      
      case 'update':
        return await this.updateResource(resourceType, config, variables);
      
      case 'delete':
        return await this.deleteResource(resourceType, config, variables);
      
      case 'list':
        return await this.listResources(resourceType, config, variables);
      
      case 'get':
        return await this.getResource(resourceType, config, variables);
      
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  /**
   * Create resource - to be implemented by subclasses
   */
  async createResource(resourceType, config, variables) {
    throw new Error('createResource must be implemented by subclass');
  }

  /**
   * Update resource - to be implemented by subclasses
   */
  async updateResource(resourceType, config, variables) {
    throw new Error('updateResource must be implemented by subclass');
  }

  /**
   * Delete resource - to be implemented by subclasses
   */
  async deleteResource(resourceType, config, variables) {
    throw new Error('deleteResource must be implemented by subclass');
  }

  /**
   * List resources - to be implemented by subclasses
   */
  async listResources(resourceType, config, variables) {
    throw new Error('listResources must be implemented by subclass');
  }

  /**
   * Get specific resource - to be implemented by subclasses
   */
  async getResource(resourceType, config, variables) {
    throw new Error('getResource must be implemented by subclass');
  }

  /**
   * Generate rollback data for an operation
   */
  generateRollbackData(operation, resourceType, resourceData, originalData = null) {
    switch (operation) {
      case 'create':
        return {
          operation: 'delete',
          resource_type: resourceType,
          resource_id: resourceData.id || resourceData.name,
          resource_data: resourceData
        };
      
      case 'update':
        return {
          operation: 'update',
          resource_type: resourceType,
          resource_id: resourceData.id || resourceData.name,
          resource_data: originalData
        };
      
      case 'delete':
        return {
          operation: 'create',
          resource_type: resourceType,
          resource_data: originalData
        };
      
      default:
        return null;
    }
  }

  /**
   * Execute HTTP request with retries and error handling
   */
  async executeHttpRequest(requestConfig, retryCount = 0) {
    try {
      const response = await axios({
        timeout: 30000,
        ...requestConfig
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`HTTP request failed (attempt ${retryCount + 1}):`, error.message);
      
      if (retryCount < this.maxRetries && this.shouldRetry(error)) {
        const delay = this.calculateRetryDelay(retryCount);
        this.logger.info(`Retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeHttpRequest(requestConfig, retryCount + 1);
      }
      
      throw this.formatApiError(error);
    }
  }

  /**
   * Determine if request should be retried
   */
  shouldRetry(error) {
    if (!error.response) {
      return true; // Network errors
    }
    
    const status = error.response.status;
    
    // Retry on server errors and rate limits
    return status >= 500 || status === 429;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(retryCount) {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    
    // Add jitter to prevent thundering herd
    return delay + (Math.random() * 1000);
  }

  /**
   * Format API error for consistent error handling
   */
  formatApiError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      return new Error(`API Error ${status}: ${data.message || data.error || 'Unknown error'}`);
    }
    
    return new Error(`Network Error: ${error.message}`);
  }

  /**
   * Validate resource type is supported
   */
  validateResourceType(resourceType) {
    if (!this.supportedResourceTypes.includes(resourceType)) {
      throw new Error(`Unsupported resource type: ${resourceType}. Supported types: ${this.supportedResourceTypes.join(', ')}`);
    }
  }

  /**
   * Validate operation is supported
   */
  validateOperation(operation) {
    if (!this.supportedOperations.includes(operation)) {
      throw new Error(`Unsupported operation: ${operation}. Supported operations: ${this.supportedOperations.join(', ')}`);
    }
  }

  /**
   * Apply template variables to configuration
   */
  applyTemplateVariables(template, variables) {
    let result = JSON.stringify(template);
    
    // Replace ${variable} patterns
    result = result.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      if (variables.hasOwnProperty(varName)) {
        return JSON.stringify(variables[varName]).slice(1, -1); // Remove quotes
      }
      throw new Error(`Template variable not found: ${varName}`);
    });
    
    return JSON.parse(result);
  }

  /**
   * Validate required variables are present
   */
  validateRequiredVariables(requiredVars, providedVars) {
    const missing = requiredVars.filter(varName => !providedVars.hasOwnProperty(varName));
    
    if (missing.length > 0) {
      throw new Error(`Missing required variables: ${missing.join(', ')}`);
    }
  }

  /**
   * Get credentials for the tool
   */
  async getCredentials() {
    // This would typically decrypt credentials from database
    // For now, return mock credentials
    return {
      api_key: 'mock_api_key',
      secret: 'mock_secret'
    };
  }

  /**
   * Health check for the provisioner
   */
  async healthCheck() {
    try {
      await this.validateConnection();
      return {
        status: 'healthy',
        tool: this.toolSlug,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        tool: this.toolSlug,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get supported resource types and operations
   */
  getCapabilities() {
    return {
      tool: this.toolSlug,
      supported_resource_types: this.supportedResourceTypes,
      supported_operations: this.supportedOperations,
      rate_limit_buffer: this.rateLimitBuffer,
      max_retries: this.maxRetries
    };
  }

  /**
   * Generate resource name with naming convention
   */
  generateResourceName(baseName, namingConvention = {}) {
    let name = baseName;
    
    // Apply prefix if specified
    if (namingConvention.prefix) {
      name = `${namingConvention.prefix}-${name}`;
    }
    
    // Apply suffix if specified
    if (namingConvention.suffix) {
      name = `${name}-${namingConvention.suffix}`;
    }
    
    // Apply transformation rules
    if (namingConvention.transform) {
      switch (namingConvention.transform) {
        case 'lowercase':
          name = name.toLowerCase();
          break;
        case 'uppercase':
          name = name.toUpperCase();
          break;
        case 'kebab-case':
          name = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
          break;
        case 'snake_case':
          name = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
          break;
      }
    }
    
    return name;
  }

  /**
   * Log provisioning activity
   */
  async logActivity(activity, resourceType, resourceId, details = {}) {
    this.logger.info(`${this.toolSlug} ${activity}:`, {
      resource_type: resourceType,
      resource_id: resourceId,
      details
    });
  }
}

module.exports = BaseProvisioner;
