const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const Portfolio = require('../models/Portfolio');
const Guestbook = require('../models/Guestbook');
const User = require('../models/User');
const { 
  authenticate, 
  authorize, 
  optionalAuth,
  trackActivity 
} = require('../middleware/auth');
const { validateAnalyticsEvent } = require('../middleware/validation');

// @route   GET /api/analytics/overview
// @desc    Get analytics overview
// @access  Public (Limited data) / Private (Full data)
router.get('/overview', optionalAuth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();
    
    // Public analytics (limited)
    const publicStats = await Promise.all([
      Portfolio.countDocuments({ visibility: 'public' }),
      Guestbook.countDocuments({ status: 'approved', isSpam: false }),
      User.countDocuments({ isActive: 'active' }),
      Analytics.countDocuments({ 
        eventType: 'page_view',
        timestamp: { $gte: startDate, $lte: endDate }
      })
    ]);
    
    const overviewData = {
      totalProjects: publicStats[0],
      totalMessages: publicStats[1],
      totalUsers: publicStats[2],
      recentViews: publicStats[3]
    };
    
    // Enhanced analytics for authenticated users
    if (req.user) {
      const [userAnalytics, popularProjects, recentActivity] = await Promise.all([
        Analytics.getUserAnalytics(req.user._id, startDate, endDate),
        Portfolio.find({ visibility: 'public' })
          .sort({ 'metrics.views': -1 })
          .limit(5)
          .select('title metrics.views metrics.likes')
          .lean(),
        Analytics.find({ 
          user: req.user._id,
          timestamp: { $gte: startDate, $lte: endDate }
        })
          .sort({ timestamp: -1 })
          .limit(10)
          .select('eventType eventName timestamp')
          .lean()
      ]);
      
      overviewData.userAnalytics = userAnalytics;
      overviewData.popularProjects = popularProjects;
      overviewData.recentActivity = recentActivity;
    }
    
    res.json({
      success: true,
      message: '📊 Cosmic analytics overview retrieved successfully!',
      data: {
        overview: overviewData,
        period: {
          days: parseInt(days),
          startDate,
          endDate
        }
      }
    });
    
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      error: 'Analytics Overview Failed',
      message: '🛠️ Houston, we have an analytics problem!'
    });
  }
});

// @route   GET /api/analytics/dashboard
// @desc    Get full analytics dashboard (Admin only)
// @access  Private (Admin)
router.get('/dashboard', 
  authenticate, 
  authorize('admin'), 
  trackActivity,
  async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const endDate = new Date();
      
      // Get comprehensive analytics
      const [
        pageViews,
        userAnalytics,
        deviceStats,
        geographicStats,
        conversionFunnel,
        topPages,
        realTimeStats,
        guestbookAnalytics
      ] = await Promise.all([
        Analytics.getPageViews(startDate, endDate, 'day'),
        User.aggregate([
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              activeUsers: { $sum: { $cond: [{ $eq: ['$isActive', 'active'] }, 1, 0] } },
              newUsers: {
                $sum: {
                  $cond: [
                    { $gte: ['$createdAt', startDate] },
                    1,
                    0
                  ]
                }
              },
              avgLoginCount: { $avg: '$loginCount' }
            }
          }
        ]),
        Analytics.getDeviceStats(startDate, endDate),
        Analytics.getGeographicStats(startDate, endDate),
        Analytics.getConversionFunnel(startDate, endDate),
        Analytics.getTopPages(startDate, endDate, 10),
        Analytics.getRealTimeStats(),
        Guestbook.getAnalytics()
      ]);
      
      // Calculate engagement metrics
      const totalEvents = await Analytics.countDocuments({
        timestamp: { $gte: startDate, $lte: endDate }
      });
      
      const bounceRate = await Analytics.aggregate([
        {
          $match: {
            eventType: 'page_view',
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$sessionId',
            pageViews: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            bounceSessions: { $sum: { $cond: [{ $eq: ['$pageViews', 1] }, 1, 0] } }
          }
        },
        {
          $project: {
            bounceRate: {
              $multiply: [
                { $divide: ['$bounceSessions', '$totalSessions'] },
                100
              ]
            }
          }
        }
      ]);
      
      res.json({
        success: true,
        message: '🚀 Comprehensive cosmic analytics dashboard retrieved!',
        data: {
          summary: {
            totalEvents,
            pageViews: pageViews.reduce((sum, day) => sum + day.views, 0),
            bounceRate: bounceRate[0]?.bounceRate || 0,
            period: { days: parseInt(days), startDate, endDate }
          },
          charts: {
            pageViews,
            deviceStats,
            geographicStats,
            conversionFunnel
          },
          insights: {
            topPages,
            userAnalytics: userAnalytics[0] || {},
            guestbookAnalytics: guestbookAnalytics[0] || {},
            realTimeStats: realTimeStats[0] || {}
          }
        }
      });
      
    } catch (error) {
      console.error('Analytics dashboard error:', error);
      res.status(500).json({
        error: 'Analytics Dashboard Failed',
        message: '🛠️ Houston, we have a dashboard problem!'
      });
    }
  }
);

// @route   POST /api/analytics/track
// @desc    Track custom analytics event
// @access  Public
router.post('/track', validateAnalyticsEvent, async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      timestamp: new Date()
    };
    
    // Add user ID if authenticated
    const authHeader = req.header('Authorization');
    if (authHeader) {
      try {
        const { verifyToken } = require('../middleware/auth');
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id);
        if (user && user.isActive === 'active') {
          eventData.user = user._id;
        }
      } catch (error) {
        // Continue without user authentication for analytics
      }
    }
    
    const analyticsEvent = await Analytics.trackEvent(eventData);
    
    res.status(201).json({
      success: true,
      message: '📊 Event tracked successfully!',
      data: { 
        eventId: analyticsEvent._id,
        tracked: true 
      }
    });
    
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({
      error: 'Analytics Tracking Failed',
      message: '🛠️ Houston, we have a tracking problem!'
    });
  }
});

// @route   GET /api/analytics/realtime
// @desc    Get real-time analytics
// @access  Private (Admin)
router.get('/realtime', 
  authenticate, 
  authorize('admin'), 
  async (req, res) => {
    try {
      const realTimeData = await Analytics.getRealTimeStats();
      
      // Get recent events (last 5 minutes)
      const recentEvents = await Analytics.find({
        timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      })
        .populate('user', 'username')
        .sort({ timestamp: -1 })
        .limit(20)
        .select('eventType eventName user timestamp page.path device.type')
        .lean();
      
      res.json({
        success: true,
        message: '⚡ Real-time cosmic analytics retrieved!',
        data: {
          stats: realTimeData[0] || {
            activeUsersCount: 0,
            pageViews: 0,
            events: 0
          },
          recentEvents,
          timestamp: new Date()
        }
      });
      
    } catch (error) {
      console.error('Real-time analytics error:', error);
      res.status(500).json({
        error: 'Real-time Analytics Failed',
        message: '🛠️ Houston, we have a real-time problem!'
      });
    }
  }
);

// @route   GET /api/analytics/performance
// @desc    Get performance analytics
// @access  Private (Admin)
router.get('/performance', 
  authenticate, 
  authorize('admin'), 
  async (req, res) => {
    try {
      const { days = 7 } = req.query;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const performanceData = await Analytics.aggregate([
        {
          $match: {
            eventType: 'page_view',
            timestamp: { $gte: startDate },
            'performance.loadTime': { $exists: true, $gt: 0 }
          }
        },
        {
          $group: {
            _id: '$page.path',
            avgLoadTime: { $avg: '$performance.loadTime' },
            avgTimeOnPage: { $avg: '$performance.timeOnPage' },
            avgScrollDepth: { $avg: '$performance.scrollDepth' },
            views: { $sum: 1 }
          }
        },
        { $sort: { views: -1 } },
        { $limit: 20 }
      ]);
      
      // Calculate overall performance metrics
      const overallPerformance = await Analytics.aggregate([
        {
          $match: {
            eventType: 'page_view',
            timestamp: { $gte: startDate },
            'performance.loadTime': { $exists: true, $gt: 0 }
          }
        },
        {
          $group: {
            _id: null,
            avgLoadTime: { $avg: '$performance.loadTime' },
            medianLoadTime: { $push: '$performance.loadTime' },
            p95LoadTime: { $push: '$performance.loadTime' },
            totalPageViews: { $sum: 1 }
          }
        }
      ]);
      
      res.json({
        success: true,
        message: '⚡ Performance analytics retrieved successfully!',
        data: {
          pagePerformance: performanceData,
          overall: overallPerformance[0] || {},
          period: { days: parseInt(days), startDate }
        }
      });
      
    } catch (error) {
      console.error('Performance analytics error:', error);
      res.status(500).json({
        error: 'Performance Analytics Failed',
        message: '🛠️ Houston, we have a performance problem!'
      });
    }
  }
);

// @route   GET /api/analytics/trends
// @desc    Get trending analytics
// @access  Public (Limited) / Private (Full)
router.get('/trends', optionalAuth, async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    let days;
    switch (period) {
      case 'day': days = 1; break;
      case 'week': days = 7; break;
      case 'month': days = 30; break;
      case 'year': days = 365; break;
      default: days = 7;
    }
    
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Public trends
    const [trendingProjects, popularMessages, activeUsers] = await Promise.all([
      Portfolio.getTrending(days, 10),
      Guestbook.find({
        status: 'approved',
        createdAt: { $gte: startDate }
      })
        .sort({ likes: -1, views: -1 })
        .limit(5)
        .populate('user', 'username profile.avatar')
        .select('name message likes views createdAt')
        .lean(),
      User.find({
        lastLogin: { $gte: startDate },
        isActive: 'active'
      })
        .sort({ loginCount: -1 })
        .limit(5)
        .select('username profile.avatar stats loginCount')
        .lean()
    ]);
    
    const trendsData = {
      trendingProjects,
      popularMessages,
      activeUsers: req.user ? activeUsers : [] // Only show to authenticated users
    };
    
    // Enhanced trends for admins
    if (req.user && req.user.role === 'admin') {
      const searchTrends = await Analytics.aggregate([
        {
          $match: {
            eventType: 'search',
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$eventData.query',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      
      trendsData.searchTrends = searchTrends;
    }
    
    res.json({
      success: true,
      message: '📈 Cosmic trends retrieved successfully!',
      data: {
        trends: trendsData,
        period: { 
          type: period, 
          days, 
          startDate 
        }
      }
    });
    
  } catch (error) {
    console.error('Trends analytics error:', error);
    res.status(500).json({
      error: 'Trends Analytics Failed',
      message: '🛠️ Houston, we have a trends problem!'
    });
  }
});

// @route   GET /api/analytics/export
// @desc    Export analytics data (Admin only)
// @access  Private (Admin)
router.get('/export', 
  authenticate, 
  authorize('admin'), 
  trackActivity,
  async (req, res) => {
    try {
      const { startDate, endDate, format = 'json', eventType } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'Date Range Required',
          message: '📅 Please provide start and end dates for export!'
        });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start >= end) {
        return res.status(400).json({
          error: 'Invalid Date Range',
          message: '📅 Start date must be before end date!'
        });
      }
      
      // Build filter
      const filter = {
        timestamp: { $gte: start, $lte: end }
      };
      
      if (eventType) {
        filter.eventType = eventType;
      }
      
      const analyticsData = await Analytics.find(filter)
        .populate('user', 'username email')
        .sort({ timestamp: -1 })
        .lean();
      
      if (format === 'csv') {
        // Convert to CSV format
        const csvHeaders = [
          'Timestamp', 'Event Type', 'Event Name', 'User', 'Page Path',
          'Device Type', 'Browser', 'Country', 'IP Address'
        ].join(',');
        
        const csvRows = analyticsData.map(event => [
          event.timestamp.toISOString(),
          event.eventType,
          event.eventName,
          event.user?.username || 'Anonymous',
          event.page?.path || '',
          event.device?.type || '',
          event.device?.browser || '',
          event.location?.country || '',
          event.ipAddress
        ].join(','));
        
        const csvContent = [csvHeaders, ...csvRows].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv`);
        res.send(csvContent);
      } else {
        // JSON format
        res.json({
          success: true,
          message: '📊 Analytics data exported successfully!',
          data: {
            analytics: analyticsData,
            summary: {
              totalEvents: analyticsData.length,
              dateRange: { startDate: start, endDate: end },
              eventTypes: [...new Set(analyticsData.map(e => e.eventType))]
            }
          }
        });
      }
      
    } catch (error) {
      console.error('Analytics export error:', error);
      res.status(500).json({
        error: 'Analytics Export Failed',
        message: '🛠️ Houston, we have an export problem!'
      });
    }
  }
);

// @route   DELETE /api/analytics/cleanup
// @desc    Cleanup old analytics data (Admin only)
// @access  Private (Admin)
router.delete('/cleanup', 
  authenticate, 
  authorize('admin'), 
  trackActivity,
  async (req, res) => {
    try {
      const { days = 365 } = req.query; // Default: keep last year
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const result = await Analytics.deleteMany({
        timestamp: { $lt: cutoffDate }
      });
      
      res.json({
        success: true,
        message: `🧹 Cleaned up ${result.deletedCount} old analytics records!`,
        data: {
          deletedCount: result.deletedCount,
          cutoffDate
        }
      });
      
    } catch (error) {
      console.error('Analytics cleanup error:', error);
      res.status(500).json({
        error: 'Analytics Cleanup Failed',
        message: '🛠️ Houston, we have a cleanup problem!'
      });
    }
  }
);

module.exports = router;