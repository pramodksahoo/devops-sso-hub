FROM quay.io/keycloak/keycloak:latest

# Copy custom theme
COPY themes/sso-hub-theme /opt/keycloak/themes/sso-hub-theme

# Copy realm import files
COPY import/ /opt/keycloak/data/import/

# Build the Keycloak image with our theme
RUN /opt/keycloak/bin/kc.sh build

# Set the entrypoint
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
