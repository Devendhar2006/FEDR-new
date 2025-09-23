// Blog UI with localStorage-backed posts for safe review: toolbar, editor with autosave, details, comments, search/filter/sort.
(function(){
  const $ = (s,c=document)=>c.querySelector(s);
  const $$ = (s,c=document)=>Array.from(c.querySelectorAll(s));

  const LS_KEY = 'cds_blog_posts';
  const DRAFT_KEY = 'cds_blog_draft';

  const state = {
    posts: [],
    filters: { category:'', sort:'-date', search:'' },
    current: null, // viewing post
    editing: null // currently editing post
  };

  function loadPosts(){
    try { return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); } catch { return []; }
  }
  function savePosts(posts){ localStorage.setItem(LS_KEY, JSON.stringify(posts)); }
  function loadDraft(){ try { return JSON.parse(localStorage.getItem(DRAFT_KEY)||'null'); } catch { return null; } }
  function saveDraft(d){ localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); }
  function clearDraft(){ localStorage.removeItem(DRAFT_KEY); }

  function authUser(){ try { return JSON.parse(localStorage.getItem('cds_user')||'null'); } catch { return null; } }
  function toast(msg){ let t=$('.toast'); if(!t){t=document.createElement('div'); t.className='toast'; document.body.appendChild(t);} t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2000); }

  function renderGrid(posts){
    const grid = $('#blogGrid');
    grid.innerHTML = '';
    if (!posts.length){ grid.innerHTML='<p class="muted">No posts yet. Be the first to publish!</p>'; return; }
    const signedIn = !!authUser();
    posts.forEach(p=>{
      const card = document.createElement('article');
      card.className='tile'; card.setAttribute('role','listitem'); card.tabIndex=0;
      const tags = (p.tags||[]).slice(0,5).map(t=>`<span class="chip">#${t}</span>`).join('');
      const cover = p.coverUrl ? `<img src="${p.coverUrl}" alt="cover" style="width:100%;max-height:140px;object-fit:cover;border-radius:12px;margin-bottom:8px;"/>` : '';
      card.innerHTML = `${cover}<h3>${p.title}</h3><p>${(p.excerpt||p.content||'').replace(/<[^>]+>/g,'').slice(0,140)}</p>${tags?`<div class="chip-row" style="margin-top:6px;">${tags}</div>`:''}`;
      card.addEventListener('click', ()=> openDetails(p));
      if (signedIn) attachActions(card, p);
      grid.appendChild(card);
    });
  }

  function attachActions(card, p){
    const bar=document.createElement('div'); bar.style.position='absolute'; bar.style.top='10px'; bar.style.right='10px'; bar.style.display='flex'; bar.style.gap='6px';
    const edit=document.createElement('button'); edit.type='button'; edit.className='icon-btn'; edit.textContent='✎'; edit.title='Edit';
    const del=document.createElement('button'); del.type='button'; del.className='icon-btn'; del.textContent='🗑'; del.title='Delete';
    bar.append(edit,del); card.style.position='relative'; card.appendChild(bar);
    edit.addEventListener('click', (e)=>{ e.stopPropagation(); beginEdit(p); });
    del.addEventListener('click', (e)=>{ e.stopPropagation(); if(confirm('Delete this post?')){ state.posts = state.posts.filter(x=>x.id!==p.id); savePosts(state.posts); toast('Deleted'); load(); } });
  }

  function openDetails(p){
    // increment views and persist
    const idx = state.posts.findIndex(x=>x.id===p.id);
    if (idx>=0){ state.posts[idx].views = (state.posts[idx].views||0) + 1; savePosts(state.posts); p = state.posts[idx]; }
    state.current = p;
    $('#detailsTitle').textContent = p.title;
    const date = new Date(p.date||Date.now()).toLocaleString();
    const cover = p.coverUrl?`<img src="${p.coverUrl}" alt="cover" style="width:100%;border-radius:12px;margin:8px 0;"/>`:'';
    const tags = (p.tags||[]).map(t=>`<span class="chip">#${t}</span>`).join(' ');
    $('#detailsContent').innerHTML = `
      <div style="opacity:.85;font-size:.9rem;">By ${p.author||'Anonymous'} • ${date} • <span class="badge">${p.category||'dev'}</span></div>
      ${cover}
      <div class="post-content">${p.content||''}</div>
      ${tags?`<div class="chip-row" style="margin-top:8px;">${tags}</div>`:''}
    `;
    // Render comments from post
    const list=$('#commentsList'); list.innerHTML='';
    (p.comments||[]).forEach(c=>{ const div=document.createElement('div'); div.className='entry-card'; div.innerHTML=`<div class="name">${c.author||'User'}</div><div class="time">${new Date(c.date||Date.now()).toLocaleString()}</div><div>${c.text||''}</div>`; list.appendChild(div); });
    toggle('#detailsModal', true);
  }

  function toggle(sel, open){ const m=$(sel); if(!m) return; m.classList.toggle('hidden', !open); }

  function beginEdit(p){
    $('#editorTitle').textContent = p? 'Edit Post' : 'New Post';
    $('#postTitle').value = p?.title || '';
    $('#postCategory').value = p?.category || 'dev';
    $('#postTags').value = (p?.tags||[]).join(', ');
    $('#postEditor').innerHTML = p?.content || '';
    $('#postPreview').innerHTML = p?.content || '';
    $('#postPreview').hidden = true;
    $('#postEditor').hidden = false;
    $('#editorMsg').className='form-message'; $('#editorMsg').textContent='';
    $('#postForm').dataset.editingId = p?.id || '';
    // cover preview
    $('#coverPreview').innerHTML = p?.coverUrl? `<div class="preview-item"><img src="${p.coverUrl}"/></div>` : '';
    state.editing = p || null;
    toggle('#editorModal', true);
  }

  function buildPostFromForm(){
    const id = $('#postForm').dataset.editingId || `p_${Date.now()}`;
    const title = $('#postTitle').value.trim();
    const category = $('#postCategory').value;
    const tags = $('#postTags').value.split(',').map(s=>s.trim()).filter(Boolean);
    const content = $('#postEditor').innerHTML.trim();
    const author = state.editing?.author || (authUser()?.name)||'Author';
    const coverUrl = $('#coverPreview img')?.src || '';
    const date = state.editing?.date || Date.now();
    const comments = state.editing?.comments || [];
    const views = state.editing?.views || 0;
    return { id, title, category, tags, content, excerpt: content.slice(0,160), date, author, coverUrl, comments, views };
  }

  function persistPost(post){
    const idx = state.posts.findIndex(x=>x.id===post.id);
    if (idx>=0) state.posts[idx] = post; else state.posts.unshift(post);
    savePosts(state.posts);
  }

  function applyFilters(posts){
    let arr = posts.slice();
    const { category, search, sort } = state.filters;
    if (category) arr = arr.filter(p=> (p.category||'').toLowerCase()===category.toLowerCase());
    if (search){ const q=search.toLowerCase(); arr = arr.filter(p=> (p.title+" "+(p.content||'')+" "+(p.tags||[]).join(' ')).toLowerCase().includes(q)); }
    if (sort==='-date') arr.sort((a,b)=> (b.date||0)-(a.date||0));
    if (sort==='date') arr.sort((a,b)=> (a.date||0)-(b.date||0));
    if (sort==='-views') arr.sort((a,b)=> (b.views||0)-(a.views||0));
    return arr;
  }

  function load(){
    state.posts = loadPosts();
    const filtered = applyFilters(state.posts);
    renderGrid(filtered);
  }

  function init(){
    if (!document.body.classList.contains('blog-page')) return;

    // Toolbar
    $('#filterCategory')?.addEventListener('change', e=>{ state.filters.category=e.target.value; load(); });
    $('#sortBy')?.addEventListener('change', e=>{ state.filters.sort=e.target.value; load(); });
    $('#searchInput')?.addEventListener('input', e=>{ state.filters.search=e.target.value.trim(); load(); });

    // New post (auth gated)
    $('#newPostBtn')?.addEventListener('click', ()=>{ if(!authUser()){ toast('Please sign in to write a post.'); return; } beginEdit(); });
    $('#closeEditor')?.addEventListener('click', ()=>toggle('#editorModal', false));
    $('#cancelPost')?.addEventListener('click', ()=>toggle('#editorModal', false));

    // Editor toolbar commands
    $$('.editor-toolbar button[data-cmd]')?.forEach(btn=> btn.addEventListener('click',()=>{
      const cmd = btn.dataset.cmd; const val = btn.dataset.val || null; document.execCommand(cmd, false, val);
    }));
    $('#insertLink')?.addEventListener('click', ()=>{ const url=prompt('Enter URL'); if(url) document.execCommand('createLink', false, url); });
    $('#insertCode')?.addEventListener('click', ()=>{ const sel=document.getSelection(); if(!sel || sel.rangeCount===0) return; const r=sel.getRangeAt(0); const pre=document.createElement('pre'); pre.textContent = sel.toString(); r.deleteContents(); r.insertNode(pre); });
    $('#insertImage')?.addEventListener('click', ()=>{ const url=prompt('Image URL'); if(url){ const img=document.createElement('img'); img.src=url; $('#postEditor').appendChild(img); } });
    $('#togglePreview')?.addEventListener('click', ()=>{ $('#postPreview').innerHTML=$('#postEditor').innerHTML; const isPrev=$('#postPreview').hidden===false; $('#postPreview').hidden = isPrev; $('#postEditor').hidden = !isPrev; });

    // Cover upload (preview only)
    $('#chooseCover')?.addEventListener('click', ()=>$('#coverInput').click());
    function setCoverFromFile(f){ if(!f) return; const reader=new FileReader(); reader.onload=()=>{ const url=reader.result; $('#coverPreview').innerHTML=`<div class="preview-item"><img src="${url}"/></div>`; }; reader.readAsDataURL(f); }
    $('#coverInput')?.addEventListener('change', e=>{ const f=e.target.files?.[0]; setCoverFromFile(f); });
    // Drag & drop on cover
    const dz = $('#coverDrop');
    if (dz){
      dz.addEventListener('dragover', e=>{ e.preventDefault(); dz.classList.add('dragover'); });
      dz.addEventListener('dragleave', ()=> dz.classList.remove('dragover'));
      dz.addEventListener('drop', e=>{ e.preventDefault(); dz.classList.remove('dragover'); const f=e.dataTransfer?.files?.[0]; setCoverFromFile(f); });
    }

    // Auto-save draft
    const draft = loadDraft();
    if (draft){ $('#postTitle').value=draft.title||''; $('#postCategory').value=draft.category||'dev'; $('#postTags').value=(draft.tags||[]).join(', '); $('#postEditor').innerHTML=draft.content||''; if(draft.coverUrl){ $('#coverPreview').innerHTML=`<div class="preview-item"><img src="${draft.coverUrl}"/></div>`; } }
    function updateDraft(){
      const d={ title:$('#postTitle').value, category:$('#postCategory').value, tags:$('#postTags').value.split(',').map(s=>s.trim()).filter(Boolean), content:$('#postEditor').innerHTML, coverUrl: $('#coverPreview img')?.src || '' };
      saveDraft(d);
    }
    ['input','keyup'].forEach(ev=> $('#postEditor')?.addEventListener(ev, updateDraft));
    $('#postTitle')?.addEventListener('input', updateDraft);
    $('#postTags')?.addEventListener('input', updateDraft);
    $('#postCategory')?.addEventListener('change', updateDraft);

    // Submit post
    $('#postForm')?.addEventListener('submit', (e)=>{
      e.preventDefault();
      if(!authUser()){ toast('Please sign in to publish.'); return; }
      const post = buildPostFromForm();
      persistPost(post);
      clearDraft();
      toast('Post published');
      toggle('#editorModal', false);
      load();
      state.editing = null;
    });

    // Details modal behaviors
  $('#closeDetails')?.addEventListener('click', ()=>toggle('#detailsModal', false));
  $$("[data-close-modal]")?.forEach(el=> el.addEventListener('click', ()=>{ toggle('#detailsModal', false); toggle('#editorModal', false); }));
  $('#copyLinkBtn')?.addEventListener('click', ()=>{ const url = location.href.split('#')[0] + `#post-${state.current?.id||''}`; navigator.clipboard.writeText(url).then(()=>toast('Link copied')); });

    // Comments submit
    $('#commentForm')?.addEventListener('submit', (e)=>{
      e.preventDefault();
      const txt = $('#commentText').value.trim(); if(!txt) return;
      const u = authUser(); if(!u){ toast('Please sign in to comment.'); return; }
      const c = { author: u.name||'User', text: txt, date: Date.now() };
      const idx = state.posts.findIndex(x=>x.id===state.current.id);
      if (idx>=0){ state.posts[idx].comments = state.posts[idx].comments||[]; state.posts[idx].comments.push(c); savePosts(state.posts); openDetails(state.posts[idx]); $('#commentText').value=''; toast('Comment added'); }
    });

    // Preview toggle label
  $('#togglePreview')?.addEventListener('click', (e)=>{ const isPrev=$('#postPreview').hidden===false; e.target.textContent = isPrev? 'Edit' : 'Preview'; });

    load();

    // Deep-link open via hash
    if (location.hash.startsWith('#post-')){
      const id = location.hash.slice('#post-'.length);
      const found = state.posts.find(p=>p.id===id);
      if (found) openDetails(found);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
