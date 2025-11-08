# 🚀 Deployment Guide - Cosmic DevSpace

## The Problem
Vercel is designed for **static sites** and **serverless functions**, not full Express.js servers. Your app needs:
- **Backend**: Node.js server running 24/7 (Express.js)
- **Frontend**: Static HTML/CSS/JS files

## ✅ Solution: Deploy Backend & Frontend Separately

---

## Part 1: Deploy Backend on Render.com (FREE)

### Step 1: Sign Up for Render
1. Go to https://render.com/
2. Click "Get Started for Free"
3. Sign up with GitHub (recommended)

### Step 2: Connect GitHub Repository
1. Click "New +" → "Web Service"
2. Connect your GitHub account
3. Select your repository: `FEDR-new`
4. Click "Connect"

### Step 3: Configure Backend Service
Fill in these settings:

**Name**: `cosmic-devspace-backend`
**Region**: Oregon (or closest to you)
**Branch**: `main`
**Root Directory**: Leave empty
**Environment**: `Node`
**Build Command**: `npm install`
**Start Command**: `npm start`
**Instance Type**: `Free`

### Step 4: Add Environment Variables
Click "Advanced" → Add these environment variables:

```
MONGODB_URI = your-mongodb-atlas-connection-string
JWT_SECRET = your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET = your-super-secret-refresh-key-different
SESSION_SECRET = your-super-secret-session-key-unique
NODE_ENV = production
PORT = 3000
CORS_ORIGIN = https://your-vercel-app.vercel.app
```

**IMPORTANT**: Replace `your-vercel-app.vercel.app` with your actual Vercel domain!

### Step 5: Deploy Backend
1. Click "Create Web Service"
2. Wait 5-10 minutes for deployment
3. Copy your backend URL (looks like: `https://cosmic-devspace-backend.onrender.com`)

---

## Part 2: Update Frontend to Use Backend URL

### Step 1: Update config.js
Open `frontend/js/config.js` and update the BACKEND_URL:

```javascript
const CONFIG = {
  // Replace with your Render backend URL
  BACKEND_URL: 'https://cosmic-devspace-backend.onrender.com',
  
  // Rest stays the same...
};
```

### Step 2: Commit and Push Changes
```bash
git add .
git commit -m "Configure backend URL for production"
git push origin main
```

---

## Part 3: Deploy Frontend on Vercel

### Option A: Already Deployed
If already on Vercel, it will auto-deploy when you push to GitHub.

### Option B: New Deployment
1. Go to https://vercel.com/
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. **Framework Preset**: Other
5. **Root Directory**: `frontend`
6. **Build Command**: Leave empty (static site)
7. **Output Directory**: `.` (current directory)
8. Click "Deploy"

---

## Part 4: Update Backend CORS

After getting your Vercel URL (e.g., `https://your-app.vercel.app`):

1. Go back to Render dashboard
2. Select your backend service
3. Click "Environment"
4. Update `CORS_ORIGIN` to your Vercel URL:
   ```
   CORS_ORIGIN=https://your-app.vercel.app
   ```
5. Save and wait for redeploy

---

## ✅ Testing Your Deployment

1. **Open your Vercel frontend URL**
2. **Register a new account**
3. **Login**
4. **Check MongoDB Atlas** → See if data appears

### If Issues Occur:

#### "Request failed" Error
- Check backend is running: Visit `https://your-backend.onrender.com/api/health`
- Should return: `{"status":"operational"}`

#### CORS Error
- Update `CORS_ORIGIN` in Render with your exact Vercel URL
- Redeploy backend

#### Backend Not Responding
- Free Render services sleep after 15 minutes of inactivity
- First request may take 30-60 seconds to wake up
- Subsequent requests will be fast

---

## 🎉 Final URLs

After deployment:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://cosmic-devspace-backend.onrender.com`
- **Database**: MongoDB Atlas (already set up)

---

## 💡 Alternative: All-in-One Platforms

If you want easier deployment, consider:

### Railway.app
- Supports full-stack apps
- Auto-detects frontend + backend
- One-click deployment
- $5/month after free trial

### Heroku
- Full-stack support
- Easy deployment
- Free tier discontinued (starts at $5/month)

---

## 📝 Summary

✅ Backend deployed on Render (Express.js server)
✅ Frontend deployed on Vercel (static files)
✅ MongoDB Atlas (database - already running)
✅ Frontend configured to call backend API
✅ CORS configured for cross-origin requests

Your app is now production-ready! 🚀
