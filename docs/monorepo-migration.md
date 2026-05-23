# 모노레포 전환 로드맵 (백엔드 + Next.js 프론트)

> 📚 [문서 홈](README.md) · [백엔드 학습 노트](../apps/backend/docs/phase-notes.md)

지금은 NestJS 백엔드만 있는 단일 레포예요. 여기에 **Next.js 프론트엔드를 같은 레포에 넣어 모노레포**로 만드는 단계별 계획입니다.

## 왜 모노레포인가 — 핵심은 "타입 공유"

```
지금:  백엔드 응답 모양 바뀜 → 프론트는 모름 → 런타임에 화면 깨짐 (배포 후 발견)
이후:  백엔드 응답 모양 바뀜 → 프론트 타입 안 맞음 → 컴파일 에러 (작성 중 즉시 발견)
```

프론트엔드 개발자에게 가장 큰 이득이에요. "API 바뀐 거 몰랐다"가 사라집니다.

## 확정한 스택

| 항목 | 선택 | 이유 |
|---|---|---|
| 레이아웃 | **정석 모노레포** (`apps/` + `packages/`) | 깔끔·표준·확장성 |
| 도구 | **Turborepo** | Next.js 생태계 표준, 빌드 캐싱, 한 번에 dev 실행 |
| 타입 공유 | **OpenAPI codegen** | 이미 만든 Swagger가 진실의 원천 → 자동 생성 |
| 패키지 매니저 | **npm workspaces** (유지) | 교체 리스크 없음 |
| 프론트 | **Next.js App Router + TS**, 포트 3001 | |
| API 호출 | **openapi-fetch** | 생성된 타입과 짝꿍, 타입 안전 |

## 목표 구조

```
feel-pick/                          ← 워크스페이스 루트 (git 루트)
├─ apps/
│  ├─ backend/   (@feel-pick/backend)   ← 지금 루트 내용 전부 이동
│  │  └─ src/ test/ prisma/ docs/ Dockerfile ...
│  └─ web/       (@feel-pick/web)        ← Next.js
│     └─ src/app/ ...
├─ packages/
│  └─ api-types/ (@feel-pick/api-types)  ← OpenAPI → TS 타입
│     ├─ openapi.json (백엔드가 생성)
│     └─ src/schema.d.ts (자동 생성)
├─ package.json   ← 루트: workspaces + turbo (private)
├─ turbo.json     ← 태스크 파이프라인
├─ docker-compose.yml   ← mysql + backend + web
├─ .github/ .husky/ commitlint.config.js .prettierrc   ← 레포 공통
└─ README.md ROADMAP.md
```

## 타입 공유 파이프라인

```
[backend] Swagger 문서 → openapi.json 파일로 출력
       ↓
[api-types] openapi-typescript로 openapi.json → schema.d.ts 생성
       ↓
[web] @feel-pick/api-types import + openapi-fetch로 타입 안전 호출
```

Turborepo가 `backend#openapi → api-types#build → web#build` 순서를 자동 보장.

---

## 단계별 로드맵

> **원칙: 단계마다 커밋 + 검증.** 한 번에 다 하면 어디서 깨졌는지 추적 불가.

### Stage 0 — 사전 정리 (선택, 짧음)

깃 원격을 새 레포명에 맞추고 토큰을 정리.

- [ ] `git remote set-url ... https://github.com/jenyglee/feel-pick.git`
- [ ] (권장) 노출된 PAT 토큰 폐기 후 `gh auth` 또는 SSH로 전환
- [ ] (선택) 원격 별칭 `feel-pick-backend` → `origin`

**검증**: `git fetch` 정상.

---

### Stage 1 — 백엔드를 `apps/backend`로 이동 + 워크스페이스 골격 ⭐ 최대 리스크

가장 중요하고 깨지기 쉬운 단계. 천천히.

- [ ] `git mv`로 백엔드 파일 전부 → `apps/backend/` (히스토리 보존)
- [ ] 루트에 워크스페이스 `package.json` 생성 (`private`, `workspaces: ["apps/*", "packages/*"]`)
- [ ] 루트에 `turbo.json` 생성 (build/lint/test/dev 파이프라인)
- [ ] `husky` / `commitlint` / `.prettierrc` 는 **루트로** 이동 (레포 공통)
- [ ] `apps/backend/package.json` name → `@feel-pick/backend`
- [ ] 루트 `package.json` name → `feel-pick`

**검증**:
```bash
npm install                              # 워크스페이스 전체 설치
npm run -w @feel-pick/backend build      # 백엔드 빌드
npm run -w @feel-pick/backend test       # 단위 11개
npm run -w @feel-pick/backend test:e2e   # e2e 15개
```

**커밋**: `refactor: 백엔드를 apps/backend로 이동 + 워크스페이스 골격`

> 함정: `prisma`/`jest`/`tsconfig`의 상대 경로는 폴더가 통째로 움직이면 대부분 유지됨. 깨지는 건 **루트에서 오케스트레이션하던 것**(docker-compose, CI)뿐 → Stage 2에서 처리.

---

### Stage 2 — 인프라 경로 수정 (Docker / CI)

백엔드 이동으로 어긋난 루트 레벨 설정 보정.

- [ ] `docker-compose.yml`: app `build` 컨텍스트 → `./apps/backend`
- [ ] `.github/workflows/ci.yml`: 워크스페이스 기반으로 (`npm ci` 루트 → `npm run -w @feel-pick/backend ...`)
- [ ] `apps/backend/Dockerfile`: 컨텍스트 기준 경로 확인

**검증**:
```bash
docker compose up -d --build && curl http://localhost:3000/health
```
CI는 push 후 Actions 탭에서 초록불.

**커밋**: `ci: 모노레포 구조에 맞춰 Docker/CI 경로 수정`

---

### Stage 3 — Next.js 스캐폴드 (`apps/web`)

- [ ] `apps/web`에 Next.js(App Router + TS) 생성
- [ ] 포트 3001로 설정 (`next dev -p 3001`)
- [ ] `apps/web/package.json` name → `@feel-pick/web`
- [ ] 루트 `turbo run dev`가 backend(:3000) + web(:3001) 동시 실행되게

**검증**:
```bash
npm run dev          # 둘 다 뜸
# 브라우저: localhost:3001 (Next 기본 페이지)
```

**커밋**: `feat: apps/web에 Next.js 앱 스캐폴드`

---

### Stage 4 — 타입 공유 파이프라인 (`packages/api-types`)

- [ ] 백엔드에 `openapi:json` 스크립트 추가 (Swagger 문서를 파일로 출력)
- [ ] `packages/api-types` 생성, `openapi-typescript`로 `openapi.json` → `schema.d.ts`
- [ ] `turbo.json`에 의존 순서 등록 (backend#openapi → api-types#build)

**검증**: `npm run -w @feel-pick/api-types build` → `schema.d.ts` 생성됨, Pick 타입 보임.

**커밋**: `feat: OpenAPI 기반 공유 타입 패키지(api-types) 추가`

---

### Stage 5 — 프론트 ↔ 백엔드 연동

- [ ] `apps/web`에 `openapi-fetch` + `@feel-pick/api-types` 설치
- [ ] `/picks` 목록을 불러와 보여주는 샘플 페이지
- [ ] 백엔드 `CORS_ORIGIN`을 `http://localhost:3001`로 (개발)

**검증**: 브라우저에서 픽 목록이 백엔드 데이터로 렌더됨. 백엔드 DTO 필드명 바꿔보면 → 프론트 컴파일 에러 나는지 확인 (타입 공유 증명).

**커밋**: `feat: web에서 공유 타입으로 picks API 연동`

---

### Stage 6 — (선택) web Docker화 + 통합 배포

- [ ] `apps/web/Dockerfile` (Next standalone 빌드)
- [ ] `docker-compose.yml`에 `web` 서비스 추가 (mysql + backend + web)

**검증**: `docker compose up`으로 3개 서비스 통합 기동.

**커밋**: `feat: web Docker화 + compose 통합`

---

## 개발 워크플로 (완성 후)

```bash
docker compose up -d mysql   # DB만 띄우고
npm run dev                  # turbo가 backend(:3000) + web(:3001) 동시 실행
```

## 리스크 요약

| 리스크 | 완화 |
|---|---|
| Stage 1 백엔드 이동 시 경로 깨짐 | 단계별 커밋 + 매 단계 검증, 깨지면 그 커밋만 되돌림 |
| CI/Docker 경로 누락 | Stage 2에서 실제 `docker compose up` + CI 초록불 확인 |
| 타입 생성 타이밍(서버 의존) | 파일 기반(openapi.json) codegen으로 서버 없이 생성 |

## 진행 순서 권장

```
Stage 0 (정리) → Stage 1 (이동) → Stage 2 (인프라) → Stage 3 (Next)
                                                        ↓
                          Stage 5 (연동) ← Stage 4 (타입) 
                                                        ↓
                                              Stage 6 (선택, 배포)
```

Stage 1~2가 "기존 백엔드를 안 깨고 모노레포로 옮기기"의 핵심이고, Stage 3~5가 "프론트 합류 + 타입 공유"의 본론이에요.
