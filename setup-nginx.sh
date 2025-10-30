#!/bin/bash
set -e

echo "=== Настройка Nginx для cosmopoliten.online ==="
echo ""

# Проверка прав
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите скрипт с sudo"
    exit 1
fi

# 1. Установка nginx если его нет
echo "📦 Проверка установки nginx..."
if ! command -v nginx &> /dev/null; then
    echo "Установка nginx..."
    apt update
    apt install -y nginx
else
    echo "✅ nginx уже установлен"
fi

# 2. Копирование конфига
echo ""
echo "📝 Копирование конфигурации..."
cp /var/www/shispy-front/nginx-cosmopoliten-ssl.conf /etc/nginx/sites-available/cosmopoliten.online

# 3. Создание симлинка
echo "🔗 Создание симлинка..."
ln -sf /etc/nginx/sites-available/cosmopoliten.online /etc/nginx/sites-enabled/

# 4. Удаление дефолтного конфига если есть
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "🗑️  Удаление дефолтного конфига..."
    rm /etc/nginx/sites-enabled/default
fi

# 5. Проверка конфига
echo ""
echo "🔍 Проверка конфигурации nginx..."
nginx -t

# 6. Перезапуск nginx
echo ""
echo "🔄 Перезапуск nginx..."
systemctl restart nginx
systemctl enable nginx

# 7. Статус
echo ""
echo "📊 Статус nginx:"
systemctl status nginx --no-pager -l

echo ""
echo "✅ Базовая настройка завершена!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Следующие шаги:"
echo ""
echo "1. Установите certbot для получения SSL:"
echo "   sudo apt install -y certbot python3-certbot-nginx"
echo ""
echo "2. Получите SSL сертификат:"
echo "   sudo certbot --nginx -d cosmopoliten.online"
echo ""
echo "3. После получения сертификата раскомментируйте HTTPS блок в:"
echo "   /etc/nginx/sites-available/cosmopoliten.online"
echo ""
echo "4. Закомментируйте временный HTTP блок и раскомментируйте редирект"
echo ""
echo "5. Перезапустите nginx:"
echo "   sudo systemctl reload nginx"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
