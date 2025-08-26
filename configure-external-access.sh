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
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}   SSO Hub External Access Configuration   ${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""
    echo -e "${BLUE}🚀 One script for all deployment scenarios${NC}"
    echo ""
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

# Show deployment options
show_deployment_options() {
    echo -e "${CYAN}Available Deployment Options:${NC}"
    echo ""
    echo -e "${BLUE}1) HTTP Only (Development/Testing)${NC}"
    echo "   • Quick setup for development"
    echo "   • Works with localhost or external IP"
    echo "   • No SSL certificate required"
    echo "   • Not secure for production"
    echo ""
    echo -e "${BLUE}2) HTTPS with Self-Signed Certificate${NC}"
    echo "   • Secure connection with self-signed cert"
    echo "   • Works with IP addresses or domains"
    echo "   • Browser security warning (can be accepted)"
    echo "   • Good for private networks/testing"
    echo ""
    echo -e "${BLUE}3) HTTPS with Let's Encrypt Certificate${NC}"
    echo "   • Production-ready with valid SSL certificate"
    echo "   • Requires domain name (not IP address)"
    echo "   • Automatic certificate renewal"
    echo "   • No browser security warnings"
    echo ""
    echo -e "${BLUE}4) Custom Configuration${NC}"
    echo "   • Manual configuration options"
    echo "   • Advanced settings"
    echo ""
}

# Get user deployment choice
get_deployment_choice() {
    local current_ip=$(detect_current_ip)
    
    while true; do
        show_deployment_options
        
        if [[ -n "$current_ip" ]]; then
            echo -e "${CYAN}💡 Detected your current IP: ${BLUE}$current_ip${NC}"
        fi
        echo ""
        
        read -p "Select deployment option (1-4): " -n 1 -r choice
        echo ""
        
        case $choice in
            1|2|3|4)
                echo "$choice"
                return 0
                ;;
            *)
                print_error "Invalid choice. Please select 1-4."
                echo ""
                sleep 1
                ;;
        esac
    done
}

# Configure HTTP deployment
configure_http() {
    print_step "Configuring HTTP deployment..."
    
    local current_ip=$(detect_current_ip)
    
    echo ""
    echo "HTTP deployment options:"
    echo "1) Localhost only (http://localhost)"
    echo "2) External IP access (http://your-ip)"
    echo "3) Custom host"
    echo ""
    
    read -p "Select option (1-3): " -n 1 -r http_choice
    echo ""
    
    case $http_choice in
        1)
            EXTERNAL_HOST="localhost"
            ;;
        2)
            if [[ -n "$current_ip" ]]; then
                EXTERNAL_HOST="$current_ip"
                print_info "Using detected IP: $EXTERNAL_HOST"
            else
                read -p "Enter your server's IP address: " EXTERNAL_HOST
            fi
            ;;
        3)
            read -p "Enter custom host (IP or domain): " EXTERNAL_HOST
            ;;
        *)
            print_error "Invalid choice, using localhost"
            EXTERNAL_HOST="localhost"
            ;;
    esac
    
    EXTERNAL_PROTOCOL="http"
    EXTERNAL_PORT=""
    
    # Ask for custom port
    read -p "Custom port (leave empty for default): " custom_port
    if [[ -n "$custom_port" ]]; then
        EXTERNAL_PORT=":$custom_port"
    fi
    
    print_info "HTTP configuration completed"
}

# Configure HTTPS with self-signed certificate
configure_https_selfsigned() {
    print_step "Configuring HTTPS with self-signed certificate..."
    
    local current_ip=$(detect_current_ip)
    
    echo ""
    echo "HTTPS self-signed certificate options:"
    echo "1) External IP"
    echo "2) Domain name"
    echo "3) Custom host"
    echo ""
    
    read -p "Select option (1-3): " -n 1 -r https_choice
    echo ""
    
    case $https_choice in
        1)
            if [[ -n "$current_ip" ]]; then
                EXTERNAL_HOST="$current_ip"
                print_info "Using detected IP: $EXTERNAL_HOST"
            else
                read -p "Enter your server's IP address: " EXTERNAL_HOST
            fi
            ;;
        2)
            read -p "Enter your domain name: " EXTERNAL_HOST
            ;;
        3)
            read -p "Enter custom host: " EXTERNAL_HOST
            ;;
        *)
            print_error "Invalid choice"
            return 1
            ;;
    esac
    
    EXTERNAL_PROTOCOL="https"
    EXTERNAL_PORT=""
    
    print_info "HTTPS self-signed configuration completed"
}

# Configure HTTPS with Let's Encrypt
configure_https_letsencrypt() {
    print_step "Configuring HTTPS with Let's Encrypt certificate..."
    
    echo ""
    print_warning "Let's Encrypt Requirements:"
    echo "• Domain name (not IP address)"
    echo "• Domain must point to this server"
    echo "• Port 80 must be accessible from internet"
    echo "• Valid email address for certificate notifications"
    echo ""
    
    read -p "Enter your domain name: " EXTERNAL_HOST
    
    # Validate domain
    local host_type=$(detect_host_type "$EXTERNAL_HOST")
    if [[ "$host_type" != "domain" ]]; then
        print_error "Let's Encrypt requires a domain name, not an IP address"
        return 1
    fi
    
    EXTERNAL_PROTOCOL="https"
    EXTERNAL_PORT=""
    
    USE_LETSENCRYPT=true
    print_info "Let's Encrypt configuration completed"
}

# Configure custom options
configure_custom() {
    print_step "Custom configuration..."
    
    echo ""
    read -p "Enter host (IP or domain): " EXTERNAL_HOST
    
    echo ""
    echo "Protocol options:"
    echo "1) HTTP"
    echo "2) HTTPS"
    echo ""
    read -p "Select protocol (1-2): " -n 1 -r proto_choice
    echo ""
    
    case $proto_choice in
        1)
            EXTERNAL_PROTOCOL="http"
            ;;
        2)
            EXTERNAL_PROTOCOL="https"
            echo ""
            echo "SSL certificate options:"
            echo "1) Self-signed certificate"
            echo "2) Let's Encrypt certificate"
            echo "3) Existing certificate"
            echo ""
            read -p "Select SSL option (1-3): " -n 1 -r ssl_choice
            echo ""
            
            case $ssl_choice in
                1)
                    USE_SELFSIGNED=true
                    ;;
                2)
                    USE_LETSENCRYPT=true
                    ;;
                3)
                    print_info "Make sure your certificates are in infra/nginx/ssl/"
                    ;;
                *)
                    print_error "Invalid choice, using self-signed"
                    USE_SELFSIGNED=true
                    ;;
            esac
            ;;
        *)
            print_error "Invalid choice, using HTTP"
            EXTERNAL_PROTOCOL="http"
            ;;
    esac
    
    read -p "Custom port (leave empty for default): " custom_port
    if [[ -n "$custom_port" ]]; then
        EXTERNAL_PORT=":$custom_port"
    else
        EXTERNAL_PORT=""
    fi
    
    print_info "Custom configuration completed"
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

# Generate SSL certificates
setup_ssl_certificates() {
    if [[ "$EXTERNAL_PROTOCOL" == "https" ]]; then
        if [[ "$USE_LETSENCRYPT" == "true" ]]; then
            print_step "Setting up Let's Encrypt certificate..."
            if [ -x "./letsencrypt-setup.sh" ]; then
                print_info "Running Let's Encrypt setup..."
                echo ""
                ./letsencrypt-setup.sh
            else
                print_error "Let's Encrypt setup script not found"
                return 1
            fi
        elif [[ "$USE_SELFSIGNED" == "true" ]] || [[ ! -f "infra/nginx/ssl/server.crt" ]]; then
            print_step "Generating self-signed certificate..."
            if [ -x "./generate-ssl-certs.sh" ]; then
                print_info "Running SSL certificate generation..."
                echo ""
                ./generate-ssl-certs.sh
            else
                print_error "SSL certificate generation script not found"
                return 1
            fi
        else
            print_info "Using existing SSL certificates"
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
    
    # Get user's deployment choice
    local choice=$(get_deployment_choice)
    
    # Initialize global variables
    EXTERNAL_HOST=""
    EXTERNAL_PROTOCOL=""
    EXTERNAL_PORT=""
    USE_LETSENCRYPT=false
    USE_SELFSIGNED=false
    
    # Configure based on choice
    echo ""
    case $choice in
        1)
            configure_http
            ;;
        2)
            configure_https_selfsigned
            USE_SELFSIGNED=true
            ;;
        3)
            configure_https_letsencrypt
            ;;
        4)
            configure_custom
            ;;
    esac
    
    # Debug: Show captured values
    print_info "Captured configuration:"
    print_info "  EXTERNAL_HOST: '$EXTERNAL_HOST'"
    print_info "  EXTERNAL_PROTOCOL: '$EXTERNAL_PROTOCOL'"
    print_info "  EXTERNAL_PORT: '$EXTERNAL_PORT'"
    
    # Validate configuration
    if [[ -z "$EXTERNAL_HOST" || -z "$EXTERNAL_PROTOCOL" ]]; then
        print_error "Configuration incomplete - missing required values"
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
    
    # Update environment
    if ! update_env_config; then
        print_error "Failed to update environment configuration"
        exit 1
    fi
    
    # Setup SSL certificates if needed
    if ! setup_ssl_certificates; then
        print_error "Failed to setup SSL certificates"
        exit 1
    fi
    
    # Update Keycloak configuration
    update_keycloak_config
    
    echo ""
    print_success "✅ Configuration applied successfully!"
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