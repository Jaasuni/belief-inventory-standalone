param([string]$PagesUrl)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = Resolve-Path (Join-Path $root "..") | Select-Object -ExpandProperty Path

function Fail($msg){ Write-Host "❌ $msg" -ForegroundColor Red; exit 1 }
function Ok($msg){ Write-Host "✅ $msg" -ForegroundColor Green }

Set-Location $repo

# 1) File presence
$files = @("index.html","belief_inventory.html",".nojekyll","README.md","codex_plan.json")
$missing = @(); foreach($f in $files){ if(-not (Test-Path $f)){ $missing += $f } }
if($missing.Count){ Fail "Missing files: $($missing -join ', ')" } else { Ok "All required files exist" }

# 2) Content checks
$idx = Get-Content -Raw -Path "index.html"
$inv = Get-Content -Raw -Path "belief_inventory.html"
if($idx -notmatch "<nav" -or $idx -notmatch "belief_inventory\.html"){ Fail "index.html lacks nav/tile link" } else { Ok "index.html links to tool" }
if($inv -notmatch "localStorage" -or $inv -notmatch "window\.print"){ Fail "belief_inventory.html missing save/print" } else { Ok "belief_inventory.html has save+print" }
if($inv -notmatch "GOOGLE_CLIENT_ID"){ Write-Host "⚠️ Google export stub not detected (ok if offline-only)" } else { Ok "Google export stub detected" }

# 3) Pages check (optional)
if($PagesUrl){
  try{
    $base = $PagesUrl.TrimEnd('/')
    $hub  = Invoke-WebRequest -Uri "$base/index.html" -UseBasicParsing -TimeoutSec 20
    if($hub.StatusCode -ne 200){ Fail "Hub URL status: $($hub.StatusCode)" } else { Ok "Hub URL OK" }
    $tool = Invoke-WebRequest -Uri "$base/belief_inventory.html" -UseBasicParsing -TimeoutSec 20
    if($tool.StatusCode -ne 200){ Fail "Tool URL status: $($tool.StatusCode)" } else { Ok "Tool URL OK" }
    if($tool.Content -notmatch "Belief Inventory"){ Fail "Tool page title missing" } else { Ok "Tool page title detected" }
  } catch { Fail "Pages check failed: $($_.Exception.Message)" }
}else{
  Write-Host "ℹ️ Skipping Pages checks (no -PagesUrl)." -ForegroundColor Yellow
}

Ok "Verification complete."
