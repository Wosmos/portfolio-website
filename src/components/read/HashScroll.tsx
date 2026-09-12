"use client";
// One place that honours #section links, including arrivals from another page. The reveal animations
// change section heights as they run, so the target is scrolled to again once things settle.
//
// A route with no hash lands at the top — App Router does not do this on its own between sibling
// routes under the same layout (e.g. the projects list to a project page), so scrolled deep into a
// list and picking one landed on the new page already scrolled to wherever the list had been.

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function HashScroll() {
  const path = usePathname();
  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id) { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); return; }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tries = 0, raf = 0;
    const timers: number[] = [];
    const jump = (behavior: ScrollBehavior): boolean => {
      const el = document.getElementById(id);
      if (!el) return false;
      el.scrollIntoView({ behavior, block: "start" });
      return true;
    };
    // the section may not exist for a frame or two after a route change
    const find = (): void => { if (jump("auto") || ++tries > 120) return; raf = requestAnimationFrame(find); };
    raf = requestAnimationFrame(find);
    // correct the position after the entrance animation has changed the layout
    for (const ms of [400, 900, 1500]) timers.push(window.setTimeout(() => jump(reduced ? "auto" : "smooth"), ms));
    return () => { cancelAnimationFrame(raf); for (const t of timers) clearTimeout(t); };
  }, [path]);
  return null;
}
