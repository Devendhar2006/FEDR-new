#!/usr/bin/env node

/**
 * Comprehensive Test Runner and Validation Script
 * This script runs all tests, validates the application, and prepares for deployment
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class CosmicTestRunner {
    constructor() {
        this.results = {
            unit: { passed: 0, failed: 0, skipped: 0 },
            integration: { passed: 0, failed: 0, skipped: 0 },
            e2e: { passed: 0, failed: 0, skipped: 0 },
            performance: { passed: 0, failed: 0, skipped: 0 },
            security: { passed: 0, failed: 0, skipped: 0 }
        };
        this.startTime = Date.now();
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const colors = {
            info: chalk.blue,
            success: chalk.green,
            warning: chalk.yellow,
            error: chalk.red,
            title: chalk.magenta.bold
        };
        
        console.log(`[${timestamp}] ${colors[level](message)}`);
    }

    async runCommand(command, options = {}) {
        return new Promise((resolve, reject) => {
            this.log(`Running: ${command}`, 'info');
            
            const child = spawn('npm', ['run', command], {
                stdio: 'pipe',
                shell: true,
                ...options
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
                if (options.verbose) {
                    process.stdout.write(data);
                }
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
                if (options.verbose) {
                    process.stderr.write(data);
                }
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr, code });
                } else {
                    reject({ stdout, stderr, code });
                }
            });
        });
    }

    parseJestOutput(output) {
        const lines = output.split('\n');
        const results = { passed: 0, failed: 0, skipped: 0 };
        
        for (const line of lines) {
            if (line.includes('Tests:')) {
                const match = line.match(/(\d+) passed(?:, (\d+) failed)?(?:, (\d+) skipped)?/);
                if (match) {
                    results.passed = parseInt(match[1]) || 0;
                    results.failed = parseInt(match[2]) || 0;
                    results.skipped = parseInt(match[3]) || 0;
                }
            }
        }
        
        return results;
    }

    async runUnitTests() {
        this.log('🧪 Running Unit Tests', 'title');
        
        try {
            const result = await this.runCommand('test:unit');
            this.results.unit = this.parseJestOutput(result.stdout);
            this.log(`Unit Tests: ${this.results.unit.passed} passed, ${this.results.unit.failed} failed`, 'success');
            return true;
        } catch (error) {
            this.results.unit = this.parseJestOutput(error.stdout);
            this.log(`Unit Tests Failed: ${this.results.unit.failed} failed`, 'error');
            return false;
        }
    }

    async runIntegrationTests() {
        this.log('🔗 Running Integration Tests', 'title');
        
        try {
            const result = await this.runCommand('test:integration');
            this.results.integration = this.parseJestOutput(result.stdout);
            this.log(`Integration Tests: ${this.results.integration.passed} passed, ${this.results.integration.failed} failed`, 'success');
            return true;
        } catch (error) {
            this.results.integration = this.parseJestOutput(error.stdout);
            this.log(`Integration Tests Failed: ${this.results.integration.failed} failed`, 'error');
            return false;
        }
    }

    async runE2ETests() {
        this.log('🎭 Running End-to-End Tests', 'title');
        
        try {
            // Start the application server
            this.log('Starting application server for E2E tests...', 'info');
            const serverProcess = spawn('npm', ['start'], { detached: true });
            
            // Wait for server to start
            await this.waitForServer('http://localhost:3000');
            
            const result = await this.runCommand('test:e2e');
            this.results.e2e = this.parseJestOutput(result.stdout);
            
            // Kill server process
            process.kill(-serverProcess.pid);
            
            this.log(`E2E Tests: ${this.results.e2e.passed} passed, ${this.results.e2e.failed} failed`, 'success');
            return true;
        } catch (error) {
            this.results.e2e = this.parseJestOutput(error.stdout);
            this.log(`E2E Tests Failed: ${this.results.e2e.failed} failed`, 'error');
            return false;
        }
    }

    async runPerformanceTests() {
        this.log('⚡ Running Performance Tests', 'title');
        
        try {
            const result = await this.runCommand('test:performance');
            this.results.performance = this.parseJestOutput(result.stdout);
            this.log(`Performance Tests: ${this.results.performance.passed} passed, ${this.results.performance.failed} failed`, 'success');
            return true;
        } catch (error) {
            this.results.performance = this.parseJestOutput(error.stdout);
            this.log(`Performance Tests Failed: ${this.results.performance.failed} failed`, 'error');
            return false;
        }
    }

    async runSecurityTests() {
        this.log('🔒 Running Security Tests', 'title');
        
        try {
            const result = await this.runCommand('test:security');
            this.results.security = this.parseJestOutput(result.stdout);
            this.log(`Security Tests: ${this.results.security.passed} passed, ${this.results.security.failed} failed`, 'success');
            return true;
        } catch (error) {
            this.results.security = this.parseJestOutput(error.stdout);
            this.log(`Security Tests Failed: ${this.results.security.failed} failed`, 'error');
            return false;
        }
    }

    async waitForServer(url, timeout = 30000) {
        const start = Date.now();
        
        while (Date.now() - start < timeout) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    this.log('Server is ready', 'success');
                    return true;
                }
            } catch (error) {
                // Server not ready yet
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error(`Server did not start within ${timeout}ms`);
    }

    async validateEnvironment() {
        this.log('🔍 Validating Environment', 'title');
        
        const checks = [
            {
                name: 'Node.js Version',
                check: () => {
                    const version = process.version;
                    const major = parseInt(version.slice(1).split('.')[0]);
                    return major >= 16;
                },
                message: 'Node.js 16+ required'
            },
            {
                name: 'Package.json exists',
                check: () => fs.existsSync('package.json'),
                message: 'package.json not found'
            },
            {
                name: 'Environment variables',
                check: () => {
                    const required = ['NODE_ENV', 'JWT_SECRET', 'MONGODB_URI'];
                    return required.every(env => process.env[env]);
                },
                message: 'Missing required environment variables'
            },
            {
                name: 'Test directories',
                check: () => {
                    const dirs = ['tests/unit', 'tests/integration', 'tests/e2e'];
                    return dirs.every(dir => fs.existsSync(dir));
                },
                message: 'Test directories not found'
            }
        ];

        let allPassed = true;
        for (const check of checks) {
            const passed = check.check();
            if (passed) {
                this.log(`✅ ${check.name}`, 'success');
            } else {
                this.log(`❌ ${check.name}: ${check.message}`, 'error');
                allPassed = false;
            }
        }

        return allPassed;
    }

    async generateCoverageReport() {
        this.log('📊 Generating Coverage Report', 'title');
        
        try {
            await this.runCommand('test:coverage');
            this.log('Coverage report generated in coverage/ directory', 'success');
            return true;
        } catch (error) {
            this.log('Failed to generate coverage report', 'error');
            return false;
        }
    }

    async validateDeploymentReadiness() {
        this.log('🚀 Validating Deployment Readiness', 'title');
        
        const checks = [
            {
                name: 'Production build',
                check: async () => {
                    try {
                        await this.runCommand('build');
                        return true;
                    } catch {
                        return false;
                    }
                }
            },
            {
                name: 'Docker configuration',
                check: () => fs.existsSync('Dockerfile') && fs.existsSync('docker-compose.yml')
            },
            {
                name: 'Environment configuration',
                check: () => fs.existsSync('.env.example') && fs.existsSync('docker-compose.prod.yml')
            },
            {
                name: 'Security headers',
                check: () => fs.existsSync('nginx/nginx.conf')
            },
            {
                name: 'Health check endpoint',
                check: () => fs.existsSync('backend/scripts/healthcheck.js')
            }
        ];

        let allPassed = true;
        for (const check of checks) {
            const passed = await check.check();
            if (passed) {
                this.log(`✅ ${check.name}`, 'success');
            } else {
                this.log(`❌ ${check.name}`, 'error');
                allPassed = false;
            }
        }

        return allPassed;
    }

    generateTestReport() {
        const totalPassed = Object.values(this.results).reduce((sum, result) => sum + result.passed, 0);
        const totalFailed = Object.values(this.results).reduce((sum, result) => sum + result.failed, 0);
        const totalSkipped = Object.values(this.results).reduce((sum, result) => sum + result.skipped, 0);
        const totalTests = totalPassed + totalFailed + totalSkipped;
        const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : 0;
        const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

        const report = {
            summary: {
                total: totalTests,
                passed: totalPassed,
                failed: totalFailed,
                skipped: totalSkipped,
                successRate: `${successRate}%`,
                duration: `${duration}s`
            },
            details: this.results,
            timestamp: new Date().toISOString()
        };

        // Write report to file
        fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
        
        return report;
    }

    printSummary(report) {
        this.log('\n' + '='.repeat(50), 'title');
        this.log('🎯 COSMIC DEVSPACE TEST SUMMARY', 'title');
        this.log('='.repeat(50), 'title');
        
        this.log(`\n📊 Overall Results:`, 'info');
        this.log(`   Total Tests: ${report.summary.total}`, 'info');
        this.log(`   Passed: ${report.summary.passed}`, 'success');
        this.log(`   Failed: ${report.summary.failed}`, report.summary.failed > 0 ? 'error' : 'info');
        this.log(`   Skipped: ${report.summary.skipped}`, 'warning');
        this.log(`   Success Rate: ${report.summary.successRate}`, 'info');
        this.log(`   Duration: ${report.summary.duration}`, 'info');

        this.log(`\n📋 Test Categories:`, 'info');
        for (const [category, results] of Object.entries(report.details)) {
            const status = results.failed === 0 ? '✅' : '❌';
            this.log(`   ${status} ${category}: ${results.passed}/${results.passed + results.failed} passed`, 
                     results.failed === 0 ? 'success' : 'error');
        }

        if (report.summary.failed === 0) {
            this.log('\n🎉 All tests passed! Application is ready for deployment.', 'success');
            this.log('🚀 Run "npm run deploy" to deploy to production.', 'info');
        } else {
            this.log('\n⚠️  Some tests failed. Please fix issues before deployment.', 'warning');
            this.log('📝 Check test-report.json for detailed results.', 'info');
        }
        
        this.log('='.repeat(50) + '\n', 'title');
    }

    async run() {
        this.log('🌟 Starting Cosmic DevSpace Test Suite', 'title');
        this.log('🚀 Validating complete application...', 'info');

        // Environment validation
        const envValid = await this.validateEnvironment();
        if (!envValid) {
            this.log('Environment validation failed. Aborting tests.', 'error');
            process.exit(1);
        }

        // Run all test suites
        const testSuites = [
            { name: 'Unit Tests', runner: () => this.runUnitTests() },
            { name: 'Integration Tests', runner: () => this.runIntegrationTests() },
            { name: 'Performance Tests', runner: () => this.runPerformanceTests() },
            { name: 'Security Tests', runner: () => this.runSecurityTests() }
        ];

        // Skip E2E tests in CI unless explicitly enabled
        if (!process.env.CI || process.env.RUN_E2E_TESTS) {
            testSuites.push({ name: 'E2E Tests', runner: () => this.runE2ETests() });
        }

        let allTestsPassed = true;
        for (const suite of testSuites) {
            const passed = await suite.runner();
            if (!passed) {
                allTestsPassed = false;
            }
            this.log(''); // Add spacing between test suites
        }

        // Generate coverage report
        await this.generateCoverageReport();

        // Validate deployment readiness
        const deploymentReady = await this.validateDeploymentReadiness();

        // Generate and display final report
        const report = this.generateTestReport();
        this.printSummary(report);

        // Exit with appropriate code
        const finalSuccess = allTestsPassed && deploymentReady && report.summary.failed === 0;
        process.exit(finalSuccess ? 0 : 1);
    }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
    const runner = new CosmicTestRunner();
    runner.run().catch(error => {
        console.error(chalk.red('Test runner failed:'), error);
        process.exit(1);
    });
}

module.exports = CosmicTestRunner;