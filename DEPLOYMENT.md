# 🚀 Cosmic DevSpace - Deployment Guide

This comprehensive guide will help you deploy the Cosmic DevSpace application to production.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Testing & Validation](#testing--validation)
4. [Local Development](#local-development)
5. [Docker Deployment](#docker-deployment)
6. [Production Deployment](#production-deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### System Requirements
- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **Docker**: 20.10 or higher (for containerized deployment)
- **Docker Compose**: 2.0 or higher
- **MongoDB**: 5.0 or higher (if not using Docker)
- **Redis**: 6.0 or higher (for caching and sessions)

### Domain & SSL
- Domain name configured with DNS
- SSL certificate (Let's Encrypt recommended)
- CDN setup (Cloudflare recommended)

## 🌍 Environment Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/cosmic-devspace.git
cd cosmic-devspace
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration

Create environment files:

#### `.env` (Development)
```env
# Application
NODE_ENV=development
PORT=3000
APP_NAME=Cosmic DevSpace
APP_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/cosmic_devspace_dev
MONGODB_TEST_URI=mongodb://localhost:27017/cosmic_devspace_test

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12

# Redis
REDIS_URL=redis://localhost:6379
REDIS_SESSION_SECRET=your-redis-session-secret

# Email (Development)
EMAIL_FROM=noreply@cosmicdevspace.com
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads/

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/cosmic-devspace.log

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Features
ENABLE_REAL_TIME=true
ENABLE_NOTIFICATIONS=true
ENABLE_ANALYTICS=true
```

#### `.env.production` (Production)
```env
# Application
NODE_ENV=production
PORT=3000
APP_NAME=Cosmic DevSpace
APP_URL=https://yourdomain.com

# Database
MONGODB_URI=mongodb://mongodb:27017/cosmic_devspace
REDIS_URL=redis://redis:6379

# Authentication
JWT_SECRET=ultra-secure-production-jwt-secret-64-chars-long
JWT_EXPIRE=24h
BCRYPT_ROUNDS=12

# Email (Production)
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=50
HELMET_CSP=true

# SSL
SSL_CERT_PATH=/etc/ssl/certs/cert.pem
SSL_KEY_PATH=/etc/ssl/private/key.pem

# Monitoring
SENTRY_DSN=your-sentry-dsn
GOOGLE_ANALYTICS_ID=your-ga-id

# Performance
ENABLE_COMPRESSION=true
ENABLE_CACHE=true
CACHE_TTL=3600
```

## 🧪 Testing & Validation

### 1. Run Complete Test Suite
```bash
# Run all tests with validation
npm test

# Or run individual test suites
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance
npm run test:security
```

### 2. Code Quality Checks
```bash
# Lint code
npm run lint

# Format code
npm run format

# Security audit
npm run security:audit
```

### 3. Build Validation
```bash
# Test production build
npm run build

# Validate deployment readiness
node scripts/test-runner.js
```

## 🏠 Local Development

### 1. Start Development Server
```bash
# Start with auto-reload
npm run dev

# Start with debugging
npm run dev:debug

# View logs
npm run logs:view
```

### 2. Development Workflow
```bash
# Setup development environment
npm run setup:dirs

# Run tests in watch mode
npm run test:watch

# Check dependencies
npm run deps:check
```

## 🐳 Docker Deployment

### 1. Development with Docker
```bash
# Start development environment
npm run docker:compose:dev

# View logs
npm run docker:compose:logs

# Stop services
npm run docker:compose:down
```

### 2. Production with Docker

#### Build and Deploy
```bash
# Build production image
docker build -t cosmic-devspace:latest .

# Start production stack
npm run docker:compose:prod

# Check status
docker-compose ps
```

#### Production Docker Compose
The production setup includes:
- **Application Server**: Node.js app with PM2
- **Database**: MongoDB with persistence
- **Cache**: Redis for sessions and caching
- **Reverse Proxy**: Nginx with SSL termination
- **Monitoring**: Prometheus, Grafana, Loki stack

### 3. Environment Variables for Docker
Create `.env.docker`:
```env
COMPOSE_PROJECT_NAME=cosmic-devspace
MONGODB_ROOT_USERNAME=admin
MONGODB_ROOT_PASSWORD=secure-mongo-password
REDIS_PASSWORD=secure-redis-password
NGINX_SSL_CERT=/etc/ssl/certs/fullchain.pem
NGINX_SSL_KEY=/etc/ssl/private/privkey.pem
```

## 🌐 Production Deployment

### 1. VPS/Cloud Server Deployment

#### Prepare Server
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Deploy Application
```bash
# Clone repository
git clone https://github.com/yourusername/cosmic-devspace.git
cd cosmic-devspace

# Setup environment
cp .env.example .env.production
# Edit .env.production with your values

# Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 2. Platform-as-a-Service Deployment

#### Heroku
```bash
# Login to Heroku
heroku login

# Create app
heroku create cosmic-devspace

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
heroku config:set MONGODB_URI=your-mongodb-uri

# Deploy
npm run deploy:heroku
```

#### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
npm run deploy:railway
```

### 3. SSL Configuration

#### Let's Encrypt with Certbot
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

## 📊 Monitoring & Maintenance

### 1. Application Monitoring

#### Health Checks
```bash
# Check application health
npm run health

# View application stats
npm run stats

# Monitor with PM2
npm run pm2:monitor
```

#### Log Management
```bash
# View application logs
npm run logs:view

# View error logs
npm run logs:error

# Rotate logs (add to crontab)
0 0 * * * /usr/bin/logrotate /path/to/logrotate.conf
```

### 2. Database Maintenance

#### Backup
```bash
# Create backup
npm run backup

# Schedule daily backups (crontab)
0 2 * * * cd /path/to/app && npm run backup
```

#### Performance Monitoring
- Monitor MongoDB metrics through Grafana dashboard
- Set up alerts for high memory usage
- Monitor connection pool statistics

### 3. Security Monitoring

#### Regular Security Tasks
```bash
# Update dependencies
npm run deps:update

# Security audit
npm run security:audit

# Check for vulnerabilities
npm audit
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs
docker-compose logs cosmic-app

# Verify environment variables
docker-compose config

# Check port availability
netstat -tlnp | grep :3000
```

#### 2. Database Connection Issues
```bash
# Check MongoDB status
docker-compose exec mongodb mongosh

# Verify connection string
echo $MONGODB_URI

# Check network connectivity
docker-compose exec cosmic-app ping mongodb
```

#### 3. SSL/HTTPS Issues
```bash
# Check certificate validity
openssl x509 -in /path/to/cert.pem -text -noout

# Test SSL configuration
curl -I https://yourdomain.com

# Verify Nginx configuration
docker-compose exec nginx nginx -t
```

#### 4. Performance Issues
```bash
# Monitor resource usage
docker stats

# Check application metrics
curl http://localhost:3000/api/health

# View slow queries
# Access MongoDB logs through Grafana
```

### Debug Mode

#### Enable Debug Logging
```bash
# Set debug environment
export NODE_ENV=development
export LOG_LEVEL=debug

# Start with debugging
npm run dev:debug
```

#### Application Profiling
```bash
# Generate performance report
node --prof server.js

# Process profiling data
node --prof-process isolate-*.log > processed.txt
```

## 📈 Performance Optimization

### 1. Application Optimization
- Enable compression middleware
- Implement caching strategies
- Optimize database queries
- Use CDN for static assets

### 2. Database Optimization
- Create proper indexes
- Monitor slow queries
- Implement connection pooling
- Regular maintenance tasks

### 3. Infrastructure Optimization
- Load balancing with multiple instances
- Auto-scaling configuration
- CDN integration
- Caching layers

## 🔒 Security Checklist

- [ ] Environment variables secured
- [ ] SSL certificate installed and configured
- [ ] Security headers implemented
- [ ] Rate limiting configured
- [ ] Input validation and sanitization
- [ ] Regular security audits
- [ ] Dependency updates
- [ ] Monitoring and alerting setup

## 📝 Maintenance Schedule

### Daily
- Monitor application health
- Check error logs
- Verify backup completion

### Weekly
- Review security logs
- Check resource usage
- Update dependencies (if needed)

### Monthly
- Security audit
- Performance review
- Database maintenance
- SSL certificate renewal check

## 🆘 Support

### Getting Help
- **Documentation**: Check this guide first
- **Logs**: Always include relevant logs with issues
- **Environment**: Specify your deployment method
- **Issues**: Create GitHub issues for bugs

### Emergency Contacts
- **Application Issues**: Check health endpoint
- **Security Issues**: Immediate restart and investigation
- **Database Issues**: Check MongoDB logs and connections

---

## 🎉 Deployment Complete!

Your Cosmic DevSpace application should now be running in production. Remember to:

1. Monitor the application regularly
2. Keep dependencies updated
3. Maintain regular backups
4. Follow security best practices

For any issues or questions, refer to the troubleshooting section or create an issue in the GitHub repository.

**Happy coding in the cosmos! 🌌✨**