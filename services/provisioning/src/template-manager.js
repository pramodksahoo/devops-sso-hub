/**
 * Template Manager for Provisioning Service - Phase 9
 * Handles provisioning template management and validation
 */

const { z } = require('zod');

class TemplateManager {
  constructor(fastify, config, databaseManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.isInitialized = false;
    
    // Template validation schemas
    this.templateSchemas = new Map();
    this.initializeValidationSchemas();
  }

  async initialize() {
    this.fastify.log.info('📋 Initializing Template Manager...');
    
    try {
      // Load templates from database
      await this.loadTemplates();
      
      this.isInitialized = true;
      this.fastify.log.info('✅ Template Manager initialized successfully');
    } catch (error) {
      this.fastify.log.error('❌ Failed to initialize Template Manager:', error);
      throw error;
    }
  }

  /**
   * Initialize validation schemas for different template types
   */
  initializeValidationSchemas() {
    // GitHub repository template schema
    this.templateSchemas.set('github:repository', z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      private: z.boolean().default(true),
      organization: z.string().optional(),
      has_issues: z.boolean().default(true),
      has_projects: z.boolean().default(true),
      has_wiki: z.boolean().default(false),
      auto_init: z.boolean().default(false),
      gitignore_template: z.string().optional(),
      license_template: z.string().optional(),
      topics: z.array(z.string()).optional(),
      branch_protection: z.object({
        required_reviews: z.number().min(1).max(6).default(1),
        dismiss_stale_reviews: z.boolean().default(true),
        require_code_owner_reviews: z.boolean().default(false)
      }).optional(),
      team_access: z.array(z.object({
        team: z.string(),
        permission: z.enum(['pull', 'push', 'admin']).default('pull')
      })).optional()
    }));

    // GitLab project template schema
    this.templateSchemas.set('gitlab:project', z.object({
      name: z.string().min(1).max(100),
      path: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      visibility: z.enum(['private', 'internal', 'public']).default('private'),
      namespace_id: z.number().optional(),
      issues_enabled: z.boolean().default(true),
      merge_requests_enabled: z.boolean().default(true),
      wiki_enabled: z.boolean().default(false),
      snippets_enabled: z.boolean().default(true),
      ci_enabled: z.boolean().default(false),
      default_branch: z.string().default('main'),
      initialize_with_readme: z.boolean().default(false),
      topics: z.array(z.string()).optional(),
      ci_cd_template: z.object({
        type: z.enum(['nodejs', 'python', 'docker', 'custom']),
        custom_content: z.string().optional()
      }).optional()
    }));

    // Jenkins job template schema
    this.templateSchemas.set('jenkins:job', z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      job_type: z.enum(['pipeline', 'multibranch', 'freestyle']).default('pipeline'),
      repository_url: z.string().url(),
      branch: z.string().default('main'),
      pipeline_script: z.string().optional(),
      build_triggers: z.array(z.string()).default(['scm']),
      concurrent_builds: z.boolean().default(false)
    }));

    // Add more schemas for other tools...
  }

  /**
   * Load templates from database
   */
  async loadTemplates() {
    try {
      const templates = await this.getTemplates({});
      this.fastify.log.info(`Loaded ${templates.length} provisioning templates`);
    } catch (error) {
      this.fastify.log.error('Failed to load templates:', error);
      throw error;
    }
  }

  /**
   * Get templates with filters
   */
  async getTemplates(filters) {
    return await this.db.getTemplates(filters);
  }

  /**
   * Get specific template by ID
   */
  async getTemplate(templateId) {
    return await this.db.getTemplate(templateId);
  }

  /**
   * Validate template configuration
   */
  validateTemplate(template, variables) {
    try {
      // Get schema for this template type
      const schemaKey = `${template.tool_slug}:${template.template_type}`;
      const schema = this.templateSchemas.get(schemaKey);
      
      if (!schema) {
        this.fastify.log.warn(`No validation schema found for ${schemaKey}`);
        return { valid: true, errors: [] };
      }

      // Merge template config with variables
      const mergedConfig = this.mergeTemplateWithVariables(template, variables);
      
      // Validate against schema
      const result = schema.safeParse(mergedConfig);
      
      if (result.success) {
        return { valid: true, errors: [], data: result.data };
      } else {
        return { 
          valid: false, 
          errors: result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        };
      }
    } catch (error) {
      this.fastify.log.error('Template validation error:', error);
      return {
        valid: false,
        errors: [{ message: `Validation failed: ${error.message}` }]
      };
    }
  }

  /**
   * Merge template configuration with provided variables
   */
  mergeTemplateWithVariables(template, variables) {
    try {
      // Start with template default variables
      let config = { ...template.default_variables };
      
      // Apply provided variables
      config = { ...config, ...variables };
      
      // Apply template configuration (these override variables)
      config = { ...config, ...template.template_config };
      
      return config;
    } catch (error) {
      this.fastify.log.error('Error merging template with variables:', error);
      throw new Error(`Template merge failed: ${error.message}`);
    }
  }

  /**
   * Validate required variables are provided
   */
  validateRequiredVariables(template, variables) {
    const requiredVars = template.required_variables || [];
    const providedVars = Object.keys(variables || {});
    
    const missingVars = requiredVars.filter(varName => !providedVars.includes(varName));
    
    if (missingVars.length > 0) {
      return {
        valid: false,
        errors: [{
          message: `Missing required variables: ${missingVars.join(', ')}`,
          missing_variables: missingVars
        }]
      };
    }
    
    return { valid: true, errors: [] };
  }

  /**
   * Generate workflow steps from template
   */
  generateWorkflowSteps(template, variables) {
    try {
      const mergedConfig = this.mergeTemplateWithVariables(template, variables);
      
      // Basic workflow steps for most resource types
      const steps = [
        {
          step_name: 'validate_template',
          step_type: 'validation',
          step_order: 1,
          step_config: {
            validation_type: 'template_validation',
            template_id: template.id,
            variables: variables
          }
        },
        {
          step_name: 'validate_permissions',
          step_type: 'validation',
          step_order: 2,
          step_config: {
            validation_type: 'permissions',
            tool_slug: template.tool_slug,
            resource_type: template.template_type
          }
        },
        {
          step_name: 'check_policies',
          step_type: 'validation',
          step_order: 3,
          step_config: {
            validation_type: 'policy_compliance',
            tool_slug: template.tool_slug,
            resource_type: template.template_type,
            config: mergedConfig
          }
        },
        {
          step_name: 'create_resource',
          step_type: 'api_call',
          step_order: 4,
          step_config: {
            operation: 'create',
            resource_type: template.template_type,
            config: mergedConfig,
            tool_slug: template.tool_slug
          }
        },
        {
          step_name: 'verify_creation',
          step_type: 'validation',
          step_order: 5,
          step_config: {
            validation_type: 'resource_exists',
            tool_slug: template.tool_slug,
            resource_type: template.template_type
          }
        }
      ];

      // Add tool-specific additional steps
      const additionalSteps = this.generateToolSpecificSteps(template, mergedConfig);
      steps.push(...additionalSteps);

      return steps;
    } catch (error) {
      this.fastify.log.error('Failed to generate workflow steps:', error);
      throw new Error(`Workflow generation failed: ${error.message}`);
    }
  }

  /**
   * Generate tool-specific workflow steps
   */
  generateToolSpecificSteps(template, config) {
    const additionalSteps = [];
    
    switch (template.tool_slug) {
      case 'github':
        if (config.topics && config.topics.length > 0) {
          additionalSteps.push({
            step_name: 'set_repository_topics',
            step_type: 'api_call',
            step_order: 6,
            step_config: {
              operation: 'update',
              resource_type: 'repository_topics',
              config: { topics: config.topics }
            }
          });
        }
        
        if (config.branch_protection) {
          additionalSteps.push({
            step_name: 'setup_branch_protection',
            step_type: 'api_call',
            step_order: 7,
            step_config: {
              operation: 'create',
              resource_type: 'branch_protection',
              config: config.branch_protection
            }
          });
        }
        break;
        
      case 'gitlab':
        if (config.ci_cd_template) {
          additionalSteps.push({
            step_name: 'setup_cicd_pipeline',
            step_type: 'api_call',
            step_order: 6,
            step_config: {
              operation: 'create',
              resource_type: 'pipeline',
              config: config.ci_cd_template
            }
          });
        }
        break;
        
      case 'jenkins':
        additionalSteps.push({
          step_name: 'configure_build_triggers',
          step_type: 'api_call',
          step_order: 6,
          step_config: {
            operation: 'update',
            resource_type: 'job_triggers',
            config: { triggers: config.build_triggers }
          }
        });
        break;
    }
    
    return additionalSteps;
  }

  /**
   * Create custom template
   */
  async createTemplate(templateData, userContext) {
    try {
      // Validate template data
      const validation = this.validateTemplateData(templateData);
      if (!validation.valid) {
        throw new Error(`Template validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      const client = await this.db.db.connect();
      
      try {
        const query = `
          INSERT INTO provisioning_templates (
            name, description, tool_slug, template_type, template_category,
            template_config, default_variables, required_variables,
            validation_schema, version, is_system_template, required_roles,
            required_groups, tags, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *
        `;
        
        const values = [
          templateData.name,
          templateData.description,
          templateData.tool_slug,
          templateData.template_type,
          templateData.template_category || 'custom',
          JSON.stringify(templateData.template_config || {}),
          JSON.stringify(templateData.default_variables || {}),
          JSON.stringify(templateData.required_variables || []),
          JSON.stringify(templateData.validation_schema || {}),
          templateData.version || '1.0.0',
          false, // is_system_template
          templateData.required_roles || [],
          templateData.required_groups || [],
          templateData.tags || [],
          userContext.sub
        ];
        
        const result = await client.query(query, values);
        return result.rows[0];
      } finally {
        client.release();
      }
    } catch (error) {
      this.fastify.log.error('Failed to create template:', error);
      throw error;
    }
  }

  /**
   * Validate template data structure
   */
  validateTemplateData(templateData) {
    const schema = z.object({
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      tool_slug: z.string().min(1).max(50),
      template_type: z.string().min(1).max(100),
      template_category: z.string().optional(),
      template_config: z.record(z.any()).optional(),
      default_variables: z.record(z.any()).optional(),
      required_variables: z.array(z.string()).optional(),
      validation_schema: z.record(z.any()).optional(),
      version: z.string().optional(),
      required_roles: z.array(z.string()).optional(),
      required_groups: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional()
    });

    const result = schema.safeParse(templateData);
    
    if (result.success) {
      return { valid: true, errors: [], data: result.data };
    } else {
      return {
        valid: false,
        errors: result.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      };
    }
  }

  /**
   * Get template suggestions based on tool and resource type
   */
  async getTemplateSuggestions(toolSlug, resourceType, userRoles = []) {
    try {
      const filters = {
        tool_slug: toolSlug,
        template_type: resourceType,
        user_roles: userRoles
      };
      
      const templates = await this.getTemplates(filters);
      
      // Sort by category: system templates first, then by usage popularity
      return templates.sort((a, b) => {
        if (a.is_system_template && !b.is_system_template) return -1;
        if (!a.is_system_template && b.is_system_template) return 1;
        return a.template_category.localeCompare(b.template_category);
      });
    } catch (error) {
      this.fastify.log.error('Failed to get template suggestions:', error);
      return [];
    }
  }
}

module.exports = TemplateManager;
