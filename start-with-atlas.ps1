# Start Cosmic DevSpace with MongoDB Atlas
$ErrorActionPreference = 'Stop'

Write-Host "🚀 Starting Cosmic DevSpace with MongoDB Atlas..." -ForegroundColor Cyan

# Set environment variables
$env:MONGODB_URI = "mongodb+srv://2410030489_db_user:Svvk%402227@cluster0.x7avxez.mongodb.net/cosmic-devspace?retryWrites=true&w=majority"
$env:JWT_SECRET = "cosmic_super_secret_key_that_is_very_long_and_secure_for_space_authentication_2025"
$env:JWT_REFRESH_SECRET = "cosmic_refresh_secret_key_for_space_tokens_2025"
$env:JWT_EXPIRES_IN = "7d"
$env:PORT = "5050"
$env:HOST = "127.0.0.1"
$env:NODE_ENV = "development"
$env:FRONTEND_URL = "http://127.0.0.1:5050"
$env:ANALYTICS_SECRET = "cosmic_analytics_secret_2025"
$env:ADMIN_EMAIL = "admin@cosmic-devspace.com"

# Navigate to backend directory
Set-Location "c:\Users\Vishwesha\OneDrive\Desktop\FEDF\FEDF Project\cosmic-devspace\backend"

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starting server with MongoDB Atlas connection..." -ForegroundColor Green
Write-Host "Database: MongoDB Atlas Cloud" -ForegroundColor Magenta
Write-Host "Server will be available at http://127.0.0.1:5050" -ForegroundColor Green

# Start the server
node server.js
