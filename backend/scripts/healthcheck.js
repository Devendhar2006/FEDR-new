// Health Check Script for Cosmic DevSpace
const http = require('http');
const { MongoClient } = require('mongodb');

// Configuration
const config = {
    app: {
        host: process.env.HOST || 'localhost',
        port: process.env.PORT || 3000,
        timeout: 5000
    },
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cosmic_devspace',
        timeout: 3000
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        timeout: 2000
    }
};

// Health check functions
async function checkAppHealth() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: config.app.host,
            port: config.app.port,
            path: '/api/health',
            method: 'GET',
            timeout: config.app.timeout
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve({ status: 'healthy', statusCode: res.statusCode });
                } else {
                    reject(new Error(`App health check failed with status ${res.statusCode}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`App health check failed: ${error.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('App health check timeout'));
        });

        req.setTimeout(config.app.timeout);
        req.end();
    });
}

async function checkMongoHealth() {
    let client;
    
    try {
        client = new MongoClient(config.mongodb.uri, {
            serverSelectionTimeoutMS: config.mongodb.timeout,
            connectTimeoutMS: config.mongodb.timeout
        });
        
        await client.connect();
        await client.db().admin().ping();
        
        return { status: 'healthy' };
    } catch (error) {
        throw new Error(`MongoDB health check failed: ${error.message}`);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

async function checkRedisHealth() {
    return new Promise((resolve, reject) => {
        const net = require('net');
        const socket = new net.Socket();
        
        socket.setTimeout(config.redis.timeout);
        
        socket.connect(config.redis.port, config.redis.host, () => {
            socket.write('PING\r\n');
        });
        
        socket.on('data', (data) => {
            socket.destroy();
            if (data.toString().includes('PONG')) {
                resolve({ status: 'healthy' });
            } else {
                reject(new Error('Redis health check failed: Invalid response'));
            }
        });
        
        socket.on('error', (error) => {
            reject(new Error(`Redis health check failed: ${error.message}`));
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Redis health check timeout'));
        });
    });
}

// Main health check function
async function performHealthCheck() {
    const results = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {}
    };

    // Check application health
    try {
        results.checks.app = await checkAppHealth();
        console.log('✅ App health check passed');
    } catch (error) {
        results.checks.app = { status: 'unhealthy', error: error.message };
        results.status = 'unhealthy';
        console.error('❌ App health check failed:', error.message);
    }

    // Check MongoDB health
    try {
        results.checks.mongodb = await checkMongoHealth();
        console.log('✅ MongoDB health check passed');
    } catch (error) {
        results.checks.mongodb = { status: 'unhealthy', error: error.message };
        results.status = 'unhealthy';
        console.error('❌ MongoDB health check failed:', error.message);
    }

    // Check Redis health (optional)
    if (process.env.REDIS_HOST || process.env.REDIS_URL) {
        try {
            results.checks.redis = await checkRedisHealth();
            console.log('✅ Redis health check passed');
        } catch (error) {
            results.checks.redis = { status: 'unhealthy', error: error.message };
            console.warn('⚠️ Redis health check failed:', error.message);
            // Redis is optional, don't fail overall health check
        }
    }

    return results;
}

// Memory and resource checks
function getResourceUsage() {
    const usage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
        memory: {
            rss: Math.round(usage.rss / 1024 / 1024), // MB
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
            external: Math.round(usage.external / 1024 / 1024) // MB
        },
        cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
        },
        uptime: Math.round(process.uptime()), // seconds
        nodeVersion: process.version
    };
}

// Main execution
async function main() {
    try {
        console.log('🔍 Starting Cosmic DevSpace health check...');
        
        const healthResults = await performHealthCheck();
        const resourceUsage = getResourceUsage();
        
        const fullReport = {
            ...healthResults,
            resources: resourceUsage
        };
        
        if (healthResults.status === 'healthy') {
            console.log('✅ Overall health check passed');
            console.log(JSON.stringify(fullReport, null, 2));
            process.exit(0);
        } else {
            console.error('❌ Overall health check failed');
            console.error(JSON.stringify(fullReport, null, 2));
            process.exit(1);
        }
        
    } catch (error) {
        console.error('🚨 Health check error:', error);
        process.exit(1);
    }
}

// Handle process signals
process.on('SIGTERM', () => {
    console.log('📡 Received SIGTERM, exiting health check');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📡 Received SIGINT, exiting health check');
    process.exit(0);
});

// Run if this script is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    performHealthCheck,
    checkAppHealth,
    checkMongoHealth,
    checkRedisHealth,
    getResourceUsage
};