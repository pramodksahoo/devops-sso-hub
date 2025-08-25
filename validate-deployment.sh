#!/bin/bash

# SSO Hub Deployment Validation Script
# Comprehensive validation of SSO Hub deployment and external access

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
LOG_FILE="$SCRIPT_DIR/validation.log"

# Functions for output
print_header() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}       SSO Hub Deployment Validation       ${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Load environment configuration
load_config() {
    if [ -f ".env" ]; then
        # Source environment variables
        set -a
        source .env
        set +a
        
        # Set default values if not configured
        EXTERNAL_HOST=${EXTERNAL_HOST:-localhost}
        EXTERNAL_PROTOCOL=${EXTERNAL_PROTOCOL:-http}
        EXTERNAL_PORT=${EXTERNAL_PORT:-}
        
        # Calculate URLs
        FRONTEND_URL="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}${EXTERNAL_PORT}"
        KEYCLOAK_URL="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:8080"
        AUTH_BFF_URL="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3002"
        
        print_info "Configuration loaded:"
        print_info "  Frontend: $FRONTEND_URL"
        print_info "  Keycloak: $KEYCLOAK_URL"
        print_info "  Auth BFF: $AUTH_BFF_URL"
    else
        print_error ".env file not found"
        print_info "Run './configure-external-access.sh' first"
        exit 1
    fi
}

# Check Docker containers
check_containers() {
    print_step "Checking Docker containers..."
    
    # Required containers
    local required_containers=(
        "sso-postgres"
        "sso-redis" 
        "sso-keycloak"
        "sso-auth-bff"
        "sso-frontend"
        "sso-catalog"
        "sso-user-service"
    )
    
    local failed_containers=()
    
    for container in "${required_containers[@]}"; do
        if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container.*Up"; then
            print_success "$container is running"
        else
            print_error "$container is not running"
            failed_containers+=("$container")
        fi
    done
    
    if [ ${#failed_containers[@]} -gt 0 ]; then
        print_error "Some containers are not running: ${failed_containers[*]}"
        print_info "Try: docker-compose up -d"
        return 1
    fi
    
    print_success "All required containers are running"
}

# Check service health endpoints
check_health_endpoints() {
    print_step "Checking service health endpoints..."
    
    local services=(
        "http://localhost:3002/healthz:Auth BFF"
        "http://localhost:3003/healthz:User Service"
        "http://localhost:3004/healthz:Tools Health"
        "http://localhost:3006/healthz:Catalog"
        "http://localhost:3009/healthz:Audit Service"
        "http://localhost:3010/healthz:Analytics"
    )
    
    for service in "${services[@]}"; do
        local url="${service%:*}"
        local name="${service#*:}"
        
        if curl -s --max-time 10 "$url" | grep -q "ok\|healthy\|success" 2>/dev/null; then
            print_success "$name health check passed"
        else
            print_warning "$name health check failed or timeout"
        fi
    done
}

# Test external access
test_external_access() {
    print_step "Testing external access..."
    
    # Test frontend accessibility
    print_info "Testing frontend at $FRONTEND_URL..."
    if curl -s --max-time 15 "$FRONTEND_URL" >/dev/null 2>&1; then
        print_success "Frontend is accessible externally"
    else
        print_error "Frontend is not accessible at $FRONTEND_URL"
        print_info "Check network configuration and firewall settings"
        return 1
    fi
    
    # Test Keycloak accessibility  
    print_info "Testing Keycloak at $KEYCLOAK_URL..."
    if curl -s --max-time 15 "$KEYCLOAK_URL" >/dev/null 2>&1; then
        print_success "Keycloak is accessible externally"
    else
        print_error "Keycloak is not accessible at $KEYCLOAK_URL"
        print_info "Check port 8080 is open and accessible"
        return 1
    fi
    
    # Test Auth BFF API
    print_info "Testing Auth BFF API at $AUTH_BFF_URL/healthz..."
    if curl -s --max-time 10 "$AUTH_BFF_URL/healthz" >/dev/null 2>&1; then
        print_success "Auth BFF API is accessible externally"
    else
        print_warning "Auth BFF API may not be accessible externally"
        print_info "This might be normal if port 3002 is not exposed"
    fi
}

# Test authentication flow
test_auth_flow() {
    print_step "Testing authentication flow..."
    
    # Test OIDC discovery endpoint
    local discovery_url="$KEYCLOAK_URL/realms/sso-hub/.well-known/openid_configuration"
    print_info "Testing OIDC discovery endpoint..."
    
    if curl -s --max-time 10 "$discovery_url" | jq . >/dev/null 2>&1; then
        print_success "OIDC discovery endpoint is working"
    else
        print_warning "OIDC discovery endpoint test failed"
        print_info "Authentication may still work, but check Keycloak configuration"
    fi
    
    # Test realm access
    print_info "Testing SSO Hub realm access..."
    if curl -s --max-time 10 "$KEYCLOAK_URL/realms/sso-hub" >/dev/null 2>&1; then
        print_success "SSO Hub realm is accessible"
    else
        print_error "SSO Hub realm is not accessible"
        return 1
    fi
}

# Check database connectivity
check_database() {
    print_step "Checking database connectivity..."
    
    # Test PostgreSQL connection
    if docker-compose exec -T postgres pg_isready -U sso_user -d sso_hub >/dev/null 2>&1; then
        print_success "PostgreSQL is ready and accessible"
    else
        print_error "PostgreSQL connection failed"
        return 1
    fi
    
    # Test Redis connection  
    if docker-compose exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        print_success "Redis is ready and accessible"
    else
        print_error "Redis connection failed"
        return 1
    fi
}

# Network connectivity tests
test_network() {
    print_step "Testing network connectivity..."
    
    # Test if external host is reachable (if not localhost)
    if [[ "$EXTERNAL_HOST" != "localhost" && "$EXTERNAL_HOST" != "127.0.0.1" ]]; then
        print_info "Testing connectivity to $EXTERNAL_HOST..."
        if ping -c 3 "$EXTERNAL_HOST" >/dev/null 2>&1; then
            print_success "Host $EXTERNAL_HOST is reachable"
        else
            print_warning "Host $EXTERNAL_HOST may not be reachable"
            print_info "This could be due to firewall or network configuration"
        fi
    fi
    
    # Test port accessibility
    local ports=(80 443 8080 3002)
    for port in "${ports[@]}"; do
        if [[ "$EXTERNAL_PORT" == ":$port" ]] || [[ "$port" == "8080" ]] || [[ "$port" == "3002" ]]; then
            if nc -z "$EXTERNAL_HOST" "$port" 2>/dev/null; then
                print_success "Port $port is accessible on $EXTERNAL_HOST"
            else
                print_warning "Port $port is not accessible on $EXTERNAL_HOST"
            fi
        fi
    done
}

# Generate validation report
generate_report() {
    print_step "Generating validation report..."
    
    local report_file="validation-report-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$report_file" << EOF
SSO Hub Deployment Validation Report
====================================
Generated: $(date)
Validated by: $(whoami)
Host: $(hostname)

Configuration:
- External Host: $EXTERNAL_HOST
- External Protocol: $EXTERNAL_PROTOCOL  
- External Port: $EXTERNAL_PORT
- Frontend URL: $FRONTEND_URL
- Keycloak URL: $KEYCLOAK_URL
- Auth BFF URL: $AUTH_BFF_URL

Docker Containers:
$(docker-compose ps)

Service Health Status:
$(curl -s http://localhost:3002/healthz 2>/dev/null || echo "Auth BFF: Not responding")
$(curl -s http://localhost:3006/healthz 2>/dev/null || echo "Catalog: Not responding")

Network Configuration:
- Frontend accessible: $(curl -s --max-time 5 "$FRONTEND_URL" >/dev/null 2>&1 && echo "✓ Yes" || echo "✗ No")
- Keycloak accessible: $(curl -s --max-time 5 "$KEYCLOAK_URL" >/dev/null 2>&1 && echo "✓ Yes" || echo "✗ No")

Database Status:
- PostgreSQL: $(docker-compose exec -T postgres pg_isready -U sso_user -d sso_hub 2>/dev/null | grep -q "accepting" && echo "✓ Ready" || echo "✗ Not ready")
- Redis: $(docker-compose exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG" && echo "✓ Ready" || echo "✗ Not ready")

Validation completed at: $(date)
EOF

    print_success "Validation report saved to: $report_file"
}

# Main execution
main() {
    print_header
    
    # Initialize log file
    echo "SSO Hub Validation Started: $(date)" > "$LOG_FILE"
    
    local overall_success=true
    
    # Run all validation steps
    load_config
    
    echo ""
    check_containers || overall_success=false
    
    echo ""
    check_database || overall_success=false
    
    echo ""
    check_health_endpoints
    
    echo ""
    test_external_access || overall_success=false
    
    echo ""  
    test_auth_flow || overall_success=false
    
    echo ""
    test_network
    
    echo ""
    generate_report
    
    echo ""
    if $overall_success; then
        print_success "🎉 SSO Hub deployment validation completed successfully!"
        echo ""
        print_info "Your SSO Hub is ready to use:"
        print_info "  • Frontend: $FRONTEND_URL"
        print_info "  • Keycloak Admin: $KEYCLOAK_URL (admin/admin_secure_password_123)"
        print_info "  • Documentation: $FRONTEND_URL/docs"
        echo ""
        print_info "Next steps:"
        print_info "  1. Configure your DevOps tools in the admin panel"
        print_info "  2. Set up users and groups"
        print_info "  3. Test tool integrations"
    else
        print_warning "⚠️  Some validation checks failed"
        print_info "Check the issues above and run validation again"
        print_info "For troubleshooting, see: docs/troubleshooting.md"
    fi
}

# Show help
show_help() {
    echo "SSO Hub Deployment Validation Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo "  -q, --quiet   Quiet mode (less verbose output)"
    echo "  -v, --verbose Verbose mode (detailed logging)"
    echo ""
    echo "This script validates your SSO Hub deployment and external access configuration."
}

# Handle command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -q|--quiet)
        exec > /dev/null 2>&1
        main
        ;;
    -v|--verbose)
        set -x
        main
        ;;
    "")
        main
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
esac