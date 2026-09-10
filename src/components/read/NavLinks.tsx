"use client";
// The header nav mixes two kinds of link: real pages and sections of the home page. Section links have
// to work from anywhere, so from another page they navigate first and scroll once the section exists.
// The active item follows both the route and, on the home page, the section in view.
//
// Below 720px the row does not fit, so it becomes a sheet behind a menu button. It used to be hidden
// outright, which left projects, blog and contact unreachable on a phone.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface Item { label: string; href: string; section?: string; page?: string }
const BLOG: Item = { label: "blog", href: "/read/blog", page: "/read/blog" };
const NAV: readonly Item[] = [
  { label: "projects", href: "/read/projects", page: "/read/projects" },
  { label: "experience", href: "/read#experience", section: "experience" },
  { label: "skills", href: "/read#skills", section: "skills" },
  { label: "contact", href: "/read/contact", page: "/read/contact" },
];
const SECTIONS = NAV.filter((n) => n.section).map((n) => n.section as string);

// `hasBlog` comes from the layout: the link only appears once a post is published.
export default function NavLinks({ hasBlog = false }: { hasBlog?: boolean }) {
  const items = hasBlog ? [...NAV.slice(0, 1), BLOG, ...NAV.slice(1)] : NAV;
  const path = usePathname();
  const router = useRouter();
  const [inView, setInView] = useState<string | null>(null);
  // the sheet remembers which route it was opened on, so a navigation closes it without an effect
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const setOpen = (v: boolean): void => setOpenOn(v ? path : null);

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

  // Escape closes it wherever the focus is
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => { if (e.key === "Escape") setOpenOn(null); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  function goToSection(e: React.MouseEvent, id: string): void {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    setOpen(false);
    if (path === "/read") {
      document.getElementById(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", `/read#${id}`);
      return;
    }
    router.push(`/read#${id}`);   // HashScroll picks it up once the page mounts
  }

  return (
    <>
      <button
        className={`top__menu${open ? " is-on" : ""}`}
        type="button"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen(!open)}
      >
        <i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" />
        <span>{open ? "close" : "menu"}</span>
      </button>
      <nav id="site-nav" className={`top__nav${open ? " is-open" : ""}`} aria-label="Sections">
        {items.map((n) => {
          const active = n.page ? path.startsWith(n.page) : path === "/read" && inView === n.section;
          return n.section ? (
            <a key={n.label} href={n.href} aria-current={active ? "true" : undefined} onClick={(e) => goToSection(e, n.section as string)}>{n.label}</a>
          ) : (
            <Link key={n.label} href={n.href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>{n.label}</Link>
          );
        })}
      </nav>
      {open && <button className="top__scrim" type="button" aria-label="Close the menu" onClick={() => setOpen(false)} />}
    </>
  );
}
