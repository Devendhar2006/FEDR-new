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
});
