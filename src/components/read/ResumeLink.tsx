"use client";
// A client island purely so the download can be counted; the link itself needs no JS.
import { ev } from "@/lib/analytics";

export default function ResumeLink({ href, from, className = "sf pill", children }: { href: string; from: string; className?: string; children: React.ReactNode }) {
  return <a className={className} href={href} target="_blank" rel="noopener" title="Résumé PDF" onClick={() => ev("resume", { from })}>{children}</a>;
}
