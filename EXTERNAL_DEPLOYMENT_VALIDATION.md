# SSO Hub External Deployment Validation

## Overview

This document provides validation steps and checklist for the SSO Hub external deployment fix that resolves tools configuration functionality on AWS EC2 and other external hosts.

## Issues Fixed

### 1. ✅ Admin-Config Service Missing from NGINX
- **Problem**: Admin-Config service (port 3005) was not routed through nginx
- **Solution**: Added admin-config upstream and routing in nginx configuration
- **Files Modified**: `infra/nginx/default.conf.template`

### 2. ✅ Frontend Environment Configuration Issues  
- **Problem**: Hardcoded localhost URLs in frontend fallbacks
- **Solution**: Added runtime URL resolver for external deployment compatibility
- **Files Modified**: 
  - `apps/frontend/src/config/environment.ts`
  - `apps/frontend/src/pages/AdminToolManagement.tsx`
  - `apps/frontend/src/components/DynamicToolConfiguration.tsx`

### 3. ✅ Incomplete Service Integration
- **Problem**: Multiple services missing from nginx routing
- **Solution**: Added all missing services to nginx with proper authentication
- **Services Added**: webhook-ingress, audit, analytics, provisioning, ldap-sync, policy, notifier, auth-proxy

### 4. ✅ CORS Configuration Scope
- **Problem**: Services only accepted localhost origins
- **Solution**: Updated CORS to support both localhost and external host
- **Configuration**: `CORS_ORIGIN=http://localhost:3000,http://external-host`

### 5. ✅ External Access Configuration Script
- **Problem**: configure-external-access.sh missing some services
- **Solution**: Added comprehensive service URL updates and frontend rebuild
- **Files Modified**: `configure-external-access.sh`

## Validation Checklist

### Phase 1: Pre-Deployment Validation
- [ ] All service upstreams added to nginx configuration
- [ ] All service API routes configured in nginx
- [ ] Frontend runtime URL resolver implemented
- [ ] CORS configuration supports external hosts
- [ ] configure-external-access.sh includes all services
- [ ] Test script created and executable

### Phase 2: Deployment Validation
Run these commands on your deployment server:

```bash
# 1. Update external access configuration
./configure-external-access.sh

# 2. Run comprehensive tests
./test-external-deployment.sh

# 3. Manual validation
curl -I http://YOUR_EXTERNAL_HOST:3005/api/tools
curl -I http://YOUR_EXTERNAL_HOST:3000/admin-tools
```

### Phase 3: Tools Configuration Validation

#### On External Host (e.g., http://3.66.111.219):
1. **Access Admin Tools Page**
   ```
   http://3.66.111.219:3000/admin-tools
   ```
   - [ ] Page loads without errors
   - [ ] Tools list displays correctly
   - [ ] No console errors in browser DevTools

2. **Test Tools Configuration**
   - [ ] Click "Configure" on any tool
   - [ ] Configuration form loads
   - [ ] All fields display correctly
   - [ ] No CORS errors in browser console

3. **Test Auto-Populate Functionality**
   - [ ] Click "Auto-populate from Keycloak" button
   - [ ] Authorization URL, Token URL, User Info URL populate
   - [ ] No network errors in browser DevTools

4. **Test Configuration Save**
   - [ ] Fill in required fields
   - [ ] Click "Save Configuration"  
   - [ ] Success message appears
   - [ ] Configuration persists after page refresh

### Phase 4: Authentication Flow Validation
- [ ] OIDC login works on external host
- [ ] Session management works across services
- [ ] Admin API key authentication works
- [ ] Identity headers injected properly

## Service Endpoints

All these endpoints should be accessible from external host:

| Service | Port | Health Check | API Endpoint |
|---------|------|--------------|-------------|
| Frontend | 3000 | `/` | N/A |
| Auth-BFF | 3002 | `/healthz` | `/auth/*` |
| User Service | 3003 | `/healthz` | `/api/users/*` |
| Tools Health | 3004 | `/healthz` | `/api/tools/*` |
| **Admin-Config** | **3005** | `/healthz` | `/api/tools/*` |
| Catalog | 3006 | `/healthz` | `/api/catalog/*` |
| Webhook Ingress | 3007 | `/healthz` | `/api/webhooks/*` |
| Audit | 3009 | `/healthz` | `/api/audit/*` |
| Analytics | 3010 | `/healthz` | `/api/analytics/*` |
| Provisioning | 3011 | `/healthz` | `/api/provisioning/*` |
| LDAP Sync | 3012 | `/healthz` | `/api/ldap/*` |
| Policy | 3013 | `/healthz` | `/api/policy/*` |
| Notifier | 3014 | `/healthz` | `/api/notifications/*` |
| Auth Proxy | 3015 | `/healthz` | `/api/auth-proxy/*` |
| Keycloak | 8080 | `/realms/master` | `/realms/sso-hub/*` |

## Expected Behavior

### ✅ Working Correctly
- Tools setting page loads on external host
- Auto-populate button works correctly
- Configuration save operations succeed
- All tools can be configured and tested
- OIDC authentication works
- Session management works across services

### ❌ Previously Broken (Now Fixed)
- Tools setting page failed to load
- Auto-populate returned CORS errors
- Configuration save failed with network errors
- Admin-config service unreachable from frontend

## Troubleshooting

### Common Issues
1. **CORS Errors**
   - Check `CORS_ORIGIN` in `.env` includes external host
   - Restart services after configuration changes

2. **Service Unreachable**
   - Verify service is running: `docker-compose ps <service>`
   - Check service logs: `docker-compose logs <service>`
   - Test direct access: `curl http://localhost:<port>/healthz`

3. **Authentication Failures**
   - Verify API key matches between frontend and admin-config
   - Check Keycloak configuration for external host
   - Validate OIDC redirect URIs

### Debug Commands
```bash
# Check service status
docker-compose ps

# Check service logs
docker-compose logs admin-config
docker-compose logs frontend
docker-compose logs nginx

# Test service endpoints
curl -H "X-Api-Key: admin-api-key-change-in-production" http://localhost:3005/api/tools
curl -I http://localhost:3000/admin-tools

# Check nginx configuration
docker-compose exec nginx nginx -T
```

## Success Criteria ✅

The deployment is successful when:
- [ ] All services pass health checks on external host
- [ ] Tools configuration page loads without errors
- [ ] Auto-populate functionality works correctly
- [ ] Configuration save operations succeed
- [ ] No CORS errors in browser console
- [ ] Authentication flows work correctly
- [ ] Localhost deployment still works (no regressions)

## Files Modified

1. **NGINX Configuration**
   - `infra/nginx/default.conf.template` - Added all missing service upstreams and routes

2. **Frontend Configuration**
   - `apps/frontend/src/config/environment.ts` - Added runtime URL resolver
   - `apps/frontend/src/pages/AdminToolManagement.tsx` - Updated to use runtime URL resolver
   - `apps/frontend/src/components/DynamicToolConfiguration.tsx` - Updated to use runtime URL resolver

3. **Deployment Scripts**
   - `configure-external-access.sh` - Enhanced for comprehensive service setup
   
4. **Testing**
   - `test-external-deployment.sh` - New comprehensive test script
   - `EXTERNAL_DEPLOYMENT_VALIDATION.md` - This validation guide

## Next Steps

1. **Deploy the fixes** using `configure-external-access.sh`
2. **Run validation tests** using `test-external-deployment.sh`
3. **Test tools configuration** manually on the external host
4. **Verify no regressions** on localhost development setup

The SSO Hub tools configuration functionality should now work seamlessly on both localhost and external deployments including AWS EC2.