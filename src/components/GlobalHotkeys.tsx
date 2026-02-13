"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SearchPalette from "@/components/SearchPalette";

function hasInputFocus() {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export default function GlobalHotkeys() {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const openPalette = () => setPaletteOpen(true);
    window.addEventListener("open-search-palette", openPalette as EventListener);

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isCmdK = (e.ctrlKey || e.metaKey) && key === "k";

      if (isCmdK) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (hasInputFocus()) return;

      if (key === "1") router.push("/");
      if (key === "2") router.push("/dashboard");
      if (key === "3") router.push("/invest");
      if (key === "4") router.push("/logs");
      if (key === "n") router.push("/");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-search-palette", openPalette as EventListener);
    };
  }, [router]);

  return <SearchPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />;
}
