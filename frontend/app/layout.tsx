import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouTube → Notion Archiver",
  description: "유튜브 영상을 자동으로 분석하고 Notion에 저장합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
