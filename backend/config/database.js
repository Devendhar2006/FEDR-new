const mongoose = require('mongoose');
const colors = require('./colors');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`${colors.cyan}🚀 MongoDB Connected: ${conn.connection.host}${colors.reset}`);
    console.log(`${colors.green}🌟 Database: ${conn.connection.name}${colors.reset}`);
    console.log(`${colors.magenta}✨ Ready to launch into the cosmic database!${colors.reset}`);
    
    // Connection events
    mongoose.connection.on('connected', () => {
      console.log(`${colors.green}🌌 Mongoose connected to cosmic database${colors.reset}`);
    });

    mongoose.connection.on('error', (err) => {
      console.log(`${colors.red}❌ Mongoose connection error: ${err}${colors.reset}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log(`${colors.yellow}🌙 Mongoose disconnected from cosmic database${colors.reset}`);
    });

    return conn;
  } catch (error) {
    console.error(`${colors.red}❌ Database connection failed:${colors.reset}`, error.message);
    process.exit(1);
  }
};

module.exports = connectDB;