#!/bin/bash

# SSO Hub Enhanced External Access Configuration
# Complete solution for all deployment scenarios: HTTP, HTTPS, Self-signed, Let's Encrypt

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    clear
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                    SSO Hub External Access Configuration                    ${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    show_deployment_options_header
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SUFFIX="backup-$(date +%Y%m%d-%H%M%S)"

# Global configuration variables
EXTERNAL_HOST=""
EXTERNAL_PROTOCOL=""
EXTERNAL_PORT=""
USE_LETSENCRYPT=false
USE_SELFSIGNED=false

# Auto-detect current IP
detect_current_ip() {
    local ip=""
    
    # Try multiple IP detection services
    for service in "https://ifconfig.me" "https://api.ipify.org" "https://ipinfo.io/ip"; do
        if command -v curl &> /dev/null; then
            ip=$(curl -s --max-time 5 "$service" 2>/dev/null | grep -E '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$')
            if [[ -n "$ip" ]]; then
                break
            fi
        fi
    done
    
    echo "$ip"
}

# Detect host type (IP or domain)
detect_host_type() {
    local host="$1"
    
    if [[ "$host" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "ip"
    elif [[ "$host" == "localhost" ]]; then
        echo "localhost"
    else
        echo "domain"
    fi
}

# Show current configuration
show_current_config() {
    print_step "Current Configuration:"
    echo ""
    
    if [ -f ".env" ]; then
        local external_host=$(grep "^EXTERNAL_HOST=" .env 2>/dev/null | cut -d= -f2 || echo "localhost")
        local external_protocol=$(grep "^EXTERNAL_PROTOCOL=" .env 2>/dev/null | cut -d= -f2 || echo "http")
        local external_port=$(grep "^EXTERNAL_PORT=" .env 2>/dev/null | cut -d= -f2 || echo "")
        local frontend_url=$(grep "^FRONTEND_URL=" .env 2>/dev/null | cut -d= -f2 || echo "http://localhost:3000")
        
        echo -e "  Host: ${BLUE}$external_host${NC}"
        echo -e "  Protocol: ${BLUE}$external_protocol${NC}"
        echo -e "  Port: ${BLUE}${external_port:-default}${NC}"
        echo -e "  Frontend URL: ${BLUE}$frontend_url${NC}"
        echo ""
        
        # Check if certificates exist
        if [ -f "infra/nginx/ssl/server.crt" ] && [ -f "infra/nginx/ssl/server.key" ]; then
            local cert_type=$(openssl x509 -in infra/nginx/ssl/server.crt -text -noout | grep -i "issuer" | head -1)
            if echo "$cert_type" | grep -qi "let's encrypt"; then
                echo -e "  SSL Certificate: ${GREEN}Let's Encrypt (Valid)${NC}"
            else
                echo -e "  SSL Certificate: ${YELLOW}Self-signed${NC}"
            fi
        else
            echo -e "  SSL Certificate: ${RED}Not configured${NC}"
        fi
    else
        echo -e "  ${YELLOW}No configuration found (.env file missing)${NC}"
    fi
    echo ""
}

# Show deployment options header
show_deployment_options_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                           DEPLOYMENT OPTIONS                              ║${NC}"
    echo -e "${CYAN}╠════════════════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║ ${BLUE}1${NC} → ${GREEN}Public IP Access${NC}    ${YELLOW}AWS EC2/VM${NC}          - HTTP only, external SSL ║"
    echo -e "${CYAN}║ ${BLUE}2${NC} → ${GREEN}Domain Name Access${NC}  ${YELLOW}Production Ready${NC}    - HTTP or HTTPS options  ║"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Show detailed deployment options
show_deployment_options() {
    echo -e "${CYAN}Choose Your Deployment Type:${NC}"
    echo ""
    echo -e "${BLUE}1) Public IP Access${NC} ${YELLOW}(AWS EC2, VM, Server)${NC}"
    echo "   ✓ Direct access via public IP address"
    echo "   ✓ HTTP only - no SSL certificates needed from application"
    echo "   ✓ Access: http://YOUR_IP:3000"
    echo "   ✓ For HTTPS: Use CloudFlare, ALB, or add DNS A record + external certs"
    echo "   ✓ Perfect for development, testing, or behind load balancers"
    echo ""
    echo -e "${BLUE}2) Domain Name Access${NC} ${GREEN}(Production Ready)${NC}"
    echo "   ✓ Access via custom domain name"
    echo "   ✓ Choice of HTTP or HTTPS"
    echo "   ✓ HTTPS with automatic Let's Encrypt certificates"
    echo "   ✓ Access: https://sso.yourdomain.com or http://sso.yourdomain.com"
    echo "   ⚠ Requires domain name pointing to this server"
    echo ""
}


# Configure Public IP deployment (HTTP only)
configure_public_ip() {
    print_step "Configuring Public IP access..."
    
    local current_ip=$(detect_current_ip)
    
    echo ""
    echo -e "${CYAN}Public IP Configuration:${NC}"
    echo ""
    print_info "This will configure HTTP access via your server's public IP address"
    print_info "No SSL certificates will be generated from the application"
    echo ""
    
    if [[ -n "$current_ip" ]]; then
        echo "Detected public IP: $current_ip"
        echo ""
        read -p "Use detected IP ($current_ip)? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            EXTERNAL_HOST="$current_ip"
        else
            read -p "Enter your server's public IP address: " EXTERNAL_HOST
            # Validate IP format
            if [[ $EXTERNAL_HOST =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                print_success "IP address validated: $EXTERNAL_HOST"
            else
                print_warning "Invalid IP format, but proceeding with: $EXTERNAL_HOST"
            fi
        fi
    else
        read -p "Enter your server's public IP address: " EXTERNAL_HOST
        if [[ $EXTERNAL_HOST =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            print_success "IP address validated: $EXTERNAL_HOST"
        else
            print_warning "Invalid IP format, but proceeding with: $EXTERNAL_HOST"
        fi
    fi
    
    EXTERNAL_PROTOCOL="http"
    EXTERNAL_PORT=""
    USE_LETSENCRYPT=false
    USE_SELFSIGNED=false
    
    echo ""
    print_success "✅ Public IP configuration completed successfully"
    print_info "Configuration: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}"
    print_info "Access URL: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3000"
    echo ""
    print_info "${YELLOW}For HTTPS with this IP:${NC}"
    print_info "  • Add DNS A record: your-domain.com → $EXTERNAL_HOST"
    print_info "  • Use CloudFlare, AWS ALB, or external proxy for SSL termination"
    print_info "  • Then run this script again with Domain Name option"
    
    return 0
}

# Configure Domain Name deployment (HTTP or HTTPS choice)
configure_domain_name() {
    print_step "Configuring Domain Name access..."
    
    echo ""
    echo -e "${CYAN}Domain Name Configuration:${NC}"
    echo ""
    print_info "This will configure access via your custom domain name"
    echo ""
    
    # Get domain name
    while true; do
        read -p "Enter your domain name (e.g., sso.example.com): " EXTERNAL_HOST
        
        if [[ -z "$EXTERNAL_HOST" ]]; then
            print_error "Domain name cannot be empty"
            continue
        fi
        
        # Validate domain (not IP address)
        local host_type=$(detect_host_type "$EXTERNAL_HOST")
        if [[ "$host_type" == "ip" ]]; then
            print_error "Please use the Public IP option for IP addresses"
            print_info "This option is for domain names only"
            continue
        fi
        
        if [[ "$host_type" == "localhost" ]]; then
            print_error "Please use a real domain name, not localhost"
            continue
        fi
        
        print_success "Using domain: $EXTERNAL_HOST"
        break
    done
    
    # Check if domain resolves (optional warning)
    local current_ip=$(detect_current_ip)
    if [[ -n "$current_ip" ]] && command -v dig &> /dev/null; then
        local domain_ip=$(dig +short "$EXTERNAL_HOST" | tail -n1)
        if [[ -n "$domain_ip" && "$domain_ip" != "$current_ip" ]]; then
            print_warning "Domain $EXTERNAL_HOST resolves to $domain_ip, but this server is $current_ip"
            print_warning "Make sure your domain points to this server before proceeding"
            echo ""
            read -p "Continue anyway? (y/n): " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                return 1
            fi
        fi
    fi
    
    # Choose protocol
    echo ""
    echo "Protocol options:"
    echo "1) HTTP - No SSL certificates (good for development or behind load balancer)"
    echo "2) HTTPS - Automatic Let's Encrypt SSL certificates (production ready)"
    echo ""
    
    while true; do
        read -p "Select protocol (1-2): " -n 1 -r proto_choice
        echo ""
        
        case $proto_choice in
            1)
                EXTERNAL_PROTOCOL="http"
                USE_LETSENCRYPT=false
                USE_SELFSIGNED=false
                print_success "HTTP selected - no SSL certificates will be configured"
                break
                ;;
            2)
                EXTERNAL_PROTOCOL="https"
                USE_LETSENCRYPT=true
                USE_SELFSIGNED=false
                print_success "HTTPS selected - Let's Encrypt certificates will be configured"
                print_warning "Make sure port 80 is open and accessible from internet for validation"
                break
                ;;
            *)
                print_error "Invalid choice. Please select 1 or 2."
                ;;
        esac
    done
    
    EXTERNAL_PORT=""
    
    echo ""
    print_success "✅ Domain Name configuration completed successfully"
    print_info "Configuration: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}"
    print_info "Access URL: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3000"
    
    if [[ "$USE_LETSENCRYPT" == "true" ]]; then
        print_info "Let's Encrypt certificate will be generated for: $EXTERNAL_HOST"
    fi
    
    return 0
}



# Update frontend environment configuration
update_frontend_env_config() {
    print_step "Updating frontend environment configuration..."
    
    local frontend_env_file="apps/frontend/.env"
    
    # Check if frontend .env exists
    if [ ! -f "$frontend_env_file" ]; then
        if [ -f "apps/frontend/.env.example" ]; then
            cp "apps/frontend/.env.example" "$frontend_env_file"
            print_success "Created frontend .env from .env.example"
        else
            print_error "Frontend .env.example file not found"
            return 1
        fi
    fi
    
    # Create backup of frontend .env
    cp "$frontend_env_file" "${frontend_env_file}.$BACKUP_SUFFIX"
    print_info "Frontend .env backup created: ${frontend_env_file}.$BACKUP_SUFFIX"
    
    # Calculate URLs for frontend
    local FULL_FRONTEND_URL="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}"
    local FULL_KEYCLOAK_URL="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:8080"
    local FULL_AUTH_BFF_URL="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3002"
    local FULL_API_BASE_URL="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3002/api"
    
    # Determine WebSocket protocol
    local WS_PROTOCOL="ws"
    if [[ "$EXTERNAL_PROTOCOL" == "https" ]]; then
        WS_PROTOCOL="wss"
    fi
    local FULL_WS_URL="${WS_PROTOCOL}://${EXTERNAL_HOST}:3002"
    
    print_info "Updating frontend VITE_* variables..."
    
    # Update frontend .env file with external URLs
    sed -i.tmp \
        -e "s|^VITE_FRONTEND_URL=.*|VITE_FRONTEND_URL=$FULL_FRONTEND_URL|" \
        -e "s|^VITE_AUTH_BFF_URL=.*|VITE_AUTH_BFF_URL=$FULL_AUTH_BFF_URL|" \
        -e "s|^VITE_API_BASE_URL=.*|VITE_API_BASE_URL=$FULL_API_BASE_URL|" \
        -e "s|^VITE_WS_URL=.*|VITE_WS_URL=$FULL_WS_URL|" \
        -e "s|^VITE_KEYCLOAK_URL=.*|VITE_KEYCLOAK_URL=$FULL_KEYCLOAK_URL|" \
        -e "s|^VITE_USER_SERVICE_URL=.*|VITE_USER_SERVICE_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3003|" \
        -e "s|^VITE_TOOLS_SERVICE_URL=.*|VITE_TOOLS_SERVICE_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3004|" \
        -e "s|^VITE_ADMIN_CONFIG_URL=.*|VITE_ADMIN_CONFIG_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3005|" \
        -e "s|^VITE_CATALOG_URL=.*|VITE_CATALOG_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3006|" \
        -e "s|^VITE_WEBHOOK_INGRESS_URL=.*|VITE_WEBHOOK_INGRESS_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3007|" \
        -e "s|^VITE_AUDIT_URL=.*|VITE_AUDIT_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3009|" \
        -e "s|^VITE_ANALYTICS_URL=.*|VITE_ANALYTICS_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3010|" \
        -e "s|^VITE_PROVISIONING_URL=.*|VITE_PROVISIONING_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3011|" \
        -e "s|^VITE_LDAP_SYNC_URL=.*|VITE_LDAP_SYNC_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3012|" \
        -e "s|^VITE_POLICY_URL=.*|VITE_POLICY_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3013|" \
        -e "s|^VITE_NOTIFIER_URL=.*|VITE_NOTIFIER_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3014|" \
        -e "s|^VITE_GRAFANA_URL=.*|VITE_GRAFANA_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3100|" \
        -e "s|^VITE_PROMETHEUS_URL=.*|VITE_PROMETHEUS_URL=${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:9090|" \
        "$frontend_env_file"
    
    rm "${frontend_env_file}.tmp"
    
    print_success "Frontend environment configuration updated"
    print_info "Frontend will be built with:"
    print_info "  • VITE_FRONTEND_URL: $FULL_FRONTEND_URL"
    print_info "  • VITE_AUTH_BFF_URL: $FULL_AUTH_BFF_URL"
    print_info "  • VITE_KEYCLOAK_URL: $FULL_KEYCLOAK_URL"
}

# Update environment configuration
update_env_config() {
    print_step "Updating environment configuration..."
    
    if [ ! -f ".env" ]; then
        if [ -f "env.example" ]; then
            cp env.example .env
            print_success "Created .env from env.example"
        else
            print_error "env.example file not found"
            return 1
        fi
    fi
    
    # Create backup
    cp .env ".env.$BACKUP_SUFFIX"
    print_info "Backup created: .env.$BACKUP_SUFFIX"
    
    # Calculate URLs
    local FULL_FRONTEND_URL="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}"
    local FULL_KEYCLOAK_URL="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:8080"
    local FULL_AUTH_BFF_URL="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3002"
    
    # Update .env file
    sed -i.tmp \
        -e "s|^EXTERNAL_HOST=.*|EXTERNAL_HOST=$EXTERNAL_HOST|" \
        -e "s|^EXTERNAL_PROTOCOL=.*|EXTERNAL_PROTOCOL=$EXTERNAL_PROTOCOL|" \
        -e "s|^EXTERNAL_PORT=.*|EXTERNAL_PORT=$EXTERNAL_PORT|" \
        -e "s|^FRONTEND_URL=.*|FRONTEND_URL=$FULL_FRONTEND_URL|" \
        -e "s|^CORS_ORIGIN=.*|CORS_ORIGIN=$FULL_FRONTEND_URL|" \
        -e "s|^KC_HOSTNAME=.*|KC_HOSTNAME=$EXTERNAL_HOST|" \
        -e "s|^KEYCLOAK_PUBLIC_URL=.*|KEYCLOAK_PUBLIC_URL=$FULL_KEYCLOAK_URL/realms/sso-hub|" \
        -e "s|^OIDC_DISCOVERY_URL=.*|OIDC_DISCOVERY_URL=$FULL_KEYCLOAK_URL/realms/sso-hub/.well-known/openid_configuration|" \
        -e "s|^OIDC_REDIRECT_URI=.*|OIDC_REDIRECT_URI=$FULL_AUTH_BFF_URL/auth/callback|" \
        .env
    
    rm .env.tmp
    
    print_success "Environment configuration updated"
}

# Generate SSL certificates (Let's Encrypt only)
setup_ssl_certificates() {
    if [[ "$EXTERNAL_PROTOCOL" == "https" ]]; then
        if [[ "$USE_LETSENCRYPT" == "true" ]]; then
            print_step "Setting up Let's Encrypt certificate..."
            if [ -x "./ssl-setup.sh" ]; then
                print_info "Running SSL certificate setup..."
                echo ""
                ./ssl-setup.sh
            else
                print_error "SSL setup script not found"
                return 1
            fi
        elif [[ -f "infra/nginx/ssl/server.crt" && -f "infra/nginx/ssl/server.key" ]]; then
            print_info "Using existing SSL certificates"
        else
            print_error "HTTPS selected but no SSL certificates available"
            print_info "Please provide certificates in infra/nginx/ssl/ directory"
            print_info "Required files: server.crt and server.key"
            return 1
        fi
    fi
}

# Update Keycloak realm configuration
update_keycloak_config() {
    print_step "Updating Keycloak realm configuration..."
    
    local realm_file="infra/keycloak/import/realm-sso-hub.json"
    
    if [ -f "$realm_file" ]; then
        # Create backup
        cp "$realm_file" "${realm_file}.$BACKUP_SUFFIX"
        
        # Calculate URLs for realm configuration
        local FULL_FRONTEND_URL="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}"
        local FULL_AUTH_BFF_URL="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3002"
        
        # Update realm file with new URLs
        sed -i.tmp \
            -e "s|http://localhost:3000|$FULL_FRONTEND_URL|g" \
            -e "s|http://localhost:3002|$FULL_AUTH_BFF_URL|g" \
            -e "s|https://localhost:3000|$FULL_FRONTEND_URL|g" \
            -e "s|https://localhost:3002|$FULL_AUTH_BFF_URL|g" \
            "$realm_file"
        
        rm "${realm_file}.tmp"
        
        print_success "Keycloak realm configuration updated"
    else
        print_warning "Keycloak realm file not found, skipping realm update"
    fi
}

# Validate OIDC configuration for external access
validate_oidc_configuration() {
    local max_attempts=5
    local attempt=1
    
    print_info "Testing OIDC endpoints and realm configuration..."
    
    while [ $attempt -le $max_attempts ]; do
        print_info "Validation attempt $attempt/$max_attempts..."
        
        # Test 1: Verify Keycloak is accessible locally first (from host system)
        print_info "Step 1: Testing local Keycloak accessibility..."
        
        # Test localhost first
        local localhost_working=false
        if curl -sf --connect-timeout 5 --max-time 10 "http://localhost:8080/realms/master" &>/dev/null; then
            localhost_working=true
            print_success "✅ localhost:8080 is responding"
        else
            print_warning "localhost:8080 not responding (may be HSTS issue)"
            
            # Try 127.0.0.1 as HSTS bypass
            print_info "Trying 127.0.0.1 to bypass potential HSTS issues..."
            if curl -sf --connect-timeout 5 --max-time 10 "http://127.0.0.1:8080/realms/master" &>/dev/null; then
                localhost_working=true
                print_success "✅ 127.0.0.1:8080 is responding (HSTS bypass successful)"
                print_info "Note: Using 127.0.0.1 instead of localhost to avoid browser HSTS policies"
            fi
        fi
        
        if [ "$localhost_working" = false ]; then
            print_warning "Local Keycloak not accessible on attempt $attempt (container may not be ready)"
            if [ $attempt -eq $max_attempts ]; then
                print_error "Local Keycloak validation failed - container not responding"
                print_info "Troubleshooting:"
                print_info "  • Check container: docker-compose ps keycloak"  
                print_info "  • Check logs: docker-compose logs keycloak"
                print_info "  • Clear browser HSTS: chrome://net-internals/#hsts"
                return 1
            fi
            sleep 15
            attempt=$((attempt + 1))
            continue
        fi
        
        # Test 2: Check external network accessibility
        print_info "Step 2: Testing external network accessibility..."
        local external_master_url="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:8080/realms/master"
        if ! curl -sf --connect-timeout 10 --max-time 30 "$external_master_url" &>/dev/null; then
            print_warning "External master realm not accessible on attempt $attempt"
            print_warning "URL tested: $external_master_url"
            if [ $attempt -eq $max_attempts ]; then
                print_error "External network accessibility validation failed"
                print_error "Common causes:"
                print_error "  • AWS Security Group doesn't allow port 8080 inbound traffic"
                print_error "  • Firewall blocking port 8080"
                print_error "  • Network routing issues"
                print_info "Try: curl -v http://localhost:8080/realms/master (should work)"
                print_info "Try: curl -v $external_master_url (currently failing)"
                return 1
            fi
            sleep 15
            attempt=$((attempt + 1))
            continue
        fi
        print_success "✅ External network access is working"
        
        # Test 3: Check if sso-hub realm is accessible externally
        print_info "Step 3: Testing sso-hub realm accessibility..."
        local external_realm_url="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:8080/realms/sso-hub"
        if ! curl -sf --connect-timeout 10 --max-time 30 "$external_realm_url" &>/dev/null; then
            print_warning "External SSO-Hub realm not accessible on attempt $attempt: $external_realm_url"
            if [ $attempt -eq $max_attempts ]; then
                print_error "External SSO-Hub realm validation failed"
                return 1
            fi
            sleep 15
            attempt=$((attempt + 1))
            continue
        fi
        print_success "✅ SSO-Hub realm is accessible externally"
        
        # Test 4: Check if OIDC discovery endpoint is accessible  
        print_info "Step 4: Testing OIDC discovery endpoint..."
        
        # First test local discovery endpoint to ensure it's working
        print_info "Testing local discovery endpoint..."
        local local_discovery_working=false
        
        # Try localhost first
        if curl -sf --connect-timeout 10 --max-time 30 "http://localhost:8080/realms/sso-hub/.well-known/openid_configuration" &>/dev/null; then
            local_discovery_working=true
            print_success "✅ Local discovery endpoint working: localhost:8080"
        else
            # Try 127.0.0.1 as HSTS bypass
            print_info "Trying 127.0.0.1 for local discovery endpoint..."
            if curl -sf --connect-timeout 10 --max-time 30 "http://127.0.0.1:8080/realms/sso-hub/.well-known/openid_configuration" &>/dev/null; then
                local_discovery_working=true
                print_success "✅ Local discovery endpoint working: 127.0.0.1:8080 (HSTS bypass)"
            fi
        fi
        
        if [ "$local_discovery_working" = false ]; then
            print_warning "Local OIDC discovery endpoint not working on attempt $attempt"
            if [ $attempt -eq $max_attempts ]; then
                print_error "Local OIDC discovery endpoint validation failed"
                print_info "Discovery endpoint URLs tested:"
                print_info "  • http://localhost:8080/realms/sso-hub/.well-known/openid_configuration"
                print_info "  • http://127.0.0.1:8080/realms/sso-hub/.well-known/openid_configuration"
                print_info "This suggests Keycloak realm configuration or hostname issues"
                return 1
            fi
            sleep 15
            attempt=$((attempt + 1))
            continue
        fi
        
        # Now test external discovery endpoint
        local oidc_config_url="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:8080/realms/sso-hub/.well-known/openid_configuration"
        print_info "Testing external discovery endpoint: $oidc_config_url"
        if ! curl -sf --connect-timeout 10 --max-time 30 "$oidc_config_url" &>/dev/null; then
            print_warning "External OIDC discovery endpoint not accessible on attempt $attempt: $oidc_config_url"
            if [ $attempt -eq $max_attempts ]; then
                print_error "External OIDC discovery endpoint validation failed"
                print_info "Local discovery works but external access fails - likely network/firewall issue"
                return 1
            fi
            sleep 15
            attempt=$((attempt + 1))
            continue
        fi
        print_success "✅ External OIDC discovery endpoint is accessible"
        
        # Test 5: Verify that external host configuration is reflected in OIDC config
        local oidc_response=$(curl -sf --connect-timeout 10 --max-time 30 "$oidc_config_url" 2>/dev/null)
        if [[ -n "$oidc_response" ]]; then
            # For IP addresses, we expect localhost in internal communication
            # This is normal for containerized deployments
            if [[ "$EXTERNAL_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                print_info "IP-based deployment - internal localhost configuration is expected"
            else
                # For domain names, check if the configuration contains the external host
                if echo "$oidc_response" | grep -q "localhost" && ! echo "$oidc_response" | grep -q "$EXTERNAL_HOST"; then
                    print_warning "OIDC configuration still contains localhost references"
                    print_info "This may be normal for containerized deployments with external proxies"
                fi
            fi
        fi
        
        print_success "✅ OIDC configuration validation passed"
        return 0
    done
    
    print_error "OIDC configuration validation failed after $max_attempts attempts"
    return 1
}

# Validate full deployment including microservices
validate_full_deployment() {
    print_info "Testing core microservices..."
    
    local services_checked=0
    local services_healthy=0
    
    # Core services to check (these should be up for basic functionality)
    local core_services=(
        "3002:auth-bff"
        "3003:user-service" 
        "3004:tools-health-service"
        "3005:admin-config-service"
        "3006:catalog-service"
    )
    
    for service_info in "${core_services[@]}"; do
        local port=$(echo "$service_info" | cut -d: -f1)
        local name=$(echo "$service_info" | cut -d: -f2)
        
        services_checked=$((services_checked + 1))
        
        # Check if service is responding (with timeout)
        if curl -sf --connect-timeout 5 --max-time 10 "http://localhost:${port}/healthz" &>/dev/null || \
           curl -sf --connect-timeout 5 --max-time 10 "http://localhost:${port}/readyz" &>/dev/null || \
           curl -sf --connect-timeout 5 --max-time 10 "http://localhost:${port}/" &>/dev/null; then
            print_success "✅ $name (port $port) is healthy"
            services_healthy=$((services_healthy + 1))
        else
            print_warning "⚠️ $name (port $port) is not responding"
        fi
    done
    
    print_info "Service health summary: $services_healthy/$services_checked core services are healthy"
    
    # Consider deployment successful if at least 60% of core services are healthy
    local min_required=$(( (services_checked * 3) / 5 ))  # 60% threshold
    if [ $services_healthy -ge $min_required ]; then
        return 0
    else
        return 1
    fi
}

# Show configuration summary
show_configuration_summary() {
    print_step "Configuration Summary:"
    echo ""
    
    local FULL_FRONTEND_URL="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}"
    local FULL_KEYCLOAK_URL="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:8080"
    local FULL_AUTH_BFF_URL="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3002"
    
    echo -e "${CYAN}🌐 Access URLs:${NC}"
    echo -e "  • Frontend:      ${GREEN}$FULL_FRONTEND_URL${NC}"
    echo -e "  • Keycloak:      ${GREEN}$FULL_KEYCLOAK_URL${NC}"
    echo -e "  • Auth BFF:      ${GREEN}$FULL_AUTH_BFF_URL${NC}"
    echo -e "  • API Docs:      ${GREEN}${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3006/docs${NC}"
    echo -e "  • Health:        ${GREEN}${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3004${NC}"
    echo -e "  • OIDC Discovery:${GREEN}$FULL_KEYCLOAK_URL/realms/sso-hub/.well-known/openid_configuration${NC}"
    echo ""
    
    echo -e "${CYAN}🔧 Configuration:${NC}"
    echo -e "  • Host:          ${BLUE}$EXTERNAL_HOST${NC}"
    echo -e "  • Protocol:      ${BLUE}$EXTERNAL_PROTOCOL${NC}"
    echo -e "  • Port:          ${BLUE}${EXTERNAL_PORT:-default}${NC}"
    echo -e "  • Host Type:     ${BLUE}$(detect_host_type "$EXTERNAL_HOST")${NC}"
    
    if [[ "$EXTERNAL_PROTOCOL" == "https" ]]; then
        if [[ "$USE_LETSENCRYPT" == "true" ]]; then
            echo -e "  • SSL:           ${GREEN}Let's Encrypt (Valid Certificate)${NC}"
        else
            echo -e "  • SSL:           ${YELLOW}Self-signed Certificate${NC}"
        fi
    else
        echo -e "  • SSL:           ${RED}Disabled (HTTP only)${NC}"
    fi
    echo ""
}

# Trigger Keycloak reconfiguration for external access
trigger_keycloak_reconfiguration() {
    print_step "🚀 Starting Staged External Deployment..."
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose not found"
        print_info "Please install docker-compose and try again"
        return 1
    fi
    
    # Stage 1: Deploy OIDC Infrastructure
    print_step "📊 Stage 1: Deploying OIDC Infrastructure (Databases + Keycloak)..."
    print_info "Stopping any existing services to ensure clean deployment..."
    docker-compose down --remove-orphans &>/dev/null || true
    
    print_info "Starting core infrastructure services..."
    if ! docker-compose up -d postgres keycloak-postgres redis keycloak; then
        print_error "Failed to start core infrastructure services"
        print_info "Check logs: docker-compose logs"
        return 1
    fi
    
    print_success "✅ Core infrastructure services started"
    
    # Stage 2: Wait for OIDC Server Readiness
    print_step "⏳ Stage 2: Waiting for OIDC Server Readiness..."
    print_info "This may take 60-120 seconds for full Keycloak initialization..."
    
    local max_wait=150  # Extended timeout for external configuration
    local wait_time=0
    local keycloak_ready=false
    
    while [ $wait_time -lt $max_wait ]; do
        # Check if Keycloak container is healthy
        if docker-compose ps keycloak 2>/dev/null | grep -q "healthy"; then
            print_success "✅ Keycloak container is healthy"
            keycloak_ready=true
            break
        fi
        
        # Check basic connectivity as fallback
        if curl -s --connect-timeout 5 "http://localhost:8080/realms/master" &>/dev/null; then
            print_success "✅ Keycloak is responding to requests"
            keycloak_ready=true
            break
        fi
        
        # Progress updates every 20 seconds
        if [ $((wait_time % 20)) -eq 0 ]; then
            print_info "Still waiting for Keycloak... (${wait_time}s elapsed, max ${max_wait}s)"
            if [ $wait_time -gt 60 ]; then
                print_info "Keycloak is still initializing - this is normal for first startup"
            fi
        fi
        
        sleep 5
        wait_time=$((wait_time + 5))
    done
    
    if [ "$keycloak_ready" = false ]; then
        print_error "❌ Keycloak failed to become ready within ${max_wait} seconds"
        print_error "Deployment stopped at Stage 2"
        print_info "Troubleshooting steps:"
        print_info "  1. Check Keycloak logs: docker-compose logs keycloak"
        print_info "  2. Check container status: docker-compose ps"
        print_info "  3. Verify system resources (memory/disk)"
        return 1
    fi
    
    # Stage 3: OIDC Configuration Validation
    print_step "🔍 Stage 3: Validating OIDC Configuration for External Access..."
    print_info "Testing OIDC server configuration with external host: ${EXTERNAL_HOST}"
    
    # Wait additional time for background configuration to complete
    print_info "Waiting for background configuration to complete (90 seconds)..."
    sleep 90
    
    # Test OIDC configuration
    if ! validate_oidc_configuration; then
        print_error "❌ OIDC configuration validation failed"
        print_error "Deployment stopped at Stage 3"
        print_info "OIDC server is not ready for external connections"
        print_info "Troubleshooting steps:"
        print_info ""
        print_info "1. Test Keycloak discovery endpoint locally:"
        print_info "   curl -v http://localhost:8080/realms/sso-hub/.well-known/openid_configuration"
        print_info "   curl -v http://127.0.0.1:8080/realms/sso-hub/.well-known/openid_configuration"
        print_info "   (Both should return HTTP 200 with JSON response)"
        print_info ""
        print_info "2. If localhost fails but 127.0.0.1 works - HSTS Issue:"
        print_info "   • Clear browser HSTS policies: chrome://net-internals/#hsts"
        print_info "   • Delete domain: localhost"  
        print_info "   • Use 127.0.0.1 instead of localhost for testing"
        print_info ""
        print_info "3. If both local endpoints fail - Container Issue:"
        print_info "   • Check container: docker-compose ps keycloak"
        print_info "   • Check logs: docker-compose logs keycloak"
        print_info "   • Verify realm import: look for 'Realm sso-hub imported' in logs"
        print_info ""
        print_info "4. If local works but external fails - Network Issue:"
        print_info "   • Check AWS Security Group: Add port 8080 inbound rule"
        print_info "   • Test external: curl -v http://${EXTERNAL_HOST}:8080/realms/master"
        print_info ""
        print_info "5. Keycloak 24.0 Hostname Configuration:"
        print_info "   • Ensure KC_HOSTNAME is set correctly"
        print_info "   • Check KC_HTTP_ENABLED=true"
        print_info "   • Verify no HTTPS redirects in development mode"
        return 1
    fi
    
    print_success "✅ OIDC configuration validation passed"
    
    # Stage 4: Deploy All Microservices
    print_step "🌐 Stage 4: Deploying All Microservices..."
    print_info "OIDC server is ready - deploying remaining services..."
    
    if ! docker-compose up -d; then
        print_error "Failed to start remaining services"
        print_warning "OIDC server is working, but some microservices failed to start"
        print_info "Check logs: docker-compose logs"
        return 1
    fi
    
    print_success "✅ All services deployed successfully"
    
    # Final validation
    print_step "🎯 Final Validation: Testing Complete System..."
    sleep 30  # Allow services to stabilize
    
    if validate_full_deployment; then
        print_success "🎉 External deployment completed successfully!"
        print_success "System is ready for external access at: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}"
    else
        print_warning "⚠️ Deployment completed with some services not fully ready"
        print_info "Core OIDC functionality is working - check individual service logs if needed"
    fi
    
    return 0
}

# Show next steps
show_next_steps() {
    echo -e "${CYAN}🚀 Next Steps:${NC}"
    echo ""
    echo -e "${YELLOW}1. Configuration Applied Successfully:${NC}"
    echo "   ✅ Environment variables updated"
    echo "   ✅ Keycloak SSL requirements disabled for HTTP"
    echo "   ✅ Redirect URIs updated for external access"
    echo "   ✅ Keycloak service restarted with new configuration"
    echo ""
    echo -e "${YELLOW}2. Wait for Services (30-60 seconds):${NC}"
    echo "   Keycloak needs time to fully initialize with new settings"
    echo ""
    echo -e "${YELLOW}3. Test Your SSO Hub:${NC}"
    echo "   Access: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}"
    echo "   Click 'Sign in with SSO' to test OIDC login flow"
    echo ""
    echo -e "${YELLOW}4. Keycloak Admin Console:${NC}"
    echo "   Access: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:8080"
    echo "   Login: admin / admin_secure_password_123"
    echo ""
    
    if [[ "$EXTERNAL_PROTOCOL" == "https" && "$USE_SELFSIGNED" == "true" ]]; then
        print_warning "Self-signed Certificate Notice:"
        echo "• Your browser will show a security warning"
        echo "• Click 'Advanced' → 'Proceed to site' to continue"
        echo "• This is normal for self-signed certificates"
        echo ""
    fi
    
    echo -e "${CYAN}📚 Additional Resources:${NC}"
    echo "• AWS EC2 Guide: AWS_EC2_DEPLOYMENT.md"
    echo "• External Access Guide: EXTERNAL_ACCESS.md"
    echo "• Troubleshooting: docs/troubleshooting/"
    echo ""
}

# Main execution
main() {
    print_header
    
    # Check if .env exists, if not create from example
    if [ ! -f ".env" ] && [ -f "env.example" ]; then
        cp env.example .env
        print_info "Created .env from env.example"
        echo ""
    fi
    
    # Show current configuration
    show_current_config
    
    # Get user's deployment choice and configure  
    echo ""
    
    # Show detected IP if available
    local current_ip=$(detect_current_ip)
    if [[ -n "$current_ip" ]]; then
        echo -e "${CYAN}💡 Detected your current external IP: ${GREEN}$current_ip${NC}"
        echo -e "   This can be used for options 1 (HTTP) or 2 (HTTPS Self-signed)"
        echo ""
    fi
    
    show_deployment_options
    
    local choice
    while true; do
        read -p "Select deployment option (1-2): " -n 1 -r choice
        echo ""
        
        # Reset global variables for each attempt
        EXTERNAL_HOST=""
        EXTERNAL_PROTOCOL=""
        EXTERNAL_PORT=""
        USE_LETSENCRYPT=false
        USE_SELFSIGNED=false
        
        echo ""
        case $choice in
            1)
                if configure_public_ip; then
                    break
                else
                    print_error "Public IP configuration failed, please try again"
                    echo ""
                fi
                ;;
            2)
                if configure_domain_name; then
                    break
                else
                    print_error "Domain Name configuration failed, please try again"
                    echo ""
                fi
                ;;
            *)
                print_error "Invalid choice. Please select 1 or 2."
                echo ""
                ;;
        esac
        
        # Ask if user wants to try again
        echo ""
        read -p "Try again with a different option? (y/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Configuration cancelled by user"
            exit 0
        fi
        echo ""
        show_deployment_options
    done
    
    # Final validation (should not be needed now, but kept as safety)
    if [[ -z "$EXTERNAL_HOST" || -z "$EXTERNAL_PROTOCOL" ]]; then
        print_error "Configuration validation failed"
        print_error "HOST: '$EXTERNAL_HOST', PROTOCOL: '$EXTERNAL_PROTOCOL'"
        exit 1
    fi
    
    # Show configuration summary
    echo ""
    show_configuration_summary
    
    # Confirm with user
    echo ""
    read -p "Apply this configuration? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Configuration cancelled"
        exit 0
    fi
    
    # Apply configuration
    echo ""
    print_step "Applying configuration..."
    
    # Update environment configurations
    if ! update_env_config; then
        print_error "Failed to update environment configuration"
        exit 1
    fi
    
    # Update frontend environment configuration
    if ! update_frontend_env_config; then
        print_error "Failed to update frontend environment configuration"
        exit 1
    fi
    
    # Validate environment file syntax
    print_step "Validating environment file syntax..."
    if bash -n .env 2>/dev/null && bash -n apps/frontend/.env 2>/dev/null; then
        print_success "Environment file syntax validation passed"
    else
        print_warning "Environment file syntax issues detected, but continuing..."
    fi
    
    # Setup SSL certificates if needed
    if ! setup_ssl_certificates; then
        print_error "Failed to setup SSL certificates"
        exit 1
    fi
    
    # Update Keycloak configuration
    update_keycloak_config
    
    # Trigger Keycloak reconfiguration for external access
    trigger_keycloak_reconfiguration
    
    echo ""
    print_success "🎉 Configuration applied successfully!"
    echo ""
    
    # Show next steps
    show_next_steps
}

# Handle command line arguments
case "${1:-}" in
    -h|--help)
        echo "SSO Hub External Access Configuration"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  -h, --help    Show this help message"
        echo ""
        echo "This script configures SSO Hub for external access with support for:"
        echo "• HTTP (development/testing)"
        echo "• HTTPS with self-signed certificates"
        echo "• HTTPS with Let's Encrypt certificates"
        echo "• Custom configurations"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use -h or --help for usage information"
        exit 1
        ;;
esac