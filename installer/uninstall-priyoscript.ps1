param(
  [ValidateSet("User", "Machine")]
  [string]$Scope = "User",
  [string]$InstallDir,
  [switch]$Silent
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

function Remove-PathEntry([string]$installScope, [string]$value) {
  $target = if ($installScope -eq "Machine") { "Machine" } else { "User" }
  $pathValue = [Environment]::GetEnvironmentVariable("Path", $target)
  if (-not $pathValue) {
    return $false
  }

  $parts = $pathValue.Split(";") | Where-Object { $_ -and $_.Trim() -ne "" }
  $filtered = @()
  $removed = $false

  foreach ($entry in $parts) {
    if ($entry.Trim().ToLowerInvariant() -eq $value.Trim().ToLowerInvariant()) {
      $removed = $true
      continue
    }
    $filtered += $entry
  }

  if ($removed) {
    [Environment]::SetEnvironmentVariable("Path", ($filtered -join ";"), $target)
  }

  return $removed
}

if (-not $InstallDir -or $InstallDir.Trim() -eq "") {
  $InstallDir = if ($Scope -eq "Machine") {
    Join-Path $env:ProgramFiles "PriyoScript"
  } else {
    Join-Path $env:LOCALAPPDATA "Programs\PriyoScript"
  }
}

if ($Scope -eq "Machine" -and -not (Test-IsAdmin)) {
  throw "Machine uninstall requires an elevated PowerShell session (Run as Administrator)."
}

$binDir = Join-Path $InstallDir "bin"
$pathRemoved = Remove-PathEntry -installScope $Scope -value $binDir

$uninstallKey = Get-UninstallKeyPath -installScope $Scope
if (Test-Path $uninstallKey) {
  Remove-Item -Path $uninstallKey -Recurse -Force
}

if (Test-Path $InstallDir) {
  Remove-Item -Path $InstallDir -Recurse -Force
}

if (-not $Silent) {
  Write-Host "PriyoScript uninstalled." -ForegroundColor Green
  Write-Host "Removed install dir: $InstallDir"
  if ($pathRemoved) {
    Write-Host "PATH entry removed for $Scope scope." -ForegroundColor Yellow
  }
}
