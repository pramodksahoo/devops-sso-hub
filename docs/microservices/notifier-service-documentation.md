# Notifier Service Documentation

## Service Overview

### Service Name and Purpose
**Notifier Service** - Centralized notification and alerting service for SSO Hub that handles all system notifications, alerts, and communication across all integrated DevOps tools and services.

### Business Use Cases and Functional Requirements
- **System Notifications**: Send notifications for system events and alerts
- **Multi-Channel Delivery**: Support for Email, Slack, Webhook, and future channels (SMS, Teams)
- **Tool Integration**: Send notifications from all 11 integrated DevOps tools
- **Template Management**: Use templates for consistent notification formatting
- **Queue Processing**: Asynchronous notification processing with Redis queuing
- **Delivery Tracking**: Track notification delivery status and retry failed deliveries
- **Escalation Management**: Handle critical alert escalation paths
- **Performance Optimization**: Sub-2-second notification processing

### Service Boundaries and Responsibilities
- **Notification Processing**: Process and format notifications using templates
- **Channel Management**: Manage different notification channels (Email, Slack, Webhook)
- **Template Management**: Handle notification templates for all tool types
- **Queue Management**: Redis-based queuing with retry logic and escalation
- **Delivery Management**: Ensure reliable notification delivery with tracking
- **Audit Integration**: Log all notification activities to audit service

## Architecture Documentation

### High-Level Architecture Diagram
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Services  │───▶│   Notifier  │───▶│ PostgreSQL  │
│  (11 Tools) │    │   Service   │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
                          │                    │
                          ▼                    │
                   ┌──────────────┐           │
                   │    Redis     │           │
                   │   Queuing    │           │
                   └──────────────┘           │
                          │                    │
                          ▼                    │
                   ┌──────────────┐           │
                   │ Notification │           │
                   │  Channels    │           │
                   │ (Email/Slack │           │
                   │  /Webhook)   │           │
                   └──────────────┘           │
                          │                    │
                          ▼                    │
                   ┌──────────────┐           │
                   │ Audit Service│◀──────────┘
                   │   Logging    │
                   └──────────────┘
```

### Technology Stack
- **Framework**: Fastify 4.27.0 with TypeScript support
- **Database**: PostgreSQL for notification storage and templates
- **Caching**: Redis for notification queuing and processing
- **Template Engine**: Handlebars for dynamic content generation
- **Validation**: Zod for comprehensive input validation
- **Documentation**: OpenAPI/Swagger with interactive UI
- **Security**: Helmet, CORS, rate limiting, input validation
- **Monitoring**: Health checks, metrics, audit logging

## API Reference

### Base URL
```
http://localhost:3014
```

### Authentication
All API endpoints (except health checks) require identity headers:
- `x-user-sub`: User identifier
- `x-user-email`: User email address
- `x-user-roles`: Comma-separated user roles

### Health Check Endpoints

#### Basic Health Check
```http
GET /healthz
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-16T08:00:00.000Z",
  "version": "1.0.0"
}
```

#### Readiness Check
```http
GET /readyz
```

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2025-01-16T08:00:00.000Z",
  "dependencies": {
    "database": {
      "database": "healthy",
      "timestamp": "2025-01-16T08:00:00.000Z"
    },
    "channels": {
      "email": {
        "enabled": false,
        "configured": false
      },
      "slack": {
        "enabled": false,
        "configured": false
      },
      "webhook": {
        "enabled": true,
        "configured": true
      }
    }
  },
  "queue_status": {
    "immediate": {
      "waiting": 0,
      "active": 0,
      "completed": 0,
      "failed": 0
    }
  }
}
```

### Notification Management Endpoints

#### Create Notification
```http
POST /api/notifications
```

**Request Body:**
```json
{
  "type": "system_event",
  "priority": "medium",
  "title": "System Alert",
  "message": "System event notification",
  "recipients": ["admin@example.com"],
  "channels": ["email", "slack"],
  "metadata": {
    "source": "demo"
  }
}
```

#### List Notifications
```http
GET /api/notifications?limit=20&offset=0&type=system_event
```

#### Get Notification Details
```http
GET /api/notifications/{notification_id}
```

#### Send Immediate Notification
```http
POST /api/notifications/send
```

**Template-based Request:**
```json
{
  "template_name": "system-health-alert",
  "variables": {
    "service_name": "Policy Service",
    "status": "Healthy",
    "details": "All systems operational",
    "timestamp": "2025-01-16T08:00:00.000Z",
    "environment": "production"
  },
  "recipients": ["ops@example.com"],
  "channels": ["email", "slack"]
}
```

### Template Management Endpoints

#### List Templates
```http
GET /api/templates
```

#### Create Template
```http
POST /api/templates
```

**Request Body:**
```json
{
  "name": "custom-alert",
  "type": "alert",
  "subject_template": "🚨 {{alert_type}} - {{severity}}",
  "body_template": "Alert: {{alert_type}}\nSeverity: {{severity}}\nDetails: {{details}}\nTime: {{timestamp}}",
  "variables": ["alert_type", "severity", "details", "timestamp"],
  "supported_channels": ["email", "slack", "webhook"],
  "priority": "high",
  "enabled": true
}
```

#### Test Template
```http
POST /api/templates/{template_id}/test
```

### Channel Management Endpoints

#### List Channels
```http
GET /api/channels
```

#### Create Channel
```http
POST /api/channels
```

**Email Channel:**
```json
{
  "name": "Production Email",
  "type": "email",
  "description": "Production SMTP email channel",
  "configuration": {
    "smtp_host": "smtp.example.com",
    "smtp_port": 587,
    "smtp_secure": true,
    "from_address": "notifications@example.com",
    "from_name": "SSO Hub Notifications"
  },
  "enabled": true
}
```

**Slack Channel:**
```json
{
  "name": "Operations Slack",
  "type": "slack",
  "description": "Slack webhook for operations team",
  "configuration": {
    "webhook_url": "https://hooks.slack.com/services/...",
    "channel": "#alerts",
    "username": "SSO Hub Bot",
    "icon_emoji": ":warning:"
  },
  "enabled": true
}
```

**Webhook Channel:**
```json
{
  "name": "External Webhook",
  "type": "webhook",
  "description": "External system webhook",
  "configuration": {
    "url": "https://external-system.com/webhooks/notifications",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer token123",
      "Content-Type": "application/json"
    },
    "timeout": 30000
  },
  "enabled": true
}
```

#### Test Channel
```http
POST /api/channels/{channel_id}/test
```

### Queue Management Endpoints

#### Get Queue Statistics
```http
GET /api/queue/stats
```

**Response:**
```json
{
  "queue_stats": {
    "immediate": {
      "waiting": 0,
      "active": 1,
      "completed": 15,
      "failed": 0,
      "delayed": 0
    },
    "delayed": {
      "waiting": 2,
      "active": 0,
      "completed": 8,
      "failed": 0,
      "delayed": 2
    },
    "retry": {
      "waiting": 0,
      "active": 0,
      "completed": 3,
      "failed": 1,
      "delayed": 0
    }
  },
  "processing_status": {
    "processing": true,
    "queues": ["immediate", "delayed", "retry", "escalation", "batch"],
    "redis_connected": true
  }
}
```

## Database Schema

### Core Tables

#### notifications
- `notification_id` (UUID, Primary Key)
- `external_id` (VARCHAR, Optional)
- `type` (VARCHAR, NOT NULL)
- `priority` (ENUM: low, medium, high, critical)
- `title` (VARCHAR, NOT NULL)
- `message` (TEXT, NOT NULL)
- `html_message` (TEXT, Optional)
- `recipients` (JSONB, Array of recipients)
- `channels` (JSONB, Array of channel types)
- `template_id` (UUID, Foreign Key)
- `metadata` (JSONB)
- `source_service` (VARCHAR)
- `source_tool` (VARCHAR)
- `user_id` (VARCHAR)
- `scheduled_at` (TIMESTAMP)
- `expires_at` (TIMESTAMP)
- `retry_count` (INTEGER)
- `max_retries` (INTEGER)
- `status` (ENUM: pending, processing, sent, failed, expired)
- `created_by` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### notification_templates
- `template_id` (UUID, Primary Key)
- `name` (VARCHAR, UNIQUE, NOT NULL)
- `type` (VARCHAR, NOT NULL)
- `subject_template` (TEXT, NOT NULL)
- `body_template` (TEXT, NOT NULL)
- `html_template` (TEXT, Optional)
- `variables` (JSONB, Array of variable names)
- `supported_channels` (JSONB, Array of channel types)
- `tool_id` (VARCHAR, Optional)
- `priority` (ENUM: low, medium, high, critical)
- `enabled` (BOOLEAN)
- `version` (INTEGER)
- `created_by` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### notification_channels
- `channel_id` (UUID, Primary Key)
- `name` (VARCHAR, UNIQUE, NOT NULL)
- `type` (ENUM: email, slack, webhook, sms, teams)
- `description` (TEXT)
- `configuration` (JSONB, Channel-specific config)
- `enabled` (BOOLEAN)
- `test_endpoint` (VARCHAR)
- `created_by` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### notification_deliveries
- `delivery_id` (UUID, Primary Key)
- `notification_id` (UUID, Foreign Key)
- `channel_id` (UUID, Foreign Key)
- `channel_type` (VARCHAR)
- `recipient` (VARCHAR)
- `status` (ENUM: pending, sent, delivered, failed, bounced)
- `delivery_attempts` (INTEGER)
- `last_attempt_at` (TIMESTAMP)
- `delivered_at` (TIMESTAMP)
- `failure_reason` (TEXT)
- `response_data` (JSONB)
- `external_delivery_id` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Notification Templates

### Pre-loaded Templates

#### System Events
- `system-health-alert`: Service health status changes
- `service-startup`: Service startup notifications
- `security-alert`: Security incidents and alerts
- `failed-login-attempt`: Failed authentication alerts

#### Tool-Specific Templates (11 Tools)
- `github-webhook`: GitHub push events, PR status, releases
- `gitlab-pipeline`: GitLab pipeline status, merge requests
- `jenkins-build`: Jenkins build status, job failures
- `argocd-sync`: ArgoCD deployment status, sync failures
- `terraform-plan`: Terraform plan/apply status, changes
- `sonarqube-analysis`: Quality gate results, security findings
- `grafana-alert`: Dashboard alerts, metric thresholds
- `prometheus-alert`: Prometheus alert manager integration
- `kibana-alert`: Log alerts, index performance issues
- `snyk-vulnerability`: Security vulnerability notifications
- `jira-ticket`: Ticket updates, SLA breaches, approvals

#### Compliance and Policy
- `policy-violation`: Policy violation notifications
- `compliance-report`: Compliance status reports

### Template Variables

#### Common Variables
- `timestamp`: Current timestamp (ISO 8601)
- `service_name`: Name of the triggering service
- `environment`: Environment (production, staging, development)
- `user_id`: User identifier
- `priority`: Notification priority

#### Tool-Specific Variables
Each tool template includes specific variables relevant to that tool's events and data structures.

### Template Helpers

#### Date and Time
- `{{formatDate date "format"}}`: Format dates (short, long, time, iso)
- `{{duration milliseconds}}`: Format duration (e.g., "2m 30s")

#### Text Formatting
- `{{upper text}}`: Convert to uppercase
- `{{lower text}}`: Convert to lowercase
- `{{capitalize text}}`: Capitalize first letter

#### Visual Indicators
- `{{priorityBadge priority}}`: Priority badge (🔴 CRITICAL, 🟠 HIGH, etc.)
- `{{toolIcon tool_name}}`: Tool-specific icons (📦 GitHub, 🦊 GitLab, etc.)
- `{{envBadge environment}}`: Environment badge (🔴 PROD, 🟡 STAGE, etc.)

#### Utilities
- `{{json object}}`: JSON pretty print
- `{{url baseUrl path}}`: URL construction
- `{{ifEquals value1 value2}}`: Conditional logic

## Notification Channels

### Email Channel

#### Configuration
```json
{
  "smtp_host": "smtp.example.com",
  "smtp_port": 587,
  "smtp_secure": true,
  "from_address": "notifications@example.com",
  "from_name": "SSO Hub Notifications"
}
```

#### Features
- HTML and plain text support
- Priority headers for high/critical notifications
- SMTP authentication and TLS support
- Delivery confirmation tracking
- Bounce handling

### Slack Channel

#### Configuration
```json
{
  "webhook_url": "https://hooks.slack.com/services/...",
  "channel": "#alerts",
  "username": "SSO Hub Bot",
  "icon_emoji": ":warning:"
}
```

#### Features
- Rich message formatting with attachments
- Color-coded messages based on priority
- Mention support and channel targeting
- Emoji and icon customization
- Interactive components (future)

### Webhook Channel

#### Configuration
```json
{
  "url": "https://external-system.com/webhook",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer token",
    "Content-Type": "application/json"
  },
  "timeout": 30000
}
```

#### Features
- Custom HTTP methods and headers
- HMAC signature validation
- Retry logic with exponential backoff
- Response data capture
- Timeout configuration

## Queue Management

### Queue Types

#### Immediate Queue
- High-priority notifications
- Critical alerts
- Real-time processing

#### Delayed Queue
- Scheduled notifications
- Time-based delivery
- Future processing

#### Retry Queue
- Failed delivery retries
- Exponential backoff
- Maximum retry limits

#### Escalation Queue
- Critical alert escalation
- Escalation paths
- Management notifications

#### Batch Queue
- Bulk notification processing
- Performance optimization
- Rate limiting

### Processing Features
- Concurrent processing (configurable)
- Dead letter queue for failed jobs
- Job prioritization
- Progress tracking
- Performance metrics

## Integration Examples

### Service Integration

#### From Tool Services
```javascript
// Send notification from tool service
const axios = require('axios');

async function sendToolNotification(eventData) {
  try {
    const response = await axios.post('http://notifier:3014/api/notifications/send', {
      template_name: 'github-webhook',
      variables: {
        event_type: eventData.type,
        repository: eventData.repository,
        actor: eventData.actor,
        action: eventData.action,
        details: eventData.details,
        timestamp: new Date().toISOString()
      },
      recipients: ['dev@example.com'],
      channels: ['slack', 'email'],
      priority: eventData.critical ? 'high' : 'medium',
      metadata: {
        tool: 'github',
        event_id: eventData.id
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-sub': 'system',
        'x-user-email': 'system@example.com',
        'x-user-roles': 'system'
      }
    });
    
    console.log('Notification sent:', response.data.notification_id);
  } catch (error) {
    console.error('Failed to send notification:', error.message);
  }
}
```

#### From Webhook Ingress
```javascript
// Integration with webhook ingress service
const notificationService = 'http://notifier:3014';

async function processWebhookEvent(webhookData) {
  // Determine notification template based on webhook source
  const templateMap = {
    'github': 'github-webhook',
    'gitlab': 'gitlab-pipeline',
    'jenkins': 'jenkins-build',
    'argocd': 'argocd-sync'
  };
  
  const templateName = templateMap[webhookData.source];
  if (!templateName) return;
  
  // Send notification
  await axios.post(`${notificationService}/api/notifications/send`, {
    template_name: templateName,
    variables: webhookData.payload,
    recipients: webhookData.subscribers || ['ops@example.com'],
    channels: ['slack'],
    metadata: {
      webhook_id: webhookData.id,
      source: webhookData.source
    }
  });
}
```

### Direct API Usage

#### Create and Send Notification
```bash
# Create direct notification
curl -X POST http://localhost:3014/api/notifications \
  -H "Content-Type: application/json" \
  -H "x-user-sub: admin-123" \
  -H "x-user-email: admin@example.com" \
  -H "x-user-roles: admin" \
  -d '{
    "type": "system_alert",
    "priority": "high",
    "title": "System Maintenance Required",
    "message": "Scheduled maintenance window approaching",
    "recipients": ["ops@example.com", "#ops-channel"],
    "channels": ["email", "slack"],
    "scheduled_at": "2025-01-16T20:00:00Z",
    "metadata": {
      "maintenance_id": "MAINT-2025-001"
    }
  }'

# Send using template
curl -X POST http://localhost:3014/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "x-user-sub: admin-123" \
  -H "x-user-email: admin@example.com" \
  -H "x-user-roles: admin" \
  -d '{
    "template_name": "system-health-alert",
    "variables": {
      "service_name": "Database Cluster",
      "status": "Degraded",
      "details": "High CPU usage detected on primary node",
      "timestamp": "2025-01-16T08:00:00Z",
      "environment": "production"
    },
    "recipients": ["dba@example.com", "ops@example.com"],
    "channels": ["email", "slack", "webhook"]
  }'
```

## Environment Configuration

### Required Environment Variables
```bash
# Server Configuration
PORT=3014
HOST=0.0.0.0
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/sso_hub

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_DB=1

# Email Configuration (Optional)
EMAIL_ENABLED=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=notifications@example.com
SMTP_PASS=your-smtp-password
EMAIL_FROM_ADDRESS=notifications@example.com
EMAIL_FROM_NAME=SSO Hub Notifications

# Slack Configuration (Optional)
SLACK_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_DEFAULT_CHANNEL=#alerts
SLACK_USERNAME=SSO Hub Bot
SLACK_ICON_EMOJI=:warning:

# Webhook Configuration
WEBHOOK_ENABLED=true
WEBHOOK_TIMEOUT=30000
WEBHOOK_RETRY_ATTEMPTS=3

# Performance Configuration
NOTIFICATION_PROCESSING_CONCURRENCY=5
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY=5000
TEMPLATE_CACHING_ENABLED=true
TEMPLATE_CACHE_TTL=3600

# Security Configuration
HMAC_SECRET=your-hmac-secret-key
ENCRYPTION_KEY=your-32-char-encryption-key
CORS_ORIGIN=http://localhost:3000

# Service Integration
AUDIT_SERVICE_URL=http://audit:3009
USER_SERVICE_URL=http://user-service:3003
POLICY_SERVICE_URL=http://policy:3013
```

### Docker Compose Configuration
```yaml
notifier:
  build:
    context: ./services/notifier
    dockerfile: Dockerfile
  container_name: sso-notifier
  environment:
    - NODE_ENV=production
    - PORT=3014
    - DATABASE_URL=postgresql://sso_user:password@postgres:5432/sso_hub
    - REDIS_URL=redis://redis:6379
    - REDIS_DB=1
    # Add other environment variables as needed
  ports:
    - "3014:3014"
  depends_on:
    - postgres
    - redis
    - audit
  networks:
    - sso-network
```

## Performance and Monitoring

### Performance Metrics
- **Notification Processing**: < 2 seconds per notification
- **Template Rendering**: < 50ms per template
- **Queue Processing**: Configurable concurrency (default: 5)
- **Delivery Success Rate**: > 99% for healthy channels
- **Cache Hit Rate**: > 90% for template cache

### Health Monitoring
- Service health endpoint (`/healthz`)
- Dependency readiness check (`/readyz`)
- Queue statistics monitoring
- Delivery tracking and metrics
- Error rate monitoring

### Logging and Audit
- Structured JSON logging (Pino)
- Comprehensive audit trail
- Notification lifecycle tracking
- Performance metrics logging
- Error tracking and alerting

## Security Features

### Access Control
- Identity header validation
- Role-based access control
- API rate limiting (1000 req/min)
- Input validation (Zod schemas)

### Data Protection
- HMAC signature validation for webhooks
- Secure credential storage
- SQL injection prevention
- XSS protection (CSP headers)

### Channel Security
- TLS encryption for SMTP
- Webhook signature validation
- Secure API token handling
- Rate limiting per channel

## Troubleshooting

### Common Issues

#### Service Won't Start
1. Check database connectivity
2. Verify Redis connection
3. Validate environment variables
4. Check port availability (3014)

#### Notifications Not Sending
1. Verify channel configuration
2. Check recipient addresses/URLs
3. Review queue status
4. Validate template syntax

#### Template Errors
1. Check template variable mapping
2. Validate Handlebars syntax
3. Test template rendering
4. Review error logs

### Debug Commands
```bash
# Check service health
curl http://localhost:3014/healthz

# Check service readiness
curl -H "x-user-sub: admin" http://localhost:3014/readyz

# View service logs
docker-compose logs notifier

# Check queue statistics
curl -H "x-user-sub: admin" http://localhost:3014/api/queue/stats

# Test template rendering
curl -X POST http://localhost:3014/api/templates/{id}/test \
  -H "Content-Type: application/json" \
  -H "x-user-sub: admin" \
  -d '{"variables": {"key": "value"}}'

# Test channel connectivity
curl -X POST http://localhost:3014/api/channels/{id}/test \
  -H "x-user-sub: admin"
```

### Log Analysis
- Monitor notification processing times
- Track delivery success rates
- Review queue depth and processing
- Analyze error patterns and causes

## Future Enhancements

### Planned Features
- SMS notification channel
- Microsoft Teams integration
- Push notification support
- Advanced escalation rules
- A/B testing for templates
- Analytics and reporting dashboard
- Multi-tenant support
- Advanced retry strategies

### Integration Opportunities
- Prometheus metrics export
- Grafana dashboard templates
- External monitoring integration
- Advanced audit analytics
- Machine learning for delivery optimization

---

**Notifier Service** provides comprehensive notification management for the SSO Hub platform, enabling reliable, scalable, and flexible communication across all integrated DevOps tools and services.