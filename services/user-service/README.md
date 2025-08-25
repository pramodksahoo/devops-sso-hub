# User Service

Enterprise user management service for SSO Hub - handles user profiles, preferences, API keys, and local user data extending Keycloak authentication.

## Features

- **User Profile Management**: Create and update user profiles with extended metadata
- **Auto-provisioning**: Automatically create user profiles from Keycloak identity headers
- **API Key Management**: Generate, manage, and revoke user API keys for programmatic access
- **User Groups**: Local user group management with role-based permissions
- **Session Tracking**: Track user sessions and login analytics
- **Enterprise Security**: HMAC-signed identity headers and comprehensive authorization

## API Endpoints

### User Profile Management
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update current user profile
- `GET /users` - Search and list users (admin only)
- `GET /users/:userId` - Get user by ID (admin only)

### API Key Management
- `POST /users/me/api-keys` - Create new API key
- `GET /users/me/api-keys` - List user's API keys
- `DELETE /users/me/api-keys/:keyId` - Revoke API key

### User Groups (Admin Only)
- `POST /groups` - Create user group
- `GET /groups` - List user groups

### Health & Monitoring
- `GET /healthz` - Health check
- `GET /readyz` - Readiness check
- `GET /docs` - OpenAPI documentation

## Authentication

The service supports two authentication methods:

### 1. Identity Headers (Primary)
HMAC-signed headers from Auth-BFF service:
- `X-User-Sub`: Keycloak user ID
- `X-User-Email`: User email
- `X-User-Name`: User display name
- `X-User-Roles`: Comma-separated roles
- `X-User-Groups`: Comma-separated groups
- `X-User-Signature`: HMAC signature

### 2. API Keys
Bearer token authentication using user-generated API keys:
```
Authorization: Bearer <api-key>
```

## Database Schema

### Core Tables
- `users` - User profiles extending Keycloak data
- `user_sessions` - Session tracking and analytics
- `user_api_keys` - User-generated API keys
- `user_groups` - Local user groups
- `user_group_memberships` - Group membership relationships

## Configuration

Environment variables:
- `PORT` - Service port (default: 3003)
- `HOST` - Service host (default: 0.0.0.0)
- `DATABASE_URL` - PostgreSQL connection string
- `IDENTITY_HEADER_SECRET` - HMAC secret for identity headers
- `CORS_ORIGIN` - CORS allowed origin
- `LOG_LEVEL` - Logging level (info, debug, error)

## Development

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm run migrate

# Start development server
pnpm run dev

# Start production server
pnpm start
```

## Docker

```bash
# Build image
docker build -t sso-hub/user-service .

# Run container
docker run -p 3003:3003 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e IDENTITY_HEADER_SECRET=your-secret \
  sso-hub/user-service
```

## Security Considerations

- All API endpoints require authentication
- Admin endpoints require specific role permissions
- API keys are hashed using bcrypt
- HMAC signatures prevent header tampering
- Rate limiting applied to all endpoints
- Input validation using Zod schemas
- SQL injection protection via parameterized queries

## Integration with SSO Hub

This service integrates with:
- **Auth-BFF**: Receives identity headers for authentication
- **Keycloak**: Extends user data from Keycloak identity
- **PostgreSQL**: Stores user profiles and local data
- **NGINX**: Receives authenticated requests via reverse proxy

The service automatically creates user profiles when users first access the system through Keycloak authentication, extending the SSO identity with local profile data and preferences.
