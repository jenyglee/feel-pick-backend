# Phase 1 — 데이터를 영원히 살아남게 하기 (DB)

> 📚 [학습 노트 목차](phase-notes.md) · [← Phase 0](phase-0-foundation.md) · 다음 → [Phase 2: 인증/인가](phase-2-auth.md)

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
