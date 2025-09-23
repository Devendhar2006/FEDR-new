const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');
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
    const { 
      page = 1, 
      limit = 12, 
      sort = '-createdAt', 
      category, 
      featured, 
      status = 'completed',
      search 
    } = req.query;
    
    // Build filter object
    const filter = { visibility: 'public' };
    
    if (category) filter.category = category;
    if (featured === 'true') filter.featured = true;
    if (status) filter.status = status;
    
    // Handle search
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { shortDescription: searchRegex },
        { tags: { $in: [searchRegex] } },
        { keywords: { $in: [searchRegex] } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    // Get projects with pagination
    const [projects, total] = await Promise.all([
      Portfolio.find(filter)
        .populate('creator', 'username profile.avatar profile.fullName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Portfolio.countDocuments(filter)
    ]);
    
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

// @route   GET /api/portfolio/:id
// @desc    Get single project by ID
// @access  Public
router.get('/:id', validateMongoId(), optionalAuth, async (req, res) => {
  try {
    const project = await Portfolio.findById(req.params.id)
      .populate('creator', 'username profile.avatar profile.fullName profile.bio')
      .populate('comments.user', 'username profile.avatar')
      .lean();
    
    if (!project) {
      return res.status(404).json({
        error: 'Project Not Found',
        message: '🌌 This cosmic project doesn\'t exist in our universe!'
      });
    }
    
    // Check visibility
    if (project.visibility === 'private' && 
        (!req.user || project.creator._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        error: 'Access Denied',
        message: '🚫 This cosmic project is private!'
      });
    }
    
    // Increment view count
    await Portfolio.findByIdAndUpdate(req.params.id, { $inc: { 'metrics.views': 1 } });
    
    // Add user interaction data if authenticated
    if (req.user) {
      project.isLikedByUser = project.likedBy?.some(like => 
        like.user.toString() === req.user._id.toString()
      ) || false;
    }
    
    // Track analytics
    await Analytics.trackEvent({
      eventType: 'project_view',
      eventName: 'Project Detail View',
      user: req.user?._id || null,
      sessionId: req.sessionID || 'anonymous',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      page: {
        url: req.originalUrl,
        path: `/portfolio/${req.params.id}`
      },
      eventData: {
        projectId: project._id,
        projectTitle: project.title,
        projectCategory: project.category,
        projectCreator: project.creator.username
      }
    });
    
    res.json({
      success: true,
      message: '🚀 Cosmic project retrieved successfully!',
      data: { project }
    });
    
  } catch (error) {
    console.error('Project fetch error:', error);
    res.status(500).json({
      error: 'Project Fetch Failed',
      message: '🛠️ Houston, we have a project problem!'
    });
  }
});

// @route   POST /api/portfolio
// @desc    Create new portfolio project
// @access  Private
router.post('/', authenticate, validatePortfolioCreate, trackActivity, async (req, res) => {
  try {
    const projectData = {
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