# Tools Health Service Documentation

## Service Overview

### Service Name and Purpose
**Tools Health Service** - Comprehensive health monitoring and management service for all DevOps tools integrated with SSO Hub.

### Business Use Cases and Functional Requirements
- **Tool Health Monitoring**: Real-time health status monitoring for all 11 DevOps tools
- **Service Discovery**: Dynamic tool registration and discovery capabilities
- **Access Control**: Role-based access control for tool management
- **Health Metrics Collection**: Gather performance and availability metrics
- **Alerting and Notifications**: Proactive health issue detection and alerting
- **Tool Integration Management**: Handle tool registration, configuration, and lifecycle
- **Performance Analytics**: Collect and analyze tool performance data

### Service Boundaries and Responsibilities
- **Health Monitoring**: Monitor tool availability, response time, and error rates
- **Service Registry**: Maintain dynamic registry of all integrated tools
- **Access Control**: Enforce role-based permissions for tool management
- **Metrics Collection**: Gather and store tool performance metrics
- **Alert Management**: Generate and manage health alerts and notifications
- **Tool Lifecycle**: Handle tool registration, updates, and decommissioning

## Architecture Documentation

### High-Level Architecture Diagram
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Frontend  │───▶│ Tools Health │───▶│ PostgreSQL  │
│             │    │   Service    │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   External   │
                   │ DevOps Tools │
                   │ (Health      │
                   │  Checks)     │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Alerting   │
                   │   System     │
                   └──────────────┘
```

### Component Relationships and Interactions
1. **Frontend Integration**: Receives health status requests and tool management requests
2. **Health Monitor**: Actively monitors tool health and performance
3. **Service Registry**: Manages tool registration and discovery
4. **Access Control**: Enforces permissions for tool operations
5. **Metrics Collector**: Gathers and stores performance data
6. **Alert Manager**: Generates and manages health alerts

### Design Patterns Implemented
- **Observer Pattern**: Health monitoring and alerting
- **Registry Pattern**: Tool service discovery and registration
- **Strategy Pattern**: Different health check strategies for different tools
- **Factory Pattern**: Tool-specific health check implementations
- **Repository Pattern**: Data access abstraction

## Technical Specifications

### Technology Stack and Frameworks
- **Runtime**: Node.js 20+
- **Web Framework**: Fastify 4.27.0
- **Database**: PostgreSQL with @fastify/postgres
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: @fastify/helmet, @fastify/rate-limit
- **Validation**: Zod 3.22.4
- **Logging**: Pino 8.17.2
- **HTTP Client**: Axios for health checks

### Programming Language and Version
- **Language**: JavaScript (CommonJS)
- **Node.js Version**: 20.0.0+
- **Package Manager**: pnpm

### Database Technologies
- **Primary Database**: PostgreSQL 15+
- **Health Metrics**: Structured health data storage
- **Tool Registry**: Tool configuration and metadata storage
- **Performance Data**: Historical metrics and trends

### External Libraries and Dependencies
```json
{
  "fastify": "4.27.0",
  "@fastify/cors": "^9.0.1",
  "@fastify/cookie": "^9.4.0",
  "@fastify/swagger": "^8.14.0",
  "@fastify/swagger-ui": "^1.10.0",
  "@fastify/helmet": "^11.1.1",
  "@fastify/rate-limit": "^9.1.0",
  "@fastify/postgres": "^5.2.2",
  "pino": "^8.17.2",
  "zod": "^3.22.4",
  "axios": "^1.6.0"
}
```

## API Documentation

### Complete Endpoint Specifications

#### Health Check Endpoints
```http
GET /healthz
GET /readyz
```

#### Tool Health Endpoints
```http
GET /api/tools/health
GET /api/tools/:id/health
POST /api/tools/:id/health-check
GET /api/tools/:id/metrics
```

#### Tool Management Endpoints
```http
GET /api/tools
GET /api/tools/:id
POST /api/tools
PUT /api/tools/:id
DELETE /api/tools/:id
```

#### Health Metrics Endpoints
```http
GET /api/metrics/overview
GET /api/metrics/tools/:id
GET /api/metrics/history
POST /api/metrics/collect
```

#### Alert Management Endpoints
```http
GET /api/alerts
GET /api/alerts/:id
POST /api/alerts
PUT /api/alerts/:id
DELETE /api/alerts/:id
```

### Request/Response Schemas

#### Tool Health Status Schema
```json
{
  "tool_id": "github",
  "status": "healthy",
  "last_check": "2024-01-01T00:00:00.000Z",
  "response_time": 150,
  "error_rate": 0.01,
  "availability": 99.9,
  "details": {
    "endpoint": "https://api.github.com/health",
    "status_code": 200,
    "response_size": 1024
  },
  "metrics": {
    "cpu_usage": 45.2,
    "memory_usage": 67.8,
    "disk_usage": 23.1
  }
}
```

#### Tool Registration Schema
```json
{
  "id": "github",
  "name": "GitHub",
  "type": "git_repository",
  "endpoint": "https://api.github.com",
  "health_check_url": "https://api.github.com/health",
  "authentication": {
    "type": "oauth2",
    "scopes": ["read:user", "repo"]
  },
  "capabilities": ["repository_management", "team_management"],
  "status": "active",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

#### Health Metrics Schema
```json
{
  "tool_id": "github",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "response_time": 150,
  "status_code": 200,
  "error_count": 0,
  "request_count": 100,
  "availability": 100.0,
  "performance_score": 95.5,
  "custom_metrics": {
    "api_rate_limit": 5000,
    "remaining_requests": 4500
  }
}
```

### Authentication and Authorization Details
- **Identity Headers**: X-User-Sub, X-User-Email, X-User-Roles, X-User-Signature
- **Role-Based Access**: Tool management based on user roles
- **Admin Operations**: Restricted to admin users only
- **Audit Logging**: All operations are logged for security

### Error Codes and Handling
```json
{
  "400": "Bad request - invalid parameters",
  "401": "Unauthorized - missing or invalid identity headers",
  "403": "Forbidden - insufficient permissions",
  "404": "Tool not found",
  "500": "Internal server error",
  "503": "Service unavailable - tool health check failed"
}
```

## Service Dependencies

### Upstream and Downstream Service Dependencies
- **Upstream**: Auth-BFF (for identity headers)
- **Downstream**: PostgreSQL database, external DevOps tools
- **External**: All integrated DevOps tools for health checks

### Third-Party Integrations
- **PostgreSQL**: Health metrics and tool registry storage
- **DevOps Tools**: Health check endpoints and API integrations
- **Alerting System**: External notification and alerting services

### Database Connections
- **PostgreSQL**: Tool registry, health metrics, performance data
- **Connection Pooling**: Optimized database connections

### Message Queue Interactions
- **Current**: Direct health check processing
- **Future**: Async health check processing with queues

## Health & Monitoring

### Health Check Endpoints
- **`/healthz`**: Basic service health status
- **`/readyz`**: Service readiness with database connectivity checks

### Monitoring and Logging Configurations
- **Logging**: Pino with structured JSON logging
- **Metrics**: Health check performance and tool status
- **Health Monitoring**: Database connectivity and external tool health

### Performance Metrics
- **Health Check Response Time**: Tool health check performance
- **Database Query Time**: PostgreSQL operation performance
- **Tool Availability**: Overall system health metrics
- **Alert Generation**: Alert processing performance

### Alerting Mechanisms
- **Tool Health Failures**: Unhealthy tool detection
- **Performance Degradation**: Response time threshold violations
- **Availability Issues**: Tool unavailability detection
- **Database Connectivity**: Database connection failures

## Directory Structure

### Complete Folder Hierarchy
```
services/tools-health/
├── Dockerfile
├── package.json
├── README.md
└── src/
    ├── access-control.js
    ├── config.js
    ├── database.js
    ├── enhanced-health-monitor.js
    ├── health-monitor.js
    ├── integration-health-monitor.js
    ├── index.js
    └── service-health-monitor.js
```

### File Organization Explanation
- **`config.js`**: Environment-based configuration
- **`index.js`**: Main service implementation and route definitions
- **`access-control.js`**: Role-based access control implementation
- **`database.js`**: Database connection and operations
- **`health-monitor.js`**: Basic health monitoring functionality
- **`enhanced-health-monitor.js`**: Advanced health monitoring features
- **`integration-health-monitor.js`**: Tool integration health checks
- **`service-health-monitor.js`**: Service-level health monitoring

### Key Configuration Files Location
- **Environment Variables**: `.env` file or Docker environment
- **Database Configuration**: PostgreSQL connection settings
- **Health Check Configuration**: Tool-specific health check settings
- **Alert Configuration**: Alerting thresholds and notification settings

## Tool Health Monitoring Capabilities

### Supported DevOps Tools
1. **GitHub**: Repository API health, rate limiting status
2. **GitLab**: Project API health, CI/CD pipeline status
3. **Jenkins**: Build server health, job queue status
4. **Argo CD**: Application sync health, cluster status
5. **Terraform**: Workspace health, state management status
6. **SonarQube**: Code quality service health, analysis status
7. **Grafana**: Dashboard service health, data source status
8. **Prometheus**: Metrics collection health, alerting status
9. **Kibana**: Log analysis service health, index status
10. **Snyk**: Security scanning health, vulnerability status
11. **Jira/ServiceNow**: Issue tracking health, workflow status

### Health Check Types
- **HTTP Health Checks**: Basic endpoint availability
- **API Health Checks**: Tool-specific API endpoint validation
- **Performance Metrics**: Response time and throughput monitoring
- **Custom Health Checks**: Tool-specific health validation logic
- **Dependency Health**: Related service and resource health

### Health Metrics Collection
- **Response Time**: API endpoint response time measurement
- **Availability**: Uptime and downtime tracking
- **Error Rates**: Error count and error rate calculation
- **Performance Scores**: Composite health scoring
- **Custom Metrics**: Tool-specific performance indicators

## Security Features

### Access Control
- **Role-Based Access**: Tool management based on user roles
- **Admin Operations**: Restricted tool operations for admins only
- **Audit Logging**: Comprehensive operation logging
- **Permission Validation**: Fine-grained permission checking

### Data Protection
- **Input Validation**: Zod schema validation for all inputs
- **SQL Injection Prevention**: Parameterized database queries
- **XSS Protection**: Content security policy headers
- **Rate Limiting**: Request throttling for security

### Health Check Security
- **Authentication**: Secure health check endpoints
- **Authorization**: Role-based health check access
- **Data Privacy**: Secure storage of health metrics
- **Audit Trail**: Complete health check history

## Deployment and Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3004
HOST=0.0.0.0
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/sso_hub

# Health Check Configuration
HEALTH_CHECK_INTERVAL=300000
HEALTH_CHECK_TIMEOUT=10000
ALERT_THRESHOLD_RESPONSE_TIME=5000
ALERT_THRESHOLD_ERROR_RATE=0.05

# Security Configuration
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000
```

### Docker Configuration
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3004
CMD ["npm", "start"]
```

### Health Check Commands
```bash
# Health check
curl http://localhost:3004/healthz

# Readiness check
curl http://localhost:3004/readyz

# Tool health status
curl http://localhost:3004/api/tools/health

# Tool registry
curl http://localhost:3004/api/tools
```

## Performance Optimization

### Health Check Optimization
- **Asynchronous Processing**: Non-blocking health check execution
- **Connection Pooling**: Optimized HTTP client connections
- **Caching**: Health status caching for performance
- **Batch Processing**: Efficient bulk health check operations

### Database Optimization
- **Indexed Queries**: Optimized database schema with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Structured queries for performance
- **Data Archiving**: Historical data management and cleanup

### Scalability Features
- **Stateless Design**: Service can be horizontally scaled
- **Load Distribution**: Support for multiple service instances
- **Health Check Distribution**: Distributed health check execution
- **Metrics Aggregation**: Efficient metrics collection and storage

## Troubleshooting

### Common Issues
1. **Health Check Failures**: Verify tool endpoints and authentication
2. **Database Connection Issues**: Check PostgreSQL connectivity
3. **Tool Registration Failures**: Validate tool configuration
4. **Alert Generation Issues**: Check alerting configuration

### Debug Commands
```bash
# Check service logs
docker logs tools-health-service

# Verify database connectivity
curl -v http://localhost:3004/readyz

# Test health check
curl -v http://localhost:3004/api/tools/health

# Check tool registry
curl -v http://localhost:3004/api/tools
```

### Log Analysis
- **Health Check Results**: Monitor tool health status changes
- **Performance Metrics**: Track response time and availability trends
- **Error Patterns**: Identify recurring health check failures
- **Access Control**: Review permission and authorization logs

## Future Enhancements

### Planned Features
- **Advanced Analytics**: Predictive health analysis and trend detection
- **Machine Learning**: AI-powered health issue prediction
- **Enhanced Alerting**: Intelligent alerting with context and recommendations
- **Performance Optimization**: Advanced performance tuning and optimization

### Integration Roadmap
- **Phase 1**: Basic health monitoring (current)
- **Phase 2**: Advanced metrics and alerting
- **Phase 3**: Predictive health analysis
- **Phase 4**: AI-powered health management

### Monitoring Evolution
- **Current**: Basic health status and metrics
- **Future**: Predictive analytics and intelligent alerting
- **Advanced**: Machine learning-based health optimization
- **Enterprise**: Comprehensive health management platform
