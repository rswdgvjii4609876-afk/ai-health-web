@echo off
setlocal
set "AI_HEALTH_ROOT=%~dp0"

if not exist "%AI_HEALTH_ROOT%backend\target\ai-health-backend-0.0.1-SNAPSHOT.jar" (
  echo Backend JAR not found. Run backend\mvnw.cmd verify first.
  exit /b 1
)
if not exist "%AI_HEALTH_ROOT%frontend\node_modules\vite\bin\vite.js" (
  echo Frontend dependencies not found. Run npm.cmd ci in frontend first.
  exit /b 1
)

powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; $dir=Join-Path $env:AI_HEALTH_ROOT 'backend'; if (-not (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue)) { Start-Process -FilePath 'java.exe' -ArgumentList '-jar','target/ai-health-backend-0.0.1-SNAPSHOT.jar' -WorkingDirectory $dir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $dir 'target/runtime.out.log') -RedirectStandardError (Join-Path $dir 'target/runtime.err.log') }"
if errorlevel 1 goto failed

powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; $dir=Join-Path $env:AI_HEALTH_ROOT 'frontend'; if (-not (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue)) { Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','--host','127.0.0.1','--port','5173','--strictPort' -WorkingDirectory $dir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $dir 'node_modules/demo.out.log') -RedirectStandardError (Join-Path $dir 'node_modules/demo.err.log') }"
if errorlevel 1 goto failed

powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; for ($i=0; $i -lt 30; $i++) { try { $health=Invoke-RestMethod 'http://127.0.0.1:8080/api/health' -TimeoutSec 2; $page=Invoke-WebRequest 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 2; if ($health.status -eq 'ok' -and $page.StatusCode -eq 200) { exit 0 } } catch { }; Start-Sleep -Milliseconds 500 }; exit 1"
if errorlevel 1 goto failed

echo Demo ready: http://127.0.0.1:5173/
start "" "http://127.0.0.1:5173/"
exit /b 0

:failed
echo Demo did not start. Check backend\target\runtime.err.log and frontend\node_modules\demo.err.log.
exit /b 1
