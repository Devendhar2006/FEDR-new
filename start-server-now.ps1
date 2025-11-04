# Quick Start Script for Cosmic DevSpace
$ErrorActionPreference = 'Continue'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 COSMIC DEVSPACE SERVER STARTING" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:MONGODB_URI = "mongodb+srv://2410030489_db_user:Svvk%402227@cluster0.x7avxez.mongodb.net/cosmic-devspace?retryWrites=true&w=majority"
$env:JWT_SECRET = "cosmic_super_secret_key_that_is_very_long_and_secure_for_space_authentication_2025"
$env:JWT_REFRESH_SECRET = "cosmic_refresh_secret_key_for_space_tokens_2025"
$env:JWT_EXPIRES_IN = "7d"
$env:PORT = "5050"
$env:HOST = "127.0.0.1"
$env:NODE_ENV = "development"
$env:FRONTEND_URL = "http://127.0.0.1:5050"

Write-Host "✅ Environment variables set" -ForegroundColor Green
Write-Host ""

# Navigate to backend
Set-Location "backend"

Write-Host "📁 Current directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

Write-Host "🚀 Starting Node.js server..." -ForegroundColor Green
Write-Host "🌐 Server will be available at: http://127.0.0.1:5050" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start server
node server.js

