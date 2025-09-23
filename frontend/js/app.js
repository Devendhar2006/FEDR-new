// Simple client-side auth using localStorage (no backend)
const Auth = {
  key: 'cds_user', // current session user
  get() {
    try { return JSON.parse(localStorage.getItem(this.key) || 'null'); } catch { return null; }
  },
  set(user) { localStorage.setItem(this.key, JSON.stringify(user)); },
  clear() { localStorage.removeItem(this.key); }
};

// Persisted registered account (separate from logged-in session)
const Account = {
  key: 'cds_account',
  get() {
    try { return JSON.parse(localStorage.getItem(this.key) || 'null'); } catch { return null; }
  },
  set(account) { localStorage.setItem(this.key, JSON.stringify(account)); },
  clear() { localStorage.removeItem(this.key); }
};

// Wire header auth buttons if present on page
function initAuthUI() {
  const user = Auth.get();
  const loginLink = document.getElementById('loginLink');
  const registerLink = document.getElementById('registerLink');
  const logoutBtn = document.getElementById('logoutBtn');

  if (loginLink && registerLink && logoutBtn) {
    if (user) {
      loginLink.textContent = `Hi, ${user.name}`;
      loginLink.href = 'profile.html';
      registerLink.style.display = 'none';
      logoutBtn.hidden = false;
      logoutBtn.onclick = () => { Auth.clear(); location.href = 'index.html'; };
    } else {
      loginLink.textContent = 'Sign In';
      loginLink.href = 'login.html';
      registerLink.style.display = '';
      logoutBtn.hidden = true;
    }
  }
}

// Page helpers
function setYear() { const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear(); }

document.addEventListener('DOMContentLoaded', () => {
  initAuthUI();
  setYear();
  // Lightweight analytics: visits, last visit, and pages seen
  try {
    const kVisits='cds_visits';
    const kLast='cds_last';
    const kPages='cds_pages';
    const v=(+localStorage.getItem(kVisits)||0)+1; localStorage.setItem(kVisits,String(v));
    localStorage.setItem(kLast, String(Date.now()));
    const path=location.pathname.split('/').pop()||'index.html';
    const pages=JSON.parse(localStorage.getItem(kPages)||'[]');
    if(!pages.includes(path)) { pages.push(path); localStorage.setItem(kPages, JSON.stringify(pages)); }
    // Per-page view counter for charts
    const pvKey='views_'+path; localStorage.setItem(pvKey, String((+localStorage.getItem(pvKey)||0)+1));
  } catch {}

  // Cosmic Star Cursor (auto-enable on non-touch devices)
  try {
    const isTouch = matchMedia('(pointer: coarse)').matches;
    if (!isTouch) {
      document.body.classList.add('star-cursor');
      const star = document.createElement('div');
      star.className = 'cursor-star';
      document.body.appendChild(star);

      let x = -100, y = -100, tx = -100, ty = -100;
      const speed = 0.22; // smoothing
      function raf(){
        x += (tx - x) * speed; y += (ty - y) * speed;
        star.style.transform = `translate3d(${x - star.offsetWidth/2}px, ${y - star.offsetHeight/2}px, 0)`;
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);

      window.addEventListener('mousemove', (e)=>{ tx = e.clientX; ty = e.clientY; });
      window.addEventListener('mousedown', ()=> star.classList.add('is-down'));
      window.addEventListener('mouseup', ()=> star.classList.remove('is-down'));

      // Grow when hovering actionable elements
      const hoverables = ['A','BUTTON','INPUT','SELECT','TEXTAREA','LABEL'];
      document.addEventListener('mouseover', (e)=>{ const t=e.target; if (t && (hoverables.includes(t.tagName) || t.getAttribute('role')==='button')) star.classList.add('is-hover'); });
      document.addEventListener('mouseout', ()=> star.classList.remove('is-hover'));
    }
  } catch {}
});
