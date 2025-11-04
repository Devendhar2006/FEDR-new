// Projects page: fetch list, render cards with badges, filters/sort/search, details modal, add/edit/delete (auth-gated).
(function(){
  const $ = (s, c=document)=>c.querySelector(s);
  const $$ = (s, c=document)=>Array.from(c.querySelectorAll(s));

  const API = {
    list: async (params={}) => {
      const q = new URLSearchParams(params).toString();
      const res = await fetch(`/api/portfolio${q?'?'+q:''}`);
      return res.json();
    },
    create: async (body, token) => fetch('/api/portfolio', { method:'POST', headers: {'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{})}, body: JSON.stringify(body)}).then(r=>r.json().then(d=>({ok:r.ok, ...d}))),
    update: async (id, body, token) => fetch(`/api/portfolio/${id}`, { method:'PUT', headers: {'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{})}, body: JSON.stringify(body)}).then(r=>r.json().then(d=>({ok:r.ok, ...d}))),
    remove: async (id, token) => fetch(`/api/portfolio/${id}`, { method:'DELETE', headers: {...(token?{Authorization:`Bearer ${token}`}:{})} }).then(r=>r.json().then(d=>({ok:r.ok, ...d})))
  };

  const state = {
    items: [],
    filters: { category:'', status:'', sort:'-createdAt', search:'' },
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
    
    // Filter to only show projects (itemType === 'project' or no itemType)
    const projects = items.filter(p => !p.itemType || p.itemType === 'project');
    
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
      
      const imageUrl = p.images?.[0]?.url || p.thumbnail || p.image || 'https://via.placeholder.com/400x225/1a2238/965aff?text=' + encodeURIComponent(p.title);
      const views = p.metrics?.views || p.views || 0;
      const likes = p.metrics?.likes || p.likedBy?.length || p.stars || 0;
      
      el.innerHTML = `
        <div class="card-image-wrapper">
          <img class="card-image" src="${imageUrl}" alt="${p.title}" onerror="this.src='https://via.placeholder.com/400x225/1a2238/965aff?text=${encodeURIComponent(p.title)}'">
          <div class="image-overlay">
            <button class="overlay-btn" onclick="event.stopPropagation(); if(typeof openItemDetail === 'function') openItemDetail('${p._id}'); else openDetails(p);">👁️ View Details</button>
            ${p.links?.demo || p.links?.live ? `<a class="overlay-btn" href="${p.links?.demo || p.links?.live}" target="_blank" onclick="event.stopPropagation()">🌐 Live Demo</a>` : ''}
            ${p.links?.github ? `<a class="overlay-btn" href="${p.links.github}" target="_blank" onclick="event.stopPropagation()">🔗 GitHub</a>` : ''}
          </div>
          <div class="status-badge ${p.status || 'active'}">${statusIcon} ${(p.status || 'active').toUpperCase()}</div>
        </div>
        <div class="card-content">
          <h3 class="card-title">${p.title}</h3>
          <p class="card-description">${(p.shortDescription || p.description || '').slice(0,120)}</p>
          <div class="tech-badges">
            ${(p.technologies || []).slice(0, 6).map(t => `<span class="tech-badge">${t.name || t}</span>`).join('')}
            ${(p.technologies || []).length > 6 ? `<span class="tech-badge more">+${(p.technologies || []).length - 6} more</span>` : ''}
          </div>
          <div class="card-stats">
            <div class="stat-item"><span>👁️</span> ${views}</div>
            <div class="stat-item"><span>❤️</span> ${likes}</div>
            <div class="stat-item"><span>🚀</span> ${statusIcon} ${p.status || 'Active'}</div>
          </div>
          <div class="card-actions">
            <button class="card-btn btn-view" onclick="event.stopPropagation(); if(typeof openItemDetail === 'function') openItemDetail('${p._id}'); else openDetails(p);">💬 View & Comment</button>
            <button class="card-btn btn-star ${p.starred ? 'starred' : ''}" onclick="event.stopPropagation();">
              ⭐ ${p.starred ? 'Starred' : 'Star'}
            </button>
          </div>
        </div>
      `;
      
      // Animate in
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 50 + index * 50);
      
      // click opens details
      el.addEventListener('click', ()=> {
        if (typeof openItemDetail === 'function') {
          openItemDetail(p._id);
        } else {
          openDetails(p);
        }
      });
      
      // add edit/delete for signed in
      if (signedIn){ attachActions(el, p); }
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
      
      <img class="detail-image" src="${p.image || 'https://via.placeholder.com/800x450/1a2238/965aff?text=Project'}" alt="${p.title}">
      
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
        ${p.links?.demo ? `<a class="detail-link" href="${p.links.demo}" target="_blank">🔗 Live Demo</a>` : ''}
        ${p.links?.github ? `<a class="detail-link" href="${p.links.github}" target="_blank">📂 GitHub</a>` : ''}
        ${p.links?.docs ? `<a class="detail-link" href="${p.links.docs}" target="_blank">📋 Documentation</a>` : ''}
      </div>
    `;
    
    modal.classList.remove('hidden');
  }

  function toggleModal(sel, open){ 
    const m=$(sel); 
    if(!m) return; 
    m.classList.toggle('hidden', !open);
    // Lock body scroll when modal is open
    if (open) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
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
    const b={
      title:f.title.value.trim(),
      description:f.description.value.trim(),
      category:f.category.value,
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
    toast(isEdit?'Updated':'Created');
    toggleModal('#projectModal', false); resetUpload();
    load();
  }

  async function load(){
    // Build params from filters
    const params = { sort: state.filters.sort };
    if (state.filters.category) params.category = state.filters.category;
    if (state.filters.status) params.status = state.filters.status;
    if (state.filters.search) params.search = state.filters.search;
    // Show loading
    const spinner = $('#loadingSpinner');
    if (spinner) spinner.classList.remove('hidden');
    
    try {
      const resp = await API.list(params);
      const items = resp?.data?.projects || [];
      state.items = items;
      updateStats(items);
      renderGrid(items);
    } catch {
      // Offline/demo fallback: show a few sample projects without hitting API
      const samples = [
        { title:'Galactic Web App', status:'active', shortDescription:'Real‑time satellite tracker.', technologies:[{name:'Vanilla JS'},{name:'WebSocket'}], tags:['space','realtime'], views: 450, stars: 12 },
        { title:'AI Nebula', status:'completed', shortDescription:'Constellation classifier demo.', technologies:[{name:'TensorFlow.js'}], tags:['ai','ml'], views: 320, stars: 8 },
        { title:'Hyperdrive UI', status:'planning', shortDescription:'Component set with motion.', technologies:[{name:'CSS'},{name:'Animations'}], tags:['ui','design'], views: 180, stars: 5 }
      ];
      state.items = samples;
      updateStats(samples);
      renderGrid(samples);
    }
  }

  function init(){
    if (!document.body.classList.contains('projects-page')) return;

    // Toolbar - Updated IDs
    $('#categoryFilter')?.addEventListener('change', e=>{ state.filters.category=e.target.value; load(); });
    $('#statusFilter')?.addEventListener('change', e=>{ state.filters.status=e.target.value; load(); });
    $('#sortSelect')?.addEventListener('change', e=>{ state.filters.sort=e.target.value; load(); });
    $('#searchInput')?.addEventListener('input', e=>{ state.filters.search=e.target.value.trim(); load(); });
    
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
    $('#addProjectBtn')?.addEventListener('click', ()=>{ if(!authUser()){ toast('Please sign in to add a project.'); return; } toggleModal('#projectModal', true); });
    $('#closeProjectModal')?.addEventListener('click', ()=>closeModal('#projectModal'));
    $('#closeDetailModal')?.addEventListener('click', ()=>closeModal('#detailModal'));
    $('#cancelProject')?.addEventListener('click', ()=>closeModal('#projectModal'));
    $('#createFirstProject')?.addEventListener('click', ()=>{ if(!authUser()){ toast('Please sign in'); return; } toggleModal('#projectModal', true); });
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

    // Hide loading after init
    const spinner = $('#loadingSpinner');
    if (spinner) spinner.classList.add('hidden');
    
    load();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
