# PersonaChain Enterprise Backend - Production Dockerfile
# Multi-stage build for optimized production deployment

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine AS production

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S personachain -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src

# Copy environment files
COPY .env.production .env.example ./

# Set ownership
RUN chown -R personachain:nodejs /app
USER personachain

# Expose ports
EXPOSE 8080 8081 8082 8083

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]

# Labels for better container management
LABEL maintainer="PersonaChain Team <support@personachain.com>"
LABEL version="3.0.0"
LABEL description="PersonaChain Enterprise Backend - 50,000+ lines of production-grade identity platform"
LABEL org.opencontainers.image.source="https://github.com/personachain/persona-chain"
LABEL org.opencontainers.image.vendor="PersonaChain"
LABEL org.opencontainers.image.title="PersonaChain Enterprise Backend"
LABEL org.opencontainers.image.description="Complete enterprise identity platform with advanced compliance, security, and performance features"