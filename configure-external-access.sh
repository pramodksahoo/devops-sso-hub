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

# Show next steps
show_next_steps() {
    echo -e "${CYAN}🚀 Next Steps:${NC}"
    echo ""
    echo -e "${YELLOW}1. Restart Services:${NC}"
    echo "   docker-compose down"
    echo "   docker-compose build --no-cache keycloak frontend auth-bff"
    echo "   docker-compose up -d"
    echo ""
    echo -e "${YELLOW}2. Wait for Services (2-3 minutes):${NC}"
    echo "   All services need time to start and initialize"
    echo ""
    echo -e "${YELLOW}3. Validate Deployment:${NC}"
    echo "   ./validate-deployment.sh"
    echo ""
    echo -e "${YELLOW}4. Access Your SSO Hub:${NC}"
    echo "   ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}"
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