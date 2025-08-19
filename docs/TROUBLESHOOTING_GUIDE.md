# SSO Hub Troubleshooting Guide

> **Last Updated**: August 19, 2025  
> **Platform Status**: ✅ Production Ready - All 13 microservices

## Overview

This guide provides comprehensive troubleshooting procedures for the SSO Hub production environment with 13 microservices and 11 DevOps tool integrations.

## 🏗️ Service Architecture

### Infrastructure Services
- **PostgreSQL**: Primary database (port 5432)
- **Redis**: Cache and sessions (port 6379)
- **Keycloak**: Identity provider (port 8080)
- **NGINX**: Reverse proxy (port 80/443)

### Application Services
| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 3000 | React application |
| Auth-BFF | 3002 | Authentication backend |
| User Service | 3003 | User management |
| Tools Health | 3004 | Health monitoring |
| Admin Config | 3005 | Tool configuration |
| Catalog | 3006 | Tool catalog |
| Webhook Ingress | 3007 | Event processing |
| Audit | 3009 | Audit logging |
| Analytics | 3010 | Usage analytics |
| Provisioning | 3011 | Resource provisioning |
| LDAP Sync | 3012 | Directory sync |
| Policy | 3013 | Access control |
| Notifier | 3014 | Notifications |

## 🔍 Diagnostic Commands

### System Health Overview
```bash
# Check all services status
docker-compose ps

# Comprehensive health check
for port in 3002 3003 3004 3005 3006 3007 3009 3010 3011 3012 3013 3014; do
  echo "Checking port $port..."
  curl -s "http://localhost:$port/healthz" || echo "Service $port not responding"
done

# Check infrastructure
docker-compose exec postgres pg_isready -U sso_user
docker-compose exec redis redis-cli ping
curl -s "http://localhost:8080/health"
```

### Log Analysis
```bash
# View all service logs
docker-compose logs -f --tail=100

# Service-specific logs
docker-compose logs -f auth-bff
docker-compose logs -f catalog
docker-compose logs -f keycloak

# Search for errors across all services
docker-compose logs | grep -i error | tail -20
```

## 🚨 Common Issues & Solutions

### 1. Service Startup Issues

#### Problem: Service won't start
```bash
# Check service status
docker-compose ps service-name

# View startup logs
docker-compose logs service-name

# Check resource usage
docker stats

# Restart specific service
docker-compose restart service-name
```

#### Problem: Database connection failures
```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready -U sso_user

# Test database connection
docker-compose exec postgres psql -U sso_user -d sso_hub -c "SELECT 1;"

# Check connection strings in .env
grep DATABASE_URL .env
```

**Solution:**
1. Verify PostgreSQL is running
2. Check database credentials
3. Ensure database exists
4. Restart dependent services

### 2. Authentication Issues

#### Problem: OIDC login failures
```bash
# Check Keycloak status
curl -s "http://localhost:8080/realms/sso-hub/.well-known/openid_configuration"

# View auth-bff logs
docker-compose logs auth-bff | grep -i oidc

# Check session storage
docker-compose exec redis redis-cli keys "sess:*"
```

**Solution:**
1. Verify Keycloak client configuration
2. Check redirect URIs
3. Validate client secrets
4. Clear Redis sessions if needed

#### Problem: Identity header validation fails
```bash
# Test identity headers
curl -H "X-User-Sub: test" -H "X-User-Signature: invalid" \
  http://localhost:3006/api/tools

# Check HMAC secret configuration
grep HMAC_SECRET .env
```

**Solution:**
1. Verify HMAC secret matches across services
2. Check header generation in auth-bff
3. Validate signature algorithm

### 3. Tool Integration Issues

#### Problem: Tool configuration not saving
```bash
# Check catalog service health
curl -s http://localhost:3006/healthz

# Test configuration API
curl -X PUT http://localhost:3005/api/tools/grafana/config \
  -H "Content-Type: application/json" \
  -d '{"integration_type":"oidc","config":{}}'

# Check database for auth_config
docker-compose exec postgres psql -U sso_user -d sso_hub \
  -c "SELECT name, auth_config FROM tools;"
```

**Solution:**
1. Verify auth-bff proxy routes
2. Check database auth_config parsing
3. Restart catalog service
4. Clear Redis cache

#### Problem: Keycloak auto-configuration fails
```bash
# Check admin-config service
curl -s http://localhost:3005/healthz

# Test auto-config endpoint
curl -X POST http://localhost:3005/api/admin/keycloak/auto-config/grafana

# Check Keycloak admin access
curl -s "http://localhost:8080/admin/realms/sso-hub/clients"
```

**Solution:**
1. Verify Keycloak admin credentials
2. Check auto-config service connectivity
3. Validate tool schema configuration

### 4. Frontend Issues

#### Problem: Frontend not loading
```bash
# Check frontend service
curl -s http://localhost:3000/health

# Check NGINX proxy
curl -s http://localhost/

# View frontend logs
docker-compose logs frontend
```

**Solution:**
1. Verify frontend build completed
2. Check NGINX configuration
3. Restart frontend container

#### Problem: API calls failing from frontend
```bash
# Test API connectivity
curl -s http://localhost:3002/auth/user

# Check CORS configuration
curl -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS http://localhost:3002/api/tools
```

**Solution:**
1. Verify CORS settings in auth-bff
2. Check auth-bff proxy routes
3. Validate session cookies

### 5. Health Monitoring Issues

#### Problem: Health checks failing
```bash
# Check tools-health service
curl -s http://localhost:3004/api/health/overview

# Test individual tool health
curl -s http://localhost:3004/api/health/tools

# Check health monitoring database
docker-compose exec postgres psql -U sso_user -d sso_hub \
  -c "SELECT * FROM health_checks ORDER BY checked_at DESC LIMIT 5;"
```

**Solution:**
1. Verify tool URLs are accessible
2. Check authentication credentials
3. Review monitoring intervals
4. Restart tools-health service

### 6. Webhook Processing Issues

#### Problem: Webhooks not being processed
```bash
# Check webhook-ingress service
curl -s http://localhost:3007/healthz

# View webhook events
curl -s http://localhost:3007/api/webhooks/events

# Test webhook endpoint
curl -X POST http://localhost:3007/webhooks/github \
  -H "Content-Type: application/json" \
  -d '{"test": "event"}'
```

**Solution:**
1. Verify webhook signatures
2. Check event processing logic
3. Review database webhook logs
4. Validate notification delivery

## 🔧 Performance Troubleshooting

### High CPU Usage
```bash
# Check container resource usage
docker stats

# Identify CPU-heavy processes
docker-compose exec service-name top

# Check service-specific metrics
curl -s http://localhost:3004/api/health/metrics
```

### Memory Issues
```bash
# Check memory usage
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Check for memory leaks
docker-compose exec postgres \
  psql -U sso_user -d sso_hub \
  -c "SELECT count(*) FROM pg_stat_activity;"
```

### Database Performance
```bash
# Check slow queries
docker-compose exec postgres \
  psql -U sso_user -d sso_hub \
  -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check connection pool
docker-compose exec postgres \
  psql -U sso_user -d sso_hub \
  -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

## 🔐 Security Troubleshooting

### Audit Trail Issues
```bash
# Check audit service
curl -s http://localhost:3009/healthz

# View recent audit events
curl -s http://localhost:3009/api/audit/events?limit=10

# Check audit database
docker-compose exec postgres psql -U sso_user -d sso_hub \
  -c "SELECT COUNT(*) FROM audit_events WHERE created_at > NOW() - INTERVAL '1 hour';"
```

### Policy Violations
```bash
# Check policy service
curl -s http://localhost:3013/healthz

# View policy violations
curl -s http://localhost:3013/api/policies/violations

# Test policy evaluation
curl -X POST http://localhost:3013/api/policies/evaluate \
  -H "Content-Type: application/json" \
  -d '{"user":"test","resource":"tool","action":"access"}'
```

## 🗄️ Database Troubleshooting

### Connection Issues
```bash
# Check connection limits
docker-compose exec postgres \
  psql -U sso_user -d sso_hub \
  -c "SHOW max_connections;"

# Check current connections
docker-compose exec postgres \
  psql -U sso_user -d sso_hub \
  -c "SELECT count(*) FROM pg_stat_activity;"
```

### Data Integrity
```bash
# Check database size
docker-compose exec postgres \
  psql -U sso_user -d sso_hub \
  -c "SELECT pg_size_pretty(pg_database_size('sso_hub'));"

# Verify foreign key constraints
docker-compose exec postgres \
  psql -U sso_user -d sso_hub \
  -c "SELECT conname FROM pg_constraint WHERE contype = 'f';"
```

## 🔄 Recovery Procedures

### Service Recovery
```bash
# Restart all services
docker-compose restart

# Restart specific service group
docker-compose restart auth-bff catalog user-service

# Full system restart
docker-compose down && docker-compose up -d
```

### Database Recovery
```bash
# Create backup
docker-compose exec postgres pg_dump -U sso_user sso_hub > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U sso_user sso_hub < backup.sql

# Rebuild indexes
docker-compose exec postgres psql -U sso_user -d sso_hub -c "REINDEX DATABASE sso_hub;"
```

### Cache Recovery
```bash
# Clear Redis cache
docker-compose exec redis redis-cli FLUSHALL

# Restart Redis
docker-compose restart redis

# Check cache status
docker-compose exec redis redis-cli INFO memory
```

## 📋 Emergency Procedures

### Complete System Failure
1. **Check infrastructure services first**
   ```bash
   docker-compose up -d postgres redis keycloak
   ```

2. **Wait for stabilization (2-3 minutes)**

3. **Start core services**
   ```bash
   docker-compose up -d auth-bff catalog user-service
   ```

4. **Start remaining services**
   ```bash
   docker-compose up -d
   ```

5. **Verify system health**
   ```bash
   ./scripts/health-check.sh
   ```

### Data Corruption
1. **Stop affected services immediately**
2. **Create emergency backup**
3. **Identify corruption scope**
4. **Restore from last known good backup**
5. **Verify data integrity**
6. **Restart services**

### Security Incident
1. **Isolate affected components**
2. **Preserve audit logs**
3. **Rotate all secrets**
4. **Force user re-authentication**
5. **Review access logs**
6. **Update security policies**

## 📞 Support Escalation

### Level 1: Self-Service
- Use this troubleshooting guide
- Check service health endpoints
- Review recent logs
- Restart individual services

### Level 2: System Administrator
- Database performance issues
- Infrastructure failures
- Security incidents
- Data recovery needs

### Level 3: Development Team
- Application logic bugs
- Integration failures
- Schema changes needed
- New feature issues

## 📚 Additional Resources

- [API Documentation](./API_DOCUMENTATION_INDEX.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Operations Runbook](./runbook.md)
- [Implementation Status](./CURRENT_IMPLEMENTATION_STATUS.md)

---

**Remember**: Always backup before making changes and test solutions in a non-production environment first.