# Gilda – деплой на TimeWeb App Platform

Четыре сервиса, всё через дашборд TimeWeb:
1. **PostgreSQL** — база данных
2. **S3** — хранилище фотографий
3. **Backend** — Node.js App Platform (ветка `main`)
4. **Frontend** — Static App Platform (ветка `main`)

---

## Шаг 1 — PostgreSQL

TimeWeb → Базы данных → Создать → PostgreSQL

Сохрани данные подключения — они нужны для `DATABASE_URL`:
```
postgresql://USER:PASSWORD@HOST:5432/DB_NAME
```

---

## Шаг 2 — S3 хранилище

TimeWeb → Хранилище S3 → Создать бакет

- Название: `gilda-uploads` (или любое)
- **Доступ: Публичный** (чтобы фото открывались по URL)

После создания: Управление бакетом → Ключи доступа → Создать ключ

Сохрани:
- Endpoint: `https://s3.timeweb.cloud`
- Region: `ru-1`
- Access Key
- Secret Key
- Bucket name

---

## Шаг 3 — Backend (App Platform)

TimeWeb → App Platform → Создать → Node.js

| Поле | Значение |
|------|----------|
| Репозиторий | `https://github.com/jimparkby/gildamarket` |
| Ветка | `main` |
| Корневая папка | `backend` |
| Build command | `npm install && npx prisma generate && npx prisma db push` |
| Start command | `node src/index.js` |
| Port | `3000` |

### Переменные окружения:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
BOT_TOKEN=8203663822:AAFv-9EuARezWfp0ZFjWGk9IxX4iRZ521PU
JWT_SECRET=придумай_длинную_случайную_строку_минимум_32_символа
NODE_ENV=production
PORT=3000
MAX_FILE_SIZE_MB=10
S3_ENDPOINT=https://s3.timeweb.cloud
S3_REGION=ru-1
S3_BUCKET=gilda-uploads
S3_ACCESS_KEY=твой_access_key
S3_SECRET_KEY=твой_secret_key
MINI_APP_URL=https://URL_ФРОНТЕНДА (заполнить после деплоя фронта)
```

После деплоя скопируй URL бэкенда.

---

## Шаг 4 — Frontend (App Platform / Static)

TimeWeb → App Platform → Создать → Static

| Поле | Значение |
|------|----------|
| Репозиторий | `https://github.com/jimparkby/gildamarket` |
| Ветка | `main` |
| Корневая папка | `frontend` |
| Build command | `npm install && npm run build` |
| Output directory | `dist` |

### Переменные окружения:

```
VITE_API_URL=https://URL_БЭКЕНДА/api
```

---

## Шаг 5 — Настроить бота в BotFather

```
/setmenubutton → выбрать бота → Web App
URL: https://URL_ФРОНТЕНДА
Название: Open Gilda
```

---

## Порядок деплоя

```
PostgreSQL → S3 → Backend → Frontend → BotFather
```

1. Создать PostgreSQL → получить DATABASE_URL
2. Создать S3 бакет → получить ключи
3. Задеплоить backend → получить URL бэкенда
4. Задеплоить frontend с VITE_API_URL → получить URL фронта
5. Обновить MINI_APP_URL в переменных бэкенда
6. Настроить кнопку в BotFather

---

## Ветки репозитория

| Ветка | Назначение |
|-------|-----------|
| `main` | **Продакшн** — деплоится на TimeWeb |
| `dev` | Разработка — сюда пушим изменения, затем мержим в main |

Workflow:
```bash
# Работаем в dev
git checkout dev
# ... делаем изменения ...
git push origin dev

# Когда готово к деплою
git checkout main
git merge dev
git push origin main
# TimeWeb автоматически передеплоит
```
