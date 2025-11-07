# Contact Page Redesign - Two-Step Flow

## Overview
Redesigned the contact page to first collect user profile information (GitHub, LinkedIn, Twitter, Portfolio, Location) before showing the contact form. This creates a personalized experience.

## Changes Made (Nov 6, 2025)

### 🎯 Two-Step Process

#### **Step 1: Profile Information**
Users first provide:
- Name (Required)
- Email (Required)
- GitHub Profile (Optional)
- LinkedIn Profile (Optional)
- Twitter/X Profile (Optional)
- Portfolio Website (Optional)
- Location (Optional)

#### **Step 2: Contact Form**
After profile submission:
- Welcome banner displays user's name and social links
- Contact form pre-filled with name and email
- User can edit their profile anytime
- Send message with personalized context

### 📁 Files Modified

#### 1. **contact.html**
- Added `profile-step` section (Step 1)
- Added `contact-step` section (Step 2)
- Added user profile banner with social links display
- Made name/email fields readonly in contact form (pre-filled from profile)
- Updated contact info section title to "Connect with Site Owner"
- Removed duplicate form handler from inline script

#### 2. **contact.css** (New styles added)
- `.profile-step` - Container for profile form
- `.profile-form-section` - Styled profile collection form
- `.user-profile-banner` - Welcome banner with gradient background
- `.banner-content` - Centered layout for user info
- `.user-social-links` - Flex container for social profile badges
- `.user-social-link` - Individual social profile badge/link
- `.edit-profile-btn` - Button to go back and edit profile
- `.contact-step` - Container for contact form step
- Responsive styles for mobile devices

#### 3. **contact.js** (New file)
**Core Functions:**
- `getSavedProfile()` - Retrieves saved profile from localStorage
- `saveProfile(profileData)` - Saves profile to localStorage
- `showProfileStep()` - Shows Step 1 (profile form)
- `showContactStep(profileData)` - Shows Step 2 (contact form + info)
- `displayUserSocialLinks(profileData)` - Renders user's social links in banner
- `handleProfileSubmit(e)` - Handles profile form submission with validation
- `handleContactSubmit(e)` - Handles contact form submission
- `showToast(message, type)` - Shows success/error notifications

**Data Storage:**
- Profile saved to: `localStorage.cds_contact_profile`
- Contact messages saved to: `localStorage.cds_contacts`

### ✨ Features

1. **Profile Persistence**
   - Profile saved to localStorage
   - Auto-loads on return visits
   - Edit anytime via "Edit Profile" button

2. **Personalized Experience**
   - Welcome message with user's name
   - Display user's social profiles in banner
   - Pre-filled contact form

3. **Smart Validation**
   - Required fields: Name, Email
   - Email format validation
   - URL validation for social profiles
   - Character counter for message (0/2000)

4. **Visual Feedback**
   - Success/error toast notifications
   - Loading states on buttons
   - Smooth animations between steps
   - Animated social link badges

5. **Responsive Design**
   - Mobile-friendly layout
   - Stacked forms on smaller screens
   - Full-width social links on mobile

### 🔄 User Flow

```
User visits /contact.html
    ↓
Check localStorage for saved profile
    ↓
┌─────────────────┬────────────────┐
│ No Profile      │ Profile Exists │
│ Found           │                │
└────────┬────────┴────────┬───────┘
         ↓                 ↓
    Show Step 1       Show Step 2
    (Profile Form)    (Contact Form)
         ↓                 ↓
    User fills        Welcome banner +
    profile info      Social links +
         ↓            Pre-filled form
    Validates &            ↓
    saves to          User sends
    localStorage      message
         ↓                 ↓
    Show Step 2       Message saved
    (Contact Form)    Success toast
         ↓
    [Can edit profile
     anytime via
     Edit button]
```

### 💾 Data Structure

**Profile Data (localStorage.cds_contact_profile):**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "github": "https://github.com/janedoe",
  "linkedin": "https://linkedin.com/in/janedoe",
  "twitter": "https://twitter.com/janedoe",
  "portfolio": "https://janedoe.com",
  "location": "San Francisco, USA",
  "timestamp": 1699300800000
}
```

**Contact Message Data (localStorage.cds_contacts):**
```json
[
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "subject": "Project Collaboration",
    "message": "Hi, I'd like to discuss...",
    "timestamp": 1699300800000,
    "profile": {
      "github": "https://github.com/janedoe",
      "linkedin": "https://linkedin.com/in/janedoe",
      ...
    }
  }
]
```

### 🎨 UI Elements

1. **Profile Form (Step 1)**
   - Clean, centered layout
   - Clear labels and placeholders
   - Required field indicators (*)
   - Large "Next Step →" button

2. **User Profile Banner (Step 2)**
   - Gradient background
   - Welcome message with user name
   - Clickable social profile badges
   - Edit profile button

3. **Social Profile Badges**
   - Icon + Label format
   - Hover effects (lift + glow)
   - External links open in new tab
   - Responsive stacking on mobile

### 🔐 Security Notes
- All data stored locally (no server transmission)
- Email validation on client-side
- URL format validation for social profiles
- No sensitive data exposed

### 📱 Responsive Breakpoints
- Desktop: 1024px+ (two-column layout)
- Tablet: 768px-1023px (single column)
- Mobile: <768px (stacked, full-width)

### 🚀 Benefits
1. **Better User Context** - Know who's contacting you
2. **Professional Networking** - Easy access to visitor's profiles
3. **Reduced Form Friction** - Pre-filled fields on second visit
4. **Enhanced Experience** - Personalized welcome and smooth flow
5. **Data Collection** - Gather valuable profile information

### 🧪 Testing
To test the new flow:
1. Visit `/contact.html`
2. Fill out profile form (Step 1)
3. Click "Next Step"
4. See welcome banner with your info
5. Send a message (Step 2)
6. Refresh page - profile persists
7. Click "Edit Profile" to update info

### ✅ Result
A modern, two-step contact form that:
- Collects valuable user profile information
- Creates a personalized experience
- Maintains data persistence
- Looks professional and polished
- Works seamlessly on all devices
