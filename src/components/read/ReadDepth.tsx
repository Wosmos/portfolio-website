"use client";
// Reports how far down a page a visitor actually got: one event per quarter, once each. Together with
// page views this separates "landed" from "read".

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ev } from "@/lib/analytics";

const MARKS = [25, 50, 75, 100] as const;

export default function ReadDepth() {
  const path = usePathname();
  useEffect(() => {
    const sent = new Set<number>();
    let raf = 0;
    const measure = (): void => {
      raf = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - innerHeight;
      const pct = scrollable > 40 ? Math.min(100, Math.round(((scrollY + innerHeight) / doc.scrollHeight) * 100)) : 100;
      for (const m of MARKS) if (pct >= m && !sent.has(m)) { sent.add(m); ev("read_depth", { path, depth: m }); }
      if (sent.size === MARKS.length) removeEventListener("scroll", onScroll);
    };
    const onScroll = (): void => { if (!raf) raf = requestAnimationFrame(measure); };
    addEventListener("scroll", onScroll, { passive: true });
    const settle = window.setTimeout(measure, 1200);   // a short page counts as fully read
    return () => { removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); clearTimeout(settle); };
  }, [path]);
  return null;
}
