# Shipsy Architecture Documentation

## Обзор системы

Shipsy — это Telegram Mini App для игры в морской бой с подарками и TON на ставках. Игра использует гибридную архитектуру:

- **Frontend**: React SPA (Vite)
- **Backend REST API**: Django (существующий, не изменялся)
- **Realtime Game Server**: Node.js + Socket.IO (добавлен для игровой логики)

---

## Компоненты системы

### 1. Frontend (React + Vite)

**Технологии:**
- React 19 + React Router 7
- Vite 7 (dev server + build)
- Tailwind CSS
- Socket.IO Client
- Axios (HTTP)
- Telegram Mini App SDK

**Основные модули:**

#### Providers
- `TelegramProvider` — Telegram WebApp SDK, аутентификация через `/auth/telegram`, сохранение токена
- `GameSocketProvider` — глобальный Socket.IO клиент, переподключение при получении токена
- `BalanceProvider` — получение баланса кошелька через REST
- `LoadingProvider` — глобальный индикатор загрузки

#### Pages
- **LobbyPage** — список игр в лобби, ожидание матчмейкинга, переход в батл
- **CreatePage** — выбор подарков для ставки, создание новой игры
- **JoinPage** — присоединение к игре другого игрока
- **BattlePage** — основной геймплей (размещение клада, ходы, таймер, анимации)
- **ProfilePage** — профиль пользователя, промокоды
- **TreasurePage** — управление инвентарём подарков

#### Hooks
- `useBattleSocket(gameId)` — подключение к игре через Socket.IO, получение состояния, отправка действий

#### API Clients
- `src/shared/api/client.js` — Axios инстансы (REST backend)
- `src/shared/api/lobby.api.js` — API для лобби (/lobby/list, /lobby/create_battle, /lobby/join_battle, etc.)
- `src/shared/api/wallet.api.js` — API для баланса TON
- `src/shared/api/users.api.js` — API для пользователей
- `src/shared/api/tonconnect.api.js` — TON Connect интеграция

---

### 2. Backend REST API (Django)

**Роль:** Источник истины для данных игроков, кошельков, подарков, исторических игр.

**Основные эндпоинты:**

#### Аутентификация
- `POST /auth/telegram` — аутентификация через Telegram initData, возвращает JWT токен

#### Лобби
- `GET /lobby/list` — список активных игр в лобби
- `POST /lobby/create_battle { gifts: [1,2] }` — создать игру, поставив подарки на кон
- `POST /lobby/join_battle { gifts: [3,4], queque_id: 5 }` — присоединиться к игре
- `GET /lobby/waiting_status` — проверить статус ожидания (в игре или нет)
- `GET /lobby/cancel` — отменить ожидание в лобби
- `GET /lobby/retrieve_gifts` — получить список подарков игрока

#### Игра (вызывается node-сервером)
- `POST /lobby/set_filed { game_id, field }` — сохранить позицию клада игрока
- `POST /lobby/step { game_id, field }` — сделать ход; возвращает `gifts[]` при победе или `{ status: 0 }` при промахе
- `POST /lobby/concede { game_id, tuid }` — сдаться; возвращает `gifts[]` победителя

#### Кошелёк
- `GET /wallet/balance` — получить баланс TON
- `POST /wallet/deposit` — пополнить баланс
- `POST /wallet/withdraw` — вывести TON

#### Подарки
- `GET /treasury/available` — доступные подарки для покупки
- `POST /treasury/purchase { gift_id }` — купить подарок

---

### 3. Realtime Game Server (Node.js)

**Технологии:**
- Node.js 20+
- Socket.IO (WebSocket)
- Axios (для вызовов backend REST API)

**Расположение:** `server/src/`

**Файлы:**
- `server/src/index.js` — HTTP сервер, Socket.IO namespace `/game`, обработчики событий
- `server/src/game.js` — `GameManager` и `Game` — основная игровая логика

**Роль:** Авторитетный источник истины для **реального времени игры**:
- Тайминг ходов (25s + 3s за ход)
- Бросок монетки (определение первого хода)
- Очерёдность ходов
- Таймеры (server-side)
- Идемпотентность ходов (moveId)

**Делегирует backend:**
- Истина hit/miss (вызывает `/lobby/step`)
- Награды и вычеты (backend вычисляет и изменяет баланс)
- Сохранение истории игр

---

## Игровой Flow

### 1. Создание игры (Host)

```
User → CreatePage: выбирает подарки
CreatePage → Backend REST: POST /lobby/create_battle { gifts: [1,2] }
CreatePage → sessionStorage: сохраняет pending_bet { gifts, total }
CreatePage → navigate('/lobby')

LobbyPage → Backend REST (polling): GET /lobby/waiting_status
Backend → LobbyPage: { status: 1, game_id: -1 } // ожидание
...
Backend → LobbyPage: { status: -1, game_id: 201 } // игра найдена!

LobbyPage → sessionStorage: переносит pending_bet → battle_bet_201
LobbyPage → navigate('/lobby/battle/201')
```

### 2. Присоединение к игре (Guest)

```
User → LobbyPage: видит карточку игры, клик "Join"
LobbyPage → navigate('/lobby/join/5')

JoinPage → Backend REST: POST /lobby/join_battle { gifts: [3,4], queque_id: 5 }
Backend → JoinPage: { game_id: 201 }
JoinPage → sessionStorage: сохраняет battle_bet_201
JoinPage → navigate('/lobby/battle/201')
```

### 3. Realtime Gameplay (BattlePage)

#### 3.1 Подключение к Socket.IO

```
BattlePage mount
  → GameSocketProvider: socket = io('/game', { auth: { token } })
  → useBattleSocket(201): emit('join_game', { gameId: 201, tuid: 335707594 })

Node Server:
  GameManager.get('201') → new Game('201')
  Game.addPlayer(socket) → assign role 'a' or 'b'
  emit('joined', { gameId: '201', role: 'a' })
  
Both players joined → Game.setPhase('placing')
```

#### 3.2 Размещение клада (Placing Phase)

```
User A: выбирает ячейку 5, клик "Confirm"
BattlePage → useBattleSocket: placeSecret(5)
  → socket.emit('place_secret', { cell: 5 })

Node Server:
  Game.placeSecret(socketId, 5)
    → players.a.secret = 5
    → call Backend: POST /lobby/set_filed { game_id: 201, field: 5 }
    → if (bothSecretsPlaced()) → doToss()
    
User B: аналогично выбирает ячейку 9
Node Server: bothSecretsPlaced() = true → doToss()
```

#### 3.3 Бросок монетки (Toss Phase)

```
Node Server: Game.doToss()
  seed = randomInt(0, 100)
  firstTurn = seed % 2 === 0 ? 'a' : 'b'
  setPhase('toss')
  emit('toss', { firstTurn: 'a', seed })
  
  setTimeout 800ms → startTurn('a')

BattlePage (оба игрока):
  Получают 'toss' event
  → Показывают overlay с анимацией монетки 🪙
  → "You start!" или "Opponent starts"
  → 2.5 секунды анимация, затем скрывается
```

#### 3.4 Игровые ходы (Turn Phase)

```
Node Server: startTurn('a')
  setPhase('turn_a')
  turn = 'a'
  players.a.timeLeft = 25000
  startTimer() → каждую секунду emit('state', { ... })

BattlePage (Player A):
  phase = 'turn_a', turn = 'a', role = 'a' → myTurn = true
  UI: "Your move", таймер 25s, прогресс-бар, можно выбрать ячейку
  
User A: выбирает ячейку 9 (где клад B), клик "Fire"
BattlePage → move(9, moveId='1234567-9')
  → socket.emit('move', { cell: 9, moveId: '1234567-9' })

Node Server: Game.move(socketId, 9, '1234567-9')
  Check idempotency: moveIds.a.has('1234567-9') → false → add
  Call Backend: POST /lobby/step { game_id: 201, field: 9 }
  
Backend Response: [{ gid: 1, value: 1, slug: 'gift-1', photo: '...' }] // HIT + WIN!

Node Server:
  emit('move_result', { by: 'a', cell: 9, result: 'hit', winner: 'a', rewards: [...] })
  finish('a', { reason: 'hit', rewards: [...] })
  emit('game_over', { winner: 'a', rewards: [...] })

BattlePage (Player A):
  Получает 'move_result' → обновляет grid[9].state = 'hit'
  Получает 'game_over' → показывает win sheet с подарками и суммой
  
BattlePage (Player B):
  Получает 'game_over' → показывает lose sheet с проигранными подарками из myBet
```

#### 3.5 Промах (Miss)

```
Backend Response: { status: 0 } // MISS

Node Server:
  players.a.timeLeft += 3000 // +3 секунды
  emit('move_result', { by: 'a', cell: 3, result: 'miss' })
  startTurn('b') // переключение хода

BattlePage (Player A):
  grid[3].state = 'miss'
  UI: "Waiting enemy move"

BattlePage (Player B):
  UI: "Your move"
  Таймер: 25s + 3s (если это не первый ход)
```

#### 3.6 Таймаут

```
Node Server: startTimer()
  setInterval(1000) → players[turn].timeLeft -= 1000
  if (timeLeft <= 0) → clearInterval, finish(opponent, { reason: 'timeout' })
  emit('game_over', { winner: 'b', reason: 'timeout' })

BattlePage:
  Проигравший видит lose sheet
  Победитель видит win sheet (rewards могут быть пустыми, т.к. timeout)
```

#### 3.7 Сдача (Concede)

```
User A: клик "Concede" в StatusBar
BattlePage → concede()
  → socket.emit('concede')

Node Server: Game.concede(socketId)
  winner = opponent
  Call Backend: POST /lobby/concede { game_id: 201, tuid: A_tuid }
  finish(winner, { reason: 'concede' })
  emit('game_over', { winner: 'b', reason: 'concede' })
```

---

## Важные детали реализации

### Идемпотентность ходов

Каждый ход генерирует уникальный `moveId = Date.now() + '-' + cell`. Сервер хранит `Set` использованных moveId для каждого игрока. Если клиент отправляет дубль (из-за retry или задержки), сервер игнорирует его.

### Авторизация Socket.IO

При подключении клиент отправляет `auth: { token }`. Сервер сохраняет токен в `players[role].token` и использует его в `Authorization` заголовке при вызовах backend REST API:

```js
Authorization: `Bearer ${players[role].token}`
```

### Синхронизация времени

Клиент получает `state` события с `players.a.timeLeft` и `players.b.timeLeft` (миллисекунды). BattlePage конвертирует в секунды и отображает в `StatusBar` с прогресс-баром.

### Очистка игр

После `game_over` игра удаляется из памяти через 30 секунд:

```js
setTimeout(() => manager.delete(gameId), 30000)
```

Попытка переподключиться к finished игре вернёт ошибку `GAME_FINISHED`.

### Прокси в dev режиме

**vite.config.js** проксирует запросы:
- `/api/*` → backend REST (Python)
- `/game`, `/socket.io/*` → node сервер :4000

**Cloudflare Tunnel** (dev) запускается после Vite (`wait-on`) для стабильного HTTPS/WSS доступа из Telegram.

### Хранение ставок

Ставки сохраняются в `sessionStorage`:

```js
sessionStorage.setItem(`battle_bet_${gameId}`, JSON.stringify({
  gifts: [{ gid, value, slug, photo }],
  total: 2.5
}))
```

При поражении BattlePage загружает эти данные и показывает в lose sheet.

---

## Логирование

### Frontend Logger

**Файл:** `src/shared/logger.js`

**Методы:**
- `logger.error(...)`
- `logger.warn(...)`
- `logger.info(...)`
- `logger.debug(...)`

**Особенности:**
- Логи пишутся в console и буфер (200 записей)
- Можно подписаться: `logger.subscribe(fn)`
- DebugConsole (`src/components/Debug/DebugConsole.jsx`) отображает логи в реальном времени

**Важные логи:**
- `GameSocket: connected ✅` — сокет подключился
- `GameSocket: ← eventName` — все входящие события (onAny)
- `useBattleSocket: → place_secret`, `→ move` — исходящие события
- `useBattleSocket: joined` — успешное присоединение к игре

### Backend Logs

Django логи (не изменялись).

### Node Server Logs

**Консоль:**
```
[SOCKET] Client connected: <socket.id>
[SOCKET] join_game from <sid>: gameId=201, tuid=335707594
[SOCKET] Player assigned role: a in game 201
[SOCKET] place_secret from <sid>: cell=5
[GAME 201] Player a placed secret at cell 5
[GAME 201] Waiting for other player to place secret (have: a)
[GAME 201] Player b placed secret at cell 9
[GAME 201] Both secrets placed, starting toss
[GAME] Cleaning up finished game 201
```

---

## UI/UX особенности

### Coin Toss Animation

**Файл:** `src/pages/Battle/BattlePage.jsx`

- Полноэкранный overlay с затемнением (`bg-black/40`)
- Золотая монетка 🪙 вращается 1080° за 1 секунду
- Светящийся эффект (`shadow-[0_0_40px_rgba(251,191,36,0.6)]`)
- Текст результата появляется снизу вверх с задержкой
- Показывается **один раз** за игру (флаг `tossShown`)

### Timer Progress Bar

**Файл:** `src/pages/Battle/StatusBar.jsx`

- Прогресс-бар под заголовком
- Заполнение от 100% до 0% за 25 секунд
- Градиент: оранжевый → красный при ≤5 секундах
- Пульсация цифр таймера при низком времени
- Плавная анимация `transition-all duration-1000 ease-linear`

### Win/Lose Sheets

**Победа:**
- Заголовок: "Your gifts:"
- Сумма: `+X.XX TON` (зелёная)
- Подарки: реальные картинки из `rewards[]`

**Поражение:**
- Заголовок: "You lost"
- Сумма: `-X.XX TON` (красная)
- Подарки: проигранные подарки из `myBet.gifts`

---

## Безопасность

### Telegram WebApp

- Аутентификация через `window.Telegram.WebApp.initData`
- Backend проверяет подпись `hash` от Telegram
- JWT токен действителен 24 часа

### Socket.IO Authorization

- Токен передаётся в `auth: { token }` при подключении
- Node сервер сохраняет токен и использует в backend запросах
- Backend проверяет JWT и tuid для авторизации действий

### Backend API

- Все эндпоинты игры требуют `Authorization: Bearer <token>`
- Backend проверяет, что игрок является участником игры
- Backend вычисляет hit/miss и награды (клиент не может читить)

---

## Масштабирование

### Текущее состояние

- Node сервер: in-memory хранение игр (Map)
- Подходит для ~1000 одновременных игр на одном инстансе
- При перезапуске сервера все активные игры теряются

### Будущие улучшения

1. **Redis для состояния игр:**
   - Сохранять `Game` state в Redis
   - Позволит горизонтальное масштабирование (несколько Node серверов)
   - Восстановление игр после перезапуска

2. **Socket.IO Adapter:**
   - Redis Adapter для синхронизации событий между серверами
   - Sticky sessions на load balancer

3. **Мониторинг:**
   - Prometheus метрики (активные игры, latency, errors)
   - Grafana дашборды

4. **Rate Limiting:**
   - Ограничение на создание игр (X игр в минуту на пользователя)
   - Защита от спама ходами

---

## Известные ограничения

1. **Переподключение:** Если игрок теряет соединение, он не может восстановить состояние игры (нет reconnection logic с lastVersion).

2. **Spectator mode:** Нет режима наблюдателя за чужими играми.

3. **История игр:** Node сервер не сохраняет историю; backend может хранить только финальный результат.

4. **Multiple devices:** Один пользователь не может играть с разных устройств одновременно (последний socketId перезапишет предыдущий).

5. **Graceful shutdown:** При остановке Node сервера активные игры прерываются без уведомления.

---

## Troubleshooting

### Socket не подключается

1. Проверь логи в DebugConsole: `GameSocket: connected ✅`
2. Проверь, что node сервер запущен на :4000
3. Проверь Vite proxy: `/game` и `/socket.io` должны проксироваться
4. Проверь Cloudflare Tunnel: `cloudflared tunnel run` должен быть активен

### Игра зависла на "Expecting player"

1. Проверь серверные логи: `[GAME] Player a placed secret`
2. Проверь, что оба игрока отправили `place_secret`
3. Проверь, что backend `/lobby/set_filed` не возвращает ошибку
4. Перезапусти node сервер, чтобы очистить старую игру

### Таймер не синхронизирован

1. Node сервер — источник истины для времени
2. Клиент получает `state` события каждую секунду
3. Если сеть лагает, клиент может отставать

### Подарки не показываются

1. Проверь `sessionStorage`: `battle_bet_${gameId}`
2. Проверь, что CreatePage/JoinPage сохранили ставку
3. Проверь, что backend вернул `rewards[]` в `/lobby/step`

---

## Версионирование

**Current Version:** 1.0.0 (MVP with realtime gameplay)

**Frontend:** React 19, Vite 7, Socket.IO Client 4.x  
**Backend:** Django (existing)  
**Node Server:** Node.js 20+, Socket.IO 4.x

