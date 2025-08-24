# GitLab Integration Guide 🦊

Complete guide to integrate GitLab with SSO Hub for seamless authentication, SCIM provisioning, and zero-click repository access.

## 📋 Overview

GitLab integration with SSO Hub provides:
- **Single Sign-On** via SAML 2.0 and OIDC
- **SCIM Provisioning** for automated user management
- **Group Synchronization** with role mapping
- **Zero-click access** from SSO Hub dashboard
- **Webhook integration** for repository events
- **Audit logging** for compliance

## 🎯 Integration Methods

### Method 1: SAML Integration (Recommended for Enterprise)

#### Prerequisites
- GitLab 13.0+ (Enterprise Edition recommended)
- Administrator access to GitLab
- SSO Hub running with SAML capabilities

#### Step 1: Configure SAML in GitLab
1. **Navigate to:** Admin Area → Settings → Sign-in restrictions
2. **Enable SAML Authentication**

```yaml
# GitLab SAML Configuration (/etc/gitlab/gitlab.rb)
gitlab_rails['omniauth_enabled'] = true
gitlab_rails['omniauth_allow_single_sign_on'] = ['saml']
gitlab_rails['omniauth_block_auto_created_users'] = false
gitlab_rails['omniauth_auto_link_saml_user'] = true

gitlab_rails['omniauth_providers'] = [
  {
    name: 'saml',
    args: {
      assertion_consumer_service_url: 'https://gitlab.company.com/users/auth/saml/callback',
      idp_cert_fingerprint: 'your-sso-hub-cert-fingerprint',
      idp_sso_target_url: 'http://localhost:8080/realms/sso-hub/protocol/saml',
      issuer: 'https://gitlab.company.com',
      name_identifier_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      attribute_statements: {
        email: ['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
        name: ['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
        username: ['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
        first_name: ['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'],
        last_name: ['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname']
      }
    },
    label: 'SSO Hub'
  }
]
```

#### Step 2: Configure Keycloak SAML Client
```bash
# Create GitLab SAML client in Keycloak
curl -X POST http://localhost:8080/admin/realms/sso-hub/clients \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "https://gitlab.company.com",
    "protocol": "saml",
    "enabled": true,
    "clientAuthenticatorType": "client-secret",
    "redirectUris": [
      "https://gitlab.company.com/users/auth/saml/callback"
    ],
    "attributes": {
      "saml.assertion.signature": "true",
      "saml.client.signature": "false",
      "saml.signature.algorithm": "RSA_SHA256",
      "saml.authnstatement": "true",
      "saml.onetimeuse.condition": "false",
      "saml_name_id_format": "email",
      "saml_force_name_id_format": "true"
    },
    "protocolMappers": [
      {
        "name": "email",
        "protocol": "saml",
        "protocolMapper": "saml-user-property-mapper",
        "config": {
          "attribute.nameformat": "Basic",
          "attribute.name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
          "user.attribute": "email"
        }
      },
      {
        "name": "groups",
        "protocol": "saml", 
        "protocolMapper": "saml-group-membership-mapper",
        "config": {
          "attribute.nameformat": "Basic",
          "attribute.name": "groups",
          "full.path": "false"
        }
      }
    ]
  }'
```

### Method 2: OIDC Integration (GitLab 13.1+)

#### Configure OIDC in GitLab
```ruby
# /etc/gitlab/gitlab.rb
gitlab_rails['omniauth_providers'] = [
  {
    'name' => 'openid_connect',
    'label' => 'SSO Hub',
    'args' => {
      'name' => 'openid_connect',
      'scope' => ['openid', 'profile', 'email', 'groups'],
      'response_type' => 'code',
      'issuer' => 'http://localhost:8080/realms/sso-hub',
      'client_auth_method' => 'query',
      'discovery' => true,
      'uid_field' => 'sub',
      'client_options' => {
        'identifier' => 'gitlab-oidc-client',
        'secret' => 'your-gitlab-oidc-secret',
        'redirect_uri' => 'https://gitlab.company.com/users/auth/openid_connect/callback'
      }
    }
  }
]
```

## 👥 SCIM Provisioning Setup

### Step 1: Enable SCIM in GitLab (Enterprise Edition)
```ruby
# /etc/gitlab/gitlab.rb - Enable SCIM
gitlab_rails['scim_enabled'] = true

# Configure SCIM endpoint
# URL: https://gitlab.company.com/api/scim/v2/groups/{group_id}/Users
# Authentication: Bearer token (generated in GitLab group settings)
```

### Step 2: Configure SCIM in SSO Hub
```bash
# Configure SCIM provisioning for GitLab
curl -X POST http://localhost:3011/api/provisioning/scim-targets \
  -H "Content-Type: application/json" \
  -H "X-Identity-User: admin@sso-hub.local" \
  -d '{
    "name": "GitLab SCIM",
    "tool": "gitlab",
    "scim_version": "2.0",
    "base_url": "https://gitlab.company.com/api/scim/v2/groups/123",
    "authentication": {
      "type": "bearer_token",
      "token": "your-gitlab-scim-token"
    },
    "user_mapping": {
      "userName": "email",
      "displayName": "display_name",
      "emails": ["email"],
      "active": true
    },
    "group_mapping": {
      "displayName": "name",
      "members": "users"
    },
    "provisioning_options": {
      "create_users": true,
      "update_users": true,
      "deactivate_users": true,
      "sync_groups": true,
      "sync_interval": 3600
    }
  }'
```

### Step 3: User Provisioning Workflow
```javascript
// Automated user provisioning flow
const gitlabProvisioning = {
  // When user is created in SSO Hub
  onUserCreate: async (user) => {
    const scimUser = {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      userName: user.email,
      displayName: user.display_name,
      emails: [{
        value: user.email,
        type: "work",
        primary: true
      }],
      active: true,
      groups: user.groups.filter(g => g.startsWith('gitlab-'))
    };
    
    await createSCIMUser('gitlab', scimUser);
    await auditLog('USER_PROVISIONED', { tool: 'gitlab', user: user.id });
  },
  
  // Group synchronization
  syncGroups: async () => {
    const ssoGroups = await getSSOHubGroups('gitlab-*');
    const gitlabGroups = await getGitLabGroups();
    
    for (const group of ssoGroups) {
      await syncGroupMembers(group, gitlabGroups);
    }
  }
};
```

## 🔗 SSO Hub Catalog Integration

### Step 1: Register GitLab in SSO Hub
```bash
curl -X POST http://localhost:3006/api/tools \
  -H "Content-Type: application/json" \
  -H "X-Identity-User: admin@sso-hub.local" \
  -d '{
    "name": "GitLab",
    "category": "Source Control",
    "description": "Git repository management and CI/CD",
    "url": "https://gitlab.company.com",
    "icon_url": "http://localhost:3000/assets/logos/GitLab.svg",
    "status": "active",
    "launch_config": {
      "type": "seamless_sso",
      "auth_method": "saml",
      "auto_login": true,
      "redirect_after_auth": "/dashboard",
      "session_duration": 8,
      "iframe_support": false
    },
    "health_check": {
      "enabled": true,
      "endpoint": "https://gitlab.company.com/api/v4/version",
      "method": "GET",
      "interval": 60,
      "timeout": 10,
      "expected_status": 200
    },
    "webhook_config": {
      "enabled": true,
      "events": [
        "push", "merge_request", "pipeline_status",
        "issue", "deployment", "release"
      ],
      "secret": "your-gitlab-webhook-secret"
    },
    "scim_config": {
      "enabled": true,
      "endpoint": "https://gitlab.company.com/api/scim/v2/groups/123",
      "auth_token": "your-scim-token",
      "sync_interval": 3600
    }
  }'
```

### Step 2: Group Role Mapping
```yaml
# Configure GitLab role mapping in SSO Hub
gitlab_role_mapping:
  # SSO Hub Groups → GitLab Access Levels
  sso-hub-gitlab-owner:
    gitlab_access_level: 50      # Owner
    permissions: ["admin", "push", "pull", "issues", "merge_requests"]
    
  sso-hub-gitlab-maintainer:
    gitlab_access_level: 40      # Maintainer  
    permissions: ["push", "pull", "issues", "merge_requests", "wiki"]
    
  sso-hub-gitlab-developer:
    gitlab_access_level: 30      # Developer
    permissions: ["push", "pull", "issues", "merge_requests"]
    
  sso-hub-gitlab-reporter:
    gitlab_access_level: 20      # Reporter
    permissions: ["pull", "issues"]
    
  sso-hub-gitlab-guest:
    gitlab_access_level: 10      # Guest
    permissions: ["pull"]
```

## 🔔 Webhook Integration

### Step 1: Configure GitLab Webhooks
```bash
# Add webhook to GitLab project/group
curl -X POST "https://gitlab.company.com/api/v4/projects/123/hooks" \
  -H "PRIVATE-TOKEN: your-gitlab-token" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://localhost:3007/webhooks/gitlab",
    "push_events": true,
    "merge_requests_events": true,
    "pipeline_events": true,
    "issues_events": true,
    "deployment_events": true,
    "releases_events": true,
    "token": "your-webhook-secret",
    "enable_ssl_verification": true
  }'
```

### Step 2: SSO Hub Webhook Handler
```javascript
// GitLab webhook event processing in SSO Hub
const gitlabWebhookHandler = {
  // Push events
  handlePush: async (payload) => {
    const event = {
      type: 'gitlab_push',
      repository: payload.project.name,
      branch: payload.ref.replace('refs/heads/', ''),
      commits: payload.commits.length,
      user: payload.user_name,
      timestamp: payload.timestamp
    };
    
    await analyticsService.recordEvent(event);
    await auditService.logActivity('repository_push', event);
    
    // Trigger notifications if configured
    if (event.branch === 'main' || event.branch === 'master') {
      await notificationService.notify('deploy_candidate', event);
    }
  },
  
  // Merge request events
  handleMergeRequest: async (payload) => {
    const event = {
      type: 'gitlab_merge_request',
      action: payload.object_attributes.action,
      title: payload.object_attributes.title,
      author: payload.user.name,
      target_branch: payload.object_attributes.target_branch,
      source_branch: payload.object_attributes.source_branch,
      url: payload.object_attributes.url
    };
    
    await analyticsService.recordEvent(event);
    
    // Notify relevant teams
    if (event.action === 'open') {
      await notificationService.notifyTeam('code_review', event);
    }
  },
  
  // Pipeline events
  handlePipeline: async (payload) => {
    const event = {
      type: 'gitlab_pipeline',
      status: payload.object_attributes.status,
      ref: payload.object_attributes.ref,
      duration: payload.object_attributes.duration,
      stages: payload.builds?.map(b => b.stage) || []
    };
    
    await analyticsService.recordEvent(event);
    
    // Alert on pipeline failures
    if (event.status === 'failed') {
      await notificationService.alertOncall('pipeline_failure', event);
    }
  }
};
```

## 🔧 GitLab Configuration Files

### GitLab CI/CD Integration with SSO Hub
```yaml
# .gitlab-ci.yml with SSO Hub integration
stages:
  - validate
  - build
  - deploy
  - notify

variables:
  SSO_HUB_API: "http://localhost:3006/api"

before_script:
  - echo "Build initiated by $GITLAB_USER_LOGIN via SSO Hub"

validate_sso_token:
  stage: validate
  script:
    - |
      # Validate SSO context if available
      if [ -n "$SSO_HUB_TOKEN" ]; then
        curl -H "Authorization: Bearer $SSO_HUB_TOKEN" \
             "$SSO_HUB_API/auth/validate" || exit 1
      fi

build_application:
  stage: build
  script:
    - echo "Building application..."
    - docker build -t myapp:$CI_COMMIT_SHA .
  artifacts:
    paths:
      - build/

deploy_staging:
  stage: deploy
  script:
    - |
      # Use SSO Hub provisioning API for deployment
      curl -X POST "$SSO_HUB_API/provisioning/deploy" \
           -H "Authorization: Bearer $SSO_HUB_TOKEN" \
           -H "Content-Type: application/json" \
           -d '{
             "environment": "staging",
             "application": "myapp",
             "version": "'$CI_COMMIT_SHA'",
             "user": "'$GITLAB_USER_LOGIN'",
             "project": "'$CI_PROJECT_NAME'"
           }'
  only:
    - develop

notify_completion:
  stage: notify
  script:
    - |
      # Notify via SSO Hub notification service
      curl -X POST "http://localhost:3014/api/notifications" \
           -H "Content-Type: application/json" \
           -d '{
             "type": "deployment_complete",
             "title": "Deployment Complete",
             "message": "Application '$CI_PROJECT_NAME' deployed successfully",
             "channels": ["slack", "email"],
             "metadata": {
               "project": "'$CI_PROJECT_NAME'",
               "commit": "'$CI_COMMIT_SHA'",
               "user": "'$GITLAB_USER_LOGIN'",
               "pipeline_url": "'$CI_PIPELINE_URL'"
             }
           }'
  when: on_success
```

### Group Settings for SCIM
```yaml
# GitLab group configuration for SCIM integration
group_settings:
  name: "DevOps Team"
  path: "devops-team"
  description: "Main DevOps engineering group"
  
  # SCIM configuration
  scim:
    enabled: true
    token: "your-generated-scim-token"
    url: "https://gitlab.company.com/api/scim/v2/groups/123"
    
  # SSO settings
  sso:
    enabled: true
    provider: "saml"
    group_mapping: "sso-hub-gitlab-devops"
    
  # Default member permissions
  default_branch_protection:
    push_access_level: 30  # Developer
    merge_access_level: 40 # Maintainer
    allow_force_push: false
```

## 🛡️ Security Configuration

### Advanced SAML Configuration
```ruby
# /etc/gitlab/gitlab.rb - Advanced SAML security
gitlab_rails['omniauth_providers'] = [
  {
    name: 'saml',
    args: {
      assertion_consumer_service_url: 'https://gitlab.company.com/users/auth/saml/callback',
      idp_cert_fingerprint: 'your-cert-fingerprint',
      idp_sso_target_url: 'http://localhost:8080/realms/sso-hub/protocol/saml',
      issuer: 'https://gitlab.company.com',
      
      # Security settings
      name_identifier_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      allowed_clock_drift: 1.second,
      
      # Attribute mapping
      attribute_statements: {
        email: ['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
        name: ['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
        username: ['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
        first_name: ['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'],
        last_name: ['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'],
        groups: ['groups']
      },
      
      # Advanced security options
      security: {
        authn_requests_signed: false,
        logout_requests_signed: false,
        logout_responses_signed: false,
        want_assertions_signed: true,
        digest_method: XMLSecurity::Document::SHA256,
        signature_method: XMLSecurity::Document::RSA_SHA256
      }
    },
    label: 'Company SSO'
  }
]

# Additional security settings
gitlab_rails['omniauth_auto_link_saml_user'] = true
gitlab_rails['omniauth_block_auto_created_users'] = false
gitlab_rails['omniauth_allow_single_sign_on'] = ['saml']
```

### API Security
```bash
# Secure GitLab API integration with SSO Hub
gitlab_api_security:
  # Use service accounts for SSO Hub integration
  service_account:
    username: "sso-hub-integration"
    token: "your-secure-api-token"
    permissions: ["read_api", "read_user", "read_repository"]
    
  # Rate limiting for SSO Hub requests
  rate_limits:
    authenticated: 2000  # requests per hour
    unauthenticated: 100 # requests per hour
    
  # IP whitelist for SSO Hub services
  ip_whitelist:
    - "10.0.0.0/8"      # Internal network
    - "172.16.0.0/12"   # Docker network
    - "192.168.0.0/16"  # Private network
```

## 📊 Monitoring & Analytics

### GitLab Health Monitoring
```yaml
# SSO Hub health check configuration for GitLab
gitlab_monitoring:
  health_checks:
    - name: "GitLab API Health"
      endpoint: "https://gitlab.company.com/api/v4/version"
      method: GET
      interval: 60
      timeout: 10
      expected_status: 200
      
    - name: "SAML Authentication"
      endpoint: "https://gitlab.company.com/users/auth/saml"
      method: GET
      interval: 300
      timeout: 15
      expected_status: 302  # Redirect to IdP
      
    - name: "SCIM Endpoint"
      endpoint: "https://gitlab.company.com/api/scim/v2/groups/123/Users"
      method: GET
      headers:
        Authorization: "Bearer your-scim-token"
      interval: 300
      timeout: 10
      expected_status: 200
      
  performance_metrics:
    - "response_time"
    - "authentication_success_rate" 
    - "scim_sync_success_rate"
    - "webhook_delivery_rate"
```

### Usage Analytics
```javascript
// GitLab usage analytics in SSO Hub
const gitlabAnalytics = {
  // User activity tracking
  trackUserActivity: {
    repository_access: "Track repository visits from SSO Hub",
    commit_activity: "Monitor user commit frequency",
    merge_request_participation: "Track code review activity",
    pipeline_usage: "Monitor CI/CD pipeline utilization"
  },
  
  // Security analytics
  trackSecurityEvents: {
    authentication_attempts: "Monitor SSO login success/failure",
    permission_changes: "Track role and permission modifications",
    suspicious_activity: "Detect unusual access patterns",
    compliance_violations: "Monitor policy compliance"
  },
  
  // Performance analytics
  trackPerformance: {
    sso_latency: "Measure authentication response times",
    scim_sync_performance: "Monitor provisioning speed",
    webhook_delivery: "Track event delivery success",
    api_performance: "Monitor GitLab API response times"
  }
};
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### SAML Authentication Fails
```bash
# Check GitLab logs for SAML errors
sudo tail -f /var/log/gitlab/gitlab-rails/production.log | grep -i saml

# Verify SAML configuration
sudo gitlab-rails console
> Gitlab.config.omniauth.providers.find { |p| p.name == 'saml' }

# Test SAML metadata
curl -s http://localhost:8080/realms/sso-hub/protocol/saml/descriptor
```

#### SCIM Provisioning Issues
```bash
# Test SCIM connectivity
curl -H "Authorization: Bearer your-scim-token" \
     https://gitlab.company.com/api/scim/v2/groups/123/Users

# Check SCIM logs in SSO Hub
docker-compose logs -f ldap-sync | grep -i scim

# Verify group mapping
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:8080/admin/realms/sso-hub/groups
```

#### Webhook Not Working
```bash
# Test webhook endpoint
curl -X POST http://localhost:3007/webhooks/gitlab \
  -H "Content-Type: application/json" \
  -H "X-Gitlab-Token: your-webhook-secret" \
  -d '{"object_kind": "push", "project": {"name": "test"}}'

# Check GitLab webhook delivery
# Go to Project/Group Settings → Webhooks → Recent Deliveries

# Verify webhook logs
docker-compose logs -f webhook-ingress | grep gitlab
```

#### Group Synchronization Problems
```bash
# Force group sync from SSO Hub
curl -X POST http://localhost:3012/api/ldap-sync/force-sync \
  -H "X-Identity-User: admin@sso-hub.local" \
  -d '{"target": "gitlab", "sync_type": "groups"}'

# Check group mapping in GitLab
# Admin Area → Groups → [Group Name] → Members → Group links
```

### Performance Optimization
```ruby
# /etc/gitlab/gitlab.rb - Performance tuning for SSO
gitlab_rails['omniauth_cache_expiry'] = 600  # 10 minutes
gitlab_rails['omniauth_session_duration'] = 86400  # 24 hours

# Database connection pooling
gitlab_rails['db_pool'] = 20
gitlab_rails['db_connect_timeout'] = 60

# SAML response caching
gitlab_rails['saml_response_cache_duration'] = 300  # 5 minutes
```

## 📈 Advanced Features

### GitLab Runner Integration
```yaml
# .gitlab-runner-config.yml with SSO Hub integration
[[runners]]
  name = "sso-hub-runner"
  url = "https://gitlab.company.com/"
  token = "your-runner-token"
  executor = "docker"
  
  # Pre-build script to validate SSO context
  pre_build_script = """
    if [ -n "$SSO_HUB_USER" ]; then
      echo "Build initiated by SSO Hub user: $SSO_HUB_USER"
      curl -H "Authorization: Bearer $SSO_HUB_TOKEN" \
           http://localhost:3009/api/audit/build-started \
           -d "{\"user\":\"$SSO_HUB_USER\",\"project\":\"$CI_PROJECT_NAME\"}"
    fi
  """
  
  [runners.docker]
    image = "docker:latest"
    privileged = true
    
    # Environment variables for SSO Hub integration
    environment = [
      "SSO_HUB_API=http://localhost:3006/api",
      "ANALYTICS_ENDPOINT=http://localhost:3010/api/events"
    ]
```

### Multi-Project Templates
```yaml
# GitLab project template with SSO Hub integration
.sso_hub_integration: &sso_hub_integration
  variables:
    SSO_HUB_API: "http://localhost:3006/api"
    WEBHOOK_URL: "http://localhost:3007/webhooks/gitlab"
    
  before_script:
    - echo "Authenticating with SSO Hub..."
    - |
      if [ -n "$SSO_HUB_TOKEN" ]; then
        export SSO_USER=$(curl -s -H "Authorization: Bearer $SSO_HUB_TOKEN" \
                               "$SSO_HUB_API/auth/user" | jq -r '.username')
        echo "Authenticated as: $SSO_USER"
      fi

# Use in project .gitlab-ci.yml
include:
  - template: SSO-Hub-Integration.gitlab-ci.yml

build:
  <<: *sso_hub_integration
  script:
    - echo "Building with SSO Hub context..."
```

## 🎯 Best Practices

### Security Best Practices
1. **Use HTTPS everywhere** for SAML and OIDC communications
2. **Rotate SAML certificates** and SCIM tokens regularly
3. **Implement proper group mapping** with least privilege principle
4. **Enable audit logging** for all authentication and authorization events
5. **Use service accounts** for API integrations

### SCIM Provisioning Best Practices
1. **Start with read-only sync** to validate mappings
2. **Implement gradual rollout** for user provisioning
3. **Monitor sync performance** and adjust intervals
4. **Handle conflicts gracefully** (duplicate emails, usernames)
5. **Backup user data** before major sync operations

### Performance Best Practices
1. **Configure appropriate caching** for SAML responses
2. **Use webhook filters** to reduce noise
3. **Implement rate limiting** for API calls
4. **Monitor authentication latency** 
5. **Optimize group queries** and mappings

---

**🎉 Success!** GitLab is now fully integrated with SSO Hub, providing seamless authentication, automated provisioning, and comprehensive DevOps workflow integration.

**Next Steps:**
- [Kubernetes Integration](kubernetes.md) - Container orchestration with OIDC
- [Jenkins Integration](jenkins.md) - CI/CD with SSO
- [Monitoring & Analytics](../configuration/monitoring.md) - Track usage and performance