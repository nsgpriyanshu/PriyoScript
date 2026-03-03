$ErrorActionPreference = "Stop"

Write-Host "Building PriyoScript Windows executable..." -ForegroundColor Cyan

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..." -ForegroundColor Yellow
  npm install
}

if (-not (Test-Path "dist")) {
  New-Item -ItemType Directory -Path "dist" | Out-Null
}

npx pkg . --targets node18-win-x64 --output dist/priyoscript.exe

$exePath = Join-Path (Get-Location) "dist/priyoscript.exe"
if (-not (Test-Path $exePath)) {
  throw "Build failed: dist/priyoscript.exe was not generated."
}

$hash = Get-FileHash -Algorithm SHA256 -Path $exePath
$hash | Format-List

Write-Host ""
Write-Host "Build complete:" -ForegroundColor Green
Write-Host "  $exePath" -ForegroundColor Green
Write-Host ""
Write-Host "Run with: .\\dist\\priyoscript.exe -h" -ForegroundColor Cyan
Write-Host "Install for current user with: npm run dist:win:install:user" -ForegroundColor Cyan
