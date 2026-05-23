# Phase 4 — 테스트 / 품질

> 📚 [학습 노트 목차](phase-notes.md) · [← Phase 3](phase-3-security.md)

> **3줄 요약**
> 1. 지금까지 단위 테스트(11개)만 있어서, 진짜 HTTP 요청이 전체를 통과하는지는 검증이 없었다.
> 2. e2e 테스트(15개)로 "회원가입→토큰→픽 생성→남의 픽 삭제 403" 같은 실제 흐름을 박제했다.
> 3. GitHub Actions로 push마다 자동으로 lint+테스트가 돌게 했다.

#### 비유: 두 종류의 점검

| | 단위 테스트 | e2e 테스트 |
|---|---|---|
| 비유 | 부품 하나 따로 떼서 검사 | 완성차로 실제 도로 주행 |
| 범위 | 함수/클래스 1개 (나머지는 가짜로 대체=mock) | 진짜 HTTP 요청 → 가드 → 검증 → DB까지 |
| 속도 | 매우 빠름 | 느림 (앱+DB 진짜로 띄움) |
| DB | 안 씀 | **진짜 DB 필요** |
| 잡는 버그 | 로직 오류 | 배선·통합 오류 (가드 빠짐, 라우팅 실수 등) |
| 프론트 비유 | 함수 단위 Jest | Playwright/Cypress |

Phase 3 막바지에 겪은 **"DB 연결 버그(caching_sha2_password)"** 가 딱 e2e가 잡는 종류예요. 단위 테스트는 DB를 mock으로 대체하니 절대 못 잡죠. "내 함수는 맞는데 실제로 안 돌아가는" 상황을 막아주는 게 e2e.

#### 잠깐, "mock"이 뭐야?

**mock = 진짜 대신 쓰는 "가짜".** 단위 테스트로 `PicksService`만 검사하고 싶은데, 얘는 DB(Repository)에 의존하잖아요. 테스트마다 진짜 DB를 띄우는 건 무거우니, **Repository를 "시키는 대로만 답하는 가짜"로 바꿔치기** 합니다.

```ts
// "findOne을 부르면 무조건 null을 돌려주는 가짜 repository"
const repo = { findOne: jest.fn().mockResolvedValue(null) };

// → DB 없이도 "픽이 없을 때 서비스가 404를 던지나?" 를 테스트할 수 있음
await expect(service.findOne('없는-id')).rejects.toThrow(NotFoundException);
```

프론트 비유: API 부르는 컴포넌트를 테스트할 때 `fetch`를 가짜로 바꿔 정해진 응답을 주는 것(`msw`, `jest.mock`)과 똑같아요. "진짜 서버 없이, 원하는 상황을 연출"하는 거죠.

---

### Phase 4-1. e2e 테스트 환경 — 별도 테스트 DB

#### 왜 별도 DB?

e2e는 진짜 DB에 데이터를 넣고 지워요. 만약 개발 DB(`feelpick`)에 대고 돌리면, 테스트가 내 개발 데이터를 다 날려버릴 수 있어요. 그래서 **같은 MySQL 컨테이너 안에 별도 스키마(`feelpick_test`)** 를 두고 거기서만 논다.

- [.env.test](../.env.test) — 테스트 전용 환경변수 (`DATABASE_URL`이 `feelpick_test`를 가리킴)
- [test/setup-e2e.ts](../test/setup-e2e.ts) — 테스트 시작 전 1회: 테스트 DB 생성 + 마이그레이션 적용
- [test/load-env.e2e.ts](../test/load-env.e2e.ts) — 각 테스트 파일이 앱 부팅 전 `.env.test` 로드

#### "운영과 똑같은 앱"으로 테스트하기

e2e가 의미 있으려면, 테스트하는 앱이 **실제 운영 앱과 같은 설정**(검증 파이프, 에러 필터, 보안 헤더)이어야 해요. 그래서 그 설정을 [src/app.setup.ts](../src/app.setup.ts)의 `configureApp()` 함수로 빼서, `main.ts`와 e2e가 **같은 함수**를 쓰게 했어요.

```ts
// main.ts 와 test/test-app.ts 둘 다
configureApp(app);
```

---

### Phase 4-2. 핵심 시나리오 (e2e 15개)

[test/auth.e2e-spec.ts](../test/auth.e2e-spec.ts) + [test/picks.e2e-spec.ts](../test/picks.e2e-spec.ts):

- **인증**: 회원가입→토큰 발급 / 로그인 / `passwordHash`가 응답에 절대 안 나옴 / 중복가입 409 / 틀린 비번 401 / 토큰 없이 `/auth/me` 401
- **인가**: 토큰 없이 픽 생성 401 / 본인 픽 삭제 204 / **남의 픽 삭제 403** / 잘못된 입력 400 / non-uuid id 400

이게 Phase 2~3에서 만든 가드·소유권·검증이 **실제로 동작하는지** 확인하는 안전망이에요. 나중에 코드를 리팩터링하다 실수로 가드를 빼먹으면, 이 테스트가 빨갛게 잡아줍니다.

#### e2e 테스트는 실제로 이렇게 생겼어요

`supertest`라는 도구로 **진짜 HTTP 요청을 흉내** 냅니다. "남의 픽은 못 지운다(403)" 시나리오를 보면:

```ts
it('남의 픽 삭제는 403', async () => {
  // 1) 주인(owner)으로 가입해서 토큰 받기
  const ownerToken = await signup(app, 'owner@example.com');

  // 2) 주인이 픽 하나 생성
  const created = await request(app.getHttpServer())
    .post('/picks')
    .set('Authorization', `Bearer ${ownerToken}`)        // 헤더에 토큰
    .send({ title: 'Lunch', options: ['Pizza', 'Salad'] }) // 요청 본문
    .expect(201);

  // 3) 다른 사람(intruder)으로 가입 → 그 토큰으로 주인 픽 삭제 시도
  const otherToken = await signup(app, 'intruder@example.com');
  await request(app.getHttpServer())
    .delete(`/picks/${created.body.id}`)
    .set('Authorization', `Bearer ${otherToken}`)
    .expect(403); // ← "거부됨"을 기대. 200이 오면 테스트 실패 = 보안 구멍 발견
});
```

읽는 법:
- `request(app.getHttpServer())` — 우리 앱에 **진짜 HTTP 요청**을 쏨 (브라우저 없이)
- `.set('Authorization', ...)` — 헤더 붙이기 (프론트 `fetch`의 `headers`와 동일)
- `.send({...})` — 요청 본문(body)
- `.expect(403)` — "응답 상태코드가 403이어야 한다". 다르면 테스트 실패

프론트의 Cypress/Playwright가 브라우저를 조종해 테스트한다면, **supertest는 그 백엔드 버전**이에요 — 서버에 직접 요청을 쏘고 응답을 확인. 위 테스트가 통과한다는 건 "남의 픽 삭제가 진짜로 막힌다"가 코드로 증명됐다는 뜻이에요.

#### 함정 ①: rate limiting이 테스트를 흔든다

Phase 3에서 로그인을 분당 5회로 제한했죠. 그런데 e2e는 짧은 시간에 수십 번 회원가입/로그인을 해요 → 금방 429에 걸려 테스트가 깨짐. 그래서 **테스트 환경(`NODE_ENV=test`)에서는 전역 ThrottlerGuard를 등록하지 않게** 했어요 ([app.module.ts](../src/app.module.ts)).

#### 함정 ②: 테스트 파일 병렬 실행 + 공유 DB = 충돌

jest는 빠르게 하려고 기본적으로 테스트 파일들을 **여러 개 동시에**(병렬로) 돌려요. 그런데 auth 스펙과 picks 스펙이 같은 `feelpick_test` DB를 공유하는데, auth가 "모든 user 삭제"를 하는 순간 picks 테스트의 데이터도 같이 날아가서 500/404가 떴어요.

해결: e2e는 **한 파일씩 차례로(직렬)** 실행. jest 설정의 `maxWorkers: 1`이 "동시 실행 일꾼을 1명으로" = 한 번에 하나씩 돌리라는 뜻이에요.

> 단위 테스트는 DB를 안 쓰니(전부 mock) 동시에 돌려도 안전 → 그대로 병렬. e2e만 직렬.

---

### Phase 4-3. 커버리지

```bash
npm run test:cov   # 코드의 몇 %가 테스트로 실행됐나
```

주의: `test:cov`는 **단위 테스트만** 측정해서 전체 수치(~16%)는 낮게 나와요. 컨트롤러·가드·인증은 e2e가 커버하는데 이 측정엔 안 잡히거든요. 핵심 비즈니스 로직인 **PicksService는 91%**로 잘 덮여있어요. 숫자 자체보다 **"중요한 로직이 테스트되는가"** 가 핵심이에요.

---

### Phase 4-4. GitHub Actions CI — push마다 자동 검증

[.github/workflows/ci.yml](../.github/workflows/ci.yml): GitHub에 push하거나 PR을 올리면 **자동으로** 검사가 돌아요.

```
push/PR 발생
   ↓
MySQL 8.4 컨테이너 띄움
   ↓
npm ci → prisma generate → lint → 단위 테스트 → e2e 테스트
   ↓
하나라도 실패하면 빨간 X (PR에 표시됨)
```

#### 왜 CI가 중요한가

- "내 컴퓨터에선 됐는데?" 를 방지 — **깨끗한 환경**에서 매번 검증
- 협업 시 누가 깨진 코드를 올리면 **머지 전에** 자동으로 잡힘
- 사람이 깜빡하는 lint/test를 **기계가 강제**

#### 프론트엔드 비유

Vercel이 PR마다 프리뷰 배포 + 빌드 체크 해주는 거랑 같은 발상. "사람이 까먹어도 기계가 매번 확인".

---

## Phase 4 새 명령어

```bash
npm test              # 단위 테스트 (빠름, DB 불필요)
npm run test:cov      # 커버리지 측정
npm run test:e2e      # e2e 테스트 (DB 필요 — docker compose up -d 먼저)
```

e2e 실행 전 체크리스트:
1. `docker compose up -d` (MySQL 떠있어야 함)
2. `npm run test:e2e` — 자동으로 `feelpick_test` DB 생성 + 마이그레이션 + 테스트

---

## 다음 단계 (Phase 5 예고)

Phase 5는 **운영 / 배포**. 즉:
- 앱 자체도 Docker 이미지로 만들기 (`Dockerfile`)
- `GET /health` 헬스 체크 엔드포인트
- 구조화 로깅(pino), 에러 추적(Sentry)
- Fly.io / Railway / Render 같은 데 실제 배포
- 운영에서 throttler를 Redis 기반으로, DB 연결을 TLS로 (Phase 2~3에서 "운영에선 이렇게" 라고 미뤄둔 것들)

여기까지 오면 "남에게 보여줄 수 있는 백엔드"가 됩니다.
