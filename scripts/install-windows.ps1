param(
  [string]$ExePath = ".\dist\priyoscript.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ExePath)) {
  throw "Executable not found at '$ExePath'. Build it first with: npm run dist:win"
}

$targetDir = Join-Path $env:LOCALAPPDATA "Programs\PriyoScript"
if (-not (Test-Path $targetDir)) {
  New-Item -ItemType Directory -Path $targetDir | Out-Null
}

$targetExe = Join-Path $targetDir "monalisa.exe"
Copy-Item -Path $ExePath -Destination $targetExe -Force

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (-not $userPath) {
  $userPath = ""
}

$pathParts = $userPath.Split(";") | Where-Object { $_ -and $_.Trim() -ne "" }
if ($pathParts -notcontains $targetDir) {
  $newPath = if ($userPath.Trim() -eq "") { $targetDir } else { "$userPath;$targetDir" }
  [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
  $pathUpdated = $true
} else {
  $pathUpdated = $false
}

Write-Host "PriyoScript installed for current user." -ForegroundColor Green
Write-Host "Executable: $targetExe"

if ($pathUpdated) {
  Write-Host "PATH updated. Open a new terminal before using 'monalisa'." -ForegroundColor Yellow
} else {
  Write-Host "PATH already contained installation folder." -ForegroundColor Cyan
}

Write-Host "Try: monalisa -h" -ForegroundColor Cyan
