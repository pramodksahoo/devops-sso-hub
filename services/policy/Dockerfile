# Multi-stage build for Policy Service
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --prod

# Copy source code
COPY src/ ./src/

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm in production stage
RUN npm install -g pnpm@8.15.0

# Copy application from builder stage
COPY --from=builder /app ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S policy -u 1001

# Change ownership of the app directory
RUN chown -R policy:nodejs /app

# Switch to non-root user
USER policy

# Expose port
EXPOSE 3013

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3013/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "src/index.js"]
