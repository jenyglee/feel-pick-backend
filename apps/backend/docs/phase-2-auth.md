# Phase 2 — 인증(AuthN) / 인가(AuthZ)

> 📚 [학습 노트 목차](phase-notes.md) · [← Phase 1](phase-1-database.md) · 다음 → [Phase 3: 보안 강화](phase-3-security.md)

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
