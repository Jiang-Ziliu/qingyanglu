@echo off
title Qingyanglu
cd /d "%~dp0"
set "NODE_DIR=C:\Users\q'SM\.local\bin\node-v24.22.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"
echo.
echo   Qingyanglu is starting, please wait a few seconds...
echo.
echo   Browser address:  http://localhost:5173/
echo.
echo   Do NOT close this window. Closing it stops the app.
echo.
start "" "http://localhost:5173/"
"%NODE_DIR%\node.exe" "node_modules\vite\bin\vite.js" --host
pause
