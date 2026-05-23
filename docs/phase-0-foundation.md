# Phase 0 — 백엔드의 "기본 위생"

> 📚 [학습 노트 목차](phase-notes.md) · 다음 → [Phase 1: 데이터 영속화](phase-1-database.md)

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

