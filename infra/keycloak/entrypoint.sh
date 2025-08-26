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

# Function to run SSL disabling script in background
run_ssl_disabling() {
    print_info "Starting SSL disabling script in background..."
    
    # Run the SSL disabling script in background
    (
        # Wait a bit longer to ensure Keycloak is fully ready
        sleep 30
        
        # Set environment variables for the script
        export KC_INTERNAL_URL="http://localhost:8080"
        export KEYCLOAK_REALM="sso-hub"
        
        # Run the script
        /opt/keycloak/bin/disable-ssl.sh
    ) &
    
    print_success "SSL disabling script started in background"
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

# Check if we should disable SSL (only for HTTP deployments)
if [[ "${KC_HTTP_ENABLED:-true}" == "true" && "${KC_HOSTNAME_STRICT_HTTPS:-false}" == "false" ]]; then
    print_info "HTTP mode detected - SSL disabling will be enabled"
    run_ssl_disabling
else
    print_info "HTTPS mode detected - SSL disabling skipped"
fi

# Get the original Keycloak command
KC_ORIGINAL_CMD="/opt/keycloak/bin/kc.sh"

# Pass through all arguments to the original Keycloak command
print_info "Starting Keycloak: $KC_ORIGINAL_CMD $@"
exec "$KC_ORIGINAL_CMD" "$@"