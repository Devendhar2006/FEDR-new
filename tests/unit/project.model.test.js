// Unit Tests for Project Model
const Project = require('../../backend/models/Project');
const User = require('../../backend/models/User');

describe('Project Model', () => {
    let testUser;

    beforeEach(async () => {
        const userData = global.testUtils.createTestUser();
        testUser = new User(userData);
        await testUser.save();
    });

    describe('Schema Validation', () => {
        it('should create a valid project with required fields', async () => {
            const projectData = global.testUtils.createTestProject({
                owner: testUser._id
            });
            const project = new Project(projectData);
            
            expect(project.title).toBe(projectData.title);
            expect(project.description).toBe(projectData.description);
            expect(project.owner.toString()).toBe(testUser._id.toString());
        });

        it('should require title field', async () => {
            const projectData = global.testUtils.createTestProject({
                owner: testUser._id
            });
            delete projectData.title;
            
            const project = new Project(projectData);
            const error = project.validateSync();
            
            expect(error.errors.title).toBeDefined();
            expect(error.errors.title.kind).toBe('required');
        });

        it('should require description field', async () => {
            const projectData = global.testUtils.createTestProject({
                owner: testUser._id
            });
            delete projectData.description;
            
            const project = new Project(projectData);
            const error = project.validateSync();
            
            expect(error.errors.description).toBeDefined();
            expect(error.errors.description.kind).toBe('required');
        });

        it('should require owner field', async () => {
            const projectData = global.testUtils.createTestProject();
            delete projectData.owner;
            
            const project = new Project(projectData);
            const error = project.validateSync();
            
            expect(error.errors.owner).toBeDefined();
            expect(error.errors.owner.kind).toBe('required');
        });

        it('should validate technologies array', async () => {
            const projectData = global.testUtils.createTestProject({
                owner: testUser._id,
                technologies: ['JavaScript', 'Node.js', 'React']
            });
            const project = new Project(projectData);
            
            const error = project.validateSync();
            expect(error).toBeNull();
            expect(project.technologies).toHaveLength(3);
        });

        it('should validate status enum values', async () => {
            const validStatuses = ['planning', 'in-progress', 'completed', 'on-hold'];
            
            for (const status of validStatuses) {
                const projectData = global.testUtils.createTestProject({
                    owner: testUser._id,
                    status
                });
                const project = new Project(projectData);
                
                const error = project.validateSync();
                expect(error).toBeNull();
                expect(project.status).toBe(status);
            }
        });

        it('should reject invalid status values', async () => {
            const projectData = global.testUtils.createTestProject({
                owner: testUser._id,
                status: 'invalid-status'
            });
            const project = new Project(projectData);
            
            const error = project.validateSync();
            expect(error.errors.status).toBeDefined();
        });

        it('should validate priority enum values', async () => {
            const validPriorities = ['low', 'medium', 'high', 'urgent'];
            
            for (const priority of validPriorities) {
                const projectData = global.testUtils.createTestProject({
                    owner: testUser._id,
                    priority
                });
                const project = new Project(projectData);
                
                const error = project.validateSync();
                expect(error).toBeNull();
                expect(project.priority).toBe(priority);
            }
        });
    });

    describe('Default Values', () => {
        it('should set default status to planning', async () => {
            const projectData = global.testUtils.createTestProject({
                owner: testUser._id
            });
            delete projectData.status;
            
            const project = new Project(projectData);
            await project.save();
            
            expect(project.status).toBe('planning');
        });

        it('should set default priority to medium', async () => {
            const projectData = global.testUtils.createTestProject({
                owner: testUser._id
            });
            delete projectData.priority;
            
            const project = new Project(projectData);
            await project.save();
            
            expect(project.priority).toBe('medium');
        });

        it('should set default visibility to private', async () => {
            const projectData = global.testUtils.createTestProject({
                owner: testUser._id
            });
            delete projectData.isPublic;
            
            const project = new Project(projectData);
            await project.save();
            
            expect(project.isPublic).toBe(false);
        });

        it('should initialize empty arrays', async () => {
            const projectData = global.testUtils.createTestProject({
                owner: testUser._id
            });
            delete projectData.technologies;
            delete projectData.tags;
            delete projectData.collaborators;
            
            const project = new Project(projectData);
            await project.save();
            
            expect(project.technologies).toEqual([]);
            expect(project.tags).toEqual([]);
            expect(project.collaborators).toEqual([]);
        });
    });

    describe('Instance Methods', () => {
        describe('addCollaborator', () => {
            it('should add collaborator successfully', async () => {
                const projectData = global.testUtils.createTestProject({
                    owner: testUser._id
                });
                const project = new Project(projectData);
                await project.save();
                
                const collaboratorData = global.testUtils.createTestUser({
                    username: 'collaborator',
                    email: 'collaborator@cosmic.dev'
                });
                const collaborator = new User(collaboratorData);
                await collaborator.save();
                
                const result = await project.addCollaborator(collaborator._id);
                
                expect(result).toBe(true);
                expect(project.collaborators).toHaveLength(1);
                expect(project.collaborators[0].user.toString()).toBe(collaborator._id.toString());
                expect(project.collaborators[0].role).toBe('member');
            });

            it('should not add duplicate collaborator', async () => {
                const projectData = global.testUtils.createTestProject({
                    owner: testUser._id
                });
                const project = new Project(projectData);
                await project.save();
                
                const collaboratorData = global.testUtils.createTestUser({
                    username: 'collaborator',
                    email: 'collaborator@cosmic.dev'
                });
                const collaborator = new User(collaboratorData);
                await collaborator.save();
                
                await project.addCollaborator(collaborator._id);
                const result = await project.addCollaborator(collaborator._id);
                
                expect(result).toBe(false);
                expect(project.collaborators).toHaveLength(1);
            });

            it('should not add owner as collaborator', async () => {
                const projectData = global.testUtils.createTestProject({
                    owner: testUser._id
                });
                const project = new Project(projectData);
                await project.save();
                
                const result = await project.addCollaborator(testUser._id);
                
                expect(result).toBe(false);
                expect(project.collaborators).toHaveLength(0);
            });
        });

        describe('removeCollaborator', () => {
            it('should remove collaborator successfully', async () => {
                const projectData = global.testUtils.createTestProject({
                    owner: testUser._id
                });
                const project = new Project(projectData);
                await project.save();
                
                const collaboratorData = global.testUtils.createTestUser({
                    username: 'collaborator',
                    email: 'collaborator@cosmic.dev'
                });
                const collaborator = new User(collaboratorData);
                await collaborator.save();
                
                await project.addCollaborator(collaborator._id);
                const result = await project.removeCollaborator(collaborator._id);
                
                expect(result).toBe(true);
                expect(project.collaborators).toHaveLength(0);
            });

            it('should return false for non-existent collaborator', async () => {
                const projectData = global.testUtils.createTestProject({
                    owner: testUser._id
                });
                const project = new Project(projectData);
                await project.save();
                
                const collaboratorData = global.testUtils.createTestUser({
                    username: 'collaborator',
                    email: 'collaborator@cosmic.dev'
                });
                const collaborator = new User(collaboratorData);
                await collaborator.save();
                
                const result = await project.removeCollaborator(collaborator._id);
                
                expect(result).toBe(false);
            });
        });

        describe('updateProgress', () => {
            it('should update progress percentage', async () => {
                const projectData = global.testUtils.createTestProject({
                    owner: testUser._id
                });
                const project = new Project(projectData);
                await project.save();
                
                await project.updateProgress(75);
                
                expect(project.progress).toBe(75);
            });

            it('should auto-complete project at 100% progress', async () => {
                const projectData = global.testUtils.createTestProject({
                    owner: testUser._id,
                    status: 'in-progress'
                });
                const project = new Project(projectData);
                await project.save();
                
                await project.updateProgress(100);
                
                expect(project.progress).toBe(100);
                expect(project.status).toBe('completed');
                expect(project.completedAt).toBeDefined();
            });

            it('should validate progress bounds', async () => {
                const projectData = global.testUtils.createTestProject({
                    owner: testUser._id
                });
                const project = new Project(projectData);
                await project.save();
                
                await expect(project.updateProgress(-10)).rejects.toThrow();
                await expect(project.updateProgress(150)).rejects.toThrow();
            });
        });

        describe('canUserAccess', () => {
            it('should allow owner access', async () => {
                const projectData = global.testUtils.createTestProject({
                    owner: testUser._id,
                    isPublic: false
                });
                const project = new Project(projectData);
                await project.save();
                
                const canAccess = project.canUserAccess(testUser._id);
                expect(canAccess).toBe(true);
            });

            it('should allow public access for any user', async () => {
                const projectData = global.testUtils.createTestProject({
                    owner: testUser._id,
                    isPublic: true
                });
                const project = new Project(projectData);
                await project.save();
                
                const otherUserData = global.testUtils.createTestUser({
                    username: 'otheruser',
                    email: 'other@cosmic.dev'
                });
                const otherUser = new User(otherUserData);
                await otherUser.save();
                
                const canAccess = project.canUserAccess(otherUser._id);
                expect(canAccess).toBe(true);
            });

            it('should allow collaborator access', async () => {
                const projectData = global.testUtils.createTestProject({
                    owner: testUser._id,
                    isPublic: false
                });
                const project = new Project(projectData);
                await project.save();
                
                const collaboratorData = global.testUtils.createTestUser({
                    username: 'collaborator',
                    email: 'collaborator@cosmic.dev'
                });
                const collaborator = new User(collaboratorData);
                await collaborator.save();
                
                await project.addCollaborator(collaborator._id);
                
                const canAccess = project.canUserAccess(collaborator._id);
                expect(canAccess).toBe(true);
            });

            it('should deny access for unauthorized users', async () => {
                const projectData = global.testUtils.createTestProject({
                    owner: testUser._id,
                    isPublic: false
                });
                const project = new Project(projectData);
                await project.save();
                
                const otherUserData = global.testUtils.createTestUser({
                    username: 'otheruser',
                    email: 'other@cosmic.dev'
                });
                const otherUser = new User(otherUserData);
                await otherUser.save();
                
                const canAccess = project.canUserAccess(otherUser._id);
                expect(canAccess).toBe(false);
            });
        });
    });

    describe('Static Methods', () => {
        describe('findByOwner', () => {
            it('should find projects by owner', async () => {
                const project1Data = global.testUtils.createTestProject({
                    owner: testUser._id,
                    title: 'Project 1'
                });
                const project2Data = global.testUtils.createTestProject({
                    owner: testUser._id,
                    title: 'Project 2'
                });
                
                const project1 = new Project(project1Data);
                const project2 = new Project(project2Data);
                await project1.save();
                await project2.save();
                
                const projects = await Project.findByOwner(testUser._id);
                
                expect(projects).toHaveLength(2);
                expect(projects.map(p => p.title)).toContain('Project 1');
                expect(projects.map(p => p.title)).toContain('Project 2');
            });

            it('should return empty array for user with no projects', async () => {
                const otherUserData = global.testUtils.createTestUser({
                    username: 'otheruser',
                    email: 'other@cosmic.dev'
                });
                const otherUser = new User(otherUserData);
                await otherUser.save();
                
                const projects = await Project.findByOwner(otherUser._id);
                expect(projects).toHaveLength(0);
            });
        });

        describe('findPublic', () => {
            it('should find only public projects', async () => {
                const publicProject = new Project(global.testUtils.createTestProject({
                    owner: testUser._id,
                    title: 'Public Project',
                    isPublic: true
                }));
                
                const privateProject = new Project(global.testUtils.createTestProject({
                    owner: testUser._id,
                    title: 'Private Project',
                    isPublic: false
                }));
                
                await publicProject.save();
                await privateProject.save();
                
                const publicProjects = await Project.findPublic();
                
                expect(publicProjects).toHaveLength(1);
                expect(publicProjects[0].title).toBe('Public Project');
                expect(publicProjects[0].isPublic).toBe(true);
            });
        });

        describe('searchProjects', () => {
            beforeEach(async () => {
                const projects = [
                    {
                        title: 'React Todo App',
                        description: 'A simple todo application built with React',
                        technologies: ['React', 'JavaScript'],
                        tags: ['frontend', 'web'],
                        isPublic: true
                    },
                    {
                        title: 'Node.js API Server',
                        description: 'RESTful API server using Node.js and Express',
                        technologies: ['Node.js', 'Express'],
                        tags: ['backend', 'api'],
                        isPublic: true
                    },
                    {
                        title: 'Private Mobile App',
                        description: 'React Native mobile application',
                        technologies: ['React Native'],
                        tags: ['mobile'],
                        isPublic: false
                    }
                ];
                
                for (const projectData of projects) {
                    const project = new Project({
                        ...global.testUtils.createTestProject(projectData),
                        owner: testUser._id
                    });
                    await project.save();
                }
            });

            it('should search by title', async () => {
                const results = await Project.searchProjects('React');
                expect(results).toHaveLength(1);
                expect(results[0].title).toBe('React Todo App');
            });

            it('should search by description', async () => {
                const results = await Project.searchProjects('API');
                expect(results).toHaveLength(1);
                expect(results[0].title).toBe('Node.js API Server');
            });

            it('should search by technologies', async () => {
                const results = await Project.searchProjects('JavaScript');
                expect(results).toHaveLength(1);
                expect(results[0].title).toBe('React Todo App');
            });

            it('should search by tags', async () => {
                const results = await Project.searchProjects('frontend');
                expect(results).toHaveLength(1);
                expect(results[0].title).toBe('React Todo App');
            });

            it('should only return public projects in search', async () => {
                const results = await Project.searchProjects('React');
                expect(results.every(p => p.isPublic)).toBe(true);
            });
        });
    });

    describe('Middleware Hooks', () => {
        it('should generate slug from title before saving', async () => {
            const projectData = global.testUtils.createTestProject({
                owner: testUser._id,
                title: 'My Awesome Project!'
            });
            const project = new Project(projectData);
            
            await project.save();
            
            expect(project.slug).toBe('my-awesome-project');
        });

        it('should ensure unique slugs', async () => {
            const project1 = new Project(global.testUtils.createTestProject({
                owner: testUser._id,
                title: 'Duplicate Title'
            }));
            await project1.save();
            
            const project2 = new Project(global.testUtils.createTestProject({
                owner: testUser._id,
                title: 'Duplicate Title'
            }));
            await project2.save();
            
            expect(project1.slug).toBe('duplicate-title');
            expect(project2.slug).toMatch(/duplicate-title-\d+/);
        });

        it('should set timestamps on creation', async () => {
            const projectData = global.testUtils.createTestProject({
                owner: testUser._id
            });
            const project = new Project(projectData);
            
            await project.save();
            
            expect(project.createdAt).toBeDefined();
            expect(project.updatedAt).toBeDefined();
            expect(project.createdAt).toEqual(project.updatedAt);
        });
    });

    describe('Virtual Properties', () => {
        it('should calculate estimated completion date', async () => {
            const projectData = global.testUtils.createTestProject({
                owner: testUser._id,
                estimatedHours: 100,
                progress: 50
            });
            const project = new Project(projectData);
            
            // Mock some work sessions or use a simple calculation
            const estimatedCompletion = project.estimatedCompletion;
            expect(estimatedCompletion).toBeDefined();
        });

        it('should determine if project is overdue', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);
            
            const projectData = global.testUtils.createTestProject({
                owner: testUser._id,
                deadline: pastDate,
                status: 'in-progress'
            });
            const project = new Project(projectData);
            
            expect(project.isOverdue).toBe(true);
        });
    });
});