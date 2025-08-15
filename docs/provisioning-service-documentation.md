# Provisioning Service Documentation

## Service Overview

### Service Name and Purpose
**Provisioning Service** - Comprehensive tool provisioning service for SSO Hub that automates resource creation and management across all integrated DevOps tools.

### Business Use Cases and Functional Requirements
- **Automated Resource Provisioning**: Create and manage resources across DevOps tools
- **Template-Based Provisioning**: Use predefined templates for common resource types
- **Workflow Automation**: Orchestrate complex provisioning workflows
- **Tool Integration**: Provision resources in GitHub, GitLab, Jenkins, Argo CD, etc.
- **Role-Based Access Control**: Enforce provisioning permissions based on user roles
- **Audit Logging**: Track all provisioning activities for compliance
- **Scheduled Provisioning**: Automated provisioning based on schedules and triggers

### Service Boundaries and Responsibilities
- **Resource Provisioning**: Create, update, and delete resources in DevOps tools
- **Template Management**: Manage provisioning templates and configurations
- **Workflow Engine**: Execute complex provisioning workflows
- **Tool Integration**: Interface with external DevOps tool APIs
- **Access Control**: Enforce provisioning permissions and policies
- **Audit Management**: Log and track all provisioning activities
- **Scheduling**: Handle scheduled and event-driven provisioning

## Architecture Documentation

### High-Level Architecture Diagram
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Frontend  │───▶│ Provisioning │───▶│ PostgreSQL  │
│             │    │   Service    │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Template   │
                   │   Manager    │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Workflow   │
                   │    Engine    │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   External   │
                   │ DevOps Tools │
                   │ (APIs)       │
                   └──────────────┘
```

### Component Relationships and Interactions
1. **Frontend Integration**: Receives provisioning requests and workflow definitions
2. **Template Manager**: Manages provisioning templates and configurations
3. **Workflow Engine**: Executes complex provisioning workflows
4. **Provisioner Registry**: Manages tool-specific provisioners
5. **Audit Logger**: Logs all provisioning activities
6. **Database Manager**: Handles data persistence and retrieval

### Design Patterns Implemented
- **Registry Pattern**: Tool provisioner registration and management
- **Template Pattern**: Reusable provisioning templates
- **Workflow Pattern**: Complex provisioning workflow execution
- **Strategy Pattern**: Different provisioning strategies for different tools
- **Observer Pattern**: Event-driven provisioning and notifications

## Technical Specifications

### Technology Stack and Frameworks
- **Runtime**: Node.js 20+
- **Web Framework**: Fastify 4.27.0
- **Database**: PostgreSQL with @fastify/postgres
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: @fastify/helmet, @fastify/rate-limit
- **Validation**: Zod 3.22.4
- **Logging**: Pino 8.17.2
- **Scheduling**: node-cron for scheduled provisioning

### Programming Language and Version
- **Language**: JavaScript (CommonJS)
- **Node.js Version**: 20.0.0+
- **Package Manager**: npm

### Database Technologies
- **Primary Database**: PostgreSQL 15+
- **Provisioning Records**: Track all provisioning activities
- **Template Storage**: Store provisioning templates and configurations
- **Workflow Definitions**: Store workflow definitions and execution state

### External Libraries and Dependencies
```json
{
  "fastify": "^4.27.0",
  "@fastify/cors": "^9.0.1",
  "@fastify/postgres": "^5.2.2",
  "@fastify/rate-limit": "^9.1.0",
  "@fastify/swagger": "^8.14.0",
  "@fastify/swagger-ui": "^2.1.0",
  "axios": "^1.6.2",
  "uuid": "^9.0.1",
  "zod": "^3.22.4",
  "pino": "^8.17.2",
  "js-yaml": "^4.1.0",
  "handlebars": "^4.7.8",
  "node-cron": "^3.0.3",
  "jsonwebtoken": "^9.0.2",
  "@octokit/rest": "^20.0.2",
  "gitlab": "^14.2.2",
  "jenkins": "^1.0.0"
}
```

## API Documentation

### Complete Endpoint Specifications

#### Health Check Endpoints
```http
GET /healthz
GET /readyz
```

#### Provisioning Endpoints
```http
POST /api/provision
GET /api/provision/:id
GET /api/provision/status/:id
DELETE /api/provision/:id
```

#### Template Management Endpoints
```http
GET /api/templates
GET /api/templates/:id
POST /api/templates
PUT /api/templates/:id
DELETE /api/templates/:id
```

#### Workflow Management Endpoints
```http
GET /api/workflows
GET /api/workflows/:id
POST /api/workflows
PUT /api/workflows/:id
DELETE /api/workflows/:id
POST /api/workflows/:id/execute
```

#### Tool Provisioning Endpoints
```http
POST /api/tools/:tool_id/provision
GET /api/tools/:tool_id/provision/status
GET /api/tools/:tool_id/provision/history
```

### Request/Response Schemas

#### Provisioning Request Schema
```json
{
  "template_id": "github-repository",
  "tool_id": "github",
  "parameters": {
    "repository_name": "my-project",
    "description": "Project description",
    "visibility": "private",
    "team_name": "developers"
  },
  "workflow_id": "standard-repo-setup",
  "scheduled_at": "2024-01-01T10:00:00.000Z"
}
```

#### Provisioning Response Schema
```json
{
  "provisioning_id": "prov-123",
  "status": "in_progress",
  "template_id": "github-repository",
  "tool_id": "github",
  "parameters": {
    "repository_name": "my-project",
    "description": "Project description"
  },
  "workflow_steps": [
    {
      "step_id": "create-repo",
      "status": "completed",
      "result": {
        "repository_url": "https://github.com/org/my-project"
      }
    },
    {
      "step_id": "setup-team",
      "status": "in_progress"
    }
  ],
  "created_at": "2024-01-01T00:00:00.000Z",
  "estimated_completion": "2024-01-01T00:05:00.000Z"
}
```

#### Template Schema
```json
{
  "id": "github-repository",
  "name": "GitHub Repository Template",
  "description": "Standard GitHub repository setup",
  "tool_id": "github",
  "version": "1.0.0",
  "parameters": {
    "repository_name": {
      "type": "string",
      "required": true,
      "description": "Repository name"
    },
    "description": {
      "type": "string",
      "required": false,
      "description": "Repository description"
    },
    "visibility": {
      "type": "enum",
      "values": ["public", "private"],
      "default": "private"
    }
  },
  "workflow": [
    {
      "step_id": "create-repo",
      "action": "github.create_repository",
      "parameters": {
        "name": "{{repository_name}}",
        "description": "{{description}}",
        "private": "{{visibility == 'private'}}"
      }
    },
    {
      "step_id": "setup-branch-protection",
      "action": "github.setup_branch_protection",
      "parameters": {
        "repository": "{{repository_name}}",
        "branch": "main"
      }
    }
  ],
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### Authentication and Authorization Details
- **Identity Headers**: X-User-Sub, X-User-Email, X-User-Roles, X-User-Signature
- **Role-Based Access**: Provisioning permissions based on user roles
- **Template Access**: Template creation and modification permissions
- **Workflow Execution**: Workflow execution permissions

### Error Codes and Handling
```json
{
  "400": "Bad request - invalid parameters or template",
  "401": "Unauthorized - missing or invalid identity headers",
  "403": "Forbidden - insufficient permissions for provisioning",
  "404": "Template or workflow not found",
  "409": "Resource already exists",
  "500": "Internal server error",
  "503": "Tool service unavailable"
}
```

## Service Dependencies

### Upstream and Downstream Service Dependencies
- **Upstream**: Auth-BFF (for identity headers)
- **Downstream**: PostgreSQL database, external DevOps tools
- **External**: DevOps tool APIs (GitHub, GitLab, Jenkins, etc.)

### Third-Party Integrations
- **PostgreSQL**: Provisioning records and template storage
- **GitHub API**: Repository and team management
- **GitLab API**: Project and group management
- **Jenkins API**: Job and pipeline management
- **Argo CD API**: Application and project management

### Database Connections
- **PostgreSQL**: Provisioning records, templates, workflows
- **Connection Pooling**: Optimized database connections

### Message Queue Interactions
- **Current**: Direct provisioning execution
- **Future**: Async provisioning with job queues

## Health & Monitoring

### Health Check Endpoints
- **`/healthz`**: Basic service health status
- **`/readyz`**: Service readiness with database connectivity checks

### Monitoring and Logging Configurations
- **Logging**: Pino with structured JSON logging
- **Metrics**: Provisioning performance and success rates
- **Health Monitoring**: Database connectivity and external tool APIs

### Performance Metrics
- **Provisioning Time**: Time to complete provisioning tasks
- **Success Rate**: Percentage of successful provisioning operations
- **Template Usage**: Most used templates and their performance
- **Workflow Execution**: Workflow completion times and success rates

### Alerting Mechanisms
- **Provisioning Failures**: Failed provisioning operation detection
- **Template Errors**: Template validation and execution errors
- **API Failures**: External tool API connectivity issues
- **Database Issues**: Database connection and performance problems

## Directory Structure

### Complete Folder Hierarchy
```
services/provisioning/
├── Dockerfile
├── package.json
├── README.md
└── src/
    ├── audit-logger.js
    ├── config.js
    ├── database-manager.js
    ├── index.js
    ├── provisioner-registry.js
    ├── provisioners/
    │   ├── base-provisioner.js
    │   ├── github-provisioner.js
    │   └── gitlab-provisioner.js
    ├── template-manager.js
    └── workflow-engine.js
```

### File Organization Explanation
- **`config.js`**: Environment-based configuration
- **`index.js`**: Main service implementation and route definitions
- **`audit-logger.js`**: Comprehensive audit logging functionality
- **`database-manager.js`**: Database operations and connection management
- **`provisioner-registry.js`**: Tool provisioner registration and management
- **`provisioners/`**: Tool-specific provisioning implementations
- **`template-manager.js`**: Template management and validation
- **`workflow-engine.js`**: Workflow execution and orchestration

### Key Configuration Files Location
- **Environment Variables**: `.env` file or Docker environment
- **Database Configuration**: PostgreSQL connection settings
- **Template Configuration**: Template storage and validation settings
- **Workflow Configuration**: Workflow execution settings

## Tool Provisioning Capabilities

### Supported DevOps Tools
1. **GitHub**: Repository creation, team management, branch protection
2. **GitLab**: Project creation, group management, CI/CD setup
3. **Jenkins**: Job creation, pipeline setup, credential management
4. **Argo CD**: Application creation, project setup, sync policies
5. **Terraform**: Workspace creation, variable management, state setup
6. **SonarQube**: Project creation, quality gate setup, team assignment
7. **Grafana**: Dashboard creation, folder setup, data source configuration
8. **Prometheus**: Alert rule creation, job configuration, service discovery
9. **Kibana**: Index pattern creation, dashboard setup, role assignment
10. **Snyk**: Project creation, organization setup, policy configuration
11. **Jira/ServiceNow**: Project creation, workflow setup, team assignment

### Provisioning Features
- **Resource Creation**: Automated resource creation in tools
- **Configuration Management**: Tool-specific configuration setup
- **Team Management**: User and team provisioning
- **Access Control**: Role and permission assignment
- **Integration Setup**: Webhook and API integration configuration

### Template Types
- **Repository Templates**: Git repository setup with standard configurations
- **Project Templates**: Complete project initialization with all components
- **Team Templates**: Team structure and permission templates
- **Workflow Templates**: CI/CD pipeline and automation templates
- **Infrastructure Templates**: Infrastructure and deployment templates

## Security Features

### Access Control
- **Role-Based Provisioning**: Provisioning permissions based on user roles
- **Template Access Control**: Template creation and modification permissions
- **Workflow Execution Control**: Workflow execution permissions
- **Audit Logging**: Comprehensive provisioning activity logging

### Data Protection
- **Input Validation**: Zod schema validation for all inputs
- **Template Validation**: Template syntax and parameter validation
- **SQL Injection Prevention**: Parameterized database queries
- **XSS Protection**: Content security policy headers

### Provisioning Security
- **Credential Management**: Secure handling of tool credentials
- **API Security**: Secure API communication with external tools
- **Audit Trail**: Complete provisioning history and audit logs
- **Rollback Capabilities**: Provisioning failure recovery

## Deployment and Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3011
HOST=0.0.0.0
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/sso_hub

# Tool API Configuration
GITHUB_API_TOKEN=your-github-token
GITLAB_API_TOKEN=your-gitlab-token
JENKINS_API_TOKEN=your-jenkins-token

# Security Configuration
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_MAX=50
RATE_LIMIT_WINDOW=60000

# Provisioning Configuration
MAX_CONCURRENT_PROVISIONING=10
PROVISIONING_TIMEOUT=300000
TEMPLATE_VALIDATION_STRICT=true
```

### Docker Configuration
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3011
CMD ["npm", "start"]
```

### Health Check Commands
```bash
# Health check
curl http://localhost:3011/healthz

# Readiness check
curl http://localhost:3011/readyz

# List templates
curl http://localhost:3011/api/templates

# Check provisioning status
curl http://localhost:3011/api/provision/status/prov-123
```

## Performance Optimization

### Provisioning Optimization
- **Concurrent Execution**: Parallel provisioning for multiple resources
- **Template Caching**: Template caching for improved performance
- **Connection Pooling**: Optimized API connections to external tools
- **Batch Operations**: Efficient bulk provisioning operations

### Database Optimization
- **Indexed Queries**: Optimized database schema with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Structured queries for performance
- **Data Archiving**: Historical data management and cleanup

### Scalability Features
- **Stateless Design**: Service can be horizontally scaled
- **Load Distribution**: Support for multiple service instances
- **Async Processing**: Asynchronous provisioning execution
- **Queue Management**: Job queue for provisioning tasks

## Troubleshooting

### Common Issues
1. **Template Validation Errors**: Check template syntax and parameter definitions
2. **API Authentication Failures**: Verify tool API credentials and permissions
3. **Workflow Execution Failures**: Check workflow definition and step configuration
4. **Database Connection Issues**: Verify PostgreSQL connectivity

### Debug Commands
```bash
# Check service logs
docker logs provisioning-service

# Verify database connectivity
curl -v http://localhost:3011/readyz

# Test template validation
curl -v http://localhost:3011/api/templates

# Check provisioning status
curl -v http://localhost:3011/api/provision/status/prov-123
```

### Log Analysis
- **Provisioning Requests**: Track provisioning attempts and parameters
- **Template Usage**: Monitor template usage patterns and performance
- **Workflow Execution**: Analyze workflow execution and failure patterns
- **API Interactions**: Monitor external tool API communication

## Future Enhancements

### Planned Features
- **Advanced Workflows**: Complex multi-tool provisioning workflows
- **Template Marketplace**: Community-driven template sharing
- **Provisioning Analytics**: Advanced analytics and reporting
- **Machine Learning**: AI-powered provisioning optimization

### Integration Roadmap
- **Phase 1**: Basic provisioning with templates (current)
- **Phase 2**: Advanced workflows and orchestration
- **Phase 3**: Multi-tool integration and automation
- **Phase 4**: AI-powered provisioning and optimization

### Provisioning Evolution
- **Current**: Template-based resource provisioning
- **Future**: Intelligent provisioning with ML optimization
- **Advanced**: Self-service provisioning portal
- **Enterprise**: Enterprise-grade provisioning platform
