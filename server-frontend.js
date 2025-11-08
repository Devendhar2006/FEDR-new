const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

console.log(`📡 Configuring API proxy: /api -> ${BACKEND_URL}/api`);

// Proxy API requests to backend - MUST be before static files
// Important: mount at root and filter by path to preserve /api prefix
app.use(createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    // Only proxy requests that start with /api
    filter: (pathname, req) => {
        const shouldProxy = pathname.startsWith('/api');
        if (shouldProxy) {
            console.log(`🔄 Proxying ${req.method} ${pathname} to ${BACKEND_URL}${pathname}`);
        }
        return shouldProxy;
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`✅ Proxy response: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
    },
    onError: (err, req, res) => {
        console.error('❌ Proxy error:', err.message);
        res.status(500).json({ error: 'Proxy error', message: err.message });
    }
}));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// Serve index.html for all NON-API routes (SPA support)
app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
    } else {
        // API routes should have been handled by proxy
        res.status(404).json({ error: 'API endpoint not found' });
    }
});

app.listen(PORT, () => {
    console.log(`🌌 Cosmic DevSpace Frontend Server running on http://localhost:${PORT}`);
    console.log(`🚀 Open your browser and navigate to: http://localhost:${PORT}`);
    console.log(`✨ Enjoy your cosmic journey!`);
});