// Performance and Security Tests
const request = require('supertest');
const app = require('../../backend/app');
const User = require('../../backend/models/User');
const Project = require('../../backend/models/Project');

describe('Performance Tests', () => {
    describe('API Response Times', () => {
        let authToken;
        
        beforeEach(async () => {
            const userData = global.testUtils.createTestUser();
            const user = new User(userData);
            await user.save();
            authToken = user.generateAuthToken();
        });

        it('should respond to auth requests within acceptable time', async () => {
            const startTime = Date.now();
            
            await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(100); // Should respond within 100ms
        });

        it('should handle project listing efficiently', async () => {
            // Create multiple projects
            const projects = [];
            for (let i = 0; i < 20; i++) {
                const projectData = global.testUtils.createTestProject({
                    title: `Test Project ${i}`,
                    owner: authToken.split('.')[1] // Extract user ID from token
                });
                const project = new Project(projectData);
                projects.push(project.save());
            }
            
            await Promise.all(projects);
            
            const startTime = Date.now();
            
            const response = await request(app)
                .get('/api/projects/my-projects')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(200); // Should respond within 200ms
            expect(response.body.projects.length).toBe(20);
        });

        it('should handle search queries efficiently', async () => {
            const startTime = Date.now();
            
            await request(app)
                .get('/api/projects/search?q=test&limit=10')
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(300); // Search should be fast
        });

        it('should handle concurrent requests without degradation', async () => {
            const requests = [];
            const numRequests = 10;
            
            const startTime = Date.now();
            
            for (let i = 0; i < numRequests; i++) {
                requests.push(
                    request(app)
                        .get('/api/auth/me')
                        .set('Authorization', `Bearer ${authToken}`)
                );
            }
            
            const responses = await Promise.all(requests);
            const totalTime = Date.now() - startTime;
            
            // All requests should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
            
            // Average response time should be reasonable
            const avgResponseTime = totalTime / numRequests;
            expect(avgResponseTime).toBeLessThan(150);
        });
    });

    describe('Memory Usage', () => {
        it('should not leak memory during project operations', async () => {
            const userData = global.testUtils.createTestUser();
            const user = new User(userData);
            await user.save();
            const authToken = user.generateAuthToken();
            
            const initialMemory = process.memoryUsage().heapUsed;
            
            // Perform multiple operations
            for (let i = 0; i < 50; i++) {
                const projectData = global.testUtils.createTestProject();
                
                const createResponse = await request(app)
                    .post('/api/projects')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(projectData);
                
                const projectId = createResponse.body.project._id;
                
                await request(app)
                    .get(`/api/projects/${projectId}`)
                    .set('Authorization', `Bearer ${authToken}`);
                
                await request(app)
                    .delete(`/api/projects/${projectId}`)
                    .set('Authorization', `Bearer ${authToken}`);
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            // Memory increase should be minimal (less than 10MB)
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
        });

        it('should handle large datasets efficiently', async () => {
            const userData = global.testUtils.createTestUser();
            const user = new User(userData);
            await user.save();
            const authToken = user.generateAuthToken();
            
            // Create a large number of projects
            const projects = [];
            for (let i = 0; i < 100; i++) {
                const projectData = global.testUtils.createTestProject({
                    title: `Large Dataset Project ${i}`,
                    description: 'A'.repeat(1000) // Large description
                });
                
                projects.push(
                    request(app)
                        .post('/api/projects')
                        .set('Authorization', `Bearer ${authToken}`)
                        .send(projectData)
                );
            }
            
            const responses = await Promise.all(projects);
            
            // All projects should be created successfully
            responses.forEach(response => {
                expect(response.status).toBe(201);
            });
            
            // Querying all projects should still be fast
            const startTime = Date.now();
            const listResponse = await request(app)
                .get('/api/projects/my-projects?limit=100')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            
            const queryTime = Date.now() - startTime;
            expect(queryTime).toBeLessThan(500);
            expect(listResponse.body.projects.length).toBe(100);
        });
    });

    describe('Database Performance', () => {
        it('should use efficient queries for project searches', async () => {
            // This test would require database query monitoring
            // For now, we'll test response times and verify pagination
            
            const userData = global.testUtils.createTestUser();
            const user = new User(userData);
            await user.save();
            const authToken = user.generateAuthToken();
            
            // Create projects with searchable content
            const searchableProjects = [
                { title: 'React Application', technologies: ['React', 'JavaScript'] },
                { title: 'Node.js API Server', technologies: ['Node.js', 'Express'] },
                { title: 'Vue.js Dashboard', technologies: ['Vue.js', 'TypeScript'] }
            ];
            
            for (const projectData of searchableProjects) {
                const fullProjectData = global.testUtils.createTestProject(projectData);
                await request(app)
                    .post('/api/projects')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(fullProjectData);
            }
            
            // Test search performance
            const startTime = Date.now();
            const searchResponse = await request(app)
                .get('/api/projects/search?q=React&limit=10&offset=0')
                .expect(200);
            
            const searchTime = Date.now() - startTime;
            expect(searchTime).toBeLessThan(200);
            expect(searchResponse.body.projects.length).toBeGreaterThan(0);
        });

        it('should handle pagination efficiently', async () => {
            const userData = global.testUtils.createTestUser();
            const user = new User(userData);
            await user.save();
            const authToken = user.generateAuthToken();
            
            // Create many projects
            const projects = [];
            for (let i = 0; i < 50; i++) {
                projects.push(
                    Project.create(global.testUtils.createTestProject({
                        title: `Pagination Test Project ${i}`,
                        owner: user._id
                    }))
                );
            }
            
            await Promise.all(projects);
            
            // Test first page
            const page1Response = await request(app)
                .get('/api/projects/my-projects?limit=10&offset=0')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            
            expect(page1Response.body.projects.length).toBe(10);
            
            // Test second page
            const page2Response = await request(app)
                .get('/api/projects/my-projects?limit=10&offset=10')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            
            expect(page2Response.body.projects.length).toBe(10);
            
            // Verify different projects on different pages
            const page1Ids = page1Response.body.projects.map(p => p._id);
            const page2Ids = page2Response.body.projects.map(p => p._id);
            
            const intersection = page1Ids.filter(id => page2Ids.includes(id));
            expect(intersection.length).toBe(0); // No duplicates
        });
    });
});

describe('Security Tests', () => {
    describe('Authentication Security', () => {
        it('should hash passwords securely', async () => {
            const userData = global.testUtils.createTestUser();
            const user = new User(userData);
            await user.save();
            
            // Password should be hashed
            expect(user.password).not.toBe(userData.password);
            expect(user.password.length).toBeGreaterThan(50);
            expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt format
        });

        it('should generate secure JWT tokens', async () => {
            const userData = global.testUtils.createTestUser();
            const user = new User(userData);
            await user.save();
            
            const token = user.generateAuthToken();
            
            // Token should be properly formatted
            expect(token.split('.').length).toBe(3);
            
            // Should contain user ID
            const payload = JSON.parse(
                Buffer.from(token.split('.')[1], 'base64').toString()
            );
            expect(payload.userId).toBe(user._id.toString());
            expect(payload.exp).toBeDefined(); // Should have expiration
        });

        it('should reject expired tokens', async () => {
            const userData = global.testUtils.createTestUser();
            const user = new User(userData);
            await user.save();
            
            // Create an expired token
            const jwt = require('jsonwebtoken');
            const expiredToken = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '-1h' } // Expired 1 hour ago
            );
            
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(401);
            
            expect(response.body.success).toBe(false);
        });

        it('should reject invalid tokens', async () => {
            const invalidTokens = [
                'invalid.token.format',
                'Bearer ',
                'not-a-token',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
            ];
            
            for (const token of invalidTokens) {
                const response = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(401);
                
                expect(response.body.success).toBe(false);
            }
        });
    });

    describe('Input Validation and Sanitization', () => {
        it('should prevent SQL injection attempts', async () => {
            const maliciousInputs = [
                "'; DROP TABLE users; --",
                "1' OR '1'='1",
                "admin'/*",
                "' UNION SELECT * FROM users --"
            ];
            
            for (const maliciousInput of maliciousInputs) {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        identifier: maliciousInput,
                        password: 'password'
                    });
                
                // Should either return validation error or invalid credentials
                expect([400, 401]).toContain(response.status);
                expect(response.body.success).toBe(false);
            }
        });

        it('should prevent NoSQL injection attempts', async () => {
            const maliciousInputs = [
                { $ne: null },
                { $gt: "" },
                { $regex: ".*" },
                { $where: "function() { return true; }" }
            ];
            
            for (const maliciousInput of maliciousInputs) {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        identifier: maliciousInput,
                        password: 'password'
                    });
                
                expect([400, 401]).toContain(response.status);
                expect(response.body.success).toBe(false);
            }
        });

        it('should sanitize XSS attempts in user input', async () => {
            const xssPayloads = [
                '<script>alert("xss")</script>',
                'javascript:alert("xss")',
                '<img src="x" onerror="alert(1)">',
                '"><script>alert(String.fromCharCode(88,83,83))</script>'
            ];
            
            for (const xssPayload of xssPayloads) {
                const userData = global.testUtils.createTestUser({
                    firstName: xssPayload,
                    bio: xssPayload
                });
                
                const response = await request(app)
                    .post('/api/auth/register')
                    .send(userData);
                
                if (response.status === 201) {
                    // If registration succeeds, input should be sanitized
                    expect(response.body.user.firstName).not.toContain('<script>');
                    expect(response.body.user.bio).not.toContain('<script>');
                } else {
                    // Or validation should reject it
                    expect(response.status).toBe(400);
                }
            }
        });

        it('should validate input length limits', async () => {
            const userData = global.testUtils.createTestUser({
                firstName: 'A'.repeat(1000), // Very long name
                bio: 'B'.repeat(10000) // Very long bio
            });
            
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);
            
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });
    });

    describe('Authorization and Access Control', () => {
        let user1, user2, authToken1, authToken2;
        
        beforeEach(async () => {
            const userData1 = global.testUtils.createTestUser();
            const userData2 = global.testUtils.createTestUser({
                username: 'user2',
                email: 'user2@cosmic.dev'
            });
            
            user1 = new User(userData1);
            user2 = new User(userData2);
            
            await user1.save();
            await user2.save();
            
            authToken1 = user1.generateAuthToken();
            authToken2 = user2.generateAuthToken();
        });

        it('should prevent unauthorized project access', async () => {
            // Create project as user1
            const projectData = global.testUtils.createTestProject();
            const createResponse = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken1}`)
                .send(projectData)
                .expect(201);
            
            const projectId = createResponse.body.project._id;
            
            // User2 should not be able to access user1's private project
            const response = await request(app)
                .get(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${authToken2}`)
                .expect(403);
            
            expect(response.body.success).toBe(false);
        });

        it('should prevent unauthorized project modification', async () => {
            // Create project as user1
            const projectData = global.testUtils.createTestProject();
            const createResponse = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken1}`)
                .send(projectData)
                .expect(201);
            
            const projectId = createResponse.body.project._id;
            
            // User2 should not be able to modify user1's project
            const response = await request(app)
                .put(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${authToken2}`)
                .send({ title: 'Modified by unauthorized user' })
                .expect(403);
            
            expect(response.body.success).toBe(false);
        });

        it('should prevent privilege escalation', async () => {
            // User should not be able to modify their own permissions
            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${authToken1}`)
                .send({
                    role: 'admin',
                    permissions: ['all']
                })
                .expect(400);
            
            expect(response.body.success).toBe(false);
        });

        it('should validate resource ownership', async () => {
            // Try to access another user's profile
            const response = await request(app)
                .get(`/api/users/${user2._id}`)
                .set('Authorization', `Bearer ${authToken1}`)
                .expect(403);
            
            expect(response.body.success).toBe(false);
        });
    });

    describe('Rate Limiting and DoS Protection', () => {
        it('should implement rate limiting on authentication endpoints', async () => {
            const requests = [];
            
            // Make many rapid requests
            for (let i = 0; i < 20; i++) {
                requests.push(
                    request(app)
                        .post('/api/auth/login')
                        .send({
                            identifier: 'test@cosmic.dev',
                            password: 'wrongpassword'
                        })
                );
            }
            
            const responses = await Promise.all(requests);
            
            // Some requests should be rate limited
            const rateLimitedResponses = responses.filter(r => r.status === 429);
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });

        it('should protect against large payload attacks', async () => {
            const largePayload = {
                title: 'A'.repeat(100000),
                description: 'B'.repeat(100000),
                bio: 'C'.repeat(100000)
            };
            
            const response = await request(app)
                .post('/api/auth/register')
                .send(largePayload);
            
            // Should reject large payloads
            expect([400, 413]).toContain(response.status);
        });

        it('should limit concurrent connections per IP', async () => {
            const userData = global.testUtils.createTestUser();
            const user = new User(userData);
            await user.save();
            const authToken = user.generateAuthToken();
            
            // Make many concurrent requests
            const concurrentRequests = [];
            for (let i = 0; i < 50; i++) {
                concurrentRequests.push(
                    request(app)
                        .get('/api/auth/me')
                        .set('Authorization', `Bearer ${authToken}`)
                );
            }
            
            const responses = await Promise.all(concurrentRequests);
            
            // Most should succeed, but some might be limited
            const successfulResponses = responses.filter(r => r.status === 200);
            const limitedResponses = responses.filter(r => r.status === 429);
            
            expect(successfulResponses.length).toBeGreaterThan(40);
            // Some rate limiting is acceptable for protection
        });
    });

    describe('Data Privacy and Security Headers', () => {
        it('should set proper security headers', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .expect(401); // No auth header
            
            // Check security headers
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');
            expect(response.headers['strict-transport-security']).toBeDefined();
        });

        it('should not expose sensitive information in errors', async () => {
            const response = await request(app)
                .get('/api/projects/invalid-id')
                .expect(400);
            
            // Error should not contain stack traces or internal details
            expect(response.body.error).not.toContain('Error:');
            expect(response.body.error).not.toContain('at ');
            expect(response.body.error).not.toContain(__dirname);
        });

        it('should handle CORS properly', async () => {
            const response = await request(app)
                .options('/api/auth/login')
                .set('Origin', 'http://localhost:3000')
                .expect(200);
            
            expect(response.headers['access-control-allow-origin']).toBeDefined();
            expect(response.headers['access-control-allow-methods']).toBeDefined();
            expect(response.headers['access-control-allow-headers']).toBeDefined();
            expect(response.headers['access-control-allow-credentials']).toBe('true');
        });

        it('should validate file upload security', async () => {
            const userData = global.testUtils.createTestUser();
            const user = new User(userData);
            await user.save();
            const authToken = user.generateAuthToken();
            
            // Test malicious file types
            const response = await request(app)
                .post('/api/users/avatar')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('avatar', Buffer.from('fake-script-content'), 'malicious.php')
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid file type');
        });
    });
});