# Changelog

All notable changes to the SSO Hub project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2024-01-15

### Added - Phase 0: Bootstrap Platform

#### Infrastructure
- Docker Compose orchestration for all services
- NGINX reverse proxy with OpenResty and lua-resty-openidc
- Keycloak 23.0 as Identity Provider with PostgreSQL backend
- Redis for session storage and message queues
- Infisical OSS for secrets management
- PostgreSQL 15 with automated initialization scripts

#### Security Features
- OIDC authentication flow with PKCE support
- HMAC-signed identity headers for service-to-service communication
- Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- Rate limiting for authentication and API endpoints
- httpOnly, SameSite=strict cookie configuration

#### Authentication & Authorization
- SSO Hub Keycloak realm with predefined roles (admin, user, viewer)
- Test users with different permission levels
- Client configuration for OIDC flow
- Role-based access control foundations

#### Sample Services
- Echo service for testing identity header propagation
- Health check endpoints (/healthz, /readyz) across all services
- Structured logging with Pino

#### Development Infrastructure
- pnpm monorepo workspace configuration
- TypeScript strict mode across all services
- ESLint and Prettier configuration
- Docker multi-stage builds for optimal image sizes

#### Documentation
- Comprehensive README with quick start guide
- Operations runbook with troubleshooting procedures
- Environment configuration templates
- Security guidelines and best practices

### Security Considerations

- All secrets managed via environment variables (no hardcoded values)
- Database credentials properly isolated
- Session secrets with minimum 32-character entropy
- HMAC keys for header signing
- Temporary passwords for default admin accounts
- Audit trail for all administrative actions

### Testing & Validation

- Login round-trip functionality verified
- Identity header propagation tested
- Service health monitoring implemented
- Container health checks configured
- Network isolation and service discovery tested

### Known Limitations

- Development-focused configuration (HTTP, self-signed certs)
- Basic error handling (will be enhanced in future phases)
- Limited monitoring/observability (OpenTelemetry planned)
- No frontend UI yet (echo service only)

### Breaking Changes

- None (initial release)

### Migration Notes

- Fresh installation only
- No migration path from previous versions
- Database schemas are initialized on first run

## Security Fixes

- N/A (initial release)

## Dependencies

### Runtime Dependencies
- Node.js 20+
- Docker & Docker Compose
- OpenResty/NGINX with Lua modules
- PostgreSQL 15
- Redis 7
- Keycloak 23.0

### Development Dependencies
- pnpm 8+
- TypeScript 5.3+
- ESLint 8+
- Prettier 3+

## Upcoming in Next Phases

### Phase 1: Auth BFF and Session Model
- Browser-to-backend session management
- PKCE exchange optimization
- Back-channel logout handling
- Frontend React application foundation

### Phase 2: Admin Configuration and Secrets
- System settings CRUD interface
- Infisical integration for secret resolution
- Admin UI for configuration management
- Test connection endpoints

### Phase 3: Catalog and RBAC Policy
- Tool registry with categories and metadata
- Policy decision engine
- Role-based tool visibility
- Launch workflow implementation

For detailed phase plans, see [Development Roadmap](./roadmap.md).
