# MongoDB Setup Guide for Cosmic DevSpace

## 🚀 Quick Start - MongoDB Atlas (Recommended - FREE)

### Step 1: Create MongoDB Atlas Account
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up with Google or email (FREE)
3. Choose "Free Shared" cluster (M0)
4. Select your region (choose closest to you)
5. Click "Create Cluster" (takes 3-5 minutes)

### Step 2: Create Database User
1. In Atlas dashboard, go to "Database Access" (left sidebar)
2. Click "+ ADD NEW DATABASE USER"
3. Choose "Password" authentication
4. Username: `cosmicdev`
5. Password: Create a strong password (save it!)
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"

### Step 3: Whitelist Your IP
1. Go to "Network Access" (left sidebar)
2. Click "+ ADD IP ADDRESS"
3. Click "ALLOW ACCESS FROM ANYWHERE" (for development)
4. Click "Confirm"

### Step 4: Get Connection String
1. Go to "Database" (left sidebar)
2. Click "Connect" button on your cluster
3. Choose "Connect your application"
4. Copy the connection string (looks like):
   ```
   mongodb+srv://cosmicdev:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password

### Step 5: Configure Backend
1. Create `.env` file in the root folder:
   ```env
   MONGODB_URI=mongodb+srv://cosmicdev:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/cosmic-devspace?retryWrites=true&w=majority
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-too
   JWT_EXPIRES_IN=7d
   PORT=5000
   NODE_ENV=development
   ```

2. Replace the MongoDB connection string with yours

### Step 6: Restart Server
```powershell
npm start
```

---

## 🖥️ Alternative: Local MongoDB Installation (Windows)

### Option A: Using Installer
1. Download: https://www.mongodb.com/try/download/community
2. Run the installer
3. Choose "Complete" installation
4. Install as a Windows Service
5. MongoDB will start automatically

### Option B: Using Command
```powershell
# If you have winget
winget install MongoDB.Server

# Start MongoDB service
net start MongoDB
```

---

## ✅ Verify Connection

Once MongoDB is set up, test your connection:

1. Restart your backend:
   ```powershell
   npm start
   ```

2. You should see:
   ```
   🚀 Connected to MongoDB - Database is in orbit!
   🚀 Cosmic DevSpace Backend launched successfully!
   ```

3. Test in browser:
   - Open: http://localhost:5000/api/health
   - Should show: `{"status":"operational"}`

---

## 🆘 Troubleshooting

### Error: "MongoNetworkError"
- Check your internet connection
- Verify IP is whitelisted in Atlas
- Check connection string is correct

### Error: "Authentication failed"
- Verify username/password in connection string
- Make sure password doesn't contain special characters (or URL-encode them)

### Server still not starting
- Check `.env` file exists in root folder
- Verify MongoDB URI is on one line
- Restart your terminal/IDE

---

## 📝 Quick .env Template

Create `.env` file with:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/cosmic-devspace

# JWT
JWT_SECRET=mysupersecretkey123456789
JWT_REFRESH_SECRET=myrefreshsecretkey123456789  
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=development

# Optional
FRONTEND_URL=http://localhost:8080
```

---

## 🎉 Success!

Once connected, you can:
- ✅ Register new users
- ✅ Login/Logout
- ✅ Create projects
- ✅ Add portfolio items
- ✅ All data persists in MongoDB
