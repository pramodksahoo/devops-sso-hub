# Notifier Service Documentation

## Service Overview

### Service Name and Purpose
**Notifier Service** - Centralized notification and alerting service for SSO Hub that handles all system notifications, alerts, and communication across all integrated DevOps tools and services.

### Business Use Cases and Functional Requirements
- **System Notifications**: Send notifications for system events and alerts
- **User Notifications**: Deliver user-specific notifications and alerts
- **Tool Integration**: Send notifications from all integrated DevOps tools
- **Alert Management**: Manage and escalate critical alerts
- **Notification Channels**: Support multiple notification channels (email, Slack, webhook)
- **Notification Templates**: Use templates for consistent notification formatting
- **Delivery Tracking**: Track notification delivery and user engagement

### Service Boundaries and Responsibilities
- **Notification Processing**: Process and format notifications
- **Channel Management**: Manage different notification channels
- **Template Management**: Handle notification templates
- **Delivery Management**: Ensure reliable notification delivery
- **User Preferences**: Respect user notification preferences
- **Alert Escalation**: Handle critical alert escalation

## Architecture Documentation

### High-Level Architecture Diagram
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Frontend  │───▶│   Notifier  │───▶│ PostgreSQL  │
│             │    │   Service   │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │ Notification │
                   │   Processor  │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Channel    │
                   │   Manager    │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   External   │
                   │   Channels   │
                   │ (Email, etc.)│
                   └──────────────┘
```

### Component Relationships and Interactions
1. **Frontend Integration**: Receives notification requests and preferences
2. **Notification Processor**: Processes and formats notifications
3. **Channel Manager**: Manages different notification channels
4. **Template Manager**: Handles notification templates
5. **Delivery Manager**: Ensures reliable notification delivery
6. **Database Manager**: Handles notification data persistence

### Design Patterns Implemented
- **Processor Pattern**: Notification processing pipeline
- **Channel Pattern**: Multiple notification channel support
- **Template Pattern**: Notification template management
- **Repository Pattern**: Data access abstraction layer
- **Observer Pattern**: Event-driven notification processing

## Technical Specifications

### Technology Stack and Frameworks
- **Runtime**: Node.js 20+
- **Web Framework**: Fastify 4.27.0
- **Database**: PostgreSQL with @fastify/postgres
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: @fastify/helmet, @fastify/rate-limit
- **Validation**: Zod 3.22.4
- **Logging**: Pino 8.17.2
- **Notification Engine**: Custom notification processing engine

### Programming Language and Version
- **Language**: JavaScript (CommonJS)
- **Node.js Version**: 20.0.0+
- **Package Manager**: npm

### Database Technologies
- **Primary Database**: PostgreSQL 15+
- **Notification Data**: Notification records and delivery status
- **Template Data**: Notification templates and configurations
- **User Preferences**: User notification preferences

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
  "nodemailer": "^6.9.7",
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

#### Notification Management Endpoints
```http
POST /api/notifications
GET /api/notifications
GET /api/notifications/:id
PUT /api/notifications/:id
DELETE /api/notifications/:id
```

#### Notification Delivery Endpoints
```http
POST /api/notifications/send
GET /api/notifications/delivery/:id
GET /api/notifications/delivery/status
```

#### Template Management Endpoints
```http
GET /api/templates
GET /api/templates/:id
POST /api/templates
PUT /api/templates/:id
DELETE /api/templates/:id
```

#### Channel Management Endpoints
```http
GET /api/channels
GET /api/channels/:id
POST /api/channels
PUT /api/channels/:id
DELETE /api/channels/:id
POST /api/channels/:id/test
```

### Request/Response Schemas

#### Notification Request Schema
```json
{
  "notification_id": "notif-123",
  "type": "alert",
  "priority": "high",
  "title": "Security Alert - Unauthorized Access Attempt",
  "message": "Multiple failed login attempts detected from IP 192.168.1.100",
  "recipients": ["admin@example.com", "security@example.com"],
  "channels": ["email", "slack"],
  "template_id": "security-alert",
  "metadata": {
    "source": "auth-bff",
    "event_id": "evt-456",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "severity": "critical"
  },
  "scheduled_at": "2024-01-01T00:00:00.000Z"
}
```

#### Notification Template Schema
```json
{
  "template_id": "security-alert",
  "name": "Security Alert Template",
  "description": "Template for security-related notifications",
  "type": "alert",
  "channels": ["email", "slack"],
  "subject_template": "Security Alert: {{alert_type}}",
  "body_template": "A {{alert_type}} has been detected.\n\nDetails:\n{{details}}\n\nTime: {{timestamp}}\nSource: {{source}}\n\nPlease take immediate action.",
  "variables": ["alert_type", "details", "timestamp", "source"],
  "format": "text",
  "version": "1.0.0",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

#### Notification Delivery Schema
```json
{
  "delivery_id": "delivery-123",
  "notification_id": "notif-123",
  "channel": "email",
  "recipient": "admin@example.com",
  "status": "delivered",
  "attempts": 1,
  "sent_at": "2024-01-01T00:00:00.000Z",
  "delivered_at": "2024-01-01T00:00:01.000Z",
  "metadata": {
    "message_id": "msg-789",
    "provider": "smtp",
    "response": "250 OK"
  }
}
```

### Authentication and Authorization Details
- **Identity Headers**: X-User-Sub, X-User-Email, X-User-Roles, X-User-Signature
- **Admin Access**: Notification management restricted to admin users
- **User Access**: Users can manage their notification preferences
- **Audit Logging**: Complete notification activity audit trail

### Error Codes and Handling
```json
{
  "400": "Bad request - invalid notification parameters",
  "401": "Unauthorized - missing or invalid identity headers",
  "403": "Forbidden - insufficient permissions for notification management",
  "404": "Notification or template not found",
  "409": "Notification conflict - validation failed",
  "500": "Internal server error",
  "503": "Notification service unavailable"
}
```

## Service Dependencies

### Upstream and Downstream Service Dependencies
- **Upstream**: Auth-BFF (for identity headers), all other microservices
- **Downstream**: PostgreSQL database, external notification channels
- **Internal**: Notification requests from all services

### Third-Party Integrations
- **PostgreSQL**: Notification data storage and management
- **Email Services**: SMTP/email delivery services
- **Slack**: Slack webhook integration
- **Webhook Services**: External webhook endpoints

### Database Connections
- **PostgreSQL**: Notifications, templates, delivery status
- **Connection Pooling**: Optimized database connections

### Message Queue Interactions
- **Current**: Direct notification processing and delivery
- **Future**: Async notification processing with job queues

## Health & Monitoring

### Health Check Endpoints
- **`/healthz`**: Basic service health status
- **`/readyz`**: Service readiness with database connectivity checks

### Monitoring and Logging Configurations
- **Logging**: Pino with structured JSON logging
- **Metrics**: Notification delivery performance and success rates
- **Health Monitoring**: Database connectivity and channel availability

### Performance Metrics
- **Notification Processing Time**: Time to process notifications
- **Delivery Success Rate**: Percentage of successful deliveries
- **Channel Performance**: Performance of different notification channels
- **Template Processing**: Template rendering performance

### Alerting Mechanisms
- **Delivery Failures**: Failed notification delivery alerts
- **Channel Issues**: Notification channel connectivity problems
- **Template Errors**: Template rendering and processing errors
- **Database Issues**: Database connection and performance problems

## Directory Structure

### Complete Folder Hierarchy
```
services/notifier/
├── Dockerfile
├── package.json
├── README.md
└── src/
    ├── config.js
    ├── index.js
    ├── notification-processor.js
    ├── channel-manager.js
    ├── template-manager.js
    └── delivery-manager.js
```

### File Organization Explanation
- **`config.js`**: Environment-based configuration
- **`index.js`**: Main service implementation and route definitions
- **`notification-processor.js`**: Core notification processing logic
- **`channel-manager.js`**: Notification channel management
- **`template-manager.js`**: Notification template management
- **`delivery-manager.js`**: Notification delivery management

### Key Configuration Files Location
- **Environment Variables**: `.env` file or Docker environment
- **Database Configuration**: PostgreSQL connection settings
- **Channel Configuration**: Notification channel settings
- **Template Configuration**: Notification template settings

## Notification Capabilities

### Supported Notification Types
1. **System Notifications**: System events and alerts
2. **User Notifications**: User-specific notifications
3. **Security Alerts**: Security and access control alerts
4. **Tool Notifications**: DevOps tool integration notifications
5. **Compliance Notifications**: Compliance and governance alerts
6. **Custom Notifications**: User-defined notification types

### Notification Channels
- **Email**: SMTP-based email delivery
- **Slack**: Slack webhook integration
- **Webhook**: HTTP webhook delivery
- **SMS**: SMS delivery (future)
- **Push Notifications**: Mobile push notifications (future)

### Notification Features
- **Template System**: Reusable notification templates
- **Variable Substitution**: Dynamic content in notifications
- **Priority Management**: Notification priority and escalation
- **Scheduling**: Scheduled notification delivery
- **Retry Logic**: Automatic retry for failed deliveries
- **Delivery Tracking**: Track notification delivery status

## Security Features

### Access Control
- **Admin-Only Access**: Notification management restricted to admins
- **User Preferences**: Users can manage their notification preferences
- **Channel Security**: Secure notification channel configuration
- **Audit Logging**: Complete notification activity audit trail

### Data Protection
- **Input Validation**: Zod schema validation for all inputs
- **Notification Encryption**: Secure storage of sensitive notifications
- **SQL Injection Prevention**: Parameterized database queries
- **XSS Protection**: Content security policy headers

### Notification Security
- **Channel Authentication**: Secure notification channel authentication
- **Delivery Security**: Secure notification delivery mechanism
- **Access Logging**: Complete notification access logging
- **Template Security**: Secure notification template processing

## Deployment and Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3013
HOST=0.0.0.0
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/sso_hub

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASS=your-smtp-password

# Slack Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CHANNEL=#alerts

# Notification Configuration
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY=5000
TEMPLATE_CACHING_ENABLED=true
DELIVERY_TRACKING_ENABLED=true

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
EXPOSE 3013
CMD ["npm", "start"]
```

### Health Check Commands
```bash
# Health check
curl http://localhost:3013/healthz

# Readiness check
curl http://localhost:3013/readyz

# List notifications
curl http://localhost:3013/api/notifications

# Test notification channel
curl -X POST http://localhost:3013/api/channels/email/test
```

## Performance Optimization

### Notification Optimization
- **Template Caching**: Cache frequently used notification templates
- **Batch Processing**: Efficient batch notification processing
- **Channel Optimization**: Optimized notification channel delivery
- **Parallel Processing**: Concurrent notification processing

### Database Optimization
- **Indexed Queries**: Optimized database schema with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Structured queries for performance
- **Data Partitioning**: Notification data partitioning for large systems

### Scalability Features
- **Stateless Design**: Service can be horizontally scaled
- **Load Distribution**: Support for multiple service instances
- **Async Processing**: Asynchronous notification processing
- **Channel Distribution**: Distributed notification channel management

## Troubleshooting

### Common Issues
1. **Delivery Failures**: Check notification channel configuration
2. **Template Errors**: Verify notification template syntax
3. **Channel Issues**: Check notification channel connectivity
4. **Database Connection Issues**: Verify PostgreSQL connectivity

### Debug Commands
```bash
# Check service logs
docker logs notifier-service

# Verify database connectivity
curl -v http://localhost:3013/readyz

# Test notification processing
curl -v http://localhost:3013/api/notifications

# Check channel status
curl -v http://localhost:3013/api/channels
```

### Log Analysis
- **Notification Processing**: Monitor notification processing performance
- **Delivery Status**: Track notification delivery success rates
- **Channel Performance**: Monitor notification channel performance
- **Error Patterns**: Identify recurring notification issues

## Future Enhancements

### Planned Features
- **Advanced Notification Engine**: AI-powered notification optimization
- **Real-time Notifications**: Live notification delivery and updates
- **Notification Analytics**: Advanced notification effectiveness analytics
- **Smart Notifications**: Intelligent notification routing and delivery

### Integration Roadmap
- **Phase 1**: Basic notification management and delivery (current)
- **Phase 2**: Advanced templates and analytics
- **Phase 3**: Real-time notifications and optimization
- **Phase 4**: AI-powered notification platform

### Notification Evolution
- **Current**: Basic notification management and delivery
- **Future**: Advanced templates and analytics
- **Advanced**: Real-time notifications and optimization
- **Enterprise**: Enterprise-grade notification platform
