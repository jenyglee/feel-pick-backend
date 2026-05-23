# 모노레포 Stage 3 — Next.js 프론트 합류 (apps/web)

> 📚 [문서 홈](README.md) · [모노레포 전환 로드맵](monorepo-migration.md) · [← Stage 2](monorepo-stage-2.md)

> **3줄 요약**
> 1. `apps/web`에 **Next.js를 새로 만들어** 모노레포에 합류시켰다 (드디어 프론트 등장).
> 2. 백엔드는 `:3000`, 프론트는 `:3001` — 포트를 나눠 충돌을 피했다.
> 3. 이제 **`npm run dev` 한 줄로 백엔드 + 프론트를 동시에** 띄운다.

---

## 비유: 빈 방에 프론트 입주

Stage 1~2에서 "여러 방 있는 집"으로 구조를 바꿨죠. 이번엔 비어있던 **`apps/web` 방에 Next.js가 입주**한 거예요. 가구(코드)는 아직 기본 템플릿이지만, 전기·수도(워크스페이스·turbo 연결)는 다 연결됐어요.

```
feel-pick/
├─ apps/
│  ├─ backend/   (@feel-pick/backend, :3000)   ← 기존
│  └─ web/       (@feel-pick/web,     :3001)   ← 신규 입주
├─ package.json  (turbo run dev → 둘 다 실행)
└─ turbo.json
```

---

## 무엇을 / 왜 했나

### 1. Next.js 스캐폴드

`create-next-app`으로 `apps/web`을 만들었어요. 스택은 요즘 Next 표준:
- **App Router** (Next의 최신 라우팅) + **TypeScript** + **Tailwind CSS** + **ESLint**
- 결과: Next.js 16 + React 19

```bash
npx create-next-app@latest apps/web \
  --ts --app --src-dir --import-alias "@/*" --eslint --tailwind \
  --use-npm --skip-install --no-git --yes
```

두 플래그가 모노레포에서 중요했어요:
- **`--skip-install`** — create-next-app이 자기 폴더에 `node_modules`/`package-lock.json`을 따로 만들면 워크스페이스(루트 공유)와 충돌해요. 설치는 건너뛰고, **나중에 루트에서 `npm install`** 로 통합.
- **`--no-git`** — 이미 git 레포 안이라 새 git 초기화 방지.

### 2. 이름 + 포트 조정

[apps/web/package.json](../apps/web/package.json):
```jsonc
{
  "name": "@feel-pick/web",          // 워크스페이스 규칙에 맞게
  "scripts": {
    "dev": "next dev -p 3001",       // 백엔드(3000)와 안 겹치게 3001
    "start": "next start -p 3001"
  }
}
```

> **왜 포트를 나누나?** 백엔드도 프론트도 각자 웹서버를 띄워요. 둘 다 3000을 쓰면 "포트 충돌"로 하나가 못 떠요. 그래서 백엔드 3000 / 프론트 3001로 분리.

### 3. 백엔드에 `dev` 스크립트 추가

turbo의 `dev` 작업이 **모든 워크스페이스의 `dev` 스크립트**를 실행하는데, 백엔드엔 `start:dev`만 있고 `dev`가 없었어요. 그래서 백엔드에 별칭 추가:

```jsonc
// apps/backend/package.json
"dev": "nest start --watch"
```

이제 루트 `npm run dev`(= `turbo run dev`)가 **backend + web 둘 다** 띄워요.

### 4. 루트에서 통합 설치

```bash
npm install   # 루트에서 → web의 next/react 등 설치 + 공용 node_modules에 통합
```

TypeScript는 Stage 1에서 박아둔 `overrides`(5.9.3) 덕에 web도 같은 버전을 써요 (버전 드리프트 방지).

---

## 함정 / 알아둘 점

| 항목 | 내용 |
|---|---|
| **`--skip-install` 필수** | 안 그러면 apps/web에 nested lockfile/node_modules가 생겨 워크스페이스와 충돌 |
| **포트 충돌** | 백엔드·프론트 둘 다 서버라 포트 분리(3000/3001) 필요 |
| **`.next`는 커밋 X** | Next 빌드 산출물. create-next-app이 만든 `apps/web/.gitignore`가 이미 제외 |
| **Next 16 breaking changes** | `apps/web/CLAUDE.md`에 "컴포넌트 코드 작성 전 Next 16 docs 확인" 안내. 실제 페이지 작성(Stage 5)에서 주의 |

---

## 검증 (실제로 다 돌림)

```
✅ npm run build -w @feel-pick/web   → Next 빌드 + TS 체크 통과
✅ web dev 서버 :3001                → HTTP 200
✅ npm run build (turbo)             → backend + web 2개 워크스페이스 모두 빌드
✅ @feel-pick/web 워크스페이스 인식, TS 5.9.3 유지
```

---

## 이제 가능한 것

```bash
docker compose up -d mysql   # DB 먼저
npm run dev                  # turbo: backend(:3000) + web(:3001) 동시 기동!
```

- 백엔드 API: http://localhost:3000 (`/docs`, `/health`)
- 프론트: http://localhost:3001

다만 **아직 프론트와 백엔드는 "연결" 안 됐어요.** 각자 따로 떠 있을 뿐. 연결(타입 공유 + API 호출)은 다음 단계.

## 다음 (Stage 4)

**공유 타입 파이프라인** — 백엔드 Swagger 문서를 `openapi-typescript`로 변환해 `packages/api-types`를 만들고, 프론트가 그 타입을 import. "백엔드 바뀌면 프론트가 컴파일 에러로 즉시 안다"는 모노레포의 핵심 가치를 구현합니다.

→ 다음: [Stage 4 정리 (공유 타입 파이프라인)](monorepo-stage-4.md) · [전환 로드맵](monorepo-migration.md)
