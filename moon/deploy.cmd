@echo off
setlocal
cd /d "%~dp0"

rem ---------------------------------------------------------------
rem  Yuejian / Moonborn  ->  Vercel
rem  Double-click this file. A browser opens for the Vercel login.
rem ---------------------------------------------------------------

set "NODE=C:\Users\16023\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
set "VC=E:\zy\.vercel-tools\node_modules\vercel\dist\index.js"
set "PROJECT=moonborn"

title Moonborn - deploy to Vercel

if not exist "%VC%" (
  echo.
  echo  [x] Vercel CLI not found:
  echo      %VC%
  echo.
  echo      Fix:  npm i -g vercel
  echo      Then: vercel login  ^&^&  vercel deploy --prod
  echo.
  pause
  exit /b 1
)

if not exist "%NODE%" set "NODE=node"

echo.
echo  ============================================
echo    MOONBORN  -  deploy to Vercel
echo  ============================================
echo.
echo  Step 1 of 2 : log in
echo.
echo  A browser window will open. Sign in with GitHub / Google / email.
echo  When it says you are logged in, CLOSE the browser and come back here.
echo.
pause

"%NODE%" "%VC%" login
if errorlevel 1 (
  echo.
  echo  [x] Login failed or was cancelled. Nothing was deployed.
  echo      Run this file again and finish the login in the browser.
  echo.
  pause
  exit /b 1
)

echo.
echo  Logged in as:
"%NODE%" "%VC%" whoami

echo.
echo  Step 2 of 2 : deploying to production ...
echo.
"%NODE%" "%VC%" deploy --prod --yes --project %PROJECT% --create-if-missing
if errorlevel 1 (
  echo.
  echo  [x] Deploy failed.
  echo      If it says the name "%PROJECT%" is already taken, open this file
  echo      in Notepad, change  set "PROJECT=moonborn"  to another name,
  echo      save, then run it again.
  echo.
  pause
  exit /b 1
)

echo.
echo  ============================================
echo    Done. The https://....vercel.app URL above is live.
echo    Run this file again any time you change the site.
echo  ============================================
echo.
pause
