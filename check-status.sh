#!/bin/bash

echo "🔍 Проверка состояния всех компонентов"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Функция для красивого вывода
check_status() {
    if [ $1 -eq 0 ]; then
        echo "✅ $2"
    else
        echo "❌ $2"
    fi
}

# 1. Nginx
echo "📦 NGINX:"
if command -v nginx &> /dev/null; then
    echo "  ✅ Установлен: $(nginx -v 2>&1)"
    if systemctl is-active --quiet nginx; then
        echo "  ✅ Статус: Запущен"
    else
        echo "  ❌ Статус: Не запущен"
    fi
    
    if [ -f /etc/nginx/sites-enabled/cosmopoliten.online ]; then
        echo "  ✅ Конфиг активирован"
    else
        echo "  ⚠️  Конфиг не активирован"
    fi
else
    echo "  ❌ Не установлен"
fi
echo ""

# 2. Certbot
echo "🔒 CERTBOT:"
if command -v certbot &> /dev/null; then
    echo "  ✅ Установлен: $(certbot --version 2>&1 | head -n1)"
    
    if [ -d /etc/letsencrypt/live/cosmopoliten.online ]; then
        echo "  ✅ Сертификат для cosmopoliten.online существует"
        certbot certificates 2>/dev/null | grep -A 2 "cosmopoliten.online" || true
    else
        echo "  ⚠️  Сертификат для cosmopoliten.online не найден"
    fi
else
    echo "  ❌ Не установлен"
fi
echo ""

# 3. Frontend (порт 5000)
echo "🎨 FRONTEND (порт 5000):"
if netstat -tuln 2>/dev/null | grep -q ":5000 " || ss -tuln 2>/dev/null | grep -q ":5000 "; then
    echo "  ✅ Порт 5000 слушается"
    ps aux | grep -E "[n]ode.*5000|[v]ite" | head -n 1 || echo "  ℹ️  Процесс не определен"
else
    echo "  ❌ Порт 5000 не слушается"
    echo "  💡 Запустите: npm run dev или npm run preview"
fi
echo ""

# 4. Game Server (порт 3001)
echo "🎮 GAME SERVER (порт 3001):"
if netstat -tuln 2>/dev/null | grep -q ":3001 " || ss -tuln 2>/dev/null | grep -q ":3001 "; then
    echo "  ✅ Порт 3001 слушается"
    ps aux | grep -E "[n]ode.*3001|[n]ode.*server" | head -n 1 || echo "  ℹ️  Процесс не определен"
else
    echo "  ❌ Порт 3001 не слушается"
    echo "  💡 Запустите: cd server && npm start"
fi
echo ""

# 5. FastAPI (localhost)
echo "🚀 FASTAPI (localhost:8123):"
if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://localhost:8123/docs | grep -q "200"; then
    echo "  ✅ Доступен (HTTP 200)"
else
    echo "  ❌ Недоступен или не запущен"
fi
echo ""

# 6. DNS
echo "🌐 DNS (cosmopoliten.online):"
if command -v dig &> /dev/null; then
    IP=$(dig +short cosmopoliten.online | head -n 1)
    if [ -n "$IP" ]; then
        echo "  ✅ DNS резолвится: $IP"
        
        # Получаем текущий IP сервера
        SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "unknown")
        if [ "$IP" == "$SERVER_IP" ]; then
            echo "  ✅ DNS указывает на этот сервер"
        else
            echo "  ⚠️  DNS указывает на $IP, но IP сервера: $SERVER_IP"
        fi
    else
        echo "  ❌ DNS не резолвится"
    fi
else
    echo "  ⚠️  dig не установлен (apt install dnsutils)"
fi
echo ""

# 7. Firewall
echo "🛡️  FIREWALL:"
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        echo "  ✅ UFW активен"
        ufw status | grep -E "80|443" | head -n 4
    else
        echo "  ⚠️  UFW не активен"
    fi
else
    echo "  ℹ️  UFW не установлен"
fi
echo ""

# 8. Права на файлы
echo "📁 ПРАВА ДОСТУПА:"
OWNER=$(stat -c '%U:%G' /var/www/shispy-front)
echo "  Владелец проекта: $OWNER"
PERMS=$(stat -c '%a' /var/www/shispy-front)
echo "  Права на директорию: $PERMS"
echo ""

# Итоговая сводка
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 СЛЕДУЮЩИЕ ШАГИ:"
echo ""

if ! command -v nginx &> /dev/null; then
    echo "1️⃣  Установите nginx: sudo /var/www/shispy-front/setup-nginx.sh"
fi

if ! command -v certbot &> /dev/null; then
    echo "2️⃣  Установите certbot: sudo apt install -y certbot python3-certbot-nginx"
fi

if [ ! -d /etc/letsencrypt/live/cosmopoliten.online ]; then
    echo "3️⃣  Получите SSL: sudo certbot certonly --nginx -d cosmopoliten.online"
fi

if ! netstat -tuln 2>/dev/null | grep -q ":5000 " && ! ss -tuln 2>/dev/null | grep -q ":5000 "; then
    echo "4️⃣  Запустите frontend: npm run dev (порт 5000)"
fi

if ! netstat -tuln 2>/dev/null | grep -q ":3001 " && ! ss -tuln 2>/dev/null | grep -q ":3001 "; then
    echo "5️⃣  Запустите game server: cd server && npm start (порт 3001)"
fi

echo ""
echo "📖 Подробная инструкция: /var/www/shispy-front/NGINX-SETUP.md"
