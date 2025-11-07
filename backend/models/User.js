const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  username: {
    type: String,
    required: [true, 'Username is required for your cosmic identity'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required for mission communications'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
  },
  
  password: {
    type: String,
    required: [true, 'Password is required to secure your space station'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  
  // OAuth Integration
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Profile Information
  profile: {
    displayName: {
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters']
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    avatar: {
      type: String,
      default: 'https://via.placeholder.com/150/965aff/ffffff?text=🚀'
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: 'A cosmic explorer navigating the digital universe! 🌌'
    },
    location: {
      type: String,
      maxlength: [100, 'Location cannot exceed 100 characters']
    },
    website: {
      type: String,
      match: [/^https?:\/\/.+/, 'Please provide a valid website URL']
    },
    github: {
      type: String,
      match: [/^https?:\/\/(www\.)?github\.com\/.+/, 'Please provide a valid GitHub URL']
    },
    linkedin: {
      type: String,
      match: [/^https?:\/\/(www\.)?linkedin\.com\/.+/, 'Please provide a valid LinkedIn URL']
    },
    twitter: {
      type: String,
      match: [/^https?:\/\/(www\.)?twitter\.com\/.+/, 'Please provide a valid Twitter URL']
    }
  },
  
  // Role and Permissions
  role: {
    type: String,
    enum: {
      values: ['user', 'admin', 'moderator'],
      message: 'Role must be either user, admin, or moderator'
    },
    default: 'user'
  },
  
  // Cosmic Achievements
  achievements: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    icon: String,
    earnedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Activity Tracking
  lastLogin: {
    type: Date,
    default: Date.now
  },
  
  loginCount: {
    type: Number,
    default: 0
  },
  
  // Account Status
  isActive: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  // Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['cosmic-dark', 'cosmic-light', 'nebula', 'galaxy'],
      default: 'cosmic-dark'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      guestbook: {
        type: Boolean,
        default: true
      },
      portfolio: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      showEmail: {
        type: Boolean,
        default: false
      },
      showLastLogin: {
        type: Boolean,
        default: true
      },
      allowMessages: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Statistics
  stats: {
    profileViews: {
      type: Number,
      default: 0
    },
    projectsCreated: {
      type: Number,
      default: 0
    },
    certificationsEarned: {
      type: Number,
      default: 0
    },
    achievementsEarned: {
      type: Number,
      default: 0
    },
    messagesPosted: {
      type: Number,
      default: 0
    },
    likesReceived: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('profile.fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.username;
});

// Virtual for cosmic rank based on stats
userSchema.virtual('cosmicRank').get(function() {
  const totalPoints = this.stats.profileViews + 
                     (this.stats.projectsCreated * 10) + 
                     (this.stats.messagesPosted * 5) + 
                     (this.stats.likesReceived * 3);
  
  if (totalPoints >= 1000) return { level: 'Galactic Commander', icon: '👑' };
  if (totalPoints >= 500) return { level: 'Space Captain', icon: '🚀' };
  if (totalPoints >= 200) return { level: 'Cosmic Explorer', icon: '🌟' };
  if (totalPoints >= 50) return { level: 'Star Navigator', icon: '⭐' };
  return { level: 'Space Cadet', icon: '🛸' };
});

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'stats.profileViews': -1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to ensure stats exist and update login stats
userSchema.pre('save', function(next) {
  // Ensure stats object exists with all fields
  if (!this.stats) {
    this.stats = {
      profileViews: 0,
      projectsCreated: 0,
      certificationsEarned: 0,
      achievementsEarned: 0,
      messagesPosted: 0,
      likesReceived: 0
    };
  } else {
    // Ensure all stat fields exist
    if (this.stats.profileViews === undefined) this.stats.profileViews = 0;
    if (this.stats.projectsCreated === undefined) this.stats.projectsCreated = 0;
    if (this.stats.certificationsEarned === undefined) this.stats.certificationsEarned = 0;
    if (this.stats.achievementsEarned === undefined) this.stats.achievementsEarned = 0;
    if (this.stats.messagesPosted === undefined) this.stats.messagesPosted = 0;
    if (this.stats.likesReceived === undefined) this.stats.likesReceived = 0;
  }
  
  if (this.isModified('lastLogin')) {
    this.loginCount += 1;
  }
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to generate auth token data
userSchema.methods.getAuthTokenData = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    avatar: this.profile.avatar
  };
};

// Instance method to get public profile
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    profile: this.profile,
    achievements: this.achievements,
    stats: this.stats,
    createdAt: this.createdAt
  };
};

// Instance method to add achievement
userSchema.methods.addAchievement = function(name, description, icon) {
  const existingAchievement = this.achievements.find(achievement => achievement.name === name);
  
  if (!existingAchievement) {
    this.achievements.push({
      name,
      description,
      icon
    });
    return true;
  }
  return false;
};

// Static method to find users by cosmic rank
userSchema.statics.findByCosmicRank = function(minLevel = 0) {
  return this.find({
    $expr: {
      $gte: [
        { $add: [
          '$stats.profileViews',
          { $multiply: ['$stats.projectsCreated', 10] },
          { $multiply: ['$stats.messagesPosted', 5] },
          { $multiply: ['$stats.likesReceived', 3] }
        ]},
        minLevel
      ]
    }
  }).sort({ 'stats.profileViews': -1 });
};

// Static method for leaderboard
userSchema.statics.getLeaderboard = function(limit = 10) {
  return this.aggregate([
    {
      $addFields: {
        totalPoints: {
          $add: [
            '$stats.profileViews',
            { $multiply: ['$stats.projectsCreated', 10] },
            { $multiply: ['$stats.messagesPosted', 5] },
            { $multiply: ['$stats.likesReceived', 3] }
          ]
        }
      }
    },
    {
      $sort: { totalPoints: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        username: 1,
        'profile.avatar': 1,
        'profile.fullName': 1,
        stats: 1,
        totalPoints: 1,
        achievements: 1
      }
    }
  ]);
};

module.exports = mongoose.model('User', userSchema);