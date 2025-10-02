# Shipsy TWA — Fast README (Windows + Vite + Tailwind + Telegram Web App)

## 🎯 Цель

Верстаем Telegram Web App (TWA) по макету из Figma (Dev Mode). На этом этапе **только фронт/верстка**, бэкенд подключится позже. Готовим структуру, токены, UI-компоненты и мок-данные, чтобы дальнейшая интеграция прошла без ломки верстки.

---

## 🧰 Стек и предпосылки

* **Vite + React (JS)**
* **TailwindCSS** с токенами из UI Kit
* **Telegram WebApp SDK** (подключим позже, пока стабы)
* **Cloudflare Tunnel (cloudflared)** для HTTPS-линка, чтобы открыть приложение внутри Telegram

**Windows prerequisites:**

* Node.js 18+ / 20+ (LTS)
* Git
* PowerShell (PS) — подойдёт стандартный, удобно PS7+

---

## 🚀 Быстрый старт

```bash
# установка зависимостей
npm i

# (опционально) развернуть структуру пустых файлов под Windows
# если в корне есть scaffold.ps1:
npm run scaffold

# дев-сервер
npm run dev
```

Откроется [http://localhost:5173](http://localhost:5173)

---

## 🖼️ Работа с Figma (Dev Mode)

1. Включи **Dev Mode** → вкладка **Inspect**.
2. Копируй Tailwind-классы/значения (цвета, radius, spacing) в компоненты.
3. Повторяющиеся токены сразу выносим в `tailwind.config.js` и `src/assets/tokens/colors.json`.
4. Делаем «черновую» верстку компонентов → потом точная подгонка.

---

## 🌐 Telegram Web App в деве (через Cloudflare Tunnel)

Нужен публичный **HTTPS**-URL. Самый быстрый путь — `cloudflared` из npm.

### 1) Установка

```bash
npm i -D cloudflared concurrently
```

### 2) Скрипты в `package.json`

Добавь:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "scaffold": "powershell -ExecutionPolicy Bypass -File scaffold.ps1",
    "tunnel": "cloudflared tunnel --url http://localhost:5173",
    "dev:twa": "concurrently \"npm:dev\" \"npm:tunnel\""
  }
}
```

> Альтернатива без установки: запусти `npm run dev` в одном терминале и **в другом** `npx cloudflared tunnel --url http://localhost:5173`.

### 3) Старт

```bash
npm run dev:twa
```

В логе `cloudflared` появится публичный `https://<random>.trycloudflare.com`. Это твой dev-URL.

### 4) Подключение в BotFather (минимально достаточно)

* Открой **@BotFather** → `/setmenubutton` → выбери бота → **Web App** → вставь **публичный URL**.
* Зайди в бота → `/start` → в меню появится кнопка, открывающая твою Web App.

> ⚠️ При каждом рестарте `cloudflared` домен может измениться — обновляй URL у BotFather. Для стабильного домена используй именованный Tunnel (настроим позже, не обязательно для первого запуска).

---

## 📁 Важные директории (сверстано «по слоям»)

* `src/components/ui/` — кнопки, инпуты, модалки, табы, прогресс, тосты
* `src/components/layout/` — Header / BottomNav / AppLayout
* `src/components/widgets/` — карточки боёв, инвентарь, история, баннеры
* `src/pages/*` — страницы Map, Live, Lobby, Treasure, Profile, Add, Battle, Create/Join Battle
* `src/assets/tokens/` — цвета/spacing из UI Kit
* `src/__mocks__/` и `*.mock.json` — мок-данные для верстки
* `src/features/telegram/telegram.stub.js` — стабы API TWA (инициализация/тема/MainButton)

---

## 📦 Мини-зависимости (для верстки)

```bash
npm i -D tailwindcss postcss autoprefixer
npm i -D concurrently cloudflared
npm i @twa-dev/sdk   # SDK Telegram (можно добавить позже)
```

Tailwind базовый сетап:

* `tailwind.config.js` — подключить `./index.html` и `./src/**/*.{js,jsx}`
* `src/styles/index.css` — `@tailwind base; @tailwind components; @tailwind utilities;`

---

## ✅ Definition of Done (верстка)

* Все экраны доступны по маршрутам/BottomNav
* Пиксели совпадают с Figma Dev Mode на мобильном baseline (360–414px)
* Повторяемые параметры вынесены в токены Tailwind
* Есть визуальные состояния: empty/loading/error, hover/active/disabled
* Стабы под Telegram SDK и будущие API не ломают рендер

---

## 🧪 Трюки и отладка

* Если `cloudflared` не стартует → попробуй `npx cloudflared ...` или запусти PowerShell **от имени администратора**.
* Если порт занят: `vite` можно запустить на другом порту `vite --port 5174` и обновить `--url` в `tunnel`.
* Telegram webview кеширует: при отладке жми **Reload** в правом верхнем меню webview.

---

## 📜 Команды

```bash
npm run dev        # локальный дев без Telegram
npm run tunnel     # только туннель (если dev уже запущен)
npm run dev:twa    # vite + cloudflared вместе (для Telegram)
npm run build      # сборка
npm run preview    # предпросмотр сборки
npm run scaffold   # создать структуру файлов (Windows PowerShell)
```
