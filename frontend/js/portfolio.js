// Portfolio page interactions: modal open/close, drag&drop uploads, preview, form submit, edit/delete controls.
(function(){
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  const state = {
    images: [], // {file, url}
    editingId: null
  };

  function toast(msg, type='info') {
    let t = $('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    if (type === 'error') t.style.borderColor = 'rgba(255,100,140,.5)';
    if (type === 'success') t.style.borderColor = 'rgba(120,255,180,.5)';
    setTimeout(()=>{ t.classList.remove('show'); t.style.borderColor='rgba(225,215,243,.26)'; }, 2200);
  }

  function authUser() {
    try { return JSON.parse(localStorage.getItem('cds_user')||'null'); } catch { return null; }
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
      const endpoint = isEdit ? `/api/portfolio/${state.editingId}` : '/api/portfolio';
      const method = isEdit ? 'PUT' : 'POST';
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

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
        const res = await fetch(`/api/portfolio/${id}`, { method:'DELETE' });
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
  }

  document.addEventListener('DOMContentLoaded', init);
})();
