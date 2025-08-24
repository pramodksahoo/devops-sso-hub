# Catalog Service Documentation

## Service Overview

### Service Name and Purpose
**Catalog Service** - Enhanced tool catalog service with tool-specific launch capabilities, deep-linking, and webhook integration for the SSO Hub.

### Business Use Cases and Functional Requirements
- **Tool Catalog Management**: Centralized registry of all 11 supported DevOps tools
- **Tool Launch Capabilities**: Generate tool-specific launch URLs with authentication
- **Deep-Linking Support**: Direct navigation to specific tool resources
- **Webhook Integration**: Handle tool webhook events and notifications
- **Policy-Based Access Control**: Enforce tool access policies based on user roles
- **Tool Metadata Management**: Store and manage tool capabilities and configurations
- **Launch Session Tracking**: Monitor and analyze tool usage patterns

### Service Boundaries and Responsibilities
- **Tool Registry**: Maintain comprehensive tool catalog with metadata
- **Launch Service**: Generate authenticated launch URLs for tools
- **Webhook Processing**: Handle incoming webhook events from tools
- **Policy Enforcement**: Apply access control policies for tool access
- **Metadata Service**: Manage tool capabilities and integration details
- **Database Management**: Handle PostgreSQL operations and Redis caching

## Architecture Documentation

### High-Level Architecture Diagram
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Frontend  │───▶│   Catalog    │───▶│ PostgreSQL  │
│             │    │   Service    │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │     Redis    │
                   │   (Cache)    │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   External   │
                   │    Tools     │
                   │ (Webhooks)   │
                   └──────────────┘
```

### Component Relationships and Interactions
1. **Frontend Integration**: Receives tool catalog requests and launch requests
2. **Database Manager**: Handles PostgreSQL operations for tool data
3. **Launch Service**: Generates authenticated launch URLs
4. **Webhook Service**: Processes incoming webhook events
5. **Policy Service**: Enforces access control policies
6. **Tool Metadata Service**: Manages tool capabilities and configurations

### Design Patterns Implemented
- **Service Layer Pattern**: Separate services for different concerns
- **Repository Pattern**: Database abstraction layer
- **Factory Pattern**: Tool-specific launch URL generation
- **Observer Pattern**: Webhook event processing
- **Policy Pattern**: Access control enforcement

## Technical Specifications

### Technology Stack and Frameworks
- **Runtime**: Node.js 20+
- **Web Framework**: Fastify 4.27.0
- **Database**: PostgreSQL with @fastify/postgres
- **Cache**: Redis with @fastify/redis
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: @fastify/helmet, @fastify/rate-limit
- **Validation**: Zod 3.22.4
- **Logging**: Pino 8.16.2

### Programming Language and Version
- **Language**: JavaScript (CommonJS)
- **Node.js Version**: 20.0.0+
- **Package Manager**: npm

### Database Technologies
- **Primary Database**: PostgreSQL 15+
- **Cache Layer**: Redis 7+
- **Connection Pooling**: @fastify/postgres
- **Data Validation**: Zod schemas

### External Libraries and Dependencies
```json
{
  "fastify": "^4.27.0",
  "@fastify/cors": "^9.0.1",
  "@fastify/helmet": "^11.1.1",
  "@fastify/rate-limit": "^9.1.0",
  "@fastify/swagger": "^8.14.0",
  "@fastify/swagger-ui": "^2.1.0",
  "@fastify/postgres": "^5.2.2",
  "@fastify/redis": "^6.1.1",
  "zod": "^3.22.4",
  "axios": "^1.6.0",
  "uuid": "^9.0.1",
  "pino": "^8.16.2"
}
```

## API Documentation

### Complete Endpoint Specifications

#### Health Check Endpoints
```http
GET /healthz
GET /readyz
```

#### Tool Catalog Endpoints
```http
GET /api/tools
GET /api/tools/:id
POST /api/tools
PUT /api/tools/:id
DELETE /api/tools/:id
```

#### Tool Launch Endpoints
```http
GET /api/tools/:id/launch
POST /api/tools/:id/launch
GET /api/tools/:id/launch/:resource_type/:resource_id
```

#### Webhook Endpoints
```http
POST /api/webhooks/:tool_id
GET /api/webhooks/:tool_id/events
GET /api/webhooks/:tool_id/status
```

#### Policy Endpoints
```http
GET /api/policies
POST /api/policies
PUT /api/policies/:id
DELETE /api/policies/:id
```

### Request/Response Schemas

#### Tool Object Schema
```json
{
  "id": "github",
  "name": "GitHub",
  "description": "Git repository hosting and collaboration platform",
  "integration_type": "oidc",
  "auth_config_json": {
    "client_id": "github-client",
    "scopes": ["read:user", "repo"]
  },
  "webhook_config_json": {
    "endpoint": "/webhooks/github",
    "secret": "webhook-secret"
  },
  "provisioning_config_json": {
    "enabled": true,
    "templates": ["repository", "team"]
  },
  "capabilities": ["repository_management", "team_management", "webhooks"],
  "status": "active",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

#### Launch Request Schema
```json
{
  "user_id": "user-123",
  "tool_id": "github",
  "resource_type": "repository",
  "resource_id": "repo-456",
  "launch_context": {
    "return_url": "http://localhost:3000/dashboard",
    "session_data": {}
  }
}
```

#### Launch Response Schema
```json
{
  "launch_url": "https://github.com/org/repo?token=abc123",
  "expires_at": "2024-01-01T01:00:00.000Z",
  "session_id": "session-789",
  "tool_roles": ["admin", "maintainer"],
  "capabilities": ["read", "write", "admin"]
}
```

### Authentication and Authorization Details
- **Identity Headers**: X-User-Sub, X-User-Email, X-User-Roles, X-User-Signature
- **HMAC Validation**: Signature verification for downstream services
- **Role-Based Access**: Tool access based on user roles and policies
- **Session Validation**: Launch session validation and expiration

### Error Codes and Handling
```json
{
  "400": "Bad request - invalid parameters",
  "401": "Unauthorized - missing or invalid identity headers",
  "403": "Forbidden - insufficient permissions for tool access",
  "404": "Tool not found",
  "500": "Internal server error"
}
```

## Service Dependencies

### Upstream and Downstream Service Dependencies
- **Upstream**: Auth-BFF (for identity headers)
- **Downstream**: PostgreSQL database, Redis cache
- **External**: DevOps tools (GitHub, GitLab, Jenkins, etc.)

### Third-Party Integrations
- **PostgreSQL**: Primary data storage
- **Redis**: Caching and session storage
- **DevOps Tools**: Webhook endpoints and API integrations

### Database Connections
- **PostgreSQL**: Tool catalog, policies, webhook events
- **Redis**: Launch sessions, tool metadata cache

### Message Queue Interactions
- **Current**: Direct webhook processing
- **Future**: Redis pub/sub for event distribution

## Health & Monitoring

### Health Check Endpoints
- **`/healthz`**: Basic service health status
- **`/readyz`**: Service readiness with database connectivity checks

### Monitoring and Logging Configurations
- **Logging**: Pino with structured JSON logging
- **Metrics**: Request/response timing and counts
- **Health Monitoring**: Database and Redis connectivity

### Performance Metrics
- **Tool Launch Time**: URL generation performance
- **Database Query Time**: PostgreSQL operation performance
- **Cache Hit Rate**: Redis cache effectiveness
- **Webhook Processing**: Event handling performance

### Alerting Mechanisms
- **Database Connectivity**: PostgreSQL connection failures
- **Redis Connectivity**: Cache service failures
- **Tool Launch Failures**: Authentication or policy failures
- **Webhook Processing**: Event handling failures

## Directory Structure

### Complete Folder Hierarchy
```
services/catalog/
├── Dockerfile
├── package.json
├── README.md
└── src/
    ├── config.js
    ├── index.js
    └── services/
        ├── database-manager.js
        ├── enhanced-launch-service.js
        ├── launch-service.js
        ├── policy-service.js
        ├── tool-metadata-service.js
        └── webhook-service.js
```

### File Organization Explanation
- **`config.js`**: Environment-based configuration
- **`index.js`**: Main service implementation and route definitions
- **`services/`**: Business logic modules
  - **`database-manager.js`**: PostgreSQL operations
  - **`enhanced-launch-service.js`**: Advanced launch capabilities
  - **`launch-service.js`**: Basic launch functionality
  - **`policy-service.js`**: Access control policies
  - **`tool-metadata-service.js`**: Tool capability management
  - **`webhook-service.js`**: Webhook event processing

### Key Configuration Files Location
- **Environment Variables**: `.env` file or Docker environment
- **Database Configuration**: PostgreSQL connection settings
- **Redis Configuration**: Cache connection settings
- **Swagger Configuration**: API documentation settings

## Tool Integration Capabilities

### Supported DevOps Tools
1. **GitHub**: Repository management, team provisioning
2. **GitLab**: Project management, CI/CD integration
3. **Jenkins**: Build job management, pipeline provisioning
4. **Argo CD**: Application deployment, sync management
5. **Terraform**: Infrastructure provisioning, workspace management
6. **SonarQube**: Code quality, project provisioning
7. **Grafana**: Dashboard management, folder provisioning
8. **Prometheus**: Monitoring configuration, alert management
9. **Kibana**: Log analysis, index pattern management
10. **Snyk**: Security scanning, project management
11. **Jira/ServiceNow**: Issue tracking, project provisioning

### Tool-Specific Features
- **OIDC Integration**: Single sign-on for all tools
- **Role Mapping**: SSO Hub roles to tool-specific roles
- **Provisioning**: Automated resource creation and management
- **Webhooks**: Real-time event processing and notifications
- **Deep-Linking**: Direct navigation to tool resources

## Security Features

### Access Control
- **Policy-Based Access**: Configurable access control policies
- **Role Validation**: User role verification for tool access
- **Session Management**: Secure launch session handling
- **Audit Logging**: Comprehensive access and usage logging

### Data Protection
- **Input Validation**: Zod schema validation for all inputs
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content security policy headers
- **Rate Limiting**: Request throttling for security

### Webhook Security
- **Signature Verification**: HMAC validation for webhook payloads
- **Source Validation**: Tool-specific webhook endpoint validation
- **Payload Validation**: Schema-based webhook data validation

## Deployment and Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3006
HOST=0.0.0.0
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/sso_hub
REDIS_URL=redis://localhost:6379

# Security Configuration
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# API Configuration
SWAGGER_ENABLED=true
API_VERSION=v1
```

### Docker Configuration
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3006
CMD ["npm", "start"]
```

### Health Check Commands
```bash
# Health check
curl http://localhost:3006/healthz

# Readiness check
curl http://localhost:3006/readyz

# Tool catalog
curl http://localhost:3006/api/tools

# API documentation
curl http://localhost:3006/docs
```

## Performance Optimization

### Caching Strategy
- **Redis Cache**: Tool metadata and launch session caching
- **Database Connection Pooling**: Optimized PostgreSQL connections
- **Response Caching**: Frequently accessed tool information

### Database Optimization
- **Indexed Queries**: Optimized database schema with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Structured queries for performance

### Scalability Features
- **Stateless Design**: Service can be horizontally scaled
- **Cache Distribution**: Redis-based distributed caching
- **Load Balancing**: Support for multiple service instances

## Troubleshooting

### Common Issues
1. **Database Connection Failures**: Check PostgreSQL connectivity and credentials
2. **Redis Connection Issues**: Verify Redis service availability
3. **Tool Launch Failures**: Validate authentication and policy configuration
4. **Webhook Processing Errors**: Check webhook endpoint configuration

### Debug Commands
```bash
# Check service logs
docker logs catalog-service

# Verify database connectivity
curl -v http://localhost:3006/readyz

# Test tool catalog
curl -v http://localhost:3006/api/tools

# Check webhook status
curl -v http://localhost:3006/api/webhooks/github/status
```

### Log Analysis
- **Launch Requests**: Track tool launch attempts and failures
- **Webhook Events**: Monitor webhook processing and errors
- **Policy Enforcement**: Review access control decisions
- **Database Operations**: Monitor query performance and errors

## Future Enhancements

### Planned Features
- **Advanced Analytics**: Tool usage analytics and reporting
- **Multi-Tool Workflows**: Cross-tool integration and automation
- **Enhanced Security**: Advanced authentication and authorization
- **Performance Monitoring**: Real-time performance metrics and alerting

### Integration Roadmap
- **Phase 1**: Basic tool catalog and launch (current)
- **Phase 2**: Advanced provisioning and webhook processing
- **Phase 3**: Multi-tool workflows and automation
- **Phase 4**: Advanced analytics and machine learning
