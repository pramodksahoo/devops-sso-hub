# Audit Service Documentation

## Service Overview

### Service Name and Purpose
**Audit Service** - Comprehensive audit logging and compliance service for SSO Hub that tracks all system activities, user actions, and security events across all integrated services.

### Business Use Cases and Functional Requirements
- **Compliance Auditing**: Meet regulatory and compliance requirements (SOX, GDPR, SOC2)
- **Security Monitoring**: Track security events and potential threats
- **User Activity Tracking**: Monitor user actions across all DevOps tools
- **Change Management**: Audit trail for all system and configuration changes
- **Incident Investigation**: Support security incident response and forensics
- **Performance Monitoring**: Track system performance and operational metrics
- **Data Retention**: Manage audit data retention and archival policies

### Service Boundaries and Responsibilities
- **Event Collection**: Gather audit events from all microservices
- **Event Processing**: Process and normalize audit events
- **Data Storage**: Store audit data with proper indexing and retention
- **Query Services**: Provide audit data querying and search capabilities
- **Reporting**: Generate compliance and audit reports
- **Alerting**: Alert on suspicious or critical audit events

## Architecture Documentation

### High-Level Architecture Diagram
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Frontend  │───▶│   Audit      │───▶│ PostgreSQL  │
│             │    │   Service    │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Event      │
                   │  Collector   │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Event      │
                   │  Processor   │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Audit      │
                   │   Manager    │
                   └──────────────┘
```

### Component Relationships and Interactions
1. **Frontend Integration**: Receives audit queries and displays audit data
2. **Event Collector**: Gathers audit events from all services
3. **Event Processor**: Normalizes and enriches audit events
4. **Audit Manager**: Manages audit data storage and retrieval
5. **Database Manager**: Handles audit data persistence
6. **Query Engine**: Provides audit data search and filtering

### Design Patterns Implemented
- **Observer Pattern**: Event-driven audit data collection
- **Repository Pattern**: Data access abstraction layer
- **Pipeline Pattern**: Event processing pipeline
- **Strategy Pattern**: Different event processing strategies
- **Factory Pattern**: Event type-specific processing

## Technical Specifications

### Technology Stack and Frameworks
- **Runtime**: Node.js 20+
- **Web Framework**: Fastify 4.27.0
- **Database**: PostgreSQL with @fastify/postgres
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: @fastify/helmet, @fastify/rate-limit
- **Validation**: Zod 3.22.4
- **Logging**: Pino 8.17.2
- **Event Processing**: Custom event processing engine

### Programming Language and Version
- **Language**: JavaScript (CommonJS)
- **Node.js Version**: 20.0.0+
- **Package Manager**: pnpm

### Database Technologies
- **Primary Database**: PostgreSQL 15+
- **Audit Data**: Structured audit event storage
- **Event Indexing**: Optimized audit data indexing
- **Historical Data**: Long-term audit data retention

### External Libraries and Dependencies
```json
{
  "fastify": "4.27.0",
  "@fastify/cors": "^9.0.1",
  "@fastify/helmet": "^11.1.1",
  "@fastify/rate-limit": "^9.1.0",
  "@fastify/postgres": "^5.2.2",
  "@fastify/swagger": "^8.14.0",
  "@fastify/swagger-ui": "^1.10.0",
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

#### Audit Event Endpoints
```http
POST /api/events
GET /api/events
GET /api/events/:id
GET /api/events/search
```

#### Audit Query Endpoints
```http
GET /api/audit/users/:user_id
GET /api/audit/tools/:tool_id
GET /api/audit/actions/:action_type
GET /api/audit/timeline
```

#### Compliance Endpoints
```http
GET /api/compliance/sox
GET /api/compliance/gdpr
GET /api/compliance/soc2
POST /api/compliance/reports
```

#### Export Endpoints
```http
GET /api/export/audit-trail
GET /api/export/compliance-report
POST /api/export/custom
```

### Request/Response Schemas

#### Audit Event Schema
```json
{
  "event_id": "evt-123",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "event_type": "user_login",
  "severity": "info",
  "source": "auth-bff",
  "user_id": "user-123",
  "user_email": "user@example.com",
  "user_roles": ["admin", "user"],
  "tool_id": "github",
  "action": "login_success",
  "details": {
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "session_id": "sess-456"
  },
  "metadata": {
    "request_id": "req-789",
    "correlation_id": "corr-101"
  }
}
```

#### Audit Query Request Schema
```json
{
  "query_type": "user_activity",
  "parameters": {
    "user_id": "user-123",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "event_types": ["login", "logout", "tool_access"],
    "tools": ["github", "gitlab"],
    "severity_levels": ["info", "warning", "error"]
  },
  "filters": {
    "min_severity": "info",
    "include_metadata": true
  }
}
```

#### Compliance Report Schema
```json
{
  "report_id": "compliance-2024-01",
  "type": "sox_compliance",
  "period": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  },
  "summary": {
    "total_events": 15000,
    "security_events": 150,
    "compliance_score": 98.5,
    "violations": 2
  },
  "details": {
    "access_controls": {
      "total_access": 5000,
      "unauthorized_access": 0,
      "compliance": 100.0
    },
    "user_management": {
      "total_users": 150,
      "active_users": 120,
      "inactive_users": 30
    }
  },
  "generated_at": "2024-02-01T00:00:00.000Z"
}
```

### Authentication and Authorization Details
- **Identity Headers**: X-User-Sub, X-User-Email, X-User-Roles, X-User-Signature
- **Role-Based Access**: Audit access based on user roles
- **Data Privacy**: Sensitive audit data access restrictions
- **Compliance Access**: Compliance report access permissions

### Error Codes and Handling
```json
{
  "400": "Bad request - invalid query parameters",
  "401": "Unauthorized - missing or invalid identity headers",
  "403": "Forbidden - insufficient permissions for audit access",
  "404": "Audit event or report not found",
  "500": "Internal server error",
  "503": "Audit service unavailable"
}
```

## Service Dependencies

### Upstream and Downstream Service Dependencies
- **Upstream**: Auth-BFF (for identity headers), all other microservices
- **Downstream**: PostgreSQL database for audit storage
- **External**: Event sources from integrated DevOps tools

### Third-Party Integrations
- **PostgreSQL**: Audit data storage and querying
- **DevOps Tools**: Security event collection
- **Compliance Frameworks**: SOX, GDPR, SOC2 compliance

### Database Connections
- **PostgreSQL**: Audit events, compliance data, reports
- **Connection Pooling**: Optimized database connections

### Message Queue Interactions
- **Current**: Direct event collection and processing
- **Future**: Async event processing with job queues

## Health & Monitoring

### Health Check Endpoints
- **`/healthz`**: Basic service health status
- **`/readyz`**: Service readiness with database connectivity checks

### Monitoring and Logging Configurations
- **Logging**: Pino with structured JSON logging
- **Metrics**: Event processing performance and data quality
- **Health Monitoring**: Database connectivity and event processing

### Performance Metrics
- **Event Processing Time**: Audit event processing performance
- **Query Response Time**: Audit data query performance
- **Database Performance**: PostgreSQL operation performance
- **Event Volume**: Events processed per second

### Alerting Mechanisms
- **Event Collection Failures**: Failed event collection detection
- **Processing Errors**: Event processing failures
- **Database Issues**: Database connection and performance problems
- **Compliance Violations**: Critical compliance issue detection

## Directory Structure

### Complete Folder Hierarchy
```
services/audit/
├── Dockerfile
├── package.json
├── README.md
└── src/
    ├── audit-manager.js
    ├── config.js
    └── index.js
```

### File Organization Explanation
- **`config.js`**: Environment-based configuration
- **`index.js`**: Main service implementation and route definitions
- **`audit-manager.js`**: Core audit management functionality

### Key Configuration Files Location
- **Environment Variables**: `.env` file or Docker environment
- **Database Configuration**: PostgreSQL connection settings
- **Audit Configuration**: Event collection and processing settings
- **Compliance Configuration**: Compliance framework settings

## Audit Capabilities

### Supported Event Types
1. **Authentication Events**: Login, logout, session management
2. **Authorization Events**: Access control, permission changes
3. **Tool Access Events**: Tool usage, resource access
4. **System Events**: Configuration changes, system updates
5. **Security Events**: Security violations, threat detection
6. **Compliance Events**: Compliance checks, policy violations

### Event Categories
- **User Activity**: User actions and interactions
- **System Activity**: System operations and changes
- **Security Events**: Security-related activities
- **Compliance Events**: Compliance and regulatory activities
- **Performance Events**: System performance metrics

### Data Processing Capabilities
- **Real-time Processing**: Live event collection and processing
- **Event Enrichment**: Add context and metadata to events
- **Event Correlation**: Link related events and activities
- **Data Normalization**: Standardize event data formats
- **Event Filtering**: Filter and categorize events

## Security Features

### Access Control
- **Role-Based Audit Access**: Audit data access based on user roles
- **Data Privacy**: Sensitive audit data protection
- **Compliance Access**: Compliance report access control
- **Audit Logging**: Complete audit access audit trail

### Data Protection
- **Input Validation**: Zod schema validation for all inputs
- **Data Encryption**: Secure storage of sensitive audit data
- **SQL Injection Prevention**: Parameterized database queries
- **XSS Protection**: Content security policy headers

### Audit Security
- **Immutable Logs**: Tamper-proof audit data storage
- **Access Logging**: Complete audit access logging
- **Data Integrity**: Audit data integrity verification
- **Secure Storage**: Encrypted audit data storage

## Deployment and Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3009
HOST=0.0.0.0
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/sso_hub

# Audit Configuration
AUDIT_EVENT_RETENTION_DAYS=2555
COMPLIANCE_REPORT_RETENTION_DAYS=3650
EVENT_PROCESSING_BATCH_SIZE=100
REAL_TIME_PROCESSING=true

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
EXPOSE 3009
CMD ["npm", "start"]
```

### Health Check Commands
```bash
# Health check
curl http://localhost:3009/healthz

# Readiness check
curl http://localhost:3009/readyz

# List audit events
curl http://localhost:3009/api/events

# Generate compliance report
curl http://localhost:3009/api/compliance/sox
```

## Performance Optimization

### Event Processing Optimization
- **Batch Processing**: Efficient batch event processing
- **Event Caching**: Cache frequently accessed audit data
- **Query Optimization**: Optimized audit data queries
- **Parallel Processing**: Concurrent event processing

### Database Optimization
- **Indexed Queries**: Optimized database schema with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Structured queries for performance
- **Data Partitioning**: Time-based data partitioning for large datasets

### Scalability Features
- **Stateless Design**: Service can be horizontally scaled
- **Load Distribution**: Support for multiple service instances
- **Async Processing**: Asynchronous event processing
- **Event Distribution**: Distributed event processing

## Compliance Features

### Supported Compliance Frameworks
1. **SOX (Sarbanes-Oxley)**: Financial reporting compliance
2. **GDPR (General Data Protection Regulation)**: Data privacy compliance
3. **SOC2 (System and Organization Controls)**: Security compliance
4. **ISO 27001**: Information security management
5. **HIPAA**: Healthcare data protection (if applicable)

### Compliance Capabilities
- **Access Control Monitoring**: Track all access control changes
- **User Activity Tracking**: Monitor user actions and permissions
- **System Change Auditing**: Audit all system configuration changes
- **Data Protection Monitoring**: Monitor data access and usage
- **Incident Response**: Support security incident investigation

### Compliance Reporting
- **Automated Reports**: Generate compliance reports automatically
- **Custom Reports**: Create tailored compliance reports
- **Export Capabilities**: Export compliance data in various formats
- **Scheduled Reporting**: Automated compliance report generation

## Troubleshooting

### Common Issues
1. **Event Collection Failures**: Verify event source connectivity
2. **Processing Errors**: Check event processing configuration
3. **Query Performance Issues**: Validate database indexes and queries
4. **Compliance Report Failures**: Check compliance framework configuration

### Debug Commands
```bash
# Check service logs
docker logs audit-service

# Verify database connectivity
curl -v http://localhost:3009/readyz

# Test event collection
curl -v http://localhost:3009/api/events

# Check compliance status
curl -v http://localhost:3009/api/compliance/sox
```

### Log Analysis
- **Event Collection**: Monitor event collection success and failures
- **Processing Performance**: Track event processing performance
- **Query Performance**: Monitor audit data query performance
- **Compliance Status**: Track compliance framework status

## Future Enhancements

### Planned Features
- **Advanced Analytics**: Machine learning-powered audit analysis
- **Real-time Monitoring**: Live audit event monitoring and alerting
- **Predictive Auditing**: AI-powered threat detection and prediction
- **Advanced Compliance**: Enhanced compliance framework support

### Integration Roadmap
- **Phase 1**: Basic audit logging and compliance (current)
- **Phase 2**: Advanced event processing and analytics
- **Phase 3**: Machine learning and predictive auditing
- **Phase 4**: AI-powered compliance and security platform

### Audit Evolution
- **Current**: Basic audit logging and compliance reporting
- **Future**: Advanced analytics and threat detection
- **Advanced**: Predictive auditing and AI-powered insights
- **Enterprise**: Enterprise-grade audit and compliance platform
