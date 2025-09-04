# Webhook Ingress Service Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY src/ ./src/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S webhook-ingress -u 1001

# Change ownership of the app directory
RUN chown -R webhook-ingress:nodejs /app

# Switch to non-root user
USER webhook-ingress

# Expose the port
EXPOSE 3007

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3007/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => { process.exit(1) })"

# Start the service
CMD ["node", "src/index.js"]
