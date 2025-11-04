const mongoose = require('mongoose');

const guestbookSchema = new mongoose.Schema({
  // Message Content
  name: {
    type: String,
    required: [true, 'Astronaut name is required for cosmic identification'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
    minlength: [2, 'Name must be at least 2 characters long']
  },
  
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  
  message: {
    type: String,
    required: [true, 'Transmission message is required for cosmic communication'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters'],
    minlength: [10, 'Message must be at least 10 characters long']
  },
  
  // Project Linking (NEW - for project-specific comments)
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    default: null
  },
  
  projectTitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Project title cannot exceed 200 characters']
  },
  
  // User Information (if logged in)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Message Metadata
  ipAddress: {
    type: String,
    required: true
  },
  
  userAgent: {
    type: String,
    default: ''
  },
  
  location: {
    country: String,
    city: String,
    timezone: String
  },
  
  // Content Classification
  category: {
    type: String,
    enum: ['general', 'feedback', 'question', 'collaboration', 'appreciation', 'bug-report', 'feature-request'],
    default: 'general'
  },
  
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Each tag cannot exceed 30 characters']
  }],
  
  // Moderation and Status
  status: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'rejected', 'flagged', 'hidden'],
      message: 'Status must be one of the specified moderation states'
    },
    default: 'approved' // Auto-approve by default, can be changed for moderation
  },
  
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  moderatedAt: Date,
  
  moderationReason: {
    type: String,
    maxlength: [500, 'Moderation reason cannot exceed 500 characters']
  },
  
  // Interaction and Engagement
  likes: {
    type: Number,
    default: 0,
    min: 0
  },
  
  likedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  replies: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: [500, 'Reply cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Spam and Security
  isSpam: {
    type: Boolean,
    default: false
  },
  
  spamScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Flagging System
  flags: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'offensive', 'misleading', 'other'],
      required: true
    },
    description: {
      type: String,
      maxlength: [200, 'Flag description cannot exceed 200 characters']
    },
    flaggedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Analytics and Tracking
  views: {
    type: Number,
    default: 0
  },
  
  featured: {
    type: Boolean,
    default: false
  },
  
  // Contact Information (optional)
  contact: {
    website: {
      type: String,
      match: [/^https?:\/\/.+/, 'Please provide a valid website URL']
    },
    social: {
      twitter: String,
      linkedin: String,
      github: String
    }
  },
  
  // Message Formatting
  formatting: {
    isHtml: {
      type: Boolean,
      default: false
    },
    hasEmojis: {
      type: Boolean,
      default: false
    },
    hasLinks: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for message excerpt
guestbookSchema.virtual('excerpt').get(function() {
  if (this.message.length <= 150) {
    return this.message;
  }
  return this.message.substring(0, 150).trim() + '...';
});

// Virtual for author display name
guestbookSchema.virtual('authorName').get(function() {
  if (this.user && this.user.username) {
    return this.user.username;
  }
  return this.name;
});

// Virtual for engagement score
guestbookSchema.virtual('engagementScore').get(function() {
  return (this.views * 1) + (this.likes * 5) + (this.replies.length * 3);
});

// Virtual for time since posted
guestbookSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffMs = now - this.createdAt;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
});

// Indexes for better performance
guestbookSchema.index({ status: 1 });
guestbookSchema.index({ createdAt: -1 });
guestbookSchema.index({ user: 1 });
guestbookSchema.index({ category: 1 });
guestbookSchema.index({ featured: 1 });
guestbookSchema.index({ likes: -1 });
guestbookSchema.index({ isSpam: 1 });
guestbookSchema.index({ ipAddress: 1 });
guestbookSchema.index({ projectId: 1 }); // NEW: Index for project filtering

// Text index for search functionality
guestbookSchema.index({
  name: 'text',
  message: 'text',
  tags: 'text'
});

// Pre-save middleware to detect formatting
guestbookSchema.pre('save', function(next) {
  if (this.isModified('message')) {
    // Check for HTML tags
    this.formatting.isHtml = /<[^>]*>/.test(this.message);
    
    // Check for emojis (basic emoji detection)
    this.formatting.hasEmojis = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(this.message);
    
    // Check for URLs
    this.formatting.hasLinks = /https?:\/\/[^\s]+/.test(this.message);
  }
  next();
});

// Pre-save middleware for spam detection (basic)
guestbookSchema.pre('save', function(next) {
  if (this.isModified('message') || this.isModified('name')) {
    let spamScore = 0;
    
    // Check for excessive capitalization
    const capsRatio = (this.message.match(/[A-Z]/g) || []).length / this.message.length;
    if (capsRatio > 0.5) spamScore += 20;
    
    // Check for excessive punctuation
    const punctRatio = (this.message.match(/[!?.,;:]/g) || []).length / this.message.length;
    if (punctRatio > 0.3) spamScore += 15;
    
    // Check for common spam words
    const spamWords = ['viagra', 'casino', 'lottery', 'prize', 'winner', 'congratulations', 'click here', 'free money'];
    const messageText = this.message.toLowerCase();
    spamWords.forEach(word => {
      if (messageText.includes(word)) spamScore += 25;
    });
    
    // Check for excessive links
    const linkCount = (this.message.match(/https?:\/\/[^\s]+/g) || []).length;
    if (linkCount > 2) spamScore += 30;
    
    this.spamScore = Math.min(spamScore, 100);
    this.isSpam = spamScore >= 50;
    
    // Auto-reject if high spam score
    if (spamScore >= 80) {
      this.status = 'rejected';
      this.moderationReason = 'Automatically rejected due to high spam score';
    }
  }
  next();
});

// Instance method to toggle like
guestbookSchema.methods.toggleLike = function(userId) {
  const existingLike = this.likedBy.find(like => like.user.toString() === userId.toString());
  
  if (existingLike) {
    // Remove like
    this.likedBy = this.likedBy.filter(like => like.user.toString() !== userId.toString());
    this.likes = Math.max(0, this.likes - 1);
    return { liked: false, likesCount: this.likes };
  } else {
    // Add like
    this.likedBy.push({ user: userId });
    this.likes += 1;
    return { liked: true, likesCount: this.likes };
  }
};

// Instance method to add reply
guestbookSchema.methods.addReply = function(userId, userName, message) {
  this.replies.push({
    user: userId,
    name: userName,
    message
  });
  return this.save();
};

// Instance method to flag message
guestbookSchema.methods.flagMessage = function(userId, reason, description) {
  const existingFlag = this.flags.find(flag => flag.user.toString() === userId.toString());
  
  if (!existingFlag) {
    this.flags.push({
      user: userId,
      reason,
      description
    });
    
    // Auto-moderate if multiple flags
    if (this.flags.length >= 3) {
      this.status = 'flagged';
    }
    
    return true;
  }
  return false;
};

// Static method to get approved messages
guestbookSchema.statics.getApproved = function(limit = 20, skip = 0, filter = 'all') {
  const query = { status: 'approved', isSpam: false };
  
  // Add filter for project comments
  if (filter === 'project-comments') {
    query.projectId = { $ne: null };
  } else if (filter === 'general') {
    query.projectId = null;
  }
  
  return this.find(query)
    .populate('user', 'username profile.avatar')
    .populate('projectId', 'title')
    .sort({ featured: -1, createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get featured messages
guestbookSchema.statics.getFeatured = function(limit = 5) {
  return this.find({ featured: true, status: 'approved', isSpam: false })
    .populate('user', 'username profile.avatar')
    .sort({ likes: -1, createdAt: -1 })
    .limit(limit);
};

// Static method to get messages by category
guestbookSchema.statics.getByCategory = function(category, limit = 10) {
  return this.find({ category, status: 'approved', isSpam: false })
    .populate('user', 'username profile.avatar')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to search messages
guestbookSchema.statics.searchMessages = function(query, options = {}) {
  const filter = {
    status: 'approved',
    isSpam: false,
    $text: { $search: query }
  };
  
  if (options.category) {
    filter.category = options.category;
  }
  
  return this.find(filter, { score: { $meta: 'textScore' } })
    .populate('user', 'username profile.avatar')
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .limit(options.limit || 20);
};

// Static method for moderation queue
guestbookSchema.statics.getModerationQueue = function() {
  return this.find({
    $or: [
      { status: 'pending' },
      { status: 'flagged' },
      { spamScore: { $gte: 30 } }
    ]
  })
  .populate('user', 'username profile.avatar')
  .populate('moderatedBy', 'username')
  .sort({ createdAt: -1 });
};

// Static method to get analytics
guestbookSchema.statics.getAnalytics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        approvedMessages: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        pendingMessages: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        flaggedMessages: { $sum: { $cond: [{ $eq: ['$status', 'flagged'] }, 1, 0] } },
        spamMessages: { $sum: { $cond: ['$isSpam', 1, 0] } },
        totalLikes: { $sum: '$likes' },
        totalReplies: { $sum: { $size: '$replies' } },
        averageSpamScore: { $avg: '$spamScore' }
      }
    }
  ]);
};

module.exports = mongoose.model('Guestbook', guestbookSchema);