# 모노레포 Stage 6 — web Docker화 + compose 통합

> 📚 [문서 홈](README.md) · [모노레포 전환 로드맵](monorepo-migration.md) · [← Stage 5](monorepo-stage-5.md)

> **3줄 요약**
> 1. 프론트(web)도 Docker 이미지로 만들어, **DB + 백엔드 + 웹을 한 명령으로** 띄우게 했다.
> 2. 컨테이너 안에서 web은 `http://backend:3000`(서비스 이름)으로 백엔드를 호출한다.
> 3. 이걸로 로드맵 완주 — **개발 모드(npm run dev)** 와 **전체 컨테이너 모드(docker compose up)** 둘 다 가능.

---

## 먼저 — 이번에 나오는 용어 3개

| 용어 | 뜻 (쉽게) |
|---|---|
| **Next standalone** | Next 빌드 옵션. 실행에 꼭 필요한 파일만 모은 **최소 번들**(`.next/standalone`)을 만들어, 운영 이미지를 가볍게 함 |
| **컨테이너 네트워크** | compose가 만든 가상 네트워크. 그 안에서 컨테이너끼리는 **서비스 이름**(예: `backend`)을 호스트명처럼 써서 통신 |
| **outputFileTracingRoot** | "이 앱이 어떤 파일/의존성에 의존하는지 추적할 기준 폴더". 모노레포는 의존성이 **루트 node_modules**에 있어 기준을 루트로 잡아줘야 함 |

---

## 무엇을 / 왜 했나

### 1. Next.js standalone 출력

[apps/web/next.config.ts](../apps/web/next.config.ts):
```ts
const nextConfig = {
  output: 'standalone',                              // 최소 실행 번들
  outputFileTracingRoot: path.join(__dirname, '../../'), // 추적 기준 = 레포 루트
};
```
- `output: 'standalone'` → `npm run build`가 `.next/standalone/`에 **자체 실행 가능한 서버**(`server.js`)를 생성. 무거운 빌드 도구 없이 이것만 있으면 돎.
- `outputFileTracingRoot` → 모노레포라서 web이 쓰는 의존성이 **루트 node_modules**에 있어요. 추적 기준을 루트로 줘야 standalone이 그 의존성까지 챙김.

### 2. web Dockerfile (백엔드 없이 빌드)

[apps/web/Dockerfile](../apps/web/Dockerfile) — 백엔드 Dockerfile과 같은 "루트 컨텍스트 + 워크스페이스" 방식.

> **핵심 통찰**: 공유 타입(`schema.d.ts`)을 **git에 커밋해뒀기 때문에**(Stage 4), web 이미지는 **백엔드를 실행하지 않고도** 빌드돼요. 커밋된 타입 파일만 읽으면 되니까요.

```dockerfile
# build: 워크스페이스 설치 → web만 빌드
COPY package.json package-lock.json ./
COPY apps/*/package.json apps/* (매니페스트들)
RUN npm ci --ignore-scripts
COPY apps/web ./apps/web
COPY packages/api-types ./packages/api-types   # 커밋된 schema.d.ts 포함
RUN npm run build -w @feel-pick/web

# runtime: standalone 출력만 복사
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
CMD ["node", "apps/web/server.js"]
```

### 3. api 클라이언트가 컨테이너 주소를 쓰게

[apps/web/src/lib/api.ts](../apps/web/src/lib/api.ts): 베이스 URL을 런타임 env로:
```ts
baseUrl: process.env.API_URL ?? 'http://localhost:3000'
```
- 로컬 개발: env 없음 → `localhost:3000`
- 컨테이너: compose가 `API_URL=http://backend:3000` 주입

> **왜 `NEXT_PUBLIC_`이 아니라 `API_URL`?** `NEXT_PUBLIC_*` 변수는 **빌드 시점에 코드에 박혀버려요**(클라이언트 번들용). 우리는 서버 컴포넌트에서 **런타임에** 값을 읽어야 하므로 일반 env(`API_URL`)를 씀.

### 4. docker-compose에 web 추가

[docker-compose.yml](../docker-compose.yml):
```yaml
web:
  build: { context: ., dockerfile: apps/web/Dockerfile }
  depends_on: [backend]
  environment:
    PORT: 3001
    HOSTNAME: '0.0.0.0'              # 컨테이너 밖에서 접근 가능하게
    API_URL: 'http://backend:3000'   # 서비스 이름으로 백엔드 호출
  ports: ['3001:3001']
```

---

## 함정 (실제로 겪음)

| 함정 | 원인 | 해결 |
|---|---|---|
| standalone 진입점 경로 | 모노레포라 `server.js`가 `apps/web/` 아래 생성됨 | `CMD ["node", "apps/web/server.js"]` |
| 컨테이너 밖에서 web 접속 불가 | Next standalone이 localhost에만 바인딩 | `HOSTNAME=0.0.0.0` 주입 |
| web→백엔드 연결 실패 | 컨테이너 안 `localhost`는 자기 자신 | 서비스 이름 `http://backend:3000` 사용 |
| 런타임 URL이 안 먹힘 | `NEXT_PUBLIC_*`은 빌드 때 박힘 | 서버용 `API_URL`(런타임 읽기) |

---

## ⚠️ 두 가지 실행 모드 (포트가 겹침)

| 모드 | 명령 | 백엔드/웹 실행 위치 |
|---|---|---|
| **로컬 개발** | `docker compose up -d mysql` + `npm run dev` | npm(핫리로드) |
| **전체 컨테이너** | `docker compose up -d --build` | 전부 컨테이너 |

둘 다 3000/3001을 쓰므로 **동시 사용 불가.** 전환할 땐:
```bash
# 컨테이너 모드 → 개발 모드
docker compose stop backend web   # 3000/3001 비우기 (mysql은 유지)
npm run dev
```

> 참고: 이 단계 직후 compose 서비스 이름을 **`app` → `backend`** 로 바꿨어요. web이 합류하니 'app'이 모호해서(백엔드만 가리킴) 명확하게 정리.

---

## 검증 (실제로 다 돌림)

```
✅ docker compose up --build → backend / mysql / web 3개 컨테이너 기동
✅ 백엔드 /health → 200 (DB up)
✅ web(:3001) → http://backend:3000 → mysql 체인 작동, 화면에 픽 렌더
```

---

## 🏁 로드맵 완주

| Stage | 한 일 |
|---|---|
| 1 | 백엔드 → apps/backend + 워크스페이스 |
| 2 | Docker/CI를 모노레포에 맞춤 |
| 3 | Next.js 프론트 합류 (apps/web) |
| 4 | 공유 타입 파이프라인 (Swagger → 타입) |
| 5 | 프론트↔백 연동 + 타입 공유 증명 |
| **6** | **web Docker화 + compose 통합** |

백엔드 + 프론트가 **한 레포에서 타입으로 묶이고**, **한 명령으로 전부 컨테이너 기동**되는 모노레포가 완성됐어요.

## 다음에 해볼 만한 것

- **실제 배포** — Fly.io/Railway 등에 backend·web 이미지 올리기 (계정 필요)
- **기능 추가** — 댓글·정렬·페이지네이션 등. 백엔드에 DTO 추가 → 타입 재생성 → 프론트가 바로 타입 안전하게 사용 (모노레포의 이점을 반복 체험)
- **CI에 web 빌드 추가** — 현재 CI는 백엔드 중심. web build/lint도 추가 가능
