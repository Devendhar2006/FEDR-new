// Projects page: fetch list, render cards with badges, filters/sort/search, details modal, add/edit/delete (auth-gated).
// Version: 2025-11-07-02 (FIXED: My Projects Only filtering + Create Project)
console.log('🚀 Projects.js loaded - Version 2025-11-07-02');

(function(){
  const $ = (s, c=document)=>c.querySelector(s);
  const $$ = (s, c=document)=>Array.from(c.querySelectorAll(s));

  const API = {
    list: async (params={}) => {
      const q = new URLSearchParams(params).toString();
      const userToken = token();
      const headers = {};
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
      }
      const res = await fetch(`/api/portfolio${q?'?'+q:''}`, { headers });
      return res.json();
    },
    create: async (body, token) => fetch('/api/portfolio', { method:'POST', headers: {'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{})}, body: JSON.stringify(body)}).then(r=>r.json().then(d=>({ok:r.ok, ...d}))),
    update: async (id, body, token) => fetch(`/api/portfolio/${id}`, { method:'PUT', headers: {'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{})}, body: JSON.stringify(body)}).then(r=>r.json().then(d=>({ok:r.ok, ...d}))),
    remove: async (id, token) => fetch(`/api/portfolio/${id}`, { method:'DELETE', headers: {...(token?{Authorization:`Bearer ${token}`}:{})} }).then(r=>r.json().then(d=>({ok:r.ok, ...d})))
  };

  const state = {
    items: [],
    filters: { category:'', status:'', sort:'-createdAt', search:'', showMyItems: false },
    images: [], // for previews
    editingId: null
  };

  function authUser(){ try { return JSON.parse(localStorage.getItem('cds_user')||'null'); } catch { return null; } }
  function token(){ const u=authUser(); return (u && (u.token||localStorage.getItem('cds_token'))) || null; }

  function toast(msg){ let t=$('.toast'); if(!t){t=document.createElement('div'); t.className='toast'; document.body.appendChild(t);} t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2000); }

  function statusBadge(status){
    const s = (status||'completed');
    const map = { 'completed':'status-active', 'in-progress':'status-onhold', 'on-hold':'status-onhold', 'archived':'status-archived', 'planning':'status-onhold' };
    const cls = map[s] || 'status-active';
    return `<span class="badge ${cls}">${s}</span>`;
  }

  function techChips(techs){
    if (!Array.isArray(techs) || !techs.length) return '';
    return `<div class="chip-row">${techs.slice(0,6).map(t=>`<span class="chip">${t.name||t}</span>`).join('')}</div>`;
  }

  function tagChips(tags){
    if (!Array.isArray(tags) || !tags.length) return '';
    return `<div class="chip-row">${tags.slice(0,6).map(t=>`<span class="chip">#${t}</span>`).join('')}</div>`;
  }

  function linkButtons(links){
    if (!links) return '';
    const out=[];
    if (links.live) out.push(`<a class="btn-ghost" href="${links.live}" target="_blank" rel="noopener">Live</a>`);
    if (links.github) out.push(`<a class="btn-ghost" href="${links.github}" target="_blank" rel="noopener">GitHub</a>`);
    if (links.demo) out.push(`<a class="btn-ghost" href="${links.demo}" target="_blank" rel="noopener">Demo</a>`);
    if (links.documentation) out.push(`<a class="btn-ghost" href="${links.documentation}" target="_blank" rel="noopener">Docs</a>`);
    return out.length?`<div class="links">${out.join(' ')}</div>`:'';
  }

  function contributorList(collabs){
    if (!Array.isArray(collabs) || !collabs.length) return '';
    return `<div class="chip-row">${collabs.slice(0,5).map(c=>`<span class="chip">${c.name} • ${c.role}</span>`).join('')}</div>`;
  }

  function updateStats(items) {
    const total = items.length;
    const active = items.filter(i => i.status === 'active' || !i.status).length;
    const techs = new Set(items.flatMap(i => i.technologies || []).map(t => t.name || t));
    const contributors = new Set(items.flatMap(i => i.teamMembers || []).map(m => m.userId));
    
    const totalEl = $('#totalProjects');
    const activeEl = $('#activeProjects');
    const contribEl = $('#totalContributors');
    const techEl = $('#totalTechnologies');
    
    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (contribEl) contribEl.textContent = contributors.size || 0;
    if (techEl) techEl.textContent = techs.size || 0;
  }
  
  function renderGrid(items){
    const grid = $('#projectsGallery');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // Show/hide empty state
    const emptyState = $('#emptyState');
    if (emptyState) {
      emptyState.classList.toggle('hidden', items.length > 0);
    }
    
    if (!items.length) return;
    const signedIn = !!authUser();
    
    // Show all items - don't filter by itemType on projects page
    // (The portfolio page can filter if it wants, but projects page shows everything)
    const projects = items;
    console.log('📋 Rendering', projects.length, 'projects');
    
    projects.forEach((p, index)=>{
      const el = document.createElement('div');
      el.className = `project-card portfolio-card status-${p.status || 'active'}`;
      el.setAttribute('role','listitem');
      el.tabIndex = 0;
      
      // Add animation
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = `all 0.4s ease ${index * 0.05}s`;
      
      const statusIcon = {
        'active': '🟢',
        'completed': '🔵',
        'archived': '⚪',
        'onhold': '🟡',
        'planning': '🟣'
      }[p.status || 'active'] || '🟢';
      
      // Get image URL and ensure it's valid
      let imageUrl = p.images?.[0]?.url || p.thumbnail || p.image;
      // If imageUrl is invalid or doesn't start with http, use SVG placeholder
      if (!imageUrl || !imageUrl.startsWith('http')) {
        const title = (p.title || 'Project').substring(0, 30);
        imageUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect width='400' height='225' fill='%231a2238'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='24' fill='%23965aff'%3E${encodeURIComponent(title)}%3C/text%3E%3C/svg%3E`;
      }
      const views = p.metrics?.views || p.views || 0;
      const likes = p.metrics?.likes || p.likedBy?.length || p.stars || 0;
      
      el.innerHTML = `
        <div class="card-image-wrapper">
          <img class="card-image" src="${imageUrl}" alt="${p.title}" loading="lazy">
          <div class="image-overlay">
            <button class="overlay-btn view-details-btn" data-id="${p._id}">👁️ View Details</button>
            ${p.links?.demo || p.links?.live ? `<a class="overlay-btn overlay-link" href="${p.links?.demo || p.links?.live}" target="_blank" rel="noopener">🌐 Live Demo</a>` : ''}
            ${p.links?.github ? `<a class="overlay-btn overlay-link" href="${p.links.github}" target="_blank" rel="noopener">🔗 GitHub</a>` : ''}
          </div>
          <div class="status-badge ${p.status || 'active'}">
            ${p.status === 'active' ? '<span class="status-pulse"></span>' : ''}
            ${statusIcon} ${(p.status || 'active').toUpperCase()}
          </div>
        </div>
        <div class="card-content">
          <h3 class="card-title">${p.title}</h3>
          <p class="card-description">${(p.shortDescription || p.description || '').slice(0,120)}</p>
          <div class="tech-badges">
            ${(p.technologies || []).slice(0, 6).map(t => `<span class="tech-badge">${typeof t === 'string' ? t : t.name}</span>`).join('')}
            ${(p.technologies || []).length > 6 ? `<span class="tech-badge more">+${(p.technologies || []).length - 6} more</span>` : ''}
          </div>
          ${(p.teamMembers && p.teamMembers.length > 0) ? `
            <div class="team-avatars">
              ${p.teamMembers.slice(0, 3).map(member => `
                <div class="team-avatar" title="${member.name} - ${member.role}" data-name="${member.name}">
                  ${(member.name || 'U')[0].toUpperCase()}
                </div>
              `).join('')}
              ${p.teamMembers.length > 3 ? `<div class="team-avatar team-more">+${p.teamMembers.length - 3}</div>` : ''}
            </div>
          ` : ''}
          <div class="card-stats">
            <div class="stat-item" title="Views"><span class="stat-icon">👁️</span> ${views}</div>
            <div class="stat-item" title="Stars"><span class="stat-icon">⭐</span> ${likes}</div>
            ${p.forks ? `<div class="stat-item" title="Forks"><span class="stat-icon">🔱</span> ${p.forks}</div>` : ''}
            <div class="stat-item" title="Comments"><span class="stat-icon">💬</span> ${(p.comments || []).length}</div>
          </div>
          <div class="card-actions">
            <button class="btn-primary view-btn" data-id="${p._id}">View & Comment</button>
          </div>
        </div>
      `;
      
      // Animate in
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 50 + index * 50);
      
      // Click card to open details
      el.addEventListener('click', (e) => {
        // Don't trigger if clicking on a button or link
        if (e.target.closest('button') || e.target.closest('a')) return;
        
        if (typeof openItemDetail === 'function') {
          openItemDetail(p._id);
        } else {
          openDetails(p);
        }
      });
      
      // View button click
      const viewBtn = el.querySelector('.view-btn');
      if (viewBtn) {
        viewBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openDetails(p);
        });
      }
      
      // View details button in overlay
      const viewDetailsBtn = el.querySelector('.view-details-btn');
      if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openDetails(p);
        });
      }
      
      // Handle overlay links (stop propagation)
      const overlayLinks = el.querySelectorAll('.overlay-link');
      overlayLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      });
      
      // Handle image error
      const img = el.querySelector('.card-image');
      if (img) {
        img.addEventListener('error', function() {
          const title = (p.title || 'Project').substring(0, 30);
          this.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect width='400' height='225' fill='%231a2238'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='24' fill='%23965aff'%3E${encodeURIComponent(title)}%3C/text%3E%3C/svg%3E`;
        });
      }
      
      // Add edit/delete for signed in users
      if (signedIn) { attachActions(el, p); }
      
      grid.appendChild(el);
    });
    
    // Update stats
    updateStats(projects);
  }

  function attachActions(tile, p){
    const bar = document.createElement('div');
    bar.style.position='absolute'; bar.style.top='10px'; bar.style.right='10px'; bar.style.display='flex'; bar.style.gap='6px';
    const edit = document.createElement('button'); edit.type='button'; edit.className='icon-btn'; edit.textContent='✎'; edit.title='Edit';
    const del = document.createElement('button'); del.type='button'; del.className='icon-btn'; del.textContent='🗑'; del.title='Delete';
    bar.append(edit, del); tile.style.position='relative'; tile.appendChild(bar);
    edit.addEventListener('click', (e)=>{ e.stopPropagation(); startEdit(p); });
    del.addEventListener('click', async (e)=>{ e.stopPropagation(); const r=await API.remove(p._id, token()); if(!r.ok){ toast(r.message||'Delete failed'); } else { tile.remove(); toast('Deleted'); } });
  }

  function openDetails(p){
    const modal = $('#detailModal');
    if (!modal) return;
    
    $('#detailTitle').textContent = p.title;
    
    const statusIcon = {
      'active': '🟢',
      'completed': '🔵',
      'archived': '⚪',
      'onhold': '🟡',
      'planning': '🟣'
    }[p.status || 'active'] || '🟢';
    
    $('#detailContent').innerHTML = `
      <div class="status-badge ${p.status || 'active'}" style="position:relative;top:0;right:0;margin-bottom:1rem;display:inline-flex;">
        ${statusIcon} ${(p.status || 'active').toUpperCase()}
      </div>
      
      <img class="detail-image" src="${(p.image && p.image.startsWith('http')) ? p.image : `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450'%3E%3Crect width='800' height='450' fill='%231a2238'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='32' fill='%23965aff'%3E${encodeURIComponent((p.title || 'Project').substring(0, 30))}%3C/text%3E%3C/svg%3E`}" alt="${p.title}">
      
      <h2 class="detail-title">${p.title}</h2>
      <p class="detail-description">${p.description || ''}</p>
      
      <div class="detail-stats">
        <div class="detail-stat">
          <span class="detail-stat-value">${p.views || 0}</span>
          <span class="detail-stat-label">Views</span>
        </div>
        <div class="detail-stat">
          <span class="detail-stat-value">${p.stars || 0}</span>
          <span class="detail-stat-label">Stars</span>
        </div>
        <div class="detail-stat">
          <span class="detail-stat-value">${p.forks || 0}</span>
          <span class="detail-stat-label">Forks</span>
        </div>
        <div class="detail-stat">
          <span class="detail-stat-value">${(p.teamMembers || []).length}</span>
          <span class="detail-stat-label">Contributors</span>
        </div>
      </div>
      
      ${(p.technologies && p.technologies.length) ? `
        <div class="detail-tech">
          <h3>Technology Stack</h3>
          <div class="tech-badges">
            ${p.technologies.map(t => `<span class="tech-badge">${t.name || t}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      
      ${(p.teamMembers && p.teamMembers.length) ? `
        <div class="detail-tech">
          <h3>Team Members</h3>
          <div class="team-members">
            ${p.teamMembers.map(m => `<span class="team-avatar" data-name="${m.name || 'User'}">${(m.name || 'U')[0]}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      
      <div class="detail-links">
        ${p.links?.demo ? `<a class="detail-link" href="${p.links.demo}" target="_blank" rel="noopener">🔗 Live Demo</a>` : ''}
        ${p.links?.github ? `<a class="detail-link" href="${p.links.github}" target="_blank" rel="noopener">📂 GitHub</a>` : ''}
        ${p.links?.docs || p.links?.documentation ? `<a class="detail-link" href="${p.links.docs || p.links.documentation}" target="_blank" rel="noopener">📋 Documentation</a>` : ''}
      </div>
      
      <!-- Comments Section -->
      <div class="comments-section">
        <h3 class="comments-title">💬 Comments (${(p.comments || []).length})</h3>
        
        <div class="comments-list" id="commentsList">
          ${(p.comments || []).length > 0 ? (p.comments || []).map(comment => {
            const timestamp = comment.createdAt || comment.date || Date.now();
            const timeAgo = formatTimeAgo(new Date(timestamp).getTime());
            const author = comment.user?.username || comment.author || 'Anonymous';
            const avatar = comment.user?.profile?.avatar || '';
            const avatarDisplay = avatar 
              ? `<img src="${avatar}" alt="${author}" class="comment-avatar-img">` 
              : `<div class="comment-avatar">${author[0].toUpperCase()}</div>`;
            const commentContent = comment.content || comment.text || '';
            
            return `
              <div class="comment">
                <div class="comment-header">
                  ${avatarDisplay}
                  <div class="comment-meta">
                    <strong class="comment-author">${author}</strong>
                    <span class="comment-date">${timeAgo}</span>
                  </div>
                </div>
                <div class="comment-text">${commentContent}</div>
              </div>
            `;
          }).join('') : '<p class="no-comments">No comments yet. Be the first to comment!</p>'}
        </div>
        
        <div class="comment-form">
          <h4>Add a Comment</h4>
          <textarea id="commentInput" class="comment-input" placeholder="Share your thoughts..." rows="3" maxlength="500"></textarea>
          <div class="comment-form-actions">
            <span class="char-counter"><span id="commentCharCount">0</span>/500</span>
            <button class="btn-gradient" id="submitComment" data-project-id="${p._id}">Post Comment</button>
          </div>
        </div>
      </div>
    `;
    
    modal.classList.remove('hidden');
    
    // Attach comment submission handler
    const commentInput = $('#commentInput');
    const submitBtn = $('#submitComment');
    const charCount = $('#commentCharCount');
    
    if (commentInput && charCount) {
      commentInput.addEventListener('input', () => {
        charCount.textContent = commentInput.value.length;
      });
    }
    
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const user = authUser();
        if (!user) {
          toast('⚠️ Please sign in to comment.');
          setTimeout(() => window.location.href = 'login.html', 1500);
          return;
        }
        
        const text = commentInput.value.trim();
        if (!text) {
          toast('❌ Comment cannot be empty.');
          return;
        }
        
        // Disable button while submitting
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';
        
        try {
          // Save comment to backend
          const userToken = token();
          const response = await fetch(`/api/portfolio/${p._id}/comment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({ content: text })
          });
          
          const result = await response.json();
          
          if (!response.ok || !result.success) {
            throw new Error(result.message || 'Failed to add comment');
          }
          
          toast('✅ Comment added successfully!');
          commentInput.value = '';
          charCount.textContent = '0';
          
          // Reload the project data to get updated comments
          await load();
          
          // Get the updated project data
          const updatedProject = state.items.find(item => item._id === p._id);
          if (updatedProject) {
            openDetails(updatedProject);
          } else {
            modal.classList.add('hidden');
          }
          
        } catch (error) {
          console.error('Comment error:', error);
          toast('❌ ' + error.message);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Post Comment';
        }
      });
    }
  }
  
  function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 7) {
      return new Date(timestamp).toLocaleDateString();
    } else if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  function toggleModal(sel, open){ 
    console.log(`🎭 toggleModal called: ${sel}, open=${open}`);
    const m=$(sel); 
    if(!m) {
      console.error(`❌ Modal not found: ${sel}`);
      return;
    }
    console.log(`✅ Modal found, toggling visibility`);
    m.classList.toggle('hidden', !open);
    // Lock body scroll when modal is open
    if (open) {
      document.body.classList.add('modal-open');
      console.log('🔒 Body scroll locked');
    } else {
      document.body.classList.remove('modal-open');
      console.log('🔓 Body scroll unlocked');
    }
  }
  
  function closeModal(modalId) {
    const modal = $(modalId);
    if (modal) {
      modal.classList.add('hidden');
      document.body.classList.remove('modal-open');
    }
  }

  // Upload/Edit modal wiring (reusing structure similar to portfolio page)
  const upState = { images: [], editingId: null };
  function resetUpload(){ $('#projectForm').reset(); upState.images.forEach(i=>URL.revokeObjectURL(i.url)); upState.images=[]; $('#previewGrid').innerHTML=''; upState.editingId=null; }
  function startEdit(p){ upState.editingId=p._id; $('#projTitle').value=p.title||''; $('#projDesc').value=p.description||''; $('#projCategory').value=p.category||''; $('#projLive').value=p.links?.live||''; $('#projTags').value=(p.tags||[]).join(', '); $('#projTech').value=(p.technologies||[]).map(t=>t.name||t).join(', '); const v=p.visibility||'public'; $$('input[name="visibility"]').forEach(r=>r.checked=(r.value===v)); toggleModal('#projectModal', true); }

  function buildBody(){
    const f=$('#projectForm');
    const title = f.title.value.trim();
    const thumbnailTitle = (title || 'Project').substring(0, 30);
    const b={
      itemType: 'project', // Ensure itemType is set for projects page
      title: title,
      description:f.description.value.trim(),
      category:f.category.value,
      thumbnail: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23965aff'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='24' fill='%23ffffff'%3E${encodeURIComponent(thumbnailTitle)}%3C/text%3E%3C/svg%3E`, // SVG placeholder
      links:f.live.value?{live:f.live.value.trim()}:undefined,
      tags:f.tags.value.split(',').map(s=>s.trim()).filter(Boolean),
      technologies:f.technologies.value.split(',').map(s=>s.trim()).filter(Boolean).map(n=>({name:n})),
      visibility:(new FormData(f).get('visibility'))||'public',
      timeline:{ startDate: new Date().toISOString() }
    };
    return b;
  }

  async function submitUpload(e){
    e.preventDefault();
    const b=buildBody();
    const t=token();
    const isEdit=!!upState.editingId;
    const r = isEdit ? await API.update(upState.editingId, b, t) : await API.create(b, t);
    if (!r.ok){ toast(r.message||'Save failed'); return; }
    toast(isEdit?'✅ Updated! Reloading...':'✅ Created! Reloading...');
    toggleModal('#projectModal', false); resetUpload();
    // Reload page to show new/updated project
    setTimeout(() => {
      window.location.reload();
    }, 800);
  }

  async function load(){
    console.log('🚀 Loading projects...');
    
    // Check if user is logged in - show items only to authenticated users
    const user = authUser();
    const userToken = token();
    
    if (!user) {
      console.log('⛔ User not logged in - showing login prompt');
      const spinner = $('#loadingSpinner');
      const emptyState = $('#emptyState');
      if (spinner) spinner.classList.add('hidden');
      if (emptyState) {
        emptyState.classList.remove('hidden');
        emptyState.innerHTML = `
          <div class="empty-state-content">
            <div class="cosmic-planet"></div>
            <h2>🔒 Login Required</h2>
            <p>Please <a href="login.html" style="color: #2bc4fa; text-decoration: underline;">sign in</a> to view projects and certificates.</p>
            <p style="margin-top: 20px;">New user? <a href="register.html" style="color: #fde68a; text-decoration: underline;">Create an account</a></p>
          </div>
        `;
      }
      return;
    }
    
    // Build params from filters
    const params = { sort: state.filters.sort };
    
    console.log('🔍 Debug Info:');
    console.log('  - User:', user ? (user.username || user.email) : 'Not logged in');
    console.log('  - Token exists:', !!userToken);
    console.log('  - showMyItems state:', state.filters.showMyItems);
    
    if (user && state.filters.showMyItems) {
      params.myItems = 'true';
      console.log('✅ FILTERING: Showing only MY projects for user:', user.username || user.email);
    } else {
      console.log('📋 SHOWING: All projects (public view)');
    }
    
    if (state.filters.category) params.category = state.filters.category;
    if (state.filters.status) params.status = state.filters.status;
    if (state.filters.search) params.search = state.filters.search;
    
    // Show loading
    const spinner = $('#loadingSpinner');
    const emptyState = $('#emptyState');
    if (spinner) spinner.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    
    // Try to load from localStorage first
    let storedProjects = [];
    try {
      const stored = localStorage.getItem('cds_projects_temp');
      if (stored) {
        storedProjects = JSON.parse(stored);
        console.log('📦 Found stored projects:', storedProjects.length);
      }
    } catch (e) {
      console.log('No stored projects found');
    }
    
    // If we have stored projects, use them
    if (storedProjects.length > 0) {
      console.log('✅ Using stored projects');
      state.items = storedProjects;
      updateStats(storedProjects);
      renderGrid(storedProjects);
      if (spinner) spinner.classList.add('hidden');
      return;
    }
    
    try {
      console.log('🌐 Trying to load from API...');
      const resp = await API.list(params);
      // API returns data.items not data.projects
      const items = resp?.data?.items || resp?.data?.projects || resp?.data || resp?.items || [];
      console.log('📊 Loaded items from API:', items.length, 'items');
      console.log('📦 Items:', items);
      
      if (items.length > 0) {
        console.log('✅ Displaying all', items.length, 'items on projects page');
        state.items = items;
        updateStats(items);
        renderGrid(items);
      } else {
        throw new Error('No items from API, loading samples');
      }
    } catch (error) {
      console.error('❌ API failed, loading sample projects:', error);
      // Offline/demo fallback: show sample projects
      const samples = [
        { 
          _id: 'sample1',
          title:'Galactic Web App', 
          status:'active', 
          shortDescription:'Real-time satellite tracker with live orbital data visualization.', 
          description: 'A comprehensive satellite tracking application that displays real-time orbital positions and trajectories of satellites around Earth. Features include 3D visualization, satellite search, and pass predictions.',
          technologies:[{name:'JavaScript'},{name:'WebSocket'},{name:'Three.js'},{name:'Node.js'}], 
          tags:['space','realtime','3d','visualization'], 
          views: 1250, 
          stars: 45,
          forks: 12,
          teamMembers: [
            { name: 'Alex Rivera', role: 'Lead Developer' },
            { name: 'Sarah Chen', role: 'UI/UX Designer' }
          ],
          difficulty: 'Advanced',
          image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=450&fit=crop',
          links: { demo: 'https://galactic-demo.example.com', github: 'https://github.com/cosmicdev/galactic-app', docs: 'https://docs.galactic-app.com' },
          category: 'webapp',
          comments: [
            { author: 'John Doe', text: 'Amazing work! The 3D visualization is stunning.', date: Date.now() - 5 * 24 * 60 * 60 * 1000 },
            { author: 'Jane Smith', text: 'Really useful for tracking ISS passes!', date: Date.now() - 3 * 24 * 60 * 60 * 1000 }
          ],
          featured: true,
          createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
        },
        { 
          _id: 'sample2',
          title:'AI Nebula Classifier', 
          status:'completed', 
          shortDescription:'Machine learning constellation classifier using neural networks.', 
          description: 'An AI-powered application that identifies constellations from images using TensorFlow.js. Trained on thousands of night sky images for accurate pattern recognition and stellar object classification.',
          technologies:[{name:'Python'},{name:'TensorFlow'},{name:'React'},{name:'FastAPI'},{name:'Docker'}], 
          tags:['ai','ml','astronomy','classification'], 
          views: 890, 
          stars: 67,
          forks: 23,
          teamMembers: [
            { name: 'Dr. Emily Watson', role: 'ML Engineer' },
            { name: 'Mike Johnson', role: 'Data Scientist' }
          ],
          difficulty: 'Advanced',
          image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&h=450&fit=crop',
          links: { demo: 'https://ai-nebula.example.com', github: 'https://github.com/cosmicdev/ai-nebula', docs: 'https://ai-nebula-docs.com' },
          category: 'datascience',
          comments: [
            { author: 'Astro Fan', text: 'Incredible accuracy! Recognized all major constellations.', date: Date.now() - 7 * 24 * 60 * 60 * 1000 },
            { author: 'Dev User', text: 'Great documentation, easy to integrate.', date: Date.now() - 4 * 24 * 60 * 60 * 1000 }
          ],
          featured: true,
          createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
        },
        { 
          _id: 'sample3',
          title:'Hyperdrive UI Kit', 
          status:'planning', 
          shortDescription:'Modern UI component library with advanced animations and effects.', 
          description: 'A collection of beautiful, performant UI components with cosmic-themed animations. Built with CSS Grid, Flexbox, and modern animation techniques for smooth, engaging user experiences. Includes 50+ components.',
          technologies:[{name:'CSS3'},{name:'Sass'},{name:'TypeScript'},{name:'Storybook'},{name:'Vite'}], 
          tags:['ui','design','components','library'], 
          views: 542, 
          stars: 28,
          forks: 8,
          teamMembers: [
            { name: 'Chris Taylor', role: 'Design Lead' }
          ],
          difficulty: 'Intermediate',
          image: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&h=450&fit=crop',
          links: { github: 'https://github.com/cosmicdev/hyperdrive-ui', docs: 'https://hyperdrive-ui.com' },
          category: 'webapp',
          comments: [],
          featured: false,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        { 
          _id: 'sample4',
          title:'Cosmic Chat Platform', 
          status:'active', 
          shortDescription:'Real-time collaborative chat platform with end-to-end encryption.', 
          description: 'A secure messaging platform featuring real-time communication, file sharing, group chats, and voice calls. Built with modern web technologies for speed, security, and reliability. Supports 10,000+ concurrent users.',
          technologies:[{name:'Node.js'},{name:'Socket.io'},{name:'React'},{name:'MongoDB'},{name:'Redis'},{name:'WebRTC'}], 
          tags:['realtime','chat','security','websocket'], 
          views: 1580, 
          stars: 92,
          forks: 34,
          teamMembers: [
            { name: 'Rob Martinez', role: 'Backend Lead' },
            { name: 'Amy Lee', role: 'Frontend Developer' }
          ],
          difficulty: 'Advanced',
          image: 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=800&h=450&fit=crop',
          links: { demo: 'https://cosmic-chat.example.com', github: 'https://github.com/cosmicdev/cosmic-chat', docs: 'https://docs.cosmic-chat.com' },
          category: 'webapp',
          comments: [
            { author: 'Tech Reviewer', text: 'Best real-time chat I\'ve seen. Super fast!', date: Date.now() - 2 * 24 * 60 * 60 * 1000 }
          ],
          featured: true,
          createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        },
        { 
          _id: 'sample5',
          title:'StarForge Game Engine', 
          status:'completed', 
          shortDescription:'2D game engine with physics simulation and particle effects.', 
          description: 'A lightweight 2D game engine built from scratch with custom physics, collision detection, and particle systems. Perfect for creating arcade-style space games with smooth 60 FPS performance.',
          technologies:[{name:'JavaScript'},{name:'Canvas API'},{name:'WebGL'},{name:'Matter.js'}], 
          tags:['game','engine','graphics','physics'], 
          views: 2100, 
          stars: 156,
          forks: 48,
          teamMembers: [
            { name: 'Kevin Zhang', role: 'Engine Developer' },
            { name: 'Nina Patel', role: 'Graphics Programmer' }
          ],
          difficulty: 'Advanced',
          image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&h=450&fit=crop',
          links: { demo: 'https://starforge-demo.example.com', github: 'https://github.com/cosmicdev/starforge-engine', docs: 'https://starforge-docs.com' },
          category: 'game',
          comments: [
            { author: 'Game Dev', text: 'Excellent performance! Used it for my game jam project.', date: Date.now() - 10 * 24 * 60 * 60 * 1000 },
            { author: 'Indie Dev', text: 'Love the particle system!', date: Date.now() - 6 * 24 * 60 * 60 * 1000 }
          ],
          featured: true,
          createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString()
        },
        { 
          _id: 'sample6',
          title:'Blockchain Explorer', 
          status:'active', 
          shortDescription:'Real-time blockchain transaction explorer and analytics platform.', 
          description: 'A comprehensive blockchain explorer that provides real-time transaction tracking, wallet analytics, and smart contract interaction tools.',
          technologies:[{name:'Vue.js'},{name:'Web3.js'},{name:'Solidity'},{name:'Node.js'}], 
          tags:['blockchain','crypto','web3','analytics'], 
          views: 1420, 
          stars: 88,
          forks: 31,
          teamMembers: [
            { name: 'Alex Thompson', role: 'Blockchain Developer' }
          ],
          difficulty: 'Advanced',
          image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=450&fit=crop',
          links: { demo: 'https://blockchain-explorer.example.com', github: 'https://github.com/cosmicdev/blockchain-explorer' },
          category: 'blockchain',
          comments: [
            { author: 'Crypto User', text: 'Most intuitive blockchain explorer!', date: Date.now() - 8 * 24 * 60 * 60 * 1000 }
          ],
          featured: true,
          createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      console.log('💾 Saving sample projects to localStorage...');
      localStorage.setItem('cds_projects_temp', JSON.stringify(samples));
      
      state.items = samples;
      updateStats(samples);
      renderGrid(samples);
      toast('📡 Showing 6 sample projects');
      console.log('✅ Sample projects loaded and displayed!');
    } finally {
      // Always hide spinner
      if (spinner) spinner.classList.add('hidden');
    }
  }

  function init(){
    console.log('🎬 Projects init called');
    console.log('📄 Body classes:', document.body.className);
    
    if (!document.body.classList.contains('projects-page')) {
      console.log('⚠️ Not a projects page, skipping init');
      return;
    }
    
    console.log('✅ Projects page detected, initializing...');

    // Show/hide My Projects toggle based on authentication
    const user = authUser();
    const myProjectsToggle = $('#myProjectsToggle');
    const toggleCheckbox = $('#showMyProjectsOnly');
    
    console.log('🔐 User authentication check:', !!user);
    console.log('📌 Initial showMyItems state:', state.filters.showMyItems);
    
    if (user && myProjectsToggle) {
      myProjectsToggle.style.display = 'flex';
      console.log('✅ My Projects Toggle displayed for user:', user.username || user.email);
      
      // Sync checkbox with state
      if (toggleCheckbox) {
        toggleCheckbox.checked = state.filters.showMyItems;
        console.log('✅ Checkbox synced to state:', toggleCheckbox.checked);
      }
    } else {
      // If not logged in, turn off My Projects filter
      state.filters.showMyItems = false;
      console.log('❌ Not logged in - showing all projects');
    }

    // Toolbar - Updated IDs
    $('#categoryFilter')?.addEventListener('change', e=>{ state.filters.category=e.target.value; load(); });
    $('#statusFilter')?.addEventListener('change', e=>{ state.filters.status=e.target.value; load(); });
    $('#sortSelect')?.addEventListener('change', e=>{ state.filters.sort=e.target.value; load(); });
    $('#searchInput')?.addEventListener('input', e=>{ state.filters.search=e.target.value.trim(); load(); });
    
    // My Projects toggle - with enhanced logging
    if (toggleCheckbox) {
      toggleCheckbox.addEventListener('change', e=>{
        state.filters.showMyItems = e.target.checked;
        console.log('🔄 ========== TOGGLE CHANGED ==========');
        console.log('   New state:', e.target.checked);
        console.log('   Will filter by user:', e.target.checked && !!user);
        console.log('=======================================');
        load();
      });
      console.log('✅ Toggle event listener attached');
    } else {
      console.error('❌ Toggle checkbox not found!');
    }
    
    // View toggle
    $$('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.view;
        const gallery = $('#projectsGallery');
        if (gallery) {
          gallery.classList.toggle('list-view', view === 'list');
        }
      });
    });

    // Modals
    const addBtn = $('#addProjectBtn');
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🎯 Create Project button clicked');
        const user = authUser();
        console.log('👤 User:', user);
        if (!user) { 
          toast('⚠️ Please sign in to add a project.'); 
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 1500);
          return; 
        }
        console.log('✅ Opening modal');
        toggleModal('#projectModal', true); 
      });
    } else {
      console.error('❌ addProjectBtn not found');
    }
    
    $('#closeProjectModal')?.addEventListener('click', ()=>closeModal('#projectModal'));
    $('#closeDetailModal')?.addEventListener('click', ()=>closeModal('#detailModal'));
    $('#cancelProject')?.addEventListener('click', ()=>closeModal('#projectModal'));
    $('#createFirstProject')?.addEventListener('click', ()=>{ 
      if(!authUser()){ 
        toast('⚠️ Please sign in to create your first project.'); 
        setTimeout(() => window.location.href = 'login.html', 1500);
        return; 
      } 
      toggleModal('#projectModal', true); 
    });
    $('#projectForm')?.addEventListener('submit', submitUpload);
    
    // Close modal when clicking backdrop
    $$('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          closeModal('#projectModal');
          closeModal('#detailModal');
        }
      });
    });

    // Drag & drop
    const drop=$('#dropzone'); const file=$('#fileInput'); const choose=$('#chooseFiles');
    choose?.addEventListener('click', ()=>file.click());
    file?.addEventListener('change', e=>{ Array.from(e.target.files).forEach(f=>{ const url=URL.createObjectURL(f); upState.images.push({file:f,url}); }); renderPreviews(); });
    ;['dragenter','dragover'].forEach(ev=> drop?.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add('dragover'); }));
    ;['dragleave','drop'].forEach(ev=> drop?.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.remove('dragover'); if(ev==='drop'){ Array.from(e.dataTransfer.files).forEach(f=>{ const url=URL.createObjectURL(f); upState.images.push({file:f,url}); }); renderPreviews(); } }));

    function renderPreviews(){ const grid=$('#previewGrid'); if(!grid) return; grid.innerHTML=''; upState.images.forEach((it,idx)=>{ const wrap=document.createElement('div'); wrap.className='preview-item'; const img=document.createElement('img'); img.src=it.url; const rm=document.createElement('button'); rm.type='button'; rm.className='remove'; rm.textContent='×'; rm.onclick=()=>{ URL.revokeObjectURL(it.url); upState.images.splice(idx,1); renderPreviews(); }; wrap.append(img, rm); grid.appendChild(wrap); }); }

    // Load projects
    console.log('📢 Calling load() to fetch/display projects...');
    load();
    console.log('✅ Projects init complete!');
  }

  document.addEventListener('DOMContentLoaded', init);
  
  // Also try to initialize immediately if DOM is already loaded
  if (document.readyState === 'loading') {
    console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
  } else {
    console.log('✅ DOM already loaded, initializing immediately...');
    init();
  }
})();
