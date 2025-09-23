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

module.exports = router;