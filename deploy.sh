#!/bin/bash

# 🌌 Cosmic DevSpace Deployment Script
# This script sets up the complete Cosmic DevSpace application

set -e  # Exit on any error

echo "🚀 Starting Cosmic DevSpace deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}$1${NC}"
}

# Check if running on Windows (Git Bash/WSL)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    print_warning "Detected Windows environment. Some commands may need adjustment."
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_header "🔍 Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d 'v' -f 2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Node.js version $NODE_VERSION is too old. Please upgrade to 18.0.0 or higher."
    exit 1
fi

print_success "Node.js version $NODE_VERSION ✓"

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "npm is available ✓"

# Check for MongoDB
if ! command_exists mongod; then
    print_warning "MongoDB not found locally. Will use Docker or Atlas connection."
fi

# Check for Docker
if command_exists docker; then
    print_success "Docker is available ✓"
    DOCKER_AVAILABLE=true
else
    print_warning "Docker not found. Manual database setup required."
    DOCKER_AVAILABLE=false
fi

# Setup environment
print_header "🌍 Setting up environment..."

if [ ! -f .env ]; then
    print_status "Creating environment file from template..."
    cp .env.example .env
    print_warning "Please edit .env file with your actual configuration values!"
else
    print_success "Environment file exists ✓"
fi

# Install dependencies
print_header "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi

print_success "Dependencies installed ✓"

# Create necessary directories
print_header "📁 Creating directories..."
mkdir -p logs uploads

print_success "Directories created ✓"

# Database setup
print_header "🗄️ Setting up database..."

# Ask user for database preference
echo "Choose database setup option:"
echo "1) Use Docker MongoDB (recommended for development)"
echo "2) Use local MongoDB"
echo "3) Use MongoDB Atlas (cloud)"
echo "4) Skip database setup"

read -p "Enter your choice (1-4): " db_choice

case $db_choice in
    1)
        if [ "$DOCKER_AVAILABLE" = true ]; then
            print_status "Starting MongoDB with Docker..."
            docker run -d --name cosmic-mongo -p 27017:27017 \
                -e MONGO_INITDB_ROOT_USERNAME=cosmicadmin \
                -e MONGO_INITDB_ROOT_PASSWORD=cosmicpass123 \
                mongo:7.0
            
            if [ $? -eq 0 ]; then
                print_success "MongoDB Docker container started ✓"
            else
                print_error "Failed to start MongoDB container"
                exit 1
            fi
        else
            print_error "Docker not available. Please choose another option."
            exit 1
        fi
        ;;
    2)
        print_status "Using local MongoDB. Ensure it's running on port 27017."
        ;;
    3)
        print_status "Using MongoDB Atlas. Ensure connection string is set in .env file."
        ;;
    4)
        print_warning "Skipping database setup. Database must be configured manually."
        ;;
    *)
        print_error "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Production build setup
print_header "🏗️ Setting up production environment..."

echo "Choose deployment mode:"
echo "1) Development (local)"
echo "2) Production (Docker Compose)"
echo "3) Production (PM2)"
echo "4) Skip production setup"

read -p "Enter your choice (1-4): " deploy_choice

case $deploy_choice in
    1)
        print_status "Starting development server..."
        npm run dev &
        DEV_PID=$!
        print_success "Development server started (PID: $DEV_PID) ✓"
        echo "Server running at http://localhost:3000"
        ;;
    2)
        if [ "$DOCKER_AVAILABLE" = true ]; then
            print_status "Setting up Docker Compose production environment..."
            
            # Check if docker-compose exists
            if command_exists docker-compose; then
                docker-compose --profile production up -d
                print_success "Production environment started with Docker Compose ✓"
            else
                print_error "docker-compose not found. Please install Docker Compose."
                exit 1
            fi
        else
            print_error "Docker not available. Please choose another option."
            exit 1
        fi
        ;;
    3)
        print_status "Setting up PM2 production environment..."
        
        # Install PM2 if not available
        if ! command_exists pm2; then
            print_status "Installing PM2 globally..."
            npm install -g pm2
        fi
        
        # Start with PM2
        pm2 start ecosystem.config.js --env production
        pm2 save
        pm2 startup
        
        print_success "Production environment started with PM2 ✓"
        echo "Use 'pm2 monit' to monitor the application"
        ;;
    4)
        print_warning "Skipping production setup."
        ;;
    *)
        print_error "Invalid choice. Exiting."
        exit 1
        ;;
esac

# SSL Certificate setup for production
if [ "$deploy_choice" = "2" ] || [ "$deploy_choice" = "3" ]; then
    echo "Do you want to set up SSL certificates? (y/n)"
    read -p "Choice: " ssl_choice
    
    if [ "$ssl_choice" = "y" ] || [ "$ssl_choice" = "Y" ]; then
        print_status "Setting up SSL certificates..."
        
        if [ ! -d "ssl" ]; then
            mkdir ssl
        fi
        
        # Generate self-signed certificate for development
        openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
            -subj "/C=US/ST=Space/L=Cosmos/O=CosmicDevSpace/CN=localhost"
        
        print_success "Self-signed SSL certificate generated ✓"
        print_warning "For production, replace with valid SSL certificates"
    fi
fi

# Health check
print_header "🏥 Running health checks..."
sleep 5  # Wait for services to start

# Function to check if service is running
check_service() {
    local url=$1
    local service_name=$2
    
    if curl -s "$url" > /dev/null; then
        print_success "$service_name is healthy ✓"
        return 0
    else
        print_error "$service_name is not responding"
        return 1
    fi
}

# Check application health
if [ "$deploy_choice" != "4" ]; then
    check_service "http://localhost:3000/health" "Cosmic DevSpace Application"
fi

# Final instructions
print_header "🎉 Deployment complete!"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                                    🌌 COSMIC DEVSPACE READY FOR LAUNCH! 🚀                                     "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_success "🌟 Application URL: http://localhost:3000"
print_success "🛠️ Admin Panel: http://localhost:3000/admin"
print_success "📊 Health Check: http://localhost:3000/health"

if [ "$db_choice" = "1" ] && [ "$DOCKER_AVAILABLE" = true ]; then
    print_success "🗄️ MongoDB: mongodb://cosmicadmin:cosmicpass123@localhost:27017/cosmic_devspace"
fi

echo ""
print_header "📚 Useful Commands:"
echo "• npm run dev          - Start development server"
echo "• npm run pm2:logs     - View PM2 logs"
echo "• npm run health       - Check application health"
echo "• docker-compose logs  - View Docker logs"
echo "• pm2 monit           - Monitor PM2 processes"

echo ""
print_header "🔧 Configuration:"
echo "• Edit .env file for environment variables"
echo "• Modify frontend/index.html for content"
echo "• Update package.json for project details"

echo ""
print_header "🚀 Next Steps:"
echo "1. Edit .env file with your actual configuration"
echo "2. Customize frontend content in index.html"
echo "3. Add your projects to the portfolio section"
echo "4. Set up domain and SSL for production"
echo "5. Configure monitoring and backups"

echo ""
print_warning "⚠️  Important Security Notes:"
echo "• Change default passwords in .env file"
echo "• Use strong JWT secrets for production"
echo "• Set up proper SSL certificates"
echo "• Configure firewall rules"
echo "• Enable MongoDB authentication"

echo ""
print_success "🎊 Welcome to the cosmic development universe!"
echo "🚀 May your code be bug-free and your deployments successful!"

# Save deployment info
cat > deployment-info.txt << EOF
Cosmic DevSpace Deployment Information
=====================================

Deployment Date: $(date)
Node.js Version: $NODE_VERSION
Database: $db_choice
Deployment Mode: $deploy_choice
Docker Available: $DOCKER_AVAILABLE

Application URL: http://localhost:3000
Health Check: http://localhost:3000/health

Generated by: deploy.sh
EOF

print_success "📝 Deployment information saved to deployment-info.txt"