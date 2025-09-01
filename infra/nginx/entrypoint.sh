#!/bin/sh

set -e

# Create nginx conf.d directory
mkdir -p /etc/nginx/conf.d

# Check if SSL certificates are available
if [ -f "/etc/letsencrypt/live/${EXTERNAL_HOST}/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/${EXTERNAL_HOST}/privkey.pem" ]; then
    echo "SSL certificates found for ${EXTERNAL_HOST}, using SSL configuration"
    TEMPLATE_FILE="ssl-default.conf.template"
else
    echo "No SSL certificates found, using default HTTP configuration"
    TEMPLATE_FILE="default.conf.template"
fi

# Substitute environment variables in template
envsubst '${OIDC_CLIENT_ID} ${OIDC_CLIENT_SECRET} ${OIDC_REDIRECT_URI} ${OIDC_LOGOUT_PATH} ${OIDC_SCOPE} ${IDENTITY_HEADER_SECRET} ${SESSION_SECRET} ${KEYCLOAK_PUBLIC_URL} ${EXTERNAL_HOST}' \
  < "/etc/nginx/templates/${TEMPLATE_FILE}" \
  > /etc/nginx/conf.d/default.conf

echo "Using template: ${TEMPLATE_FILE}"
echo "Generated configuration for host: ${EXTERNAL_HOST:-localhost}"

# Validate nginx configuration
/usr/local/openresty/bin/openresty -t

# Execute the main command
exec "$@"
