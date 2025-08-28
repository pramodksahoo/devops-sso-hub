FROM quay.io/keycloak/keycloak:24.0

# Switch to root user for file operations
USER root

# Install required tools for configuration scripts
RUN microdnf update -y && \
    microdnf install -y curl netcat-openbsd procps && \
    microdnf clean all

# Create directories and ensure they exist
RUN mkdir -p /opt/keycloak/bin \
    && mkdir -p /opt/keycloak/themes \
    && mkdir -p /opt/keycloak/data/import

# Copy custom theme
COPY themes/sso-hub-theme /opt/keycloak/themes/sso-hub-theme

# Copy realm import files
COPY import/ /opt/keycloak/data/import/

# Copy scripts with explicit permissions
COPY configure-keycloak.sh /opt/keycloak/bin/configure-keycloak.sh
COPY entrypoint.sh /opt/keycloak/bin/entrypoint.sh

# Set permissions and ownership in one layer
RUN chmod +x /opt/keycloak/bin/configure-keycloak.sh \
    && chmod +x /opt/keycloak/bin/entrypoint.sh \
    && chown -R keycloak:keycloak /opt/keycloak

# Switch back to keycloak user
USER keycloak

# Build the Keycloak image with our theme
RUN /opt/keycloak/bin/kc.sh build

# Set the custom entrypoint
ENTRYPOINT ["/opt/keycloak/bin/entrypoint.sh"]
