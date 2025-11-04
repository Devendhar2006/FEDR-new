const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const colors = require('../config/colors');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '🌟 This cosmic explorer already exists! Please sign in instead.'
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password
    });

    console.log(`${colors.green}🚀 New cosmic explorer registered: ${user.email}${colors.reset}`);

    // Generate token
    const token = generateToken(user._id);

    // Set cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    res.status(201)
       .cookie('token', token, cookieOptions)
       .json({
         success: true,
         message: '🌌 Welcome to the cosmic journey! Registration successful.',
         token,
         user: user.getPublicProfile()
       });

  } catch (error) {
    console.log(`${colors.red}❌ Registration Error:${colors.reset}`, error.message);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: '🔍 Cosmic validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: '🌙 Registration system malfunction. Please try again.'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '🔐 Please provide cosmic coordinates (email) and access code (password)'
      });
    }

    // Check for user and include password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '🌌 Cosmic explorer not found. Please check your coordinates.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: '🌙 Account is in hibernation. Contact mission control.'
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: '🔒 Invalid access code. Please try again.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log(`${colors.cyan}🚀 Cosmic explorer logged in: ${user.email}${colors.reset}`);

    // Generate token
    const token = generateToken(user._id);

    // Set cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    res.status(200)
       .cookie('token', token, cookieOptions)
       .json({
         success: true,
         message: '🌟 Welcome back, cosmic explorer! Login successful.',
         token,
         user: user.getPublicProfile()
       });

  } catch (error) {
    console.log(`${colors.red}❌ Login Error:${colors.reset}`, error.message);
    res.status(500).json({
      success: false,
      message: '🌙 Login system malfunction. Please try again.'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // Clear cookie
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000), // 10 seconds
      httpOnly: true
    });

    console.log(`${colors.yellow}🌙 Cosmic explorer logged out: ${req.user.email}${colors.reset}`);

    res.status(200).json({
      success: true,
      message: '🌌 Safe travels, cosmic explorer! Logout successful.'
    });
  } catch (error) {
    console.log(`${colors.red}❌ Logout Error:${colors.reset}`, error.message);
    res.status(500).json({
      success: false,
      message: '🌙 Logout system malfunction.'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.log(`${colors.red}❌ Get Profile Error:${colors.reset}`, error.message);
    res.status(500).json({
      success: false,
      message: '🌙 Profile retrieval system malfunction.'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, bio, website, githubUsername, skills, socialLinks } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '🌌 Cosmic explorer not found.'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (bio) user.bio = bio;
    if (website) user.website = website;
    if (githubUsername) user.githubUsername = githubUsername;
    if (skills) user.skills = skills;
    if (socialLinks) user.socialLinks = { ...user.socialLinks, ...socialLinks };

    await user.save();

    console.log(`${colors.green}✨ Profile updated for cosmic explorer: ${user.email}${colors.reset}`);

    res.status(200).json({
      success: true,
      message: '✨ Cosmic profile updated successfully!',
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.log(`${colors.red}❌ Profile Update Error:${colors.reset}`, error.message);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: '🔍 Cosmic validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: '🌙 Profile update system malfunction.'
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '🔐 Please provide both current and new cosmic access codes.'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isCurrentPasswordMatch = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: '🔒 Current access code is incorrect.'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    console.log(`${colors.green}🔐 Password changed for cosmic explorer: ${user.email}${colors.reset}`);

    res.status(200).json({
      success: true,
      message: '🔐 Cosmic access code updated successfully!'
    });

  } catch (error) {
    console.log(`${colors.red}❌ Password Change Error:${colors.reset}`, error.message);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: '🔍 Password validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: '🌙 Password change system malfunction.'
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword
};