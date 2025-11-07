/**
 * GUESTBOOK INTEGRATION MODULE
 * Two-way comment system for portfolio and projects
 */

console.log('📖 Guestbook Integration Module loaded');

/**
 * Add comment to guestbook (linked to project/portfolio)
 */
async function addCommentToGuestbook(itemId, itemTitle, itemType, commentData) {
  try {
    const response = await fetch(`/api/projects/${itemId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: commentData.name || 'Anonymous',
        email: commentData.email || '',
        avatar: commentData.avatar || '',
        message: commentData.message,
        projectTitle: itemTitle
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      return { success: true, entry: result.data.entry };
    } else {
      throw new Error(result.message);
    }
    
  } catch (error) {
    console.error('Error adding comment to guestbook:', error);
    
    // Fallback: Save to localStorage
    return saveCommentToLocalStorage(itemId, itemTitle, itemType, commentData);
  }
}

/**
 * Load comments for specific item
 */
async function loadItemComments(itemId) {
  try {
    const response = await fetch(`/api/projects/${itemId}/comments`);
    const result = await response.json();
    
    if (result.success) {
      return { success: true, entries: result.data.entries };
    } else {
      throw new Error(result.message);
    }
    
  } catch (error) {
    console.error('Error loading comments:', error);
    
    // Fallback: Load from localStorage
    return loadCommentsFromLocalStorage(itemId);
  }
}

/**
 * Save comment to localStorage (fallback)
 */
function saveCommentToLocalStorage(itemId, itemTitle, itemType, commentData) {
  const allEntries = JSON.parse(localStorage.getItem('cds_guestbook_entries') || '[]');
  
  const newEntry = {
    id: Date.now().toString(),
    name: commentData.name || 'Anonymous',
    email: commentData.email || '',
    avatar: commentData.avatar || '',
    message: commentData.message,
    projectId: itemId,
    projectTitle: itemTitle,
    projectType: itemType,
    likes: 0,
    likedBy: [],
    replies: [],
    createdAt: new Date().toISOString(),
    approved: true
  };
  
  allEntries.unshift(newEntry);
  localStorage.setItem('cds_guestbook_entries', JSON.stringify(allEntries));
  
  return { success: true, entry: newEntry };
}

/**
 * Load comments from localStorage (fallback)
 */
function loadCommentsFromLocalStorage(itemId) {
  const allEntries = JSON.parse(localStorage.getItem('cds_guestbook_entries') || '[]');
  const itemComments = allEntries.filter(entry => entry.projectId === itemId);
  
  return { success: true, entries: itemComments };
}

/**
 * Create comment form HTML
 */
function createCommentFormHTML(itemId, itemTitle, itemType) {
  return `
    <div class="comment-form-section" style="margin: 2rem 0;">
      <h3 style="margin-bottom: 1rem; color: var(--text-primary);">💬 Leave a Comment</h3>
      <p style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
        Your comment will also appear in the <a href="guestbook.html" style="color: var(--accent-color);">guestbook</a> 
        with a link back to this ${itemType}!
      </p>
      
      <form id="commentForm-${itemId}" class="comment-form" style="background: rgba(255, 255, 255, 0.05); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">
              Your Name <span style="color: #f59e0b;">*</span>
            </label>
            <input 
              type="text" 
              id="commentName-${itemId}" 
              required 
              placeholder="John Doe"
              style="width: 100%; padding: 0.75rem; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; color: white; font-size: 1rem;"
            >
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">
              Email <span style="color: var(--text-muted); font-size: 0.85rem;">(Optional)</span>
            </label>
            <input 
              type="email" 
              id="commentEmail-${itemId}" 
              placeholder="john@example.com"
              style="width: 100%; padding: 0.75rem; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; color: white; font-size: 1rem;"
            >
          </div>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">
            Comment <span style="color: #f59e0b;">*</span>
          </label>
          <textarea 
            id="commentMessage-${itemId}" 
            required 
            rows="4" 
            maxlength="240"
            placeholder="Share your thoughts... 😊"
            style="width: 100%; padding: 0.75rem; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; color: white; font-size: 1rem; resize: vertical; font-family: inherit;"
          ></textarea>
          <div style="text-align: right; margin-top: 0.25rem; font-size: 0.85rem; color: var(--text-muted);">
            <span id="commentCharCount-${itemId}">0</span>/240
          </div>
        </div>
        
        <div style="display: flex; gap: 1rem; align-items: center;">
          <button 
            type="submit" 
            class="btn-gradient"
            style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; transition: transform 0.2s;"
          >
            📝 Post Comment
          </button>
          <span id="commentStatus-${itemId}" style="color: var(--text-secondary); font-size: 0.9rem;"></span>
        </div>
      </form>
    </div>
    
    <div id="commentsDisplay-${itemId}" class="comments-display" style="margin-top: 2rem;">
      <!-- Comments will be loaded here -->
    </div>
  `;
}

/**
 * Initialize comment section for an item
 */
function initializeCommentSection(itemId, itemTitle, itemType, containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.error(`Container ${containerSelector} not found`);
    return;
  }
  
  // Insert comment form HTML
  container.innerHTML = createCommentFormHTML(itemId, itemTitle, itemType);
  
  // Setup form submission
  const form = document.getElementById(`commentForm-${itemId}`);
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById(`commentName-${itemId}`).value.trim();
      const email = document.getElementById(`commentEmail-${itemId}`).value.trim();
      const message = document.getElementById(`commentMessage-${itemId}`).value.trim();
      const statusEl = document.getElementById(`commentStatus-${itemId}`);
      
      if (!name || !message) {
        statusEl.textContent = '⚠️ Name and message are required!';
        statusEl.style.color = '#f59e0b';
        return;
      }
      
      // Get user avatar from localStorage if logged in
      const savedUser = JSON.parse(localStorage.getItem('cosmic_devspace_user') || '{}');
      const avatar = savedUser.avatar || '';
      
      statusEl.textContent = '⏳ Posting...';
      statusEl.style.color = 'var(--text-secondary)';
      
      const result = await addCommentToGuestbook(itemId, itemTitle, itemType, {
        name,
        email,
        avatar,
        message
      });
      
      if (result.success) {
        statusEl.textContent = '✅ Comment posted!';
        statusEl.style.color = '#10b981';
        form.reset();
        document.getElementById(`commentCharCount-${itemId}`).textContent = '0';
        
        // Reload comments
        setTimeout(() => {
          loadAndDisplayComments(itemId);
          statusEl.textContent = '';
        }, 2000);
      } else {
        statusEl.textContent = '❌ Failed to post comment';
        statusEl.style.color = '#ef4444';
      }
    });
    
    // Character counter
    const textarea = document.getElementById(`commentMessage-${itemId}`);
    const charCount = document.getElementById(`commentCharCount-${itemId}`);
    if (textarea && charCount) {
      textarea.addEventListener('input', () => {
        charCount.textContent = textarea.value.length;
      });
    }
  }
  
  // Load existing comments
  loadAndDisplayComments(itemId);
}

/**
 * Load and display comments
 */
async function loadAndDisplayComments(itemId) {
  const displayContainer = document.getElementById(`commentsDisplay-${itemId}`);
  if (!displayContainer) return;
  
  displayContainer.innerHTML = '<p style="color: var(--text-secondary);">⏳ Loading comments...</p>';
  
  const result = await loadItemComments(itemId);
  
  if (result.success && result.entries.length > 0) {
    displayContainer.innerHTML = `
      <h4 style="margin-bottom: 1rem; color: var(--text-primary);">💬 Comments (${result.entries.length})</h4>
      ${result.entries.map(entry => createCommentHTML(entry)).join('')}
    `;
  } else {
    displayContainer.innerHTML = `
      <p style="color: var(--text-muted); text-align: center; padding: 2rem;">
        💭 No comments yet. Be the first to comment!
      </p>
    `;
  }
}

/**
 * Create comment HTML
 */
function createCommentHTML(entry) {
  const avatarUrl = entry.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name)}&background=667eea&color=fff`;
  const timestamp = formatTimestamp(entry.createdAt);
  
  return `
    <div class="comment-item" style="background: rgba(255, 255, 255, 0.03); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid rgba(255, 255, 255, 0.1);">
      <div style="display: flex; gap: 1rem; align-items: start;">
        <img 
          src="${avatarUrl}" 
          alt="${entry.name}"
          onerror="this.src='https://ui-avatars.com/api/?name=User&background=667eea&color=fff'"
          style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid rgba(102, 126, 234, 0.3);"
        >
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <strong style="color: var(--text-primary);">${escapeHtml(entry.name)}</strong>
            <span style="color: var(--text-muted); font-size: 0.85rem;">${timestamp}</span>
          </div>
          <p style="color: var(--text-secondary); margin: 0; line-height: 1.6;">${escapeHtml(entry.message)}</p>
          <div style="margin-top: 0.75rem; display: flex; gap: 1rem; align-items: center;">
            <span style="color: var(--text-muted); font-size: 0.85rem;">
              ❤️ ${entry.likes || 0}
            </span>
            <a href="guestbook.html" style="color: var(--accent-color); font-size: 0.85rem; text-decoration: none;">
              View in Guestbook →
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
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
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export functions
if (typeof window !== 'undefined') {
  window.GuestbookIntegration = {
    addCommentToGuestbook,
    loadItemComments,
    initializeCommentSection,
    loadAndDisplayComments
  };
}
