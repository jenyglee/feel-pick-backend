# 모노레포 Stage 5 — 프론트 ↔ 백엔드 연동 (공유 타입으로)

> 📚 [문서 홈](README.md) · [모노레포 전환 로드맵](monorepo-migration.md) · [← Stage 4](monorepo-stage-4.md)

> **3줄 요약**
> 1. 프론트(web)가 **공유 타입 + openapi-fetch**로 백엔드 `/picks`를 호출해 화면에 띄웠다.
> 2. 백엔드에 픽을 만들면 → web 화면에 바로 뜬다 (end-to-end 연결 완료).
> 3. 없는 필드를 쓰면 **빌드가 실패** → "타입 공유가 진짜로 작동"함을 증명했다.

이게 Stage 1~4를 쌓아온 **최종 목적지**예요. 드디어 화면에 백엔드 데이터가 뜹니다.

---

## 먼저 — 이번에 나오는 용어 3개

| 용어 | 뜻 (쉽게) |
|---|---|
| **openapi-fetch** | `fetch`를 감싼 작은 라이브러리. **백엔드 타입(`paths`)을 주면, 경로·응답이 전부 타입 검증되는** fetch가 됨. `api.GET('/picks')` 의 결과가 자동으로 `Pick[]`로 타입됨 |
| **서버 컴포넌트 (Server Component)** | Next.js의 컴포넌트인데 **브라우저가 아니라 서버에서 실행**됨. 그래서 컴포넌트 안에서 직접 `await fetch(...)`로 데이터를 가져와 HTML로 그려 보낼 수 있음. (DB 비밀번호·토큰이 브라우저로 안 새는 장점도) |
| **force-dynamic** | "이 페이지는 빌드 때 한 번 굳히지 말고, **요청 올 때마다 새로 그려라**" 라는 Next 설정. 라이브 데이터(백엔드 픽 목록)엔 이게 맞음 |

---

## 무엇을 / 왜 했나

### 1. 타입 안전 API 클라이언트

[apps/web/src/lib/api.ts](../apps/web/src/lib/api.ts):

```ts
import type { paths } from '@feel-pick/api-types';
import createClient from 'openapi-fetch';

export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
});
```

- `paths`는 Stage 4에서 생성한 **백엔드 OpenAPI 타입**.
- `openapi-fetch`는 그 `paths`를 받아 **경로·요청·응답이 전부 타입으로 검증되는** 클라이언트를 만들어요.
- `api.GET('/picks')` 의 응답 `data`는 자동으로 `Pick[]` 타입.

> 프론트 비유: GraphQL의 타입 안전 클라이언트(Apollo `useQuery`)의 REST 버전.

### 2. 픽 목록 페이지 (서버 컴포넌트)

[apps/web/src/app/page.tsx](../apps/web/src/app/page.tsx):

```tsx
import { api } from '@/lib/api';

export const dynamic = 'force-dynamic'; // 요청마다 최신 데이터

export default async function Home() {
  const { data, error } = await api.GET('/picks');
  // data는 Pick[]로 타입됨 → data.map(pick => pick.title) 전부 타입 안전
  ...
}
```

- **서버 컴포넌트**(async 함수)로 만들었어요. Next 16에서 서버 컴포넌트는 요청 시점에 직접 fetch 가능.
- `force-dynamic` → 빌드 시 정적으로 굳히지 않고 **요청마다 백엔드에서 최신** 픽을 가져옴.

### 3. 의존성

web에 `@feel-pick/api-types`(워크스페이스) + `openapi-fetch` 추가.

---

## 알아둔 점 (Next 16)

| 항목 | 내용 |
|---|---|
| **fetch 기본 캐시 X** | Next 16은 fetch를 기본으로 캐시 안 함 → 매번 fresh (우리 데모에 적합) |
| **서버 컴포넌트 = CORS 불필요** | 서버(Node)에서 백엔드를 부르는 server-to-server라 브라우저 CORS와 무관. (브라우저에서 직접 부르는 client 컴포넌트로 바꾸면 그땐 백엔드 CORS_ORIGIN 설정 필요) |
| **force-dynamic** | 라이브 데이터 페이지는 정적 프리렌더 대신 요청 렌더로 |

---

## 검증 — 두 가지로 증명

### ① End-to-end 동작
```
백엔드에 픽 생성("점심 뭐 먹지?" + 김밥/파스타)
   → web(:3001) 화면에 그 픽이 그대로 렌더됨 ✅
```
전체 체인: 백엔드 → openapi.json → schema.d.ts → web import → openapi-fetch → 서버컴포넌트 렌더.

### ② 타입 공유 증명 (핵심)
페이지에서 일부러 없는 필드 `pick.titleXXX`를 쓰고 빌드하니:
```
Type error: Property 'titleXXX' does not exist on type
'{ id; title; description; userId; options; createdAt }'
```
이 타입은 **백엔드 Pick에서 자동 생성된 것**이에요. 즉:

> 백엔드가 주지 않는 필드를 프론트가 쓰면 → **컴파일 타임에 에러로 잡힘.**

이게 모노레포 + 공유 타입의 결정적 가치예요. "API 바뀐 줄 모르고 런타임에 터지는" 일이 사라집니다.

---

## 이제 가능한 개발 워크플로

```bash
docker compose up -d mysql   # DB
npm run dev                  # backend(:3000) + web(:3001) 동시
# → http://localhost:3001 에서 백엔드 픽 목록 확인
```

백엔드 DTO를 바꾸면:
```bash
npm run openapi -w @feel-pick/backend   # openapi.json 갱신
npm run build  -w @feel-pick/api-types  # schema.d.ts 재생성
# → web에서 안 맞는 부분이 타입 에러로 표시됨
```
(turbo가 build 시 이 순서를 자동으로 처리)

---

## 🏁 로드맵 정리

Stage 1~5로 **백엔드 + 프론트가 한 레포에서 타입으로 묶인 모노레포**가 완성됐어요.

| Stage | 한 일 |
|---|---|
| 1 | 백엔드를 apps/backend로 이동 + 워크스페이스 |
| 2 | Docker/CI를 모노레포에 맞춤 |
| 3 | Next.js 프론트 합류 (apps/web) |
| 4 | 공유 타입 파이프라인 (Swagger → 타입) |
| **5** | **프론트↔백 연동 + 타입 공유 증명** |

→ 다음: [Stage 6 정리 (web Docker화 + compose 통합)](monorepo-stage-6.md) · [전환 로드맵](monorepo-migration.md)
