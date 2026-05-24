# CLAUDE.md — 프로젝트 작업 가이드

이 파일은 **Claude(및 사람 기여자)가 이 레포에서 일관되게 코드를 짜기 위한 규칙서**예요.
새 세션/새 채팅에서도 이 문서를 기준으로 같은 구조·스타일로 작업하세요.

학습용 상세 설명은 [docs/](docs/README.md), 명령어는 [docs/commands.md](docs/commands.md) 참고.

---

## 1. 프로젝트 개요

- **feel-pick**: "픽(Pick)을 만들고 투표하는" 앱.
- **모노레포** (npm workspaces + Turborepo): 백엔드(NestJS) + 프론트(Next.js) + 공유 타입.
- 핵심 가치: **백엔드 OpenAPI → 프론트 타입 자동 생성**. 백엔드 API가 바뀌면 프론트가 컴파일 에러로 즉시 안다.

---

## 2. 절대 규칙 (먼저 읽기)

- **패키지 매니저는 npm만.** yarn/pnpm ✕ (`packageManager: npm` 고정).
- **Node 22.** (`nvm use 22`)
- **TypeScript는 5.9.3 고정** (루트 `package.json`의 `overrides`). 임의 업그레이드 금지 — TS 6은 빌드 깨짐.
- **모든 명령은 레포 루트에서**, 특정 패키지는 `-w @feel-pick/backend|web|api-types`.
- **커밋 메시지는 Conventional Commits** (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`). commitlint가 강제.
- **`.env`는 커밋 금지.** `.env.example`만 커밋. `.env.test`는 테스트 전용이라 커밋됨.
- **작업 마무리 전 검증**(아래 11번) 통과 확인.

### 하지 말 것 (Don'ts)
- 프론트 API 타입을 손으로 작성 ✕ → **공유 타입(`@feel-pick/api-types`) 사용**.
- 응답에 `passwordHash` 등 민감 필드 노출 ✕ → repository `select`로 차단.
- 로그에 `request.body`/토큰/비밀번호 남기기 ✕.
- `docker compose up`(전체)와 `npm run dev`를 동시에 ✕ (포트 3000/3001 충돌).

---

## 3. 디렉터리 구조

```
feel-pick/
├─ apps/
│  ├─ backend/   (@feel-pick/backend) — NestJS API (:3000)
│  │  ├─ src/  prisma/  test/  docs/  Dockerfile  prisma.config.ts
│  │  └─ .env(.example/.test)  tsconfig*.json  nest-cli.json  eslint.config.mjs
│  └─ web/       (@feel-pick/web)     — Next.js App Router (:3001)
│     ├─ src/app/  src/lib/  Dockerfile  next.config.ts
├─ packages/
│  └─ api-types/ (@feel-pick/api-types) — OpenAPI → 생성된 공유 타입
├─ docs/                — 모노레포·레포 전체 문서 (commands, monorepo stages)
├─ docker-compose.yml   — mysql + backend + web
├─ turbo.json  package.json(workspaces+overrides)  .husky/  commitlint.config.js
```

---

## 4. 백엔드 (NestJS) 규칙

### 4.1 레이어드 아키텍처 (반드시 이 흐름)
```
Controller  →  Service  →  Repository  →  PrismaService(DB)
 (HTTP만)    (비즈니스 규칙)  (DB 접근만)
```
- **Controller**: 얇게. 라우팅·`@Body()/@Param()` 수신·service 호출만. 비즈니스 로직 금지.
- **Service**: 비즈니스 규칙·검증·예외(`NotFoundException`/`ForbiddenException` 등) 던지기. DB 직접 접근 금지.
- **Repository**: Prisma 호출만. 비즈니스 판단 금지.
- 도메인마다 모듈 1개(`X.module.ts`)로 controller/service/repository 묶기.

### 4.2 파일·네이밍 규칙
- 파일: **kebab-case + 역할 접미사** — `picks.controller.ts`, `picks.service.ts`, `picks.repository.ts`, `picks.module.ts`, `*.dto.ts`, `*.entity.ts`, `*.guard.ts`, `*.strategy.ts`, `*.decorator.ts`, `*.filter.ts`.
- 클래스: PascalCase. 도메인 폴더 단위(`src/picks/`, `src/auth/`, `src/users/`).

### 4.3 DTO vs Entity (중요)
- **DTO** (`dto/*.dto.ts`): 클라이언트 **입력**. `class-validator` 데코레이터(`@IsString` 등) + `@ApiProperty`. **named export** (`export class CreatePickDto`).
- **Entity** (`entities/*.entity.ts`): API **응답/Swagger 모양**. `@ApiProperty`만. **default export** (`export default class Pick`). Prisma 모델과 별개(응답 전용 형태).
- **모든 DTO/Entity 속성에 `@ApiProperty` 필수** — OpenAPI 스펙이 완전해야 프론트 타입이 생성됨. nullable/배열은 `@ApiProperty({ nullable: true, type: ... })`처럼 명시.

### 4.4 전역 장치 (이미 구성됨 — 재사용)
- `src/app.setup.ts`의 `configureApp()`: helmet + `ValidationPipe`(whitelist/forbidNonWhitelisted/transform) + `AllExceptionsFilter`. **main.ts와 e2e가 공유** — 새 전역 설정은 여기에.
- `AllExceptionsFilter`: 모든 에러를 `{statusCode,message,error,timestamp,path}`로 표준화. body는 로그에 안 남김.
- `ThrottlerModule`: 전역 60s/100, `@Throttle`로 라우트별 강화(로그인 5/분). **테스트 환경에선 미등록**.
- `LoggerModule`(nestjs-pino): JSON 로그, `Authorization` redact, `/health` 로깅 제외.
- 인증: `@UseGuards(JwtAuthGuard)` + `@CurrentUser() user: User`(커스텀 데코레이터). 공개 엔드포인트는 가드 없음.

### 4.5 Prisma / DB
- `PrismaService`(`prisma/prisma.service.ts`): `PrismaClient` 확장 + `PrismaMariaDb` 어댑터(`allowPublicKeyRetrieval` — MySQL 8.4 대응). `@Global` 모듈로 어디서나 주입.
- 스키마: `apps/backend/prisma/schema.prisma`. 변경 시 `npm run prisma:migrate -w @feel-pick/backend`.
- 민감 필드 제외: repository에서 `select`(예: `publicUserSelect`)로 `passwordHash` 제거. **응답에 절대 노출 X.**
- ID는 `uuid` 문자열. `@db.VarChar` 길이 명시.

### 4.6 환경변수
- `src/config/env.validation.ts`에 `class-validator`로 스키마 정의 → `ConfigModule`이 부팅 시 검증. 새 env는 여기 추가 + `.env.example`/`.env.test`에도 반영.
- 코드에서 `ConfigService.get('KEY', { infer: true })`로 읽기.

### 4.7 새 도메인/엔드포인트 추가 레시피
1. `prisma/schema.prisma`에 모델 추가 → `npm run prisma:migrate -w @feel-pick/backend`.
2. `src/<도메인>/` 생성: `entities/<x>.entity.ts`(@ApiProperty), `dto/*.dto.ts`(검증+@ApiProperty).
3. `<도메인>.repository.ts`(Prisma) → `<도메인>.service.ts`(규칙) → `<도메인>.controller.ts`(라우팅, `@ApiTags`/`@ApiResponse`).
4. `<도메인>.module.ts`로 묶고 `app.module.ts` imports에 등록.
5. 보호가 필요하면 `@UseGuards(JwtAuthGuard)` + `@CurrentUser()`.
6. service 단위 테스트(`*.spec.ts`, repository mock) + 필요한 e2e(`test/*.e2e-spec.ts`).
7. 프론트가 쓸 거면 타입 재생성(아래 6번) → web에서 사용.

---

## 5. 프론트엔드 (Next.js) 규칙

> `apps/web`에서 작업 시 **`apps/web/AGENTS.md`도 반드시 확인** — Next 16은 breaking changes가 있어 학습 데이터의 옛 패턴과 다를 수 있음. 컴포넌트 코드 전 `node_modules/next/dist/docs/` 참고.

- **App Router** (`src/app/`). 기본은 **서버 컴포넌트**(async 함수에서 직접 데이터 fetch).
- **API 호출은 `src/lib/api.ts`의 `api`(openapi-fetch) 사용.** 경로/응답이 공유 타입(`paths`)으로 검증됨. 직접 `fetch`로 백엔드 부르지 말 것.
- 타입은 `@feel-pick/api-types`에서: `import type { Schemas } from '@feel-pick/api-types'` → `Schemas['Pick']`. (TS 내장 `Pick`과 겹쳐서 개별 export 안 함)
- 라이브 데이터 페이지는 `export const dynamic = 'force-dynamic'`.
- API 베이스 URL: `process.env.API_URL ?? 'http://localhost:3000'` (컨테이너는 `http://backend:3000`). 서버 런타임 env라 `NEXT_PUBLIC_`이 아닌 `API_URL` 사용.
- 스타일: **Tailwind CSS** (className). 별도 CSS 파일 남발 금지.
- 파일: 컴포넌트 PascalCase, 라우트는 App Router 규칙(`page.tsx`, `layout.tsx`).

### 5.1 파일 역할 / 코드 배치 (단일 책임)

- **한 파일 = 한 역할.** 어떤 코드가 그 파일의 역할과 안 맞으면 **역할에 맞는 파일로 옮기고, 없으면 새로 만든다.** 한 파일이 두 역할을 지면 분리한다.
- 라우트 파일(`layout.tsx`/`page.tsx`)엔 **라우팅·렌더링만.** 폰트 로딩·SDK 초기화·상수·비즈니스 로직은 ✕ → 전용 모듈로.
  - (나쁜 예) `layout.tsx` 안에서 `localFont({...})` 정의
  - (좋은 예) `src/app/fonts/index.ts`에 정의 후 `import`
- 배치 맵:
  - 폰트 로더/파일 → `src/app/fonts/`
  - 디자인 토큰(컬러/타이포) → `src/app/globals.css`의 `@theme`
  - API 호출 → `src/lib/api.ts` (openapi-fetch)
  - 순수 함수·공용 로직 → `src/lib/`
  - 재사용 컴포넌트 → `src/components/` (처음 필요할 때 생성)
- 판단이 애매하면 비슷한 기존 코드가 어디 있는지 먼저 찾고 그 옆에 둔다.

---

## 6. 공유 타입 파이프라인 (모노레포 핵심)

```
백엔드 @ApiProperty → openapi.json(preview 모드) → openapi-typescript → schema.d.ts → web import
```
- 백엔드 API를 바꾸면 **타입 재생성**: `npm run build` (turbo가 openapi → api-types 순서 보장). 또는 `npm run openapi -w @feel-pick/backend && npm run build -w @feel-pick/api-types`.
- `apps/backend/openapi.json`과 `packages/api-types/src/schema.d.ts`는 **생성물이지만 커밋**함(계약 가시성 + web이 백엔드 없이 빌드 가능).
- 프론트 API 타입을 **수기로 만들지 말 것**.

---

## 7. 테스트 규칙

- **단위**: `src/**/*.spec.ts` (소스 옆). service는 repository를 `jest.fn()` mock으로 주입해 테스트. DB 불필요.
- **e2e**: `apps/backend/test/*.e2e-spec.ts`. 실제 HTTP(supertest) + `feelpick_test` DB. `createTestApp()`/`resetDb()` 헬퍼 사용. 직렬 실행(`maxWorkers:1`).
- `describe`/`it` 설명은 **한글**로.
- 비즈니스 규칙·권한(403 등)은 테스트로 박제.

---

## 8. 문서 작성 규칙

- **백엔드 학습 노트**(Phase 0~5): `apps/backend/docs/`. **모노레포/레포 전체**: `docs/`.
- 스타일: **한국어, 프론트엔드 개발자 눈높이.** 패턴: ① 3줄 요약 ② 비유 ③ 새 용어 즉시 설명 ④ 함정 표 ⑤ 검증 결과. 영어 기술용어는 그대로 쓰되 풀어서 설명.
- 새 문서는 `docs/README.md`(문서 홈)에 링크 + 단계 문서는 이전/다음 breadcrumb 연결.

---

## 9. 커밋 / 워크플로

- Conventional Commits 형식. 본문에 변경 요점 + 검증 결과. 한국어 설명 OK.
- 변경은 **단계별로 작게** 커밋하고 매번 검증.

---

## 10. 실행 모드 (헷갈리지 말 것)

| 모드 | 명령 | 용도 |
|---|---|---|
| 로컬 개발 | `docker compose up -d mysql` + `npm run dev` | 평소 개발 (핫리로드) |
| 전체 컨테이너 | `docker compose up -d --build` | 운영 흉내 |

두 모드는 포트가 겹쳐 동시 사용 불가. (자세히는 [docs/commands.md](docs/commands.md))

---

## 11. 작업 마무리 전 검증 (필수)

```bash
npm run lint        # 0 errors
npm test            # 단위 통과
npm run build       # 타입체크 + 빌드 (백엔드 API 바꿨으면 타입도 재생성됨)
# 백엔드/인증/DB 흐름 바꿨으면:
docker compose up -d mysql && npm run test:e2e
```
- 백엔드 응답 형태를 바꿨으면 **타입 재생성 후 web 빌드까지** 통과 확인.
- Docker 관련 변경은 `docker compose up --build`로 실제 기동 확인.
