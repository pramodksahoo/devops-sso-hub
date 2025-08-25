#!/bin/bash

set -e

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin_secure_password_123}"
REALM_FILE="${REALM_FILE:-/opt/keycloak/data/import/sso-hub-realm.json}"

echo "Setting up SSO Hub realm in Keycloak..."

# Wait for Keycloak to be ready
echo "Waiting for Keycloak to be ready..."
until curl -f "$KEYCLOAK_URL/health/ready" > /dev/null 2>&1; do
    echo "Keycloak not ready, waiting..."
    sleep 5
done

echo "Keycloak is ready!"

# Get admin access token
echo "Getting admin access token..."
TOKEN_RESPONSE=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=$ADMIN_USER" \
    -d "password=$ADMIN_PASSWORD" \
    -d "grant_type=password" \
    -d "client_id=admin-cli")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')

if [ "$ACCESS_TOKEN" = "null" ]; then
    echo "Failed to get access token. Response: $TOKEN_RESPONSE"
    exit 1
fi

echo "Got access token successfully!"

# Check if realm already exists
REALM_EXISTS=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
    "$KEYCLOAK_URL/admin/realms/sso-hub" \
    -w "%{http_code}" -o /dev/null)

if [ "$REALM_EXISTS" = "200" ]; then
    echo "Realm 'sso-hub' already exists. Skipping import."
else
    echo "Importing SSO Hub realm..."
    
    # Import realm
    IMPORT_RESPONSE=$(curl -s -X POST "$KEYCLOAK_URL/admin/realms" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "@$REALM_FILE" \
        -w "%{http_code}")
    
    if [[ "$IMPORT_RESPONSE" =~ 20[0-9] ]]; then
        echo "Realm imported successfully!"
    else
        echo "Failed to import realm. HTTP status: $IMPORT_RESPONSE"
        exit 1
    fi
fi

echo "SSO Hub realm setup completed!"

# Display realm information
echo ""
echo "=== SSO Hub Realm Information ==="
echo "Realm: sso-hub"
echo "Keycloak Admin Console: $KEYCLOAK_URL/admin"
echo "Realm URL: $KEYCLOAK_URL/realms/sso-hub"
echo "OIDC Discovery: $KEYCLOAK_URL/realms/sso-hub/.well-known/openid_configuration"
echo ""
echo "Test Users:"
echo "  Admin: admin / admin123 (temporary password)"
echo "  Test User: testuser / test123"
echo ""
echo "Client:"
echo "  Client ID: sso-hub-client"
echo "  Client Secret: sso-client-secret"
echo "  Redirect URI: http://localhost/auth/callback"
