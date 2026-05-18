# 프론트엔드 개발자를 위한 백엔드 학습 노트

이 문서는 `feel-pick-backend`를 만들면서 단계별로 도입한 개념을, **백엔드 처음 만져보는 프론트엔드 개발자 관점**에서 정리한 학습 가이드입니다.

전체 로드맵은 [ROADMAP.md](../ROADMAP.md)에 있고, 여기는 Phase 0 ~ Phase 1까지의 실제 코드 변경을 설명합니다.

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

## Phase 0 — 백엔드의 "기본 위생"

> Phase 0은 코드량은 적지만, 안 깔아두면 두고두고 후회하는 것들을 미리 셋업하는 단계.

도입한 5가지:

1. **입력 검증** — 클라이언트가 보낸 데이터가 올바른 모양인지 자동 검사
2. **환경변수 관리** — 비밀키, 포트 같은 걸 코드에 박지 않고 `.env`로 분리
3. **에러 응답 표준화** — 에러가 나도 항상 같은 모양으로 응답
4. **CORS** — 다른 도메인의 프론트엔드가 API 호출 가능하게 허용
5. **API 문서 (Swagger)** — 어떤 엔드포인트가 있고 뭘 받고 뭘 주는지 자동 문서화

각각 하나씩 봅시다.

---

### Phase 0-1. 입력 검증 (class-validator + ValidationPipe)

#### 문제

프론트에서 이런 요청이 왔다고 합시다:

```ts
fetch('/picks', {
  method: 'POST',
  body: JSON.stringify({ /* title이 빠짐 */, options: ['only'] }),
});
```

검증 없이 서비스 코드까지 그대로 들어가면:
- `dto.title.trim()` → `undefined.trim()` → 런타임 크래시
- 옵션이 1개뿐이라 비즈니스 규칙 위반

이걸 매번 `if (!dto.title) throw ...` 식으로 서비스에서 처리하면 코드가 지저분해집니다.

#### 해결: 데코레이터 기반 자동 검증

DTO(Data Transfer Object, 요청 바디의 타입)에 데코레이터만 붙이면 NestJS가 알아서 검증합니다.

```ts
// src/picks/dto/create-pick.dto.ts
export class CreatePickDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options: string[];
}
```

그리고 `main.ts`에서 **글로벌 ValidationPipe**를 한 번 등록:

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,            // DTO에 없는 필드는 제거
    forbidNonWhitelisted: true, // DTO에 없는 필드 보내면 400
    transform: true,            // 문자열 "123" → number 자동 변환
  }),
);
```

이제 검증 실패 시 자동으로 400 응답이 나갑니다.

```bash
curl -X POST /picks -d '{"options":["only"]}'
# 400, message: ["title must be a string", "options must contain at least 2 elements"]
```

#### 프론트엔드 비유

React에서 `zod`, `yup`으로 form input을 검증하는 것과 똑같습니다. 차이는:
- React: 사용자가 submit 누르기 직전에 검증
- NestJS: 요청이 컨트롤러에 들어오기 직전에 자동 검증

#### 흔한 함정

- DTO에 `class-validator` 데코레이터 안 붙이면 그냥 통과합니다. 데코레이터가 곧 검증 규칙.
- DTO를 `interface`로 만들면 안 됩니다. 데코레이터는 런타임에 살아있어야 해서 **`class`**여야 함.

---

### Phase 0-2. 환경변수 관리 (ConfigModule + .env)

#### 문제

`const PORT = 3000;` 처럼 코드에 박혀있으면:
- 로컬에선 3000, 프로덕션에선 8080 같이 환경별로 바꾸기 어려움
- DB 비밀번호 같은 걸 코드에 넣었다 git에 올리면 끝장

#### 해결: `.env` 파일 + ConfigModule

`.env`에 환경별 값을 적고, 코드에선 `process.env.PORT`로 읽음.

```bash
# .env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*
DATABASE_URL="mysql://root:root@localhost:3307/feelpick"
```

NestJS의 `@nestjs/config`가 시작 시 `.env`를 읽어들이고, 어디서나 `ConfigService`로 꺼낼 수 있게 해줍니다.

```ts
// src/app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  validate: validateEnv,  // ← 환경변수 검증 함수 (아래 설명)
})

// src/main.ts
const config = app.get(ConfigService);
await app.listen(config.get('PORT'));
```

#### 환경변수도 검증한다

`process.env.PORT`는 `string | undefined`라 위험합니다. 그래서 `class-validator`로 환경변수 스키마를 정의하고, 앱 시작 시 검증.

```ts
// src/config/env.validation.ts
export class EnvironmentVariables {
  @IsInt() @Min(1) @Max(65535) @IsOptional()
  PORT: number = 3000;

  @IsString()
  DATABASE_URL: string;  // 필수
}
```

`DATABASE_URL`이 빠지면 앱이 아예 안 뜨고 명확한 에러를 던집니다. **"잘못된 상태로 동작하느니 일찍 죽는다"** 가 백엔드 컨벤션.

#### 프론트엔드 비유

Next.js의 `process.env.NEXT_PUBLIC_*`과 비슷. 차이는:
- Next.js는 `NEXT_PUBLIC_` 접두사가 있어야 클라이언트에 노출
- NestJS는 백엔드 전용이라 그런 구분이 없음. `.env`는 절대 클라이언트로 안 나감.

#### 보안 룰

- **`.env`는 절대 git에 커밋 X.** [.gitignore](../.gitignore)에 이미 들어가 있음.
- **`.env.example`은 커밋 O.** "어떤 환경변수가 필요한가"를 팀원/CI에 알려주는 템플릿.

---

### Phase 0-3. 에러 응답 표준화 (Global ExceptionFilter)

#### 문제

기본 NestJS는 에러를 던지면 그럴듯한 JSON을 자동으로 만들어주긴 하는데, 형식이 통일되지 않습니다. 어떤 에러는 `{ message }` 만 있고, 어떤 에러는 `{ message, error, statusCode }` 가 섞여있음. 프론트에서 `error.message`가 string인지 array인지 매번 의심해야 함.

#### 해결: 모든 에러를 가로채는 글로벌 필터

```ts
// src/common/filters/all-exceptions.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // ... 어떤 예외든 항상 같은 모양으로 응답
    response.status(status).json({
      statusCode,
      message,
      error,
      timestamp,
      path,
    });
  }
}
```

이제 어떤 에러든 응답은 항상 이 모양:

```json
{
  "statusCode": 404,
  "message": "pick xxx not found",
  "error": "Not Found",
  "timestamp": "2026-05-18T11:43:17.605Z",
  "path": "/picks/xxx"
}
```

#### 프론트엔드 비유

React의 ErrorBoundary와 발상이 같습니다. "어디서 에러가 터지든 한 곳에서 일관되게 처리하자". 차이는 ErrorBoundary는 UI 렌더링용이고, ExceptionFilter는 HTTP 응답용.

#### 프론트가 좋아하는 이유

```ts
// 프론트에서
const res = await fetch('/picks/xxx');
if (!res.ok) {
  const err = await res.json();
  toast.error(Array.isArray(err.message) ? err.message[0] : err.message);
  // 이런 식으로 항상 같은 키로 접근 가능
}
```

---

### Phase 0-4. CORS

#### 문제

브라우저는 보안상 다른 도메인의 API 호출을 막습니다. `http://localhost:5173`에서 띄운 프론트가 `http://localhost:3000`의 백엔드를 호출하면:

```
Access to fetch at 'http://localhost:3000/picks' from origin
'http://localhost:5173' has been blocked by CORS policy
```

#### 해결: 백엔드가 "이 도메인은 호출해도 됨"이라고 응답 헤더로 알림

```ts
// src/main.ts
app.enableCors({
  origin: config.get('CORS_ORIGIN'),  // 환경변수로 분리
  credentials: true,
});
```

이러면 응답에 `Access-Control-Allow-Origin: *` 같은 헤더가 붙어서 브라우저가 허용합니다.

#### 흔한 함정

- **개발은 `*`로 두면 편한데, 프로덕션은 절대 `*` 쓰지 말 것.** 정확히 프론트 도메인만 허용.
- `credentials: true`를 켜면 `origin: '*'` 못 씁니다. 명시적 도메인 필요.

---

### Phase 0-5. API 문서 자동 생성 (Swagger / OpenAPI)

#### 문제

"이 백엔드에 어떤 엔드포인트가 있죠?" "이 요청 보내면 응답이 어떻게 와요?"
프론트엔드 협업할 때 매번 물어보면 비효율. 문서를 직접 손으로 쓰면 코드 바뀔 때마다 동기화 깨짐.

#### 해결: 데코레이터 보고 자동으로 OpenAPI 문서 생성

이미 컨트롤러/DTO/엔티티에 데코레이터 잔뜩 붙어있죠. `@nestjs/swagger`가 그걸 읽어서 자동으로 문서를 만들어줍니다.

```ts
// src/main.ts
const config = new DocumentBuilder()
  .setTitle('Feel Pick API')
  .setVersion('0.0.1')
  .build();
SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
```

이러면 **http://localhost:3000/docs** 에 인터랙티브 문서가 뜹니다. 거기서 "Try it out" 누르면 브라우저에서 바로 요청 보내볼 수 있어요.

추가로 OpenAPI 스펙 JSON도 `http://localhost:3000/docs-json` 에서 다운로드 가능.

#### 프론트엔드 비유

Storybook의 API 버전이라 생각하면 됩니다. "이 컴포넌트는 이런 props를 받고 이렇게 렌더링됩니다"의 백엔드 버전 = "이 엔드포인트는 이런 바디를 받고 이런 응답을 줍니다".

#### Swagger를 잘 쓰는 팁 (Phase 0.5 떡밥)

DTO/엔티티에 `@ApiProperty({ example, description })`을 채우면 Swagger UI에 예시값이 미리 들어가서 훨씬 편합니다. 또 OpenAPI JSON을 `openapi-typescript` 같은 도구로 변환하면 **프론트 타입을 자동 생성**할 수 있어요. (Phase 0.5에서 다룰 예정)

---

## Phase 1 — 데이터를 영원히 살아남게 하기 (DB)

Phase 0까지의 백엔드는 **메모리에 데이터를 저장**했습니다. 즉 서버 재시작하면 모든 픽이 사라집니다. 진짜 백엔드라면 데이터가 영속화돼야 하죠.

도입한 것들:
1. **Docker** — DB를 컨테이너로 띄우는 도구
2. **MySQL** — 데이터를 저장하는 관계형 데이터베이스
3. **Prisma** — TypeScript에서 SQL 안 쓰고 DB 다루는 도구 (ORM)
4. **Repository 패턴** — Service에서 DB를 직접 안 만지고 중간 레이어를 통하는 구조
5. **async/await로 전부 비동기화** — DB 호출은 시간이 걸리니까

---

### Phase 1-1. Docker — "DB를 코드로 설치하는 법"

#### 왜 Docker?

옛날엔 로컬 개발하려면:
1. MySQL을 직접 brew install
2. 설정 파일 수정
3. 사용자 만들고 권한 주고...

이게 **팀원마다 환경이 달라져서 "내 컴퓨터에선 됐는데?"** 가 빈번했어요.

Docker는 "DB를 통째로 컨테이너 이미지로 배포"해서 이 문제를 없앱니다. `docker-compose.yml` 하나만 있으면 누구나 똑같은 MySQL을 띄울 수 있음.

#### 우리 프로젝트의 docker-compose.yml

```yaml
# docker-compose.yml
services:
  mysql:
    image: mysql:8.4
    container_name: feelpick-mysql
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: feelpick
      MYSQL_USER: feelpick
      MYSQL_PASSWORD: feelpick
    ports:
      - '3307:3306'   # 호스트 3307 → 컨테이너 내부 3306
    volumes:
      - feelpick-mysql-data:/var/lib/mysql  # 데이터 영속화
```

#### 사용법

```bash
docker compose up -d      # 백그라운드로 MySQL 시작
docker compose down       # 중지 (데이터는 볼륨에 남음)
docker compose down -v    # 중지 + 데이터까지 완전 삭제
docker ps                 # 떠있는 컨테이너 확인
docker logs feelpick-mysql  # 컨테이너 로그 보기
```

#### 왜 포트가 3307?

MySQL 기본 포트는 3306인데, 우리 머신엔 이미 다른 MySQL이 3306을 쓰고 있어서 충돌이 났습니다. 그래서 호스트 쪽만 3307로 매핑. 컨테이너 안에서는 여전히 3306 사용.

#### 프론트엔드 비유

`package.json`이 "프로젝트가 어떤 라이브러리에 의존하는지"를 선언하듯, `docker-compose.yml`은 "프로젝트가 어떤 인프라(DB, Redis 등)에 의존하는지"를 선언하는 파일입니다.

---

### Phase 1-2. Prisma — "TypeScript로 DB 다루기"

#### 문제: SQL 직접 쓰기는 위험하고 귀찮음

전통적으로 DB 호출은 SQL 문자열:

```ts
const sql = `SELECT * FROM picks WHERE id = '${userInput}'`;
db.query(sql);  // ← SQL Injection!
```

또 결과 타입을 직접 지정해야 함:

```ts
const rows = await db.query('SELECT * FROM picks');
// rows의 타입이 any. 컬럼 이름 오타 나도 모름.
```

#### 해결: ORM (Object-Relational Mapping)

ORM은 SQL을 TypeScript 코드로 추상화해줍니다. Prisma의 경우:

```ts
const pick = await prisma.pick.findUnique({
  where: { id: userInput },   // SQL Injection 자동 방어
  include: { options: true },  // 관계 함께 조회
});
// pick의 타입이 자동으로 추론됨. 컬럼 오타 나면 컴파일 에러.
```

#### Prisma 스키마 = "DB의 단일 진실"

`prisma/schema.prisma` 한 파일에 모든 모델을 선언:

```prisma
model Pick {
  id          String       @id @default(uuid()) @db.VarChar(36)
  title       String       @db.VarChar(100)
  description String?      @db.VarChar(500)
  createdAt   DateTime     @default(now())
  options     PickOption[] // 1:N 관계
}

model PickOption {
  id     String @id @default(uuid()) @db.VarChar(36)
  label  String @db.VarChar(200)
  votes  Int    @default(0)
  pick   Pick   @relation(fields: [pickId], references: [id], onDelete: Cascade)
  pickId String @db.VarChar(36)
  @@index([pickId])
}
```

읽는 법:
- `@id` — 이 컬럼이 primary key
- `@default(uuid())` — 값 안 주면 자동 UUID 생성
- `@db.VarChar(36)` — MySQL에서 VARCHAR(36) 타입
- `String?` — nullable (TypeScript의 `string | null`)
- `@relation(...)` — 외래 키 관계
- `onDelete: Cascade` — Pick 삭제하면 연관 옵션도 자동 삭제

#### 마이그레이션 = "스키마 변경 이력 관리"

스키마 바꿀 때마다 `prisma migrate dev`를 실행하면:
1. Prisma가 현재 DB와 스키마를 비교
2. 차이만큼의 SQL을 생성해서 `prisma/migrations/` 에 저장
3. DB에 적용

`prisma/migrations/` 폴더는 **git에 커밋합니다.** 팀원이 pull 받고 `prisma migrate dev` 실행하면 자동으로 DB가 같은 상태가 됨.

#### 프론트엔드 비유

`schema.prisma`는 TypeScript의 `interface`와 비슷한 역할. "데이터 모양이 이래"를 한 곳에 적어두면, Prisma가 그걸 보고 TypeScript 타입을 자동 생성해줍니다. (`node_modules/@prisma/client` 안에 들어감)

#### Prisma의 핵심 명령어

```bash
npm run prisma:migrate     # 스키마 변경 → 마이그레이션 생성 + 적용
npm run prisma:generate    # TypeScript 타입 재생성 (보통 자동)
npm run prisma:studio      # 브라우저에서 DB 데이터 보기/수정
```

`prisma:studio`는 정말 편합니다. localhost:5555에 떠서 GUI로 데이터 다룰 수 있어요.

---

### Phase 1-3. Repository 패턴 — "Service가 DB를 모르게 만들기"

#### 패턴 도입 전 (Phase 0 시절)

```ts
// picks.service.ts
@Injectable()
export class PicksService {
  private readonly picks = new Map<string, Pick>();  // 메모리 저장

  create(dto: CreatePickDto): Pick {
    const pick: Pick = { id: randomUUID(), ... };
    this.picks.set(pick.id, pick);  // ← 직접 Map에 저장
    return pick;
  }
}
```

이걸 그대로 DB로 옮기면:

```ts
// 안티 패턴
create(dto: CreatePickDto) {
  return this.prisma.pick.create({ data: ... });  // ← Service가 Prisma 직접 사용
}
```

#### 왜 문제인가?

1. **테스트하기 어려움** — Service 단위 테스트하려면 DB가 떠있어야 함
2. **DB를 바꾸기 어려움** — 나중에 PostgreSQL로 바꾸면 Service 전부 수정
3. **비즈니스 로직과 DB 로직이 섞임** — 뭐가 규칙이고 뭐가 단순 저장인지 안 보임

#### 해결: 중간에 Repository 레이어

```
Controller  →  Service  →  Repository  →  Prisma  →  DB
   (HTTP)    (비즈니스      (DB 호출        (ORM)
              규칙)        만 담당)
```

각 레이어의 책임:
- **Controller** — HTTP 요청/응답 변환 (얇음)
- **Service** — 비즈니스 규칙 ("옵션 없으면 404 throw")
- **Repository** — DB 호출 ("Prisma로 픽 저장")

#### 실제 코드

```ts
// src/picks/picks.repository.ts — DB 호출만
@Injectable()
export class PicksRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOne(id: string): Promise<Pick | null> {
    return this.prisma.pick.findUnique({
      where: { id },
      include: { options: true },
    });
  }
}

// src/picks/picks.service.ts — 비즈니스 규칙
@Injectable()
export class PicksService {
  constructor(private readonly picks: PicksRepository) {}

  async findOne(id: string): Promise<Pick> {
    const pick = await this.picks.findOne(id);
    if (!pick) {
      throw new NotFoundException(`pick ${id} not found`);  // ← 규칙
    }
    return pick;
  }
}
```

테스트 시엔 Repository를 mock으로 바꿔치기:

```ts
// picks.service.spec.ts
const repo = { findOne: jest.fn().mockResolvedValue(null) };
// → DB 없이도 Service 로직 테스트 가능
```

#### 프론트엔드 비유

React에서 API 호출 로직을 컴포넌트에 직접 안 쓰고 `services/api.ts` 같은 곳으로 빼두는 것과 같은 발상. 컴포넌트는 "이 데이터 줘"만 알고, 실제로 어디서 받아오는지(REST? GraphQL? 캐시?)는 모르게.

---

### Phase 1-4. async/await의 전염

#### Phase 0 → Phase 1에서 가장 헷갈리는 변화

DB 호출은 시간이 걸립니다 (네트워크 왕복). 그래서 Prisma의 모든 메서드가 `Promise`를 반환. 그 결과 **Service, Controller까지 도미노로 async가 됩니다.**

```ts
// Phase 0 — 동기
findOne(id: string): Pick {
  const pick = this.picks.get(id);
  ...
}

// Phase 1 — 비동기
async findOne(id: string): Promise<Pick> {
  const pick = await this.picks.findOne(id);
  ...
}
```

Controller도:

```ts
// Phase 0
@Get(':id')
findOne(@Param('id') id: string): Pick { ... }

// Phase 1
@Get(':id')
findOne(@Param('id') id: string): Promise<Pick> { ... }
```

#### 흔한 함정

```ts
// ❌
const pick = this.picks.findOne(id);
if (!pick) throw ...  // pick은 Promise 객체라 truthy. throw 안 됨.

// ✅
const pick = await this.picks.findOne(id);
if (!pick) throw ...
```

`await` 빼먹으면 컴파일은 통과해도 동작이 완전히 망가집니다. ESLint 룰 (`@typescript-eslint/no-floating-promises`) 켜두는 걸 권장.

#### 프론트엔드 비유

React에서 `useState` 쓰는 컴포넌트는 다 함수형이어야 하듯, DB 쓰는 함수는 다 async가 됩니다. "한 번 비동기면 영원히 비동기".

---

### Phase 1-5. PrismaService — NestJS답게 감싸기

Prisma 공식 권장 패턴은 `PrismaClient`를 NestJS의 `Injectable`로 감싸기:

```ts
// src/prisma/prisma.service.ts
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();   // 앱 시작 시 DB 연결
  }
  async onModuleDestroy() {
    await this.$disconnect();  // 앱 종료 시 정리
  }
}
```

그리고 어디서나 주입받을 수 있게 글로벌 모듈로 등록:

```ts
// src/prisma/prisma.module.ts
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

이러면 Repository에서:

```ts
constructor(private readonly prisma: PrismaService) {}
```

만 쓰면 끝.

#### 왜 굳이 감싸나?

1. **수명주기 관리** — Nest가 시작/종료할 때 자동으로 연결/해제
2. **의존성 주입** — 테스트할 때 mock으로 바꿔치기 가능
3. **확장 포인트** — 로깅, 미들웨어 추가하기 쉬움

---

## Phase 0+1 통합 정리: 요청 한 번이 흐르는 길

`POST /picks`로 픽을 만들 때 일어나는 일:

```
1. 브라우저: fetch('/picks', { method: 'POST', body: {...} })
   |
2. NestJS HTTP 서버가 받음
   |
3. CORS 미들웨어가 origin 체크 → OK
   |
4. ValidationPipe가 body를 CreatePickDto로 변환 + 검증
   - title 있는지, options 2개 이상인지 등
   - 실패 시 → AllExceptionsFilter가 가로채서 표준 400 응답
   |
5. PicksController.create(dto) 호출
   |
6. PicksService.create(dto) 호출 (비즈니스 규칙)
   - title.trim() 등 정리
   |
7. PicksRepository.create(...) 호출 (DB 접근)
   |
8. PrismaService → Prisma Client → MySQL 컨테이너
   - INSERT INTO Pick ...
   - INSERT INTO PickOption ...
   |
9. 결과를 그대로 거꾸로 타고 올라옴
   |
10. NestJS가 객체를 JSON으로 직렬화해서 응답
```

레이어가 많아 보이지만 **각 단계가 한 가지만 책임지기 때문에** 어디서 문제가 나도 추적이 쉽습니다.

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

## 다음 단계 (Phase 2 예고)

Phase 2는 **인증/인가**. 즉:
- 로그인 / 회원가입 기능
- JWT 토큰 발급
- "본인이 만든 픽만 삭제 가능" 같은 권한 체크

지금은 누구나 모든 픽을 삭제할 수 있는 상태라 위험합니다. 다음 단계에서 "User" 도메인을 추가하고, Pick에 ownerId를 붙여서 권한 모델을 만들 예정.

---

## 더 읽어볼 거리

- NestJS 공식 문서: https://docs.nestjs.com/
- Prisma 공식 문서: https://www.prisma.io/docs
- class-validator: https://github.com/typestack/class-validator
- OpenAPI 표준: https://swagger.io/specification/
