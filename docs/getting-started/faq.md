# Frequently Asked Questions (FAQ) 🤔

Common questions and answers about SSO Hub - your zero-friction SSO solution for DevOps teams.

## 🚀 General Questions

### What is SSO Hub?
SSO Hub is an open-source Single Sign-On platform built specifically for DevOps teams. Unlike generic enterprise SSO solutions, it provides:
- **5-minute setup** with Docker Compose
- **Native integrations** for 11+ DevOps tools
- **Zero-click access** to your favorite tools
- **No SSO tax** - core features are completely free

### How is SSO Hub different from Keycloak?
While Keycloak is enterprise-first, SSO Hub is DevOps-native:

| Feature | SSO Hub | Keycloak |
|---------|---------|----------|
| **Setup Time** | 5 minutes with Docker Compose | Hours/days of configuration |
| **DevOps Focus** | Built for Jenkins, GitLab, K8s | Generic, requires custom setup |
| **Documentation** | DevOps-specific guides | Generic enterprise docs |
| **Default Config** | Pre-configured for DevOps tools | Blank slate |
| **Community** | DevOps practitioners | Enterprise architects |

### What DevOps tools are supported?
**Currently Supported (11 tools):**
- Jenkins (CI/CD)
- GitLab (Source Control) 
- Kubernetes (Container Platform)
- GitHub (Source Control)
- Grafana (Monitoring)
- ArgoCD (GitOps)
- Terraform (IaC)
- SonarQube (Code Quality)
- Prometheus (Metrics)
- Kibana (Logs)
- Snyk (Security)

**Coming Soon:** HashiCorp Vault, Datadog, PagerDuty, CircleCI

### Is SSO Hub production-ready?
**Yes!** SSO Hub is production-ready with:
- ✅ 14 microservices architecture
- ✅ Comprehensive audit logging
- ✅ Security best practices (OIDC, SAML)
- ✅ High availability support
- ✅ Performance optimization
- ✅ Docker and Kubernetes deployment

## 🔐 Authentication & Security

### Which authentication protocols does SSO Hub support?
**Supported Protocols:**
- **OIDC (OpenID Connect)** - Primary protocol, modern and developer-friendly
- **SAML 2.0** - For enterprise integrations and legacy tools
- **OAuth 2.0** - For API access and service accounts
- **JWT** - For service-to-service communication

### How secure is SSO Hub?
SSO Hub implements enterprise-grade security:
- **Input Validation** - Zod schema validation on all endpoints
- **SQL Injection Prevention** - Parameterized queries
- **XSS Protection** - Content Security Policy headers
- **Rate Limiting** - DDoS protection
- **Audit Logging** - Complete activity trails
- **Secrets Management** - Environment-based configuration
- **HTTPS Enforcement** - TLS 1.3 support
- **Regular Security Scans** - Automated vulnerability detection

### Can I use my existing LDAP/Active Directory?
**Yes!** SSO Hub includes an LDAP Sync Service that:
- Syncs users and groups from LDAP/AD
- Maps LDAP groups to SSO Hub roles
- Handles conflicts and duplicates
- Runs scheduled synchronization
- Supports multiple LDAP servers

```bash
# Configure LDAP sync
curl -X POST http://localhost:3012/api/ldap-config \
  -d '{
    "server": "ldap://company-ad.local:389",
    "bind_dn": "cn=sso-service,ou=Service Accounts,dc=company,dc=local",
    "user_base": "ou=Users,dc=company,dc=local",
    "group_base": "ou=Groups,dc=company,dc=local"
  }'
```

### How are passwords handled?
SSO Hub **never stores passwords**. Authentication is handled by:
1. **OIDC Provider (Keycloak)** - Industry-standard identity provider
2. **External Identity Providers** - LDAP, SAML, social logins
3. **Multi-Factor Authentication** - TOTP, WebAuthn support

## 🛠️ Installation & Setup

### What are the minimum system requirements?
**Development Environment:**
- 4 CPU cores, 8GB RAM minimum
- Docker and Docker Compose
- 20GB disk space

**Production Environment:**
- 8 CPU cores, 16GB RAM recommended
- Kubernetes cluster or Docker Swarm
- PostgreSQL 15+, Redis 7+
- Load balancer with SSL termination

### Can I run SSO Hub in Kubernetes?
**Absolutely!** SSO Hub provides:
- **Helm Charts** for easy deployment
- **Auto-scaling** configuration
- **High Availability** setup
- **Service Mesh** compatibility
- **Cloud Integration** (EKS, GKE, AKS)

```bash
# Install with Helm
helm repo add sso-hub https://charts.sso-hub.io
helm install sso-hub sso-hub/sso-hub -n sso-hub
```

### How do I migrate from another SSO solution?
SSO Hub provides migration tools for:

**From Keycloak:**
```bash
# Export Keycloak realm
docker exec keycloak /opt/keycloak/bin/kc.sh export --file /tmp/realm.json

# Import to SSO Hub
npm run migrate-from-keycloak -- --file=/tmp/realm.json
```

**From Okta/Auth0:**
- SAML metadata import
- User export/import tools
- Group mapping migration
- Application configuration transfer

### Can I use SSO Hub with cloud providers?
**Yes!** SSO Hub supports:

**AWS:**
- EKS integration with IAM roles
- ALB integration with OIDC
- RDS PostgreSQL managed database
- ElastiCache Redis

**Azure:**
- AKS integration with Azure AD
- Azure Database for PostgreSQL
- Azure Cache for Redis
- Application Gateway integration

**GCP:**
- GKE integration with Google IAM
- Cloud SQL PostgreSQL
- Cloud Memorystore Redis
- Cloud Load Balancing

## 🔧 Configuration & Integration

### How do I add a new DevOps tool?
Adding a new tool involves:

1. **Register in Catalog Service:**
```bash
curl -X POST http://localhost:3006/api/tools \
  -d '{
    "name": "Your Tool",
    "category": "CI/CD",
    "url": "https://your-tool.com",
    "auth_method": "oidc"
  }'
```

2. **Configure Authentication:**
   - OIDC: Set up client in Keycloak
   - SAML: Configure metadata exchange
   - API: Create service account

3. **Set up Health Monitoring:**
   - Health check endpoint
   - Performance metrics
   - Alert thresholds

4. **Enable Webhooks (optional):**
   - Event processing
   - Audit logging
   - Notifications

### How do I customize the frontend?
The React frontend is fully customizable:

```bash
cd apps/frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Customize components in src/components/
# Modify themes in src/styles/
# Add new pages in src/pages/
```

**Customization Options:**
- Company branding and logos
- Color schemes and themes
- Custom dashboard widgets
- Additional tool integrations
- Custom user workflows

### How do I set up high availability?
High availability setup involves:

**Database:**
- PostgreSQL primary/replica setup
- Automated failover with Patroni
- Connection pooling with PgBouncer

**Redis:**
- Redis Sentinel for HA
- Cluster mode for scaling
- Backup and restore automation

**Services:**
- Multiple replicas per service
- Load balancing with NGINX
- Health checks and auto-recovery
- Circuit breakers for dependencies

**Infrastructure:**
- Multi-zone deployment
- Auto-scaling policies
- Disaster recovery procedures

## 📊 Monitoring & Operations

### How do I monitor SSO Hub?
SSO Hub provides comprehensive monitoring:

**Health Endpoints:**
```bash
# Check service health
curl http://localhost:3002/healthz  # Auth-BFF
curl http://localhost:3006/healthz  # Catalog
curl http://localhost:3004/healthz  # Tools Health
```

**Metrics Collection:**
- Prometheus metrics endpoint
- Custom business metrics
- Performance monitoring
- Usage analytics

**Log Aggregation:**
- Structured JSON logging
- Centralized log collection
- Log retention policies
- Alert correlation

### How do I backup SSO Hub?
**Database Backup:**
```bash
# PostgreSQL backup
docker-compose exec postgres pg_dump -U sso_hub_user sso_hub > backup.sql

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec postgres pg_dump -U sso_hub_user sso_hub | gzip > "backup_${DATE}.sql.gz"
```

**Configuration Backup:**
- Export Keycloak realm settings
- Backup environment variables
- Export tool configurations
- Save custom certificates

**Volume Backup:**
```bash
# Backup Docker volumes
docker run --rm -v sso-hub_postgres_data:/data -v $(pwd):/backup \
  ubuntu tar czf /backup/postgres_backup.tar.gz -C /data .
```

### How do I troubleshoot performance issues?
**Performance Diagnostics:**

1. **Check Resource Usage:**
```bash
# Container resource usage
docker stats

# Database performance
docker-compose exec postgres pg_stat_activity
```

2. **Analyze Slow Queries:**
```sql
-- Top slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

3. **Monitor API Performance:**
```bash
# Response time metrics
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:3006/api/tools
```

4. **Check Network Connectivity:**
```bash
# Service-to-service connectivity
docker-compose exec frontend ping postgres
docker-compose exec auth-bff ping keycloak
```

## 🆘 Troubleshooting

### Authentication is not working
**Common Solutions:**

1. **Check OIDC Configuration:**
```bash
# Verify OIDC discovery endpoint
curl http://localhost:8080/realms/sso-hub/.well-known/openid_configuration

# Test token endpoint
curl -X POST http://localhost:8080/realms/sso-hub/protocol/openid-connect/token \
  -d "grant_type=client_credentials&client_id=your-client&client_secret=your-secret"
```

2. **Verify Service Connectivity:**
```bash
# Test auth-bff to keycloak
docker-compose exec auth-bff ping keycloak
docker-compose exec auth-bff curl -v http://keycloak:8080/realms/sso-hub
```

3. **Check Logs:**
```bash
docker-compose logs auth-bff | tail -50
docker-compose logs keycloak | grep ERROR
```

### Services won't start
**Troubleshooting Steps:**

1. **Check Port Conflicts:**
```bash
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :8080
```

2. **Verify Environment Variables:**
```bash
# Check .env file
cat .env | grep -E "(POSTGRES|REDIS|KEYCLOAK)"

# Test database connection
docker-compose exec postgres pg_isready -U sso_hub_user
```

3. **Check Container Resources:**
```bash
# Docker memory/CPU limits
docker system info
docker system df
```

### Tool integration is failing
**Debugging Steps:**

1. **Test Tool Connectivity:**
```bash
# From SSO Hub to tool
curl -v https://your-tool.com/api/health
curl -v https://your-tool.com/.well-known/openid_configuration
```

2. **Verify Authentication Configuration:**
```bash
# Check tool registration
curl http://localhost:3006/api/tools/your-tool

# Test OIDC client
curl http://localhost:8080/admin/realms/sso-hub/clients
```

3. **Check Webhook Delivery:**
```bash
# Test webhook endpoint
curl -X POST http://localhost:3007/webhooks/your-tool \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret" \
  -d '{"test": true}'
```

## 💡 Best Practices

### Security Best Practices
1. **Change default passwords** in production
2. **Use HTTPS** for all external communications
3. **Enable audit logging** for compliance
4. **Rotate secrets** regularly
5. **Implement network segmentation**
6. **Regular security updates**

### Performance Best Practices  
1. **Configure connection pooling** for databases
2. **Enable Redis caching** for session data
3. **Use CDN** for frontend assets
4. **Implement rate limiting** on APIs
5. **Monitor resource usage** continuously
6. **Optimize database queries**

### Operational Best Practices
1. **Implement proper backup procedures**
2. **Set up comprehensive monitoring**
3. **Document configuration changes**
4. **Test disaster recovery procedures**
5. **Maintain upgrade procedures**
6. **Train team on troubleshooting**

## 🆘 Getting Help

### Self-Service Resources
1. **Documentation**: Check `/docs/` directory
2. **Troubleshooting Guide**: `/docs/getting-started/TROUBLESHOOTING_GUIDE.md`
3. **GitHub Issues**: [Search existing issues](https://github.com/pramodksahoo/devops-sso-hub/issues)
4. **Integration Guides**: Tool-specific documentation

### Community Support
1. **GitHub Discussions**: [Q&A and design discussions](https://github.com/pramodksahoo/devops-sso-hub/discussions)
2. **Discord Server**: Real-time community help
3. **Stack Overflow**: Tag questions with `sso-hub`
4. **Reddit**: r/devops discussions

### Commercial Support
For enterprise customers requiring guaranteed response times:
- **Professional Support**: 24-hour response SLA
- **Enterprise Support**: 1-hour response SLA  
- **Dedicated Support**: Dedicated support engineer
- **Professional Services**: Migration and integration help

Contact: support@sso-hub.io

---

**Still have questions?** Join our [Discord community](https://discord.gg/sso-hub) or [open an issue](https://github.com/pramodksahoo/devops-sso-hub/issues) - we're here to help! 🚀