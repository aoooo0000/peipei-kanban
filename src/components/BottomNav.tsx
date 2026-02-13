"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const TABS = [
  { path: "/", icon: "📋", label: "看板" },
  { path: "/dashboard", icon: "📊", label: "總覽" },
  { path: "/schedule", icon: "🗓️", label: "排程" },
  { path: "/logs", icon: "📝", label: "日誌" },
  { path: "/invest", icon: "📈", label: "投資" },
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
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                isActive ? "text-[#667eea] drop-shadow-[0_0_8px_rgba(102,126,234,0.65)]" : "text-white/60 hover:text-white/90"
              }`}
            >
              <span className="text-xl mb-1">{tab.icon}</span>
              <span className="text-[11px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
