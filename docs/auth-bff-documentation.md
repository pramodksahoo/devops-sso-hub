# Auth-BFF Service Documentation

## Service Overview

### Service Name and Purpose
**Auth-BFF (Backend for Frontend)** - Authentication and session management service for the SSO Hub microservices architecture.

### Business Use Cases and Functional Requirements
- **Single Sign-On (SSO)**: Centralized authentication using Keycloak OIDC
- **Session Management**: Secure session handling with httpOnly cookies
- **Identity Propagation**: Generate identity headers for downstream services
- **Tool-Specific Authentication**: Generate tool-specific tokens for 11 supported DevOps tools
- **Role Mapping**: Map SSO Hub roles to tool-specific roles
- **Security**: Implement PKCE flow, secure headers, and session validation

### Service Boundaries and Responsibilities
- **Authentication Flow**: Handle OIDC login, callback, and logout
- **Session Lifecycle**: Create, validate, and destroy user sessions
- **Identity Headers**: Generate and validate HMAC-signed identity headers
- **Tool Integration**: Provide tool-specific authentication tokens
- **Security**: Implement security headers, CORS, and rate limiting

## Architecture Documentation

### High-Level Architecture Diagram
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Frontend  │───▶│   Auth-BFF   │───▶│  Keycloak   │
│             │    │              │    │   OIDC      │
└─────────────┘    └──────────────┘    └─────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │ Downstream   │
                   │  Services    │
                   │ (with ID     │
                   │  headers)    │
                   └──────────────┘
```

### Component Relationships and Interactions
1. **Frontend Integration**: Receives login requests and redirects to Keycloak
2. **Keycloak OIDC**: Handles authentication and returns authorization codes
3. **Session Store**: Manages user sessions using memory store (Phase 1)
4. **Identity Service**: Generates HMAC-signed headers for downstream services
5. **Tool Token Service**: Creates tool-specific authentication tokens

### Design Patterns Implemented
- **Backend for Frontend (BFF)**: Centralizes authentication logic
- **Session Management**: Secure cookie-based sessions
- **Identity Propagation**: Header-based identity passing
- **Factory Pattern**: Tool-specific token generation
- **Middleware Pattern**: Authentication and security middleware

## Technical Specifications

### Technology Stack and Frameworks
- **Runtime**: Node.js 20+
- **Web Framework**: Fastify 4.27.0
- **Session Management**: @fastify/session 10.9.0
- **OIDC Client**: openid-client 5.6.4
- **Security**: @fastify/helmet, @fastify/cors
- **Logging**: Pino 8.17.2
- **Validation**: Zod 3.22.4

### Programming Language and Version
- **Language**: JavaScript (CommonJS)
- **Node.js Version**: 20.0.0+
- **Package Manager**: pnpm

### Database Technologies
- **Primary**: Memory-based sessions (Phase 1)
- **Future**: Redis integration (Phase 2)
- **Session Store**: @fastify/session with memory adapter

### External Libraries and Dependencies
```json
{
  "@fastify/cookie": "^9.4.0",
  "@fastify/cors": "^9.0.1",
  "@fastify/session": "^10.9.0",
  "fastify": "4.27.0",
  "ioredis": "^5.3.2",
  "jsonwebtoken": "^9.0.2",
  "openid-client": "^5.6.4",
  "pino": "^8.17.2",
  "zod": "^3.22.4"
}
```

## API Documentation

### Complete Endpoint Specifications

#### Health Check Endpoints
```http
GET /healthz
GET /readyz
```

#### Authentication Endpoints
```http
GET /auth/login
GET /auth/callback
GET /auth/me
POST /auth/logout
GET /auth/headers
GET /auth/tools/:tool_id/token
```

### Request/Response Schemas

#### Login Response
```json
{
  "redirect": "Keycloak OIDC authorization URL"
}
```

#### User Session Response
```json
{
  "user": {
    "sub": "user-subject-id",
    "email": "user@example.com",
    "name": "User Name",
    "roles": ["admin", "user"],
    "groups": ["developers", "admins"]
  },
  "session": {
    "expiresAt": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "tools": {
    "roleMappings": {
      "github": ["admin", "maintainer"],
      "gitlab": ["owner", "maintainer"]
    },
    "supportedTools": ["github", "gitlab", "jenkins"],
    "totalToolsSupported": 11
  }
}
```

#### Tool Token Response
```json
{
  "tool_id": "github",
  "token": "jwt-token-string",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read:user user:email read:org repo",
  "tool_roles": ["admin", "maintainer"]
}
```

### Authentication and Authorization Details
- **OIDC Flow**: PKCE (Proof Key for Code Exchange)
- **Session Security**: httpOnly cookies with SameSite=lax
- **Identity Headers**: HMAC-signed headers for downstream services
- **Role Mapping**: Tool-specific role resolution based on SSO Hub roles

### Error Codes and Handling
```json
{
  "401": "Not authenticated",
  "400": "Bad request (missing parameters)",
  "500": "Internal server error"
}
```

## Service Dependencies

### Upstream and Downstream Service Dependencies
- **Upstream**: Keycloak OIDC server
- **Downstream**: All microservices requiring authentication
- **Frontend**: React application for user interface

### Third-Party Integrations
- **Keycloak**: OIDC identity provider
- **Redis**: Future session storage (Phase 2)

### Database Connections
- **Current**: Memory-based sessions
- **Future**: Redis for session persistence

### Message Queue Interactions
- **Current**: None
- **Future**: Redis pub/sub for session invalidation

## Health & Monitoring

### Health Check Endpoints
- **`/healthz`**: Basic health status
- **`/readyz`**: Service readiness with dependency checks

### Monitoring and Logging Configurations
- **Logging**: Pino with configurable log levels
- **Metrics**: Request/response logging
- **Structured Logging**: JSON format for production

### Performance Metrics
- **Session Creation Time**: OIDC flow performance
- **Token Generation**: Tool-specific token creation time
- **Memory Usage**: Session store memory consumption

### Alerting Mechanisms
- **OIDC Client Initialization**: Keycloak connectivity
- **Session Store Health**: Memory session availability
- **Authentication Failures**: Failed login attempts

## Directory Structure

### Complete Folder Hierarchy
```
services/auth-bff/
├── Dockerfile
├── package.json
├── README.md
└── src/
    ├── config.js
    ├── index.js
    └── redis-session-store.js
```

### File Organization Explanation
- **`config.js`**: Environment-based configuration
- **`index.js`**: Main service implementation
- **`redis-session-store.js`**: Future Redis integration
- **`Dockerfile`**: Container configuration
- **`package.json`**: Dependencies and scripts

### Key Configuration Files Location
- **Environment Variables**: `.env` file or Docker environment
- **OIDC Configuration**: Keycloak realm settings
- **Session Configuration**: Memory store settings
- **Security Headers**: CSP and security policy configuration

## Security Features

### Authentication Security
- **PKCE Flow**: Prevents authorization code interception
- **Session Validation**: Token expiration and validation
- **Secure Cookies**: httpOnly, SameSite=lax configuration

### Authorization Security
- **Role-Based Access Control**: Tool-specific role mapping
- **Identity Header Validation**: HMAC signature verification
- **Session Invalidation**: Proper logout and cleanup

### Data Protection
- **No Sensitive Data Storage**: Tokens stored in memory only
- **Secure Headers**: CSP, HSTS, and security headers
- **Rate Limiting**: Request throttling for security

## Deployment and Configuration

### Environment Variables
```bash
# Server Configuration
HOST=0.0.0.0
PORT=3002
LOG_LEVEL=info

# OIDC Configuration
OIDC_CLIENT_ID=sso-hub-client
OIDC_CLIENT_SECRET=sso-client-secret
OIDC_REDIRECT_URI=http://localhost:3002/auth/callback

# Session Configuration
SESSION_SECRET=your-session-secret-here
SESSION_COOKIE_NAME=sso_session
SESSION_MAX_AGE=86400000

# Security Configuration
IDENTITY_HEADER_SECRET=your-hmac-secret-here
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

### Docker Configuration
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3002
CMD ["npm", "start"]
```

### Health Check Commands
```bash
# Health check
curl http://localhost:3002/healthz

# Readiness check
curl http://localhost:3002/readyz

# Authentication test
curl http://localhost:3002/auth/me
```

## Future Enhancements (Phase 2)

### Planned Features
- **Redis Sessions**: Persistent session storage
- **Advanced Monitoring**: Prometheus metrics integration
- **Session Clustering**: Multi-instance session sharing
- **Enhanced Security**: Additional security headers and policies

### Migration Path
- **Phase 1**: Memory sessions (current)
- **Phase 2**: Redis sessions with external store
- **Phase 3**: Advanced monitoring and alerting

## Troubleshooting

### Common Issues
1. **Session Loss**: Check cookie configuration and SameSite settings
2. **OIDC Errors**: Verify Keycloak connectivity and client configuration
3. **Memory Issues**: Monitor session store memory usage
4. **CORS Errors**: Validate CORS origin configuration

### Debug Commands
```bash
# Check service logs
docker logs auth-bff

# Verify OIDC client
curl -v http://localhost:3002/readyz

# Test authentication flow
curl -v http://localhost:3002/auth/login
```

### Log Analysis
- **Authentication Flow**: Track OIDC login/callback process
- **Session Management**: Monitor session creation/destruction
- **Error Tracking**: Identify authentication failures and causes
