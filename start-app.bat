@echo off
echo ============================================================
echo  Mercer AI — Startup Sequence
echo ============================================================

echo.
echo [1/4] Cleaning up previous server processes...
powershell -Command "$p = Get-NetTCPConnection -LocalPort 3000, 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique; if ($p) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }"

echo.
echo [2/4] Ensuring Backend Virtual Environment & Dependencies...
if not exist "Visual-Intelligence\product\backend\.venv" (
    echo Creating backend virtual environment...
    cd Visual-Intelligence\product\backend && uv venv --python 3.12 .venv && cd ..\..\..
)
if not exist "Visual-Intelligence\product\backend\.venv\Scripts\uvicorn.exe" (
    echo Installing backend dependencies...
    cd Visual-Intelligence\product\backend && uv pip install -r requirements.txt --python .venv\Scripts\python.exe && cd ..\..\..
)

echo.
echo [3/4] Ensuring Frontend Dependencies...
if not exist "Visual-Intelligence\product\frontend\node_modules" (
    echo Installing frontend node modules...
    cd Visual-Intelligence\product\frontend && npm install && cd ..\..\..
)

echo.
echo [4/4] Starting Backend Server (FastAPI on :8000)...
start "Mercer Backend" cmd /k "cd Visual-Intelligence\product\backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --reload-dir app --host 127.0.0.1 --port 8000"

echo.
echo      Waiting for backend to become healthy...
echo      (Polls /health every 1s — max 30 attempts)
echo.

set /a ATTEMPTS=0
set MAX_ATTEMPTS=30

:WAIT_LOOP
set /a ATTEMPTS+=1
if %ATTEMPTS% GTR %MAX_ATTEMPTS% (
    echo.
    echo [ERROR] Backend did not become healthy after 30s.
    echo         Check the Backend window for errors, then re-run this script.
    pause
    exit /b 1
)

powershell -Command "try { $r = Invoke-WebRequest -Uri http://127.0.0.1:8000/health -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto BACKEND_READY

<nul set /p "=."
ping -n 2 127.0.0.1 >nul
goto WAIT_LOOP

:BACKEND_READY
echo.
echo      Backend is healthy after %ATTEMPTS%s.

echo.
echo Starting Frontend Server (Next.js on :3000)...
start "Mercer Frontend" cmd /k "cd Visual-Intelligence\product\frontend && npm run dev"

echo.
echo ============================================================
echo  Both servers started.
echo  Open http://localhost:3000 in your browser.
echo ============================================================
echo.
