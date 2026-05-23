# Phase 5 — 운영 / 배포 (준비)

> 📚 [학습 노트 목차](phase-notes.md) · [← Phase 4](phase-4-testing.md)

> **3줄 요약**
> 1. 지금까진 **내 컴퓨터에서만** 도는 백엔드였다.
> 2. 앱을 Docker 이미지로 패키징하고, DB+앱을 한 번에 띄우고, 살아있는지 확인하는 길을 만들었다.
> 3. 실제 클라우드 배포(Fly.io 등)는 계정이 필요해서 "준비"까지만. 이 위에서 배포 한 방이면 된다.

#### 비유: "내 방에서만 되던 걸, 이삿짐 싸서 어디든 옮길 수 있게"

Phase 0~4가 집 안에서 가구를 잘 배치한 거라면, Phase 5는 그 집을 **컨테이너에 통째로 담아** 어느 땅에 내려놔도 똑같이 작동하게 만드는 단계예요.

이번에 한 것:
1. **`GET /health`** — "앱+DB 살아있나?" 확인하는 표준 엔드포인트
2. **구조화 로깅(pino)** — 운영에서 검색·분석 가능한 JSON 로그
3. **Dockerfile** — 앱을 이미지로 패키징 (어디서나 동일 실행)
4. **docker-compose에 backend 추가** — DB+앱을 한 명령으로 통합 실행

---

## Phase 5-1. `GET /health` — 살아있는지 확인하는 표준 창구

#### 왜 필요?

배포 플랫폼(또는 로드밸런서)은 주기적으로 "이 앱 아직 살아있어?"를 물어봐요. 응답이 없으면 "죽었네" 판단하고 재시작하거나 트래픽을 끊죠. 그 질문을 받는 **표준 창구**가 헬스 체크 엔드포인트예요.

그냥 "200 OK"만 주면 부족해요 — 앱은 떠 있는데 **DB 연결이 끊긴** 경우도 있거든요. 그래서 DB까지 핑을 날려 확인합니다.

#### 코드

`@nestjs/terminus`(NestJS 공식 헬스체크 도구)를 씁니다.

```ts
// src/health/health.controller.ts
@Get()
@HealthCheck()
check() {
  return this.health.check([
    () => this.db.pingCheck('database', this.prisma), // DB에 가벼운 쿼리
  ]);
}
```

응답 예시:

```json
{
  "status": "ok",
  "info": { "database": { "status": "up" } },
  "details": { "database": { "status": "up" } }
}
```

DB가 죽으면 `status: "error"` + 503을 돌려줘서, 플랫폼이 "이 인스턴스 문제 있음"을 알 수 있어요.

#### 프론트엔드 비유

상태 페이지(statuspage)나 `navigator.onLine` 체크처럼, "지금 시스템 정상이야?"를 한 곳에서 답해주는 거예요.

---

## Phase 5-2. 구조화 로깅 (nestjs-pino)

#### 문제: 기본 로그는 사람만 읽을 수 있다

NestJS 기본 로그는 `[Nest] LOG [AppModule] ...` 같은 **사람이 읽는 텍스트**예요. 운영에선 로그가 수백만 줄 쌓이는데, "특정 사용자의 에러만 찾기" 같은 검색이 어려워요.

#### 해결: JSON 구조화 로그

`pino`는 로그를 **JSON**으로 남겨요:

```json
{"level":30,"time":1779516918851,"context":"NestApplication","msg":"started"}
```

기계가 파싱하기 좋아서, 운영 로그 도구(Datadog, Grafana Loki 등)가 `level`, `context`, `time`으로 **검색·필터·집계**할 수 있어요.

#### 우리 설정의 포인트

```ts
// src/app.module.ts
LoggerModule.forRoot({
  pinoHttp: {
    level: isTest ? 'silent' : isProd ? 'info' : 'debug',
    redact: ['req.headers.authorization'],      // ① 토큰 가리기
    autoLogging: { ignore: (req) => req.url === '/health' }, // ② 헬스체크 제외
    transport: isProd || isTest
      ? undefined                                // ③ 운영은 순수 JSON
      : { target: 'pino-pretty', ... },          //    개발은 예쁘게
  },
})
```

- **① redact** — Phase 3에서 "비밀번호/토큰을 로그에 남기지 말자" 했죠. pino는 매 요청 헤더를 자동 로깅하는데, `Authorization`(JWT)을 `[Redacted]`로 가립니다. **보안 필수.**
- **② 헬스체크 제외** — `/health`는 몇 초마다 호출돼서 로그를 도배해요. 빼줍니다.
- **③ 환경별 출력** — 개발은 `pino-pretty`로 색깔 입힌 사람용, 운영은 순수 JSON(도구가 먹기 좋게), 테스트는 끔(출력 깔끔).

`main.ts`에서 이 로거를 앱 전역 로거로 지정:

```ts
const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.useLogger(app.get(Logger)); // 모든 NestJS 로그가 pino로 흐름
```

#### 프론트엔드 비유

`console.log('에러:', e)` 대신 Sentry/LogRocket에 **구조화된 이벤트**로 보내는 것과 같은 발상. "나중에 검색·분석 가능한 형태로 남기자".

---

## Phase 5-3. Dockerfile — 앱을 "이삿짐 박스"로 패키징

#### 왜 Docker로 앱까지?

Phase 1에서 DB를 Docker로 띄웠죠. 이번엔 **앱 자체**를 이미지로 만들어요. 그래야:
- 내 맥, 동료 윈도우, 클라우드 리눅스 어디서나 **똑같이** 실행
- "Node 버전 다름", "이 패키지 안 깔림" 같은 문제 사라짐

#### 멀티스테이지 빌드

[Dockerfile](../Dockerfile)은 **두 단계**로 나뉘어요:

```
[build 단계]  모든 의존성 설치 → prisma generate → nest build → dist 생성
     ↓ (dist만 가져옴)
[runtime 단계]  운영 의존성만 설치 → dist 실행
```

왜 나누나? **빌드 도구(typescript, nest cli 등)는 컴파일할 때만 필요**하고, 실제 실행엔 불필요해요. 최종 이미지엔 빌드 도구를 빼서 **가볍고 안전하게** 만듭니다. (프론트의 `npm run build` 후 `dist`만 배포하는 거랑 같은 발상)

#### 함정 ①: bcrypt는 네이티브 모듈

`bcrypt`는 C++로 컴파일되는 네이티브 모듈이에요. **alpine(musl) 이미지에선 컴파일이 자주 깨져서**, glibc 기반인 `node:22-slim`을 썼어요. slim엔 bcrypt의 미리 빌드된 바이너리가 바로 깔려서 문제없어요.

#### 함정 ②: 컨테이너 안에서 마이그레이션을 돌리려면 prisma CLI가 필요

배포 시 `prisma migrate deploy`로 DB 스키마를 맞춰야 하는데, 이 명령은 `prisma` CLI가 있어야 해요. CLI는 원래 devDependency라 운영 이미지(`--omit=dev`)엔 안 들어가죠. 그래서 **`prisma`와 `dotenv`를 dependencies로 옮겼어요** (Prisma 공식 권장: 서버에서 migrate deploy 하려면 CLI를 운영 의존성에 두라).

---

## Phase 5-4. docker-compose에 backend 추가 — 한 명령으로 전부

[docker-compose.yml](../docker-compose.yml)에 백엔드 서비스를 추가해서, **DB + 앱을 한 번에** 띄웁니다.

> 참고: 이 단계에선 서비스 이름이 `app` 이었는데, 이후 모노레포 전환에서 **`backend`** 로 바꿨어요(프론트 `web`과 구분). 아래 예시는 현재 이름(`backend`) 기준.

```yaml
backend:
  build: .
  depends_on:
    mysql:
      condition: service_healthy   # ① DB가 'healthy' 된 뒤에 시작
  environment:
    DATABASE_URL: 'mysql://root:root@mysql:3306/feelpick'  # ② 서비스명으로 접속
  command: sh -c "npx prisma migrate deploy && node dist/src/main.js"  # ③
```

- **① depends_on + healthy** — DB가 완전히 뜨기 전에 앱이 붙으면 연결 실패해요. "DB가 health check 통과할 때까지 기다렸다가" 앱 시작.
- **② `mysql:3306`** — 컨테이너 네트워크 안에선 `localhost`가 아니라 **서비스 이름(mysql)** + **내부 포트(3306)** 로 접속해요. (호스트에서 쓰던 `localhost:3307`은 호스트→컨테이너 매핑일 뿐)
- **③ migrate 먼저, 그다음 실행** — 앱 켜기 전에 DB 스키마를 최신으로 맞춤.

#### 실행

```bash
docker compose up -d --build   # 빌드 + DB + 앱 한 번에
curl http://localhost:3000/health   # {"status":"ok",...}
docker compose logs -f backend     # 앱 로그 보기
docker compose down            # 전부 중지
```

#### 프론트엔드 비유

`docker-compose.yml`은 "이 앱을 돌리려면 어떤 서비스들이 필요한가"의 **레시피**예요. 누구나 `docker compose up` 한 줄로 똑같은 환경을 재현. (프론트의 `package.json` + `npm install`이 의존성을 재현하듯, 인프라를 재현)

---

## Phase 5 통합 정리: `docker compose up` 하면 벌어지는 일

```
docker compose up -d --build
   ↓
[1] Dockerfile로 앱 이미지 빌드 (build → runtime 2단계)
   ↓
[2] mysql 컨테이너 시작 → healthcheck 통과 대기
   ↓
[3] mysql이 healthy 되면 backend 컨테이너 시작
   ↓
[4] backend: npx prisma migrate deploy  (DB 스키마 최신화)
   ↓
[5] backend: node dist/src/main.js      (서버 시작, pino 로그)
   ↓
[6] http://localhost:3000 으로 접근 가능, /health 로 상태 확인
```

---

## 아직 안 한 것 (실제 배포 — 계정 필요)

준비는 끝났고, 실제로 인터넷에 올리는 건 **외부 계정**이 필요해서 남겨뒀어요:

| 항목 | 필요한 것 | 비고 |
|---|---|---|
| **실제 배포** | Fly.io / Railway / Render 계정 | 위 Dockerfile 그대로 사용. `fly launch` 수준 |
| **에러 추적** | Sentry 계정 + DSN | 런타임 에러를 모아보는 도구 |
| **관리형 DB** | 클라우드 MySQL (PlanetScale 등) | 운영에선 DB도 컨테이너 말고 관리형으로 |
| **시크릿 관리** | 플랫폼의 secret 기능 | `JWT_SECRET` 등을 compose 평문 대신 |

그리고 Phase 2~3에서 "운영에선 이렇게"라고 미뤄둔 것들:
- **DB 연결 TLS** (`allowPublicKeyRetrieval` 대신)
- **throttler를 Redis 기반으로** (여러 인스턴스에서 정확한 카운팅)

---

## Phase 5 새 명령어

```bash
# 전체 스택 (DB + 앱) 빌드 + 실행
docker compose up -d --build

# 앱 로그 (JSON)
docker compose logs -f backend

# 헬스 체크
curl http://localhost:3000/health

# 전부 중지 (데이터는 볼륨에 남음)
docker compose down

# 이미지만 빌드 (배포 전 점검)
docker build -t feelpick-backend .
```

---

## 로드맵 끝!

Phase 0~5까지 오면서 **검증·DB·인증·보안·테스트·배포 준비**를 모두 갖춘 백엔드가 됐어요. 다음은 실제 배포를 해보거나, 기능(댓글·정렬·페이지네이션 등)을 늘려가며 각 Phase의 패턴을 반복 적용하면 됩니다.
