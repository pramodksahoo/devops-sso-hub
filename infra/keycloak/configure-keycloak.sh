#!/bin/bash

# Keycloak Complete Configuration Script
# Handles SSL disabling, realm configuration, and troubleshooting
# This is the ONLY script needed for Keycloak post-startup configuration

set -e

# Environment variables with defaults
KC_ADMIN_USER=${KEYCLOAK_ADMIN:-admin}
KC_ADMIN_PASS=${KEYCLOAK_ADMIN_PASSWORD:-admin_password}
KC_URLS=("http://127.0.0.1:8080" "http://localhost:8080" "http://0.0.0.0:8080")
REALM_NAME=${KEYCLOAK_REALM:-sso-hub}
CLIENT_ID=${OIDC_CLIENT_ID:-sso-hub-client}
CLIENT_SECRET=${OIDC_CLIENT_SECRET:-sso-client-secret}

# External configuration from environment
EXTERNAL_HOST=${EXTERNAL_HOST:-localhost}
EXTERNAL_PROTOCOL=${EXTERNAL_PROTOCOL:-http}
AUTH_BFF_PORT=${AUTH_BFF_PORT:-3002}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

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

# Find working Keycloak URL
find_keycloak_url() {
    print_info "Testing Keycloak connectivity..."
    
    for url in "${KC_URLS[@]}"; do
        if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
            print_success "Found working Keycloak URL: $url"
            KC_URL="$url"
            return 0
        fi
    done
    
    print_error "Could not find working Keycloak URL"
    return 1
}

# Wait for Keycloak to be ready
wait_for_keycloak() {
    print_info "Waiting for Keycloak admin API to be ready..."
    
    local max_attempts=20
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --max-time 10 "${KC_URL}/admin/master/console" > /dev/null 2>&1; then
            print_success "Keycloak admin API is ready"
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
    
    if /opt/keycloak/bin/kcadm.sh config credentials --server "${KC_URL}" --realm master --user "${KC_ADMIN_USER}" --password "${KC_ADMIN_PASS}"; then
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

# Test configuration
test_configuration() {
    print_info "Testing Keycloak configuration..."
    
    # Test realm accessibility
    if curl -s --max-time 10 "${KC_URL}/realms/${REALM_NAME}" > /dev/null 2>&1; then
        print_success "✅ Realm ${REALM_NAME} is accessible via HTTP"
    else
        print_error "❌ Cannot access realm ${REALM_NAME}"
        return 1
    fi
    
    # Test OIDC discovery
    local discovery_url="${KC_URL}/realms/${REALM_NAME}/.well-known/openid_configuration"
    if curl -s --max-time 10 "${discovery_url}" > /dev/null 2>&1; then
        print_success "✅ OIDC discovery endpoint is accessible"
    else
        print_error "❌ Cannot access OIDC discovery endpoint"
        return 1
    fi
    
    return 0
}

# Show diagnostic information
show_diagnostic_info() {
    print_info "=== CONFIGURATION SUMMARY ==="
    print_info "Keycloak URL: ${KC_URL}"
    print_info "Realm: ${REALM_NAME}"
    print_info "Client ID: ${CLIENT_ID}"
    print_info "External Host: ${EXTERNAL_HOST}"
    print_info "External URLs:"
    print_info "  - Keycloak Admin: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:8080/admin"
    print_info "  - Frontend: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:${FRONTEND_PORT}"
    print_info "  - Auth BFF: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:${AUTH_BFF_PORT}"
}

# Main execution
main() {
    print_info "Starting Keycloak configuration for external access..."
    print_info "Target: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}"
    
    # Step 1: Find working Keycloak URL
    if ! find_keycloak_url; then
        print_error "Cannot connect to Keycloak - is it running?"
        exit 1
    fi
    
    # Step 2: Wait for Keycloak to be ready
    if ! wait_for_keycloak; then
        print_warning "Admin API not accessible - realm may be pre-configured"
        # Test if realm works anyway
        if curl -s --max-time 10 "${KC_URL}/realms/${REALM_NAME}" > /dev/null 2>&1; then
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