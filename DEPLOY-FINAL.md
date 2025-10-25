# 🎯 Финальная инструкция для деплоя

## Твоя конфигурация:
- ✅ **FastAPI** - УЖЕ РАБОТАЕТ на порту 8123 (на хосте)
- ✅ **Nginx** - УЖЕ УСТАНОВЛЕН на сервере (на хосте)
- 🆕 **Frontend (React)** - развернём в Docker на порту 5000
- 🆕 **Game Server (Node.js)** - развернём в Docker на порту 3001

---

## 📝 ЧТО МЕНЯТЬ ПЕРЕД ДЕПЛОЕМ

### 1. Файл `.env.production`
```env
VITE_BACKEND_URL=http://localhost:8123  # FastAPI на 8123
VITE_GAME_WS_URL=/game                  # Nginx будет проксировать
```

### 2. Файл `docker-compose.yml`
Найди строку:
```yaml
- BACKEND_URL=http://host.docker.internal:8123
```
Всё правильно! Не трогай.

### 3. Файл `nginx-server.conf`
Замени `your-domain.com` на свой домен (или IP):
```nginx
server_name твой-домен.ru;  # или IP: 123.123.123.123
```

---

## 🚀 КОМАНДЫ НА СЕРВЕРЕ

```bash
# 1. Перейди в папку проекта
cd /var/www/shispy

# 2. Запусти Docker контейнеры
docker compose up -d --build

# 3. Проверь что всё работает
docker compose ps
# Должны быть запущены:
# - shispy-frontend (порт 5000)
# - shispy-game-server (порт 3001)

# 4. Настрой Nginx
sudo cp nginx-server.conf /etc/nginx/sites-available/shispy
sudo nano /etc/nginx/sites-available/shispy  # Замени your-domain.com на свой
sudo ln -s /etc/nginx/sites-available/shispy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 5. ГОТОВО! Открой http://твой-домен.com
```

---

## 🔍 ПРОВЕРКА РАБОТЫ

### Проверь Docker контейнеры:
```bash
docker compose ps
# Должно быть:
# shispy-frontend    ... Up    0.0.0.0:5000->5000/tcp
# shispy-game-server ... Up    0.0.0.0:3001->3001/tcp
```

### Проверь порты:
```bash
sudo netstat -tulpn | grep -E ':(80|5000|3001|8123)'
# Должно быть:
# :80    LISTEN  (Nginx на хосте)
# :5000  LISTEN  (Docker - Frontend)
# :3001  LISTEN  (Docker - Game Server)  
# :8123  LISTEN  (FastAPI на хосте)
```

### Проверь логи:
```bash
# Docker контейнеры
docker compose logs -f

# Nginx
sudo tail -f /var/log/nginx/error.log
```

---

## 🗺️ КАРТА МАРШРУТИЗАЦИИ

```
Запрос от пользователя
       ↓
Nginx (:80) НА ХОСТЕ
       ↓
   ┌───┴────────────────┐────────────────┐
   ↓                    ↓                 ↓
http://домен/      ws://домен/socket.io/  http://домен/api/
   ↓                    ↓                 ↓
Docker :5000       Docker :3001       FastAPI :8123
(Frontend)       (Game Server)        (на хосте)
```

---

## ⚠️ ВАЖНО!

1. **FastAPI НЕ ТРОГАЕМ** - он уже работает на порту 8123 (на хосте)
2. **Nginx НЕ ТРОГАЕМ** - он уже установлен на сервере (на хосте)
3. **Порты 5000 и 3001** должны быть свободны для Docker
4. **Nginx** проксирует на `localhost:5000`, `localhost:3001`, `localhost:8123`

---

## 🔥 БЫСТРЫЕ КОМАНДЫ

```bash
# Перезапустить контейнеры
docker compose restart

# Посмотреть логи
docker compose logs -f

# Остановить
docker compose down

# Обновить код и передеплоить
git pull origin main
docker compose down
docker compose build --no-cache
docker compose up -d

# Перезагрузить Nginx
sudo systemctl reload nginx
```

---

## ✅ ИТОГОВАЯ СТРУКТУРА

```
Сервер (НА ХОСТЕ):
├── Nginx (порт 80) ✅ УЖЕ УСТАНОВЛЕН
├── FastAPI (порт 8123) ✅ УЖЕ РАБОТАЕТ
└── Docker:
    ├── Frontend (порт 5000) 🆕 РАЗВЕРНЁМ
    └── Game Server (порт 3001) 🆕 РАЗВЕРНЁМ

Nginx проксирует:
├── / → localhost:5000 (Docker Frontend)
├── /socket.io/ → localhost:3001 (Docker Game Server)
└── /api/ → localhost:8123 (FastAPI на хосте)
```

**Результат:**
- `http://твой-домен.com/` - Frontend (React)
- `ws://твой-домен.com/socket.io/` - WebSocket игра
- `http://твой-домен.com/api/` - FastAPI (уже работает)

🎉 УДАЧИ С ДЕПЛОЕМ!
