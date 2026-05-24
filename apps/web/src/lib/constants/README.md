# constants

앱 전역 상수 (라우트 경로, 설정값, 고정 목록 등).

- `as const`로 선언해 타입 좁히기 권장.
- 환경변수는 여기 ✕ → `process.env`(서버) 사용. 도메인 enum은 백엔드 타입과 중복 주의.
- import: `@/lib/constants/...`
