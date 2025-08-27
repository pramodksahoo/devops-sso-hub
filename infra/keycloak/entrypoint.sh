#!/bin/bash

# Keycloak Enhanced Entrypoint
# Starts Keycloak and automatically disables SSL requirements for HTTP access

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[KEYCLOAK-ENTRYPOINT]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[KEYCLOAK-ENTRYPOINT]${NC} $1"
}

print_error() {
    echo -e "${RED}[KEYCLOAK-ENTRYPOINT]${NC} $1"
}

# Function to run Keycloak configuration in background
run_keycloak_configuration() {
    print_info "Starting Keycloak configuration in background..."
    
    # Run configuration script in background
    (
        # Wait for Keycloak to be fully ready and initialized
        sleep 60
        
        print_info "Running complete Keycloak configuration..."
        # Run the consolidated configuration script
        /opt/keycloak/bin/configure-keycloak.sh
        
    ) &
    
    print_success "Keycloak configuration started in background"
}

# Function to handle shutdown
cleanup() {
    print_info "Shutting down Keycloak..."
    # Kill all background processes
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

# Trap signals for graceful shutdown
trap cleanup TERM INT

# Start Keycloak configuration
print_info "Starting Keycloak with enhanced HTTP support..."
print_info "External Host: ${KC_HOSTNAME:-localhost}"
print_info "HTTP Enabled: ${KC_HTTP_ENABLED:-true}"
print_info "HTTPS Strict: ${KC_HOSTNAME_STRICT_HTTPS:-false}"

# Check if we should run configuration (only for HTTP deployments)
if [[ "${KC_HTTP_ENABLED:-true}" == "true" && "${KC_HOSTNAME_STRICT_HTTPS:-false}" == "false" ]]; then
    print_info "HTTP mode detected - Keycloak configuration will be enabled"
    run_keycloak_configuration
else
    print_info "HTTPS mode detected - Keycloak configuration skipped"
fi

# Get the original Keycloak command
KC_ORIGINAL_CMD="/opt/keycloak/bin/kc.sh"

# Pass through all arguments to the original Keycloak command
print_info "Starting Keycloak: $KC_ORIGINAL_CMD $@"
exec "$KC_ORIGINAL_CMD" "$@"