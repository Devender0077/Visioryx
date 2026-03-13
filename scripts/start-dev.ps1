# Visioryx - Start dev (kills busy ports first)
# Usage: .\scripts\start-dev.ps1 [-Target backend|frontend|all]

param(
    [ValidateSet("backend", "frontend", "all")]
    [string]$Target = "all"
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot

function Kill-Port { param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($conn) {
        $conn.OwningProcess | Sort-Object -Unique | ForEach-Object {
            Write-Host "Killing process $_ on port $Port"
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
    }
}

function Start-Backend {
    Write-Host "Starting backend on port 8000..."
    Kill-Port -Port 8000
    Set-Location "$ProjectRoot\backend"
    if (-not (Test-Path "venv")) { python -m venv venv }
    & .\venv\Scripts\Activate.ps1
    pip install -q -r requirements.txt
    Start-Process -NoNewWindow uvicorn -ArgumentList "app.main:app", "--host", "0.0.0.0", "--port", "8000"
    Write-Host "Backend started: http://localhost:8000"
}

function Start-Frontend {
    Write-Host "Starting frontend on port 3000..."
    Kill-Port -Port 3000
    Set-Location "$ProjectRoot\frontend"
    npm install --silent 2>$null
    Start-Process -NoNewWindow npm -ArgumentList "run", "dev"
    Write-Host "Frontend started: http://localhost:3000"
}

switch ($Target) {
    "backend"  { Start-Backend }
    "frontend" { Start-Frontend }
    "all"      { Start-Backend; Start-Sleep -Seconds 2; Start-Frontend }
}
