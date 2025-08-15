# User Service Documentation

## Service Overview

### Service Name and Purpose
**User Service** - Comprehensive user management service for SSO Hub that handles user profiles, preferences, and user-specific configurations across all integrated DevOps tools.

### Business Use Cases and Functional Requirements
- **User Profile Management**: Create, update, and manage user profiles
- **Tool Preferences**: Store and manage user preferences for each DevOps tool
- **User Configuration**: Handle user-specific settings and configurations
- **Profile Synchronization**: Sync user data across all integrated services
- **User Analytics**: Track user behavior and preferences
- **Access Control**: Manage user access permissions and roles
- **Data Export**: Export user data for compliance and analytics

### Service Boundaries and Responsibilities
- **User Data Management**: Store and manage user profile information
- **Preference Management**: Handle user preferences and settings
- **Profile Synchronization**: Sync user data across services
- **Access Control**: Manage user permissions and roles
- **Data Validation**: Validate user data and preferences
- **Audit Logging**: Track user data changes and access

## Architecture Documentation

### High-Level Architecture Diagram
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Frontend  │───▶│   User      │───▶│ PostgreSQL  │
│             │    │   Service   │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Profile    │
                   │   Manager    │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Preference │
                   │   Manager    │
                   └──────────────┘
```

### Component Relationships and Interactions
1. **Frontend Integration**: Receives user management requests
2. **Profile Manager**: Manages user profile data and settings
3. **Preference Manager**: Handles user preferences and configurations
4. **Database Manager**: Handles user data persistence
5. **Validation Service**: Validates user data and preferences
6. **Audit Logger**: Logs user data changes and access

### Design Patterns Implemented
- **Repository Pattern**: Data access abstraction layer
- **Service Pattern**: Service layer for different user concerns
- **Validation Pattern**: User data validation and verification
- **Observer Pattern**: User data change notifications
- **Factory Pattern**: User profile object creation

## Technical Specifications

### Technology Stack and Frameworks
- **Runtime**: Node.js 20+
- **Web Framework**: Fastify 4.27.0
- **Database**: PostgreSQL with @fastify/postgres
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: @fastify/helmet, @fastify/rate-limit
- **Validation**: Zod 3.22.4
- **Logging**: Pino 8.17.2
- **User Management**: Custom user management engine

### Programming Language and Version
- **Language**: JavaScript (CommonJS)
- **Node.js Version**: 20.0.0+
- **Package Manager**: npm

### Database Technologies
- **Primary Database**: PostgreSQL 15+
- **User Data**: User profiles and preferences
- **Configuration Data**: User-specific configurations
- **Audit Data**: User data change history

### External Libraries and Dependencies
```json
{
  "fastify": "^4.27.0",
  "@fastify/cors": "^9.0.1",
  "@fastify/helmet": "^11.1.1",
  "@fastify/rate-limit": "^9.1.0",
  "@fastify/postgres": "^5.2.2",
  "@fastify/swagger": "^8.14.0",
  "@fastify/swagger-ui": "^2.1.0",
  "pino": "^8.17.2",
  "zod": "^3.22.4",
  "bcrypt": "^5.1.1",
  "uuid": "^9.0.1"
}
```

## API Documentation

### Complete Endpoint Specifications

#### Health Check Endpoints
```http
GET /healthz
GET /readyz
```

#### User Management Endpoints
```http
GET /api/users
GET /api/users/:id
POST /api/users
PUT /api/users/:id
DELETE /api/users/:id
```

#### User Profile Endpoints
```http
GET /api/users/:id/profile
PUT /api/users/:id/profile
GET /api/users/:id/preferences
PUT /api/users/:id/preferences
```

#### User Configuration Endpoints
```http
GET /api/users/:id/config
PUT /api/users/:id/config
GET /api/users/:id/config/:tool_id
PUT /api/users/:id/config/:tool_id
```

#### User Analytics Endpoints
```http
GET /api/users/:id/analytics
GET /api/users/:id/activity
GET /api/users/:id/preferences/analytics
```

### Request/Response Schemas

#### User Profile Schema
```json
{
  "user_id": "user-123",
  "profile": {
    "username": "john.doe",
    "email": "john.doe@example.com",
    "full_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg",
    "bio": "Software Engineer",
    "location": "San Francisco, CA",
    "timezone": "America/Los_Angeles",
    "language": "en-US"
  },
  "preferences": {
    "notifications": {
      "email": true,
      "push": false,
      "slack": true
    },
    "privacy": {
      "profile_visibility": "public",
      "activity_visibility": "team",
      "preference_sharing": false
    },
    "tools": {
      "github": {
        "theme": "dark",
        "default_branch": "main",
        "notifications": true
      },
      "gitlab": {
        "theme": "light",
        "default_branch": "develop",
        "notifications": false
      }
    }
  },
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

#### User Configuration Schema
```json
{
  "user_id": "user-123",
  "tool_id": "github",
  "configuration": {
    "theme": "dark",
    "default_branch": "main",
    "notifications": {
      "push": true,
      "pull_request": true,
      "issue": false,
      "release": true
    },
    "display": {
      "show_line_numbers": true,
      "show_whitespace": false,
      "tab_size": 2
    },
    "workflow": {
      "auto_merge": false,
      "require_reviews": 2,
      "branch_protection": true
    }
  },
  "version": "1.0.0",
  "last_updated": "2024-01-01T00:00:00.000Z"
}
```

#### User Analytics Schema
```json
{
  "user_id": "user-123",
  "period": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  },
  "tool_usage": {
    "github": {
      "total_sessions": 45,
      "avg_session_duration": 1800,
      "most_used_features": ["repository", "pull_request", "issue"],
      "preferred_theme": "dark"
    },
    "gitlab": {
      "total_sessions": 32,
      "avg_session_duration": 2100,
      "most_used_features": ["pipeline", "merge_request", "wiki"],
      "preferred_theme": "light"
    }
  },
  "preferences": {
    "most_common_themes": ["dark", "light"],
    "notification_preferences": {
      "email": 80,
      "push": 15,
      "slack": 5
    }
  }
}
```

### Authentication and Authorization Details
- **Identity Headers**: X-User-Sub, X-User-Email, X-User-Roles, X-User-Signature
- **User Access**: Users can only access their own data
- **Admin Access**: Admins can access all user data
- **Audit Logging**: Complete user data access audit trail

### Error Codes and Handling
```json
{
  "400": "Bad request - invalid user data or preferences",
  "401": "Unauthorized - missing or invalid identity headers",
  "403": "Forbidden - insufficient permissions for user data access",
  "404": "User or profile not found",
  "409": "User data conflict - validation failed",
  "500": "Internal server error",
  "503": "User service unavailable"
}
```

## Service Dependencies

### Upstream and Downstream Service Dependencies
- **Upstream**: Auth-BFF (for identity headers)
- **Downstream**: PostgreSQL database
- **Internal**: Other microservices for user data updates

### Third-Party Integrations
- **PostgreSQL**: User data storage and management
- **Authentication Service**: User authentication and validation

### Database Connections
- **PostgreSQL**: User profiles, preferences, configurations
- **Connection Pooling**: Optimized database connections

### Message Queue Interactions
- **Current**: Direct user data management
- **Future**: Async user data updates with notification queues

## Health & Monitoring

### Health Check Endpoints
- **`/healthz`**: Basic service health status
- **`/readyz`**: Service readiness with database connectivity checks

### Monitoring and Logging Configurations
- **Logging**: Pino with structured JSON logging
- **Metrics**: User data management performance
- **Health Monitoring**: Database connectivity and data integrity

### Performance Metrics
- **Profile Load Time**: Time to load user profiles
- **Preference Update Time**: Time to update user preferences
- **Database Performance**: PostgreSQL operation performance
- **Validation Performance**: User data validation performance

### Alerting Mechanisms
- **Data Validation Errors**: Invalid user data detection
- **Profile Update Failures**: Failed profile update alerts
- **Database Issues**: Database connection and performance problems
- **Data Integrity Issues**: User data integrity problems

## Directory Structure

### Complete Folder Hierarchy
```
services/user-service/
├── Dockerfile
├── package.json
├── README.md
└── src/
    ├── auth.js
    ├── config.js
    ├── database.js
    ├── index.js
    └── schemas.js
```

### File Organization Explanation
- **`config.js`**: Environment-based configuration
- **`index.js`**: Main service implementation and route definitions
- **`auth.js`**: User authentication and authorization
- **`database.js`**: Database operations and connection management
- **`schemas.js`**: User data validation schemas

### Key Configuration Files Location
- **Environment Variables**: `.env` file or Docker environment
- **Database Configuration**: PostgreSQL connection settings
- **User Configuration**: User data and preference settings
- **Validation Schemas**: User data validation schemas

## User Management Capabilities

### Supported User Data Types
1. **Profile Information**: Basic user profile data
2. **Tool Preferences**: User preferences for each DevOps tool
3. **Configuration Settings**: User-specific configuration options
4. **Notification Preferences**: User notification settings
5. **Privacy Settings**: User privacy and visibility preferences
6. **Custom Attributes**: User-defined custom data

### User Features
- **Profile Management**: Complete user profile management
- **Preference Storage**: Store and manage user preferences
- **Configuration Management**: Handle user-specific configurations
- **Data Export**: Export user data for compliance
- **Profile Synchronization**: Sync user data across services
- **Access Control**: Manage user data access permissions

### Tool Integration Support
- **GitHub**: Repository, pull request, and issue preferences
- **GitLab**: Project, merge request, and pipeline preferences
- **Jenkins**: Build job and pipeline preferences
- **Argo CD**: Application and deployment preferences
- **Terraform**: Workspace and state preferences
- **All Other Tools**: Tool-specific preference management

## Security Features

### Access Control
- **User Data Isolation**: Users can only access their own data
- **Admin Access Control**: Admins can access all user data
- **Role-Based Access**: Different access levels based on user roles
- **Audit Logging**: Complete user data access audit trail

### Data Protection
- **Input Validation**: Zod schema validation for all inputs
- **Data Encryption**: Secure storage of sensitive user data
- **SQL Injection Prevention**: Parameterized database queries
- **XSS Protection**: Content security policy headers

### User Security
- **Data Privacy**: Secure handling of user privacy settings
- **Access Logging**: Complete user data access logging
- **Data Integrity**: User data integrity verification
- **Secure Storage**: Encrypted user data storage

## Deployment and Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3003
HOST=0.0.0.0
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/sso_hub

# User Service Configuration
USER_DATA_RETENTION_DAYS=2555
PREFERENCE_SYNC_ENABLED=true
PROFILE_BACKUP_ENABLED=true
ANALYTICS_ENABLED=true

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
EXPOSE 3003
CMD ["npm", "start"]
```

### Health Check Commands
```bash
# Health check
curl http://localhost:3003/healthz

# Readiness check
curl http://localhost:3003/readyz

# List users
curl http://localhost:3003/api/users

# Get user profile
curl http://localhost:3003/api/users/user-123/profile
```

## Performance Optimization

### User Data Optimization
- **Profile Caching**: Cache frequently accessed user profiles
- **Preference Optimization**: Efficient preference storage and retrieval
- **Configuration Caching**: Cache user configurations
- **Batch Operations**: Efficient batch user data operations

### Database Optimization
- **Indexed Queries**: Optimized database schema with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Structured queries for performance
- **Data Partitioning**: User data partitioning for large systems

### Scalability Features
- **Stateless Design**: Service can be horizontally scaled
- **Load Distribution**: Support for multiple service instances
- **Async Processing**: Asynchronous user data processing
- **Data Distribution**: Distributed user data management

## Troubleshooting

### Common Issues
1. **Profile Update Failures**: Check user data validation and permissions
2. **Preference Sync Issues**: Verify preference synchronization configuration
3. **Data Access Problems**: Check user permissions and access control
4. **Database Connection Issues**: Verify PostgreSQL connectivity

### Debug Commands
```bash
# Check service logs
docker logs user-service

# Verify database connectivity
curl -v http://localhost:3003/readyz

# Test user profile access
curl -v http://localhost:3003/api/users/user-123/profile

# Check user preferences
curl -v http://localhost:3003/api/users/user-123/preferences
```

### Log Analysis
- **User Data Access**: Monitor user data access patterns
- **Profile Updates**: Track profile modification attempts
- **Preference Changes**: Monitor preference change patterns
- **Error Patterns**: Identify recurring user data issues

## Future Enhancements

### Planned Features
- **Advanced User Analytics**: AI-powered user behavior analysis
- **Personalization Engine**: Intelligent user preference recommendations
- **Cross-Tool Integration**: Advanced cross-tool user experience
- **User Insights Dashboard**: Comprehensive user analytics dashboard

### Integration Roadmap
- **Phase 1**: Basic user management and preferences (current)
- **Phase 2**: Advanced analytics and personalization
- **Phase 3**: Cross-tool integration and insights
- **Phase 4**: AI-powered user experience optimization

### User Service Evolution
- **Current**: Basic user profile and preference management
- **Future**: Advanced analytics and personalization
- **Advanced**: Cross-tool integration and insights
- **Enterprise**: Enterprise-grade user management platform
