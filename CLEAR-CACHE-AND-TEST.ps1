# Clear Cache and Test Script
# This script helps you test the "My Projects Only" feature

Write-Host ""
Write-Host "🧹 Cosmic DevSpace - Clear Cache & Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if servers are running
Write-Host "🔍 Checking servers..." -ForegroundColor Yellow

$backendRunning = $false
$frontendRunning = $false

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $backendRunning = $true
        Write-Host "✅ Backend: Running on port 5000" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Backend: Not running" -ForegroundColor Red
    Write-Host "   Please start with: npm start" -ForegroundColor Yellow
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $frontendRunning = $true
        Write-Host "✅ Frontend: Running on port 8080" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Frontend: Not running" -ForegroundColor Red
    Write-Host "   Please start with: cd frontend; python -m http.server 8080" -ForegroundColor Yellow
}

Write-Host ""

if (-not $backendRunning -or -not $frontendRunning) {
    Write-Host "⚠️  Please start both servers before testing!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

# Instructions
Write-Host "📋 Testing Instructions:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. I will open the projects page in your default browser" -ForegroundColor White
Write-Host "2. Press F12 to open Developer Tools" -ForegroundColor White
Write-Host "3. Go to the 'Console' tab" -ForegroundColor White
Write-Host "4. Look for this message:" -ForegroundColor White
Write-Host "   🚀 Projects.js loaded - Version 2025-11-07-02" -ForegroundColor Green
Write-Host ""
Write-Host "5. If you DON'T see that version message:" -ForegroundColor Yellow
Write-Host "   → Press Ctrl+Shift+Delete to clear cache" -ForegroundColor Yellow
Write-Host "   → OR Press Ctrl+F5 for hard refresh" -ForegroundColor Yellow
Write-Host "   → OR Close ALL browser windows and reopen" -ForegroundColor Yellow
Write-Host ""
Write-Host "6. Test the 'My Projects Only' toggle:" -ForegroundColor White
Write-Host "   • ON = Shows only YOUR projects" -ForegroundColor White
Write-Host "   • OFF = Shows all public projects" -ForegroundColor White
Write-Host ""

$continue = Read-Host "Ready to open the browser? (Y/n)"
if ($continue -ne "" -and $continue -ne "y" -and $continue -ne "Y") {
    Write-Host "Test cancelled." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "🌐 Opening projects page..." -ForegroundColor Cyan
Start-Process "http://localhost:8080/projects.html"

Write-Host ""
Write-Host "✅ Browser opened!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 What to check:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Console should show:" -ForegroundColor White
Write-Host "  🚀 Projects.js loaded - Version 2025-11-07-02" -ForegroundColor Green
Write-Host "  ✅ Projects page detected, initializing..." -ForegroundColor Green
Write-Host "  📌 Initial showMyItems state: true" -ForegroundColor Green
Write-Host "  ✅ FILTERING: Showing only MY projects..." -ForegroundColor Green
Write-Host ""
Write-Host "Network tab should show:" -ForegroundColor White
Write-Host "  Request: /api/portfolio?myItems=true&sort=-createdAt" -ForegroundColor Green
Write-Host ""
Write-Host "If toggle is ON and you see NO projects:" -ForegroundColor Yellow
Write-Host "  ✅ This is CORRECT if you haven't created any yet!" -ForegroundColor Green
Write-Host "  → Click '+ Create Project' to add your first project" -ForegroundColor White
Write-Host ""
Write-Host "If you still see random projects when toggle is ON:" -ForegroundColor Red
Write-Host "  ❌ Cache issue - clear browser cache completely" -ForegroundColor Red
Write-Host "  → Close ALL browser tabs/windows" -ForegroundColor Yellow
Write-Host "  → Reopen and try again" -ForegroundColor Yellow
Write-Host "  → Or use Incognito mode (Ctrl+Shift+N)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
