# PersonaChain Authentication Service Docker Configuration
FROM node:18-alpine AS base

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S authservice -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 8080
USER authservice
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application code
COPY --chown=authservice:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown authservice:nodejs logs

# Security: Use non-root user
USER authservice

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Expose port
EXPOSE 8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]

# Multi-stage build targets
FROM production AS final
LABEL maintainer="PersonaChain Team <team@persona-chain.com>"
LABEL version="1.0.0"
LABEL description="PersonaChain Enterprise Authentication Service"