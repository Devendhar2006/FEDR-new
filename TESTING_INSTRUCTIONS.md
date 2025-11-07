# 🧪 Guestbook System - Testing Instructions

## Quick Start

### 1. Start the Server
```bash
npm start
# Or
node backend/server.js
```

Server should start on: `http://localhost:5000` or port specified in `.env`

### 2. Open Test Page
Navigate to: `http://localhost:5000/TEST_GUESTBOOK.html`

This will open an interactive test suite where you can:
- Run individual tests
- Run all tests at once
- View results in real-time
- Create sample data
- Clear test data

### 3. Manual Testing

#### Test Guestbook Page
1. Open: `http://localhost:5000/frontend/guestbook.html`
2. Check if stats load (Total, Last Week, Top User)
3. Fill out the form:
   - Name: Your Name
   - Email: (optional)
   - Message: Test message 🚀
   - Select project: (optional)
4. Click "📝 Sign Guestbook"
5. Verify entry appears in list

#### Test Filtering
1. Click "All" - See all entries
2. Click "General Messages" - See only entries without project links
3. Click "Project Comments" - See only entries linked to projects

#### Test Sorting
1. Select "Newest" - Most recent first
2. Select "Oldest" - Oldest first
3. Select "Most Liked" - Highest likes first

#### Test Likes
1. Click heart ❤️ on any entry
2. Heart should animate and count should increase
3. Click again to unlike

#### Test Replies
1. Click "💬 Reply" on any entry
2. Reply form should appear
3. Type message and click "Send Reply"
4. Reply should appear indented under entry

#### Test Project Integration
1. Open: `http://localhost:5000/frontend/projects.html`
2. Click on any project
3. Scroll to comments section (if implemented)
4. Leave a comment
5. Open guestbook
6. Your comment should appear with "📌 About: Project Name" tag
7. Click the tag - should redirect to project

## API Endpoints to Test

### 1. GET /api/guestbook/stats
**Test:**
```bash
curl http://localhost:5000/api/guestbook/stats
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "lastWeek": 5,
    "topUser": {
      "name": "John Doe",
      "count": 3
    }
  }
}
```

### 2. GET /api/guestbook
**Test:**
```bash
curl http://localhost:5000/api/guestbook?page=1&limit=10&filter=all
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "entries": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalEntries": 10
    }
  }
}
```

### 3. POST /api/guestbook
**Test:**
```bash
curl -X POST http://localhost:5000/api/guestbook \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","message":"Hello world!"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "✅ Entry added to guestbook!",
  "data": {
    "entry": {...}
  }
}
```

### 4. POST /api/guestbook/:id/like
**Test:**
```bash
curl -X POST http://localhost:5000/api/guestbook/ENTRY_ID/like \
  -H "Content-Type: application/json"
```

### 5. POST /api/guestbook/:id/reply
**Test:**
```bash
curl -X POST http://localhost:5000/api/guestbook/ENTRY_ID/reply \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","message":"Thanks!","isAdmin":true}'
```

### 6. POST /api/projects/:id/comments
**Test:**
```bash
curl -X POST http://localhost:5000/api/projects/PROJECT_ID/comments \
  -H "Content-Type: application/json" \
  -d '{"name":"User","message":"Great project!","projectTitle":"My Project"}'
```

### 7. GET /api/projects/:id/comments
**Test:**
```bash
curl http://localhost:5000/api/projects/PROJECT_ID/comments
```

## Feature Checklist

### ✅ Core Features
- [ ] Guestbook page loads
- [ ] Stats display correctly
- [ ] Form submission works
- [ ] Entries display in list
- [ ] Character counter works (0-240)
- [ ] Emoji picker inserts emojis
- [ ] CAPTCHA validates correctly
- [ ] Preview modal shows
- [ ] Auto-save draft works
- [ ] Draft restores on page load

### ✅ Filtering & Sorting
- [ ] Filter: All works
- [ ] Filter: General Messages works
- [ ] Filter: Project Comments works
- [ ] Sort: Newest works
- [ ] Sort: Oldest works
- [ ] Sort: Most Liked works

### ✅ Engagement Features
- [ ] Like button works
- [ ] Like count updates
- [ ] Heart animation plays
- [ ] Unlike works (remove like)
- [ ] Reply button shows form
- [ ] Reply submission works
- [ ] Replies display indented
- [ ] Admin badge shows on admin replies

### ✅ Project Integration
- [ ] Project dropdown populates
- [ ] Selecting project links entry
- [ ] Project tag shows on entries
- [ ] Clicking tag redirects to project
- [ ] Comments from projects appear in guestbook
- [ ] Comments show project context

### ✅ UI/UX
- [ ] Empty state shows when no entries
- [ ] Loading spinner shows while loading
- [ ] Pagination works
- [ ] Load More button works
- [ ] Page navigation works
- [ ] Responsive design works on mobile
- [ ] Avatars load correctly
- [ ] Fallback avatars work

### ✅ Rate Limiting
- [ ] Max 5 entries per hour enforced
- [ ] Error message shows when limit reached
- [ ] Rate limit resets after 1 hour

### ✅ Offline Support
- [ ] Entries save to localStorage when offline
- [ ] Entries load from localStorage when offline
- [ ] Warning message shows when saved offline
- [ ] Entries sync when back online

## Common Issues & Solutions

### Issue 1: Stats not loading
**Solution:** Check if backend server is running and MongoDB is connected

### Issue 2: Entries not appearing
**Solution:** Check browser console for errors. Verify API endpoints are accessible

### Issue 3: Project dropdown empty
**Solution:** Add some projects/portfolio items to localStorage first

### Issue 4: Like button not working
**Solution:** Check if entry ID is valid. Verify API endpoint is accessible

### Issue 5: Rate limit blocking all submissions
**Solution:** Clear cookies/use incognito or wait 1 hour

## Sample Data Creation

Run this in browser console on guestbook page:
```javascript
const samples = [
  { name: 'Alice', email: 'alice@example.com', message: 'Amazing work! 🚀', projectId: null },
  { name: 'Bob', email: 'bob@example.com', message: 'Love the design!', projectId: 'proj-1', projectTitle: 'Cosmic DevSpace', projectType: 'project' },
  { name: 'Charlie', email: 'charlie@example.com', message: 'Great portfolio! 💯', projectId: null }
];

samples.forEach((s, i) => {
  fetch('/api/guestbook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(s)
  });
});
```

## Performance Testing

### Load Test
1. Create 100+ entries
2. Verify pagination works
3. Check page load time
4. Verify filtering doesn't slow down

### Stress Test
1. Try to submit 10 entries quickly
2. Verify rate limiting kicks in
3. Check if server handles load

## Browser Compatibility

Test on:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)

## Security Testing

- [ ] XSS protection works (try injecting `<script>alert('xss')</script>`)
- [ ] SQL injection protection (if using SQL)
- [ ] Rate limiting works
- [ ] CAPTCHA prevents bots
- [ ] HTML escaping works

## Final Verification

### Before Going Live:
1. ✅ All tests pass
2. ✅ No console errors
3. ✅ All features work on mobile
4. ✅ Database persists correctly
5. ✅ Rate limiting configured
6. ✅ Error messages are user-friendly
7. ✅ Loading states show properly
8. ✅ Two-way integration works (projects ↔ guestbook)

## Success Criteria

The system is ready when:
1. Users can leave messages in guestbook
2. Users can comment on projects
3. All comments appear in guestbook with proper context
4. Filtering and sorting work correctly
5. Likes and replies work
6. No errors in console
7. Responsive on all devices
8. Offline fallback works

## Quick Test Commands

```bash
# Start server
npm start

# Run tests
open http://localhost:5000/TEST_GUESTBOOK.html

# Check guestbook
open http://localhost:5000/frontend/guestbook.html

# View MongoDB
mongosh
use cosmic-devspace
db.guestbookentries.find().pretty()
```

## Troubleshooting

### MongoDB Not Connected
```bash
# Check MongoDB status
mongod --version

# Start MongoDB
mongod --dbpath=/data/db
```

### Port Already in Use
```bash
# Find process
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID> /F
```

### Clear All Data
```javascript
// In MongoDB
db.guestbookentries.deleteMany({})

// In Browser
localStorage.clear()
```

## Done!

If all tests pass, your guestbook system is **production-ready**! 🎉
