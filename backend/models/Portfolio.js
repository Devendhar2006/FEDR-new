const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
  // Item Type: project, certification, achievement
  itemType: {
    type: String,
    enum: ['project', 'certification', 'achievement'],
    default: 'project',
    required: true
  },
  
  // Basic Information
  title: {
    type: String,
    required: [true, 'Title is required for cosmic identification'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    required: function() {
      // Only required for projects, not certifications/achievements
      return this.itemType === 'project' || !this.itemType;
    },
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  shortDescription: {
    type: String,
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  
  // Project Details
  category: {
    type: String,
    required: [true, 'Project category is required for cosmic classification'],
    enum: {
      values: ['web', 'mobile', 'ai', 'design', 'backend', 'frontend', 'fullstack', 'game', 'blockchain', 'iot', 'certification', 'achievement', 'other'],
      message: 'Category must be one of the specified cosmic project types'
    }
  },
  
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Each tag cannot exceed 30 characters']
  }],
  
  // Visual Assets
  images: [{
    url: {
      type: String,
      required: false
      // Removed URL validation to allow data URLs (base64) for now
    },
    caption: {
      type: String,
      maxlength: [200, 'Image caption cannot exceed 200 characters']
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  thumbnail: {
    type: String,
    default: 'https://via.placeholder.com/400x300/965aff/ffffff?text=Cosmic+Project'
  },
  
  // Links and Resources
  links: {
    live: {
      type: String,
      match: [/^https?:\/\/.+/, 'Please provide a valid live demo URL']
    },
    github: {
      type: String,
      match: [/^https?:\/\/(www\.)?github\.com\/.+/, 'Please provide a valid GitHub repository URL']
    },
    demo: {
      type: String,
      match: [/^https?:\/\/.+/, 'Please provide a valid demo URL']
    },
    documentation: {
      type: String,
      match: [/^https?:\/\/.+/, 'Please provide a valid documentation URL']
    }
  },
  
  // Technical Information
  technologies: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['frontend', 'backend', 'database', 'framework', 'library', 'tool', 'service'],
      default: 'library'
    },
    version: String
  }],
  
  // Project Status and Timeline
  status: {
    type: String,
    enum: {
      values: ['planning', 'in-progress', 'completed', 'on-hold', 'archived'],
      message: 'Status must be one of the specified project states'
    },
    default: 'completed'
  },
  
  timeline: {
    startDate: {
      type: Date
    },
    endDate: Date,
    duration: String // e.g., "2 months", "1 week"
  },
  
  // Certification-specific fields
  certification: {
    issuingOrganization: {
      type: String,
      maxlength: [200, 'Organization name cannot exceed 200 characters']
    },
    issueDate: Date,
    expiryDate: Date,
    credentialId: {
      type: String,
      maxlength: [100, 'Credential ID cannot exceed 100 characters']
    },
    credentialUrl: {
      type: String,
      match: [/^https?:\/\/.+/, 'Please provide a valid credential URL']
    },
    skillsGained: [{
      type: String,
      trim: true,
      maxlength: [50, 'Each skill cannot exceed 50 characters']
    }]
  },
  
  // Achievement-specific fields
  achievement: {
    achievementCategory: {
      type: String,
      enum: ['Award', 'Recognition', 'Milestone', 'Competition'],
      default: 'Recognition'
    },
    achievementDate: Date,
    organization: {
      type: String,
      maxlength: [200, 'Organization name cannot exceed 200 characters']
    },
    achievementDetails: {
      type: String,
      maxlength: [2000, 'Achievement details cannot exceed 2000 characters']
    }
  },
  
  // Collaboration and Team
  collaborators: [{
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    },
    profile: String, // URL to their profile/portfolio
    avatar: String
  }],
  
  // Project Metrics
  metrics: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    },
    stars: {
      type: Number,
      default: 0
    }
  },
  
  // User Interaction
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
  
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Visibility and Settings
  visibility: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'public'
  },
  
  featured: {
    type: Boolean,
    default: false
  },
  
  priority: {
    type: Number,
    min: 0,
    max: 10,
    default: 5
  },
  
  // SEO and Discovery
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  keywords: [{
    type: String,
    trim: true
  }],
  
  // Project Creator
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Project creator is required for cosmic ownership']
  },
  
  // Additional Metadata
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'intermediate'
  },
  
  learningOutcomes: [{
    type: String,
    maxlength: [200, 'Learning outcome cannot exceed 200 characters']
  }],
  
  challenges: [{
    description: {
      type: String,
      required: true,
      maxlength: [300, 'Challenge description cannot exceed 300 characters']
    },
    solution: {
      type: String,
      maxlength: [500, 'Challenge solution cannot exceed 500 characters']
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for primary image
portfolioSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : this.thumbnail;
});

// Virtual for project duration in readable format
portfolioSchema.virtual('durationFormatted').get(function() {
  if (this.timeline.endDate && this.timeline.startDate) {
    const diffTime = Math.abs(this.timeline.endDate - this.timeline.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.round(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.round(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''}`;
    }
  }
  return this.timeline.duration || 'Ongoing';
});

// Virtual for engagement score
portfolioSchema.virtual('engagementScore').get(function() {
  return (this.metrics.views * 1) + 
         (this.metrics.likes * 5) + 
         (this.metrics.shares * 10) + 
         (this.metrics.downloads * 15) + 
         (this.comments.length * 8);
});

// Indexes for better performance
portfolioSchema.index({ creator: 1 });
portfolioSchema.index({ category: 1 });
portfolioSchema.index({ status: 1 });
portfolioSchema.index({ featured: 1 });
portfolioSchema.index({ visibility: 1 });
portfolioSchema.index({ slug: 1 });
portfolioSchema.index({ tags: 1 });
portfolioSchema.index({ 'metrics.views': -1 });
portfolioSchema.index({ 'metrics.likes': -1 });
portfolioSchema.index({ createdAt: -1 });

// Pre-save middleware to generate slug
portfolioSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
    
    // Add timestamp if slug exists
    if (!this.isNew) {
      this.slug += `-${Date.now()}`;
    }
  }
  next();
});

// Pre-save middleware to ensure only one primary image
portfolioSchema.pre('save', function(next) {
  if (this.isModified('images')) {
    const primaryImages = this.images.filter(img => img.isPrimary);
    if (primaryImages.length > 1) {
      // Keep only the first primary image
      this.images.forEach((img, index) => {
        if (index > 0 && img.isPrimary) {
          img.isPrimary = false;
        }
      });
    }
  }
  next();
});

// Instance method to increment views
portfolioSchema.methods.incrementViews = function() {
  this.metrics.views += 1;
  return this.save();
};

// Instance method to toggle like
portfolioSchema.methods.toggleLike = function(userId) {
  const existingLike = this.likedBy.find(like => like.user.toString() === userId.toString());
  
  if (existingLike) {
    // Remove like
    this.likedBy = this.likedBy.filter(like => like.user.toString() !== userId.toString());
    this.metrics.likes = Math.max(0, this.metrics.likes - 1);
    return { liked: false, likesCount: this.metrics.likes };
  } else {
    // Add like
    this.likedBy.push({ user: userId });
    this.metrics.likes += 1;
    return { liked: true, likesCount: this.metrics.likes };
  }
};

// Instance method to add comment
portfolioSchema.methods.addComment = function(userId, content) {
  this.comments.push({
    user: userId,
    content
  });
  return this.save();
};

// Static method to get featured projects
portfolioSchema.statics.getFeatured = function(limit = 6) {
  return this.find({ featured: true, visibility: 'public' })
    .populate('creator', 'username profile.avatar')
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit);
};

// Static method to get projects by category
portfolioSchema.statics.getByCategory = function(category, limit = 10) {
  return this.find({ category, visibility: 'public' })
    .populate('creator', 'username profile.avatar')
    .sort({ 'metrics.views': -1, createdAt: -1 })
    .limit(limit);
};

// Static method to search projects
portfolioSchema.statics.searchProjects = function(query, options = {}) {
  const searchRegex = new RegExp(query, 'i');
  const filter = {
    visibility: 'public',
    $or: [
      { title: searchRegex },
      { description: searchRegex },
      { tags: { $in: [searchRegex] } },
      { keywords: { $in: [searchRegex] } }
    ]
  };
  
  if (options.category) {
    filter.category = options.category;
  }
  
  return this.find(filter)
    .populate('creator', 'username profile.avatar')
    .sort({ 'metrics.views': -1, createdAt: -1 })
    .limit(options.limit || 20);
};

// Static method for trending projects
portfolioSchema.statics.getTrending = function(days = 7, limit = 10) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  
  return this.find({
    visibility: 'public',
    createdAt: { $gte: date }
  })
  .populate('creator', 'username profile.avatar')
  .sort({ 'metrics.views': -1, 'metrics.likes': -1 })
  .limit(limit);
};

module.exports = mongoose.model('Portfolio', portfolioSchema);