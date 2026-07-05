@echo off
REM ===========================================================================
REM  StrongBow — HOST (you + friends on your PC / LAN)
REM  Starts the game AND the multiplayer server + control panel.
REM ===========================================================================
cd /d "%~dp0"
title StrongBow — Hosting

echo.
echo  ============================================================
echo    STRONGBOW — hosting for you and friends
echo  ============================================================
echo.
echo    1. Server Control opens at http://localhost:8090
echo    2. The game opens at http://localhost:5173
echo.
echo    Friends on your Wi-Fi: they open the game in THEIR browser,
echo    click SERVER on the title screen, and enter the LAN address
echo    shown on the control panel (ws://YOUR-IP:8080).
echo.
echo  ============================================================
echo.

if not exist "node_modules\phaser" (
  echo  First run — installing dependencies...
  call npm install
  if errorlevel 1 (
    echo  npm install failed. Is Node.js installed? Get it from https://nodejs.org
    pause
    exit /b 1
  )
)

REM Control panel (starts / manages the game server on :8080)
start "StrongBow Control" cmd /k "npm run launcher"

REM Game client (+ AI narration proxy; multiplayer server is the launcher above)
start "StrongBow Game" cmd /k "npm run dev"

REM Open both pages after a short boot delay
start "" cmd /c "timeout /t 5 /nobreak >nul & start "" "http://localhost:5173" & start "" "http://localhost:8090""

echo  Launcher and game are starting in separate windows.
echo  Leave both windows open while hosting.
echo.
pause