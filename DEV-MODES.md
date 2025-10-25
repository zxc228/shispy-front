# Quick Start - Development Modes

## 🚀 Режимы запуска

### 1️⃣ Только фронт (без туннеля, без game server)
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend: 147.45.255.52:8123 (remote)
- Game Server: не используется

---

### 2️⃣ Фронт + Cloudflare туннель (для Telegram WebApp)
```bash
npm run dev:twa
```
- Frontend: https://random-url.trycloudflare.com (tunnel)
- Backend: 147.45.255.52:8123 (remote)
- Game Server: не используется

**Когда использовать:** Тестирование в Telegram без game server функций.

---

### 3️⃣ Полный стек (фронт + туннель + game server) ⭐ TEST MODE
```bash
npm run dev:twa:game
```
- Frontend: https://random-url.trycloudflare.com (tunnel)
- Backend: 147.45.255.52:8123 (remote)
- Game Server: localhost:3001 (local)

**Когда использовать:** Полное тестирование игровой механики в Telegram с локальным game server.

**Что происходит:**
- Запускается Vite с `.env.test` конфигом
- Запускается Cloudflare туннель для доступа из Telegram
- Запускается локальный Node.js game server на порту 3001

---

### 4️⃣ Локальная разработка (без туннеля)
```bash
npm run dev:all
```
- Frontend: http://localhost:5173
- Backend: 147.45.255.52:8123 (remote)
- Game Server: localhost:3001 (local)

**Когда использовать:** Разработка игровой логики без необходимости тестировать в Telegram.

---

## 🔧 Структура environment файлов

| Файл | Команда | Backend | Game Server |
|------|---------|---------|-------------|
| `.env.development` | `npm run dev` | Remote | - |
| `.env.test` | `npm run dev:twa:game` | Remote | Local |
| `.env.tunnel` | `npm run dev:twa` | Remote | - |
| `.env.production` | Production build | Nginx proxy | Nginx proxy |

---

## 📦 Production сборка и деплой

```bash
# Сборка для production
npm run build

# Деплой на сервер (см. DEPLOY.md для полной инструкции)
cd /var/www/shispy-front
git pull origin main
docker compose build --no-cache frontend
docker compose up -d frontend
```

---

## 🐛 Отладка

### Проверить что game server работает:
```bash
# HTTP health check
curl http://localhost:3001

# Socket.IO handshake
curl "http://localhost:3001/game/?EIO=4&transport=polling"
```

### Логи в реальном времени:
Команда `npm run dev:twa:game` показывает логи всех сервисов в одном терминале (через concurrently).

### Проблемы с подключением:
- Убедись что порт 3001 свободен: `netstat -ano | findstr :3001` (Windows)
- Проверь что в `.env.test` правильные значения
- Проверь консоль браузера (DevTools → Console) на ошибки Socket.IO

---

## 📚 Полная документация

Смотри **[DEPLOY.md](./DEPLOY.md)** для подробной документации по:
- Production деплою
- Конфигурации Nginx
- SSL сертификатам
- Troubleshooting

---

**Быстрая справка:**
- `npm run dev` — простая разработка
- `npm run dev:twa:game` — полный тест с Telegram
- `npm run build` — production сборка
