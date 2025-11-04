const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://127.0.0.1:5050/api/auth/google/callback',
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔐 Google OAuth - Profile received:', {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName
        });

        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          console.log('✅ Existing Google user found:', user.email);
          return done(null, user);
        }

        // Check if user exists with this email
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        
        if (!email) {
          return done(new Error('No email provided by Google'), null);
        }

        user = await User.findOne({ email: email.toLowerCase() });

        if (user) {
          // Link Google account to existing user
          console.log('🔗 Linking Google account to existing user:', user.email);
          user.googleId = profile.id;
          user.profile.avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : user.profile.avatar;
          await user.save();
          return done(null, user);
        }

        // Create new user
        console.log('🆕 Creating new user from Google OAuth');
        
        const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const displayName = profile.displayName || email.split('@')[0];
        
        user = new User({
          username: username,
          email: email.toLowerCase(),
          password: Math.random().toString(36).slice(-12) + 'Aa1!', // Random secure password (not used for Google login)
          googleId: profile.id,
          profile: {
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            displayName: displayName,
            avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=965aff&color=ffffff&size=150`,
            bio: `Cosmic traveler exploring the digital universe 🚀`
          },
          isEmailVerified: true // Google emails are pre-verified
        });

        await user.save();
        
        // Add welcome achievement
        user.addAchievement(
          'Space Cadet',
          'Welcome to the cosmic community! Your journey among the stars begins now.',
          '🚀'
        );
        await user.save();

        console.log('✅ New user created via Google OAuth:', user.email);
        return done(null, user);
      } catch (error) {
        console.error('❌ Google OAuth Error:', error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;

