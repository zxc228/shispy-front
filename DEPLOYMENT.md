# 🚀 Shispy Deployment Guide

Полный гайд по развертыванию приложения Shispy на production сервере.

## 📋 Архитектура

```
┌─────────────────────────────────────────┐
│         Nginx (Reverse Proxy)           │
│         Port 80/443 (HTTP/HTTPS)        │
└───────────┬─────────────┬───────────────┘
            │             │
    ┌───────▼──────┐  ┌──▼──────────────┐
    │   Frontend   │  │  Socket.IO      │
    │   (Static)   │  │  Game Server    │
    │   Port 80    │  │  Port 3001      │
    └──────────────┘  └─────────┬───────┘
                                │
                        ┌───────▼────────┐
                        │ Django Backend │
                        │   Port 8000    │
                        └────────────────┘
```

## 🛠️ Что нужно на сервере

1. **Docker** и **Docker Compose**
2. **Nginx** (для reverse proxy)
3. **SSH доступ** к серверу
4. **Домен** (опционально, но рекомендуется)

---

## 📦 Структура проекта

```
shispy-front/
├── Dockerfile              # Frontend build
├── docker-compose.yml      # Оркестрация контейнеров
├── nginx.conf              # Nginx конфигурация
├── .env.production         # Production переменные
├── .dockerignore           # Исключения для Docker
├── deploy.sh               # Deploy скрипт (Linux/Mac)
├── deploy.bat              # Deploy скрипт (Windows)
├── server/
│   ├── Dockerfile          # Node.js Socket.IO server
│   └── src/
└── src/                    # React frontend
```

---

## 🚀 Способ 1: Деплой с Docker Compose (Рекомендуется)

### 1. Подготовка сервера

```bash
# Подключись к серверу
ssh your-user@your-server-ip

# Установи Docker (если еще не установлен)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установи Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Проверь установку
docker --version
docker compose version
```

### 2. Настройка переменных окружения

Отредактируй `.env.production`:

```env
VITE_BACKEND_URL=https://your-api.com
VITE_SOCKET_URL=wss://your-domain.com
```

Отредактируй `docker-compose.yml`:

```yaml
environment:
  - BACKEND_URL=http://your-django-backend:8000
```

### 3. Копирование файлов на сервер

#### Вариант A: Используя Git (рекомендуется)

```bash
# На сервере
cd /var/www
git clone https://github.com/your-username/shispy-front.git
cd shispy-front
```

#### Вариант B: Используя rsync/scp

```bash
# С локального компьютера
rsync -avz --exclude 'node_modules' --exclude '.git' \
  ./ your-user@your-server:/var/www/shispy/
```

#### Вариант C: Используя скрипт

```bash
# Отредактируй deploy.sh (укажи свои данные)
nano deploy.sh

# Сделай скрипт исполняемым
chmod +x deploy.sh

# Запусти деплой
./deploy.sh
```

### 4. Запуск контейнеров

```bash
# На сервере
cd /var/www/shispy

# Собери и запусти контейнеры
docker compose up -d --build

# Проверь статус
docker compose ps

# Посмотри логи
docker compose logs -f
```

### 5. Настройка Nginx (Reverse Proxy)

Создай конфигурацию Nginx на сервере:

```bash
sudo nano /etc/nginx/sites-available/shispy
```

Вставь конфигурацию:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Твой домен

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
```

Активируй конфигурацию:

```bash
# Создай симлинк
sudo ln -s /etc/nginx/sites-available/shispy /etc/nginx/sites-enabled/

# Проверь конфигурацию
sudo nginx -t

# Перезагрузи Nginx
sudo systemctl reload nginx
```

### 6. Настройка SSL (HTTPS) - Опционально но рекомендуется

```bash
# Установи Certbot
sudo apt-get install certbot python3-certbot-nginx

# Получи SSL сертификат
sudo certbot --nginx -d your-domain.com

# Автоматическое обновление (уже настроено)
sudo certbot renew --dry-run
```

---

## 🔧 Способ 2: Деплой без Docker (Альтернатива)

Если не хочешь использовать Docker:

### Frontend

```bash
# Собери статику локально
npm run build

# Скопируй на сервер
rsync -avz dist/ your-user@your-server:/var/www/shispy/frontend/

# Настрой Nginx на сервере
sudo nano /etc/nginx/sites-available/shispy
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/shispy/frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Node.js Server

```bash
# На сервере
cd /var/www/shispy/server
npm install --production

# Запусти с PM2 (process manager)
npm install -g pm2
pm2 start src/index.js --name shispy-game-server
pm2 save
pm2 startup
```

---

## 🔄 Обновление приложения

### С Docker Compose

```bash
# На сервере
cd /var/www/shispy

# Обнови код (если Git)
git pull origin main

# Пересобери и перезапусти контейнеры
docker compose down
docker compose build
docker compose up -d

# Или используй скрипт
./deploy.sh
```

### Без Docker

```bash
# Frontend
npm run build
rsync -avz dist/ your-user@your-server:/var/www/shispy/frontend/

# Backend
ssh your-user@your-server
cd /var/www/shispy/server
pm2 stop shispy-game-server
git pull  # или rsync новых файлов
npm install --production
pm2 start shispy-game-server
```

---

## 🐛 Проблемы и решения

### Проблема: Контейнер не запускается

```bash
# Проверь логи
docker compose logs frontend
docker compose logs game-server

# Проверь, заняты ли порты
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :3001
```

### Проблема: WebSocket не подключается

1. Проверь, что порт 3001 открыт в фаерволе:
```bash
sudo ufw allow 3001
```

2. Проверь Nginx конфигурацию для WebSocket
3. Проверь CORS настройки в Node.js сервере

### Проблема: Frontend показывает старую версию

```bash
# Очисти кеш Docker
docker system prune -a

# Пересобери без кеша
docker compose build --no-cache

# Очисти кеш браузера (Ctrl+Shift+R)
```

---

## 📊 Мониторинг

### Проверка статуса контейнеров

```bash
docker compose ps
docker compose logs -f
```

### Проверка использования ресурсов

```bash
docker stats
```

### Проверка логов Nginx

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🔐 Безопасность

1. **Настрой фаерволл**:
```bash
sudo ufw allow 22     # SSH
sudo ufw allow 80     # HTTP
sudo ufw allow 443    # HTTPS
sudo ufw enable
```

2. **Используй SSL (HTTPS)** - см. раздел "Настройка SSL"

3. **Настрой переменные окружения** - не храни секреты в коде

4. **Регулярно обновляй зависимости**:
```bash
npm audit fix
docker compose pull
```

---

## ✅ Чеклист деплоя

- [ ] Docker и Docker Compose установлены
- [ ] `.env.production` настроен с правильными URL
- [ ] `docker-compose.yml` настроен с правильным BACKEND_URL
- [ ] Файлы скопированы на сервер
- [ ] Контейнеры запущены (`docker compose up -d`)
- [ ] Nginx настроен и работает
- [ ] SSL сертификат установлен (опционально)
- [ ] Фаерволл настроен
- [ ] Приложение доступно по домену
- [ ] WebSocket подключается
- [ ] Логи чистые, без ошибок

---

## 📞 Быстрая помощь

**Перезапустить всё:**
```bash
docker compose restart
```

**Пересобрать всё:**
```bash
docker compose down && docker compose build && docker compose up -d
```

**Посмотреть логи:**
```bash
docker compose logs -f --tail=100
```

**Остановить всё:**
```bash
docker compose down
```

---

## 🎯 Следующие шаги

1. Настрой CI/CD (GitHub Actions) для автоматического деплоя
2. Настрой мониторинг (Prometheus, Grafana)
3. Настрой бэкапы базы данных
4. Оптимизируй производительность (CDN, кеширование)

Удачи с деплоем! 🚀
