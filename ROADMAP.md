# Backend Roadmap

feel-pick-backend의 현재 상태에서 운영 가능한 백엔드까지의 단계별 계획.
**한 번에 다 하지 말고 단계별로** 진행하는 게 핵심.

---

## 현재 위치

서버 동작은 되지만, 대부분의 백엔드 필수 요소가 비어 있는 "Hello World + 1단계" 상태.

- 데이터는 메모리(`Map`)에만 저장 → 서버 재시작 시 사라짐
- 입력 검증을 서비스 안에서 `if`로 직접 처리 (보통은 라이브러리에 위임)
- 인증 없음 → 누구나 모든 API 호출 가능
- 환경변수 관리, 로깅, 에러 표준화, CORS, 보안 헤더 부재
- API 문서 부재 → 프론트엔드 협업 시 필요

---

## Phase 0 — 기반 (1~2일)

코드량은 적지만 **나중에 안 깔아두면 두고두고 후회하는 것**들.

| 도구 | 왜 필요한가 | 프론트엔드 비유 |
|---|---|---|
| `class-validator` + `ValidationPipe` | DTO에 `@IsString()` 등 데코레이터만 붙이면 자동 검증. 서비스에서 `if (!title)` 안 해도 됨. | zod/yup 같은 런타임 검증을 NestJS가 자동으로 끼워줌 |
| `ConfigModule` + `.env` | 포트, DB URL, JWT 시크릿 등을 코드에 박지 않고 환경별 분리 | Next.js의 `process.env.NEXT_PUBLIC_*`과 유사 |
| Global ExceptionFilter | 에러 시 항상 같은 모양으로 응답 (`{ statusCode, message, timestamp, path }`) | 프론트엔드 에러 바운더리의 서버 버전 |
| CORS 설정 | 다른 도메인의 프론트엔드가 API 호출 가능하게 허용 | 안 켜면 브라우저에서 `Access-Control-Allow-Origin` 에러 |
| Swagger (OpenAPI) | API 명세 자동 생성, 인터랙티브 문서 | Storybook의 API 버전. 프론트엔드 협업 시 거의 필수 |

---

## Phase 1 — 데이터 영속화 (며칠~1주)

지금은 데이터가 메모리에 있어 서버 재시작 시 사라짐. 진짜 백엔드가 되려면 DB 필요.

**선택할 것 1: DB**
- **PostgreSQL** (권장) — 무료, 가장 많이 쓰임, 관계형
- MySQL — 비슷한 관계형
- MongoDB — 문서형, 스키마 자유

**선택할 것 2: ORM (DB를 코드로 다루는 라이브러리)**
- **Prisma** (백엔드 초보에 가장 친화적, 권장) — 타입스크립트 자동 생성, 마이그레이션 GUI
- TypeORM — NestJS 공식 예제 다수, 데코레이터 기반
- Drizzle — 가볍고 SQL에 가까움

**할 일**
1. DB를 Docker로 로컬 실행
2. ORM 설치 + `Pick`, `PickOption` 스키마 정의
3. `PicksService`의 `Map`을 DB 호출로 교체
4. 마이그레이션(스키마 변경 이력 관리) 설정

이 단계에서 **Repository 패턴**도 같이 도입. service가 DB를 직접 만지지 않고, "이 픽 저장해" 같은 중개자(repository)에게 요청만 보내는 구조 → DB를 바꿔도 service 안 바뀜.

---

## Phase 2 — 인증/인가 (1주)

누가 누구인지 식별하고, 누가 무엇을 할 수 있는지 제한.

**개념**
- **인증(Authentication)** — "당신은 누구입니까" → 로그인
- **인가(Authorization)** — "당신은 이걸 할 수 있습니까" → 권한 체크

**도구**
- `@nestjs/passport` + `passport-jwt` — JWT 기반 로그인
- `bcrypt` — 비밀번호 해시 (**평문 저장은 절대 금지**)
- `@nestjs/jwt` — JWT 발급/검증

**구현 순서**
1. `User` 엔티티 추가 (email, passwordHash 등)
2. `POST /auth/signup`, `POST /auth/login`
3. `JwtAuthGuard`로 보호할 엔드포인트에 `@UseGuards(JwtAuthGuard)`
4. 본인이 만든 Pick만 삭제 가능 같은 정책

**프론트엔드 비유**: React에서 로그인 후 토큰 저장 → API 호출 시 헤더에 첨부. 백엔드는 토큰으로 사용자 식별.

---

## Phase 3 — 보안 (며칠, 핵심)

백엔드는 인터넷에 노출되므로 기본 방어선 필수.

**OWASP Top 10 중 NestJS에서 챙길 것**

| 항목 | 무엇 | 도구/방법 |
|---|---|---|
| 입력 검증 | 클라이언트 입력은 무조건 의심 | Phase 0의 ValidationPipe로 거의 해결 |
| SQL Injection | DB 쿼리에 사용자 입력을 그대로 끼우면 위험 | Prisma/TypeORM 쓰면 자동 방어 |
| XSS | 응답에 사용자 입력 그대로 내려서 클라이언트가 실행 | JSON 응답이면 백엔드는 거의 안전 |
| CSRF | 다른 사이트가 이 사이트로 요청 위조 | JWT를 헤더로 쓰면 거의 무관, 쿠키 쓰면 SameSite |
| 비밀번호 | 평문 저장 금지 | bcrypt (Phase 2) |
| 시크릿 노출 | `.env`를 git에 올리면 끝장 | `.gitignore` 확인, 절대 커밋 X |
| Rate Limiting | 무차별 로그인 시도, DDoS | `@nestjs/throttler` |
| 보안 헤더 | XSS, clickjacking 등 헤더로 방어 | `helmet` 한 줄 |
| HTTPS | 프로덕션 필수 | 배포 시 호스팅에서 처리 |
| 의존성 취약점 | npm 패키지의 알려진 취약점 | `npm audit`, Dependabot |
| 로깅 | 비밀번호/토큰을 로그에 안 남기기 | 로그 마스킹 규칙 |

**도구 설치 (Phase 3에서)**
- `helmet` — 보안 헤더
- `@nestjs/throttler` — Rate Limiting

---

## Phase 4 — 테스트 / 품질 (지속적)

코드를 안전하게 바꾸려면 테스트가 받쳐줘야 함.

- **단위 테스트** — 이미 picks.service.spec.ts에 4개 있음. 새 기능마다 추가
- **e2e 테스트** — `POST /picks` 후 `GET /picks`로 결과 확인. test/ 폴더에 골격 있음
- **테스트 커버리지** — `npm run test:cov`, 보통 70~80% 목표
- **GitHub Actions CI** — push 시 자동 lint + test (`.github/workflows/`)

---

## Phase 5 — 운영/배포 (배포 직전)

- **Docker + docker-compose** — DB, 앱을 한 번에 띄움
- **헬스 체크** — `GET /health` 엔드포인트
- **로깅** — `pino` 같은 구조화 로거
- **에러 추적** — Sentry
- **배포** — Fly.io, Railway, Render (시작용으로 가장 쉬움) → AWS/GCP (규모 커지면)

---

## 구조 / 리팩토링 전략

기능이 늘면 다음 패턴으로 정리.

```
src/
├─ common/              # 어디서나 쓰는 공통 코드
│  ├─ filters/          # 글로벌 에러 필터
│  ├─ interceptors/     # 응답 변환, 로깅 등
│  ├─ decorators/       # @CurrentUser() 같은 커스텀 데코레이터
│  └─ guards/           # 인증/인가 가드
├─ config/              # 환경변수 스키마/검증
├─ auth/                # 로그인, JWT
├─ users/               # 사용자 도메인
├─ picks/               # 현재 있는 모듈 (도메인 단위로 1폴더)
│  ├─ dto/
│  ├─ entities/
│  ├─ picks.controller.ts
│  ├─ picks.service.ts
│  └─ picks.repository.ts   # ← DB 도입 후 추가
├─ app.module.ts
└─ main.ts
```

### 구조 원칙

- **도메인 단위로 모듈 분리**: picks, users, auth ... (기능별 폴더)
- **Controller는 얇게**: 입력 받고 service로 위임만. 비즈니스 로직 없음
- **Service는 비즈니스 규칙**: "투표는 사용자당 1회" 같은 정책
- **Repository는 DB 접근만**: service가 직접 SQL/ORM 안 씀
- **DTO ↔ Entity 분리**: 클라이언트가 보내는 것(DTO)과 DB 모델(Entity)은 별개

---

## 시작 순서 권장

```
Phase 0 (기반)  →  Phase 1 (DB)  →  Phase 2 (인증)  →  Phase 3 (보안 강화)
                                                          ↓
                                                    Phase 4 (테스트, 병행)
                                                          ↓
                                                    Phase 5 (운영, 배포 전)
```

Phase 0~2까지가 "쓸 만한 백엔드"의 최소 조건. Phase 3 이후는 운영 환경에 올리기 전 필수.
