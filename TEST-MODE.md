# Test Mode Setup - Checklist

## ✅ Что было сделано

### 1. Создан `.env.test`
```env
VITE_API_BASE=http://147.45.255.52:8123/
VITE_GAME_WS_URL=http://localhost:3001
VITE_GAME_NAMESPACE=/game
VITE_ENV=test
```

### 2. Обновлён `package.json`
Добавлен скрипт `dev:test` и обновлён `dev:twa:game`:
```json
"dev:test": "vite --mode test",
"dev:twa:game": "concurrently \"npm:dev:test\" \"npm:tunnel\" \"npm:dev:server\""
```

### 3. Обновлён `GameSocketProvider.jsx`
Добавлена умная логика подключения:
- **Development (full URL):** `io('http://localhost:3001/game', {...})`
- **Production (path):** `io('/', { path: '/socket.io', ... })`

Автоматически определяется по формату `VITE_GAME_WS_URL`.

### 4. Документация
- ✅ `DEPLOY.md` — добавлен раздел "Локальная разработка (Test Mode)"
- ✅ `DEV-MODES.md` — новый файл с описанием всех режимов
- ✅ `README.md` — обновлён Quick Start

---

## 🚀 Как использовать

### Запуск Test Mode:
```bash
npm run dev:twa:game
```

### Что запустится:
1. Vite dev server (localhost:5173) с конфигом `.env.test`
2. Cloudflare туннель (для доступа из Telegram)
3. Node.js game server (localhost:3001, namespace `/game`)

### Проверка:
```bash
# Game server здоров
curl http://localhost:3001
# Ожидаем: "Shipsy Game Server is running"

# Socket.IO handshake работает
curl "http://localhost:3001/game/?EIO=4&transport=polling"
# Ожидаем: 0{"sid":"...","upgrades":["websocket"],...}
```

---

## 🔧 Режимы работы Socket.IO

### Development Mode (Test)
**ENV:**
```env
VITE_GAME_WS_URL=http://localhost:3001
VITE_GAME_NAMESPACE=/game
```

**Результат:**
```javascript
io('http://localhost:3001/game', {
  transports: ['websocket', 'polling'],
  // ...
})
```

### Production Mode
**ENV:**
```env
VITE_GAME_WS_URL=/socket.io
```

**Результат:**
```javascript
io('/', {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  // ...
})
```

---

## 📋 Структура окружений

| Файл | Backend | Game Server | Tunnel |
|------|---------|-------------|--------|
| `.env.development` | 147.45.255.52:8123 | - | ❌ |
| `.env.test` | 147.45.255.52:8123 | localhost:3001 | ✅ |
| `.env.tunnel` | 147.45.255.52:8123 | - | ✅ |
| `.env.production` | /api (proxy) | /socket.io (proxy) | ❌ |

---

## 🎯 Когда использовать каждый режим

### `npm run dev`
- Быстрая разработка UI
- Не требуется game server
- Не требуется Telegram WebApp

### `npm run dev:twa`
- Тестирование в Telegram WebApp
- Не требуется game server функционал
- Только UI и backend API

### `npm run dev:twa:game` ⭐
- **Полное тестирование всей системы**
- Разработка игровой механики
- Тестирование в реальном Telegram окружении
- Отладка Socket.IO взаимодействий

### `npm run dev:all`
- Разработка игровой логики
- Не требуется Telegram WebApp
- Быстрая итерация без туннеля

---

## 🐛 Troubleshooting

### Ошибка: "Game server not responding"
```bash
# Проверить что порт свободен
netstat -ano | findstr :3001

# Убить процесс если занят (Windows)
taskkill /PID <PID> /F

# Перезапустить
npm run dev:twa:game
```

### Ошибка: "Invalid namespace"
Проверь `.env.test`:
```env
VITE_GAME_NAMESPACE=/game  # Должно быть /game, а не /socket.io
```

### Socket.IO не подключается
В консоли браузера (DevTools):
- Должен быть WebSocket к `ws://localhost:3001/game/?EIO=4&transport=websocket`
- Или polling к `http://localhost:3001/game/?EIO=4&transport=polling`

---

## ✨ Итог

Теперь у тебя есть полноценный test режим для разработки с:
- ✅ Удалённым backend на 147.45.255.52:8123
- ✅ Локальным game server на localhost:3001
- ✅ Cloudflare туннелем для Telegram
- ✅ Умной логикой подключения Socket.IO

**Команда:**
```bash
npm run dev:twa:game
```

**Enjoy! 🚀**
