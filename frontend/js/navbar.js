/* ================================================
   COSMIC DEVSPACE - NAVIGATION BAR FUNCTIONALITY
   ================================================ */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeNavbar();
});

function initializeNavbar() {
  // Initialize all navbar functionalities
  setupMobileMenu();
  setActiveLink();
  updateAuthState();
  setupUserMenu();
  setupLogoutHandler();
}

/* ================================================
   MOBILE MENU TOGGLE
   ================================================ */

function setupMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.querySelector('.navbar-menu');
  const navAuth = document.querySelector('.navbar-auth');

  if (hamburger) {
    hamburger.addEventListener('click', function() {
      hamburger.classList.toggle('active');
      
      if (navMenu) {
        navMenu.classList.toggle('active');
      }
      
      if (navAuth) {
        navAuth.classList.toggle('active');
      }
    });

    // Close menu when clicking on a link
    const navLinks = document.querySelectorAll('.navbar-menu .nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        hamburger.classList.remove('active');
        if (navMenu) navMenu.classList.remove('active');
        if (navAuth) navAuth.classList.remove('active');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
      const isClickInsideNav = event.target.closest('.navbar');
      if (!isClickInsideNav) {
        hamburger.classList.remove('active');
        if (navMenu) navMenu.classList.remove('active');
        if (navAuth) navAuth.classList.remove('active');
      }
    });
  }
}

/* ================================================
   ACTIVE LINK HIGHLIGHTING
   ================================================ */

function setActiveLink() {
  // Get current page filename
  let currentPage = window.location.pathname.split('/').pop();
  
  // If no page specified, assume index.html
  if (!currentPage || currentPage === '') {
    currentPage = 'index.html';
  }

  // Get all navigation links
  const links = document.querySelectorAll('.navbar-menu .nav-link');
  
  links.forEach(link => {
    // Remove active class from all links
    link.classList.remove('active');
    
    // Get the href attribute
    const href = link.getAttribute('href');
    
    // Check if this link matches current page
    if (href === currentPage) {
      link.classList.add('active');
    }
    
    // Special case for home page
    if (currentPage === 'index.html' && href === 'index.html') {
      link.classList.add('active');
    }
  });
}

/* ================================================
   AUTH STATE MANAGEMENT
   ================================================ */

function updateAuthState() {
  const authLoggedOut = document.getElementById('authLoggedOut');
  const authLoggedIn = document.getElementById('authLoggedIn');
  
  // Check for demo user or actual user session
  const demoUser = localStorage.getItem('demo_user');
  const cdsUser = localStorage.getItem('cds_user');
  const token = localStorage.getItem('token');
  
  let user = null;
  
  // Priority: token > cds_user > demo_user
  if (token) {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } else if (cdsUser) {
    user = JSON.parse(cdsUser);
  } else if (demoUser) {
    user = JSON.parse(demoUser);
  }
  
  if (user && user.email) {
    // User is logged in
    if (authLoggedOut) authLoggedOut.style.display = 'none';
    if (authLoggedIn) {
      authLoggedIn.style.display = 'flex';
      
      // Update user name
      const userNameElement = document.getElementById('navUserName');
      if (userNameElement) {
        userNameElement.textContent = user.name || user.email.split('@')[0];
      }
      
      // Update user avatar
      const userAvatar = document.getElementById('userAvatar');
      if (userAvatar) {
        userAvatar.src = user.avatar || generateAvatarFromName(user.name || user.email);
        userAvatar.alt = user.name || 'User Avatar';
      }
      
      // Show admin link if user is admin
      const adminLink = document.getElementById('adminLink');
      if (adminLink && user.role === 'admin') {
        adminLink.style.display = 'flex';
      }
    }
  } else {
    // User is logged out
    if (authLoggedOut) authLoggedOut.style.display = 'flex';
    if (authLoggedIn) authLoggedIn.style.display = 'none';
  }
}

/* ================================================
   USER MENU DROPDOWN
   ================================================ */

function setupUserMenu() {
  const userAvatar = document.getElementById('userAvatar');
  const dropdownMenu = document.querySelector('.dropdown-menu');
  
  if (userAvatar && dropdownMenu) {
    // Toggle dropdown on avatar click
    userAvatar.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdownMenu.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
      if (!event.target.closest('.user-menu')) {
        dropdownMenu.classList.remove('show');
      }
    });
    
    // Close dropdown when clicking a link inside
    const dropdownLinks = dropdownMenu.querySelectorAll('a');
    dropdownLinks.forEach(link => {
      link.addEventListener('click', function() {
        dropdownMenu.classList.remove('show');
      });
    });
  }
}

/* ================================================
   LOGOUT HANDLER
   ================================================ */

function setupLogoutHandler() {
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Confirm logout
      if (confirm('Are you sure you want to logout?')) {
        // Clear all authentication data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('demo_user');
        localStorage.removeItem('cds_user');
        
        // Show logout message
        console.log('User logged out successfully');
        
        // Redirect to home page
        window.location.href = 'index.html';
      }
    });
  }
}

/* ================================================
   UTILITY FUNCTIONS
   ================================================ */

// Generate a colored avatar from user's name
function generateAvatarFromName(name) {
  if (!name) return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMmJjNGZhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj4/PC90ZXh0Pjwvc3ZnPg==';
  
  // Get initials
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  // Generate color from name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = ['#2bc4fa', '#a855f7', '#ff568f', '#00d4aa', '#fde68a'];
  const color = colors[Math.abs(hash) % colors.length];
  
  // Create SVG avatar
  const svg = `
    <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" fill="${color}"/>
      <text x="50%" y="50%" font-size="18" fill="white" font-family="Arial" text-anchor="middle" dy=".35em" font-weight="bold">${initials}</text>
    </svg>
  `;
  
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

// Refresh navbar auth state (call this after login/logout)
function refreshNavbar() {
  updateAuthState();
  setActiveLink();
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.refreshNavbar = refreshNavbar;
  window.updateAuthState = updateAuthState;
}
