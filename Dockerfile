FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend/prisma ./prisma
RUN npx prisma generate

COPY backend/src ./src

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "src/index.js"]
