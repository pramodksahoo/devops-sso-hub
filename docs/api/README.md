# API Documentation 🔌

> **Comprehensive REST API reference for SSO Hub microservices**

SSO Hub provides a complete REST API across all 14 microservices. This section contains detailed API documentation, OpenAPI specifications, and integration examples.

## 📡 **API Overview**

### Core API Services
- **Auth-BFF** (`:3002`) - Authentication and session management
- **Catalog** (`:3006`) - Tool registry and launch management  
- **User Service** (`:3003`) - User profiles and preferences
- **Admin Config** (`:3005`) - Configuration management
- **Tools Health** (`:3004`) - Health monitoring and metrics
- **Webhook Ingress** (`:3007`) - Event processing and routing

### Analytics & Audit Services
- **Analytics** (`:3010`) - Usage analytics and reporting
- **Audit** (`:3009`) - Comprehensive audit logging
- **Policy** (`:3013`) - Access control and governance
- **Notifier** (`:3014`) - Multi-channel notifications

### Integration Services
- **Provisioning** (`:3011`) - Resource provisioning automation
- **LDAP Sync** (`:3012`) - Directory synchronization
- **Auth Proxy** (`:3015`) - Seamless SSO proxy

## 🔗 **API Documentation Index**

For detailed API documentation, see:
- **[Complete API Documentation](API_DOCUMENTATION_INDEX.md)** - Full API reference for all services

## 🚀 **Quick API Examples**

### Authentication
```bash
# Get authentication status
curl -X GET http://localhost:3002/api/auth/status \
  -H "Cookie: session-cookie"

# OIDC login flow
curl -X GET http://localhost:3002/api/auth/login \
  -L -c cookies.txt
```

### Tool Management
```bash
# List all tools
curl -X GET http://localhost:3006/api/tools \
  -H "X-Identity-User: user@company.com"

# Register new tool
curl -X POST http://localhost:3006/api/tools \
  -H "Content-Type: application/json" \
  -H "X-Identity-User: admin@company.com" \
  -d '{
    "name": "Jenkins",
    "category": "CI/CD", 
    "url": "https://jenkins.company.com",
    "auth_method": "oidc"
  }'
```

### Health Monitoring
```bash
# Check service health
curl -X GET http://localhost:3004/api/health/summary

# Get tool health status
curl -X GET http://localhost:3004/api/tools/jenkins/health
```

### User Management
```bash
# Get user profile
curl -X GET http://localhost:3003/api/users/profile \
  -H "X-Identity-User: user@company.com"

# Update user preferences
curl -X PUT http://localhost:3003/api/users/preferences \
  -H "Content-Type: application/json" \
  -H "X-Identity-User: user@company.com" \
  -d '{"theme": "dark", "notifications": true}'
```

### Analytics & Reporting
```bash
# Get usage analytics
curl -X GET http://localhost:3010/api/analytics/usage \
  -H "X-Identity-User: admin@company.com" \
  -G -d "period=30d"

# Export analytics data
curl -X GET http://localhost:3010/api/analytics/export \
  -H "X-Identity-User: admin@company.com" \
  -G -d "format=csv" > usage-report.csv
```

## 🔒 **Authentication & Authorization**

### Service-to-Service Authentication
SSO Hub uses HMAC-signed identity headers for service communication:

```javascript
// Identity header structure
const identityHeader = {
  user: "user@company.com",
  groups: ["developers", "admins"],
  timestamp: "2025-08-15T10:30:00Z",
  signature: "HMAC-SHA256-signature"
};
```

### API Security
- **Authentication**: OIDC tokens or identity headers
- **Rate Limiting**: Configurable per-service limits
- **Input Validation**: Zod schema validation
- **CORS**: Configured for frontend origin
- **Security Headers**: Comprehensive security headers

## 📊 **API Response Standards**

### Success Response
```json
{
  "success": true,
  "data": {
    "id": "tool-123",
    "name": "Jenkins",
    "status": "active"
  },
  "metadata": {
    "timestamp": "2025-08-15T10:30:00Z",
    "version": "v1"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid tool configuration",
    "details": {
      "field": "url",
      "reason": "Invalid URL format"
    }
  },
  "metadata": {
    "timestamp": "2025-08-15T10:30:00Z",
    "request_id": "req-abc123"
  }
}
```

## 🧪 **Testing & Development**

### API Testing Tools
- **Postman Collection**: Available in repository
- **OpenAPI Specs**: Interactive Swagger UI
- **curl Examples**: Copy-paste ready commands
- **Integration Tests**: Comprehensive test suite

### Development Endpoints
```bash
# Health checks
curl http://localhost:3002/healthz  # Auth-BFF
curl http://localhost:3006/healthz  # Catalog
curl http://localhost:3004/healthz  # Tools Health

# API documentation (Swagger UI)
curl http://localhost:3006/docs     # Catalog API docs
curl http://localhost:3004/docs     # Health API docs
```

## 📚 **Additional Resources**

- **[Getting Started Guide](../getting-started/quickstart.md)** - Basic setup and usage
- **[Integration Guides](../integrations/)** - Tool-specific integration examples
- **[Troubleshooting](../getting-started/TROUBLESHOOTING_GUIDE.md)** - Common API issues
- **[Contributing](../community/CONTRIBUTING.md)** - API development guidelines

---

**Need help with the API?** Check our [troubleshooting guide](../getting-started/TROUBLESHOOTING_GUIDE.md) or [open an issue](https://github.com/pramodksahoo/devops-sso-hub/issues)!