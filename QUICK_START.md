# 🚀 QUICK START - Get Your App Running in 5 Minutes!

## Step 1: Create MongoDB Atlas Account (FREE)

1. **Go to**: https://www.mongodb.com/cloud/atlas/register
2. **Sign up** with Google (fastest) or email
3. **Create a FREE cluster**:
   - Click "Build a Database"
   - Choose "FREE" (M0 tier)
   - Select region closest to you
   - Click "Create"
   - Wait 3-5 minutes for cluster creation

## Step 2: Setup Database Access

1. **Create Database User**:
   - Click "Database Access" in left sidebar
   - Click "+ ADD NEW DATABASE USER"
   - Username: `cosmicdev`
   - Autogenerate Secure Password (click the button) - **SAVE THIS PASSWORD!**
   - OR use your own strong password
   - Built-in Role: **"Read and write to any database"**
   - Click "Add User"

2. **Whitelist Your IP**:
   - Click "Network Access" in left sidebar
   - Click "+ ADD IP ADDRESS"
   - Click "ALLOW ACCESS FROM ANYWHERE" (for development only)
   - Click "Confirm"

## Step 3: Get Connection String

1. Click "Database" in left sidebar
2. Click **"Connect"** button on your cluster
3. Select **"Drivers"** → **"Node.js"**
4. **Copy the connection string** (looks like):
   ```
   mongodb+srv://cosmicdev:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. **Replace `<password>`** with the password you saved!

## Step 4: Create .env File

Create a file named `.env` in the root folder (same level as package.json):

```env
# REQUIRED - Replace with your MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://cosmicdev:YOUR_PASSWORD_HERE@cluster0.xxxxx.mongodb.net/cosmic-devspace?retryWrites=true&w=majority

# JWT Secrets (you can change these to anything)
JWT_SECRET=mysupersecretkey12345678990
JWT_REFRESH_SECRET=myrefreshkey98765432110

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT expiration
JWT_EXPIRES_IN=7d
```

**IMPORTANT**: 
- Replace `YOUR_PASSWORD_HERE` with your actual MongoDB password
- Replace the entire connection string with the one from Atlas
- Make sure there are NO SPACES around the `=` sign

## Step 5: Start Your Servers

Open **TWO** PowerShell terminals:

### Terminal 1 - Backend (in project root):
```powershell
npm start
```

You should see:
```
🚀 Connected to MongoDB - Database is in orbit!
🚀 Cosmic DevSpace Backend launched successfully!
🛰️  Address: http://localhost:5000
```

### Terminal 2 - Frontend (in project root):
```powershell
cd frontend
python -m http.server 8080
```

## Step 6: Open Your App

1. Open browser to: **http://localhost:8080**
2. Try to register a new account
3. Check MongoDB Atlas → Database → Browse Collections to see your data!

---

## ✅ Success Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Database user created with password saved
- [ ] IP whitelisted (Allow from Anywhere)
- [ ] Connection string copied
- [ ] `.env` file created with correct MongoDB URI
- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 8080
- [ ] Can register/login successfully
- [ ] Data appears in MongoDB Atlas

---

## 🆘 Troubleshooting

### "Failed to fetch" error
- Check backend is running: http://localhost:5000/api/health
- Should return: `{"status":"operational"}`

### "MongoNetworkError" or "Authentication failed"
- Double-check your password in the connection string
- Make sure IP is whitelisted in Network Access
- Connection string should be on ONE line in .env file
- No spaces around `=` in .env

### Backend not starting
- Check `.env` file exists in root folder (not in backend/ folder)
- Check MongoDB URI is correct
- Restart your terminal/IDE

### "ERR_CONNECTION_REFUSED"
- Backend might not be running
- Check: `netstat -ano | findstr :5000` should show LISTENING
- Kill all node processes: `taskkill /F /IM node.exe`
- Restart backend

---

## 🎉 You're Done!

Your Cosmic DevSpace is now:
- ✅ Connected to cloud database (MongoDB Atlas)
- ✅ Accepting user registrations
- ✅ Persisting all data
- ✅ Ready for development!

**Next Steps**:
- Create your first project
- Customize your profile
- Explore the cosmic universe! 🚀
