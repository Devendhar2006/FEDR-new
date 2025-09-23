// Test Configuration
const path = require('path');

module.exports = {
    // Test environment configuration
    testEnvironment: 'node',
    
    // Root directory for tests
    rootDir: path.resolve(__dirname, '..'),
    
    // Test directories
    testMatch: [
        '<rootDir>/tests/**/*.test.js',
        '<rootDir>/tests/**/*.spec.js'
    ],
    
    // Setup files
    setupFilesAfterEnv: [
        '<rootDir>/tests/setup.js'
    ],
    
    // Coverage configuration
    collectCoverageFrom: [
        'backend/**/*.js',
        'frontend/js/**/*.js',
        '!backend/node_modules/**',
        '!backend/logs/**',
        '!backend/uploads/**',
        '!**/node_modules/**',
        '!**/*.config.js',
        '!**/coverage/**'
    ],
    
    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
    
    // Test timeout
    testTimeout: 30000,
    
    // Module name mapping for frontend assets
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/frontend/js/$1',
        '^@backend/(.*)$': '<rootDir>/backend/$1'
    },
    
    // Transform configuration
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    
    // Ignore patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/build/'
    ],
    
    // Global variables
    globals: {
        'process.env.NODE_ENV': 'test'
    },
    
    // Reporter configuration
    reporters: [
        'default',
        ['jest-html-reporter', {
            pageTitle: 'Cosmic DevSpace Test Report',
            outputPath: './tests/reports/test-report.html',
            includeFailureMsg: true,
            includeSuiteFailure: true
        }]
    ],
    
    // Verbose output
    verbose: true,
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Restore mocks after each test
    restoreMocks: true
};