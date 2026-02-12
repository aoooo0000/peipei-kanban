import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "🐷 霈霈豬儀表板",
  description: "Notion + OpenClaw Integrated Dashboard PWA",
  manifest: "/manifest.json",
  icons: [{ rel: "apple-touch-icon", url: "/icons/icon-192.png" }],
};

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="pb-16">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
