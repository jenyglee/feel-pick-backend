import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "스타일 가이드 · feel-pick",
  description: "feel-pick 컬러·타이포 디자인 토큰",
};

// globals.css 의 @theme 토큰과 1:1 대응 (보기용 메타데이터)
const PALETTES = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "cyan",
  "blue",
  "purple",
  "pink",
] as const;

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
// gray는 시안 값 기준 50~900만 존재 (950 없음)
const GRAY_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

const semantic = [
  { name: "primary", cssVar: "--color-primary", note: "= blue-500 (#6382FF)" },
  { name: "primary-strong", cssVar: "--color-primary-strong", note: "그라데이션 끝 #6C46FF" },
  { name: "surface", cssVar: "--color-surface", note: "#D9D9D9 카드 플레이스홀더" },
  { name: "background", cssVar: "--color-background", note: "#000000 다크 배경" },
  { name: "foreground", cssVar: "--color-foreground", note: "#FFFFFF 기본 텍스트" },
  { name: "foreground-muted", cssVar: "--color-foreground-muted", note: "흰색 60% 보조 텍스트" },
] as const;

const typography = [
  { cls: "text-title1", spec: "28px · 800 · lh 35 · ls -0.84", sample: "1프로라도 관심이 가는 친구", source: "Figma title1" },
  { cls: "text-title2", spec: "24px · 800 · lh 31 · ls -0.72", sample: "관심 가는 친구를 골라보세요", source: "보간값" },
  { cls: "text-title3", spec: "20px · 800 · lh 26 · ls -0.6", sample: "이재원", source: "Figma title3" },
  { cls: "text-body1", spec: "17px · 400 · lh 24 · ls -0.51", sample: "이 중에 선택한 친구가 있나요", source: "Figma 하단 문구" },
] as const;

export default function StyleGuidePage() {
  return (
    <main className="bg-background text-foreground font-display min-h-screen px-6 py-12 md:px-12">
      <div className="mx-auto max-w-4xl space-y-16">
        <header className="space-y-2">
          <h1 className="text-title1">feel-pick 스타일 가이드</h1>
          <p className="text-body1 text-foreground-muted">
            컬러·타이포 디자인 토큰. globals.css 의 @theme 이 단일 소스입니다.
          </p>
        </header>

        {/* ── 브랜드 그라데이션 ───────────────── */}
        <section className="space-y-3">
          <h2 className="text-title3">브랜드 그라데이션</h2>
          <div
            className="h-28 w-full rounded-2xl"
            style={{
              backgroundImage:
                "linear-gradient(24deg, var(--color-primary) 0%, var(--color-primary-strong) 100%)",
            }}
          />
          <p className="text-body1 text-foreground-muted">
            #6382FF → #6C46FF · 24°
          </p>
        </section>

        {/* ── 시맨틱 컬러 ─────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-title3">시맨틱 컬러</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {semantic.map((c) => (
              <li key={c.name} className="space-y-2">
                <div
                  className="h-16 w-full rounded-xl border border-white/10"
                  style={{ background: `var(${c.cssVar})` }}
                />
                <div className="text-sm leading-snug">
                  <p className="font-bold">{c.name}</p>
                  <p className="text-foreground-muted">{c.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 전체 팔레트 (9색 × 50~950) ──────── */}
        <section className="space-y-6">
          <h2 className="text-title3">컬러 팔레트</h2>
          <p className="text-foreground-muted text-sm">
            유채색은 blue-500(#6382FF)의 채도·명도 커브를 공유(hue만 변경), gray는
            디자인 시안 값(쿨 그레이, 50~900).
          </p>
          <div className="space-y-5">
            {PALETTES.map((name) => (
              <div key={name} className="space-y-1.5">
                <p className="text-body1 font-bold capitalize">{name}</p>
                <div className="grid grid-cols-11 gap-1">
                  {(name === "gray" ? GRAY_STEPS : STEPS).map((step) => (
                    <div key={step} className="space-y-1">
                      <div
                        className="h-10 rounded-md border border-white/10"
                        style={{ background: `var(--color-${name}-${step})` }}
                      />
                      <p className="text-foreground-muted text-center text-[10px]">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 타이포그래피 ───────────────────── */}
        <section className="space-y-6">
          <h2 className="text-title3">타이포그래피</h2>
          <ul className="space-y-8">
            {typography.map((t) => (
              <li
                key={t.cls}
                className="space-y-2 border-b border-white/10 pb-6 last:border-b-0"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <code className="text-foreground font-bold">{t.cls}</code>
                  <span className="text-foreground-muted text-sm">{t.spec}</span>
                  <span className="text-foreground-muted text-sm">· {t.source}</span>
                </div>
                <p className={t.cls}>{t.sample}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
