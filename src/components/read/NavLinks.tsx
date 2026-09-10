"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "projects", href: "/read/projects", match: "/read/projects" },
  { label: "experience", href: "/read#experience", match: null },
  { label: "skills", href: "/read#skills", match: null },
  { label: "contact", href: "/read/contact", match: "/read/contact" },
] as const;

export default function NavLinks() {
  const path = usePathname();
  return (
    <nav className="top__nav" aria-label="Sections">
      {NAV.map((n) => (
        <Link key={n.label} href={n.href} aria-current={n.match && path.startsWith(n.match) ? "page" : undefined}>{n.label}</Link>
      ))}
    </nav>
  );
}
