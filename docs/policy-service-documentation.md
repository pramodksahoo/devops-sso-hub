# Policy Service Documentation

## Service Overview

### Service Name and Purpose
**Policy Service** - Centralized policy management service for SSO Hub that handles access control policies, compliance rules, and governance policies across all integrated DevOps tools.

### Business Use Cases and Functional Requirements
- **Access Control Policies**: Define and enforce access control policies for all tools
- **Compliance Rules**: Implement compliance and governance policies
- **Policy Enforcement**: Enforce policies across all integrated services
- **Policy Validation**: Validate policy configurations and rules
- **Policy Distribution**: Distribute policies to all services
- **Policy Analytics**: Track policy effectiveness and compliance
- **Audit Logging**: Log all policy decisions and enforcement actions

### Service Boundaries and Responsibilities
- **Policy Definition**: Define and manage access control policies
- **Policy Enforcement**: Enforce policies across all services
- **Compliance Management**: Manage compliance and governance rules
- **Policy Validation**: Validate policy configurations
- **Policy Distribution**: Distribute policies to services
- **Policy Analytics**: Analyze policy effectiveness

## Architecture Documentation

### High-Level Architecture Diagram
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Frontend  │───▶│   Policy    │───▶│ PostgreSQL  │
│             │    │   Service   │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Policy     │
                   │   Engine     │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Policy     │
                   │  Distributor │
                   └──────────────┘
```

### Component Relationships and Interactions
1. **Frontend Integration**: Receives policy management requests
2. **Policy Engine**: Evaluates and enforces policies
3. **Policy Distributor**: Distributes policies to all services
4. **Compliance Manager**: Manages compliance rules
5. **Policy Validator**: Validates policy configurations
6. **Database Manager**: Handles policy data persistence

### Design Patterns Implemented
- **Policy Pattern**: Centralized policy management
- **Engine Pattern**: Policy evaluation and enforcement
- **Distributor Pattern**: Policy distribution to services
- **Repository Pattern**: Data access abstraction layer
- **Validation Pattern**: Policy configuration validation

## Technical Specifications

### Technology Stack and Frameworks
- **Runtime**: Node.js 20+
- **Web Framework**: Fastify 4.27.0
- **Database**: PostgreSQL with @fastify/postgres
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: @fastify/helmet, @fastify/rate-limit
- **Validation**: Zod 3.22.4
- **Logging**: Pino 8.17.2
- **Policy Engine**: Custom policy evaluation engine

### Programming Language and Version
- **Language**: JavaScript (CommonJS)
- **Node.js Version**: 20.0.0+
- **Package Manager**: npm

### Database Technologies
- **Primary Database**: PostgreSQL 15+
- **Policy Data**: Policy definitions and configurations
- **Compliance Data**: Compliance rules and governance policies
- **Enforcement Data**: Policy enforcement history

### External Libraries and Dependencies
```json
{
  "fastify": "^4.27.0",
  "@fastify/cors": "^9.0.1",
  "@fastify/helmet": "^11.1.1",
  "@fastify/rate-limit": "^9.1.0",
  "@fastify/postgres": "^5.2.2",
  "@fastify/swagger": "^8.14.0",
  "@fastify/swagger-ui": "^2.1.0",
  "pino": "^8.17.2",
  "zod": "^3.22.4",
  "uuid": "^9.0.1"
}
```

## API Documentation

### Complete Endpoint Specifications

#### Health Check Endpoints
```http
GET /healthz
GET /readyz
```

#### Policy Management Endpoints
```http
GET /api/policies
GET /api/policies/:id
POST /api/policies
PUT /api/policies/:id
DELETE /api/policies/:id
```

#### Policy Enforcement Endpoints
```http
POST /api/policies/enforce
GET /api/policies/enforcement/:id
GET /api/policies/enforcement/history
```

#### Compliance Management Endpoints
```http
GET /api/compliance/rules
GET /api/compliance/rules/:id
POST /api/compliance/rules
PUT /api/compliance/rules/:id
DELETE /api/compliance/rules/:id
```

#### Policy Analytics Endpoints
```http
GET /api/analytics/policies
GET /api/analytics/compliance
GET /api/analytics/enforcement
```

### Request/Response Schemas

#### Policy Definition Schema
```json
{
  "policy_id": "policy-123",
  "name": "GitHub Repository Access Policy",
  "description": "Controls access to GitHub repositories based on user roles",
  "type": "access_control",
  "tool_id": "github",
  "priority": 100,
  "enabled": true,
  "rules": [
    {
      "rule_id": "rule-1",
      "condition": {
        "resource_type": "repository",
        "action": "read",
        "user_roles": ["admin", "developer", "viewer"]
      },
      "effect": "allow",
      "priority": 1
    },
    {
      "rule_id": "rule-2",
      "condition": {
        "resource_type": "repository",
        "action": "write",
        "user_roles": ["admin", "developer"]
      },
      "effect": "allow",
      "priority": 2
    }
  ],
  "metadata": {
    "created_by": "admin@example.com",
    "created_at": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0"
  }
}
```

#### Policy Enforcement Request Schema
```json
{
  "policy_id": "policy-123",
  "user_id": "user-123",
  "user_roles": ["developer"],
  "resource": {
    "type": "repository",
    "id": "repo-456",
    "name": "my-project",
    "owner": "org-name"
  },
  "action": "read",
  "context": {
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Policy Enforcement Result Schema
```json
{
  "enforcement_id": "enforcement-123",
  "policy_id": "policy-123",
  "user_id": "user-123",
  "resource": {
    "type": "repository",
    "id": "repo-456"
  },
  "action": "read",
  "decision": "allow",
  "applied_rules": ["rule-1"],
  "reason": "User has developer role which allows repository read access",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "metadata": {
    "evaluation_time_ms": 15,
    "policy_version": "1.0.0"
  }
}
```

### Authentication and Authorization Details
- **Identity Headers**: X-User-Sub, X-User-Email, X-User-Roles, X-User-Signature
- **Admin Access**: Policy management restricted to admin users
- **Policy Enforcement**: All services can request policy enforcement
- **Audit Logging**: Complete policy enforcement audit trail

### Error Codes and Handling
```json
{
  "400": "Bad request - invalid policy parameters",
  "401": "Unauthorized - missing or invalid identity headers",
  "403": "Forbidden - insufficient permissions for policy management",
  "404": "Policy or rule not found",
  "409": "Policy conflict - validation failed",
  "500": "Internal server error",
  "503": "Policy service unavailable"
}
```

## Service Dependencies

### Upstream and Downstream Service Dependencies
- **Upstream**: Auth-BFF (for identity headers)
- **Downstream**: PostgreSQL database, all other microservices
- **Internal**: Policy enforcement requests from all services

### Third-Party Integrations
- **PostgreSQL**: Policy data storage and management
- **All Microservices**: Policy enforcement requests

### Database Connections
- **PostgreSQL**: Policies, compliance rules, enforcement history
- **Connection Pooling**: Optimized database connections

### Message Queue Interactions
- **Current**: Direct policy enforcement and distribution
- **Future**: Async policy updates with notification queues

## Health & Monitoring

### Health Check Endpoints
- **`/healthz`**: Basic service health status
- **`/readyz`**: Service readiness with database connectivity checks

### Monitoring and Logging Configurations
- **Logging**: Pino with structured JSON logging
- **Metrics**: Policy enforcement performance and effectiveness
- **Health Monitoring**: Database connectivity and policy evaluation

### Performance Metrics
- **Policy Evaluation Time**: Time to evaluate and enforce policies
- **Enforcement Success Rate**: Percentage of successful policy enforcements
- **Database Performance**: PostgreSQL operation performance
- **Policy Distribution**: Policy distribution performance

### Alerting Mechanisms
- **Policy Validation Errors**: Invalid policy configuration alerts
- **Enforcement Failures**: Failed policy enforcement alerts
- **Compliance Violations**: Policy compliance violation alerts
- **Database Issues**: Database connection and performance problems

## Directory Structure

### Complete Folder Hierarchy
```
services/policy/
├── Dockerfile
├── package.json
├── README.md
└── src/
    ├── config.js
    ├── index.js
    ├── policy-engine.js
    ├── policy-distributor.js
    ├── compliance-manager.js
    └── policy-validator.js
```

### File Organization Explanation
- **`config.js`**: Environment-based configuration
- **`index.js`**: Main service implementation and route definitions
- **`policy-engine.js`**: Core policy evaluation and enforcement
- **`policy-distributor.js`**: Policy distribution to services
- **`compliance-manager.js`**: Compliance rule management
- **`policy-validator.js`**: Policy configuration validation

### Key Configuration Files Location
- **Environment Variables**: `.env` file or Docker environment
- **Database Configuration**: PostgreSQL connection settings
- **Policy Configuration**: Policy engine and distribution settings
- **Compliance Configuration**: Compliance rule settings

## Policy Management Capabilities

### Supported Policy Types
1. **Access Control Policies**: Control access to resources and actions
2. **Compliance Policies**: Enforce compliance and governance rules
3. **Data Protection Policies**: Protect sensitive data and information
4. **Workflow Policies**: Control workflow and process policies
5. **Security Policies**: Enforce security and authentication policies
6. **Custom Policies**: User-defined custom policy types

### Policy Features
- **Rule-Based Policies**: Complex rule-based policy definitions
- **Conditional Logic**: Advanced conditional logic for policy evaluation
- **Priority Management**: Policy priority and precedence management
- **Version Control**: Policy versioning and change management
- **Template System**: Reusable policy templates
- **Policy Inheritance**: Hierarchical policy inheritance

### Compliance Management
- **Regulatory Compliance**: SOX, GDPR, SOC2 compliance rules
- **Industry Standards**: Industry-specific compliance standards
- **Internal Policies**: Internal governance and policy rules
- **Audit Requirements**: Compliance audit and reporting
- **Risk Management**: Risk assessment and mitigation policies

## Security Features

### Access Control
- **Admin-Only Access**: Policy management restricted to admins
- **Policy Enforcement**: Secure policy enforcement across services
- **Audit Logging**: Complete policy enforcement audit trail
- **Policy Validation**: Secure policy configuration validation

### Data Protection
- **Input Validation**: Zod schema validation for all inputs
- **Policy Encryption**: Secure storage of sensitive policy data
- **SQL Injection Prevention**: Parameterized database queries
- **XSS Protection**: Content security policy headers

### Policy Security
- **Policy Integrity**: Secure policy storage and distribution
- **Enforcement Security**: Secure policy enforcement mechanism
- **Access Logging**: Complete policy access logging
- **Change Approval**: Policy change approval workflows

## Deployment and Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3012
HOST=0.0.0.0
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/sso_hub

# Policy Configuration
POLICY_EVALUATION_TIMEOUT=5000
POLICY_DISTRIBUTION_ENABLED=true
COMPLIANCE_CHECKING_ENABLED=true
POLICY_CACHING_ENABLED=true

# Security Configuration
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000
```

### Docker Configuration
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3012
CMD ["npm", "start"]
```

### Health Check Commands
```bash
# Health check
curl http://localhost:3012/healthz

# Readiness check
curl http://localhost:3012/readyz

# List policies
curl http://localhost:3012/api/policies

# Test policy enforcement
curl -X POST http://localhost:3012/api/policies/enforce
```

## Performance Optimization

### Policy Optimization
- **Policy Caching**: Cache frequently accessed policies
- **Rule Optimization**: Optimized policy rule evaluation
- **Parallel Evaluation**: Concurrent policy evaluation
- **Template Processing**: Efficient policy template processing

### Database Optimization
- **Indexed Queries**: Optimized database schema with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Structured queries for performance
- **Data Partitioning**: Policy data partitioning for large systems

### Scalability Features
- **Stateless Design**: Service can be horizontally scaled
- **Load Distribution**: Support for multiple service instances
- **Async Processing**: Asynchronous policy processing
- **Policy Distribution**: Distributed policy management

## Troubleshooting

### Common Issues
1. **Policy Validation Failures**: Check policy configuration and rules
2. **Enforcement Failures**: Verify policy evaluation logic
3. **Distribution Issues**: Check policy distribution configuration
4. **Database Connection Issues**: Verify PostgreSQL connectivity

### Debug Commands
```bash
# Check service logs
docker logs policy-service

# Verify database connectivity
curl -v http://localhost:3012/readyz

# Test policy evaluation
curl -v http://localhost:3012/api/policies/enforce

# Check policy status
curl -v http://localhost:3012/api/policies
```

### Log Analysis
- **Policy Evaluation**: Monitor policy evaluation performance
- **Enforcement Results**: Track policy enforcement decisions
- **Distribution Status**: Monitor policy distribution success
- **Error Patterns**: Identify recurring policy issues

## Future Enhancements

### Planned Features
- **Advanced Policy Engine**: AI-powered policy optimization
- **Real-time Compliance**: Live compliance monitoring and alerting
- **Policy Analytics**: Advanced policy effectiveness analytics
- **Automated Policy Generation**: AI-generated policy recommendations

### Integration Roadmap
- **Phase 1**: Basic policy management and enforcement (current)
- **Phase 2**: Advanced compliance and analytics
- **Phase 3**: AI-powered policy optimization
- **Phase 4**: Intelligent policy management platform

### Policy Evolution
- **Current**: Basic policy management and enforcement
- **Future**: Advanced compliance and analytics
- **Advanced**: AI-powered policy optimization
- **Enterprise**: Enterprise-grade policy management platform
