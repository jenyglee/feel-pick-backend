# 폰트 (NanumSquare Neo)

`NanumSquare Neo`는 Google Fonts에 없어서 **로컬 폰트(woff2)** 로 로드합니다.
원본 TTF를 `woff2`로 변환해 넣었고, [`../layout.tsx`](../layout.tsx)의 `next/font/local`로 활성화돼 있어요.

## 현재 포함된 파일 (woff2, TTF에서 변환 · 약 -82%)

| 파일 | weight | 비고 |
| --- | --- | --- |
| `NanumSquareNeo-Light.woff2` | 300 | |
| `NanumSquareNeo-Regular.woff2` | 400 | body |
| `NanumSquareNeo-Bold.woff2` | 700 | |
| `NanumSquareNeo-ExtraBold.woff2` | 800 | title1 / title3 (디자인 기본) |
| `NanumSquareNeo-Heavy.woff2` | 900 | |

> `display: "swap"`이라 선언만으로 전부 다운로드되지 않고, **실제 렌더된 weight만** 로드됩니다.

## 적용 경로

- `./index.ts` → `localFont({ ... variable: "--font-nanum-square-neo" })` 로 `nanumSquareNeo` export
- `layout.tsx` → `import { nanumSquareNeo } from "./fonts"` 후 `<html>`에 주입
- `globals.css` → `--font-display` 맨 앞이 `var(--font-nanum-square-neo)` → `font-display` 유틸/`body`에 적용

## weight 추가/교체

1. 새 굵기 woff2를 이 폴더에 추가
2. `./index.ts`의 `src` 배열에 `{ path, weight, style }` 항목 추가 (path는 `./파일명`)

## TTF → woff2 재변환 (참고)

```bash
python3 -m venv /tmp/v && /tmp/v/bin/pip install fonttools brotli
/tmp/v/bin/python -c "from fontTools.ttLib import TTFont; f=TTFont('IN.ttf'); f.flavor='woff2'; f.save('OUT.woff2')"
```

> NanumSquare Neo는 무료 배포 폰트지만, 폰트 파일 커밋 여부는 팀 정책에 맞추세요.
