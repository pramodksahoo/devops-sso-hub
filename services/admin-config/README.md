# Admin Configuration Service

The Admin Configuration Service is the central management component for SSO Hub's tool integrations. It provides comprehensive APIs for configuring, testing, and managing all 11 supported DevOps tools.

## Features

### 🔧 Tool Configuration Management
- **Comprehensive Tool Support**: All 11 tools (GitHub, GitLab, Jenkins, Argo CD, Terraform, SonarQube, Grafana, Prometheus, Kibana, Snyk, Jira, ServiceNow)
- **Schema Validation**: Zod-based validation for each tool's configuration
- **Secure Secret Management**: Infisical integration for sensitive data
- **Configuration Auditing**: Full audit trail of configuration changes

### 🔑 Dynamic Keycloak Integration
- **Auto Client Registration**: Automatic OIDC/SAML client creation in Keycloak
- **Protocol-Specific Configuration**: OIDC, SAML, and OAuth2 support
- **Role Mapping**: Automated role and group mapping setup
- **Redirect URI Management**: Dynamic URI configuration per tool

### 🧪 Integration Testing
- **Multi-Level Testing**: Connection, Authentication, API, and Full test suites
- **Real-time Monitoring**: Health status tracking for all integrations
- **Bulk Operations**: Test all configured tools simultaneously
- **Performance Metrics**: Response time and uptime tracking

### 📊 Monitoring & Analytics
- **Tool Status Dashboard**: Real-time status of all integrations
- **Historical Metrics**: Success rates, response times, uptime tracking
- **Audit Logging**: Complete change history and access logs
- **Alert Integration**: Integration with monitoring systems

## API Endpoints

### Tool Management
- `GET /api/tools` - List all supported tools with status
- `GET /api/tools/{tool_type}/config` - Get tool configuration
- `PUT /api/tools/{tool_type}/config` - Update tool configuration
- `POST /api/tools/{tool_type}/test` - Test tool integration
- `POST /api/tools/{tool_type}/register-client` - Register Keycloak client

### Bulk Operations
- `POST /api/tools/test-all` - Test all configured integrations

### Health & Status
- `GET /healthz` - Service health check
- `GET /readyz` - Service readiness check

## Supported Tools Configuration

### 1. GitHub Integration
```json
{
  "oauth_app": {
    "client_id": "github_client_id",
    "client_secret": "infisical://github/client_secret"
  },
  "organization": "your-org",
  "github_app": {
    "app_id": "123456",
    "installation_id": "789012",
    "private_key": "infisical://github/private_key",
    "webhook_secret": "infisical://github/webhook_secret"
  },
  "scim": {
    "enabled": true,
    "token": "infisical://github/scim_token"
  },
  "webhook": {
    "enabled": true,
    "secret": "infisical://github/webhook_secret",
    "events": ["push", "pull_request"]
  }
}
```

### 2. GitLab Integration
```json
{
  "oidc": {
    "client_id": "gitlab_client_id",
    "client_secret": "infisical://gitlab/client_secret"
  },
  "instance_url": "https://gitlab.example.com",
  "admin_token": "infisical://gitlab/admin_token",
  "group_provisioning": {
    "enabled": true,
    "default_visibility": "private"
  }
}
```

### 3. Jenkins Integration
```json
{
  "oidc": {
    "issuer": "http://keycloak:8080/realms/sso-hub",
    "client_id": "jenkins_client_id",
    "client_secret": "infisical://jenkins/client_secret"
  },
  "jenkins_url": "https://jenkins.example.com",
  "api_token": "infisical://jenkins/api_token",
  "api_user": "admin"
}
```

### 4. Argo CD Integration
```json
{
  "oidc": {
    "issuer": "http://keycloak:8080/realms/sso-hub",
    "client_id": "argocd_client_id",
    "client_secret": "infisical://argocd/client_secret"
  },
  "argocd_url": "https://argocd.example.com",
  "admin_credentials": {
    "username": "admin",
    "password": "infisical://argocd/admin_password"
  }
}
```

### 5. Terraform Cloud Integration
```json
{
  "sso_type": "oidc",
  "oidc": {
    "issuer": "http://keycloak:8080/realms/sso-hub",
    "client_id": "terraform_client_id",
    "client_secret": "infisical://terraform/client_secret"
  },
  "organization": "your-terraform-org",
  "api_token": "infisical://terraform/api_token"
}
```

### 6. SonarQube Integration
```json
{
  "oidc": {
    "issuer": "http://keycloak:8080/realms/sso-hub",
    "client_id": "sonarqube_client_id",
    "client_secret": "infisical://sonarqube/client_secret"
  },
  "sonarqube_url": "https://sonarqube.example.com",
  "admin_token": "infisical://sonarqube/admin_token"
}
```

### 7. Grafana Integration
```json
{
  "oauth": {
    "auth_url": "http://keycloak:8080/realms/sso-hub/protocol/openid-connect/auth",
    "token_url": "http://keycloak:8080/realms/sso-hub/protocol/openid-connect/token",
    "api_url": "http://keycloak:8080/realms/sso-hub/protocol/openid-connect/userinfo",
    "client_id": "grafana_client_id",
    "client_secret": "infisical://grafana/client_secret"
  },
  "grafana_url": "https://grafana.example.com",
  "admin_credentials": {
    "username": "admin",
    "password": "infisical://grafana/admin_password"
  }
}
```

### 8. Prometheus Integration
```json
{
  "proxy": {
    "enabled": true,
    "upstream_url": "http://prometheus:9090",
    "oidc_issuer": "http://keycloak:8080/realms/sso-hub",
    "client_id": "prometheus_client_id",
    "client_secret": "infisical://prometheus/client_secret"
  },
  "prometheus_url": "https://prometheus.example.com"
}
```

### 9. Kibana Integration
```json
{
  "sso_type": "oidc",
  "oidc": {
    "issuer": "http://keycloak:8080/realms/sso-hub",
    "client_id": "kibana_client_id",
    "client_secret": "infisical://kibana/client_secret"
  },
  "elastic_url": "https://elasticsearch.example.com",
  "kibana_url": "https://kibana.example.com",
  "admin_credentials": {
    "username": "elastic",
    "password": "infisical://elastic/admin_password"
  }
}
```

### 10. Snyk Integration
```json
{
  "oidc": {
    "issuer": "http://keycloak:8080/realms/sso-hub",
    "client_id": "snyk_client_id",
    "client_secret": "infisical://snyk/client_secret"
  },
  "organization_slug": "your-snyk-org",
  "auth_token": "infisical://snyk/auth_token"
}
```

### 11. Jira Integration
```json
{
  "sso_type": "saml",
  "saml": {
    "entity_id": "jira-saml-entity",
    "sso_url": "http://keycloak:8080/realms/sso-hub/protocol/saml",
    "certificate": "infisical://jira/saml_certificate"
  },
  "jira_url": "https://yourcompany.atlassian.net",
  "admin_credentials": {
    "email": "admin@yourcompany.com",
    "api_token": "infisical://jira/api_token"
  }
}
```

### 12. ServiceNow Integration
```json
{
  "sso_type": "saml",
  "saml": {
    "entity_id": "servicenow-saml-entity",
    "sso_url": "http://keycloak:8080/realms/sso-hub/protocol/saml",
    "certificate": "infisical://servicenow/saml_certificate"
  },
  "instance_url": "https://yourcompany.service-now.com",
  "admin_credentials": {
    "username": "admin",
    "password": "infisical://servicenow/admin_password"
  }
}
```

## Environment Variables

```bash
# Server Configuration
HOST=0.0.0.0
PORT=3005

# Database Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=sso_hub
POSTGRES_USER=sso_user
POSTGRES_PASSWORD=sso_secure_password

# Redis Configuration
REDIS_URL=redis://redis:6379

# Keycloak Configuration
KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_REALM=sso-hub
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin_secure_password_123

# Infisical Configuration
INFISICAL_URL=http://infisical:8080
INFISICAL_TOKEN=your_infisical_token
INFISICAL_PROJECT_ID=your_project_id

# Security
JWT_SECRET=admin-config-jwt-secret-key
ADMIN_API_KEY=admin-api-key-change-in-production
```

## Testing

### Run Integration Tests
```bash
# Test all tools
curl -X POST http://localhost:3005/api/tools/test-all \
  -H "X-API-Key: your-api-key"

# Test specific tool
curl -X POST http://localhost:3005/api/tools/github/test \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"test_type": "full"}'
```

### Test Types
- **connection**: Basic connectivity test
- **authentication**: OIDC/SAML configuration validation
- **api**: API access and functionality test
- **full**: Complete integration test suite

## Development

### Local Development
```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Run linting
pnpm run lint

# Run tests
pnpm test
```

### Docker Development
```bash
# Build image
docker build -t sso-admin-config .

# Run container
docker run -p 3005:3005 \
  -e POSTGRES_HOST=localhost \
  -e REDIS_URL=redis://localhost:6379 \
  -e KEYCLOAK_URL=http://localhost:8080 \
  sso-admin-config
```

## Security Considerations

### Secret Management
- All sensitive data stored as Infisical references
- No secrets in configuration JSON
- Encrypted storage for configuration data
- Audit trail for all configuration changes

### Authentication
- API key authentication for admin operations
- JWT token validation for user operations
- Rate limiting on all endpoints
- CORS configuration for frontend access

### Data Protection
- Input validation with Zod schemas
- SQL injection protection with parameterized queries
- XSS protection with proper encoding
- HTTPS enforcement in production

## Monitoring

### Health Checks
- `/healthz` - Basic service health
- `/readyz` - Service readiness with dependency checks
- Database connectivity monitoring
- Redis connectivity monitoring
- Keycloak connectivity monitoring

### Metrics
- Tool configuration status
- Integration test results
- API response times
- Error rates and patterns
- Configuration change frequency

## Architecture

### Database Schema
```sql
-- Tool configurations with JSON config
tool_configurations (id, tool_type, config_json, status, ...)

-- Tool status and health tracking
tool_status (id, tool_type, status, test_results, ...)

-- Supported tools metadata
supported_tools (tool_type, name, category, protocol, ...)

-- Configuration change audit log
config_audit_log (id, tool_type, action, old_config, new_config, ...)
```

### Service Dependencies
- **PostgreSQL**: Configuration storage and audit logging
- **Redis**: Caching and session storage
- **Keycloak**: OIDC/SAML client management
- **Infisical**: Secret management
- **Tool APIs**: Direct integration testing

### Integration Patterns
- **OIDC**: Modern authentication with Keycloak
- **SAML**: Legacy authentication for enterprise tools
- **OAuth2**: API access and authorization
- **Webhooks**: Event-driven integrations
- **REST APIs**: Tool management and configuration
