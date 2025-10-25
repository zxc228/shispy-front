@echo off
REM Shispy Deploy Script for Windows
REM This script automates deployment to server

echo 🚀 Starting Shispy deployment...

REM Configuration
set SERVER_USER=your-user
set SERVER_HOST=your-server-ip
set DEPLOY_PATH=/var/www/shispy

echo 📦 Building Docker images...
REM docker-compose build

echo 📤 Copying files to server...
REM Using SCP or WinSCP
scp -r . %SERVER_USER%@%SERVER_HOST%:%DEPLOY_PATH%

echo 🔄 Deploying on server...
ssh %SERVER_USER%@%SERVER_HOST% "cd %DEPLOY_PATH% && docker-compose down && docker-compose build && docker-compose up -d"

echo ✅ Deployment completed!
echo 🌐 Frontend: http://%SERVER_HOST%
echo 🎮 Game Server: ws://%SERVER_HOST%:3001

pause
