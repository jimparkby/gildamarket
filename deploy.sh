#!/bin/bash
# Gilda – build & deploy script for TimeWeb
set -e

echo "▶ Installing backend dependencies..."
cd backend && npm install

echo "▶ Generating Prisma client..."
npx prisma generate

echo "▶ Running DB migrations..."
npx prisma db push

echo "▶ Installing frontend dependencies..."
cd ../frontend && npm install

echo "▶ Building frontend..."
npm run build

echo "▶ Restarting backend via PM2..."
cd ..
if pm2 id gilda > /dev/null 2>&1; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
  pm2 save
fi

echo "✅ Deploy complete."
echo "   Logs: pm2 logs gilda"
echo "   Status: pm2 status"
