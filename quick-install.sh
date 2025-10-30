#!/bin/bash
# Быстрая установка всего необходимого для cosmopoliten.online

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║  🚀 Быстрая установка Nginx + SSL                     ║"
echo "║     для cosmopoliten.online                            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Проверка root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите с sudo:"
    echo "   sudo /var/www/shispy-front/quick-install.sh"
    exit 1
fi

# Функция для вопросов
ask_yes_no() {
    while true; do
        read -p "$1 (y/n): " yn
        case $yn in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Введите y или n";;
        esac
    done
}

echo "📋 Текущее состояние:"
echo "   ✅ DNS: cosmopoliten.online → $(dig +short cosmopoliten.online | head -n1)"
echo "   ✅ Frontend: порт 5000"
echo "   ✅ Game Server: порт 3001"
echo "   ✅ FastAPI: localhost:8123"
echo ""

# Шаг 1: Nginx
if ! command -v nginx &> /dev/null; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Шаг 1/4: Установка Nginx"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    apt update
    apt install -y nginx
    
    # Копирование временного конфига (HTTP only)
    cp /var/www/shispy-front/nginx-cosmopoliten.conf /etc/nginx/sites-available/cosmopoliten.online
    ln -sf /etc/nginx/sites-available/cosmopoliten.online /etc/nginx/sites-enabled/
    [ -f /etc/nginx/sites-enabled/default ] && rm /etc/nginx/sites-enabled/default
    
    nginx -t
    systemctl restart nginx
    systemctl enable nginx
    
    echo "✅ Nginx установлен и запущен"
else
    echo "✅ Nginx уже установлен"
fi

echo ""

# Шаг 2: Certbot
if ! command -v certbot &> /dev/null; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔒 Шаг 2/4: Установка Certbot"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    apt install -y certbot python3-certbot-nginx
    echo "✅ Certbot установлен"
else
    echo "✅ Certbot уже установлен"
fi

echo ""

# Шаг 3: SSL Сертификат
if [ ! -d /etc/letsencrypt/live/cosmopoliten.online ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔐 Шаг 3/4: Получение SSL сертификата"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if ask_yes_no "Получить SSL сертификат для cosmopoliten.online?"; then
        certbot certonly --nginx -d cosmopoliten.online
        
        if [ -d /etc/letsencrypt/live/cosmopoliten.online ]; then
            echo "✅ SSL сертификат получен"
            
            # Шаг 4: Активация HTTPS конфига
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "🔄 Шаг 4/4: Активация HTTPS конфигурации"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            
            cp /var/www/shispy-front/nginx-cosmopoliten-ssl.conf /etc/nginx/sites-available/cosmopoliten.online
            nginx -t
            systemctl reload nginx
            
            echo "✅ HTTPS конфигурация активирована"
        else
            echo "❌ Не удалось получить сертификат"
            exit 1
        fi
    else
        echo "⏭️  Пропущено. Запустите позже:"
        echo "   sudo certbot certonly --nginx -d cosmopoliten.online"
        echo "   sudo cp /var/www/shispy-front/nginx-cosmopoliten-ssl.conf /etc/nginx/sites-available/cosmopoliten.online"
        echo "   sudo systemctl reload nginx"
    fi
else
    echo "✅ SSL сертификат уже существует"
    
    # Проверим, активирован ли HTTPS конфиг
    if grep -q "listen 443 ssl" /etc/nginx/sites-available/cosmopoliten.online; then
        echo "✅ HTTPS конфигурация уже активна"
    else
        echo "⚠️  SSL сертификат есть, но HTTPS конфиг не активирован"
        if ask_yes_no "Активировать HTTPS конфигурацию?"; then
            cp /var/www/shispy-front/nginx-cosmopoliten-ssl.conf /etc/nginx/sites-available/cosmopoliten.online
            nginx -t
            systemctl reload nginx
            echo "✅ HTTPS конфигурация активирована"
        fi
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Установка завершена!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Проверка прав
OWNER=$(stat -c '%U:%G' /var/www/shispy-front)
if [ "$OWNER" != "www-data:www-data" ]; then
    echo "📁 Настройка прав доступа..."
    if ask_yes_no "Изменить владельца на www-data для лучшей безопасности?"; then
        chown -R www-data:www-data /var/www/shispy-front
        chmod -R 755 /var/www/shispy-front
        echo "✅ Права обновлены"
    fi
fi

echo ""
echo "🌐 Проверьте работу:"
echo "   curl -I https://cosmopoliten.online"
echo ""
echo "📊 Статус служб:"
systemctl status nginx --no-pager -l | head -n 5
echo ""
echo "📖 Логи Nginx:"
echo "   sudo tail -f /var/log/nginx/shispy_error_https.log"
echo "   sudo tail -f /var/log/nginx/shispy_access_https.log"
echo ""
echo "💡 Проверка компонентов:"
echo "   /var/www/shispy-front/check-status.sh"
