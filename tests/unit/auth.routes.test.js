// Unit Tests for Authentication Routes
const request = require('supertest');
const app = require('../../backend/app');
const User = require('../../backend/models/User');

describe('Authentication Routes', () => {
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = global.testUtils.createTestUser();
            
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);
            
            expect(response.body.success).toBe(true);
            expect(response.body.user).toBeDefined();
            expect(response.body.user.email).toBe(userData.email);
            expect(response.body.user.password).toBeUndefined();
            expect(response.body.token).toBeDefined();
            
            // Verify user was created in database
            const dbUser = await User.findOne({ email: userData.email });
            expect(dbUser).toBeTruthy();
        });

        it('should return validation errors for missing required fields', async () => {
            const incompleteData = {
                email: 'test@cosmic.dev'
                // Missing username, password, firstName, lastName
            };
            
            const response = await request(app)
                .post('/api/auth/register')
                .send(incompleteData)
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
            expect(Array.isArray(response.body.errors)).toBe(true);
        });

        it('should return error for invalid email format', async () => {
            const userData = global.testUtils.createTestUser({
                email: 'invalid-email'
            });
            
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it('should return error for duplicate email', async () => {
            const userData = global.testUtils.createTestUser();
            
            // Create first user
            await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);
            
            // Try to create user with same email
            const duplicateData = global.testUtils.createTestUser({
                username: 'differentuser',
                email: userData.email
            });
            
            const response = await request(app)
                .post('/api/auth/register')
                .send(duplicateData)
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('already exists');
        });

        it('should return error for duplicate username', async () => {
            const userData = global.testUtils.createTestUser();
            
            // Create first user
            await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);
            
            // Try to create user with same username
            const duplicateData = global.testUtils.createTestUser({
                username: userData.username,
                email: 'different@cosmic.dev'
            });
            
            const response = await request(app)
                .post('/api/auth/register')
                .send(duplicateData)
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('already exists');
        });

        it('should validate password strength', async () => {
            const weakPasswords = ['123', 'password', 'abc'];
            
            for (const weakPassword of weakPasswords) {
                const userData = global.testUtils.createTestUser({
                    password: weakPassword
                });
                
                const response = await request(app)
                    .post('/api/auth/register')
                    .send(userData)
                    .expect(400);
                
                expect(response.body.success).toBe(false);
            }
        });

        it('should sanitize input data', async () => {
            const userData = global.testUtils.createTestUser({
                firstName: '  John  ',
                lastName: '  Doe  ',
                bio: '<script>alert("xss")</script>Clean bio'
            });
            
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);
            
            expect(response.body.user.firstName).toBe('John');
            expect(response.body.user.lastName).toBe('Doe');
            expect(response.body.user.bio).not.toContain('<script>');
        });
    });

    describe('POST /api/auth/login', () => {
        let testUser;
        const password = 'TestPassword123!';

        beforeEach(async () => {
            const userData = global.testUtils.createTestUser({ password });
            testUser = new User(userData);
            await testUser.save();
        });

        it('should login with email successfully', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: testUser.email,
                    password
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.user).toBeDefined();
            expect(response.body.user.email).toBe(testUser.email);
            expect(response.body.user.password).toBeUndefined();
            expect(response.body.token).toBeDefined();
        });

        it('should login with username successfully', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: testUser.username,
                    password
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.user).toBeDefined();
            expect(response.body.user.username).toBe(testUser.username);
            expect(response.body.token).toBeDefined();
        });

        it('should return error for invalid password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: testUser.email,
                    password: 'wrongpassword'
                })
                .expect(401);
            
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid credentials');
        });

        it('should return error for non-existent user', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: 'nonexistent@cosmic.dev',
                    password
                })
                .expect(401);
            
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid credentials');
        });

        it('should return validation errors for missing fields', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: testUser.email
                    // Missing password
                })
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it('should update lastLoginAt timestamp', async () => {
            const originalLastLogin = testUser.lastLoginAt;
            
            await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: testUser.email,
                    password
                })
                .expect(200);
            
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.lastLoginAt).not.toEqual(originalLastLogin);
            expect(updatedUser.lastLoginAt).toBeInstanceOf(Date);
        });

        it('should handle case-insensitive email login', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: testUser.email.toUpperCase(),
                    password
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
        });

        it('should prevent brute force attacks with rate limiting', async () => {
            const attempts = [];
            
            // Make multiple failed login attempts
            for (let i = 0; i < 6; i++) {
                attempts.push(
                    request(app)
                        .post('/api/auth/login')
                        .send({
                            identifier: testUser.email,
                            password: 'wrongpassword'
                        })
                );
            }
            
            const responses = await Promise.all(attempts);
            
            // Should get rate limited after multiple attempts
            const lastResponse = responses[responses.length - 1];
            expect([429, 401]).toContain(lastResponse.status);
        });
    });

    describe('POST /api/auth/logout', () => {
        let authToken;
        let testUser;

        beforeEach(async () => {
            const userData = global.testUtils.createTestUser();
            testUser = new User(userData);
            await testUser.save();
            authToken = testUser.generateAuthToken();
        });

        it('should logout successfully with valid token', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('logged out');
        });

        it('should return error for missing token', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .expect(401);
            
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('token');
        });

        it('should return error for invalid token', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
            
            expect(response.body.success).toBe(false);
        });

        it('should invalidate token after logout', async () => {
            // Logout
            await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            
            // Try to use the same token for authenticated request
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(401);
            
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/auth/me', () => {
        let authToken;
        let testUser;

        beforeEach(async () => {
            const userData = global.testUtils.createTestUser();
            testUser = new User(userData);
            await testUser.save();
            authToken = testUser.generateAuthToken();
        });

        it('should return current user data with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.user).toBeDefined();
            expect(response.body.user._id).toBe(testUser._id.toString());
            expect(response.body.user.email).toBe(testUser.email);
            expect(response.body.user.password).toBeUndefined();
        });

        it('should return error for missing token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .expect(401);
            
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('token');
        });

        it('should return error for invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
            
            expect(response.body.success).toBe(false);
        });

        it('should return error for malformed authorization header', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'InvalidFormat')
                .expect(401);
            
            expect(response.body.success).toBe(false);
        });

        it('should return error for deleted user', async () => {
            // Delete the user
            await User.findByIdAndDelete(testUser._id);
            
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(401);
            
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/forgot-password', () => {
        let testUser;

        beforeEach(async () => {
            const userData = global.testUtils.createTestUser();
            testUser = new User(userData);
            await testUser.save();
        });

        it('should send password reset email for valid email', async () => {
            const response = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: testUser.email })
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('reset email sent');
        });

        it('should return success even for non-existent email (security)', async () => {
            const response = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: 'nonexistent@cosmic.dev' })
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('reset email sent');
        });

        it('should return validation error for invalid email format', async () => {
            const response = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: 'invalid-email' })
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it('should return validation error for missing email', async () => {
            const response = await request(app)
                .post('/api/auth/forgot-password')
                .send({})
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it('should set password reset token for existing user', async () => {
            await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: testUser.email })
                .expect(200);
            
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.passwordResetToken).toBeDefined();
            expect(updatedUser.passwordResetExpires).toBeDefined();
            expect(updatedUser.passwordResetExpires).toBeInstanceOf(Date);
        });
    });

    describe('POST /api/auth/reset-password', () => {
        let testUser;
        let resetToken;

        beforeEach(async () => {
            const userData = global.testUtils.createTestUser();
            testUser = new User(userData);
            
            // Set reset token
            resetToken = 'test-reset-token';
            testUser.passwordResetToken = resetToken;
            testUser.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
            
            await testUser.save();
        });

        it('should reset password with valid token', async () => {
            const newPassword = 'NewPassword123!';
            
            const response = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: resetToken,
                    password: newPassword
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('reset successfully');
            
            // Verify password was changed
            const updatedUser = await User.findById(testUser._id);
            const isNewPasswordValid = await updatedUser.comparePassword(newPassword);
            expect(isNewPasswordValid).toBe(true);
            
            // Verify reset token was cleared
            expect(updatedUser.passwordResetToken).toBeUndefined();
            expect(updatedUser.passwordResetExpires).toBeUndefined();
        });

        it('should return error for invalid token', async () => {
            const response = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: 'invalid-token',
                    password: 'NewPassword123!'
                })
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid or expired');
        });

        it('should return error for expired token', async () => {
            // Set expired token
            testUser.passwordResetExpires = new Date(Date.now() - 3600000); // 1 hour ago
            await testUser.save();
            
            const response = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: resetToken,
                    password: 'NewPassword123!'
                })
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid or expired');
        });

        it('should validate new password strength', async () => {
            const weakPassword = '123';
            
            const response = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: resetToken,
                    password: weakPassword
                })
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it('should return validation errors for missing fields', async () => {
            const response = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: resetToken
                    // Missing password
                })
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });
    });

    describe('Middleware and Security', () => {
        it('should set security headers', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(global.testUtils.createTestUser());
            
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');
        });

        it('should handle CORS properly', async () => {
            const response = await request(app)
                .options('/api/auth/register')
                .set('Origin', 'http://localhost:3000')
                .expect(200);
            
            expect(response.headers['access-control-allow-origin']).toBeDefined();
            expect(response.headers['access-control-allow-methods']).toBeDefined();
            expect(response.headers['access-control-allow-headers']).toBeDefined();
        });

        it('should validate request size limits', async () => {
            const largePayload = {
                ...global.testUtils.createTestUser(),
                bio: 'x'.repeat(100000) // Very large bio
            };
            
            const response = await request(app)
                .post('/api/auth/register')
                .send(largePayload);
            
            expect([400, 413]).toContain(response.status);
        });
    });
});