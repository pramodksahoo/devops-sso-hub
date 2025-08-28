# SSO Hub Scripts Overview

This document explains all the scripts available in SSO Hub and their purposes.

## 🚀 **Main Scripts (Root Directory)**

### **Essential Scripts**

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `./setup.sh` | **Main setup script** - Deploys entire SSO Hub | First-time installation |
| `./configure-external-access.sh` | **External access configuration** - All deployment types | When you need external access (IP/domain/SSL) |
| `./validate-deployment.sh` | **Deployment validation** - Tests all services | After setup or when troubleshooting |

### **SSL/Certificate Scripts**

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `./ssl-setup.sh` | **Let's Encrypt SSL certificates** - Production-ready SSL for domains only | HTTPS with valid certificates (domains only) |

### **Utility Scripts**

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `./cleanup.sh` | **Complete environment reset** - Removes all data | When you want to start fresh |

## 🏗️ **Infrastructure Scripts**

### **Keycloak Scripts (`infra/keycloak/`)**

| Script | Purpose | Usage |
|--------|---------|-------|
| `entrypoint.sh` | **Keycloak enhanced startup** - Container initialization | Used by Docker (automatic) |
| `configure-keycloak.sh` | **Complete Keycloak configuration** - SSL disabling, realm setup, external access | Called by entrypoint (automatic) |

### **NGINX Scripts (`infra/nginx/`)**

| Script | Purpose | Usage |
|--------|---------|-------|
| `entrypoint.sh` | **NGINX startup with OIDC** - Configures reverse proxy | Used by Docker (automatic) |

## 🎯 **Usage Guide**

### **Quick Start (New Installation)**
```bash
# 1. Full setup with external access
./setup.sh

# 2. Configure for your deployment type
./configure-external-access.sh

# 3. Validate everything works
./validate-deployment.sh
```

### **External Access Configuration**
```bash
# Run the configuration wizard
./configure-external-access.sh

# Options available:
# 1) HTTP Only (development/testing)
# 2) HTTPS with Self-Signed Certificate
# 3) HTTPS with Let's Encrypt Certificate  
# 4) Custom Configuration
```

### **SSL Certificate Management**
```bash
# For Let's Encrypt certificates (domain names)
./ssl-setup.sh

# Certificate renewal (automatic)
./renew-ssl-certs.sh  # Created by ssl-setup.sh
```

### **Troubleshooting**
```bash
# Validate deployment
./validate-deployment.sh

# Complete reset
./cleanup.sh

# Check logs
docker-compose logs -f
```

## ✅ **Script Validation Status**

All scripts have been validated for syntax errors:

- ✅ `setup.sh` - Syntax OK
- ✅ `configure-external-access.sh` - Syntax OK  
- ✅ `validate-deployment.sh` - Syntax OK
- ✅ `ssl-setup.sh` - Syntax OK
- ✅ `cleanup.sh` - Syntax OK
- ✅ All `infra/keycloak/*.sh` scripts - Syntax OK
- ✅ All `infra/nginx/*.sh` scripts - Syntax OK

## 📋 **Dependencies**

### **Required for All Scripts**
- Docker & Docker Compose
- Bash shell
- curl (for IP detection)

### **SSL Certificate Scripts**
- OpenSSL (for self-signed certificates)
- certbot (for Let's Encrypt - auto-installed)
- dig (for DNS validation - optional)

### **Operating System Support**
- ✅ Linux (Ubuntu, CentOS, RHEL, Fedora)
- ✅ macOS (with Homebrew)
- ⚠️ Windows (via WSL or Git Bash)

## 🔒 **Security Notes**

- All scripts follow security best practices
- No hardcoded credentials or secrets
- Proper file permissions (600 for private keys, 644 for certificates)
- Environment variable validation
- Backup creation before making changes

## 📚 **Additional Documentation**

- **AWS EC2 Deployment**: `AWS_EC2_DEPLOYMENT.md`
- **External Access Guide**: `EXTERNAL_ACCESS.md`
- **Troubleshooting**: `docs/troubleshooting/`
- **API Documentation**: Available after deployment at `/docs`

## 🎉 **Summary**

**You only need these core scripts:**
1. `./setup.sh` - Initial deployment
2. `./configure-external-access.sh` - External access configuration
3. `./validate-deployment.sh` - Validation and troubleshooting

All other scripts are utilities called automatically or used for specific scenarios (SSL, cleanup, etc.).

The system is designed to be **simple** and **flexible** - choose HTTP for testing, HTTPS with self-signed for private networks, or HTTPS with Let's Encrypt for production!