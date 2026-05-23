# syntax=docker/dockerfile:1

# ---------- build 단계: 컴파일 + Prisma Client 생성 ----------
FROM node:22-slim AS build
WORKDIR /app

# prisma generate가 prisma.config.ts의 env('DATABASE_URL')를 읽으므로
# 빌드 시점 placeholder를 둔다 (실제 연결은 안 함, 런타임에 덮어씀).
ENV DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder"

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npx prisma generate && npm run build

# ---------- runtime 단계: 운영 의존성만 + 산출물 ----------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder"

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# 스키마/설정/마이그레이션 복사 후 운영 node_modules에 Prisma Client 생성
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# 빌드 산출물 복사
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
