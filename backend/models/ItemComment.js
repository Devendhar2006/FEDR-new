const mongoose = require('mongoose');

const itemCommentSchema = new mongoose.Schema({
  // Item Reference
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  itemType: {
    type: String,
    required: true,
    enum: ['project', 'certification', 'achievement'],
    index: true
  },
  
  // Comment Author
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  avatar: {
    type: String,
    default: null
  },
  
  // Comment Content
  text: {
    type: String,
    required: [true, 'Comment text is required'],
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  
  // Engagement
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: String, // Store IP or user ID to prevent duplicate likes
    default: []
  }],
  
  // Replies
  replies: [{
    name: {
      type: String,
      required: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    text: {
      type: String,
      required: true,
      maxlength: [500, 'Reply cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    likes: {
      type: Number,
      default: 0
    },
    likedBy: [{
      type: String,
      default: []
    }]
  }],
  
  // Moderation
  approved: {
    type: Boolean,
    default: true // Auto-approve for now
  },
  reported: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
});

// Indexes for efficient queries
itemCommentSchema.index({ itemId: 1, itemType: 1 });
itemCommentSchema.index({ createdAt: -1 });
itemCommentSchema.index({ approved: 1 });

// Instance method to add reply
itemCommentSchema.methods.addReply = function(replyData) {
  this.replies.push({
    ...replyData,
    createdAt: new Date()
  });
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to toggle like
itemCommentSchema.methods.toggleLike = function(identifier) {
  const index = this.likedBy.indexOf(identifier);
  if (index > -1) {
    this.likedBy.splice(index, 1);
    this.likes = Math.max(0, this.likes - 1);
  } else {
    this.likedBy.push(identifier);
    this.likes += 1;
  }
  this.updatedAt = new Date();
  return this.save();
};

// Static method to get approved comments for an item
itemCommentSchema.statics.getApproved = function(itemId, itemType, options = {}) {
  const { sort = '-createdAt', limit, skip = 0 } = options;
  
  const query = this.find({
    itemId,
    itemType,
    approved: true
  }).sort(sort);
  
  if (skip) query.skip(skip);
  if (limit) query.limit(limit);
  
  return query;
};

// Pre-save hook to update updatedAt
itemCommentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const ItemComment = mongoose.model('ItemComment', itemCommentSchema);

module.exports = ItemComment;

