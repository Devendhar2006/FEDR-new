# Cosmic DevSpace - Application Starter
# Runs both backend and frontend servers

Write-Host ""
Write-Host "🚀 Starting Cosmic DevSpace..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-Not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run setup first:" -ForegroundColor Yellow
    Write-Host "  .\setup-env.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Or create .env file manually following .env.TEMPLATE" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Check if node_modules exists
if (-Not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Environment configured" -ForegroundColor Green
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Kill any existing node processes on port 5000
Write-Host "🧹 Cleaning up old processes..." -ForegroundColor Yellow
$processes = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($processes) {
    $processes | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Write-Host "✅ Cleaned up old processes" -ForegroundColor Green
}
Write-Host ""

# Start backend
Write-Host "🔧 Starting Backend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; Write-Host '🚀 BACKEND SERVER' -ForegroundColor Cyan; npm start"

# Wait a bit for backend to start
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if backend is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend is running on http://localhost:5000" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Backend might still be starting... Check the backend window" -ForegroundColor Yellow
}

Write-Host ""

# Start frontend
Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host '🎨 FRONTEND SERVER' -ForegroundColor Cyan; python -m http.server 8080"

Write-Host ""
Write-Host "✅ Servers started!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Server Status:" -ForegroundColor Cyan
Write-Host "  Backend (API):  http://localhost:5000" -ForegroundColor White
Write-Host "  Frontend (UI):  http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Open your browser to: http://localhost:8080" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 To stop servers:" -ForegroundColor Cyan
Write-Host "  Close the backend and frontend PowerShell windows" -ForegroundColor White
Write-Host "  Or run: taskkill /F /IM node.exe" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Happy coding!" -ForegroundColor Magenta
Write-Host ""

# Keep this window open
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
