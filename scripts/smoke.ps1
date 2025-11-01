$ErrorActionPreference = "Stop"

function Test-Http200 {
  param(
    [Parameter(Mandatory=$true)][string]$Url
  )
  $resp = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 10
  if ($resp.StatusCode -ne 200) {
    Write-Host "FAIL $Url -> $($resp.StatusCode)" -ForegroundColor Red
    return $false
  }
  Write-Host "OK   $Url" -ForegroundColor Green
  return $true
}

function Test-Health {
  param([string]$Url)
  $resp = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 10
  if ($resp.StatusCode -ne 200) {
    Write-Host "FAIL $Url -> $($resp.StatusCode)" -ForegroundColor Red
    return $false
  }
  $json = $resp.Content | ConvertFrom-Json
  if (-not $json.status -or -not $json.time) {
    Write-Host "FAIL $Url missing fields" -ForegroundColor Red
    return $false
  }
  Write-Host "OK   $Url {status=$($json.status)}" -ForegroundColor Green
  return $true
}

$base = $env:APP_URL
if ([string]::IsNullOrWhiteSpace($base)) { $base = "http://localhost:4321" }

$ok = $true
$ok = (Test-Http200 "$base/") -and $ok
$ok = (Test-Health "$base/api/health") -and $ok
$ok = (Test-Http200 "$base/auth/login") -and $ok
$ok = (Test-Http200 "$base/auth/register") -and $ok

if (-not $ok) { exit 1 } else { exit 0 }


