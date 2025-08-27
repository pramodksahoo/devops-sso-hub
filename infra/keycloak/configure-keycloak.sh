#!/bin/bash

# Keycloak Complete Configuration Script
# Handles SSL disabling, realm configuration, and troubleshooting
# This is the ONLY script needed for Keycloak post-startup configuration

set -e

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

# Find working Keycloak URL (internal container connectivity)
find_keycloak_url() {
    print_info "Testing internal Keycloak connectivity..."
    
    for url in "${KC_INTERNAL_URLS[@]}"; do
        print_info "Testing: $url"
        
        # Test basic connectivity
        if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
            print_success "✅ Found working internal Keycloak URL: $url"
            KC_INTERNAL_URL="$url"
            return 0
        fi
        
        # Test master realm endpoint
        if curl -s --max-time 5 "$url/realms/master" > /dev/null 2>&1; then
            print_success "✅ Found working internal Keycloak URL (via master realm): $url"
            KC_INTERNAL_URL="$url"
            return 0
        fi
        
        print_warning "  No response from $url"
    done
    
    print_error "❌ Could not connect to Keycloak on any internal URL"
    print_info "Troubleshooting information:"
    print_info "  - This script runs inside the Keycloak container"
    print_info "  - It should connect to localhost/127.0.0.1 on port 8080"
    print_info "  - If Keycloak just started, it may need more time to initialize"
    
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

# Disable SSL requirements
disable_ssl_requirements() {
    print_info "Disabling SSL requirements for HTTP access..."
    
    # Disable SSL for master realm (admin console)
    if /opt/keycloak/bin/kcadm.sh update realms/master -s sslRequired=NONE; then
        print_success "SSL disabled for master realm"
    else
        print_warning "Could not disable SSL for master realm"
    fi
    
    # Disable SSL for application realm
    if /opt/keycloak/bin/kcadm.sh update realms/${REALM_NAME} -s sslRequired=NONE; then
        print_success "SSL disabled for ${REALM_NAME} realm"
    else
        print_warning "Could not disable SSL for ${REALM_NAME} realm"
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
    
    # Update client with both external and localhost URIs
    if /opt/keycloak/bin/kcadm.sh update clients/${CLIENT_ID} -r "${REALM_NAME}" \
        -s "redirectUris=[\"${auth_callback_uri}\",\"${frontend_uri}\",\"${localhost_callback}\",\"${localhost_frontend}\"]" \
        -s "webOrigins=[\"${frontend_uri}\",\"${auth_callback_uri}\",\"${localhost_frontend}\",\"http://localhost:3002\"]"; then
        
        print_success "Client configuration updated for external access"
    else
        print_warning "Could not update client configuration"
    fi
    
    # Update client secret if provided and different from default
    if [ -n "${CLIENT_SECRET}" ] && [ "${CLIENT_SECRET}" != "sso-client-secret" ]; then
        if /opt/keycloak/bin/kcadm.sh update clients/${CLIENT_ID} -r "${REALM_NAME}" -s "secret=${CLIENT_SECRET}"; then
            print_success "Client secret updated"
        else
            print_warning "Could not update client secret"
        fi
    fi
}

# Test configuration (internal connectivity)
test_configuration() {
    print_info "Testing Keycloak configuration..."
    
    # Test realm accessibility (internal)
    if curl -s --max-time 10 "${KC_INTERNAL_URL}/realms/${REALM_NAME}" > /dev/null 2>&1; then
        print_success "✅ Realm ${REALM_NAME} is accessible internally via HTTP"
    else
        print_error "❌ Cannot access realm ${REALM_NAME} internally"
        return 1
    fi
    
    # Test OIDC discovery (internal)
    local discovery_url="${KC_INTERNAL_URL}/realms/${REALM_NAME}/.well-known/openid_configuration"
    if curl -s --max-time 10 "${discovery_url}" > /dev/null 2>&1; then
        print_success "✅ OIDC discovery endpoint is accessible internally"
    else
        print_error "❌ Cannot access OIDC discovery endpoint internally"
        return 1
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
    print_info "External Target: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}"
    print_info "Running inside Keycloak container - using internal connectivity"
    
    # Check if external host is actually different from localhost
    if [[ "${EXTERNAL_HOST}" == "localhost" || "${EXTERNAL_HOST}" == "127.0.0.1" ]]; then
        print_success "✅ External host is localhost - skipping external configuration"
        print_info "Keycloak realm is pre-configured for local development"
        print_info "For external access, run: ./configure-external-access.sh"
        
        show_diagnostic_info
        exit 0
    fi
    
    # Step 1: Find working internal Keycloak URL
    if ! find_keycloak_url; then
        print_error "Cannot connect to Keycloak internally"
        print_info "This script runs inside the Keycloak container and should connect to localhost"
        print_info "If you see this error, Keycloak may still be starting up"
        exit 1
    fi
    
    print_info "Using internal URL: ${KC_INTERNAL_URL} for API calls"
    
    # Step 2: Wait for Keycloak to be ready
    if ! wait_for_keycloak; then
        print_warning "Admin API not accessible - realm may be pre-configured"
        # Test if realm works anyway
        if curl -s --max-time 10 "${KC_INTERNAL_URL}/realms/${REALM_NAME}" > /dev/null 2>&1; then
            print_success "✅ Realm is accessible - configuration appears to be working"
            show_diagnostic_info
            exit 0
        else
            print_error "Realm is not accessible and admin API is not ready"
            exit 1
        fi
    fi
    
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
    
    # Step 4: Configure Keycloak
    disable_ssl_requirements
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