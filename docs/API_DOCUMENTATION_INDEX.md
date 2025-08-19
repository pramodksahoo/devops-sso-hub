# SSO Hub API Documentation Index

> **Last Updated**: August 19, 2025  
> **Platform Status**: ✅ Production Ready

## Overview

This document provides a comprehensive index of all API endpoints across the 13 microservices in the SSO Hub platform. Each service provides OpenAPI/Swagger documentation at the `/docs` endpoint.

## 🔗 Service API Endpoints

### 📱 Frontend Application
- **URL**: `http://localhost:3000`
- **Type**: React SPA
- **Authentication**: OIDC via Auth-BFF
- **Documentation**: User interface for all platform functions

### 🔐 Auth-BFF Service (Port 3002)
- **Base URL**: `http://localhost:3002`
- **OpenAPI Docs**: `http://localhost:3002/docs`
- **Authentication**: OIDC with Keycloak

#### Key Endpoints:
```
GET    /auth/login              # Initiate OIDC login
GET    /auth/callback           # OIDC callback handler  
POST   /auth/logout             # Terminate session
GET    /auth/user               # Current user info
GET    /healthz                 # Health check
GET    /readyz                  # Readiness check

# Proxy endpoints for authenticated requests
GET    /api/tools               # Proxy to catalog service
PUT    /api/tools/:id/config    # Proxy to catalog service
POST   /api/tools/:id/test      # Proxy to admin-config service
```

### 👤 User Service (Port 3003)
- **Base URL**: `http://localhost:3003`
- **OpenAPI Docs**: `http://localhost:3003/docs`
- **Authentication**: HMAC identity headers

#### Key Endpoints:
```
GET    /api/users/profile       # User profile management
PUT    /api/users/profile       # Update user profile
GET    /api/users/api-keys      # List API keys
POST   /api/users/api-keys      # Create API key
DELETE /api/users/api-keys/:id  # Revoke API key
GET    /api/users/groups        # User groups
POST   /api/users/groups        # Create group
GET    /api/users/preferences   # User preferences
PUT    /api/users/preferences   # Update preferences
```

### 🏥 Tools Health Service (Port 3004)
- **Base URL**: `http://localhost:3004`
- **OpenAPI Docs**: `http://localhost:3004/docs`
- **Authentication**: HMAC identity headers

#### Key Endpoints:
```
GET    /api/health/overview     # Overall system health
GET    /api/health/tools        # Individual tool health status
GET    /api/health/services     # Internal microservice health
GET    /api/health/integrations # Integration health monitoring
GET    /api/health/alerts       # Health alert management
POST   /api/health/alerts       # Create health alert
GET    /api/health/metrics      # Performance metrics
GET    /api/health/dependencies # Service dependency mapping
```

### ⚙️ Admin Config Service (Port 3005)
- **Base URL**: `http://localhost:3005`
- **OpenAPI Docs**: `http://localhost:3005/docs`
- **Authentication**: Admin-only HMAC headers

#### Key Endpoints:
```
GET    /api/tools/:type/config          # Get tool configuration
PUT    /api/tools/:type/config          # Update tool configuration  
POST   /api/tools/:type/test            # Test tool integration
POST   /api/tools/:type/test-connection # Test connection only
POST   /api/tools/test-all              # Bulk test all tools
POST   /api/admin/keycloak/auto-config/:tool # Auto-populate config
GET    /api/schemas/:tool               # Get tool schema
```

### 📚 Catalog Service (Port 3006)
- **Base URL**: `http://localhost:3006`
- **OpenAPI Docs**: `http://localhost:3006/docs`
- **Authentication**: HMAC identity headers

#### Key Endpoints:
```
GET    /api/tools                    # List all tools
GET    /api/tools/:id                # Get specific tool
PUT    /api/tools/:id                # Update tool
POST   /api/tools/:id/launch         # Launch tool with deep-linking
GET    /api/tools/:id/capabilities   # Get tool capabilities
PUT    /api/tools/:id/config         # Update tool configuration
GET    /api/tools/:id/webhooks       # Get webhook configuration
POST   /api/tools/:id/webhooks       # Configure webhooks
GET    /api/categories               # Tool categories
POST   /api/categories               # Create category
GET    /api/launch-configs           # Launch configurations
```

### 🪝 Webhook Ingress Service (Port 3007)
- **Base URL**: `http://localhost:3007`
- **OpenAPI Docs**: `http://localhost:3007/docs`
- **Authentication**: Webhook signature verification

#### Key Endpoints:
```
POST   /webhooks/github              # GitHub webhook events
POST   /webhooks/gitlab              # GitLab webhook events
POST   /webhooks/jenkins             # Jenkins webhook events
POST   /webhooks/argocd              # Argo CD webhook events
POST   /webhooks/terraform           # Terraform webhook events
POST   /webhooks/sonarqube           # SonarQube webhook events
POST   /webhooks/grafana             # Grafana webhook events
POST   /webhooks/snyk                # Snyk webhook events
GET    /api/webhooks/endpoints       # List webhook endpoints
GET    /api/webhooks/events          # Webhook event history
GET    /api/webhooks/deliveries      # Delivery status
```

### 📊 Audit Service (Port 3009)
- **Base URL**: `http://localhost:3009`
- **OpenAPI Docs**: `http://localhost:3009/docs`
- **Authentication**: HMAC identity headers

#### Key Endpoints:
```
GET    /api/audit/events             # List audit events
POST   /api/audit/events             # Create audit event
GET    /api/audit/events/:id         # Get specific event
GET    /api/audit/tools/:tool        # Tool-specific audit logs
GET    /api/audit/users/:user        # User-specific audit logs
GET    /api/audit/workflows          # Cross-tool workflow tracking
GET    /api/audit/analytics          # Audit analytics
POST   /api/audit/search             # Search audit logs
GET    /api/audit/export             # Export audit data
```

### 📈 Analytics Service (Port 3010)
- **Base URL**: `http://localhost:3010`
- **OpenAPI Docs**: `http://localhost:3010/docs`
- **Authentication**: HMAC identity headers

#### Key Endpoints:
```
GET    /api/analytics/usage          # Tool usage analytics
GET    /api/analytics/performance    # Integration performance metrics
GET    /api/analytics/workflows      # Cross-tool workflow analytics
GET    /api/analytics/users          # User activity analytics
GET    /api/analytics/tools/:tool    # Tool-specific analytics
POST   /api/analytics/reports        # Generate custom reports
GET    /api/analytics/reports/:id    # Get report results
GET    /api/analytics/export         # Export analytics data (CSV)
GET    /api/analytics/dashboards     # Dashboard configurations
POST   /api/analytics/dashboards     # Create dashboard
```

### 🏗️ Provisioning Service (Port 3011)
- **Base URL**: `http://localhost:3011`
- **OpenAPI Docs**: `http://localhost:3011/docs`
- **Authentication**: HMAC identity headers

#### Key Endpoints:
```
GET    /api/provisioning/templates   # List provisioning templates
POST   /api/provisioning/templates   # Create template
GET    /api/provisioning/templates/:id # Get template
PUT    /api/provisioning/templates/:id # Update template
DELETE /api/provisioning/templates/:id # Delete template
POST   /api/provisioning/workflows   # Execute provisioning workflow
GET    /api/provisioning/workflows/:id # Get workflow status
GET    /api/provisioning/resources   # List provisioned resources
DELETE /api/provisioning/resources/:id # Deprovision resource
GET    /api/provisioning/policies    # Get provisioning policies
POST   /api/provisioning/bulk        # Bulk provisioning operations
```

### 🔄 LDAP Sync Service (Port 3012)
- **Base URL**: `http://localhost:3012`
- **OpenAPI Docs**: `http://localhost:3012/docs`
- **Authentication**: HMAC identity headers

#### Key Endpoints:
```
GET    /api/ldap/servers             # List LDAP servers
POST   /api/ldap/servers             # Add LDAP server
PUT    /api/ldap/servers/:id         # Update LDAP server
DELETE /api/ldap/servers/:id         # Remove LDAP server
POST   /api/ldap/discovery           # Discover users/groups
GET    /api/ldap/discovery/:id       # Get discovery results
POST   /api/ldap/sync                # Start synchronization
GET    /api/ldap/sync/:id            # Get sync status
POST   /api/ldap/preview             # Preview sync changes
GET    /api/ldap/mapping             # Get role mappings
PUT    /api/ldap/mapping             # Update role mappings
GET    /api/ldap/audit               # LDAP sync audit logs
```

### 🛡️ Policy Service (Port 3013)
- **Base URL**: `http://localhost:3013`
- **OpenAPI Docs**: `http://localhost:3013/docs`
- **Authentication**: HMAC identity headers

#### Key Endpoints:
```
GET    /api/policies                 # List all policies
POST   /api/policies                 # Create policy
GET    /api/policies/:id             # Get specific policy
PUT    /api/policies/:id             # Update policy
DELETE /api/policies/:id             # Delete policy
POST   /api/policies/evaluate        # Evaluate policy
GET    /api/policies/compliance      # Compliance assessment
GET    /api/policies/violations      # Policy violations
POST   /api/policies/violations      # Report violation
GET    /api/policies/templates       # Policy templates
POST   /api/policies/templates       # Create template
GET    /api/policies/tools/:tool     # Tool-specific policies
```

### 🔔 Notifier Service (Port 3014)
- **Base URL**: `http://localhost:3014`
- **OpenAPI Docs**: `http://localhost:3014/docs`
- **Authentication**: HMAC identity headers

#### Key Endpoints:
```
GET    /api/notifications            # List notifications
POST   /api/notifications            # Send notification
GET    /api/notifications/:id        # Get notification details
PUT    /api/notifications/:id        # Update notification
GET    /api/notifications/channels   # List notification channels
POST   /api/notifications/channels   # Create channel
PUT    /api/notifications/channels/:id # Update channel
GET    /api/notifications/templates  # List templates
POST   /api/notifications/templates  # Create template
GET    /api/notifications/preferences # User preferences
PUT    /api/notifications/preferences # Update preferences
GET    /api/notifications/escalations # Escalation policies
POST   /api/notifications/escalations # Create escalation
```

## 🔐 Authentication Methods

### 1. OIDC Authentication (Frontend → Auth-BFF)
- **Flow**: Authorization Code with PKCE
- **Provider**: Keycloak
- **Session**: Redis-based session management
- **Cookies**: httpOnly, secure cookies

### 2. HMAC Identity Headers (Service-to-Service)
- **Headers**: 
  - `X-User-Sub`: Keycloak subject ID
  - `X-User-Email`: User email
  - `X-User-Name`: Full name
  - `X-User-Roles`: JSON array of roles
  - `X-User-Groups`: JSON array of groups
  - `X-User-Admin`: Boolean admin flag
  - `X-User-Signature`: HMAC signature

### 3. API Key Authentication (Programmatic Access)
- **Header**: `Authorization: Bearer <api-key>`
- **Management**: User Service endpoints
- **Scope**: User-specific access

### 4. Webhook Signature Verification
- **Method**: HMAC-SHA256
- **Header**: `X-Hub-Signature-256`
- **Secret**: Per-tool webhook secrets

## 📚 OpenAPI Documentation

Each service provides interactive OpenAPI documentation:

```bash
# Access individual service documentation
curl http://localhost:3002/docs  # Auth-BFF
curl http://localhost:3003/docs  # User Service
curl http://localhost:3004/docs  # Tools Health
curl http://localhost:3005/docs  # Admin Config
curl http://localhost:3006/docs  # Catalog
curl http://localhost:3007/docs  # Webhook Ingress
curl http://localhost:3009/docs  # Audit
curl http://localhost:3010/docs  # Analytics
curl http://localhost:3011/docs  # Provisioning
curl http://localhost:3012/docs  # LDAP Sync
curl http://localhost:3013/docs  # Policy
curl http://localhost:3014/docs  # Notifier
```

## 🧪 Testing API Endpoints

### Health Check All Services
```bash
#!/bin/bash
services=(3002 3003 3004 3005 3006 3007 3009 3010 3011 3012 3013 3014)
for port in "${services[@]}"; do
  echo "Checking service on port $port..."
  curl -s "http://localhost:$port/healthz" || echo "Service $port not responding"
done
```

### Example API Calls

#### Get User Profile
```bash
curl -H "Authorization: Bearer <api-key>" \
     http://localhost:3003/api/users/profile
```

#### List Tools
```bash
curl -H "X-User-Sub: user-sub" \
     -H "X-User-Signature: <hmac-signature>" \
     http://localhost:3006/api/tools
```

#### Get System Health
```bash
curl -H "X-User-Sub: user-sub" \
     -H "X-User-Admin: true" \
     -H "X-User-Signature: <hmac-signature>" \
     http://localhost:3004/api/health/overview
```

## 🔍 Error Handling

All services use consistent error response format:

```json
{
  "error": "Error description",
  "details": "Detailed error information",
  "code": "ERROR_CODE",
  "timestamp": "2025-08-19T10:30:00Z",
  "path": "/api/endpoint",
  "method": "GET"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

## 📊 Rate Limiting

All services implement rate limiting:
- **Default**: 100 requests per minute per user
- **Admin endpoints**: 200 requests per minute
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## 🔧 Development Tools

### API Testing with curl
```bash
# Set common headers
export API_BASE="http://localhost"
export USER_SUB="your-user-sub"
export USER_SIG="your-hmac-signature"

# Test catalog service
curl -H "X-User-Sub: $USER_SUB" \
     -H "X-User-Signature: $USER_SIG" \
     "$API_BASE:3006/api/tools"
```

### Postman Collection
A comprehensive Postman collection is available with:
- All service endpoints
- Environment variables
- Pre-request scripts for HMAC generation
- Test cases for common scenarios

---

**For detailed endpoint documentation, visit the OpenAPI docs for each service at `http://localhost:<port>/docs`**