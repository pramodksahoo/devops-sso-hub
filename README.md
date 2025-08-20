# SSO Hub - DevOps Tools Single Sign-On Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.27.0-blue.svg)](https://fastify.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red.svg)](https://redis.io/)
[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)](https://github.com)
[![Microservices](https://img.shields.io/badge/Architecture-14%20Microservices-blue.svg)](https://microservices.io/)

## 🚀 Overview

**SSO Hub** is a **production-ready** Single Sign-On (SSO) platform with **14 microservices** designed to integrate with **11 major DevOps tools**, providing centralized authentication, user management, **seamless zero-click access**, comprehensive monitoring, analytics, and compliance across your entire DevOps ecosystem.

> **Current Status**: ✅ **Production Ready** - All 14 microservices implemented and functional
> 
> **NEW**: 🎉 **Seamless SSO** - Launch Grafana and other tools with zero additional clicks!

### 🎯 What Problem Does It Solve?

- **Authentication Fragmentation**: Eliminates the need to manage separate credentials for each DevOps tool
- **Access Control Complexity**: Centralizes user permissions and role management
- **Security Gaps**: Provides consistent security policies and audit trails across all tools
- **User Experience**: Single login provides access to all integrated DevOps tools
- **Compliance**: Maintains comprehensive audit logs for regulatory compliance

### 🛠️ Supported DevOps Tools

| Tool | Purpose | Integration Type |
|------|---------|------------------|
| **GitHub** | Repository Management | OIDC, Webhooks, API |
| **GitLab** | Project Management | OIDC, Webhooks, API |
| **Jenkins** | Build Automation | OIDC, Webhooks, API |
| **Argo CD** | Deployment Management | OIDC, Webhooks, API |
| **Terraform** | Infrastructure as Code | OIDC, Webhooks, API |
| **SonarQube** | Code Quality | OIDC, Webhooks, API |
| **Grafana** | Monitoring Dashboards | OIDC, Webhooks, API |
| **Prometheus** | Metrics Collection | OIDC, Webhooks, API |
| **Kibana** | Log Analysis | OIDC, Webhooks, API |
| **Snyk** | Security Scanning | OIDC, Webhooks, API |
| **Jira/ServiceNow** | Issue Tracking | OIDC, Webhooks, API |

## 🏗️ Microservices Architecture

### ✅ Implemented Services (14/14)

| Service | Port | Status | Key Features |
|---------|------|--------|--------------|
| **Frontend** | 3000 | ✅ Production | Modern React interface, admin panels |
| **Auth-BFF** | 3002 | ✅ Production | OIDC flow, session management |
| **User Service** | 3003 | ✅ Production | Profile management, API keys |
| **Tools Health** | 3004 | ✅ Production | Comprehensive monitoring, alerts |
| **Admin Config** | 3005 | ✅ Functional | Tool configuration, testing |
| **Catalog** | 3006 | ✅ Production | Enhanced tool catalog, **seamless launch** |
| **Webhook Ingress** | 3007 | ✅ Production | Multi-tool event processing |
| **Audit** | 3009 | ✅ Production | Comprehensive audit trails |
| **Analytics** | 3010 | ✅ Production | Advanced reporting, CSV export |
| **Provisioning** | 3011 | ✅ Production | Template-based workflows |
| **LDAP Sync** | 3012 | ✅ Production | Directory synchronization |
| **Policy** | 3013 | ✅ Production | Access control, compliance |
| **Notifier** | 3014 | ✅ Production | Multi-channel alerts |
| **Auth Proxy** | 3015 | ✅ Production | **NEW: Seamless SSO proxy** |

## 🏗️ High-Level Architecture

```mermaid
flowchart TD

%% ---------- Styles (use : not =) ----------
classDef frontend fill:#E3F2FD,stroke:#1565C0,stroke-width:1px,color:#0D47A1
classDef gateway  fill:#FFE0B2,stroke:#EF6C00,stroke-width:1px,color:#E65100
classDef auth     fill:#FFCDD2,stroke:#C62828,stroke-width:1px,color:#B71C1C
classDef core     fill:#C8E6C9,stroke:#2E7D32,stroke-width:1px,color:#1B5E20
classDef data     fill:#BBDEFB,stroke:#1565C0,stroke-width:1px,color:#0D47A1
classDef external fill:#E1BEE7,stroke:#6A1B9A,stroke-width:1px,color:#4A148C

%% ---------- Frontend ----------
subgraph F[Frontend Layer]
  FE[React Frontend<br/>Port 3000]:::frontend
end

%% ---------- Gateway ----------
subgraph G[Gateway Layer]
  GW[NGINX Gateway<br/>OpenResty + lua-resty-openidc]:::gateway
end

%% ---------- Authentication ----------
subgraph A[Authentication Layer]
  AUTHBFF[Auth-BFF Service<br/>Port 3002]:::auth
  KC[Keycloak OIDC<br/>Port 8080]:::auth
end

%% ---------- Core Services ----------
subgraph C[Core Services Layer]
  TH[Tools Health<br/>Port 3004]:::core
  ANA[Analytics Service<br/>Port 3010]:::core
  AUD[Audit Service<br/>Port 3009]:::core
  CAT[Catalog Service<br/>Port 3006]:::core
  LDAP[LDAP Sync<br/>Port 3012]:::core
  ADMIN[Admin Config<br/>Port 3005]:::core
  USER[User Service<br/>Port 3003]:::core
  POLICY[Policy Service<br/>Port 3013]:::core
  NOTIFY[Notifier<br/>Port 3014]:::core
  WEBHOOK[Webhook Ingress<br/>Port 3007]:::core
  PROV[Provisioning<br/>Port 3011]:::core
end

%% ---------- Data ----------
subgraph D[Data Layer]
  PG[(PostgreSQL 15<br/>Port 5432)]:::data
  REDIS[(Redis Cache 7<br/>Port 6379)]:::data
end

%% ---------- External Tools ----------
subgraph X[External Tools]
  GH[GitHub]:::external
  GL[GitLab]:::external
  JENK[Jenkins]:::external
  ARGO[Argo CD]:::external
  TERR[Terraform]:::external
  SONAR[SonarQube]:::external
  GRAF[Grafana]:::external
  PROM[Prometheus]:::external
  KIB[Kibana]:::external
  SNYK[Snyk]:::external
  JIRA[Jira / ServiceNow]:::external
end

%% ---------- Connections ----------
FE --> GW
GW --> AUTHBFF
AUTHBFF --> KC

GW --> TH
GW --> ANA
GW --> AUD
GW --> CAT
GW --> LDAP
GW --> ADMIN
GW --> USER
GW --> POLICY
GW --> NOTIFY
GW --> WEBHOOK
GW --> PROV

TH --> PG
ANA --> PG
AUD --> PG
CAT --> PG
LDAP --> PG
ADMIN --> PG
USER --> PG
POLICY --> PG
NOTIFY --> PG
WEBHOOK --> PG
PROV --> PG

CAT --> REDIS
USER --> REDIS

ADMIN --> GH
ADMIN --> GL
ADMIN --> JENK
ADMIN --> ARGO
ADMIN --> TERR
ADMIN --> SONAR
ADMIN --> GRAF
ADMIN --> PROM
ADMIN --> KIB
ADMIN --> SNYK
ADMIN --> JIRA
```

## 🔄 System Design & Workflow

### Authentication Flow

>![Data Flow Architecture](docs/data-flow-architecture.svg) *High-Level Data Flow Architecture*

### Tool Integration Workflow

>![Tool Intigration Workflow](docs/toolintigration-workflow.svg) *High-Level Tool Integration Workflow*

## 🔐 Security Architecture

### Authentication & Authorization
- **OIDC Integration**: Industry-standard OpenID Connect with Keycloak
- **PKCE Flow**: Proof Key for Code Exchange for enhanced security
- **Session Management**: Secure httpOnly cookies with configurable expiration
- **Role-Based Access Control**: Granular permissions per tool and service
- **Identity Propagation**: HMAC-signed headers for service-to-service communication

### Data Protection
- **Input Validation**: Zod schema validation for all API inputs
- **SQL Injection Prevention**: Parameterized queries and ORM usage
- **XSS Protection**: Content Security Policy headers
- **Rate Limiting**: Configurable request throttling per service
- **CORS Configuration**: Strict origin validation

### Compliance & Auditing
- **Audit Logging**: Complete activity trail for all services
- **Compliance Frameworks**: SOX, GDPR, SOC2 support
- **Data Encryption**: Sensitive data encryption at rest and in transit
- **Access Logging**: Comprehensive access attempt logging

## 🚀 Key Features

### 🔑 Single Sign-On
- **Unified Authentication**: One login for all DevOps tools
- **Seamless Integration**: Native OIDC support across all tools
- **Session Management**: Persistent sessions with automatic renewal
- **Logout Propagation**: Single logout clears all tool sessions

### 🛠️ Tool Management
- **Centralized Catalog**: Single source of truth for all tool configurations
- **Health Monitoring**: Real-time status monitoring for all integrated tools
- **Provisioning Automation**: Template-based resource creation
- **Webhook Processing**: Centralized event handling and routing

### 📊 Analytics & Reporting
- **Usage Analytics**: Comprehensive usage metrics across all tools
- **Performance Monitoring**: Service health and performance tracking
- **Custom Reports**: Configurable reporting and data export
- **Cross-Tool Insights**: Unified view of DevOps ecosystem

### 🔒 Security & Compliance
- **Policy Management**: Centralized access control policies
- **Audit Trails**: Complete activity logging for compliance
- **Role Mapping**: SSO Hub roles to tool-specific roles
- **Security Monitoring**: Real-time security event detection

## 🏃‍♂️ Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### 1. Clone the Repository
```bash
git clone <repository-url>
cd agent-devops-sso
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Services
```bash
docker-compose up -d
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Keycloak Admin**: http://localhost:8080
- **API Documentation**: http://localhost:3006/docs (Catalog Service)

## 📚 Documentation

For detailed information about each service, see the [docs/](./docs/) directory:

- [Microservices Overview](./docs/microservices-overview.md)
- [Auth-BFF Service](./docs/auth-bff-documentation.md)
- [Catalog Service](./docs/catalog-service-documentation.md)
- [Tools Health Service](./docs/tools-health-service-documentation.md)
- [Provisioning Service](./docs/provisioning-service-documentation.md)
- [Analytics Service](./docs/analytics-service-documentation.md)
- [Audit Service](./docs/audit-service-documentation.md)
- [Webhook Ingress Service](./docs/webhook-ingress-service-documentation.md)
- [LDAP Sync Service](./docs/ldap-sync-service-documentation.md)
- [Admin Config Service](./docs/admin-config-service-documentation.md)
- [User Service](./docs/user-service-documentation.md)
- [Policy Service](./docs/policy-service-documentation.md)
- [Notifier Service](./docs/notifier-service-documentation.md)

## 🏗️ Technology Stack

### Core Technologies
- **Runtime**: Node.js 20+
- **Framework**: Fastify 4.27.0
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **Authentication**: Keycloak OIDC
- **Containerization**: Docker & Docker Compose

### Key Libraries
- **Validation**: Zod 3.22.4
- **Logging**: Pino 8.17.2
- **API Documentation**: Swagger/OpenAPI 3.0
- **Security**: @fastify/helmet, @fastify/cors
- **Rate Limiting**: @fastify/rate-limit

## 🔧 Configuration

### Environment Variables
```bash
# Core Configuration
NODE_ENV=production
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/sso_hub
REDIS_URL=redis://localhost:6379

# Keycloak OIDC
OIDC_CLIENT_ID=sso-hub-client
OIDC_CLIENT_SECRET=your-secret
OIDC_REDIRECT_URI=http://localhost:3002/auth/callback

# Security
SESSION_SECRET=your-session-secret
IDENTITY_HEADER_SECRET=your-hmac-secret
```

## 📈 Monitoring & Health Checks

### Health Endpoints
Each service provides health monitoring endpoints:
- **`/healthz`**: Basic health status
- **`/readyz`**: Service readiness with dependency checks

### Example Health Check
```bash
# Check all services health
curl http://localhost:3002/healthz  # Auth-BFF
curl http://localhost:3006/healthz  # Catalog
curl http://localhost:3004/healthz  # Tools Health
curl http://localhost:3011/healthz  # Provisioning
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](./docs/) directory
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Core microservices architecture
- ✅ OIDC authentication integration
- ✅ Basic tool integration and health monitoring
- ✅ Webhook processing and provisioning

### Phase 2 (Next)
- 🔄 Advanced analytics and reporting
- 🔄 Enhanced security features
- 🔄 Performance optimization
- 🔄 Advanced monitoring and alerting

### Phase 3 (Future)
- 🔮 AI-powered insights and optimization
- 🔮 Advanced workflow automation
- 🔮 Machine learning integration
- 🔮 Enterprise-grade features

---

**SSO Hub** - Unifying your DevOps ecosystem with secure, centralized authentication and management.

