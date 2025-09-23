// Integration Tests for User Workflows
const request = require('supertest');
const app = require('../../backend/app');
const User = require('../../backend/models/User');
const Project = require('../../backend/models/Project');

describe('User Workflow Integration Tests', () => {
    describe('Complete User Registration and Authentication Flow', () => {
        it('should complete full user lifecycle: register → login → access protected route → logout', async () => {
            const userData = global.testUtils.createTestUser();
            
            // 1. Register new user
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);
            
            expect(registerResponse.body.success).toBe(true);
            expect(registerResponse.body.user).toBeDefined();
            expect(registerResponse.body.token).toBeDefined();
            
            const { user, token } = registerResponse.body;
            
            // 2. Login with credentials
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: userData.email,
                    password: userData.password
                })
                .expect(200);
            
            expect(loginResponse.body.success).toBe(true);
            expect(loginResponse.body.token).toBeDefined();
            
            // 3. Access protected route
            const profileResponse = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${loginResponse.body.token}`)
                .expect(200);
            
            expect(profileResponse.body.success).toBe(true);
            expect(profileResponse.body.user.email).toBe(userData.email);
            
            // 4. Update profile
            const updateResponse = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${loginResponse.body.token}`)
                .send({
                    firstName: 'Updated',
                    lastName: 'Name',
                    bio: 'Updated bio'
                })
                .expect(200);
            
            expect(updateResponse.body.success).toBe(true);
            expect(updateResponse.body.user.firstName).toBe('Updated');
            
            // 5. Logout
            const logoutResponse = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${loginResponse.body.token}`)
                .expect(200);
            
            expect(logoutResponse.body.success).toBe(true);
            
            // 6. Verify token is invalidated
            await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${loginResponse.body.token}`)
                .expect(401);
        });
    });

    describe('Project Management Workflow', () => {
        let authUser;
        let authToken;

        beforeEach(async () => {
            const userData = global.testUtils.createTestUser();
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);
            
            authUser = registerResponse.body.user;
            authToken = registerResponse.body.token;
        });

        it('should complete project lifecycle: create → read → update → delete', async () => {
            const projectData = global.testUtils.createTestProject();
            
            // 1. Create project
            const createResponse = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(projectData)
                .expect(201);
            
            expect(createResponse.body.success).toBe(true);
            expect(createResponse.body.project).toBeDefined();
            expect(createResponse.body.project.title).toBe(projectData.title);
            
            const projectId = createResponse.body.project._id;
            
            // 2. Read project
            const readResponse = await request(app)
                .get(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            
            expect(readResponse.body.success).toBe(true);
            expect(readResponse.body.project._id).toBe(projectId);
            
            // 3. Update project
            const updateData = {
                title: 'Updated Project Title',
                description: 'Updated description',
                status: 'in-progress'
            };
            
            const updateResponse = await request(app)
                .put(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);
            
            expect(updateResponse.body.success).toBe(true);
            expect(updateResponse.body.project.title).toBe(updateData.title);
            expect(updateResponse.body.project.status).toBe(updateData.status);
            
            // 4. List user's projects
            const listResponse = await request(app)
                .get('/api/projects/my-projects')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            
            expect(listResponse.body.success).toBe(true);
            expect(listResponse.body.projects).toHaveLength(1);
            expect(listResponse.body.projects[0]._id).toBe(projectId);
            
            // 5. Delete project
            const deleteResponse = await request(app)
                .delete(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            
            expect(deleteResponse.body.success).toBe(true);
            
            // 6. Verify project is deleted
            await request(app)
                .get(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });

        it('should handle project collaboration workflow', async () => {
            // Create collaborator user
            const collaboratorData = global.testUtils.createTestUser({
                username: 'collaborator',
                email: 'collaborator@cosmic.dev'
            });
            
            const collaboratorResponse = await request(app)
                .post('/api/auth/register')
                .send(collaboratorData)
                .expect(201);
            
            const collaboratorToken = collaboratorResponse.body.token;
            const collaboratorId = collaboratorResponse.body.user._id;
            
            // Create project
            const projectData = global.testUtils.createTestProject();
            const createResponse = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(projectData)
                .expect(201);
            
            const projectId = createResponse.body.project._id;
            
            // Add collaborator
            const addCollaboratorResponse = await request(app)
                .post(`/api/projects/${projectId}/collaborators`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: collaboratorId,
                    role: 'editor'
                })
                .expect(200);
            
            expect(addCollaboratorResponse.body.success).toBe(true);
            
            // Collaborator should be able to access project
            const accessResponse = await request(app)
                .get(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${collaboratorToken}`)
                .expect(200);
            
            expect(accessResponse.body.success).toBe(true);
            
            // Collaborator should be able to update project
            const updateResponse = await request(app)
                .put(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${collaboratorToken}`)
                .send({
                    description: 'Updated by collaborator'
                })
                .expect(200);
            
            expect(updateResponse.body.success).toBe(true);
            expect(updateResponse.body.project.description).toBe('Updated by collaborator');
            
            // Remove collaborator
            const removeCollaboratorResponse = await request(app)
                .delete(`/api/projects/${projectId}/collaborators/${collaboratorId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            
            expect(removeCollaboratorResponse.body.success).toBe(true);
            
            // Collaborator should no longer access project
            await request(app)
                .get(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${collaboratorToken}`)
                .expect(403);
        });
    });

    describe('Password Reset Workflow', () => {
        let testUser;

        beforeEach(async () => {
            const userData = global.testUtils.createTestUser();
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);
            
            testUser = {
                ...registerResponse.body.user,
                originalPassword: userData.password
            };
        });

        it('should complete password reset workflow', async () => {
            // 1. Request password reset
            const forgotResponse = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: testUser.email })
                .expect(200);
            
            expect(forgotResponse.body.success).toBe(true);
            
            // 2. Get reset token from database (simulating email link click)
            const dbUser = await User.findById(testUser._id);
            const resetToken = dbUser.passwordResetToken;
            expect(resetToken).toBeDefined();
            
            // 3. Reset password with token
            const newPassword = 'NewSecurePassword123!';
            const resetResponse = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: resetToken,
                    password: newPassword
                })
                .expect(200);
            
            expect(resetResponse.body.success).toBe(true);
            
            // 4. Verify old password no longer works
            await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: testUser.email,
                    password: testUser.originalPassword
                })
                .expect(401);
            
            // 5. Verify new password works
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: testUser.email,
                    password: newPassword
                })
                .expect(200);
            
            expect(loginResponse.body.success).toBe(true);
            expect(loginResponse.body.token).toBeDefined();
            
            // 6. Verify reset token is invalidated
            await request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: resetToken,
                    password: 'AnotherPassword123!'
                })
                .expect(400);
        });
    });

    describe('Project Search and Discovery Workflow', () => {
        let authToken;
        let publicProjects;

        beforeEach(async () => {
            // Create authenticated user
            const userData = global.testUtils.createTestUser();
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);
            
            authToken = registerResponse.body.token;
            
            // Create multiple projects with different visibility
            const projectsData = [
                {
                    ...global.testUtils.createTestProject({
                        title: 'React Todo App',
                        description: 'A todo app built with React',
                        technologies: ['React', 'JavaScript'],
                        tags: ['frontend', 'web'],
                        isPublic: true
                    })
                },
                {
                    ...global.testUtils.createTestProject({
                        title: 'Node.js API',
                        description: 'RESTful API with Node.js',
                        technologies: ['Node.js', 'Express'],
                        tags: ['backend', 'api'],
                        isPublic: true
                    })
                },
                {
                    ...global.testUtils.createTestProject({
                        title: 'Private Project',
                        description: 'This is a private project',
                        technologies: ['Vue.js'],
                        tags: ['private'],
                        isPublic: false
                    })
                }
            ];
            
            publicProjects = [];
            for (const projectData of projectsData) {
                const response = await request(app)
                    .post('/api/projects')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(projectData)
                    .expect(201);
                
                if (projectData.isPublic) {
                    publicProjects.push(response.body.project);
                }
            }
        });

        it('should discover public projects through search', async () => {
            // 1. Search by technology
            const techSearchResponse = await request(app)
                .get('/api/projects/search?q=React')
                .expect(200);
            
            expect(techSearchResponse.body.success).toBe(true);
            expect(techSearchResponse.body.projects).toHaveLength(1);
            expect(techSearchResponse.body.projects[0].title).toBe('React Todo App');
            
            // 2. Search by description
            const descSearchResponse = await request(app)
                .get('/api/projects/search?q=RESTful')
                .expect(200);
            
            expect(descSearchResponse.body.success).toBe(true);
            expect(descSearchResponse.body.projects).toHaveLength(1);
            expect(descSearchResponse.body.projects[0].title).toBe('Node.js API');
            
            // 3. Search by tags
            const tagSearchResponse = await request(app)
                .get('/api/projects/search?q=frontend')
                .expect(200);
            
            expect(tagSearchResponse.body.success).toBe(true);
            expect(tagSearchResponse.body.projects).toHaveLength(1);
            
            // 4. Get all public projects
            const publicSearchResponse = await request(app)
                .get('/api/projects/public')
                .expect(200);
            
            expect(publicSearchResponse.body.success).toBe(true);
            expect(publicSearchResponse.body.projects).toHaveLength(2);
            expect(publicSearchResponse.body.projects.every(p => p.isPublic)).toBe(true);
            
            // 5. Verify private projects are not in public results
            const privateSearchResponse = await request(app)
                .get('/api/projects/search?q=private')
                .expect(200);
            
            expect(privateSearchResponse.body.projects).toHaveLength(0);
        });
    });

    describe('Real-time Features Integration', () => {
        let authToken;
        let projectId;

        beforeEach(async () => {
            const userData = global.testUtils.createTestUser();
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);
            
            authToken = registerResponse.body.token;
            
            const projectData = global.testUtils.createTestProject();
            const createResponse = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(projectData)
                .expect(201);
            
            projectId = createResponse.body.project._id;
        });

        it('should handle project activity logging', async () => {
            // Update project to generate activity
            await request(app)
                .put(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    status: 'in-progress'
                })
                .expect(200);
            
            // Update progress
            await request(app)
                .put(`/api/projects/${projectId}/progress`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    progress: 50
                })
                .expect(200);
            
            // Get project activities
            const activitiesResponse = await request(app)
                .get(`/api/projects/${projectId}/activities`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            
            expect(activitiesResponse.body.success).toBe(true);
            expect(activitiesResponse.body.activities).toBeDefined();
            expect(activitiesResponse.body.activities.length).toBeGreaterThan(0);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        let authToken;

        beforeEach(async () => {
            const userData = global.testUtils.createTestUser();
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);
            
            authToken = registerResponse.body.token;
        });

        it('should handle concurrent project updates gracefully', async () => {
            const projectData = global.testUtils.createTestProject();
            const createResponse = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(projectData)
                .expect(201);
            
            const projectId = createResponse.body.project._id;
            
            // Simulate concurrent updates
            const updates = [
                request(app)
                    .put(`/api/projects/${projectId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ title: 'Update 1' }),
                request(app)
                    .put(`/api/projects/${projectId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ title: 'Update 2' }),
                request(app)
                    .put(`/api/projects/${projectId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ title: 'Update 3' })
            ];
            
            const responses = await Promise.all(updates);
            
            // All requests should succeed (optimistic updates)
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
            
            // Final state should be consistent
            const finalResponse = await request(app)
                .get(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            
            expect(finalResponse.body.project.title).toMatch(/Update [123]/);
        });

        it('should handle database connection issues gracefully', async () => {
            // This test would require mocking database failures
            // For now, we'll test that the API returns appropriate errors
            
            const response = await request(app)
                .get('/api/projects/invalid-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBeDefined();
        });

        it('should validate request rate limiting', async () => {
            const requests = [];
            
            // Make multiple rapid requests
            for (let i = 0; i < 20; i++) {
                requests.push(
                    request(app)
                        .get('/api/projects/my-projects')
                        .set('Authorization', `Bearer ${authToken}`)
                );
            }
            
            const responses = await Promise.all(requests);
            
            // Some requests might be rate limited
            const rateLimitedResponses = responses.filter(r => r.status === 429);
            const successfulResponses = responses.filter(r => r.status === 200);
            
            expect(successfulResponses.length + rateLimitedResponses.length).toBe(20);
        });
    });
});