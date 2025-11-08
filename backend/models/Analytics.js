const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  // Event Information
  eventType: {
    type: String,
    required: [true, 'Event type is required for cosmic tracking'],
    enum: {
      values: [
        'page_view', 'user_login', 'user_register', 'user_logout', 'project_view', 'project_like', 
        'message_post', 'message_like', 'profile_view', 'search', 'download',
        'share', 'contact', 'error', 'performance', 'custom', 'guestbook_entry',
        'profile_creation', 'contact_form', 'blog_view', 'item_view', 'project_creation'
      ],
      message: 'Event type must be one of the specified tracking events'
    }
  },
  
  eventName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Event name cannot exceed 100 characters']
  },
  
  // User and Session Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Anonymous users will have null
  },
  
  sessionId: {
    type: String,
    required: false,
    default: 'anonymous',
    index: true
  },
  
  // Request Information
  ipAddress: {
    type: String,
    required: false,
    default: '0.0.0.0'
  },
  
  userAgent: {
    type: String,
    default: ''
  },
  
  // Geographic Information
  location: {
    country: String,
    countryCode: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number,
    timezone: String
  },
  
  // Device and Browser Information
  device: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown'
    },
    browser: String,
    browserVersion: String,
    os: String,
    osVersion: String,
    screenResolution: String,
    viewport: {
      width: Number,
      height: Number
    }
  },
  
  // Page and Referrer Information
  page: {
    url: {
      type: String,
      required: false,
      default: ''
    },
    title: String,
    path: String,
    query: String,
    fragment: String
  },
  
  referrer: {
    url: String,
    domain: String,
    source: {
      type: String,
      enum: ['direct', 'search', 'social', 'email', 'referral', 'unknown'],
      default: 'unknown'
    }
  },
  
  // Event-specific Data
  eventData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Performance Metrics
  performance: {
    loadTime: Number, // Page load time in milliseconds
    renderTime: Number, // Time to first render
    interactionTime: Number, // Time to first interaction
    timeOnPage: Number, // Duration spent on page
    scrollDepth: Number, // Maximum scroll depth (0-100%)
    clickCount: Number,
    keystrokes: Number
  },
  
  // Conversion and Goals
  conversion: {
    isConversion: {
      type: Boolean,
      default: false
    },
    conversionType: {
      type: String,
      enum: ['signup', 'login', 'contact', 'download', 'share', 'like', 'custom']
    },
    conversionValue: Number,
    goalId: String
  },
  
  // A/B Testing and Experiments
  experiments: [{
    experimentId: String,
    variant: String,
    startTime: Date,
    endTime: Date
  }],
  
  // Error Tracking
  error: {
    hasError: {
      type: Boolean,
      default: false
    },
    errorType: String,
    errorMessage: String,
    errorStack: String,
    errorFile: String,
    errorLine: Number
  },
  
  // Custom Dimensions
  customDimensions: {
    type: Map,
    of: String
  },
  
  // Timestamp and Duration
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  duration: {
    type: Number, // Duration in milliseconds
    default: 0
  }
}, {
  timestamps: false, // We're using custom timestamp
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted date
analyticsSchema.virtual('formattedDate').get(function() {
  return this.timestamp.toISOString().split('T')[0];
});

// Virtual for hour of day
analyticsSchema.virtual('hourOfDay').get(function() {
  return this.timestamp.getHours();
});

// Virtual for day of week
analyticsSchema.virtual('dayOfWeek').get(function() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[this.timestamp.getDay()];
});

// Indexes for better performance
analyticsSchema.index({ eventType: 1 });
analyticsSchema.index({ user: 1 });
analyticsSchema.index({ sessionId: 1 });
analyticsSchema.index({ timestamp: -1 });
analyticsSchema.index({ 'page.path': 1 });
analyticsSchema.index({ 'device.type': 1 });
analyticsSchema.index({ 'location.country': 1 });
analyticsSchema.index({ 'referrer.source': 1 });
analyticsSchema.index({ 'conversion.isConversion': 1 });

// Compound indexes for common queries
analyticsSchema.index({ eventType: 1, timestamp: -1 });
analyticsSchema.index({ user: 1, timestamp: -1 });
analyticsSchema.index({ sessionId: 1, timestamp: -1 });

// TTL index to automatically delete old analytics data (keep for 2 years)
analyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

// Pre-save middleware to extract device information from user agent
analyticsSchema.pre('save', function(next) {
  if (this.isModified('userAgent') && this.userAgent) {
    // Basic user agent parsing (in production, use a proper UA parser library)
    const ua = this.userAgent.toLowerCase();
    
    // Detect device type
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      this.device.type = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      this.device.type = 'tablet';
    } else {
      this.device.type = 'desktop';
    }
    
    // Detect browser
    if (ua.includes('chrome')) {
      this.device.browser = 'Chrome';
    } else if (ua.includes('firefox')) {
      this.device.browser = 'Firefox';
    } else if (ua.includes('safari')) {
      this.device.browser = 'Safari';
    } else if (ua.includes('edge')) {
      this.device.browser = 'Edge';
    } else {
      this.device.browser = 'Unknown';
    }
    
    // Detect OS
    if (ua.includes('windows')) {
      this.device.os = 'Windows';
    } else if (ua.includes('mac')) {
      this.device.os = 'macOS';
    } else if (ua.includes('linux')) {
      this.device.os = 'Linux';
    } else if (ua.includes('android')) {
      this.device.os = 'Android';
    } else if (ua.includes('ios')) {
      this.device.os = 'iOS';
    } else {
      this.device.os = 'Unknown';
    }
  }
  next();
});

// Pre-save middleware to extract referrer source
analyticsSchema.pre('save', function(next) {
  if (this.isModified('referrer.url') && this.referrer.url) {
    try {
      const url = new URL(this.referrer.url);
      this.referrer.domain = url.hostname;
      
      // Determine referrer source
      if (url.hostname.includes('google.') || url.hostname.includes('bing.') || 
          url.hostname.includes('yahoo.') || url.hostname.includes('duckduckgo.')) {
        this.referrer.source = 'search';
      } else if (url.hostname.includes('facebook.') || url.hostname.includes('twitter.') || 
                 url.hostname.includes('linkedin.') || url.hostname.includes('instagram.')) {
        this.referrer.source = 'social';
      } else if (url.hostname.includes('gmail.') || url.hostname.includes('outlook.') || 
                 url.hostname.includes('mail.')) {
        this.referrer.source = 'email';
      } else {
        this.referrer.source = 'referral';
      }
    } catch (error) {
      this.referrer.source = 'unknown';
    }
  } else if (!this.referrer.url) {
    this.referrer.source = 'direct';
  }
  next();
});

// Static method to track event
analyticsSchema.statics.trackEvent = function(eventData) {
  const event = new this(eventData);
  return event.save();
};

// Static method to get page views
analyticsSchema.statics.getPageViews = function(startDate, endDate, groupBy = 'day') {
  const matchStage = {
    eventType: 'page_view',
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  let groupFormat;
  switch (groupBy) {
    case 'hour':
      groupFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } };
      break;
    case 'day':
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
      break;
    case 'week':
      groupFormat = { $dateToString: { format: '%Y-W%U', date: '$timestamp' } };
      break;
    case 'month':
      groupFormat = { $dateToString: { format: '%Y-%m', date: '$timestamp' } };
      break;
    default:
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: groupFormat,
        views: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' },
        uniqueSessions: { $addToSet: '$sessionId' }
      }
    },
    {
      $addFields: {
        uniqueUsersCount: { $size: '$uniqueUsers' },
        uniqueSessionsCount: { $size: '$uniqueSessions' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

// Static method to get user analytics
analyticsSchema.statics.getUserAnalytics = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        lastActivity: { $max: '$timestamp' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get top pages
analyticsSchema.statics.getTopPages = function(startDate, endDate, limit = 10) {
  return this.aggregate([
    {
      $match: {
        eventType: 'page_view',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$page.path',
        views: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' },
        avgTimeOnPage: { $avg: '$performance.timeOnPage' },
        avgScrollDepth: { $avg: '$performance.scrollDepth' }
      }
    },
    {
      $addFields: {
        uniqueUsersCount: { $size: '$uniqueUsers' }
      }
    },
    { $sort: { views: -1 } },
    { $limit: limit }
  ]);
};

// Static method to get device statistics
analyticsSchema.statics.getDeviceStats = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        eventType: 'page_view',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          type: '$device.type',
          browser: '$device.browser',
          os: '$device.os'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get geographic statistics
analyticsSchema.statics.getGeographicStats = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        eventType: 'page_view',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          country: '$location.country',
          city: '$location.city'
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' }
      }
    },
    {
      $addFields: {
        uniqueUsersCount: { $size: '$uniqueUsers' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get conversion funnel
analyticsSchema.statics.getConversionFunnel = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        conversions: { $sum: { $cond: ['$conversion.isConversion', 1, 0] } }
      }
    },
    {
      $addFields: {
        conversionRate: {
          $multiply: [
            { $divide: ['$conversions', '$count'] },
            100
          ]
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get real-time analytics
analyticsSchema.statics.getRealTimeStats = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: fiveMinutesAgo }
      }
    },
    {
      $group: {
        _id: null,
        activeUsers: { $addToSet: '$sessionId' },
        pageViews: { $sum: { $cond: [{ $eq: ['$eventType', 'page_view'] }, 1, 0] } },
        events: { $sum: 1 }
      }
    },
    {
      $addFields: {
        activeUsersCount: { $size: '$activeUsers' }
      }
    }
  ]);
};

module.exports = mongoose.model('Analytics', analyticsSchema);