// 백엔드 OpenAPI(Swagger)에서 자동 생성된 타입을 재노출하는 진입점.
// schema.d.ts는 `npm run build -w @feel-pick/api-types`로 생성된다.

export type { paths, components, operations } from './schema';

import type { components } from './schema';

/**
 * 모든 스키마(엔티티/DTO) 타입 모음.
 * 예: `Schemas['ChoiceFeed']`, `Schemas['Profile']`, `Schemas['SelectChoiceDto']`
 * (묶음으로 노출 — TS 내장 유틸 `Pick<T, K>` 등과 이름 충돌 방지)
 */
export type Schemas = components['schemas'];
