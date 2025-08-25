FROM openresty/openresty:alpine

# Install additional packages and lua modules
RUN apk add --no-cache \
    curl \
    ca-certificates \
    git \
    perl \
    gettext \
    && opm install zmartzone/lua-resty-openidc \
    && opm install jkeys089/lua-resty-hmac \
    && opm install openresty/lua-resty-string

# Create necessary directories
RUN mkdir -p /var/log/nginx /etc/nginx/templates

# Copy NGINX configuration
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY proxy_params /etc/nginx/proxy_params
COPY entrypoint.sh /entrypoint.sh

# Make entrypoint executable
RUN chmod +x /entrypoint.sh

EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/local/openresty/bin/openresty", "-g", "daemon off;"]
