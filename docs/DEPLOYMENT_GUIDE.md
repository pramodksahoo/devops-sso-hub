# SSO Hub Deployment Guide

> **Last Updated**: August 19, 2025  
> **Platform Status**: ✅ Production Ready

## Overview

This guide provides comprehensive instructions for deploying SSO Hub in various environments, from local development to production. The platform consists of 13 microservices with supporting infrastructure.

## 🏗️ Architecture Summary

- **13 Microservices**: All production-ready
- **Database**: PostgreSQL 15+ with 50+ tables
- **Cache**: Redis 7+ for sessions and caching
- **Identity Provider**: Keycloak 26.3.2 with custom themes
- **Reverse Proxy**: NGINX for load balancing
- **Containerization**: Docker & Docker Compose

## 🚀 Quick Start (Development)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for frontend development)
- pnpm 8+ (package manager)
- 8GB+ RAM, 20GB+ disk space

### 1. Clone and Setup
```bash
git clone <repository-url>
cd agent-devops-sso

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 2. Start Core Services
```bash
# Start infrastructure services first
docker-compose up -d postgres keycloak-postgres redis

# Wait for databases to initialize (30-60 seconds)
docker-compose logs -f postgres keycloak-postgres

# Start Keycloak
docker-compose up -d keycloak

# Start all microservices
docker-compose up -d
```

### 3. Verify Deployment
```bash
# Check all services are healthy
docker-compose ps

# Access the platform
open http://localhost:3000

# Default credentials: admin / admin@123
```

## 🔧 Environment Configuration

### Required Environment Variables

Create `.env` file with the following variables:

```bash
# Database Configuration
POSTGRES_DB=sso_hub
POSTGRES_USER=sso_user
POSTGRES_PASSWORD=your_secure_password

# Keycloak Database
KC_DB_USERNAME=keycloak_user
KC_DB_PASSWORD=your_keycloak_password

# Keycloak Configuration
KC_HOSTNAME=localhost
KC_HOSTNAME_STRICT=false
KC_PROXY_HEADERS=forwarded
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin@123

# Redis Configuration  
REDIS_PASSWORD=your_redis_password

# Application Secrets
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_here
HMAC_SECRET=your_hmac_secret_for_service_auth

# Tool Configurations
GRAFANA_ADMIN_PASSWORD=grafana_admin_pass
GRAFANA_OIDC_CLIENT_ID=grafana-client
GRAFANA_OIDC_CLIENT_SECRET=grafana-client-secret

SONARQUBE_OIDC_CLIENT_ID=sonarqube-client
SONARQUBE_OIDC_CLIENT_SECRET=sonarqube-client-secret

# Notification Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASSWORD=your_smtp_password

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Production Environment Variables

For production, also configure:

```bash
# Production Database
POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_SSL=require

# Production Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_SSL=true

# Production Keycloak
KC_HOSTNAME=your-sso-domain.com
KC_HOSTNAME_STRICT=true
KC_PROXY_HEADERS=xforwarded

# SSL Configuration
SSL_CERT_PATH=/path/to/ssl/cert.pem
SSL_KEY_PATH=/path/to/ssl/key.pem

# External Tool Configurations
GITHUB_OAUTH_CLIENT_ID=your_github_client_id
GITHUB_OAUTH_CLIENT_SECRET=your_github_client_secret

GITLAB_OIDC_CLIENT_ID=your_gitlab_client_id
GITLAB_OIDC_CLIENT_SECRET=your_gitlab_client_secret

# Add other tool configurations as needed
```

## 🐳 Docker Deployment

### Development Deployment
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart specific service
docker-compose build --no-cache auth-bff
docker-compose restart auth-bff
```

### Production Deployment
```bash
# Production compose file
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# With external databases
docker-compose -f docker-compose.yml -f docker-compose.external.yml up -d
```

### Individual Service Management
```bash
# Restart single service
docker-compose restart catalog

# View service logs
docker-compose logs -f webhook-ingress

# Scale services (if needed)
docker-compose up -d --scale analytics=2
```

## 🗄️ Database Setup

### Automatic Migration
Migrations run automatically when PostgreSQL starts:

```bash
# Migrations are in: infra/db-migrations/
# Files: 00-schema-migrations.sql through 15-phase7.5-notifier-system.sql
```

### Manual Migration
```bash
# Connect to database
docker-compose exec postgres psql -U sso_user -d sso_hub

# Run specific migration
\i /docker-entrypoint-initdb.d/01-init-databases.sql
```

### Database Backup
```bash
# Create backup
docker-compose exec postgres pg_dump -U sso_user sso_hub > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U sso_user sso_hub < backup.sql
```

## 🔐 Keycloak Configuration

### Initial Setup
1. **Access Keycloak Admin**: `http://localhost:8080`
2. **Login**: admin / admin@123
3. **Realm**: sso-hub (auto-imported)
4. **Clients**: Pre-configured for all tools

### Custom Theme
The custom SSO Hub theme is automatically applied:
- **Location**: `infra/keycloak/themes/sso-hub-theme/`
- **Features**: Modern design, light theme, professional branding

### Client Management
```bash
# View configured clients
curl -s "http://localhost:8080/admin/realms/sso-hub/clients" \
  -H "Authorization: Bearer <admin-token>"
```

## 🏥 Health Monitoring

### Service Health Checks
All services provide health endpoints:

```bash
# Check all services
for port in 3002 3003 3004 3005 3006 3007 3009 3010 3011 3012 3013 3014; do
  echo "Checking port $port..."
  curl -s "http://localhost:$port/healthz" || echo "Failed"
done
```

### Comprehensive Health Check Script
```bash
#!/bin/bash
# health-check.sh

services=(
  "frontend:3000:/health"
  "auth-bff:3002:/healthz"
  "user-service:3003:/healthz"
  "tools-health:3004:/healthz"
  "admin-config:3005:/healthz"
  "catalog:3006:/healthz"
  "webhook-ingress:3007:/healthz"
  "audit:3009:/healthz"
  "analytics:3010:/healthz"
  "provisioning:3011:/healthz"
  "ldap-sync:3012:/healthz"
  "policy:3013:/healthz"
  "notifier:3014:/healthz"
)

for service in "${services[@]}"; do
  IFS=':' read -r name port path <<< "$service"
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port$path")
  if [ "$status" = "200" ]; then
    echo "✅ $name ($port) - Healthy"
  else
    echo "❌ $name ($port) - Unhealthy ($status)"
  fi
done
```

## 🔄 Service Dependencies

### Startup Order
1. **Infrastructure**: postgres, keycloak-postgres, redis
2. **Identity**: keycloak
3. **Core**: auth-bff, user-service, catalog
4. **Support**: tools-health, admin-config
5. **Processing**: webhook-ingress, audit, analytics
6. **Advanced**: provisioning, ldap-sync, policy, notifier
7. **Frontend**: frontend, nginx

### Dependency Verification
```bash
# Wait for database
until docker-compose exec postgres pg_isready -U sso_user; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

# Wait for Keycloak
until curl -s http://localhost:8080/health; do
  echo "Waiting for Keycloak..."
  sleep 5
done

# Wait for Redis
until docker-compose exec redis redis-cli ping; do
  echo "Waiting for Redis..."
  sleep 2
done
```

## 🚦 Load Balancing & Scaling

### NGINX Configuration
```nginx
# nginx/default.conf.template
upstream frontend {
    server frontend:3000;
}

upstream auth-bff {
    server auth-bff:3002;
}

upstream catalog {
    server catalog:3006;
}

server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/auth {
        proxy_pass http://auth-bff;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Horizontal Scaling
```bash
# Scale specific services
docker-compose up -d --scale catalog=3
docker-compose up -d --scale analytics=2
docker-compose up -d --scale webhook-ingress=2
```

## 🔒 Security Hardening

### Production Security Checklist
- [ ] Change all default passwords
- [ ] Use secure random secrets (32+ characters)
- [ ] Enable TLS/SSL for all communications
- [ ] Configure proper firewall rules
- [ ] Set up log aggregation and monitoring
- [ ] Enable audit logging
- [ ] Configure backup procedures
- [ ] Set up alerting for security events

### SSL/TLS Configuration
```yaml
# docker-compose.ssl.yml
version: '3.8'
services:
  nginx:
    ports:
      - "443:443"
    volumes:
      - ./ssl/cert.pem:/etc/nginx/ssl/cert.pem:ro
      - ./ssl/key.pem:/etc/nginx/ssl/key.pem:ro
      - ./nginx/ssl.conf:/etc/nginx/conf.d/default.conf:ro
```

## 📊 Monitoring & Logging

### Centralized Logging
```bash
# View aggregated logs
docker-compose logs -f --tail=100

# Service-specific logs
docker-compose logs -f catalog
docker-compose logs -f auth-bff

# Export logs
docker-compose logs --no-color > sso-hub-logs.txt
```

### Metrics Collection
- **Health Metrics**: Tools Health Service (port 3004)
- **Usage Analytics**: Analytics Service (port 3010)
- **Audit Trails**: Audit Service (port 3009)
- **Performance**: Individual service metrics

## 🧪 Testing Deployment

### Integration Testing
```bash
# Run with test environment
docker-compose -f docker-compose.yml -f docker-compose.testing.yml up -d

# Access test tools
open http://localhost:3100  # Grafana
open http://localhost:9001  # SonarQube
```

### Automated Testing
```bash
# Run the comprehensive test suite
node test-all-tools.js

# Test specific functionality
curl -X POST http://localhost:3005/api/tools/grafana/test-connection \
  -H "Content-Type: application/json" \
  -d '{"integration_type":"oidc","config":{"grafana_url":"http://localhost:3100"}}'
```

## 🔄 Backup & Recovery

### Database Backup
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec postgres pg_dump -U sso_user sso_hub > "backup_${DATE}.sql"
echo "Backup created: backup_${DATE}.sql"
```

### Full System Backup
```bash
# Backup volumes
docker run --rm -v sso_hub_postgres_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/postgres_backup.tar.gz -C /data .

docker run --rm -v sso_hub_redis_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/redis_backup.tar.gz -C /data .
```

### Recovery
```bash
# Restore database
docker-compose exec -T postgres psql -U sso_user sso_hub < backup.sql

# Restore volumes
docker run --rm -v sso_hub_postgres_data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/postgres_backup.tar.gz -C /data
```

## 🚨 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
docker-compose logs service-name

# Check dependencies
docker-compose ps

# Restart service
docker-compose restart service-name
```

#### Database Connection Issues
```bash
# Check PostgreSQL
docker-compose exec postgres pg_isready -U sso_user

# Check connections
docker-compose exec postgres psql -U sso_user -c "\l"
```

#### Keycloak Issues
```bash
# Check Keycloak logs
docker-compose logs keycloak

# Verify realm import
curl -s http://localhost:8080/realms/sso-hub/.well-known/openid_configuration
```

#### Memory Issues
```bash
# Check resource usage
docker stats

# Increase memory limits in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 2G
```

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug
docker-compose up -d

# Or modify docker-compose.yml
environment:
  - LOG_LEVEL=debug
  - NODE_ENV=development
```

## 📚 Additional Resources

- **API Documentation**: See `/docs/API_DOCUMENTATION_INDEX.md`
- **Service Details**: Individual service documentation in `/docs/`
- **Architecture**: `/docs/microservices-overview.md`
- **Implementation Status**: `/docs/CURRENT_IMPLEMENTATION_STATUS.md`
- **Runbook**: `/docs/runbook.md`

---

**For production deployment assistance, refer to the specific environment guides or contact the development team.**