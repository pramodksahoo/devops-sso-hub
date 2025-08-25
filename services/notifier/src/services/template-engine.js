/**
 * Template Engine for Notifier Service
 * Handles template processing and variable substitution for notifications
 */

const Handlebars = require('handlebars');

class TemplateEngine {
  constructor(fastify, config, databaseManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.templateCache = new Map();
    
    // Register custom Handlebars helpers
    this.registerHelpers();
  }

  async initialize() {
    this.fastify.log.info('✅ Template Engine: Initialized with Handlebars and caching support');
    
    // Preload templates in background if caching is enabled
    if (this.config.TEMPLATE_CACHING_ENABLED) {
      setImmediate(async () => {
        try {
          await this.preloadTemplates();
          this.fastify.log.info('Template cache warmed up successfully');
        } catch (error) {
          this.fastify.log.warn('Failed to preload templates:', error.message);
        }
      });
    }
  }

  registerHelpers() {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', function(date, format) {
      if (!date) return '';
      const d = new Date(date);
      
      switch (format) {
        case 'short':
          return d.toLocaleDateString();
        case 'long':
          return d.toLocaleString();
        case 'time':
          return d.toLocaleTimeString();
        case 'iso':
          return d.toISOString();
        default:
          return d.toLocaleString();
      }
    });

    // Uppercase helper
    Handlebars.registerHelper('upper', function(str) {
      return str ? str.toUpperCase() : '';
    });

    // Lowercase helper
    Handlebars.registerHelper('lower', function(str) {
      return str ? str.toLowerCase() : '';
    });

    // Capitalize helper
    Handlebars.registerHelper('capitalize', function(str) {
      return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
    });

    // Priority badge helper
    Handlebars.registerHelper('priorityBadge', function(priority) {
      const badges = {
        low: '🟢 LOW',
        medium: '🟡 MEDIUM',
        high: '🟠 HIGH',
        critical: '🔴 CRITICAL'
      };
      return badges[priority] || badges.medium;
    });

    // Tool icon helper
    Handlebars.registerHelper('toolIcon', function(toolName) {
      const icons = {
        github: '📦',
        gitlab: '🦊',
        jenkins: '🔨',
        argocd: '🚀',
        terraform: '🏗️',
        sonarqube: '📊',
        grafana: '📈',
        prometheus: '🔥',
        kibana: '🔍',
        snyk: '🛡️',
        jira: '🎫',
        servicenow: '🎫'
      };
      return icons[toolName?.toLowerCase()] || '⚙️';
    });

    // JSON pretty print helper
    Handlebars.registerHelper('json', function(context) {
      return JSON.stringify(context, null, 2);
    });

    // URL helper
    Handlebars.registerHelper('url', function(baseUrl, path) {
      if (!baseUrl || !path) return '';
      return baseUrl.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
    });

    // Conditional helper
    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    // Environment badge helper
    Handlebars.registerHelper('envBadge', function(environment) {
      const badges = {
        production: '🔴 PROD',
        staging: '🟡 STAGE',
        development: '🟢 DEV',
        test: '🔵 TEST'
      };
      return badges[environment?.toLowerCase()] || '⚪ UNKNOWN';
    });

    // Duration helper
    Handlebars.registerHelper('duration', function(ms) {
      if (!ms) return '';
      
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) return `${hours}h ${minutes % 60}m`;
      if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
      return `${seconds}s`;
    });

    // List helper
    Handlebars.registerHelper('list', function(items, options) {
      if (!Array.isArray(items)) return '';
      return items.map(item => options.fn(item)).join('\n');
    });
  }

  async preloadTemplates() {
    try {
      const templates = await this.db.listTemplates({ enabled: true });
      
      for (const template of templates) {
        this.templateCache.set(template.template_id, {
          ...template,
          compiled_subject: Handlebars.compile(template.subject_template),
          compiled_body: Handlebars.compile(template.body_template),
          compiled_html: template.html_template ? Handlebars.compile(template.html_template) : null,
          cached_at: Date.now()
        });
      }
      
      this.fastify.log.info(`Preloaded ${templates.length} notification templates`);
    } catch (error) {
      this.fastify.log.error('Failed to preload templates:', error);
    }
  }

  async getTemplate(templateId) {
    // Check cache first
    if (this.config.TEMPLATE_CACHING_ENABLED && this.templateCache.has(templateId)) {
      const cached = this.templateCache.get(templateId);
      const age = Date.now() - cached.cached_at;
      
      if (age < this.config.TEMPLATE_CACHE_TTL * 1000) {
        return cached;
      } else {
        this.templateCache.delete(templateId);
      }
    }

    // Load from database
    const template = await this.db.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    if (!template.enabled) {
      throw new Error(`Template is disabled: ${templateId}`);
    }

    // Compile templates
    const compiledTemplate = {
      ...template,
      compiled_subject: Handlebars.compile(template.subject_template),
      compiled_body: Handlebars.compile(template.body_template),
      compiled_html: template.html_template ? Handlebars.compile(template.html_template) : null,
      cached_at: Date.now()
    };

    // Cache if enabled
    if (this.config.TEMPLATE_CACHING_ENABLED) {
      this.templateCache.set(templateId, compiledTemplate);
    }

    return compiledTemplate;
  }

  async getTemplateByName(templateName) {
    // Check cache first
    if (this.config.TEMPLATE_CACHING_ENABLED) {
      for (const [id, cached] of this.templateCache.entries()) {
        if (cached.name === templateName) {
          const age = Date.now() - cached.cached_at;
          if (age < this.config.TEMPLATE_CACHE_TTL * 1000) {
            return cached;
          } else {
            this.templateCache.delete(id);
            break;
          }
        }
      }
    }

    // Load from database
    const template = await this.db.getTemplateByName(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    if (!template.enabled) {
      throw new Error(`Template is disabled: ${templateName}`);
    }

    // Compile templates
    const compiledTemplate = {
      ...template,
      compiled_subject: Handlebars.compile(template.subject_template),
      compiled_body: Handlebars.compile(template.body_template),
      compiled_html: template.html_template ? Handlebars.compile(template.html_template) : null,
      cached_at: Date.now()
    };

    // Cache if enabled
    if (this.config.TEMPLATE_CACHING_ENABLED) {
      this.templateCache.set(template.template_id, compiledTemplate);
    }

    return compiledTemplate;
  }

  async renderNotification(templateIdOrName, variables = {}) {
    try {
      // Get template (by ID or name)
      let template;
      if (templateIdOrName.includes('-') && templateIdOrName.length > 30) {
        // Looks like a UUID
        template = await this.getTemplate(templateIdOrName);
      } else {
        // Treat as template name
        template = await this.getTemplateByName(templateIdOrName);
      }

      // Prepare context with additional variables
      const context = {
        ...variables,
        timestamp: new Date().toISOString(),
        service: 'sso-hub-notifier',
        template_name: template.name,
        template_version: template.version
      };

      // Validate required variables
      const templateVariables = typeof template.variables === 'string' 
        ? JSON.parse(template.variables) 
        : template.variables;

      const missingVariables = templateVariables.filter(varName => 
        context[varName] === undefined || context[varName] === null
      );

      if (missingVariables.length > 0) {
        this.fastify.log.warn(`Missing template variables for ${template.name}:`, missingVariables);
        // Set default values for missing variables
        missingVariables.forEach(varName => {
          context[varName] = `[${varName}]`;
        });
      }

      // Render templates
      const rendered = {
        template_id: template.template_id,
        template_name: template.name,
        subject: template.compiled_subject(context),
        body: template.compiled_body(context),
        html: template.compiled_html ? template.compiled_html(context) : null,
        type: template.type,
        priority: template.priority,
        supported_channels: typeof template.supported_channels === 'string' 
          ? JSON.parse(template.supported_channels) 
          : template.supported_channels,
        variables_used: templateVariables,
        context: context
      };

      return rendered;

    } catch (error) {
      this.fastify.log.error(`Template rendering failed:`, error);
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  async createNotificationFromTemplate(templateName, variables, options = {}) {
    try {
      const rendered = await this.renderNotification(templateName, variables);

      // Create notification object
      const notification = {
        external_id: options.external_id,
        type: rendered.type,
        priority: rendered.priority,
        title: rendered.subject,
        message: rendered.body,
        html_message: rendered.html,
        recipients: options.recipients || [],
        channels: options.channels || rendered.supported_channels,
        template_id: rendered.template_id,
        metadata: {
          ...options.metadata,
          template_name: rendered.template_name,
          variables_used: rendered.variables_used,
          rendered_at: new Date().toISOString()
        },
        source_service: options.source_service,
        source_tool: options.source_tool,
        user_id: options.user_id,
        scheduled_at: options.scheduled_at,
        expires_at: options.expires_at,
        max_retries: options.max_retries,
        created_by: options.created_by
      };

      return notification;

    } catch (error) {
      this.fastify.log.error(`Failed to create notification from template:`, error);
      throw error;
    }
  }

  // ============================================================================
  // TEMPLATE VALIDATION
  // ============================================================================

  validateTemplate(template) {
    const errors = [];

    // Validate template structure
    if (!template.name) {
      errors.push('Template name is required');
    }

    if (!template.type) {
      errors.push('Template type is required');
    }

    if (!template.subject_template) {
      errors.push('Subject template is required');
    }

    if (!template.body_template) {
      errors.push('Body template is required');
    }

    // Validate template syntax
    try {
      Handlebars.compile(template.subject_template);
    } catch (error) {
      errors.push(`Invalid subject template syntax: ${error.message}`);
    }

    try {
      Handlebars.compile(template.body_template);
    } catch (error) {
      errors.push(`Invalid body template syntax: ${error.message}`);
    }

    if (template.html_template) {
      try {
        Handlebars.compile(template.html_template);
      } catch (error) {
        errors.push(`Invalid HTML template syntax: ${error.message}`);
      }
    }

    // Validate variables array
    if (template.variables && !Array.isArray(template.variables)) {
      errors.push('Variables must be an array');
    }

    // Validate supported channels
    if (template.supported_channels && !Array.isArray(template.supported_channels)) {
      errors.push('Supported channels must be an array');
    }

    const validChannels = ['email', 'slack', 'webhook', 'sms', 'teams'];
    if (template.supported_channels) {
      const invalidChannels = template.supported_channels.filter(channel => 
        !validChannels.includes(channel)
      );
      if (invalidChannels.length > 0) {
        errors.push(`Invalid channels: ${invalidChannels.join(', ')}`);
      }
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (template.priority && !validPriorities.includes(template.priority)) {
      errors.push(`Invalid priority: ${template.priority}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  async testTemplate(templateIdOrName, variables = {}) {
    try {
      // Add test context
      const testVariables = {
        ...variables,
        test_mode: true,
        timestamp: new Date().toISOString(),
        user_id: 'test-user-123',
        service_name: 'test-service',
        tool_name: 'github',
        environment: 'test'
      };

      const rendered = await this.renderNotification(templateIdOrName, testVariables);
      
      return {
        success: true,
        template_id: rendered.template_id,
        template_name: rendered.template_name,
        rendered: {
          subject: rendered.subject,
          body: rendered.body,
          html: rendered.html
        },
        variables_used: rendered.variables_used,
        supported_channels: rendered.supported_channels
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  clearCache() {
    this.templateCache.clear();
    this.fastify.log.info('Template cache cleared');
  }

  invalidateTemplate(templateId) {
    this.templateCache.delete(templateId);
    this.fastify.log.info(`Template cache invalidated: ${templateId}`);
  }

  getCacheStats() {
    const stats = {
      size: this.templateCache.size,
      enabled: this.config.TEMPLATE_CACHING_ENABLED,
      ttl: this.config.TEMPLATE_CACHE_TTL,
      templates: []
    };

    for (const [id, cached] of this.templateCache.entries()) {
      stats.templates.push({
        id: id,
        name: cached.name,
        cached_at: cached.cached_at,
        age: Date.now() - cached.cached_at
      });
    }

    return stats;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getAvailableHelpers() {
    return [
      'formatDate',
      'upper',
      'lower', 
      'capitalize',
      'priorityBadge',
      'toolIcon',
      'json',
      'url',
      'ifEquals',
      'envBadge',
      'duration',
      'list'
    ];
  }

  getToolTemplates(toolId) {
    return this.db.listTemplates({ tool_id: toolId, enabled: true });
  }

  getTemplatesByType(type) {
    return this.db.listTemplates({ type: type, enabled: true });
  }
}

module.exports = TemplateEngine;
