# feel-pick 문서 홈

이 레포(모노레포)의 문서는 **두 갈래**로 나뉩니다.

## 📦 모노레포 / 레포 전체 (여기, `docs/`)

백엔드·프론트엔드를 아우르는 레포 전체 관점의 문서.

| 문서 | 내용 |
|---|---|
| [모노레포 전환 로드맵](monorepo-migration.md) | 백엔드 + Next.js를 한 레포로 합치는 단계별 계획(Stage 0~6) |
| [모노레포 Stage 1 정리](monorepo-stage-1.md) | 백엔드를 apps/backend로 이동한 실제 작업 (workspaces · Turborepo 입문) |
| [모노레포 Stage 2 정리](monorepo-stage-2.md) | Docker/CI를 모노레포에 맞춤 (빌드 컨텍스트 · 워크스페이스 Docker) |

> 앞으로 Stage 3~(프론트 합류, 타입 공유 등)와 프론트엔드 문서도 여기에 쌓입니다.

## 🛠 백엔드 학습 노트 (`apps/backend/docs/`)

NestJS 백엔드를 단계별로 만든 과정 (프론트엔드 개발자 관점).

→ [백엔드 학습 노트 목차](../apps/backend/docs/phase-notes.md) (Phase 0~5)

## 구조 한눈에

```
feel-pick/
├─ docs/                  ← 레포 전체 문서 (모노레포 · 프론트+백 공통)  ← 지금 여기
├─ apps/
│  ├─ backend/
│  │  └─ docs/            ← 백엔드 전용 학습 노트 (Phase 0~5)
│  └─ web/                ← (Stage 3에서 추가될 Next.js)
└─ packages/             ← (공유 타입 등)
```
