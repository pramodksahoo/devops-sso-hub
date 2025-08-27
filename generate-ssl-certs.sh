#!/bin/bash

# SSL Certificate Generation Script
# Generates self-signed certificates for any IP address or domain name
# Supports both development and production scenarios

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
    echo -e "${BLUE}     SSO Hub SSL Certificate Generator     ${NC}"
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

# Default values
DEFAULT_COUNTRY="US"
DEFAULT_STATE="California"
DEFAULT_CITY="San Francisco"
DEFAULT_ORG="SSO Hub"
DEFAULT_UNIT="DevOps"
VALIDITY_DAYS=365

# Detect operating system for platform-specific adjustments
detect_platform() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        PLATFORM="macos"
        print_info "Platform: macOS"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        PLATFORM="linux"
        print_info "Platform: Linux"
    else
        PLATFORM="unknown"
        print_warning "Unknown platform: $OSTYPE"
    fi
}

# Load configuration from .env if available
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
        
        print_success "Configuration loaded from .env:"
        print_info "  External Host: $EXTERNAL_HOST"
        print_info "  Protocol: $EXTERNAL_PROTOCOL"
    else
        print_warning ".env file not found, using defaults"
        EXTERNAL_HOST="localhost"
        EXTERNAL_PROTOCOL="http"
    fi
}

# Create directories
create_directories() {
    print_step "Creating certificate directories..."
    
    mkdir -p "$CERTS_DIR"
    mkdir -p "$NGINX_CERTS_DIR"
    
    print_success "Directories created"
}

# Detect if host is IP address or domain
detect_host_type() {
    if [[ $EXTERNAL_HOST =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        HOST_TYPE="ip"
        print_info "Detected IP address: $EXTERNAL_HOST"
    else
        HOST_TYPE="domain"
        print_info "Detected domain name: $EXTERNAL_HOST"
    fi
}

# Generate certificate configuration
generate_cert_config() {
    print_step "Generating certificate configuration..."
    
    local config_file="$CERTS_DIR/openssl.conf"
    
    # Create a cross-platform compatible OpenSSL config
    cat > "$config_file" << 'EOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn
x509_extensions = v3_req

[dn]
C=US
ST=California
L=San Francisco
O=SSO Hub
OU=DevOps
EOF

    # Add the CN (Common Name) with the external host
    echo "CN=${EXTERNAL_HOST}" >> "$config_file"

    # Add extensions sections
    cat >> "$config_file" << 'EOF'

[req_ext]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
EOF

    # Add appropriate SAN entries based on host type
    if [[ "$HOST_TYPE" == "ip" ]]; then
        cat >> "$config_file" << EOF
IP.1 = ${EXTERNAL_HOST}
DNS.1 = localhost
IP.2 = 127.0.0.1
EOF
    else
        cat >> "$config_file" << EOF
DNS.1 = ${EXTERNAL_HOST}
DNS.2 = localhost
DNS.3 = *.${EXTERNAL_HOST}
IP.1 = 127.0.0.1
EOF
    fi
    
    print_success "Certificate configuration created"
    print_info "Config file: $config_file"
}

# Generate self-signed certificate
generate_certificate() {
    print_step "Generating self-signed SSL certificate..."
    
    local key_file="$CERTS_DIR/server.key"
    local cert_file="$CERTS_DIR/server.crt"
    local config_file="$CERTS_DIR/openssl.conf"
    
    # Generate private key - Use the most compatible method
    print_info "Generating RSA private key..."
    
    # Remove any existing key file first
    rm -f "$key_file"
    
    # Use genrsa which works consistently across all OpenSSL versions and platforms
    if openssl genrsa -out "$key_file" 2048 2>"$CERTS_DIR/openssl_error.log"; then
        print_success "Private key generated successfully"
        chmod 600 "$key_file"
        
        # Verify the key was created and is valid
        if [[ -f "$key_file" ]] && openssl rsa -in "$key_file" -check -noout 2>/dev/null; then
            print_success "Private key validated"
        else
            print_error "Private key validation failed"
            return 1
        fi
    else
        print_error "Failed to generate private key"
        print_error "OpenSSL error details:"
        if [[ -f "$CERTS_DIR/openssl_error.log" ]]; then
            cat "$CERTS_DIR/openssl_error.log"
        fi
        print_info "Troubleshooting:"
        print_info "- Check OpenSSL installation: $(openssl version)"
        print_info "- Check directory permissions: $CERTS_DIR"
        print_info "- Check disk space: $(df -h . | tail -1)"
        return 1
    fi
    
    # Generate certificate
    print_info "Generating X.509 certificate..."
    
    # Remove any existing certificate file first
    rm -f "$cert_file"
    
    # Generate the certificate with cross-platform compatible options
    if openssl req -new -x509 -key "$key_file" -out "$cert_file" -days $VALIDITY_DAYS -config "$config_file" -extensions req_ext 2>"$CERTS_DIR/cert_error.log"; then
        print_success "Certificate generated successfully"
        chmod 644 "$cert_file"
        
        # Verify the certificate was created and is valid
        if [[ -f "$cert_file" ]] && openssl x509 -in "$cert_file" -noout -text >/dev/null 2>&1; then
            print_success "Certificate validated"
        else
            print_error "Certificate validation failed"
            return 1
        fi
    else
        print_error "Failed to generate certificate"
        print_error "Certificate generation error details:"
        if [[ -f "$CERTS_DIR/cert_error.log" ]]; then
            cat "$CERTS_DIR/cert_error.log"
        fi
        print_error "OpenSSL configuration file contents:"
        cat "$config_file"
        print_info "Troubleshooting:"
        print_info "- OpenSSL version: $(openssl version)"
        print_info "- Config file path: $config_file"
        print_info "- Certificate output: $cert_file"
        return 1
    fi
    
    # Copy to nginx directory
    cp "$key_file" "$NGINX_CERTS_DIR/"
    cp "$cert_file" "$NGINX_CERTS_DIR/"
    
    print_success "Certificates copied to nginx directory"
}

# Generate DH parameters for enhanced security
generate_dh_params() {
    print_step "Generating DH parameters (this may take 30-60 seconds)..."
    
    local dh_file="$CERTS_DIR/dhparam.pem"
    
    # Remove any existing DH file
    rm -f "$dh_file"
    
    # Generate DH parameters with progress indication
    print_info "This process may take some time on slower systems..."
    
    # Use timeout if available, otherwise run without timeout
    local timeout_cmd=""
    if command -v timeout &> /dev/null; then
        timeout_cmd="timeout 300"
    elif command -v gtimeout &> /dev/null; then
        # macOS with coreutils installed via brew
        timeout_cmd="gtimeout 300"
    fi
    
    if $timeout_cmd openssl dhparam -out "$dh_file" 2048 2>"$CERTS_DIR/dh_error.log"; then
        print_success "DH parameters generated successfully"
        chmod 644 "$dh_file"
        cp "$dh_file" "$NGINX_CERTS_DIR/" || print_warning "Failed to copy DH params to nginx directory"
    else
        print_warning "DH parameter generation failed or timed out"
        if [[ -f "$CERTS_DIR/dh_error.log" ]]; then
            print_info "DH generation error details:"
            cat "$CERTS_DIR/dh_error.log"
        fi
        print_info "SSL will work without DH parameters, but with reduced security"
        
        # Create a simple DH params file as fallback
        print_info "Creating minimal DH parameters..."
        if openssl dhparam -out "$dh_file" 1024 2>/dev/null; then
            print_success "Minimal DH parameters created"
            cp "$dh_file" "$NGINX_CERTS_DIR/" || print_warning "Failed to copy DH params"
        else
            print_warning "Could not generate any DH parameters"
        fi
    fi
}

# Validate generated certificate
validate_certificate() {
    print_step "Validating generated certificate..."
    
    local cert_file="$CERTS_DIR/server.crt"
    
    if openssl x509 -in "$cert_file" -text -noout > /dev/null 2>&1; then
        print_success "Certificate validation passed"
        
        # Show certificate details
        print_info "Certificate details:"
        local subject=$(openssl x509 -in "$cert_file" -subject -noout | sed 's/subject=//')
        local expiry=$(openssl x509 -in "$cert_file" -dates -noout | grep notAfter | sed 's/notAfter=//')
        
        print_info "  Subject: $subject"
        print_info "  Expires: $expiry"
        
        # Show SAN entries
        local san=$(openssl x509 -in "$cert_file" -text -noout | grep -A1 "Subject Alternative Name" | tail -1 | sed 's/^[[:space:]]*//')
        if [[ -n "$san" ]]; then
            print_info "  SAN: $san"
        fi
        
        return 0
    else
        print_error "Certificate validation failed"
        return 1
    fi
}

# Create certificate summary
create_summary() {
    print_step "Creating certificate summary..."
    
    local summary_file="$CERTS_DIR/certificate-info.txt"
    local cert_file="$CERTS_DIR/server.crt"
    
    cat > "$summary_file" << EOF
SSO Hub SSL Certificate Information
===================================

Generated: $(date)
Host: ${EXTERNAL_HOST}
Type: ${HOST_TYPE}
Protocol: ${EXTERNAL_PROTOCOL}

Certificate Details:
$(openssl x509 -in "$cert_file" -text -noout)

Files Generated:
- Private Key: $CERTS_DIR/server.key
- Certificate: $CERTS_DIR/server.crt
- Config File: $CERTS_DIR/openssl.conf
- DH Params: $CERTS_DIR/dhparam.pem (if generated)

Nginx Files:
- Private Key: $NGINX_CERTS_DIR/server.key
- Certificate: $NGINX_CERTS_DIR/server.crt
- DH Params: $NGINX_CERTS_DIR/dhparam.pem (if generated)

Usage:
- For HTTPS access: https://${EXTERNAL_HOST}
- Certificate will be valid for $VALIDITY_DAYS days
- Browser will show security warning (self-signed certificate)

EOF

    print_success "Certificate summary created: $summary_file"
}

# Main execution
main() {
    print_header
    
    # Detect platform
    detect_platform
    
    # Check if openssl is available
    if ! command -v openssl &> /dev/null; then
        print_error "OpenSSL is not installed. Please install OpenSSL and try again."
        if [[ "$PLATFORM" == "macos" ]]; then
            print_info "On macOS, install with: brew install openssl"
        elif [[ "$PLATFORM" == "linux" ]]; then
            print_info "On Ubuntu/Debian: sudo apt-get install openssl"
            print_info "On RHEL/CentOS: sudo yum install openssl"
        fi
        exit 1
    fi
    
    print_info "OpenSSL version: $(openssl version)"
    
    # Load configuration
    load_config
    
    # Check if HTTPS is requested
    if [[ "$EXTERNAL_PROTOCOL" != "https" ]]; then
        print_info "EXTERNAL_PROTOCOL is not set to 'https'"
        print_info "Current protocol: $EXTERNAL_PROTOCOL"
        echo ""
        read -p "Do you want to generate SSL certificates anyway? (y/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Certificate generation cancelled"
            exit 0
        fi
    fi
    
    # Create directories
    create_directories
    
    # Detect host type
    detect_host_type
    
    # Generate configuration
    generate_cert_config
    
    # Generate certificate
    if ! generate_certificate; then
        print_error "Failed to generate certificate"
        exit 1
    fi
    
    # Generate DH parameters
    generate_dh_params
    
    # Validate certificate
    if ! validate_certificate; then
        print_error "Certificate validation failed"
        exit 1
    fi
    
    # Create summary
    create_summary
    
    echo ""
    print_success "🎉 SSL certificate generation completed successfully!"
    echo ""
    print_info "Next steps:"
    print_info "1. Update .env: EXTERNAL_PROTOCOL=https"
    print_info "2. Restart services: docker-compose down && docker-compose up -d"
    print_info "3. Access via HTTPS: https://$EXTERNAL_HOST"
    print_info "4. Accept browser security warning (self-signed certificate)"
    echo ""
    print_warning "For production, consider using Let's Encrypt or proper CA-signed certificates"
}

# Handle command line arguments
case "${1:-}" in
    -h|--help)
        echo "SSL Certificate Generator for SSO Hub"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  -h, --help    Show this help message"
        echo ""
        echo "This script generates self-signed SSL certificates for SSO Hub."
        echo "It reads configuration from .env file and creates certificates"
        echo "suitable for the configured EXTERNAL_HOST."
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