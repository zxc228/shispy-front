#!/bin/bash
# Применение nginx конфигурации для cosmopoliten.online

set -e

# Проверка root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите с sudo:"
    echo "   sudo /var/www/shispy-front/apply-nginx.sh"
    exit 1
fi

echo "🔧 Применение nginx конфигурации..."
echo ""

# Проверяем наличие SSL сертификата
if [ -d /etc/letsencrypt/live/cosmopoliten.online ]; then
    echo "✅ SSL сертификат найден, применяем HTTPS конфиг..."
    CONFIG_FILE="nginx-cosmopoliten-ssl.conf"
else
    echo "⚠️  SSL сертификат не найден, применяем HTTP конфиг..."
    echo "   Для получения SSL выполните: sudo certbot certonly --nginx -d cosmopoliten.online"
    CONFIG_FILE="nginx-cosmopoliten.conf"
fi

# Копируем конфиг
cp /var/www/shispy-front/$CONFIG_FILE /etc/nginx/sites-available/cosmopoliten.online

# Создаем симлинк
ln -sf /etc/nginx/sites-available/cosmopoliten.online /etc/nginx/sites-enabled/

# Удаляем дефолтный конфиг если есть
[ -f /etc/nginx/sites-enabled/default ] && rm /etc/nginx/sites-enabled/default

# Проверяем конфиг
echo ""
echo "🔍 Проверка конфигурации nginx..."
nginx -t

# Перезагружаем nginx
echo ""
echo "🔄 Перезагрузка nginx..."
systemctl reload nginx

echo ""
echo "✅ Nginx конфигурация применена!"
echo ""
echo "📋 Статус:"
systemctl status nginx --no-pager -l

echo ""
echo "🌐 Сайт доступен по адресу:"
if [ "$CONFIG_FILE" == "nginx-cosmopoliten-ssl.conf" ]; then
    echo "   https://cosmopoliten.online"
else
    echo "   http://cosmopoliten.online"
fi
