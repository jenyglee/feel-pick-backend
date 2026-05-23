# 모노레포 Stage 1 — 백엔드를 apps/backend로 이동 (실제 작업 정리)

> 📚 [문서 홈](README.md) · [모노레포 전환 로드맵](monorepo-migration.md) · [백엔드 학습 노트](../apps/backend/docs/phase-notes.md)

> **3줄 요약**
> 1. 백엔드 파일을 통째로 `apps/backend/`로 옮기고, 레포 꼭대기를 "여러 앱을 담는 그릇"으로 바꿨다.
> 2. 그 그릇을 관리하는 도구가 **npm workspaces**(한 번에 설치) + **Turborepo**(한 번에 빌드/테스트).
> 3. 코드 동작은 1도 안 바뀌었다. **위치와 관리 방식만** 바뀐 "이사" 작업.

---

## 비유: 원룸 → 여러 방이 있는 집

지금까진 백엔드 혼자 사는 **원룸**이었어요. 앞으로 프론트(Next.js)도 같이 살아야 하니, **방이 여러 개인 집**으로 구조를 바꾼 거예요.

```
이전 (원룸)                     이후 (여러 방 있는 집)
feel-pick-backend/             feel-pick/
├─ src/                        ├─ apps/
├─ test/                       │  ├─ backend/   ← 백엔드 방 (지금 이사 완료)
├─ package.json               │  └─ web/       ← 프론트 방 (Stage 3에서 입주 예정)
└─ ...                         ├─ packages/     ← 공용 물품 창고 (공유 타입 등)
                               ├─ package.json  ← 집 전체 관리실
                               └─ turbo.json
```

이번 Stage 1은 **"백엔드 짐을 backend 방으로 옮기고, 관리실(루트)을 차린"** 단계예요.

---

## 무엇을 / 왜 했나

### 1. 백엔드 파일 전부 → `apps/backend/`

`src`, `test`, `prisma`, `Dockerfile`, 설정들… 백엔드의 모든 걸 `apps/backend/` 안으로 옮겼어요.

- **`git mv`로 옮김** → git이 "삭제 후 새로 생성"이 아니라 **"이동(rename)"으로 인식**해서 **파일 히스토리가 보존**돼요. (누가 언제 이 파일을 고쳤는지 기록 유지)
- 코드 내용은 안 건드림. 폴더 위치만 변경.

### 2. 루트에 "관리실" 만들기 — npm workspaces

레포 꼭대기에 새 `package.json`을 만들고 이렇게 선언했어요:

```jsonc
{
  "name": "feel-pick",
  "private": true,
  "workspaces": ["apps/*", "packages/*"]   // ← 이 폴더들이 각각 독립 패키지
}
```

**npm workspaces**가 뭐냐면:
- `apps/backend`, `apps/web`, `packages/*` 각각이 **자기 `package.json`을 가진 독립 패키지**.
- 근데 **`npm install`은 루트에서 딱 한 번**만 하면 전부 설치됨.
- 설치된 패키지들은 **루트 `node_modules` 한 곳에 모여요**(이걸 **hoisting**이라 함). 방마다 `node_modules`를 두지 않아 중복이 없어요.

> 프론트 비유: 모노레포 안 써봤어도, **하나의 `npm install`로 여러 패키지를 관리**한다고 생각하면 돼요. (Vite 모노레포, pnpm workspace 등과 같은 발상)

### 3. Turborepo — "한 번에 빌드/테스트" 오케스트레이터

`turbo.json`을 추가하고, 루트 스크립트를 turbo에 위임했어요:

```jsonc
// 루트 package.json
"scripts": {
  "dev": "turbo run dev",      // 나중에 backend + web 동시 실행
  "build": "turbo run build",  // 모든 앱 빌드
  "test": "turbo run test"     // 모든 앱 테스트
}
```

**Turborepo**가 하는 일:
- 여러 패키지의 같은 작업(build/test 등)을 **한 명령으로 한꺼번에** 실행.
- **순서를 자동 계산** — 예: "공유 타입 패키지를 먼저 빌드한 뒤 web을 빌드".
- **캐싱** — 안 바뀐 패키지는 다시 안 돌리고 캐시 재사용 → 빨라짐.

> 프론트 비유: `npm-run-all`이나 Nx처럼 **여러 스크립트를 똑똑하게 묶어 돌리는** 도구예요. Next.js를 만든 Vercel이 만들어서 프론트 생태계 표준.

### 4. husky / commitlint를 루트로 이동

git 훅(커밋 전 테스트, 커밋 메시지 검사)은 **레포 전체에 적용**되는 거라, 백엔드 방이 아니라 **관리실(루트)** 로 옮겼어요. 이제 어느 방에서 커밋하든 같은 규칙이 적용돼요.

### 5. TypeScript 버전 고정 (5.9.3)

이사 중에 의존성을 재설치하면서 **TypeScript가 6.0으로 멋대로 점프**해 빌드가 깨졌어요. 이번 작업은 "이사"지 "TS 대규모 업그레이드"가 아니라서, **검증된 5.9.3으로 고정**(`overrides`)했어요.

```jsonc
// 루트 package.json
"overrides": { "typescript": "5.9.3" }   // 트리 전체에서 이 버전 강제
```

---

## 도중에 만난 함정 3개 (전부 해결)

| 함정 | 증상 | 해결 |
|---|---|---|
| **TS 6.0 드리프트** | lockfile 재생성 → TS 6.0 설치 → `baseUrl`/`rootDir` 에러로 테스트 실패 | `overrides`로 5.9.3 고정 |
| **turbo가 `packageManager` 요구** | `Could not resolve workspaces` | 루트에 `"packageManager": "npm@10.9.4"` 추가 |
| **`.turbo` 캐시가 git에 딸려옴** | 캐시 파일이 커밋 대상에 잡힘 | `.gitignore`에 `.turbo` 추가 |

> 교훈: 모노레포 전환의 리스크 대부분은 **의존성 재설치 시 버전 드리프트**예요. lockfile을 지우고 재생성하면 "그동안 멈춰있던 버전들"이 최신으로 튀어요.

---

## 핵심 용어 정리 (프론트 시점)

| 용어 | 뜻 | 비유 |
|---|---|---|
| **monorepo** | 여러 프로젝트를 한 git 레포에 | 여러 방 있는 한 집 |
| **workspace** | 모노레포 안의 독립 패키지 하나 | 방 하나 |
| **hoisting** | 의존성을 루트 node_modules에 모음 | 공용 창고에 물품 통합 |
| **Turborepo** | 워크스페이스 작업 오케스트레이터 | 집 전체 일정 관리자 |
| **overrides** | 특정 의존성 버전 강제 | "이 부품은 무조건 이 버전" |
| **git rename** | 이동을 이동으로 인식(히스토리 보존) | 이삿짐에 "원래 주인" 라벨 유지 |

---

## 지금 상태 / 확인된 것

```
✅ turbo build / lint / test 통과
✅ 백엔드 단위 테스트 11 + e2e 15 통과
✅ git이 모든 이동을 rename으로 인식 (히스토리 보존)
```

**로컬 개발은 완전 정상**이에요:
```bash
npm install      # 루트에서 한 번 → 전체 설치
npm test         # turbo가 백엔드 테스트 실행
npm run build    # turbo가 백엔드 빌드
```

## ⚠️ 아직 안 한 것 (Stage 2)

- **docker-compose**의 `build: .` 가 아직 루트를 가리켜요 → `docker compose up` 하면 깨짐. Stage 2에서 `./apps/backend`로 수정.
- **CI**(.github/workflows)가 "루트 = 백엔드" 가정이라 push 시 실패. Stage 2에서 워크스페이스 기준으로 수정.

즉 **"코드/로컬은 멀쩡, Docker·CI 배선만 Stage 2에서"** 입니다. 자세한 다음 단계는 [모노레포 전환 로드맵](monorepo-migration.md) 참고.
