# Jenkins Integration Guide 🔧

Complete guide to integrate Jenkins with SSO Hub for seamless authentication and zero-click access to your CI/CD pipelines.

## 📋 Overview

Jenkins integration with SSO Hub provides:
- **Single Sign-On** via OIDC protocol
- **Role-Based Access Control** with group mapping
- **Zero-click access** from SSO Hub dashboard
- **Webhook integration** for build notifications
- **Audit logging** for compliance requirements

## 🎯 Integration Methods

### Method 1: Native OIDC Plugin (Recommended)

#### Prerequisites
- Jenkins 2.400+ with administrator access
- OIDC Plugin installed (`oic-auth`)
- SSO Hub running and accessible

#### Step 1: Install OIDC Plugin
```bash
# Via Jenkins CLI
java -jar jenkins-cli.jar -s http://jenkins.company.com/ install-plugin oic-auth

# Or via UI: Manage Jenkins → Manage Plugins → Available → Search "OpenId Connect Authentication Plugin"
```

#### Step 2: Configure OIDC in Jenkins
1. **Navigate to:** Manage Jenkins → Configure Global Security
2. **Security Realm:** Select "Login with OpenId Connect"
3. **Configure OIDC Settings:**

```yaml
# OIDC Configuration
Client ID: jenkins-client
Client Secret: your-jenkins-client-secret
Configuration Mode: Automatic configuration
Well-known Configuration Endpoint: http://localhost:8080/realms/sso-hub/.well-known/openid_configuration

# Advanced Settings
Token Server Url: http://localhost:8080/realms/sso-hub/protocol/openid-connect/token
Authorization Server URL: http://localhost:8080/realms/sso-hub/protocol/openid-connect/auth
UserInfo Server URL: http://localhost:8080/realms/sso-hub/protocol/openid-connect/userinfo
Token Field to check: sub
Full Name Field Name: name
Email Field Name: email
Groups Field Name: groups
Logout from OpenId Provider: ✅ Enabled
Post Logout Redirect URL: http://jenkins.company.com/
```

#### Step 3: Configure Keycloak Client
```bash
# Create Jenkins client in Keycloak
curl -X POST http://localhost:8080/admin/realms/sso-hub/clients \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "jenkins-client",
    "protocol": "openid-connect",
    "publicClient": false,
    "directAccessGrantsEnabled": true,
    "serviceAccountsEnabled": true,
    "standardFlowEnabled": true,
    "redirectUris": [
      "http://jenkins.company.com/securityRealm/finishLogin",
      "https://jenkins.company.com/securityRealm/finishLogin"
    ],
    "webOrigins": [
      "http://jenkins.company.com",
      "https://jenkins.company.com"
    ]
  }'
```

#### Step 4: Role Mapping Configuration
```yaml
# In Jenkins: Manage Jenkins → Configure Global Security → Authorization
Strategy: Matrix-based security

# Map OIDC groups to Jenkins permissions
Group Mapping:
  sso-hub-jenkins-admin → Overall/Administer
  sso-hub-jenkins-developer → Job/Build, Job/Read, View/Read
  sso-hub-jenkins-viewer → Job/Read, View/Read

# Group-based permissions matrix
Groups:
  - sso-hub-jenkins-admin:
    - Overall/Administer: ✅
    - Overall/Read: ✅ 
    - Job/Create: ✅
    - Job/Delete: ✅
    - Job/Configure: ✅
    - Job/Build: ✅
    - Job/Cancel: ✅
    
  - sso-hub-jenkins-developer:
    - Job/Build: ✅
    - Job/Cancel: ✅
    - Job/Read: ✅
    - Job/Workspace: ✅
    - View/Read: ✅
    - Run/Replay: ✅
    
  - sso-hub-jenkins-viewer:
    - Job/Read: ✅
    - View/Read: ✅
    - Overall/Read: ✅
```

### Method 2: SAML Integration (Alternative)

#### Step 1: Install SAML Plugin
```bash
# Install SAML plugin
java -jar jenkins-cli.jar -s http://jenkins.company.com/ install-plugin saml
```

#### Step 2: Configure SAML in Jenkins
```xml
<!-- SAML Configuration -->
<saml-security-realm>
  <idpMetadataConfiguration>
    <url>http://localhost:8080/realms/sso-hub/protocol/saml/descriptor</url>
    <period>60</period>
  </idpMetadataConfiguration>
  <displayNameAttributeName>displayName</displayNameAttributeName>
  <groupsAttributeName>groups</groupsAttributeName>
  <maximumAuthenticationLifetime>86400</maximumAuthenticationLifetime>
  <usernameCaseConversion>none</usernameCaseConversion>
  <emailAttributeName>email</emailAttributeName>
  <logoutUrl>http://localhost:8080/realms/sso-hub/protocol/saml</logoutUrl>
  <advancedConfiguration>
    <forceAuthn>false</forceAuthn>
    <authnContextClassRef></authnContextClassRef>
    <spEntityId>jenkins-saml</spEntityId>
  </advancedConfiguration>
</saml-security-realm>
```

## 🔗 SSO Hub Catalog Integration

### Step 1: Register Jenkins in SSO Hub
```bash
# Add Jenkins to SSO Hub catalog
curl -X POST http://localhost:3006/api/tools \
  -H "Content-Type: application/json" \
  -H "X-Identity-User: admin@sso-hub.local" \
  -d '{
    "name": "Jenkins",
    "category": "CI/CD",
    "description": "Build automation and CI/CD pipelines",
    "url": "http://jenkins.company.com",
    "icon_url": "http://localhost:3000/assets/logos/Jenkins.svg",
    "status": "active",
    "launch_config": {
      "type": "seamless_sso",
      "auth_method": "oidc",
      "auto_login": true,
      "redirect_after_auth": "/",
      "session_duration": 8
    },
    "health_check": {
      "enabled": true,
      "endpoint": "http://jenkins.company.com/login",
      "method": "GET",
      "interval": 60,
      "timeout": 10
    },
    "webhook_config": {
      "enabled": true,
      "events": ["build_started", "build_completed", "build_failed"],
      "secret": "your-webhook-secret"
    }
  }'
```

### Step 2: Configure Seamless Launch
The seamless launch feature allows users to access Jenkins directly from the SSO Hub dashboard without additional authentication prompts.

```javascript
// Frontend integration - automatic redirect configuration
const jenkinsLaunchConfig = {
  tool_id: "jenkins",
  launch_method: "iframe_with_sso",
  pre_auth_endpoint: "/api/auth/jenkins/prepare",
  launch_url: "http://jenkins.company.com",
  session_validation: true,
  post_launch_callback: "/api/audit/tool-access"
};
```

## 🔔 Webhook Integration

### Step 1: Install Build Notification Plugin
```bash
# Install notification plugin for webhooks
java -jar jenkins-cli.jar -s http://jenkins.company.com/ install-plugin notification
```

### Step 2: Configure Global Webhook Notifications
```groovy
// In Jenkins: Manage Jenkins → Configure System → Job Notifications
Notification Endpoints:
  - URL: http://localhost:3007/webhooks/jenkins
  - Format: JSON
  - Protocol: HTTP
  - Event: All Events
  - Token: your-webhook-secret
  - Log Level: INFO
```

### Step 3: Per-Job Webhook Configuration
```groovy
// Jenkinsfile example with webhook notifications
pipeline {
    agent any
    
    stages {
        stage('Build') {
            steps {
                script {
                    // Your build steps here
                    sh 'echo "Building application..."'
                }
            }
        }
    }
    
    post {
        always {
            script {
                // Send webhook notification to SSO Hub
                httpRequest(
                    httpMode: 'POST',
                    url: 'http://localhost:3007/webhooks/jenkins',
                    requestBody: """
                    {
                        "job_name": "${env.JOB_NAME}",
                        "build_number": "${env.BUILD_NUMBER}",
                        "status": "${currentBuild.currentResult}",
                        "duration": "${currentBuild.duration}",
                        "user": "${env.BUILD_USER}",
                        "timestamp": "${new Date().format('yyyy-MM-dd HH:mm:ss')}",
                        "branch": "${env.GIT_BRANCH}",
                        "commit": "${env.GIT_COMMIT}"
                    }
                    """,
                    customHeaders: [
                        [name: 'X-Webhook-Token', value: 'your-webhook-secret'],
                        [name: 'Content-Type', value: 'application/json']
                    ]
                )
            }
        }
        success {
            echo 'Build completed successfully!'
        }
        failure {
            echo 'Build failed!'
        }
    }
}
```

## 🛡️ Security Configuration

### Pipeline Security with OIDC Tokens
```groovy
// Use OIDC tokens in Jenkins pipelines for secure API access
pipeline {
    agent any
    
    environment {
        // Get OIDC token for authenticated API calls
        OIDC_TOKEN = credentials('sso-hub-oidc-token')
    }
    
    stages {
        stage('Deploy with SSO') {
            steps {
                script {
                    // Use OIDC token for authenticated deployments
                    sh """
                        curl -H "Authorization: Bearer \$OIDC_TOKEN" \\
                             -X POST \\
                             http://localhost:3011/api/provisioning/deploy \\
                             -d '{"environment": "staging", "service": "app"}'
                    """
                }
            }
        }
    }
}
```

### Secure Credential Storage
```bash
# Store SSO Hub credentials securely in Jenkins
# Manage Jenkins → Manage Credentials → Global → Add Credentials

Credential Types:
1. Secret Text:
   - ID: sso-hub-oidc-token
   - Description: SSO Hub OIDC Token
   - Secret: [OIDC Token from SSO Hub]

2. Username with Password:
   - ID: sso-hub-api-user
   - Description: SSO Hub API Service Account
   - Username: jenkins-service-account
   - Password: [Service Account Password]

3. Secret File:
   - ID: sso-hub-webhook-secret
   - Description: SSO Hub Webhook Secret
   - File: [Upload webhook secret file]
```

## 📊 Monitoring & Analytics

### Health Check Integration
SSO Hub automatically monitors Jenkins health and availability:

```yaml
# Jenkins health check configuration in SSO Hub
jenkins_health_config:
  endpoint: "http://jenkins.company.com/api/json"
  method: GET
  interval: 60  # seconds
  timeout: 10   # seconds
  expected_status: 200
  authentication:
    type: bearer_token
    token: "${JENKINS_API_TOKEN}"
  
  # Health indicators
  checks:
    - name: "Jenkins Master Status"
      path: "$.mode"
      expected: "NORMAL"
    
    - name: "Queue Length"
      path: "$.queue.items.length"
      threshold: 100  # Alert if queue > 100
    
    - name: "Node Count"
      path: "$.computer.length"
      minimum: 1
```

### Usage Analytics
```javascript
// SSO Hub collects Jenkins usage metrics
jenkins_analytics = {
  tool_launches: "Count of Jenkins access from SSO Hub",
  build_notifications: "Webhook events received",
  user_activity: "Per-user Jenkins usage patterns",
  performance_metrics: "Jenkins response times and availability",
  security_events: "Authentication successes/failures"
};
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### OIDC Authentication Fails
```bash
# Check Jenkins logs
sudo tail -f /var/log/jenkins/jenkins.log | grep -i oidc

# Verify OIDC endpoints
curl -s http://localhost:8080/realms/sso-hub/.well-known/openid_configuration | jq

# Test token exchange
curl -X POST http://localhost:8080/realms/sso-hub/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&client_id=jenkins-client&client_secret=your-secret&code=AUTH_CODE&redirect_uri=http://jenkins.company.com/securityRealm/finishLogin"
```

#### Group Mapping Not Working
```bash
# Verify group mapping in Keycloak
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/admin/realms/sso-hub/users/{user-id}/groups

# Check Jenkins group configuration
# Manage Jenkins → Configure Global Security → Authorization → Matrix-based security
# Ensure group names match exactly (case-sensitive)
```

#### Webhook Not Receiving Events
```bash
# Test webhook connectivity from Jenkins
curl -X POST http://localhost:3007/webhooks/jenkins \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: your-webhook-secret" \
  -d '{"test": "webhook", "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'

# Check SSO Hub webhook logs
docker-compose logs -f webhook-ingress
```

#### Performance Issues
```bash
# Optimize Jenkins JVM settings for SSO
# /etc/default/jenkins or Jenkins startup script
JAVA_ARGS="$JAVA_ARGS -Djenkins.security.seed=true"
JAVA_ARGS="$JAVA_ARGS -Djava.awt.headless=true"
JAVA_ARGS="$JAVA_ARGS -Xms2g -Xmx4g"

# Configure OIDC plugin caching
# System properties in jenkins.model.Jenkins.instance.systemProperties
oic.cache.size=1000
oic.cache.duration=3600
```

### Debug Mode Configuration
```groovy
// Enable debug logging for OIDC plugin
import java.util.logging.Logger
import java.util.logging.Level

def logger = Logger.getLogger("org.jenkinsci.plugins.oic")
logger.setLevel(Level.FINE)

// Enable debug for SSO Hub webhook processing
logger = Logger.getLogger("org.jenkinsci.plugins.notification")
logger.setLevel(Level.FINE)
```

## 📈 Advanced Features

### Multi-Branch Pipeline Integration
```groovy
// Multibranch pipeline with SSO Hub integration
pipeline {
    agent any
    
    triggers {
        // Trigger builds via SSO Hub webhook
        genericTrigger(
            genericVariables: [
                [key: 'sso_user', value: '$.user'],
                [key: 'sso_request_id', value: '$.request_id']
            ],
            causeString: 'Triggered by SSO Hub user: $sso_user',
            token: 'sso-hub-trigger-token',
            regexpFilterText: '$sso_user',
            regexpFilterExpression: '^(admin|developer).*'
        )
    }
    
    stages {
        stage('Validate SSO Context') {
            steps {
                script {
                    // Validate SSO Hub context
                    if (env.sso_user && env.sso_request_id) {
                        echo "Build initiated by SSO Hub user: ${env.sso_user}"
                        echo "Request ID: ${env.sso_request_id}"
                    }
                }
            }
        }
    }
}
```

### Blue Ocean Integration
```bash
# Install Blue Ocean with SSO support
java -jar jenkins-cli.jar -s http://jenkins.company.com/ install-plugin blueocean

# Configure Blue Ocean to use SSO Hub authentication
# The OIDC configuration automatically applies to Blue Ocean UI
# Access via: http://jenkins.company.com/blue
```

## 🎯 Best Practices

### Security Best Practices
1. **Use HTTPS** for all Jenkins and SSO Hub communications
2. **Rotate secrets** regularly (OIDC client secret, webhook tokens)
3. **Implement proper RBAC** with least privilege principle
4. **Enable audit logging** for all authentication events
5. **Use service accounts** for pipeline integrations

### Performance Optimization
1. **Configure OIDC token caching** to reduce authentication overhead
2. **Implement webhook batching** for high-volume builds
3. **Use connection pooling** for database connections
4. **Monitor resource usage** and scale accordingly

### Monitoring & Alerting
1. **Set up health checks** for both Jenkins and SSO integration
2. **Monitor authentication metrics** (success/failure rates)
3. **Track webhook delivery** success rates
4. **Alert on integration failures** via SSO Hub notification service

---

**🎉 Success!** Jenkins is now fully integrated with SSO Hub, providing seamless authentication and comprehensive DevOps workflow integration.

**Next Steps:**
- [GitLab Integration](gitlab.md) - Repository management with SSO
- [Kubernetes Integration](kubernetes.md) - Container orchestration auth
- [Monitoring Setup](../configuration/monitoring.md) - Comprehensive observability