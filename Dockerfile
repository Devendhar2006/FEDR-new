# Production Dockerfile - Multi-stage build
FROM node:18-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/
COPY package*.json ./

# Install backend dependencies
RUN cd backend && npm ci --only=production && npm cache clean --force

# Frontend build stage
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build 2>/dev/null || echo "No build script found, using source files"

# Production stage
FROM node:18-alpine AS production

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S cosmicapp -u 1001

# Set working directory
WORKDIR /app

# Copy backend files
COPY --from=base /app/backend ./backend
COPY --from=base /app/package*.json ./

# Copy frontend files
COPY --from=frontend-build /app/frontend ./frontend

# Create necessary directories and set permissions
RUN mkdir -p logs uploads temp backend/logs && \
    chown -R cosmicapp:nodejs . && \
    chmod -R 755 .

# Copy additional configuration files
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Switch to non-root user
USER cosmicapp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node backend/scripts/healthcheck.js || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application with custom entrypoint
CMD ["./docker-entrypoint.sh"]