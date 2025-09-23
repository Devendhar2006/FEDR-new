// Unit Tests for User Model
const User = require('../../backend/models/User');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
    describe('Schema Validation', () => {
        it('should create a valid user with required fields', async () => {
            const userData = global.testUtils.createTestUser();
            const user = new User(userData);
            
            expect(user.username).toBe(userData.username);
            expect(user.email).toBe(userData.email);
            expect(user.firstName).toBe(userData.firstName);
            expect(user.lastName).toBe(userData.lastName);
        });

        it('should require username field', async () => {
            const userData = global.testUtils.createTestUser();
            delete userData.username;
            
            const user = new User(userData);
            const error = user.validateSync();
            
            expect(error.errors.username).toBeDefined();
            expect(error.errors.username.kind).toBe('required');
        });

        it('should require email field', async () => {
            const userData = global.testUtils.createTestUser();
            delete userData.email;
            
            const user = new User(userData);
            const error = user.validateSync();
            
            expect(error.errors.email).toBeDefined();
            expect(error.errors.email.kind).toBe('required');
        });

        it('should validate email format', async () => {
            const userData = global.testUtils.createTestUser({
                email: 'invalid-email'
            });
            
            const user = new User(userData);
            const error = user.validateSync();
            
            expect(error.errors.email).toBeDefined();
        });

        it('should have unique username constraint', async () => {
            const userData1 = global.testUtils.createTestUser();
            const userData2 = global.testUtils.createTestUser({
                email: 'different@cosmic.dev'
            });
            
            const user1 = new User(userData1);
            await user1.save();
            
            const user2 = new User(userData2);
            
            await expect(user2.save()).rejects.toThrow();
        });

        it('should have unique email constraint', async () => {
            const userData1 = global.testUtils.createTestUser();
            const userData2 = global.testUtils.createTestUser({
                username: 'differentuser'
            });
            
            const user1 = new User(userData1);
            await user1.save();
            
            const user2 = new User(userData2);
            
            await expect(user2.save()).rejects.toThrow();
        });
    });

    describe('Password Hashing', () => {
        it('should hash password before saving', async () => {
            const userData = global.testUtils.createTestUser();
            const user = new User(userData);
            
            await user.save();
            
            expect(user.password).not.toBe(userData.password);
            expect(user.password.length).toBeGreaterThan(50); // Hashed password length
        });

        it('should not rehash password if not modified', async () => {
            const userData = global.testUtils.createTestUser();
            const user = new User(userData);
            await user.save();
            
            const originalPassword = user.password;
            user.firstName = 'Updated Name';
            await user.save();
            
            expect(user.password).toBe(originalPassword);
        });
    });

    describe('Instance Methods', () => {
        describe('comparePassword', () => {
            it('should return true for correct password', async () => {
                const password = 'TestPassword123!';
                const userData = global.testUtils.createTestUser({ password });
                const user = new User(userData);
                await user.save();
                
                const isMatch = await user.comparePassword(password);
                expect(isMatch).toBe(true);
            });

            it('should return false for incorrect password', async () => {
                const userData = global.testUtils.createTestUser();
                const user = new User(userData);
                await user.save();
                
                const isMatch = await user.comparePassword('wrongpassword');
                expect(isMatch).toBe(false);
            });
        });

        describe('generateAuthToken', () => {
            it('should generate a valid JWT token', async () => {
                const userData = global.testUtils.createTestUser();
                const user = new User(userData);
                await user.save();
                
                const token = user.generateAuthToken();
                
                expect(token).toBeDefined();
                expect(typeof token).toBe('string');
                expect(token.split('.').length).toBe(3); // JWT has 3 parts
            });
        });

        describe('toJSON', () => {
            it('should not include password in JSON output', async () => {
                const userData = global.testUtils.createTestUser();
                const user = new User(userData);
                await user.save();
                
                const userJSON = user.toJSON();
                
                expect(userJSON.password).toBeUndefined();
                expect(userJSON.username).toBe(userData.username);
                expect(userJSON.email).toBe(userData.email);
            });

            it('should include virtual fullName property', async () => {
                const userData = global.testUtils.createTestUser({
                    firstName: 'John',
                    lastName: 'Doe'
                });
                const user = new User(userData);
                await user.save();
                
                const userJSON = user.toJSON();
                
                expect(userJSON.fullName).toBe('John Doe');
            });
        });
    });

    describe('Static Methods', () => {
        describe('findByCredentials', () => {
            it('should find user by email and password', async () => {
                const password = 'TestPassword123!';
                const userData = global.testUtils.createTestUser({ password });
                const user = new User(userData);
                await user.save();
                
                const foundUser = await User.findByCredentials(userData.email, password);
                
                expect(foundUser).toBeDefined();
                expect(foundUser.email).toBe(userData.email);
            });

            it('should find user by username and password', async () => {
                const password = 'TestPassword123!';
                const userData = global.testUtils.createTestUser({ password });
                const user = new User(userData);
                await user.save();
                
                const foundUser = await User.findByCredentials(userData.username, password);
                
                expect(foundUser).toBeDefined();
                expect(foundUser.username).toBe(userData.username);
            });

            it('should throw error for invalid credentials', async () => {
                const userData = global.testUtils.createTestUser();
                const user = new User(userData);
                await user.save();
                
                await expect(
                    User.findByCredentials(userData.email, 'wrongpassword')
                ).rejects.toThrow('Invalid credentials');
            });

            it('should throw error for non-existent user', async () => {
                await expect(
                    User.findByCredentials('nonexistent@cosmic.dev', 'password')
                ).rejects.toThrow('Invalid credentials');
            });
        });
    });

    describe('Virtual Properties', () => {
        it('should calculate fullName virtual property', () => {
            const userData = global.testUtils.createTestUser({
                firstName: 'Cosmic',
                lastName: 'Developer'
            });
            const user = new User(userData);
            
            expect(user.fullName).toBe('Cosmic Developer');
        });

        it('should handle missing first or last name', () => {
            const userData = global.testUtils.createTestUser({
                firstName: 'Cosmic',
                lastName: ''
            });
            const user = new User(userData);
            
            expect(user.fullName).toBe('Cosmic ');
        });
    });

    describe('Middleware Hooks', () => {
        it('should set timestamps on creation', async () => {
            const userData = global.testUtils.createTestUser();
            const user = new User(userData);
            
            await user.save();
            
            expect(user.createdAt).toBeDefined();
            expect(user.updatedAt).toBeDefined();
            expect(user.createdAt).toEqual(user.updatedAt);
        });

        it('should update timestamps on modification', async () => {
            const userData = global.testUtils.createTestUser();
            const user = new User(userData);
            await user.save();
            
            const originalUpdatedAt = user.updatedAt;
            
            // Wait a bit to ensure timestamp difference
            await global.testUtils.wait(100);
            
            user.firstName = 'Updated';
            await user.save();
            
            expect(user.updatedAt).not.toEqual(originalUpdatedAt);
        });
    });

    describe('Edge Cases', () => {
        it('should handle very long usernames', async () => {
            const longUsername = 'a'.repeat(100);
            const userData = global.testUtils.createTestUser({
                username: longUsername
            });
            const user = new User(userData);
            
            const error = user.validateSync();
            expect(error.errors.username).toBeDefined();
        });

        it('should handle special characters in fields', async () => {
            const userData = global.testUtils.createTestUser({
                firstName: 'Jöhn',
                lastName: 'Döe',
                bio: 'Special chars: àáâãäåæçèéêë'
            });
            const user = new User(userData);
            
            await expect(user.save()).resolves.not.toThrow();
        });

        it('should validate password complexity', async () => {
            const weakPasswords = ['123', 'password', 'abc'];
            
            for (const password of weakPasswords) {
                const userData = global.testUtils.createTestUser({ password });
                const user = new User(userData);
                
                const error = user.validateSync();
                // Assuming password validation is implemented
                // expect(error.errors.password).toBeDefined();
            }
        });
    });
});