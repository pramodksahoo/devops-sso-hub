#!/bin/bash

# Keycloak Complete Configuration Script
# Handles SSL disabling, realm configuration, and troubleshooting
# This is the ONLY script needed for Keycloak post-startup configuration

set -e

# Validate that required environment variables are available
validate_environment() {
    print_info "Validating environment variables from Docker Compose..."
    
    # Critical variables for Keycloak configuration
    local required_vars=(
        "EXTERNAL_HOST"
        "EXTERNAL_PROTOCOL" 
        "KEYCLOAK_REALM"
        "OIDC_CLIENT_ID"
        "OIDC_CLIENT_SECRET"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        else
            print_info "  ✓ $var = ${!var}"
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            print_error "  ✗ $var"
        done
        print_error "These must be set in docker-compose.yml environment section"
        return 1
    fi
    
    print_success "All required environment variables are available"
    return 0
}

# Environment variables with defaults
KC_ADMIN_USER=${KEYCLOAK_ADMIN:-admin}
KC_ADMIN_PASS=${KEYCLOAK_ADMIN_PASSWORD:-admin_password}

# Internal URLs (for API calls from inside container)
KC_INTERNAL_URLS=("http://localhost:8080" "http://127.0.0.1:8080" "http://0.0.0.0:8080")

# External configuration (for client redirects and public access)
EXTERNAL_HOST=${EXTERNAL_HOST:-localhost}
EXTERNAL_PROTOCOL=${EXTERNAL_PROTOCOL:-http}
AUTH_BFF_PORT=${AUTH_BFF_PORT:-3002}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Keycloak configuration
REALM_NAME=${KEYCLOAK_REALM:-sso-hub}
CLIENT_ID=${OIDC_CLIENT_ID:-sso-hub-client}
CLIENT_SECRET=${OIDC_CLIENT_SECRET:-sso-client-secret}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[KEYCLOAK-CONFIG]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[KEYCLOAK-CONFIG]${NC} $1"
}

print_error() {
    echo -e "${RED}[KEYCLOAK-CONFIG]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[KEYCLOAK-CONFIG]${NC} $1"
}

# Validate environment variables from Docker Compose
if ! validate_environment; then
    print_error "Environment validation failed - ensure all variables are set in docker-compose.yml"
    exit 1
fi

# Show current configuration for debugging
show_current_config() {
    print_info "Current Keycloak configuration:"
    print_info "  EXTERNAL_HOST: ${EXTERNAL_HOST}"
    print_info "  EXTERNAL_PROTOCOL: ${EXTERNAL_PROTOCOL}"
    print_info "  AUTH_BFF_PORT: ${AUTH_BFF_PORT}"
    print_info "  FRONTEND_PORT: ${FRONTEND_PORT}"
    print_info "  REALM_NAME: ${REALM_NAME}"
    print_info "  CLIENT_ID: ${CLIENT_ID}"
}

# Find working Keycloak URL (simplified for minimal container)
find_keycloak_url() {
    print_info "Waiting for Keycloak to be ready for API calls..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        print_info "Attempt ${attempt}/${max_attempts} - checking Keycloak readiness..."
        
        for url in "${KC_INTERNAL_URLS[@]}"; do
            print_info "  Testing: $url/realms/master"
            
            # Simple approach: just try the master realm endpoint directly
            # Use Java/Keycloak's built-in tools since external tools are not available
            if /opt/keycloak/bin/kcadm.sh get realms/master --server "$url" --realm master --user "${KC_ADMIN_USER}" --password "${KC_ADMIN_PASS}" --no-config 2>/dev/null >/dev/null; then
                print_success "✅ Keycloak API is responding and admin auth works: $url"
                KC_INTERNAL_URL="$url"
                return 0
            fi
            
            # Fallback: try without authentication first
            print_info "    Trying unauthenticated realm check..."
            if /opt/keycloak/bin/kcadm.sh get realms/master --server "$url" --no-config 2>/dev/null | grep -q "realm" 2>/dev/null; then
                print_info "    ✓ Realm endpoint responds, now testing auth..."
                # Try to authenticate
                if /opt/keycloak/bin/kcadm.sh config credentials --server "$url" --realm master --user "${KC_ADMIN_USER}" --password "${KC_ADMIN_PASS}" 2>/dev/null; then
                    print_success "✅ Keycloak API ready and authenticated: $url"
                    KC_INTERNAL_URL="$url"
                    return 0
                fi
            fi
        done
        
        print_info "  Waiting 10 seconds before retry..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    print_error "❌ Keycloak API failed to become ready after $((max_attempts * 10)) seconds"
    print_info "This usually means Keycloak is taking longer than expected to fully initialize"
    
    return 1
}

# Wait for Keycloak to be ready
wait_for_keycloak() {
    print_info "Waiting for Keycloak admin API to be ready..."
    
    local max_attempts=20
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --max-time 10 "${KC_INTERNAL_URL}/admin/master/console" > /dev/null 2>&1; then
            print_success "Keycloak admin API is ready"
            return 0
        elif curl -s --max-time 10 "${KC_INTERNAL_URL}/realms/master" > /dev/null 2>&1; then
            print_success "Keycloak is responding (master realm accessible)"
            return 0
        fi
        
        print_info "Attempt ${attempt}/${max_attempts} - waiting 15 seconds..."
        sleep 15
        attempt=$((attempt + 1))
    done
    
    print_error "Keycloak admin API failed to become ready"
    return 1
}

# Configure kcadm.sh
configure_kcadm() {
    print_info "Authenticating with Keycloak admin API..."
    
    if /opt/keycloak/bin/kcadm.sh config credentials --server "${KC_INTERNAL_URL}" --realm master --user "${KC_ADMIN_USER}" --password "${KC_ADMIN_PASS}"; then
        print_success "Admin authentication successful"
        return 0
    else
        print_error "Failed to authenticate with admin API"
        return 1
    fi
}

# Configure SSL requirements based on Keycloak best practices
configure_ssl_requirements() {
    print_info "Configuring SSL requirements for external HTTP access..."
    print_info "Following Keycloak official documentation for ${EXTERNAL_PROTOCOL} deployment"
    
    local ssl_mode="NONE"
    if [[ "${EXTERNAL_PROTOCOL}" == "https" ]]; then
        ssl_mode="EXTERNAL"
        print_info "HTTPS detected - setting SSL requirement to 'EXTERNAL' (recommended for reverse proxy)"
    else
        print_info "HTTP detected - setting SSL requirement to 'NONE' (development/testing only)"
    fi
    
    # Configure SSL for master realm (admin console access)
    print_info "Configuring SSL for master realm..."
    if /opt/keycloak/bin/kcadm.sh update realms/master -s sslRequired=${ssl_mode}; then
        print_success "✅ SSL configured for master realm: ${ssl_mode}"
    else
        print_error "❌ Failed to configure SSL for master realm"
        # Try with explicit error handling
        local error_output=$(/opt/keycloak/bin/kcadm.sh update realms/master -s sslRequired=${ssl_mode} 2>&1)
        print_error "Error details: ${error_output}"
        return 1
    fi
    
    # Configure SSL for application realm
    print_info "Configuring SSL for ${REALM_NAME} realm..."
    if /opt/keycloak/bin/kcadm.sh update realms/${REALM_NAME} -s sslRequired=${ssl_mode}; then
        print_success "✅ SSL configured for ${REALM_NAME} realm: ${ssl_mode}"
    else
        print_error "❌ Failed to configure SSL for ${REALM_NAME} realm"
        local error_output=$(/opt/keycloak/bin/kcadm.sh update realms/${REALM_NAME} -s sslRequired=${ssl_mode} 2>&1)
        print_error "Error details: ${error_output}"
        return 1
    fi
    
    # Verify SSL configuration
    print_info "Verifying SSL configuration..."
    
    local master_ssl=$(/opt/keycloak/bin/kcadm.sh get realms/master --fields sslRequired 2>/dev/null | grep "sslRequired" | cut -d'"' -f4 || echo "unknown")
    local app_ssl=$(/opt/keycloak/bin/kcadm.sh get realms/${REALM_NAME} --fields sslRequired 2>/dev/null | grep "sslRequired" | cut -d'"' -f4 || echo "unknown")
    
    print_info "=== SSL Configuration Verification ==="
    print_info "  Target SSL Mode: ${ssl_mode}"
    print_info "  Master realm: ${master_ssl}"
    print_info "  ${REALM_NAME} realm: ${app_ssl}"
    
    if [[ "$master_ssl" == "$ssl_mode" && "$app_ssl" == "$ssl_mode" ]]; then
        print_success "✅ SSL requirements successfully configured for ${EXTERNAL_PROTOCOL} access"
        return 0
    else
        print_error "❌ SSL configuration mismatch detected"
        print_error "  Expected: ${ssl_mode}, Got Master: ${master_ssl}, App: ${app_ssl}"
        return 1
    fi
}

# Update client configuration for external access
update_client_configuration() {
    print_info "Updating client configuration for external access..."
    
    # Calculate URLs based on environment
    local auth_callback_uri="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:${AUTH_BFF_PORT}/auth/callback"
    local frontend_uri="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:${FRONTEND_PORT}"
    local localhost_callback="http://localhost:3002/auth/callback"
    local localhost_frontend="http://localhost:3000"
    
    print_info "Configuring redirect URIs for:"
    print_info "  - External: ${auth_callback_uri}, ${frontend_uri}"
    print_info "  - Local: ${localhost_callback}, ${localhost_frontend}"
    
    # Get client internal ID using kcadm.sh without jq dependency
    print_info "Searching for client: ${CLIENT_ID}"
    local client_list_output=$(/opt/keycloak/bin/kcadm.sh get clients -r "${REALM_NAME}" --fields id,clientId 2>/dev/null)
    
    # Extract client ID using grep and awk (no jq dependency)
    local client_internal_id=$(echo "$client_list_output" | grep -A 2 -B 2 "\"clientId\" : \"${CLIENT_ID}\"" | grep "\"id\"" | head -1 | awk -F'"' '{print $4}')
    
    if [ -z "$client_internal_id" ]; then
        print_error "Could not find client ${CLIENT_ID} in realm ${REALM_NAME}"
        print_info "Available clients:"
        echo "$client_list_output" | grep "clientId" | awk -F'"' '{print "  - " $4}' || echo "Could not parse client list"
        return 1
    fi
    
    print_info "Found client internal ID: ${client_internal_id}"
    
    # Update client with both external and localhost URIs
    if /opt/keycloak/bin/kcadm.sh update clients/${client_internal_id} -r "${REALM_NAME}" \
        -s "redirectUris=[\"${auth_callback_uri}\",\"${frontend_uri}\",\"${localhost_callback}\",\"${localhost_frontend}\"]" \
        -s "webOrigins=[\"${frontend_uri}\",\"${auth_callback_uri}\",\"${localhost_frontend}\",\"http://localhost:3002\"]"; then
        
        print_success "Client configuration updated for external access"
        print_info "Updated redirect URIs:"
        print_info "  - ${auth_callback_uri}"
        print_info "  - ${frontend_uri}"
        print_info "  - ${localhost_callback}"
        print_info "  - ${localhost_frontend}"
    else
        print_error "Could not update client configuration"
        return 1
    fi
    
    # Update client secret if provided and different from default
    if [ -n "${CLIENT_SECRET}" ] && [ "${CLIENT_SECRET}" != "sso-client-secret" ]; then
        if /opt/keycloak/bin/kcadm.sh update clients/${client_internal_id} -r "${REALM_NAME}" -s "secret=${CLIENT_SECRET}"; then
            print_success "Client secret updated"
        else
            print_warning "Could not update client secret"
        fi
    fi
}

# Test configuration (using kcadm only)
test_configuration() {
    print_info "Testing Keycloak configuration..."
    
    # Test realm accessibility using kcadm
    if /opt/keycloak/bin/kcadm.sh get realms/${REALM_NAME} 2>/dev/null | grep -q "realm"; then
        print_success "✅ Realm ${REALM_NAME} is accessible via admin API"
    else
        print_error "❌ Cannot access realm ${REALM_NAME} via admin API"
        return 1
    fi
    
    # Test that SSL is properly disabled
    local ssl_required=$(/opt/keycloak/bin/kcadm.sh get realms/${REALM_NAME} --fields sslRequired 2>/dev/null | grep "sslRequired" | awk -F'"' '{print $4}' || echo "unknown")
    if [[ "$ssl_required" == "NONE" ]]; then
        print_success "✅ SSL requirements are disabled for ${REALM_NAME}"
    else
        print_warning "⚠️  SSL requirement for ${REALM_NAME}: ${ssl_required}"
    fi
    
    return 0
}

# Show diagnostic information
show_diagnostic_info() {
    print_info "=== CONFIGURATION SUMMARY ==="
    print_info "Internal Keycloak URL: ${KC_INTERNAL_URL}"
    print_info "External Host: ${EXTERNAL_HOST}"
    print_info "Realm: ${REALM_NAME}"
    print_info "Client ID: ${CLIENT_ID}"
    print_info ""
    print_info "External Access URLs:"
    print_info "  - Keycloak Admin: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:8080/admin"
    print_info "  - Frontend: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:${FRONTEND_PORT}"
    print_info "  - Auth BFF: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:${AUTH_BFF_PORT}"
    print_info "  - OIDC Discovery: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:8080/realms/${REALM_NAME}/.well-known/openid_configuration"
}

# Main execution
main() {
    print_info "Starting Keycloak configuration for external access..."
    
    # Show current configuration for debugging
    show_current_config
    
    print_info "External Target: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}"
    print_info "Running inside Keycloak container - using internal connectivity"
    
    # Check if external host is actually different from localhost
    if [[ "${EXTERNAL_HOST}" == "localhost" || "${EXTERNAL_HOST}" == "127.0.0.1" ]]; then
        print_success "✅ External host is localhost - skipping external configuration"
        print_info "Keycloak realm is pre-configured for local development"
        print_info "SSL requirements remain as configured in realm import"
        print_info "For external access, run: ./configure-external-access.sh with your public IP"
        
        show_diagnostic_info
        exit 0
    fi
    
    print_info "🌐 External host detected: ${EXTERNAL_HOST}"
    print_info "🔧 Proceeding with external access configuration..."
    
    # Step 1: Find working internal Keycloak URL
    if ! find_keycloak_url; then
        print_error "Cannot connect to Keycloak internally"
        print_info "This script runs inside the Keycloak container and should connect to localhost"
        print_info "If you see this error, Keycloak may still be starting up"
        exit 1
    fi
    
    print_info "Using internal URL: ${KC_INTERNAL_URL} for API calls"
    
    # Step 2: Since find_keycloak_url already confirmed API works, proceed directly to auth
    print_info "Keycloak API confirmed working, proceeding with authentication..."
    
    # Step 3: Authenticate with admin API
    if ! configure_kcadm; then
        print_warning "Cannot authenticate - testing if realm works anyway..."
        if test_configuration; then
            print_success "✅ Configuration appears to be working despite auth issues"
            show_diagnostic_info
            exit 0
        else
            print_error "Configuration is not working and cannot authenticate"
            exit 1
        fi
    fi
    
    # Step 4: Configure Keycloak for external access
    configure_ssl_requirements
    update_client_configuration
    
    # Step 5: Test configuration
    if test_configuration; then
        print_success "✅ Keycloak configuration completed successfully!"
        show_diagnostic_info
    else
        print_error "❌ Configuration completed but tests failed"
        show_diagnostic_info
        exit 1
    fi
}

# Run main function
main "$@"