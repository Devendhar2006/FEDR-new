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

  function renderGrid(items){
    const grid = $('#projectsGrid');
    grid.innerHTML = '';
    if (!items.length){ grid.innerHTML = '<p class="muted">No projects found.</p>'; return; }
    const signedIn = !!authUser();
    items.forEach(p=>{
      const el = document.createElement('div');
      el.className = 'tile';
      el.setAttribute('role','listitem');
      el.tabIndex = 0;
      el.innerHTML = `
        <h3>${p.title}</h3>
        ${statusBadge(p.status)}
        <p>${(p.shortDescription || p.description || '').slice(0,140)}</p>
        ${techChips(p.technologies)}
        ${tagChips(p.tags)}
      `;
      // click opens details
      el.addEventListener('click', ()=> openDetails(p));
      // add edit/delete for signed in
      if (signedIn){ attachActions(el, p); }
      grid.appendChild(el);
    });
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
    $('#detailsTitle').textContent = p.title;
    const imgs = (p.images||[]).slice(0,4).map(i=>`<img src="${i.url}" alt="${p.title}" style="width:100%;max-height:200px;object-fit:cover;border-radius:12px;"/>`).join('');
    $('#detailsContent').innerHTML = `
      ${statusBadge(p.status)}
      <p style="margin-top:8px;">${p.description||''}</p>
      ${imgs}
      ${linkButtons(p.links)}
      ${contributorList(p.collaborators)}
    `;
    toggleModal('#detailsModal', true);
  }

  function toggleModal(sel, open){ const m=$(sel); if(!m) return; m.classList.toggle('hidden', !open); }

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
    try {
      const resp = await API.list(params);
      const items = resp?.data?.projects || [];
      state.items = items;
      renderGrid(items);
    } catch {
      // Offline/demo fallback: show a few sample projects without hitting API
      const samples = [
        { title:'Galactic Web App', status:'completed', shortDescription:'Real‑time satellite tracker.', technologies:[{name:'Vanilla JS'},{name:'WebSocket'}], tags:['space','realtime'] },
        { title:'AI Nebula', status:'in-progress', shortDescription:'Constellation classifier demo.', technologies:[{name:'TensorFlow.js'}], tags:['ai','ml'] },
        { title:'Hyperdrive UI', status:'planning', shortDescription:'Component set with motion.', technologies:[{name:'CSS'},{name:'Animations'}], tags:['ui','design'] }
      ];
      state.items = samples;
      renderGrid(samples);
    }
  }

  function init(){
    if (!document.body.classList.contains('projects-page')) return;

    // Toolbar
    $('#filterCategory')?.addEventListener('change', e=>{ state.filters.category=e.target.value; load(); });
    $('#filterStatus')?.addEventListener('change', e=>{ state.filters.status=e.target.value; load(); });
    $('#sortBy')?.addEventListener('change', e=>{ state.filters.sort=e.target.value; load(); });
    $('#searchInput')?.addEventListener('input', e=>{ state.filters.search=e.target.value.trim(); load(); });

    // Modals
    $('#addProjectBtn')?.addEventListener('click', ()=>{ if(!authUser()){ toast('Please sign in to add a project.'); return; } toggleModal('#projectModal', true); });
    $('#closeProjectModal')?.addEventListener('click', ()=>toggleModal('#projectModal', false));
    $('[data-close-modal]')?.addEventListener('click', ()=>{ toggleModal('#projectModal', false); toggleModal('#detailsModal', false); });
    $('#cancelProject')?.addEventListener('click', ()=>toggleModal('#projectModal', false));
    $('#projectForm')?.addEventListener('submit', submitUpload);
    $('#closeDetails')?.addEventListener('click', ()=>toggleModal('#detailsModal', false));

    // Drag & drop
    const drop=$('#dropzone'); const file=$('#fileInput'); const choose=$('#chooseFiles');
    choose?.addEventListener('click', ()=>file.click());
    file?.addEventListener('change', e=>{ Array.from(e.target.files).forEach(f=>{ const url=URL.createObjectURL(f); upState.images.push({file:f,url}); }); renderPreviews(); });
    ;['dragenter','dragover'].forEach(ev=> drop?.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add('dragover'); }));
    ;['dragleave','drop'].forEach(ev=> drop?.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.remove('dragover'); if(ev==='drop'){ Array.from(e.dataTransfer.files).forEach(f=>{ const url=URL.createObjectURL(f); upState.images.push({file:f,url}); }); renderPreviews(); } }));

    function renderPreviews(){ const grid=$('#previewGrid'); if(!grid) return; grid.innerHTML=''; upState.images.forEach((it,idx)=>{ const wrap=document.createElement('div'); wrap.className='preview-item'; const img=document.createElement('img'); img.src=it.url; const rm=document.createElement('button'); rm.type='button'; rm.className='remove'; rm.textContent='×'; rm.onclick=()=>{ URL.revokeObjectURL(it.url); upState.images.splice(idx,1); renderPreviews(); }; wrap.append(img, rm); grid.appendChild(wrap); }); }

    load();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
