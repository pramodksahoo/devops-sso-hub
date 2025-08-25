#!/bin/sh

set -e

# Create nginx conf.d directory
mkdir -p /etc/nginx/conf.d

# Substitute environment variables in template
envsubst '${OIDC_CLIENT_ID} ${OIDC_CLIENT_SECRET} ${OIDC_DISCOVERY_URL} ${OIDC_REDIRECT_URI} ${OIDC_LOGOUT_PATH} ${OIDC_SCOPE} ${IDENTITY_HEADER_SECRET} ${SESSION_SECRET}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

# Validate nginx configuration
/usr/local/openresty/bin/openresty -t

# Execute the main command
exec "$@"
