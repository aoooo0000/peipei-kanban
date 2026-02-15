"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const TABS = [
  { path: "/", icon: "🏠", label: "首頁" },
  { path: "/dashboard", icon: "📋", label: "看板" },
  { path: "/schedule", icon: "📊", label: "分析" },
  { path: "/logs", icon: "📝", label: "日誌" },
  { path: "/docs", icon: "📚", label: "Docs" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/15 bg-white/5 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex justify-around items-center h-16 px-1">
        {TABS.map((tab) => {
          const isActive = pathname === tab.path;
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all ${
                isActive ? "text-[#667eea] drop-shadow-[0_0_8px_rgba(102,126,234,0.65)]" : "text-white/70 hover:text-white"
              }`}
            >
              <span className="text-xl mb-1">{tab.icon}</span>
              <span className="text-[11px] font-medium">{tab.label}</span>
              {isActive && <span className="absolute bottom-0 h-1.5 w-10 rounded-t-full bg-[#667eea] shadow-[0_0_14px_rgba(102,126,234,0.95)]" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
