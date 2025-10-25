# Production Deployment Guide - Shispy @ cosmopoliten.online

Полное руководство по развертыванию проекта `shispy` на production сервере Ubuntu с доменом `cosmopoliten.online`.

---

## 📋 Оглавление

1. [Исходные условия](#1-исходные-условия)
2. [Архитектура](#2-архитектура)
3. [Структура проекта](#3-структура-проекта)
4. [Environment переменные](#4-environment-переменные)
5. [Docker Compose и баг v1.29.2](#5-docker-compose-и-баг-v1292)
6. [Сборка и запуск контейнеров](#6-сборка-и-запуск-контейнеров)
7. [Конфигурация Nginx с HTTPS](#7-конфигурация-nginx-с-https)
8. [SSL сертификаты (Let's Encrypt)](#8-ssl-сертификаты-lets-encrypt)
9. [Правки фронтенда для production](#9-правки-фронтенда-для-production)
10. [Health-check и диагностика](#10-health-check-и-диагностика)
11. [Рестарт и автозапуск](#11-рестарт-и-автозапуск)
12. [Типовые проблемы и решения](#12-типовые-проблемы-и-решения)
13. [Финальный чек-лист](#13-финальный-чек-лист)
14. [Локальная разработка (Test Mode)](#14-локальная-разработка-test-mode)

---

## 1. Исходные условия

### Требования к серверу:
- **OS:** Ubuntu 20.04 / 22.04
- **Docker:** Установлен Docker Engine
- **Nginx:** Установлен и запущен
- **Домен:** `cosmopoliten.online` с A-записью на IP сервера
- **Порты:** 80, 443, 5000, 3001, 8123 открыты

### Существующие сервисы:
- **FastAPI backend** — работает на хосте, порт `8123`
- **Nginx** — reverse proxy на хосте

### Разворачиваемые сервисы:
- **Frontend (React + Vite)** — Docker контейнер, порт `5000`
- **Game Server (Node.js + Socket.IO)** — Docker контейнер, порт `3001`

---

## 2. Архитектура

```
Интернет
    ↓
Nginx (:80 → :443)
    ├── / → Frontend (Docker :5000)
    ├── /socket.io/ → Game Server (Docker :3001) [WebSocket]
    ├── /game → Game Server (Docker :3001) [альтернативный путь]
    └── /api/ → FastAPI (хост :8123)
```

**Важно:** Nginx проксирует все запросы с HTTPS на локальные сервисы.

---

## 3. Структура проекта

Проект находится в `/var/www/shispy-front` (клонирован из GitHub).

```
/var/www/shispy-front/
├── Dockerfile                # Multi-stage: node:alpine → serve
├── docker-compose.yml        # Оркестрация frontend + game-server
├── .env.production           # ENV для production
├── nginx-server.conf         # Пример конфига Nginx (reference)
├── package.json
├── vite.config.js
├── src/                      # Исходники React
│   ├── shared/api/
│   │   └── client.js         # ← apiLocal с baseURL: '/api'
│   ├── providers/
│   │   └── GameSocketProvider.jsx  # ← io(namespace, {path})
│   └── ...
├── server/                   # Node.js Socket.IO сервер
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       └── index.js
└── ...
```

---

## 4. Environment переменные

### Файл: `.env.production`

```env
# Production environment variables for frontend

# FastAPI Backend API URL (проксируется через Nginx на /api/*)
VITE_BACKEND_URL=/api

# Socket.IO Game Server transport path (НЕ namespace!)
VITE_GAME_WS_URL=/socket.io
```

### Пояснение:

- **`VITE_BACKEND_URL=/api`** — все API вызовы идут через Nginx proxy `location /api/`
- **`VITE_GAME_WS_URL=/socket.io`** — это **PATH транспорта** Socket.IO, а НЕ namespace
  - Namespace задаётся отдельно в коде: `io('/', { path: '/socket.io' })`
  - По умолчанию Socket.IO использует path `/socket.io`

---

## 5. Docker Compose и баг v1.29.2

### Файл: `docker-compose.yml`

```yaml
version: '3.8'

services:
  # React Frontend - serve static files
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: shispy-frontend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    networks:
      - shispy-network

  # Node.js Socket.IO Game Server
  game-server:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: shispy-game-server
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - BACKEND_URL=http://host.docker.internal:8123  # FastAPI на хосте
    extra_hosts:
      - "host.docker.internal:host-gateway"  # Доступ к хосту из контейнера
    restart: unless-stopped
    networks:
      - shispy-network

networks:
  shispy-network:
    driver: bridge
```

### ⚠️ Баг docker-compose v1.29.2

При использовании старой версии `docker-compose` (v1.29.2) возникает ошибка:

```
KeyError: 'ContainerConfig'
```

**Проблема:** Несовместимость с новыми версиями Docker Engine.

### Решения:

#### Вариант A: Обновить до docker-compose v2 (рекомендуется)

```bash
# Установить docker-compose v2 (плагин)
sudo apt update
sudo apt install docker-compose-plugin

# Проверить версию
docker compose version  # должно быть >= 2.x

# Использовать команды с пробелом (не дефисом)
docker compose up -d
docker compose build --no-cache
docker compose ps
docker compose logs -f
```

#### Вариант B: Обход через docker run (временное решение)

```bash
# Собрать образ через docker-compose
sudo docker-compose build --no-cache frontend

# Запустить через docker run напрямую
sudo docker rm -f shispy-frontend 2>/dev/null || true
sudo docker run -d \
  --name shispy-frontend \
  --restart unless-stopped \
  -p 5000:5000 \
  shispy-front_frontend:latest
```

---

## 6. Сборка и запуск контейнеров

### С docker-compose v2 (рекомендуется):

```bash
cd /var/www/shispy-front

# Собрать все сервисы
docker compose build --no-cache

# Запустить в фоне
docker compose up -d

# Проверить статус
docker compose ps

# Логи
docker compose logs -f frontend
docker compose logs -f game-server
```

### С docker-compose v1 (обход бага):

```bash
cd /var/www/shispy-front

# Собрать образы
sudo docker-compose build --no-cache frontend
sudo docker-compose build --no-cache game-server

# Запустить game-server через compose (он работает)
sudo docker-compose up -d game-server

# Запустить frontend через docker run (обход бага)
sudo docker rm -f shispy-frontend 2>/dev/null || true
sudo docker run -d \
  --name shispy-frontend \
  --restart unless-stopped \
  -p 5000:5000 \
  shispy-front_frontend:latest
```

### Проверка запущенных контейнеров:

```bash
sudo docker ps

# Должны быть запущены:
# - shispy-frontend     (порт 5000)
# - shispy-game-server  (порт 3001)
```

---

## 7. Конфигурация Nginx с HTTPS

### Файл: `/etc/nginx/sites-available/cosmopoliten.online`

```nginx
# Редирект HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name cosmopoliten.online;
    return 301 https://$host$request_uri;
}

# HTTPS: фронт, сокеты, API
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name cosmopoliten.online;

    # SSL сертификаты (Let's Encrypt)
    ssl_certificate     /etc/letsencrypt/live/cosmopoliten.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cosmopoliten.online/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 20m;
    sendfile on;

    # ⚠️ ВРЕМЕННЫЙ ПАТЧ: Проксируем "голые" API-пути на FastAPI
    # Удалить, когда весь фронт будет использовать /api/* префикс
    location ~ ^/(auth|tonconnect|treasury|lobby|profile|user)(/|$) {
        proxy_pass http://127.0.0.1:8123;
        proxy_http_version 1.1;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        $connection_upgrade;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend (Docker :5000)
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO Game Server (Docker :3001) - WebSocket path
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket таймауты (долгие соединения)
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Альтернативный путь для Socket.IO (если используется)
    location /game {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # FastAPI Backend (хост :8123) - официальный API префикс
    location /api/ {
        proxy_pass http://127.0.0.1:8123/;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # API таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Логи
    access_log /var/log/nginx/shispy_access_https.log;
    error_log  /var/log/nginx/shispy_error_https.log;
}

# Upgrade connection для WebSocket
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

### Активация конфига:

```bash
# Создать симлинк
sudo ln -sf /etc/nginx/sites-available/cosmopoliten.online /etc/nginx/sites-enabled/cosmopoliten.online

# Проверить конфигурацию
sudo nginx -t

# Перезагрузить Nginx
sudo systemctl reload nginx
```

### Пояснения к конфигу:

1. **Временный патч `location ~ ^/(auth|tonconnect|...)`:**
   - Проксирует "голые" API пути (без `/api/` префикса) напрямую на FastAPI
   - Нужен для обратной совместимости, пока фронт не переведён полностью на `/api/*`
   - **Удалить после исправления всех API вызовов в коде**

2. **`location /socket.io/`:**
   - Это **transport path** для Socket.IO
   - WebSocket handshake происходит на `wss://cosmopoliten.online/socket.io/...`

3. **`location /api/`:**
   - Правильный способ доступа к API
   - Все вызовы должны идти через `/api/*`

---

## 8. SSL сертификаты (Let's Encrypt)

### Установка Certbot:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### Выпуск сертификата:

```bash
sudo certbot --nginx \
  -d cosmopoliten.online \
  --agree-tos \
  -m your-email@example.com \
  --redirect
```

### Автопродление:

```bash
# Тест продления
sudo certbot renew --dry-run

# Cron уже настроен автоматически через systemd timer
sudo systemctl list-timers | grep certbot
```

---

## 9. Правки фронтенда для production

### ✅ Исправление 1: apiLocal с baseURL

**Файл:** `src/shared/api/client.js`

```javascript
import axios from 'axios'

// ❌ БЫЛО:
export const apiLocal = axios.create({
  timeout: 15000,
})

// ✅ СТАЛО:
export const apiLocal = axios.create({
  baseURL: '/api',  // ← Все вызовы через Nginx /api/ proxy
  timeout: 15000,
})
```

**Результат:** Все вызовы типа `apiLocal.post('/auth/telegram')` автоматически идут на `/api/auth/telegram`.

---

### ✅ Исправление 2: Socket.IO namespace vs path

**Файл:** `src/providers/GameSocketProvider.jsx`

```javascript
import { io } from 'socket.io-client'

// ❌ БЫЛО:
const url = import.meta.env.VITE_GAME_WS_URL || '/game'
const socket = io(url, { ... })

// ✅ СТАЛО:
const path = import.meta.env.VITE_GAME_WS_URL || '/socket.io'
const namespace = import.meta.env.VITE_GAME_NAMESPACE || '/'
const socket = io(namespace, {
  path,  // ← transport path отдельно
  transports: ['websocket', 'polling'],
  autoConnect: true,
  auth: authToken ? { token: authToken } : undefined,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 5000,
})
```

**Пояснение:**
- **`namespace`** — это логическое пространство имён Socket.IO (по умолчанию `'/'`)
- **`path`** — это HTTP путь для транспорта (по умолчанию `'/socket.io'`)
- **НЕ путать!** Использование `/socket.io` как namespace — ошибка!

**Правильно:**
```javascript
io('/', { path: '/socket.io' })        // ✅ namespace='/', path='/socket.io'
io('/game', { path: '/socket.io' })    // ✅ namespace='/game', path='/socket.io'
```

**Неправильно:**
```javascript
io('/socket.io')  // ❌ использует '/socket.io' как namespace
```

---

## 10. Health-check и диагностика

### Проверка фронтенда:

```bash
# HTTP редирект на HTTPS
curl -I http://cosmopoliten.online/
# Ожидаем: 301 Moved Permanently → https://cosmopoliten.online/

# HTTPS фронт (должен вернуть HTML)
curl -Ik https://cosmopoliten.online/
# Ожидаем: 200 OK, content-type: text/html
```

### Проверка API:

```bash
# OpenAPI документация (HTML - нормально)
curl -Ik https://cosmopoliten.online/api/docs
# Ожидаем: 200 OK

# Защищённая ручка (JSON 401 или 200 - нормально, HTML - ПЛОХО)
curl -isk https://cosmopoliten.online/api/treasury/retrieve_gifts | head -n 20
# Ожидаем: 401 Unauthorized + JSON body (не HTML!)

# Временный патч: голый путь (пока работает)
curl -isk https://cosmopoliten.online/treasury/retrieve_gifts | head -n 20
# Ожидаем: 401 + JSON (временно работает из-за Nginx патча)
```

### Проверка Socket.IO:

```bash
# Polling handshake (должна быть строка начинающаяся с '0{...')
curl -sk "https://cosmopoliten.online/socket.io/?EIO=4&transport=polling" | head -c 120
# Ожидаем: 0{"sid":"...","upgrades":["websocket"],"pingInterval":25000,...}
```

### Локальная проверка с принудительным резолвингом:

```bash
# Полезно для тестирования до обновления DNS
curl -Ik --resolve cosmopoliten.online:443:127.0.0.1 https://cosmopoliten.online/
curl -Ik --resolve cosmopoliten.online:443:127.0.0.1 https://cosmopoliten.online/api/docs
```

### Проверка в браузере (DevTools):

1. **Network → Fetch/XHR:**
   - ✅ Запросы идут на `https://cosmopoliten.online/api/...`
   - ❌ НЕТ запросов возвращающих HTML вместо JSON

2. **Network → WS:**
   - ✅ WebSocket подключается к `wss://cosmopoliten.online/socket.io/...`
   - ✅ Status: 101 Switching Protocols

3. **Console:**
   - ✅ НЕТ CORS ошибок
   - ✅ НЕТ mixed content warnings

---

## 11. Рестарт и автозапуск

### Nginx:

```bash
# Проверка конфигурации
sudo nginx -t

# Перезагрузка
sudo systemctl reload nginx

# Рестарт
sudo systemctl restart nginx

# Статус
sudo systemctl status nginx
```

### Docker контейнеры:

```bash
# Проверка запущенных
sudo docker ps

# Рестарт отдельного контейнера
sudo docker restart shispy-frontend
sudo docker restart shispy-game-server

# Рестарт всех (через compose v2)
docker compose restart

# Логи
sudo docker logs -f shispy-frontend
sudo docker logs -f shispy-game-server
```

### Автозапуск:

```bash
# Для контейнеров, запущенных через docker run
sudo docker update --restart unless-stopped shispy-frontend
sudo docker update --restart unless-stopped shispy-game-server

# Для docker-compose.yml уже указан restart: unless-stopped
```

---

## 12. Типовые проблемы и решения

### Проблема 1: 502 Bad Gateway по HTTPS

**Симптом:** HTTP работает, HTTPS возвращает 502.

**Причина:** Nginx не проксирует на правильные порты в HTTPS vhost.

**Решение:**
```bash
# Проверить, что в блоке server {...} listen 443 есть все proxy_pass
sudo nginx -t
sudo systemctl reload nginx

# Проверить что контейнеры запущены
sudo docker ps
```

---

### Проблема 2: HTML вместо JSON на API запросах

**Симптом:** Запросы на `/auth/telegram` возвращают `index.html`.

**Причина:** Фронт шлёт запросы в корень `/auth/...`, а Nginx отдаёт SPA.

**Решения:**

1. **Правильное (постоянное):**
   - Исправить `apiLocal` добавив `baseURL: '/api'`
   - Пересобрать фронт

2. **Временное (патч в Nginx):**
   - Добавлен блок `location ~ ^/(auth|tonconnect|...)` в конфиге
   - Удалить после исправления фронта

---

### Проблема 3: Socket.IO "Invalid namespace"

**Симптом:** В логах Game Server: `Invalid namespace /socket.io`.

**Причина:** Клиент использует `/socket.io` как namespace вместо path.

**Решение:**
```javascript
// ❌ Неправильно
io('/socket.io')

// ✅ Правильно
io('/', { path: '/socket.io' })
```

---

### Проблема 4: docker-compose KeyError: 'ContainerConfig'

**Симптом:** Ошибка при `docker-compose up`.

**Причина:** Баг docker-compose v1.29.2 с новыми версиями Docker Engine.

**Решения:**

1. **Обновить до v2:**
   ```bash
   sudo apt install docker-compose-plugin
   docker compose up -d
   ```

2. **Обход через docker run:**
   ```bash
   sudo docker-compose build frontend
   sudo docker run -d --name shispy-frontend -p 5000:5000 shispy-front_frontend:latest
   ```

---

### Проблема 5: CORS ошибки

**Симптом:** В консоли браузера CORS errors.

**Причина:** Фронт пытается подключиться к API напрямую (не через Nginx).

**Решение:**
- Использовать относительные пути: `VITE_BACKEND_URL=/api`
- НЕ использовать: `VITE_BACKEND_URL=http://localhost:8123`

---

## 13. Финальный чек-лист

### DNS и домен:
- [ ] A-запись `cosmopoliten.online` указывает на IP сервера
- [ ] Домен резолвится: `nslookup cosmopoliten.online`

### SSL сертификаты:
- [ ] Сертификаты установлены: `ls -la /etc/letsencrypt/live/cosmopoliten.online/`
- [ ] Certbot auto-renewal настроен: `sudo certbot renew --dry-run`

### Nginx:
- [ ] Конфиг без ошибок: `sudo nginx -t`
- [ ] HTTP редиректит на HTTPS: `curl -I http://cosmopoliten.online/`
- [ ] HTTPS vhost активен: `ls -la /etc/nginx/sites-enabled/`

### Docker контейнеры:
- [ ] Frontend запущен: `sudo docker ps | grep shispy-frontend`
- [ ] Game Server запущен: `sudo docker ps | grep shispy-game-server`
- [ ] Порты слушают: `sudo netstat -tulpn | grep -E ':(5000|3001|8123)'`

### Проверки URL:
- [ ] `https://cosmopoliten.online/` → 200 OK (HTML фронта)
- [ ] `https://cosmopoliten.online/api/docs` → 200 OK (Swagger)
- [ ] `https://cosmopoliten.online/api/treasury/retrieve_gifts` → JSON (401 или 200), НЕ HTML
- [ ] `curl -sk "https://cosmopoliten.online/socket.io/?EIO=4&transport=polling"` → начинается с `0{`

### WebSocket:
- [ ] В браузере DevTools → Network → WS: `wss://cosmopoliten.online/socket.io/...` status 101
- [ ] НЕТ ошибок "Invalid namespace"

### Логи:
- [ ] Nginx: `tail -f /var/log/nginx/shispy_error_https.log` (нет критичных ошибок)
- [ ] Frontend: `sudo docker logs shispy-frontend` (сервер слушает :5000)
- [ ] Game Server: `sudo docker logs shispy-game-server` (сервер слушает :3001)

### Автозапуск:
- [ ] Контейнеры с `--restart unless-stopped`
- [ ] Nginx в systemd enabled: `sudo systemctl is-enabled nginx`

---

## 📚 Дополнительные команды

### Полная пересборка (с нуля):

```bash
cd /var/www/shispy-front

# Остановить и удалить контейнеры
sudo docker stop shispy-frontend shispy-game-server
sudo docker rm shispy-frontend shispy-game-server

# Пересобрать без кеша
docker compose build --no-cache

# Запустить заново
docker compose up -d

# Проверить логи
docker compose logs -f
```

### Быстрое обновление только фронта:

```bash
cd /var/www/shispy-front
git pull origin main
docker compose build --no-cache frontend
docker compose up -d frontend
```

### Мониторинг в реальном времени:

```bash
# Логи Nginx
sudo tail -f /var/log/nginx/shispy_access_https.log

# Логи контейнеров
sudo docker logs -f shispy-frontend
sudo docker logs -f shispy-game-server

# Ресурсы контейнеров
sudo docker stats shispy-frontend shispy-game-server
```

---

## 🎯 Итоговая архитектура

```
[Пользователь] → cosmopoliten.online:443 (HTTPS)
                        ↓
                 [Nginx на хосте]
                        ↓
        ┌───────────────┼────────────────┐
        ↓               ↓                ↓
   localhost:5000  localhost:3001  localhost:8123
   (Frontend)      (Game Server)   (FastAPI)
   [Docker]        [Docker]        [Хост]
        ↓               ↓                ↓
    React SPA       Socket.IO       REST API
```

**Порты:**
- 80 → редирект на 443
- 443 → Nginx (SSL termination)
- 5000 → Frontend (Docker)
- 3001 → Game Server (Docker)
- 8123 → FastAPI (хост)

---

## 14. Локальная разработка (Test Mode)

### Режим dev:twa:game

Для локальной разработки с реальным удалённым бэкендом и локальным game server используется режим **test**.

**Что запускается:**
- Frontend на `localhost:5173` с Cloudflare туннелем (для Telegram WebApp)
- Game Server локально на `localhost:3001` (namespace `/game`)
- Backend API на удалённом сервере `147.45.255.52:8123`

### Быстрый старт:

```bash
# Запуск всех сервисов одной командой
npm run dev:twa:game
```

Эта команда запускает параллельно:
1. `npm run dev:test` — Vite dev server с `.env.test` конфигом
2. `npm run tunnel` — Cloudflare туннель для доступа из Telegram
3. `npm run dev:server` — Локальный Node.js game server

### Файл: `.env.test`

```env
# Backend API на удалённом сервере
VITE_API_BASE=http://147.45.255.52:8123/

# Game Server локально
VITE_GAME_WS_URL=http://localhost:3001
VITE_GAME_NAMESPACE=/game

# Окружение
VITE_ENV=test
```

### Как работает подключение Socket.IO

Клиент автоматически определяет режим по формату `VITE_GAME_WS_URL`:

**Development (полный URL):**
```javascript
// .env.test: VITE_GAME_WS_URL=http://localhost:3001
// Результат: io('http://localhost:3001/game', {...})
```

**Production (относительный path):**
```javascript
// .env.production: VITE_GAME_WS_URL=/socket.io
// Результат: io('/', { path: '/socket.io', ... })
```

### Отладка:

```bash
# Проверить что game server запущен
curl http://localhost:3001
# Ожидаем: "Shipsy Game Server is running"

# Проверить Socket.IO handshake
curl "http://localhost:3001/game/?EIO=4&transport=polling"
# Ожидаем: 0{"sid":"...","upgrades":["websocket"],...}

# Логи game server
# В терминале concurrently будут видны логи всех сервисов
```

### Структура окружений:

| Файл | Использование | Backend | Game Server |
|------|--------------|---------|-------------|
| `.env.development` | `npm run dev` | Remote 147.45.255.52:8123 | Не используется |
| `.env.test` | `npm run dev:twa:game` | Remote 147.45.255.52:8123 | Local localhost:3001 |
| `.env.tunnel` | `npm run dev:twa` | Remote 147.45.255.52:8123 | Не используется |
| `.env.production` | Production build | Nginx proxy `/api` | Nginx proxy `/socket.io` |

### Переключение между режимами:

```bash
# Только фронт (без game server)
npm run dev

# Фронт + туннель (без game server)
npm run dev:twa

# Фронт + туннель + game server (FULL TEST MODE)
npm run dev:twa:game

# Локальная разработка фронта и game server (без туннеля)
npm run dev:all
```

---

## 📝 Changelog

### 2025-10-25
- Добавлен временный Nginx патч для `/(auth|tonconnect|...)`
- Исправлен Socket.IO (namespace vs path)
- Добавлен `baseURL: '/api'` для apiLocal
- Документирован баг docker-compose v1.29.2
- Добавлен Test Mode для локальной разработки с удалённым бэкендом
- Умная логика подключения Socket.IO (dev URL vs prod path)

---

**Автор:** shispy-team  
**Дата:** 2025-10-25  
**Домен:** cosmopoliten.online  
**Репозиторий:** https://github.com/zxc228/shispy-front

