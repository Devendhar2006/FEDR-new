/**
 * Cosmic DevSpace API Client
 * Centralized API communication layer
 */

// Use the API base URL from config
const API_BASE_URL = window.CONFIG?.API_BASE_URL || 'http://localhost:5000/api';

// Get auth token from localStorage
const getAuthToken = () => {
  const user = JSON.parse(localStorage.getItem('cds_user') || 'null');
  return user?.token || null;
};

// Set auth token in localStorage
const setAuthToken = (token) => {
  const user = JSON.parse(localStorage.getItem('cds_user') || '{}');
  user.token = token;
  localStorage.setItem('cds_user', JSON.stringify(user));
};

// Generic API request handler
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers
  };
  
  try {
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log(`🌐 API Request: ${config.method || 'GET'} ${fullUrl}`);
    console.log(`📦 Request config:`, config);
    const response = await fetch(fullUrl, config);
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    const data = contentType && contentType.includes('application/json') 
      ? await response.json() 
      : { message: await response.text() };
    
    if (!response.ok) {
      console.error(`❌ Response not OK. Status: ${response.status}, Data:`, data);
      // Create a detailed error object
      const error = new Error(data.message || data.error || 'Request failed');
      error.errors = data.errors; // Validation errors if any
      error.statusCode = response.status;
      console.error('❌ API Error:', error);
      throw error;
    }
    
    console.log('✅ API Response:', data);
    return data;
  } catch (error) {
    // Network or other errors
    if (error.message === 'Failed to fetch') {
      console.error('❌ Cannot connect to backend. Is the server running on port 5000?');
      error.message = '🚫 Cannot connect to server. Please check if backend is running.';
    } else {
      console.error('❌ API Request Error:', error);
    }
    throw error;
  }
};

// ============================================
// AUTHENTICATION API
// ============================================

const auth = {
  // Register new user
  register: async (userData) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    if (data.success && data.data) {
      const { user, token } = data.data;
      localStorage.setItem('cds_user', JSON.stringify({ ...user, token }));
      setAuthToken(token);
    }
    
    return data;
  },
  
  // Login user
  login: async (credentials) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    if (data.success && data.data) {
      const { user, token } = data.data;
      localStorage.setItem('cds_user', JSON.stringify({ ...user, token }));
      setAuthToken(token);
    }
    
    return data;
  },
  
  // Logout user
  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('cds_user');
    }
  },
  
  // Get current user profile
  getProfile: async () => {
    return await apiRequest('/auth/profile');
  },
  
  // Update user profile
  updateProfile: async (updates) => {
    return await apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },
  
  // Verify token
  verifyToken: async () => {
    return await apiRequest('/auth/verify-token');
  }
};

// ============================================
// PROJECTS/PORTFOLIO API
// ============================================

const projects = {
  // Get all projects
  getAll: async (params = {}) => {
    // Add myItems parameter if user is authenticated
    if (getAuthToken() && !params.myItems) {
      params.myItems = 'true';
    }
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/portfolio?${query}`);
  },
  
  // Get single project
  getById: async (id) => {
    return await apiRequest(`/portfolio/${id}`);
  },
  
  // Create new project
  create: async (projectData) => {
    return await apiRequest('/portfolio', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  },
  
  // Add portfolio item (project/certification/achievement)
  add: async (type, itemData) => {
    return await apiRequest('/portfolio/add', {
      method: 'POST',
      body: JSON.stringify({ type, ...itemData })
    });
  },
  
  // Update project
  update: async (id, projectData) => {
    return await apiRequest(`/portfolio/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData)
    });
  },
  
  // Delete project/item
  delete: async (id) => {
    return await apiRequest(`/portfolio/${id}`, {
      method: 'DELETE'
    });
  },
  
  // Like/unlike project
  toggleLike: async (id) => {
    return await apiRequest(`/portfolio/${id}/like`, {
      method: 'POST'
    });
  },
  
  // Add comment to project
  addComment: async (id, content) => {
    return await apiRequest(`/portfolio/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }
};

// ============================================
// BLOG API
// ============================================

const blog = {
  // Get all blog posts
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/blog?${query}`);
  },
  
  // Get single blog post
  getById: async (id) => {
    return await apiRequest(`/blog/${id}`);
  },
  
  // Create new blog post
  create: async (blogData) => {
    return await apiRequest('/blog', {
      method: 'POST',
      body: JSON.stringify(blogData)
    });
  },
  
  // Update blog post
  update: async (id, blogData) => {
    return await apiRequest(`/blog/${id}`, {
      method: 'PUT',
      body: JSON.stringify(blogData)
    });
  },
  
  // Delete blog post
  delete: async (id) => {
    return await apiRequest(`/blog/${id}`, {
      method: 'DELETE'
    });
  },
  
  // Add comment to blog post
  addComment: async (id, content, parentComment = null) => {
    return await apiRequest(`/blog/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentComment })
    });
  },
  
  // Like/unlike blog post
  toggleLike: async (id) => {
    return await apiRequest(`/blog/${id}/like`, {
      method: 'POST'
    });
  },
  
  // Get featured blogs
  getFeatured: async () => {
    return await apiRequest('/blog/featured/list');
  }
};

// ============================================
// GUESTBOOK API
// ============================================

const guestbook = {
  // Get all entries
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/guestbook?${query}`);
  },
  
  // Add new entry
  addEntry: async (entryData) => {
    return await apiRequest('/guestbook', {
      method: 'POST',
      body: JSON.stringify(entryData)
    });
  },
  
  // Delete entry (admin)
  delete: async (id) => {
    return await apiRequest(`/guestbook/${id}`, {
      method: 'DELETE'
    });
  },
  
  // Like entry
  toggleLike: async (id) => {
    return await apiRequest(`/guestbook/${id}/like`, {
      method: 'POST'
    });
  },
  
  // Add reply to entry
  addReply: async (id, content) => {
    return await apiRequest(`/guestbook/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }
};

// ============================================
// ANALYTICS API
// ============================================

const analytics = {
  // Get dashboard metrics
  getDashboard: async () => {
    return await apiRequest('/analytics/dashboard');
  },
  
  // Track event
  trackEvent: async (eventData) => {
    return await apiRequest('/analytics/track', {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
  },
  
  // Get statistics
  getStats: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/analytics/stats?${query}`);
  },
  
  // Get page views
  getPageViews: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/analytics/page-views?${query}`);
  }
};

// ============================================
// CONTACT API
// ============================================

const contact = {
  // Submit contact form
  submit: async (formData) => {
    return await apiRequest('/contact', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
  },
  
  // Get all contacts (admin)
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/contact?${query}`);
  }
};

// ============================================
// USERS API
// ============================================

const users = {
  // Get all users (admin)
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/users?${query}`);
  },
  
  // Get user by ID
  getById: async (id) => {
    return await apiRequest(`/users/${id}`);
  },
  
  // Update user (admin)
  update: async (id, userData) => {
    return await apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },
  
  // Delete user (admin)
  delete: async (id) => {
    return await apiRequest(`/users/${id}`, {
      method: 'DELETE'
    });
  },
  
  // Get leaderboard
  getLeaderboard: async (limit = 10) => {
    return await apiRequest(`/users/leaderboard?limit=${limit}`);
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const utils = {
  // Check if user is authenticated
  isAuthenticated: () => {
    return !!getAuthToken();
  },
  
  // Get current user
  getCurrentUser: () => {
    return JSON.parse(localStorage.getItem('cds_user') || 'null');
  },
  
  // Check if user is admin
  isAdmin: () => {
    const user = utils.getCurrentUser();
    return user && (user.role === 'admin' || user.role === 'moderator');
  },
  
  // Format date
  formatDate: (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },
  
  // Format relative time
  formatRelativeTime: (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now - then) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return utils.formatDate(date);
  }
};

// Export API client
window.CosmicAPI = {
  auth,
  projects,
  blog,
  guestbook,
  analytics,
  contact,
  users,
  utils
};

console.log('🚀 Cosmic API Client loaded successfully!');
console.log(`🌐 API Base URL: ${API_BASE_URL}`);
console.log(`📍 Frontend running on: ${window.location.origin}`);
console.log(`✅ API Client Version: 20251107-1`);
