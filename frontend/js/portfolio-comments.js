/**
 * Portfolio Comments System
 * Handles comments display and interaction for portfolio items
 */

// Comment state management
const commentState = {
  currentItemId: null,
  currentItemType: null,
  comments: [],
  currentPage: 1,
  commentsPerPage: 5,
  sortBy: 'newest'
};

// Emoji picker emojis
const EMOJI_PICKER = ['😊', '👍', '🎉', '🔥', '💯', '⭐', '🚀', '💎', '🎯', '✨', '💫', '🌟', '👏', '❤️', '💪', '🔥'];

// Generate avatar from name
function generateAvatar(name) {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const colors = ['#965aff', '#2bc4fa', '#fde68a', '#ff568f', '#00d4aa'];
  const color = colors[name.length % colors.length];
  
  return {
    initials,
    color,
    url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color.substring(1)}&color=fff&size=40&bold=true`
  };
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

// Load comments for an item
async function loadComments(itemId, itemType) {
  try {
    commentState.currentItemId = itemId;
    commentState.currentItemType = itemType;
    
    const sort = commentState.sortBy === 'newest' ? '-createdAt' : 'createdAt';
    const url = `/api/portfolio/${itemId}/comments?sort=${sort}&limit=50`;
    
    console.log('🔄 Loading comments from:', url);
    const response = await fetch(url);
    console.log('📥 Comments response status:', response.status);
    
    const data = await response.json();
    console.log('📦 Comments data:', data);
    
    if (data.success) {
      commentState.comments = data.data.comments || [];
      console.log('✅ Loaded', commentState.comments.length, 'comments');
      renderComments();
    } else {
      console.error('❌ API returned error:', data);
      renderComments(); // Still render empty state
    }
  } catch (error) {
    console.error('❌ Error loading comments:', error);
    showNotification('❌ Failed to load comments', 'error');
    renderComments(); // Still render empty state
  }
}

// Render comments
function renderComments() {
  const container = document.getElementById('commentsContainer');
  if (!container) return;
  
  const comments = commentState.comments;
  const startIdx = (commentState.currentPage - 1) * commentState.commentsPerPage;
  const endIdx = startIdx + commentState.commentsPerPage;
  const pageComments = comments.slice(startIdx, endIdx);
  
  if (comments.length === 0) {
    container.innerHTML = `
      <div class="comments-empty">
        <div class="empty-icon">💬</div>
        <p>No comments yet. Be the first to comment!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = pageComments.map(comment => renderComment(comment)).join('');
  
  // Add event listeners
  pageComments.forEach((comment, idx) => {
    const commentEl = container.children[idx];
    if (commentEl) {
      setupCommentInteractions(commentEl, comment);
    }
  });
  
  // Render pagination
  renderCommentPagination();
}

// Render single comment
function renderComment(comment) {
  const avatar = generateAvatar(comment.name);
  const date = formatDate(comment.createdAt);
  const replies = comment.replies || [];
  
  return `
    <div class="comment-item" data-comment-id="${comment._id}">
      <div class="comment-header">
        <div class="comment-avatar" style="background: linear-gradient(135deg, ${avatar.color}, ${avatar.color}dd);">
          ${avatar.initials}
        </div>
        <div class="comment-author-info">
          <div class="comment-author-name">${escapeHtml(comment.name)}</div>
          <div class="comment-date">${date}</div>
        </div>
      </div>
      <div class="comment-text">${escapeHtml(comment.text)}</div>
      <div class="comment-actions">
        <button class="comment-like-btn" data-comment-id="${comment._id}" data-liked="false">
          <span class="like-icon">❤️</span>
          <span class="like-count">${comment.likes || 0}</span>
        </button>
        <button class="comment-reply-btn" data-comment-id="${comment._id}">
          💬 Reply
        </button>
      </div>
      ${replies.length > 0 ? `
        <div class="comment-replies">
          ${replies.map(reply => renderReply(reply)).join('')}
        </div>
      ` : ''}
      <div class="reply-form-container" id="replyForm_${comment._id}" style="display: none;">
        ${renderReplyForm(comment._id)}
      </div>
    </div>
  `;
}

// Render reply
function renderReply(reply) {
  const avatar = generateAvatar(reply.name);
  const date = formatDate(reply.createdAt);
  
  return `
    <div class="comment-reply">
      <div class="reply-indicator">↳</div>
      <div class="reply-content">
        <div class="reply-header">
          <div class="comment-avatar" style="background: linear-gradient(135deg, ${avatar.color}, ${avatar.color}dd);">
            ${avatar.initials}
          </div>
          <div class="reply-author-info">
            <div class="comment-author-name">${escapeHtml(reply.name)}</div>
            <div class="comment-date">${date}</div>
          </div>
        </div>
        <div class="comment-text">${escapeHtml(reply.text)}</div>
      </div>
    </div>
  `;
}

// Render reply form
function renderReplyForm(commentId) {
  return `
    <form class="reply-form" data-comment-id="${commentId}">
      <div class="form-row">
        <input type="text" name="replyName" placeholder="Your name" required maxlength="100">
        <input type="email" name="replyEmail" placeholder="Email (optional)" maxlength="200">
      </div>
      <textarea name="replyText" placeholder="Write a reply..." required maxlength="500"></textarea>
      <div class="form-actions-inline">
        <span class="char-counter"><span id="replyCounter_${commentId}">0</span>/500</span>
        <div>
          <button type="button" class="btn-cancel-reply" data-comment-id="${commentId}">Cancel</button>
          <button type="submit" class="btn-submit-reply">Post Reply</button>
        </div>
      </div>
    </form>
  `;
}

// Setup comment interactions
function setupCommentInteractions(commentEl, comment) {
  // Like button
  const likeBtn = commentEl.querySelector('.comment-like-btn');
  if (likeBtn) {
    likeBtn.addEventListener('click', () => toggleCommentLike(comment._id));
  }
  
  // Reply button
  const replyBtn = commentEl.querySelector('.comment-reply-btn');
  if (replyBtn) {
    replyBtn.addEventListener('click', () => toggleReplyForm(comment._id));
  }
  
  // Reply form submission
  const replyForm = commentEl.querySelector('.reply-form');
  if (replyForm) {
    replyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const commentId = replyForm.dataset.commentId;
      submitReply(e, commentId);
    });
  }
  
  // Cancel reply button
  const cancelBtn = commentEl.querySelector('.btn-cancel-reply');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      const commentId = cancelBtn.dataset.commentId;
      cancelReply(commentId);
    });
  }
  
  // Character counter for reply form
  const replyTextarea = commentEl.querySelector(`textarea[name="replyText"]`);
  if (replyTextarea) {
    replyTextarea.addEventListener('input', () => {
      const counter = document.getElementById(`replyCounter_${comment._id}`);
      if (counter) counter.textContent = replyTextarea.value.length;
    });
  }
}

// Toggle reply form
function toggleReplyForm(commentId) {
  const formContainer = document.getElementById(`replyForm_${commentId}`);
  if (!formContainer) return;
  
  const isVisible = formContainer.style.display !== 'none';
  formContainer.style.display = isVisible ? 'none' : 'block';
  
  if (!isVisible) {
    formContainer.querySelector('textarea')?.focus();
  }
}

// Cancel reply
function cancelReply(commentId) {
  const formContainer = document.getElementById(`replyForm_${commentId}`);
  if (formContainer) {
    formContainer.style.display = 'none';
    const form = formContainer.querySelector('form');
    if (form) form.reset();
  }
}

// Submit reply
async function submitReply(event, commentId) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  const name = formData.get('replyName').trim();
  const email = formData.get('replyEmail').trim();
  const text = formData.get('replyText').trim();
  
  if (!name || !text) {
    showNotification('❌ Please fill in all required fields', 'error');
    return;
  }
  
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Posting...';
  submitBtn.disabled = true;
  
  try {
    const response = await fetch(`/api/portfolio/${commentState.currentItemId}/comments/${commentId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email: email || undefined, text })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to post reply');
    }
    
    showNotification('💬 Reply posted!', 'success');
    form.reset();
    formContainer = document.getElementById(`replyForm_${commentId}`);
    if (formContainer) formContainer.style.display = 'none';
    
    // Reload comments
    await loadComments(commentState.currentItemId, commentState.currentItemType);
    
  } catch (error) {
    console.error('Reply submission error:', error);
    showNotification('❌ Error: ' + (error.message || 'Failed to post reply'), 'error');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// Toggle comment like
async function toggleCommentLike(commentId) {
  try {
    const response = await fetch(`/api/portfolio/${commentState.currentItemId}/comments/${commentId}/like`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Update UI
      const commentEl = document.querySelector(`[data-comment-id="${commentId}"]`);
      if (commentEl) {
        const likeBtn = commentEl.querySelector('.comment-like-btn');
        const likeCount = commentEl.querySelector('.like-count');
        
        if (likeBtn && likeCount) {
          likeBtn.dataset.liked = data.data.liked;
          likeCount.textContent = data.data.likesCount;
          likeBtn.classList.toggle('liked', data.data.liked);
        }
      }
    }
  } catch (error) {
    console.error('Like toggle error:', error);
  }
}

// Render comment pagination
function renderCommentPagination() {
  const container = document.getElementById('commentsPagination');
  if (!container) return;
  
  const totalPages = Math.ceil(commentState.comments.length / commentState.commentsPerPage);
  
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = `
    <div class="pagination-controls">
      <button class="page-btn" data-page="${commentState.currentPage - 1}" ${commentState.currentPage === 1 ? 'disabled' : ''}>
        ← Previous
      </button>
      <span class="page-info">Page ${commentState.currentPage} of ${totalPages}</span>
      <button class="page-btn" data-page="${commentState.currentPage + 1}" ${commentState.currentPage === totalPages ? 'disabled' : ''}>
        Next →
      </button>
    </div>
  `;
  
  // Add event listeners to pagination buttons
  container.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page);
      if (!isNaN(page)) changeCommentPage(page);
    });
  });
}

// Change comment page
function changeCommentPage(page) {
  const totalPages = Math.ceil(commentState.comments.length / commentState.commentsPerPage);
  if (page < 1 || page > totalPages) return;
  
  commentState.currentPage = page;
  renderComments();
}

// Render comment form
function renderCommentForm() {
  return `
    <div class="comment-form-section">
      <div class="section-header">💬 Leave a Comment</div>
      <form id="newCommentForm" class="comment-form">
        <div class="form-row">
          <input type="text" name="commentName" id="commentName" placeholder="Your name *" required maxlength="100">
          <input type="email" name="commentEmail" id="commentEmail" placeholder="Email (optional)" maxlength="200">
        </div>
        <div class="emoji-picker-container">
          <div class="emoji-picker-label">Add emoji:</div>
          <div class="emoji-picker" id="emojiPicker">
            ${EMOJI_PICKER.map(emoji => `<button type="button" class="emoji-btn" data-emoji="${emoji}">${emoji}</button>`).join('')}
          </div>
        </div>
        <textarea name="commentText" id="commentText" placeholder="Write your comment here... (max 500 characters)" required maxlength="500"></textarea>
        <div class="form-actions-inline">
          <span class="char-counter"><span id="commentCounter">0</span>/500</span>
          <button type="submit" class="btn-submit-comment">💬 Post Comment</button>
        </div>
      </form>
    </div>
  `;
}

// Insert emoji into textarea
function insertEmoji(emoji) {
  const textarea = document.getElementById('commentText');
  if (!textarea) return;
  
  const cursorPos = textarea.selectionStart;
  const textBefore = textarea.value.substring(0, cursorPos);
  const textAfter = textarea.value.substring(cursorPos);
  
  textarea.value = textBefore + emoji + textAfter;
  textarea.selectionStart = textarea.selectionEnd = cursorPos + emoji.length;
  textarea.focus();
  
  // Update counter
  const counter = document.getElementById('commentCounter');
  if (counter) counter.textContent = textarea.value.length;
}

// Submit comment
async function submitComment(event) {
  event.preventDefault();
  
  console.log('💬 Submitting comment...');
  
  const form = event.target;
  const formData = new FormData(form);
  const name = formData.get('commentName').trim();
  const email = formData.get('commentEmail').trim();
  const text = formData.get('commentText').trim();
  
  console.log('📝 Comment data:', { name, email: email || '(none)', text: text.substring(0, 50) + '...' });
  
  if (!name || !text) {
    showNotification('❌ Please fill in all required fields', 'error');
    return;
  }
  
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Posting...';
  submitBtn.disabled = true;
  
  try {
    const url = `/api/portfolio/${commentState.currentItemId}/comments`;
    console.log('🔄 Posting comment to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email: email || undefined, text })
    });
    
    console.log('📥 Comment response status:', response.status);
    const data = await response.json();
    console.log('📦 Comment response data:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to post comment');
    }
    
    console.log('✅ Comment posted successfully!');
    showNotification('💬 Comment posted successfully!', 'success');
    form.reset();
    document.getElementById('commentCounter').textContent = '0';
    
    // Reload comments
    console.log('🔄 Reloading comments...');
    await loadComments(commentState.currentItemId, commentState.currentItemType);
    
    // Scroll to top of comments
    const commentsSection = document.getElementById('commentsSection');
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
  } catch (error) {
    console.error('Comment submission error:', error);
    showNotification('❌ Error: ' + (error.message || 'Failed to post comment'), 'error');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show notification
function showNotification(message, type = 'info') {
  // Create notification directly - avoid recursion
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? 'rgba(46, 213, 115, 0.95)' : 'rgba(255, 86, 143, 0.95)'};
    color: white;
    padding: 15px 25px;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    z-index: 10001;
    animation: slideIn 0.3s ease-out;
    font-weight: 500;
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Initialize comments section for an item
function initializeCommentsSection(itemId, itemType) {
  const container = document.getElementById('commentsSection');
  if (!container) {
    console.error('Comments section container not found');
    return;
  }
  
  console.log('🔧 Initializing comments section for item:', itemId);
  
  commentState.currentItemId = itemId;
  commentState.currentItemType = itemType;
  commentState.currentPage = 1;
  commentState.comments = [];
  
  // Render comment form
  container.innerHTML = `
    <div class="comments-header">
      <h3>💬 Comments</h3>
      <div class="comment-sort">
        <select id="commentSort">
          <option value="newest" selected>Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>
    </div>
    ${renderCommentForm()}
    <div id="commentsContainer" class="comments-list"></div>
    <div id="commentsPagination" class="comments-pagination"></div>
  `;
  
  // Setup comment form submission
  const commentForm = document.getElementById('newCommentForm');
  if (commentForm) {
    commentForm.addEventListener('submit', submitComment);
    console.log('✅ Comment form event listener attached');
  }
  
  // Setup comment sort dropdown
  const sortSelect = document.getElementById('commentSort');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => changeCommentSort(e.target.value));
  }
  
  // Setup emoji buttons
  const emojiPicker = document.getElementById('emojiPicker');
  if (emojiPicker) {
    emojiPicker.addEventListener('click', (e) => {
      if (e.target.classList.contains('emoji-btn')) {
        const emoji = e.target.dataset.emoji;
        if (emoji) insertEmoji(emoji);
      }
    });
  }
  
  // Setup character counter
  const textarea = document.getElementById('commentText');
  if (textarea) {
    textarea.addEventListener('input', () => {
      const counter = document.getElementById('commentCounter');
      if (counter) counter.textContent = textarea.value.length;
    });
  }
  
  // Pre-fill name/email if user is logged in
  try {
    const user = typeof CosmicAPI !== 'undefined' && CosmicAPI?.utils?.getCurrentUser();
    if (user) {
      const nameInput = document.getElementById('commentName');
      const emailInput = document.getElementById('commentEmail');
      if (nameInput && user.username) nameInput.value = user.username;
      if (emailInput && user.email) emailInput.value = user.email;
    }
  } catch (e) {
    // Ignore if CosmicAPI not available
  }
  
  // Load comments
  console.log('🔄 Loading comments...');
  loadComments(itemId, itemType);
}

// Change comment sort
function changeCommentSort(sortBy) {
  commentState.sortBy = sortBy;
  commentState.currentPage = 1;
  loadComments(commentState.currentItemId, commentState.currentItemType);
}

// Make functions globally available
window.initializeCommentsSection = initializeCommentsSection;
window.loadComments = loadComments;
window.submitComment = submitComment;
window.submitReply = submitReply;
window.cancelReply = cancelReply;
window.toggleReplyForm = toggleReplyForm;
window.toggleCommentLike = toggleCommentLike;
window.insertEmoji = insertEmoji;
window.changeCommentPage = changeCommentPage;
window.changeCommentSort = changeCommentSort;

console.log('✅ Portfolio Comments system loaded');

