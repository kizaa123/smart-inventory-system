@echo off
REM Stockmaster Backend Server Startup Script
REM This script starts the Node.js backend server

cd /d "%~dp0backend"

echo ============================================
echo Starting Stockmaster Backend Server...
echo ============================================
echo.

node server.js

pause
