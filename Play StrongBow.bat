@echo off
REM ===========================================================================
REM  StrongBow - PLAY (solo / join a friend's server)
REM  Double-click to start the game in your browser. No server required for
REM  solo play. To HOST for friends, use "Host StrongBow.bat" instead.
REM ===========================================================================
cd /d "%~dp0"
title StrongBow - Playing

echo.
echo  ============================================================
echo    STRONGBOW - starting the game
echo  ============================================================
echo.
echo    SOLO: Just play. You do NOT need a server.
echo.
echo    JOIN A FRIEND: On the title screen, click SERVER and enter
echo    their address, e.g. ws://192.168.1.50:8080
echo.
echo    HOST FOR FRIENDS: Close this and run "Host StrongBow.bat"
echo.
echo  ============================================================
echo.

if not exist "node_modules\phaser" (
  echo  First run - installing dependencies, one-time, may take a minute...
  call npm install
  if errorlevel 1 (
    echo  npm install failed. Is Node.js installed? Get it from https://nodejs.org
    pause
    exit /b 1
  )
)

REM Open the browser after a short delay so Vite can bind :5173.
REM Do not nest start "" "url" inside another quoted string - cmd.exe rejects it.
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:5173/"

echo  Opening http://localhost:5173 in your browser...
echo  Keep THIS window open while you play. Close it to stop the game.
echo.

REM Runs the game AND the optional AI narration proxy (no multiplayer server).
call npm run dev

pause
