# Cosmic DevSpace - Environment Setup Script
# This script helps you create the .env file

Write-Host ""
Write-Host "🚀 Cosmic DevSpace - Environment Setup" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env already exists
if (Test-Path ".env") {
    Write-Host "⚠️  .env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (yes/no)"
    if ($overwrite -ne "yes") {
        Write-Host "❌ Setup cancelled." -ForegroundColor Red
        exit
    }
}

Write-Host ""
Write-Host "📝 Let's set up your MongoDB connection..." -ForegroundColor Green
Write-Host ""
Write-Host "Do you want to use:" -ForegroundColor Yellow
Write-Host "  1. MongoDB Atlas (Cloud - FREE, Recommended)" -ForegroundColor White
Write-Host "  2. Local MongoDB (Advanced)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1 or 2)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "📋 MongoDB Atlas Setup Steps:" -ForegroundColor Cyan
    Write-Host "  1. Go to: https://www.mongodb.com/cloud/atlas/register" -ForegroundColor White
    Write-Host "  2. Create a FREE account and cluster" -ForegroundColor White
    Write-Host "  3. Create a database user" -ForegroundColor White
    Write-Host "  4. Whitelist your IP (Allow from Anywhere)" -ForegroundColor White
    Write-Host "  5. Get your connection string from 'Connect' button" -ForegroundColor White
    Write-Host ""
    Write-Host "Example connection string format:" -ForegroundColor Yellow
    Write-Host "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/cosmic-devspace?retryWrites=true&w=majority" -ForegroundColor Gray
    Write-Host ""
    
    $mongoUri = Read-Host "Paste your MongoDB Atlas connection string here"
    
    if ([string]::IsNullOrWhiteSpace($mongoUri)) {
        Write-Host "❌ No connection string provided. Using default local MongoDB." -ForegroundColor Red
        $mongoUri = "mongodb://localhost:27017/cosmic-devspace"
    }
} else {
    Write-Host "📝 Using local MongoDB at: mongodb://localhost:27017/cosmic-devspace" -ForegroundColor Green
    Write-Host "⚠️  Make sure MongoDB is installed and running!" -ForegroundColor Yellow
    $mongoUri = "mongodb://localhost:27017/cosmic-devspace"
}

# Generate random secrets
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 40 | % {[char]$_})
$refreshSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 40 | % {[char]$_})
$sessionSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 40 | % {[char]$_})

# Create .env file
$envContent = @"
# Cosmic DevSpace Environment Configuration
# Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Database
MONGODB_URI=$mongoUri

# JWT Configuration
JWT_SECRET=$jwtSecret
JWT_REFRESH_SECRET=$refreshSecret
JWT_EXPIRES_IN=7d

# Server Configuration  
PORT=5000
NODE_ENV=development
HOST=localhost

# Frontend URL
FRONTEND_URL=http://localhost:8080

# Session Secret
SESSION_SECRET=$sessionSecret

# Optional Settings
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
"@

# Write to .env file
$envContent | Out-File -FilePath ".env" -Encoding UTF8

Write-Host ""
Write-Host "✅ .env file created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Make sure MongoDB is running (if using local)" -ForegroundColor White
Write-Host "  2. Run: npm start" -ForegroundColor Yellow
Write-Host "  3. In another terminal, run: cd frontend && python -m http.server 8080" -ForegroundColor Yellow
Write-Host "  4. Open: http://localhost:8080" -ForegroundColor Yellow
Write-Host ""
Write-Host "🎉 Happy coding!" -ForegroundColor Magenta
Write-Host ""
"@
