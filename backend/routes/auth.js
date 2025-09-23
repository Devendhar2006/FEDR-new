const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const { 
  generateToken, 
  generateRefreshToken, 
  verifyToken, 
  authenticate, 
  optionalAuth,
  trackActivity 
} = require('../middleware/auth');
const { 
  validateUserRegistration, 
  validateUserLogin, 
  validateProfileUpdate 
} = require('../middleware/validation');

// @route   POST /api/auth/register
// @desc    Register a new cosmic user
// @access  Public
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { username, email, password, profile = {} } = req.body;
    
    // Create new user
    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      profile: {
        ...profile,
        avatar: profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=965aff&color=ffffff&size=150`
      }
    });
    
    await user.save();
    
    // Generate tokens
    const tokenData = user.getAuthTokenData();
    const token = generateToken(tokenData);
    const refreshToken = generateRefreshToken(tokenData);
    
    // Track registration analytics
    await Analytics.trackEvent({
      eventType: 'user_register',
      eventName: 'User Registration',
      user: user._id,
      sessionId: req.sessionID || 'registration',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      page: {
        url: req.originalUrl,
        path: '/register'
      },
      conversion: {
        isConversion: true,
        conversionType: 'signup'
      }
    });
    
    // Add welcome achievement
    user.addAchievement(
      'Space Cadet',
      'Welcome to the cosmic community! Your journey among the stars begins now.',
      '🚀'
    );
    await user.save();
    
    res.status(201).json({
      success: true,
      message: '🚀 Welcome to the cosmic community! Your space station has been successfully established.',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profile: user.profile,
          role: user.role,
          cosmicRank: user.cosmicRank,
          achievements: user.achievements,
          createdAt: user.createdAt
        },
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        error: 'Registration Failed',
        message: `🚫 This ${field} is already taken by another space traveler!`,
        field
      });
    }
    
    res.status(500).json({
      error: 'Registration Failed',
      message: '🛠️ Houston, we have a registration problem! Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { identifier, password, rememberMe = false } = req.body;
    
    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() }
      ]
    }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        error: 'Login Failed',
        message: '🚫 No space traveler found with these cosmic credentials!',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check account status
    if (user.isActive !== 'active') {
      return res.status(403).json({
        error: 'Account Inactive',
        message: '⚠️ Your space station access has been suspended. Contact mission control for assistance.',
        code: 'ACCOUNT_INACTIVE'
      });
    }
    
    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Login Failed',
        message: '🚫 Invalid cosmic security code! Please check your password.',
        code: 'INVALID_PASSWORD'
      });
    }
    
    // Update login stats
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();
    
    // Generate tokens
    const tokenData = user.getAuthTokenData();
    const expiresIn = rememberMe ? '30d' : (process.env.JWT_EXPIRES_IN || '7d');
    const token = generateToken({ ...tokenData, rememberMe });
    const refreshToken = generateRefreshToken(tokenData);
    
    // Track login analytics
    await Analytics.trackEvent({
      eventType: 'user_login',
      eventName: 'User Login',
      user: user._id,
      sessionId: req.sessionID || 'login',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      page: {
        url: req.originalUrl,
        path: '/login'
      },
      eventData: {
        loginMethod: 'password',
        rememberMe
      }
    });
    
    // Check for login streak achievement
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const lastLoginDate = new Date(user.lastLogin).toDateString();
    
    if (lastLoginDate === yesterday) {
      // Add daily explorer achievement if logging in consecutively
      user.addAchievement(
        'Daily Explorer',
        'Consistency is key to cosmic exploration! Keep up the stellar work.',
        '⭐'
      );
      await user.save();
    }
    
    res.json({
      success: true,
      message: `🌟 Welcome back, ${user.username}! Your cosmic journey continues.`,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profile: user.profile,
          role: user.role,
          cosmicRank: user.cosmicRank,
          achievements: user.achievements,
          lastLogin: user.lastLogin,
          loginCount: user.loginCount,
          stats: user.stats
        },
        token,
        refreshToken,
        expiresIn
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login Failed',
      message: '🛠️ Houston, we have a login problem! Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh Failed',
        message: '🚫 No refresh token provided!',
        code: 'NO_REFRESH_TOKEN'
      });
    }
    
    // Verify refresh token
    const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id);
    if (!user || user.isActive !== 'active') {
      return res.status(401).json({
        error: 'Refresh Failed',
        message: '🚫 Invalid refresh token or account inactive!',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    // Generate new access token
    const tokenData = user.getAuthTokenData();
    const newToken = generateToken(tokenData);
    
    res.json({
      success: true,
      message: '🔄 Cosmic token refreshed successfully!',
      data: {
        token: newToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: 'Refresh Failed',
      message: '🚫 Invalid or expired refresh token!',
      code: 'REFRESH_ERROR'
    });
  }
});

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticate, trackActivity, async (req, res) => {
  try {
    // Populate additional user data
    const user = await User.findById(req.user._id)
      .populate('achievements')
      .select('-password');
    
    if (!user) {
      return res.status(404).json({
        error: 'Profile Not Found',
        message: '🌌 Your cosmic profile has drifted into a black hole!'
      });
    }
    
    res.json({
      success: true,
      message: '👨‍🚀 Cosmic profile retrieved successfully!',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profile: user.profile,
          role: user.role,
          cosmicRank: user.cosmicRank,
          achievements: user.achievements,
          preferences: user.preferences,
          stats: user.stats,
          lastLogin: user.lastLogin,
          loginCount: user.loginCount,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
    
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Profile Fetch Failed',
      message: '🛠️ Houston, we have a profile problem!'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticate, validateProfileUpdate, trackActivity, async (req, res) => {
  try {
    const updates = req.body;
    const user = req.user;
    
    // Update allowed fields
    const allowedUpdates = ['profile', 'preferences'];
    allowedUpdates.forEach(field => {
      if (updates[field]) {
        user[field] = { ...user[field], ...updates[field] };
      }
    });
    
    await user.save();
    
    // Check for profile completion achievement
    const profileCompletion = [
      user.profile.firstName,
      user.profile.lastName,
      user.profile.bio,
      user.profile.location,
      user.profile.website
    ].filter(Boolean).length;
    
    if (profileCompletion >= 4) {
      user.addAchievement(
        'Profile Master',
        'Your cosmic profile is now complete! Other space travelers can learn about your journey.',
        '📋'
      );
      await user.save();
    }
    
    res.json({
      success: true,
      message: '✨ Your cosmic profile has been updated successfully!',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profile: user.profile,
          preferences: user.preferences,
          cosmicRank: user.cosmicRank,
          achievements: user.achievements,
          updatedAt: user.updatedAt
        }
      }
    });
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Profile Update Failed',
      message: '🛠️ Houston, we have a profile update problem!'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In a real application, you might want to blacklist the token
    // For now, we'll just track the logout event
    
    await Analytics.trackEvent({
      eventType: 'user_logout',
      eventName: 'User Logout',
      user: req.user._id,
      sessionId: req.sessionID || 'logout',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      page: {
        url: req.originalUrl,
        path: '/logout'
      }
    });
    
    res.json({
      success: true,
      message: '👋 Safe travels, space explorer! Your cosmic session has been terminated.',
      data: {
        loggedOut: true,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout Failed',
      message: '🛠️ Houston, we have a logout problem!'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: '📧 If an account with this email exists, a password reset link has been sent to your cosmic mailbox!'
      });
    }
    
    // In a real application, you would:
    // 1. Generate a secure reset token
    // 2. Save it to the database with expiration
    // 3. Send an email with the reset link
    
    // For now, we'll just return a success message
    res.json({
      success: true,
      message: '📧 Password reset instructions have been sent to your cosmic mailbox!'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Password Reset Failed',
      message: '🛠️ Houston, we have a password reset problem!'
    });
  }
});

// @route   GET /api/auth/verify-token
// @desc    Verify if token is valid
// @access  Private
router.get('/verify-token', authenticate, (req, res) => {
  res.json({
    success: true,
    message: '✅ Your cosmic token is valid and active!',
    data: {
      valid: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        role: req.user.role
      }
    }
  });
});

module.exports = router;