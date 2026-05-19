# 프론트엔드 개발자를 위한 백엔드 학습 노트

이 문서는 `feel-pick-backend`를 만들면서 단계별로 도입한 개념을, **백엔드 처음 만져보는 프론트엔드 개발자 관점**에서 정리한 학습 가이드입니다.

전체 로드맵은 [ROADMAP.md](../ROADMAP.md)에 있고, 여기는 Phase 0 ~ Phase 2까지의 실제 코드 변경을 설명합니다.

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

## Phase 2 — 인증(AuthN) / 인가(AuthZ)

지금까지는 누구나 모든 픽을 만들고 삭제할 수 있었습니다. Phase 2의 목표는 **"누가 무엇을 했는가" 추적**과 **"본인 픽만 삭제 가능" 같은 권한 모델** 도입.

도입한 것들:
1. **인증(Authentication) vs 인가(Authorization)** 개념
2. **`User` 모델** + `Pick`에 소유자(`userId`) 외래 키
3. **bcrypt** — 비밀번호를 해시로 저장 (절대 평문 X)
4. **JWT** — 로그인 후 매번 비밀번호 안 보내게 만드는 토큰
5. **Passport + JwtStrategy** — 토큰 검증을 NestJS 답게 자동화
6. **JwtAuthGuard** — 엔드포인트마다 자물쇠 채우기
7. **`@CurrentUser()` 커스텀 데코레이터** — 토큰에서 사용자 꺼내쓰기
8. **소유권 체크** — "본인 픽만 삭제" 정책 (`ForbiddenException`)
9. **Swagger Bearer 인증 UI** — 문서에서도 토큰 입력해서 시험 가능

---

### Phase 2-1. 인증 vs 인가 — 단어부터 정리

| 용어 | 한 줄 | 우리 코드의 위치 |
|---|---|---|
| **인증 (Authentication, AuthN)** | "당신 누구?" → 로그인 | [src/auth/auth.service.ts](../src/auth/auth.service.ts) `login()` |
| **인가 (Authorization, AuthZ)** | "당신 이거 해도 됨?" → 권한 체크 | [src/picks/picks.service.ts](../src/picks/picks.service.ts) `remove()` 의 소유자 체크 |

영어 단어가 둘 다 "Auth"로 시작해서 헷갈리는데, **인증은 신원 확인, 인가는 권한 확인**이라고 외워두면 안 헷갈립니다.

#### 프론트엔드 비유

- 인증 = 로그인 폼 제출 → JWT 토큰 받아서 `localStorage`에 저장
- 인가 = "내 글만 수정 버튼 보이게" 의 서버 버전. 클라가 버튼을 숨기는 건 UX일 뿐, **서버가 진짜로 막아야** 보안.

---

### Phase 2-2. User 모델 + Pick에 소유자 연결

#### 스키마 변경

```prisma
// prisma/schema.prisma
model User {
  id           String   @id @default(uuid()) @db.VarChar(36)
  email        String   @unique @db.VarChar(255)   // ← 중복 불가
  passwordHash String   @db.VarChar(255)            // ← 평문 X, 해시 O
  displayName  String   @db.VarChar(50)
  createdAt    DateTime @default(now())
  picks        Pick[]
}

model Pick {
  // ... 기존 필드
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String @db.VarChar(36)

  @@index([userId])
}
```

핵심 두 가지:
- **`email @unique`** — DB 레벨에서 중복 가입을 막음 (코드 검증과 별개의 두 번째 안전망)
- **`Pick.userId` + `onDelete: Cascade`** — 사용자가 탈퇴하면 그 사람이 만든 픽도 같이 사라짐

#### 흔한 함정: NOT NULL 컬럼 추가하는 마이그레이션

기존 `Pick` 테이블에 행이 1개라도 있는 상태에서 `userId` (NOT NULL) 추가하려고 하면 Prisma가 막습니다:

```
⚠️ Added the required column `userId` to the `Pick` table without a default value.
There are 1 rows in this table, it is not possible to execute this step.
```

해결책 두 가지:
1. **개발용 빠른 길**: `prisma migrate reset` 으로 DB 통째로 비우고 재적용
2. **운영용 안전한 길**: `userId`를 일단 nullable로 → 백필 → NOT NULL로 다시 마이그레이션

Phase 2에선 테스트 데이터뿐이라 1번을 선택했습니다.

#### 프론트엔드 비유

`@unique` 는 React의 `key` prop과 비슷한 발상. "이 컬럼이 식별자 역할을 한다"는 약속.

---

### Phase 2-3. bcrypt — 비밀번호는 **절대** 평문으로 저장하지 않는다

#### 왜?

DB가 유출되는 상황을 가정해보세요. 평문이면:
- `password = "qwer1234"` → 해커가 그대로 다른 사이트(같은 비번 쓰는 사람의 이메일/은행)에 시도
- 사용자 전체 비밀번호 유출

해시(hash)로 저장하면:
- `passwordHash = "$2b$10$N9qo8uLOickgx2..."` → 원문을 역산하기 사실상 불가능
- 로그인 시: 사용자가 보낸 평문을 같은 알고리즘으로 해시해서 **저장된 해시와 비교**

#### 해시 vs 암호화

종종 헷갈리는데:
- **암호화(encryption)** — 키만 있으면 원문 복원 가능 (양방향)
- **해시(hash)** — 원문 복원 불가능 (단방향). 비밀번호처럼 "맞나 틀리나만 확인하면 되는" 경우에 적합.

#### bcrypt를 쓰는 이유

다른 해시(SHA-256 등)는 너무 빨라서 무차별 대입(brute force)에 약합니다. bcrypt는 **느리도록 설계된** 알고리즘으로, `rounds` 값(우리 코드에선 10)으로 느린 정도를 조절합니다. `rounds` 10이면 해시 한 번에 약 100ms — 사용자는 못 느끼지만 공격자에겐 치명적.

#### 우리 코드

```ts
// src/auth/auth.service.ts
import * as bcrypt from 'bcrypt';

const passwordHash = await bcrypt.hash(dto.password, 10);  // 가입
const ok = await bcrypt.compare(dto.password, user.passwordHash);  // 로그인
```

이게 전부. 라이브러리가 salt(랜덤 값 자동 추가) + 검증 다 알아서 해줍니다.

#### 흔한 함정

- **응답 객체에 `passwordHash`가 새어나가는 사고.** 우리는 [`UsersRepository`](../src/users/users.repository.ts)의 `publicUserSelect` 상수로 Prisma 단계에서 컬럼을 잘라냈고, Swagger용 [`User` 엔티티](../src/users/entities/user.entity.ts)에도 `passwordHash` 필드가 없습니다. 이중 안전.
- **비밀번호 길이를 너무 길게 허용 X.** bcrypt는 72바이트만 처리하므로 우리도 [signup DTO](../src/auth/dto/signup.dto.ts)에서 `MaxLength(72)` 로 제한.

---

### Phase 2-4. JWT — 매번 로그인 안 하게 만드는 토큰

#### 왜 필요?

매 API 호출마다 `Authorization: Basic email:password` 를 보내면:
- 클라가 평문 비밀번호를 계속 들고 있어야 함
- 서버는 매번 bcrypt 비교 (느림)

JWT 흐름은:
1. 로그인 한 번 → 서버가 **서명된 토큰** 발급
2. 이후 매 요청에 `Authorization: Bearer <token>` 헤더로 토큰만 보냄
3. 서버는 토큰 서명만 검증 (DB 안 가도 됨)

#### JWT 구조

`xxxxx.yyyyy.zzzzz` 점 두 개로 나뉜 3 부분:
- **header** — 어떤 알고리즘 썼는지 (`{ "alg": "HS256" }`)
- **payload** — 실제 데이터 (`{ "sub": "user-uuid", "email": "..." }`)
- **signature** — header+payload를 **JWT_SECRET으로 서명**한 값

**핵심**: payload는 base64로 인코딩만 돼있어서 **누구나 디코드 가능**. [jwt.io](https://jwt.io) 에 붙여보면 내용 다 보입니다.

> ⚠️ 그래서 비밀번호 같은 민감한 정보는 **JWT에 절대 넣지 않습니다.** 우리 payload는 `{ sub: user.id, email }`만.

위조 못 하는 이유는 서명. 서버만 아는 `JWT_SECRET` 없이는 같은 서명을 만들 수 없으므로, 누가 payload를 조작하면 서명 불일치로 검증 실패.

#### 우리 코드

```ts
// src/auth/auth.service.ts
private issueToken(user: { id: string; email: string }) {
  const payload = { sub: user.id, email: user.email };
  const accessToken = this.jwt.sign(payload, {
    secret: this.config.get('JWT_SECRET'),
    expiresIn: this.config.get('JWT_EXPIRES_IN'),  // '1d' 같은 문자열
  });
  return { accessToken };
}
```

`sub`(subject)는 JWT 표준에서 "이 토큰이 누구를 가리키는지"의 자리. 우리는 user의 UUID를 넣습니다.

#### .env 두 개

```bash
JWT_SECRET="f3e64cf5...."   # openssl rand -hex 32 로 생성
JWT_EXPIRES_IN="1d"          # 1일
```

env.validation 에 `JWT_SECRET` 은 `@MinLength(16)` 까지 걸어둬서 너무 짧은 시크릿은 부팅이 거부됨.

#### 프론트엔드 비유

JWT는 **서버에서 발급한 입장권**. 클라는 한 번 받으면 만료 전까지 계속 들고 다니면서 보여주기만 하면 됨. 서버는 매번 신원 확인 안 해도 입장권 자체가 유효한지만 보면 됨.

#### 흔한 함정

- **토큰을 어디 저장하나?** 프론트에선 보통 `localStorage` 또는 HttpOnly 쿠키. 쿠키가 XSS에 안전하지만 CSRF 고려 필요. 학습 단계에선 `localStorage`로 시작해도 OK.
- **만료된 토큰**: `JwtStrategy`의 `ignoreExpiration: false` 옵션 때문에 만료된 토큰은 자동으로 401.
- **로그아웃**: JWT는 **상태가 없어서** 서버가 강제로 무효화 못 합니다. 보통 클라이언트가 토큰을 지우면 끝. 강제 무효화가 필요하면 refresh token + blacklist 같은 추가 설계 필요 (이건 Phase 3+ 영역).

---

### Phase 2-5. Passport + JwtStrategy — 토큰 검증을 NestJS답게

#### Passport가 뭐?

Node.js 생태계의 표준 인증 라이브러리. **"전략(Strategy)" 패턴** 으로 다양한 인증 방식(JWT, Google OAuth, GitHub OAuth, 로컬 username/password 등)을 같은 인터페이스로 다루게 해줍니다.

우리는 그중 `passport-jwt` 만 사용. 나중에 "Google 로그인 붙이자" 가 되면 `passport-google-oauth20` 만 추가하면 됨.

#### JwtStrategy 한 일

```ts
// src/auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private users: UsersRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),  // ① 어디서 토큰 꺼내올지
      ignoreExpiration: false,                                   // ② 만료 토큰 거부
      secretOrKey: config.get('JWT_SECRET'),                     // ③ 검증 키
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.users.findById(payload.sub);          // ④ 토큰 통과하면 DB에서 사용자 조회
    if (!user) throw new UnauthorizedException();
    return user;                                                  // ⑤ 리턴값이 request.user로 들어감
  }
}
```

흐름:
1. 요청이 들어오면 `Authorization: Bearer xxx` 헤더에서 토큰 추출 (①)
2. 서명·만료 검증 (②③)
3. 통과하면 `validate(payload)` 호출
4. DB에서 진짜 그 사용자가 존재하는지 확인 (④) — 토큰 발급 이후 사용자가 삭제됐을 수도 있으니
5. 리턴한 객체가 `request.user` 에 자동으로 들어감 (⑤)

#### 왜 매번 DB를 가나?

토큰만 검증해도 충분할 것 같지만, 실제로는 그 사이 사용자가 삭제됐거나 정보가 바뀌었을 수 있습니다. 매 요청마다 `findById(payload.sub)` 한 번 더 가는 게 안전.

> Phase 3에서 **캐시**(Redis 등) 도입하면 이 DB 왕복도 줄일 수 있어요.

---

### Phase 2-6. JwtAuthGuard — 엔드포인트에 자물쇠 채우기

NestJS의 **Guard**는 라우트 진입 직전에 "통과 가능?"을 판정하는 미들웨어. ValidationPipe와 비슷한 자리지만 역할이 "검증" 아니라 "허가".

```ts
// src/auth/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

이게 전부. `AuthGuard('jwt')`는 위에서 등록한 `JwtStrategy` 를 자동으로 호출.

#### 사용법

```ts
// src/picks/picks.controller.ts
@Post()
@UseGuards(JwtAuthGuard)   // ← 자물쇠
@ApiBearerAuth()            // ← Swagger에 "🔓 자물쇠 아이콘" 표시
create(@CurrentUser() user: User, @Body() dto: CreatePickDto) {
  return this.picksService.create(user.id, dto);
}
```

토큰 없거나 잘못된 토큰이면 **자동으로 401 Unauthorized** 응답. 컨트롤러 코드는 한 줄도 안 늘어남.

#### 흔한 함정: PicksModule에 AuthModule을 import 해야 하나?

**필요 없습니다.** Passport는 `'jwt'` 같은 이름으로 strategy를 **전역 레지스트리에 등록**하기 때문에, `JwtStrategy` 가 `AuthModule` 안에서 한 번만 인스턴스화되면 어디서나 `AuthGuard('jwt')` 로 가져다 쓸 수 있어요.

`PicksController` 는 그냥 `JwtAuthGuard` 클래스 자체만 import 하면 끝.

---

### Phase 2-7. `@CurrentUser()` — 토큰에서 사용자 꺼내쓰기

#### 문제

JwtStrategy의 `validate()` 가 리턴한 User가 `request.user` 에 들어가 있는데, 컨트롤러에서 매번 이렇게 쓰면 지저분합니다:

```ts
create(@Req() req: Request) {
  const user = req.user as User;   // 타입 단언, 보기 싫음
  return this.picksService.create(user.id, ...);
}
```

#### 해결: 커스텀 파라미터 데코레이터

```ts
// src/common/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const req = ctx.switchToHttp().getRequest<Request & { user: User }>();
    return req.user;
  },
);
```

쓸 땐:

```ts
create(@CurrentUser() user: User, @Body() dto: CreatePickDto) {
  return this.picksService.create(user.id, dto);
}
```

깔끔합니다. `@Body()`, `@Param()` 처럼 NestJS 기본 데코레이터와 똑같은 사용감.

#### 프론트엔드 비유

React의 커스텀 훅과 같은 발상. `const user = useCurrentUser();` 처럼 자주 쓰는 로직을 한 곳에 뽑아두고 컴포넌트에선 한 줄로 호출.

---

### Phase 2-8. 인가(AuthZ) — "본인 픽만 삭제" 정책

```ts
// src/picks/picks.service.ts
async remove(userId: string, id: string): Promise<void> {
  const pick = await this.picks.findOne(id);
  if (!pick) throw new NotFoundException(`pick ${id} not found`);
  if (pick.userId !== userId) {
    throw new ForbiddenException('You can only delete your own picks');
  }
  await this.picks.delete(id);
}
```

세 줄짜리 정책이지만 보안 핵심:
1. 픽이 존재하나? — **404**
2. 그 픽의 소유자가 나인가? — 아니면 **403**
3. 그제서야 삭제

#### 401 vs 403, 헷갈리기 쉬움

- **401 Unauthorized** — "당신 누구신지 모르겠어요" (토큰 없음/잘못됨) — **인증 실패**
- **403 Forbidden** — "당신 누군지는 알겠는데, 이거 못 함" — **인가 실패**

영어 단어가 또 헷갈리는데 (Unauthorized인데 인증 실패라니), HTTP 표준이 그렇게 정해진 거라 그냥 외워야 합니다.

#### 단위 테스트도 같이 늘어남

[picks.service.spec.ts](../src/picks/picks.service.spec.ts) 에 두 케이스 추가:
- 다른 사용자가 삭제 시도 → `ForbiddenException`
- 본인이 삭제 시도 → `repo.delete` 호출됨

비즈니스 규칙은 항상 테스트로 박제해두기. 나중에 누가 if문 잘못 건드려서 정책이 무너지면 테스트가 잡아줌.

---

### Phase 2-9. Swagger Bearer 인증 — 문서에서 토큰 입력하기

```ts
// src/main.ts
const swaggerConfig = new DocumentBuilder()
  // ...
  .addBearerAuth()   // ← 이 줄 추가
  .build();
```

이러면 `/docs` 페이지 우측 상단에 **🔓 Authorize** 버튼이 생깁니다. 클릭해서 토큰 한 번 박아두면, 모든 보호된 엔드포인트가 자동으로 `Authorization: Bearer ...` 헤더와 함께 호출됨. 매번 헤더 손으로 안 적어도 됨.

`@ApiBearerAuth()` 데코레이터를 컨트롤러 메서드에 붙인 곳은 자물쇠 아이콘이 표시돼서 "이건 인증 필요" 라는 게 시각적으로 보입니다.

---

## Phase 2 통합 정리: 회원가입 → 픽 생성 → 삭제 시도의 전체 흐름

`A 사용자가 가입하고 픽 만든 뒤, B 사용자가 그 픽 삭제하려 할 때:`

```
[1] A: POST /auth/signup { email, password, displayName }
    ↓
    AuthService.signup
    ├─ UsersRepository.findByEmail — 중복 체크 (있으면 409)
    ├─ bcrypt.hash(password, 10)
    ├─ UsersRepository.create — User 행 생성 (passwordHash 저장)
    └─ jwtService.sign({ sub: user.id, email })
    ↓
    응답: { accessToken: "eyJhbGc..." }

[2] A: POST /picks  (Authorization: Bearer eyJhbGc...)
    ↓
    JwtAuthGuard → JwtStrategy.validate(payload)
    ├─ 서명 검증 + 만료 체크
    ├─ UsersRepository.findById(payload.sub) — DB에 실존?
    └─ request.user = User
    ↓
    ValidationPipe (CreatePickDto 검증)
    ↓
    PicksController.create(@CurrentUser() A, dto)
    ↓
    PicksService.create(A.id, dto)
    ↓
    PicksRepository.create({ userId: A.id, ... })
    ↓
    응답: 새 Pick (userId = A.id)

[3] B: POST /auth/login → 토큰 B 발급

[4] B: DELETE /picks/<A의 픽 id>  (Authorization: Bearer <B의 토큰>)
    ↓
    JwtAuthGuard → request.user = B
    ↓
    PicksController.remove(@CurrentUser() B, id)
    ↓
    PicksService.remove(B.id, id)
    ├─ findOne(id) → pick (userId = A.id)
    └─ pick.userId !== B.id  →  ForbiddenException
    ↓
    AllExceptionsFilter 가 잡아서
    응답: 403 { message: "You can only delete your own picks", ... }
```

이전 단계에서 만든 모든 안전장치(ValidationPipe, ParseUUIDPipe, AllExceptionsFilter)와 **자연스럽게 조립**되는 게 포인트. NestJS 의 모듈/가드/데코레이터 패턴이 빛을 보는 단계.

---

## Phase 2 새 명령어

별도 명령어 추가는 없고, 기존 명령어 그대로 + Swagger Authorize UI 사용.

```bash
# JWT 시크릿 새로 생성 (배포 시마다 새 값 권장)
openssl rand -hex 32

# 단위 테스트 (11개로 늘어남: ForbiddenException, owner-check 등)
npm test
```

---

## 다음 단계 (Phase 3 예고)

Phase 3는 **보안 강화**. 즉:
- `helmet` — XSS, clickjacking 같은 공격 방어 헤더 자동 추가
- `@nestjs/throttler` — 무차별 로그인 시도, DDoS 차단 (Rate Limiting)
- 로깅 마스킹 — 토큰/비밀번호가 실수로 로그에 남는 사고 방지
- 의존성 취약점 스캔 — `npm audit`, Dependabot

지금까지는 "기능이 동작하나" 에 집중했다면, Phase 3은 "악의적 요청을 어떻게 막을까" 에 집중합니다.

---

## 더 읽어볼 거리

- NestJS 공식 문서: https://docs.nestjs.com/
- Prisma 공식 문서: https://www.prisma.io/docs
- class-validator: https://github.com/typestack/class-validator
- OpenAPI 표준: https://swagger.io/specification/
