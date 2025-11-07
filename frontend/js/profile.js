// ==========================================
// COSMIC PROFILE PAGE - JavaScript
// Full-featured profile management
// ==========================================

const API_BASE = 'http://localhost:3000/api';
let currentUser = null;
let selectedAvatar = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initializeEventListeners();
  loadUserProfile();
});

// Check authentication
function checkAuth() {
  // Check for token (new backend auth)
  const token = localStorage.getItem('token');
  
  // Check for cds_user (existing frontend auth)
  const cdsUser = localStorage.getItem('cds_user');
  
  if (!token && !cdsUser) {
    console.log('No authentication found, redirecting to login...');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 500);
    return false;
  }
  
  // If using cds_user auth, show a message but don't redirect immediately
  if (!token && cdsUser) {
    console.log('Using local auth system. Backend features may be limited.');
    // Try to get user data from cds_user
    try {
      const user = JSON.parse(cdsUser);
      if (user) {
        // Simulate backend user for display purposes
        currentUser = {
          _id: 'local',
          username: user.name || 'User',
          email: user.email || 'user@example.com',
          profile: {
            displayName: user.name,
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (user.name || 'User'),
            bio: 'Local user profile'
          },
          createdAt: new Date().toISOString()
        };
      }
    } catch (e) {
      console.error('Error parsing cds_user:', e);
    }
  }
  
  return true;
}

// Get auth headers
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  };
}

// Initialize all event listeners
function initializeEventListeners() {
  // Logout button (navbar.js handles the navbar logout)
  // We still listen in case there are other logout buttons on the page
  document.querySelectorAll('[id="logoutBtn"]').forEach(btn => {
    btn.addEventListener('click', logout);
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Profile actions
  document.getElementById('editProfileBtn')?.addEventListener('click', openEditModal);
  document.getElementById('viewPortfolioBtn')?.addEventListener('click', () => {
    window.location.href = 'portfolio.html';
  });
  document.getElementById('downloadPdfBtn')?.addEventListener('click', downloadProfilePDF);
  document.getElementById('changeAvatarBtn')?.addEventListener('click', openAvatarModal);

  // Modal controls
  document.getElementById('closeEditModal')?.addEventListener('click', closeEditModal);
  document.getElementById('cancelEditBtn')?.addEventListener('click', closeEditModal);
  document.getElementById('closeAvatarModal')?.addEventListener('click', closeAvatarModal);
  document.getElementById('cancelAvatarBtn')?.addEventListener('click', closeAvatarModal);

  // Form submissions
  document.getElementById('editProfileForm')?.addEventListener('submit', handleProfileUpdate);
  document.getElementById('saveAvatarBtn')?.addEventListener('click', handleAvatarUpdate);

  // Bio character count
  document.getElementById('editBio')?.addEventListener('input', (e) => {
    document.getElementById('bioCharCount').textContent = e.target.value.length;
  });

  // Close modals on outside click
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('active');
    }
  });
}

// Load user profile
async function loadUserProfile() {
  showLoading(true);
  
  // If using local auth (cds_user), use local data
  const cdsUser = localStorage.getItem('cds_user');
  const token = localStorage.getItem('token');
  
  if (!token && cdsUser && currentUser) {
    // Use locally stored user data
    displayUserProfile(currentUser, {
      projectCount: 0,
      certificationsEarned: 0,
      achievementsEarned: 0,
      messageCount: 0
    }, {
      level: 'Space Explorer',
      icon: '🌟'
    });
    showLoading(false);
    showToast('Using local profile data', 'info');
    return;
  }
  
  // Try backend API
  try {
    const response = await fetch(`${API_BASE}/users/me/profile`, {
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (data.success) {
      currentUser = data.data.user;
      displayUserProfile(currentUser, data.data.stats, data.data.cosmicRank);
    } else {
      showToast(data.message || 'Failed to load profile', 'error');
      // Fallback to local data if backend fails
      if (currentUser) {
        displayUserProfile(currentUser, {}, { level: 'Space Explorer', icon: '🌟' });
      }
    }
  } catch (error) {
    console.error('Profile load error:', error);
    showToast('Using local profile data', 'info');
    // Use local data if API fails
    if (currentUser) {
      displayUserProfile(currentUser, {}, { level: 'Space Explorer', icon: '🌟' });
    }
  } finally {
    showLoading(false);
  }
}

// Display user profile
function displayUserProfile(user, stats, rank) {
  console.log('📋 Displaying user profile:', user);
  console.log('👤 Username:', user.username);
  console.log('📧 Email:', user.email);
  console.log('💼 Profile:', user.profile);
  
  // Header info
  const displayName = user.profile?.displayName || user.username || 'User';
  const username = user.username || 'user';
  const email = user.email || '';
  
  console.log('✅ Using display name:', displayName);
  console.log('✅ Using username:', username);
  
  // Set navbar name (in top right corner)
  const navUserName = document.getElementById('navUserName');
  if (navUserName) {
    navUserName.textContent = displayName;
  }
  
  // Set profile page name (main display name)
  const profileName = document.getElementById('profileName');
  if (profileName) {
    profileName.textContent = displayName;
  }
  
  // Set username and email
  const userUsernameEl = document.getElementById('userUsername');
  if (userUsernameEl) {
    userUsernameEl.textContent = `@${username}`;
  }
  
  const userEmailEl = document.getElementById('userEmail');
  if (userEmailEl) {
    userEmailEl.textContent = email;
  }
  
  // Set avatar with fallback to generated avatar based on username
  const avatarUrl = user.profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
  
  // Set navbar avatar
  const navAvatar = document.getElementById('userAvatar');
  if (navAvatar) {
    navAvatar.src = avatarUrl;
    navAvatar.onerror = function() {
      this.src = `https://api.dicebear.com/7.x/initials/svg?seed=${username}&backgroundColor=965aff`;
    };
  }
  
  // Set profile page avatar
  const profileAvatar = document.getElementById('profileAvatar');
  if (profileAvatar) {
    profileAvatar.src = avatarUrl;
    profileAvatar.onerror = function() {
      this.src = `https://api.dicebear.com/7.x/initials/svg?seed=${username}&backgroundColor=965aff`;
    };
  }
  
  // Dates
  const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'short', day: 'numeric' 
  });
  document.getElementById('joinedDate').textContent = joinedDate;
  
  const lastSeen = user.lastLogin ? 
    formatRelativeTime(new Date(user.lastLogin)) : 'Never';
  document.getElementById('lastSeen').textContent = lastSeen;

  // Rank badge
  if (rank) {
    document.getElementById('rankBadge').innerHTML = `
      <span class="rank-icon">${rank.icon}</span>
      <span class="rank-text">${rank.level}</span>
    `;
  }

  // Stats
  document.getElementById('statProjects').textContent = stats?.projectCount || 0;
  document.getElementById('statCertifications').textContent = stats?.certificationsEarned || 0;
  document.getElementById('statAchievements').textContent = stats?.achievementsEarned || 0;
  document.getElementById('statComments').textContent = stats?.messageCount || 0;

  // About tab
  document.getElementById('userBio').textContent = user.profile?.bio || 'No bio provided';
  document.getElementById('userLocation').textContent = user.profile?.location || 'Not specified';
  
  const websiteEl = document.getElementById('userWebsite');
  if (user.profile?.website) {
    websiteEl.href = user.profile.website;
    websiteEl.textContent = user.profile.website;
  } else {
    websiteEl.textContent = 'Not specified';
    websiteEl.removeAttribute('href');
  }

  // Social links tab
  displaySocialLinks(user.profile);

  // Achievements tab
  if (user.achievements && user.achievements.length > 0) {
    displayAchievements(user.achievements);
  } else {
    document.getElementById('achievementsList').innerHTML = 
      '<p style="color: rgba(255, 255, 255, 0.7); text-align: center;">No achievements yet. Keep exploring the cosmos!</p>';
  }
}

// Display social links
function displaySocialLinks(profile) {
  const socialLinks = [];
  
  if (profile?.github) {
    socialLinks.push({
      name: 'GitHub',
      url: profile.github,
      icon: 'fab fa-github',
      color: '#333'
    });
  }
  
  if (profile?.linkedin) {
    socialLinks.push({
      name: 'LinkedIn',
      url: profile.linkedin,
      icon: 'fab fa-linkedin',
      color: '#0077b5'
    });
  }
  
  if (profile?.twitter) {
    socialLinks.push({
      name: 'Twitter/X',
      url: profile.twitter,
      icon: 'fab fa-twitter',
      color: '#1da1f2'
    });
  }

  const socialContainer = document.getElementById('socialLinksList');
  
  if (socialLinks.length > 0) {
    socialContainer.innerHTML = socialLinks.map(link => `
      <a href="${link.url}" target="_blank" class="social-link-card">
        <div class="social-icon">
          <i class="${link.icon}"></i>
        </div>
        <div>
          <h4>${link.name}</h4>
          <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">${link.url}</p>
        </div>
      </a>
    `).join('');
  } else {
    socialContainer.innerHTML = 
      '<p style="color: rgba(255, 255, 255, 0.7); text-align: center;">No social links added yet</p>';
  }
}

// Display achievements
function displayAchievements(achievements) {
  const container = document.getElementById('achievementsList');
  container.innerHTML = achievements.map(achievement => `
    <div class="achievement-card">
      <div class="achievement-icon">${achievement.icon || '🏆'}</div>
      <h4 class="achievement-name">${achievement.name}</h4>
      <p class="achievement-desc">${achievement.description}</p>
      <small style="color: rgba(255, 255, 255, 0.5);">
        ${new Date(achievement.earnedAt).toLocaleDateString()}
      </small>
    </div>
  `).join('');
}

// Switch tabs
function switchTab(tabName) {
  // Update buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.style.display = 'none';
  });

  const activeTab = document.getElementById(`${tabName}Tab`);
  if (activeTab) {
    activeTab.style.display = 'block';
  }

  // Load data for activity tab if needed
  if (tabName === 'activity' && currentUser) {
    loadActivityTimeline();
  }
}

// Load activity timeline
async function loadActivityTimeline() {
  const container = document.getElementById('activityTimeline');
  container.innerHTML = '<p style="color: rgba(255, 255, 255, 0.7);">Loading activity...</p>';

  try {
    const response = await fetch(`${API_BASE}/users/${currentUser._id}/activity?limit=10`, {
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (data.success && data.data.activity.length > 0) {
      container.innerHTML = data.data.activity.map(item => `
        <div class="activity-item">
          <h4 style="margin: 0 0 0.5rem 0; color: white;">${item.eventName}</h4>
          <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">
            ${item.eventType} • ${formatRelativeTime(new Date(item.timestamp))}
          </p>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p style="color: rgba(255, 255, 255, 0.7); text-align: center;">No recent activity</p>';
    }
  } catch (error) {
    console.error('Activity load error:', error);
    container.innerHTML = '<p style="color: rgba(245, 87, 108, 0.8);">Failed to load activity</p>';
  }
}

// Open edit profile modal
function openEditModal() {
  if (!currentUser) return;

  // Populate form
  document.getElementById('editDisplayName').value = currentUser.profile?.displayName || '';
  document.getElementById('editFirstName').value = currentUser.profile?.firstName || '';
  document.getElementById('editLastName').value = currentUser.profile?.lastName || '';
  document.getElementById('editBio').value = currentUser.profile?.bio || '';
  document.getElementById('editLocation').value = currentUser.profile?.location || '';
  document.getElementById('editWebsite').value = currentUser.profile?.website || '';
  document.getElementById('editGithub').value = currentUser.profile?.github || '';
  document.getElementById('editLinkedin').value = currentUser.profile?.linkedin || '';
  document.getElementById('editTwitter').value = currentUser.profile?.twitter || '';
  
  document.getElementById('bioCharCount').textContent = (currentUser.profile?.bio || '').length;

  document.getElementById('editProfileModal').classList.add('active');
}

// Close edit modal
function closeEditModal() {
  document.getElementById('editProfileModal').classList.remove('active');
}

// Handle profile update
async function handleProfileUpdate(e) {
  e.preventDefault();

  const updates = {
    displayName: document.getElementById('editDisplayName').value.trim(),
    firstName: document.getElementById('editFirstName').value.trim(),
    lastName: document.getElementById('editLastName').value.trim(),
    bio: document.getElementById('editBio').value.trim(),
    location: document.getElementById('editLocation').value.trim(),
    website: document.getElementById('editWebsite').value.trim(),
    github: document.getElementById('editGithub').value.trim(),
    linkedin: document.getElementById('editLinkedin').value.trim(),
    twitter: document.getElementById('editTwitter').value.trim()
  };

  showLoading(true);
  try {
    const response = await fetch(`${API_BASE}/users/me/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });

    const data = await response.json();

    if (data.success) {
      showToast('Profile updated successfully!', 'success');
      closeEditModal();
      await loadUserProfile();
    } else {
      showToast(data.message || 'Failed to update profile', 'error');
    }
  } catch (error) {
    console.error('Profile update error:', error);
    showToast('Failed to update profile', 'error');
  } finally {
    showLoading(false);
  }
}

// Open avatar modal
function openAvatarModal() {
  generateAvatarOptions();
  document.getElementById('changeAvatarModal').classList.add('active');
}

// Close avatar modal
function closeAvatarModal() {
  document.getElementById('changeAvatarModal').classList.remove('active');
  selectedAvatar = null;
}

// Generate avatar options based on user's name
function generateAvatarOptions() {
  const avatarGrid = document.getElementById('avatarGrid');
  
  // Get username for seed
  const username = currentUser?.username || 'User';
  
  // Generate 5 different avatars using the username as seed with variations
  const avatars = [
    // Style 1: Avataaars with username
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    // Style 2: Avataaars with username + 1
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}1&backgroundColor=b6e3f4`,
    // Style 3: Bottts (robot style) with username
    `https://api.dicebear.com/7.x/bottts/svg?seed=${username}&backgroundColor=ffd5dc`,
    // Style 4: Personas (minimalist) with username
    `https://api.dicebear.com/7.x/personas/svg?seed=${username}&backgroundColor=c0aede`,
    // Style 5: Initials with username
    `https://api.dicebear.com/7.x/initials/svg?seed=${username}&backgroundColor=965aff`
  ];

  avatarGrid.innerHTML = avatars.map(url => `
    <img src="${url}" alt="Avatar" class="avatar-option" data-avatar="${url}" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=${username}&backgroundColor=965aff'">
  `).join('');

  // Add click handlers
  document.querySelectorAll('.avatar-option').forEach(option => {
    option.addEventListener('click', function() {
      document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
      this.classList.add('selected');
      selectedAvatar = this.dataset.avatar;
    });
  });
}

// Handle avatar update
async function handleAvatarUpdate() {
  const customUrl = document.getElementById('customAvatarUrl').value.trim();
  const avatarUrl = customUrl || selectedAvatar;

  if (!avatarUrl) {
    showToast('Please select or enter an avatar URL', 'error');
    return;
  }

  showLoading(true);
  try {
    const response = await fetch(`${API_BASE}/users/me/upload-avatar`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ avatar: avatarUrl })
    });

    const data = await response.json();

    if (data.success) {
      showToast('Avatar updated successfully!', 'success');
      closeAvatarModal();
      await loadUserProfile();
    } else {
      showToast(data.message || 'Failed to update avatar', 'error');
    }
  } catch (error) {
    console.error('Avatar update error:', error);
    showToast('Failed to update avatar', 'error');
  } finally {
    showLoading(false);
  }
}

// Download profile as PDF
function downloadProfilePDF() {
  showToast('PDF download feature coming soon!', 'info');
  // TODO: Implement PDF generation
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 1000);
}

// Show loading overlay
function showLoading(show) {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.classList.toggle('active', show);
  }
}

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  
  if (!toast || !toastMessage) return;

  toastMessage.textContent = message;
  toast.classList.remove('error', 'success', 'info');
  toast.classList.add(type, 'show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Format relative time
function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}
