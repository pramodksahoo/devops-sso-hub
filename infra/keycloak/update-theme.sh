#!/bin/bash

# Wait for Keycloak to be ready
echo "Waiting for Keycloak to be ready..."
until curl -f http://localhost:8080/realms/master > /dev/null 2>&1; do
    sleep 2
done

echo "Keycloak is ready. Updating realm theme..."

# Get admin token
ADMIN_TOKEN=$(curl -s -X POST \
  http://localhost:8080/realms/master/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin_secure_password_123" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ "$ADMIN_TOKEN" != "null" ] && [ -n "$ADMIN_TOKEN" ]; then
    echo "Got admin token, updating realm theme..."
    
    # Update the realm to use our custom theme
    curl -s -X PUT \
      http://localhost:8080/admin/realms/sso-hub \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "realm": "sso-hub",
        "loginTheme": "sso-hub-theme"
      }'
    
    echo "Theme updated successfully!"
else
    echo "Failed to get admin token"
    exit 1
fi
