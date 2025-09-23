#!/bin/sh

# Docker entrypoint script for Cosmic DevSpace
set -e

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "🌌 Starting Cosmic DevSpace container..."

# Validate required environment variables
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=production
fi

log "Environment: $NODE_ENV"

# Wait for MongoDB if MONGODB_URI is provided
if [ ! -z "$MONGODB_URI" ]; then
    log "Waiting for MongoDB connection..."
    
    # Extract host and port from MongoDB URI
    MONGO_HOST=$(echo $MONGODB_URI | sed -E 's/.*@([^:]+).*/\1/')
    MONGO_PORT=$(echo $MONGODB_URI | sed -E 's/.*:([0-9]+)\/.*/\1/')
    
    # Default to 27017 if port not found
    if [ -z "$MONGO_PORT" ] || [ "$MONGO_PORT" = "$MONGODB_URI" ]; then
        MONGO_PORT=27017
    fi
    
    # Wait for MongoDB to be available
    timeout=60
    while [ $timeout -gt 0 ]; do
        if nc -z "$MONGO_HOST" "$MONGO_PORT" 2>/dev/null; then
            log "✅ MongoDB is available at $MONGO_HOST:$MONGO_PORT"
            break
        fi
        log "⏳ Waiting for MongoDB... ($timeout seconds remaining)"
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        log "❌ Timeout waiting for MongoDB at $MONGO_HOST:$MONGO_PORT"
        exit 1
    fi
fi

# Wait for Redis if REDIS_URL is provided
if [ ! -z "$REDIS_URL" ]; then
    log "Waiting for Redis connection..."
    
    # Extract host and port from Redis URL
    REDIS_HOST=$(echo $REDIS_URL | sed -E 's/.*@([^:]+).*/\1/')
    REDIS_PORT=$(echo $REDIS_URL | sed -E 's/.*:([0-9]+).*/\1/')
    
    # Default to 6379 if port not found
    if [ -z "$REDIS_PORT" ] || [ "$REDIS_PORT" = "$REDIS_URL" ]; then
        REDIS_PORT=6379
    fi
    
    # Wait for Redis to be available
    timeout=30
    while [ $timeout -gt 0 ]; do
        if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
            log "✅ Redis is available at $REDIS_HOST:$REDIS_PORT"
            break
        fi
        log "⏳ Waiting for Redis... ($timeout seconds remaining)"
        sleep 1
        timeout=$((timeout - 1))
    done
    
    if [ $timeout -le 0 ]; then
        log "⚠️ Warning: Redis not available at $REDIS_HOST:$REDIS_PORT"
    fi
fi

# Initialize application
log "🚀 Initializing Cosmic DevSpace..."

# Run database migrations if needed
if [ -f "backend/scripts/migrate.js" ]; then
    log "📊 Running database migrations..."
    node backend/scripts/migrate.js || log "⚠️ Migration failed or not needed"
fi

# Seed initial data if needed
if [ -f "backend/scripts/seed.js" ] && [ "$SEED_DATABASE" = "true" ]; then
    log "🌱 Seeding initial data..."
    node backend/scripts/seed.js || log "⚠️ Seeding failed or not needed"
fi

# Set up log directories with proper permissions
mkdir -p backend/logs
touch backend/logs/app.log backend/logs/error.log backend/logs/access.log

# Handle graceful shutdown
shutdown_handler() {
    log "🛑 Received shutdown signal, gracefully stopping..."
    kill -TERM "$child" 2>/dev/null
    wait "$child"
    log "👋 Cosmic DevSpace stopped gracefully"
    exit 0
}

# Set up signal handlers
trap 'shutdown_handler' TERM INT

# Start the application
log "🌟 Starting Cosmic DevSpace server..."

if [ "$NODE_ENV" = "development" ]; then
    # Development mode with nodemon if available
    if command -v nodemon >/dev/null; then
        log "🔧 Starting in development mode with nodemon"
        nodemon backend/server.js &
    else
        log "🔧 Starting in development mode"
        node backend/server.js &
    fi
else
    # Production mode
    log "🚀 Starting in production mode"
    node backend/server.js &
fi

child=$!

# Wait for the application to start
sleep 2

# Verify the application is running
if kill -0 "$child" 2>/dev/null; then
    log "✅ Cosmic DevSpace is running successfully (PID: $child)"
else
    log "❌ Failed to start Cosmic DevSpace"
    exit 1
fi

# Keep the script running and wait for the child process
wait "$child"