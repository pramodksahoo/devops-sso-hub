#!/bin/bash

# Wait for Keycloak to be ready
echo "Waiting for Keycloak to be ready..."
until curl -f http://localhost:8080/realms/master > /dev/null 2>&1; do
    sleep 2
done

echo "Keycloak is ready. Creating admin user..."

# Get admin token using Keycloak bootstrap admin
ADMIN_TOKEN=$(curl -s -X POST \
  http://localhost:8080/realms/master/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin_password" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ "$ADMIN_TOKEN" != "null" ] && [ -n "$ADMIN_TOKEN" ]; then
    echo "Got admin token, creating SSO Hub admin user..."
    
    # Create the admin user in sso-hub realm
    curl -s -X POST \
      http://localhost:8080/admin/realms/sso-hub/users \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "username": "admin",
        "enabled": true,
        "emailVerified": true,
        "firstName": "System",
        "lastName": "Administrator",
        "email": "admin@sso-hub.local",
        "credentials": [{
          "type": "password",
          "value": "admin@123",
          "temporary": false
        }]
      }'
    
    # Get the user ID
    USER_ID=$(curl -s -X GET \
      "http://localhost:8080/admin/realms/sso-hub/users?username=admin" \
      -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0].id')
    
    if [ "$USER_ID" != "null" ] && [ -n "$USER_ID" ]; then
        echo "User created with ID: $USER_ID"
        
        # Add admin role to user
        curl -s -X POST \
          "http://localhost:8080/admin/realms/sso-hub/users/$USER_ID/role-mappings/realm" \
          -H "Authorization: Bearer $ADMIN_TOKEN" \
          -H "Content-Type: application/json" \
          -d '[
            {
              "name": "admin",
              "description": "Administrative user role"
            }
          ]'
        
        # Add user to admins group
        ADMIN_GROUP_ID=$(curl -s -X GET \
          "http://localhost:8080/admin/realms/sso-hub/groups?search=admins" \
          -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0].id')
        
        if [ "$ADMIN_GROUP_ID" != "null" ] && [ -n "$ADMIN_GROUP_ID" ]; then
            curl -s -X PUT \
              "http://localhost:8080/admin/realms/sso-hub/users/$USER_ID/groups/$ADMIN_GROUP_ID" \
              -H "Authorization: Bearer $ADMIN_TOKEN"
            echo "Admin user added to admins group successfully!"
        fi
        
        echo "✅ Admin user created successfully!"
        echo "Credentials: admin@sso-hub.local / admin@123"
    else
        echo "Failed to get user ID"
    fi
else
    echo "Failed to get admin token"
    exit 1
fi
