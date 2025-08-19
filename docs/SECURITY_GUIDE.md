# SSO Hub Security Guide

> **Last Updated**: August 19, 2025  
> **Platform Status**: ✅ Production Ready - Enterprise Security Implementation

## Overview

This document provides comprehensive security guidelines for deploying, operating, and maintaining the SSO Hub platform in production environments. The platform implements enterprise-grade security controls across all layers.

## 🛡️ Security Architecture

### Defense in Depth Strategy
```
┌─────────────────────────────────────────────────────────────┐
│                    External Firewall                        │
├─────────────────────────────────────────────────────────────┤
│                      WAF / DDoS Protection                  │
├─────────────────────────────────────────────────────────────┤
│                    TLS Termination (NGINX)                  │
├─────────────────────────────────────────────────────────────┤
│                    Authentication (Keycloak)                 │
├─────────────────────────────────────────────────────────────┤
│                 Authorization (RBAC/ABAC)                   │
├─────────────────────────────────────────────────────────────┤
│               Application Security (Microservices)          │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer Security                      │
└─────────────────────────────────────────────────────────────┘
```

### Security Components

| Component | Purpose | Security Features |
|-----------|---------|-------------------|
| **NGINX** | Reverse Proxy | TLS termination, rate limiting, header security |
| **Keycloak** | Identity Provider | OIDC/SAML, MFA, session management |
| **Auth-BFF** | Session Management | Secure cookies, CSRF protection |
| **Microservices** | Business Logic | HMAC auth, input validation, rate limiting |
| **PostgreSQL** | Data Storage | Encryption at rest, access controls |
| **Redis** | Session Store | Encryption, key expiration |

## 🔐 Authentication & Authorization

### OIDC Implementation
```yaml
# Production OIDC Configuration
oidc_configuration:
  issuer: "https://auth.yourdomain.com/realms/sso-hub"
  client_id: "sso-hub-prod"
  client_secret: "${OIDC_CLIENT_SECRET}"
  scopes: ["openid", "profile", "email", "groups"]
  pkce: true
  response_type: "code"
  flow: "authorization_code"
```

### Role-Based Access Control (RBAC)
```yaml
# Standard Role Hierarchy
roles:
  super_admin:
    description: "Full system access"
    permissions: ["*"]
  
  admin:
    description: "Administrative access"
    permissions:
      - "tools:*"
      - "users:read,write"
      - "config:read,write"
      - "audit:read"
  
  tool_admin:
    description: "Tool-specific admin"
    permissions:
      - "tools:read,configure"
      - "users:read"
      - "health:read"
  
  user:
    description: "Standard user access"
    permissions:
      - "tools:read,launch"
      - "profile:read,write"
      - "health:read"
  
  readonly:
    description: "Read-only access"
    permissions:
      - "tools:read"
      - "health:read"
```

### Multi-Factor Authentication (MFA)
```bash
# Enable MFA for all admin users
# Via Keycloak Admin Console:
# 1. Realm Settings -> Authentication
# 2. Create MFA flow with OTP requirement
# 3. Bind to admin user roles
```

## 🔒 Data Protection

### Encryption Standards

#### Data at Rest
- **Database**: AES-256 encryption for PostgreSQL
- **Sessions**: Encrypted Redis storage
- **Secrets**: Encrypted environment variables
- **Logs**: Encrypted log aggregation

#### Data in Transit
- **TLS 1.3**: All external communications
- **mTLS**: Internal service communication (optional)
- **HMAC-SHA256**: Service-to-service authentication
- **Encrypted Headers**: Identity propagation

### Encryption Configuration
```yaml
# PostgreSQL Encryption
postgresql:
  ssl_mode: "require"
  ssl_cert: "/ssl/postgresql.crt"
  ssl_key: "/ssl/postgresql.key"
  ssl_ca: "/ssl/ca.crt"

# Redis Encryption
redis:
  tls: true
  tls_cert_file: "/ssl/redis.crt"
  tls_key_file: "/ssl/redis.key"
  tls_ca_cert_file: "/ssl/ca.crt"
```

### Secrets Management
```bash
# Production secrets should use external secret managers
# Examples:

# Kubernetes Secrets
kubectl create secret generic sso-hub-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=oidc-client-secret="..." \
  --from-literal=hmac-secret="..."

# HashiCorp Vault
vault kv put secret/sso-hub \
  database-url="postgresql://..." \
  oidc-client-secret="..." \
  hmac-secret="..."

# AWS Secrets Manager
aws secretsmanager create-secret \
  --name "sso-hub/production" \
  --secret-string file://secrets.json
```

## 🛡️ Application Security

### Input Validation
```typescript
// Zod schema validation example
const toolConfigSchema = z.object({
  integration_type: z.enum(['oidc', 'saml', 'oauth2']),
  config: z.object({
    client_id: z.string().min(1).max(100),
    client_secret: z.string().min(8),
    auth_url: z.string().url(),
    token_url: z.string().url()
  }),
  enabled: z.boolean()
});

// All API endpoints validate input
app.post('/api/tools/:toolId/config', {
  schema: {
    body: toolConfigSchema
  }
}, handler);
```

### SQL Injection Prevention
```typescript
// Parameterized queries only
const result = await db.query(
  'SELECT * FROM tools WHERE id = $1 AND user_id = $2',
  [toolId, userId]
);

// Never use string concatenation
// BAD: `SELECT * FROM tools WHERE id = '${toolId}'`
```

### XSS Protection
```typescript
// Content Security Policy
app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
});
```

### CSRF Protection
```typescript
// CSRF tokens for state-changing operations
app.register(fastifyCsrf, {
  sessionPlugin: '@fastify/session',
  getToken: (req) => req.body._csrf
});
```

## 🔍 Security Monitoring

### Audit Logging
```typescript
// Comprehensive audit trail
interface AuditEvent {
  id: string;
  timestamp: string;
  user_id: string;
  user_email: string;
  action: string;
  resource: string;
  resource_id?: string;
  source_ip: string;
  user_agent: string;
  session_id: string;
  outcome: 'success' | 'failure';
  details: Record<string, any>;
  risk_score: number;
}

// All actions are audited
await auditLogger.log({
  action: 'tool_config_update',
  resource: 'tool',
  resource_id: toolId,
  outcome: 'success',
  details: { changes: configDiff }
});
```

### Security Events
```yaml
# High-priority security events
monitored_events:
  - failed_login_attempts: "> 5 in 10 minutes"
  - privilege_escalation: "role changes"
  - suspicious_api_usage: "rate limiting triggered"
  - configuration_changes: "tool configs modified"
  - data_access_violations: "unauthorized data access"
  - session_anomalies: "unusual session patterns"
```

### Real-time Alerting
```bash
# Security alert configuration
# Slack integration for immediate notification
curl -X POST https://hooks.slack.com/services/... \
  -H 'Content-type: application/json' \
  -d '{
    "text": "🚨 SECURITY ALERT: Failed login attempts detected",
    "blocks": [{
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*User:* admin@company.com\n*IP:* 192.168.1.100\n*Attempts:* 10 in 5 minutes"
      }
    }]
  }'
```

## 🔐 Infrastructure Security

### Container Security
```dockerfile
# Security-hardened container configuration
FROM node:20-alpine

# Non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Security updates
RUN apk update && apk upgrade

# Read-only filesystem
USER nextjs
COPY --chown=nextjs:nodejs . .

# Health checks
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1
```

### Network Security
```yaml
# Docker Compose network isolation
networks:
  frontend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
  
  backend:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.21.0.0/24
  
  database:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.22.0.0/24
```

### Firewall Rules
```bash
# Production firewall configuration
# Allow only necessary ports

# External access
iptables -A INPUT -p tcp --dport 80 -j ACCEPT    # HTTP (redirect to HTTPS)
iptables -A INPUT -p tcp --dport 443 -j ACCEPT   # HTTPS
iptables -A INPUT -p tcp --dport 22 -j ACCEPT    # SSH (admin only)

# Internal services (block external access)
iptables -A INPUT -p tcp --dport 8080 -s 172.20.0.0/24 -j ACCEPT  # Keycloak
iptables -A INPUT -p tcp --dport 5432 -s 172.22.0.0/24 -j ACCEPT  # PostgreSQL
iptables -A INPUT -p tcp --dport 6379 -s 172.21.0.0/24 -j ACCEPT  # Redis

# Default deny
iptables -A INPUT -j DROP
```

## 🔑 Certificate Management

### TLS Certificate Deployment
```bash
# Production certificate installation
# Using Let's Encrypt with certbot

certbot certonly --webroot \
  -w /var/www/html \
  -d sso.yourdomain.com \
  -d auth.yourdomain.com

# Auto-renewal setup
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### Certificate Monitoring
```bash
# Monitor certificate expiration
#!/bin/bash
DOMAIN="sso.yourdomain.com"
EXPIRY=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | \
         openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
  echo "WARNING: Certificate expires in $DAYS_UNTIL_EXPIRY days"
  # Send alert
fi
```

## 🔍 Vulnerability Management

### Security Scanning
```bash
# Container vulnerability scanning
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image sso-hub/auth-bff:latest

# Dependency scanning
npm audit --audit-level=moderate
npm audit fix

# OWASP ZAP scanning
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://sso.yourdomain.com
```

### Regular Security Updates
```bash
# Automated security updates
#!/bin/bash
# Update base images
docker-compose pull

# Update dependencies
for service in services/*/; do
  cd "$service"
  npm update
  npm audit fix
  cd -
done

# Rebuild containers
docker-compose build --no-cache
```

## 📋 Compliance & Governance

### SOX Compliance
- **Audit Trails**: All administrative actions logged
- **Access Controls**: Segregation of duties implemented
- **Change Management**: All configuration changes tracked
- **Data Integrity**: Database constraints and validation

### GDPR Compliance
- **Data Minimization**: Only necessary data collected
- **Right to Erasure**: User data deletion capabilities
- **Data Portability**: User data export functionality
- **Privacy by Design**: Default privacy settings

### SOC 2 Type II
- **Security**: Multi-layered security controls
- **Availability**: High availability architecture
- **Processing Integrity**: Data validation and monitoring
- **Confidentiality**: Encryption and access controls

## 🚨 Incident Response

### Security Incident Playbook

#### 1. Detection & Analysis
```bash
# Immediate assessment
# Check for indicators of compromise
grep -i "failed\|error\|unauthorized" /var/log/sso-hub/*.log

# Check active sessions
curl -s http://localhost:3009/api/audit/events?event_type=login&limit=50

# Review recent configuration changes
curl -s http://localhost:3009/api/audit/events?action=config_update&limit=20
```

#### 2. Containment
```bash
# Block suspicious IP addresses
iptables -A INPUT -s [SUSPICIOUS_IP] -j DROP

# Disable compromised accounts
# Via Keycloak admin or emergency script

# Isolate affected services
docker-compose stop [affected-service]
```

#### 3. Eradication
```bash
# Rotate all secrets
./scripts/rotate-secrets.sh

# Force user re-authentication
curl -X POST http://localhost:3002/auth/invalidate-all-sessions

# Update security rules
# Apply patches and security updates
```

#### 4. Recovery
```bash
# Restore from clean backup if needed
./scripts/restore-backup.sh

# Restart services with new secrets
docker-compose up -d

# Verify system integrity
./scripts/security-verification.sh
```

#### 5. Lessons Learned
- Document incident timeline
- Identify root cause
- Update security controls
- Improve monitoring and detection

## 🔧 Security Configuration Checklist

### Pre-Production Security Review
- [ ] All default passwords changed
- [ ] TLS certificates installed and valid
- [ ] Firewall rules configured
- [ ] Security headers enabled
- [ ] Audit logging functional
- [ ] MFA enabled for admin accounts
- [ ] Vulnerability scanning completed
- [ ] Backup and recovery tested
- [ ] Incident response plan documented
- [ ] Security monitoring configured

### Ongoing Security Maintenance
- [ ] Weekly security log review
- [ ] Monthly vulnerability scanning
- [ ] Quarterly penetration testing
- [ ] Semi-annual access review
- [ ] Annual security assessment

## 📞 Security Contacts

### Internal Security Team
- **Security Officer**: [Contact Information]
- **Incident Response**: [24/7 Contact]
- **Compliance Officer**: [Contact Information]

### External Resources
- **Security Consultants**: [Contact Information]
- **Penetration Testing**: [Contact Information]
- **Compliance Auditors**: [Contact Information]

## 📚 Additional Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Controls](https://www.cisecurity.org/controls/)
- [ISO 27001](https://www.iso.org/isoiec-27001-information-security.html)

---

**Remember**: Security is an ongoing process, not a one-time configuration. Regular review and updates are essential for maintaining a secure posture.