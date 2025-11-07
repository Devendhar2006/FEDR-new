const mongoose = require('mongoose');

// Your MongoDB connection string - with new password
const MONGODB_URI = "mongodb+srv://Devendhar:devendhar30@cluster0.lwbmy5v.mongodb.net/cosmic-devspace?retryWrites=true&w=majority";

console.log('🔄 Attempting to connect to MongoDB...');
console.log('📍 Cluster: cluster0.lwbmy5v.mongodb.net');
console.log('👤 Username: Devendhar');
console.log('🔐 Password: devendhar30');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000
})
.then(() => {
  console.log('\n✅ SUCCESS! MongoDB connection established!');
  console.log('🎉 Your database is working correctly!');
  process.exit(0);
})
.catch((error) => {
  console.log('\n❌ CONNECTION FAILED!');
  console.log('Error details:', error.message);
  
  if (error.message.includes('authentication')) {
    console.log('\n🔐 Authentication Error - Possible causes:');
    console.log('  1. Incorrect username or password');
    console.log('  2. User not created in MongoDB Atlas');
    console.log('  3. Password contains special characters that need encoding');
  } else if (error.message.includes('IP') || error.message.includes('not allowed')) {
    console.log('\n🌐 IP Whitelist Error - Solution:');
    console.log('  1. Go to MongoDB Atlas: https://cloud.mongodb.com');
    console.log('  2. Select your cluster');
    console.log('  3. Click "Network Access" in left menu');
    console.log('  4. Click "Add IP Address"');
    console.log('  5. Choose "Allow Access from Anywhere" (0.0.0.0/0)');
    console.log('  6. Wait 2-3 minutes for changes to apply');
  } else if (error.message.includes('timeout')) {
    console.log('\n⏱️ Connection Timeout - Possible causes:');
    console.log('  1. Cluster is paused or sleeping');
    console.log('  2. Network firewall blocking connection');
    console.log('  3. IP address not whitelisted');
  }
  
  process.exit(1);
});
