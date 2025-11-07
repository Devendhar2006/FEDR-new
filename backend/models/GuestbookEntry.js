const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  avatar: {
    type: String,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const guestbookEntrySchema = new mongoose.Schema({
  // User info
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  avatar: {
    type: String,
    trim: true
  },
  
  // Message
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 240
  },
  
  // Project/Portfolio linking (UNIQUE FEATURE)
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  projectTitle: {
    type: String,
    trim: true
  },
  projectType: {
    type: String,
    enum: ['project', 'portfolio', 'blog', 'general'],
    default: 'general'
  },
  
  // Engagement
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: String // IP addresses or user IDs
  }],
  
  // Replies (nested comments)
  replies: [replySchema],
  
  // Admin features
  pinned: {
    type: Boolean,
    default: false
  },
  approved: {
    type: Boolean,
    default: true // Auto-approve by default, can be changed
  },
  reported: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Indexes for performance
guestbookEntrySchema.index({ createdAt: -1 });
guestbookEntrySchema.index({ projectId: 1 });
guestbookEntrySchema.index({ projectType: 1 });
guestbookEntrySchema.index({ pinned: -1, createdAt: -1 });
guestbookEntrySchema.index({ approved: 1 });

// Virtual for reply count
guestbookEntrySchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Ensure virtuals are included in JSON
guestbookEntrySchema.set('toJSON', { virtuals: true });
guestbookEntrySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('GuestbookEntry', guestbookEntrySchema);
