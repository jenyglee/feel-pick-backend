# 명령어 치트시트 (운영/개발용)

> 📚 [문서 홈](README.md)

이 프로젝트를 만지면서 실제로 칠 명령어들을 모았어요. **모든 명령은 레포 루트(`feel-pick/`)에서** 실행하는 게 기본이에요 (예외는 표시).

---

## ⚠️ 시작 전 꼭 알아둘 3가지

1. **Node 22를 써야 해요** (Prisma 7 요구사항). 새 터미널을 열 때마다:
   ```bash
   nvm use 22
   ```
   안 하면 `Prisma only supports Node.js 20.19+, 22.12+...` 같은 에러가 나요.

2. **npm만 써요** (yarn ✕). `package.json`에 `packageManager: npm`이 박혀있어서 `yarn`을 쓰면 거부돼요.

3. **DB(MySQL)가 먼저 떠 있어야** 백엔드/테스트가 돌아가요:
   ```bash
   docker compose up -d mysql
   ```

---

## 🚀 매일 개발 흐름 (가장 자주)

```bash
nvm use 22                    # (새 터미널마다)
docker compose up -d mysql    # DB 켜기 (이미 떠있으면 생략)
npm run dev                   # 백엔드(:3000) + 프론트(:3001) 동시 실행
```

`npm run dev`는 끄기 전까지 계속 떠 있어요(터미널 점유). 멈추려면 `Ctrl + C`.

### 자주 쓰는 주소

| 주소 | 무엇 |
|---|---|
| http://localhost:3001 | **프론트 (Next.js)** |
| http://localhost:3000 | 백엔드 API |
| http://localhost:3000/docs | **Swagger** (API 문서 + 테스트) |
| http://localhost:3000/health | 헬스 체크 |
| http://localhost:5555 | Prisma Studio (따로 실행했을 때) |

---

## 🗄️ DB / Prisma (백엔드 워크스페이스)

> Prisma 명령은 백엔드 것이라 **`-w @feel-pick/backend`** 를 붙여요. (또는 `cd apps/backend` 후 실행)

| 명령 | 언제 쓰나 |
|---|---|
| `npm run prisma:studio -w @feel-pick/backend` | DB를 GUI로 보기/수정 (:5555). **새 터미널**에서 |
| `npm run prisma:migrate -w @feel-pick/backend` | `schema.prisma`를 바꾼 뒤 → 마이그레이션 생성 + 적용 + 타입 재생성 |
| `npm run prisma:generate -w @feel-pick/backend` | Prisma 타입이 이상할 때 클라이언트만 재생성 |

**스키마 바꾸는 순서**:
```bash
# 1. apps/backend/prisma/schema.prisma 수정
# 2. 마이그레이션
npm run prisma:migrate -w @feel-pick/backend
```

**DB가 꼬였을 때 (개발 환경만! 데이터 전부 삭제)**:
```bash
cd apps/backend && npx prisma migrate reset
```

---

## 🔗 백엔드 API를 바꿨을 때 → 프론트 타입 갱신

백엔드 DTO/엔티티를 바꾸면 프론트 공유 타입을 다시 만들어야 해요.

```bash
# 가장 간단: turbo가 순서대로(openapi → 타입 생성) 처리
npm run build

# 또는 타입만 콕 집어서:
npm run openapi -w @feel-pick/backend     # openapi.json 갱신
npm run build  -w @feel-pick/api-types    # schema.d.ts 재생성
```
이후 프론트에서 안 맞는 부분이 **타입 에러로** 표시돼요. (이게 모노레포의 핵심 이점)

---

## ✅ 테스트 / 품질

| 명령 | 무엇 | DB 필요? |
|---|---|---|
| `npm test` | 단위 테스트 (전 워크스페이스) | ❌ |
| `npm run test:e2e` | e2e 테스트 (실제 HTTP) | ✅ (mysql 켜야) |
| `npm run lint` | 코드 스타일 검사 | ❌ |
| `npm run build` | 전체 빌드 (타입 체크 포함) | ❌ |

특정 워크스페이스만:
```bash
npm test -w @feel-pick/backend          # 백엔드 단위만
npm run build -w @feel-pick/web         # 웹만 빌드
```

---

## 🐳 Docker — 전체 컨테이너로 실행 (운영 흉내)

`npm run dev`(개발) 대신 **전부 컨테이너로** 띄우는 모드예요.

| 명령 | 무엇 |
|---|---|
| `docker compose up -d --build` | mysql + backend + web 전부 빌드+실행 |
| `docker compose up -d mysql` | DB만 (개발 모드에서 이것만 씀) |
| `docker compose ps` | 컨테이너 상태 보기 |
| `docker compose logs -f backend` | 백엔드 로그 (web도 가능) |
| `docker compose stop backend web` | 백엔드/웹 컨테이너만 중지 |
| `docker compose down` | 전부 중지 (DB 데이터는 볼륨에 유지) |
| `docker compose down -v` | 전부 중지 + **DB 데이터까지 삭제** |

### ⚠️ 두 모드는 동시에 못 써요

`npm run dev`(개발)와 `docker compose up`(전체 컨테이너)는 **둘 다 포트 3000/3001을 써서 충돌**해요. 전환할 때:
```bash
# 컨테이너 모드 → 개발 모드로 갈 때
docker compose stop backend web   # 포트 비우기 (mysql은 유지)
npm run dev
```

---

## 🧩 워크스페이스 명령(`-w`)이 뭐야?

이 레포는 모노레포라 패키지가 여러 개예요(`@feel-pick/backend`, `@feel-pick/web`, `@feel-pick/api-types`). 특정 패키지에만 명령하려면 `-w <패키지>`:

```bash
npm run prisma:studio -w @feel-pick/backend   # 백엔드에서
npm install lodash -w @feel-pick/web          # 웹에만 lodash 추가
```
`-w` 없이 루트에서 `npm install` 하면 **전체** 설치돼요.

---

## 📝 커밋 (메시지 규칙 있음)

커밋 메시지는 **`타입: 설명`** 형식이어야 해요 (commitlint가 강제). 안 맞으면 커밋 거부.

```
feat: 픽 정렬 기능 추가
fix: 로그인 시 토큰 만료 처리
docs: README 보강
chore: 의존성 업데이트
```
자주 쓰는 타입: `feat`(기능) `fix`(버그) `docs`(문서) `refactor`(리팩터) `test` `chore`(잡일) `ci`.

---

## 🔧 트러블슈팅 (자주 만나는 에러)

| 증상 | 원인 | 해결 |
|---|---|---|
| `EADDRINUSE: ... :::3000` | 3000 포트를 누가 점유 (보통 Docker backend 컨테이너) | `docker compose stop backend web` 후 `npm run dev` |
| `Prisma only supports Node.js...` | Node 버전 낮음 | `nvm use 22` |
| `yarn ... packageManager` 에러 | yarn으로 실행 | `npm` 으로 (예: `npm run dev`) |
| `Can't reach database server` (P1001) | MySQL 안 떠있음 | `docker compose up -d mysql` |
| Prisma 타입이 이상함 / 빨간 줄 | 클라이언트 미생성 | `npm run prisma:generate -w @feel-pick/backend` |
| IDE에 `jest`/`describe` 빨간 줄 | TS 서버 캐시 | VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server" |
| 프론트가 옛 API 타입을 봄 | 타입 재생성 안 함 | 위 "API 바꿨을 때" 참고 (`npm run build`) |

---

## 한 장 요약

```bash
# 매일
nvm use 22
docker compose up -d mysql
npm run dev                                  # localhost:3001 / :3000/docs

# DB 보기 (새 터미널)
npm run prisma:studio -w @feel-pick/backend  # localhost:5555

# 스키마 바꾼 뒤
npm run prisma:migrate -w @feel-pick/backend

# 백엔드 API 바꾼 뒤 (프론트 타입 갱신)
npm run build

# 점검
npm test && npm run lint

# 전체 컨테이너로 띄우기
docker compose up -d --build                 # 끌 땐 docker compose down
```
