// End-to-End Tests for Complete Application
const request = require('supertest');
const app = require('../../backend/app');
const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

describe('End-to-End Application Tests', () => {
    let driver;
    const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';
    
    beforeAll(async () => {
        // Setup Chrome driver for E2E tests
        const options = new chrome.Options();
        
        // Add headless mode for CI environments
        if (process.env.CI || process.env.HEADLESS) {
            options.addArguments('--headless');
        }
        
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-dev-shm-usage');
        options.addArguments('--disable-extensions');
        options.addArguments('--disable-gpu');
        options.addArguments('--window-size=1920,1080');
        
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
            
        // Set implicit wait timeout
        await driver.manage().setTimeouts({ implicit: 10000 });
    });

    afterAll(async () => {
        if (driver) {
            await driver.quit();
        }
    });

    describe('Landing Page and Navigation', () => {
        it('should load the main page successfully', async () => {
            await driver.get(baseUrl);
            
            const title = await driver.getTitle();
            expect(title).toContain('Cosmic DevSpace');
            
            // Check for main navigation elements
            const navItems = await driver.findElements(By.css('nav a'));
            expect(navItems.length).toBeGreaterThan(0);
            
            // Check for hero section
            const heroSection = await driver.findElement(By.css('.hero-section'));
            expect(await heroSection.isDisplayed()).toBe(true);
        });

        it('should display cosmic background animation', async () => {
            await driver.get(baseUrl);
            
            // Wait for cosmic background to load
            const cosmicBackground = await driver.wait(
                until.elementLocated(By.css('#cosmic-background')),
                5000
            );
            
            expect(await cosmicBackground.isDisplayed()).toBe(true);
            
            // Check for particle animation canvas
            const particleCanvas = await driver.findElement(By.css('#particle-canvas'));
            expect(await particleCanvas.isDisplayed()).toBe(true);
        });

        it('should navigate between sections smoothly', async () => {
            await driver.get(baseUrl);
            
            // Click on projects section link
            const projectsLink = await driver.findElement(By.css('a[href="#projects"]'));
            await projectsLink.click();
            
            // Wait for smooth scroll to complete
            await driver.sleep(1000);
            
            // Verify projects section is visible
            const projectsSection = await driver.findElement(By.css('#projects'));
            const isInViewport = await driver.executeScript(
                'var rect = arguments[0].getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= window.innerHeight;',
                projectsSection
            );
            
            expect(isInViewport).toBe(true);
        });
    });

    describe('User Authentication Flow', () => {
        const testUser = global.testUtils.createTestUser();

        it('should complete user registration flow', async () => {
            await driver.get(baseUrl);
            
            // Open authentication modal
            const authButton = await driver.findElement(By.css('.auth-button'));
            await authButton.click();
            
            // Wait for modal to appear
            const authModal = await driver.wait(
                until.elementLocated(By.css('#auth-modal')),
                5000
            );
            
            // Switch to register tab
            const registerTab = await driver.findElement(By.css('[data-tab="register"]'));
            await registerTab.click();
            
            // Fill registration form
            await driver.findElement(By.css('input[name="username"]')).sendKeys(testUser.username);
            await driver.findElement(By.css('input[name="email"]')).sendKeys(testUser.email);
            await driver.findElement(By.css('input[name="password"]')).sendKeys(testUser.password);
            await driver.findElement(By.css('input[name="firstName"]')).sendKeys(testUser.firstName);
            await driver.findElement(By.css('input[name="lastName"]')).sendKeys(testUser.lastName);
            
            // Submit form
            const submitButton = await driver.findElement(By.css('.auth-form button[type="submit"]'));
            await submitButton.click();
            
            // Wait for successful registration
            await driver.wait(
                until.elementLocated(By.css('.success-message')),
                5000
            );
            
            // Verify user is logged in (check for dashboard access)
            const dashboardButton = await driver.wait(
                until.elementLocated(By.css('.dashboard-button')),
                5000
            );
            
            expect(await dashboardButton.isDisplayed()).toBe(true);
        });

        it('should handle login flow', async () => {
            await driver.get(baseUrl);
            
            // Open authentication modal
            const authButton = await driver.findElement(By.css('.auth-button'));
            await authButton.click();
            
            // Modal should default to login tab
            const loginForm = await driver.wait(
                until.elementLocated(By.css('.login-form')),
                5000
            );
            
            // Fill login form
            await driver.findElement(By.css('input[name="identifier"]')).sendKeys(testUser.email);
            await driver.findElement(By.css('input[name="password"]')).sendKeys(testUser.password);
            
            // Submit form
            const submitButton = await driver.findElement(By.css('.auth-form button[type="submit"]'));
            await submitButton.click();
            
            // Wait for successful login
            await driver.wait(
                until.elementLocated(By.css('.dashboard-button')),
                5000
            );
            
            // Verify authentication state
            const userMenu = await driver.findElement(By.css('.user-menu'));
            expect(await userMenu.isDisplayed()).toBe(true);
        });

        it('should display validation errors for invalid input', async () => {
            await driver.get(baseUrl);
            
            // Open authentication modal
            const authButton = await driver.findElement(By.css('.auth-button'));
            await authButton.click();
            
            // Try to submit empty login form
            const submitButton = await driver.findElement(By.css('.auth-form button[type="submit"]'));
            await submitButton.click();
            
            // Check for validation errors
            const errorMessages = await driver.findElements(By.css('.error-message'));
            expect(errorMessages.length).toBeGreaterThan(0);
            
            const firstError = await errorMessages[0].getText();
            expect(firstError).toBeTruthy();
        });
    });

    describe('Dashboard and Project Management', () => {
        beforeEach(async () => {
            // Login before each test
            await driver.get(baseUrl);
            const authButton = await driver.findElement(By.css('.auth-button'));
            await authButton.click();
            
            const testUser = global.testUtils.createTestUser();
            await driver.findElement(By.css('input[name="identifier"]')).sendKeys(testUser.email);
            await driver.findElement(By.css('input[name="password"]')).sendKeys(testUser.password);
            
            const submitButton = await driver.findElement(By.css('.auth-form button[type="submit"]'));
            await submitButton.click();
            
            await driver.wait(
                until.elementLocated(By.css('.dashboard-button')),
                5000
            );
        });

        it('should open and navigate dashboard', async () => {
            // Click dashboard button
            const dashboardButton = await driver.findElement(By.css('.dashboard-button'));
            await dashboardButton.click();
            
            // Wait for dashboard to load
            const dashboard = await driver.wait(
                until.elementLocated(By.css('#dashboard')),
                5000
            );
            
            expect(await dashboard.isDisplayed()).toBe(true);
            
            // Check dashboard sections
            const sections = await driver.findElements(By.css('.dashboard-section'));
            expect(sections.length).toBeGreaterThan(0);
            
            // Verify user profile section
            const profileSection = await driver.findElement(By.css('.profile-section'));
            expect(await profileSection.isDisplayed()).toBe(true);
        });

        it('should create a new project', async () => {
            // Open dashboard
            const dashboardButton = await driver.findElement(By.css('.dashboard-button'));
            await dashboardButton.click();
            
            await driver.wait(
                until.elementLocated(By.css('#dashboard')),
                5000
            );
            
            // Click create project button
            const createProjectButton = await driver.findElement(By.css('#create-project-btn'));
            await createProjectButton.click();
            
            // Wait for project form modal
            const projectForm = await driver.wait(
                until.elementLocated(By.css('#project-form-modal')),
                5000
            );
            
            // Fill project form
            const projectData = global.testUtils.createTestProject();
            await driver.findElement(By.css('input[name="title"]')).sendKeys(projectData.title);
            await driver.findElement(By.css('textarea[name="description"]')).sendKeys(projectData.description);
            
            // Add technologies
            const techInput = await driver.findElement(By.css('#technologies-input'));
            await techInput.sendKeys('JavaScript');
            await techInput.sendKeys(Key.ENTER);
            await techInput.sendKeys('Node.js');
            await techInput.sendKeys(Key.ENTER);
            
            // Submit form
            const submitButton = await driver.findElement(By.css('#project-form button[type="submit"]'));
            await submitButton.click();
            
            // Wait for project to appear in list
            await driver.wait(
                until.elementLocated(By.css('.project-card')),
                5000
            );
            
            // Verify project was created
            const projectCards = await driver.findElements(By.css('.project-card'));
            expect(projectCards.length).toBeGreaterThan(0);
            
            const projectTitle = await projectCards[0].findElement(By.css('.project-title')).getText();
            expect(projectTitle).toBe(projectData.title);
        });

        it('should edit project details', async () => {
            // Assume project exists from previous test
            const dashboardButton = await driver.findElement(By.css('.dashboard-button'));
            await dashboardButton.click();
            
            await driver.wait(
                until.elementLocated(By.css('.project-card')),
                5000
            );
            
            // Click edit button on first project
            const editButton = await driver.findElement(By.css('.project-card .edit-btn'));
            await editButton.click();
            
            // Wait for edit modal
            const editModal = await driver.wait(
                until.elementLocated(By.css('#project-edit-modal')),
                5000
            );
            
            // Update project title
            const titleInput = await driver.findElement(By.css('input[name="title"]'));
            await titleInput.clear();
            await titleInput.sendKeys('Updated Project Title');
            
            // Save changes
            const saveButton = await driver.findElement(By.css('#project-edit-form button[type="submit"]'));
            await saveButton.click();
            
            // Wait for modal to close and changes to reflect
            await driver.wait(
                until.stalenessOf(editModal),
                5000
            );
            
            // Verify changes
            const updatedTitle = await driver.findElement(By.css('.project-card .project-title')).getText();
            expect(updatedTitle).toBe('Updated Project Title');
        });

        it('should update project progress', async () => {
            const dashboardButton = await driver.findElement(By.css('.dashboard-button'));
            await dashboardButton.click();
            
            await driver.wait(
                until.elementLocated(By.css('.project-card')),
                5000
            );
            
            // Click on project to open details
            const projectCard = await driver.findElement(By.css('.project-card'));
            await projectCard.click();
            
            // Wait for project details view
            const projectDetails = await driver.wait(
                until.elementLocated(By.css('#project-details')),
                5000
            );
            
            // Update progress slider
            const progressSlider = await driver.findElement(By.css('#progress-slider'));
            await driver.executeScript(
                'arguments[0].value = 75; arguments[0].dispatchEvent(new Event("input"));',
                progressSlider
            );
            
            // Save progress
            const saveProgressButton = await driver.findElement(By.css('#save-progress-btn'));
            await saveProgressButton.click();
            
            // Verify progress update
            const progressText = await driver.findElement(By.css('.progress-text')).getText();
            expect(progressText).toContain('75%');
        });
    });

    describe('Real-time Features', () => {
        it('should display real-time notifications', async () => {
            // Login and open dashboard
            await driver.get(baseUrl);
            const authButton = await driver.findElement(By.css('.auth-button'));
            await authButton.click();
            
            const testUser = global.testUtils.createTestUser();
            await driver.findElement(By.css('input[name="identifier"]')).sendKeys(testUser.email);
            await driver.findElement(By.css('input[name="password"]')).sendKeys(testUser.password);
            
            const submitButton = await driver.findElement(By.css('.auth-form button[type="submit"]'));
            await submitButton.click();
            
            await driver.wait(
                until.elementLocated(By.css('.dashboard-button')),
                5000
            );
            
            // Check for notification center
            const notificationBell = await driver.findElement(By.css('.notification-bell'));
            expect(await notificationBell.isDisplayed()).toBe(true);
            
            // Click to open notifications
            await notificationBell.click();
            
            const notificationPanel = await driver.wait(
                until.elementLocated(By.css('#notification-panel')),
                5000
            );
            
            expect(await notificationPanel.isDisplayed()).toBe(true);
        });

        it('should handle live project updates', async () => {
            // This test would require WebSocket connection testing
            // For now, we'll test the UI elements are present
            
            await driver.get(baseUrl);
            
            // Check for Socket.IO connection indicator
            const connectionStatus = await driver.findElement(By.css('.connection-status'));
            expect(await connectionStatus.isDisplayed()).toBe(true);
            
            // Wait for connection to establish
            await driver.wait(async () => {
                const status = await connectionStatus.getAttribute('class');
                return status.includes('connected');
            }, 10000);
        });
    });

    describe('Responsive Design and Mobile Experience', () => {
        it('should work on mobile viewport', async () => {
            // Set mobile viewport
            await driver.manage().window().setRect({ width: 375, height: 667 });
            
            await driver.get(baseUrl);
            
            // Check for mobile navigation
            const mobileMenuButton = await driver.findElement(By.css('.mobile-menu-button'));
            expect(await mobileMenuButton.isDisplayed()).toBe(true);
            
            // Open mobile menu
            await mobileMenuButton.click();
            
            const mobileMenu = await driver.wait(
                until.elementLocated(By.css('.mobile-menu')),
                5000
            );
            
            expect(await mobileMenu.isDisplayed()).toBe(true);
            
            // Test navigation links
            const navLinks = await mobileMenu.findElements(By.css('a'));
            expect(navLinks.length).toBeGreaterThan(0);
        });

        it('should adapt dashboard for mobile', async () => {
            await driver.manage().window().setRect({ width: 375, height: 667 });
            
            // Login first
            await driver.get(baseUrl);
            const authButton = await driver.findElement(By.css('.auth-button'));
            await authButton.click();
            
            const testUser = global.testUtils.createTestUser();
            await driver.findElement(By.css('input[name="identifier"]')).sendKeys(testUser.email);
            await driver.findElement(By.css('input[name="password"]')).sendKeys(testUser.password);
            
            const submitButton = await driver.findElement(By.css('.auth-form button[type="submit"]'));
            await submitButton.click();
            
            await driver.wait(
                until.elementLocated(By.css('.dashboard-button')),
                5000
            );
            
            // Open dashboard
            const dashboardButton = await driver.findElement(By.css('.dashboard-button'));
            await dashboardButton.click();
            
            const dashboard = await driver.wait(
                until.elementLocated(By.css('#dashboard')),
                5000
            );
            
            // Check for mobile-optimized layout
            const mobileLayout = await dashboard.getAttribute('class');
            expect(mobileLayout).toContain('mobile-layout');
        });
    });

    describe('Performance and Loading', () => {
        it('should load initial page within performance budget', async () => {
            const startTime = Date.now();
            
            await driver.get(baseUrl);
            
            // Wait for main content to load
            await driver.wait(
                until.elementLocated(By.css('.hero-section')),
                5000
            );
            
            const loadTime = Date.now() - startTime;
            
            // Should load within 3 seconds
            expect(loadTime).toBeLessThan(3000);
        });

        it('should handle slow network conditions gracefully', async () => {
            // Simulate slow network by setting timeouts
            await driver.manage().setTimeouts({ 
                pageLoad: 30000,
                script: 30000 
            });
            
            await driver.get(baseUrl);
            
            // Check for loading indicators
            const loadingIndicator = await driver.findElement(By.css('.loading-indicator'));
            expect(await loadingIndicator.isDisplayed()).toBe(true);
            
            // Wait for content to load
            await driver.wait(
                until.elementLocated(By.css('.hero-section')),
                15000
            );
        });
    });

    describe('Accessibility Features', () => {
        it('should support keyboard navigation', async () => {
            await driver.get(baseUrl);
            
            // Test tab navigation
            const body = await driver.findElement(By.css('body'));
            await body.sendKeys(Key.TAB);
            
            // Check focus is on first focusable element
            const activeElement = await driver.switchTo().activeElement();
            const tagName = await activeElement.getTagName();
            
            expect(['a', 'button', 'input'].includes(tagName.toLowerCase())).toBe(true);
        });

        it('should have proper ARIA labels and roles', async () => {
            await driver.get(baseUrl);
            
            // Check for navigation landmarks
            const nav = await driver.findElement(By.css('nav'));
            const navRole = await nav.getAttribute('role');
            expect(navRole).toBe('navigation');
            
            // Check for main content landmark
            const main = await driver.findElement(By.css('main'));
            const mainRole = await main.getAttribute('role');
            expect(mainRole).toBe('main');
            
            // Check for proper button labels
            const buttons = await driver.findElements(By.css('button'));
            for (const button of buttons) {
                const ariaLabel = await button.getAttribute('aria-label');
                const textContent = await button.getText();
                
                expect(ariaLabel || textContent).toBeTruthy();
            }
        });

        it('should support screen reader announcements', async () => {
            await driver.get(baseUrl);
            
            // Check for aria-live regions
            const liveRegions = await driver.findElements(By.css('[aria-live]'));
            expect(liveRegions.length).toBeGreaterThan(0);
            
            // Check for proper heading hierarchy
            const headings = await driver.findElements(By.css('h1, h2, h3, h4, h5, h6'));
            expect(headings.length).toBeGreaterThan(0);
            
            // Verify h1 exists and is unique
            const h1Elements = await driver.findElements(By.css('h1'));
            expect(h1Elements.length).toBe(1);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should display user-friendly error messages', async () => {
            await driver.get(baseUrl);
            
            // Try to access non-existent page
            await driver.get(`${baseUrl}/non-existent-page`);
            
            // Should show 404 page
            const errorPage = await driver.findElement(By.css('.error-page'));
            expect(await errorPage.isDisplayed()).toBe(true);
            
            const errorMessage = await driver.findElement(By.css('.error-message')).getText();
            expect(errorMessage).toContain('404');
        });

        it('should handle network connectivity issues', async () => {
            await driver.get(baseUrl);
            
            // Simulate network disconnection (this would require specific browser capabilities)
            // For now, test offline indicator
            const offlineIndicator = await driver.findElement(By.css('.offline-indicator'));
            
            // Initially should be hidden (online)
            expect(await offlineIndicator.isDisplayed()).toBe(false);
        });

        it('should recover from JavaScript errors gracefully', async () => {
            await driver.get(baseUrl);
            
            // Check for global error handler
            const errorBoundary = await driver.findElement(By.css('.error-boundary'));
            expect(await errorBoundary.isDisplayed()).toBe(false);
            
            // Trigger an intentional error to test error boundary
            await driver.executeScript('window.dispatchEvent(new Error("Test error"));');
            
            // Application should still be functional
            const mainContent = await driver.findElement(By.css('.hero-section'));
            expect(await mainContent.isDisplayed()).toBe(true);
        });
    });
});