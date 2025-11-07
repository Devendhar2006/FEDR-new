/**
 * Portfolio Item Detail View
 * Displays full item details with comments section
 */

// Item detail state
const itemDetailState = {
  currentItem: null,
  currentItemId: null,
  currentItemType: null
};

// Render item detail modal
async function openItemDetail(itemId) {
  try {
    // Show loading
    const modal = document.getElementById('itemDetailModal');
    if (!modal) {
      console.error('Item detail modal not found');
      return;
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    
    const content = document.getElementById('itemDetailContent');
    if (!content) return;
    
    // FORCE REMOVE BLUR - Override any cached CSS
    content.style.background = 'rgba(15, 12, 41, 0.99)';
    content.style.backdropFilter = 'blur(3px)';
    content.style.webkitBackdropFilter = 'blur(3px)';
    
    content.innerHTML = `
      <div class="item-detail-loading">
        <div class="spinner"></div>
        <p>Loading cosmic item...</p>
      </div>
    `;
    
    // Fetch item details
    console.log('🔍 Fetching item details for ID:', itemId);
    const response = await fetch(`/api/portfolio/${itemId}?includeComments=true&commentsLimit=10`);
    console.log('📡 Response status:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('📦 Response data:', data);
    
    if (!response.ok || !data.success) {
      const errorMsg = data.message || data.error || `HTTP ${response.status}: Failed to load item`;
      throw new Error(errorMsg);
    }
    
    const item = data.data.item;
    const comments = data.data.comments || [];
    
    itemDetailState.currentItem = item;
    itemDetailState.currentItemId = item._id;
    itemDetailState.currentItemType = item.itemType || 'project';
    
    // Render item details
    content.innerHTML = renderItemDetail(item);
    
    // Initialize comments section
    setTimeout(() => {
      const commentsContainer = document.createElement('div');
      commentsContainer.id = 'commentsSection';
      content.appendChild(commentsContainer);
      
      // Load comments
      if (typeof initializeCommentsSection === 'function') {
        initializeCommentsSection(item._id, item.itemType || 'project');
      } else {
        console.warn('initializeCommentsSection function not found');
      }
    }, 100);
    
    // Scroll to top
    setTimeout(() => {
      modal.scrollTop = 0;
    }, 100);
    
  } catch (error) {
    console.error('❌ Error loading item detail:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    const content = document.getElementById('itemDetailContent');
    if (content) {
      content.innerHTML = `
        <div class="item-detail-error" style="padding: 60px 30px; text-align: center; color: #fff;">
          <h2 style="color: #ff5673; margin-bottom: 20px;">❌ Error Loading Item</h2>
          <p style="font-size: 1.1rem; margin-bottom: 30px;">${error.message || 'Unknown error occurred'}</p>
          <button class="btn-close-detail" onclick="closeItemDetail()" style="background: linear-gradient(135deg, #965aff, #2bc4fa); color: #fff; border: none; padding: 15px 30px; border-radius: 25px; cursor: pointer; font-size: 1rem; font-weight: 600;">
            Close & Try Again
          </button>
        </div>
      `;
    }
  }
}

// Render item detail based on type
function renderItemDetail(item) {
  const itemType = item.itemType || 'project';
  
  if (itemType === 'certification') {
    return renderCertificationDetail(item);
  } else if (itemType === 'achievement') {
    return renderAchievementDetail(item);
  } else {
    return renderProjectDetail(item);
  }
}

// Render Certification Detail
function renderCertificationDetail(item) {
  const cert = item.certification || {};
  const imageUrl = item.images?.[0]?.url || item.thumbnail || 'https://via.placeholder.com/400x300/965aff/ffffff?text=Certificate';
  
  return `
    <div class="item-detail-header">
      <button class="close-detail-btn" onclick="closeItemDetail()">&times;</button>
      <h1 class="item-detail-title">🎓 ${escapeHtml(item.title)}</h1>
    </div>
    
    <div class="item-detail-body">
      <div class="item-image-section">
        <img src="${imageUrl}" alt="${escapeHtml(item.title)}" class="item-main-image">
      </div>
      
      <div class="item-info-grid">
        <div class="info-card">
          <div class="info-label">🏢 Issuing Organization</div>
          <div class="info-value">${escapeHtml(cert.issuingOrganization || 'N/A')}</div>
        </div>
        
        <div class="info-card">
          <div class="info-label">📅 Issue Date</div>
          <div class="info-value">${formatDate(cert.issueDate) || 'N/A'}</div>
        </div>
        
        ${cert.expiryDate ? `
        <div class="info-card">
          <div class="info-label">📅 Expiry Date</div>
          <div class="info-value">${formatDate(cert.expiryDate)}</div>
        </div>
        ` : ''}
        
        ${cert.credentialId ? `
        <div class="info-card">
          <div class="info-label">🆔 Credential ID</div>
          <div class="info-value">${escapeHtml(cert.credentialId)}</div>
        </div>
        ` : ''}
        
        ${cert.credentialUrl ? `
        <div class="info-card">
          <div class="info-label">🔗 Credential URL</div>
          <div class="info-value">
            <a href="${escapeHtml(cert.credentialUrl)}" target="_blank" rel="noopener">Verify Credential</a>
          </div>
        </div>
        ` : ''}
      </div>
      
      ${cert.skillsGained && cert.skillsGained.length > 0 ? `
      <div class="skills-section">
        <div class="section-header">💡 Skills Gained</div>
        <div class="skills-tags">
          ${cert.skillsGained.map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join('')}
        </div>
      </div>
      ` : ''}
      
      ${item.description ? `
      <div class="description-section">
        <div class="section-header">📝 Description</div>
        <div class="description-content">${escapeHtml(item.description)}</div>
      </div>
      ` : ''}
    </div>
  `;
}

// Render Achievement Detail
function renderAchievementDetail(item) {
  const achievement = item.achievement || {};
  const imageUrl = item.images?.[0]?.url || item.thumbnail || 'https://via.placeholder.com/400x300/965aff/ffffff?text=Achievement';
  
  return `
    <div class="item-detail-header">
      <button class="close-detail-btn" onclick="closeItemDetail()">&times;</button>
      <h1 class="item-detail-title">🏆 ${escapeHtml(item.title)}</h1>
    </div>
    
    <div class="item-detail-body">
      <div class="item-image-section">
        <img src="${imageUrl}" alt="${escapeHtml(item.title)}" class="item-main-image">
      </div>
      
      <div class="item-info-grid">
        <div class="info-card">
          <div class="info-label">🏷️ Category</div>
          <div class="info-value">${escapeHtml(achievement.achievementCategory || 'N/A')}</div>
        </div>
        
        <div class="info-card">
          <div class="info-label">📅 Date</div>
          <div class="info-value">${formatDate(achievement.achievementDate) || 'N/A'}</div>
        </div>
        
        ${achievement.organization ? `
        <div class="info-card">
          <div class="info-label">🏢 Organization</div>
          <div class="info-value">${escapeHtml(achievement.organization)}</div>
        </div>
        ` : ''}
      </div>
      
      ${item.description ? `
      <div class="description-section">
        <div class="section-header">📝 Description</div>
        <div class="description-content">${escapeHtml(item.description)}</div>
      </div>
      ` : ''}
      
      ${achievement.achievementDetails ? `
      <div class="details-section">
        <div class="section-header">📋 Achievement Details</div>
        <div class="description-content">${escapeHtml(achievement.achievementDetails)}</div>
      </div>
      ` : ''}
    </div>
  `;
}

// Render Project Detail
function renderProjectDetail(item) {
  const imageUrl = item.images?.[0]?.url || item.thumbnail || 'https://via.placeholder.com/400x300/965aff/ffffff?text=Project';
  const technologies = item.technologies || [];
  
  return `
    <div class="item-detail-header">
      <button class="close-detail-btn" onclick="closeItemDetail()">&times;</button>
      <h1 class="item-detail-title">📝 ${escapeHtml(item.title)}</h1>
    </div>
    
    <div class="item-detail-body">
      <div class="item-image-section">
        <img src="${imageUrl}" alt="${escapeHtml(item.title)}" class="item-main-image">
      </div>
      
      <div class="item-info-grid">
        <div class="info-card">
          <div class="info-label">🏷️ Category</div>
          <div class="info-value">${escapeHtml(item.category || 'N/A')}</div>
        </div>
        
        <div class="info-card">
          <div class="info-label">📊 Status</div>
          <div class="info-value">${getStatusBadge(item.status)}</div>
        </div>
        
        ${item.timeline?.startDate ? `
        <div class="info-card">
          <div class="info-label">📅 Start Date</div>
          <div class="info-value">${formatDate(item.timeline.startDate)}</div>
        </div>
        ` : ''}
        
        ${item.timeline?.endDate ? `
        <div class="info-card">
          <div class="info-label">📅 End Date</div>
          <div class="info-value">${formatDate(item.timeline.endDate)}</div>
        </div>
        ` : ''}
      </div>
      
      ${technologies.length > 0 ? `
      <div class="technologies-section">
        <div class="section-header">⚙️ Technologies</div>
        <div class="tech-tags">
          ${technologies.map(tech => `<span class="tech-tag">${escapeHtml(tech.name || tech)}</span>`).join('')}
        </div>
      </div>
      ` : ''}
      
      ${item.links ? `
      <div class="links-section">
        <div class="section-header">🔗 Links & Resources</div>
        <div class="links-grid">
          ${item.links.github ? `
          <a href="${escapeHtml(item.links.github)}" target="_blank" rel="noopener" class="link-btn">
            <span>🔗</span> GitHub Repository
          </a>
          ` : ''}
          ${item.links.live || item.links.demo ? `
          <a href="${escapeHtml(item.links.live || item.links.demo)}" target="_blank" rel="noopener" class="link-btn">
            <span>🌐</span> Live Demo
          </a>
          ` : ''}
          ${item.links.documentation ? `
          <a href="${escapeHtml(item.links.documentation)}" target="_blank" rel="noopener" class="link-btn">
            <span>📚</span> Documentation
          </a>
          ` : ''}
        </div>
      </div>
      ` : ''}
      
      ${item.description ? `
      <div class="description-section">
        <div class="section-header">📄 Description</div>
        <div class="description-content">${escapeHtml(item.description)}</div>
      </div>
      ` : ''}
    </div>
  `;
}

// Helper functions
function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function getStatusBadge(status) {
  const badges = {
    'active': '🟢 Active',
    'completed': '🔵 Completed',
    'archived': '⚪ Archived',
    'on-hold': '🟡 On Hold',
    'planning': '🟣 Planning'
  };
  return badges[status] || status;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close item detail
function closeItemDetail() {
  const modal = document.getElementById('itemDetailModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
  }
  
  itemDetailState.currentItem = null;
  itemDetailState.currentItemId = null;
  itemDetailState.currentItemType = null;
}

// Make functions globally available
window.openItemDetail = openItemDetail;
window.closeItemDetail = closeItemDetail;

