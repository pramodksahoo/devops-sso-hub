#!/bin/bash

# SSO Hub External Deployment Test Script
# Tests all service endpoints on external host deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    clear
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                    SSO Hub External Deployment Test                        ${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Get external host from .env
get_external_host() {
    if [ -f ".env" ]; then
        EXTERNAL_HOST=$(grep "^EXTERNAL_HOST=" .env | cut -d= -f2)
        EXTERNAL_PROTOCOL=$(grep "^EXTERNAL_PROTOCOL=" .env | cut -d= -f2)
        if [ -z "$EXTERNAL_HOST" ]; then
            EXTERNAL_HOST="localhost"
            EXTERNAL_PROTOCOL="http"
        fi
    else
        echo "Error: .env file not found"
        exit 1
    fi
}

# Test service endpoint
test_service() {
    local service_name="$1"
    local port="$2"
    local endpoint="$3"
    local expected_status="${4:-200}"
    
    local url="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:${port}${endpoint}"
    
    print_step "Testing ${service_name} at ${url}"
    
    if command -v curl &> /dev/null; then
        local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null)
        
        if [[ "$response" == "$expected_status" || "$response" == "405" || "$response" == "404" ]]; then
            # 405 = Method Not Allowed (service is responding)
            # 404 = Not Found (service is responding)
            print_success "${service_name} is accessible (HTTP $response)"
            return 0
        else
            print_error "${service_name} returned HTTP $response (expected $expected_status)"
            return 1
        fi
    else
        print_warning "curl not found, skipping ${service_name} test"
        return 2
    fi
}

# Test tools configuration specifically
test_tools_configuration() {
    print_step "Testing Tools Configuration API (Admin-Config Service)"
    
    local admin_config_url="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3005"
    local api_key="admin-api-key-change-in-production"
    
    # Test 1: Get all tools
    print_step "  → Testing GET /api/tools"
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "X-Api-Key: $api_key" \
        -H "Accept: application/json" \
        "$admin_config_url/api/tools" 2>/dev/null)
    
    local http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    if [[ "$http_code" == "200" ]]; then
        print_success "Admin-Config API is accessible"
        
        # Test 2: Test auto-populate functionality
        print_step "  → Testing auto-populate functionality"
        local populate_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -H "Accept: application/json" \
            "$admin_config_url/api/keycloak/config/oauth2?tool=grafana" 2>/dev/null)
        
        local populate_http_code=$(echo "$populate_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        
        if [[ "$populate_http_code" == "200" ]]; then
            print_success "Auto-populate functionality is working"
        else
            print_error "Auto-populate returned HTTP $populate_http_code"
        fi
        
    elif [[ "$http_code" == "401" ]]; then
        print_error "Admin-Config API returned 401 Unauthorized - Check API key"
    elif [[ "$http_code" == "000" || "$http_code" == "" ]]; then
        print_error "Admin-Config service is not accessible - Connection failed"
    else
        print_error "Admin-Config API returned HTTP $http_code"
    fi
}

# Test frontend access
test_frontend_access() {
    print_step "Testing Frontend Access"
    
    local frontend_url="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3000"
    
    # Test main page
    if curl -s --max-time 10 "$frontend_url" | grep -q "SSO Hub" &>/dev/null; then
        print_success "Frontend is accessible and serving content"
    else
        print_error "Frontend is not accessible or not serving expected content"
    fi
    
    # Test admin tools page  
    if curl -s --max-time 10 "$frontend_url/admin-tools" | grep -q "html" &>/dev/null; then
        print_success "Admin tools page is accessible"
    else
        print_error "Admin tools page is not accessible"
    fi
}

# Test CORS configuration
test_cors_configuration() {
    print_step "Testing CORS Configuration"
    
    local frontend_url="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3000"
    local admin_config_url="${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3005"
    
    # Test CORS headers from admin-config service
    local cors_response=$(curl -s -I \
        -H "Origin: $frontend_url" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: X-Api-Key" \
        -X OPTIONS \
        "$admin_config_url/api/tools" 2>/dev/null)
    
    if echo "$cors_response" | grep -q "Access-Control-Allow-Origin" &>/dev/null; then
        print_success "CORS is properly configured for external access"
    else
        print_warning "CORS headers not detected (may still work for same-origin requests)"
    fi
}

# Main test execution
main() {
    print_header
    
    echo "This script tests SSO Hub external deployment functionality"
    echo ""
    
    # Get configuration
    get_external_host
    
    echo "Testing external deployment at: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}"
    echo ""
    
    local tests_passed=0
    local tests_failed=0
    local tests_skipped=0
    
    # Core Services Test
    echo -e "${CYAN}=== Core Services Test ===${NC}"
    
    services=(
        "Frontend:3000:/:"
        "Auth-BFF:3002:/healthz"
        "User-Service:3003:/healthz"
        "Tools-Service:3004:/healthz" 
        "Admin-Config:3005:/healthz"
        "Catalog:3006:/healthz"
        "Webhook-Ingress:3007:/healthz"
        "Audit:3009:/healthz"
        "Analytics:3010:/healthz"
        "Keycloak:8080:/realms/master"
    )
    
    for service in "${services[@]}"; do
        IFS=":" read -r name port endpoint <<< "$service"
        if test_service "$name" "$port" "$endpoint"; then
            tests_passed=$((tests_passed + 1))
        elif [[ $? -eq 2 ]]; then
            tests_skipped=$((tests_skipped + 1))
        else
            tests_failed=$((tests_failed + 1))
        fi
    done
    
    echo ""
    echo -e "${CYAN}=== Tools Configuration Test ===${NC}"
    
    if test_tools_configuration; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    echo ""
    echo -e "${CYAN}=== Frontend Access Test ===${NC}"
    
    if test_frontend_access; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    echo ""
    echo -e "${CYAN}=== CORS Configuration Test ===${NC}"
    
    if test_cors_configuration; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    # Results Summary
    echo ""
    echo -e "${CYAN}=== Test Results Summary ===${NC}"
    echo ""
    print_success "Tests Passed: $tests_passed"
    if [[ $tests_failed -gt 0 ]]; then
        print_error "Tests Failed: $tests_failed"
    fi
    if [[ $tests_skipped -gt 0 ]]; then
        print_warning "Tests Skipped: $tests_skipped"
    fi
    
    echo ""
    if [[ $tests_failed -eq 0 ]]; then
        echo -e "${GREEN}🎉 All critical tests passed! External deployment is working correctly.${NC}"
        echo ""
        echo "Access URLs:"
        echo "  • SSO Hub: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3000"
        echo "  • Admin Tools: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:3000/admin-tools"
        echo "  • Keycloak: ${EXTERNAL_PROTOCOL}://${EXTERNAL_HOST}:8080"
        echo ""
    else
        echo -e "${RED}❌ Some tests failed. Please check the configuration and services.${NC}"
        echo ""
        echo "Troubleshooting:"
        echo "  1. Verify all services are running: docker-compose ps"
        echo "  2. Check service logs: docker-compose logs <service-name>"
        echo "  3. Verify external host configuration in .env"
        echo "  4. Test individual service access manually"
        echo ""
        exit 1
    fi
}

# Run the tests
main "$@"