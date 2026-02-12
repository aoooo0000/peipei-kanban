"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const TABS = [
  { path: "/", icon: "📋", label: "看板" },
  { path: "/dashboard", icon: "📊", label: "總覽" },
  { path: "/docs", icon: "📄", label: "文件" },
  { path: "/logs", icon: "📝", label: "日誌" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1a2e] border-t border-white/10 z-50">
      <div className="max-w-7xl mx-auto flex justify-around items-center h-16">
        {TABS.map((tab) => {
          const isActive = pathname === tab.path;
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? "text-blue-400"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className="text-2xl mb-1">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
