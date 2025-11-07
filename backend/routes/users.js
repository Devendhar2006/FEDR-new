const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Guestbook = require('../models/Guestbook');
const Analytics = require('../models/Analytics');
const { 
  authenticate, 
  authorize, 
  trackActivity 
} = require('../middleware/auth');
const { 
  validateMongoId, 
  validatePagination 
} = require('../middleware/validation');

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private (Admin)
router.get('/', 
  authenticate, 
  authorize('admin'), 
  validatePagination,
  trackActivity,
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        sort = '-createdAt',
        role,
        isActive,
        search 
      } = req.query;
      
      const skip = (page - 1) * limit;
      
      // Build filter
      const filter = {};
      if (role) filter.role = role;
      if (isActive) filter.isActive = isActive;
      
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        filter.$or = [
          { username: searchRegex },
          { email: searchRegex },
          { 'profile.firstName': searchRegex },
          { 'profile.lastName': searchRegex }
        ];
      }
      
      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        User.countDocuments(filter)
      ]);
      
      res.json({
        success: true,
        message: '👨‍🚀 Space travelers retrieved successfully!',
        data: {
          users,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalUsers: total,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
          },
          filters: { role, isActive, search }
        }
      });
      
    } catch (error) {
      console.error('Users fetch error:', error);
      res.status(500).json({
        error: 'Users Fetch Failed',
        message: '🛠️ Houston, we have a users problem!'
      });
    }
  }
);

// @route   GET /api/users/leaderboard
// @desc    Get user leaderboard
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const leaderboard = await User.getLeaderboard(parseInt(limit));
    
    res.json({
      success: true,
      message: '🏆 Cosmic leaderboard retrieved successfully!',
      data: { leaderboard }
    });
    
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({
      error: 'Leaderboard Fetch Failed',
      message: '🛠️ Houston, we have a leaderboard problem!'
    });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics (Admin only)
// @access  Private (Admin)
router.get('/stats', 
  authenticate, 
  authorize('admin'), 
  async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const [userStats, roleDistribution, activityStats] = await Promise.all([
        User.aggregate([
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              activeUsers: { $sum: { $cond: [{ $eq: ['$isActive', 'active'] }, 1, 0] } },
              newUsers: {
                $sum: {
                  $cond: [
                    { $gte: ['$createdAt', startDate] },
                    1,
                    0
                  ]
                }
              },
              verifiedUsers: { $sum: { $cond: ['$emailVerified', 1, 0] } },
              avgLoginCount: { $avg: '$loginCount' },
              totalProfileViews: { $sum: '$stats.profileViews' },
              totalProjectsCreated: { $sum: '$stats.projectsCreated' },
              totalMessagesPosted: { $sum: '$stats.messagesPosted' }
            }
          }
        ]),
        User.aggregate([
          {
            $group: {
              _id: '$role',
              count: { $sum: 1 }
            }
          }
        ]),
        User.aggregate([
          {
            $match: {
              lastLogin: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$lastLogin' }
              },
              activeUsers: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ])
      ]);
      
      res.json({
        success: true,
        message: '📊 User statistics retrieved successfully!',
        data: {
          overview: userStats[0] || {},
          roleDistribution,
          activityTrend: activityStats,
          period: { days: parseInt(days), startDate }
        }
      });
      
    } catch (error) {
      console.error('User stats error:', error);
      res.status(500).json({
        error: 'User Stats Failed',
        message: '🛠️ Houston, we have a stats problem!'
      });
    }
  }
);

// @route   GET /api/users/:id
// @desc    Get user profile by ID
// @access  Public (Limited) / Private (Full for own profile)
router.get('/:id', validateMongoId(), async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get auth header to check if user is authenticated
    const authHeader = req.header('Authorization');
    let currentUser = null;
    
    if (authHeader) {
      try {
        const { verifyToken } = require('../middleware/auth');
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        const decoded = verifyToken(token);
        currentUser = await User.findById(decoded.id);
      } catch (error) {
        // Continue without authentication
      }
    }
    
    const user = await User.findById(userId).select('-password').lean();
    
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: '🌌 This space traveler doesn\'t exist in our universe!'
      });
    }
    
    // Check if profile is viewable
    const isOwnProfile = currentUser && currentUser._id.toString() === userId;
    const isAdmin = currentUser && currentUser.role === 'admin';
    const canViewPrivateInfo = isOwnProfile || isAdmin;
    
    // Hide sensitive information for non-owners
    if (!canViewPrivateInfo) {
      delete user.email;
      delete user.preferences;
      if (!user.preferences?.privacy?.showEmail) {
        delete user.email;
      }
      if (!user.preferences?.privacy?.showLastLogin) {
        delete user.lastLogin;
      }
    }
    
    // Get user's public projects
    const projects = await Portfolio.find({ 
      creator: userId, 
      visibility: 'public' 
    })
      .sort({ 'metrics.views': -1 })
      .limit(6)
      .select('title shortDescription category metrics.views metrics.likes thumbnail')
      .lean();
    
    // Get user's public messages
    const messages = await Guestbook.find({ 
      user: userId, 
      status: 'approved' 
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('message likes createdAt')
      .lean();
    
    // Increment profile view count
    if (!isOwnProfile) {
      await User.findByIdAndUpdate(userId, { $inc: { 'stats.profileViews': 1 } });
      
      // Track analytics
      if (currentUser) {
        await Analytics.trackEvent({
          eventType: 'profile_view',
          eventName: 'User Profile View',
          user: currentUser._id,
          sessionId: req.sessionID || 'anonymous',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          page: {
            url: req.originalUrl,
            path: `/users/${userId}`
          },
          eventData: {
            viewedUserId: userId,
            viewedUsername: user.username
          }
        });
      }
    }
    
    res.json({
      success: true,
      message: '👨‍🚀 Space traveler profile retrieved successfully!',
      data: {
        user,
        projects,
        messages,
        isOwnProfile,
        stats: {
          projectCount: projects.length,
          messageCount: messages.length
        }
      }
    });
    
  } catch (error) {
    console.error('User profile fetch error:', error);
    res.status(500).json({
      error: 'Profile Fetch Failed',
      message: '🛠️ Houston, we have a profile problem!'
    });
  }
});

// @route   PUT /api/users/:id/role
// @desc    Update user role (Admin only)
// @access  Private (Admin)
router.put('/:id/role', 
  authenticate, 
  authorize('admin'), 
  validateMongoId(),
  trackActivity,
  async (req, res) => {
    try {
      const { role } = req.body;
      
      const validRoles = ['user', 'admin', 'moderator'];
      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({
          error: 'Invalid Role',
          message: '🚫 Please provide a valid role (user, admin, moderator)!'
        });
      }
      
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User Not Found',
          message: '🌌 This space traveler doesn\'t exist!'
        });
      }
      
      // Prevent self-demotion
      if (req.user._id.toString() === user._id.toString() && role !== 'admin') {
        return res.status(400).json({
          error: 'Self-Demotion Denied',
          message: '🚫 You cannot change your own admin role!'
        });
      }
      
      const oldRole = user.role;
      user.role = role;
      await user.save();
      
      // Add achievement for role changes
      if (role === 'admin') {
        user.addAchievement(
          'Space Commander',
          'Welcome to the command center! You now have administrative powers.',
          '👑'
        );
        await user.save();
      }
      
      res.json({
        success: true,
        message: `🎖️ User role updated from ${oldRole} to ${role}!`,
        data: {
          user: {
            id: user._id,
            username: user.username,
            role: user.role,
            oldRole
          }
        }
      });
      
    } catch (error) {
      console.error('Role update error:', error);
      res.status(500).json({
        error: 'Role Update Failed',
        message: '🛠️ Houston, we have a role update problem!'
      });
    }
  }
);

// @route   PUT /api/users/:id/status
// @desc    Update user account status (Admin only)
// @access  Private (Admin)
router.put('/:id/status', 
  authenticate, 
  authorize('admin'), 
  validateMongoId(),
  trackActivity,
  async (req, res) => {
    try {
      const { isActive, reason } = req.body;
      
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!isActive || !validStatuses.includes(isActive)) {
        return res.status(400).json({
          error: 'Invalid Status',
          message: '🚫 Please provide a valid status (active, inactive, suspended)!'
        });
      }
      
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User Not Found',
          message: '🌌 This space traveler doesn\'t exist!'
        });
      }
      
      // Prevent self-suspension
      if (req.user._id.toString() === user._id.toString() && isActive !== 'active') {
        return res.status(400).json({
          error: 'Self-Action Denied',
          message: '🚫 You cannot change your own account status!'
        });
      }
      
      const oldStatus = user.isActive;
      user.isActive = isActive;
      await user.save();
      
      res.json({
        success: true,
        message: `📝 User account status updated from ${oldStatus} to ${isActive}!`,
        data: {
          user: {
            id: user._id,
            username: user.username,
            isActive: user.isActive,
            oldStatus
          },
          reason
        }
      });
      
    } catch (error) {
      console.error('Status update error:', error);
      res.status(500).json({
        error: 'Status Update Failed',
        message: '🛠️ Houston, we have a status update problem!'
      });
    }
  }
);

// @route   DELETE /api/users/:id
// @desc    Delete user account (Admin only)
// @access  Private (Admin)
router.delete('/:id', 
  authenticate, 
  authorize('admin'), 
  validateMongoId(),
  trackActivity,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User Not Found',
          message: '🌌 This space traveler doesn\'t exist!'
        });
      }
      
      // Prevent self-deletion
      if (req.user._id.toString() === user._id.toString()) {
        return res.status(400).json({
          error: 'Self-Deletion Denied',
          message: '🚫 You cannot delete your own account!'
        });
      }
      
      // Store user info for response
      const deletedUserInfo = {
        id: user._id,
        username: user.username,
        email: user.email
      };
      
      // Delete user and related data
      await Promise.all([
        User.findByIdAndDelete(req.params.id),
        Portfolio.deleteMany({ creator: req.params.id }),
        Guestbook.deleteMany({ user: req.params.id }),
        Analytics.deleteMany({ user: req.params.id })
      ]);
      
      res.json({
        success: true,
        message: '🗑️ Space traveler and all related data have been removed from the universe.',
        data: { deletedUser: deletedUserInfo }
      });
      
    } catch (error) {
      console.error('User deletion error:', error);
      res.status(500).json({
        error: 'User Deletion Failed',
        message: '🛠️ Houston, we have a deletion problem!'
      });
    }
  }
);

// @route   POST /api/users/:id/achievement
// @desc    Award achievement to user (Admin only)
// @access  Private (Admin)
router.post('/:id/achievement', 
  authenticate, 
  authorize('admin'), 
  validateMongoId(),
  async (req, res) => {
    try {
      const { name, description, icon } = req.body;
      
      if (!name || !description) {
        return res.status(400).json({
          error: 'Achievement Data Required',
          message: '🏆 Please provide achievement name and description!'
        });
      }
      
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User Not Found',
          message: '🌌 This space traveler doesn\'t exist!'
        });
      }
      
      const awarded = user.addAchievement(name, description, icon || '🏆');
      
      if (!awarded) {
        return res.status(400).json({
          error: 'Achievement Already Exists',
          message: '🏆 This achievement has already been awarded!'
        });
      }
      
      await user.save();
      
      res.json({
        success: true,
        message: '🏆 Achievement awarded successfully!',
        data: {
          achievement: user.achievements[user.achievements.length - 1],
          user: {
            id: user._id,
            username: user.username
          }
        }
      });
      
    } catch (error) {
      console.error('Achievement award error:', error);
      res.status(500).json({
        error: 'Achievement Award Failed',
        message: '🛠️ Houston, we have an achievement problem!'
      });
    }
  }
);

// @route   GET /api/users/:id/activity
// @desc    Get user activity timeline
// @access  Private (Own profile or Admin)
router.get('/:id/activity', 
  authenticate, 
  validateMongoId(),
  async (req, res) => {
    try {
      const userId = req.params.id;
      const { limit = 20, days = 30 } = req.query;
      
      // Check permissions
      const isOwnProfile = req.user._id.toString() === userId;
      const isAdmin = req.user.role === 'admin';
      
      if (!isOwnProfile && !isAdmin) {
        return res.status(403).json({
          error: 'Access Denied',
          message: '🚫 You can only view your own activity timeline!'
        });
      }
      
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const activity = await Analytics.find({
        user: userId,
        timestamp: { $gte: startDate }
      })
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .select('eventType eventName timestamp page.path eventData')
        .lean();
      
      res.json({
        success: true,
        message: '📊 User activity timeline retrieved successfully!',
        data: {
          activity,
          period: { days: parseInt(days), startDate },
          totalEvents: activity.length
        }
      });
      
    } catch (error) {
      console.error('User activity fetch error:', error);
      res.status(500).json({
        error: 'Activity Fetch Failed',
        message: '🛠️ Houston, we have an activity problem!'
      });
    }
  }
);

// @route   GET /api/users/me
// @desc    Get current user's profile
// @access  Private
router.get('/me/profile', 
  authenticate,
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id)
        .select('-password')
        .lean();
      
      if (!user) {
        return res.status(404).json({
          error: 'User Not Found',
          message: '🌌 Your profile couldn\'t be found in the cosmic database!'
        });
      }
      
      // Get user's stats
      const [projectCount, messageCount] = await Promise.all([
        Portfolio.countDocuments({ creator: user._id }),
        Guestbook.countDocuments({ user: user._id, status: 'approved' })
      ]);
      
      res.json({
        success: true,
        message: '👨‍🚀 Your cosmic profile retrieved successfully!',
        data: {
          user,
          stats: {
            ...user.stats,
            projectCount,
            messageCount
          },
          cosmicRank: {
            level: 'Space Explorer',
            icon: '🌟'
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
  }
);

// @route   PUT /api/users/me
// @desc    Update current user's profile
// @access  Private
router.put('/me/profile', 
  authenticate,
  trackActivity,
  async (req, res) => {
    try {
      const updates = {};
      const { 
        displayName, 
        firstName, 
        lastName, 
        bio, 
        location, 
        website, 
        github, 
        linkedin, 
        twitter,
        avatar 
      } = req.body;
      
      // Update profile fields
      if (displayName !== undefined) updates['profile.displayName'] = displayName;
      if (firstName !== undefined) updates['profile.firstName'] = firstName;
      if (lastName !== undefined) updates['profile.lastName'] = lastName;
      if (bio !== undefined) updates['profile.bio'] = bio;
      if (location !== undefined) updates['profile.location'] = location;
      if (website !== undefined) updates['profile.website'] = website;
      if (github !== undefined) updates['profile.github'] = github;
      if (linkedin !== undefined) updates['profile.linkedin'] = linkedin;
      if (twitter !== undefined) updates['profile.twitter'] = twitter;
      if (avatar !== undefined) updates['profile.avatar'] = avatar;
      
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password');
      
      res.json({
        success: true,
        message: '✨ Your cosmic profile has been updated!',
        data: { user }
      });
      
    } catch (error) {
      console.error('Profile update error:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation Error',
          message: Object.values(error.errors).map(e => e.message).join(', ')
        });
      }
      
      res.status(500).json({
        error: 'Profile Update Failed',
        message: '🛠️ Houston, we have a profile update problem!'
      });
    }
  }
);

// @route   PUT /api/users/me/preferences
// @desc    Update user preferences (theme, notifications, privacy)
// @access  Private
router.put('/me/preferences', 
  authenticate,
  async (req, res) => {
    try {
      const { theme, notifications, privacy } = req.body;
      const updates = {};
      
      if (theme) {
        const validThemes = ['cosmic-dark', 'cosmic-light', 'nebula', 'galaxy'];
        if (validThemes.includes(theme)) {
          updates['preferences.theme'] = theme;
        }
      }
      
      if (notifications) {
        if (notifications.email !== undefined) updates['preferences.notifications.email'] = notifications.email;
        if (notifications.push !== undefined) updates['preferences.notifications.push'] = notifications.push;
        if (notifications.guestbook !== undefined) updates['preferences.notifications.guestbook'] = notifications.guestbook;
        if (notifications.portfolio !== undefined) updates['preferences.notifications.portfolio'] = notifications.portfolio;
      }
      
      if (privacy) {
        if (privacy.showEmail !== undefined) updates['preferences.privacy.showEmail'] = privacy.showEmail;
        if (privacy.showLastLogin !== undefined) updates['preferences.privacy.showLastLogin'] = privacy.showLastLogin;
        if (privacy.allowMessages !== undefined) updates['preferences.privacy.allowMessages'] = privacy.allowMessages;
      }
      
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true }
      ).select('preferences');
      
      res.json({
        success: true,
        message: '⚙️ Your preferences have been updated!',
        data: { preferences: user.preferences }
      });
      
    } catch (error) {
      console.error('Preferences update error:', error);
      res.status(500).json({
        error: 'Preferences Update Failed',
        message: '🛠️ Houston, we have a preferences problem!'
      });
    }
  }
);

// @route   POST /api/users/me/change-password
// @desc    Change user password
// @access  Private
router.post('/me/change-password', 
  authenticate,
  trackActivity,
  async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      // Validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          error: 'Missing Fields',
          message: '🚫 Please provide current password, new password, and confirmation!'
        });
      }
      
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          error: 'Password Mismatch',
          message: '🚫 New password and confirmation don\'t match!'
        });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({
          error: 'Weak Password',
          message: '🚫 New password must be at least 6 characters long!'
        });
      }
      
      // Get user with password
      const user = await User.findById(req.user._id).select('+password');
      
      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          error: 'Invalid Password',
          message: '🚫 Current password is incorrect!'
        });
      }
      
      // Update password
      user.password = newPassword;
      await user.save();
      
      res.json({
        success: true,
        message: '🔐 Your password has been changed successfully!'
      });
      
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({
        error: 'Password Change Failed',
        message: '🛠️ Houston, we have a password problem!'
      });
    }
  }
);

// @route   POST /api/users/me/upload-avatar
// @desc    Upload user avatar
// @access  Private
router.post('/me/upload-avatar', 
  authenticate,
  async (req, res) => {
    try {
      const { avatar } = req.body;
      
      if (!avatar) {
        return res.status(400).json({
          error: 'No Avatar Provided',
          message: '🚫 Please provide an avatar URL or data!'
        });
      }
      
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { 'profile.avatar': avatar } },
        { new: true }
      ).select('profile.avatar username');
      
      res.json({
        success: true,
        message: '🖼️ Your avatar has been updated!',
        data: { 
          avatar: user.profile.avatar,
          username: user.username
        }
      });
      
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({
        error: 'Avatar Upload Failed',
        message: '🛠️ Houston, we have an avatar problem!'
      });
    }
  }
);

// @route   DELETE /api/users/me
// @desc    Delete current user's account
// @access  Private
router.delete('/me/account', 
  authenticate,
  async (req, res) => {
    try {
      const { password, confirmation } = req.body;
      
      if (!password) {
        return res.status(400).json({
          error: 'Password Required',
          message: '🚫 Please provide your password to confirm account deletion!'
        });
      }
      
      if (confirmation !== 'DELETE MY ACCOUNT') {
        return res.status(400).json({
          error: 'Confirmation Required',
          message: '🚫 Please type "DELETE MY ACCOUNT" to confirm!'
        });
      }
      
      // Get user with password
      const user = await User.findById(req.user._id).select('+password');
      
      // Verify password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          error: 'Invalid Password',
          message: '🚫 Password is incorrect!'
        });
      }
      
      // Store user info for response
      const deletedUserInfo = {
        username: user.username,
        email: user.email
      };
      
      // Delete user and all related data
      await Promise.all([
        User.findByIdAndDelete(req.user._id),
        Portfolio.deleteMany({ creator: req.user._id }),
        Guestbook.deleteMany({ user: req.user._id }),
        Analytics.deleteMany({ user: req.user._id })
      ]);
      
      res.json({
        success: true,
        message: '🗑️ Your account and all data have been permanently deleted from the cosmic database.',
        data: { deletedUser: deletedUserInfo }
      });
      
    } catch (error) {
      console.error('Account deletion error:', error);
      res.status(500).json({
        error: 'Account Deletion Failed',
        message: '🛠️ Houston, we have a deletion problem!'
      });
    }
  }
);

module.exports = router;