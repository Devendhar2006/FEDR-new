// Test Setup - Global configuration for tests
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Global test variables
global.testTimeout = 30000;
global.mongoServer = null;

// Setup before all tests
beforeAll(async () => {
    console.log('🧪 Setting up test environment...');
    
    // Start in-memory MongoDB
    global.mongoServer = await MongoMemoryServer.create();
    const mongoUri = global.mongoServer.getUri();
    
    // Connect to test database
    await mongoose.connect(mongoUri);
    
    console.log('✅ Test database connected');
});

// Cleanup after all tests
afterAll(async () => {
    console.log('🧹 Cleaning up test environment...');
    
    // Close database connection
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    
    // Stop in-memory MongoDB
    if (global.mongoServer) {
        await global.mongoServer.stop();
    }
    
    console.log('✅ Test cleanup completed');
});

// Clear database between tests
beforeEach(async () => {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
});

// Global test utilities
global.testUtils = {
    // Create test user
    createTestUser: (overrides = {}) => ({
        username: 'testuser',
        email: 'test@cosmic.dev',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        ...overrides
    }),
    
    // Create test project
    createTestProject: (overrides = {}) => ({
        title: 'Test Project',
        description: 'A test project for the cosmic universe',
        technologies: ['JavaScript', 'Node.js', 'MongoDB'],
        category: 'Web Development',
        status: 'completed',
        ...overrides
    }),
    
    // Create test message
    createTestMessage: (overrides = {}) => ({
        content: 'Hello from the cosmic test universe!',
        author: 'Test User',
        email: 'test@cosmic.dev',
        ...overrides
    }),
    
    // Generate random string
    randomString: (length = 10) => {
        return Math.random().toString(36).substring(2, length + 2);
    },
    
    // Generate random email
    randomEmail: () => {
        return `test${Math.random().toString(36).substring(2, 8)}@cosmic.dev`;
    },
    
    // Wait for specified time
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    // Mock request object
    mockRequest: (overrides = {}) => ({
        body: {},
        params: {},
        query: {},
        headers: {},
        user: null,
        ...overrides
    }),
    
    // Mock response object
    mockResponse: () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        res.send = jest.fn().mockReturnValue(res);
        res.end = jest.fn().mockReturnValue(res);
        res.cookie = jest.fn().mockReturnValue(res);
        res.clearCookie = jest.fn().mockReturnValue(res);
        return res;
    },
    
    // Mock next function
    mockNext: () => jest.fn()
};

// Global mocks
global.mocks = {
    // Mock console to reduce noise in tests
    mockConsole: () => {
        const originalConsole = console;
        console.log = jest.fn();
        console.error = jest.fn();
        console.warn = jest.fn();
        console.info = jest.fn();
        
        return {
            restore: () => {
                console.log = originalConsole.log;
                console.error = originalConsole.error;
                console.warn = originalConsole.warn;
                console.info = originalConsole.info;
            }
        };
    },
    
    // Mock Date.now
    mockDateNow: (timestamp) => {
        const originalDateNow = Date.now;
        Date.now = jest.fn(() => timestamp);
        
        return {
            restore: () => {
                Date.now = originalDateNow;
            }
        };
    }
};

// Custom matchers
expect.extend({
    // Check if response has specific status
    toHaveStatus(received, expected) {
        const pass = received.status.mock.calls.length > 0 && 
                    received.status.mock.calls[0][0] === expected;
        
        if (pass) {
            return {
                message: () => `Expected response not to have status ${expected}`,
                pass: true
            };
        } else {
            return {
                message: () => `Expected response to have status ${expected}`,
                pass: false
            };
        }
    },
    
    // Check if response has specific json content
    toHaveJsonContent(received, expected) {
        const jsonCalls = received.json.mock.calls;
        const pass = jsonCalls.length > 0 && 
                    JSON.stringify(jsonCalls[0][0]) === JSON.stringify(expected);
        
        if (pass) {
            return {
                message: () => `Expected response not to have JSON content ${JSON.stringify(expected)}`,
                pass: true
            };
        } else {
            return {
                message: () => `Expected response to have JSON content ${JSON.stringify(expected)}`,
                pass: false
            };
        }
    }
});

// Environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-cosmic-testing';
process.env.SESSION_SECRET = 'test-session-secret-for-cosmic-testing';
process.env.MONGODB_URI = 'mongodb://localhost:27017/cosmic_test';

console.log('🌌 Cosmic DevSpace test environment initialized!');