# 모노레포 Stage 2 — Docker / CI를 모노레포에 맞추기 (실제 작업 정리)

> 📚 [문서 홈](README.md) · [모노레포 전환 로드맵](monorepo-migration.md) · [← Stage 1](monorepo-stage-1.md)

> **3줄 요약**
> 1. Stage 1에서 백엔드를 `apps/backend`로 옮겼더니, **Docker와 CI가 "루트 = 백엔드"라고 착각**해서 깨졌다.
> 2. Docker 빌드를 **레포 루트 기준**으로 바꾸고, CI를 **워크스페이스/turbo 기준**으로 고쳤다.
> 3. 새 기능은 없다. **배선(인프라 경로)만** 새 구조에 맞춘 작업.

---

## 왜 필요했나

Stage 1은 코드를 옮겼을 뿐, **자동화 도구들은 옛 구조를 기억**하고 있었어요.

| 도구 | 옛 가정 | 새 구조에서 생기는 문제 |
|---|---|---|
| Dockerfile | "lockfile이 내 폴더에 있다" | 백엔드 폴더엔 lockfile 없음 → `npm ci` 실패 |
| docker-compose | `build: .` (루트=백엔드) | 루트엔 이제 Dockerfile/소스 없음 |
| CI | `npm test`가 백엔드 테스트 | 루트 `npm test`는 turbo로 위임됨 |

그래서 "코드는 멀쩡한데 `docker compose up`이나 CI는 깨지는" 상태였고, 이걸 메운 게 Stage 2예요.

---

## 핵심 개념 2개 (먼저 이해하면 쉬움)

### ① 빌드 컨텍스트 = "빌더에게 건네는 자재 상자" 📦

Docker 이미지 빌드를 목수에게 가구를 맡기는 것에 비유하면:
- **빌드 컨텍스트** = 목수에게 건네는 **자재 상자** (= 통째로 보내는 폴더)
- **Dockerfile** = 제작 설명서
- **`COPY`** = "상자에서 이 자재를 꺼내 써라"

> 핵심 규칙: **목수는 상자 안에 있는 자재만 쓸 수 있다.** 상자 밖(컨텍스트 밖)의 파일은 `COPY` 못 한다.

`docker build .` 의 `.` 이 바로 컨텍스트예요.

### ② 워크스페이스 = "lockfile/node_modules는 루트에 하나만 공유"

```
feel-pick/
├─ package-lock.json   ← ⭐ 공용 잠금 (루트에 하나)
├─ node_modules/       ← ⭐ 공용 창고 (루트에 하나, hoisting)
└─ apps/backend/
   └─ package.json     ← "필요 목록"만. lockfile/node_modules 없음
```

→ **백엔드 폴더에서는 `npm ci`를 할 수 없어요** (lockfile이 거기 없으니까). 루트에서 해야 해요.

**이 둘이 합쳐지면 결론**: Docker가 lockfile을 `COPY` 하려면, lockfile이 있는 **레포 루트가 상자(컨텍스트) 안에 들어와야** 한다. 그래서 빌드 컨텍스트를 루트로 바꾼 거예요.

---

## 무엇을 / 왜 바꿨나

### 1. Dockerfile — 루트 컨텍스트 + 워크스페이스 방식

[apps/backend/Dockerfile](../apps/backend/Dockerfile):

```dockerfile
# ① 루트의 매니페스트 + 공용 lock 먼저 복사 (의존성 레이어 캐시)
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
RUN npm ci --ignore-scripts

# ② 백엔드 소스 복사 후, 백엔드만 골라서 생성/빌드
COPY apps/backend ./apps/backend
RUN npm run prisma:generate -w @feel-pick/backend \
 && npm run build -w @feel-pick/backend
```

- `COPY package-lock.json` → 루트 lock을 가져옴 (그래서 컨텍스트가 루트여야 함)
- **`-w @feel-pick/backend`** → "여러 워크스페이스 중 **백엔드만**" 작업하라는 뜻
- `--ignore-scripts` → Docker 빌드 중 postinstall/husky가 멋대로 도는 걸 방지

### 2. .dockerignore를 루트로 이동

`.dockerignore`는 **컨텍스트 루트**의 것을 읽어요. 컨텍스트가 루트로 바뀌었으니 [.dockerignore](../.dockerignore)도 루트로 옮겼어요 (`apps/backend/.dockerignore`는 삭제). `**/node_modules`, `.git`, `**/dist` 등을 상자에서 빼서 빌드를 가볍게.

### 3. docker-compose — 컨텍스트와 Dockerfile 분리 지정

[docker-compose.yml](../docker-compose.yml):

```yaml
backend: # (서비스 이름 — Stage 3에서 web이 합류하며 app→backend로 정리)
  build:
    context: .                          # 상자 = 레포 루트
    dockerfile: apps/backend/Dockerfile # 설명서 위치는 백엔드
```

**설명서 위치(dockerfile)와 상자 범위(context)는 따로 지정**할 수 있어요. 우리는 설명서는 백엔드에 두되 상자는 루트로.

### 4. CI — 워크스페이스 + turbo 기준

[.github/workflows/ci.yml](../.github/workflows/ci.yml):

```yaml
- run: npm ci                                   # 루트에서 전체 설치
- run: npm run prisma:generate -w @feel-pick/backend  # 백엔드만
- run: npm run lint     # → turbo run lint
- run: npm test         # → turbo run test
- run: npm run test:e2e # → turbo run test:e2e
```

`npm test` 같은 루트 명령은 이제 **turbo가 각 워크스페이스 작업을 실행**해요 (Stage 1에서 그렇게 만듦).

---

## 함정 (Stage 2의 핵심 깨달음)

| 함정 | 원인 | 해결 |
|---|---|---|
| `npm ci`가 Docker에서 실패 | 백엔드 폴더에 lockfile 없음 (루트에만 있음) | 빌드 컨텍스트를 루트로 + 루트 lock 복사 |
| `COPY ../package-lock.json` 불가 | 컨텍스트 밖 파일은 COPY 못 함 | 컨텍스트를 루트로 키워 lock을 상자 안에 |
| `.dockerignore`가 안 먹힘 | 컨텍스트 루트의 것만 읽힘 | `.dockerignore`를 루트로 이동 |

> 한 줄 교훈: **모노레포 Docker = "컨텍스트를 루트로, lock은 루트에서, 앱은 `-w`로 지정"**.

---

## 검증 (실제로 다 돌림)

```
✅ docker compose up --build       → 이미지 빌드 성공
✅ 마이그레이션 적용 + 앱 부팅      → "Nest application successfully started"
✅ GET /health                     → 200 {"database":{"status":"up"}}
✅ POST /auth/signup               → 201 (컨테이너 안 bcrypt + DB)
✅ CI 명령 로컬 재현                → prisma:generate -w / turbo lint·test·e2e(15) 통과
```

---

## 지금까지 정리

- **Stage 1(이동) + Stage 2(인프라)** = "기존 백엔드를 안 깨고 모노레포로 옮기기" **완료**.
- 이제 Docker도 CI도 새 구조에서 정상 동작해요.

## 다음 (Stage 3)

드디어 프론트엔드 합류 — `apps/web`에 **Next.js를 스캐폴드**하고 turbo로 backend(:3000) + web(:3001)을 동시에 띄웁니다.

→ 다음: [Stage 3 정리 (Next.js 합류)](monorepo-stage-3.md) · [전환 로드맵](monorepo-migration.md)
