$ErrorActionPreference = "Stop"

Write-Host "Building PriyoScript Windows installer bundle..." -ForegroundColor Cyan

$root = Resolve-Path "."
$distDir = Join-Path $root "dist"
$installerDir = Join-Path $root "installer"
$exePath = Join-Path $distDir "priyoscript.exe"

if (-not (Test-Path $exePath)) {
  Write-Host "dist/priyoscript.exe not found. Building executable first..." -ForegroundColor Yellow
  & powershell -ExecutionPolicy Bypass -File (Join-Path $root "scripts/build-windows-exe.ps1")
}

if (-not (Test-Path $exePath)) {
  throw "Executable not found after build: $exePath"
}

if (-not (Test-Path (Join-Path $installerDir "setup-priyoscript.ps1"))) {
  throw "Missing installer/setup-priyoscript.ps1"
}

if (-not (Test-Path (Join-Path $installerDir "uninstall-priyoscript.ps1"))) {
  throw "Missing installer/uninstall-priyoscript.ps1"
}

$bundleDir = Join-Path $distDir "priyoscript-installer"
$payloadDir = Join-Path $bundleDir "payload"

if (Test-Path $bundleDir) {
  Remove-Item -Path $bundleDir -Recurse -Force
}

New-Item -ItemType Directory -Path $bundleDir | Out-Null
New-Item -ItemType Directory -Path $payloadDir | Out-Null

Copy-Item -Path (Join-Path $installerDir "setup-priyoscript.ps1") -Destination (Join-Path $bundleDir "setup-priyoscript.ps1")
Copy-Item -Path (Join-Path $installerDir "uninstall-priyoscript.ps1") -Destination (Join-Path $bundleDir "uninstall-priyoscript.ps1")
Copy-Item -Path $exePath -Destination (Join-Path $payloadDir "priyoscript.exe")

if (Test-Path "README.md") {
  Copy-Item -Path "README.md" -Destination (Join-Path $payloadDir "README.md")
}

if (Test-Path "LICENSE") {
  Copy-Item -Path "LICENSE" -Destination (Join-Path $payloadDir "LICENSE")
}

$packageJson = Get-Content package.json -Raw | ConvertFrom-Json
$version = $packageJson.version

$readme = @"
PriyoScript Setup Bundle
========================

Version: $version

Install (User scope):
  powershell -ExecutionPolicy Bypass -File .\setup-priyoscript.ps1 -Scope User -Version $version

Install (Machine scope, admin terminal):
  powershell -ExecutionPolicy Bypass -File .\setup-priyoscript.ps1 -Scope Machine -Version $version

Uninstall:
  powershell -ExecutionPolicy Bypass -File .\uninstall-priyoscript.ps1 -Scope User
"@

Set-Content -Path (Join-Path $bundleDir "README-INSTALLER.txt") -Value $readme -Encoding UTF8

$zipPath = Join-Path $distDir "priyoscript-installer.zip"
if (Test-Path $zipPath) {
  Remove-Item -Path $zipPath -Force
}
Compress-Archive -Path "$bundleDir\*" -DestinationPath $zipPath -CompressionLevel Optimal

$setupExePath = Join-Path $distDir "priyoscript-setup.exe"
if (Get-Command Invoke-PS2EXE -ErrorAction SilentlyContinue) {
  if (Test-Path $setupExePath) {
    Remove-Item -Path $setupExePath -Force
  }

  $iconPath = if (Test-Path "public/assets/favicon.ico") { Resolve-Path "public/assets/favicon.ico" } else { $null }
  $params = @{
    inputFile  = (Join-Path $bundleDir "setup-priyoscript.ps1")
    outputFile = $setupExePath
    noConsole  = $false
    title      = "PriyoScript Setup"
    company    = "nsgpriyanshu"
    product    = "PriyoScript"
    version    = $version
  }
  if ($iconPath) {
    $params["iconFile"] = $iconPath
  }

  Invoke-PS2EXE @params
  Write-Host "Standalone setup launcher generated: $setupExePath" -ForegroundColor Green
} else {
  Write-Host "PS2EXE not found. Skipping setup .exe generation." -ForegroundColor Yellow
  Write-Host "Install via setup script inside bundle zip." -ForegroundColor Yellow
}

$hash = Get-FileHash -Algorithm SHA256 -Path $zipPath
$hash | Format-List

Write-Host ""
Write-Host "Installer bundle created:" -ForegroundColor Green
Write-Host "  $zipPath" -ForegroundColor Green
Write-Host "  $bundleDir" -ForegroundColor Green
Write-Host ""
Write-Host "Next step:" -ForegroundColor Cyan
Write-Host "  Share priyoscript-installer.zip with end users." -ForegroundColor Cyan
