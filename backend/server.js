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
const session = require('express-session');
const passport = require('./config/passport');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const googleAuthRoutes = require('./routes/google-auth');
const portfolioRoutes = require('./routes/portfolio');
const guestbookRoutes = require('./routes/guestbook');
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/users');
const blogRoutes = require('./routes/blog');
const contactRoutes = require('./routes/contact');

// Create Express app
const app = express();
const server = http.createServer(app);

// Trust proxy for Render.com (IMPORTANT for rate limiting and CORS)
app.set('trust proxy', 1);

// Initialize Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Rate limiting - More permissive in development
const isDevelopment = (process.env.NODE_ENV || 'development') === 'development';
const limiter = rateLimit({
  windowMs: isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min in dev, 15 min in prod
  max: isDevelopment ? 1000 : 100, // 1000 requests in dev, 100 in prod
  message: {
    error: 'Too many requests from this IP, please try again later.',
    type: 'rate_limit_exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
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
      'http://localhost:8080',
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'http://127.0.0.1:8080',
      'https://fedr-new.vercel.app',
      process.env.CORS_ORIGIN,
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
      console.log(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration (required for Passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'cosmic-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Disable caching for development - force fresh loads
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Serve static frontend
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

// Database connection
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cosmic-devspace', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // fail fast if DB not reachable
  socketTimeoutMS: 45000
})
.then(() => {
  console.log('🚀 Connected to MongoDB - Database is in orbit!');
})
.catch((error) => {
  console.error('❌ MongoDB connection error (continuing to serve frontend):', error);
  // Do not exit the process; allow static frontend and non-DB endpoints to serve
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
// Log database connection status for debugging
app.use('/api', (req, res, next) => {
  const readyState = mongoose.connection.readyState;
  const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  // Log connection state on each request (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`📡 DB State: ${stateNames[readyState]} | Request: ${req.method} ${req.path}`);
  }
  
  // Allow health check, auth, and OAuth endpoints regardless of DB state (for development)
  const allowedPaths = ['/health', '/auth/register', '/auth/login', '/auth/google/status', '/auth/google', '/auth/google/callback'];
  const isAllowed = allowedPaths.some(path => req.path.includes(path));
  
  // Only block if disconnected (0) or disconnecting (3), and not an allowed path
  // In development, allow all requests to pass through for better error messages
  const isDev = (process.env.NODE_ENV || 'development') === 'development';
  if ((readyState === 0 || readyState === 3) && !isAllowed && !isDev) {
    console.error(`❌ Request blocked - DB ${stateNames[readyState]}: ${req.method} ${req.path}`);
    return res.status(503).json({
      error: 'Service Unavailable',
      message: '🛰️ Database link lost. Please try again in a moment.',
    });
  }
  
  next();
});
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/guestbook', guestbookRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/contact', contactRoutes);

// Root route serves frontend
app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Serve specific HTML files if they exist, otherwise fallback to index.html for SPA
app.get(/^\/(?!api).*/, (req, res) => {
  const requestedPath = req.path;
  
  // If it's a request for a specific HTML file, try to serve it
  if (requestedPath.endsWith('.html')) {
    const filePath = path.join(FRONTEND_DIR, requestedPath);
    if (require('fs').existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }
  
  // For all other routes (including paths without .html), serve index.html for SPA routing
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

// Bind to all interfaces to avoid Windows localhost binding issues
server.listen(PORT, () => {
  const addressInfo = server.address();
  const hostShown = typeof addressInfo === 'object' && addressInfo ? addressInfo.address : '127.0.0.1';
  console.log(`
  🚀 Cosmic DevSpace Backend launched successfully!
  
  🌟 Server Status: OPERATIONAL
  🛰️  Address: http://${hostShown}:${PORT}
  🌍 Environment: ${process.env.NODE_ENV || 'development'}
  📡 Socket.IO: ACTIVE
  🗄️  Database: ${mongoose.connection.readyState === 1 ? 'CONNECTED' : 'CONNECTING'}
  
  🌌 Ready to serve the cosmic community!
  `);
});

module.exports = { app, io };