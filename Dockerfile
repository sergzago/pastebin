# ---------- Этап сборки ----------
FROM node:20-alpine AS build

WORKDIR /app

# Инструменты для компиляции нативного модуля better-sqlite3,
# если для musl-платформы нет готового prebuilt-бинарника
RUN apk add --no-cache python3 make g++

# Копируем только манифесты зависимостей
COPY package*.json ./

# Устанавливаем зависимости (нативный модуль better-sqlite3 собирается здесь)
RUN npm ci --only=production

# ---------- Финальный образ ----------
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Копируем установленные зависимости из этапа сборки
COPY --from=build /app/node_modules ./node_modules

# Копируем исходники приложения
COPY src ./src
COPY public ./public

# Директория данных (БД, ключ шифрования, файлы записей)
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["node", "src/server.js"]