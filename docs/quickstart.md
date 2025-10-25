# Quick Start Guide — Shipsy Development

## Запуск локально (dev режим)

### 1. Установка зависимостей

```bash
# Frontend
npm install

# Node Game Server
cd server
npm install
cd ..
```

### 2. Запуск всех сервисов одной командой

```bash
npm run dev:twa:game
```

Эта команда запустит:
- **Vite dev server** (frontend) на https://localhost:5173
- **Node game server** на http://localhost:4000
- **Cloudflare Tunnel** для HTTPS доступа из Telegram

### 3. Получение HTTPS URL

После запуска в терминале увидите:

```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
|  https://random-subdomain.trycloudflare.com                                               |
+--------------------------------------------------------------------------------------------+
```

Скопируйте этот URL и откройте в Telegram WebView.

---

## Структура команд

### Frontend

```bash
npm run dev              # Vite dev server (HTTP)
npm run dev:tunnel       # Vite dev server (HTTPS via tunnel)
npm run build            # Production build
npm run preview          # Preview production build
```

### Game Server

```bash
cd server
npm run dev              # Start with nodemon (auto-reload)
npm start                # Start without reload
```

### Combined

```bash
npm run dev:all          # Frontend + Game Server (no tunnel)
npm run dev:twa:game     # Frontend + Game Server + Cloudflare Tunnel (recommended)
```

---

## Архитектура в dev режиме

```
Telegram Mini App
    ↓ HTTPS
Cloudflare Tunnel (https://random.trycloudflare.com)
    ↓
Vite Dev Server (localhost:5173)
    ├─→ /api/* → Backend REST API (proxy)
    ├─→ /game, /socket.io/* → Node Server :4000 (proxy)
    └─→ /* → React SPA

Node Game Server (localhost:4000)
    └─→ Backend REST API (для step/concede/set_filed)
```

---

## Основные файлы для редактирования

### Frontend

- `src/pages/Battle/BattlePage.jsx` — основной геймплей
- `src/pages/Lobby/LobbyPage.jsx` — лобби с играми
- `src/hooks/useBattleSocket.js` — Socket.IO интеграция
- `src/providers/GameSocketProvider.jsx` — глобальный сокет
- `vite.config.js` — прокси и dev server

### Game Server

- `server/src/index.js` — Socket.IO сервер, обработчики событий
- `server/src/game.js` — GameManager и Game логика

---

## Логи и дебаг

### Frontend

Откройте DebugConsole в приложении (обычно кнопка в углу экрана) или Browser DevTools Console:

```
GameSocket: connected ✅
useBattleSocket: joining game { gameId: 201, tuid: 123 }
useBattleSocket: → place_secret { cell: 5 }
GameSocket: ← toss { firstTurn: 'a', seed: 42 }
```

### Game Server

В терминале где запущен `npm run dev:server`:

```
[SOCKET] Client connected: abc123
[SOCKET] join_game from abc123: gameId=201, tuid=123
[GAME 201] Player a placed secret at cell 5
[GAME 201] Both secrets placed, starting toss
```

---

## Быстрые тесты

### Тест 1: Создание игры

1. Открой приложение в Telegram
2. Нажми "Create Battle"
3. Выбери подарки
4. Нажми "Create"
5. Проверь логи:
   - Frontend: `API request POST /lobby/create_battle`
   - Frontend: `GameSocket: connected ✅`

### Тест 2: Реалтайм игра (два устройства)

1. Устройство A: создай игру
2. Устройство B: зайди в лобби, нажми "Join" на игре A
3. Оба: выберите позицию клада → "Confirm"
4. Должна появиться анимация монетки 🪙
5. Ходите по очереди
6. Проверь логи сервера:
   ```
   [GAME 201] Player a placed secret at cell 5
   [GAME 201] Player b placed secret at cell 9
   [GAME 201] Both secrets placed, starting toss
   ```

---

## Troubleshooting (dev)

### Socket не подключается

**Проблема:** `GameSocket: connect_error`

**Решение:**
1. Проверь, что node сервер запущен: `cd server && npm run dev`
2. Проверь vite.config.js прокси `/game` → `localhost:4000`
3. Перезапусти всё: `npm run dev:twa:game`

### Cloudflare Tunnel не стартует

**Проблема:** `ECONNREFUSED localhost:5173`

**Решение:**
- Команда `npm run dev:twa:game` уже использует `wait-on` — tunnel стартует после Vite
- Если всё равно ошибка, запусти отдельно:
  ```bash
  npm run dev:tunnel  # в одном терминале
  cd server && npm run dev  # в другом терминале
  ```

### Backend 401 Unauthorized

**Проблема:** REST API возвращает 401

**Решение:**
1. Убедись, что ты авторизовался через Telegram (TelegramProvider)
2. Проверь логи: `TelegramProvider: token saved`
3. Проверь, что Authorization header передаётся: `Authorization: Bearer ...`

---

## Hot Reload

- **Frontend:** Vite HMR — изменения применяются мгновенно
- **Game Server:** nodemon — перезапуск при изменении `server/src/*.js`

---

## Рекомендуемые расширения VS Code

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- ES7+ React/Redux/React-Native snippets

---

## Полезные ссылки

- Architecture: `docs/architecture.md`
- Deployment: `docs/deployment.md`
- Realtime Protocol: `docs/realtime-game-rfc.md`
- Cloudflare Tunnel: `docs/cloudflare-tunnel.md`

---

Happy coding! 🚀
