/**
 * Database Manager for Policy Service
 * Handles all database operations for policies, rules, compliance, and enforcement
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
  // POLICY MANAGEMENT
  // ============================================================================

  async getAllPolicies(filters = {}, user) {
    const { type, tool_id, enabled, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (type) {
      paramCount++;
      whereClause += ` AND type = $${paramCount}`;
      params.push(type);
    }

    if (tool_id) {
      paramCount++;
      whereClause += ` AND tool_id = $${paramCount}`;
      params.push(tool_id);
    }

    if (enabled !== undefined) {
      paramCount++;
      whereClause += ` AND enabled = $${paramCount}`;
      params.push(enabled);
    }

    // Add authorization check for non-admin users
    if (!user.isAdmin) {
      paramCount++;
      whereClause += ` AND (tool_id IS NULL OR tool_id = ANY($${paramCount}))`;
      // For now, allow access to policies for tools user has access to
      params.push(['github', 'gitlab']); // This should come from user's actual tool access
    }

    const countQuery = `
      SELECT COUNT(*) as total FROM policies ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        id, policy_id, name, description, type, category, tool_id, tool_scope,
        priority, enabled, rules, conditions, effects, version,
        compliance_framework, regulatory_requirement, risk_level,
        effective_from, effective_until,
        created_by, created_at, updated_by, updated_at
      FROM policies 
      ${whereClause}
      ORDER BY priority DESC, created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      this.db.query(countQuery, params.slice(0, paramCount)),
      this.db.query(dataQuery, params)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    return {
      policies: dataResult.rows,
      pagination: {
        page,
        limit,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      },
      total
    };
  }

  async getPolicyById(id, user) {
    const query = `
      SELECT 
        p.*,
        array_agg(
          json_build_object(
            'id', pr.id,
            'rule_id', pr.rule_id,
            'name', pr.name,
            'description', pr.description,
            'conditions', pr.conditions,
            'effects', pr.effects,
            'priority', pr.priority,
            'enabled', pr.enabled,
            'action', pr.action,
            'resource_type', pr.resource_type
          ) ORDER BY pr.priority DESC
        ) FILTER (WHERE pr.id IS NOT NULL) as policy_rules
      FROM policies p
      LEFT JOIN policy_rules pr ON p.id = pr.policy_id
      WHERE p.id = $1
      GROUP BY p.id
    `;

    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const policy = result.rows[0];
    
    // Authorization check
    if (!user.isAdmin && policy.tool_id && !this.userHasToolAccess(user, policy.tool_id)) {
      return null;
    }

    return policy;
  }

  async createPolicy(policyData, user) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const policyQuery = `
        INSERT INTO policies (
          policy_id, name, description, type, category, tool_id, tool_scope,
          scope_identifier, priority, enabled, rules, conditions, effects,
          compliance_framework, regulatory_requirement, business_justification,
          risk_level, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) RETURNING *
      `;

      const policyValues = [
        policyData.policy_id,
        policyData.name,
        policyData.description,
        policyData.type,
        policyData.category,
        policyData.tool_id || null,
        policyData.tool_scope || null,
        policyData.scope_identifier || null,
        policyData.priority || 100,
        policyData.enabled !== false,
        JSON.stringify(policyData.rules || []),
        JSON.stringify(policyData.conditions || {}),
        JSON.stringify(policyData.effects || {}),
        policyData.compliance_framework || null,
        policyData.regulatory_requirement || null,
        policyData.business_justification || null,
        policyData.risk_level || 'medium',
        user.sub
      ];

      const policyResult = await client.query(policyQuery, policyValues);
      const policy = policyResult.rows[0];

      // Insert policy rules if provided
      if (policyData.rules && Array.isArray(policyData.rules)) {
        for (const rule of policyData.rules) {
          const ruleQuery = `
            INSERT INTO policy_rules (
              policy_id, rule_id, name, description, conditions, effects,
              priority, enabled, action, action_parameters, resource_type,
              resource_pattern, user_pattern, group_pattern, role_requirements,
              time_restrictions, environment, location_restrictions
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
            )
          `;

          const ruleValues = [
            policy.id,
            rule.rule_id || `rule-${Date.now()}`,
            rule.name,
            rule.description || null,
            JSON.stringify(rule.conditions || {}),
            JSON.stringify(rule.effects || {}),
            rule.priority || 1,
            rule.enabled !== false,
            rule.action || 'allow',
            JSON.stringify(rule.action_parameters || {}),
            rule.resource_type || null,
            rule.resource_pattern || null,
            rule.user_pattern || null,
            rule.group_pattern || null,
            rule.role_requirements || [],
            JSON.stringify(rule.time_restrictions || {}),
            rule.environment || null,
            rule.location_restrictions || []
          ];

          await client.query(ruleQuery, ruleValues);
        }
      }

      await client.query('COMMIT');
      return policy;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updatePolicy(id, policyData, user) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // First check if policy exists and user has permission
      const existingPolicy = await this.getPolicyById(id, user);
      if (!existingPolicy) {
        return null;
      }

      const updateQuery = `
        UPDATE policies SET
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          type = COALESCE($4, type),
          category = COALESCE($5, category),
          tool_id = COALESCE($6, tool_id),
          priority = COALESCE($7, priority),
          enabled = COALESCE($8, enabled),
          rules = COALESCE($9, rules),
          conditions = COALESCE($10, conditions),
          effects = COALESCE($11, effects),
          compliance_framework = COALESCE($12, compliance_framework),
          risk_level = COALESCE($13, risk_level),
          updated_by = $14,
          updated_at = NOW(),
          version = version + 1
        WHERE id = $1
        RETURNING *
      `;

      const values = [
        id,
        policyData.name,
        policyData.description,
        policyData.type,
        policyData.category,
        policyData.tool_id,
        policyData.priority,
        policyData.enabled,
        policyData.rules ? JSON.stringify(policyData.rules) : null,
        policyData.conditions ? JSON.stringify(policyData.conditions) : null,
        policyData.effects ? JSON.stringify(policyData.effects) : null,
        policyData.compliance_framework,
        policyData.risk_level,
        user.sub
      ];

      const result = await client.query(updateQuery, values);
      
      // Update rules if provided
      if (policyData.rules && Array.isArray(policyData.rules)) {
        // Delete existing rules
        await client.query('DELETE FROM policy_rules WHERE policy_id = $1', [id]);
        
        // Insert new rules
        for (const rule of policyData.rules) {
          const ruleQuery = `
            INSERT INTO policy_rules (
              policy_id, rule_id, name, description, conditions, effects,
              priority, enabled, action, resource_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `;

          const ruleValues = [
            id,
            rule.rule_id || `rule-${Date.now()}`,
            rule.name,
            rule.description || null,
            JSON.stringify(rule.conditions || {}),
            JSON.stringify(rule.effects || {}),
            rule.priority || 1,
            rule.enabled !== false,
            rule.action || 'allow',
            rule.resource_type || null
          ];

          await client.query(ruleQuery, ruleValues);
        }
      }

      await client.query('COMMIT');
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deletePolicy(id, user) {
    // Check if policy exists and user has permission
    const policy = await this.getPolicyById(id, user);
    if (!policy) {
      return false;
    }

    const query = 'DELETE FROM policies WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    return result.rowCount > 0;
  }

  // ============================================================================
  // POLICY ENFORCEMENT
  // ============================================================================

  async recordEnforcementResult(enforcementData) {
    const query = `
      INSERT INTO policy_enforcement_results (
        request_id, session_id, correlation_id, user_id, user_email, user_roles,
        user_groups, tool_slug, resource_type, resource_id, resource_name,
        action, policies_evaluated, rules_matched, decision, decision_reason,
        confidence_score, primary_policy_id, matched_rules, evaluation_duration_ms,
        cache_hit, source_ip, user_agent, client_type, risk_score, anomaly_detected
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      ) RETURNING id
    `;

    const values = [
      enforcementData.request_id,
      enforcementData.session_id || null,
      enforcementData.correlation_id || null,
      enforcementData.user_id,
      enforcementData.user_email,
      enforcementData.user_roles || [],
      enforcementData.user_groups || [],
      enforcementData.tool_slug,
      enforcementData.resource_type || null,
      enforcementData.resource_id || null,
      enforcementData.resource_name || null,
      enforcementData.action,
      enforcementData.policies_evaluated || [],
      enforcementData.rules_matched || [],
      enforcementData.decision,
      enforcementData.decision_reason,
      enforcementData.confidence_score || null,
      enforcementData.primary_policy_id || null,
      JSON.stringify(enforcementData.matched_rules || []),
      enforcementData.evaluation_duration_ms || null,
      enforcementData.cache_hit || false,
      enforcementData.source_ip || null,
      enforcementData.user_agent || null,
      enforcementData.client_type || 'unknown',
      enforcementData.risk_score || null,
      enforcementData.anomaly_detected || false
    ];

    const result = await this.db.query(query, values);
    return result.rows[0].id;
  }

  async getEnforcementResult(id) {
    const query = `
      SELECT * FROM policy_enforcement_results WHERE id = $1
    `;
    
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async getEnforcementHistory(filters = {}, user) {
    const { user_id, tool_slug, decision, from_date, to_date, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (user_id) {
      paramCount++;
      whereClause += ` AND user_id = $${paramCount}`;
      params.push(user_id);
    }

    if (tool_slug) {
      paramCount++;
      whereClause += ` AND tool_slug = $${paramCount}`;
      params.push(tool_slug);
    }

    if (decision) {
      paramCount++;
      whereClause += ` AND decision = $${paramCount}`;
      params.push(decision);
    }

    if (from_date) {
      paramCount++;
      whereClause += ` AND timestamp >= $${paramCount}`;
      params.push(from_date);
    }

    if (to_date) {
      paramCount++;
      whereClause += ` AND timestamp <= $${paramCount}`;
      params.push(to_date);
    }

    // Non-admin users can only see their own enforcement history
    if (!user.isAdmin) {
      paramCount++;
      whereClause += ` AND user_id = $${paramCount}`;
      params.push(user.sub);
    }

    const query = `
      SELECT 
        id, request_id, user_id, user_email, tool_slug, resource_type,
        resource_id, action, decision, decision_reason, timestamp,
        evaluation_duration_ms, risk_score
      FROM policy_enforcement_results 
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);

    const result = await this.db.query(query, params);
    
    return {
      enforcement_results: result.rows,
      pagination: {
        page,
        limit,
        has_next: result.rows.length === limit,
        has_prev: page > 1
      }
    };
  }

  // ============================================================================
  // COMPLIANCE MANAGEMENT
  // ============================================================================

  async getAllComplianceRules(filters = {}, user) {
    const { framework, risk_level, enabled, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (framework) {
      paramCount++;
      whereClause += ` AND framework = $${paramCount}`;
      params.push(framework);
    }

    if (risk_level) {
      paramCount++;
      whereClause += ` AND risk_level = $${paramCount}`;
      params.push(risk_level);
    }

    if (enabled !== undefined) {
      paramCount++;
      whereClause += ` AND enabled = $${paramCount}`;
      params.push(enabled);
    }

    const query = `
      SELECT 
        id, rule_id, name, description, framework, control_id,
        requirement_text, assessment_method, assessment_frequency,
        risk_level, applicable_tools, enabled, created_at, updated_at
      FROM compliance_rules 
      ${whereClause}
      ORDER BY framework, risk_level DESC, created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);

    const result = await this.db.query(query, params);
    
    return {
      compliance_rules: result.rows,
      pagination: {
        page,
        limit,
        has_next: result.rows.length === limit,
        has_prev: page > 1
      }
    };
  }

  async createComplianceRule(ruleData, user) {
    const query = `
      INSERT INTO compliance_rules (
        rule_id, name, description, framework, control_id, requirement_text,
        implementation_guidance, assessment_method, assessment_frequency,
        risk_level, business_impact, applicable_tools, automated_check,
        effective_from, effective_until, enabled, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      ) RETURNING *
    `;

    const values = [
      ruleData.rule_id,
      ruleData.name,
      ruleData.description,
      ruleData.framework,
      ruleData.control_id || null,
      ruleData.requirement_text,
      ruleData.implementation_guidance || null,
      ruleData.assessment_method,
      ruleData.assessment_frequency,
      ruleData.risk_level,
      ruleData.business_impact || null,
      ruleData.applicable_tools || [],
      JSON.stringify(ruleData.automated_check || {}),
      ruleData.effective_from || new Date(),
      ruleData.effective_until || null,
      ruleData.enabled !== false,
      user.sub
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async updateComplianceRule(id, ruleData, user) {
    const query = `
      UPDATE compliance_rules SET
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        framework = COALESCE($4, framework),
        control_id = COALESCE($5, control_id),
        requirement_text = COALESCE($6, requirement_text),
        assessment_method = COALESCE($7, assessment_method),
        assessment_frequency = COALESCE($8, assessment_frequency),
        risk_level = COALESCE($9, risk_level),
        applicable_tools = COALESCE($10, applicable_tools),
        enabled = COALESCE($11, enabled),
        updated_by = $12,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      id,
      ruleData.name,
      ruleData.description,
      ruleData.framework,
      ruleData.control_id,
      ruleData.requirement_text,
      ruleData.assessment_method,
      ruleData.assessment_frequency,
      ruleData.risk_level,
      ruleData.applicable_tools,
      ruleData.enabled,
      user.sub
    ];

    const result = await this.db.query(query, values);
    return result.rows[0] || null;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  userHasToolAccess(user, toolId) {
    // This is a simplified check - in a real implementation,
    // this would check user's actual tool permissions
    return user.isAdmin || user.roles.includes('developer');
  }

  async getPoliciesForEvaluation(tool_slug, action, resource_type) {
    const query = `
      SELECT p.*, 
        array_agg(
          json_build_object(
            'id', pr.id,
            'rule_id', pr.rule_id,
            'name', pr.name,
            'conditions', pr.conditions,
            'effects', pr.effects,
            'priority', pr.priority,
            'enabled', pr.enabled,
            'action', pr.action,
            'resource_type', pr.resource_type,
            'role_requirements', pr.role_requirements
          ) ORDER BY pr.priority DESC
        ) FILTER (WHERE pr.id IS NOT NULL) as policy_rules
      FROM policies p
      LEFT JOIN policy_rules pr ON p.id = pr.policy_id AND pr.enabled = true
      WHERE p.enabled = true 
        AND (p.tool_id IS NULL OR p.tool_id = $1)
        AND (p.effective_from IS NULL OR p.effective_from <= NOW())
        AND (p.effective_until IS NULL OR p.effective_until >= NOW())
      GROUP BY p.id
      ORDER BY p.priority DESC
    `;

    const result = await this.db.query(query, [tool_slug]);
    return result.rows;
  }
}

module.exports = DatabaseManager;
