/**
 * Compliance Manager for Policy Service
 * Manages compliance rules, assessments, and reporting
 */

class ComplianceManager {
  constructor(fastify, config, databaseManager, auditLogger) {
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.audit = auditLogger;
  }

  async initialize() {
    this.fastify.log.info('✅ Compliance Manager: Initialized with framework support');
  }

  // ============================================================================
  // COMPLIANCE RULES MANAGEMENT
  // ============================================================================

  async listComplianceRules(filters, user) {
    return await this.db.getAllComplianceRules(filters, user);
  }

  async getComplianceRuleById(id, user) {
    const query = `
      SELECT * FROM compliance_rules WHERE id = $1
    `;
    
    const result = await this.fastify.pg.query(query, [id]);
    return result.rows[0] || null;
  }

  async createComplianceRule(ruleData, user) {
    return await this.db.createComplianceRule(ruleData, user);
  }

  async updateComplianceRule(id, ruleData, user) {
    return await this.db.updateComplianceRule(id, ruleData, user);
  }

  async deleteComplianceRule(id, user) {
    const query = 'DELETE FROM compliance_rules WHERE id = $1';
    const result = await this.fastify.pg.query(query, [id]);
    return result.rowCount > 0;
  }

  // ============================================================================
  // COMPLIANCE ASSESSMENTS
  // ============================================================================

  async createComplianceAssessment(assessmentData, user) {
    const query = `
      INSERT INTO compliance_assessments (
        assessment_id, compliance_rule_id, tool_slug, resource_type, resource_id,
        assessment_scope, assessment_method, assessment_date, assessor, status,
        compliance_score, findings, evidence, gaps_identified, remediation_required,
        remediation_plan, remediation_deadline, remediation_owner, next_assessment_due
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING *
    `;

    const values = [
      assessmentData.assessment_id || this.generateAssessmentId(),
      assessmentData.compliance_rule_id,
      assessmentData.tool_slug || null,
      assessmentData.resource_type || null,
      assessmentData.resource_id || null,
      assessmentData.assessment_scope || 'global',
      assessmentData.assessment_method || 'manual',
      assessmentData.assessment_date || new Date(),
      user.sub,
      assessmentData.status || 'compliant',
      assessmentData.compliance_score || null,
      JSON.stringify(assessmentData.findings || {}),
      JSON.stringify(assessmentData.evidence || {}),
      assessmentData.gaps_identified || [],
      assessmentData.remediation_required || false,
      assessmentData.remediation_plan || null,
      assessmentData.remediation_deadline || null,
      assessmentData.remediation_owner || null,
      assessmentData.next_assessment_due || null
    ];

    const result = await this.fastify.pg.query(query, values);
    const assessment = result.rows[0];

    // Log the assessment
    await this.audit.logComplianceAssessment(assessment, user);

    return assessment;
  }

  async getComplianceAssessments(filters = {}) {
    const { 
      compliance_rule_id, 
      tool_slug, 
      status, 
      assessment_scope, 
      from_date, 
      to_date,
      page = 1, 
      limit = 20 
    } = filters;
    
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (compliance_rule_id) {
      paramCount++;
      whereClause += ` AND compliance_rule_id = $${paramCount}`;
      params.push(compliance_rule_id);
    }

    if (tool_slug) {
      paramCount++;
      whereClause += ` AND tool_slug = $${paramCount}`;
      params.push(tool_slug);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (assessment_scope) {
      paramCount++;
      whereClause += ` AND assessment_scope = $${paramCount}`;
      params.push(assessment_scope);
    }

    if (from_date) {
      paramCount++;
      whereClause += ` AND assessment_date >= $${paramCount}`;
      params.push(from_date);
    }

    if (to_date) {
      paramCount++;
      whereClause += ` AND assessment_date <= $${paramCount}`;
      params.push(to_date);
    }

    const query = `
      SELECT 
        ca.*,
        cr.name as rule_name,
        cr.framework,
        cr.risk_level
      FROM compliance_assessments ca
      JOIN compliance_rules cr ON ca.compliance_rule_id = cr.id
      ${whereClause}
      ORDER BY ca.assessment_date DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);

    const result = await this.fastify.pg.query(query, params);
    
    return {
      assessments: result.rows,
      pagination: {
        page,
        limit,
        has_next: result.rows.length === limit,
        has_prev: page > 1
      }
    };
  }

  // ============================================================================
  // COMPLIANCE ANALYTICS AND REPORTING
  // ============================================================================

  async getComplianceAnalytics(filters = {}, user) {
    const { framework, period = '30d', tool_slug } = filters;
    
    const analytics = {
      summary: await this.getComplianceSummary(framework, period, tool_slug),
      framework_breakdown: await this.getFrameworkBreakdown(period, tool_slug),
      risk_analysis: await this.getRiskAnalysis(framework, period, tool_slug),
      compliance_trends: await this.getComplianceTrends(framework, period, tool_slug),
      assessment_status: await this.getAssessmentStatus(framework, tool_slug),
      remediation_tracking: await this.getRemediationTracking(framework, tool_slug),
      tool_compliance: await this.getToolComplianceStatus(framework, period)
    };

    return analytics;
  }

  async getComplianceSummary(framework, period, toolSlug) {
    const periodDays = this.parsePeriodToDays(period);
    const sinceDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    let whereClause = 'WHERE ca.assessment_date >= $1';
    const params = [sinceDate];
    let paramCount = 1;

    if (framework) {
      paramCount++;
      whereClause += ` AND cr.framework = $${paramCount}`;
      params.push(framework);
    }

    if (toolSlug) {
      paramCount++;
      whereClause += ` AND ca.tool_slug = $${paramCount}`;
      params.push(toolSlug);
    }

    const query = `
      SELECT 
        COUNT(*) as total_assessments,
        COUNT(CASE WHEN ca.status = 'compliant' THEN 1 END) as compliant_count,
        COUNT(CASE WHEN ca.status = 'non_compliant' THEN 1 END) as non_compliant_count,
        COUNT(CASE WHEN ca.status = 'partially_compliant' THEN 1 END) as partially_compliant_count,
        COUNT(CASE WHEN ca.remediation_required = true THEN 1 END) as requiring_remediation,
        AVG(ca.compliance_score) as average_score,
        COUNT(DISTINCT cr.framework) as frameworks_assessed,
        COUNT(DISTINCT ca.tool_slug) as tools_assessed
      FROM compliance_assessments ca
      JOIN compliance_rules cr ON ca.compliance_rule_id = cr.id
      ${whereClause}
    `;

    const result = await this.fastify.pg.query(query, params);
    const summary = result.rows[0];

    return {
      total_assessments: parseInt(summary.total_assessments),
      compliant_count: parseInt(summary.compliant_count),
      non_compliant_count: parseInt(summary.non_compliant_count),
      partially_compliant_count: parseInt(summary.partially_compliant_count),
      requiring_remediation: parseInt(summary.requiring_remediation),
      compliance_rate: summary.total_assessments > 0 
        ? Math.round((summary.compliant_count / summary.total_assessments) * 100) 
        : 0,
      average_score: summary.average_score ? Math.round(parseFloat(summary.average_score) * 100) / 100 : null,
      frameworks_assessed: parseInt(summary.frameworks_assessed),
      tools_assessed: parseInt(summary.tools_assessed),
      period: period
    };
  }

  async getFrameworkBreakdown(period, toolSlug) {
    const periodDays = this.parsePeriodToDays(period);
    const sinceDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    let whereClause = 'WHERE ca.assessment_date >= $1';
    const params = [sinceDate];

    if (toolSlug) {
      whereClause += ' AND ca.tool_slug = $2';
      params.push(toolSlug);
    }

    const query = `
      SELECT 
        cr.framework,
        COUNT(*) as total_assessments,
        COUNT(CASE WHEN ca.status = 'compliant' THEN 1 END) as compliant_count,
        COUNT(CASE WHEN ca.status = 'non_compliant' THEN 1 END) as non_compliant_count,
        AVG(ca.compliance_score) as average_score,
        COUNT(CASE WHEN ca.remediation_required = true THEN 1 END) as requiring_remediation
      FROM compliance_assessments ca
      JOIN compliance_rules cr ON ca.compliance_rule_id = cr.id
      ${whereClause}
      GROUP BY cr.framework
      ORDER BY cr.framework
    `;

    const result = await this.fastify.pg.query(query, params);
    
    return result.rows.map(row => ({
      framework: row.framework,
      total_assessments: parseInt(row.total_assessments),
      compliant_count: parseInt(row.compliant_count),
      non_compliant_count: parseInt(row.non_compliant_count),
      compliance_rate: row.total_assessments > 0 
        ? Math.round((row.compliant_count / row.total_assessments) * 100) 
        : 0,
      average_score: row.average_score ? Math.round(parseFloat(row.average_score) * 100) / 100 : null,
      requiring_remediation: parseInt(row.requiring_remediation)
    }));
  }

  async getRiskAnalysis(framework, period, toolSlug) {
    const periodDays = this.parsePeriodToDays(period);
    const sinceDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    let whereClause = 'WHERE ca.assessment_date >= $1';
    const params = [sinceDate];
    let paramCount = 1;

    if (framework) {
      paramCount++;
      whereClause += ` AND cr.framework = $${paramCount}`;
      params.push(framework);
    }

    if (toolSlug) {
      paramCount++;
      whereClause += ` AND ca.tool_slug = $${paramCount}`;
      params.push(toolSlug);
    }

    const query = `
      SELECT 
        cr.risk_level,
        COUNT(*) as total_rules,
        COUNT(CASE WHEN ca.status = 'compliant' THEN 1 END) as compliant_count,
        COUNT(CASE WHEN ca.status = 'non_compliant' THEN 1 END) as non_compliant_count,
        COUNT(CASE WHEN ca.remediation_required = true THEN 1 END) as requiring_remediation
      FROM compliance_assessments ca
      JOIN compliance_rules cr ON ca.compliance_rule_id = cr.id
      ${whereClause}
      GROUP BY cr.risk_level
      ORDER BY 
        CASE cr.risk_level 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END
    `;

    const result = await this.fastify.pg.query(query, params);
    
    return result.rows.map(row => ({
      risk_level: row.risk_level,
      total_rules: parseInt(row.total_rules),
      compliant_count: parseInt(row.compliant_count),
      non_compliant_count: parseInt(row.non_compliant_count),
      compliance_rate: row.total_rules > 0 
        ? Math.round((row.compliant_count / row.total_rules) * 100) 
        : 0,
      requiring_remediation: parseInt(row.requiring_remediation)
    }));
  }

  async getComplianceTrends(framework, period, toolSlug) {
    const periodDays = this.parsePeriodToDays(period);
    const sinceDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // Calculate interval for trending (daily for short periods, weekly for longer)
    const interval = periodDays <= 30 ? '1 day' : '1 week';

    let whereClause = 'WHERE ca.assessment_date >= $1';
    const params = [sinceDate];
    let paramCount = 1;

    if (framework) {
      paramCount++;
      whereClause += ` AND cr.framework = $${paramCount}`;
      params.push(framework);
    }

    if (toolSlug) {
      paramCount++;
      whereClause += ` AND ca.tool_slug = $${paramCount}`;
      params.push(toolSlug);
    }

    const query = `
      SELECT 
        date_trunc($${paramCount + 1}, ca.assessment_date) as period,
        COUNT(*) as total_assessments,
        COUNT(CASE WHEN ca.status = 'compliant' THEN 1 END) as compliant_count,
        AVG(ca.compliance_score) as average_score
      FROM compliance_assessments ca
      JOIN compliance_rules cr ON ca.compliance_rule_id = cr.id
      ${whereClause}
      GROUP BY date_trunc($${paramCount + 1}, ca.assessment_date)
      ORDER BY period
    `;

    params.push(interval);

    const result = await this.fastify.pg.query(query, params);
    
    return result.rows.map(row => ({
      period: row.period,
      total_assessments: parseInt(row.total_assessments),
      compliant_count: parseInt(row.compliant_count),
      compliance_rate: row.total_assessments > 0 
        ? Math.round((row.compliant_count / row.total_assessments) * 100) 
        : 0,
      average_score: row.average_score ? Math.round(parseFloat(row.average_score) * 100) / 100 : null
    }));
  }

  async getAssessmentStatus(framework, toolSlug) {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (framework) {
      paramCount++;
      whereClause += ` AND cr.framework = $${paramCount}`;
      params.push(framework);
    }

    if (toolSlug) {
      paramCount++;
      whereClause += ` AND ca.tool_slug = $${paramCount}`;
      params.push(toolSlug);
    }

    const query = `
      SELECT 
        cr.name as rule_name,
        cr.framework,
        cr.risk_level,
        cr.assessment_frequency,
        ca.status,
        ca.assessment_date,
        ca.next_assessment_due,
        CASE 
          WHEN ca.next_assessment_due < NOW() THEN true 
          ELSE false 
        END as overdue
      FROM compliance_rules cr
      LEFT JOIN LATERAL (
        SELECT * FROM compliance_assessments 
        WHERE compliance_rule_id = cr.id 
        ORDER BY assessment_date DESC 
        LIMIT 1
      ) ca ON true
      ${whereClause}
      ORDER BY 
        CASE cr.risk_level 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        ca.next_assessment_due ASC NULLS LAST
    `;

    const result = await this.fastify.pg.query(query, params);
    
    return result.rows.map(row => ({
      rule_name: row.rule_name,
      framework: row.framework,
      risk_level: row.risk_level,
      assessment_frequency: row.assessment_frequency,
      last_assessment: {
        status: row.status,
        date: row.assessment_date,
        next_due: row.next_assessment_due,
        overdue: row.overdue
      }
    }));
  }

  async getRemediationTracking(framework, toolSlug) {
    let whereClause = 'WHERE ca.remediation_required = true';
    const params = [];
    let paramCount = 0;

    if (framework) {
      paramCount++;
      whereClause += ` AND cr.framework = $${paramCount}`;
      params.push(framework);
    }

    if (toolSlug) {
      paramCount++;
      whereClause += ` AND ca.tool_slug = $${paramCount}`;
      params.push(toolSlug);
    }

    const query = `
      SELECT 
        ca.id,
        cr.name as rule_name,
        cr.framework,
        cr.risk_level,
        ca.status,
        ca.gaps_identified,
        ca.remediation_plan,
        ca.remediation_deadline,
        ca.remediation_owner,
        ca.assessment_date,
        CASE 
          WHEN ca.remediation_deadline < NOW() THEN true 
          ELSE false 
        END as overdue
      FROM compliance_assessments ca
      JOIN compliance_rules cr ON ca.compliance_rule_id = cr.id
      ${whereClause}
      ORDER BY 
        CASE cr.risk_level 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        ca.remediation_deadline ASC NULLS LAST
    `;

    const result = await this.fastify.pg.query(query, params);
    
    return result.rows.map(row => ({
      assessment_id: row.id,
      rule_name: row.rule_name,
      framework: row.framework,
      risk_level: row.risk_level,
      status: row.status,
      gaps_identified: row.gaps_identified,
      remediation: {
        plan: row.remediation_plan,
        deadline: row.remediation_deadline,
        owner: row.remediation_owner,
        overdue: row.overdue
      },
      assessment_date: row.assessment_date
    }));
  }

  async getToolComplianceStatus(framework, period) {
    const periodDays = this.parsePeriodToDays(period);
    const sinceDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    let whereClause = 'WHERE ca.assessment_date >= $1 AND ca.tool_slug IS NOT NULL';
    const params = [sinceDate];

    if (framework) {
      whereClause += ' AND cr.framework = $2';
      params.push(framework);
    }

    const query = `
      SELECT 
        ca.tool_slug,
        COUNT(*) as total_assessments,
        COUNT(CASE WHEN ca.status = 'compliant' THEN 1 END) as compliant_count,
        COUNT(CASE WHEN ca.status = 'non_compliant' THEN 1 END) as non_compliant_count,
        AVG(ca.compliance_score) as average_score,
        COUNT(CASE WHEN ca.remediation_required = true THEN 1 END) as requiring_remediation
      FROM compliance_assessments ca
      JOIN compliance_rules cr ON ca.compliance_rule_id = cr.id
      ${whereClause}
      GROUP BY ca.tool_slug
      ORDER BY ca.tool_slug
    `;

    const result = await this.fastify.pg.query(query, params);
    
    return result.rows.map(row => ({
      tool_slug: row.tool_slug,
      total_assessments: parseInt(row.total_assessments),
      compliant_count: parseInt(row.compliant_count),
      non_compliant_count: parseInt(row.non_compliant_count),
      compliance_rate: row.total_assessments > 0 
        ? Math.round((row.compliant_count / row.total_assessments) * 100) 
        : 0,
      average_score: row.average_score ? Math.round(parseFloat(row.average_score) * 100) / 100 : null,
      requiring_remediation: parseInt(row.requiring_remediation)
    }));
  }

  // ============================================================================
  // COMPLIANCE REPORTING
  // ============================================================================

  async generateComplianceReport(reportConfig, user) {
    const {
      type = 'summary',
      framework,
      tool_slug,
      period = '30d',
      format = 'json',
      include_remediation = true,
      include_trends = true
    } = reportConfig;

    const report = {
      metadata: {
        report_type: type,
        generated_by: user.email,
        generated_at: new Date().toISOString(),
        parameters: {
          framework,
          tool_slug,
          period,
          include_remediation,
          include_trends
        }
      },
      executive_summary: await this.getComplianceSummary(framework, period, tool_slug),
      framework_analysis: await this.getFrameworkBreakdown(period, tool_slug),
      risk_assessment: await this.getRiskAnalysis(framework, period, tool_slug)
    };

    if (include_trends) {
      report.compliance_trends = await this.getComplianceTrends(framework, period, tool_slug);
    }

    if (include_remediation) {
      report.remediation_tracking = await this.getRemediationTracking(framework, tool_slug);
    }

    report.tool_compliance = await this.getToolComplianceStatus(framework, period);
    report.assessment_status = await this.getAssessmentStatus(framework, tool_slug);

    // Add recommendations based on analysis
    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  generateRecommendations(report) {
    const recommendations = [];

    // Analyze compliance rates
    if (report.executive_summary.compliance_rate < 80) {
      recommendations.push({
        priority: 'high',
        category: 'compliance_improvement',
        title: 'Low compliance rate detected',
        description: `Current compliance rate is ${report.executive_summary.compliance_rate}%. Consider reviewing and updating policies.`,
        action_items: [
          'Review non-compliant assessments',
          'Update policy definitions',
          'Increase assessment frequency',
          'Provide additional training'
        ]
      });
    }

    // Analyze risk levels
    const criticalRisks = report.risk_assessment.find(r => r.risk_level === 'critical');
    if (criticalRisks && criticalRisks.non_compliant_count > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'risk_mitigation',
        title: 'Critical risk compliance issues',
        description: `${criticalRisks.non_compliant_count} critical risk items are non-compliant.`,
        action_items: [
          'Address critical compliance gaps immediately',
          'Implement emergency controls',
          'Escalate to leadership',
          'Schedule urgent remediation'
        ]
      });
    }

    // Analyze remediation
    if (report.remediation_tracking) {
      const overdueItems = report.remediation_tracking.filter(item => item.remediation.overdue);
      if (overdueItems.length > 0) {
        recommendations.push({
          priority: 'medium',
          category: 'remediation_management',
          title: 'Overdue remediation items',
          description: `${overdueItems.length} remediation items are past their deadline.`,
          action_items: [
            'Review overdue remediation items',
            'Update remediation timelines',
            'Assign clear ownership',
            'Increase monitoring frequency'
          ]
        });
      }
    }

    return recommendations;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  generateAssessmentId() {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const random = Math.random().toString(36).substr(2, 6);
    return `assessment_${timestamp}_${random}`;
  }

  parsePeriodToDays(period) {
    const match = period.match(/^(\d+)([dwmy])$/);
    if (!match) return 30; // Default to 30 days

    const [, num, unit] = match;
    const number = parseInt(num);

    switch (unit) {
      case 'd': return number;
      case 'w': return number * 7;
      case 'm': return number * 30;
      case 'y': return number * 365;
      default: return 30;
    }
  }

  calculateNextAssessmentDate(frequency, lastAssessment = new Date()) {
    const date = new Date(lastAssessment);

    switch (frequency) {
      case 'continuous':
        return new Date(date.getTime() + 24 * 60 * 60 * 1000); // Next day
      case 'daily':
        return new Date(date.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        return date;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        return date;
      case 'annually':
        date.setFullYear(date.getFullYear() + 1);
        return date;
      default:
        return new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days
    }
  }
}

module.exports = ComplianceManager;
