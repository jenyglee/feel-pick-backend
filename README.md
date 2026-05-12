# feel-pick-backend

투표/픽(Pick) 서비스의 백엔드. NestJS 11 기반.

현재 상태: in-memory 저장소로 동작하는 최소 구현. 영속 저장소(DB) 연결, 인증, 사용자별 중복 투표 방지 등은 아직 없음.

## 요구사항

- Node.js 20+
- npm 10+

## 설치 및 실행

```bash
npm install --legacy-peer-deps   # eslint-config-prettier peer 충돌 우회
npm run start:dev
```

서버는 기본 `http://localhost:3000`에서 동작 (포트는 `PORT` 환경변수로 변경 가능).

## 스크립트

```bash
npm run build       # 빌드
npm run lint        # ESLint --fix
npm test            # 유닛 테스트
npm run test:e2e    # e2e 테스트
npm run test:cov    # 커버리지
```

## API

### Pick 생성
```
POST /picks
{
  "title": "점심 뭐 먹지",
  "description": "팀 점심",          // 선택
  "options": ["피자", "샐러드", "국밥"]
}
```

### 전체 목록
```
GET /picks
```

### 단건 조회
```
GET /picks/:id
```

### 투표
```
POST /picks/:id/vote
{ "optionId": "<option uuid>" }
```

### 삭제
```
DELETE /picks/:id
```

## 구조

```
src/
├─ app.module.ts
├─ main.ts
└─ picks/
   ├─ dto/
   │  ├─ create-pick.dto.ts
   │  └─ vote.dto.ts
   ├─ entities/
   │  └─ pick.entity.ts
   ├─ picks.controller.ts
   ├─ picks.module.ts
   ├─ picks.service.ts
   └─ picks.service.spec.ts
```
