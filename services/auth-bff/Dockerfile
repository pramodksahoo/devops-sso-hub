FROM node:20-alpine
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --prod

# Copy source code
COPY src/ ./src/

# Frontend files will be mounted or copied via docker-compose
# Creating public directory for static files
RUN mkdir -p ./public

EXPOSE 3002
CMD ["pnpm", "start"]
