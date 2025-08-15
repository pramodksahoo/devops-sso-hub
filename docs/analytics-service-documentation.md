# Analytics Service Documentation

## Service Overview

### Service Name and Purpose
**Analytics Service** - Enhanced analytics service with comprehensive tool-specific metrics and reporting for SSO Hub, tracking usage patterns, performance metrics, and cross-tool workflows.

### Business Use Cases and Functional Requirements
- **Usage Analytics**: Track user activity and tool usage patterns across all DevOps tools
- **Performance Metrics**: Monitor system performance and response times
- **Cross-Tool Workflows**: Analyze user journeys across multiple tools
- **Business Intelligence**: Generate insights for operational optimization
- **Custom Reporting**: Create tailored reports for different stakeholders
- **Trend Analysis**: Identify usage patterns and performance trends over time
- **Data Export**: Export analytics data in various formats (CSV, JSON, etc.)

### Service Boundaries and Responsibilities
- **Data Collection**: Gather analytics data from all integrated services
- **Metrics Processing**: Process and aggregate raw data into meaningful metrics
- **Report Generation**: Create comprehensive reports and dashboards
- **Data Storage**: Manage analytics data storage and retention
- **Export Services**: Provide data export capabilities
- **Scheduled Analytics**: Run automated analytics and reporting jobs

## Architecture Documentation

### High-Level Architecture Diagram
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Frontend  │───▶│   Analytics  │───▶│ PostgreSQL  │
│             │    │   Service    │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Metrics    │
                   │  Processor   │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Report     │
                   │  Generator   │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Data      │
                   │   Export    │
                   └──────────────┘
```

### Component Relationships and Interactions
1. **Frontend Integration**: Receives analytics requests and displays reports
2. **Analytics Manager**: Orchestrates data collection and processing
3. **Report Generator**: Creates comprehensive reports and visualizations
4. **Metrics Processor**: Processes raw data into meaningful metrics
5. **Database Manager**: Handles analytics data storage and retrieval
6. **Export Service**: Provides data export in various formats

### Design Patterns Implemented
- **Data Pipeline Pattern**: Sequential data processing and transformation
- **Repository Pattern**: Data access abstraction layer
- **Factory Pattern**: Report generation for different types
- **Observer Pattern**: Event-driven data collection
- **Strategy Pattern**: Different analytics strategies for different metrics

## Technical Specifications

### Technology Stack and Frameworks
- **Runtime**: Node.js 20+
- **Web Framework**: Fastify 4.27.0
- **Database**: PostgreSQL with @fastify/postgres
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: @fastify/helmet, @fastify/rate-limit
- **Validation**: Zod 3.22.4
- **Logging**: Pino 8.17.2
- **Data Processing**: Custom analytics processing engine

### Programming Language and Version
- **Language**: JavaScript (CommonJS)
- **Node.js Version**: 20.0.0+
- **Package Manager**: pnpm

### Database Technologies
- **Primary Database**: PostgreSQL 15+
- **Analytics Data**: Structured analytics data storage
- **Metrics Storage**: Pre-calculated metrics and aggregations
- **Historical Data**: Time-series data for trend analysis

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
  "axios": "^1.6.0",
  "uuid": "^9.0.1",
  "csv-writer": "^1.6.0",
  "json2csv": "^5.0.7",
  "node-cron": "^3.0.3",
  "moment": "^2.29.4"
}
```

## API Documentation

### Complete Endpoint Specifications

#### Health Check Endpoints
```http
GET /healthz
GET /readyz
```

#### Analytics Endpoints
```http
GET /api/analytics/overview
GET /api/analytics/tools/:tool_id
GET /api/analytics/users/:user_id
GET /api/analytics/workflows
```

#### Metrics Endpoints
```http
GET /api/metrics/usage
GET /api/metrics/performance
GET /api/metrics/trends
GET /api/metrics/custom
```

#### Report Endpoints
```http
GET /api/reports
GET /api/reports/:id
POST /api/reports
PUT /api/reports/:id
DELETE /api/reports/:id
POST /api/reports/:id/generate
```

#### Export Endpoints
```http
GET /api/export/csv
GET /api/export/json
GET /api/export/excel
POST /api/export/custom
```

### Request/Response Schemas

#### Analytics Overview Schema
```json
{
  "summary": {
    "total_users": 150,
    "total_tools": 11,
    "total_sessions": 1250,
    "active_users_today": 45,
    "total_provisioning_events": 89
  },
  "tool_usage": {
    "github": {
      "total_sessions": 450,
      "unique_users": 120,
      "avg_session_duration": 1800,
      "success_rate": 98.5
    },
    "gitlab": {
      "total_sessions": 320,
      "unique_users": 95,
      "avg_session_duration": 2100,
      "success_rate": 97.2
    }
  },
  "performance_metrics": {
    "avg_response_time": 150,
    "error_rate": 0.015,
    "availability": 99.8
  }
}
```

#### Custom Metrics Request Schema
```json
{
  "metric_type": "user_workflow",
  "parameters": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "tools": ["github", "gitlab", "jenkins"],
    "user_roles": ["admin", "developer"],
    "aggregation": "daily"
  },
  "filters": {
    "min_session_duration": 300,
    "success_only": true
  }
}
```

#### Report Generation Schema
```json
{
  "report_id": "monthly-usage-2024-01",
  "name": "Monthly Usage Report - January 2024",
  "type": "usage_summary",
  "parameters": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "include_charts": true,
    "export_format": "pdf"
  },
  "status": "generating",
  "progress": 75,
  "estimated_completion": "2024-02-01T10:00:00.000Z"
}
```

### Authentication and Authorization Details
- **Identity Headers**: X-User-Sub, X-User-Email, X-User-Roles, X-User-Signature
- **Role-Based Access**: Analytics access based on user roles
- **Data Privacy**: User data access restrictions
- **Report Access**: Report creation and viewing permissions

### Error Codes and Handling
```json
{
  "400": "Bad request - invalid parameters or filters",
  "401": "Unauthorized - missing or invalid identity headers",
  "403": "Forbidden - insufficient permissions for analytics access",
  "404": "Report or metric not found",
  "500": "Internal server error",
  "503": "Analytics service unavailable"
}
```

## Service Dependencies

### Upstream and Downstream Service Dependencies
- **Upstream**: Auth-BFF (for identity headers), all other microservices
- **Downstream**: PostgreSQL database for analytics storage
- **External**: Data sources from integrated DevOps tools

### Third-Party Integrations
- **PostgreSQL**: Analytics data storage and querying
- **DevOps Tools**: Usage data collection and metrics
- **Export Services**: CSV, JSON, and Excel export capabilities

### Database Connections
- **PostgreSQL**: Analytics data, metrics, reports
- **Connection Pooling**: Optimized database connections

### Message Queue Interactions
- **Current**: Direct data collection and processing
- **Future**: Async analytics processing with job queues

## Health & Monitoring

### Health Check Endpoints
- **`/healthz`**: Basic service health status
- **`/readyz`**: Service readiness with database connectivity checks

### Monitoring and Logging Configurations
- **Logging**: Pino with structured JSON logging
- **Metrics**: Analytics processing performance and data quality
- **Health Monitoring**: Database connectivity and data processing

### Performance Metrics
- **Data Processing Time**: Analytics processing performance
- **Report Generation Time**: Report creation performance
- **Database Query Time**: PostgreSQL operation performance
- **Export Performance**: Data export operation performance

### Alerting Mechanisms
- **Data Collection Failures**: Failed data collection detection
- **Processing Errors**: Analytics processing failures
- **Database Issues**: Database connection and performance problems
- **Report Generation Failures**: Failed report generation

## Directory Structure

### Complete Folder Hierarchy
```
services/analytics/
├── Dockerfile
├── package.json
├── README.md
└── src/
    ├── analytics-manager.js
    ├── config.js
    ├── index.js
    └── report-generator.js
```

### File Organization Explanation
- **`config.js`**: Environment-based configuration
- **`index.js`**: Main service implementation and route definitions
- **`analytics-manager.js`**: Core analytics processing and management
- **`report-generator.js`**: Report generation and export functionality

### Key Configuration Files Location
- **Environment Variables**: `.env` file or Docker environment
- **Database Configuration**: PostgreSQL connection settings
- **Analytics Configuration**: Data collection and processing settings
- **Report Configuration**: Report generation and export settings

## Analytics Capabilities

### Supported Analytics Types
1. **Usage Analytics**: User activity and tool usage patterns
2. **Performance Analytics**: System performance and response times
3. **Workflow Analytics**: Cross-tool user journey analysis
4. **Trend Analytics**: Time-series data analysis and forecasting
5. **Custom Analytics**: User-defined metrics and calculations

### Metrics Collection
- **User Activity**: Login patterns, session durations, tool usage
- **Tool Performance**: Response times, error rates, availability
- **Workflow Metrics**: Cross-tool navigation patterns
- **Business Metrics**: Provisioning success rates, resource utilization
- **Custom Metrics**: User-defined business-specific measurements

### Data Processing Capabilities
- **Real-time Processing**: Live data collection and processing
- **Batch Processing**: Scheduled analytics and reporting
- **Data Aggregation**: Multi-level data summarization
- **Data Filtering**: Flexible filtering and segmentation
- **Data Transformation**: Data cleaning and normalization

## Security Features

### Access Control
- **Role-Based Analytics**: Analytics access based on user roles
- **Data Privacy**: User data access restrictions and anonymization
- **Report Access Control**: Report creation and viewing permissions
- **Audit Logging**: Comprehensive analytics access logging

### Data Protection
- **Input Validation**: Zod schema validation for all inputs
- **Data Sanitization**: Secure data processing and storage
- **SQL Injection Prevention**: Parameterized database queries
- **XSS Protection**: Content security policy headers

### Analytics Security
- **Data Encryption**: Secure storage of sensitive analytics data
- **Access Logging**: Complete analytics access audit trail
- **Data Retention**: Configurable data retention policies
- **Privacy Compliance**: GDPR and privacy regulation compliance

## Deployment and Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3010
HOST=0.0.0.0
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/sso_hub

# Analytics Configuration
ANALYTICS_COLLECTION_INTERVAL=300000
DATA_RETENTION_DAYS=365
BATCH_PROCESSING_ENABLED=true
REAL_TIME_PROCESSING=true

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
EXPOSE 3010
CMD ["npm", "start"]
```

### Health Check Commands
```bash
# Health check
curl http://localhost:3010/healthz

# Readiness check
curl http://localhost:3010/readyz

# Analytics overview
curl http://localhost:3010/api/analytics/overview

# List reports
curl http://localhost:3010/api/reports
```

## Performance Optimization

### Analytics Optimization
- **Data Caching**: Cache frequently accessed analytics data
- **Query Optimization**: Optimized database queries for analytics
- **Parallel Processing**: Concurrent analytics processing
- **Data Pre-aggregation**: Pre-calculated metrics for performance

### Database Optimization
- **Indexed Queries**: Optimized database schema with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Structured queries for performance
- **Data Partitioning**: Time-based data partitioning for large datasets

### Scalability Features
- **Stateless Design**: Service can be horizontally scaled
- **Load Distribution**: Support for multiple service instances
- **Async Processing**: Asynchronous analytics processing
- **Data Distribution**: Distributed analytics data processing

## Troubleshooting

### Common Issues
1. **Data Collection Failures**: Verify data source connectivity
2. **Processing Errors**: Check analytics processing configuration
3. **Report Generation Failures**: Validate report templates and parameters
4. **Database Performance Issues**: Check PostgreSQL performance and indexes

### Debug Commands
```bash
# Check service logs
docker logs analytics-service

# Verify database connectivity
curl -v http://localhost:3010/readyz

# Test analytics endpoint
curl -v http://localhost:3010/api/analytics/overview

# Check report generation
curl -v http://localhost:3010/api/reports
```

### Log Analysis
- **Data Collection**: Monitor data collection success and failures
- **Processing Performance**: Track analytics processing performance
- **Report Generation**: Monitor report creation and export
- **Error Patterns**: Identify recurring analytics failures

## Future Enhancements

### Planned Features
- **Advanced Analytics**: Machine learning-powered insights and predictions
- **Real-time Dashboards**: Live analytics dashboards with real-time updates
- **Predictive Analytics**: AI-powered trend prediction and forecasting
- **Advanced Visualization**: Interactive charts and data exploration tools

### Integration Roadmap
- **Phase 1**: Basic analytics and reporting (current)
- **Phase 2**: Advanced metrics and real-time processing
- **Phase 3**: Machine learning and predictive analytics
- **Phase 4**: AI-powered business intelligence platform

### Analytics Evolution
- **Current**: Basic usage and performance analytics
- **Future**: Advanced business intelligence and insights
- **Advanced**: Predictive analytics and machine learning
- **Enterprise**: Enterprise-grade analytics platform
