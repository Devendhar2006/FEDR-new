/**
 * COSMIC DEVSPACE - PORTFOLIO PAGE
 * Comprehensive portfolio functionality with filters, search, animations
 * Version: 2025-11-07-03 (FIXED: API URL for port 8080)
 */

console.log('🚀 Portfolio.js loaded - Version 2025-11-07-03');

(function() {
  'use strict';
  
  // API Configuration - Use proxy at /api
  const API_BASE_URL = window.location.origin + '/api';
  
  console.log('📡 Portfolio API Base URL:', API_BASE_URL);
  
  // Selectors
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Application State
  const state = {
    portfolioItems: [],
    filteredItems: [],
    currentView: 'grid',
    currentPage: 1,
    itemsPerPage: 12,
    currentTypeFilter: 'all', // 'all', 'project', 'certification', 'achievement'
    filters: {
      category: '',
      search: '',
      sort: 'newest'
    },
    uploadedImage: null,
    techStack: [],
    editingId: null
  };

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================
  
  function toast(msg, type = 'info') {
    let t = $('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = `toast ${type} show`;
    setTimeout(() => {
      t.classList.remove('show');
    }, 3000);
  }
  
  function authUser() {
    try {
      return JSON.parse(localStorage.getItem('cds_user') || 'null');
    } catch {
      return null;
    }
  }
  
  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
  
  function showLoading(show = true) {
    const spinner = $('#loadingSpinner');
    if (spinner) {
      spinner.classList.toggle('hidden', !show);
    }
  }
  
  function showEmptyState(show = true) {
    const empty = $('#emptyState');
    if (empty) {
      empty.classList.toggle('hidden', !show);
    }
  }

  // ==========================================================================
  // API FUNCTIONS
  // ==========================================================================
  
  async function fetchPortfolioItems() {
    showLoading(true);
    
    // Check if user is logged in - show items only to authenticated users
    const user = authUser();
    if (!user) {
      showLoading(false);
      showEmptyState(true);
      const emptyState = $('#emptyState');
      if (emptyState) {
        emptyState.innerHTML = `
          <div class="empty-state-content">
            <div class="cosmic-planet"></div>
            <h2>🔒 Login Required</h2>
            <p>Please <a href="login.html" style="color: #2bc4fa; text-decoration: underline;">sign in</a> to view portfolio items and certificates.</p>
            <p style="margin-top: 20px;">New user? <a href="register.html" style="color: #fde68a; text-decoration: underline;">Create an account</a></p>
          </div>
        `;
      }
      return;
    }
    
    try {
      const params = new URLSearchParams();
      
      // Show all items by default (not just user's items)
      // To show only user's items, uncomment the line below
      // if (user) {
      //   params.append('myItems', 'true');
      // }
      
      if (state.filters.category) params.append('category', state.filters.category);
      if (state.filters.search) params.append('search', state.filters.search);
      // Map frontend sort values to backend format
      const sortMap = {
        'newest': 'newest',
        'oldest': 'oldest',
        'views': 'views',
        'likes': 'likes',
        'az': 'az',
        'za': 'za',
        'trending': 'trending'
      };
      const sortValue = sortMap[state.filters.sort] || 'newest';
      params.append('sort', sortValue);
      params.append('page', state.currentPage);
      params.append('limit', state.itemsPerPage);
      
      // Add authorization header if user is logged in
      const headers = {};
      if (user && user.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      
      console.log('🌐 Fetching from:', `${API_BASE_URL}/portfolio?${params}`);
      const response = await fetch(`${API_BASE_URL}/portfolio?${params}`, { headers });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Handle both response formats: { data: { projects: [...] } } or { data: [...] }
        const items = data.data?.projects || data.data || data.items || [];
        console.log('✅ Fetched portfolio items:', items.length);
        console.log('Items:', items.map(item => ({ 
          id: item._id, 
          title: item.title, 
          type: item.itemType, 
          visibility: item.visibility,
          status: item.status,
          category: item.category 
        })));
        state.portfolioItems = items;
        applyFilters();
        renderPortfolio();
        updateStats();
        updateTypeCounts();
      } else {
        console.error('❌ API returned error:', data);
        toast(data.message || 'Failed to load portfolio items', 'error');
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      toast('Failed to load portfolio items', 'error');
    } finally {
      showLoading(false);
    }
  }
  
  function renderPortfolio() {
    const gallery = $('#portfolioGallery');
    if (!gallery) return;
    
    gallery.innerHTML = '';
    
    if (state.filteredItems.length === 0) {
      showEmptyState(true);
      return;
    }
    
    showEmptyState(false);
    
    // Group items by type for better organization
    const itemsByType = {
      project: [],
      certification: [],
      achievement: []
    };
    
    state.filteredItems.forEach(item => {
      const itemType = item.itemType || 'project';
      if (itemsByType[itemType]) {
        itemsByType[itemType].push(item);
      } else {
        itemsByType.project.push(item);
      }
    });
    
    // Render all items with smooth animations
    let delay = 0;
    state.filteredItems.forEach((item, index) => {
      const card = createPortfolioCard(item);
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = `all 0.4s ease ${delay}s`;
      gallery.appendChild(card);
      
      // Animate in
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 50 + delay * 100);
      
      delay += 0.05;
    });
  }
  
  function createPortfolioCard(item) {
    const card = document.createElement('div');
    card.className = 'portfolio-item-card';
    card.dataset.itemType = item.itemType || 'project';
    card.dataset.itemId = item._id;
    
    const itemType = item.itemType || 'project';
    const itemIcon = itemType === 'certification' ? '🎓' : itemType === 'achievement' ? '🏆' : '📝';
    
    // Get image URL and validate it
    let imageUrl = item.images?.[0]?.url || item.thumbnail || item.certification?.badgeUrl;
    // If imageUrl is invalid or doesn't start with http, use SVG placeholder
    if (!imageUrl || !imageUrl.startsWith('http')) {
      const title = (item.title || 'Item').substring(0, 30);
      imageUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23965aff'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='24' fill='%23ffffff'%3E${encodeURIComponent(title)}%3C/text%3E%3C/svg%3E`;
    }
    
    // Get organization/category info
    let orgInfo = '';
    if (itemType === 'certification' && item.certification?.issuingOrganization) {
      orgInfo = `<div class="portfolio-card-org">🏢 ${escapeHtml(item.certification.issuingOrganization)}</div>`;
    } else if (itemType === 'achievement' && item.achievement?.organization) {
      orgInfo = `<div class="portfolio-card-org">🏢 ${escapeHtml(item.achievement.organization)}</div>`;
    } else if (item.category) {
      orgInfo = `<div class="portfolio-card-org">🏷️ ${escapeHtml(item.category)}</div>`;
    }
    
    // Get date info
    let dateInfo = '';
    if (itemType === 'certification' && item.certification?.issueDate) {
      const date = new Date(item.certification.issueDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      dateInfo = `<div class="portfolio-card-date">📅 ${date}</div>`;
    } else if (itemType === 'achievement' && item.achievement?.achievementDate) {
      const date = new Date(item.achievement.achievementDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      dateInfo = `<div class="portfolio-card-date">📅 ${date}</div>`;
    }
    
    // Get metrics
    const views = item.metrics?.views || 0;
    const likes = item.metrics?.likes || item.likedBy?.length || 0;
    
    card.innerHTML = `
      <div class="portfolio-card-image">
        <img src="${imageUrl}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27400%27 height=%27300%27%3E%3Crect width=%27400%27 height=%27300%27 fill=%27%23965aff%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 font-family=%27Arial, sans-serif%27 font-size=%2724%27 fill=%27%23ffffff%27%3E${encodeURIComponent((item.title || 'Item').substring(0, 30))}%3C/text%3E%3C/svg%3E'">
        <div class="portfolio-card-overlay">
          <button class="btn-view-details" onclick="event.stopPropagation(); openItemDetail('${item._id}')">
            👁️ View Details & Comments
          </button>
        </div>
        <div class="portfolio-card-type-badge">${itemIcon}</div>
      </div>
      <div class="portfolio-card-content">
        <div class="portfolio-card-header">
          <h3 class="portfolio-card-title">${escapeHtml(item.title)}</h3>
        </div>
        ${orgInfo}
        ${dateInfo}
        <p class="portfolio-card-description">${escapeHtml((item.shortDescription || item.description || '').substring(0, 100))}${(item.description || '').length > 100 ? '...' : ''}</p>
        <div class="portfolio-card-metrics">
          <span class="metric-item">👁️ ${formatNumber(views)}</span>
          <span class="metric-item">❤️ ${formatNumber(likes)}</span>
        </div>
        <div class="portfolio-card-actions">
          <button class="btn-view-details-inline" onclick="event.stopPropagation(); openItemDetail('${item._id}')">
            💬 View & Comment
          </button>
        </div>
      </div>
    `;
    
    // Add click handler to entire card
    card.addEventListener('click', () => {
      openItemDetail(item._id);
    });
    
    return card;
  }
  
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Filter by type
  function filterByType(type) {
    state.currentTypeFilter = type;
    
    // Update active tab
    document.querySelectorAll('.type-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.type === type);
    });
    
    applyFilters();
    renderPortfolio();
  }
  
  // Apply all filters
  function applyFilters() {
    let filtered = [...state.portfolioItems];
    
    // Filter by type
    if (state.currentTypeFilter !== 'all') {
      filtered = filtered.filter(item => (item.itemType || 'project') === state.currentTypeFilter);
    }
    
    // Filter by category
    if (state.filters.category) {
      filtered = filtered.filter(item => item.category === state.filters.category);
    }
    
    // Filter by search
    if (state.filters.search) {
      const searchLower = state.filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchLower) ||
        (item.description || '').toLowerCase().includes(searchLower) ||
        (item.shortDescription || '').toLowerCase().includes(searchLower) ||
        (item.tags || []).some(tag => tag.toLowerCase().includes(searchLower)) ||
        (item.technologies || []).some(tech => (tech.name || tech).toLowerCase().includes(searchLower))
      );
    }
    
    // Sort
    const sort = state.filters.sort;
    if (sort === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sort === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    } else if (sort === 'views') {
      filtered.sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0));
    } else if (sort === 'likes') {
      filtered.sort((a, b) => (b.metrics?.likes || b.likedBy?.length || 0) - (a.metrics?.likes || a.likedBy?.length || 0));
    } else if (sort === 'az') {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sort === 'za') {
      filtered.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    }
    
    state.filteredItems = filtered;
  }
  
  // Update stats (total works, views, likes, categories)
  function updateStats() {
    const items = state.portfolioItems || [];
    
    // Calculate totals
    const totalWorks = items.length;
    const totalViews = items.reduce((sum, item) => sum + (item.metrics?.views || 0), 0);
    const totalLikes = items.reduce((sum, item) => sum + (item.metrics?.likes || item.likedBy?.length || 0), 0);
    const categories = new Set(items.map(item => item.category).filter(Boolean));
    const totalCategories = categories.size;
    
    // Update DOM elements directly by ID
    const totalWorksEl = $('#totalWorks');
    const totalViewsEl = $('#totalViews');
    const totalLikesEl = $('#totalLikes');
    const totalCategoriesEl = $('#totalCategories');
    
    if (totalWorksEl) {
      totalWorksEl.textContent = formatNumber(totalWorks);
    }
    
    if (totalViewsEl) {
      totalViewsEl.textContent = formatNumber(totalViews);
    }
    
    if (totalLikesEl) {
      totalLikesEl.textContent = formatNumber(totalLikes);
    }
    
    if (totalCategoriesEl) {
      totalCategoriesEl.textContent = formatNumber(totalCategories);
    }
  }
  
  // Update type counts
  function updateTypeCounts() {
    const counts = {
      all: state.portfolioItems.length,
      project: state.portfolioItems.filter(item => !item.itemType || item.itemType === 'project').length,
      certification: state.portfolioItems.filter(item => item.itemType === 'certification').length,
      achievement: state.portfolioItems.filter(item => item.itemType === 'achievement').length
    };
    
    const countAll = $('#countAll');
    const countProjects = $('#countProjects');
    const countCertifications = $('#countCertifications');
    const countAchievements = $('#countAchievements');
    
    if (countAll) countAll.textContent = counts.all;
    if (countProjects) countProjects.textContent = counts.project;
    if (countCertifications) countCertifications.textContent = counts.certification;
    if (countAchievements) countAchievements.textContent = counts.achievement;
  }
  
  // Make functions globally available
  window.filterByType = filterByType;
  window.fetchPortfolioItems = fetchPortfolioItems;
  window.updateStats = updateStats;
  window.updateTypeCounts = updateTypeCounts;
  
  async function likePortfolio(id) {
    const user = authUser();
    if (!user) {
      toast('Please sign in to like projects', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/portfolio/${id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        const item = state.portfolioItems.find(i => i._id === id);
        if (item) {
          item.liked = data.liked;
          item.likes = data.likes;
        }
        renderPortfolio();
        updateStats();
      }
    } catch (error) {
      console.error('Error liking portfolio:', error);
      toast('Failed to like project', 'error');
    }
  }

  function toggleModal(open) {
    const modal = $('#projectModal');
    if (!modal) return;
    modal.classList.toggle('hidden', !open);
    if (open) {
      $('#projectModalTitle').textContent = state.editingId ? 'Edit Project' : 'Add Project';
      $('#formMsg').className = 'form-message';
      $('#formMsg').textContent = '';
    }
  }

  function resetForm() {
    $('#projectForm').reset();
    state.images.forEach(it => URL.revokeObjectURL(it.url));
    state.images = [];
    renderPreviews();
    state.editingId = null;
  }

  function renderPreviews() {
    const grid = $('#previewGrid');
    if (!grid) return;
    grid.innerHTML = '';
    state.images.forEach((it, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'preview-item';
      const img = document.createElement('img');
      img.src = it.url;
      const rm = document.createElement('button');
      rm.type = 'button'; rm.className = 'remove'; rm.textContent = '×';
      rm.addEventListener('click', ()=>{ state.images.splice(idx,1); URL.revokeObjectURL(it.url); renderPreviews(); });
      wrap.append(img, rm);
      grid.appendChild(wrap);
    });
  }

  function handleDropFiles(files) {
    const list = Array.from(files || []);
    list.slice(0, 12).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      state.images.push({ file, url });
    });
    renderPreviews();
  }

  function buildPayloadFromForm() {
    const f = $('#projectForm');
    const title = f.title.value.trim();
    const description = f.description.value.trim();
    const category = f.category.value;
    const live = f.live.value.trim();
    const tags = f.tags.value.split(',').map(s=>s.trim()).filter(Boolean);
    const techs = f.technologies.value.split(',').map(s=>s.trim()).filter(Boolean).map(n=>({ name:n }));
    const visibility = (new FormData(f).get('visibility')) || 'public';

    const body = {
      title,
      description,
      category,
      links: live ? { live } : undefined,
      tags,
      technologies: techs,
      visibility,
      // minimal timeline to satisfy backend schema
      timeline: { startDate: new Date().toISOString() }
    };
    return body;
  }

  async function submitProject(evt) {
    evt.preventDefault();
    const user = authUser();
    if (!user) {
      toast('Please sign in to add a project.', 'error');
      const msg = $('#formMsg'); msg.className = 'form-message error'; msg.textContent = 'Authentication required.'; 
      return;
    }

  // Note: Backend expects JSON by default; file uploads would require an upload endpoint.
  const body = buildPayloadFromForm();

    try {
      const token = (user && (user.token || localStorage.getItem('cds_token'))) || null;
      const isEdit = !!state.editingId;
      const endpoint = isEdit ? `${API_BASE_URL}/portfolio/${state.editingId}` : `${API_BASE_URL}/portfolio`;
      const method = isEdit ? 'PUT' : 'POST';
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      console.log('💾 Saving portfolio item:', { method, endpoint, isEdit });

      const res = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Upload failed');

      const successMsg = isEdit ? 'Project updated successfully!' : 'Project uploaded successfully!';
      toast(successMsg,'success');
      const msg = $('#formMsg'); msg.className = 'form-message success'; msg.textContent = successMsg;
      const grid = document.querySelector('.grid-cards');
      if (grid && data?.data?.project) {
        if (isEdit) {
          // Update the first matching tile title/desc (demo purpose)
          const t = grid.querySelector('.tile');
          if (t) {
            t.querySelector('h3') && (t.querySelector('h3').textContent = data.data.project.title);
            const p = data.data.project.shortDescription||data.data.project.description||'';
            t.querySelector('p') && (t.querySelector('p').textContent = p.slice(0,120));
          }
        } else {
          const t = document.createElement('div');
          t.className = 'tile';
          t.innerHTML = `<h3>${data.data.project.title}</h3><p>${(data.data.project.shortDescription||data.data.project.description||'').slice(0,120)}</p>`;
          attachCardActions(t, data.data.project._id);
          grid.prepend(t);
        }
      }
      setTimeout(()=>{ toggleModal(false); resetForm(); }, 900);
    } catch (err) {
      toast(err.message || 'Upload failed','error');
      const msg = $('#formMsg'); msg.className = 'form-message error'; msg.textContent = err.message || 'Upload failed';
    }
  }

  function attachCardActions(tile, id) {
    // Only for signed-in users
    if (!authUser()) return;
    // Add small edit/delete buttons without changing tile design significantly
    const bar = document.createElement('div');
    bar.style.position = 'absolute';
    bar.style.top = '10px';
    bar.style.right = '10px';
    bar.style.display = 'flex';
    bar.style.gap = '6px';
    const edit = document.createElement('button');
    edit.type = 'button'; edit.className = 'icon-btn'; edit.textContent = '✎'; edit.title = 'Edit';
    const del = document.createElement('button');
    del.type = 'button'; del.className = 'icon-btn'; del.textContent = '🗑'; del.title = 'Delete';
    bar.append(edit, del);
    tile.style.position = 'relative';
    tile.appendChild(bar);

    edit.addEventListener('click', (e)=>{
      e.stopPropagation();
      // For demo: open modal with current title/desc if available
      state.editingId = id || null;
      $('#projTitle').value = tile.querySelector('h3')?.textContent || '';
      $('#projDesc').value = tile.querySelector('p')?.textContent || '';
      toggleModal(true);
    });
    del.addEventListener('click', async (e)=>{
      e.stopPropagation();
      const user = authUser();
      if (!user) { toast('Sign in to delete.','error'); return; }
      if (!id) { tile.remove(); return; }
      try {
        const res = await fetch(`${API_BASE_URL}/portfolio/${id}`, { method:'DELETE', headers: {'Authorization': `Bearer ${user.token}`} });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Delete failed');
        toast('Project deleted.','success');
        tile.remove();
      } catch (err) {
        toast(err.message || 'Delete failed','error');
      }
    });
  }

  function wireExistingTiles() {
    $$('.grid-cards .tile').forEach(tile => attachCardActions(tile));
  }

  function init() {
    // Guard: only on portfolio page
    if (!document.body.classList.contains('portfolio-page')) return;

    const btn = $('#addProjectBtn');
    const choose = $('#chooseFiles');
    const drop = $('#dropzone');
    const fileInput = $('#fileInput');

    if (btn) btn.addEventListener('click', ()=>{
      const user = authUser();
      if (!user) { toast('Please sign in to add a project.','error'); return; }
      toggleModal(true);
    });
    $('#closeProjectModal')?.addEventListener('click', ()=>{ toggleModal(false); });
    $('[data-close-modal]')?.addEventListener('click', ()=>{ toggleModal(false); });
    $('#cancelProject')?.addEventListener('click', ()=>{ toggleModal(false); resetForm(); });

    $('#projectForm')?.addEventListener('submit', submitProject);

    choose?.addEventListener('click', ()=> fileInput.click());
    fileInput?.addEventListener('change', (e)=> handleDropFiles(e.target.files));

    ['dragenter','dragover'].forEach(ev=> drop?.addEventListener(ev, (e)=>{
      e.preventDefault(); e.stopPropagation(); drop.classList.add('dragover');
    }));
    ;['dragleave','drop'].forEach(ev=> drop?.addEventListener(ev, (e)=>{
      e.preventDefault(); e.stopPropagation(); drop.classList.remove('dragover');
      if (ev === 'drop') handleDropFiles(e.dataTransfer.files);
    }));

    wireExistingTiles();
    
    // Setup filter handlers
    const categoryFilter = $('#categoryFilter');
    const searchInput = $('#searchInput');
    const sortSelect = $('#sortSelect');
    
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        state.filters.category = e.target.value;
        applyFilters();
        renderPortfolio();
      });
    }
    
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          state.filters.search = e.target.value;
          applyFilters();
          renderPortfolio();
          
          // Update search count
          const countEl = $('#searchCount');
          if (countEl) {
            countEl.textContent = state.filteredItems.length > 0 ? `${state.filteredItems.length} found` : '';
          }
        }, 300);
      });
    }
    
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.filters.sort = e.target.value;
        applyFilters();
        renderPortfolio();
      });
    }
    
    // Load portfolio items on page load
    fetchPortfolioItems();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
