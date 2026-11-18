@echo off
setlocal EnableExtensions
title BukaHub - Local Startup

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

rem Portable Node.js used on this machine (falls back to npm on PATH).
set "NODE_DIR=C:\Users\DELL\AppData\Local\Programs\node-v26.13.1-win-x64"
if exist "%NODE_DIR%\npm.cmd" set "PATH=%NODE_DIR%;%PATH%"

where npm >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: npm was not found. Install Node.js or restore the portable folder at:
  echo   %NODE_DIR%
  echo.
  pause
  exit /b 1
)

echo.
echo   BukaHub - local startup
echo   -----------------------
echo   Frontend : http://localhost:5190
echo   API      : http://localhost:5057/api/v1/health
echo   Database : PostgreSQL on localhost:1231
echo.

start "BukaHub API (5057)" /D "%ROOT%\backend" cmd /k "npm start"
start "BukaHub Web (5190)" /D "%ROOT%\frontend" cmd /k "npm run dev"

echo Two terminal windows opened. Close them to stop the servers.
echo Opening the app in your browser...
ping -n 7 127.0.0.1 >nul
start "" "http://localhost:5190"
echo.
pause
