@echo off
REM ===========================================================================
REM  StrongBow Launcher - run this ONCE to get a browser control panel that can
REM  START / STOP / RESTART the game server. Add it to your Windows startup
REM  (shell:startup) to keep control always available.
REM ===========================================================================
cd /d "%~dp0\.."

echo ============================================================
echo   StrongBow Launcher (control panel)
echo   Open:  http://localhost:8090
echo   From there: Start / Stop / Restart the game server.
echo ============================================================
echo.

if not exist "node_modules" (
  echo Installing dependencies ^(first run^)...
  call npm install
)

call npm run launcher
pause
