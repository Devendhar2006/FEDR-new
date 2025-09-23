const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  shortDescription: {
    type: String,
    required: [true, 'Short description is required'],
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  technologies: [{
    type: String,
    required: true
  }],
  images: [{
    public_id: String,
    url: String,
    caption: String
  }],
  liveUrl: {
    type: String,
    match: [/^https?:\/\/.+\..+/, 'Please enter a valid URL']
  },
  githubUrl: {
    type: String,
    match: [/^https?:\/\/.+\..+/, 'Please enter a valid URL']
  },
  featured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['Planning', 'In Progress', 'Completed', 'Deployed', 'Maintenance'],
    default: 'Planning'
  },
  category: {
    type: String,
    enum: ['Web Development', 'Mobile App', 'Desktop App', 'API', 'AI/ML', 'Game', 'Other'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    default: 'Intermediate'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['Developer', 'Designer', 'Tester', 'Manager'],
      default: 'Developer'
    }
  }],
  tags: [{
    type: String,
    lowercase: true
  }],
  views: {
    type: Number,
    default: 0
  },
  likes: [{
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
  isPublic: {
    type: Boolean,
    default: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
projectSchema.index({ author: 1, createdAt: -1 });
projectSchema.index({ featured: -1, createdAt: -1 });
projectSchema.index({ category: 1, status: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ title: 'text', description: 'text' });

// Virtual for like count
projectSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
projectSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Method to increment views
projectSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to toggle like
projectSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.findIndex(like => like.user.toString() === userId.toString());
  
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
    return { liked: false, likeCount: this.likes.length };
  } else {
    this.likes.push({ user: userId });
    return { liked: true, likeCount: this.likes.length };
  }
};

// Static method to get featured projects
projectSchema.statics.getFeatured = function() {
  return this.find({ featured: true, isPublic: true })
    .populate('author', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(6);
};

// Pre-save middleware
projectSchema.pre('save', function(next) {
  // Auto-update endDate when status changes to Completed or Deployed
  if (this.isModified('status') && (this.status === 'Completed' || this.status === 'Deployed') && !this.endDate) {
    this.endDate = new Date();
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);