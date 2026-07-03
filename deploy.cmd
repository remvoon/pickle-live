@echo off
setlocal enabledelayedexpansion
echo ===== Deploying Pickle-Live to Cloudflare =====
echo.

:: Change to project directory
cd /d "%~dp0"

:: Use the PAT API token from environment variable (no browser auth)
if "%BOTC_CF_API_TOKEN%"=="" (
    echo [ERROR] BOTC_CF_API_TOKEN environment variable is not set.
    echo Please set it to your Cloudflare API token with Workers and Pages permissions.
    echo Example: setx BOTC_CF_API_TOKEN "your-token-here" (requires restart)
    pause
    exit /b 1
)

:: Pass the token to wrangler
set CLOUDFLARE_API_TOKEN=%BOTC_CF_API_TOKEN%
echo Using Cloudflare API token from BOTC_CF_API_TOKEN (non-interactive mode)
echo.

:: Check if wrangler is available
where wrangler >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] wrangler not found. Make sure it's installed and in PATH.
    echo Run: npm install -g wrangler
    pause
    exit /b 1
)

:: Step 1: Apply D1 migrations
echo [1/5] Applying D1 database migrations...
npx wrangler d1 migrations apply pickle-live-db --remote
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Migration may have failed. Check your D1 database configuration.
)

:: Step 2: Deploy Worker API
echo [2/5] Deploying Worker API...
cd /d "%~dp0worker"
npx wrangler deploy --routes-only=false
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Worker deployment failed.
    pause
    exit /b 1
)

:: Step 3: Build frontend
echo [3/5] Building Frontend...
cd /d "%~dp0frontend"
call npx vite build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b 1
)

:: Step 4: Deploy to Cloudflare Pages
echo [4/5] Deploying Frontend to Cloudflare Pages...
npx wrangler pages deploy dist --project-name=pickle-live
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend deployment failed.
    pause
    exit /b 1
)

:: Step 5: Set secrets (non-interactive from environment if available)
echo [5/5] Setting secrets...
cd /d "%~dp0"

:: ADMIN_PASSWORD - check environment first, then prompt
if not "%ADMIN_PASSWORD%"=="" (
    echo Setting ADMIN_PASSWORD from environment variable...
    echo %ADMIN_PASSWORD% | npx wrangler secret put ADMIN_PASSWORD
) else (
    npx wrangler secret list 2>nul | findstr ADMIN_PASSWORD >nul
    if !ERRORLEVEL! neq 0 (
        echo.
        echo ADMIN_PASSWORD secret not set. Please enter the admin password:
        npx wrangler secret put ADMIN_PASSWORD
    )
)

:: JWT_SECRET - optional, reuse ADMIN_PASSWORD if not set
if not "%JWT_SECRET%"=="" (
    echo Setting JWT_SECRET from environment variable...
    echo %JWT_SECRET% | npx wrangler secret put JWT_SECRET
) else (
    echo JWT_SECRET not set - the API will use ADMIN_PASSWORD as JWT secret.
)

echo.
echo ===== Deployment complete! =====
echo Your Worker API is deployed and Frontend is on Cloudflare Pages.
pause
