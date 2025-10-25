# Shipsy Frontend

Mobile-first React app (390×812) built with Vite and Tailwind (v4). It targets Telegram WebApp, includes a shared header and bottom nav, and several feature pages: Lobby, Create, Join, Battle, etc.

## 🚀 Quick Start

### Test Mode (рекомендуется для разработки)
```bash
npm install
npm run dev:twa:game
```

Запускает полный стек:
- Frontend через Cloudflare туннель (для Telegram WebApp)
- Локальный game server (localhost:3001)
- Подключение к удалённому backend (147.45.255.52:8123)

### Другие режимы

| Команда | Описание |
|---------|----------|
| `npm run dev` | Только frontend (localhost:5173) |
| `npm run dev:twa` | Frontend + туннель (без game server) |
| `npm run dev:twa:game` | **Полный стек** (фронт + туннель + game server) |
| `npm run dev:all` | Frontend + game server (без туннеля) |

📖 Подробнее: **[DEV-MODES.md](./DEV-MODES.md)**

---

## 📦 Deployment

- **[DEPLOY.md](./DEPLOY.md)** - Полный гайд по production деплою (Docker, Nginx, SSL)
- **[DEV-MODES.md](./DEV-MODES.md)** - Режимы разработки и отладка

**Production:** https://cosmopoliten.online

## Stack

- **Frontend:** React 19 + React Router 7
- **Build:** Vite 7, @vitejs/plugin-react
- **Styling:** Tailwind CSS 4 (via `@tailwindcss/vite` plugin)
- **Linting:** ESLint 9 (recommended JS + react-hooks + react-refresh)
- **Real-time:** Socket.IO Client 4.x (game logic)
- **Wallet:** TON Connect
- **Game Server:** Node.js + Socket.IO 4.8
- **Backend:** FastAPI (separate repo)

---

## Development

### Run modes

- **Dev server:** `npm run dev` (localhost:5173)
- **Dev + Tunnel:** `npm run dev:twa` (Cloudflare tunnel для Telegram)
- **Full stack:** `npm run dev:twa:game` ⭐ (фронт + туннель + game server)
- **Local build:** `npm run build && npm run preview`

📖 **Подробнее:** [DEV-MODES.md](./DEV-MODES.md)

### Production build
```bash
npm run build  # Генерирует dist/ для деплоя
```

---

## Environment Files

| Файл | Команда | Backend | Game Server |
|------|---------|---------|-------------|
| `.env.development` | `npm run dev` | Remote | - |
| `.env.test` | `npm run dev:twa:game` | Remote | Local |
| `.env.production` | Production | Nginx proxy | Nginx proxy |

---

## App layout

- `src/components/layout/AppLayout.jsx` — shared shell
	- Header: `Header.jsx` (auto-hide on scroll via `useAutoHideHeader`)
	- Main content: scrollable container per page
	- Bottom navigation: `BottomNav.jsx`

## Routes

Defined in `src/App.jsx` (under `<AppLayout />`):

- `/` → redirect to `/live`
- `/live` → LivePage
- `/map` → MapPage
- `/lobby` → LobbyPage (filters, rooms list, CTA Create)
- `/lobby/battle/:id` → BattlePage (battle view)
- `/create` → CreatePage (unified create flow)
- `/join/:id` → JoinPage (join flow for a given room)
- `/treasure` → TreasurePage
- `/profile` → ProfilePage
- `/add` → AddPage
- `/battle/:id` → BattlePage (legacy direct route)

## Key pages and flows

- Lobby (`src/pages/Lobby/LobbyPage.jsx`)
	- Promo card, section title, filters (`LobbyFilters.jsx`), rooms list of `LobbyCard`s
	- Only the content area scrolls; CTA is fixed above BottomNav
	- Join → navigates to `/join/:id`
	- Create → navigates to `/create`

- Lobby card (`src/pages/Lobby/LobbyCard.jsx`)
	- Fixed-size Join button aligned to the right across variants
	- Left preview area has fixed width to stabilize Join button position

- Create (Unified) (`src/pages/Create/CreatePage.jsx`)
	- Inventory grid with add/empty slots
	- Selection highlights and TON total
	- Footer summary + active Create Battle button
	- On create → navigates to `/lobby/battle/:id`

- Join (`src/pages/Join/JoinPage.jsx`)
	- Same grid and footer UX as Create
	- Button labeled "Join"
	- On join → navigates to `/lobby/battle/:id`

- Battle (`src/pages/Battle/BattlePage.jsx`)
	- Battle UI (status, cells, etc.)

## Styling

- Tailwind utility classes throughout
- Figma gradients/shadows matched on CTAs
- Mobile width constrained by container `max-w-[390px]`

## After recent refactor

We unified create logic into `CreatePage` and routed Lobby accordingly. Files removed:

- `src/pages/Lobby/LobbyCreatePage.jsx` — replaced by `src/pages/Create/CreatePage.jsx`

Also updated:

- `src/App.jsx` — routes adjusted (removed `/lobby/create`, added unified `/create`, wired `Join` → `/join/:id`)
- `src/pages/Lobby/LobbyPage.jsx` — CTA now points to `/create`, Join → `/join/:id`, inner content scroll, fixed CTA
- `src/pages/Lobby/LobbyCard.jsx` — fixed Join button sizing and position

## Conventions

- Only page content scrolls; header and bottom nav remain fixed
- Avoid external images for decorative elements (use divs with gradients/shapes)
- Safe area insets respected near the bottom CTA: `env(safe-area-inset-bottom)`

## Next ideas

- Consolidate shared treasure picker/footer into reusable components to DRY Create/Join
- Standardize battle route to `/battle/:id` and update redirects
- Replace placeholder avatars/icons with project SVGs under `src/components/icons`
