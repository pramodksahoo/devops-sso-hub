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
declare -g EXTERNAL_HOST=""
declare -g EXTERNAL_PROTOCOL=""
declare -g EXTERNAL_PORT=""
declare -g USE_LETSENCRYPT=false
declare -g USE_SELFSIGNED=false

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
    echo -e "${CYAN}║ ${BLUE}1${NC} → ${GREEN}HTTP Only${NC}           ${YELLOW}Development/Testing${NC} - Quick setup, no SSL     ║"
    echo -e "${CYAN}║ ${BLUE}2${NC} → ${GREEN}HTTPS Self-signed${NC}   ${YELLOW}Private Networks${NC}    - Secure with warnings   ║"
    echo -e "${CYAN}║ ${BLUE}3${NC} → ${GREEN}HTTPS Let's Encrypt${NC} ${YELLOW}Production Ready${NC}    - Valid SSL certificate  ║"
    echo -e "${CYAN}║ ${BLUE}4${NC} → ${GREEN}Custom Setup${NC}       ${YELLOW}Advanced Users${NC}      - Manual configuration   ║"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Show detailed deployment options
show_deployment_options() {
    echo -e "${CYAN}Choose Your Deployment Type:${NC}"
    echo ""
    echo -e "${BLUE}1) HTTP Only${NC} ${YELLOW}(Development/Testing)${NC}"
    echo "   ✓ Quick setup for development"
    echo "   ✓ Works with localhost or external IP"
    echo "   ✓ No SSL certificate required"
    echo "   ⚠ Not secure for production use"
    echo ""
    echo -e "${BLUE}2) HTTPS with Self-Signed Certificate${NC} ${YELLOW}(Private Networks)${NC}"
    echo "   ✓ Secure encrypted connection"
    echo "   ✓ Works with IP addresses or domains"
    echo "   ⚠ Browser shows security warning (safe to accept)"
    echo "   ✓ Good for internal/private networks"
    echo ""
    echo -e "${BLUE}3) HTTPS with Let's Encrypt Certificate${NC} ${GREEN}(Production Ready)${NC}"
    echo "   ✓ Production-ready with valid SSL certificate"
    echo "   ✓ No browser security warnings"
    echo "   ✓ Automatic certificate renewal"
    echo "   ⚠ Requires domain name (not IP address)"
    echo "   ⚠ Domain must point to this server"
    echo ""
    echo -e "${BLUE}4) Custom Configuration${NC} ${BLUE}(Advanced Users)${NC}"
    echo "   ✓ Full control over all settings"
    echo "   ✓ Advanced SSL options"
    echo "   ✓ Custom ports and protocols"
    echo ""
}


# Configure HTTP deployment
configure_http() {
    print_step "Configuring HTTP deployment..."
    
    local current_ip=$(detect_current_ip)
    
    echo ""
    echo -e "${CYAN}HTTP Deployment Configuration:${NC}"
    echo ""
    echo "1) Localhost only (http://localhost)"
    echo "2) External IP access (http://your-ip)"
    echo "3) Custom host"
    echo ""
    
    while true; do
        read -p "Select option (1-3): " -n 1 -r http_choice
        echo ""
        
        case $http_choice in
            1)
                EXTERNAL_HOST="localhost"
                break
                ;;
            2)
                if [[ -n "$current_ip" ]]; then
                    EXTERNAL_HOST="$current_ip"
                    print_success "Using detected IP: $EXTERNAL_HOST"
                else
                    echo ""
                    read -p "Enter your server's IP address: " EXTERNAL_HOST
                    # Validate IP format
                    if [[ $EXTERNAL_HOST =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                        print_success "IP address validated: $EXTERNAL_HOST"
                    else
                        print_warning "Invalid IP format, but proceeding with: $EXTERNAL_HOST"
                    fi
                fi
                break
                ;;
            3)
                echo ""
                read -p "Enter custom host (IP or domain): " EXTERNAL_HOST
                if [[ -n "$EXTERNAL_HOST" ]]; then
                    print_success "Using custom host: $EXTERNAL_HOST"
                    break
                else
                    print_error "Host cannot be empty"
                fi
                ;;
            *)
                print_error "Invalid choice. Please select 1, 2, or 3."
                ;;
        esac
    done
    
    EXTERNAL_PROTOCOL="http"
    EXTERNAL_PORT=""
    
    # Ask for custom port
    echo ""
    read -p "Custom port (leave empty for default 80): " custom_port
    if [[ -n "$custom_port" ]]; then
        EXTERNAL_PORT=":$custom_port"
        print_info "Using custom port: $custom_port"
    else
        print_info "Using default HTTP port (80)"
    fi
    
    echo ""
    print_success "✅ HTTP configuration completed successfully"
    print_info "Configuration: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}"
    
    return 0
}

# Configure HTTPS with self-signed certificate
configure_https_selfsigned() {
    print_step "Configuring HTTPS with self-signed certificate..."
    
    local current_ip=$(detect_current_ip)
    
    echo ""
    echo -e "${CYAN}HTTPS Self-Signed Certificate Configuration:${NC}"
    echo ""
    print_info "Self-signed certificates work with both IP addresses and domain names"
    print_warning "Browsers will show a security warning (safe to proceed)"
    echo ""
    echo "1) External IP address"
    echo "2) Domain name"
    echo "3) Custom host"
    echo ""
    
    while true; do
        read -p "Select option (1-3): " -n 1 -r https_choice
        echo ""
        
        case $https_choice in
            1)
                if [[ -n "$current_ip" ]]; then
                    EXTERNAL_HOST="$current_ip"
                    print_success "Using detected IP: $EXTERNAL_HOST"
                else
                    echo ""
                    read -p "Enter your server's IP address: " EXTERNAL_HOST
                    # Validate IP format
                    if [[ $EXTERNAL_HOST =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                        print_success "IP address validated: $EXTERNAL_HOST"
                    else
                        print_error "Invalid IP format: $EXTERNAL_HOST"
                        continue
                    fi
                fi
                break
                ;;
            2)
                echo ""
                read -p "Enter your domain name (e.g., example.com): " EXTERNAL_HOST
                if [[ -n "$EXTERNAL_HOST" && ! $EXTERNAL_HOST =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                    print_success "Using domain: $EXTERNAL_HOST"
                    break
                else
                    print_error "Please enter a valid domain name"
                fi
                ;;
            3)
                echo ""
                read -p "Enter custom host: " EXTERNAL_HOST
                if [[ -n "$EXTERNAL_HOST" ]]; then
                    print_success "Using custom host: $EXTERNAL_HOST"
                    break
                else
                    print_error "Host cannot be empty"
                fi
                ;;
            *)
                print_error "Invalid choice. Please select 1, 2, or 3."
                ;;
        esac
    done
    
    EXTERNAL_PROTOCOL="https"
    EXTERNAL_PORT=""
    USE_SELFSIGNED=true
    
    echo ""
    print_success "✅ HTTPS self-signed configuration completed successfully"
    print_info "Configuration: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}"
    print_info "SSL certificate will be generated for: $EXTERNAL_HOST"
    
    return 0
}

# Configure HTTPS with Let's Encrypt
configure_https_letsencrypt() {
    print_step "Configuring HTTPS with Let's Encrypt certificate..."
    
    echo ""
    echo -e "${CYAN}Let's Encrypt SSL Certificate Configuration:${NC}"
    echo ""
    print_warning "⚠️  Let's Encrypt Requirements:"
    echo "   • Must use a domain name (not IP address)"
    echo "   • Domain must point to this server"
    echo "   • Port 80 must be accessible from internet"
    echo "   • Valid for production use"
    echo ""
    
    while true; do
        read -p "Enter your domain name (e.g., sso.example.com): " EXTERNAL_HOST
        
        if [[ -z "$EXTERNAL_HOST" ]]; then
            print_error "Domain name cannot be empty"
            continue
        fi
        
        # Validate domain (not IP address)
        local host_type=$(detect_host_type "$EXTERNAL_HOST")
        if [[ "$host_type" != "domain" ]]; then
            print_error "Let's Encrypt requires a domain name, not an IP address"
            print_info "For IP addresses, use option 2 (HTTPS with self-signed certificate)"
            continue
        fi
        
        print_success "Using domain: $EXTERNAL_HOST"
        
        # Check if domain resolves (optional warning)
        local current_ip=$(detect_current_ip)
        if [[ -n "$current_ip" ]] && command -v dig &> /dev/null; then
            local domain_ip=$(dig +short "$EXTERNAL_HOST" | tail -n1)
            if [[ -n "$domain_ip" && "$domain_ip" != "$current_ip" ]]; then
                print_warning "Domain $EXTERNAL_HOST resolves to $domain_ip, but this server is $current_ip"
                echo ""
                read -p "Continue anyway? (y/n): " -n 1 -r
                echo ""
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    continue
                fi
            fi
        fi
        
        break
    done
    
    EXTERNAL_PROTOCOL="https"
    EXTERNAL_PORT=""
    USE_LETSENCRYPT=true
    
    echo ""
    print_success "✅ Let's Encrypt configuration completed successfully"
    print_info "Configuration: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}"
    print_info "Let's Encrypt certificate will be generated for: $EXTERNAL_HOST"
    print_warning "Make sure port 80 is open and accessible from the internet"
    
    return 0
}

# Configure custom options
configure_custom() {
    print_step "Configuring custom deployment..."
    
    echo ""
    echo -e "${CYAN}Custom Configuration - Advanced Options:${NC}"
    echo ""
    
    # Get host
    while true; do
        read -p "Enter host (IP address or domain name): " EXTERNAL_HOST
        if [[ -n "$EXTERNAL_HOST" ]]; then
            local host_type=$(detect_host_type "$EXTERNAL_HOST")
            print_success "Using host: $EXTERNAL_HOST (detected as: $host_type)"
            break
        else
            print_error "Host cannot be empty"
        fi
    done
    
    # Get protocol
    echo ""
    echo "Protocol options:"
    echo "1) HTTP (no encryption)"
    echo "2) HTTPS (encrypted)"
    echo ""
    
    while true; do
        read -p "Select protocol (1-2): " -n 1 -r proto_choice
        echo ""
        
        case $proto_choice in
            1)
                EXTERNAL_PROTOCOL="http"
                break
                ;;
            2)
                EXTERNAL_PROTOCOL="https"
                
                # SSL certificate options for HTTPS
                echo ""
                echo "SSL certificate options:"
                echo "1) Generate self-signed certificate"
                echo "2) Use Let's Encrypt certificate"
                echo "3) Use existing certificate"
                echo ""
                
                while true; do
                    read -p "Select SSL option (1-3): " -n 1 -r ssl_choice
                    echo ""
                    
                    case $ssl_choice in
                        1)
                            USE_SELFSIGNED=true
                            print_info "Will generate self-signed certificate"
                            break
                            ;;
                        2)
                            local host_type=$(detect_host_type "$EXTERNAL_HOST")
                            if [[ "$host_type" != "domain" ]]; then
                                print_error "Let's Encrypt requires a domain name, not an IP address"
                                print_info "Please use option 1 (self-signed) for IP addresses"
                                continue
                            fi
                            USE_LETSENCRYPT=true
                            print_info "Will use Let's Encrypt certificate"
                            break
                            ;;
                        3)
                            print_info "Will use existing certificate from infra/nginx/ssl/"
                            print_warning "Make sure server.crt and server.key exist in that directory"
                            break
                            ;;
                        *)
                            print_error "Invalid choice. Please select 1, 2, or 3."
                            ;;
                    esac
                done
                break
                ;;
            *)
                print_error "Invalid choice. Please select 1 or 2."
                ;;
        esac
    done
    
    # Get custom port
    echo ""
    read -p "Custom port (leave empty for default): " custom_port
    if [[ -n "$custom_port" ]]; then
        # Validate port number
        if [[ "$custom_port" =~ ^[0-9]+$ ]] && [ "$custom_port" -gt 0 ] && [ "$custom_port" -lt 65536 ]; then
            EXTERNAL_PORT=":$custom_port"
            print_info "Using custom port: $custom_port"
        else
            print_warning "Invalid port number, using default"
            EXTERNAL_PORT=""
        fi
    else
        EXTERNAL_PORT=""
        print_info "Using default port"
    fi
    
    echo ""
    print_success "✅ Custom configuration completed successfully"
    print_info "Configuration: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}"
    
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
        read -p "Select deployment option (1-4): " -n 1 -r choice
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
                if configure_http; then
                    break
                else
                    print_error "HTTP configuration failed, please try again"
                    echo ""
                fi
                ;;
            2)
                if configure_https_selfsigned; then
                    break
                else
                    print_error "HTTPS self-signed configuration failed, please try again"
                    echo ""
                fi
                ;;
            3)
                if configure_https_letsencrypt; then
                    break
                else
                    print_error "Let's Encrypt configuration failed, please try again"
                    echo ""
                fi
                ;;
            4)
                if configure_custom; then
                    break
                else
                    print_error "Custom configuration failed, please try again"
                    echo ""
                fi
                ;;
            *)
                print_error "Invalid choice. Please select 1, 2, 3, or 4."
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