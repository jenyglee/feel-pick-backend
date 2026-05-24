import localFont from "next/font/local";

// NanumSquare Neo (로컬 폰트, woff2) — 디자인 기본 서체.
// 폰트 파일은 같은 폴더(./*.woff2). 굵기 추가는 src 배열에 항목 추가.
export const nanumSquareNeo = localFont({
  src: [
    { path: "./NanumSquareNeo-Light.woff2", weight: "300", style: "normal" },
    { path: "./NanumSquareNeo-Regular.woff2", weight: "400", style: "normal" },
    { path: "./NanumSquareNeo-Bold.woff2", weight: "700", style: "normal" },
    { path: "./NanumSquareNeo-ExtraBold.woff2", weight: "800", style: "normal" },
    { path: "./NanumSquareNeo-Heavy.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-nanum-square-neo",
  display: "swap",
});
