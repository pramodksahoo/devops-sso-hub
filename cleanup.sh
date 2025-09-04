#!/bin/bash

# SSO Hub Cleanup Script
# Completely resets the environment to fresh state

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}       SSO Hub - Complete Cleanup         ${NC}"
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

print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

print_header

print_info "This script will completely reset your SSO Hub environment."
print_warning "This will remove all containers, volumes, images, and configuration files."
echo ""

read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Cleanup cancelled."
    exit 0
fi

echo ""
print_step "Stopping and removing all containers..."

# Stop and remove all containers
docker-compose down --volumes --remove-orphans 2>/dev/null || true
print_success "Containers stopped and removed"

print_step "Removing Docker images..."

# Remove SSO Hub related images
docker images | grep -E "agentic-devops-sso|sso-hub" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
print_success "SSO Hub Docker images removed"

print_step "Cleaning up configuration files..."

# Remove configuration files
rm -f .env
rm -f .env.backup
rm -f .external-access-config
rm -f .setup_complete
rm -f setup.log
rm -f apps/frontend/.env

# Restore original Keycloak realm configuration
if [ -f "infra/keycloak/import/realm-sso-hub.json.backup" ]; then
    mv infra/keycloak/import/realm-sso-hub.json.backup infra/keycloak/import/realm-sso-hub.json
    print_success "Restored original Keycloak realm configuration"
fi

print_success "Configuration files cleaned up"

print_step "Removing Docker volumes and networks..."

# Clean up Docker system (remove unused volumes and networks)
docker volume prune -f 2>/dev/null || true
docker network prune -f 2>/dev/null || true

print_success "Docker volumes and networks cleaned up"

print_step "Removing build artifacts..."

# Remove any build artifacts
rm -rf apps/frontend/dist
rm -rf apps/frontend/node_modules/.cache
rm -rf test-results
rm -rf playwright-report

print_success "Build artifacts removed"

echo ""
print_success "🎉 Cleanup completed successfully!"
echo ""

print_info "Your SSO Hub environment has been completely reset."
print_info "To reinstall, run: ${BLUE}./setup.sh${NC}"
echo ""

print_info "Fresh installation steps:"
echo "1. Run: ${BLUE}./setup.sh${NC}"
echo "2. Follow the prompts to configure external access"
echo "3. Wait for services to start (2-3 minutes)"
echo "4. Access your SSO Hub at the configured URL"
echo ""

print_success "✅ Ready for fresh installation!"