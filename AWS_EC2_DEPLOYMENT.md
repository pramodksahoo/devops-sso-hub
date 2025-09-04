# AWS EC2 Deployment Guide for SSO Hub

This guide explains how to deploy SSO Hub on AWS EC2 with external access.

## ✅ Prerequisites

### EC2 Instance Requirements
- **Instance Type**: t3.medium or larger (minimum 4GB RAM, 2 vCPUs)
- **Storage**: 20GB+ EBS volume
- **OS**: Ubuntu 20.04/22.04 LTS or Amazon Linux 2
- **Docker**: Installed (or will be installed by setup script)

### AWS Security Group Configuration
Configure your EC2 security group to allow these inbound ports:

```bash
# HTTP Web Access
Port 80   - Source: 0.0.0.0/0 (or your IP range)

# HTTPS Web Access (if using SSL)  
Port 443  - Source: 0.0.0.0/0 (or your IP range)

# Frontend Application
Port 3000 - Source: 0.0.0.0/0 (or your IP range)

# Keycloak Admin Console
Port 8080 - Source: 0.0.0.0/0 (or your IP range)

# Auth BFF API (optional for external access)
Port 3002 - Source: 0.0.0.0/0 (or your IP range)

# Service Health Monitoring (optional)
Port 3004 - Source: 0.0.0.0/0 (or your IP range)

# API Documentation (optional)
Port 3006 - Source: 0.0.0.0/0 (or your IP range)

# SSH Access
Port 22   - Source: Your IP address only
```

## 🚀 Quick Deployment

### Step 1: Connect to Your EC2 Instance
```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
# or for Amazon Linux:
ssh -i your-key.pem ec2-user@your-ec2-public-ip
```

### Step 2: Clone and Deploy SSO Hub
```bash
# Install git if not available
sudo apt update && sudo apt install -y git  # Ubuntu
# OR
sudo yum update && sudo yum install -y git  # Amazon Linux

# Clone the repository
git clone https://github.com/pramodksahoo/devops-sso-hub.git
cd devops-sso-hub

# Run the automated setup
./setup.sh
```

### Step 3: Configure External Access
When prompted by the setup script, or run separately:

```bash
./configure-external-access.sh

# Select option 2: "Local network (IP address)"
# Enter your EC2 public IP address (e.g., 3.66.111.219)
# Leave port empty for default ports
```

**Or manually edit .env before running setup.sh:**
```bash
# Edit .env file
EXTERNAL_HOST=3.66.111.219        # Your EC2 public IP
EXTERNAL_PROTOCOL=http
EXTERNAL_PORT=                    # Empty for default ports
```

## 🔧 AWS-Specific Configuration

### Public IP vs Elastic IP
- **Public IP**: Changes when instance restarts - need to reconfigure
- **Elastic IP**: Static IP - recommended for production

To use Elastic IP:
1. Allocate an Elastic IP in AWS Console
2. Associate it with your EC2 instance
3. Use the Elastic IP as your EXTERNAL_HOST

### Load Balancer Setup (Optional)
For production with SSL/HTTPS:

1. Create an Application Load Balancer
2. Configure target groups for ports 3000 (frontend) and 8080 (Keycloak)
3. Add SSL certificate
4. Update .env:
```bash
EXTERNAL_HOST=your-domain.com
EXTERNAL_PROTOCOL=https
EXTERNAL_PORT=
```

## 🛠️ Troubleshooting AWS-Specific Issues

### Issue: Services Won't Start
```bash
# Check available memory
free -h

# If low memory, create swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Issue: Cannot Access from Internet
1. **Check Security Group**: Ensure inbound rules allow your ports
2. **Check Instance State**: Ensure instance is running
3. **Check Public IP**: Use correct public IP, not private IP
4. **Test Connectivity**:
```bash
# From your local machine:
telnet your-ec2-public-ip 3000
telnet your-ec2-public-ip 8080
```

### Issue: "HTTPS Required" Error from Keycloak
This should be fixed with the latest configuration, but if it still occurs:

```bash
# Restart services with new Keycloak config
docker-compose down
docker-compose build --no-cache keycloak
docker-compose up -d
```

### Issue: Services Show as Unhealthy
```bash
# Check container status
docker-compose ps

# Check specific container logs
docker-compose logs keycloak
docker-compose logs auth-bff
docker-compose logs frontend

# Restart specific service
docker-compose restart keycloak
```

## 📊 Monitoring and Maintenance

### Health Check Script
```bash
# Run validation
./validate-deployment.sh

# Check all services
docker-compose ps
```

### Log Management
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f keycloak
docker-compose logs -f frontend

# Clear logs (if disk space is low)
docker system prune -a --volumes
```

### Backup Strategy
```bash
# Backup data volumes
docker run --rm -v devops-sso-hub_postgres_data:/data -v $(pwd):/backup ubuntu tar czf /backup/postgres-backup.tar.gz /data
docker run --rm -v devops-sso-hub_redis_data:/data -v $(pwd):/backup ubuntu tar czf /backup/redis-backup.tar.gz /data

# Backup configuration
cp .env .env.backup
```

## 🔒 Security Best Practices

### Firewall Configuration (Ubuntu)
```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH (adjust for your IP)
sudo ufw allow from YOUR_IP_ADDRESS to any port 22

# Allow web traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 8080/tcp

# Check rules
sudo ufw status
```

### SSL/HTTPS Setup (Production)
1. Get SSL certificates (Let's Encrypt recommended)
2. Update NGINX configuration
3. Update .env with HTTPS protocol
4. Configure security groups for port 443

### Regular Updates
```bash
# Update the application
git pull origin main
docker-compose build --no-cache
docker-compose up -d

# Update system packages
sudo apt update && sudo apt upgrade -y  # Ubuntu
sudo yum update -y                      # Amazon Linux
```

## 🚀 Performance Optimization

### Instance Sizing Guidelines
- **Development**: t3.medium (2 vCPU, 4GB RAM)
- **Small Production**: t3.large (2 vCPU, 8GB RAM)  
- **Medium Production**: t3.xlarge (4 vCPU, 16GB RAM)
- **Large Production**: m5.xlarge (4 vCPU, 16GB RAM) + RDS for database

### Database Optimization
For production, consider:
- Amazon RDS PostgreSQL instead of containerized database
- ElastiCache Redis instead of containerized Redis
- Update DATABASE_URL and REDIS_URL in .env accordingly

## 📞 Support

If you encounter issues specific to AWS deployment:

1. Check AWS CloudWatch logs
2. Verify Security Group settings
3. Confirm instance has sufficient resources
4. Run `./validate-deployment.sh` for diagnostic information

## Example Complete Deployment

```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@3.66.111.219

# Clone and deploy
git clone https://github.com/pramodksahoo/devops-sso-hub.git
cd devops-sso-hub

# Configure for external access
cat > .env << EOF
# Copy from env.example and modify:
EXTERNAL_HOST=3.66.111.219
EXTERNAL_PROTOCOL=http
EXTERNAL_PORT=
# ... rest of configuration ...
EOF

# Deploy
./setup.sh

# Access services:
# - Frontend: http://3.66.111.219:3000
# - Keycloak: http://3.66.111.219:8080
# - API Docs: http://3.66.111.219:3006/docs
# - Health: http://3.66.111.219:3004
```

Your SSO Hub is now ready for production use on AWS EC2! 🎉