const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { generateToken, generateRefreshToken } = require('../middleware/auth');

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth flow
// @access  Public
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login.html?error=google_auth_failed',
    session: false // We'll use JWT instead of sessions
  }),
  async (req, res) => {
    try {
      // User is available in req.user from passport
      const user = req.user;

      if (!user) {
        console.error('❌ No user found after Google OAuth');
        return res.redirect('/login.html?error=auth_failed');
      }

      console.log('✅ Google OAuth successful for user:', user.email);

      // Generate JWT tokens
      const tokenData = user.getAuthTokenData();
      const token = generateToken(tokenData);
      const refreshToken = generateRefreshToken(tokenData);

      // Redirect to frontend with tokens in URL params (will be stored in localStorage by frontend)
      // For better security, you could use httpOnly cookies instead
      const frontendURL = process.env.FRONTEND_URL || 'http://127.0.0.1:5050';
      const redirectURL = `${frontendURL}/google-auth-success.html?token=${token}&refresh=${refreshToken}&user=${encodeURIComponent(JSON.stringify({
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.profile?.displayName || user.username,
        avatar: user.profile?.avatar
      }))}`;

      res.redirect(redirectURL);
    } catch (error) {
      console.error('❌ Google OAuth callback error:', error);
      res.redirect('/login.html?error=auth_error');
    }
  }
);

// @route   GET /api/auth/google/status
// @desc    Check Google OAuth configuration status
// @access  Public
router.get('/google/status', (req, res) => {
  const isConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  
  res.json({
    success: true,
    configured: isConfigured,
    message: isConfigured 
      ? '🔐 Google OAuth is configured and ready' 
      : '⚠️ Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://127.0.0.1:5050/api/auth/google/callback'
  });
});

module.exports = router;

