@echo off
REM ===========================================================================
REM  StrongBow Game Server - quick start
REM  Double-click this file, or run it from a terminal, to launch the server.
REM  It starts the WebSocket sync server AND the control dashboard.
REM ===========================================================================
cd /d "%~dp0\.."

echo ============================================================
echo   StrongBow Game Server
echo   Dashboard:  http://localhost:8080
echo   Sync (ws):  ws://localhost:8080
echo   Stop with Ctrl+C, the dashboard's Stop button, or stop-server.bat
echo ============================================================
echo.

REM Pull deps the first time (safe to re-run; quick when up to date).
if not exist "node_modules\ws" (
  echo Installing dependencies ^(first run^)...
  call npm install
)

call npm run server
pause
