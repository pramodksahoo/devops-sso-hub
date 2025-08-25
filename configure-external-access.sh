#!/bin/bash

# SSO Hub External Access Configuration Script
# This script helps configure the SSO Hub for external access

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}====================================${NC}"
    echo -e "${BLUE}   SSO Hub External Access Setup   ${NC}"
    echo -e "${BLUE}====================================${NC}"
    echo ""
}

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to get user input with default value
get_input() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    echo -n -e "${BLUE}${prompt}${NC}"
    if [ -n "$default" ]; then
        echo -n " (default: $default): "
    else
        echo -n ": "
    fi
    
    read user_input
    
    if [ -z "$user_input" ] && [ -n "$default" ]; then
        user_input="$default"
    fi
    
    eval "$var_name=\"$user_input\""
}

# Function to validate IP address
validate_ip() {
    local ip=$1
    if [[ $ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        OIFS=$IFS
        IFS='.'
        ip=($ip)
        IFS=$OIFS
        [[ ${ip[0]} -le 255 && ${ip[1]} -le 255 && ${ip[2]} -le 255 && ${ip[3]} -le 255 ]]
    else
        return 1
    fi
}

# Function to validate domain
validate_domain() {
    local domain=$1
    [[ $domain =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$ ]]
}

# Function to detect current IP
get_current_ip() {
    # Try multiple methods to get IP
    local ip=""
    
    # Try hostname -I first (works on most Linux systems)
    if command -v hostname >/dev/null 2>&1; then
        ip=$(hostname -I | awk '{print $1}' 2>/dev/null)
    fi
    
    # Try ip route as fallback
    if [ -z "$ip" ] && command -v ip >/dev/null 2>&1; then
        ip=$(ip route get 8.8.8.8 | awk '{print $7; exit}' 2>/dev/null)
    fi
    
    # Try ifconfig as last resort
    if [ -z "$ip" ] && command -v ifconfig >/dev/null 2>&1; then
        ip=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n1)
    fi
    
    echo "$ip"
}

print_header

print_status "This script will help you configure SSO Hub for external access."
print_status "You can access the application from other machines using IP addresses or domain names."
echo ""

# Detect current setup
if [ -f ".env" ]; then
    print_warning ".env file already exists. This script will update it."
    echo ""
fi

# Get current IP for convenience
current_ip=$(get_current_ip)
if [ -n "$current_ip" ]; then
    print_status "Detected your current IP address: $current_ip"
fi
echo ""

# Ask for deployment type
echo "Please select your deployment type:"
echo "1) Development (localhost only)"
echo "2) Local network (IP address)"
echo "3) Production with domain name"
echo "4) Custom configuration"
echo ""

get_input "Select option (1-4)" "1" "deploy_type"

case $deploy_type in
    1)
        EXTERNAL_HOST="localhost"
        EXTERNAL_PROTOCOL="http"
        EXTERNAL_PORT=""
        print_status "Selected: Development mode (localhost)"
        ;;
    2)
        if [ -n "$current_ip" ]; then
            default_ip="$current_ip"
        else
            default_ip="192.168.1.100"
        fi
        
        get_input "Enter your server's IP address" "$default_ip" "EXTERNAL_HOST"
        
        if ! validate_ip "$EXTERNAL_HOST"; then
            print_error "Invalid IP address format"
            exit 1
        fi
        
        get_input "Enter port (leave empty for no port)" "" "port_input"
        if [ -n "$port_input" ]; then
            EXTERNAL_PORT=":$port_input"
        else
            EXTERNAL_PORT=""
        fi
        
        EXTERNAL_PROTOCOL="http"
        print_status "Selected: Local network access via IP"
        ;;
    3)
        get_input "Enter your domain name" "sso-hub.company.com" "EXTERNAL_HOST"
        
        if ! validate_domain "$EXTERNAL_HOST"; then
            print_error "Invalid domain name format"
            exit 1
        fi
        
        get_input "Use HTTPS? (y/n)" "y" "use_https"
        if [[ "$use_https" == "y" || "$use_https" == "Y" ]]; then
            EXTERNAL_PROTOCOL="https"
            EXTERNAL_PORT=""
        else
            EXTERNAL_PROTOCOL="http"
            get_input "Enter port (leave empty for port 80)" "" "port_input"
            if [ -n "$port_input" ]; then
                EXTERNAL_PORT=":$port_input"
            else
                EXTERNAL_PORT=""
            fi
        fi
        
        print_status "Selected: Production with domain name"
        ;;
    4)
        get_input "Enter hostname/IP" "localhost" "EXTERNAL_HOST"
        get_input "Enter protocol (http/https)" "http" "EXTERNAL_PROTOCOL"
        get_input "Enter port (with colon, e.g., :8080, or leave empty)" "" "EXTERNAL_PORT"
        print_status "Selected: Custom configuration"
        ;;
    *)
        print_error "Invalid option selected"
        exit 1
        ;;
esac

echo ""
print_status "Configuration summary:"
echo "  Host: $EXTERNAL_HOST"
echo "  Protocol: $EXTERNAL_PROTOCOL" 
echo "  Port: $EXTERNAL_PORT"
echo "  Full URL: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}"
echo ""

get_input "Continue with this configuration? (y/n)" "y" "confirm"
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    print_status "Configuration cancelled."
    exit 0
fi

# Create .env file
print_status "Creating .env configuration..."

# Copy from env.example if .env doesn't exist
if [ ! -f ".env" ]; then
    if [ -f "env.example" ]; then
        cp env.example .env
        print_status "Copied env.example to .env"
    else
        print_error "env.example file not found"
        exit 1
    fi
fi

# Update the .env file with our configuration
sed -i.backup \
    -e "s/^EXTERNAL_HOST=.*/EXTERNAL_HOST=$EXTERNAL_HOST/" \
    -e "s/^EXTERNAL_PROTOCOL=.*/EXTERNAL_PROTOCOL=$EXTERNAL_PROTOCOL/" \
    -e "s/^EXTERNAL_PORT=.*/EXTERNAL_PORT=$EXTERNAL_PORT/" \
    .env

# Calculate full external URL
FULL_EXTERNAL_URL="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}"

# Update CORS origin and external URLs
sed -i.backup \
    -e "s|^CORS_ORIGIN=.*|CORS_ORIGIN=$FULL_EXTERNAL_URL|" \
    -e "s|^FRONTEND_EXTERNAL_URL=.*|FRONTEND_EXTERNAL_URL=$FULL_EXTERNAL_URL|" \
    -e "s|^KEYCLOAK_EXTERNAL_URL=.*|KEYCLOAK_EXTERNAL_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:8080|" \
    .env

# Update Keycloak configuration for external access
if [[ "$EXTERNAL_HOST" != "localhost" ]]; then
    sed -i.backup \
        -e "s|^KC_HOSTNAME=.*|KC_HOSTNAME=$EXTERNAL_HOST|" \
        -e "s|^KEYCLOAK_PUBLIC_URL=.*|KEYCLOAK_PUBLIC_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:8080/realms/sso-hub|" \
        -e "s|^OIDC_REDIRECT_URI=.*|OIDC_REDIRECT_URI=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3002/auth/callback|" \
        .env
fi

print_status ".env file updated successfully"

# Update frontend .env file (create if doesn't exist)
frontend_url="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}"
auth_bff_url="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3002"

# Ensure frontend directory exists
mkdir -p apps/frontend

# Update frontend .env with external configuration
cat > apps/frontend/.env << EOF
# Auto-generated by configure-external-access.sh
# Frontend Environment Variables for External Access

# Core URLs
VITE_FRONTEND_URL=$frontend_url
VITE_AUTH_BFF_URL=$auth_bff_url
VITE_API_BASE_URL=$auth_bff_url/api
VITE_WS_URL=ws://${EXTERNAL_HOST}:3002

# Microservice URLs
VITE_USER_SERVICE_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3003
VITE_TOOLS_SERVICE_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3004
VITE_ADMIN_CONFIG_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3005
VITE_CATALOG_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3006
VITE_WEBHOOK_INGRESS_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3007
VITE_AUDIT_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3009
VITE_ANALYTICS_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3010
VITE_PROVISIONING_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3011
VITE_LDAP_SYNC_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3012
VITE_POLICY_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3013
VITE_NOTIFIER_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3014

# External Tools
VITE_KEYCLOAK_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:8080
VITE_GRAFANA_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3100
VITE_PROMETHEUS_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:9090

# Configuration
VITE_APP_TITLE=SSO Hub
VITE_NODE_ENV=production
VITE_DEBUG_MODE=false
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_AUDIT=true
VITE_ENABLE_PROVISIONING=true
VITE_ENABLE_LDAP_SYNC=true
VITE_ENABLE_WEBHOOKS=true
VITE_VERSION=1.0.0
EOF

print_status "Updated frontend configuration"

# Update Keycloak realm configuration for external access
if [[ "$EXTERNAL_HOST" != "localhost" ]]; then
    print_status "Updating Keycloak realm configuration for external access..."
    
    # Backup the original realm file
    cp infra/keycloak/import/realm-sso-hub.json infra/keycloak/import/realm-sso-hub.json.backup
    
    # Replace localhost URLs with external host in the realm configuration
    sed -i.tmp \
        -e "s|http://localhost:3000|${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}|g" \
        -e "s|http://localhost:3002|${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3002|g" \
        -e "s|http://localhost:8080|${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:8080|g" \
        infra/keycloak/import/realm-sso-hub.json
    
    # Remove backup file
    rm -f infra/keycloak/import/realm-sso-hub.json.tmp
    
    print_status "Updated Keycloak realm redirectUris and webOrigins"
fi

echo ""
print_status "Configuration complete!"
echo ""
echo -e "${GREEN}Next steps:${NC}"
if [[ "$EXTERNAL_HOST" != "localhost" ]]; then
    echo "1. Stop current services: ${BLUE}docker-compose down${NC}"
    echo "2. Rebuild services with new configuration: ${BLUE}docker-compose build --no-cache keycloak frontend${NC}"
    echo "3. Start all services: ${BLUE}docker-compose up -d${NC}"
    echo "4. Wait for all services to be healthy (2-3 minutes)"
    echo "5. Access the application at: ${BLUE}${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}${NC}"
    echo ""
    echo -e "${YELLOW}💡 Quick restart commands:${NC}"
    echo "docker-compose down && docker-compose build --no-cache keycloak frontend && docker-compose up -d"
else
    echo "1. Start the services: ${BLUE}docker-compose up -d${NC}"
    echo "2. Wait for all services to be healthy (2-3 minutes)"
    echo "3. Access the application at: ${BLUE}${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}${NC}"
fi
echo ""

if [[ "$EXTERNAL_PROTOCOL" == "https" ]]; then
    print_warning "HTTPS selected but SSL certificates are not configured."
    echo "You'll need to:"
    echo "- Configure SSL certificates in the NGINX service"
    echo "- Update port mappings in docker-compose.yml"
    echo "- Ensure your domain points to this server"
fi

if [[ "$EXTERNAL_HOST" != "localhost" ]]; then
    echo -e "${YELLOW}Network Configuration Required:${NC}"
    echo "- Ensure firewall allows inbound connections to ports:"
    echo "  • Port 80 (HTTP) or 443 (HTTPS) for web access"
    echo "  • Port 8080 for Keycloak access"
    echo "  • Port 3002 for Auth BFF API access"
    echo "- If using a cloud provider (AWS/GCP/Azure), configure security groups"
    echo "- For production, ensure proper SSL certificates are configured"
    echo ""
    
    echo -e "${YELLOW}DNS Configuration (if using domain):${NC}"
    if [[ "$EXTERNAL_HOST" != *.* ]]; then
        echo "- No DNS configuration needed for IP address access"
    else
        echo "- Ensure DNS A record points $EXTERNAL_HOST to this server"
        echo "- Consider setting up additional A records:"
        echo "  • keycloak.$EXTERNAL_HOST -> this server (optional)"
        echo "  • api.$EXTERNAL_HOST -> this server (optional)"
    fi
fi

echo ""
print_status "🎉 External access configuration completed successfully!"

# Create a configuration summary file
cat > .external-access-config << EOF
SSO Hub External Access Configuration
====================================
Generated: $(date)
Host: $EXTERNAL_HOST
Protocol: $EXTERNAL_PROTOCOL
Port: $EXTERNAL_PORT
Frontend URL: $frontend_url
Keycloak URL: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:8080

Next Steps:
1. Run: docker-compose up -d
2. Wait 2-3 minutes for services to start
3. Access: $frontend_url
4. Login: admin / admin_secure_password_123
EOF

print_status "Configuration summary saved to .external-access-config"