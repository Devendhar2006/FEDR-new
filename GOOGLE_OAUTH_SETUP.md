# 🔐 Google OAuth Setup Guide for Cosmic DevSpace

## Overview
Google OAuth authentication has been integrated into Cosmic DevSpace, allowing users to sign in/up using their Google accounts.

## 📋 Prerequisites
- Google Cloud Console account
- Access to Google Cloud APIs & Services

## 🚀 Setup Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name your project (e.g., "Cosmic DevSpace")
4. Click "Create"

### Step 2: Configure OAuth Consent Screen

1. In the left sidebar, go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (for testing with any Google account)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: Cosmic DevSpace
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **Save and Continue**
6. **Scopes**: Click **Add or Remove Scopes**, then add:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
7. Click **Save and Continue**
8. **Test users** (for External apps in testing): Add your Google email
9. Click **Save and Continue**

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Name**: Cosmic DevSpace Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:5050`
     - `http://127.0.0.1:5050`
   - **Authorized redirect URIs**:
     - `http://localhost:5050/api/auth/google/callback`
     - `http://127.0.0.1:5050/api/auth/google/callback`
5. Click **Create**
6. **Important**: Copy your **Client ID** and **Client Secret**

### Step 4: Configure Environment Variables

1. Open/create `.env` file in `cosmic-devspace/backend/` directory
2. Add the following variables:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://127.0.0.1:5050/api/auth/google/callback

# Session Secret (generate a random string)
SESSION_SECRET=your_random_session_secret_here

# Other existing variables
MONGODB_URI=mongodb+srv://...
PORT=5050
NODE_ENV=development
```

### Step 5: Update `start-with-atlas.ps1` (Optional)

Add Google OAuth environment variables to your startup script:

```powershell
$env:GOOGLE_CLIENT_ID = "your_client_id_here"
$env:GOOGLE_CLIENT_SECRET = "your_client_secret_here"
$env:GOOGLE_CALLBACK_URL = "http://127.0.0.1:5050/api/auth/google/callback"
$env:SESSION_SECRET = "your_random_session_secret_here"
```

### Step 6: Start the Backend

```powershell
cd cosmic-devspace\backend
node server.js
```

Or use the Atlas startup script:
```powershell
cd cosmic-devspace
.\start-with-atlas.ps1
```

## 🧪 Testing

1. Navigate to http://127.0.0.1:5050/login.html
2. Click "Sign in with Google" button
3. Select your Google account
4. Grant permissions
5. You should be redirected back and logged in!

## 📝 How It Works

### Backend Flow:
1. User clicks "Sign in with Google"
2. Redirected to `/api/auth/google` (initiates OAuth)
3. Google authenticates user
4. Google redirects to `/api/auth/google/callback`
5. Backend creates/finds user in MongoDB
6. JWT tokens generated
7. Redirects to `/google-auth-success.html` with tokens
8. Frontend stores tokens and redirects to home

### Database Schema:
- New fields added to User model:
  - `googleId`: Stores Google user ID
  - `isEmailVerified`: Auto-set to true for Google users
  - `profile.displayName`: Stores Google display name

## 🔒 Security Notes

- **Production**: Change `SESSION_SECRET` to a strong random string
- **HTTPS**: In production, update redirect URIs to use HTTPS
- **Environment Variables**: Never commit `.env` file to Git
- **OAuth Scopes**: Only requests email and profile (minimal permissions)

## 🐛 Troubleshooting

### "Redirect URI mismatch" error:
- Ensure the callback URL in Google Cloud Console matches exactly
- Check both `localhost` and `127.0.0.1` versions are added

### "Access blocked" error:
- Add your email as a test user in OAuth consent screen
- Or publish your app (for production)

### MongoDB connection error:
- Ensure Atlas whitelist includes your IP
- Check MongoDB URI is correct in `.env`

### Session/Cookie issues:
- Clear browser cookies
- Check `SESSION_SECRET` is set
- Verify `express-session` is installed

## 📚 API Endpoints

- `GET /api/auth/google` - Initiate Google OAuth flow
- `GET /api/auth/google/callback` - OAuth callback handler
- `GET /api/auth/google/status` - Check OAuth configuration status

## 🎨 Frontend Integration

Google Sign-In buttons are integrated in:
- `/login.html` - "Sign in with Google"
- `/register.html` - "Sign up with Google"

Success page:
- `/google-auth-success.html` - Handles token storage and redirect

## 📦 Dependencies Installed

```json
{
  "passport": "^0.7.0",
  "passport-google-oauth20": "^2.0.0",
  "express-session": "^1.18.0"
}
```

## 🚀 Next Steps (Optional Enhancements)

- [ ] Add Facebook OAuth
- [ ] Add GitHub OAuth
- [ ] Implement refresh token rotation
- [ ] Add 2FA for traditional login
- [ ] Session management dashboard
- [ ] OAuth account linking UI

## 📞 Support

If you encounter issues:
1. Check console logs (browser & backend)
2. Verify environment variables are set
3. Test OAuth status: http://127.0.0.1:5050/api/auth/google/status
4. Review Google Cloud Console error messages

---

**Built with 🌌 for Cosmic DevSpace**

