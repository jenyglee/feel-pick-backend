import type { paths } from '@feel-pick/api-types';
import createClient from 'openapi-fetch';

// 백엔드 OpenAPI에서 생성된 paths 타입으로 만든 "타입 안전" API 클라이언트.
// api.GET('/picks') 처럼 경로/응답이 전부 타입으로 검증된다.
//
// 베이스 URL 우선순위 (서버 컴포넌트에서 런타임에 읽힘):
//   API_URL              ← Docker 네트워크 (예: http://app:3000)
//   NEXT_PUBLIC_API_URL  ← 클라이언트에서도 써야 할 때
//   http://localhost:3000 ← 로컬 개발 기본값
export const api = createClient<paths>({
  baseUrl:
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3000',
});
