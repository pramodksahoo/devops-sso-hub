# Docker Compose Deployment Guide 🐳

Complete guide for deploying SSO Hub using Docker Compose - the recommended approach for development and production environments.

## 📋 Overview

SSO Hub uses Docker Compose to orchestrate 14 microservices plus infrastructure components:

- **Frontend**: React application (Port 3000)
- **Gateway**: NGINX with OIDC (Port 80/443)
- **Authentication**: Keycloak OIDC provider (Port 8080)
- **14 Microservices**: Core SSO Hub functionality
- **Infrastructure**: PostgreSQL, Redis

## 🔧 Configuration Files

### Environment Configuration
```bash
# Copy and customize environment variables
cp .env.example .env
```

Key environment variables:
```bash
# Database Configuration
POSTGRES_DB=sso_hub
POSTGRES_USER=sso_hub_user
POSTGRES_PASSWORD=secure_postgres_password

# Redis Configuration
REDIS_PASSWORD=secure_redis_password

# Authentication Secrets
SESSION_SECRET=your-super-secure-session-secret-at-least-32-chars
IDENTITY_HEADER_SECRET=your-hmac-secret-for-service-auth

# Keycloak Configuration
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin123
OIDC_CLIENT_ID=sso-hub-client
OIDC_CLIENT_SECRET=your-oidc-client-secret

# External URLs
FRONTEND_URL=http://localhost:3000
KEYCLOAK_URL=http://localhost:8080
```

### Docker Compose Structure
```yaml
# docker-compose.yml structure overview
services:
  # Infrastructure
  postgres:          # PostgreSQL 15
  redis:            # Redis 7
  
  # Authentication
  keycloak:         # OIDC Provider
  auth-bff:         # Auth Backend-for-Frontend
  
  # Gateway
  nginx:            # Reverse Proxy + OIDC
  
  # Frontend
  frontend:         # React Application
  
  # Core Microservices (14 services)
  catalog:          # Tool Registry
  tools-health:     # Monitoring
  user-service:     # User Management
  admin-config:     # Configuration
  webhook-ingress:  # Webhook Processing
  audit:            # Audit Logging
  analytics:        # Usage Analytics
  provisioning:     # Resource Provisioning
  ldap-sync:        # Directory Sync
  policy:           # Access Control
  notifier:         # Notifications
  auth-proxy:       # Seamless SSO Proxy
```

## 🚀 Deployment Commands

### Standard Deployment
```bash
# Start all services
docker-compose up -d

# View startup logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### Development Mode
```bash
# Build services with no cache
docker-compose build --no-cache

# Start with live logs
docker-compose up

# Start specific services only
docker-compose up postgres redis keycloak auth-bff frontend
```

### Production Deployment
```bash
# Pull latest images
docker-compose pull

# Start in production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Enable monitoring
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

## 🔍 Service Management

### Individual Service Control
```bash
# Restart specific service
docker-compose restart catalog

# View logs for specific service
docker-compose logs -f auth-bff

# Rebuild and restart service
docker-compose build --no-cache tools-health
docker-compose up -d tools-health

# Scale services (for load testing)
docker-compose up -d --scale catalog=2 --scale analytics=2
```

### Health Checks
```bash
# Check all services health
for service in auth-bff catalog tools-health user-service admin-config; do
  echo "Checking $service..."
  curl -f http://localhost:$(docker-compose port $service 3000 | cut -d: -f2)/healthz
done

# Detailed readiness checks
curl http://localhost:3002/readyz  # Auth-BFF with dependency checks
curl http://localhost:3006/readyz  # Catalog service
```

## 🔧 Maintenance & Operations

### Database Operations
```bash
# Database backup
docker-compose exec postgres pg_dump -U sso_hub_user sso_hub > backup.sql

# Database restore
docker-compose exec -T postgres psql -U sso_hub_user sso_hub < backup.sql

# Database migrations
docker-compose exec catalog npm run migrate

# Connect to database
docker-compose exec postgres psql -U sso_hub_user sso_hub
```

### Redis Operations
```bash
# Connect to Redis
docker-compose exec redis redis-cli -a $REDIS_PASSWORD

# View Redis stats
docker-compose exec redis redis-cli -a $REDIS_PASSWORD info

# Clear cache
docker-compose exec redis redis-cli -a $REDIS_PASSWORD flushall
```

### Log Management
```bash
# View logs from all services
docker-compose logs

# Follow logs from specific services
docker-compose logs -f auth-bff catalog tools-health

# Export logs to file
docker-compose logs --since 24h > sso-hub-logs.txt

# Rotate logs (clears existing logs)
docker-compose logs --tail=0 -f > /dev/null
```

## 📊 Monitoring & Debugging

### Container Resource Usage
```bash
# View resource usage
docker-compose exec frontend docker stats

# Container health status
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# System resource usage
docker system df
docker system info
```

### Network Debugging
```bash
# List networks
docker network ls

# Inspect SSO Hub network
docker network inspect $(basename $PWD)_default

# Test connectivity between services
docker-compose exec frontend ping postgres
docker-compose exec auth-bff ping keycloak
```

### Performance Monitoring
```bash
# Container metrics
docker-compose exec frontend top
docker-compose exec postgres top

# Database performance
docker-compose exec postgres psql -U sso_hub_user sso_hub -c "
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats 
WHERE schemaname = 'public';"
```

## 🔧 Customization

### Custom Environment Files
```bash
# Development environment
cp .env.example .env.development
docker-compose --env-file .env.development up -d

# Production environment
cp .env.example .env.production
docker-compose --env-file .env.production up -d

# Testing environment
cp .env.example .env.testing
docker-compose -f docker-compose.testing.yml --env-file .env.testing up -d
```

### Service Overrides
Create `docker-compose.override.yml` for local customizations:
```yaml
version: '3.8'
services:
  frontend:
    ports:
      - "3001:3000"  # Change port
    environment:
      - REACT_APP_DEBUG=true
    
  postgres:
    ports:
      - "5433:5432"  # Expose postgres port
    
  redis:
    ports:
      - "6380:6379"  # Expose redis port
```

### Volume Management
```bash
# List volumes
docker volume ls

# Backup volumes
docker run --rm -v sso-hub_postgres_data:/data -v $(pwd):/backup ubuntu tar czf /backup/postgres-backup.tar.gz -C /data .

# Restore volumes
docker run --rm -v sso-hub_postgres_data:/data -v $(pwd):/backup ubuntu tar xzf /backup/postgres-backup.tar.gz -C /data

# Clean unused volumes
docker volume prune
```

## 🚨 Troubleshooting

### Common Issues & Solutions

#### Services Won't Start
```bash
# Check for port conflicts
sudo netstat -tlnp | grep ':3000\|:8080\|:5432\|:6379'

# Free up system resources
docker system prune -a
docker volume prune

# Restart with clean slate
docker-compose down -v --remove-orphans
docker-compose up -d
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose logs postgres

# Wait for database initialization
docker-compose exec postgres pg_isready -U sso_hub_user

# Reset database
docker-compose down postgres
docker volume rm sso-hub_postgres_data
docker-compose up -d postgres
```

#### Authentication Problems
```bash
# Check Keycloak logs
docker-compose logs keycloak

# Reset Keycloak realm
docker-compose exec keycloak /opt/keycloak/bin/kc.sh export --file /tmp/realm-backup.json --realm sso-hub

# Recreate Keycloak configuration
docker-compose down keycloak
docker-compose up -d keycloak
```

#### Memory Issues
```bash
# Check memory usage
docker-compose exec frontend free -h
docker-compose exec postgres free -h

# Increase Docker memory limit (Docker Desktop)
# Settings > Resources > Memory > 8GB+

# Optimize for low memory
docker-compose -f docker-compose.yml -f docker-compose.low-memory.yml up -d
```

### Performance Optimization
```bash
# Optimize PostgreSQL
docker-compose exec postgres psql -U sso_hub_user sso_hub -c "
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
SELECT pg_reload_conf();"

# Optimize Redis
docker-compose exec redis redis-cli -a $REDIS_PASSWORD config set maxmemory 256mb
docker-compose exec redis redis-cli -a $REDIS_PASSWORD config set maxmemory-policy allkeys-lru
```

## 📝 Best Practices

### Security
- Change all default passwords in `.env`
- Use secure secrets (minimum 32 characters)
- Enable HTTPS in production with Let's Encrypt
- Regular backup of volumes
- Monitor resource usage

### Operations
- Use Docker Compose override files for environment-specific configs
- Implement proper log rotation
- Regular health check monitoring
- Database maintenance and optimization
- Monitor disk space usage

### Development
- Use volume mounts for code changes
- Enable debug mode for troubleshooting
- Use separate environments for testing
- Regular cleanup of unused containers/volumes

---

**Next Steps:**
- [Integrate your first DevOps tool](../integrations/)
- [Configure advanced security](../security/)
- [Set up monitoring and alerts](../configuration/monitoring.md)