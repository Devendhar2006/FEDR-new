// ==========================================
// COSMIC SETTINGS PAGE - JavaScript
// Complete settings management system
// ==========================================

const API_BASE = 'http://localhost:3000/api';
let currentUser = null;
let currentTheme = 'cosmic-dark';
let fontSize = 100;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initializeEventListeners();
  loadUserSettings();
  loadThemeFromStorage();
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
          profile: {},
          preferences: {
            theme: localStorage.getItem('theme') || 'cosmic-dark',
            notifications: { email: true, push: true, guestbook: true, portfolio: true },
            privacy: { showEmail: false, showLastLogin: true, allowMessages: true }
          },
          emailVerified: false
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

  // Navigation
  document.querySelectorAll('.settings-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });

  // Account settings
  document.getElementById('changeEmailBtn')?.addEventListener('click', openEmailModal);
  document.getElementById('changePasswordBtn')?.addEventListener('click', openPasswordModal);
  
  // Security settings
  document.getElementById('enable2FABtn')?.addEventListener('click', enable2FA);
  document.getElementById('viewLoginHistoryBtn')?.addEventListener('click', viewLoginHistory);
  document.getElementById('logoutAllBtn')?.addEventListener('click', logoutAllDevices);

  // Notification settings
  document.getElementById('saveNotificationsBtn')?.addEventListener('click', saveNotificationPreferences);

  // Privacy settings
  document.getElementById('savePrivacyBtn')?.addEventListener('click', savePrivacySettings);

  // Theme settings
  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', function() {
      selectTheme(this.dataset.theme);
    });
  });
  
  document.getElementById('decreaseFontBtn')?.addEventListener('click', () => changeFontSize(-10));
  document.getElementById('increaseFontBtn')?.addEventListener('click', () => changeFontSize(10));
  document.getElementById('saveThemeBtn')?.addEventListener('click', saveThemeSettings);

  // Connected accounts
  document.getElementById('connectGoogleBtn')?.addEventListener('click', connectGoogle);
  document.getElementById('connectGithubBtn')?.addEventListener('click', connectGithub);
  document.getElementById('connectDiscordBtn')?.addEventListener('click', connectDiscord);

  // Danger zone
  document.getElementById('deleteAccountBtn')?.addEventListener('click', openDeleteModal);

  // Modal controls
  document.getElementById('closeEmailModal')?.addEventListener('click', closeEmailModal);
  document.getElementById('cancelEmailBtn')?.addEventListener('click', closeEmailModal);
  document.getElementById('closePasswordModal')?.addEventListener('click', closePasswordModal);
  document.getElementById('cancelPasswordBtn')?.addEventListener('click', closePasswordModal);
  document.getElementById('closeDeleteModal')?.addEventListener('click', closeDeleteModal);
  document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeDeleteModal);

  // Form submissions
  document.getElementById('changeEmailForm')?.addEventListener('submit', handleEmailChange);
  document.getElementById('changePasswordForm')?.addEventListener('submit', handlePasswordChange);
  document.getElementById('deleteAccountForm')?.addEventListener('submit', handleAccountDelete);

  // Close modals on outside click
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('active');
    }
  });
}

// Load user settings
async function loadUserSettings() {
  showLoading(true);
  
  // If using local auth (cds_user), use local data
  const cdsUser = localStorage.getItem('cds_user');
  const token = localStorage.getItem('token');
  
  if (!token && cdsUser && currentUser) {
    // Use locally stored settings
    displayUserSettings(currentUser);
    showLoading(false);
    showToast('Using local settings', 'info');
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
      displayUserSettings(currentUser);
    } else {
      showToast(data.message || 'Failed to load settings', 'error');
      // Fallback to local data if backend fails
      if (currentUser) {
        displayUserSettings(currentUser);
      }
    }
  } catch (error) {
    console.error('Settings load error:', error);
    showToast('Using local settings', 'info');
    // Use local data if API fails
    if (currentUser) {
      displayUserSettings(currentUser);
    }
  } finally {
    showLoading(false);
  }
}

// Display user settings
function displayUserSettings(user) {
  // Account settings
  document.getElementById('currentEmail').textContent = user.email;
  
  // Verification status
  const verificationStatus = document.getElementById('verificationStatus');
  const verifyBtn = document.getElementById('verifyEmailBtn');
  if (user.emailVerified) {
    verificationStatus.innerHTML = '<span style="color: rgba(67, 233, 123, 1);">✓ Your email is verified</span>';
    verifyBtn.style.display = 'none';
  } else {
    verificationStatus.innerHTML = '<span style="color: rgba(245, 87, 108, 1);">⚠ Your email is not verified</span>';
    verifyBtn.style.display = 'inline-flex';
  }

  // Notification preferences
  const prefs = user.preferences?.notifications || {};
  document.getElementById('emailNotifications').checked = prefs.email !== false;
  document.getElementById('pushNotifications').checked = prefs.push !== false;
  document.getElementById('guestbookNotifications').checked = prefs.guestbook !== false;
  document.getElementById('portfolioNotifications').checked = prefs.portfolio !== false;

  // Privacy settings
  const privacy = user.preferences?.privacy || {};
  document.getElementById('showEmail').checked = privacy.showEmail === true;
  document.getElementById('showLastLogin').checked = privacy.showLastLogin !== false;
  document.getElementById('allowMessages').checked = privacy.allowMessages !== false;

  // Theme settings
  currentTheme = user.preferences?.theme || 'cosmic-dark';
  selectTheme(currentTheme);

  // Connected accounts
  updateConnectedAccountsStatus(user);
}

// Switch settings section
function switchSection(sectionName) {
  // Update nav buttons
  document.querySelectorAll('.settings-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === sectionName);
  });

  // Update content sections
  document.querySelectorAll('.settings-section').forEach(section => {
    section.classList.remove('active');
    section.style.display = 'none';
  });

  const activeSection = document.getElementById(`${sectionName}Section`);
  if (activeSection) {
    activeSection.style.display = 'block';
    activeSection.classList.add('active');
  }
}

// Email modal
function openEmailModal() {
  document.getElementById('changeEmailModal').classList.add('active');
}

function closeEmailModal() {
  document.getElementById('changeEmailModal').classList.remove('active');
  document.getElementById('changeEmailForm').reset();
}

async function handleEmailChange(e) {
  e.preventDefault();
  
  const newEmail = document.getElementById('newEmail').value.trim();
  const password = document.getElementById('emailPassword').value;

  showLoading(true);
  try {
    // Note: This endpoint needs to be added to backend
    const response = await fetch(`${API_BASE}/users/me/change-email`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newEmail, password })
    });

    const data = await response.json();

    if (data.success) {
      showToast('Email updated successfully! Please verify your new email.', 'success');
      closeEmailModal();
      await loadUserSettings();
    } else {
      showToast(data.message || 'Failed to change email', 'error');
    }
  } catch (error) {
    console.error('Email change error:', error);
    showToast('Failed to change email', 'error');
  } finally {
    showLoading(false);
  }
}

// Password modal
function openPasswordModal() {
  document.getElementById('changePasswordModal').classList.add('active');
}

function closePasswordModal() {
  document.getElementById('changePasswordModal').classList.remove('active');
  document.getElementById('changePasswordForm').reset();
}

async function handlePasswordChange(e) {
  e.preventDefault();
  
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match!', 'error');
    return;
  }

  if (newPassword.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }

  showLoading(true);
  try {
    const response = await fetch(`${API_BASE}/users/me/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
    });

    const data = await response.json();

    if (data.success) {
      showToast('Password changed successfully!', 'success');
      closePasswordModal();
    } else {
      showToast(data.message || 'Failed to change password', 'error');
    }
  } catch (error) {
    console.error('Password change error:', error);
    showToast('Failed to change password', 'error');
  } finally {
    showLoading(false);
  }
}

// Security features
function enable2FA() {
  showToast('2FA setup coming soon! This feature is under development.', 'info');
}

function viewLoginHistory() {
  showToast('Login history feature coming soon!', 'info');
}

function logoutAllDevices() {
  if (confirm('Are you sure you want to logout from all devices? You will need to login again.')) {
    logout();
  }
}

// Notification preferences
async function saveNotificationPreferences() {
  const notifications = {
    email: document.getElementById('emailNotifications').checked,
    push: document.getElementById('pushNotifications').checked,
    guestbook: document.getElementById('guestbookNotifications').checked,
    portfolio: document.getElementById('portfolioNotifications').checked
  };

  showLoading(true);
  try {
    const response = await fetch(`${API_BASE}/users/me/preferences`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notifications })
    });

    const data = await response.json();

    if (data.success) {
      showToast('Notification preferences saved!', 'success');
    } else {
      showToast(data.message || 'Failed to save preferences', 'error');
    }
  } catch (error) {
    console.error('Preferences save error:', error);
    showToast('Failed to save preferences', 'error');
  } finally {
    showLoading(false);
  }
}

// Privacy settings
async function savePrivacySettings() {
  const privacy = {
    showEmail: document.getElementById('showEmail').checked,
    showLastLogin: document.getElementById('showLastLogin').checked,
    allowMessages: document.getElementById('allowMessages').checked
  };

  showLoading(true);
  try {
    const response = await fetch(`${API_BASE}/users/me/preferences`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ privacy })
    });

    const data = await response.json();

    if (data.success) {
      showToast('Privacy settings saved!', 'success');
    } else {
      showToast(data.message || 'Failed to save settings', 'error');
    }
  } catch (error) {
    console.error('Privacy save error:', error);
    showToast('Failed to save settings', 'error');
  } finally {
    showLoading(false);
  }
}

// Theme management
function selectTheme(themeName) {
  currentTheme = themeName;
  
  document.querySelectorAll('.theme-option').forEach(option => {
    option.classList.toggle('active', option.dataset.theme === themeName);
  });

  // Apply theme preview
  applyTheme(themeName);
}

function applyTheme(themeName) {
  document.body.className = 'cosmic-bg';
  document.body.classList.add(`theme-${themeName}`);
  
  // Save to localStorage
  localStorage.setItem('theme', themeName);
}

function loadThemeFromStorage() {
  const savedTheme = localStorage.getItem('theme') || 'cosmic-dark';
  selectTheme(savedTheme);
}

function changeFontSize(delta) {
  fontSize = Math.max(80, Math.min(120, fontSize + delta));
  document.getElementById('currentFontSize').textContent = `${fontSize}%`;
  document.documentElement.style.fontSize = `${fontSize}%`;
}

async function saveThemeSettings() {
  const theme = currentTheme;
  const highContrast = document.getElementById('highContrast').checked;

  showLoading(true);
  try {
    const response = await fetch(`${API_BASE}/users/me/preferences`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ theme })
    });

    const data = await response.json();

    if (data.success) {
      showToast('Theme settings saved!', 'success');
      applyTheme(theme);
    } else {
      showToast(data.message || 'Failed to save theme', 'error');
    }
  } catch (error) {
    console.error('Theme save error:', error);
    showToast('Failed to save theme', 'error');
  } finally {
    showLoading(false);
  }
}

// Connected accounts
function updateConnectedAccountsStatus(user) {
  // Google
  const googleStatus = document.getElementById('googleStatus');
  const googleBtn = document.getElementById('connectGoogleBtn');
  if (user.googleId) {
    googleStatus.innerHTML = '<span style="color: rgba(67, 233, 123, 1);">✓ Connected</span>';
    googleBtn.textContent = 'Disconnect';
    googleBtn.classList.add('btn-cosmic-danger');
  } else {
    googleStatus.textContent = 'Connect your Google account for easy sign-in';
    googleBtn.textContent = 'Connect';
  }
}

function connectGoogle() {
  showToast('Google OAuth integration coming soon!', 'info');
}

function connectGithub() {
  showToast('GitHub integration coming soon!', 'info');
}

function connectDiscord() {
  showToast('Discord integration coming soon!', 'info');
}

// Delete account modal
function openDeleteModal() {
  document.getElementById('deleteAccountModal').classList.add('active');
}

function closeDeleteModal() {
  document.getElementById('deleteAccountModal').classList.remove('active');
  document.getElementById('deleteAccountForm').reset();
}

async function handleAccountDelete(e) {
  e.preventDefault();
  
  const password = document.getElementById('deletePassword').value;
  const confirmation = document.getElementById('deleteConfirmation').value;

  if (confirmation !== 'DELETE MY ACCOUNT') {
    showToast('Please type "DELETE MY ACCOUNT" to confirm', 'error');
    return;
  }

  showLoading(true);
  try {
    const response = await fetch(`${API_BASE}/users/me/account`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password, confirmation })
    });

    const data = await response.json();

    if (data.success) {
      showToast('Account deleted successfully. Goodbye! 👋', 'success');
      localStorage.clear();
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    } else {
      showToast(data.message || 'Failed to delete account', 'error');
    }
  } catch (error) {
    console.error('Account deletion error:', error);
    showToast('Failed to delete account', 'error');
  } finally {
    showLoading(false);
  }
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

  // Update icon based on type
  const icon = toast.querySelector('i');
  if (icon) {
    icon.className = type === 'error' ? 'fas fa-exclamation-circle' :
                     type === 'info' ? 'fas fa-info-circle' :
                     'fas fa-check-circle';
  }

  toastMessage.textContent = message;
  toast.classList.remove('error', 'success', 'info');
  toast.classList.add(type, 'show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
