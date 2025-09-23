const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// Serve index.html for all routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🌌 Cosmic DevSpace Frontend Server running on http://localhost:${PORT}`);
    console.log(`🚀 Open your browser and navigate to: http://localhost:${PORT}`);
    console.log(`✨ Enjoy your cosmic journey!`);
});