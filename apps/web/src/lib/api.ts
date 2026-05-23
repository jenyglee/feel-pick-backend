import type { paths } from '@feel-pick/api-types';
import createClient from 'openapi-fetch';

// 백엔드 OpenAPI에서 생성된 paths 타입으로 만든 "타입 안전" API 클라이언트.
// api.GET('/picks') 처럼 경로/응답이 전부 타입으로 검증된다.
export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
});
