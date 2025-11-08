/**
 * Frontend Configuration
 * Update BACKEND_URL with your deployed backend URL
 */

const CONFIG = {
  // IMPORTANT: Replace this with your Render backend URL after deployment
  // Example: 'https://cosmic-devspace-backend.onrender.com'
  BACKEND_URL: 'https://fedf-project-njuy.onrender.com', // Production backend URL
  
  // For local development
  LOCAL_BACKEND: 'http://localhost:5000',
  
  // Automatically detect environment
  get API_BASE_URL() {
    // If running on localhost, use local backend
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return this.LOCAL_BACKEND + '/api';
    }
    // Otherwise use production backend
    return this.BACKEND_URL + '/api';
  }
};

// Export for use in other files
window.CONFIG = CONFIG;
