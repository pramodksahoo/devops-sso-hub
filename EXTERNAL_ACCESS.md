# External Access Configuration Guide

This guide explains how to configure SSO Hub for external access (accessing from other machines using IP addresses or domain names).

## Quick Start

The easiest way to configure external access is to run the interactive setup script:

```bash
./configure-external-access.sh
```

This script will:
1. Ask you for your deployment type (localhost, IP address, domain name, or custom)
2. Automatically detect your current IP address (if applicable)
3. Update all configuration files with the correct URLs
4. Provide instructions for restarting the services

## Manual Configuration

If you prefer to configure external access manually, you need to update the `.env` file before running `setup.sh`:

### Step 1: Edit .env File

Update these variables in your `.env` file:

```bash
# External Access Configuration
EXTERNAL_HOST=your.domain.com          # or your IP address like 192.168.1.100
EXTERNAL_PROTOCOL=http                 # or https for production
EXTERNAL_PORT=                         # leave empty for default ports, or :8080 for custom

# These will be automatically calculated based on the above:
FRONTEND_URL=http://your.domain.com
CORS_ORIGIN=http://your.domain.com
KC_HOSTNAME=your.domain.com
KEYCLOAK_PUBLIC_URL=http://your.domain.com:8080/realms/sso-hub
OIDC_REDIRECT_URI=http://your.domain.com:3002/auth/callback
```

### Step 2: Run Setup

After updating the `.env` file, run:

```bash
./setup.sh
```

## Configuration Examples

### 1. Local Network Access (IP Address)

```bash
EXTERNAL_HOST=192.168.1.100
EXTERNAL_PROTOCOL=http
EXTERNAL_PORT=
```

Access URLs:
- Frontend: `http://192.168.1.100`
- Keycloak Admin: `http://192.168.1.100:8080`

### 2. Production Domain (HTTPS)

```bash
EXTERNAL_HOST=sso-hub.company.com
EXTERNAL_PROTOCOL=https
EXTERNAL_PORT=
```

Access URLs:
- Frontend: `https://sso-hub.company.com`
- Keycloak Admin: `https://sso-hub.company.com:8080`

### 3. Custom Port Configuration

```bash
EXTERNAL_HOST=my-server.local
EXTERNAL_PROTOCOL=http
EXTERNAL_PORT=:8000
```

Access URLs:
- Frontend: `http://my-server.local:8000`
- Keycloak Admin: `http://my-server.local:8080`

## Network Requirements

### Firewall Configuration

Ensure your firewall allows inbound connections to these ports:

- **Port 80** (HTTP) or **443** (HTTPS) - Frontend access
- **Port 8080** - Keycloak admin interface
- **Port 3002** - Auth BFF API access

### Cloud Provider Configuration

If using cloud providers (AWS/GCP/Azure):

1. Configure security groups to allow inbound traffic
2. Ensure the instance has a public IP (if needed)
3. Configure load balancers (if applicable)

### DNS Configuration

For domain-based access:

1. Create DNS A record pointing to your server IP
2. Optional: Create additional A records:
   - `keycloak.yourdomain.com` → server IP
   - `api.yourdomain.com` → server IP

## HTTPS/SSL Configuration

For production deployments with HTTPS:

1. Obtain SSL certificates (Let's Encrypt, commercial CA, etc.)
2. Update the NGINX configuration in `infra/nginx/`
3. Set `EXTERNAL_PROTOCOL=https` in your `.env`
4. Ensure port 443 is accessible

## Troubleshooting

### "HTTPS Required" Error from Keycloak

This happens when Keycloak is configured to require HTTPS but you're using HTTP. Solutions:

1. **For development**: The setup automatically configures Keycloak for HTTP
2. **For production**: Configure SSL certificates and use HTTPS

### Frontend Shows "Sign in with SSO" but Redirects to Localhost

This means the frontend configuration wasn't properly updated. Solutions:

1. Run `./configure-external-access.sh` again
2. Rebuild the frontend: `docker-compose build --no-cache frontend`
3. Restart services: `docker-compose up -d`

### Cannot Access from Other Machines

1. Check firewall settings on the host machine
2. Verify the IP address is correct and accessible
3. For cloud instances, check security group settings
4. Test connectivity: `telnet your-ip-address 80`

## Dynamic IP Addresses

If your IP address changes frequently:

1. Use a dynamic DNS service (like DuckDNS, No-IP)
2. Set `EXTERNAL_HOST` to your dynamic DNS hostname
3. Or re-run `./configure-external-access.sh` when IP changes

## Security Considerations

- Always use HTTPS for production deployments
- Configure proper firewall rules
- Use strong passwords for admin accounts
- Consider using a reverse proxy (already included)
- Regularly update SSL certificates

## Support

If you encounter issues:

1. Check the setup logs: `./setup.log`
2. Verify service health: `docker-compose ps`
3. Check service logs: `docker-compose logs -f keycloak auth-bff frontend`
4. Run the validation script: `./validate-deployment.sh`