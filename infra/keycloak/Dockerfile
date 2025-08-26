FROM quay.io/keycloak/keycloak:latest

# Copy custom theme
COPY themes/sso-hub-theme /opt/keycloak/themes/sso-hub-theme

# Copy realm import files
COPY import/ /opt/keycloak/data/import/

# Copy SSL disabling script
COPY disable-ssl.sh /opt/keycloak/bin/disable-ssl.sh
RUN chmod +x /opt/keycloak/bin/disable-ssl.sh

# Copy entrypoint script
COPY entrypoint.sh /opt/keycloak/bin/entrypoint.sh
RUN chmod +x /opt/keycloak/bin/entrypoint.sh

# Build the Keycloak image with our theme
RUN /opt/keycloak/bin/kc.sh build

# Set the custom entrypoint
ENTRYPOINT ["/opt/keycloak/bin/entrypoint.sh"]
