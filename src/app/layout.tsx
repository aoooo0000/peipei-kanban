import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import PullToRefresh from "@/components/PullToRefresh";
import GlobalHotkeys from "@/components/GlobalHotkeys";

export const metadata: Metadata = {
  title: "🐷 霈霈豬儀表板",
  description: "Notion + OpenClaw Integrated Dashboard PWA",
  manifest: "/manifest.json",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", url: "/icons/apple-touch-icon.png", sizes: "180x180" },
  ],
};

export const viewport: Viewport = {
  themeColor: "#1a2332",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="pb-16 text-white antialiased">
        <SessionProviderWrapper>
          <PullToRefresh>
            {children}
            <BottomNav />
            <GlobalHotkeys />
          </PullToRefresh>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
