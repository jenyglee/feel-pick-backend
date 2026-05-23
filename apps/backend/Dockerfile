# syntax=docker/dockerfile:1
# 빌드 컨텍스트는 "레포 루트"다 (워크스페이스 lockfile이 루트에 있으므로).
#   docker build -f apps/backend/Dockerfile .

# ---------- build 단계: 컴파일 + Prisma Client 생성 ----------
FROM node:22-slim AS build
WORKDIR /app

# prisma generate가 prisma.config.ts의 env('DATABASE_URL')를 읽으므로
# 빌드 시점 placeholder를 둔다 (실제 연결은 안 함, 런타임에 덮어씀).
ENV DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder"

# 워크스페이스 매니페스트 + lock 먼저 복사 → 의존성 레이어 캐시
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
RUN npm ci --ignore-scripts

# 백엔드 소스 복사 후 Prisma Client 생성 + 빌드
COPY apps/backend ./apps/backend
RUN npm run prisma:generate -w @feel-pick/backend \
 && npm run build -w @feel-pick/backend

# ---------- runtime 단계: 운영 의존성만 + 산출물 ----------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder"

COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
RUN npm ci --omit=dev --ignore-scripts

# 스키마/설정/마이그레이션 복사 후 운영 node_modules에 Prisma Client 생성
COPY apps/backend/prisma ./apps/backend/prisma
COPY apps/backend/prisma.config.ts ./apps/backend/
RUN npm run prisma:generate -w @feel-pick/backend

# 빌드 산출물 복사
COPY --from=build /app/apps/backend/dist ./apps/backend/dist

# 앱은 backend 워크스페이스 디렉터리에서 실행 (prisma.config.ts/dist 기준)
WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
