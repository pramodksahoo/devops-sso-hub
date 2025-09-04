# Enhanced Analytics Service Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY src/ ./src/

# Create export directory
RUN mkdir -p /tmp/analytics-exports

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S analytics -u 1001

# Change ownership of the app directory
RUN chown -R analytics:nodejs /app
RUN chown -R analytics:nodejs /tmp/analytics-exports

# Switch to non-root user
USER analytics

# Expose the port
EXPOSE 3010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3010/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => { process.exit(1) })"

# Start the service
CMD ["node", "src/index.js"]
