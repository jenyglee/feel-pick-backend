// 백엔드 OpenAPI(Swagger)에서 자동 생성된 타입을 재노출하는 진입점.
// schema.d.ts는 `npm run build -w @feel-pick/api-types`로 생성된다.

export type { paths, components, operations } from './schema';

import type { components } from './schema';

/**
 * 모든 스키마(엔티티/DTO) 타입 모음.
 * 예: `Schemas['Pick']`, `Schemas['CreatePickDto']`
 * (TS 내장 유틸 `Pick<T, K>`과 이름이 겹치지 않도록 개별 export 대신 묶음으로 노출)
 */
export type Schemas = components['schemas'];
