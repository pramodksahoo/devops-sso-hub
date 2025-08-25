/**
 * Policy Engine for SSO Hub
 * Core rule-based policy evaluation engine with performance optimization
 */

const { v4: uuidv4 } = require('uuid');
const jp = require('jsonpath');

class PolicyEngine {
  constructor(fastify, config, databaseManager, cacheManager, auditLogger, toolIntegrationManager) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.cache = cacheManager;
    this.audit = auditLogger;
    this.toolIntegration = toolIntegrationManager;
    this.initialized = false;
  }

  async initialize() {
    // Warm up the cache with frequently used policies
    if (this.config.CACHE_WARM_UP_ON_START) {
      await this.warmUpCache();
    }
    
    this.initialized = true;
    this.fastify.log.info('✅ Policy Engine: Initialized with rule-based evaluation');
  }

  isInitialized() {
    return this.initialized;
  }

  // ============================================================================
  // POLICY MANAGEMENT
  // ============================================================================

  async listPolicies(filters, user) {
    return await this.db.getAllPolicies(filters, user);
  }

  async getPolicyById(id, user) {
    return await this.db.getPolicyById(id, user);
  }

  async createPolicy(policyData, user) {
    // Validate policy before creation
    const validation = await this.validatePolicyStructure(policyData);
    if (!validation.valid) {
      throw new Error(`Invalid policy structure: ${validation.errors.join(', ')}`);
    }

    const policy = await this.db.createPolicy(policyData, user);
    
    // Invalidate relevant cache entries
    await this.invalidatePolicyCache(policy.tool_id);
    
    return policy;
  }

  async updatePolicy(id, policyData, user) {
    const policy = await this.db.updatePolicy(id, policyData, user);
    
    if (policy) {
      // Invalidate relevant cache entries
      await this.invalidatePolicyCache(policy.tool_id);
    }
    
    return policy;
  }

  async deletePolicy(id, user) {
    // Get policy info before deletion for cache invalidation
    const policy = await this.db.getPolicyById(id, user);
    
    const success = await this.db.deletePolicy(id, user);
    
    if (success && policy) {
      // Invalidate relevant cache entries
      await this.invalidatePolicyCache(policy.tool_id);
    }
    
    return success;
  }

  // ============================================================================
  // POLICY ENFORCEMENT - CORE ENGINE
  // ============================================================================

  async enforcePolicy(enforcementRequest) {
    const startTime = Date.now();
    const correlationId = uuidv4();
    
    try {
      this.fastify.log.debug('Policy enforcement started', {
        correlation_id: correlationId,
        user: enforcementRequest.user.sub,
        tool: enforcementRequest.tool_slug,
        action: enforcementRequest.action,
        resource: enforcementRequest.resource_type
      });

      // Check cache first
      const cacheKey = this.buildCacheKey(enforcementRequest);
      let cached = false;
      
      if (this.config.ENABLE_POLICY_CACHING) {
        const cachedResult = await this.cache.get(cacheKey);
        if (cachedResult) {
          cached = true;
          this.fastify.log.debug('Policy enforcement cache hit', { correlation_id: correlationId });
          
          // Still record the enforcement for audit trail
          const enforcementData = {
            ...this.buildEnforcementData(enforcementRequest, cachedResult, correlationId),
            cache_hit: true,
            evaluation_duration_ms: Date.now() - startTime
          };
          
          await this.db.recordEnforcementResult(enforcementData);
          return cachedResult;
        }
      }

      // Get applicable policies
      const policies = await this.getApplicablePolicies(enforcementRequest);
      
      // Evaluate policies
      const evaluationResult = await this.evaluatePolicies(policies, enforcementRequest);
      
      // Build final decision
      const decision = this.buildPolicyDecision(evaluationResult, enforcementRequest);
      
      // Cache the result
      if (this.config.ENABLE_POLICY_CACHING && decision.decision !== 'error') {
        await this.cache.set(cacheKey, decision, this.config.POLICY_CACHE_TTL_SECONDS);
      }
      
      // Record enforcement result
      const enforcementData = {
        ...this.buildEnforcementData(enforcementRequest, decision, correlationId),
        policies_evaluated: policies.map(p => p.id),
        rules_matched: evaluationResult.matchedRules.map(r => r.id),
        cache_hit: cached,
        evaluation_duration_ms: Date.now() - startTime
      };
      
      await this.db.recordEnforcementResult(enforcementData);
      
      this.fastify.log.debug('Policy enforcement completed', {
        correlation_id: correlationId,
        decision: decision.decision,
        duration_ms: Date.now() - startTime,
        policies_evaluated: policies.length,
        rules_matched: evaluationResult.matchedRules.length
      });

      return decision;
      
    } catch (error) {
      this.fastify.log.error('Policy enforcement failed', {
        correlation_id: correlationId,
        error: error.message,
        stack: error.stack
      });
      
      // Return deny decision on error
      const errorDecision = {
        decision: 'deny',
        reason: 'Policy evaluation error',
        confidence_score: 0.0,
        evaluation_id: correlationId,
        timestamp: new Date(),
        error: error.message
      };
      
      // Record error for audit
      const enforcementData = {
        ...this.buildEnforcementData(enforcementRequest, errorDecision, correlationId),
        evaluation_duration_ms: Date.now() - startTime
      };
      
      await this.db.recordEnforcementResult(enforcementData);
      
      return errorDecision;
    }
  }

  async getApplicablePolicies(enforcementRequest) {
    const { tool_slug, action, resource_type } = enforcementRequest;
    
    // Check cache for policies
    const cacheKey = `policies:${tool_slug}:${resource_type || 'any'}`;
    
    if (this.config.ENABLE_POLICY_CACHING) {
      const cachedPolicies = await this.cache.get(cacheKey);
      if (cachedPolicies) {
        return cachedPolicies;
      }
    }
    
    // Get policies from database
    const policies = await this.db.getPoliciesForEvaluation(tool_slug, action, resource_type);
    
    // Cache policies for future use
    if (this.config.ENABLE_POLICY_CACHING) {
      await this.cache.set(cacheKey, policies, this.config.POLICY_CACHE_TTL_SECONDS);
    }
    
    return policies;
  }

  async evaluatePolicies(policies, enforcementRequest) {
    const evaluationContext = await this.buildEvaluationContext(enforcementRequest);
    const matchedRules = [];
    const policyResults = [];
    
    for (const policy of policies) {
      const policyResult = await this.evaluatePolicy(policy, evaluationContext);
      policyResults.push(policyResult);
      
      if (policyResult.matched) {
        matchedRules.push(...policyResult.matchedRules);
      }
      
      // Early termination for high-priority deny decisions
      if (policyResult.decision === 'deny' && policy.priority >= 500) {
        this.fastify.log.debug('Early termination due to high-priority deny policy', {
          policy_id: policy.policy_id,
          priority: policy.priority
        });
        break;
      }
    }
    
    return {
      policyResults,
      matchedRules,
      evaluationContext
    };
  }

  async evaluatePolicy(policy, context) {
    const matchedRules = [];
    let policyDecision = null;
    let policyMatched = false;
    
    // Check policy-level conditions first
    if (policy.conditions && Object.keys(policy.conditions).length > 0) {
      const conditionsMet = this.evaluateConditions(policy.conditions, context);
      if (!conditionsMet) {
        return {
          policy: policy,
          matched: false,
          decision: null,
          matchedRules: [],
          reason: 'Policy conditions not met'
        };
      }
    }
    
    // Evaluate rules within the policy
    if (policy.policy_rules) {
      for (const rule of policy.policy_rules) {
        if (!rule.enabled) continue;
        
        const ruleResult = await this.evaluateRule(rule, context);
        if (ruleResult.matched) {
          matchedRules.push({
            ...rule,
            match_reason: ruleResult.reason,
            context_values: ruleResult.contextValues
          });
          
          policyMatched = true;
          
          // Apply combining algorithm for multiple rules
          if (policyDecision === null) {
            policyDecision = rule.action;
          } else {
            policyDecision = this.applyCombiningAlgorithm(policyDecision, rule.action);
          }
          
          // Early termination for deny decisions
          if (rule.action === 'deny' && this.config.PDP_CONFIG.combining_algorithm === 'deny_overrides') {
            break;
          }
        }
      }
    }
    
    return {
      policy: policy,
      matched: policyMatched,
      decision: policyDecision,
      matchedRules: matchedRules,
      reason: policyMatched ? 'Policy rules matched' : 'No rules matched'
    };
  }

  async evaluateRule(rule, context) {
    let matched = false;
    const contextValues = {};
    const reasons = [];
    
    // Evaluate rule conditions
    if (rule.conditions && Object.keys(rule.conditions).length > 0) {
      const conditionResult = this.evaluateConditions(rule.conditions, context);
      if (!conditionResult.matched) {
        return {
          matched: false,
          reason: `Rule conditions not met: ${conditionResult.reason}`,
          contextValues: {}
        };
      }
      contextValues.conditions = conditionResult.values;
      reasons.push('Conditions matched');
    }
    
    // Check resource type
    if (rule.resource_type && context.resource_type) {
      if (rule.resource_type !== context.resource_type) {
        return {
          matched: false,
          reason: `Resource type mismatch: expected ${rule.resource_type}, got ${context.resource_type}`,
          contextValues: {}
        };
      }
      reasons.push(`Resource type: ${rule.resource_type}`);
    }
    
    // Check action
    if (rule.action && context.action) {
      // Simple action matching for now - could be enhanced with patterns
      const ruleActions = Array.isArray(rule.action) ? rule.action : [rule.action];
      if (!ruleActions.includes(context.action) && !ruleActions.includes('*')) {
        return {
          matched: false,
          reason: `Action not allowed: ${context.action}`,
          contextValues: {}
        };
      }
      reasons.push(`Action: ${context.action}`);
    }
    
    // Check role requirements
    if (rule.role_requirements && rule.role_requirements.length > 0) {
      const userRoles = context.user.roles || [];
      const hasRequiredRole = rule.role_requirements.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        return {
          matched: false,
          reason: `User lacks required roles: ${rule.role_requirements.join(', ')}`,
          contextValues: {}
        };
      }
      reasons.push(`Roles: ${rule.role_requirements.join(', ')}`);
    }
    
    // Check time restrictions
    if (rule.time_restrictions && Object.keys(rule.time_restrictions).length > 0) {
      const timeCheck = this.evaluateTimeRestrictions(rule.time_restrictions, context.timestamp);
      if (!timeCheck.allowed) {
        return {
          matched: false,
          reason: `Time restriction: ${timeCheck.reason}`,
          contextValues: {}
        };
      }
      reasons.push(`Time: ${timeCheck.reason}`);
    }
    
    // Check environment
    if (rule.environment && context.environment) {
      if (rule.environment !== context.environment) {
        return {
          matched: false,
          reason: `Environment mismatch: expected ${rule.environment}, got ${context.environment}`,
          contextValues: {}
        };
      }
      reasons.push(`Environment: ${rule.environment}`);
    }
    
    return {
      matched: true,
      reason: reasons.join('; '),
      contextValues: contextValues
    };
  }

  evaluateConditions(conditions, context) {
    try {
      // Simple condition evaluation - can be enhanced with more complex logic
      for (const [key, value] of Object.entries(conditions)) {
        const contextValue = jp.value(context, `$.${key}`);
        
        if (Array.isArray(value)) {
          if (!value.includes(contextValue)) {
            return {
              matched: false,
              reason: `Condition ${key}: ${contextValue} not in [${value.join(', ')}]`,
              values: {}
            };
          }
        } else if (typeof value === 'object' && value !== null) {
          // Handle complex conditions (operators)
          if (value.$in && !value.$in.includes(contextValue)) {
            return {
              matched: false,
              reason: `Condition ${key}: ${contextValue} not in ${JSON.stringify(value.$in)}`,
              values: {}
            };
          }
          if (value.$eq && contextValue !== value.$eq) {
            return {
              matched: false,
              reason: `Condition ${key}: ${contextValue} !== ${value.$eq}`,
              values: {}
            };
          }
        } else {
          if (contextValue !== value) {
            return {
              matched: false,
              reason: `Condition ${key}: ${contextValue} !== ${value}`,
              values: {}
            };
          }
        }
      }
      
      return {
        matched: true,
        reason: 'All conditions met',
        values: conditions
      };
    } catch (error) {
      this.fastify.log.error('Condition evaluation error:', error);
      return {
        matched: false,
        reason: `Condition evaluation error: ${error.message}`,
        values: {}
      };
    }
  }

  evaluateTimeRestrictions(timeRestrictions, timestamp) {
    const now = timestamp || new Date();
    
    // Business hours check
    if (timeRestrictions.business_hours_only) {
      const hour = now.getHours();
      const day = now.getDay(); // 0 = Sunday, 6 = Saturday
      
      const businessHours = timeRestrictions.business_hours || { start: 9, end: 17 };
      const businessDays = timeRestrictions.business_days || [1, 2, 3, 4, 5]; // Mon-Fri
      
      if (!businessDays.includes(day)) {
        return {
          allowed: false,
          reason: 'Outside business days'
        };
      }
      
      if (hour < businessHours.start || hour >= businessHours.end) {
        return {
          allowed: false,
          reason: 'Outside business hours'
        };
      }
    }
    
    // Date range check
    if (timeRestrictions.valid_from) {
      const validFrom = new Date(timeRestrictions.valid_from);
      if (now < validFrom) {
        return {
          allowed: false,
          reason: 'Before valid start date'
        };
      }
    }
    
    if (timeRestrictions.valid_until) {
      const validUntil = new Date(timeRestrictions.valid_until);
      if (now > validUntil) {
        return {
          allowed: false,
          reason: 'After valid end date'
        };
      }
    }
    
    return {
      allowed: true,
      reason: 'Time restrictions satisfied'
    };
  }

  applyCombiningAlgorithm(currentDecision, newDecision) {
    const algorithm = this.config.PDP_CONFIG.combining_algorithm;
    
    switch (algorithm) {
      case 'deny_overrides':
        return (currentDecision === 'deny' || newDecision === 'deny') ? 'deny' : 'allow';
      
      case 'permit_overrides':
        return (currentDecision === 'allow' || newDecision === 'allow') ? 'allow' : 'deny';
      
      case 'first_applicable':
        return currentDecision;
      
      default:
        return currentDecision;
    }
  }

  buildPolicyDecision(evaluationResult, enforcementRequest) {
    const { policyResults, matchedRules } = evaluationResult;
    
    let finalDecision = this.config.PDP_CONFIG.default_decision;
    let highestPriorityPolicy = null;
    let decisionReason = 'No policies matched';
    let confidenceScore = 0.0;
    
    // Find the highest priority decision
    for (const policyResult of policyResults) {
      if (policyResult.matched && policyResult.decision) {
        if (!highestPriorityPolicy || policyResult.policy.priority > highestPriorityPolicy.priority) {
          highestPriorityPolicy = policyResult.policy;
          finalDecision = policyResult.decision;
          decisionReason = `Policy ${policyResult.policy.policy_id}: ${policyResult.reason}`;
          confidenceScore = this.calculateConfidenceScore(policyResult);
        }
      }
    }
    
    // Override decisions based on combining algorithm
    const denyDecisions = policyResults.filter(r => r.matched && r.decision === 'deny');
    const allowDecisions = policyResults.filter(r => r.matched && r.decision === 'allow');
    
    if (this.config.PDP_CONFIG.combining_algorithm === 'deny_overrides' && denyDecisions.length > 0) {
      finalDecision = 'deny';
      const highestDenyPolicy = denyDecisions.reduce((prev, curr) => 
        prev.policy.priority > curr.policy.priority ? prev : curr
      );
      decisionReason = `Denied by policy ${highestDenyPolicy.policy.policy_id}`;
      confidenceScore = this.calculateConfidenceScore(highestDenyPolicy);
    } else if (this.config.PDP_CONFIG.combining_algorithm === 'permit_overrides' && allowDecisions.length > 0) {
      finalDecision = 'allow';
      const highestAllowPolicy = allowDecisions.reduce((prev, curr) => 
        prev.policy.priority > curr.policy.priority ? prev : curr
      );
      decisionReason = `Allowed by policy ${highestAllowPolicy.policy.policy_id}`;
      confidenceScore = this.calculateConfidenceScore(highestAllowPolicy);
    }
    
    return {
      decision: finalDecision,
      reason: decisionReason,
      confidence_score: confidenceScore,
      evaluation_id: uuidv4(),
      timestamp: new Date(),
      primary_policy: highestPriorityPolicy ? {
        id: highestPriorityPolicy.id,
        policy_id: highestPriorityPolicy.policy_id,
        name: highestPriorityPolicy.name,
        type: highestPriorityPolicy.type
      } : null,
      matched_rules: matchedRules.map(rule => ({
        rule_id: rule.rule_id,
        name: rule.name,
        action: rule.action,
        match_reason: rule.match_reason
      })),
      evaluation_summary: {
        policies_evaluated: policyResults.length,
        policies_matched: policyResults.filter(r => r.matched).length,
        rules_matched: matchedRules.length,
        decision_basis: this.config.PDP_CONFIG.combining_algorithm
      }
    };
  }

  calculateConfidenceScore(policyResult) {
    let score = 0.5; // Base score
    
    // Increase confidence based on rule specificity
    const rulesMatched = policyResult.matchedRules.length;
    if (rulesMatched > 0) {
      score += Math.min(rulesMatched * 0.1, 0.3);
    }
    
    // Increase confidence based on policy priority
    const priority = policyResult.policy.priority;
    if (priority >= 500) {
      score += 0.2;
    } else if (priority >= 300) {
      score += 0.1;
    }
    
    // Ensure score is between 0 and 1
    return Math.min(Math.max(score, 0.0), 1.0);
  }

  async buildEvaluationContext(enforcementRequest) {
    const context = {
      user: enforcementRequest.user,
      tool_slug: enforcementRequest.tool_slug,
      action: enforcementRequest.action,
      resource_type: enforcementRequest.resource_type,
      resource_id: enforcementRequest.resource_id,
      resource_name: enforcementRequest.resource_name,
      timestamp: enforcementRequest.timestamp || new Date(),
      request_id: enforcementRequest.request_id,
      environment: this.detectEnvironment(enforcementRequest),
      ...enforcementRequest.context
    };
    
    // Enrich context with additional attributes from tool integration
    if (this.toolIntegration) {
      try {
        const toolContext = await this.toolIntegration.getResourceContext(
          enforcementRequest.tool_slug,
          enforcementRequest.resource_type,
          enforcementRequest.resource_id
        );
        Object.assign(context, toolContext);
      } catch (error) {
        this.fastify.log.warn('Failed to get tool context:', error);
      }
    }
    
    return context;
  }

  detectEnvironment(enforcementRequest) {
    // Simple environment detection - can be enhanced
    const resourceName = enforcementRequest.resource_name || '';
    const resourceId = enforcementRequest.resource_id || '';
    
    if (resourceName.includes('prod') || resourceId.includes('prod')) {
      return 'production';
    } else if (resourceName.includes('stage') || resourceId.includes('stage')) {
      return 'staging';
    } else if (resourceName.includes('dev') || resourceId.includes('dev')) {
      return 'development';
    }
    
    return 'unknown';
  }

  // ============================================================================
  // ENFORCEMENT HISTORY
  // ============================================================================

  async getEnforcementResult(id) {
    return await this.db.getEnforcementResult(id);
  }

  async getEnforcementHistory(filters, user) {
    return await this.db.getEnforcementHistory(filters, user);
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  buildCacheKey(enforcementRequest) {
    const keyParts = [
      'policy_decision',
      enforcementRequest.user.sub,
      enforcementRequest.tool_slug,
      enforcementRequest.action,
      enforcementRequest.resource_type || 'any',
      enforcementRequest.resource_id || 'any'
    ];
    
    return keyParts.join(':');
  }

  async invalidatePolicyCache(toolId = null) {
    if (!this.config.ENABLE_POLICY_CACHING) return;
    
    try {
      if (toolId) {
        // Invalidate cache for specific tool
        const pattern = `policies:${toolId}:*`;
        await this.cache.deleteByPattern(pattern);
        
        // Also invalidate decision cache for this tool
        const decisionPattern = `policy_decision:*:${toolId}:*`;
        await this.cache.deleteByPattern(decisionPattern);
      } else {
        // Invalidate all policy caches
        await this.cache.deleteByPattern('policies:*');
        await this.cache.deleteByPattern('policy_decision:*');
      }
      
      this.fastify.log.debug('Policy cache invalidated', { tool_id: toolId });
    } catch (error) {
      this.fastify.log.error('Failed to invalidate policy cache:', error);
    }
  }

  async warmUpCache() {
    try {
      this.fastify.log.info('Warming up policy cache...');
      
      // Pre-load frequently used policies for each tool
      const tools = Object.keys(this.config.TOOL_CONFIGURATIONS);
      
      for (const tool of tools) {
        await this.getApplicablePolicies({ tool_slug: tool, action: 'read' });
      }
      
      this.fastify.log.info('Policy cache warm-up completed');
    } catch (error) {
      this.fastify.log.error('Policy cache warm-up failed:', error);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  buildEnforcementData(enforcementRequest, decision, correlationId) {
    return {
      request_id: enforcementRequest.request_id,
      correlation_id: correlationId,
      user_id: enforcementRequest.user.sub,
      user_email: enforcementRequest.user.email,
      user_roles: enforcementRequest.user.roles,
      tool_slug: enforcementRequest.tool_slug,
      resource_type: enforcementRequest.resource_type,
      resource_id: enforcementRequest.resource_id,
      resource_name: enforcementRequest.resource_name,
      action: enforcementRequest.action,
      decision: decision.decision,
      decision_reason: decision.reason,
      confidence_score: decision.confidence_score,
      primary_policy_id: decision.primary_policy?.id,
      matched_rules: decision.matched_rules || [],
      client_type: 'api'
    };
  }

  async validatePolicyStructure(policyData) {
    const errors = [];
    
    // Basic validation
    if (!policyData.policy_id) errors.push('policy_id is required');
    if (!policyData.name) errors.push('name is required');
    if (!policyData.type) errors.push('type is required');
    if (!policyData.category) errors.push('category is required');
    
    // Validate rules structure
    if (policyData.rules && Array.isArray(policyData.rules)) {
      for (let i = 0; i < policyData.rules.length; i++) {
        const rule = policyData.rules[i];
        if (!rule.name) errors.push(`Rule ${i}: name is required`);
        if (!rule.action) errors.push(`Rule ${i}: action is required`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = PolicyEngine;
