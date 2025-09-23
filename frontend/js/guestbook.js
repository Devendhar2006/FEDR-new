// Guestbook logic: LocalStorage entries, filters/sort, pagination, edit/delete, admin tools, emoji + markdown-lite, captcha + rate limit.
(function(){
  const $ = (s,c=document)=>c.querySelector(s);
  const $$ = (s,c=document)=>Array.from(c.querySelectorAll(s));

  if (!document.body.classList.contains('guestbook-page')) return;

  const LS_KEY = 'guestbookEntries.v2';
  const RATE_KEY = 'guestbookRate';

  const state = {
    entries: [],
    filters: { user:'', search:'', pinnedOnly:false, hideSpam:true, sort:'-date' },
    page: 1,
    pageSize: 8,
    bulkMode: false,
    selected: new Set(),
  };

  function loadEntries(){ try { return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); } catch { return []; } }
  function saveEntries(list){ localStorage.setItem(LS_KEY, JSON.stringify(list)); }

  function authUser(){ try { return JSON.parse(localStorage.getItem('cds_user')||'null'); } catch { return null; } }
  function isAdmin(){ const u=authUser(); return !!u && (u.role==='admin' || u.isAdmin===true); }
  function myId(){ const u=authUser(); return u?.id || u?.email || u?.name || 'anon'; }

  function toast(msg){ let t=$('.toast'); if(!t){ t=document.createElement('div'); t.className='toast'; document.body.appendChild(t);} t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2000); }

  function escapeHtml(str){ return (str||'').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }
  function mdLite(str){
    // Simple markdown: **bold**, *italic*, `code`
    let s=escapeHtml(str);
    s=s.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
    s=s.replace(/\*(.+?)\*/g,'<i>$1</i>');
    s=s.replace(/`([^`]+?)`/g,'<code>$1</code>');
    s=s.replace(/\n/g,'<br/>');
    return s;
  }

  function now(){ return Date.now(); }

  function genCaptcha(){
    const a=Math.floor(Math.random()*8)+2; const b=Math.floor(Math.random()*8)+2;
    const op=Math.random()>0.5?'+':'-';
    const q=`${a} ${op} ${b}`; const ans= op==='+'? a+b : a-b;
    return { q, ans };
  }

  let captcha = genCaptcha();
  $('#gbCaptchaQ').textContent = captcha.q;

  function updateCounters(){
    const total = state.entries.filter(e=> !(state.filters.hideSpam && e.spam)).length;
    $('#gbTotal').textContent = `Total: ${total}`;
    const weekAgo = now() - 7*24*3600*1000;
    const recent = state.entries.filter(e=> e.ts>=weekAgo && !(state.filters.hideSpam && e.spam)).length;
    $('#gbRecent').textContent = `Last 7 days: ${recent}`;
    const byUser = new Map();
    state.entries.forEach(e=>{ if (state.filters.hideSpam && e.spam) return; byUser.set(e.name, (byUser.get(e.name)||0)+1); });
    let maxU='—', maxC=0; byUser.forEach((c,u)=>{ if (c>maxC){ maxC=c; maxU=u; } });
    $('#gbActive').textContent = `Most active: ${maxU}`;
  }

  function refreshUsersFilter(){
    const sel = $('#gbFilterUser');
    const prev = sel.value;
    const users = Array.from(new Set(state.entries.map(e=>e.name))).sort();
    sel.innerHTML = '<option value="">All Users</option>' + users.map(u=>`<option>${escapeHtml(u)}</option>`).join('');
    sel.value = prev || '';
  }

  function applyFilters(list){
    let arr = list.slice();
    const f = state.filters;
    if (f.user) arr = arr.filter(e=> (e.name||'').toLowerCase()===f.user.toLowerCase());
    if (f.pinnedOnly) arr = arr.filter(e=> e.pinned);
    if (f.hideSpam) arr = arr.filter(e=> !e.spam);
    if (f.search){ const q=f.search.toLowerCase(); arr = arr.filter(e=> (e.name+" "+e.msg).toLowerCase().includes(q)); }
    if (f.sort==='-date') arr.sort((a,b)=> (b.ts||0)-(a.ts||0)); else arr.sort((a,b)=> (a.ts||0)-(b.ts||0));
    return arr;
  }

  function render(){
    const listEl = $('#guestbookEntries');
    const paged = applyFilters(state.entries);
    const total = paged.length;
    const start = 0; const end = state.page * state.pageSize;
    const slice = paged.slice(start, end);

    listEl.innerHTML='';
    if (!slice.length){ listEl.innerHTML = '<p class="muted">No entries yet. Be the first!</p>'; }

    const admin = isAdmin();

    slice.forEach(e=>{
      const card=document.createElement('div');
      card.className='entry-card'+(e.spam?' flagged':'')+(e.pinned?' pinned':'');
      const avatar = e.avatar? `<img class="avatar" src="${escapeHtml(e.avatar)}" alt="avatar"/>` : '';
      const meta = `<div class="meta"><span class="chip">${new Date(e.ts).toLocaleString()}</span>${e.email?`<span class="chip">${escapeHtml(e.email)}</span>`:''}${e.pinned?'<span class="chip">Pinned</span>':''}${e.spam?'<span class="chip">Spam</span>':''}</div>`;
      const selectBox = state.bulkMode? `<input type="checkbox" class="select-box" data-id="${e.id}" ${state.selected.has(e.id)?'checked':''}/>` : '';
      card.innerHTML = `
        <div style="display:flex; gap:10px; align-items:flex-start; justify-content:space-between;">
          <div style="display:flex; gap:10px;">
            ${avatar}
            <div>
              <div class="name">${escapeHtml(e.name)}</div>
              ${meta}
            </div>
          </div>
          ${selectBox}
        </div>
        <p style="margin:.6rem 0 0;">${mdLite(e.msg)}</p>
        <div class="actions">
          ${ (authUser() && myId()===e.ownerId) ? `<button class="icon-btn" data-edit="${e.id}">✎ Edit</button><button class="icon-btn" data-delete="${e.id}">🗑 Delete</button>` : ''}
          ${ admin ? `<button class="icon-btn" data-pin="${e.id}">${e.pinned?'Unpin':'Pin'}</button><button class="icon-btn" data-spam="${e.id}">${e.spam?'Unmark Spam':'Mark Spam'}</button>` : ''}
        </div>
      `;
      listEl.appendChild(card);
    });

    // Load more visibility
    $('#gbLoadMore').hidden = end >= total;

    // Wire actions
    $$('.icon-btn[data-edit]')?.forEach(b=> b.addEventListener('click', onEdit));
    $$('.icon-btn[data-delete]')?.forEach(b=> b.addEventListener('click', onDelete));
    $$('.icon-btn[data-pin]')?.forEach(b=> b.addEventListener('click', onPin));
    $$('.icon-btn[data-spam]')?.forEach(b=> b.addEventListener('click', onSpam));
    $$('.select-box')?.forEach(cb=> cb.addEventListener('change', e=>{ const id=e.target.dataset.id; if(e.target.checked) state.selected.add(id); else state.selected.delete(id); updateBulkSelCount(); }));

    updateCounters();
  }

  function onEdit(e){
    const id=e.currentTarget.dataset.edit; const item=state.entries.find(x=>x.id===id); if(!item) return;
    $('#editName').value = item.name;
    $('#editEmail').value = item.email||'';
    $('#editAvatar').value = item.avatar||'';
    $('#editMsg').value = item.msg;
    $('#editId').value = item.id;
    $('#editModal').classList.remove('hidden');
  }
  function onDelete(e){ const id=e.currentTarget.dataset.delete; if(!confirm('Delete this entry?')) return; state.entries = state.entries.filter(x=>x.id!==id); saveEntries(state.entries); toast('Deleted'); render(); }
  function onPin(e){ const id=e.currentTarget.dataset.pin; const it=state.entries.find(x=>x.id===id); if(!it) return; it.pinned=!it.pinned; saveEntries(state.entries); render(); }
  function onSpam(e){ const id=e.currentTarget.dataset.spam; const it=state.entries.find(x=>x.id===id); if(!it) return; it.spam=!it.spam; saveEntries(state.entries); render(); }

  function updateCount(){ const v=$('#gbMsg').value||''; $('#gbCount').textContent=`${v.length}/240`; }

  function rateLimited(){
    try{ const obj=JSON.parse(localStorage.getItem(RATE_KEY)||'null'); if(!obj) return false; const windowMs=60*1000; const limit=3; const nowTs=now(); obj.events = (obj.events||[]).filter(t=> nowTs - t < windowMs); if (obj.events.length>=limit) return true; return false; } catch { return false; }
  }
  function trackRate(){
    let obj; try{ obj=JSON.parse(localStorage.getItem(RATE_KEY)||'null')||{};}catch{ obj={}; }
    obj.events = (obj.events||[]); obj.events.push(now()); localStorage.setItem(RATE_KEY, JSON.stringify(obj));
  }

  function submitForm(ev){
    ev.preventDefault();
    const honey = $('#gbHoney').value; if (honey) return; // bot
    if (rateLimited()){ toast('Please slow down.'); return; }
    const ans = parseInt($('#gbCaptcha').value||'', 10);
    if (ans!==captcha.ans){ toast('Captcha incorrect'); captcha = genCaptcha(); $('#gbCaptchaQ').textContent=captcha.q; return; }

    const name=($('#gbName').value||'Anonymous').trim();
    const email=$('#gbEmail').value.trim();
    const avatar=$('#gbAvatar').value.trim();
    const msg=($('#gbMsg').value||'').trim();
    if (!msg){ toast('Message cannot be empty'); return; }

    const entry={ id:`gb_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, name, email, avatar, msg, ts:now(), ownerId: myId(), pinned:false, spam:false };
    state.entries.unshift(entry);
    saveEntries(state.entries);
    trackRate();

    $('#guestbookForm').reset(); updateCount();
    captcha = genCaptcha(); $('#gbCaptchaQ').textContent=captcha.q; $('#gbFormMsg').className='form-message success'; $('#gbFormMsg').textContent='Signed successfully!';
    setTimeout(()=> $('#gbFormMsg').className='form-message', 2000);
    render();
    refreshUsersFilter();
  }

  function renderEmojiPanel(){
    const panel = $('#gbEmojiPanel');
    const emojis = ['😀','😄','😁','😎','🥳','🤩','✨','🚀','🌌','🌟','💫','🔥','👍','🙌','🎉','❤️','👋','💡','🧠','🛠️','📚','📝','✅','💻','🧑‍🚀'];
    panel.innerHTML = emojis.map(e=>`<button type="button" data-emoji="${e}">${e}</button>`).join('');
    panel.addEventListener('click', (ev)=>{ const btn=ev.target.closest('button[data-emoji]'); if(!btn) return; const t=$('#gbMsg'); const ins=btn.dataset.emoji; const start=t.selectionStart||t.value.length; const end=t.selectionEnd||t.value.length; const v=t.value; t.value = v.slice(0,start) + ins + v.slice(end); t.focus(); t.selectionStart=t.selectionEnd=start+ins.length; updateCount(); });
  }

  function toggleBulk(on){ state.bulkMode=on; $('#gbBulkBar').classList.toggle('hidden', !on); $('#gbBulkToggle').hidden = !on && !isAdmin(); state.selected.clear(); render(); }
  function updateBulkSelCount(){ $('#gbSelCount').textContent = `${state.selected.size} selected`; }

  function init(){
    // Form and inputs
    $('#guestbookForm').addEventListener('submit', submitForm);
    $('#gbMsg').addEventListener('input', updateCount);
    $('#gbEmojiBtn').addEventListener('click', ()=>{ const p=$('#gbEmojiPanel'); p.classList.toggle('hidden'); });
    renderEmojiPanel(); updateCount();

    // Filters
    $('#gbFilterUser').addEventListener('change', e=>{ state.filters.user=e.target.value; state.page=1; render(); });
    $('#gbSearch').addEventListener('input', e=>{ state.filters.search=e.target.value.trim(); state.page=1; render(); });
    $('#gbPinnedOnly').addEventListener('change', e=>{ state.filters.pinnedOnly=e.target.checked; state.page=1; render(); });
    $('#gbHideSpam').addEventListener('change', e=>{ state.filters.hideSpam=e.target.checked; state.page=1; render(); });
    $('#gbSortBy').addEventListener('change', e=>{ state.filters.sort=e.target.value; state.page=1; render(); });

    // Pagination
    $('#gbLoadMore').addEventListener('click', ()=>{ state.page++; render(); });

    // Bulk admin tools
    if (isAdmin()) $('#gbBulkToggle').hidden = false;
    $('#gbBulkToggle').addEventListener('click', ()=> toggleBulk(!state.bulkMode));
    $('#gbSelectAll').addEventListener('click', ()=>{ applyFilters(state.entries).slice(0, state.page*state.pageSize).forEach(e=> state.selected.add(e.id)); render(); updateBulkSelCount(); });
    $('#gbDeleteSel').addEventListener('click', ()=>{ if(!state.selected.size) return; if(!confirm('Delete selected entries?')) return; state.entries = state.entries.filter(e=> !state.selected.has(e.id)); saveEntries(state.entries); toggleBulk(false); toast('Deleted selected'); refreshUsersFilter(); render(); });
    $('#gbMarkSpamSel').addEventListener('click', ()=>{ applyFilters(state.entries).forEach(e=>{ if(state.selected.has(e.id)) e.spam=true; }); saveEntries(state.entries); toast('Marked as spam'); render(); });
    $('#gbUnspamSel').addEventListener('click', ()=>{ applyFilters(state.entries).forEach(e=>{ if(state.selected.has(e.id)) e.spam=false; }); saveEntries(state.entries); toast('Unmarked spam'); render(); });

    // Edit modal
    $('#editCancel').addEventListener('click', ()=> $('#editModal').classList.add('hidden'));
    $('#editClose').addEventListener('click', ()=> $('#editModal').classList.add('hidden'));
    $('#editForm').addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const id=$('#editId').value; const it=state.entries.find(x=>x.id===id); if(!it) return;
      if (myId()!==it.ownerId && !isAdmin()){ toast('Not allowed'); return; }
      it.name=$('#editName').value.trim()||it.name; it.email=$('#editEmail').value.trim(); it.avatar=$('#editAvatar').value.trim(); it.msg=$('#editMsg').value.trim();
      saveEntries(state.entries); toast('Updated'); $('#editModal').classList.add('hidden'); render(); refreshUsersFilter();
    });

    // Initial load
    state.entries = loadEntries();
    refreshUsersFilter();
    render();
  }

  // Edit Modal skeleton
  const modal = document.createElement('div');
  modal.id='editModal'; modal.className='modal hidden'; modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-card">
      <header class="modal-header">
        <h2>Edit Entry</h2>
        <button class="icon-btn" id="editClose" aria-label="Close">✕</button>
      </header>
      <form id="editForm" class="form-grid">
        <input type="hidden" id="editId"/>
        <div class="two-col">
          <div class="field"><label for="editName">Name</label><input id="editName"/></div>
          <div class="field"><label for="editEmail">Email</label><input id="editEmail" type="email"/></div>
        </div>
        <div class="field"><label for="editAvatar">Avatar URL</label><input id="editAvatar" type="url"/></div>
        <div class="field"><label for="editMsg">Message</label><textarea id="editMsg" maxlength="240"></textarea></div>
        <div class="actions"><button type="button" id="editCancel" class="btn-secondary">Cancel</button><button type="submit" class="btn-gradient">Save</button></div>
      </form>
    </div>`;
  document.body.appendChild(modal);

  document.addEventListener('DOMContentLoaded', init);
})();
