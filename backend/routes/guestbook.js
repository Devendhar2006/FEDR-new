const express = require('express');
const router = express.Router();
const Guestbook = require('../models/Guestbook');
const Analytics = require('../models/Analytics');
const { 
  authenticate, 
  authorize, 
  optionalAuth,
  trackActivity 
} = require('../middleware/auth');
const { 
  validateGuestbookMessage, 
  validateMongoId, 
  validatePagination 
} = require('../middleware/validation');

// @route   GET /api/guestbook
// @desc    Get approved guestbook messages
// @access  Public
router.get('/', validatePagination, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      featured 
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build filter
    let filter = { status: 'approved', isSpam: false };
    if (category) filter.category = category;
    if (featured === 'true') filter.featured = true;
    
    const [messages, total] = await Promise.all([
      Guestbook.find(filter)
        .populate('user', 'username profile.avatar cosmicRank')
        .sort({ featured: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Guestbook.countDocuments(filter)
    ]);
    
    // Track page view
    await Analytics.trackEvent({
      eventType: 'page_view',
      eventName: 'Guestbook View',
      sessionId: req.sessionID || 'anonymous',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      page: {
        url: req.originalUrl,
        path: '/guestbook'
      },
      eventData: { category, featured }
    });
    
    res.json({
      success: true,
      message: '💫 Cosmic transmissions retrieved successfully!',
      data: {
        messages,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalMessages: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        filters: { category, featured }
      }
    });
    
  } catch (error) {
    console.error('Guestbook fetch error:', error);
    res.status(500).json({
      error: 'Guestbook Fetch Failed',
      message: '🛠️ Houston, we have a guestbook problem!'
    });
  }
});

// @route   GET /api/guestbook/featured
// @desc    Get featured guestbook messages
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const messages = await Guestbook.getFeatured(parseInt(limit));
    
    res.json({
      success: true,
      message: '⭐ Featured cosmic transmissions retrieved successfully!',
      data: { messages }
    });
    
  } catch (error) {
    console.error('Featured messages fetch error:', error);
    res.status(500).json({
      error: 'Featured Messages Fetch Failed',
      message: '🛠️ Houston, we have a featured messages problem!'
    });
  }
});

// @route   GET /api/guestbook/categories
// @desc    Get message categories with counts
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Guestbook.aggregate([
      { $match: { status: 'approved', isSpam: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      message: '📊 Message categories retrieved successfully!',
      data: { categories }
    });
    
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({
      error: 'Categories Fetch Failed',
      message: '🛠️ Houston, we have a categories problem!'
    });
  }
});

// @route   POST /api/guestbook
// @desc    Post new guestbook message
// @access  Public
router.post('/', optionalAuth, validateGuestbookMessage, async (req, res) => {
  try {
    const { name, email, message, category = 'general', contact } = req.body;
    
    // Check for rate limiting (basic implementation)
    const recentMessages = await Guestbook.countDocuments({
      ipAddress: req.ip,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    });
    
    if (recentMessages >= 5) {
      return res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: '🚀 Slow down, space traveler! You can only send 5 messages per hour.',
        retryAfter: 3600
      });
    }
    
    const messageData = {
      name: name.trim(),
      email: email ? email.trim() : undefined,
      message: message.trim(),
      category,
      contact,
      user: req.user?._id || null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      location: {
        // In a real app, you'd use a geolocation service
        country: req.get('CF-IPCountry') || 'Unknown',
        timezone: req.get('CF-Timezone') || 'UTC'
      }
    };
    
    const guestbookEntry = new Guestbook(messageData);
    await guestbookEntry.save();
    
    // Update user stats if authenticated
    if (req.user) {
      req.user.stats.messagesPosted += 1;
      await req.user.save();
      
      // Add social butterfly achievement
      if (req.user.stats.messagesPosted >= 10) {
        req.user.addAchievement(
          'Social Butterfly',
          'You\'ve shared your cosmic thoughts 10 times! Your voice echoes across the universe.',
          '🦋'
        );
        await req.user.save();
      }
    }
    
    // Populate user data if available
    if (guestbookEntry.user) {
      await guestbookEntry.populate('user', 'username profile.avatar cosmicRank');
    }
    
    // Track analytics
    await Analytics.trackEvent({
      eventType: 'message_post',
      eventName: 'Guestbook Message Posted',
      user: req.user?._id || null,
      sessionId: req.sessionID || 'anonymous',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      page: {
        url: req.originalUrl,
        path: '/guestbook'
      },
      eventData: {
        messageCategory: category,
        messageLength: message.length,
        hasEmail: !!email,
        hasContact: !!contact
      },
      conversion: {
        isConversion: true,
        conversionType: 'contact'
      }
    });
    
    // Emit real-time event (Socket.IO)
    if (req.app.get('io')) {
      req.app.get('io').emit('new_guestbook_message', {
        id: guestbookEntry._id,
        name: guestbookEntry.authorName,
        message: guestbookEntry.excerpt,
        category: guestbookEntry.category,
        timestamp: guestbookEntry.createdAt
      });
    }
    
    res.status(201).json({
      success: true,
      message: '🚀 Your cosmic transmission has been sent successfully! Thank you for joining our universe.',
      data: { 
        message: guestbookEntry,
        status: guestbookEntry.status,
        spamScore: guestbookEntry.spamScore
      }
    });
    
  } catch (error) {
    console.error('Guestbook message creation error:', error);
    res.status(500).json({
      error: 'Message Transmission Failed',
      message: '🛠️ Houston, we have a transmission problem! Please try again.'
    });
  }
});

// @route   GET /api/guestbook/:id
// @desc    Get single guestbook message
// @access  Public
router.get('/:id', validateMongoId(), async (req, res) => {
  try {
    const message = await Guestbook.findById(req.params.id)
      .populate('user', 'username profile.avatar cosmicRank')
      .populate('replies.user', 'username profile.avatar')
      .lean();
    
    if (!message) {
      return res.status(404).json({
        error: 'Message Not Found',
        message: '🌌 This cosmic transmission doesn\'t exist in our universe!'
      });
    }
    
    if (message.status !== 'approved' && !message.isSpam) {
      return res.status(404).json({
        error: 'Message Not Available',
        message: '🚫 This cosmic transmission is not available!'
      });
    }
    
    // Increment view count
    await Guestbook.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    
    res.json({
      success: true,
      message: '💫 Cosmic transmission retrieved successfully!',
      data: { message }
    });
    
  } catch (error) {
    console.error('Message fetch error:', error);
    res.status(500).json({
      error: 'Message Fetch Failed',
      message: '🛠️ Houston, we have a message problem!'
    });
  }
});

// @route   POST /api/guestbook/:id/like
// @desc    Toggle like on guestbook message
// @access  Private
router.post('/:id/like', authenticate, validateMongoId(), async (req, res) => {
  try {
    const message = await Guestbook.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        error: 'Message Not Found',
        message: '🌌 This cosmic transmission doesn\'t exist!'
      });
    }
    
    if (message.status !== 'approved') {
      return res.status(403).json({
        error: 'Message Not Available',
        message: '🚫 You cannot like this message!'
      });
    }
    
    const result = message.toggleLike(req.user._id);
    await message.save();
    
    // Track analytics
    await Analytics.trackEvent({
      eventType: 'message_like',
      eventName: result.liked ? 'Message Liked' : 'Message Unliked',
      user: req.user._id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      page: {
        url: req.originalUrl,
        path: `/guestbook/${req.params.id}/like`
      },
      eventData: {
        messageId: message._id,
        action: result.liked ? 'like' : 'unlike'
      }
    });
    
    res.json({
      success: true,
      message: result.liked ? '❤️ Message liked!' : '💔 Like removed!',
      data: {
        liked: result.liked,
        likesCount: result.likesCount
      }
    });
    
  } catch (error) {
    console.error('Message like error:', error);
    res.status(500).json({
      error: 'Like Action Failed',
      message: '🛠️ Houston, we have a like problem!'
    });
  }
});

// @route   POST /api/guestbook/:id/reply
// @desc    Reply to guestbook message
// @access  Private
router.post('/:id/reply', authenticate, validateMongoId(), async (req, res) => {
  try {
    const { message: replyMessage } = req.body;
    
    if (!replyMessage || replyMessage.trim().length < 1) {
      return res.status(400).json({
        error: 'Reply Required',
        message: '💬 Please provide a reply message!'
      });
    }
    
    if (replyMessage.length > 500) {
      return res.status(400).json({
        error: 'Reply Too Long',
        message: '💬 Reply cannot exceed 500 characters!'
      });
    }
    
    const message = await Guestbook.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        error: 'Message Not Found',
        message: '🌌 This cosmic transmission doesn\'t exist!'
      });
    }
    
    if (message.status !== 'approved') {
      return res.status(403).json({
        error: 'Cannot Reply',
        message: '🚫 You cannot reply to this message!'
      });
    }
    
    await message.addReply(req.user._id, req.user.username, replyMessage.trim());
    
    // Populate the new reply
    await message.populate('replies.user', 'username profile.avatar');
    
    const newReply = message.replies[message.replies.length - 1];
    
    res.status(201).json({
      success: true,
      message: '💬 Your cosmic reply has been sent!',
      data: { reply: newReply }
    });
    
  } catch (error) {
    console.error('Reply creation error:', error);
    res.status(500).json({
      error: 'Reply Creation Failed',
      message: '🛠️ Houston, we have a reply problem!'
    });
  }
});

// @route   POST /api/guestbook/:id/flag
// @desc    Flag a guestbook message
// @access  Private
router.post('/:id/flag', authenticate, validateMongoId(), async (req, res) => {
  try {
    const { reason, description } = req.body;
    
    const validReasons = ['spam', 'inappropriate', 'offensive', 'misleading', 'other'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({
        error: 'Invalid Flag Reason',
        message: '🚫 Please provide a valid reason for flagging!'
      });
    }
    
    const message = await Guestbook.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        error: 'Message Not Found',
        message: '🌌 This cosmic transmission doesn\'t exist!'
      });
    }
    
    const flagged = message.flagMessage(req.user._id, reason, description);
    
    if (!flagged) {
      return res.status(400).json({
        error: 'Already Flagged',
        message: '🚩 You have already flagged this message!'
      });
    }
    
    await message.save();
    
    res.json({
      success: true,
      message: '🚩 Message flagged successfully! Our moderation team will review it.',
      data: { flagged: true }
    });
    
  } catch (error) {
    console.error('Message flag error:', error);
    res.status(500).json({
      error: 'Flag Action Failed',
      message: '🛠️ Houston, we have a flagging problem!'
    });
  }
});

// @route   GET /api/guestbook/search
// @desc    Search guestbook messages
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q: query, category, limit = 20 } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: 'Invalid Search Query',
        message: '🔍 Search query must be at least 2 characters long!'
      });
    }
    
    const messages = await Guestbook.searchMessages(query.trim(), { 
      category, 
      limit: parseInt(limit) 
    });
    
    res.json({
      success: true,
      message: `🔍 Found ${messages.length} cosmic transmissions matching your search!`,
      data: { 
        messages,
        query: query.trim(),
        category,
        resultCount: messages.length
      }
    });
    
  } catch (error) {
    console.error('Guestbook search error:', error);
    res.status(500).json({
      error: 'Search Failed',
      message: '🛠️ Houston, we have a search problem!'
    });
  }
});

// @route   DELETE /api/guestbook/:id
// @desc    Delete guestbook message (Admin only)
// @access  Private (Admin)
router.delete('/:id', 
  authenticate, 
  authorize('admin', 'moderator'), 
  validateMongoId(),
  trackActivity,
  async (req, res) => {
    try {
      const message = await Guestbook.findById(req.params.id);
      
      if (!message) {
        return res.status(404).json({
          error: 'Message Not Found',
          message: '🌌 This cosmic transmission doesn\'t exist!'
        });
      }
      
      await Guestbook.findByIdAndDelete(req.params.id);
      
      res.json({
        success: true,
        message: '🗑️ Cosmic transmission has been removed from the universe.',
        data: { deletedId: req.params.id }
      });
      
    } catch (error) {
      console.error('Message deletion error:', error);
      res.status(500).json({
        error: 'Message Deletion Failed',
        message: '🛠️ Houston, we have a deletion problem!'
      });
    }
  }
);

// @route   PUT /api/guestbook/:id/moderate
// @desc    Moderate guestbook message (Admin only)
// @access  Private (Admin)
router.put('/:id/moderate', 
  authenticate, 
  authorize('admin', 'moderator'), 
  validateMongoId(),
  trackActivity,
  async (req, res) => {
    try {
      const { status, reason, featured } = req.body;
      
      const validStatuses = ['approved', 'rejected', 'flagged', 'hidden'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Invalid Status',
          message: '🚫 Please provide a valid moderation status!'
        });
      }
      
      const message = await Guestbook.findById(req.params.id);
      
      if (!message) {
        return res.status(404).json({
          error: 'Message Not Found',
          message: '🌌 This cosmic transmission doesn\'t exist!'
        });
      }
      
      message.status = status;
      message.moderatedBy = req.user._id;
      message.moderatedAt = new Date();
      if (reason) message.moderationReason = reason;
      if (typeof featured === 'boolean') message.featured = featured;
      
      await message.save();
      
      res.json({
        success: true,
        message: `📋 Message has been ${status} successfully!`,
        data: { 
          message: {
            id: message._id,
            status: message.status,
            featured: message.featured,
            moderatedAt: message.moderatedAt
          }
        }
      });
      
    } catch (error) {
      console.error('Message moderation error:', error);
      res.status(500).json({
        error: 'Moderation Failed',
        message: '🛠️ Houston, we have a moderation problem!'
      });
    }
  }
);

module.exports = router;