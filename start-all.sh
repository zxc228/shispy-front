#!/bin/bash
# Запуск всех компонентов проекта

set -e

echo "🚀 Запуск всех компонентов Shispy..."
echo ""

# Переходим в корень проекта
cd /var/www/shispy-front

# 1. Установка и сборка фронтенда
echo "📦 Установка зависимостей фронтенда..."
npm ci

echo "🔨 Сборка фронтенда..."
npm run build

# 2. Установка serve (если нет)
if ! command -v serve &> /dev/null; then
    echo "📥 Установка serve..."
    npm install -g serve
fi

# 3. Запуск фронтенда в фоне
echo "🎨 Запуск фронтенда на порту 5000..."
serve -s dist -l 5000 > /tmp/shispy-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   PID фронтенда: $FRONTEND_PID"

# 4. Установка зависимостей сервера
echo "📦 Установка зависимостей game server..."
cd server
npm ci --only=production

# 5. Запуск game server
echo "🎮 Запуск game server на порту 3001..."
NODE_ENV=production PORT=3001 API_BASE=http://localhost:8123 npm start

# Этот скрипт завершится вместе с game server
# Frontend продолжит работать в фоне
