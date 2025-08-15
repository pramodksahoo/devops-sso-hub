# Tool Integration Specifications

This document provides comprehensive specifications for integrating all 11 DevOps tools with the SSO Hub using industry-standard SSO methods (OIDC/SAML).

## Overview

The SSO Hub supports integration with the following tools through standardized authentication protocols:

1. **GitHub** - OAuth App + OIDC
2. **GitLab** - OIDC configuration  
3. **Jenkins** - OIDC Plugin setup
4. **Argo CD** - OIDC integration
5. **Terraform Cloud/Enterprise** - SAML/OIDC
6. **SonarQube** - OIDC configuration
7. **Grafana** - Generic OAuth (OIDC)
8. **Prometheus** - Proxy-based auth
9. **Kibana (Elastic)** - SAML/OIDC
10. **Snyk** - OIDC configuration
11. **Jira/ServiceNow** - SAML/OIDC

## Authentication Architecture

All tool integrations follow a consistent pattern:

1. **Identity Provider**: Keycloak serving as the central OIDC/SAML provider
2. **Gateway**: NGINX/OpenResty with lua-resty-openidc for unified authentication
3. **Backend Services**: Microservices with HMAC-signed identity headers
4. **Tool Configuration**: Admin UI for configuring each tool's SSO settings

---

## 1. GitHub Integration

### Method: OAuth App + OIDC
**Official Documentation**: [GitHub Apps OAuth](https://docs.github.com/en/developers/apps/building-oauth-apps)

#### Configuration Parameters
```yaml
type: "oauth_app"
auth_method: "oidc"
scopes:
  - "read:user"
  - "user:email"
  - "read:org"
  - "repo"
```

#### Required Environment Variables
```bash
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret
GITHUB_APP_ID=your_github_app_id (for GitHub App integration)
GITHUB_PRIVATE_KEY_PATH=/secrets/github-private-key.pem
GITHUB_ORGANIZATION=your_github_org
```

#### Integration Features
- **SSO Login**: OAuth 2.0 flow with GitHub
- **SCIM Provisioning**: User/team synchronization
- **Webhook Events**: Repository, pull request, and organization events
- **Deep Links**: Direct repository and issue navigation
- **Health Monitoring**: GitHub API status checks

#### Admin UI Configuration
- OAuth App client ID/secret
- Organization/repository scope selection
- Webhook endpoint configuration
- User role mapping rules

---

## 2. GitLab Integration

### Method: OIDC Configuration
**Official Documentation**: [GitLab OIDC](https://docs.gitlab.com/ee/administration/auth/oidc.html)

#### Configuration Parameters
```yaml
type: "oidc"
auth_method: "openid_connect"
issuer_url: "http://keycloak:8080/realms/sso-hub"
client_id: "gitlab-client"
client_secret: "gitlab-client-secret"
scopes:
  - "openid"
  - "profile"
  - "email"
  - "read_user"
```

#### Required Environment Variables
```bash
GITLAB_CLIENT_ID=gitlab-client
GITLAB_CLIENT_SECRET=gitlab-client-secret
GITLAB_INSTANCE_URL=https://gitlab.com
GITLAB_WEBHOOK_SECRET=your_gitlab_webhook_secret
GITLAB_GROUP_ID=your_gitlab_group_id
```

#### Integration Features
- **SSO Login**: OIDC authentication flow
- **Project Provisioning**: Automatic project/group creation
- **Webhook Support**: Pipeline, merge request, and project events
- **Role Mapping**: GitLab roles based on Keycloak groups
- **Health Monitoring**: GitLab instance health checks

---

## 3. Jenkins Integration

### Method: OIDC Plugin Setup
**Official Documentation**: [Jenkins OIDC Plugin](https://plugins.jenkins.io/oic-auth/)

#### Configuration Parameters
```yaml
type: "oidc_plugin"
plugin_name: "oic-auth"
issuer_url: "http://keycloak:8080/realms/sso-hub"
client_id: "jenkins-client"
client_secret: "jenkins-client-secret"
scopes:
  - "openid"
  - "profile"
  - "email"
  - "groups"
```

#### Required Environment Variables
```bash
JENKINS_URL=http://jenkins:8080
JENKINS_OIDC_CLIENT_ID=jenkins-client
JENKINS_OIDC_CLIENT_SECRET=jenkins-client-secret
JENKINS_ADMIN_TOKEN=your_jenkins_admin_token
JENKINS_WEBHOOK_SECRET=your_jenkins_webhook_secret
```

#### Integration Features
- **SSO Login**: OIDC plugin authentication
- **Job Provisioning**: Automated job/pipeline creation
- **Build Webhooks**: Build status and completion events
- **Permission Management**: Jenkins matrix authorization with OIDC groups
- **Health Monitoring**: Jenkins system health and build queue status

---

## 4. Argo CD Integration

### Method: OIDC Integration
**Official Documentation**: [Argo CD OIDC](https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/)

#### Configuration Parameters
```yaml
type: "oidc"
auth_method: "oidc"
issuer_url: "http://keycloak:8080/realms/sso-hub"
client_id: "argocd-client"
client_secret: "argocd-client-secret"
requested_scopes:
  - "openid"
  - "profile"
  - "email"
  - "groups"
```

#### Required Environment Variables
```bash
ARGOCD_URL=http://argocd:8080
ARGOCD_OIDC_CLIENT_ID=argocd-client
ARGOCD_OIDC_CLIENT_SECRET=argocd-client-secret
ARGOCD_ADMIN_PASSWORD=your_argocd_admin_password
ARGOCD_WEBHOOK_SECRET=your_argocd_webhook_secret
```

#### Integration Features
- **SSO Login**: OIDC authentication with Keycloak
- **Application Management**: GitOps application lifecycle
- **Sync Webhooks**: Application sync status and health events
- **RBAC Integration**: Argo CD RBAC with Keycloak groups
- **Health Monitoring**: Application and cluster health status

---

## 5. Terraform Cloud/Enterprise Integration

### Method: SAML/OIDC
**Official Documentation**: [Terraform Cloud SSO](https://www.terraform.io/docs/cloud/users-teams-organizations/single-sign-on.html)

#### Configuration Parameters
```yaml
type: "saml" # or "oidc" for Enterprise
auth_method: "saml2"
entity_id: "terraform-cloud-sso"
sso_url: "http://keycloak:8080/realms/sso-hub/protocol/saml"
certificate: "keycloak-saml-cert"
```

#### Required Environment Variables
```bash
TERRAFORM_ORGANIZATION=your_terraform_org
TERRAFORM_TOKEN=your_terraform_token
TERRAFORM_SAML_ENTITY_ID=terraform-cloud-sso
TERRAFORM_OIDC_CLIENT_ID=terraform-client (for Enterprise)
TERRAFORM_OIDC_CLIENT_SECRET=terraform-client-secret
```

#### Integration Features
- **SSO Login**: SAML or OIDC authentication
- **Workspace Management**: Terraform workspace provisioning
- **Run Webhooks**: Plan, apply, and state change events
- **Team Synchronization**: User/team mapping from Keycloak
- **Health Monitoring**: Workspace and run status monitoring

---

## 6. SonarQube Integration

### Method: OIDC Configuration
**Official Documentation**: [SonarQube OIDC](https://docs.sonarqube.org/latest/instance-administration/authentication/oidc/)

#### Configuration Parameters
```yaml
type: "oidc"
auth_method: "oidc"
provider_configuration: "http://keycloak:8080/realms/sso-hub/.well-known/openid_configuration"
client_id: "sonarqube-client"
client_secret: "sonarqube-client-secret"
scopes:
  - "openid"
  - "email"
  - "profile"
  - "groups"
```

#### Required Environment Variables
```bash
SONARQUBE_URL=http://sonarqube:9000
SONARQUBE_OIDC_CLIENT_ID=sonarqube-client
SONARQUBE_OIDC_CLIENT_SECRET=sonarqube-client-secret
SONARQUBE_ADMIN_TOKEN=your_sonarqube_admin_token
SONARQUBE_WEBHOOK_SECRET=your_sonarqube_webhook_secret
```

#### Integration Features
- **SSO Login**: OIDC authentication flow
- **Project Provisioning**: Automated project and quality gate setup
- **Quality Gate Webhooks**: Code quality and security scan results
- **Group Synchronization**: SonarQube groups from Keycloak
- **Health Monitoring**: System health and analysis status

---

## 7. Grafana Integration (Testing)

### Method: Generic OAuth (OIDC)
**Official Documentation**: [Grafana Generic OAuth](https://grafana.com/docs/grafana/latest/auth/generic-oauth/)

#### Configuration Parameters
```yaml
type: "generic_oauth"
auth_method: "oidc"
auth_url: "http://keycloak:8080/realms/sso-hub/protocol/openid-connect/auth"
token_url: "http://keycloak:8080/realms/sso-hub/protocol/openid-connect/token"
api_url: "http://keycloak:8080/realms/sso-hub/protocol/openid-connect/userinfo"
client_id: "grafana-client"
client_secret: "grafana-client-secret"
```

#### Required Environment Variables
```bash
GRAFANA_URL=http://grafana:3000
GRAFANA_OIDC_CLIENT_ID=grafana-client
GRAFANA_OIDC_CLIENT_SECRET=grafana-client-secret
GRAFANA_ADMIN_PASSWORD=grafana_admin_pass
GRAFANA_WEBHOOK_SECRET=your_grafana_webhook_secret
```

#### Integration Features
- **SSO Login**: Generic OAuth with OIDC
- **Folder Provisioning**: Dashboard and datasource management
- **Alert Webhooks**: Alert state change notifications
- **Role Mapping**: Grafana roles based on Keycloak groups
- **Health Monitoring**: Dashboard and datasource health

---

## 8. Prometheus Integration

### Method: Proxy-based Authentication
**Official Documentation**: [Prometheus Authentication](https://prometheus.io/docs/guides/basic-auth/)

#### Configuration Parameters
```yaml
type: "reverse_proxy"
auth_method: "proxy"
proxy_header: "X-User-Sub"
admin_groups:
  - "admins"
  - "prometheus-admins"
```

#### Required Environment Variables
```bash
PROMETHEUS_URL=http://prometheus:9090
PROMETHEUS_CONFIG_PATH=/etc/prometheus/prometheus.yml
PROMETHEUS_WEBHOOK_SECRET=your_prometheus_webhook_secret
```

#### Integration Features
- **Proxy Authentication**: NGINX-based authentication with identity headers
- **Configuration Management**: Dynamic Prometheus configuration
- **Alert Manager Integration**: Alert routing and notification
- **Health Monitoring**: Target and rule evaluation status
- **Metrics Collection**: SSO Hub metrics scraping

---

## 9. Kibana (Elastic) Integration

### Method: SAML/OIDC
**Official Documentation**: [Elastic OIDC](https://www.elastic.co/guide/en/elasticsearch/reference/current/oidc-guide.html)

#### Configuration Parameters
```yaml
type: "oidc"
auth_method: "oidc"
op.issuer: "http://keycloak:8080/realms/sso-hub"
rp.client_id: "kibana-client"
rp.client_secret: "kibana-client-secret"
rp.response_type: "code"
rp.redirect_uri: "http://kibana:5601/api/security/oidc/callback"
```

#### Required Environment Variables
```bash
KIBANA_URL=http://kibana:5601
ELASTICSEARCH_URL=http://elasticsearch:9200
KIBANA_OIDC_CLIENT_ID=kibana-client
KIBANA_OIDC_CLIENT_SECRET=kibana-client-secret
ELASTIC_PASSWORD=your_elastic_password
KIBANA_WEBHOOK_SECRET=your_kibana_webhook_secret
```

#### Integration Features
- **SSO Login**: OIDC/SAML authentication
- **Index Pattern Management**: Automated Kibana setup
- **Space Provisioning**: Multi-tenant dashboard spaces
- **Role Mapping**: Elasticsearch roles from Keycloak groups
- **Health Monitoring**: Cluster and index health status

---

## 10. Snyk Integration

### Method: OIDC Configuration
**Official Documentation**: [Snyk SSO](https://docs.snyk.io/admin/managing-users-and-permissions/setting-up-sso-for-authentication)

#### Configuration Parameters
```yaml
type: "oidc"
auth_method: "oidc"
issuer_url: "http://keycloak:8080/realms/sso-hub"
client_id: "snyk-client"
client_secret: "snyk-client-secret"
scopes:
  - "openid"
  - "email"
  - "profile"
```

#### Required Environment Variables
```bash
SNYK_API_TOKEN=your_snyk_api_token
SNYK_ORG_ID=your_snyk_org_id
SNYK_OIDC_CLIENT_ID=snyk-client
SNYK_OIDC_CLIENT_SECRET=snyk-client-secret
SNYK_WEBHOOK_SECRET=your_snyk_webhook_secret
```

#### Integration Features
- **SSO Login**: OIDC authentication flow
- **Organization Management**: User and project provisioning
- **Vulnerability Webhooks**: Security scan and issue notifications
- **Role Synchronization**: Snyk roles from Keycloak groups
- **Health Monitoring**: API and scan service status

---

## 11. Jira Integration

### Method: SAML/OIDC
**Official Documentation**: [Atlassian OIDC](https://support.atlassian.com/atlassian-cloud/docs/configure-an-oidc-identity-provider/)

#### Configuration Parameters
```yaml
type: "oidc"
auth_method: "oidc"
issuer_url: "http://keycloak:8080/realms/sso-hub"
client_id: "jira-client"
client_secret: "jira-client-secret"
scopes:
  - "openid"
  - "email"
  - "profile"
```

#### Required Environment Variables
```bash
JIRA_URL=https://your-domain.atlassian.net
JIRA_CLIENT_ID=jira-client
JIRA_CLIENT_SECRET=jira-client-secret
JIRA_WEBHOOK_SECRET=your_jira_webhook_secret
JIRA_PROJECT_KEY=your_jira_project_key
```

#### Integration Features
- **SSO Login**: OIDC authentication with Atlassian
- **Project Management**: Automated project and space creation
- **Ticket Webhooks**: Issue creation, update, and transition events
- **User Provisioning**: Automatic user and group synchronization
- **Health Monitoring**: Jira instance and project health

---

## 12. ServiceNow Integration

### Method: SAML/OIDC
**Official Documentation**: [ServiceNow SSO](https://docs.servicenow.com/bundle/vancouver-platform-administration/page/integrate/single-sign-on/concept/c_SingleSignOn.html)

#### Configuration Parameters
```yaml
type: "saml"
auth_method: "saml2"
entity_id: "servicenow-sso"
sso_url: "http://keycloak:8080/realms/sso-hub/protocol/saml"
certificate: "keycloak-saml-cert"
name_id_format: "urn:oasis:names:tc:SAML:2.0:nameid-format:emailAddress"
```

#### Required Environment Variables
```bash
SERVICENOW_INSTANCE_URL=https://your-instance.service-now.com
SERVICENOW_CLIENT_ID=servicenow-client
SERVICENOW_CLIENT_SECRET=servicenow-client-secret
SERVICENOW_USERNAME=your_servicenow_username
SERVICENOW_PASSWORD=your_servicenow_password
SERVICENOW_WEBHOOK_SECRET=your_servicenow_webhook_secret
```

#### Integration Features
- **SSO Login**: SAML authentication
- **Table/Record Management**: Automated catalog provisioning
- **Workflow Webhooks**: Incident, change, and request events
- **Role Mapping**: ServiceNow roles from Keycloak groups
- **Health Monitoring**: Instance and service health checks

---

## Common Integration Patterns

### 1. Health Check Implementation
All tools implement consistent health check endpoints:
```typescript
interface ToolHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: string;
  responseTime: number;
  details: {
    auth: boolean;
    api: boolean;
    webhooks: boolean;
  };
}
```

### 2. Webhook Signature Validation
Consistent webhook signature validation across all tools:
```typescript
interface WebhookValidation {
  algorithm: 'sha256' | 'sha1';
  header: string;
  secret: string;
  body: string;
}
```

### 3. Role Mapping Configuration
Standardized role mapping from Keycloak to tool-specific roles:
```yaml
role_mappings:
  keycloak_groups:
    - source: "/admins"
      target: "admin"
    - source: "/users"
      target: "editor"
    - source: "/viewers"
      target: "viewer"
```

### 4. Launch URL Generation
Dynamic URL generation for authenticated tool access:
```typescript
interface LaunchUrl {
  tool: string;
  baseUrl: string;
  deepLink?: string;
  authFlow: 'sso' | 'direct';
  expiresAt: string;
}
```

## Testing and Verification

### Phase 0 Testing Tools
- **Grafana**: Generic OAuth OIDC integration testing
- **SonarQube**: OIDC authentication flow verification

### Verification Commands
```bash
# Test Grafana OIDC integration
curl -f http://localhost:3100/api/health

# Test SonarQube OIDC integration  
curl -f http://localhost:9000/api/system/status

# Verify Keycloak clients
curl -f http://localhost:8080/realms/sso-hub/.well-known/openid_configuration

# Test authentication flow
curl -f http://localhost/auth/login
```

This specification serves as the foundation for implementing all 11 tool integrations in subsequent phases of the SSO Hub development.
