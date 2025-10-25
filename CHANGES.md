# ✅ ОБНОВЛЁННАЯ СТРУКТУРА

## 🎯 Что изменилось:

### ❌ БЫЛО (старая версия):
```
Docker:
├── Frontend (nginx) - порт 80
└── Game Server - порт 3001
```

### ✅ СТАЛО (новая версия):
```
НА ХОСТЕ:
├── Nginx (порт 80) ← проксирует всё
└── FastAPI (порт 8123)

В DOCKER:
├── Frontend (serve) - порт 5000
└── Game Server - порт 3001
```

---

## 📦 Измененные файлы:

1. **`Dockerfile`** ✅
   - Изменён с `nginx:alpine` на `node:20-alpine + serve`
   - Теперь отдаёт статику через `serve` на порту 5000

2. **`docker-compose.yml`** ✅
   - Frontend: порт `5000:5000` (было `80:80`)
   - Game Server: порт `3001:3001` (без изменений)

3. **`nginx-server.conf`** ✅ (главный конфиг для Nginx на хосте)
   - Проксирует `/` → `localhost:5000` (Frontend)
   - Проксирует `/socket.io/` → `localhost:3001` (Game Server)
   - Проксирует `/api/` → `localhost:8123` (FastAPI)

4. **`nginx.conf`** ❌ УДАЛЁН
   - Больше не нужен, так как Nginx на хосте

---

## 🚀 КОМАНДЫ ДЛЯ ДЕПЛОЯ

```bash
# На сервере
cd /var/www/shispy

# Запусти Docker контейнеры
docker compose up -d --build

# Проверь
docker compose ps
# Должно быть:
# shispy-frontend    Up    0.0.0.0:5000->5000/tcp
# shispy-game-server Up    0.0.0.0:3001->3001/tcp

# Настрой Nginx (на хосте)
sudo cp nginx-server.conf /etc/nginx/sites-available/shispy
sudo nano /etc/nginx/sites-available/shispy  # Замени your-domain.com
sudo ln -s /etc/nginx/sites-available/shispy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# ГОТОВО!
```

---

## 🗺️ ИТОГОВАЯ АРХИТЕКТУРА

```
Пользователь → http://домен.com
                    ↓
            Nginx (:80) НА ХОСТЕ
                    ↓
        ┌───────────┼───────────┐
        ↓           ↓           ↓
    /           /socket.io/   /api/
        ↓           ↓           ↓
  Docker:5000  Docker:3001  FastAPI:8123
  (Frontend)  (WebSocket)   (на хосте)
```

---

## ✅ ПРЕИМУЩЕСТВА НОВОЙ СТРУКТУРЫ

1. **Nginx на хосте** - проще управлять SSL, логами, конфигурацией
2. **Frontend на порту 5000** - порт 80 свободен для Nginx
3. **Меньше контейнеров** - только приложения в Docker
4. **Быстрее обновления** - перезагружаем только нужный контейнер
5. **Совместимость** - FastAPI уже на хосте, теперь всё согласовано

---

## 📚 ДОКУМЕНТАЦИЯ

- **`DEPLOY-FINAL.md`** - Главная инструкция (ОБНОВЛЕНА)
- **`QUICKSTART.md`** - Быстрая шпаргалка (ОБНОВЛЕНА)
- **`DEPLOYMENT.md`** - Полный гайд (нужно обновить при необходимости)
- **`nginx-server.conf`** - Конфиг для Nginx на сервере ✅

---

🎉 **ВСЁ ГОТОВО К ДЕПЛОЮ!**
