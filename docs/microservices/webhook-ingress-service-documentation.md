# Webhook Ingress Service Documentation

## Service Overview

### Service Name and Purpose
**Webhook Ingress Service** - Centralized webhook processing service for SSO Hub that handles incoming webhook events from all integrated DevOps tools, processes them, and distributes notifications.

### Business Use Cases and Functional Requirements
- **Webhook Processing**: Handle incoming webhooks from all 11 DevOps tools
- **Event Distribution**: Route webhook events to appropriate services
- **Signature Validation**: Verify webhook authenticity and integrity
- **Event Transformation**: Normalize webhook data for internal consumption
- **Notification Management**: Manage and distribute webhook notifications
- **Rate Limiting**: Control webhook processing rates and prevent abuse
- **Event Storage**: Store webhook events for audit and replay purposes

### Service Boundaries and Responsibilities
- **Webhook Reception**: Receive and validate incoming webhook requests
- **Event Processing**: Process and transform webhook events
- **Signature Verification**: Validate webhook signatures for security
- **Event Routing**: Route events to appropriate downstream services
- **Notification Delivery**: Deliver notifications to configured endpoints
- **Data Persistence**: Store webhook events and processing history

## Architecture Documentation

### High-Level Architecture Diagram
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   External  │───▶│   Webhook    │───▶│ PostgreSQL  │
│ DevOps Tools│    │   Ingress    │    │             │
│ (Webhooks)  │    │   Service    │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Event      │
                   │  Processor   │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │ Notification │
                   │   Service    │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │ Downstream   │
                   │  Services    │
                   └──────────────┘
```

### Component Relationships and Interactions
1. **Webhook Reception**: Receives webhook requests from external tools
2. **Event Processor**: Processes and validates webhook events
3. **Notification Service**: Manages notification delivery
4. **Database Manager**: Handles webhook data persistence
5. **Event Router**: Routes events to appropriate services
6. **Signature Validator**: Verifies webhook authenticity

### Design Patterns Implemented
- **Gateway Pattern**: Centralized webhook entry point
- **Processor Pattern**: Event processing pipeline
- **Observer Pattern**: Event notification and distribution
- **Repository Pattern**: Data access abstraction
- **Strategy Pattern**: Tool-specific webhook handling

## Technical Specifications

### Technology Stack and Frameworks
- **Runtime**: Node.js 20+
- **Web Framework**: Fastify 4.27.0
- **Database**: PostgreSQL with @fastify/postgres
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: @fastify/helmet, @fastify/rate-limit
- **Validation**: Zod 3.22.4
- **Logging**: Pino 8.17.2
- **Webhook Processing**: Custom webhook processing engine

### Programming Language and Version
- **Language**: JavaScript (CommonJS)
- **Node.js Version**: 20.0.0+
- **Package Manager**: pnpm

### Database Technologies
- **Primary Database**: PostgreSQL 15+
- **Webhook Events**: Structured webhook event storage
- **Processing History**: Webhook processing status and history
- **Notification Data**: Notification configuration and delivery status

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
  "crypto": "^1.0.1"
}
```

## API Documentation

### Complete Endpoint Specifications

#### Health Check Endpoints
```http
GET /healthz
GET /readyz
```

#### Webhook Endpoints
```http
POST /webhooks/:tool_id
GET /webhooks/:tool_id/events
GET /webhooks/:tool_id/status
```

#### Event Management Endpoints
```http
GET /api/events
GET /api/events/:id
GET /api/events/search
POST /api/events/replay
```

#### Notification Endpoints
```http
GET /api/notifications
GET /api/notifications/:id
POST /api/notifications
PUT /api/notifications/:id
DELETE /api/notifications/:id
```

#### Configuration Endpoints
```http
GET /api/config/webhooks
PUT /api/config/webhooks/:tool_id
GET /api/config/notifications
PUT /api/config/notifications
```

### Request/Response Schemas

#### Webhook Event Schema
```json
{
  "webhook_id": "webhook-123",
  "tool_id": "github",
  "event_type": "push",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "payload": {
    "ref": "refs/heads/main",
    "before": "abc123",
    "after": "def456",
    "repository": {
      "name": "my-repo",
      "full_name": "org/my-repo"
    }
  },
  "headers": {
    "x-github-event": "push",
    "x-github-delivery": "delivery-123",
    "x-hub-signature-256": "sha256=..."
  },
  "processing_status": "processed",
  "delivery_status": "delivered",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

#### Notification Configuration Schema
```json
{
  "notification_id": "notif-123",
  "tool_id": "github",
  "event_types": ["push", "pull_request", "issue"],
  "endpoints": [
    {
      "url": "https://webhook.site/abc123",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer token123"
      },
      "timeout": 5000,
      "retry_count": 3
    }
  ],
  "filters": {
    "repositories": ["org/my-repo", "org/other-repo"],
    "branches": ["main", "develop"],
    "users": ["user1", "user2"]
  },
  "status": "active",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

#### Webhook Configuration Schema
```json
{
  "tool_id": "github",
  "webhook_url": "https://sso-hub.com/webhooks/github",
  "secret": "webhook-secret-123",
  "events": ["push", "pull_request", "issue", "release"],
  "content_type": "json",
  "insecure_ssl": false,
  "active": true,
  "last_delivery": "2024-01-01T00:00:00.000Z",
  "delivery_count": 150,
  "failure_count": 2
}
```

### Authentication and Authorization Details
- **Webhook Authentication**: HMAC signature validation for incoming webhooks
- **API Authentication**: Identity headers for internal API access
- **Role-Based Access**: Webhook management based on user roles
- **Secret Management**: Secure webhook secret storage and validation

### Error Codes and Handling
```json
{
  "400": "Bad request - invalid webhook payload or signature",
  "401": "Unauthorized - missing or invalid webhook signature",
  "403": "Forbidden - insufficient permissions for webhook management",
  "404": "Webhook endpoint or configuration not found",
  "422": "Unprocessable entity - webhook validation failed",
  "500": "Internal server error",
  "503": "Webhook processing service unavailable"
}
```

## Service Dependencies

### Upstream and Downstream Service Dependencies
- **Upstream**: External DevOps tools (GitHub, GitLab, Jenkins, etc.)
- **Downstream**: PostgreSQL database, notification services
- **Internal**: Other microservices for event processing

### Third-Party Integrations
- **PostgreSQL**: Webhook event storage and processing history
- **DevOps Tools**: Webhook endpoints and event sources
- **Notification Services**: External notification delivery endpoints

### Database Connections
- **PostgreSQL**: Webhook events, notifications, configurations
- **Connection Pooling**: Optimized database connections

### Message Queue Interactions
- **Current**: Direct webhook processing and notification delivery
- **Future**: Async webhook processing with job queues

## Health & Monitoring

### Health Check Endpoints
- **`/healthz`**: Basic service health status
- **`/readyz`**: Service readiness with database connectivity checks

### Monitoring and Logging Configurations
- **Logging**: Pino with structured JSON logging
- **Metrics**: Webhook processing performance and delivery rates
- **Health Monitoring**: Database connectivity and webhook processing

### Performance Metrics
- **Webhook Processing Time**: Time to process incoming webhooks
- **Delivery Success Rate**: Percentage of successful notifications
- **Database Performance**: PostgreSQL operation performance
- **Webhook Volume**: Webhooks processed per second

### Alerting Mechanisms
- **Webhook Failures**: Failed webhook processing detection
- **Signature Validation Errors**: Invalid webhook signature alerts
- **Notification Delivery Failures**: Failed notification delivery
- **Database Issues**: Database connection and performance problems

## Directory Structure

### Complete Folder Hierarchy
```
services/webhook-ingress/
├── Dockerfile
├── package.json
├── README.md
└── src/
    ├── config.js
    ├── database-manager.js
    ├── index.js
    ├── notification-service.js
    └── webhook-handlers.js
```

### File Organization Explanation
- **`config.js`**: Environment-based configuration
- **`index.js`**: Main service implementation and route definitions
- **`database-manager.js`**: Database operations and connection management
- **`notification-service.js`**: Notification management and delivery
- **`webhook-handlers.js`**: Tool-specific webhook handling logic

### Key Configuration Files Location
- **Environment Variables**: `.env` file or Docker environment
- **Database Configuration**: PostgreSQL connection settings
- **Webhook Configuration**: Tool-specific webhook settings
- **Notification Configuration**: Notification delivery settings

## Webhook Processing Capabilities

### Supported DevOps Tools
1. **GitHub**: Repository events, pull requests, issues, releases
2. **GitLab**: Project events, merge requests, issues, pipelines
3. **Jenkins**: Build events, job status, pipeline completion
4. **Argo CD**: Application sync events, deployment status
5. **Terraform**: Run events, workspace changes, state updates
6. **SonarQube**: Quality gate events, analysis completion
7. **Grafana**: Dashboard changes, alert notifications
8. **Prometheus**: Alert firing, metric threshold breaches
9. **Kibana**: Index changes, dashboard modifications
10. **Snyk**: Vulnerability alerts, scan completion
11. **Jira/ServiceNow**: Issue updates, workflow transitions

### Webhook Event Types
- **Repository Events**: Code pushes, branch changes, tag creation
- **Build Events**: CI/CD pipeline execution, build status
- **Deployment Events**: Application deployment, sync status
- **Security Events**: Vulnerability alerts, security scans
- **User Events**: User actions, permission changes
- **System Events**: Configuration changes, system updates

### Processing Features
- **Signature Validation**: HMAC signature verification for security
- **Payload Validation**: Schema-based webhook payload validation
- **Event Enrichment**: Add context and metadata to events
- **Event Routing**: Route events to appropriate services
- **Retry Logic**: Automatic retry for failed processing
- **Dead Letter Queue**: Handle failed webhook processing

## Security Features

### Webhook Security
- **Signature Validation**: HMAC signature verification for all webhooks
- **Secret Management**: Secure webhook secret storage and rotation
- **Rate Limiting**: Prevent webhook abuse and DoS attacks
- **IP Whitelisting**: Restrict webhook sources to trusted IPs

### Access Control
- **Role-Based Access**: Webhook management based on user roles
- **API Security**: Secure internal API access with identity headers
- **Audit Logging**: Complete webhook access and processing audit trail

### Data Protection
- **Input Validation**: Zod schema validation for all webhook payloads
- **Data Sanitization**: Secure webhook data processing and storage
- **SQL Injection Prevention**: Parameterized database queries
- **XSS Protection**: Content security policy headers

## Deployment and Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3007
HOST=0.0.0.0
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/sso_hub

# Webhook Configuration
WEBHOOK_SECRET_KEY=your-webhook-secret-key
WEBHOOK_RATE_LIMIT_MAX=1000
WEBHOOK_RATE_LIMIT_WINDOW=60000
WEBHOOK_TIMEOUT=30000

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
EXPOSE 3007
CMD ["npm", "start"]
```

### Health Check Commands
```bash
# Health check
curl http://localhost:3007/healthz

# Readiness check
curl http://localhost:3007/readyz

# List webhook events
curl http://localhost:3007/api/events

# Check webhook status
curl http://localhost:3007/webhooks/github/status
```

## Performance Optimization

### Webhook Processing Optimization
- **Async Processing**: Non-blocking webhook processing
- **Batch Processing**: Efficient batch webhook processing
- **Connection Pooling**: Optimized HTTP client connections
- **Caching**: Cache webhook configurations and event data

### Database Optimization
- **Indexed Queries**: Optimized database schema with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Structured queries for performance
- **Data Partitioning**: Time-based data partitioning for large datasets

### Scalability Features
- **Stateless Design**: Service can be horizontally scaled
- **Load Distribution**: Support for multiple service instances
- **Async Processing**: Asynchronous webhook processing
- **Event Distribution**: Distributed webhook event processing

## Troubleshooting

### Common Issues
1. **Webhook Signature Failures**: Verify webhook secret configuration
2. **Processing Failures**: Check webhook processing configuration
3. **Notification Delivery Issues**: Verify notification endpoint configuration
4. **Database Connection Issues**: Check PostgreSQL connectivity

### Debug Commands
```bash
# Check service logs
docker logs webhook-ingress-service

# Verify database connectivity
curl -v http://localhost:3007/readyz

# Test webhook endpoint
curl -v -X POST http://localhost:3007/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{"test": "data"}'

# Check webhook events
curl -v http://localhost:3007/api/events
```

### Log Analysis
- **Webhook Reception**: Monitor webhook reception success and failures
- **Processing Performance**: Track webhook processing performance
- **Notification Delivery**: Monitor notification delivery success rates
- **Error Patterns**: Identify recurring webhook processing failures

## Future Enhancements

### Planned Features
- **Advanced Event Routing**: Intelligent event routing based on content
- **Event Transformation**: Advanced webhook payload transformation
- **Real-time Monitoring**: Live webhook processing monitoring
- **Advanced Analytics**: Webhook processing analytics and insights

### Integration Roadmap
- **Phase 1**: Basic webhook processing and notification (current)
- **Phase 2**: Advanced event routing and transformation
- **Phase 3**: Real-time monitoring and analytics
- **Phase 4**: AI-powered webhook processing optimization

### Webhook Evolution
- **Current**: Basic webhook processing and notification delivery
- **Future**: Advanced event routing and transformation
- **Advanced**: Real-time monitoring and intelligent processing
- **Enterprise**: Enterprise-grade webhook management platform
