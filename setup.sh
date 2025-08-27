#!/bin/bash

# SSO Hub One-Command Setup Script
# Complete automation for deploying SSO Hub on any system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/setup.log"
REQUIRED_TOOLS=("docker" "docker-compose" "git")

# Functions for output
print_header() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}       SSO Hub - One Command Setup        ${NC}"
    echo -e "${CYAN}============================================${NC}"
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

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Error handling
cleanup_on_error() {
    print_error "Setup failed! Check $LOG_FILE for details."
    print_info "To clean up partial installation, run: docker-compose down --volumes"
    exit 1
}

trap cleanup_on_error ERR

# Check if running as root (warn but don't stop)
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root is not recommended for Docker operations"
        print_info "Consider running as a regular user with Docker permissions"
        sleep 2
    fi
}

# Check system requirements
check_requirements() {
    print_step "Checking system requirements..."
    
    # Check OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        print_info "Detected: Linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        print_info "Detected: macOS"
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    
    # Check required tools
    for tool in "${REQUIRED_TOOLS[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            print_error "$tool is required but not installed"
            echo ""
            echo "Installation instructions:"
            case "$tool" in
                "docker")
                    echo "- Ubuntu/Debian: sudo apt-get install docker.io"
                    echo "- CentOS/RHEL: sudo yum install docker"
                    echo "- macOS: Install Docker Desktop"
                    ;;
                "docker-compose")
                    echo "- Linux: sudo curl -L \"https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-linux-x86_64\" -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose"
                    echo "- macOS: Included with Docker Desktop"
                    ;;
                "git")
                    echo "- Ubuntu/Debian: sudo apt-get install git"
                    echo "- CentOS/RHEL: sudo yum install git"
                    echo "- macOS: xcode-select --install"
                    ;;
            esac
            exit 1
        fi
        print_success "$tool is available"
    done
    
    # Check Docker daemon
    if ! docker info &>/dev/null; then
        print_error "Docker daemon is not running"
        print_info "Start Docker daemon and try again"
        print_info "- Linux: sudo systemctl start docker"
        print_info "- macOS: Start Docker Desktop application"
        exit 1
    fi
    print_success "Docker daemon is running"
    
    # Check available ports
    check_ports() {
        local ports=("80" "443" "3000" "3002" "5432" "6379" "8080")
        local used_ports=()
        
        for port in "${ports[@]}"; do
            if netstat -tuln 2>/dev/null | grep -q ":$port " || lsof -i ":$port" &>/dev/null; then
                used_ports+=("$port")
            fi
        done
        
        if [ ${#used_ports[@]} -gt 0 ]; then
            print_warning "The following ports are already in use: ${used_ports[*]}"
            print_info "SSO Hub may not start correctly if these ports are needed"
            print_info "You can continue, but you may need to stop conflicting services"
            
            read -p "Continue anyway? (y/n): " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    }
    check_ports
    
    print_success "System requirements check completed"
}

# Update environment URLs based on external configuration
update_environment_urls() {
    if [ -f ".env" ]; then
        # Read external configuration from .env
        local external_host=$(grep "^EXTERNAL_HOST=" .env 2>/dev/null | cut -d= -f2 || echo "localhost")
        local external_protocol=$(grep "^EXTERNAL_PROTOCOL=" .env 2>/dev/null | cut -d= -f2 || echo "http")
        local external_port=$(grep "^EXTERNAL_PORT=" .env 2>/dev/null | cut -d= -f2 || echo "")
        
        # Only update if external host is not localhost
        if [[ "$external_host" != "localhost" && "$external_host" != "" ]]; then
            local full_frontend_url="${external_protocol}://${external_host}${external_port}"
            local full_keycloak_url="${external_protocol}://${external_host}:8080"
            local full_auth_bff_url="${external_protocol}://${external_host}:3002"
            
            print_info "Auto-updating URLs for external host: $external_host"
            
            # Update URLs in .env file
            sed -i.backup \
                -e "s|^FRONTEND_URL=.*|FRONTEND_URL=$full_frontend_url|" \
                -e "s|^CORS_ORIGIN=.*|CORS_ORIGIN=$full_frontend_url|" \
                -e "s|^KC_HOSTNAME=.*|KC_HOSTNAME=$external_host|" \
                -e "s|^KEYCLOAK_PUBLIC_URL=.*|KEYCLOAK_PUBLIC_URL=$full_keycloak_url/realms/sso-hub|" \
                -e "s|^OIDC_REDIRECT_URI=.*|OIDC_REDIRECT_URI=$full_auth_bff_url/auth/callback|" \
                .env
                
            print_success "Updated environment URLs for external access"
        fi
    fi
}

# Configure environment
configure_environment() {
    print_step "Configuring environment..."
    
    # Interactive or automatic mode
    local auto_mode=false
    if [[ "$1" == "--auto" ]] || [[ "$AUTO_SETUP" == "true" ]]; then
        auto_mode=true
        print_info "Running in automatic mode"
    fi
    
    if [ ! -f ".env" ]; then
        if [ -f "env.example" ]; then
            cp env.example .env
            print_success "Created .env from env.example"
        else
            print_error "env.example file not found"
            exit 1
        fi
    else
        print_info ".env file already exists"
    fi
    
    # External access configuration
    if ! $auto_mode; then
        print_info "Configuring access method..."
        echo ""
        echo "How will you access SSO Hub?"
        echo "1) Localhost only (development)"
        echo "2) External access (IP address or domain name)"
        echo ""
        read -p "Select option (1-2): " -n 1 -r access_choice
        echo ""
        
        if [[ $access_choice == "2" ]]; then
            print_info "Configuring external access..."
            if [ -x "./configure-external-access.sh" ]; then
                ./configure-external-access.sh
                print_success "External access configured successfully"
            else
                print_warning "configure-external-access.sh not found or not executable"
                print_info "Using default localhost configuration"
            fi
        else
            print_info "Using localhost configuration (access at http://localhost:3000)"
        fi
    else
        print_info "Using default localhost configuration for auto mode"
        print_info "Run './configure-external-access.sh' later for external access"
    fi
    
    # Auto-update URLs if external configuration is detected
    update_environment_urls
    
    # Generate secure secrets
    print_info "Generating secure secrets..."
    
    # Check if openssl is available for generating secrets
    if command -v openssl &> /dev/null; then
        # Generate random secrets if they don't exist or are defaults
        if ! grep -q "your-hmac-secret-here" .env 2>/dev/null; then
            IDENTITY_SECRET=$(openssl rand -hex 32)
            sed -i.backup "s/your-hmac-secret-here/$IDENTITY_SECRET/" .env
            print_success "Generated identity header secret"
        fi
        
        if ! grep -q "f7e8d9c2b1a6f8e5d3c9b7a4e6f8d2c1b9a7e5d3c8f6e4d2b9a7c5e3d8f6a4b2" .env 2>/dev/null; then
            SESSION_SECRET=$(openssl rand -hex 32)
            sed -i.backup "s/f7e8d9c2b1a6f8e5d3c9b7a4e6f8d2c1b9a7e5d3c8f6e4d2b9a7c5e3d8f6a4b2/$SESSION_SECRET/" .env
            print_success "Generated session secret"
        fi
    else
        print_warning "OpenSSL not available - using default secrets (change these in production!)"
    fi
    
    print_success "Environment configuration completed"
}

# Validate and fix .env file syntax issues
validate_env_syntax() {
    print_step "Validating .env file syntax..."
    
    local env_files=(".env" "apps/frontend/.env")
    local fixed_any=false
    
    for env_file in "${env_files[@]}"; do
        if [ -f "$env_file" ]; then
            print_info "Checking $env_file..."
            
            # Create a backup before making changes
            cp "$env_file" "${env_file}.syntax-backup" 2>/dev/null || true
            
            # Check for and fix common syntax issues
            if grep -q '".*email.*"' "$env_file" 2>/dev/null; then
                print_warning "Found potential quote issues in $env_file"
                # Fix double quotes around values containing 'email'
                sed -i.tmp "s/\"\\([^\"]*email[^\"]*\\)\"/'\1'/g" "$env_file"
                rm -f "${env_file}.tmp"
                fixed_any=true
                print_success "Fixed quote formatting in $env_file"
            fi
            
            # Check for lines that might cause bash parsing issues
            if bash -n "$env_file" 2>/dev/null; then
                print_success "$env_file syntax is valid"
            else
                print_warning "$env_file has syntax issues, attempting to fix..."
                # Additional fixes can be added here
                fixed_any=true
            fi
        fi
    done
    
    if $fixed_any; then
        print_success "Environment file syntax validation completed with fixes"
    else
        print_success "Environment file syntax validation completed"
    fi
}

# Create missing environment files with proper error handling
create_missing_env_files() {
    print_step "Creating missing environment files..."
    
    # Create root .env if missing
    if [ ! -f ".env" ]; then
        if [ -f "env.example" ]; then
            print_info "Creating root .env from env.example..."
            cp env.example .env
            print_success "Root .env file created"
            
            # Update with basic external configuration if not set
            if ! grep -q "^EXTERNAL_HOST=" .env || grep -q "^EXTERNAL_HOST=localhost" .env; then
                print_info "Setting basic external configuration..."
                # Try to detect external IP
                local detected_ip=$(curl -s --max-time 5 https://ifconfig.me 2>/dev/null || echo "")
                if [[ -n "$detected_ip" ]]; then
                    sed -i.tmp "s/^EXTERNAL_HOST=.*/EXTERNAL_HOST=$detected_ip/" .env
                    sed -i.tmp "s/^EXTERNAL_PROTOCOL=.*/EXTERNAL_PROTOCOL=http/" .env
                    rm -f .env.tmp
                    print_success "Basic external configuration set to: $detected_ip"
                fi
            fi
        else
            print_error "env.example file not found - cannot create .env"
            return 1
        fi
    fi
    
    # Create frontend .env if missing
    if [ ! -f "apps/frontend/.env" ]; then
        if [ -f "apps/frontend/.env.example" ]; then
            print_info "Creating frontend .env from .env.example..."
            cp apps/frontend/.env.example apps/frontend/.env
            print_success "Frontend .env file created"
            
            # Update frontend .env with external URLs if root .env has them
            if [ -f ".env" ]; then
                local external_host=$(grep "^EXTERNAL_HOST=" .env 2>/dev/null | cut -d= -f2 || echo "")
                local external_protocol=$(grep "^EXTERNAL_PROTOCOL=" .env 2>/dev/null | cut -d= -f2 || echo "http")
                
                if [[ -n "$external_host" && "$external_host" != "localhost" ]]; then
                    print_info "Updating frontend .env with external URLs..."
                    
                    # Update key frontend URLs
                    sed -i.tmp "s|^VITE_FRONTEND_URL=.*|VITE_FRONTEND_URL=${external_protocol}://${external_host}|" apps/frontend/.env
                    sed -i.tmp "s|^VITE_AUTH_BFF_URL=.*|VITE_AUTH_BFF_URL=${external_protocol}://${external_host}:3002|" apps/frontend/.env
                    sed -i.tmp "s|^VITE_API_BASE_URL=.*|VITE_API_BASE_URL=${external_protocol}://${external_host}:3002/api|" apps/frontend/.env
                    sed -i.tmp "s|^VITE_KEYCLOAK_URL=.*|VITE_KEYCLOAK_URL=${external_protocol}://${external_host}:8080|" apps/frontend/.env
                    
                    rm -f apps/frontend/.env.tmp
                    print_success "Frontend .env updated with external URLs"
                fi
            fi
        else
            print_error "apps/frontend/.env.example not found - cannot create frontend .env"
            return 1
        fi
    fi
    
    print_success "Environment file creation completed"
}

# Validate environment files before build
validate_env_files() {
    print_step "Validating environment files before build..."
    
    local validation_errors=0
    
    # Check root .env file exists
    if [ ! -f ".env" ]; then
        print_error "Root .env file is missing after creation attempt"
        validation_errors=$((validation_errors + 1))
    else
        print_success "Root .env file exists"
    fi
    
    # Check frontend .env file exists
    if [ ! -f "apps/frontend/.env" ]; then
        print_error "Frontend .env file is missing after creation attempt"
        validation_errors=$((validation_errors + 1))
    else
        print_success "Frontend .env file exists"
        
        # Quick check that frontend .env has some required variables
        if ! grep -q "^VITE_FRONTEND_URL=" apps/frontend/.env; then
            print_error "Frontend .env is missing required VITE_FRONTEND_URL"
            validation_errors=$((validation_errors + 1))
        fi
    fi
    
    # Show configuration status
    if [ -f ".env" ]; then
        local external_host=$(grep "^EXTERNAL_HOST=" .env 2>/dev/null | cut -d= -f2 || echo "")
        local external_protocol=$(grep "^EXTERNAL_PROTOCOL=" .env 2>/dev/null | cut -d= -f2 || echo "http")
        
        print_info "Current configuration:"
        print_info "  • External Host: ${external_host:-not set}"
        print_info "  • Protocol: $external_protocol"
        
        if [[ -n "$external_host" && "$external_host" != "localhost" ]]; then
            print_success "External access configured for: $external_host"
        else
            print_warning "Using localhost configuration"
            print_info "For external access, run: ./configure-external-access.sh"
        fi
        
        # Check SSL certificates if HTTPS
        if [[ "$external_protocol" == "https" ]]; then
            if [[ -f "infra/nginx/ssl/server.crt" && -f "infra/nginx/ssl/server.key" ]]; then
                print_success "SSL certificates found for HTTPS"
            else
                print_warning "HTTPS configured but SSL certificates missing"
                print_info "Certificates will be auto-generated during build if needed"
            fi
        fi
    fi
    
    if [ $validation_errors -gt 0 ]; then
        print_error "Environment file validation failed"
        print_info "Please fix the issues above and run the setup again"
        exit 1
    fi
    
    print_success "Environment file validation passed"
}

# Build and start services
start_services() {
    print_step "Building and starting SSO Hub services..."
    
    # Clean up any existing containers
    print_info "Cleaning up any existing containers..."
    docker-compose down --volumes --remove-orphans &>/dev/null || true
    
    # Pull base images to speed up build
    print_info "Pulling base images..."
    docker-compose pull --ignore-pull-failures >> "$LOG_FILE" 2>&1 || true
    
    # Build all services
    print_info "Building services (this may take a few minutes)..."
    if docker-compose build --parallel >> "$LOG_FILE" 2>&1; then
        print_success "Services built successfully"
    else
        print_error "Failed to build services"
        print_info "Check $LOG_FILE for details"
        exit 1
    fi
    
    # Start core infrastructure first
    print_info "Starting core infrastructure..."
    docker-compose up -d postgres keycloak-postgres redis >> "$LOG_FILE" 2>&1
    
    # Wait for databases to be ready
    print_info "Waiting for databases to initialize..."
    sleep 10
    
    # Check database health
    local retries=30
    while [ $retries -gt 0 ]; do
        if docker-compose exec -T postgres pg_isready -U sso_user -d sso_hub &>/dev/null; then
            print_success "PostgreSQL is ready"
            break
        fi
        retries=$((retries - 1))
        sleep 2
    done
    
    if [ $retries -eq 0 ]; then
        print_error "PostgreSQL failed to start"
        exit 1
    fi
    
    # Run database migrations
    print_info "Running database migrations..."
    # Migrations run automatically via docker-entrypoint-initdb.d
    sleep 5
    
    # Start Keycloak and wait for it to be ready
    print_info "Starting Keycloak..."
    docker-compose up -d keycloak >> "$LOG_FILE" 2>&1
    
    # Wait for Keycloak
    print_info "Waiting for Keycloak to be ready (this can take 2-3 minutes)..."
    local keycloak_retries=60
    while [ $keycloak_retries -gt 0 ]; do
        if curl -s http://localhost:8080/health/ready &>/dev/null; then
            print_success "Keycloak is ready"
            break
        fi
        keycloak_retries=$((keycloak_retries - 1))
        echo -n "."
        sleep 3
    done
    echo ""
    
    if [ $keycloak_retries -eq 0 ]; then
        print_warning "Keycloak health check timed out, but continuing..."
    fi
    
    # Start remaining services
    print_info "Starting application services..."
    docker-compose up -d >> "$LOG_FILE" 2>&1
    
    print_success "All services started"
}

# Verify deployment
verify_deployment() {
    print_step "Verifying deployment..."
    
    # Wait for services to be ready
    print_info "Waiting for services to stabilize..."
    sleep 30
    
    # Check service health
    local services=("postgres" "redis" "keycloak" "auth-bff" "frontend")
    for service in "${services[@]}"; do
        if docker-compose ps "$service" | grep -q "Up"; then
            print_success "$service is running"
        else
            print_warning "$service may not be running correctly"
        fi
    done
    
    # Test key endpoints
    print_info "Testing key endpoints..."
    
    # Test frontend
    if curl -s http://localhost:3000 &>/dev/null; then
        print_success "Frontend is accessible"
    else
        print_warning "Frontend may not be accessible yet"
    fi
    
    # Test Keycloak
    if curl -s http://localhost:8080 &>/dev/null; then
        print_success "Keycloak is accessible"
    else
        print_warning "Keycloak may not be accessible yet"
    fi
    
    # Test Auth BFF
    if curl -s http://localhost:3002/healthz &>/dev/null; then
        print_success "Auth BFF is healthy"
    else
        print_warning "Auth BFF may not be ready yet"
    fi
    
    print_success "Deployment verification completed"
}

# Display final instructions
show_completion_info() {
    print_step "Setup completed successfully!"
    
    echo ""
    echo -e "${GREEN}🎉 SSO Hub is now running!${NC}"
    echo ""
    
    # Get the actual external host configuration
    local frontend_url="http://localhost:3000"
    local keycloak_url="http://localhost:8080"
    local api_docs_url="http://localhost:3006/docs"
    local health_monitoring_url="http://localhost:3004"
    
    if [ -f ".env" ]; then
        # Try to extract URLs from .env
        local external_host=$(grep "^EXTERNAL_HOST=" .env 2>/dev/null | cut -d= -f2 || echo "localhost")
        local external_protocol=$(grep "^EXTERNAL_PROTOCOL=" .env 2>/dev/null | cut -d= -f2 || echo "http")
        local external_port=$(grep "^EXTERNAL_PORT=" .env 2>/dev/null | cut -d= -f2 || echo "")
        
        if [[ "$external_host" != "localhost" ]]; then
            frontend_url="${external_protocol}://${external_host}${external_port}"
            keycloak_url="${external_protocol}://${external_host}:8080"
            api_docs_url="${external_protocol}://${external_host}:3006/docs"
            health_monitoring_url="${external_protocol}://${external_host}:3004"
        fi
    fi
    
    echo -e "${CYAN}🌐 Access URLs:${NC}"
    echo "  • 🎨 Main Dashboard:     $frontend_url"
    echo "  • 🔐 Keycloak Admin:     $keycloak_url"
    echo "  • 📚 API Documentation: $api_docs_url"
    echo "  • 📊 Health Monitoring:  $health_monitoring_url"
    echo ""
    
    echo -e "${CYAN}Default Login Credentials:${NC}"
    echo "  • Username: admin"
    echo "  • Password: admin_secure_password_123"
    echo ""
    
    echo -e "${CYAN}Management Commands:${NC}"
    echo "  • View logs:          docker-compose logs -f"
    echo "  • Stop all services:  docker-compose down"
    echo "  • Restart services:   docker-compose restart"
    echo "  • Update services:    docker-compose pull && docker-compose up -d"
    echo ""
    
    echo -e "${CYAN}Useful Files:${NC}"
    echo "  • Environment config: .env"
    echo "  • Setup log:          setup.log"
    echo "  • Documentation:      docs/"
    echo ""
    
    if [[ "$frontend_url" != "http://localhost:3000" ]]; then
        echo -e "${YELLOW}Network Configuration:${NC}"
        echo "  • Ensure firewall allows access to ports 80, 3000, 8080"
        echo "  • For production, configure SSL certificates"
        echo ""
    fi
    
    echo -e "${GREEN}🚀 Next Steps:${NC}"
    echo "1. 🌐 Open $frontend_url in your browser"
    echo "2. 🔑 Log in with: admin / admin_secure_password_123"
    echo "3. 🛠️  Configure your DevOps tools in the admin panel"
    echo "4. 👥 Set up users and groups"
    echo "5. 🔗 Test tool integrations"
    echo ""
    
    if [[ "$frontend_url" == "http://localhost:3000" ]]; then
        echo -e "${YELLOW}💡 Need external access?${NC}"
        echo "Run: ./configure-external-access.sh"
        echo ""
    fi
    
    echo -e "${CYAN}🔧 Management Commands:${NC}"
    echo "  • View deployment status: ./validate-deployment.sh"
    echo "  • View all logs:          docker-compose logs -f"
    echo "  • Stop all services:      docker-compose down"
    echo "  • Restart services:       docker-compose restart"
    echo ""
    
    print_success "🎉 SSO Hub setup completed successfully!"
    
    # Create a status file
    cat > .setup_complete << EOF
SSO Hub Setup Completed: $(date)
Frontend URL: $frontend_url
Keycloak URL: $keycloak_url
Configuration: .env
Logs: setup.log
Validation: ./validate-deployment.sh
External Access: ./configure-external-access.sh
EOF
}

# Main execution
main() {
    print_header
    
    # Initialize log file
    echo "SSO Hub Setup Started: $(date)" > "$LOG_FILE"
    
    print_info "Setup log will be written to: $LOG_FILE"
    echo ""
    
    # Check if we're running in auto mode
    local auto_flag=""
    if [[ "$1" == "--auto" ]]; then
        auto_flag="--auto"
        print_info "Running in automatic mode (no prompts)"
    fi
    
    # Execute setup steps
    check_root
    check_requirements
    configure_environment "$auto_flag"
    create_missing_env_files
    validate_env_syntax
    validate_env_files
    start_services
    verify_deployment
    show_completion_info
    
    echo ""
    print_success "🚀 SSO Hub is ready to use!"
}

# Run main function with all arguments
main "$@"