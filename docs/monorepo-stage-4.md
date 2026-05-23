# 모노레포 Stage 4 — 공유 타입 파이프라인 (백엔드 → 프론트 타입 자동 생성)

> 📚 [문서 홈](README.md) · [모노레포 전환 로드맵](monorepo-migration.md) · [← Stage 3](monorepo-stage-3.md)

> **3줄 요약**
> 1. 백엔드의 **Swagger 문서**를 파일로 뽑아, 그걸로 **프론트 타입을 자동 생성**하는 파이프라인을 만들었다.
> 2. 이제 백엔드 API가 바뀌면 → 프론트 타입이 안 맞아 **컴파일 에러**로 즉시 잡힌다.
> 3. 이게 **모노레포를 하는 진짜 이유** (Stage 1~3은 이걸 위한 준비였다).

---

## 왜 이게 핵심인가

```
지금까지:  백엔드 응답 모양 바뀜 → 프론트는 모름 → 런타임에 화면 깨짐 (배포 후 발견)
이제부터:  백엔드 응답 모양 바뀜 → 프론트 타입 안 맞음 → 컴파일 에러 (작성 중 발견)
```

"API 바뀐 거 몰랐다"가 사라져요. 백엔드가 **단일 진실의 원천(single source of truth)** 이 되고, 프론트 타입은 거기서 자동으로 따라옵니다.

---

## 파이프라인 한눈에

```
[backend] AppModule
   │  (preview 모드 — DB 연결 없이 라우트/스키마만 수집)
   ▼
 openapi.json   ← API 계약 (Swagger 스펙 파일)
   │  (openapi-typescript)
   ▼
 schema.d.ts    ← TypeScript 타입 (자동 생성)
   │  (index.ts에서 재노출)
   ▼
[web] import { Schemas } from '@feel-pick/api-types'   ← Stage 5에서 사용
```

turbo가 **`api-types#build`는 `backend#openapi` 다음에** 실행되도록 순서를 보장해요. → 항상 최신 백엔드 스펙으로 타입이 만들어짐.

---

## 핵심 개념 (프론트 시점)

| 개념 | 뜻 | 비유 |
|---|---|---|
| **OpenAPI(Swagger)** | API의 "설계도/계약" (어떤 엔드포인트가 뭘 받고 주는지) | API 명세서 |
| **openapi-typescript** | 그 설계도 → TS 타입 변환기 | 도면 → 부품 규격서 자동 변환 |
| **preview 모드** | 앱을 "실제 실행 없이" 메타데이터만 읽기 | 건물 설계도만 보기 (입주 X) |
| **단일 진실의 원천** | 타입의 출처가 백엔드 하나 | 원본 1개, 사본은 자동 |

> 프론트에서 GraphQL Code Generator로 스키마 → TS 타입 뽑던 거랑 똑같은 발상이에요. 여기선 REST + OpenAPI 버전.

---

## 무엇을 / 왜 했나

### 1. 백엔드: Swagger 스펙을 파일로 출력 (preview 모드)

[apps/backend/src/openapi.ts](../apps/backend/src/openapi.ts):

```ts
const app = await NestFactory.create(AppModule, {
  preview: true,   // ← 핵심
  logger: false,
});
const document = SwaggerModule.createDocument(app, config);
writeFileSync('openapi.json', JSON.stringify(document, null, 2));
```

- **`preview: true`** 가 중요해요. 일반 모드면 앱이 진짜로 떠서 **DB에 연결**(PrismaService)하는데, preview 모드는 **프로바이더를 실제로 만들지 않아** DB 없이 라우트/스키마 메타데이터만 수집해요. → "타입 뽑으려고 DB까지 켤 필요 없음".
- 백엔드 스크립트: `npm run openapi -w @feel-pick/backend` → `apps/backend/openapi.json` 생성.

### 2. packages/api-types: openapi.json → TS 타입

[packages/api-types/package.json](../packages/api-types/package.json):
```jsonc
"scripts": {
  "build": "openapi-typescript ../../apps/backend/openapi.json -o src/schema.d.ts"
}
```
→ `src/schema.d.ts` 자동 생성 (paths/components/operations 타입 포함).

[packages/api-types/src/index.ts](../packages/api-types/src/index.ts) 가 그걸 깔끔하게 재노출:
```ts
export type { paths, components, operations } from './schema';
export type Schemas = components['schemas'];   // 예: Schemas['Pick']
```

### 3. turbo: 생성 순서 보장

[turbo.json](../turbo.json):
```jsonc
"openapi": { "outputs": ["openapi.json"] },
"@feel-pick/api-types#build": {
  "dependsOn": ["@feel-pick/backend#openapi"],   // openapi.json 먼저
  "outputs": ["src/schema.d.ts"]
}
```

---

## 함정 (실제로 겪음)

| 함정 | 원인 | 해결 |
|---|---|---|
| codegen 경로 실패 | `../backend`로 적음 (packages/api-types 기준이면 packages/backend) | `../../apps/backend/openapi.json` (루트로 올라가서 apps/backend) |
| `Pick` 이름 충돌 | TS 내장 유틸 `Pick<T, K>`과 겹침 | 개별 export 대신 `Schemas['Pick']` 묶음으로 노출 |
| "타입 뽑는데 DB 필요?" | 일반 부팅은 Prisma 연결됨 | **preview 모드**로 DB 없이 추출 |

---

## 생성물을 git에 커밋한 이유

`openapi.json`과 `schema.d.ts`는 자동 생성물이지만 **커밋**했어요:
- **`openapi.json`** = API 계약. PR diff에서 **"API가 이렇게 바뀌었다"가 보임** (리뷰 가치 ↑).
- **`schema.d.ts`** = 프론트가 codegen 안 돌려도 바로 타입 사용 가능 (DX ↑).
- 드리프트(안 맞음)는 turbo가 build 때 재생성 + CI가 검증해서 방지.

---

## 검증 (실제로 다 돌림)

```
✅ 생성물 삭제 후 turbo run build → 4개 태스크 순서대로 (backend build/openapi → api-types → web)
✅ openapi.json + schema.d.ts 자동 재생성
✅ Pick 타입 = 백엔드 엔티티와 일치 (id/title/description/userId/options/createdAt)
```

---

## 아직 — 프론트는 이 타입을 "아직 안 씀"

타입은 만들어졌지만, web이 실제로 import해서 API를 호출하는 건 다음 단계예요.

## 다음 (Stage 5)

**프론트 ↔ 백엔드 연동** — web에서 `openapi-fetch` + `@feel-pick/api-types`로 `/picks`를 호출해 화면에 띄웁니다. 그리고 **백엔드 DTO를 일부러 바꿔보고 프론트가 컴파일 에러를 내는지** 확인해 타입 공유를 증명합니다.

→ 다음: [Stage 5 정리 (프론트↔백 연동)](monorepo-stage-5.md) · [전환 로드맵](monorepo-migration.md)
