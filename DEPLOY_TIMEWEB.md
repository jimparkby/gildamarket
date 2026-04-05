# Gilda – деплой на TimeWeb

## 1. Создать базу данных PostgreSQL на TimeWeb
- Сервисы → База данных → PostgreSQL
- Запомнить: хост, порт, имя БД, пользователь, пароль

## 2. Создать Cloud Server (VPS) или App Platform
- Node.js 18+
- Рекомендуемый план: минимум 1 CPU / 1 GB RAM

## 3. Настроить переменные окружения
Создать файл `backend/.env` на сервере:
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/gilda_db
BOT_TOKEN=<новый токен от BotFather>
JWT_SECRET=<длинная случайная строка>
MINI_APP_URL=https://ваш-домен.timeweb.cloud
PORT=3000
NODE_ENV=production
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
```

## 4. Клонировать репо на сервер
```bash
git clone https://github.com/jimparkby/gildamarket.git
cd gildamarket
chmod +x deploy.sh
./deploy.sh
```

## 5. Запустить с PM2
```bash
npm install -g pm2
cd backend
pm2 start src/index.js --name gilda-api
pm2 save
pm2 startup
```

## 6. Настроить бота в BotFather
```
/newbot → задать имя → задать username
/setmenubutton → выбрать бота → Web App → вставить URL → название "Open Gilda"
```

## 7. ⚠️ ВАЖНО: Сменить токен бота
Актуальный токен: `8203663822:AAFv-9EuARezWfp0ZFjWGk9IxX4iRZ521PU`
Вставить в `backend/.env` как BOT_TOKEN.

## 8. Nginx (если VPS)
```nginx
server {
    listen 80;
    server_name ваш-домен.timeweb.cloud;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
