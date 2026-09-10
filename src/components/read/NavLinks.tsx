"use client";
// The header nav mixes two kinds of link: real pages and sections of the home page. Section links have
// to work from anywhere, so from another page they navigate first and scroll once the section exists.
// The active item follows both the route and, on the home page, the section in view.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface Item { label: string; href: string; section?: string; page?: string }
const NAV: readonly Item[] = [
  { label: "projects", href: "/read/projects", page: "/read/projects" },
  { label: "experience", href: "/read#experience", section: "experience" },
  { label: "skills", href: "/read#skills", section: "skills" },
  { label: "contact", href: "/read/contact", page: "/read/contact" },
];
const SECTIONS = NAV.filter((n) => n.section).map((n) => n.section as string);

export default function NavLinks() {
  const path = usePathname();
  const router = useRouter();
  const [inView, setInView] = useState<string | null>(null);

  // on the home page, mark whichever section the reader is in
  useEffect(() => {
    if (path !== "/read") return () => setInView(null);   // clear on the way out, not on the way in
    const els = SECTIONS.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => e !== null);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit) setInView(hit.target.id);
        else if (entries.every((e) => !e.isIntersecting)) setInView(null);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const el of els) io.observe(el);
    return () => { io.disconnect(); setInView(null); };
  }, [path]);

  function goToSection(e: React.MouseEvent, id: string): void {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (path === "/read") {
      document.getElementById(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", `/read#${id}`);
      return;
    }
    router.push(`/read#${id}`);   // HashScroll picks it up once the page mounts
  }

  return (
    <nav className="top__nav" aria-label="Sections">
      {NAV.map((n) => {
        const active = n.page ? path.startsWith(n.page) : path === "/read" && inView === n.section;
        return n.section ? (
          <a key={n.label} href={n.href} aria-current={active ? "true" : undefined} onClick={(e) => goToSection(e, n.section as string)}>{n.label}</a>
        ) : (
          <Link key={n.label} href={n.href} aria-current={active ? "page" : undefined}>{n.label}</Link>
        );
      })}
    </nav>
  );
}
