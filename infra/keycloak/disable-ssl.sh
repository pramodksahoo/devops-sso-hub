#!/bin/bash

# Keycloak Realm SSL Disabling Script
# This script disables SSL requirement for the sso-hub realm to allow HTTP access

set -e

KC_ADMIN_USER=${KEYCLOAK_ADMIN:-admin}
KC_ADMIN_PASS=${KEYCLOAK_ADMIN_PASSWORD:-admin_password}
KC_URL=${KC_INTERNAL_URL:-http://localhost:8080}
REALM_NAME=${KEYCLOAK_REALM:-sso-hub}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Wait for Keycloak to be ready
wait_for_keycloak() {
    print_info "Waiting for Keycloak to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "${KC_URL}/health/ready" > /dev/null 2>&1; then
            print_success "Keycloak is ready"
            return 0
        fi
        
        print_info "Attempt ${attempt}/${max_attempts} - Keycloak not ready yet, waiting 10 seconds..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    print_error "Keycloak failed to become ready after ${max_attempts} attempts"
    return 1
}

# Configure kcadm.sh
configure_kcadm() {
    print_info "Configuring kcadm.sh authentication..."
    
    if /opt/keycloak/bin/kcadm.sh config credentials --server "${KC_URL}" --realm master --user "${KC_ADMIN_USER}" --password "${KC_ADMIN_PASS}"; then
        print_success "kcadm.sh authenticated successfully"
        return 0
    else
        print_error "Failed to authenticate kcadm.sh"
        return 1
    fi
}

# Disable SSL requirement for realm
disable_realm_ssl() {
    print_info "Disabling SSL requirement for realm: ${REALM_NAME}"
    
    # Check if realm exists
    if ! /opt/keycloak/bin/kcadm.sh get realms/${REALM_NAME} > /dev/null 2>&1; then
        print_error "Realm ${REALM_NAME} does not exist"
        return 1
    fi
    
    # Update realm to disable SSL requirement
    if /opt/keycloak/bin/kcadm.sh update realms/${REALM_NAME} -s sslRequired=NONE; then
        print_success "SSL requirement disabled for realm: ${REALM_NAME}"
        return 0
    else
        print_error "Failed to disable SSL requirement for realm: ${REALM_NAME}"
        return 1
    fi
}

# Disable SSL for admin console (master realm)
disable_master_ssl() {
    print_info "Disabling SSL requirement for master realm (admin console)"
    
    if /opt/keycloak/bin/kcadm.sh update realms/master -s sslRequired=NONE; then
        print_success "SSL requirement disabled for master realm"
        return 0
    else
        print_error "Failed to disable SSL requirement for master realm"
        return 1
    fi
}

# Main execution
main() {
    print_info "Starting Keycloak SSL disabling script"
    print_info "Target URL: ${KC_URL}"
    print_info "Target Realm: ${REALM_NAME}"
    print_info "Admin User: ${KC_ADMIN_USER}"
    
    # Wait for Keycloak to be ready
    if ! wait_for_keycloak; then
        exit 1
    fi
    
    # Configure kcadm.sh
    if ! configure_kcadm; then
        exit 1
    fi
    
    # Disable SSL for master realm (admin console)
    if ! disable_master_ssl; then
        print_error "Failed to configure master realm, but continuing..."
    fi
    
    # Disable SSL for application realm
    if ! disable_realm_ssl; then
        print_error "Failed to configure application realm"
        exit 1
    fi
    
    print_success "✅ SSL requirements disabled for all realms"
    print_info "Keycloak is now configured for HTTP access"
}

# Run main function
main "$@"