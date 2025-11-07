const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');
const ItemComment = require('../models/ItemComment');
const Analytics = require('../models/Analytics');
const { 
  authenticate, 
  authorize, 
  optionalAuth, 
  checkResourceOwnership,
  trackActivity 
} = require('../middleware/auth');
const { 
  validatePortfolioCreate, 
  validatePortfolioUpdate, 
  validateMongoId, 
  validatePagination,
  validateSearch 
} = require('../middleware/validation');

// @route   GET /api/portfolio
// @desc    Get all public portfolio projects
// @access  Public
router.get('/', optionalAuth, validatePagination, async (req, res) => {
  try {
    console.log('🌟 ========== GET /api/portfolio REQUEST ==========');
    console.log('👤 req.user:', req.user ? { _id: req.user._id, username: req.user.username } : 'NOT AUTHENTICATED');
    console.log('🔑 Authorization header:', req.headers.authorization ? 'Present ✓' : 'MISSING ✗');
    console.log('📋 Query params:', req.query);
    
    const { 
      page = 1, 
      limit = 12, 
      sortParam = 'newest', 
      category, 
      featured, 
      status, // Don't default to 'completed' - let all items show
      search,
      myItems // Filter to show only user's own items
    } = req.query;
    
    console.log('🎯 myItems parameter:', myItems);
    
    // Map frontend sort values to MongoDB sort format
    const sortMap = {
      'newest': '-createdAt',
      'oldest': 'createdAt',
      'az': 'title',
      'za': '-title',
      'views': '-metrics.views',
      'likes': '-metrics.likes',
      'trending': '-metrics.views'
    };
    
    // Use sortParam if provided, otherwise use sort (for backward compatibility)
    const sort = sortMap[req.query.sort || sortParam] || req.query.sort || '-createdAt';
    
    // Build filter object
    const filter = {};
    
    // IMPORTANT: Filter by creator if user is authenticated and myItems is true
    // This ensures users only see their own items by default
    console.log('🔍 Checking myItems filter...');
    console.log('   myItems === "true"?', myItems === 'true');
    console.log('   req.user exists?', !!req.user);
    
    if (myItems === 'true' && req.user) {
      filter.creator = req.user._id;
      console.log('✅ FILTERING BY CREATOR:', req.user._id);
      console.log('✅ Username:', req.user.username);
    } else {
      console.log('❌ NOT FILTERING BY CREATOR!');
      if (myItems !== 'true') console.log('   Reason: myItems is not "true", it is:', myItems);
      if (!req.user) console.log('   Reason: req.user is not set (user not authenticated)');
    }
    
    // For debugging: Show all items to debug - remove visibility filter
    // TODO: Re-enable visibility filter after confirming items are saved
    // filter.$or = [
    //   { visibility: 'public' },
    //   { visibility: { $exists: false } }
    // ];
    
    // Additional filters
    const additionalFilters = {};
    if (category) additionalFilters.category = category;
    if (featured === 'true') additionalFilters.featured = true;
    // Only filter by status if explicitly provided - don't default filter
    if (status && status !== 'all') additionalFilters.status = status;
    
    // Handle search
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      additionalFilters.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { shortDescription: searchRegex },
        { tags: { $in: [searchRegex] } },
        { keywords: { $in: [searchRegex] } }
      ];
    }
    
    // Combine filters
    if (Object.keys(additionalFilters).length > 0) {
      // Build andConditions array
      const andConditions = [];
      
      // CRITICAL: Add creator filter first if it exists
      if (filter.creator) {
        andConditions.push({ creator: filter.creator });
      }
      
      // Add visibility filter if it exists
      if (filter.$or && filter.$or.length > 0) {
        andConditions.push({ $or: filter.$or });
      }
      
      // Add non-$or filters
      Object.entries(additionalFilters).forEach(([key, value]) => {
        if (key !== '$or') {
          andConditions.push({ [key]: value });
        }
      });
      
      // Handle search $or separately
      if (additionalFilters.$or) {
        andConditions.push({ $or: additionalFilters.$or });
      }
      
      // Only use $and if we have conditions
      if (andConditions.length > 0) {
        filter.$and = andConditions;
        if (filter.$or) delete filter.$or;
        if (filter.creator) delete filter.creator; // Remove from root since it's in $and
      } else {
        // Merge additionalFilters directly into filter
        Object.assign(filter, additionalFilters);
        if (filter.$or) delete filter.$or;
      }
    } else if (filter.$or && filter.$or.length > 0) {
      // No additional filters, but we have visibility filter - keep it as is
    } else {
      // No filters at all except creator - keep filter as is (creator will be preserved)
    }
    
    const skip = (page - 1) * limit;
    
    // Debug: Log the FINAL filter being used
    console.log('🎯 ========== FINAL QUERY FILTER ==========');
    console.log(JSON.stringify(filter, null, 2));
    console.log('==========================================');
    console.log('📊 Sort:', sort);
    console.log('📄 Page:', page, 'Limit:', limit, 'Skip:', skip);
    
    // Get projects with pagination
    const [projects, total] = await Promise.all([
      Portfolio.find(filter)
        .populate('creator', 'username profile.avatar profile.fullName')
        .populate('comments.user', 'username profile.avatar')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Portfolio.countDocuments(filter)
    ]);
    
    // Debug: Log results
    console.log(`📊 Found ${total} total items, returning ${projects.length} items`);
    if (projects.length > 0) {
      console.log('📋 First item sample:', {
        _id: projects[0]._id,
        title: projects[0].title,
        itemType: projects[0].itemType,
        visibility: projects[0].visibility,
        category: projects[0].category
      });
    } else {
      // Try to find ANY items without filters
      const allItems = await Portfolio.countDocuments({});
      console.log(`⚠️ No items found with filter. Total items in database: ${allItems}`);
      if (allItems > 0) {
        const sampleItem = await Portfolio.findOne({}).lean();
        console.log('📋 Sample item from database:', {
          _id: sampleItem._id,
          title: sampleItem.title,
          itemType: sampleItem.itemType,
          visibility: sampleItem.visibility,
          category: sampleItem.category,
          status: sampleItem.status
        });
      }
    }
    
    // Add user interaction data if authenticated
    if (req.user) {
      projects.forEach(project => {
        project.isLikedByUser = project.likedBy?.some(like => 
          like.user.toString() === req.user._id.toString()
        ) || false;
      });
    }
    
    // Track analytics
    if (req.user) {
      Analytics.trackEvent({
        eventType: 'page_view',
        eventName: 'Portfolio Gallery View',
        user: req.user._id,
        sessionId: req.sessionID || 'anonymous',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        page: {
          url: req.originalUrl,
          path: '/portfolio'
        },
        eventData: { category, featured, search }
      });
    }
    
    res.json({
      success: true,
      message: '🌌 Cosmic portfolio projects retrieved successfully!',
      data: {
        projects,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalProjects: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        filters: { category, featured, status, search }
      }
    });
    
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    res.status(500).json({
      error: 'Portfolio Fetch Failed',
      message: '🛠️ Houston, we have a portfolio problem!'
    });
  }
});

// @route   GET /api/portfolio/featured
// @desc    Get featured projects
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const projects = await Portfolio.getFeatured(parseInt(limit));
    
    res.json({
      success: true,
      message: '⭐ Featured cosmic projects retrieved successfully!',
      data: { projects }
    });
    
  } catch (error) {
    console.error('Featured projects fetch error:', error);
    res.status(500).json({
      error: 'Featured Projects Fetch Failed',
      message: '🛠️ Houston, we have a featured projects problem!'
    });
  }
});

// @route   GET /api/portfolio/trending
// @desc    Get trending projects
// @access  Public
router.get('/trending', async (req, res) => {
  try {
    const { days = 7, limit = 10 } = req.query;
    
    const projects = await Portfolio.getTrending(parseInt(days), parseInt(limit));
    
    res.json({
      success: true,
      message: '📈 Trending cosmic projects retrieved successfully!',
      data: { projects }
    });
    
  } catch (error) {
    console.error('Trending projects fetch error:', error);
    res.status(500).json({
      error: 'Trending Projects Fetch Failed',
      message: '🛠️ Houston, we have a trending projects problem!'
    });
  }
});

// @route   GET /api/portfolio/search
// @desc    Search portfolio projects
// @access  Public
router.get('/search', validateSearch, async (req, res) => {
  try {
    const { q: query, category, limit = 20 } = req.query;
    
    const projects = await Portfolio.searchProjects(query, { 
      category, 
      limit: parseInt(limit) 
    });
    
    res.json({
      success: true,
      message: `🔍 Found ${projects.length} cosmic projects matching your search!`,
      data: { 
        projects,
        query,
        category,
        resultCount: projects.length
      }
    });
    
  } catch (error) {
    console.error('Portfolio search error:', error);
    res.status(500).json({
      error: 'Portfolio Search Failed',
      message: '🛠️ Houston, we have a search problem!'
    });
  }
});

// @route   GET /api/portfolio/categories
// @desc    Get project categories with counts
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Portfolio.aggregate([
      { $match: { visibility: 'public' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      message: '📊 Project categories retrieved successfully!',
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

// ============================================================================
// COMMENT ROUTES (must come before /:id route)
// ============================================================================

// @route   GET /api/portfolio/:id/comments
// @desc    Get all comments for a portfolio item
// @access  Public
router.get('/:id/comments', validateMongoId(), async (req, res) => {
  try {
    const { sort = '-createdAt', limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    
    // Determine item type from the item itself
    const item = await Portfolio.findById(req.params.id).select('itemType');
    if (!item) {
      return res.status(404).json({
        error: 'Item Not Found',
        message: '🌌 This cosmic item doesn\'t exist!'
      });
    }
    
    const itemType = item.itemType || 'project';
    
    const [comments, total] = await Promise.all([
      ItemComment.getApproved(req.params.id, itemType, {
        sort,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }).lean(),
      ItemComment.countDocuments({
        itemId: req.params.id,
        itemType,
        approved: true
      })
    ]);
    
    res.json({
      success: true,
      message: '💬 Comments retrieved successfully!',
      data: {
        comments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalComments: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
    
  } catch (error) {
    console.error('Comments fetch error:', error);
    res.status(500).json({
      error: 'Comments Fetch Failed',
      message: '🛠️ Houston, we have a comments problem!'
    });
  }
});

// @route   POST /api/portfolio/:id/comments
// @desc    Add a comment to a portfolio item
// @access  Public (no auth required for comments)
router.post('/:id/comments', validateMongoId(), async (req, res) => {
  try {
    const { name, email, text, emoji } = req.body;
    
    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Name Required',
        message: '💬 Please provide your name!'
      });
    }
    
    if (!text || !text.trim()) {
      return res.status(400).json({
        error: 'Comment Required',
        message: '💬 Please provide a comment!'
      });
    }
    
    if (text.trim().length > 500) {
      return res.status(400).json({
        error: 'Comment Too Long',
        message: '💬 Comment cannot exceed 500 characters!'
      });
    }
    
    // Check if item exists
    const item = await Portfolio.findById(req.params.id).select('itemType title');
    if (!item) {
      return res.status(404).json({
        error: 'Item Not Found',
        message: '🌌 This cosmic item doesn\'t exist!'
      });
    }
    
    const itemType = item.itemType || 'project';
    
    // Create comment
    const comment = new ItemComment({
      itemId: req.params.id,
      itemType,
      name: name.trim(),
      email: email ? email.trim() : undefined,
      text: text.trim(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    await comment.save();
    
    // Track analytics
    if (req.user) {
      Analytics.trackEvent({
        eventType: 'custom',
        eventName: 'Portfolio Item Commented',
        user: req.user._id,
        sessionId: req.sessionID || 'anonymous',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        eventData: {
          itemId: req.params.id,
          itemType,
          itemTitle: item.title
        }
      });
    }
    
    res.status(201).json({
      success: true,
      message: '💬 Your comment has been posted!',
      data: { comment }
    });
    
  } catch (error) {
    console.error('Comment creation error:', error);
    res.status(500).json({
      error: 'Comment Creation Failed',
      message: '🛠️ Houston, we have a comment problem!',
      details: error.message
    });
  }
});

// @route   POST /api/portfolio/:id/comments/:commentId/like
// @desc    Toggle like on a comment
// @access  Public
router.post('/:id/comments/:commentId/like', validateMongoId(), async (req, res) => {
  try {
    const identifier = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
    
    const comment = await ItemComment.findOne({
      _id: req.params.commentId,
      itemId: req.params.id,
      approved: true
    });
    
    if (!comment) {
      return res.status(404).json({
        error: 'Comment Not Found',
        message: '💬 This comment doesn\'t exist!'
      });
    }
    
    const wasLiked = comment.likedBy.includes(identifier);
    await comment.toggleLike(identifier);
    
    res.json({
      success: true,
      message: wasLiked ? '💔 Like removed!' : '❤️ Comment liked!',
      data: {
        liked: !wasLiked,
        likesCount: comment.likes
      }
    });
    
  } catch (error) {
    console.error('Like toggle error:', error);
    res.status(500).json({
      error: 'Like Toggle Failed',
      message: '🛠️ Houston, we have a like problem!'
    });
  }
});

// @route   POST /api/portfolio/:id/comments/:commentId/reply
// @desc    Add a reply to a comment
// @access  Public
router.post('/:id/comments/:commentId/reply', validateMongoId(), async (req, res) => {
  try {
    const { name, email, text } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Name Required',
        message: '💬 Please provide your name!'
      });
    }
    
    if (!text || !text.trim()) {
      return res.status(400).json({
        error: 'Reply Required',
        message: '💬 Please provide a reply!'
      });
    }
    
    if (text.trim().length > 500) {
      return res.status(400).json({
        error: 'Reply Too Long',
        message: '💬 Reply cannot exceed 500 characters!'
      });
    }
    
    const comment = await ItemComment.findOne({
      _id: req.params.commentId,
      itemId: req.params.id,
      approved: true
    });
    
    if (!comment) {
      return res.status(404).json({
        error: 'Comment Not Found',
        message: '💬 This comment doesn\'t exist!'
      });
    }
    
    await comment.addReply({
      name: name.trim(),
      email: email ? email.trim() : undefined,
      text: text.trim()
    });
    
    const newReply = comment.replies[comment.replies.length - 1];
    
    res.status(201).json({
      success: true,
      message: '💬 Your reply has been posted!',
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

// @route   GET /api/portfolio/:id
// @desc    Get single portfolio item (project/certification/achievement) with comments
// @access  Public
router.get('/:id', validateMongoId(), optionalAuth, async (req, res) => {
  try {
    console.log('🔍 GET /api/portfolio/:id - Fetching item:', req.params.id);
    const { includeComments = 'true', commentsLimit = 10 } = req.query;
    
    const item = await Portfolio.findById(req.params.id)
      .populate('creator', 'username profile.avatar profile.fullName profile.bio')
      .lean();
    
    console.log('📦 Item found:', item ? 'YES ✓' : 'NO ✗');
    
    if (!item) {
      console.log('❌ Item not found in database');
      return res.status(404).json({
        success: false,
        error: 'Item Not Found',
        message: '🌌 This cosmic item doesn\'t exist in our universe!'
      });
    }
    
    console.log('📋 Item details:', { _id: item._id, title: item.title, itemType: item.itemType });
    
    // Check visibility
    if (item.visibility === 'private' && 
        (!req.user || item.creator._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        error: 'Access Denied',
        message: '🚫 This cosmic item is private!'
      });
    }
    
    // Increment view count
    await Portfolio.findByIdAndUpdate(req.params.id, { $inc: { 'metrics.views': 1 } });
    
    // Fetch comments if requested
    let comments = [];
    if (includeComments === 'true') {
      try {
        const itemType = item.itemType || 'project';
        console.log('💬 Fetching comments for item type:', itemType);
        comments = await ItemComment.find({ itemId: req.params.id, approved: true })
          .sort('-createdAt')
          .limit(parseInt(commentsLimit))
          .lean();
        console.log('💬 Comments found:', comments.length);
      } catch (commentError) {
        console.error('⚠️ Error fetching comments (non-fatal):', commentError.message);
        // Don't fail the whole request if comments fail to load
        comments = [];
      }
    }
    
    // Add user interaction data if authenticated
    if (req.user) {
      item.isLikedByUser = item.likedBy?.some(like => 
        like.user.toString() === req.user._id.toString()
      ) || false;
    }
    
    // Track analytics (non-blocking, don't fail if it errors)
    Analytics.trackEvent({
      eventType: 'project_view',
      eventName: 'Portfolio Item Detail View',
      user: req.user?._id || null,
      sessionId: req.sessionID || 'anonymous',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      page: {
        url: req.originalUrl,
        path: `/portfolio/${req.params.id}`
      },
      eventData: {
        itemId: item._id,
        itemType: item.itemType || 'project',
        itemTitle: item.title
      }
    }).catch(err => console.log('⚠️ Analytics tracking failed (non-fatal):', err.message));
    
    res.json({
      success: true,
      message: '🚀 Cosmic item retrieved successfully!',
      data: { 
        item,
        comments: comments || []
      }
    });
    
  } catch (error) {
    console.error('❌ Item fetch error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Item Fetch Failed',
      message: error.message || '🛠️ Houston, we have an item problem!',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   POST /api/portfolio/add
// @desc    Add new portfolio item (project/certification/achievement)
// @access  Private
router.post('/add', authenticate, async (req, res) => {
  try {
    const { type = 'project', ...fields } = req.body;
    
    console.log('📝 POST /api/portfolio/add - Received request:', {
      type,
      title: fields.title || fields.certName || fields.achievementTitle,
      userId: req.user._id,
      allFields: fields
    });
    
    // Validate type
    if (!['project', 'certification', 'achievement'].includes(type)) {
      return res.status(400).json({
        error: 'Invalid Item Type',
        message: 'Type must be project, certification, or achievement'
      });
    }
    
    // Build item data based on type
    const itemData = {
      itemType: type,
      ...fields,
      creator: req.user._id,
      visibility: 'public' // ALWAYS set to public so items show up
    };
    
    console.log('📦 Building item data:', {
      itemType: itemData.itemType,
      title: itemData.title,
      visibility: itemData.visibility,
      category: itemData.category
    });
    
    // Set defaults based on type
    if (type === 'project') {
      itemData.status = itemData.status || 'completed';
      itemData.category = itemData.category || 'other';
    } else if (type === 'certification') {
      itemData.category = itemData.category || 'certification';
      itemData.status = itemData.status || 'completed';
    } else if (type === 'achievement') {
      itemData.category = itemData.category || 'achievement';
      itemData.status = itemData.status || 'completed';
    }
    
    const item = new Portfolio(itemData);
    console.log('💾 Saving item to database...');
    await item.save();
    console.log('✅ Item saved successfully! ID:', item._id);
    
    // Skip user stats update for now to prevent hanging
    // TODO: Re-enable after debugging
    console.log('✅ Item saved, skipping user stats update for debugging');
    
    // Populate creator info
    await item.populate('creator', 'username profile.avatar');
    
    console.log('📊 Saved item details:', {
      _id: item._id,
      title: item.title,
      itemType: item.itemType,
      visibility: item.visibility,
      category: item.category,
      status: item.status
    });
    
    const typeMessages = {
      project: '🚀 Your cosmic project has been launched successfully!',
      certification: '🎓 Your certification has been added successfully!',
      achievement: '🏆 Your achievement has been added successfully!'
    };
    
    res.status(201).json({
      success: true,
      message: typeMessages[type] || 'Item added successfully!',
      data: { item: item }
    });
    
  } catch (error) {
    console.error('Portfolio item creation error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Validation errors:', error.errors);
    res.status(500).json({
      error: 'Item Creation Failed',
      message: '🛠️ Houston, we have a creation problem!',
      details: error.message,
      validationErrors: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : []
    });
  }
});

// @route   POST /api/portfolio
// @desc    Create new portfolio project (backward compatibility)
// @access  Private
router.post('/', authenticate, validatePortfolioCreate, trackActivity, async (req, res) => {
  try {
    const projectData = {
      itemType: 'project',
      ...req.body,
      creator: req.user._id
    };
    
    const project = new Portfolio(projectData);
    await project.save();
    
    // Update user stats
    req.user.stats.projectsCreated += 1;
    await req.user.save();
    
    // Add first project achievement
    if (req.user.stats.projectsCreated === 1) {
      req.user.addAchievement(
        'First Launch',
        'Congratulations on launching your first cosmic project! This is just the beginning.',
        '🚀'
      );
      await req.user.save();
    }
    
    // Populate creator info
    await project.populate('creator', 'username profile.avatar');
    
    res.status(201).json({
      success: true,
      message: '🚀 Your cosmic project has been launched successfully!',
      data: { project }
    });
    
  } catch (error) {
    console.error('Project creation error:', error);
    res.status(500).json({
      error: 'Project Creation Failed',
      message: '🛠️ Houston, we have a project creation problem!'
    });
  }
});

// @route   PUT /api/portfolio/:id
// @desc    Update portfolio project
// @access  Private (Owner or Admin)
router.put('/:id', 
  authenticate, 
  validatePortfolioUpdate, 
  checkResourceOwnership('Portfolio'),
  trackActivity,
  async (req, res) => {
    try {
      const updates = req.body;
      const project = req.resource;
      
      // Update project fields
      Object.keys(updates).forEach(key => {
        if (key !== 'creator') { // Prevent creator change
          project[key] = updates[key];
        }
      });
      
      await project.save();
      await project.populate('creator', 'username profile.avatar');
      
      res.json({
        success: true,
        message: '✨ Your cosmic project has been updated successfully!',
        data: { project }
      });
      
    } catch (error) {
      console.error('Project update error:', error);
      res.status(500).json({
        error: 'Project Update Failed',
        message: '🛠️ Houston, we have a project update problem!'
      });
    }
  }
);

// @route   DELETE /api/portfolio/:id
// @desc    Delete portfolio project
// @access  Private (Owner or Admin)
router.delete('/:id', 
  authenticate, 
  validateMongoId(),
  checkResourceOwnership('Portfolio'),
  trackActivity,
  async (req, res) => {
    try {
      await Portfolio.findByIdAndDelete(req.params.id);
      
      // Update user stats
      req.user.stats.projectsCreated = Math.max(0, req.user.stats.projectsCreated - 1);
      await req.user.save();
      
      res.json({
        success: true,
        message: '🗑️ Your cosmic project has been removed from the universe.',
        data: { deletedId: req.params.id }
      });
      
    } catch (error) {
      console.error('Project deletion error:', error);
      res.status(500).json({
        error: 'Project Deletion Failed',
        message: '🛠️ Houston, we have a project deletion problem!'
      });
    }
  }
);

// @route   POST /api/portfolio/:id/like
// @desc    Toggle like on project
// @access  Private
router.post('/:id/like', authenticate, validateMongoId(), async (req, res) => {
  try {
    const project = await Portfolio.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        error: 'Project Not Found',
        message: '🌌 This cosmic project doesn\'t exist!'
      });
    }
    
    const result = project.toggleLike(req.user._id);
    await project.save();
    
    // Update creator's stats if liked
    if (result.liked) {
      const creator = await require('../models/User').findById(project.creator);
      if (creator) {
        creator.stats.likesReceived += 1;
        await creator.save();
      }
    }
    
    // Track analytics
    await Analytics.trackEvent({
      eventType: 'project_like',
      eventName: result.liked ? 'Project Liked' : 'Project Unliked',
      user: req.user._id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      page: {
        url: req.originalUrl,
        path: `/portfolio/${req.params.id}/like`
      },
      eventData: {
        projectId: project._id,
        projectTitle: project.title,
        action: result.liked ? 'like' : 'unlike'
      }
    });
    
    res.json({
      success: true,
      message: result.liked ? '❤️ Project liked!' : '💔 Like removed!',
      data: {
        liked: result.liked,
        likesCount: result.likesCount
      }
    });
    
  } catch (error) {
    console.error('Project like error:', error);
    res.status(500).json({
      error: 'Like Action Failed',
      message: '🛠️ Houston, we have a like problem!'
    });
  }
});

// @route   POST /api/portfolio/:id/comment
// @desc    Add comment to project
// @access  Private
router.post('/:id/comment', authenticate, validateMongoId(), async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim().length < 1) {
      return res.status(400).json({
        error: 'Comment Required',
        message: '💬 Please provide a comment for your cosmic thoughts!'
      });
    }
    
    const project = await Portfolio.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        error: 'Project Not Found',
        message: '🌌 This cosmic project doesn\'t exist!'
      });
    }
    
    await project.addComment(req.user._id, content.trim());
    
    // Populate the new comment
    await project.populate('comments.user', 'username profile.avatar');
    
    const newComment = project.comments[project.comments.length - 1];
    
    res.status(201).json({
      success: true,
      message: '💬 Your cosmic comment has been added!',
      data: { comment: newComment }
    });
    
  } catch (error) {
    console.error('Comment creation error:', error);
    res.status(500).json({
      error: 'Comment Creation Failed',
      message: '🛠️ Houston, we have a comment problem!'
    });
  }
});

// @route   GET /api/portfolio/user/:userId
// @desc    Get user's portfolio projects
// @access  Public
router.get('/user/:userId', validateMongoId('userId'), validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 12, sort = '-createdAt' } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = { creator: req.params.userId, visibility: 'public' };
    
    const [projects, total] = await Promise.all([
      Portfolio.find(filter)
        .populate('creator', 'username profile.avatar profile.fullName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Portfolio.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      message: '👨‍🚀 User portfolio projects retrieved successfully!',
      data: {
        projects,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalProjects: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
    
  } catch (error) {
    console.error('User portfolio fetch error:', error);
    res.status(500).json({
      error: 'User Portfolio Fetch Failed',
      message: '🛠️ Houston, we have a user portfolio problem!'
    });
  }
});

module.exports = router;