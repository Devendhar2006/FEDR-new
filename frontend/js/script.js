document.addEventListener('DOMContentLoaded', () => {
    const signinBtn = document.getElementById('signin-btn');
    const modal = document.getElementById('signin-modal');
    const closeBtn = document.querySelector('.close-btn');
    const cursorBlur = document.getElementById('cursor-blur');

    signinBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target == modal) {
            modal.style.display = 'none';
        }
    });

    document.addEventListener('mousemove', (e) => {
        cursorBlur.style.left = e.clientX + 'px';
        cursorBlur.style.top = e.clientY + 'px';
    });

    const navLinks = document.querySelectorAll('nav a, nav button');
    navLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
            cursorBlur.style.width = '40px';
            cursorBlur.style.height = '40px';
        });
        link.addEventListener('mouseleave', () => {
            cursorBlur.style.width = '20px';
            cursorBlur.style.height = '20px';
        });
    });
});

// Visual: lightweight particle system on canvas
(function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return; // safe guard
  const ctx = canvas.getContext('2d');
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 100 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    size: Math.random() * 2 + 1,
    opacity: Math.random() * 0.5 + 0.2
  }));

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(253, 230, 138, ${p.opacity})`;
      ctx.fill();
    });
    requestAnimationFrame(animate);
  }
  animate();
})();

// Visual: custom cursor follow and subtle scaling on interactive hovers
(function initCosmicCursor(){
  const cursor = document.querySelector('.cosmic-cursor');
  if (!cursor) return;
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX - 10 + 'px';
    cursor.style.top = e.clientY - 10 + 'px';
  });
  const interactiveSelectors = ['.space-btn', '.feature-item', '.nav-orb', '.project-card', 'nav a', 'nav button'];
  document.addEventListener('mouseenter', (e) => {
    if (interactiveSelectors.some(sel => e.target.matches(sel))) {
      cursor.style.transform = 'scale(1.5)';
      cursor.style.boxShadow = '0 0 30px #fde68a';
    }
  }, true);
  document.addEventListener('mouseleave', (e) => {
    if (interactiveSelectors.some(sel => e.target.matches(sel))) {
      cursor.style.transform = 'scale(1)';
      cursor.style.boxShadow = '0 0 20px #fde68a';
    }
  }, true);
})();

// Modal helpers for new design modals (existing sign-in modal untouched)
window.showSection = function(section) {
  const map = { portfolio: 'portfolioModal', guestbook: 'guestbookModal', analytics: 'analyticsModal', admin: 'adminModal' };
  const id = map[section];
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
  if (section === 'portfolio') loadPortfolio();
  if (section === 'guestbook') loadGuestbook();
  if (section === 'analytics') loadAnalytics();
};

window.closeModal = function(modalId){
  const el = document.getElementById(modalId);
  if (el) el.style.display = 'none';
};

window.addEventListener('click', (e) => {
  if ((e.target instanceof HTMLElement) && e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});

// Portfolio and guestbook demo content
const portfolioProjects = [
  { id:1, title:'Stellar E‑Commerce Platform', description:'A responsive platform with cosmic design and smooth animations.', category:'web', tags:['React','Node.js','MongoDB','CSS3'] },
  { id:2, title:'Nebula Mobile App', description:'Cross‑platform app with AR features and real‑time data.', category:'mobile', tags:['React Native','AR','Firebase'] },
  { id:3, title:'Galaxy AI Predictor', description:'Deep learning model predicting stellar formations.', category:'ai', tags:['Python','TensorFlow','DL'] },
  { id:4, title:'Cosmic UI Design System', description:'Space‑themed components and animations.', category:'design', tags:['Figma','Design Systems','UI/UX'] }
];

let guestbookMessages = [
  { id:1, name:'Captain Stellar', email:'captain@spaceship.com', message:'Amazing portfolio! Truly out of this world.', date: new Date('2025-09-20') },
  { id:2, name:'Nova Designer', email:'nova@designgalaxy.com', message:'Stellar animations and interactions throughout.', date: new Date('2025-09-19') },
];

window.loadPortfolio = function(){
  const grid = document.getElementById('portfolioGrid');
  if (!grid) return;
  grid.innerHTML = '';
  portfolioProjects.forEach(project => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.category = project.category;
    card.innerHTML = `
      <div class="project-title">${project.title}</div>
      <div class="project-description">${project.description}</div>
      <div class="project-tags">${project.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
    `;
    card.addEventListener('click', () => alert(`🚀 Launching ${project.title}!\n\n${project.description}\n\nTechnologies: ${project.tags.join(', ')}`));
    grid.appendChild(card);
  });
};

window.filterProjects = function(category){
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(b => b.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');
  document.querySelectorAll('.project-card').forEach(card => {
    card.style.display = (category === 'all' || card.dataset.category === category) ? 'block' : 'none';
    if (card.style.display === 'block') card.style.animation = 'entrySlideIn .5s ease-out';
  });
};

window.loadGuestbook = function(){
  const container = document.getElementById('guestbookEntries');
  if (!container) return;
  container.innerHTML = '';
  guestbookMessages.slice().reverse().forEach(m => {
    const entry = document.createElement('div');
    entry.className = 'guestbook-entry';
    entry.innerHTML = `
      <div class="entry-author">${m.name}</div>
      <div class="entry-message">${m.message}</div>
      <div class="entry-date">${m.date.toLocaleDateString()}</div>
    `;
    container.appendChild(entry);
  });
};

// Guestbook form submission
(function initGuestbookForm(){
  const form = document.getElementById('guestbookForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('guestName').value;
    const email = document.getElementById('guestEmail').value;
    const message = document.getElementById('guestMessage').value;
    if (name && message) {
      guestbookMessages.push({ id: guestbookMessages.length+1, name, email, message, date: new Date() });
      const success = document.getElementById('guestbookSuccess');
      if (success) {
        success.innerHTML = '<div class="success-message">🚀 Message transmitted successfully! Welcome to our cosmic community!</div>';
        success.style.display = 'block';
        setTimeout(() => { success.style.display = 'none'; loadGuestbook(); }, 1500);
      }
      form.reset();
    }
  });
})();

// Analytics (simple counters)
const analyticsData = { totalViews: 12847, totalProjects: portfolioProjects.length, totalMessages: () => guestbookMessages.length, totalVisitors: 3421, weeklyData: [45,62,78,91,67,84,102] };

window.loadAnalytics = function(){
  animateCounter('totalViews', analyticsData.totalViews);
  animateCounter('totalProjects', analyticsData.totalProjects);
  animateCounter('totalMessages', analyticsData.totalMessages());
  animateCounter('totalVisitors', analyticsData.totalVisitors);
  setTimeout(drawActivityChart, 200);
};

function animateCounter(id, target){
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0; const inc = Math.max(1, Math.floor(target/50));
  const timer = setInterval(() => {
    current += inc;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = String(current);
  }, 30);
}

function drawActivityChart(){
  const canvas = document.getElementById('activityChart');
  if (!canvas) return; const ctx = canvas.getContext('2d');
  const data = analyticsData.weeklyData; const max = Math.max(...data);
  const w = canvas.width / data.length; const hMax = canvas.height - 40;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  data.forEach((v,i) => {
    const bh = (v/max) * hMax; const x = i*w + 10; const y = canvas.height - bh - 20;
    const grad = ctx.createLinearGradient(0,y,0,y+bh); grad.addColorStop(0,'#2bc4fa'); grad.addColorStop(1,'#965aff');
    ctx.fillStyle = grad; ctx.fillRect(x, y, w-20, bh);
    ctx.fillStyle = '#fde68a'; ctx.font = '12px Montserrat'; ctx.textAlign = 'center'; ctx.fillText(String(v), x+(w-20)/2, y-5);
  });
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  ctx.fillStyle = '#eceaff'; ctx.font = '10px Montserrat';
  days.forEach((d,i)=>{ ctx.fillText(d, i*w + w/2, canvas.height - 5); });
}

// Admin helpers
window.authenticateAdmin = function(){
  const password = prompt('🔐 Enter space commander access code:');
  if (password === 'devspace2025') {
    alert('✅ Access granted!');
  } else {
    alert('❌ Access denied!');
  }
};
