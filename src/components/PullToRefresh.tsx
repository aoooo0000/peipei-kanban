"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const THRESHOLD = 72;

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);

  const triggerRefresh = useCallback(() => {
    setRefreshing(true);
    setPull(56);
    setTimeout(() => {
      window.location.reload();
    }, 450);
  }, []);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshing) return;
      startY.current = e.touches[0]?.clientY ?? null;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || startY.current === null || refreshing) return;
      const currentY = e.touches[0]?.clientY ?? 0;
      const delta = currentY - startY.current;
      if (delta <= 0) {
        setPull(0);
        return;
      }
      if (window.scrollY > 0) return;

      const damped = Math.min(120, delta * 0.45);
      setPull(damped);
      if (delta > 8) e.preventDefault();
    };

    const onTouchEnd = () => {
      if (!pulling.current || refreshing) return;
      pulling.current = false;
      startY.current = null;
      if (pull >= THRESHOLD) {
        triggerRefresh();
        return;
      }
      setPull(0);
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull, refreshing, triggerRefresh]);

  const indicatorText = refreshing ? "🐷 重新整理中..." : pull >= THRESHOLD ? "🐷 放開更新" : "🐷 下拉刷新";

  return (
    <div className="relative overscroll-y-contain">
      <div
        className="fixed left-1/2 z-[60] -translate-x-1/2 transition-all duration-200"
        style={{ top: `${Math.max(-52, -52 + pull)}px` }}
      >
        <div className="glass-card rounded-full px-4 py-2 text-xs text-white/90 border border-white/20">
          {indicatorText}
        </div>
      </div>
      {children}
    </div>
  );
}
