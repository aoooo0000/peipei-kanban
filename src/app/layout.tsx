import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "🐷 霈霈豬任務看板",
  description: "Notion-powered Kanban PWA",
  manifest: "/manifest.webmanifest",
  icons: [{ rel: "apple-touch-icon", url: "/icons/icon-192.png" }],
};

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
