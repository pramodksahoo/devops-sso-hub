#!/bin/bash

# Let's Encrypt SSL Certificate Setup for SSO Hub
# Automatic SSL certificate generation and renewal for domain names

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}    SSO Hub Let's Encrypt SSL Setup       ${NC}"
    echo -e "${BLUE}============================================${NC}"
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
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="$SCRIPT_DIR/infra/ssl-certs"
NGINX_CERTS_DIR="$SCRIPT_DIR/infra/nginx/ssl"
LETSENCRYPT_DIR="$SCRIPT_DIR/infra/letsencrypt"
CERTBOT_WORK_DIR="$LETSENCRYPT_DIR/work"
CERTBOT_LOGS_DIR="$LETSENCRYPT_DIR/logs"

# Load configuration
load_config() {
    if [ -f ".env" ]; then
        print_info "Loading configuration from .env..."
        
        # Safely extract specific variables we need instead of sourcing entire file
        EXTERNAL_HOST=$(grep "^EXTERNAL_HOST=" .env 2>/dev/null | cut -d= -f2 | sed 's/^["'"'"']//' | sed 's/["'"'"']$//' || echo "localhost")
        EXTERNAL_PROTOCOL=$(grep "^EXTERNAL_PROTOCOL=" .env 2>/dev/null | cut -d= -f2 | sed 's/^["'"'"']//' | sed 's/["'"'"']$//' || echo "http")
        
        # Remove any whitespace
        EXTERNAL_HOST=$(echo "$EXTERNAL_HOST" | xargs)
        EXTERNAL_PROTOCOL=$(echo "$EXTERNAL_PROTOCOL" | xargs)
        
        # Set defaults if empty
        EXTERNAL_HOST=${EXTERNAL_HOST:-localhost}
        EXTERNAL_PROTOCOL=${EXTERNAL_PROTOCOL:-http}
        
        print_success "Configuration loaded:"
        print_info "  External Host: $EXTERNAL_HOST"
        print_info "  Protocol: $EXTERNAL_PROTOCOL"
    else
        print_error ".env file not found"
        exit 1
    fi
}

# Check if domain is valid
validate_domain() {
    print_step "Validating domain name..."
    
    # Check if it's an IP address
    if [[ $EXTERNAL_HOST =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        print_error "Let's Encrypt requires a domain name, not an IP address: $EXTERNAL_HOST"
        print_info "For IP addresses, use the self-signed certificate generator: ./generate-ssl-certs.sh"
        exit 1
    fi
    
    # Check if it's localhost
    if [[ "$EXTERNAL_HOST" == "localhost" ]]; then
        print_error "Let's Encrypt cannot issue certificates for localhost"
        print_info "For localhost, use the self-signed certificate generator: ./generate-ssl-certs.sh"
        exit 1
    fi
    
    # Check if domain resolves to this server
    print_info "Checking if domain resolves to this server..."
    local domain_ip=$(dig +short "$EXTERNAL_HOST" | tail -n1)
    local server_ip=$(curl -s https://ifconfig.me || curl -s https://api.ipify.org)
    
    if [[ -n "$domain_ip" && -n "$server_ip" ]]; then
        if [[ "$domain_ip" == "$server_ip" ]]; then
            print_success "Domain $EXTERNAL_HOST resolves to this server ($server_ip)"
        else
            print_warning "Domain $EXTERNAL_HOST resolves to $domain_ip, but this server is $server_ip"
            print_warning "This may cause Let's Encrypt validation to fail"
            echo ""
            read -p "Continue anyway? (y/n): " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_info "Certificate generation cancelled"
                exit 0
            fi
        fi
    else
        print_warning "Could not verify DNS resolution"
    fi
}

# Check dependencies
check_dependencies() {
    print_step "Checking dependencies..."
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        print_info "Installing certbot..."
        
        # Detect OS and install certbot
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            if command -v apt-get &> /dev/null; then
                # Ubuntu/Debian
                sudo apt-get update
                sudo apt-get install -y certbot
            elif command -v yum &> /dev/null; then
                # CentOS/RHEL
                sudo yum install -y certbot
            elif command -v dnf &> /dev/null; then
                # Fedora
                sudo dnf install -y certbot
            else
                print_error "Unable to install certbot automatically"
                print_info "Please install certbot manually and run this script again"
                exit 1
            fi
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command -v brew &> /dev/null; then
                brew install certbot
            else
                print_error "Homebrew not found. Please install certbot manually"
                exit 1
            fi
        else
            print_error "Unsupported operating system"
            exit 1
        fi
        
        print_success "Certbot installed successfully"
    else
        print_success "Certbot is already installed"
    fi
    
    # Check if dig is available
    if ! command -v dig &> /dev/null; then
        print_warning "dig not found, DNS validation may be limited"
    fi
}

# Create directories
create_directories() {
    print_step "Creating Let's Encrypt directories..."
    
    mkdir -p "$LETSENCRYPT_DIR"
    mkdir -p "$CERTBOT_WORK_DIR"
    mkdir -p "$CERTBOT_LOGS_DIR"
    mkdir -p "$NGINX_CERTS_DIR"
    
    print_success "Directories created"
}

# Stop nginx temporarily for standalone mode
stop_nginx() {
    print_step "Temporarily stopping nginx for certificate generation..."
    
    if docker-compose ps nginx | grep -q "Up"; then
        docker-compose stop nginx
        print_success "Nginx stopped"
        return 0
    else
        print_info "Nginx is not running"
        return 1
    fi
}

# Start nginx
start_nginx() {
    print_step "Starting nginx..."
    docker-compose up -d nginx
    print_success "Nginx started"
}

# Generate Let's Encrypt certificate
generate_letsencrypt_cert() {
    print_step "Generating Let's Encrypt certificate for $EXTERNAL_HOST..."
    
    # Use standalone mode since we temporarily stopped nginx
    local certbot_cmd="certbot certonly --standalone"
    certbot_cmd="$certbot_cmd --non-interactive --agree-tos"
    certbot_cmd="$certbot_cmd --email admin@$EXTERNAL_HOST"
    certbot_cmd="$certbot_cmd --domains $EXTERNAL_HOST"
    certbot_cmd="$certbot_cmd --work-dir $CERTBOT_WORK_DIR"
    certbot_cmd="$certbot_cmd --config-dir $LETSENCRYPT_DIR"
    certbot_cmd="$certbot_cmd --logs-dir $CERTBOT_LOGS_DIR"
    
    print_info "Running: $certbot_cmd"
    
    if eval "$certbot_cmd"; then
        print_success "Let's Encrypt certificate generated successfully"
        return 0
    else
        print_error "Failed to generate Let's Encrypt certificate"
        print_info "Common causes:"
        print_info "- Domain does not point to this server"
        print_info "- Port 80 is blocked by firewall"
        print_info "- Rate limit exceeded (5 certificates per week per domain)"
        return 1
    fi
}

# Copy certificates to nginx directory
copy_certificates() {
    print_step "Copying certificates to nginx directory..."
    
    local cert_path="$LETSENCRYPT_DIR/live/$EXTERNAL_HOST"
    
    if [ -d "$cert_path" ]; then
        cp "$cert_path/fullchain.pem" "$NGINX_CERTS_DIR/server.crt"
        cp "$cert_path/privkey.pem" "$NGINX_CERTS_DIR/server.key"
        
        # Set proper permissions
        chmod 644 "$NGINX_CERTS_DIR/server.crt"
        chmod 600 "$NGINX_CERTS_DIR/server.key"
        
        print_success "Certificates copied to nginx directory"
        
        # Copy to backup location
        cp "$cert_path/fullchain.pem" "$CERTS_DIR/server.crt"
        cp "$cert_path/privkey.pem" "$CERTS_DIR/server.key"
        
        return 0
    else
        print_error "Certificate directory not found: $cert_path"
        return 1
    fi
}

# Create certificate renewal script
create_renewal_script() {
    print_step "Creating certificate renewal script..."
    
    local renewal_script="$SCRIPT_DIR/renew-ssl-certs.sh"
    
    cat > "$renewal_script" << 'EOF'
#!/bin/bash

# SSL Certificate Renewal Script for SSO Hub
# Automatically renews Let's Encrypt certificates

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LETSENCRYPT_DIR="$SCRIPT_DIR/infra/letsencrypt"
NGINX_CERTS_DIR="$SCRIPT_DIR/infra/nginx/ssl"
CERTS_DIR="$SCRIPT_DIR/infra/ssl-certs"

# Load configuration
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
    EXTERNAL_HOST=${EXTERNAL_HOST:-localhost}
else
    echo "Error: .env file not found"
    exit 1
fi

echo "Renewing SSL certificate for: $EXTERNAL_HOST"

# Try to renew certificate
if certbot renew --config-dir "$LETSENCRYPT_DIR" --work-dir "$LETSENCRYPT_DIR/work" --logs-dir "$LETSENCRYPT_DIR/logs"; then
    echo "Certificate renewal successful"
    
    # Copy renewed certificates
    cert_path="$LETSENCRYPT_DIR/live/$EXTERNAL_HOST"
    if [ -d "$cert_path" ]; then
        cp "$cert_path/fullchain.pem" "$NGINX_CERTS_DIR/server.crt"
        cp "$cert_path/privkey.pem" "$NGINX_CERTS_DIR/server.key"
        cp "$cert_path/fullchain.pem" "$CERTS_DIR/server.crt"
        cp "$cert_path/privkey.pem" "$CERTS_DIR/server.key"
        
        chmod 644 "$NGINX_CERTS_DIR/server.crt" "$CERTS_DIR/server.crt"
        chmod 600 "$NGINX_CERTS_DIR/server.key" "$CERTS_DIR/server.key"
        
        echo "Certificates updated"
        
        # Restart nginx to load new certificates
        if command -v docker-compose &> /dev/null; then
            docker-compose restart nginx
            echo "Nginx restarted with new certificates"
        fi
    else
        echo "Error: Certificate directory not found"
        exit 1
    fi
else
    echo "Certificate renewal failed"
    exit 1
fi
EOF

    chmod +x "$renewal_script"
    print_success "Renewal script created: $renewal_script"
}

# Create cron job for automatic renewal
setup_auto_renewal() {
    print_step "Setting up automatic certificate renewal..."
    
    local renewal_script="$SCRIPT_DIR/renew-ssl-certs.sh"
    local cron_entry="0 3 * * 1 $renewal_script >> $SCRIPT_DIR/ssl-renewal.log 2>&1"
    
    # Check if cron entry already exists
    if crontab -l 2>/dev/null | grep -q "$renewal_script"; then
        print_info "Automatic renewal is already configured"
    else
        # Add cron entry
        (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
        print_success "Automatic renewal configured (runs every Monday at 3 AM)"
    fi
    
    print_info "To manually renew certificates, run: $renewal_script"
}

# Update .env for HTTPS
update_env_for_https() {
    print_step "Updating .env for HTTPS..."
    
    # Update EXTERNAL_PROTOCOL to https
    sed -i.backup 's/^EXTERNAL_PROTOCOL=.*/EXTERNAL_PROTOCOL=https/' .env
    
    # Update URLs that should use HTTPS
    local https_frontend_url="https://${EXTERNAL_HOST}"
    local https_keycloak_url="https://${EXTERNAL_HOST}:8080"
    local https_auth_bff_url="https://${EXTERNAL_HOST}:3002"
    
    sed -i.backup \
        -e "s|^FRONTEND_URL=.*|FRONTEND_URL=$https_frontend_url|" \
        -e "s|^CORS_ORIGIN=.*|CORS_ORIGIN=$https_frontend_url|" \
        -e "s|^KEYCLOAK_PUBLIC_URL=.*|KEYCLOAK_PUBLIC_URL=$https_keycloak_url/realms/sso-hub|" \
        -e "s|^OIDC_REDIRECT_URI=.*|OIDC_REDIRECT_URI=$https_auth_bff_url/auth/callback|" \
        .env
        
    print_success "Environment configuration updated for HTTPS"
}

# Validate generated certificate
validate_certificate() {
    print_step "Validating generated certificate..."
    
    local cert_file="$NGINX_CERTS_DIR/server.crt"
    
    if [ -f "$cert_file" ]; then
        # Check if certificate is valid
        if openssl x509 -in "$cert_file" -text -noout > /dev/null 2>&1; then
            print_success "Certificate validation passed"
            
            # Show certificate details
            local subject=$(openssl x509 -in "$cert_file" -subject -noout | sed 's/subject=//')
            local issuer=$(openssl x509 -in "$cert_file" -issuer -noout | sed 's/issuer=//')
            local expiry=$(openssl x509 -in "$cert_file" -dates -noout | grep notAfter | sed 's/notAfter=//')
            
            print_info "Certificate details:"
            print_info "  Subject: $subject"
            print_info "  Issuer: $issuer"
            print_info "  Expires: $expiry"
            
            return 0
        else
            print_error "Certificate validation failed"
            return 1
        fi
    else
        print_error "Certificate file not found: $cert_file"
        return 1
    fi
}

# Main execution
main() {
    print_header
    
    # Load configuration
    load_config
    
    # Validate domain
    validate_domain
    
    # Check dependencies
    check_dependencies
    
    # Create directories
    create_directories
    
    # Confirm with user
    print_warning "This will:"
    print_warning "1. Temporarily stop nginx"
    print_warning "2. Generate a Let's Encrypt SSL certificate for: $EXTERNAL_HOST"
    print_warning "3. Configure automatic renewal"
    print_warning "4. Update .env configuration for HTTPS"
    print_warning "5. Restart all services"
    echo ""
    read -p "Continue? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Certificate generation cancelled"
        exit 0
    fi
    
    # Stop nginx temporarily
    local nginx_was_running=false
    if stop_nginx; then
        nginx_was_running=true
    fi
    
    # Generate certificate
    if generate_letsencrypt_cert; then
        # Copy certificates
        if copy_certificates; then
            # Update environment
            update_env_for_https
            
            # Create renewal script
            create_renewal_script
            
            # Setup auto renewal
            setup_auto_renewal
            
            # Start nginx
            if $nginx_was_running; then
                start_nginx
            fi
            
            # Validate certificate
            validate_certificate
            
            echo ""
            print_success "🎉 Let's Encrypt SSL certificate setup completed successfully!"
            echo ""
            print_info "Your SSO Hub is now configured with a valid SSL certificate:"
            print_info "  • HTTPS URL: https://$EXTERNAL_HOST"
            print_info "  • Certificate: Valid Let's Encrypt certificate"
            print_info "  • Auto-renewal: Configured (every Monday at 3 AM)"
            echo ""
            print_info "Next steps:"
            print_info "1. Restart all services: docker-compose down && docker-compose up -d"
            print_info "2. Access via HTTPS: https://$EXTERNAL_HOST"
            print_info "3. Certificate will auto-renew before expiration"
            
        else
            print_error "Failed to copy certificates"
            if $nginx_was_running; then
                start_nginx
            fi
            exit 1
        fi
    else
        print_error "Failed to generate Let's Encrypt certificate"
        if $nginx_was_running; then
            start_nginx
        fi
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    -h|--help)
        echo "Let's Encrypt SSL Certificate Setup for SSO Hub"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  -h, --help    Show this help message"
        echo ""
        echo "This script generates valid SSL certificates using Let's Encrypt."
        echo "It requires a domain name (not IP address) that points to this server."
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