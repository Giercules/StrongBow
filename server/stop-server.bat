@echo off
REM ===========================================================================
REM  Stop the StrongBow Game Server (frees port 8080).
REM ===========================================================================
echo Stopping StrongBow game server on port 8080...
call npx --yes kill-port 8080
echo Done.
pause
