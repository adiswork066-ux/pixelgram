$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$backendDir = $root
$frontendDir = Join-Path $root "frontend"

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$backendDir'; python -m uvicorn backend.server:app --host 127.0.0.1 --port 8000"
)

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$frontendDir'; python serve_build.py"
)

Write-Host "Backend:  http://127.0.0.1:8000/"
Write-Host "Frontend: http://127.0.0.1:3000"
