# Auth BFF Service

Backend for Frontend (BFF) service that handles authentication, session management, and provides secure identity headers for downstream services.

## Features

- **PKCE OIDC Flow**: Secure authentication with Keycloak
- **Session Management**: Redis-backed sessions with httpOnly cookies
- **Identity Headers**: HMAC-signed headers for service-to-service communication
- **Security First**: No tokens in browser storage, proper CORS and security headers

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │◄───┤  Auth BFF   │◄───┤  Keycloak   │
│ (Frontend)  │    │  (Session)  │    │   (OIDC)    │
└─────────────┘    └─────────────┘    └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │    Redis    │
                   │  (Sessions) │
                   └─────────────┘
```

## Endpoints

### Authentication
- `GET /auth/login` - Initiate OIDC login flow
- `GET /auth/callback` - OIDC callback handler
- `GET /auth/me` - Get current user session
- `POST /auth/logout` - Logout and clear session

### Utility
- `GET /healthz` - Health check
- `GET /readyz` - Readiness check (includes Redis connectivity)
- `GET /auth/headers` - Get identity headers for current session

### Protected Routes
- `GET /api/*` - Protected endpoints with automatic identity header injection

## Security Features

### Session Security
- httpOnly cookies (no JavaScript access)
- SameSite=strict (CSRF protection)
- Secure flag in production
- Redis-backed storage (no server-side session affinity)

### Identity Headers
HMAC-signed headers for service-to-service authentication:
- `X-User-Sub` - User subject/ID
- `X-User-Email` - User email
- `X-User-Roles` - Comma-separated roles
- `X-User-Name` - User display name
- `X-User-Signature` - HMAC signature for verification

### PKCE Flow
- Code verifier/challenge for additional security
- State parameter validation
- Nonce validation
- Secure token exchange

## Configuration

All configuration via environment variables:

```bash
# Server
PORT=3002
HOST=0.0.0.0
LOG_LEVEL=info

# OIDC
OIDC_ISSUER=http://keycloak:8080/realms/sso-hub
OIDC_CLIENT_ID=sso-hub-client
OIDC_CLIENT_SECRET=sso-client-secret
OIDC_REDIRECT_URI=http://localhost:3002/auth/callback

# Session
SESSION_SECRET=your-32-char-secret-here
SESSION_COOKIE_NAME=sso_session
SESSION_MAX_AGE=86400000

# Redis
REDIS_URL=redis://redis:6379

# Security
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
IDENTITY_HEADER_SECRET=your-32-char-hmac-secret
```

## Usage

### Development
```bash
pnpm install
pnpm dev
```

### Production
```bash
pnpm build
pnpm start
```

### Docker
```bash
docker build -t auth-bff .
docker run -p 3002:3002 auth-bff
```

## Authentication Flow

1. **Login Initiation**: User visits `/auth/login`
2. **PKCE Generation**: Generate state, nonce, and code verifier
3. **Redirect to Keycloak**: User redirected to Keycloak login
4. **Callback**: User redirected back to `/auth/callback` with auth code
5. **Token Exchange**: Exchange code for tokens using PKCE
6. **Session Creation**: Store user session in Redis
7. **Identity Headers**: Provide signed headers for downstream services

## Integration with Other Services

Other services can:
1. Call `/auth/headers` to get identity headers for API calls
2. Use the `/api/*` proxy endpoints for automatic header injection
3. Validate identity headers using the HMAC signature

## Security Considerations

- Sessions expire automatically based on token lifetime
- All cookies are httpOnly and SameSite=strict
- HMAC signatures prevent header tampering
- Redis sessions allow horizontal scaling
- No sensitive tokens stored in browser storage
