const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'cosmic-devspace',
    audience: 'cosmic-users'
  });
};

// Generate refresh token
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '30d',
    issuer: 'cosmic-devspace',
    audience: 'cosmic-users'
  });
};

// Verify JWT token
const verifyToken = (token, secret = process.env.JWT_SECRET) => {
  return jwt.verify(token, secret, {
    issuer: 'cosmic-devspace',
    audience: 'cosmic-users'
  });
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Access Denied',
        message: '🚫 No cosmic authorization token provided! Please login to access this space station.',
        code: 'NO_TOKEN'
      });
    }
    
    // Extract token from "Bearer TOKEN"
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    if (!token) {
      return res.status(401).json({
        error: 'Access Denied',
        message: '🚫 Invalid token format! Please provide a valid cosmic authorization token.',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        error: 'Access Denied',
        message: '🚫 Space traveler not found! Your cosmic credentials may have expired.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if user account is active
    if (user.isActive !== 'active') {
      return res.status(403).json({
        error: 'Account Inactive',
        message: '⚠️ Your space station access has been suspended. Contact mission control for assistance.',
        code: 'ACCOUNT_INACTIVE'
      });
    }
    
    // Add user to request object
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid Token',
        message: '🚫 Your cosmic token is corrupted! Please login again to get a new authorization.',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token Expired',
        message: '⏰ Your cosmic session has expired! Please login again to continue your space journey.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'NotBeforeError') {
      return res.status(401).json({
        error: 'Token Not Active',
        message: '⏰ Your cosmic token is not yet active! Please wait a moment and try again.',
        code: 'TOKEN_NOT_ACTIVE'
      });
    }
    
    res.status(500).json({
      error: 'Authentication Error',
      message: '🛠️ Houston, we have an authentication problem! Our space engineers are investigating.',
      code: 'AUTH_ERROR'
    });
  }
};

// Authorization middleware for different roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication Required',
        message: '🚫 You must be logged in to access this cosmic area!',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient Permissions',
        message: `🚫 Access denied! This area requires ${roles.join(' or ')} clearance level.`,
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }
    
    next();
  };
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return next(); // Continue without authentication
    }
    
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    if (!token) {
      return next(); // Continue without authentication
    }
    
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');
    
    if (user && user.isActive === 'active') {
      req.user = user;
      req.token = token;
    }
    
    next();
  } catch (error) {
    // Continue without authentication on error
    next();
  }
};

// Rate limiting by user
const rateLimitByUser = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requestCounts = new Map();
  
  return (req, res, next) => {
    const identifier = req.user ? req.user._id.toString() : req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [key, data] of requestCounts.entries()) {
      if (data.resetTime < now) {
        requestCounts.delete(key);
      }
    }
    
    // Check current user's requests
    const userRequests = requestCounts.get(identifier) || { count: 0, resetTime: now + windowMs };
    
    if (userRequests.count >= maxRequests) {
      return res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: '🚀 Slow down, space traveler! You\'re making too many requests. Please wait before trying again.',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000),
        limit: maxRequests,
        window: windowMs / 1000
      });
    }
    
    // Increment request count
    userRequests.count++;
    requestCounts.set(identifier, userRequests);
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': maxRequests - userRequests.count,
      'X-RateLimit-Reset': userRequests.resetTime
    });
    
    next();
  };
};

// Middleware to track user activity
const trackActivity = async (req, res, next) => {
  if (req.user) {
    try {
      // Ensure stats object exists with all fields
      if (!req.user.stats) {
        req.user.stats = {
          profileViews: 0,
          projectsCreated: 0,
          certificationsEarned: 0,
          achievementsEarned: 0,
          messagesPosted: 0,
          likesReceived: 0
        };
      } else {
        // Add missing fields to existing stats
        if (req.user.stats.certificationsEarned === undefined) {
          req.user.stats.certificationsEarned = 0;
        }
        if (req.user.stats.achievementsEarned === undefined) {
          req.user.stats.achievementsEarned = 0;
        }
      }
      
      // Update last login time
      req.user.lastLogin = new Date();
      await req.user.save();
      
      // Track analytics (if analytics model is available)
      if (req.body.trackAnalytics !== false) {
        const Analytics = require('../models/Analytics');
        
        await Analytics.trackEvent({
          eventType: 'user_activity',
          eventName: `${req.method} ${req.originalUrl}`,
          user: req.user._id,
          sessionId: req.token || req.sessionID,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          page: {
            url: req.originalUrl,
            path: req.route ? req.route.path : req.path,
            query: JSON.stringify(req.query)
          },
          device: {
            type: req.get('User-Agent')?.toLowerCase().includes('mobile') ? 'mobile' : 'desktop'
          }
        });
      }
    } catch (error) {
      console.error('Activity tracking error:', error);
      // Don't fail the request if activity tracking fails
    }
  }
  
  next();
};

// Middleware to validate API key (for external integrations)
const validateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.header('X-API-Key');
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'API Key Required',
        message: '🔑 API key is required for this cosmic endpoint!',
        code: 'API_KEY_REQUIRED'
      });
    }
    
    // In a real application, you'd validate against stored API keys
    // For now, we'll use a simple environment variable
    const validApiKeys = (process.env.API_KEYS || '').split(',').filter(Boolean);
    
    if (!validApiKeys.includes(apiKey)) {
      return res.status(401).json({
        error: 'Invalid API Key',
        message: '🚫 Invalid API key provided! Please check your cosmic credentials.',
        code: 'INVALID_API_KEY'
      });
    }
    
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({
      error: 'API Key Validation Error',
      message: '🛠️ Houston, we have an API key validation problem!',
      code: 'API_KEY_ERROR'
    });
  }
};

// Middleware to check if user owns resource
const checkResourceOwnership = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const Model = require(`../models/${resourceModel}`);
      
      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          error: 'Resource Not Found',
          message: '🌌 The cosmic resource you\'re looking for doesn\'t exist in our universe!',
          code: 'RESOURCE_NOT_FOUND'
        });
      }
      
      // Check ownership (assuming the resource has a 'creator' or 'user' field)
      const ownerField = resource.creator || resource.user;
      
      if (!ownerField || ownerField.toString() !== req.user._id.toString()) {
        // Allow admins to access any resource
        if (req.user.role !== 'admin') {
          return res.status(403).json({
            error: 'Access Denied',
            message: '🚫 You don\'t have permission to access this cosmic resource!',
            code: 'ACCESS_DENIED'
          });
        }
      }
      
      req.resource = resource;
      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      res.status(500).json({
        error: 'Ownership Check Error',
        message: '🛠️ Houston, we have a resource ownership problem!',
        code: 'OWNERSHIP_ERROR'
      });
    }
  };
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  authenticate,
  authorize,
  optionalAuth,
  rateLimitByUser,
  trackActivity,
  validateApiKey,
  checkResourceOwnership
};