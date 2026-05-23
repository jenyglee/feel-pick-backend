# 프론트엔드 개발자를 위한 백엔드 학습 노트

이 문서는 `feel-pick-backend`를 만들면서 단계별로 도입한 개념을, **백엔드 처음 만져보는 프론트엔드 개발자 관점**에서 정리한 학습 가이드입니다.

전체 로드맵은 [ROADMAP.md](../ROADMAP.md)에 있고, 여기는 그 목차예요. 각 Phase는 별도 파일로 나뉘어 있습니다.

---

## 0. 들어가기 전에 — "백엔드"란 무엇인가

프론트엔드에서 `fetch('/api/picks')`를 호출하면, 그 요청을 받아서 **데이터를 만들거나 저장하거나 꺼내서 응답해주는 서버 프로그램**이 백엔드입니다. 이 프로젝트의 백엔드는 NestJS라는 프레임워크로 만들어져 있어요.

### NestJS를 React에 비유하면

| React (프론트) | NestJS (백엔드) |
|---|---|
| 컴포넌트 (`function Button()`) | 컨트롤러 (`@Controller('picks')`) |
| props로 데이터 받기 | `@Body() dto: CreatePickDto`로 받기 |
| 이벤트 핸들러 (`onClick`) | 라우트 핸들러 (`@Post()`) |
| 커스텀 훅 | Service (재사용 로직) |
| Context Provider | Module + Provider |
| useEffect cleanup | `OnModuleDestroy` |

NestJS는 **데코레이터 (`@Controller`, `@Get`, `@Body`...)** 가 메인 문법인데, 이건 "이 클래스/메서드는 이런 역할이야"라고 프레임워크에 알려주는 라벨이라고 생각하면 됩니다. React의 `'use client'` 디렉티브 같은 것과 비슷한 느낌.

---

## 단계별 문서

순서대로 읽는 걸 권장해요. 각 단계는 앞 단계 위에 쌓입니다.

| 단계 | 문서 | 한 줄 요약 |
|---|---|---|
| **Phase 0** | [기본 위생](phase-0-foundation.md) | 입력 검증 · 환경변수 · 에러 표준화 · CORS · Swagger |
| **Phase 1** | [데이터 영속화](phase-1-database.md) | Docker · MySQL · Prisma · Repository 패턴 · async/await |
| **Phase 2** | [인증 / 인가](phase-2-auth.md) | User 모델 · bcrypt · JWT · Guard · `@CurrentUser()` · 소유권 |
| **Phase 3** | [보안 강화](phase-3-security.md) | helmet · Rate Limiting · 로깅 안전 · npm audit |
| **Phase 4** | [테스트 / 품질](phase-4-testing.md) | 단위 vs e2e · 테스트 DB · 커버리지 · GitHub Actions CI |
| **Phase 5** | [운영 / 배포](phase-5-deployment.md) | health 체크 · pino 로깅 · Dockerfile · docker-compose |

---

## 다음 계획 (레포 전체 문서)

모노레포·프론트엔드 관련 문서는 레포 루트 [docs/](../../../docs/README.md)로 이동했어요.

| 문서 | 내용 |
|---|---|
| [모노레포 전환 로드맵](../../../docs/monorepo-migration.md) | 백엔드 + Next.js 프론트를 한 레포로 (Turborepo · 타입 공유) |
| [모노레포 Stage 1 정리](../../../docs/monorepo-stage-1.md) | 백엔드를 apps/backend로 이동한 실제 작업 |

---

## 자주 쓰는 명령어 모음

### 개발 일상

```bash
# DB 컨테이너 띄우기 (처음 한 번 또는 컴퓨터 재부팅 후)
docker compose up -d

# 서버 개발 모드 (파일 변경 시 자동 재시작)
npm run start:dev

# DB 데이터 GUI로 보기
npm run prisma:studio
```

### 스키마 변경 시

```bash
# 1. prisma/schema.prisma 수정
# 2. 마이그레이션 생성 + 적용 + TypeScript 타입 재생성
npm run prisma:migrate
```

### 검증

```bash
npm run build       # 컴파일 (타입 체크)
npm test            # 단위 테스트
npm run test:e2e    # 통합 테스트
npm run lint        # 코드 스타일 검사
```

### 트러블슈팅

```bash
# Prisma 타입이 이상하다 싶으면 재생성
npm run prisma:generate

# DB 상태가 꼬였을 때 (개발 환경만!) — 데이터 다 날리고 재마이그레이션
docker compose down -v
docker compose up -d
npm run prisma:migrate
```

---

## 더 읽어볼 거리

- NestJS 공식 문서: https://docs.nestjs.com/
- Prisma 공식 문서: https://www.prisma.io/docs
- class-validator: https://github.com/typestack/class-validator
- OpenAPI 표준: https://swagger.io/specification/
- helmet (보안 헤더): https://helmetjs.github.io/
- NestJS Rate Limiting: https://docs.nestjs.com/security/rate-limiting
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- NestJS 테스트: https://docs.nestjs.com/fundamentals/testing
- supertest (HTTP 테스트): https://github.com/ladjs/supertest
- GitHub Actions: https://docs.github.com/en/actions
