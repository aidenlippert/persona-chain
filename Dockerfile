# Use the official Node.js 20 runtime as the base image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json first for better caching
COPY package.json ./

# Install dependencies (more flexible than npm ci)
RUN npm install --verbose --no-audit --no-fund --legacy-peer-deps

# Copy the application source code
COPY . .

# Skip build for minimal test
# RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose the port the app runs on
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http');const options={hostname:'localhost',port:8080,path:'/health',timeout:2000};const req=http.request(options,res=>{process.exit(res.statusCode===200?0:1)});req.on('error',()=>process.exit(1));req.end();"

# Define the command to run the application
CMD ["node", "minimal-server.js"]