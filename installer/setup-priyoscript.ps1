param(
  [ValidateSet("User", "Machine")]
  [string]$Scope = "User",
  [string]$InstallDir,
  [string]$SourceExe,
  [string]$Version = "unknown",
  [switch]$NoPath,
  [switch]$NoShim
)

$ErrorActionPreference = "Stop"

function Test-IsAdmin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-UninstallKeyPath([string]$installScope) {
  if ($installScope -eq "Machine") {
    return "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\PriyoScript"
  }
  return "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\PriyoScript"
}

function Set-PathEntry([string]$installScope, [string]$value) {
  $target = if ($installScope -eq "Machine") { "Machine" } else { "User" }
  $pathValue = [Environment]::GetEnvironmentVariable("Path", $target)
  if (-not $pathValue) { $pathValue = "" }

  $parts = $pathValue.Split(";") | Where-Object { $_ -and $_.Trim() -ne "" }
  $alreadyPresent = $false
  foreach ($entry in $parts) {
    if ($entry.Trim().ToLowerInvariant() -eq $value.Trim().ToLowerInvariant()) {
      $alreadyPresent = $true
      break
    }
  }

  if (-not $alreadyPresent) {
    $newPath = if ($pathValue.Trim() -eq "") { $value } else { "$pathValue;$value" }
    [Environment]::SetEnvironmentVariable("Path", $newPath, $target)
    return $true
  }

  return $false
}

if (-not $InstallDir -or $InstallDir.Trim() -eq "") {
  $InstallDir = if ($Scope -eq "Machine") {
    Join-Path $env:ProgramFiles "PriyoScript"
  } else {
    Join-Path $env:LOCALAPPDATA "Programs\PriyoScript"
  }
}

if ($Scope -eq "Machine" -and -not (Test-IsAdmin)) {
  throw "Machine install requires an elevated PowerShell session (Run as Administrator)."
}

if (-not $SourceExe -or $SourceExe.Trim() -eq "") {
  $SourceExe = Join-Path $PSScriptRoot "payload\priyoscript.exe"
}

if (-not (Test-Path $SourceExe)) {
  throw "Installer payload not found: '$SourceExe'."
}

$binDir = Join-Path $InstallDir "bin"
if (-not (Test-Path $binDir)) {
  New-Item -ItemType Directory -Path $binDir -Force | Out-Null
}

$targetExe = Join-Path $binDir "priyoscript.exe"
Copy-Item -Path $SourceExe -Destination $targetExe -Force

if (-not $NoShim) {
  $shimContent = "@echo off`r`n`"%~dp0priyoscript.exe`" %*`r`n"
  Set-Content -Path (Join-Path $binDir "monalisa.cmd") -Value $shimContent -Encoding ASCII
  Set-Content -Path (Join-Path $binDir "priyoscript.cmd") -Value $shimContent -Encoding ASCII
}

$copiedLicense = $false
$sourceLicense = Join-Path $PSScriptRoot "payload\LICENSE"
if (Test-Path $sourceLicense) {
  Copy-Item -Path $sourceLicense -Destination (Join-Path $InstallDir "LICENSE") -Force
  $copiedLicense = $true
}

$copiedReadme = $false
$sourceReadme = Join-Path $PSScriptRoot "payload\README.md"
if (Test-Path $sourceReadme) {
  Copy-Item -Path $sourceReadme -Destination (Join-Path $InstallDir "README.md") -Force
  $copiedReadme = $true
}

$uninstallSource = Join-Path $PSScriptRoot "uninstall-priyoscript.ps1"
$uninstallTarget = Join-Path $InstallDir "uninstall-priyoscript.ps1"
if (-not (Test-Path $uninstallSource)) {
  throw "Uninstaller template not found at '$uninstallSource'."
}
Copy-Item -Path $uninstallSource -Destination $uninstallTarget -Force

$pathUpdated = $false
if (-not $NoPath) {
  $pathUpdated = Set-PathEntry -installScope $Scope -value $binDir
}

$metadata = @{
  product = "PriyoScript"
  version = $Version
  scope = $Scope
  installDir = $InstallDir
  binDir = $binDir
  installedAt = (Get-Date).ToString("o")
  pathUpdated = $pathUpdated
  copiedLicense = $copiedLicense
  copiedReadme = $copiedReadme
}

$installMetadataPath = Join-Path $InstallDir "install.json"
$metadata | ConvertTo-Json -Depth 4 | Set-Content -Path $installMetadataPath -Encoding UTF8

$uninstallKey = Get-UninstallKeyPath -installScope $Scope
if (-not (Test-Path $uninstallKey)) {
  New-Item -Path $uninstallKey -Force | Out-Null
}

$uninstallCommand = "powershell -ExecutionPolicy Bypass -File `"$uninstallTarget`" -Scope $Scope -InstallDir `"$InstallDir`""

Set-ItemProperty -Path $uninstallKey -Name "DisplayName" -Value "PriyoScript"
Set-ItemProperty -Path $uninstallKey -Name "DisplayVersion" -Value $Version
Set-ItemProperty -Path $uninstallKey -Name "Publisher" -Value "nsgpriyanshu"
Set-ItemProperty -Path $uninstallKey -Name "InstallLocation" -Value $InstallDir
Set-ItemProperty -Path $uninstallKey -Name "UninstallString" -Value $uninstallCommand
Set-ItemProperty -Path $uninstallKey -Name "QuietUninstallString" -Value ($uninstallCommand + " -Silent")

Write-Host "PriyoScript installation completed." -ForegroundColor Green
Write-Host "Scope: $Scope"
Write-Host "Install Directory: $InstallDir"
Write-Host "Executable: $targetExe"

if ($pathUpdated) {
  Write-Host "PATH updated for $Scope scope. Open a new terminal before using 'monalisa'." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Try commands:" -ForegroundColor Cyan
Write-Host "  monalisa -h" -ForegroundColor Cyan
Write-Host "  monalisa -repl" -ForegroundColor Cyan
