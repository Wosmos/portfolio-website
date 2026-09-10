"use client";
// The entry gate: two equal doors. A returning visitor is sent straight to their remembered side unless
// `force` (?gate=1) is set. R / F keys work too.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAudio, rememberDoor, storedDoor, type Door } from "@/lib/sound-client";

const HREF: Record<Door, string> = { read: "/read", fly: "/ship" };

export default function Gate() {
  const router = useRouter();
  const leaving = useRef(false);

  // both inputs are client-only (the URL flag and localStorage), so "/" stays a static page
  useEffect(() => {
    if (new URLSearchParams(location.search).get("gate")) return;
    const d = storedDoor();
    if (d) router.replace(HREF[d]);
  }, [router]);

  function go(door: Door): void {
    if (leaving.current) return;
    leaving.current = true;
    rememberDoor(door);
    const audio = getAudio();
    audio.resume(); audio.click();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.body.classList.add("is-leaving");
    setTimeout(() => router.push(HREF[door]), reduced ? 0 : 520);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const k = e.key.toLowerCase();
      if (k === "r") go("read");
      if (k === "f") go("fly");
    };
    const warm = (): void => { const a = getAudio(); a.resume(); void a.load(); };
    addEventListener("keydown", onKey);
    addEventListener("pointerdown", warm, { once: true });
    return () => { removeEventListener("keydown", onKey); removeEventListener("pointerdown", warm); document.body.classList.remove("is-leaving"); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `go` closes over stable refs only
  }, []);

  return (
    <>
      <div className="sweep" aria-hidden="true" />
      <nav className="doors" aria-label="Choose how to view this site">
        <a className="sf door door--read" href="/read" onClick={(e) => { e.preventDefault(); go("read"); }} onPointerEnter={() => { const a = getAudio(); a.resume(); void a.load().then(() => a.tick()); }}>
          <span className="sf__in">
            <span className="door__k"><span>01 · read</span><kbd>R</kbd></span>
            <span className="door__t">Read</span>
            <span className="door__d">The résumé as a site: projects, experience, skills, education and a contact form. Plain pages, quick to scan.</span>
            <span className="door__m">2 min · works everywhere</span>
          </span>
        </a>
        <a className="sf door door--fly" href="/ship" onClick={(e) => { e.preventDefault(); go("fly"); }} onPointerEnter={() => { const a = getAudio(); a.resume(); void a.load().then(() => a.tick()); }}>
          <span className="sf__in">
            <span className="door__k"><span>02 · fly</span><kbd>F</kbd></span>
            <span className="door__t">Fly</span>
            <span className="door__d">The same projects as a solar system you pilot from a flight deck. Cut a planet open to see what it is built from.</span>
            <span className="door__m">webgl · sound · desktop best</span>
          </span>
        </a>
      </nav>
    </>
  );
}
