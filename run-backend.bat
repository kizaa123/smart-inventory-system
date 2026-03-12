@echo off
setlocal
echo ==========================================
echo 📊 STOCKMASTER BACKEND STARTER 📊
echo ==========================================

cd backend

:: Check if node_modules exists
if not exist node_modules (
    echo [1/3] 📦 Installing dependencies...
    call npm install
) else (
    echo [1/3] ✅ Dependencies already installed.
)

:: Check if database exists
if not exist stockmaster.db (
    echo [2/3] 🗄️ Initializing database...
    call npm run init-db
) else (
    echo [2/3] ✅ Database already exists.
)

echo [3/3] 🚀 Starting server...
echo.
echo Server will be available at http://localhost:5000
echo Stop the server by closing this window or pressing Ctrl+C
echo.

call npm start

pause
