# Deployment Guide — Shipsy

## Обзор

Для продакшн деплоя требуется развернуть три компонента:

1. **Backend REST API (Django)** — уже развёрнут, предполагаем работает
2. **Frontend (React SPA)** — статические файлы, CDN
3. **Realtime Game Server (Node.js)** — новый компонент, требует деплоя

---

## Предварительные требования

### Инфраструктура

- [ ] **VPS/Cloud Server** для Node.js сервера (1 CPU, 1GB RAM минимум)
  - Рекомендуем: DigitalOcean Droplet, AWS EC2 t3.micro, Hetzner Cloud
- [ ] **Домен и SSL сертификат** для WebSocket (WSS)
  - Пример: `wss://game.shipsy.app`
- [ ] **CDN для Frontend** (опционально, но рекомендуется)
  - Cloudflare Pages, Vercel, Netlify, AWS S3 + CloudFront
- [ ] **Backend API** уже работает на HTTPS
  - Пример: `https://api.shipsy.app`

### Софт

- Node.js 20+ (на сервере для игр)
- Nginx (reverse proxy для WSS)
- PM2 (process manager для Node.js)
- Git (для деплоя кода)

---

## План деплоя

### Этап 1: Подготовка переменных окружения

#### Backend (Django)

Убедитесь, что CORS настроен для вашего фронтенд домена:

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "https://shipsy.app",
    "https://game.shipsy.app",
]
```

#### Frontend (.env.production)

Создайте файл `.env.production` в корне проекта:

```env
VITE_API_BASE_URL=https://api.shipsy.app
VITE_GAME_WS_URL=wss://game.shipsy.app/game
```

**Важно:** `VITE_GAME_WS_URL` должен быть полным URL с протоколом `wss://` и path `/game`.

#### Node Server (.env)

Создайте файл `server/.env`:

```env
PORT=4000
NODE_ENV=production
API_BASE_URL=https://api.shipsy.app
```

---

### Этап 2: Деплой Frontend (React SPA)

#### Локальная сборка

```bash
# В корне проекта
npm run build
```

Результат: папка `dist/` со статическими файлами.

#### Вариант A: Cloudflare Pages (рекомендуется)

1. Зарегистрируйтесь на [Cloudflare Pages](https://pages.cloudflare.com/)
2. Подключите GitHub репозиторий `shispy-front`
3. Настройки сборки:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variables:**
     ```
     VITE_API_BASE_URL=https://api.shipsy.app
     VITE_GAME_WS_URL=wss://game.shipsy.app/game
     ```
4. Deploy → Cloudflare автоматически соберёт и опубликует
5. Настройте кастомный домен: `shipsy.app` или `app.shipsy.app`

#### Вариант B: Vercel

```bash
npm install -g vercel
vercel --prod
```

Vercel CLI запросит environment variables — введите их.

#### Вариант C: AWS S3 + CloudFront

```bash
# Установите AWS CLI
aws s3 sync dist/ s3://shipsy-frontend --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

### Этап 3: Деплой Node.js Game Server

#### 3.1 Настройка VPS

**Пример для Ubuntu 22.04:**

```bash
# Подключение к серверу
ssh root@your-server-ip

# Обновление системы
apt update && apt upgrade -y

# Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Проверка версии
node -v  # должно быть v20.x
npm -v

# Установка PM2
npm install -g pm2

# Установка Nginx
apt install -y nginx

# Установка Certbot для SSL (Let's Encrypt)
apt install -y certbot python3-certbot-nginx
```

#### 3.2 Клонирование репозитория

```bash
# Создание пользователя для приложения (безопаснее чем root)
adduser shipsy
usermod -aG sudo shipsy
su - shipsy

# Клонирование репозитория
cd ~
git clone https://github.com/zxc228/shispy-front.git
cd shispy-front/server

# Установка зависимостей
npm install --production
```

#### 3.3 Настройка переменных окружения

```bash
nano .env
```

Содержимое:

```env
PORT=4000
NODE_ENV=production
API_BASE_URL=https://api.shipsy.app
```

Сохраните (`Ctrl+O`, `Enter`, `Ctrl+X`).

#### 3.4 Запуск с PM2

```bash
# В папке server/
pm2 start src/index.js --name shipsy-game --node-args="--max-old-space-size=512"

# Автозапуск при перезагрузке сервера
pm2 startup
pm2 save

# Проверка статуса
pm2 status
pm2 logs shipsy-game
```

**Ожидаемый вывод:**

```
Shipsy Game Server listening on http://localhost:4000
```

#### 3.5 Настройка Nginx как Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/shipsy-game
```

Содержимое:

```nginx
server {
    listen 80;
    server_name game.shipsy.app;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Увеличенные таймауты для WebSocket
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

Активируйте конфиг:

```bash
sudo ln -s /etc/nginx/sites-available/shipsy-game /etc/nginx/sites-enabled/
sudo nginx -t  # проверка синтаксиса
sudo systemctl reload nginx
```

#### 3.6 Настройка SSL (HTTPS/WSS)

```bash
sudo certbot --nginx -d game.shipsy.app
```

Certbot автоматически обновит Nginx конфиг для HTTPS. Выберите вариант **Redirect HTTP to HTTPS**.

**Проверка:**

```bash
curl https://game.shipsy.app/
# Ожидаемый ответ: "Shipsy Game Server is running"
```

---

### Этап 4: DNS настройка

В вашем DNS провайдере (например, Cloudflare) добавьте A-записи:

```
A   shipsy.app          -> <frontend-ip (Cloudflare Pages или CDN)>
A   game.shipsy.app     -> <VPS-IP где запущен Node сервер>
A   api.shipsy.app      -> <Backend server IP>
```

**Важно для Cloudflare:** Если используете Cloudflare DNS для `game.shipsy.app`, **отключите** Proxy (серая облачко), иначе WebSocket может работать нестабильно. Либо используйте Cloudflare для Websites with WebSocket support.

---

### Этап 5: Проверка деплоя

#### Frontend

1. Откройте `https://shipsy.app` в браузере
2. Откройте Developer Tools → Console
3. Должны увидеть:
   ```
   GameSocket: connecting to wss://game.shipsy.app/game
   GameSocket: connected ✅
   ```

#### Node Server

```bash
pm2 logs shipsy-game --lines 50
```

Должны увидеть:

```
[SOCKET] Client connected: <socket.id>
```

#### Backend API

```bash
curl https://api.shipsy.app/lobby/list
# Должен вернуть JSON с играми
```

---

### Этап 6: Telegram Mini App конфигурация

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Выберите вашего бота
3. `/newapp` → создайте Mini App
4. **Web App URL:** `https://shipsy.app`
5. Загрузите иконку и скриншоты

**Важно:** Убедитесь, что ваш домен доступен по HTTPS, иначе Telegram не откроет Mini App.

---

## Мониторинг и логи

### PM2 мониторинг

```bash
# Статус процессов
pm2 status

# Логи в реальном времени
pm2 logs shipsy-game

# Метрики (CPU, RAM)
pm2 monit

# Рестарт при краше
pm2 restart shipsy-game
```

### Nginx логи

```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log
```

### Настройка Log Rotation

```bash
sudo nano /etc/logrotate.d/pm2-shipsy
```

Содержимое:

```
/home/shipsy/.pm2/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

---

## Обновление (CI/CD)

### Ручное обновление

#### Frontend

```bash
# Локально
git pull origin main
npm run build

# Если используете Cloudflare Pages — push в GitHub, auto-deploy
# Если S3:
aws s3 sync dist/ s3://shipsy-frontend --delete
```

#### Node Server

```bash
ssh shipsy@your-server-ip
cd ~/shispy-front
git pull origin main
cd server
npm install --production
pm2 restart shipsy-game
pm2 logs shipsy-game
```

### Автоматизация с GitHub Actions

Создайте `.github/workflows/deploy-game-server.yml`:

```yaml
name: Deploy Game Server

on:
  push:
    branches: [main]
    paths:
      - 'server/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: shipsy
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd ~/shispy-front
            git pull origin main
            cd server
            npm install --production
            pm2 restart shipsy-game
```

Добавьте secrets в GitHub: `VPS_HOST`, `SSH_PRIVATE_KEY`.

---

## Масштабирование

### Горизонтальное масштабирование Node серверов

Если одного сервера недостаточно (>2000 игр):

1. **Redis Adapter для Socket.IO:**

```bash
npm install @socket.io/redis-adapter redis
```

```js
// server/src/index.js
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

const pubClient = createClient({ url: 'redis://localhost:6379' })
const subClient = pubClient.duplicate()

await Promise.all([pubClient.connect(), subClient.connect()])
io.adapter(createAdapter(pubClient, subClient))
```

2. **Load Balancer (Nginx):**

```nginx
upstream game_servers {
    ip_hash; # sticky sessions
    server 10.0.0.1:4000;
    server 10.0.0.2:4000;
    server 10.0.0.3:4000;
}

server {
    listen 443 ssl;
    server_name game.shipsy.app;
    
    location / {
        proxy_pass http://game_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        # ... остальные заголовки
    }
}
```

3. **Redis для состояния игр:**

Заменить `this.games = new Map()` в GameManager на Redis storage.

---

## Безопасность

### Firewall (UFW)

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### Rate Limiting в Nginx

```nginx
http {
    limit_req_zone $binary_remote_addr zone=game_limit:10m rate=10r/s;
    
    server {
        location / {
            limit_req zone=game_limit burst=20 nodelay;
            # ... proxy_pass
        }
    }
}
```

### DDoS защита

Рекомендуется использовать Cloudflare перед Node сервером:
- Включить "Under Attack Mode" при необходимости
- Rate Limiting rules
- Bot Fight Mode

### Обновления безопасности

```bash
sudo apt update && sudo apt upgrade -y
sudo apt autoremove -y
```

Настройте автоматические обновления:

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## Бэкапы

### Node Server State (если используется Redis)

```bash
# Бэкап Redis
redis-cli SAVE
cp /var/lib/redis/dump.rdb /backup/redis-$(date +%Y%m%d).rdb
```

### Логи

```bash
tar -czf logs-$(date +%Y%m%d).tar.gz /home/shipsy/.pm2/logs/
```

---

## Troubleshooting

### WebSocket не подключается (net::ERR_CONNECTION_REFUSED)

1. Проверьте, что Node сервер запущен: `pm2 status`
2. Проверьте Nginx проксирует на :4000: `curl http://localhost:4000`
3. Проверьте SSL сертификат: `curl https://game.shipsy.app`
4. Проверьте DNS: `nslookup game.shipsy.app`

### PM2 падает постоянно

```bash
pm2 logs shipsy-game --err --lines 100
```

Частые причины:
- Недостаточно памяти → увеличьте RAM или уменьшите `--max-old-space-size`
- Unhandled rejection → исправьте код
- Port already in use → проверьте, что порт 4000 свободен

### CORS ошибки

Проверьте backend `settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    "https://shipsy.app",
    "https://game.shipsy.app",
]
```

Рестартните backend после изменения.

### SSL сертификат истёк

```bash
sudo certbot renew
sudo systemctl reload nginx
```

Certbot автоматически обновляет сертификаты через cron, но проверьте:

```bash
sudo systemctl status certbot.timer
```

---

## Чеклист финального деплоя

- [ ] Backend REST API доступен по HTTPS
- [ ] Frontend собран и опубликован на CDN/Cloudflare Pages
- [ ] Node сервер запущен на VPS с PM2
- [ ] Nginx reverse proxy настроен для WSS
- [ ] SSL сертификат выпущен для `game.shipsy.app`
- [ ] DNS записи настроены (A records)
- [ ] Environment variables настроены для всех компонентов
- [ ] Telegram Bot настроен с Web App URL
- [ ] Тестовая игра проведена успешно (create → join → play → win)
- [ ] Логи мониторятся (`pm2 logs`, `nginx logs`)
- [ ] Firewall настроен (UFW)
- [ ] Автоматические обновления безопасности включены
- [ ] Бэкапы логов настроены (logrotate)
- [ ] Rate limiting настроен в Nginx
- [ ] PM2 автозапуск при перезагрузке сервера

---

## Контакты и поддержка

- **GitHub Issues:** https://github.com/zxc228/shispy-front/issues
- **Документация:** `/docs/architecture.md`, `/docs/realtime-game-rfc.md`

---

**Следующие шаги после деплоя:**

1. Мониторинг метрик (Prometheus + Grafana)
2. Error tracking (Sentry)
3. Analytics (Google Analytics, Amplitude)
4. A/B тестирование игровых механик
5. Добавление новых фич (режимы игры, турниры, лидерборды)

Удачи! 🚀
