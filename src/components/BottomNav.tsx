'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ListTodo, Activity, FileText, TrendingUp } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: ListTodo, label: '看板' },
    { href: '/agents', icon: Activity, label: 'Agent' },
    { href: '/docs', icon: FileText, label: '文件' },
    { href: '/holdings', icon: TrendingUp, label: '持股' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#252544] border-t border-zinc-700 z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-purple-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-6 h-6 mb-1 ${isActive ? 'scale-110' : ''}`} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
