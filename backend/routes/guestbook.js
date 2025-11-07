const express = require('express');
const router = express.Router();
const GuestbookEntry = require('../models/GuestbookEntry');
const Analytics = require('../models/Analytics');

// Helper function to get client IP
const getClientIP = (req) => {
  return req.ip || req.connection.remoteAddress || 'unknown';
};

// @route   GET /api/guestbook
// @desc    Get guestbook entries with filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      filter = 'all', // all, project-comments, general
      sort = 'newest' // newest, oldest, most-liked
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build filter query
    let query = { approved: true };
    
    if (filter === 'project-comments') {
      query.projectId = { $ne: null };
    } else if (filter === 'general') {
      query.projectId = null;
    }
    
    // Build sort query
    let sortQuery = {};
    switch (sort) {
      case 'oldest':
        sortQuery = { createdAt: 1 };
        break;
      case 'most-liked':
        sortQuery = { likes: -1, createdAt: -1 };
        break;
      default: // newest
        sortQuery = { pinned: -1, createdAt: -1 };
    }
    
    const [entries, total] = await Promise.all([
      GuestbookEntry.find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      GuestbookEntry.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      message: '📖 Guestbook entries retrieved!',
      data: {
        entries,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalEntries: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
    
  } catch (error) {
    console.error('Guestbook fetch error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: '🛠️ Error loading guestbook entries!'
    });
  }
});

// @route   GET /api/guestbook/stats
// @desc    Get guestbook statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const [total, lastWeek, topUsers] = await Promise.all([
      GuestbookEntry.countDocuments({ approved: true }),
      GuestbookEntry.countDocuments({ 
        approved: true,
        createdAt: { $gte: sevenDaysAgo }
      }),
      GuestbookEntry.aggregate([
        { $match: { approved: true } },
        { $group: { 
          _id: '$name', 
          count: { $sum: 1 },
          avatar: { $first: '$avatar' }
        }},
        { $sort: { count: -1 } },
        { $limit: 1 }
      ])
    ]);
    
    const topUser = topUsers[0] || { _id: 'No entries yet', count: 0 };
    
    res.json({
      success: true,
      data: {
        total,
        lastWeek,
        topUser: {
          name: topUser._id,
          count: topUser.count,
          avatar: topUser.avatar
        }
      }
    });
    
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({
      error: 'Stats Failed',
      message: '🛠️ Error loading statistics!'
    });
  }
});

// @route   POST /api/guestbook
// @desc    Create new guestbook entry
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      email, 
      avatar,
      message, 
      projectId,
      projectTitle,
      projectType
    } = req.body;
    
    // Validation
    if (!name || !message) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '⚠️ Name and message are required!'
      });
    }
    
    if (message.length > 240) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '⚠️ Message must be 240 characters or less!'
      });
    }
    
    // Rate limiting check
    const clientIP = getClientIP(req);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentEntries = await GuestbookEntry.countDocuments({
      ipAddress: clientIP,
      createdAt: { $gte: oneHourAgo }
    });
    
    if (recentEntries >= 5) {
      return res.status(429).json({
        error: 'Rate Limit',
        message: '⏰ You can only post 5 entries per hour. Please wait!'
      });
    }
    
    // Create entry
    const entry = new GuestbookEntry({
      name: name.trim(),
      email: email ? email.trim() : undefined,
      avatar: avatar || undefined,
      message: message.trim(),
      projectId: projectId || undefined,
      projectTitle: projectTitle || undefined,
      projectType: projectType || 'general',
      ipAddress: clientIP,
      userAgent: req.get('User-Agent')
    });
    
    await entry.save();
    
    // Track analytics
    await Analytics.trackEvent({
      eventType: 'guestbook_entry',
      eventName: 'Guestbook Entry Created',
      sessionId: req.sessionID || 'anonymous',
      ipAddress: clientIP,
      userAgent: req.get('User-Agent'),
      page: {
        url: req.originalUrl,
        path: '/guestbook'
      },
      eventData: {
        hasProject: !!projectId,
        projectType: projectType || 'general',
        messageLength: message.length
      }
    });
    
    res.status(201).json({
      success: true,
      message: '✅ Entry added to guestbook!',
      data: { entry }
    });
    
  } catch (error) {
    console.error('Entry creation error:', error);
    res.status(500).json({
      error: 'Creation Failed',
      message: '🛠️ Error creating entry!'
    });
  }
});

// @route   POST /api/guestbook/:id/like
// @desc    Toggle like on entry
// @access  Public
router.post('/:id/like', async (req, res) => {
  try {
    const entry = await GuestbookEntry.findById(req.params.id);
    
    if (!entry) {
      return res.status(404).json({
        error: 'Not Found',
        message: '🌌 Entry not found!'
      });
    }
    
    const clientIP = getClientIP(req);
    const hasLiked = entry.likedBy.includes(clientIP);
    
    if (hasLiked) {
      // Unlike
      entry.likes = Math.max(0, entry.likes - 1);
      entry.likedBy = entry.likedBy.filter(ip => ip !== clientIP);
    } else {
      // Like
      entry.likes += 1;
      entry.likedBy.push(clientIP);
    }
    
    await entry.save();
    
    res.json({
      success: true,
      message: hasLiked ? '💔 Like removed' : '❤️ Entry liked!',
      data: {
        liked: !hasLiked,
        likes: entry.likes
      }
    });
    
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({
      error: 'Like Failed',
      message: '🛠️ Error processing like!'
    });
  }
});

// @route   POST /api/guestbook/:id/reply
// @desc    Add reply to entry
// @access  Public
router.post('/:id/reply', async (req, res) => {
  try {
    const { name, email, avatar, message, isAdmin } = req.body;
    
    if (!name || !message) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '⚠️ Name and message are required!'
      });
    }
    
    if (message.length > 500) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '⚠️ Reply must be 500 characters or less!'
      });
    }
    
    const entry = await GuestbookEntry.findById(req.params.id);
    
    if (!entry) {
      return res.status(404).json({
        error: 'Not Found',
        message: '🌌 Entry not found!'
      });
    }
    
    entry.replies.push({
      name: name.trim(),
      email: email ? email.trim() : undefined,
      avatar: avatar || undefined,
      message: message.trim(),
      isAdmin: isAdmin || false,
      createdAt: new Date()
    });
    
    await entry.save();
    
    res.status(201).json({
      success: true,
      message: '💬 Reply added!',
      data: { 
        reply: entry.replies[entry.replies.length - 1]
      }
    });
    
  } catch (error) {
    console.error('Reply error:', error);
    res.status(500).json({
      error: 'Reply Failed',
      message: '🛠️ Error adding reply!'
    });
  }
});

// @route   POST /api/guestbook/:id/report
// @desc    Report entry (admin feature)
// @access  Public
router.post('/:id/report', async (req, res) => {
  try {
    const entry = await GuestbookEntry.findById(req.params.id);
    
    if (!entry) {
      return res.status(404).json({
        error: 'Not Found',
        message: '🌌 Entry not found!'
      });
    }
    
    entry.reported = true;
    await entry.save();
    
    res.json({
      success: true,
      message: '🚩 Entry reported. Admin will review it.'
    });
    
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({
      error: 'Report Failed',
      message: '🛠️ Error reporting entry!'
    });
  }
});

// @route   GET /api/projects/:id/comments
// @desc    Get comments for specific project
// @access  Public
router.get('/projects/:id/comments', async (req, res) => {
  try {
    const entries = await GuestbookEntry.find({
      projectId: req.params.id,
      approved: true
    })
    .sort({ createdAt: -1 })
    .lean();
    
    res.json({
      success: true,
      message: '💬 Project comments retrieved!',
      data: { entries, count: entries.length }
    });
    
  } catch (error) {
    console.error('Project comments fetch error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: '🛠️ Error loading comments!'
    });
  }
});

// @route   POST /api/projects/:id/comments
// @desc    Add comment to project (saves to guestbook)
// @access  Public
router.post('/projects/:id/comments', async (req, res) => {
  try {
    const { name, email, avatar, message, projectTitle } = req.body;
    
    if (!name || !message) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '⚠️ Name and message are required!'
      });
    }
    
    // Create guestbook entry with project link
    const entry = new GuestbookEntry({
      name: name.trim(),
      email: email ? email.trim() : undefined,
      avatar: avatar || undefined,
      message: message.trim(),
      projectId: req.params.id,
      projectTitle: projectTitle || 'Unknown Project',
      projectType: 'project',
      ipAddress: getClientIP(req),
      userAgent: req.get('User-Agent')
    });
    
    await entry.save();
    
    res.status(201).json({
      success: true,
      message: '✅ Comment added!',
      data: { entry }
    });
    
  } catch (error) {
    console.error('Project comment error:', error);
    res.status(500).json({
      error: 'Comment Failed',
      message: '🛠️ Error adding comment!'
    });
  }
});

// @route   DELETE /api/guestbook/:id
// @desc    Delete entry (admin only)
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const entry = await GuestbookEntry.findByIdAndDelete(req.params.id);
    
    if (!entry) {
      return res.status(404).json({
        error: 'Not Found',
        message: '🌌 Entry not found!'
      });
    }
    
    res.json({
      success: true,
      message: '🗑️ Entry deleted!',
      data: { deletedId: req.params.id }
    });
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      error: 'Delete Failed',
      message: '🛠️ Error deleting entry!'
    });
  }
});

// @route   PUT /api/guestbook/:id/pin
// @desc    Pin/unpin entry (admin only)
// @access  Private
router.put('/:id/pin', async (req, res) => {
  try {
    const entry = await GuestbookEntry.findById(req.params.id);
    
    if (!entry) {
      return res.status(404).json({
        error: 'Not Found',
        message: '🌌 Entry not found!'
      });
    }
    
    entry.pinned = !entry.pinned;
    await entry.save();
    
    res.json({
      success: true,
      message: entry.pinned ? '📌 Entry pinned!' : '📌 Entry unpinned!',
      data: { pinned: entry.pinned }
    });
    
  } catch (error) {
    console.error('Pin error:', error);
    res.status(500).json({
      error: 'Pin Failed',
      message: '🛠️ Error pinning entry!'
    });
  }
});

module.exports = router;
