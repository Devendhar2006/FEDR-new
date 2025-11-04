const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const Analytics = require('../models/Analytics');
const { authenticate, authorize, optionalAuth, trackActivity } = require('../middleware/auth');

// @route   GET /api/blog
// @desc    Get all published blog posts
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      tag, 
      search,
      featured,
      sort = '-publishedAt'
    } = req.query;
    
    const filter = { status: 'published' };
    
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (featured === 'true') filter.featured = true;
    
    if (search) {
      filter.$text = { $search: search };
    }
    
    const skip = (page - 1) * limit;
    
    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .populate('author', 'username profile.avatar profile.fullName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Blog.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      message: '📚 Cosmic blog posts retrieved successfully!',
      data: {
        blogs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Blog fetch error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: '🛠️ Houston, we have a blog retrieval problem!'
    });
  }
});

// @route   GET /api/blog/:id
// @desc    Get single blog post by ID or slug
// @access  Public
router.get('/:identifier', optionalAuth, async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by ID first, then by slug
    let blog = await Blog.findById(identifier)
      .populate('author', 'username profile.avatar profile.fullName profile.bio')
      .populate('comments.user', 'username profile.avatar');
    
    if (!blog) {
      blog = await Blog.findOne({ slug: identifier })
        .populate('author', 'username profile.avatar profile.fullName profile.bio')
        .populate('comments.user', 'username profile.avatar');
    }
    
    if (!blog) {
      return res.status(404).json({
        error: 'Not Found',
        message: '🌌 This cosmic blog post has drifted into a black hole!'
      });
    }
    
    // Increment view count
    await blog.incrementViews();
    
    // Track analytics
    if (req.user) {
      await Analytics.trackEvent({
        eventType: 'blog_view',
        eventName: 'Blog Post View',
        user: req.user._id,
        sessionId: req.sessionID || 'anonymous',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        page: { url: req.originalUrl, path: `/blog/${identifier}` },
        eventData: { blogId: blog._id, blogTitle: blog.title }
      });
    }
    
    res.json({
      success: true,
      message: '📖 Blog post retrieved successfully!',
      data: { blog }
    });
  } catch (error) {
    console.error('Blog fetch error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: '🛠️ Houston, we have a blog retrieval problem!'
    });
  }
});

// @route   POST /api/blog
// @desc    Create new blog post
// @access  Private (Admin/Author)
router.post('/', authenticate, authorize('admin', 'moderator'), async (req, res) => {
  try {
    const blogData = {
      ...req.body,
      author: req.user._id
    };
    
    const blog = new Blog(blogData);
    await blog.save();
    
    await blog.populate('author', 'username profile.avatar');
    
    res.status(201).json({
      success: true,
      message: '✨ Cosmic blog post created successfully!',
      data: { blog }
    });
  } catch (error) {
    console.error('Blog creation error:', error);
    res.status(500).json({
      error: 'Creation Failed',
      message: '🛠️ Houston, we have a blog creation problem!',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/blog/:id
// @desc    Update blog post
// @access  Private (Admin/Author)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        error: 'Not Found',
        message: '🌌 Blog post not found in our cosmic database!'
      });
    }
    
    // Check ownership or admin
    if (blog.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access Denied',
        message: '🚫 You can only edit your own cosmic blog posts!'
      });
    }
    
    Object.assign(blog, req.body);
    await blog.save();
    
    await blog.populate('author', 'username profile.avatar');
    
    res.json({
      success: true,
      message: '✨ Blog post updated successfully!',
      data: { blog }
    });
  } catch (error) {
    console.error('Blog update error:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: '🛠️ Houston, we have a blog update problem!'
    });
  }
});

// @route   DELETE /api/blog/:id
// @desc    Delete blog post
// @access  Private (Admin/Author)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        error: 'Not Found',
        message: '🌌 Blog post not found!'
      });
    }
    
    // Check ownership or admin
    if (blog.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access Denied',
        message: '🚫 You can only delete your own cosmic blog posts!'
      });
    }
    
    await blog.deleteOne();
    
    res.json({
      success: true,
      message: '🗑️ Blog post deleted successfully!',
      data: { deletedId: req.params.id }
    });
  } catch (error) {
    console.error('Blog delete error:', error);
    res.status(500).json({
      error: 'Delete Failed',
      message: '🛠️ Houston, we have a blog deletion problem!'
    });
  }
});

// @route   POST /api/blog/:id/comments
// @desc    Add comment to blog post
// @access  Private
router.post('/:id/comments', authenticate, trackActivity, async (req, res) => {
  try {
    const { content, parentComment } = req.body;
    
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        error: 'Not Found',
        message: '🌌 Blog post not found!'
      });
    }
    
    if (!blog.allowComments) {
      return res.status(403).json({
        error: 'Comments Disabled',
        message: '🚫 Comments are disabled for this post!'
      });
    }
    
    blog.comments.push({
      user: req.user._id,
      content,
      parentComment
    });
    
    await blog.save();
    await blog.populate('comments.user', 'username profile.avatar');
    
    res.status(201).json({
      success: true,
      message: '💬 Comment added successfully!',
      data: { 
        comment: blog.comments[blog.comments.length - 1],
        commentCount: blog.comments.length
      }
    });
  } catch (error) {
    console.error('Comment creation error:', error);
    res.status(500).json({
      error: 'Comment Failed',
      message: '🛠️ Houston, we have a comment problem!'
    });
  }
});

// @route   POST /api/blog/:id/like
// @desc    Toggle like on blog post
// @access  Private
router.post('/:id/like', authenticate, trackActivity, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        error: 'Not Found',
        message: '🌌 Blog post not found!'
      });
    }
    
    const result = blog.toggleLike(req.user._id);
    await blog.save();
    
    res.json({
      success: true,
      message: result.liked ? '❤️ Blog post liked!' : '💔 Like removed!',
      data: result
    });
  } catch (error) {
    console.error('Like toggle error:', error);
    res.status(500).json({
      error: 'Like Failed',
      message: '🛠️ Houston, we have a like problem!'
    });
  }
});

// @route   GET /api/blog/featured/list
// @desc    Get featured blog posts
// @access  Public
router.get('/featured/list', async (req, res) => {
  try {
    const blogs = await Blog.getFeatured();
    
    res.json({
      success: true,
      message: '⭐ Featured blogs retrieved!',
      data: { blogs }
    });
  } catch (error) {
    console.error('Featured blogs error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: '🛠️ Houston, we have a problem fetching featured blogs!'
    });
  }
});

module.exports = router;
