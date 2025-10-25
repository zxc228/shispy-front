# 🚀 Быстрая шпаргалка по деплою Shispy

## ⚡ TL;DR - Быстрый старт

### На твоём сервере:

```bash
# 1. Установи Docker (если нет)
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

# 2. Создай папку для проекта
mkdir -p /var/www/shispy && cd /var/www/shispy

# 3. Склонируй репозиторий (или используй FTP/rsync)
git clone https://github.com/your-username/shispy-front.git .

# 4. Настрой переменные окружения
nano .env.production
# Укажи:
# VITE_BACKEND_URL=http://localhost:8123  (FastAPI уже работает)
# VITE_GAME_WS_URL=/game

nano docker-compose.yml
# Укажи:
# BACKEND_URL=http://host.docker.internal:8123

# 5. Запусти контейнеры
docker compose up -d --build

# 6. Настрой Nginx
sudo nano /etc/nginx/sites-available/shispy
```

Вставь в Nginx конфиг:
```nginx
server {
    listen 80;
    server_name твой-домен.com;

    # Frontend (Docker контейнер на порту 5000)
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
    }

    # Socket.IO (Docker контейнер)
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # FastAPI (уже работает на порту 8123)
    location /api/ {
        proxy_pass http://localhost:8123/;
        proxy_set_header Host $host;
    }
}
```

```bash
# Активируй конфиг
sudo ln -s /etc/nginx/sites-available/shispy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 7. Готово! Открой http://твой-домен.com
```

---

## 📦 Что внутри

**2 Docker контейнера:**
1. **Frontend** (node:20-alpine + serve) - порт 5000 - статические файлы React
2. **Game Server** (node:20-alpine) - порт 3001 - Socket.IO WebSocket

**На хосте (не в Docker):**
- **Nginx** - порт 80 - reverse proxy
- **FastAPI** - порт 8123 - backend API

**Nginx проксирует:**
- `/` → Frontend контейнер (порт 5000)
- `/socket.io/` → Game Server контейнер (порт 3001)
- `/api/` → FastAPI (порт 8123)

---

## 🔄 Частые команды

```bash
# Посмотреть статус
docker compose ps

# Посмотреть логи
docker compose logs -f

# Перезапустить
docker compose restart

# Остановить
docker compose down

# Пересобрать и запустить
docker compose down && docker compose build && docker compose up -d

# Обновить код и передеплоить
git pull origin main
docker compose down && docker compose build && docker compose up -d
```

---

## 🔥 Если что-то не работает

### Frontend не открывается
```bash
# Проверь контейнер
docker compose logs frontend

# Проверь Nginx
sudo nginx -t
sudo systemctl status nginx
```

### WebSocket не подключается
```bash
# Проверь порт 3001
docker compose logs game-server
sudo netstat -tulpn | grep :3001

# Открой порт в фаерволе (если нужно)
sudo ufw allow 3001
```

### Контейнер крашится
```bash
# Посмотри что случилось
docker compose logs [container-name]

# Пересобери без кеша
docker compose build --no-cache
```

---

## 🎯 Твоя структура

```
Сервер (Ubuntu/Debian):
├── Nginx (порт 80) - УЖЕ УСТАНОВЛЕН ✅
├── FastAPI (порт 8123) - УЖЕ РАБОТАЕТ ✅
├── Docker Engine
└── /var/www/shispy/
    ├── Frontend контейнер (порт 5000)
    └── Game Server контейнер (порт 3001)
```

**Nginx маршрутизация:**
- `http://твой-домен.com/` → Docker Frontend (:5000)
- `ws://твой-домен.com/socket.io/` → Docker Game Server (:3001)
- `http://твой-домен.com/api/` → FastAPI (:8123) на хосте

---

## ✅ Готово!

Теперь у тебя работает:
- ✅ Frontend на порту 80
- ✅ WebSocket сервер на порту 3001
- ✅ Nginx проксирует всё
- ✅ Автоматический перезапуск контейнеров

**Полный гайд:** `DEPLOYMENT.md`
