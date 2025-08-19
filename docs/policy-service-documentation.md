# SSO Hub Policy Service Documentation

## Overview

The SSO Hub Policy Service is a centralized policy management system that handles access control policies, compliance rules, and governance policies across all 11 integrated DevOps tools. It provides a rule-based policy evaluation engine with real-time enforcement capabilities.

## Table of Contents

1. [Architecture](#architecture)
2. [Features](#features)
3. [API Reference](#api-reference)
4. [Policy Definition Schema](#policy-definition-schema)
5. [Compliance Management](#compliance-management)
6. [Tool Integration](#tool-integration)
7. [Performance & Caching](#performance--caching)
8. [Security](#security)
9. [Deployment](#deployment)
10. [Monitoring](#monitoring)
11. [Examples](#examples)

## Architecture

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Policy API    │    │  Policy Engine  │    │ Cache Manager   │
│                 │    │                 │    │                 │
│ - Health Checks │    │ - Rule Engine   │    │ - Redis Cache   │
│ - Policy CRUD   │    │ - Evaluation    │    │ - Performance   │
│ - Enforcement   │    │ - Decision PDP  │    │ - Stats         │
│ - Compliance    │    │ - Context PIP   │    │ - Invalidation  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Database Mgr    │    │ Tool Integration│    │ Audit Logger    │
│                 │    │                 │    │                 │
│ - PostgreSQL    │    │ - 11 Tools      │    │ - Audit Trail   │
│ - Policies      │    │ - Context       │    │ - Violations    │
│ - Compliance    │    │ - Enrichment    │    │ - Compliance    │
│ - Enforcement   │    │ - Health Check  │    │ - Notifications │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Service Integration

The Policy Service integrates with:
- **Auth-BFF**: Receives identity headers for user context
- **Catalog Service**: Provides policy enforcement for tool launches
- **Audit Service**: Logs all policy decisions and violations
- **Analytics Service**: Provides compliance metrics and reporting
- **All 11 Tool Services**: Context enrichment and real-time enforcement

## Features

### Policy Management
- ✅ Rule-based policy definition
- ✅ Priority-based evaluation
- ✅ Tool-specific policies
- ✅ Environment-aware rules
- ✅ Time-based restrictions
- ✅ Conditional logic support

### Compliance Framework Support
- ✅ SOX (Sarbanes-Oxley Act)
- ✅ GDPR (General Data Protection Regulation)
- ✅ HIPAA (Health Insurance Portability and Accountability Act)
- ✅ PCI-DSS (Payment Card Industry Data Security Standard)
- ✅ SOC2 (Service Organization Control 2)
- ✅ ISO27001 (Information Security Management)

### Performance Features
- ✅ Redis-based caching
- ✅ Sub-50ms policy evaluation
- ✅ Parallel policy evaluation
- ✅ Cache warming and invalidation
- ✅ Performance monitoring

### Security Features
- ✅ Identity header validation
- ✅ HMAC signature verification
- ✅ Role-based access control
- ✅ Audit logging
- ✅ Rate limiting

## API Reference

### Base URL
```
http://localhost:3013
```

### Authentication
All API endpoints require identity headers from the auth gateway:
```http
x-user-sub: user-identifier
x-user-email: user@example.com
x-user-roles: role1,role2,role3
x-user-signature: hmac-signature
```

### Health Endpoints

#### GET /healthz
Basic health check
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

#### GET /readyz
Detailed readiness check
```json
{
  "status": "ready",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "policy_engine": "healthy"
  },
  "policy_cache_status": {
    "total_keys": 150,
    "hit_rate": 0.85,
    "last_updated": "2024-01-15T10:30:00Z"
  }
}
```

### Policy Management Endpoints

#### GET /api/policies
List all policies with optional filtering
```http
GET /api/policies?type=access_control&tool_id=github&enabled=true&page=1&limit=20
```

Response:
```json
{
  "policies": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  },
  "total": 95
}
```

#### POST /api/policies
Create a new policy
```json
{
  "policy_id": "github-repo-access",
  "name": "GitHub Repository Access Policy",
  "description": "Controls access to GitHub repositories",
  "type": "access_control",
  "category": "authentication",
  "tool_id": "github",
  "priority": 100,
  "enabled": true,
  "rules": [
    {
      "rule_id": "admin-full-access",
      "name": "Admin Full Access",
      "action": "allow",
      "priority": 1,
      "role_requirements": ["admin"],
      "conditions": {
        "user_roles": ["admin"]
      }
    }
  ],
  "compliance_framework": "SOX",
  "risk_level": "high"
}
```

#### PUT /api/policies/:id
Update an existing policy

#### DELETE /api/policies/:id
Delete a policy

### Policy Enforcement Endpoints

#### POST /api/policies/enforce
Enforce policy for a specific request
```json
{
  "tool_slug": "github",
  "action": "read",
  "resource_type": "repository",
  "resource_id": "my-repo",
  "resource_name": "my-company/my-repo",
  "context": {
    "environment": "production",
    "branch": "main"
  }
}
```

Response:
```json
{
  "decision": "allow",
  "reason": "Policy github-repo-access: Admin access granted",
  "confidence_score": 0.95,
  "evaluation_id": "eval_1234567890",
  "timestamp": "2024-01-15T10:30:00Z",
  "primary_policy": {
    "id": "uuid",
    "policy_id": "github-repo-access",
    "name": "GitHub Repository Access Policy",
    "type": "access_control"
  },
  "matched_rules": [
    {
      "rule_id": "admin-full-access",
      "name": "Admin Full Access",
      "action": "allow",
      "match_reason": "User has admin role"
    }
  ],
  "evaluation_summary": {
    "policies_evaluated": 3,
    "policies_matched": 1,
    "rules_matched": 1,
    "decision_basis": "deny_overrides"
  }
}
```

#### GET /api/policies/enforcement/history
Get enforcement history with filtering
```http
GET /api/policies/enforcement/history?tool_slug=github&decision=deny&from_date=2024-01-01
```

### Compliance Management Endpoints

#### GET /api/compliance/rules
List compliance rules
```http
GET /api/compliance/rules?framework=SOX&risk_level=high
```

#### POST /api/compliance/rules
Create a compliance rule
```json
{
  "rule_id": "sox-access-logging",
  "name": "SOX Access Logging Requirement",
  "description": "All access to financial systems must be logged",
  "framework": "SOX",
  "control_id": "SOX-404",
  "requirement_text": "Maintain audit trails for all system access",
  "assessment_method": "automated",
  "assessment_frequency": "continuous",
  "risk_level": "high",
  "applicable_tools": ["github", "jenkins", "terraform"]
}
```

#### GET /api/analytics/compliance
Get compliance analytics
```http
GET /api/analytics/compliance?framework=SOX&period=30d&tool_slug=github
```

Response:
```json
{
  "summary": {
    "total_assessments": 150,
    "compliant_count": 140,
    "non_compliant_count": 8,
    "partially_compliant_count": 2,
    "compliance_rate": 93,
    "average_score": 87.5
  },
  "framework_breakdown": [...],
  "risk_analysis": [...],
  "compliance_trends": [...],
  "tool_compliance": [...]
}
```

## Policy Definition Schema

### Policy Structure
```json
{
  "policy_id": "string (required)",
  "name": "string (required)",
  "description": "string (optional)",
  "type": "access_control|compliance|security|governance|workflow",
  "category": "string (required)",
  "tool_id": "string (optional)",
  "tool_scope": "global|organization|project|repository|workspace",
  "priority": "integer (1-1000, default: 100)",
  "enabled": "boolean (default: true)",
  "rules": [...],
  "conditions": {...},
  "compliance_framework": "SOX|GDPR|HIPAA|PCI-DSS|SOC2|ISO27001",
  "risk_level": "low|medium|high|critical",
  "effective_from": "ISO datetime",
  "effective_until": "ISO datetime"
}
```

### Rule Structure
```json
{
  "rule_id": "string",
  "name": "string (required)",
  "description": "string",
  "action": "allow|deny|audit|alert|require_approval|log",
  "priority": "integer (1-100)",
  "enabled": "boolean",
  "conditions": {...},
  "role_requirements": ["role1", "role2"],
  "resource_type": "string",
  "resource_pattern": "regex pattern",
  "time_restrictions": {...},
  "environment": "production|staging|development|testing"
}
```

### Condition Examples
```json
{
  "conditions": {
    "user_roles": ["admin", "developer"],
    "action": {"$in": ["read", "write"]},
    "resource_type": "repository",
    "environment": "production",
    "time_restrictions": {
      "business_hours_only": true,
      "business_hours": {"start": 9, "end": 17},
      "business_days": [1, 2, 3, 4, 5]
    }
  }
}
```

## Compliance Management

### Supported Frameworks

#### SOX (Sarbanes-Oxley Act)
- **Focus**: Financial reporting and corporate governance
- **Key Controls**: Segregation of duties, change management, audit trails
- **Assessment**: Continuous monitoring with quarterly reviews
- **Risk Level**: High/Critical

#### GDPR (General Data Protection Regulation)
- **Focus**: Personal data protection and privacy
- **Key Controls**: Data access logging, consent management, right to be forgotten
- **Assessment**: Automated monitoring with monthly reviews
- **Risk Level**: High

#### SOC2 (Service Organization Control 2)
- **Focus**: Security, availability, processing integrity
- **Key Controls**: Access reviews, system monitoring, incident response
- **Assessment**: Continuous monitoring with quarterly assessments
- **Risk Level**: Medium/High

### Compliance Workflow

1. **Rule Definition**: Create compliance rules based on framework requirements
2. **Assessment**: Automated or manual assessment of compliance status
3. **Gap Analysis**: Identify areas of non-compliance
4. **Remediation**: Track remediation efforts and deadlines
5. **Reporting**: Generate compliance reports and metrics

## Tool Integration

### Supported Tools (11 Total)

| Tool | Resource Types | Actions | Integration Level |
|------|----------------|---------|-------------------|
| GitHub | repository, organization, branch, pull_request | read, write, admin, push, merge | Full API |
| GitLab | project, group, merge_request, branch | read, write, admin, push, merge | Full API |
| Jenkins | job, folder, pipeline, build | read, build, configure, delete | Full API |
| ArgoCD | application, project, cluster | get, sync, rollback, delete | Full API |
| Terraform | workspace, organization, state | read, plan, apply, destroy | Full API |
| SonarQube | project, component, issue | browse, scan, administer | Full API |
| Grafana | dashboard, folder, datasource | read, edit, admin | Full API |
| Prometheus | metric, rule, target | query, admin | API |
| Kibana | index, dashboard, visualization | read, write, manage | Full API |
| Snyk | project, organization, issue | view, test, monitor | Full API |
| Jira | project, issue, board | browse, create, edit, assign | Full API |

### Context Enrichment

The Policy Service enriches policy evaluation context by retrieving additional information from tools:

```javascript
// Example enriched context
{
  "user": {...},
  "tool_slug": "github",
  "action": "push",
  "resource_type": "repository",
  "resource_id": "my-org/my-repo",
  "tool_context": {
    "repository_name": "my-repo",
    "repository_owner": "my-org",
    "is_private": true,
    "default_branch": "main",
    "visibility": "private"
  },
  "environment": "production", // Auto-detected
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Performance & Caching

### Caching Strategy

#### Policy Cache
- **TTL**: 5 minutes (configurable)
- **Key Pattern**: `policies:{tool}:{resource_type}`
- **Invalidation**: Automatic on policy changes

#### Decision Cache
- **TTL**: 5 minutes (configurable)
- **Key Pattern**: `policy_decision:{user}:{tool}:{action}:{resource}`
- **Invalidation**: On policy or user role changes

#### Performance Targets
- **Policy Evaluation**: < 50ms per request
- **Cache Hit Rate**: > 80%
- **Concurrent Requests**: 10,000+ per minute

### Cache Management
```bash
# Cache statistics
GET /api/cache/stats

# Cache invalidation
DELETE /api/cache/policies/{tool_id}
DELETE /api/cache/decisions/{user_id}
```

## Security

### Authentication & Authorization
- **Identity Headers**: Required from auth gateway
- **HMAC Validation**: Request signature verification
- **Role-Based Access**: Admin/policy-manager roles for management
- **Rate Limiting**: 10,000 requests per minute per user

### Audit Logging
All policy activities are logged:
- Policy creation/modification/deletion
- Enforcement decisions
- Compliance assessments
- Violations and alerts

### Security Best Practices
- **Least Privilege**: Default deny policy
- **Defense in Depth**: Multiple validation layers
- **Audit Trail**: Complete activity logging
- **Encryption**: TLS for all communications
- **Input Validation**: Zod schema validation

## Deployment

### Docker Deployment
```yaml
policy:
  build: ./services/policy
  container_name: sso-policy
  environment:
    - NODE_ENV=production
    - PORT=3013
    - DATABASE_URL=postgresql://...
    - REDIS_URL=redis://redis:6379
    - ENABLE_POLICY_CACHING=true
  ports:
    - "3013:3013"
  depends_on:
    - postgres
    - redis
```

### Environment Variables
```bash
# Core Configuration
NODE_ENV=production
HOST=0.0.0.0
PORT=3013
LOG_LEVEL=info

# Database & Cache
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379

# Policy Engine
POLICY_CACHE_TTL_SECONDS=300
POLICY_EVALUATION_TIMEOUT_MS=5000
ENABLE_POLICY_CACHING=true

# Security
IDENTITY_HEADER_SECRET=your-hmac-secret
REQUIRE_IDENTITY_HEADERS=true

# Integration URLs
AUDIT_SERVICE_URL=http://audit:3009
CATALOG_SERVICE_URL=http://catalog:3006
```

### Database Migrations
Run migrations before starting the service:
```bash
# Apply schema migrations
psql $DATABASE_URL -f infra/db-migrations/14-phase6.5-policy-system.sql
```

## Monitoring

### Health Checks
- **Basic Health**: `GET /healthz`
- **Readiness**: `GET /readyz`
- **Service Dependencies**: Database, Redis, External APIs

### Metrics
- Policy evaluation latency
- Cache hit rates
- Enforcement decision counts
- Compliance assessment results
- Error rates and types

### Alerting
Configure alerts for:
- High policy violation rates
- Performance degradation
- Service dependencies failure
- Compliance threshold breaches

### Logs
Structured JSON logging with correlation IDs:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "msg": "Policy enforcement completed",
  "correlation_id": "abc123",
  "user_id": "user-456",
  "tool_slug": "github",
  "decision": "allow",
  "duration_ms": 45
}
```

## Examples

### Basic Policy Creation
```bash
curl -X POST http://localhost:3013/api/policies \
  -H "Content-Type: application/json" \
  -H "x-user-sub: admin-123" \
  -H "x-user-email: admin@company.com" \
  -H "x-user-roles: admin" \
  -d '{
    "policy_id": "github-basic-access",
    "name": "GitHub Basic Access",
    "type": "access_control",
    "category": "authentication",
    "tool_id": "github",
    "rules": [{
      "name": "Developer Read Access",
      "action": "allow",
      "role_requirements": ["developer"],
      "conditions": {"action": ["read", "clone"]}
    }]
  }'
```

### Policy Enforcement
```bash
curl -X POST http://localhost:3013/api/policies/enforce \
  -H "Content-Type: application/json" \
  -H "x-user-sub: dev-456" \
  -H "x-user-email: dev@company.com" \
  -H "x-user-roles: developer" \
  -d '{
    "tool_slug": "github",
    "action": "read",
    "resource_type": "repository",
    "resource_id": "company/awesome-project"
  }'
```

### Compliance Rule
```bash
curl -X POST http://localhost:3013/api/compliance/rules \
  -H "Content-Type: application/json" \
  -H "x-user-sub: admin-123" \
  -H "x-user-email: admin@company.com" \
  -H "x-user-roles: admin" \
  -d '{
    "rule_id": "sox-audit-trail",
    "name": "SOX Audit Trail Requirement",
    "framework": "SOX",
    "control_id": "SOX-404",
    "requirement_text": "All access must be logged",
    "assessment_method": "automated",
    "assessment_frequency": "continuous",
    "risk_level": "high"
  }'
```

### Integration with Other Services

#### Catalog Service Integration
```javascript
// In catalog service - check policy before tool launch
const policyResult = await axios.post('http://policy:3013/api/policies/enforce', {
  tool_slug: 'github',
  action: 'access',
  resource_type: 'repository',
  resource_id: repoId
}, {
  headers: {
    'x-user-sub': user.sub,
    'x-user-email': user.email,
    'x-user-roles': user.roles.join(',')
  }
});

if (policyResult.data.decision !== 'allow') {
  throw new Error(`Access denied: ${policyResult.data.reason}`);
}
```

## Troubleshooting

### Common Issues

#### Policy Not Evaluating
1. Check policy is enabled
2. Verify tool_id matches request
3. Check rule priorities and conditions
4. Review audit logs for evaluation details

#### Performance Issues
1. Monitor cache hit rates
2. Check Redis connectivity
3. Review policy complexity
4. Consider rule optimization

#### Authentication Failures
1. Verify identity headers are present
2. Check HMAC signature validation
3. Review user roles and permissions
4. Check auth gateway configuration

### Debug Mode
Enable debug logging:
```bash
LOG_LEVEL=debug
```

Review detailed policy evaluation logs:
```bash
docker logs sso-policy | grep "Policy enforcement"
```

---

## Support

For issues and questions:
- **Documentation**: `/docs` endpoint for interactive API docs
- **Health Monitoring**: `/healthz` and `/readyz` endpoints
- **Logs**: Structured JSON logs with correlation IDs
- **Metrics**: Performance and compliance metrics available

## Changelog

### Version 1.0.0 (Phase 6.5)
- Initial Policy Service implementation
- Support for all 11 DevOps tools
- Compliance framework integration
- Real-time policy enforcement
- Performance optimized caching
- Comprehensive audit logging