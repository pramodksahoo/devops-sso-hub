# Configuration & Operations 🔧

> **Production deployment, configuration, and operational guides**

This section covers everything you need to deploy, configure, and operate SSO Hub in production environments.

## 📋 **Configuration Guides**

### 🚀 **Deployment & Infrastructure**
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Comprehensive production deployment strategies
- **[Performance Optimization](PERFORMANCE_OPTIMIZATION_GUIDE.md)** - Tuning SSO Hub for scale and performance
- **[Operations Runbook](runbook.md)** - Day-to-day operations, maintenance, and troubleshooting

## ⚙️ **Configuration Topics**

### Infrastructure Configuration
- **Docker Compose** setup for development and testing
- **Kubernetes** deployment with Helm charts
- **Database** configuration (PostgreSQL, Redis)
- **Load Balancing** and high availability setup
- **SSL/TLS** certificate management
- **Monitoring** and observability stack

### Authentication Configuration
- **Keycloak** realm and client configuration
- **OIDC/SAML** provider setup
- **LDAP/Active Directory** integration
- **Multi-factor authentication** setup
- **Session management** and security policies

### DevOps Tool Integration
- **Tool registration** and configuration
- **Webhook** setup and processing
- **Health monitoring** configuration
- **Role and permission** mapping
- **API key** and service account management

### Security & Compliance
- **Security hardening** best practices
- **Audit logging** configuration
- **Compliance** reporting setup
- **Secrets management** with Vault integration
- **Network security** and firewall rules

## 📊 **Environment Configuration Examples**

### Development Environment
```yaml
# docker-compose.override.yml
version: '3.8'
services:
  postgres:
    ports:
      - "5432:5432"
  redis:
    ports:
      - "6379:6379"
  frontend:
    environment:
      - REACT_APP_DEBUG=true
      - REACT_APP_LOG_LEVEL=debug
```

### Staging Environment
```yaml
# values-staging.yaml (Helm)
global:
  environment: staging
  
frontend:
  replicas: 2
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"

postgresql:
  primary:
    persistence:
      size: 50Gi
```

### Production Environment
```yaml
# values-production.yaml (Helm)
global:
  environment: production
  
frontend:
  replicas: 3
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10

postgresql:
  architecture: replication
  primary:
    persistence:
      size: 200Gi
      storageClass: "fast-ssd"
```

## 🔧 **Configuration Management**

### Environment Variables
```bash
# Core Configuration
NODE_ENV=production
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://user:pass@postgres:5432/sso_hub
REDIS_URL=redis://redis:6379

# Authentication
OIDC_ISSUER_URL=https://keycloak.company.com/realms/sso-hub
SESSION_SECRET=your-super-secure-session-secret

# Integration Settings
WEBHOOK_SECRET=your-webhook-secret
ANALYTICS_ENABLED=true
AUDIT_RETENTION_DAYS=365
```

### Configuration Files
```bash
# Configuration structure
config/
├── environments/
│   ├── development.yaml
│   ├── staging.yaml
│   └── production.yaml
├── tools/
│   ├── jenkins.yaml
│   ├── gitlab.yaml
│   └── kubernetes.yaml
└── security/
    ├── rbac.yaml
    └── policies.yaml
```

## 📈 **Monitoring Configuration**

### Prometheus Metrics
```yaml
# prometheus.yml
global:
  scrape_interval: 30s

scrape_configs:
  - job_name: 'sso-hub'
    static_configs:
      - targets: 
        - 'auth-bff:3002'
        - 'catalog:3006' 
        - 'tools-health:3004'
    metrics_path: '/metrics'
```

### Grafana Dashboards
- **System Metrics**: CPU, memory, disk usage
- **Application Metrics**: Authentication rates, tool launches
- **Business Metrics**: User activity, tool usage patterns
- **Security Metrics**: Failed authentications, suspicious activity

### Log Management
```yaml
# logging configuration
logging:
  level: info
  format: json
  outputs:
    - console
    - file: /var/log/sso-hub/app.log
  structured: true
  correlation_id: true
```

## 🛡️ **Security Configuration**

### SSL/TLS Setup
```nginx
# nginx configuration
server {
    listen 443 ssl http2;
    server_name sso-hub.company.com;
    
    ssl_certificate /etc/ssl/certs/sso-hub.crt;
    ssl_certificate_key /etc/ssl/private/sso-hub.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}
```

### Network Security
```yaml
# kubernetes network policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: sso-hub-network-policy
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: sso-hub
```

## 🔄 **Backup & Recovery**

### Database Backup
```bash
#!/bin/bash
# backup-database.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h postgres -U sso_hub_user sso_hub | gzip > "backup_${DATE}.sql.gz"
```

### Configuration Backup
```bash
#!/bin/bash
# backup-config.sh
kubectl get configmaps -o yaml > configmaps-backup.yaml
kubectl get secrets -o yaml > secrets-backup.yaml
```

## 📚 **Additional Resources**

- **[Kubernetes Deployment Guide](../getting-started/kubernetes.md)** - K8s-specific deployment
- **[Docker Compose Guide](../getting-started/docker-compose.md)** - Container deployment
- **[Security Guide](../security/SECURITY_GUIDE.md)** - Security best practices
- **[Troubleshooting](../getting-started/TROUBLESHOOTING_GUIDE.md)** - Common operational issues

---

**Need help with configuration?** Check our [troubleshooting guide](../getting-started/TROUBLESHOOTING_GUIDE.md) or [join our Discord](https://discord.gg/sso-hub)!