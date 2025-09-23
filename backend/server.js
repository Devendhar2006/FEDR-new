const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolio');
const guestbookRoutes = require('./routes/guestbook');
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/users');

// Create Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    type: 'rate_limit_exceeded'
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      // Allow inline scripts for the static frontend (index.html contains inline JS)
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(compression());
app.use(morgan('combined'));
app.use(limiter);

app.use(cors({
  origin: function(origin, callback) {
    const dev = (process.env.NODE_ENV || 'development') === 'development';
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    // Allow same-origin or no-origin (curl, Postman)
    if (!origin) return callback(null, true);

    // In dev, allow any localhost/127.0.0.1 port for convenience
    if (dev && (/^http:\/\/localhost:\d+$/i.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/i.test(origin))) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cosmic-devspace', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('🚀 Connected to MongoDB - Database is in orbit!');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'operational', 
    message: '🛰️ Cosmic DevSpace API is in orbit!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/guestbook', guestbookRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);

// Root route serves frontend
app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// SPA fallback for non-API routes
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🌟 New space traveler connected:', socket.id);
  
  // Join analytics room for real-time updates
  socket.join('analytics');
  
  // Handle new guestbook message
  socket.on('new_message', (data) => {
    socket.broadcast.emit('message_received', data);
  });
  
  // Handle real-time analytics updates
  socket.on('page_view', (data) => {
    socket.broadcast.to('analytics').emit('analytics_update', {
      type: 'page_view',
      timestamp: new Date(),
      ...data
    });
  });
  
  socket.on('disconnect', () => {
    console.log('👋 Space traveler disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Error encountered:', err.stack);
  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Houston, we have a validation problem!',
      details: errors
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID',
      message: 'The cosmic coordinates you provided are invalid!'
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      error: 'Duplicate Entry',
      message: 'This cosmic signature already exists in our galaxy!'
    });
  }
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: 'Houston, we have a problem! Our space engineers are investigating.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler (for API-only after SPA/static)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: '🌌 This cosmic location does not exist in our universe!',
    suggestion: 'Check your space coordinates and try again.'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('💫 Server closed. Process terminated.');
    mongoose.connection.close();
  });
});

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '127.0.0.1';

server.listen(PORT, HOST, () => {
  console.log(`
  🚀 Cosmic DevSpace Backend launched successfully!
  
  🌟 Server Status: OPERATIONAL
  🛰️  Address: http://${HOST}:${PORT}
  🌍 Environment: ${process.env.NODE_ENV || 'development'}
  📡 Socket.IO: ACTIVE
  🗄️  Database: ${mongoose.connection.readyState === 1 ? 'CONNECTED' : 'CONNECTING'}
  
  🌌 Ready to serve the cosmic community!
  `);
});

module.exports = { app, io };