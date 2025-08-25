/**
 * Policy Validator for Policy Service
 * Validates policy structure, rules, and compliance with security standards
 */

const { z } = require('zod');

class PolicyValidator {
  constructor(fastify, config) {
    this.fastify = fastify;
    this.config = config;
    this.initializeSchemas();
  }

  async initialize() {
    this.fastify.log.info('✅ Policy Validator: Initialized with Zod validation schemas');
  }

  initializeSchemas() {
    // Core policy schema
    this.policySchema = z.object({
      policy_id: z.string().min(1).max(200),
      name: z.string().min(1).max(300),
      description: z.string().optional(),
      type: z.enum(['access_control', 'compliance', 'security', 'governance', 'workflow']),
      category: z.string().min(1).max(100),
      tool_id: z.string().max(50).optional(),
      tool_scope: z.enum(['global', 'organization', 'project', 'repository', 'workspace']).optional(),
      scope_identifier: z.string().max(500).optional(),
      priority: z.number().int().min(1).max(1000).default(100),
      enabled: z.boolean().default(true),
      rules: z.array(this.createRuleSchema()).min(1),
      conditions: z.record(z.any()).optional(),
      effects: z.record(z.any()).optional(),
      compliance_framework: z.enum(['SOX', 'GDPR', 'HIPAA', 'PCI-DSS', 'SOC2', 'ISO27001']).optional(),
      regulatory_requirement: z.string().optional(),
      business_justification: z.string().optional(),
      risk_level: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
      effective_from: z.string().datetime().optional(),
      effective_until: z.string().datetime().optional()
    });

    // Compliance rule schema
    this.complianceRuleSchema = z.object({
      rule_id: z.string().min(1).max(200),
      name: z.string().min(1).max(300),
      description: z.string().min(1),
      framework: z.enum(['SOX', 'GDPR', 'HIPAA', 'PCI-DSS', 'SOC2', 'ISO27001']),
      control_id: z.string().max(100).optional(),
      requirement_text: z.string().min(1),
      implementation_guidance: z.string().optional(),
      assessment_method: z.enum(['automated', 'manual', 'hybrid']),
      assessment_frequency: z.enum(['continuous', 'daily', 'weekly', 'monthly', 'quarterly', 'annually']),
      risk_level: z.enum(['low', 'medium', 'high', 'critical']),
      business_impact: z.string().optional(),
      applicable_tools: z.array(z.string()).optional(),
      automated_check: z.record(z.any()).optional(),
      effective_from: z.string().datetime().optional(),
      effective_until: z.string().datetime().optional(),
      enabled: z.boolean().default(true)
    });
  }

  createRuleSchema() {
    return z.object({
      rule_id: z.string().max(200).optional(),
      name: z.string().min(1).max(300),
      description: z.string().optional(),
      conditions: z.record(z.any()).optional(),
      effects: z.record(z.any()).optional(),
      priority: z.number().int().min(1).max(100).default(1),
      enabled: z.boolean().default(true),
      action: z.enum(['allow', 'deny', 'audit', 'alert', 'require_approval', 'log']).default('allow'),
      action_parameters: z.record(z.any()).optional(),
      resource_type: z.string().max(100).optional(),
      resource_pattern: z.string().max(500).optional(),
      user_pattern: z.string().max(500).optional(),
      group_pattern: z.string().max(500).optional(),
      role_requirements: z.array(z.string()).optional(),
      time_restrictions: z.record(z.any()).optional(),
      environment: z.enum(['production', 'staging', 'development', 'testing']).optional(),
      location_restrictions: z.array(z.string()).optional()
    });
  }

  // ============================================================================
  // POLICY VALIDATION
  // ============================================================================

  async validatePolicy(policyData) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: []
    };

    try {
      // Schema validation
      const schemaResult = this.validatePolicySchema(policyData);
      if (!schemaResult.valid) {
        results.valid = false;
        results.errors.push(...schemaResult.errors);
      }

      // Business logic validation
      const businessResult = await this.validatePolicyBusinessLogic(policyData);
      if (!businessResult.valid) {
        results.valid = false;
        results.errors.push(...businessResult.errors);
      }
      results.warnings.push(...businessResult.warnings);

      // Security validation
      const securityResult = this.validatePolicySecurityRules(policyData);
      if (!securityResult.valid) {
        results.valid = false;
        results.errors.push(...securityResult.errors);
      }
      results.warnings.push(...securityResult.warnings);

      // Tool-specific validation
      if (policyData.tool_id) {
        const toolResult = this.validateToolSpecificRules(policyData);
        if (!toolResult.valid) {
          results.valid = false;
          results.errors.push(...toolResult.errors);
        }
        results.warnings.push(...toolResult.warnings);
      }

      // Performance validation
      const performanceResult = this.validatePolicyPerformance(policyData);
      results.warnings.push(...performanceResult.warnings);
      results.recommendations.push(...performanceResult.recommendations);

      // Compliance validation
      if (policyData.compliance_framework) {
        const complianceResult = this.validateComplianceAlignment(policyData);
        results.warnings.push(...complianceResult.warnings);
        results.recommendations.push(...complianceResult.recommendations);
      }

    } catch (error) {
      results.valid = false;
      results.errors.push(`Validation error: ${error.message}`);
    }

    return results;
  }

  validatePolicySchema(policyData) {
    try {
      this.policySchema.parse(policyData);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        return { valid: false, errors };
      }
      return { valid: false, errors: [error.message] };
    }
  }

  async validatePolicyBusinessLogic(policyData) {
    const errors = [];
    const warnings = [];

    // Check for conflicting policies (this would require database access)
    // For now, we'll do basic logical checks

    // Validate rule priorities
    if (policyData.rules && policyData.rules.length > 1) {
      const priorities = policyData.rules.map(r => r.priority || 1);
      const uniquePriorities = new Set(priorities);
      
      if (uniquePriorities.size !== priorities.length) {
        warnings.push('Multiple rules have the same priority, which may lead to non-deterministic behavior');
      }
    }

    // Validate effective dates
    if (policyData.effective_from && policyData.effective_until) {
      const from = new Date(policyData.effective_from);
      const until = new Date(policyData.effective_until);
      
      if (from >= until) {
        errors.push('effective_from must be before effective_until');
      }
      
      if (until < new Date()) {
        warnings.push('Policy has already expired');
      }
    }

    // Validate tool and scope consistency
    if (policyData.tool_scope && !policyData.tool_id) {
      errors.push('tool_scope requires tool_id to be specified');
    }

    // Validate compliance framework requirements
    if (policyData.compliance_framework && !policyData.regulatory_requirement) {
      warnings.push('Compliance policies should include regulatory_requirement for audit purposes');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  validatePolicySecurityRules(policyData) {
    const errors = [];
    const warnings = [];

    // Security rule validations
    for (const rule of policyData.rules || []) {
      // Check for overly permissive rules
      if (rule.action === 'allow' && !rule.conditions && !rule.role_requirements) {
        warnings.push(`Rule "${rule.name}" allows all access without conditions - consider adding restrictions`);
      }

      // Check for conflicting actions within the same policy
      const denyRules = policyData.rules.filter(r => r.action === 'deny');
      const allowRules = policyData.rules.filter(r => r.action === 'allow');
      
      if (denyRules.length > 0 && allowRules.length > 0) {
        // Check for overlapping conditions
        warnings.push('Policy contains both allow and deny rules - ensure proper priority ordering');
      }

      // Validate role requirements
      if (rule.role_requirements && rule.role_requirements.length === 0) {
        warnings.push(`Rule "${rule.name}" has empty role_requirements array`);
      }

      // Validate time restrictions
      if (rule.time_restrictions) {
        const timeValidation = this.validateTimeRestrictions(rule.time_restrictions);
        if (!timeValidation.valid) {
          errors.push(...timeValidation.errors.map(e => `Rule "${rule.name}": ${e}`));
        }
      }
    }

    // High-risk policy checks
    if (policyData.type === 'access_control' && policyData.tool_id === 'terraform' && policyData.priority < 500) {
      warnings.push('Terraform policies should have high priority (≥500) due to infrastructure impact');
    }

    if (policyData.type === 'security' && policyData.enabled === false) {
      warnings.push('Security policies should not be disabled unless temporarily for testing');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  validateToolSpecificRules(policyData) {
    const errors = [];
    const warnings = [];
    
    const toolConfig = this.config.TOOL_CONFIGURATIONS[policyData.tool_id];
    
    if (!toolConfig) {
      errors.push(`Unknown tool_id: ${policyData.tool_id}`);
      return { valid: false, errors, warnings };
    }

    // Validate rules against tool configuration
    for (const rule of policyData.rules || []) {
      // Validate resource types
      if (rule.resource_type && !toolConfig.resource_types.includes(rule.resource_type)) {
        errors.push(`Rule "${rule.name}": Invalid resource_type "${rule.resource_type}" for tool ${policyData.tool_id}`);
      }

      // Validate actions
      const ruleActions = Array.isArray(rule.action) ? rule.action : [rule.action];
      for (const action of ruleActions) {
        if (action !== 'allow' && action !== 'deny' && !toolConfig.actions.includes(action)) {
          warnings.push(`Rule "${rule.name}": Action "${action}" may not be supported by tool ${policyData.tool_id}`);
        }
      }

      // Validate role requirements against tool roles
      if (rule.role_requirements) {
        for (const role of rule.role_requirements) {
          if (!toolConfig.roles.includes(role)) {
            warnings.push(`Rule "${rule.name}": Role "${role}" may not be valid for tool ${policyData.tool_id}`);
          }
        }
      }
    }

    // Tool-specific best practices
    switch (policyData.tool_id) {
      case 'github':
        this.validateGitHubPolicyRules(policyData, errors, warnings);
        break;
      case 'terraform':
        this.validateTerraformPolicyRules(policyData, errors, warnings);
        break;
      case 'jenkins':
        this.validateJenkinsPolicyRules(policyData, errors, warnings);
        break;
      // Add more tool-specific validations as needed
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  validatePolicyPerformance(policyData) {
    const warnings = [];
    const recommendations = [];

    // Check rule complexity
    const totalRules = policyData.rules?.length || 0;
    if (totalRules > 20) {
      warnings.push('Policy has many rules (>20) which may impact evaluation performance');
      recommendations.push('Consider splitting complex policies into multiple focused policies');
    }

    // Check condition complexity
    for (const rule of policyData.rules || []) {
      if (rule.conditions) {
        const conditionCount = Object.keys(rule.conditions).length;
        if (conditionCount > 10) {
          warnings.push(`Rule "${rule.name}" has many conditions (${conditionCount}) which may slow evaluation`);
        }
      }

      // Check for regex patterns that might be slow
      if (rule.resource_pattern && rule.resource_pattern.includes('.*.*')) {
        warnings.push(`Rule "${rule.name}" uses complex regex patterns that may impact performance`);
      }
    }

    // Check priority distribution
    const priorities = policyData.rules?.map(r => r.priority || 1) || [];
    const maxPriority = Math.max(...priorities);
    const minPriority = Math.min(...priorities);
    
    if (maxPriority - minPriority > 50) {
      recommendations.push('Large priority gaps between rules - consider normalizing priorities');
    }

    return { warnings, recommendations };
  }

  validateComplianceAlignment(policyData) {
    const warnings = [];
    const recommendations = [];

    const framework = policyData.compliance_framework;
    const frameworkConfig = this.config.COMPLIANCE_FRAMEWORKS[framework];

    if (!frameworkConfig) {
      warnings.push(`Unknown compliance framework: ${framework}`);
      return { warnings, recommendations };
    }

    // Framework-specific validations
    switch (framework) {
      case 'SOX':
        if (policyData.type !== 'compliance' && policyData.type !== 'governance') {
          warnings.push('SOX policies should typically be of type "compliance" or "governance"');
        }
        if (!policyData.regulatory_requirement) {
          recommendations.push('SOX policies should specify the specific regulatory requirement');
        }
        break;

      case 'GDPR':
        if (policyData.tool_id && !['github', 'gitlab', 'jira', 'servicenow'].includes(policyData.tool_id)) {
          warnings.push('GDPR policies typically apply to tools that handle personal data');
        }
        break;

      case 'PCI-DSS':
        if (policyData.risk_level !== 'high' && policyData.risk_level !== 'critical') {
          recommendations.push('PCI-DSS policies should typically have high or critical risk level');
        }
        break;
    }

    return { warnings, recommendations };
  }

  // ============================================================================
  // COMPLIANCE RULE VALIDATION
  // ============================================================================

  async validateComplianceRule(ruleData) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: []
    };

    try {
      // Schema validation
      this.complianceRuleSchema.parse(ruleData);

      // Business logic validation
      const businessResult = this.validateComplianceRuleBusinessLogic(ruleData);
      results.warnings.push(...businessResult.warnings);
      results.recommendations.push(...businessResult.recommendations);

    } catch (error) {
      if (error instanceof z.ZodError) {
        results.valid = false;
        results.errors.push(...error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ));
      } else {
        results.valid = false;
        results.errors.push(`Validation error: ${error.message}`);
      }
    }

    return results;
  }

  validateComplianceRuleBusinessLogic(ruleData) {
    const warnings = [];
    const recommendations = [];

    // Check assessment frequency vs. risk level alignment
    const riskFrequencyMap = {
      'critical': ['continuous', 'daily'],
      'high': ['continuous', 'daily', 'weekly'],
      'medium': ['daily', 'weekly', 'monthly'],
      'low': ['weekly', 'monthly', 'quarterly']
    };

    const appropriateFrequencies = riskFrequencyMap[ruleData.risk_level];
    if (!appropriateFrequencies.includes(ruleData.assessment_frequency)) {
      warnings.push(`Assessment frequency "${ruleData.assessment_frequency}" may not align with risk level "${ruleData.risk_level}"`);
    }

    // Check automated vs. manual assessment alignment
    if (ruleData.assessment_method === 'automated' && !ruleData.automated_check) {
      warnings.push('Automated assessment method specified but no automated_check configuration provided');
    }

    if (ruleData.assessment_method === 'manual' && ruleData.automated_check) {
      warnings.push('Manual assessment method specified but automated_check configuration provided');
    }

    // Framework-specific recommendations
    if (ruleData.framework === 'SOX' && ruleData.assessment_frequency !== 'continuous') {
      recommendations.push('SOX controls benefit from continuous monitoring where possible');
    }

    return { warnings, recommendations };
  }

  // ============================================================================
  // TOOL-SPECIFIC VALIDATIONS
  // ============================================================================

  validateGitHubPolicyRules(policyData, errors, warnings) {
    for (const rule of policyData.rules || []) {
      // GitHub-specific validations
      if (rule.resource_type === 'repository' && rule.action === 'admin' && !rule.role_requirements) {
        warnings.push(`Rule "${rule.name}": Repository admin access should require specific roles`);
      }

      if (rule.conditions?.branch && !rule.conditions.branch.includes('main') && !rule.conditions.branch.includes('master')) {
        recommendations.push(`Rule "${rule.name}": Consider protecting main/master branches`);
      }
    }
  }

  validateTerraformPolicyRules(policyData, errors, warnings) {
    for (const rule of policyData.rules || []) {
      // Terraform-specific validations
      if (rule.action === 'apply' && rule.environment === 'production' && !rule.conditions?.approval_required) {
        warnings.push(`Rule "${rule.name}": Production Terraform applies should require approval`);
      }

      if (rule.resource_type === 'workspace' && rule.action === 'destroy' && rule.priority < 900) {
        warnings.push(`Rule "${rule.name}": Terraform destroy operations should have very high priority`);
      }
    }
  }

  validateJenkinsPolicyRules(policyData, errors, warnings) {
    for (const rule of policyData.rules || []) {
      // Jenkins-specific validations
      if (rule.resource_type === 'job' && rule.action === 'configure' && !rule.role_requirements?.includes('admin')) {
        warnings.push(`Rule "${rule.name}": Job configuration should typically require admin role`);
      }
    }
  }

  // ============================================================================
  // HELPER VALIDATIONS
  // ============================================================================

  validateTimeRestrictions(timeRestrictions) {
    const errors = [];

    if (timeRestrictions.business_hours) {
      const { start, end } = timeRestrictions.business_hours;
      
      if (typeof start !== 'number' || start < 0 || start > 23) {
        errors.push('business_hours.start must be a number between 0 and 23');
      }
      
      if (typeof end !== 'number' || end < 0 || end > 23) {
        errors.push('business_hours.end must be a number between 0 and 23');
      }
      
      if (start >= end) {
        errors.push('business_hours.start must be less than business_hours.end');
      }
    }

    if (timeRestrictions.business_days) {
      if (!Array.isArray(timeRestrictions.business_days)) {
        errors.push('business_days must be an array');
      } else {
        for (const day of timeRestrictions.business_days) {
          if (typeof day !== 'number' || day < 0 || day > 6) {
            errors.push('business_days must contain numbers between 0 (Sunday) and 6 (Saturday)');
            break;
          }
        }
      }
    }

    if (timeRestrictions.valid_from) {
      try {
        new Date(timeRestrictions.valid_from);
      } catch {
        errors.push('valid_from must be a valid ISO date string');
      }
    }

    if (timeRestrictions.valid_until) {
      try {
        new Date(timeRestrictions.valid_until);
      } catch {
        errors.push('valid_until must be a valid ISO date string');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================================================
  // VALIDATION UTILITIES
  // ============================================================================

  validateJsonPath(path) {
    try {
      // Simple JSONPath validation - could be enhanced with a proper parser
      return path.startsWith('$.') && !path.includes('..') && !path.includes('*');
    } catch {
      return false;
    }
  }

  validateRegexPattern(pattern) {
    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  }

  sanitizePolicyData(policyData) {
    // Remove potentially dangerous content
    const sanitized = { ...policyData };
    
    // Remove script tags and other dangerous content from strings
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return str.replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
    };

    // Recursively sanitize all string values
    const sanitizeObject = (obj) => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          obj[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitizeObject(value);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }
}

module.exports = PolicyValidator;
