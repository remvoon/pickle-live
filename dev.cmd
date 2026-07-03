@echo off
echo ===== Starting Pickle-Live Local Development =====
echo.

:: Change to project directory
cd /d "%~dp0"

:: Install dependencies if needed
if not exist "node_modules" (
    echo Installing root dependencies...
    call npm install
)

if not exist "worker\node_modules" (
    echo Installing worker dependencies...
    cd /d "%~dp0worker"
    call npm install
    cd /d "%~dp0"
)

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd /d "%~dp0frontend"
    call npm install
    cd /d "%~dp0"
)

:: Apply local D1 migrations
echo Applying D1 migrations locally...
npx wrangler d1 migrations apply pickle-live-db --local 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] Local migrations applied or DB already exists.
)

:: Start Worker in background (miniflare)
echo Starting Worker API on port 8787...
start "Pickle-Live Worker" cmd /c "cd /d "%~dp0worker" && npx wrangler dev --port 8787 --ip 127.0.0.1"

:: Wait a moment for worker to start
echo Waiting for Worker to start...
timeout /t 5 /nobreak >nul

:: Start Frontend dev server
echo Starting Frontend dev server on port 5173...
start "Pickle-Live Frontend" cmd /c "cd /d "%~dp0frontend" && npx vite --port 5173 --host 127.0.0.1"

echo.
echo ===== Both servers starting =====
echo Frontend: http://127.0.0.1:5173
echo Worker:  http://127.0.0.1:8787
echo.
echo Close the terminal windows to stop the servers.
pause
