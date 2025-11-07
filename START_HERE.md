# 🚀 START HERE - Cosmic DevSpace Setup

## Option 1: Automated Setup (Easiest - 2 minutes)

### Step 1: Run the setup script
```powershell
.\setup-env.ps1
```
- Choose MongoDB Atlas (recommended) or Local MongoDB
- If Atlas: Paste your connection string when prompted
- The script will create your `.env` file automatically

### Step 2: Start the application
```powershell
.\start-app.ps1
```
- Opens 2 windows: Backend + Frontend
- Auto-opens servers on ports 5000 and 8080

### Step 3: Open your browser
```
http://localhost:8080
```

**That's it! You're done!** ✅

---

## Option 2: Manual Setup (For advanced users)

### 1. Get MongoDB Atlas Connection String

Follow guide in: `QUICK_START.md`

Or visit: https://www.mongodb.com/cloud/atlas/register

### 2. Create .env file

Copy `.env.TEMPLATE` to `.env`:
```powershell
Copy-Item .env.TEMPLATE .env
```

Edit `.env` and add your MongoDB URI:
```env
MONGODB_URI=mongodb+srv://youruser:yourpass@cluster0.xxxxx.mongodb.net/cosmic-devspace
```

### 3. Start Backend Server
```powershell
npm start
```

### 4. Start Frontend Server (new terminal)
```powershell
cd frontend
python -m http.server 8080
```

### 5. Open Browser
```
http://localhost:8080
```

---

## 🆘 Troubleshooting

### Setup script not working?
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### MongoDB not connecting?
- Check your connection string in `.env`
- Verify IP is whitelisted in MongoDB Atlas
- Make sure password has no special characters (or URL-encode them)

### Port 5000 already in use?
```powershell
# Kill all node processes
taskkill /F /IM node.exe

# Or change port in .env:
PORT=3000
```

### Backend not starting?
- Check `.env` file exists in root folder (not in backend/)
- Check MongoDB connection string is valid
- Look at error messages in the terminal

---

## 📚 Additional Resources

- **Quick Start Guide**: `QUICK_START.md` - Step-by-step MongoDB Atlas setup
- **MongoDB Setup**: `MONGODB_SETUP.md` - Detailed MongoDB configuration
- **Environment Template**: `.env.TEMPLATE` - Sample environment variables

---

## ✅ Success Checklist

- [ ] `.env` file created with MongoDB connection string
- [ ] Backend running on http://localhost:5000
- [ ] Frontend running on http://localhost:8080
- [ ] Can open http://localhost:8080 in browser
- [ ] Can register new user
- [ ] Can login
- [ ] Data persists (check MongoDB Atlas)

---

## 🎉 Next Steps

Once everything is running:

1. **Register your first account**
2. **Create your profile**
3. **Add projects to your portfolio**
4. **Explore all features!**

---

## 📞 Need Help?

1. Check the error message in the terminal
2. Review `QUICK_START.md` for MongoDB Atlas setup
3. Make sure all steps in the checklist are complete
4. Verify `.env` file has correct MongoDB URI

---

**Happy Coding! 🚀✨**
