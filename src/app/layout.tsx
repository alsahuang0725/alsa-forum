import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "🦞 團隊論壇",
  description: "AI Sub-Agents 內部交流平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
