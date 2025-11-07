const mongoose = require('mongoose');
const User = require('./backend/models/User');

// MongoDB connection string
const MONGODB_URI = "mongodb+srv://Devendhar:devendhar30@cluster0.lwbmy5v.mongodb.net/cosmic-devspace?retryWrites=true&w=majority";

console.log('🔧 Starting user stats migration...');

async function fixUserStats() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');
    
    // Wait a moment for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Find all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      let needsUpdate = false;

      // Initialize stats if missing
      if (!user.stats) {
        user.stats = {
          profileViews: 0,
          projectsCreated: 0,
          certificationsEarned: 0,
          achievementsEarned: 0,
          messagesPosted: 0,
          likesReceived: 0
        };
        needsUpdate = true;
        console.log(`  🔧 Initializing stats for user: ${user.username}`);
      } else {
        // Add missing fields to existing stats
        if (user.stats.certificationsEarned === undefined) {
          user.stats.certificationsEarned = 0;
          needsUpdate = true;
        }
        if (user.stats.achievementsEarned === undefined) {
          user.stats.achievementsEarned = 0;
          needsUpdate = true;
        }
        if (needsUpdate) {
          console.log(`  🔧 Updating stats for user: ${user.username}`);
        }
      }

      if (needsUpdate) {
        await user.save();
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log('\n✅ Migration complete!');
    console.log(`   Updated: ${updatedCount} users`);
    console.log(`   Skipped: ${skippedCount} users (already have correct stats)`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

fixUserStats();
