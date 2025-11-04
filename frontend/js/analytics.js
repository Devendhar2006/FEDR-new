/**
 * COSMIC DEVSPACE - LIVE ANALYTICS DASHBOARD
 * Real-time analytics with Chart.js integration
 */

// Chart instances
let visitorTrendChart = null;
let pageViewsChart = null;
let trafficSourceChart = null;
let projectEngagementChart = null;

// Auto-refresh interval
let refreshInterval = null;
let isAutoRefreshEnabled = true;
let currentTimeRange = '24h';

// Initialize analytics dashboard
document.addEventListener('DOMContentLoaded', function() {
  initializeAnalytics();
});

/**
 * Initialize all analytics components
 */
async function initializeAnalytics() {
  try {
    // Initialize charts
    initializeCharts();
    
    // Load initial data
    await loadAnalyticsData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Start auto-refresh if enabled
    if (isAutoRefreshEnabled) {
      startAutoRefresh();
    }
    
    // Update last update time
    updateLastUpdateTime();
    
    console.log('📊 Analytics dashboard initialized');
  } catch (error) {
    console.error('Failed to initialize analytics:', error);
    // Fallback to demo data if API fails
    loadDemoData();
  }
}

/**
 * Initialize Chart.js charts
 */
function initializeCharts() {
  // Visitor Trend Chart (Line Chart)
  const visitorCtx = document.getElementById('visitorTrendChart');
  if (visitorCtx) {
    visitorTrendChart = new Chart(visitorCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Visitors',
          data: [],
          borderColor: '#2bc4fa',
          backgroundColor: 'rgba(43, 196, 250, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#2bc4fa',
          pointBorderColor: '#131a34',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(150, 90, 255, 0.1)'
            },
            ticks: {
              color: '#eceaff',
              font: {
                family: 'Montserrat'
              }
            }
          },
          x: {
            grid: {
              color: 'rgba(150, 90, 255, 0.1)'
            },
            ticks: {
              color: '#eceaff',
              font: {
                family: 'Montserrat'
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  }

  // Page Views Chart (Doughnut Chart)
  const pageViewsCtx = document.getElementById('pageViewsChart');
  if (pageViewsCtx) {
    pageViewsChart = new Chart(pageViewsCtx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [
            'rgba(43, 196, 250, 0.8)',
            'rgba(150, 90, 255, 0.8)',
            'rgba(255, 86, 143, 0.8)',
            'rgba(253, 230, 138, 0.8)',
            'rgba(0, 212, 170, 0.8)'
          ],
          borderColor: [
            '#2bc4fa',
            '#965aff',
            '#ff568f',
            '#fde68a',
            '#00d4aa'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#eceaff',
              font: {
                family: 'Montserrat',
                size: 12
              },
              padding: 15
            }
          }
        }
      }
    });
  }

  // Traffic Source Chart (Pie Chart)
  const trafficCtx = document.getElementById('trafficSourceChart');
  if (trafficCtx) {
    trafficSourceChart = new Chart(trafficCtx, {
      type: 'pie',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [
            'rgba(43, 196, 250, 0.8)',
            'rgba(150, 90, 255, 0.8)',
            'rgba(255, 86, 143, 0.8)',
            'rgba(253, 230, 138, 0.8)'
          ],
          borderColor: [
            '#2bc4fa',
            '#965aff',
            '#ff568f',
            '#fde68a'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#eceaff',
              font: {
                family: 'Montserrat',
                size: 12
              },
              padding: 15
            }
          }
        }
      }
    });
  }

  // Project Engagement Chart (Bar Chart)
  const projectCtx = document.getElementById('projectEngagementChart');
  if (projectCtx) {
    projectEngagementChart = new Chart(projectCtx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Views',
          data: [],
          backgroundColor: 'rgba(150, 90, 255, 0.6)',
          borderColor: '#965aff',
          borderWidth: 2,
          borderRadius: 8
        }, {
          label: 'Likes',
          data: [],
          backgroundColor: 'rgba(255, 86, 143, 0.6)',
          borderColor: '#ff568f',
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#eceaff',
              font: {
                family: 'Montserrat'
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(150, 90, 255, 0.1)'
            },
            ticks: {
              color: '#eceaff',
              font: {
                family: 'Montserrat'
              }
            }
          },
          x: {
            grid: {
              color: 'rgba(150, 90, 255, 0.1)'
            },
            ticks: {
              color: '#eceaff',
              font: {
                family: 'Montserrat'
              }
            }
          }
        }
      }
    });
  }
}

/**
 * Load analytics data from API or localStorage
 */
async function loadAnalyticsData() {
  try {
    // Try to fetch from API first
    if (window.CosmicAPI && window.CosmicAPI.analytics) {
      const dashboardData = await window.CosmicAPI.analytics.getDashboard();
      
      if (dashboardData && dashboardData.success) {
        updateDashboard(dashboardData.data);
        return;
      }
    }
  } catch (error) {
    console.warn('API not available, using localStorage data:', error);
  }
  
  // Fallback to localStorage data
  loadDataFromLocalStorage();
}

/**
 * Load analytics data from localStorage
 */
function loadDataFromLocalStorage() {
  // Get visit data from localStorage (tracked by app.js)
  const visits = parseInt(localStorage.getItem('cds_visits') || '0');
  const pages = JSON.parse(localStorage.getItem('cds_pages') || '[]');
  const lastVisit = parseInt(localStorage.getItem('cds_last') || Date.now());
  
  // Generate time-based data
  const now = new Date();
  const labels = [];
  const visitorData = [];
  
  // Generate last 24 hours of data
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    labels.push(hour.getHours() + ':00');
    // Simulate visitor data with some randomness
    visitorData.push(Math.floor(Math.random() * 50) + 20 + Math.sin(i) * 10);
  }
  
  // Update visitor trend chart
  if (visitorTrendChart) {
    visitorTrendChart.data.labels = labels;
    visitorTrendChart.data.datasets[0].data = visitorData;
    visitorTrendChart.update('none');
  }
  
  // Page views by section
  const pageViewsData = {
    labels: pages.length > 0 ? pages : ['Home', 'Portfolio', 'Projects', 'Blog', 'Guestbook'],
    data: pages.length > 0 
      ? pages.map(page => parseInt(localStorage.getItem(`views_${page}`) || Math.floor(Math.random() * 100 + 10)))
      : [245, 189, 156, 98, 67]
  };
  
  if (pageViewsChart) {
    pageViewsChart.data.labels = pageViewsData.labels;
    pageViewsChart.data.datasets[0].data = pageViewsData.data;
    pageViewsChart.update('none');
  }
  
  // Traffic sources
  if (trafficSourceChart) {
    trafficSourceChart.data.labels = ['Direct', 'Social Media', 'Search Engine', 'Referral'];
    trafficSourceChart.data.datasets[0].data = [
      Math.floor(visits * 0.45),
      Math.floor(visits * 0.25),
      Math.floor(visits * 0.20),
      Math.floor(visits * 0.10)
    ];
    trafficSourceChart.update('none');
  }
  
  // Project engagement
  if (projectEngagementChart) {
    projectEngagementChart.data.labels = ['Cosmic E-commerce', 'Stellar Mobile', 'AI Constellation', 'Galactic Web'];
    projectEngagementChart.data.datasets[0].data = [1245, 856, 643, 512];
    projectEngagementChart.data.datasets[1].data = [89, 67, 45, 34];
    projectEngagementChart.update('none');
  }
  
  // Update metrics
  const liveVisitors = Math.floor(Math.random() * 50) + 120;
  const uniqueToday = Math.floor(visits * 0.6);
  const totalViews = visits + Math.floor(Math.random() * 1000);
  const avgSession = '5m 23s';
  
  updateMetric('liveVisitors', liveVisitors);
  updateMetric('uniqueToday', uniqueToday);
  updateMetric('totalViews', totalViews.toLocaleString());
  updateMetric('avgSession', avgSession);
  updateMetric('peakVisitors', Math.max(...visitorData));
  
  // Update engagement metrics
  updateEngagementMetrics();
  
  // Update activity feed
  updateActivityFeed();
}

/**
 * Update dashboard with API data
 */
function updateDashboard(data) {
  // Update metrics
  if (data.metrics) {
    updateMetric('liveVisitors', data.metrics.liveVisitors || 0);
    updateMetric('uniqueToday', data.metrics.uniqueToday || 0);
    updateMetric('totalViews', (data.metrics.totalViews || 0).toLocaleString());
    updateMetric('avgSession', data.metrics.avgSession || '0m');
    updateMetric('peakVisitors', data.metrics.peakVisitors || 0);
  }
  
  // Update charts
  if (data.charts) {
    if (data.charts.visitorTrend && visitorTrendChart) {
      visitorTrendChart.data.labels = data.charts.visitorTrend.labels || [];
      visitorTrendChart.data.datasets[0].data = data.charts.visitorTrend.data || [];
      visitorTrendChart.update('none');
    }
    
    if (data.charts.pageViews && pageViewsChart) {
      pageViewsChart.data.labels = data.charts.pageViews.labels || [];
      pageViewsChart.data.datasets[0].data = data.charts.pageViews.data || [];
      pageViewsChart.update('none');
    }
    
    if (data.charts.trafficSources && trafficSourceChart) {
      trafficSourceChart.data.labels = data.charts.trafficSources.labels || [];
      trafficSourceChart.data.datasets[0].data = data.charts.trafficSources.data || [];
      trafficSourceChart.update('none');
    }
    
    if (data.charts.projectEngagement && projectEngagementChart) {
      projectEngagementChart.data.labels = data.charts.projectEngagement.labels || [];
      projectEngagementChart.data.datasets[0].data = data.charts.projectEngagement.views || [];
      projectEngagementChart.data.datasets[1].data = data.charts.projectEngagement.likes || [];
      projectEngagementChart.update('none');
    }
  }
  
  // Update engagement metrics
  if (data.engagement) {
    updateEngagementMetrics(data.engagement);
  }
  
  // Update activity feed
  if (data.activities) {
    updateActivityFeed(data.activities);
  }
}

/**
 * Update a metric value with animation
 */
function updateMetric(metricId, value) {
  const element = document.getElementById(metricId);
  if (element) {
    const oldValue = element.textContent;
    if (oldValue !== String(value)) {
      element.classList.add('updating');
      element.textContent = value;
      setTimeout(() => {
        element.classList.remove('updating');
      }, 600);
    }
  }
}

/**
 * Update engagement metrics
 */
function updateEngagementMetrics(data = null) {
  const metrics = data || {
    guestbookEntries: 27 + Math.floor(Math.random() * 10),
    blogComments: 43 + Math.floor(Math.random() * 5),
    projectLikes: 156 + Math.floor(Math.random() * 15),
    portfolioViews: 2450 + Math.floor(Math.random() * 200),
    newUsers: 8 + Math.floor(Math.random() * 3),
    bounceRate: (12 + Math.random() * 3).toFixed(0) + '%',
    avgTimeOnSite: '5m 23s'
  };
  
  updateMetric('guestbookEntries', metrics.guestbookEntries);
  updateMetric('blogComments', metrics.blogComments);
  updateMetric('projectLikes', metrics.projectLikes);
  updateMetric('portfolioViews', metrics.portfolioViews.toLocaleString());
  updateMetric('newUsers', metrics.newUsers);
  updateMetric('bounceRate', metrics.bounceRate);
  updateMetric('avgTimeOnSite', metrics.avgTimeOnSite);
}

/**
 * Update activity feed
 */
function updateActivityFeed(activities = null) {
  const feed = document.getElementById('activityFeed');
  if (!feed) return;
  
  // Use provided activities or generate demo activities
  if (!activities) {
    activities = generateDemoActivities();
  }
  
  // Clear existing items (keep first 5)
  const existingItems = feed.querySelectorAll('.activity-item');
  if (existingItems.length > 0 && activities.length > 0) {
    // Remove all but keep structure
    existingItems.forEach((item, index) => {
      if (index < activities.length) {
        item.querySelector('.activity-time').textContent = activities[index].time;
        item.querySelector('.activity-desc').innerHTML = activities[index].description;
      }
    });
    
    // Add new items if needed
    if (activities.length > existingItems.length) {
      for (let i = existingItems.length; i < activities.length; i++) {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
          <span class="activity-time">${activities[i].time}</span>
          <p class="activity-desc">${activities[i].description}</p>
        `;
        feed.appendChild(item);
      }
    }
  }
}

/**
 * Generate demo activities
 */
function generateDemoActivities() {
  const locations = ['New Delhi', 'Mumbai', 'Bangalore', 'San Francisco', 'New York', 'London', 'Tokyo'];
  const pages = ['Portfolio', 'Projects', 'Blog', 'Guestbook', 'Analytics'];
  const actions = ['viewed', 'liked', 'commented on'];
  const projects = ['E-commerce', 'React Tips', 'Cosmic UI'];
  
  const activities = [];
  const now = Date.now();
  
  for (let i = 0; i < 5; i++) {
    const minutesAgo = i * 2 + Math.floor(Math.random() * 3);
    const time = minutesAgo === 0 ? '🟢 Just now' : `🟢 ${minutesAgo} mins ago`;
    
    let description = '';
    const actionType = Math.random();
    
    if (actionType < 0.33) {
      description = `Visitor from <strong>${locations[Math.floor(Math.random() * locations.length)]}</strong> viewed <strong>${pages[Math.floor(Math.random() * pages.length)]}</strong>`;
    } else if (actionType < 0.66) {
      description = `Someone ${actions[Math.floor(Math.random() * actions.length)]} <strong>"${projects[Math.floor(Math.random() * projects.length)]}"</strong> project`;
    } else {
      description = `Guestbook entry signed by <strong>Anonymous</strong>`;
    }
    
    activities.push({ time, description });
  }
  
  return activities;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Time range selector
  const timeRangeSelect = document.getElementById('timeRange');
  if (timeRangeSelect) {
    timeRangeSelect.addEventListener('change', function(e) {
      currentTimeRange = e.target.value;
      loadAnalyticsData();
    });
  }
  
  // Auto-refresh toggle
  const autoRefreshCheckbox = document.getElementById('autoRefresh');
  if (autoRefreshCheckbox) {
    autoRefreshCheckbox.addEventListener('change', function(e) {
      isAutoRefreshEnabled = e.target.checked;
      if (isAutoRefreshEnabled) {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    });
  }
  
  // Refresh button
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async function() {
      refreshBtn.textContent = '🔄 Refreshing...';
      refreshBtn.disabled = true;
      await loadAnalyticsData();
      updateLastUpdateTime();
      setTimeout(() => {
        refreshBtn.textContent = '🔄 Refresh';
        refreshBtn.disabled = false;
      }, 1000);
    });
  }
  
  // Export buttons
  const exportPDF = document.getElementById('exportPDF');
  if (exportPDF) {
    exportPDF.addEventListener('click', function() {
      window.print();
    });
  }
  
  const exportCSV = document.getElementById('exportCSV');
  if (exportCSV) {
    exportCSV.addEventListener('click', function() {
      exportToCSV();
    });
  }
  
  // Load more activities
  const loadMoreBtn = document.getElementById('loadMoreActivity');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function() {
      const activities = generateDemoActivities();
      updateActivityFeed([...generateDemoActivities(), ...activities]);
    });
  }
}

/**
 * Start auto-refresh
 */
function startAutoRefresh() {
  stopAutoRefresh(); // Clear any existing interval
  refreshInterval = setInterval(async () => {
    await loadAnalyticsData();
    updateLastUpdateTime();
  }, 2000); // Refresh every 2 seconds
}

/**
 * Stop auto-refresh
 */
function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

/**
 * Update last update time
 */
function updateLastUpdateTime() {
  const lastUpdate = document.getElementById('lastUpdate');
  if (lastUpdate) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
    lastUpdate.textContent = `Updated at ${timeStr}`;
  }
}

/**
 * Load demo data (fallback)
 */
function loadDemoData() {
  console.log('Loading demo analytics data');
  loadDataFromLocalStorage();
}

/**
 * Export data to CSV
 */
function exportToCSV() {
  // Get current chart data
  let csv = 'Metric,Value\n';
  
  const metrics = [
    ['Live Visitors', document.getElementById('liveVisitors')?.textContent || '0'],
    ['Unique Today', document.getElementById('uniqueToday')?.textContent || '0'],
    ['Total Views', document.getElementById('totalViews')?.textContent || '0'],
    ['Avg Session', document.getElementById('avgSession')?.textContent || '0'],
  ];
  
  metrics.forEach(([label, value]) => {
    csv += `${label},${value}\n`;
  });
  
  // Create download link
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  
  console.log('📥 Analytics data exported to CSV');
}

// Clean up on page unload
window.addEventListener('beforeunload', function() {
  stopAutoRefresh();
});

