const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');

// Contact model (simple in-memory or database storage)
const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['new', 'read', 'responded', 'archived'],
    default: 'new'
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

const Contact = mongoose.model('Contact', contactSchema);

// @route   POST /api/contact
// @desc    Submit contact form
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '🚫 All fields are required for cosmic communication!'
      });
    }
    
    if (message.length < 10) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '🚫 Message must be at least 10 characters long!'
      });
    }
    
    // Create contact entry
    const contact = new Contact({
      name,
      email,
      subject,
      message,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    await contact.save();
    
    // Track analytics
    await Analytics.trackEvent({
      eventType: 'contact_form',
      eventName: 'Contact Form Submission',
      sessionId: req.sessionID || 'anonymous',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      page: {
        url: req.originalUrl,
        path: '/contact'
      },
      eventData: {
        subject
      }
    });
    
    // In production, you would send an email here using nodemailer
    // const nodemailer = require('nodemailer');
    // await sendEmail({ to: process.env.ADMIN_EMAIL, subject, message });
    
    res.status(201).json({
      success: true,
      message: '📧 Thank you for reaching out! Your cosmic message has been received. We\'ll respond soon!',
      data: {
        contactId: contact._id,
        submittedAt: contact.createdAt
      }
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      error: 'Submission Failed',
      message: '🛠️ Houston, we have a contact form problem! Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/contact
// @desc    Get all contact submissions (admin only)
// @access  Private (Admin)
router.get('/', async (req, res) => {
  try {
    const { authenticate, authorize } = require('../middleware/auth');
    
    await authenticate(req, res, async () => {
      await authorize('admin')(req, res, async () => {
        const { page = 1, limit = 20, status } = req.query;
        
        const filter = {};
        if (status) filter.status = status;
        
        const skip = (page - 1) * limit;
        
        const [contacts, total] = await Promise.all([
          Contact.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
          Contact.countDocuments(filter)
        ]);
        
        res.json({
          success: true,
          message: '📧 Contact submissions retrieved!',
          data: {
            contacts,
            pagination: {
              currentPage: parseInt(page),
              totalPages: Math.ceil(total / limit),
              totalItems: total
            }
          }
        });
      });
    });
  } catch (error) {
    console.error('Contact fetch error:', error);
    res.status(500).json({
      error: 'Fetch Failed',
      message: '🛠️ Houston, we have a problem!'
    });
  }
});

module.exports = router;
