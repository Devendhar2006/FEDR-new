/**
 * COSMIC DEVSPACE - GUESTBOOK
 * Advanced guestbook with project integration
 */

console.log('📖 Guestbook.js loaded');

// State management
let currentPage = 1;
let currentFilter = 'all';
let currentSort = 'newest';
let allEntries = [];
let captchaAnswer = 0;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing guestbook...');
  
  initializePage();
  setupEventListeners();
  loadProjects();
  loadStats();
  loadEntries();
  generateCaptcha();
});

/**
 * Initialize page elements
 */
function initializePage() {
  // Load draft from localStorage
  loadDraft();
  
  // Auto-save draft every 10 seconds
  setInterval(saveDraft, 10000);
  
  // Character counter
  const messageInput = document.getElementById('entryMessage');
  const charCount = document.getElementById('messageCharCount');
  
  if (messageInput && charCount) {
    messageInput.addEventListener('input', () => {
      const length = messageInput.value.length;
      charCount.textContent = length;
      charCount.parentElement.classList.toggle('warning', length > 200);
      charCount.parentElement.classList.toggle('danger', length > 230);
    });
  }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Form submission
  const form = document.getElementById('guestbookForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
  
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', handleFilterChange);
  });
  
  // Sort dropdown
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', handleSortChange);
  }
  
  // Emoji picker
  const emojiBtn = document.getElementById('emojiBtn');
  const emojiPicker = document.getElementById('emojiPicker');
  const closeEmoji = document.getElementById('closeEmoji');
  
  if (emojiBtn) {
    emojiBtn.addEventListener('click', () => {
      emojiPicker?.classList.toggle('hidden');
    });
  }
  
  if (closeEmoji) {
    closeEmoji.addEventListener('click', () => {
      emojiPicker?.classList.add('hidden');
    });
  }
  
  // Emoji options
  document.querySelectorAll('.emoji-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const messageInput = document.getElementById('entryMessage');
      if (messageInput) {
        const cursorPos = messageInput.selectionStart;
        const textBefore = messageInput.value.substring(0, cursorPos);
        const textAfter = messageInput.value.substring(cursorPos);
        messageInput.value = textBefore + btn.textContent + textAfter;
        messageInput.dispatchEvent(new Event('input'));
        messageInput.focus();
        messageInput.selectionStart = messageInput.selectionEnd = cursorPos + btn.textContent.length;
      }
      emojiPicker?.classList.add('hidden');
    });
  });
  
  // Preview button
  const previewBtn = document.getElementById('previewBtn');
  if (previewBtn) {
    previewBtn.addEventListener('click', showPreview);
  }
  
  // Close preview
  const closePreview = document.getElementById('closePreview');
  if (closePreview) {
    closePreview.addEventListener('click', () => {
      document.getElementById('previewModal')?.classList.add('hidden');
    });
  }
  
  // Pagination
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  
  if (prevBtn) prevBtn.addEventListener('click', () => changePage(currentPage - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => changePage(currentPage + 1));
  if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMoreEntries);
  
  // Avatar preview
  const avatarInput = document.getElementById('entryAvatar');
  const avatarPreview = document.getElementById('avatarPreview');
  
  if (avatarInput && avatarPreview) {
    avatarInput.addEventListener('input', () => {
      const url = avatarInput.value.trim();
      if (url) {
        avatarPreview.innerHTML = `<img src="${url}" alt="Avatar Preview" onerror="this.src='https://ui-avatars.com/api/?name=User&background=667eea&color=fff'">`;
        avatarPreview.style.display = 'block';
      } else {
        avatarPreview.style.display = 'none';
      }
    });
  }
  
  // Sign first button
  const signFirstBtn = document.getElementById('signFirstBtn');
  if (signFirstBtn) {
    signFirstBtn.addEventListener('click', () => {
      document.getElementById('guestbookForm')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}

/**
 * Load projects for dropdown
 */
async function loadProjects() {
  try {
    const projectSelect = document.getElementById('projectLink');
    if (!projectSelect) return;
    
    // Try to load from localStorage first
    const localProjects = JSON.parse(localStorage.getItem('cds_projects_temp') || '[]');
    const portfolioItems = JSON.parse(localStorage.getItem('cds_portfolio_items') || '[]');
    
    // Combine projects and portfolio items
    const allItems = [
      ...localProjects.map(p => ({ id: p.id, title: p.title, type: 'project' })),
      ...portfolioItems.map(p => ({ id: p.id, title: p.title, type: 'portfolio' }))
    ];
    
    if (allItems.length > 0) {
      allItems.forEach(item => {
        const option = document.createElement('option');
        option.value = JSON.stringify({ id: item.id, title: item.title, type: item.type });
        option.textContent = `${item.type === 'project' ? '💼' : '🎨'} ${item.title}`;
        projectSelect.appendChild(option);
      });
    }
    
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

/**
 * Load guestbook statistics
 */
async function loadStats() {
  try {
    const response = await fetch('/api/guestbook/stats');
    const result = await response.json();
    
    if (result.success) {
      const { total, lastWeek, topUser } = result.data;
      
      document.getElementById('totalEntries').textContent = total;
      document.getElementById('recentEntries').textContent = lastWeek;
      document.getElementById('mostActive').textContent = topUser.name;
    }
  } catch (error) {
    console.error('Error loading stats:', error);
    // Fallback to localStorage count
    const localEntries = JSON.parse(localStorage.getItem('cds_guestbook_entries') || '[]');
    document.getElementById('totalEntries').textContent = localEntries.length;
  }
}

/**
 * Load guestbook entries
 */
async function loadEntries() {
  try {
    showLoading(true);
    
    const response = await fetch(`/api/guestbook?page=${currentPage}&limit=10&filter=${currentFilter}&sort=${currentSort}`);
    const result = await response.json();
    
    if (result.success) {
      allEntries = result.data.entries;
      displayEntries(allEntries);
      updatePagination(result.data.pagination);
    } else {
      throw new Error('Failed to load entries');
    }
    
  } catch (error) {
    console.error('Error loading entries:', error);
    // Fallback to localStorage
    loadEntriesFromLocalStorage();
  } finally {
    showLoading(false);
  }
}

/**
 * Load entries from localStorage (fallback)
 */
function loadEntriesFromLocalStorage() {
  const entries = JSON.parse(localStorage.getItem('cds_guestbook_entries') || '[]');
  
  // Apply filters
  let filtered = entries;
  if (currentFilter === 'general') {
    filtered = entries.filter(e => !e.projectId);
  } else if (currentFilter === 'project-comments') {
    filtered = entries.filter(e => e.projectId);
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    if (currentSort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (currentSort === 'most-liked') return (b.likes || 0) - (a.likes || 0);
    return new Date(b.createdAt) - new Date(a.createdAt); // newest
  });
  
  allEntries = filtered;
  displayEntries(allEntries);
  
  // Update stats
  document.getElementById('totalEntries').textContent = entries.length;
}

/**
 * Display entries in the DOM
 */
function displayEntries(entries) {
  const container = document.getElementById('guestbookEntries');
  const emptyState = document.getElementById('emptyState');
  
  if (!container) return;
  
  if (entries.length === 0) {
    container.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }
  
  emptyState?.classList.add('hidden');
  container.innerHTML = '';
  
  entries.forEach(entry => {
    const entryCard = createEntryCard(entry);
    container.appendChild(entryCard);
  });
}

/**
 * Create entry card HTML
 */
function createEntryCard(entry) {
  const card = document.createElement('div');
  card.className = 'entry-card';
  card.setAttribute('data-entry-id', entry._id || entry.id);
  
  // Avatar
  const avatarUrl = entry.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name)}&background=667eea&color=fff`;
  
  // Format timestamp
  const timestamp = formatTimestamp(entry.createdAt);
  
  // Project tag (if linked to project)
  let projectTag = '';
  if (entry.projectId && entry.projectTitle) {
    projectTag = `
      <div class="project-tag" onclick="window.location.href='projects.html?id=${entry.projectId}'">
        📌 About: ${entry.projectTitle}
      </div>
    `;
  }
  
  // Pinned badge
  const pinnedBadge = entry.pinned ? '<span class="pinned-badge">📌 Pinned</span>' : '';
  
  card.innerHTML = `
    <div class="entry-header">
      <img src="${avatarUrl}" alt="${entry.name}" class="entry-avatar" onerror="this.src='https://ui-avatars.com/api/?name=User&background=667eea&color=fff'">
      <div class="entry-meta">
        <div class="entry-author">
          <strong>${escapeHtml(entry.name)}</strong>
          ${pinnedBadge}
        </div>
        <div class="entry-time">${timestamp}</div>
      </div>
    </div>
    
    ${projectTag}
    
    <div class="entry-message">${escapeHtml(entry.message)}</div>
    
    <div class="entry-actions">
      <button class="action-btn like-btn" data-id="${entry._id || entry.id}" onclick="handleLike('${entry._id || entry.id}')">
        <span class="heart-icon ${entry.likedByMe ? 'liked' : ''}">❤️</span>
        <span class="like-count">${entry.likes || 0}</span>
      </button>
      <button class="action-btn" onclick="showReplyForm('${entry._id || entry.id}')">
        💬 Reply ${entry.replies?.length ? `(${entry.replies.length})` : ''}
      </button>
    </div>
    
    <div class="replies-section hidden" id="replies-${entry._id || entry.id}">
      ${entry.replies && entry.replies.length > 0 ? createRepliesHTML(entry.replies) : ''}
    </div>
    
    <div class="reply-form-section hidden" id="reply-form-${entry._id || entry.id}">
      <textarea class="reply-input" placeholder="Write a reply..." maxlength="500"></textarea>
      <div class="reply-actions">
        <button class="btn-secondary" onclick="hideReplyForm('${entry._id || entry.id}')">Cancel</button>
        <button class="btn-gradient" onclick="submitReply('${entry._id || entry.id}')">Send Reply</button>
      </div>
    </div>
  `;
  
  // Add slide-up animation
  card.style.animation = 'slideUp 0.5s ease-out';
  
  return card;
}

/**
 * Create replies HTML
 */
function createRepliesHTML(replies) {
  return replies.map(reply => {
    const avatarUrl = reply.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.name)}&background=764ba2&color=fff`;
    const adminBadge = reply.isAdmin ? '<span class="admin-badge">Admin</span>' : '';
    
    return `
      <div class="reply-item">
        <img src="${avatarUrl}" alt="${reply.name}" class="reply-avatar" onerror="this.src='https://ui-avatars.com/api/?name=User&background=764ba2&color=fff'">
        <div class="reply-content">
          <div class="reply-author">
            <strong>${escapeHtml(reply.name)}</strong>
            ${adminBadge}
            <span class="reply-time">${formatTimestamp(reply.createdAt)}</span>
          </div>
          <div class="reply-message">${escapeHtml(reply.message)}</div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
  e.preventDefault();
  
  console.log('📝 Form submitted');
  
  const form = e.target;
  const formData = {
    name: document.getElementById('entryName').value.trim(),
    email: document.getElementById('entryEmail').value.trim(),
    avatar: document.getElementById('entryAvatar').value.trim(),
    message: document.getElementById('entryMessage').value.trim(),
    captchaAnswer: parseInt(document.getElementById('captchaAnswer').value)
  };
  
  // Validate
  if (!formData.name || !formData.message) {
    showFormMessage('⚠️ Name and message are required!', 'error');
    return;
  }
  
  if (formData.message.length > 240) {
    showFormMessage('⚠️ Message must be 240 characters or less!', 'error');
    return;
  }
  
  // Check captcha
  if (formData.captchaAnswer !== captchaAnswer) {
    showFormMessage('⚠️ Incorrect security answer!', 'error');
    return;
  }
  
  // Get project link if selected
  const projectSelect = document.getElementById('projectLink');
  if (projectSelect && projectSelect.value) {
    try {
      const projectData = JSON.parse(projectSelect.value);
      formData.projectId = projectData.id;
      formData.projectTitle = projectData.title;
      formData.projectType = projectData.type;
    } catch (e) {
      console.error('Error parsing project data:', e);
    }
  }
  
  // Submit to API
  try {
    const response = await fetch('/api/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      showFormMessage('✅ Entry added! Thank you!', 'success');
      form.reset();
      clearDraft();
      generateCaptcha();
      
      // Reload entries
      setTimeout(() => {
        loadEntries();
        loadStats();
      }, 1000);
    } else {
      throw new Error(result.message);
    }
    
  } catch (error) {
    console.error('Error submitting entry:', error);
    
    // Fallback: Save to localStorage
    saveToLocalStorage(formData);
    showFormMessage('⚠️ Saved locally! Entry will sync when online.', 'warning');
    form.reset();
    clearDraft();
    generateCaptcha();
    
    setTimeout(() => {
      loadEntriesFromLocalStorage();
      loadStats();
    }, 1000);
  }
}

/**
 * Save entry to localStorage
 */
function saveToLocalStorage(formData) {
  const entries = JSON.parse(localStorage.getItem('cds_guestbook_entries') || '[]');
  
  const newEntry = {
    ...formData,
    id: Date.now().toString(),
    likes: 0,
    likedBy: [],
    replies: [],
    createdAt: new Date().toISOString(),
    approved: true
  };
  
  entries.unshift(newEntry);
  localStorage.setItem('cds_guestbook_entries', JSON.stringify(entries));
}

/**
 * Handle like button click
 */
async function handleLike(entryId) {
  try {
    const response = await fetch(`/api/guestbook/${entryId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Update UI
      const btn = document.querySelector(`[data-id="${entryId}"]`);
      if (btn) {
        const heart = btn.querySelector('.heart-icon');
        const count = btn.querySelector('.like-count');
        
        if (result.data.liked) {
          heart.classList.add('liked');
          // Heart animation
          heart.style.animation = 'heartBurst 0.6s ease-out';
          setTimeout(() => heart.style.animation = '', 600);
        } else {
          heart.classList.remove('liked');
        }
        
        count.textContent = result.data.likes;
      }
    }
  } catch (error) {
    console.error('Error liking entry:', error);
  }
}

/**
 * Show reply form
 */
function showReplyForm(entryId) {
  const repliesSection = document.getElementById(`replies-${entryId}`);
  const replyForm = document.getElementById(`reply-form-${entryId}`);
  
  if (repliesSection) repliesSection.classList.remove('hidden');
  if (replyForm) replyForm.classList.toggle('hidden');
}

/**
 * Hide reply form
 */
function hideReplyForm(entryId) {
  const replyForm = document.getElementById(`reply-form-${entryId}`);
  if (replyForm) replyForm.classList.add('hidden');
}

/**
 * Submit reply
 */
async function submitReply(entryId) {
  const replyForm = document.getElementById(`reply-form-${entryId}`);
  if (!replyForm) return;
  
  const textarea = replyForm.querySelector('textarea');
  const message = textarea.value.trim();
  
  if (!message) {
    alert('⚠️ Please enter a reply message!');
    return;
  }
  
  // Get user info (from localStorage if logged in, or prompt)
  const savedUser = JSON.parse(localStorage.getItem('cosmic_devspace_user') || '{}');
  const name = savedUser.name || savedUser.username || prompt('Your name:') || 'Anonymous';
  
  try {
    const response = await fetch(`/api/guestbook/${entryId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email: savedUser.email || '',
        message,
        isAdmin: savedUser.role === 'admin'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      textarea.value = '';
      hideReplyForm(entryId);
      loadEntries(); // Reload to show new reply
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error('Error submitting reply:', error);
    alert('❌ Error submitting reply!');
  }
}

/**
 * Handle filter change
 */
function handleFilterChange(e) {
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  e.target.classList.add('active');
  
  currentFilter = e.target.dataset.filter;
  currentPage = 1;
  loadEntries();
}

/**
 * Handle sort change
 */
function handleSortChange(e) {
  currentSort = e.target.value;
  currentPage = 1;
  loadEntries();
}

/**
 * Change page
 */
function changePage(page) {
  currentPage = page;
  loadEntries();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Load more entries
 */
function loadMoreEntries() {
  currentPage++;
  loadEntries();
}

/**
 * Update pagination
 */
function updatePagination(pagination) {
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const paginationDiv = document.getElementById('pagination');
  const paginationInfo = document.getElementById('paginationInfo');
  
  if (prevBtn) prevBtn.disabled = !pagination.hasPrev;
  if (nextBtn) nextBtn.disabled = !pagination.hasNext;
  
  if (paginationInfo) {
    const start = (pagination.currentPage - 1) * 10 + 1;
    const end = Math.min(pagination.currentPage * 10, pagination.totalEntries);
    paginationInfo.textContent = `Showing ${start}-${end} of ${pagination.totalEntries} entries`;
  }
  
  if (paginationDiv && pagination.totalEntries > 0) {
    paginationDiv.classList.remove('hidden');
  }
}

/**
 * Show preview
 */
function showPreview() {
  const name = document.getElementById('entryName').value.trim() || 'Your Name';
  const message = document.getElementById('entryMessage').value.trim() || 'Your message will appear here...';
  const avatar = document.getElementById('entryAvatar').value.trim();
  
  const previewModal = document.getElementById('previewModal');
  const previewContent = document.getElementById('entryPreview');
  
  if (!previewContent) return;
  
  const avatarUrl = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff`;
  
  previewContent.innerHTML = `
    <div class="entry-card">
      <div class="entry-header">
        <img src="${avatarUrl}" alt="${name}" class="entry-avatar">
        <div class="entry-meta">
          <div class="entry-author"><strong>${escapeHtml(name)}</strong></div>
          <div class="entry-time">Just now</div>
        </div>
      </div>
      <div class="entry-message">${escapeHtml(message)}</div>
    </div>
  `;
  
  previewModal?.classList.remove('hidden');
}

/**
 * Generate CAPTCHA
 */
function generateCaptcha() {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  captchaAnswer = num1 + num2;
  
  const captchaQuestion = document.getElementById('captchaQuestion');
  if (captchaQuestion) {
    captchaQuestion.textContent = `${num1} + ${num2} = ?`;
  }
}

/**
 * Save draft to localStorage
 */
function saveDraft() {
  const draft = {
    name: document.getElementById('entryName')?.value || '',
    email: document.getElementById('entryEmail')?.value || '',
    avatar: document.getElementById('entryAvatar')?.value || '',
    message: document.getElementById('entryMessage')?.value || ''
  };
  
  if (draft.name || draft.message) {
    localStorage.setItem('cds_guestbook_draft', JSON.stringify(draft));
  }
}

/**
 * Load draft from localStorage
 */
function loadDraft() {
  const draft = JSON.parse(localStorage.getItem('cds_guestbook_draft') || '{}');
  
  if (draft.name) document.getElementById('entryName').value = draft.name;
  if (draft.email) document.getElementById('entryEmail').value = draft.email;
  if (draft.avatar) document.getElementById('entryAvatar').value = draft.avatar;
  if (draft.message) document.getElementById('entryMessage').value = draft.message;
  
  // Update character count
  if (draft.message) {
    const charCount = document.getElementById('messageCharCount');
    if (charCount) charCount.textContent = draft.message.length;
  }
}

/**
 * Clear draft from localStorage
 */
function clearDraft() {
  localStorage.removeItem('cds_guestbook_draft');
}

/**
 * Show loading spinner
 */
function showLoading(show) {
  const spinner = document.getElementById('loadingSpinner');
  const container = document.getElementById('guestbookEntries');
  
  if (show) {
    spinner?.classList.remove('hidden');
    if (container) container.style.opacity = '0.5';
  } else {
    spinner?.classList.add('hidden');
    if (container) container.style.opacity = '1';
  }
}

/**
 * Show form message
 */
function showFormMessage(message, type = 'info') {
  const formMsg = document.getElementById('formMsg');
  if (!formMsg) return;
  
  formMsg.textContent = message;
  formMsg.className = `form-message ${type}`;
  formMsg.style.display = 'block';
  
  setTimeout(() => {
    formMsg.style.display = 'none';
  }, 5000);
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make functions global for onclick handlers
window.handleLike = handleLike;
window.showReplyForm = showReplyForm;
window.hideReplyForm = hideReplyForm;
window.submitReply = submitReply;
