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

echo "✅ Build complete. Frontend dist: frontend/dist/"
echo "   Start backend with: cd backend && npm start"
