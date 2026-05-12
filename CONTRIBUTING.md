# Contributing

이 프로젝트는 [Conventional Commits](https://www.conventionalcommits.org/)를 따릅니다.
커밋 메시지는 `commitlint` + `husky` 훅으로 자동 검증되므로 형식이 맞지 않으면 커밋이 거부됩니다.

## 커밋 메시지 형식

```
<type>(<scope>): <subject>

[body]

[footer]
```

- `type` — **영어 소문자**, 필수
- `scope` — 영향 범위, 필요할 때만 (소문자)
- `subject` — **한국어**로 한 줄 요약, 50자 이내, 마침표 없이, 명령형
- `body` — *왜* 했는지 (선택, 72자 줄바꿈)
- `footer` — 이슈/브레이킹 체인지 (선택)

## type

| type | 사용 시점 |
|---|---|
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 동작 변화 없는 코드 개선 |
| `chore` | 빌드/설정/의존성/잡일 (사용자에게 안 보임) |
| `docs` | 문서만 변경 (README, 주석) |
| `test` | 테스트 추가/수정만 |
| `style` | 포매팅·세미콜론·공백만 (코드 의미 변화 없음) |
| `perf` | 성능 개선 |
| `ci` | CI 설정 변경 |
| `build` | 빌드 시스템/외부 의존성 변경 |
| `revert` | 이전 커밋 되돌림 |

## scope

- **모듈 단위 변경에만** 붙입니다. 예: `picks`, `auth`, `users`
- 전역적인 변경(`chore`, `ci`, 루트 설정)에는 생략합니다.

## subject 작성 규칙

- **한국어**로 작성 (영어/한국어 혼용 금지)
- **명령형**으로: "추가", "수정", "변경", "삭제" 등
  - O: `feat(picks): 투표 엔드포인트 추가`
  - X: `feat(picks): 투표 엔드포인트 추가함` / `feat(picks): 투표 엔드포인트가 추가되었습니다`
- 끝에 **마침표 없음**
- 50자 이내 권장

## 예시

```
feat(picks): 투표 엔드포인트 추가
fix(picks): 옵션 2개 미만 입력 시 400 응답으로 변경
refactor(picks): 옵션 조회 로직을 헬퍼로 분리
chore: NestJS 11 기반 프로젝트 초기 스캐폴딩
chore(deps): commitlint, husky 추가
docs(readme): picks API 사용 예시 보강
test(picks): 존재하지 않는 옵션에 투표 시 케이스 추가
ci: github actions 빌드 워크플로 추가
```

### body가 필요한 경우

```
fix(picks): 투표 시 동시성 문제 회피

여러 클라이언트가 같은 시점에 vote 호출 시 Map 갱신이 race condition을
일으키는 케이스가 있었음. 임시로 단일 트랜잭션처럼 처리하도록 변경.
```

## 좋은 커밋 원칙

1. **한 커밋 = 한 가지 논리적 변경**. feat와 refactor를 섞지 않기.
2. **각 커밋이 빌드/테스트 통과** 상태여야 함 (`git bisect` 가능하도록).
3. **무엇**은 diff가 알려주므로, body에는 **왜**를 적기.
4. WIP 커밋은 push 전에 가능하면 squash.

## Breaking change

호환성을 깨는 변경은 footer에 표시합니다.

```
feat(picks): vote API 응답 구조 변경

BREAKING CHANGE: POST /picks/:id/vote 응답이 Pick 전체에서 갱신된 옵션만 포함하도록 변경됨
```

## 자동 검증

`git commit` 시점에 husky `commit-msg` 훅이 동작하여 메시지를 검사합니다.
형식이 맞지 않으면 커밋이 거부되니, 메시지를 수정해 다시 시도하세요.
