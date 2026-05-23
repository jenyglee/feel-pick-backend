# syntax=docker/dockerfile:1
# 빌드 컨텍스트는 "레포 루트"다 (워크스페이스 lockfile이 루트에 있으므로).
#   docker build -f apps/web/Dockerfile .
# 공유 타입(schema.d.ts)은 git에 커밋돼 있어, web 이미지는 백엔드 없이도 빌드된다.

# ---------- build 단계 ----------
FROM node:22-slim AS build
WORKDIR /app

# 워크스페이스 lockfile + 모든 워크스페이스 매니페스트 (npm ci가 트리 검증에 필요)
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/web/package.json ./apps/web/
COPY packages/api-types/package.json ./packages/api-types/
RUN npm ci --ignore-scripts

# web 빌드에 필요한 소스만 (백엔드 소스는 불필요 — 공유 타입은 api-types에 커밋됨)
COPY apps/web ./apps/web
COPY packages/api-types ./packages/api-types
RUN npm run build -w @feel-pick/web

# ---------- runtime 단계: Next standalone 출력만 ----------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# standalone 서버 + 정적 자산 + public
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3001
# standalone 서버 진입점 (모노레포라 apps/web 아래에 생성됨)
CMD ["node", "apps/web/server.js"]
