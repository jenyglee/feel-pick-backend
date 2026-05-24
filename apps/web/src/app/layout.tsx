import type { Metadata } from "next";
import { nanumSquareNeo } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "feel-pick",
  description: "픽을 만들고 투표하는 앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${nanumSquareNeo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
