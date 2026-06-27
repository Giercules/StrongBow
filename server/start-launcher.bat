@echo off
REM ===========================================================================
REM  StrongBow Launcher - run this ONCE to get a browser control panel that can
REM  START / STOP / RESTART the game server. Add it to your Windows startup
REM  (shell:startup) to keep control always available.
REM ===========================================================================
cd /d "%~dp0\.."

echo ============================================================
echo   StrongBow Launcher (control panel)
echo   Opening: http://localhost:8090 in your browser...
echo   From there: Start / Stop / Restart the game server.
echo ============================================================
echo.

if not exist "node_modules" (
  echo Installing dependencies ^(first run^)...
  call npm install
)

REM Open the dashboard in the default browser a few seconds after the launcher
REM boots. Runs in its own short-lived window so it does not block the server.
REM (If the page loads before the server is ready, just hit Reload.)
start "StrongBow Dashboard" /min cmd /c "timeout /t 4 /nobreak >nul & start "" "http://localhost:8090""

call npm run launcher
pause
