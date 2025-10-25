# Shipsy Frontend

Mobile-first React app (390×812) built with Vite and Tailwind (v4). It targets Telegram WebApp, includes a shared header and bottom nav, and several feature pages: Lobby, Create, Join, Battle, etc.

## 🚀 Deployment

- **[Full Deployment Guide](./DEPLOYMENT.md)** - Полный гайд по деплою с Docker и Nginx
- **[Quick Start Guide](./QUICKSTART.md)** - Быстрая шпаргалка для деплоя

## Stack

- React 19 + React Router 7
- Vite 7, @vitejs/plugin-react
- Tailwind CSS 4 (via `@tailwindcss/vite` plugin)
- ESLint 9 (recommended JS + react-hooks + react-refresh)
- Socket.IO Client 4.x - Real-time game logic
- TON Connect - Wallet integration

## Run

- Dev server
	- npm run dev
- Local preview
	- npm run build && npm run preview
- Cloudflare tunnel (optional)
	- npm run dev:twa (runs dev + tunnel for Telegram WebApp)
- Game Server + Frontend
	- npm run dev:twa:game (runs everything: frontend, tunnel, game server)

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
