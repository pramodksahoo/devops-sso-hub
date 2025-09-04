# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SSO Hub is a production-ready Single Sign-On platform with 14 microservices designed to integrate with 11 major DevOps tools. The platform provides centralized authentication, user management, seamless zero-click access, comprehensive monitoring, analytics, and compliance across the entire DevOps ecosystem. Focusing on Open Source principle.

## Architecture

This is a microservices-based application with the following key components:

### Core Infrastructure
- **Frontend**: React app (port 3000) built with Vite, TypeScript, Tailwind CSS, and Radix UI
- **Auth-BFF**: Backend for Frontend service (port 3002) handling OIDC authentication and session management
- **NGINX Gateway**: Reverse proxy with OIDC integration for routing and authentication
- **Keycloak**: OIDC identity provider (port 8080)
- **PostgreSQL**: Primary database (port 5432)
- **Redis**: Caching and session storage (port 6379)

### Microservices (14 total)
- **Catalog Service** (3006): Tool registry and launch management with seamless SSO
- **Tools Health Service** (3004): Health monitoring for all integrated DevOps tools
- **User Service** (3003): User profiles and preferences
- **Admin Config Service** (3005): Configuration management and tool integration testing
- **Webhook Ingress Service** (3007): Centralized webhook processing
- **Audit Service** (3009): Comprehensive audit logging and compliance
- **Analytics Service** (3010): Usage analytics and reporting with CSV export
- **Provisioning Service** (3011): Template-based resource provisioning
- **LDAP Sync Service** (3012): Directory synchronization with conflict resolution
- **Policy Service** (3013): Access control and compliance management
- **Notifier Service** (3014): Multi-channel notifications (email, Slack, webhook)
- **Auth Proxy Service** (3015): Seamless SSO proxy for tools like Grafana

### Supported DevOps Tools
GitHub, GitLab, Jenkins, Argo CD, Terraform, SonarQube, Grafana, Prometheus, Kibana, Snyk, Jira/ServiceNow

## Commands

### Development (Docker Compose)
```bash
# Build all containers
docker-compose build

# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Build specific service (after making changes)
docker-compose build --no-cache <service-name>

# Restart specific service
docker-compose up -d <service-name>

# View logs for specific service
docker-compose logs -f <service-name>
```

### Root-Level Commands (Available but not used for dev)
```bash
# These commands exist but development uses Docker Compose
pnpm run build       # Build all services
pnpm run test        # Run all tests
pnpm run typecheck   # Run type checking
pnpm run lint        # Run linting (where available)
```

### Frontend-Specific Commands
```bash
cd apps/frontend

# Development server
pnpm run dev

# Build for production
pnpm run build

# Type checking
pnpm run typecheck

# Run tests with Vitest
pnpm run test

# Test with UI
pnpm run test:ui

# Test coverage
pnpm run test:coverage
```

### Service-Specific Commands
Most Node.js services support:
```bash
# Start production
pnpm run start

# Development with hot reload
pnpm run dev

# Run tests (where available)
pnpm run test
```

### End-to-End Testing
```bash
# Install Playwright browsers
pnpm run playwright:install

# Run E2E tests
pnpm run test:e2e

# Run E2E tests with UI
pnpm run test:e2e:ui

# Debug E2E tests
pnpm run test:e2e:debug
```

## Technology Stack

### Backend Services
- **Framework**: Fastify 4.27.0
- **Database**: PostgreSQL 15+ with @fastify/postgres
- **Cache**: Redis 7+ with @fastify/redis
- **Validation**: Zod schemas
- **Logging**: Pino structured logging
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: @fastify/helmet, @fastify/cors, @fastify/rate-limit
- **Authentication**: OIDC with Keycloak, JWT tokens, HMAC-signed identity headers

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives
- **Animation**: Framer Motion
- **Charts**: Recharts
- **Testing**: Vitest with Testing Library
- **State Management**: React Context API

### Development Tools
- **Package Manager**: pnpm with workspaces
- **Node.js Version**: 20+
- **TypeScript**: 5.3+
- **Containerization**: Docker with multi-stage builds
- **E2E Testing**: Playwright

## Key Patterns and Conventions

### Service Architecture
- Each microservice follows the same structure: `/src/index.js` as entry point
- All services use Fastify with consistent plugin registration
- Database connections use connection pooling
- CORS configured for frontend origin (http://localhost:3000)
- Rate limiting enabled on all services
- Health checks at `/healthz` and `/readyz` endpoints

### Authentication Flow
1. User authenticates via Auth-BFF with Keycloak OIDC
2. Session stored in Redis with secure httpOnly cookies
3. Identity headers (HMAC-signed) passed to downstream services
4. Services validate identity headers using shared secret

### Database Migrations
- Located in `/infra/db-migrations/` with sequential numbering
- Comprehensive schema for users, tools, audit logs, analytics, etc.
- Supports all microservice data requirements

### Configuration
- Environment variables defined in `.env.example`
- Docker Compose handles service orchestration
- Each service has its own configuration structure
- Secrets management through environment variables

### Error Handling and Logging
- Structured JSON logging with Pino
- Request/response logging with correlation IDs
- Error responses follow consistent format
- Health check endpoints for monitoring

### Testing Strategy
- Unit tests for individual services (where implemented)
- Integration tests for API endpoints
- E2E tests with Playwright for complete workflows
- Frontend tests with Vitest and Testing Library

## File Structure Guidelines

- `/apps/` - Frontend applications
- `/services/` - Backend microservices
- `/infra/` - Infrastructure components (DB migrations, Keycloak, NGINX)
- `/docs/` - Comprehensive service documentation
- Each service has its own `package.json` with specific dependencies

## Development Workflow

1. **All development uses Docker Compose** - there is no `pnpm run dev` command
2. When making changes to any service:
   - Rebuild the specific service: `docker-compose build --no-cache <service-name>`
   - Restart the service: `docker-compose up -d <service-name>`
3. Services are developed independently but follow consistent patterns
4. Use the monorepo workspace structure for dependency management
5. Environment variables for configuration (never commit secrets)
6. Follow the existing code style and patterns for consistency

## Security Considerations

- OIDC authentication flow with PKCE
- HMAC-signed identity headers for service-to-service communication
- Input validation with Zod schemas on all endpoints
- SQL injection prevention with parameterized queries
- XSS protection with security headers
- Rate limiting on all services
- Secure session management with httpOnly cookies