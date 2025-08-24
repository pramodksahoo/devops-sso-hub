# LDAP Sync Service Documentation

## Service Overview

### Service Name and Purpose
**LDAP Sync Service** - Comprehensive LDAP synchronization service for SSO Hub that synchronizes user data, groups, and organizational structures from LDAP directories to the SSO Hub system.

### Business Use Cases and Functional Requirements
- **User Synchronization**: Sync user accounts from LDAP to SSO Hub
- **Group Management**: Synchronize LDAP groups and organizational units
- **Attribute Mapping**: Map LDAP attributes to SSO Hub user properties
- **Incremental Sync**: Perform incremental updates to minimize data transfer
- **Conflict Resolution**: Handle conflicts between LDAP and local data
- **Scheduled Synchronization**: Automated sync based on configurable schedules
- **Audit Logging**: Track all synchronization activities and changes

### Service Boundaries and Responsibilities
- **LDAP Connection**: Establish and maintain LDAP directory connections
- **Data Discovery**: Discover LDAP directory structure and schema
- **Data Synchronization**: Sync user and group data from LDAP
- **Conflict Management**: Resolve data conflicts and inconsistencies
- **Scheduling**: Manage synchronization schedules and timing
- **Audit Management**: Log all synchronization activities
- **Error Handling**: Handle sync failures and recovery

## Architecture Documentation

### High-Level Architecture Diagram
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Frontend  │───▶│   LDAP Sync  │───▶│ PostgreSQL  │
│             │    │   Service    │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   LDAP       │
                   │  Discovery   │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Sync Job   │
                   │   Manager    │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   External   │
                   │   LDAP       │
                   │  Directory   │
                   └──────────────┘
```

### Component Relationships and Interactions
1. **Frontend Integration**: Receives sync requests and displays sync status
2. **LDAP Discovery**: Discovers LDAP directory structure and schema
3. **Sync Job Manager**: Manages synchronization jobs and schedules
4. **Tool Sync Engines**: Tool-specific synchronization logic
5. **Database Manager**: Handles data persistence and retrieval
6. **Audit Logger**: Logs all synchronization activities

### Design Patterns Implemented
- **Discovery Pattern**: LDAP directory structure discovery
- **Job Pattern**: Synchronization job management and execution
- **Engine Pattern**: Tool-specific sync engine implementations
- **Repository Pattern**: Data access abstraction layer
- **Observer Pattern**: Event-driven synchronization

## Technical Specifications

### Technology Stack and Frameworks
- **Runtime**: Node.js 20+
- **Web Framework**: Fastify 4.27.0
- **Database**: PostgreSQL with @fastify/postgres
- **LDAP Client**: Custom LDAP client implementation
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: @fastify/helmet, @fastify/rate-limit
- **Validation**: Zod 3.22.4
- **Logging**: Pino 8.17.2

### Programming Language and Version
- **Language**: JavaScript (CommonJS)
- **Node.js Version**: 20.0.0+
- **Package Manager**: pnpm

### Database Technologies
- **Primary Database**: PostgreSQL 15+
- **Sync Data**: LDAP synchronization records and history
- **User Data**: Synchronized user and group information
- **Configuration**: LDAP connection and sync configuration

### External Libraries and Dependencies
```json
{
  "fastify": "4.27.0",
  "@fastify/cors": "^9.0.1",
  "@fastify/helmet": "^11.1.1",
  "@fastify/rate-limit": "^9.1.0",
  "@fastify/postgres": "^5.2.2",
  "@fastify/swagger": "^8.14.0",
  "@fastify/swagger-ui": "^1.10.0",
  "pino": "^8.17.2",
  "zod": "^3.22.4",
  "ldapjs": "^3.0.2",
  "node-cron": "^3.0.3"
}
```

## API Documentation

### Complete Endpoint Specifications

#### Health Check Endpoints
```http
GET /healthz
GET /readyz
```

#### LDAP Sync Endpoints
```http
POST /api/sync/start
GET /api/sync/status
GET /api/sync/history
POST /api/sync/stop
```

#### LDAP Configuration Endpoints
```http
GET /api/config/ldap
PUT /api/config/ldap
POST /api/config/ldap/test
GET /api/config/ldap/discover
```

#### User Sync Endpoints
```http
GET /api/sync/users
GET /api/sync/users/:id
POST /api/sync/users/force
GET /api/sync/users/conflicts
```

#### Group Sync Endpoints
```http
GET /api/sync/groups
GET /api/sync/groups/:id
POST /api/sync/groups/force
GET /api/sync/groups/conflicts
```

#### Schedule Management Endpoints
```http
GET /api/schedules
GET /api/schedules/:id
POST /api/schedules
PUT /api/schedules/:id
DELETE /api/schedules/:id
```

### Request/Response Schemas

#### LDAP Configuration Schema
```json
{
  "ldap_config_id": "ldap-123",
  "name": "Corporate LDAP",
  "url": "ldaps://ldap.corporate.com:636",
  "base_dn": "dc=corporate,dc=com",
  "bind_dn": "cn=admin,dc=corporate,dc=com",
  "bind_password": "encrypted-password",
  "user_search_base": "ou=users,dc=corporate,dc=com",
  "user_search_filter": "(objectClass=person)",
  "group_search_base": "ou=groups,dc=corporate,dc=com",
  "group_search_filter": "(objectClass=groupOfNames)",
  "attributes": {
    "user": ["uid", "cn", "mail", "memberOf", "department"],
    "group": ["cn", "description", "member", "ou"]
  },
  "sync_options": {
    "create_users": true,
    "update_users": true,
    "delete_users": false,
    "create_groups": true,
    "update_groups": true,
    "delete_groups": false
  },
  "status": "active",
  "last_sync": "2024-01-01T00:00:00.000Z",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

#### Sync Job Schema
```json
{
  "sync_job_id": "job-123",
  "ldap_config_id": "ldap-123",
  "job_type": "full_sync",
  "status": "running",
  "progress": 75,
  "total_items": 1000,
  "processed_items": 750,
  "success_count": 745,
  "error_count": 5,
  "started_at": "2024-01-01T00:00:00.000Z",
  "estimated_completion": "2024-01-01T01:00:00.000Z",
  "details": {
    "users_synced": 500,
    "groups_synced": 250,
    "conflicts_resolved": 3
  }
}
```

#### User Sync Result Schema
```json
{
  "user_id": "user-123",
  "ldap_dn": "uid=john.doe,ou=users,dc=corporate,dc=com",
  "sync_status": "synced",
  "ldap_attributes": {
    "uid": "john.doe",
    "cn": "John Doe",
    "mail": "john.doe@corporate.com",
    "department": "Engineering",
    "memberOf": ["cn=developers,ou=groups,dc=corporate,dc=com"]
  },
  "ssohub_attributes": {
    "username": "john.doe",
    "email": "john.doe@corporate.com",
    "full_name": "John Doe",
    "department": "Engineering",
    "roles": ["developer", "user"]
  },
  "last_sync": "2024-01-01T00:00:00.000Z",
  "sync_errors": []
}
```

### Authentication and Authorization Details
- **Identity Headers**: X-User-Sub, X-User-Email, X-User-Roles, X-User-Signature
- **Role-Based Access**: LDAP sync management based on user roles
- **Admin Operations**: LDAP configuration restricted to admin users
- **Audit Logging**: Complete sync activity audit trail

### Error Codes and Handling
```json
{
  "400": "Bad request - invalid sync parameters or configuration",
  "401": "Unauthorized - missing or invalid identity headers",
  "403": "Forbidden - insufficient permissions for LDAP sync",
  "404": "LDAP configuration or sync job not found",
  "409": "Sync conflict - data inconsistency detected",
  "500": "Internal server error",
  "503": "LDAP service unavailable"
}
```

## Service Dependencies

### Upstream and Downstream Service Dependencies
- **Upstream**: Auth-BFF (for identity headers)
- **Downstream**: PostgreSQL database, external LDAP directories
- **Internal**: Other microservices for user data updates

### Third-Party Integrations
- **PostgreSQL**: Sync data storage and user data management
- **LDAP Directories**: External LDAP servers for user data
- **Active Directory**: Microsoft Active Directory integration

### Database Connections
- **PostgreSQL**: Sync records, user data, configurations
- **Connection Pooling**: Optimized database connections

### Message Queue Interactions
- **Current**: Direct sync execution and processing
- **Future**: Async sync processing with job queues

## Health & Monitoring

### Health Check Endpoints
- **`/healthz`**: Basic service health status
- **`/readyz`**: Service readiness with database connectivity checks

### Monitoring and Logging Configurations
- **Logging**: Pino with structured JSON logging
- **Metrics**: Sync performance and success rates
- **Health Monitoring**: Database connectivity and LDAP connectivity

### Performance Metrics
- **Sync Performance**: Time to complete synchronization jobs
- **Data Volume**: Amount of data synchronized
- **Success Rate**: Percentage of successful sync operations
- **Conflict Resolution**: Time to resolve data conflicts

### Alerting Mechanisms
- **Sync Failures**: Failed synchronization job detection
- **LDAP Connectivity**: LDAP connection failures
- **Data Conflicts**: Unresolved data conflict alerts
- **Database Issues**: Database connection and performance problems

## Directory Structure

### Complete Folder Hierarchy
```
services/ldap-sync/
├── Dockerfile
├── package.json
├── README.md
└── src/
    ├── audit-logger.js
    ├── config.js
    ├── database-manager.js
    ├── index.js
    ├── ldap-client.js
    ├── ldap-discovery-service.js
    ├── sync-job-manager.js
    ├── sync-scheduler.js
    └── tool-sync-engines/
        ├── base-tool-sync.js
        ├── github-sync.js
        └── gitlab-sync.js
```

### File Organization Explanation
- **`config.js`**: Environment-based configuration
- **`index.js`**: Main service implementation and route definitions
- **`audit-logger.js`**: Comprehensive audit logging functionality
- **`database-manager.js`**: Database operations and connection management
- **`ldap-client.js`**: LDAP connection and communication
- **`ldap-discovery-service.js`**: LDAP directory structure discovery
- **`sync-job-manager.js`**: Synchronization job management
- **`sync-scheduler.js`**: Sync schedule management
- **`tool-sync-engines/`**: Tool-specific synchronization logic

### Key Configuration Files Location
- **Environment Variables**: `.env` file or Docker environment
- **Database Configuration**: PostgreSQL connection settings
- **LDAP Configuration**: LDAP connection and sync settings
- **Sync Configuration**: Synchronization rules and schedules

## LDAP Sync Capabilities

### Supported LDAP Types
1. **OpenLDAP**: Standard LDAP directory servers
2. **Active Directory**: Microsoft Active Directory
3. **Apache Directory Server**: Apache LDAP implementation
4. **IBM Tivoli Directory**: Enterprise LDAP directory
5. **Oracle Directory**: Oracle LDAP directory server

### Sync Features
- **Full Sync**: Complete directory synchronization
- **Incremental Sync**: Delta-based synchronization
- **Selective Sync**: Sync specific organizational units
- **Conflict Resolution**: Handle data conflicts automatically
- **Attribute Mapping**: Custom LDAP to SSO Hub attribute mapping
- **Filtering**: Sync only specific user/group types

### Data Synchronization
- **User Accounts**: Sync user profiles and attributes
- **Group Membership**: Sync group structures and memberships
- **Organizational Units**: Sync organizational hierarchy
- **Custom Attributes**: Sync custom LDAP attributes
- **Password Policies**: Sync password policy information

## Security Features

### LDAP Security
- **Encrypted Connections**: LDAPS/TLS for secure communication
- **Authentication**: Secure LDAP bind authentication
- **Credential Management**: Encrypted credential storage
- **Access Control**: Role-based LDAP sync access

### Data Protection
- **Input Validation**: Zod schema validation for all inputs
- **Data Encryption**: Secure storage of sensitive LDAP data
- **SQL Injection Prevention**: Parameterized database queries
- **XSS Protection**: Content security policy headers

### Sync Security
- **Audit Logging**: Complete sync activity audit trail
- **Conflict Detection**: Secure conflict resolution
- **Data Integrity**: Sync data integrity verification
- **Access Logging**: Complete sync access logging

## Deployment and Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3012
HOST=0.0.0.0
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/sso_hub

# LDAP Configuration
LDAP_DEFAULT_URL=ldaps://ldap.corporate.com:636
LDAP_DEFAULT_BASE_DN=dc=corporate,dc=com
LDAP_DEFAULT_BIND_DN=cn=admin,dc=corporate,dc=com
LDAP_DEFAULT_BIND_PASSWORD=your-ldap-password

# Sync Configuration
SYNC_DEFAULT_INTERVAL=3600000
SYNC_BATCH_SIZE=100
SYNC_TIMEOUT=300000
CONFLICT_RESOLUTION_AUTO=true

# Security Configuration
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_MAX=50
RATE_LIMIT_WINDOW=60000
```

### Docker Configuration
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3009
CMD ["npm", "start"]
```

### Health Check Commands
```bash
# Health check
curl http://localhost:3009/healthz

# Readiness check
curl http://localhost:3009/readyz

# Check LDAP configuration
curl http://localhost:3009/api/config/ldap

# Start sync job
curl -X POST http://localhost:3009/api/sync/start
```

## Performance Optimization

### Sync Optimization
- **Batch Processing**: Efficient batch data synchronization
- **Incremental Sync**: Delta-based synchronization for performance
- **Parallel Processing**: Concurrent sync operations
- **Connection Pooling**: Optimized LDAP connections

### Database Optimization
- **Indexed Queries**: Optimized database schema with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Structured queries for performance
- **Data Partitioning**: Time-based data partitioning for large datasets

### Scalability Features
- **Stateless Design**: Service can be horizontally scaled
- **Load Distribution**: Support for multiple service instances
- **Async Processing**: Asynchronous synchronization processing
- **Job Distribution**: Distributed sync job processing

## Troubleshooting

### Common Issues
1. **LDAP Connection Failures**: Verify LDAP server connectivity and credentials
2. **Sync Job Failures**: Check sync configuration and LDAP permissions
3. **Data Conflicts**: Review conflict resolution configuration
4. **Database Connection Issues**: Verify PostgreSQL connectivity

### Debug Commands
```bash
# Check service logs
docker logs ldap-sync-service

# Verify database connectivity
curl -v http://localhost:3009/readyz

# Test LDAP connection
curl -v http://localhost:3009/api/config/ldap/test

# Check sync status
curl -v http://localhost:3009/api/sync/status
```

### Log Analysis
- **LDAP Connections**: Monitor LDAP connection success and failures
- **Sync Performance**: Track synchronization performance and success rates
- **Conflict Resolution**: Monitor data conflict detection and resolution
- **Error Patterns**: Identify recurring sync failures

## Future Enhancements

### Planned Features
- **Advanced Conflict Resolution**: AI-powered conflict resolution
- **Real-time Sync**: Live LDAP change synchronization
- **Multi-LDAP Support**: Multiple LDAP directory synchronization
- **Advanced Analytics**: Sync performance analytics and insights

### Integration Roadmap
- **Phase 1**: Basic LDAP synchronization (current)
- **Phase 2**: Advanced conflict resolution and filtering
- **Phase 3**: Real-time synchronization and monitoring
- **Phase 4**: AI-powered sync optimization

### Sync Evolution
- **Current**: Basic LDAP synchronization and conflict resolution
- **Future**: Advanced filtering and conflict resolution
- **Advanced**: Real-time sync and intelligent conflict resolution
- **Enterprise**: Enterprise-grade LDAP synchronization platform
