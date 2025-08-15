# Admin Config Service Documentation

## Service Overview

### Service Name and Purpose
**Admin Config Service** - Centralized configuration management service for SSO Hub that handles administrative configurations, tool integration settings, and system-wide configuration management.

### Business Use Cases and Functional Requirements
- **Configuration Management**: Centralized management of all service configurations
- **Tool Integration Setup**: Configure and manage DevOps tool integrations
- **System Administration**: Administrative functions and system management
- **Configuration Validation**: Validate configuration settings and dependencies
- **Configuration Distribution**: Distribute configurations to other services
- **Integration Testing**: Test tool integrations and configurations
- **Configuration Backup**: Backup and restore configuration data

### Service Boundaries and Responsibilities
- **Configuration Storage**: Store and manage system configurations
- **Tool Integration**: Manage DevOps tool integration settings
- **Admin Functions**: Provide administrative and management functions
- **Configuration Validation**: Validate configuration integrity and dependencies
- **Service Coordination**: Coordinate configurations across all services
- **Integration Testing**: Test and validate tool integrations

## Architecture Documentation

### High-Level Architecture Diagram
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Frontend  │───▶│   Admin      │───▶│ PostgreSQL  │
│             │    │   Config     │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Tool       │
                   │ Integration  │
                   │   Service    │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   External   │
                   │ DevOps Tools │
                   │ (Test APIs)  │
                   └──────────────┘
```

### Component Relationships and Interactions
1. **Frontend Integration**: Receives configuration requests and admin functions
2. **Configuration Service**: Manages system configurations and settings
3. **Tool Integration Service**: Handles DevOps tool integration configuration
4. **Keycloak Service**: Manages Keycloak integration and configuration
5. **Integration Test Service**: Tests tool integrations and configurations
6. **Database Manager**: Handles configuration data persistence

### Design Patterns Implemented
- **Configuration Pattern**: Centralized configuration management
- **Service Pattern**: Service layer for different configuration concerns
- **Repository Pattern**: Data access abstraction layer
- **Factory Pattern**: Configuration object creation
- **Validation Pattern**: Configuration validation and verification

## Technical Specifications

### Technology Stack and Frameworks
- **Runtime**: Node.js 20+
- **Web Framework**: Fastify 4.27.0
- **Database**: PostgreSQL with @fastify/postgres
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: @fastify/helmet, @fastify/rate-limit
- **Validation**: Zod 3.22.4
- **Logging**: Pino 8.17.2
- **Configuration Management**: Custom configuration management engine

### Programming Language and Version
- **Language**: JavaScript (CommonJS)
- **Node.js Version**: 20.0.0+
- **Package Manager**: npm

### Database Technologies
- **Primary Database**: PostgreSQL 15+
- **Configuration Data**: System and service configurations
- **Tool Configurations**: DevOps tool integration settings
- **Admin Data**: Administrative functions and settings

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
  "axios": "^1.6.0",
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

#### Configuration Management Endpoints
```http
GET /api/config
GET /api/config/:service
PUT /api/config/:service
POST /api/config/:service/validate
```

#### Tool Integration Endpoints
```http
GET /api/tools
GET /api/tools/:id
POST /api/tools
PUT /api/tools/:id
DELETE /api/tools/:id
POST /api/tools/:id/test
```

#### Keycloak Management Endpoints
```http
GET /api/keycloak/config
PUT /api/keycloak/config
POST /api/keycloak/test
GET /api/keycloak/status
```

#### Integration Testing Endpoints
```http
POST /api/integration/test
GET /api/integration/status
GET /api/integration/results
POST /api/integration/validate
```

#### Admin Functions Endpoints
```http
GET /api/admin/system-status
POST /api/admin/backup-config
POST /api/admin/restore-config
GET /api/admin/logs
```

### Request/Response Schemas

#### Tool Integration Configuration Schema
```json
{
  "tool_id": "github",
  "name": "GitHub",
  "type": "git_repository",
  "integration_config": {
    "oidc": {
      "client_id": "github-client-id",
      "client_secret": "encrypted-secret",
      "redirect_uri": "https://sso-hub.com/auth/github/callback",
      "scopes": ["read:user", "repo", "read:org"]
    },
    "api": {
      "base_url": "https://api.github.com",
      "rate_limit": 5000,
      "timeout": 30000
    },
    "webhook": {
      "enabled": true,
      "secret": "webhook-secret",
      "events": ["push", "pull_request", "issue"]
    }
  },
  "provisioning_config": {
    "enabled": true,
    "templates": ["repository", "team", "branch_protection"],
    "auto_sync": true
  },
  "status": "active",
  "last_test": "2024-01-01T00:00:00.000Z",
  "test_status": "success",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

#### System Configuration Schema
```json
{
  "config_id": "system-main",
  "service": "system",
  "category": "main",
  "settings": {
    "session": {
      "timeout": 3600000,
      "max_age": 86400000,
      "secure": true,
      "http_only": true
    },
    "security": {
      "rate_limit": {
        "max_requests": 100,
        "window_ms": 60000
      },
      "cors": {
        "origin": ["https://sso-hub.com"],
        "credentials": true
      }
    },
    "logging": {
      "level": "info",
      "format": "json",
      "retention_days": 30
    }
  },
  "version": "1.0.0",
  "last_updated": "2024-01-01T00:00:00.000Z",
  "updated_by": "admin@example.com"
}
```

#### Integration Test Result Schema
```json
{
  "test_id": "test-123",
  "tool_id": "github",
  "test_type": "full_integration",
  "status": "completed",
  "started_at": "2024-01-01T00:00:00.000Z",
  "completed_at": "2024-01-01T00:05:00.000Z",
  "results": {
    "oidc_connection": {
      "status": "success",
      "response_time": 150,
      "details": "OIDC connection successful"
    },
    "api_access": {
      "status": "success",
      "response_time": 200,
      "details": "API access verified"
    },
    "webhook_setup": {
      "status": "success",
      "response_time": 300,
      "details": "Webhook configured successfully"
    }
  },
  "overall_score": 100,
  "recommendations": []
}
```

### Authentication and Authorization Details
- **Identity Headers**: X-User-Sub, X-User-Email, X-User-Roles, X-User-Signature
- **Admin Access**: Configuration management restricted to admin users
- **Role-Based Access**: Different configuration access levels based on roles
- **Audit Logging**: Complete configuration change audit trail

### Error Codes and Handling
```json
{
  "400": "Bad request - invalid configuration parameters",
  "401": "Unauthorized - missing or invalid identity headers",
  "403": "Forbidden - insufficient permissions for configuration access",
  "404": "Configuration or tool integration not found",
  "409": "Configuration conflict - validation failed",
  "500": "Internal server error",
  "503": "Configuration service unavailable"
}
```

## Service Dependencies

### Upstream and Downstream Service Dependencies
- **Upstream**: Auth-BFF (for identity headers)
- **Downstream**: PostgreSQL database, external DevOps tools
- **Internal**: All other microservices for configuration distribution

### Third-Party Integrations
- **PostgreSQL**: Configuration data storage and management
- **DevOps Tools**: Integration testing and configuration validation
- **Keycloak**: Identity provider configuration and management

### Database Connections
- **PostgreSQL**: Configurations, tool integrations, admin data
- **Connection Pooling**: Optimized database connections

### Message Queue Interactions
- **Current**: Direct configuration management and distribution
- **Future**: Async configuration updates with notification queues

## Health & Monitoring

### Health Check Endpoints
- **`/healthz`**: Basic service health status
- **`/readyz`**: Service readiness with database connectivity checks

### Monitoring and Logging Configurations
- **Logging**: Pino with structured JSON logging
- **Metrics**: Configuration management performance and validation
- **Health Monitoring**: Database connectivity and configuration integrity

### Performance Metrics
- **Configuration Load Time**: Time to load and validate configurations
- **Integration Test Time**: Time to complete integration tests
- **Database Performance**: PostgreSQL operation performance
- **Validation Performance**: Configuration validation performance

### Alerting Mechanisms
- **Configuration Errors**: Invalid configuration detection
- **Integration Failures**: Failed integration test alerts
- **Validation Errors**: Configuration validation failures
- **Database Issues**: Database connection and performance problems

## Directory Structure

### Complete Folder Hierarchy
```
services/admin-config/
├── Dockerfile
├── package.json
├── README.md
└── src/
    ├── config.js
    ├── index.js
    ├── schemas/
    │   └── tool-schemas.js
    └── services/
        ├── integration-test-service.js
        ├── keycloak-service.js
        └── tool-config-service.js
```

### File Organization Explanation
- **`config.js`**: Environment-based configuration
- **`index.js`**: Main service implementation and route definitions
- **`schemas/`**: Configuration validation schemas
- **`services/`**: Business logic modules
  - **`integration-test-service.js`**: Tool integration testing
  - **`keycloak-service.js`**: Keycloak configuration management
  - **`tool-config-service.js`**: Tool configuration management

### Key Configuration Files Location
- **Environment Variables**: `.env` file or Docker environment
- **Database Configuration**: PostgreSQL connection settings
- **Configuration Schemas**: Tool and system configuration schemas
- **Service Configuration**: Service-specific configuration settings

## Configuration Management Capabilities

### Supported Configuration Types
1. **System Configuration**: Core system settings and parameters
2. **Service Configuration**: Individual microservice configurations
3. **Tool Integration**: DevOps tool integration settings
4. **Security Configuration**: Security and authentication settings
5. **Network Configuration**: Network and connectivity settings
6. **Custom Configuration**: User-defined configuration categories

### Configuration Features
- **Hierarchical Configuration**: Nested configuration structures
- **Environment Overrides**: Environment-specific configuration values
- **Configuration Validation**: Schema-based configuration validation
- **Configuration Versioning**: Track configuration changes and versions
- **Configuration Templates**: Reusable configuration templates
- **Configuration Inheritance**: Inherit configuration from parent categories

### Tool Integration Management
- **OIDC Configuration**: OpenID Connect integration settings
- **API Configuration**: Tool API access and rate limiting
- **Webhook Configuration**: Webhook setup and management
- **Provisioning Configuration**: Automated resource provisioning
- **Authentication Configuration**: Tool-specific authentication settings

## Security Features

### Access Control
- **Admin-Only Access**: Configuration management restricted to admins
- **Role-Based Configuration**: Different configuration access levels
- **Audit Logging**: Complete configuration change audit trail
- **Configuration Validation**: Secure configuration validation

### Data Protection
- **Input Validation**: Zod schema validation for all inputs
- **Configuration Encryption**: Secure storage of sensitive configurations
- **SQL Injection Prevention**: Parameterized database queries
- **XSS Protection**: Content security policy headers

### Configuration Security
- **Secret Management**: Secure handling of configuration secrets
- **Configuration Validation**: Validate configuration security settings
- **Access Logging**: Complete configuration access logging
- **Change Approval**: Configuration change approval workflows

## Deployment and Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3005
HOST=0.0.0.0
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/sso_hub

# Configuration Management
CONFIG_VALIDATION_STRICT=true
CONFIG_BACKUP_ENABLED=true
CONFIG_BACKUP_RETENTION_DAYS=30
INTEGRATION_TEST_TIMEOUT=300000

# Security Configuration
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_MAX=50
RATE_LIMIT_WINDOW=60000
```

### Docker Configuration
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3005
CMD ["npm", "start"]
```

### Health Check Commands
```bash
# Health check
curl http://localhost:3005/healthz

# Readiness check
curl http://localhost:3005/readyz

# List configurations
curl http://localhost:3005/api/config

# List tool integrations
curl http://localhost:3005/api/tools
```

## Performance Optimization

### Configuration Optimization
- **Configuration Caching**: Cache frequently accessed configurations
- **Lazy Loading**: Load configurations on-demand
- **Validation Optimization**: Efficient configuration validation
- **Template Processing**: Optimized configuration template processing

### Database Optimization
- **Indexed Queries**: Optimized database schema with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Structured queries for performance
- **Data Partitioning**: Configuration data partitioning for large systems

### Scalability Features
- **Stateless Design**: Service can be horizontally scaled
- **Load Distribution**: Support for multiple service instances
- **Async Processing**: Asynchronous configuration processing
- **Configuration Distribution**: Distributed configuration management

## Troubleshooting

### Common Issues
1. **Configuration Validation Failures**: Check configuration schema and values
2. **Integration Test Failures**: Verify tool connectivity and credentials
3. **Configuration Distribution Issues**: Check service connectivity
4. **Database Connection Issues**: Verify PostgreSQL connectivity

### Debug Commands
```bash
# Check service logs
docker logs admin-config-service

# Verify database connectivity
curl -v http://localhost:3005/readyz

# Test configuration validation
curl -v http://localhost:3005/api/config/system/validate

# Check tool integration status
curl -v http://localhost:3005/api/tools/github
```

### Log Analysis
- **Configuration Changes**: Monitor configuration modification attempts
- **Validation Errors**: Track configuration validation failures
- **Integration Tests**: Monitor integration test results and failures
- **Access Patterns**: Review configuration access patterns

## Future Enhancements

### Planned Features
- **Advanced Configuration Management**: Git-based configuration management
- **Configuration Templates**: Advanced configuration template system
- **Configuration Analytics**: Configuration usage and impact analytics
- **Automated Configuration**: AI-powered configuration optimization

### Integration Roadmap
- **Phase 1**: Basic configuration management (current)
- **Phase 2**: Advanced validation and templates
- **Phase 3**: Configuration analytics and optimization
- **Phase 4**: AI-powered configuration management

### Configuration Evolution
- **Current**: Basic configuration management and validation
- **Future**: Advanced templates and validation
- **Advanced**: Configuration analytics and optimization
- **Enterprise**: Enterprise-grade configuration management platform
