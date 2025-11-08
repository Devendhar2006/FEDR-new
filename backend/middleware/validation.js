const { body, param, query, validationResult } = require('express-validator');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    
    return res.status(400).json({
      error: 'Validation Error',
      message: '🚨 Houston, we have validation problems! Please check your cosmic data.',
      errors: formattedErrors
    });
  }
  
  next();
};

// User validation rules
const validateUserRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, hyphens, and underscores')
    .custom(async (username) => {
      const User = require('../models/User');
      const existingUser = await User.findOne({ username: username.toLowerCase() });
      if (existingUser) {
        throw new Error('🚀 This cosmic username is already taken! Choose another space identity.');
      }
    }),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address for mission communications')
    .normalizeEmail()
    .custom(async (email) => {
      const User = require('../models/User');
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('🌟 This email is already registered in our cosmic database!');
      }
    }),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long for space station security')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('🔒 Password confirmation does not match! Please verify your cosmic security code.');
      }
      return true;
    }),
  
  handleValidationErrors
];

const validateUserLogin = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Please provide your username or email for cosmic identification'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required to access your space station'),
  
  handleValidationErrors
];

const validateProfileUpdate = [
  body('profile.firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  
  body('profile.lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  
  body('profile.bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  
  body('profile.location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),
  
  body('profile.website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  
  body('profile.github')
    .optional()
    .matches(/^https?:\/\/(www\.)?github\.com\/.+/)
    .withMessage('Please provide a valid GitHub URL'),
  
  body('profile.linkedin')
    .optional()
    .matches(/^https?:\/\/(www\.)?linkedin\.com\/.+/)
    .withMessage('Please provide a valid LinkedIn URL'),
  
  body('profile.twitter')
    .optional()
    .matches(/^https?:\/\/(www\.)?twitter\.com\/.+/)
    .withMessage('Please provide a valid Twitter URL'),
  
  handleValidationErrors
];

// Portfolio validation rules
const validatePortfolioCreate = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Project title is required for cosmic identification')
    .isLength({ max: 100 })
    .withMessage('Project title cannot exceed 100 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Project description is required to explain your cosmic creation')
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('shortDescription')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Short description cannot exceed 200 characters'),
  
  body('category')
    .notEmpty()
    .withMessage('Project category is required for cosmic classification')
    .isIn(['web', 'mobile', 'ai', 'design', 'backend', 'frontend', 'fullstack', 'game', 'blockchain', 'iot', 'other'])
    .withMessage('Invalid project category'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error('Cannot have more than 10 tags');
      }
      return true;
    }),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Each tag cannot exceed 30 characters'),
  
  body('links.live')
    .optional()
    .isURL()
    .withMessage('Please provide a valid live demo URL'),
  
  body('links.github')
    .optional()
    .matches(/^https?:\/\/(www\.)?github\.com\/.+/)
    .withMessage('Please provide a valid GitHub repository URL'),
  
  body('timeline.startDate')
    .notEmpty()
    .withMessage('Project start date is required for cosmic timeline')
    .isISO8601()
    .withMessage('Please provide a valid start date'),
  
  body('timeline.endDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid end date'),
  
  body('status')
    .optional()
    .isIn(['planning', 'in-progress', 'completed', 'on-hold', 'archived'])
    .withMessage('Invalid project status'),
  
  body('visibility')
    .optional()
    .isIn(['public', 'private', 'unlisted'])
    .withMessage('Invalid visibility setting'),
  
  handleValidationErrors
];

const validatePortfolioUpdate = [
  param('id')
    .isMongoId()
    .withMessage('Invalid project ID'),
  
  ...validatePortfolioCreate.slice(0, -1), // Reuse create validation but exclude the final error handler
  
  handleValidationErrors
];

// Guestbook validation rules
const validateGuestbookMessage = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Astronaut name is required for cosmic identification')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Transmission message is required for cosmic communication')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters')
    .custom((message) => {
      // Basic spam detection
      const spamPatterns = [
        /viagra/i, /casino/i, /lottery/i, /winner/i,
        /click here/i, /free money/i, /get rich/i
      ];
      
      const hasSpam = spamPatterns.some(pattern => pattern.test(message));
      if (hasSpam) {
        throw new Error('🚫 Your message contains prohibited content!');
      }
      
      // Check for excessive capitalization
      const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;
      if (capsRatio > 0.7) {
        throw new Error('🚫 Please reduce the use of capital letters in your message!');
      }
      
      return true;
    }),
  
  body('category')
    .optional()
    .isIn(['general', 'feedback', 'question', 'collaboration', 'appreciation', 'bug-report', 'feature-request'])
    .withMessage('Invalid message category'),
  
  body('contact.website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  
  handleValidationErrors
];

// Common validation rules
const validateMongoId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  
  handleValidationErrors
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('sort')
    .optional()
    .isIn([
      // MongoDB sort formats
      'createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'views', '-views', 'likes', '-likes',
      // Frontend-friendly formats
      'newest', 'oldest', 'az', 'za', 'views', 'likes', 'trending'
    ])
    .withMessage('Invalid sort parameter'),
  
  handleValidationErrors
];

const validateSearch = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  
  query('category')
    .optional()
    .isIn(['web', 'mobile', 'ai', 'design', 'backend', 'frontend', 'fullstack', 'game', 'blockchain', 'iot', 'other'])
    .withMessage('Invalid category'),
  
  handleValidationErrors
];

// Analytics validation - Flexible for internal tracking
const validateAnalyticsEvent = [
  body('eventType')
    .notEmpty()
    .withMessage('Event type is required')
    .isIn([
      'page_view', 'user_login', 'user_register', 'project_view', 'project_like',
      'message_post', 'message_like', 'profile_view', 'search', 'download',
      'share', 'contact', 'error', 'performance', 'custom', 'guestbook_entry',
      'profile_creation', 'contact_form', 'blog_view', 'item_view', 'project_creation'
    ])
    .withMessage('Invalid event type'),
  
  body('eventName')
    .trim()
    .notEmpty()
    .withMessage('Event name is required')
    .isLength({ max: 100 })
    .withMessage('Event name cannot exceed 100 characters'),
  
  body('page.url')
    .optional()
    .isURL()
    .withMessage('Please provide a valid page URL'),
  
  body('sessionId')
    .optional()
    .isString()
    .withMessage('Session ID must be a string'),
  
  handleValidationErrors
];

// File upload validation
const validateFileUpload = (allowedTypes = ['image/jpeg', 'image/png', 'image/gif']) => {
  return (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        error: 'No File Uploaded',
        message: '📁 No cosmic file detected! Please select a file to upload.',
        code: 'NO_FILE'
      });
    }
    
    // Check file type
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid File Type',
        message: `🚫 Invalid file type! Allowed types: ${allowedTypes.join(', ')}`,
        code: 'INVALID_FILE_TYPE',
        allowedTypes
      });
    }
    
    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      return res.status(400).json({
        error: 'File Too Large',
        message: '📦 Your cosmic file is too large! Maximum size is 5MB.',
        code: 'FILE_TOO_LARGE',
        maxSize: '5MB'
      });
    }
    
    next();
  };
};

// Custom validation for cosmic-specific rules
const validateCosmicRules = [
  body('*')
    .custom((value, { path }) => {
      // Prevent XSS attacks in all string fields
      if (typeof value === 'string') {
        const xssPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
        if (xssPattern.test(value)) {
          throw new Error(`🚫 Cosmic security breach detected in ${path}! No scripts allowed.`);
        }
      }
      return true;
    }),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,
  validatePortfolioCreate,
  validatePortfolioUpdate,
  validateGuestbookMessage,
  validateMongoId,
  validatePagination,
  validateSearch,
  validateAnalyticsEvent,
  validateFileUpload,
  validateCosmicRules
};