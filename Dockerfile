# Production

FROM node:24-alpine AS builder

WORKDIR /app

# Копируем зависимости и устанавливаем их
COPY package*.json ./
COPY prisma/schema.prisma ./prisma/
RUN npm ci --legacy-peer-deps
RUN npx prisma generate

# Копируем исходный код и собираем приложение
COPY . .
RUN npm run build

# Финальный образ (мультистадж)
FROM node:24-alpine AS runner
WORKDIR /app

# Копируем только необходимые файлы
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
RUN npm ci --omit=dev --legacy-peer-deps
RUN npx prisma generate
# genarate again due prisma bugs


CMD ["npm", "start"]