import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", textAlign: "center", padding: "var(--pad)" }}>
      <div>
        <p style={{ fontSize: 10, letterSpacing: ".3em", textTransform: "uppercase", color: "var(--fg-3)" }}>signal lost</p>
        <h1 style={{ fontSize: "clamp(48px, 10vw, 120px)", lineHeight: 1, fontWeight: 700, margin: "12px 0 8px" }}>404</h1>
        <p style={{ color: "var(--fg-2)", maxWidth: "44ch", margin: "0 auto 28px" }}>Nothing orbits here. Pick a way back in.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="sf sf--btn" href="/read"><span className="sf__in">read</span></Link>
          <Link className="sf sf--btn is-mg" href="/ship"><span className="sf__in">fly</span></Link>
        </div>
      </div>
    </main>
  );
}
